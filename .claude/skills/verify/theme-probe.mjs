// Drives headless Chrome over CDP: flips the emulated OS colour scheme live and presses the
// theme button with a real mouse event, reading the page's theme and the button's label each time.
// usage: node .claude/skills/verify/theme-probe.mjs <page-url> <profile-dir> <debug-port>
import { spawn } from 'node:child_process';

const [url, profile, port] = process.argv.slice(2);
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--window-size=1024,768', 'about:blank',
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
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}) =>
  new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.result.value;

const scheme = (value) => send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] });
const load = async () => { await send('Page.navigate', { url }); await new Promise((r) => setTimeout(r, 800)); };
// Two animation frames guarantee a rendering update ran, which is when media query `change` fires.
const state = async (step, expect = {}) => ({ expect, ...(await evaluate(`(async () => {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const b = document.getElementById('theme-toggle');
  return { step: ${JSON.stringify(step)}, osDark: matchMedia('(prefers-color-scheme: dark)').matches,
    theme: document.documentElement.dataset.theme, stored: localStorage.getItem('theme'),
    label: b.getAttribute('aria-label') };
})()`)) });
const press = async () => {
  const { x, y } = await evaluate(`(() => { const r = document.getElementById('theme-toggle').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  }
};

await send('Page.enable');
const out = [];
// A: a first-time visitor on `system` follows a live OS switch, and the label must follow too.
await scheme('light'); await load(); await evaluate(`localStorage.removeItem('theme')`); await load();
out.push(await state('A1 fresh visitor, OS light'));
await scheme('dark'); out.push(await state('A2 OS switched to dark, no reload'));
await press(); out.push(await state('A3 pressed the button'));
// B: once the reader has chosen, OS switches change nothing.
await scheme('light'); out.push(await state('B1 OS switched to light after an explicit choice'));
await scheme('dark'); out.push(await state('B2 OS switched back to dark'));
// D: picking the OS's own theme forgets the choice, so the page follows the OS again.
await press(); out.push(await state('D1 pressed again, back to the OS theme', { stored: null }));
await scheme('light'); out.push(await state('D2 OS switched to light after that', { theme: 'light', stored: null }));
await load(); out.push(await state('D3 reloaded', { theme: 'light', stored: null }));
// C: a first-time visitor on a dark OS, then two flips.
await evaluate(`localStorage.removeItem('theme')`); await scheme('dark'); await load();
out.push(await state('C1 fresh visitor, OS dark'));
await scheme('light'); out.push(await state('C2 OS switched to light'));
await scheme('dark'); out.push(await state('C3 OS switched back to dark'));

for (const s of out) {
  const ok = s.label === `Switch to ${s.theme === 'dark' ? 'light' : 'dark'} theme`
    && Object.entries(s.expect).every(([k, v]) => s[k] === v);
  console.log(`${ok ? 'ok  ' : 'BAD '} ${s.step.padEnd(50)} os=${s.osDark ? 'dark ' : 'light'} page=${s.theme.padEnd(5)} stored=${String(s.stored).padEnd(5)} label="${s.label}"`);
}
ws.close();
chrome.kill();
