import { esc } from './util.js';

/**
 * The HTML shell every page here shares: phone-first, light and dark from the
 * OS, the site's coral for links, no script and no external request.
 */
export function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Site stats">
<meta name="theme-color" content="#fdfcfa" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#17181a" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='7' fill='%23e65446'/%3E%3C/svg%3E">
<title>${esc(title)}</title>
<style>
:root {
  color-scheme: light dark;
  --bg: light-dark(#fdfcfa, #17181a);
  --subtle: light-dark(#f4f2ee, #1e1f22);
  --text: light-dark(#1f1d1a, #e4e1db);
  --muted: light-dark(#6b6660, #99958d);
  --rule: light-dark(#e2dfd8, #2c2b29);
  --accent: light-dark(#c4402f, #de5043);
  --bar: light-dark(#f1d5cf, #4a2a25);
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
  font-variant-numeric: tabular-nums;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 40px max(16px, env(safe-area-inset-left));
}
main { max-width: 760px; margin: 0 auto; }
a { color: var(--accent); text-decoration: none; }
h1 { font-size: 20px; margin: 4px 0 12px; }
h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 28px 0 8px; font-weight: 600; }
p { margin: 8px 0; }
button {
  font: inherit; color: #fff; background: var(--accent); border: 0; border-radius: 8px;
  padding: 10px 16px; min-height: 44px; cursor: pointer;
}
.muted { color: var(--muted); }
.small { font-size: 13px; }
nav.ranges { display: flex; gap: 5px; flex-wrap: wrap; margin: 4px 0 8px; }
nav.ranges a { padding: 6px 11px; border-radius: 999px; background: var(--subtle); color: var(--text); font-size: 14px; white-space: nowrap; }
nav.ranges a[aria-current] { background: var(--accent); color: #fff; }
.tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
@media (min-width: 560px) { .tiles { grid-template-columns: repeat(4, 1fr); } }
.tile { background: var(--subtle); border-radius: 10px; padding: 10px 12px; }
.tile b { display: block; font-size: 22px; font-weight: 650; }
.tile span { font-size: 12px; color: var(--muted); }
.tile i { font-style: normal; font-size: 12px; color: var(--muted); margin-left: 4px; }
.chart { background: var(--subtle); border-radius: 10px; padding: 10px 12px 6px; }
.chart svg { display: block; width: 100%; height: 120px; }
.chart .v { fill: var(--bar); }
.chart .u { fill: var(--accent); }
.axis { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-top: 4px; }
.legend { font-size: 12px; color: var(--muted); }
.legend s { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin: 0 4px 0 8px; text-decoration: none; vertical-align: -1px; }
.map { background: var(--subtle); border-radius: 10px; padding: 8px; }
.map svg { display: block; width: 100%; height: auto; }
.map path { stroke: var(--bg); stroke-width: .6; }
.map path.off { fill: var(--rule); }
.map path.on { fill: var(--accent); }
.map path.sel { stroke: var(--text); stroke-width: 1.6; }
.map a:hover path, .map a:focus path { stroke: var(--text); stroke-width: 1.2; }
.chips { font-size: 13px; color: var(--muted); }
.chip { display: inline-block; padding: 4px 10px; border-radius: 999px; background: var(--subtle); color: var(--text); margin-left: 4px; }
.chip span { color: var(--muted); margin-left: 2px; }
td a { color: inherit; }
table { width: 100%; border-collapse: collapse; }
th { text-align: right; font-weight: 500; font-size: 12px; color: var(--muted); padding: 2px 0 4px 10px; white-space: nowrap; }
th:first-child { text-align: left; padding-left: 0; }
td { padding: 5px 0 5px 10px; text-align: right; border-top: 1px solid var(--rule); white-space: nowrap; }
td:first-child {
  text-align: left; padding-left: 0; white-space: normal; overflow-wrap: anywhere; width: 100%;
  background: linear-gradient(to right, var(--bar) var(--w, 0%), transparent var(--w, 0%)) no-repeat 0 50% / 100% 70%;
}
td:first-child span { padding-left: 4px; }
ol.visits { list-style: none; padding: 0; margin: 0; }
ol.visits li { border-top: 1px solid var(--rule); padding: 8px 0; }
ol.visits .who { font-size: 13px; color: var(--muted); }
ol.visits .trail { overflow-wrap: anywhere; }
ol.visits .out { color: var(--muted); font-size: 13px; }
footer { margin-top: 32px; font-size: 13px; color: var(--muted); display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
footer form { display: inline; }
footer button { background: none; color: var(--accent); padding: 0; min-height: 0; }
</style>
</head>
<body><main>
${body}
</main></body>
</html>`;
}
