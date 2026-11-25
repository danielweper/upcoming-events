// Builds the deployable site in _site/ from the sources + events.json (run build-events.mjs first).
// index.html is made self-contained: CSS, JS, logo, config and the current events are inlined, so
// showing the page takes ONE request (kiosks that reload it often, and don't cache, otherwise hit
// rate limits, and a single failed request would break the layout).
// events.json and config.json are still published; the page re-reads events.json while it stays open.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '_site');
const read = (f) => readFileSync(join(root, f), 'utf8');
const BS = String.fromCharCode(92); // backslash: these escapes must reach the HTML as literal text
const safeScript = (s) => s.replace(/<\/(script)/gi, '<' + BS + '/$1');
const json = (v) => JSON.stringify(v)
  .replace(/</g, BS + 'u003c')
  .split(String.fromCharCode(0x2028)).join(BS + 'u2028')
  .split(String.fromCharCode(0x2029)).join(BS + 'u2029');

const logoUri = 'data:image/svg+xml;base64,' + Buffer.from(readFileSync(join(root, 'logo.svg'))).toString('base64');

let html = read('index.html');
const swap = (re, to) => {
  if (!re.test(html)) throw new Error('index.html: pattern not found: ' + re);
  html = html.replace(re, () => to);
};
swap(/<link rel="stylesheet" href="stregsystem\.css">/, `<style>\n${read('stregsystem.css')}</style>`);
swap(/<link rel="stylesheet" href="events\.css">/, `<style>\n${read('events.css')}</style>`);
swap(/<link rel="icon" href="logo\.svg">/, `<link rel="icon" href="${logoUri}">`);
html = html.replace(/src="logo\.svg"/g, () => `src="${logoUri}"`);
swap(
  /<script src="app\.js"><\/script>/,
  `<script>window.__CONFIG__=${json(JSON.parse(read('config.json')))};window.__EVENTS__=${json(JSON.parse(read('events.json')))};</script>\n` +
    `<script>\n${safeScript(read('app.js'))}</script>`,
);

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), html);
for (const f of ['config.json', 'events.json', 'sw.js']) copyFileSync(join(root, f), join(out, f));
console.log(`Wrote _site/index.html (${(html.length / 1024).toFixed(0)} KB, self-contained)`);
