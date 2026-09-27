// Loads pages in headless Chrome at a true device width (CDP metrics override, so no ~500px window
// floor) and reports layout shift, console errors, header rows, the gap under any video, and a PNG.
// usage: node .claude/skills/verify/page-probe.mjs <profile-dir> <debug-port> <out-dir> <name=url@width> ...
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [profile, port, outDir, ...specs] = process.argv.slice(2);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', 'about:blank',
], { stdio: 'ignore' });

let page;
for (let i = 0; i < 50 && !page; i++) {
  try {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    page = targets.find((t) => t.type === 'page');
  } catch {}
  if (!page) await new Promise((r) => setTimeout(r, 200));
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text);
  if (msg.method === 'Log.entryAdded' && ['error', 'warning'].includes(msg.params.entry.level)) errors.push(msg.params.entry.text);
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) errors.push(JSON.stringify(msg.params.args));
});
const send = (method, params = {}) =>
  new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.result.value;

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
for (const spec of specs) {
  const [name, rest] = spec.split('=');
  const at = rest.lastIndexOf('@');
  const url = rest.slice(0, at), width = Number(rest.slice(at + 1));
  errors.length = 0;
  await send('Emulation.setDeviceMetricsOverride', { width, height: 812, deviceScaleFactor: 2, mobile: width < 768 });
  await send('Page.navigate', { url });
  await new Promise((r) => setTimeout(r, 1500));
  const facts = await evaluate(`(async () => {
    const shifts = await new Promise((res) => {
      const t = setTimeout(() => res([]), 400);
      new PerformanceObserver((l, o) => { clearTimeout(t); o.disconnect(); res(l.getEntries()); })
        .observe({ type: 'layout-shift', buffered: true });
    });
    const tops = [...document.querySelectorAll('header a, header button')].map((e) => e.getBoundingClientRect());
    const nav = document.querySelector('header nav a').getBoundingClientRect();
    const rss = document.querySelector('header .utils a').getBoundingClientRect();
    const v = document.querySelector('video');
    return {
      status: performance.getEntriesByType('navigation')[0].responseStatus,
      title: document.title,
      cls: +shifts.reduce((s, e) => s + (e.hadRecentInput ? 0 : e.value), 0).toFixed(4),
      headerRows: new Set(tops.map((r) => Math.round((r.top + r.height / 2) / 12))).size,
      iconsOnNavRow: Math.abs((rss.top + rss.height / 2) - (nav.top + nav.height / 2)) < 6,
      overflowX: document.documentElement.scrollWidth - innerWidth,
      videoGapBelow: v ? Math.round(v.nextElementSibling.getBoundingClientRect().top - v.getBoundingClientRect().bottom) : null,
    };
  })()`);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(shot.result.data, 'base64'));
  console.log(JSON.stringify({ name, width, ...facts, consoleErrors: [...errors] }));
}
ws.close();
chrome.kill();
