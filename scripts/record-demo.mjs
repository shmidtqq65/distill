// Renders the README demo frame by frame (deterministic, so it is smooth on any machine),
// then encodes demo.mp4, assets/demo.webp and assets/demo.gif with ffmpeg.  Needs: npm install, ffmpeg on PATH.
// Usage: node scripts/record-demo.mjs [--fps 30] [--out demo]
import { createServer } from 'node:http';
import { readFile, mkdir, rm } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FPS = +arg('fps', 30), OUT = arg('out', 'demo');
const W = 1280, H = 720, DPR = 1.5;
const frames = join(root, '.demo-frames');
await rm(frames, { recursive: true, force: true });
await mkdir(frames, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const p = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(root + '/')) throw new Error('outside');
    res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' });
    res.end(await readFile(p));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// serve the fictional magazine under a reserved example domain, so the card shows a realistic address
const HOST = 'understory.example';
const browser = await chromium.launch({ args: [`--host-resolver-rules=MAP ${HOST} 127.0.0.1`] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'en-US' });
await page.goto(`${base.replace('127.0.0.1', HOST)}/test/fixtures/article-en.html`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
// a dry run finds the first key point, so the recording opens where the marker has something to do
await page.evaluate(() => { window.__DS_MANUAL = true; });
await page.addScriptTag({ path: join(root, 'src/distill.js') });
const firstPoint = await page.evaluate(() => { const r = window.__distill.result(); window.__distill.stop(); return r.points[0]; });
await page.evaluate((txt) => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    if (!n.data.includes(txt.slice(0, 24))) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    window.scrollTo(0, Math.max(0, scrollY + r.getBoundingClientRect().top - 230));
    return;
  }
}, firstPoint);
// a visible cursor for the recording (marked data-distill so the engine ignores it)
await page.evaluate(() => {
  const ns = 'http://www.w3.org/2000/svg';
  const c = document.createElement('div');
  c.id = 'demo-cursor';
  c.setAttribute('data-distill', '');
  c.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:30px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px)';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('width', '26'); s.setAttribute('height', '30'); s.setAttribute('viewBox', '0 0 26 30');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', 'M3 2 L3 24 L9 18.5 L13 27 L17 25.2 L13 17 L21 17 Z');
  p.setAttribute('fill', '#fff'); p.setAttribute('stroke', '#111'); p.setAttribute('stroke-width', '1.6'); p.setAttribute('stroke-linejoin', 'round');
  s.appendChild(p); c.appendChild(s);
  const r = document.createElement('div');
  r.id = 'demo-ring';
  r.style.cssText = 'position:absolute;left:-13px;top:-13px;width:30px;height:30px;border-radius:50%;border:2px solid rgba(31,79,209,.85);opacity:0';
  c.appendChild(r);
  document.documentElement.appendChild(c);
  window.__DS_MANUAL = true;
});

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const START = 0.75;          // the extension is clicked
const SECONDS = 11.2;
// cursor keyframes [time, x, y]; card targets are filled in once the card exists
const keys = [[0, 640, 520], [0.6, 1236, 22], [START + 0.05, 1236, 22], [2.6, 1100, 300]];
let targets = null, escAt = 10.0, clicks = [], scrolled = false;
const clickAt = (t, what) => clicks.push({ t, what, done: false });
clickAt(START, 'start');

function cursorAt(t) {
  let a = keys[0], b = keys[keys.length - 1];
  if (t >= b[0]) return { x: b[1], y: b[2] };
  for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i][0] && t <= keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; break; }
  const u = b[0] === a[0] ? 1 : ease((t - a[0]) / (b[0] - a[0]));
  return { x: a[1] + (b[1] - a[1]) * u, y: a[2] + (b[2] - a[2]) * u };
}

let ring = 0, cardScroll = null;
const total = Math.round(SECONDS * FPS);
for (let f = 0; f < total; f++) {
  const t = f / FPS;
  for (const c of clicks) {
    if (c.done || t < c.t) continue;
    c.done = true;
    ring = 1;
    if (c.what === 'start') {
      await page.addScriptTag({ path: join(root, 'src/distill.js') });
      // keep the cursor above the card: move it after the overlay in the document
      await page.evaluate(() => document.documentElement.appendChild(document.getElementById('demo-cursor')));
    }
    else if (c.what === 'esc') await page.keyboard.press('Escape');
    else await page.mouse.click(c.x, c.y);
  }
  // once the card is open, aim at the third point, then the keywords
  if (!targets && t > 3.2) {
    targets = await page.evaluate(() => {
      const sr = document.querySelector('distill-overlay').shadowRoot;
      const pt = sr.querySelectorAll('.pt')[2].getBoundingClientRect();
      const bd = sr.querySelector('.bd');
      const max = bd.scrollHeight - bd.clientHeight;
      bd.scrollTop = max;
      const chip = sr.querySelectorAll('.chip')[1].getBoundingClientRect();
      bd.scrollTop = 0;
      return { pt: [pt.left + 40, pt.top + 14], chip: [chip.left + chip.width / 2, chip.top + chip.height / 2], max };
    });
    keys.push([4.0, targets.pt[0], targets.pt[1]], [4.25, targets.pt[0], targets.pt[1]]);
    clicks.push({ t: 4.3, x: targets.pt[0], y: targets.pt[1], done: false });
    keys.push([5.6, targets.chip[0] + 60, targets.chip[1] - 160], [6.3, targets.chip[0], targets.chip[1]]);
    cardScroll = { from: 5.4, to: 6.1, max: targets.max };
    clicks.push({ t: 6.6, x: targets.chip[0], y: targets.chip[1], done: false });
    clicks.push({ t: 8.0, x: targets.chip[0], y: targets.chip[1], done: false });
    keys.push([8.05, targets.chip[0], targets.chip[1]], [9.3, 1236, 120]);
    clicks.push({ t: escAt, what: 'esc', done: false });
  }
  if (cardScroll && t >= cardScroll.from && !scrolled) {
    const u = Math.min(1, (t - cardScroll.from) / (cardScroll.to - cardScroll.from));
    await page.evaluate((y) => { const h = document.querySelector('distill-overlay'); if (h) h.shadowRoot.querySelector('.bd').scrollTop = y; }, ease(u) * cardScroll.max);
    if (u >= 1) scrolled = true;
  }
  const c = cursorAt(t);
  ring = Math.max(0, ring - 1 / (FPS * 0.35));
  await page.mouse.move(c.x, c.y);
  await page.evaluate(({ x, y, ring, dt }) => {
    const el = document.getElementById('demo-cursor');
    el.style.transform = `translate(${x - 3}px, ${y - 2}px)`;
    const r = document.getElementById('demo-ring');
    r.style.opacity = String(ring);
    r.style.transform = `scale(${1.7 - ring * 0.8})`;
    const S = window.__distill;
    if (S && S.alive) S.step(dt);
  }, { x: c.x, y: c.y, ring, dt: 1 / FPS });
  await page.screenshot({ path: join(frames, `f${String(f).padStart(4, '0')}.png`) });
  if (f % 30 === 0) process.stdout.write(`frame ${f}/${total}\r`);
}
await browser.close();
server.close();
console.log('\nencoding...');
const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
ff(['-framerate', String(FPS), '-i', join(frames, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-movflags', '+faststart', join(root, OUT + '.mp4')]);
ff(['-framerate', String(FPS), '-i', join(frames, 'f%04d.png'), '-vf', 'fps=20,scale=960:-1:flags=lanczos', '-c:v', 'libwebp_anim', '-lossless', '0', '-q:v', '70', '-compression_level', '5', '-loop', '0', join(root, 'assets', OUT + '.webp')]);
ff(['-framerate', String(FPS), '-i', join(frames, 'f%04d.png'), '-vf', 'fps=12,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle', join(root, 'assets', OUT + '.gif')]);
console.log(`done: ${OUT}.mp4, assets/${OUT}.webp, assets/${OUT}.gif`);
