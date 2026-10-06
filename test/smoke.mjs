// Smoke test: distill the fixture pages, check the summary, the highlights and the card,
// then press Esc and check the page comes back pixel-identical.  Run: npm install && npm test
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  console.error('Playwright is missing. Run "npm install" first (and "npx playwright install chromium" if needed).');
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const p = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!p.startsWith(root + '/')) throw new Error('outside');
    const headers = { 'content-type': types[extname(p)] || 'application/octet-stream' };
    // ?csp=1 serves the page with a strict policy: no inline scripts, no inline styles, no data: images
    if (url.searchParams.get('csp')) headers['content-security-policy'] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'";
    res.writeHead(200, headers);
    res.end(await readFile(p));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// test what ships: the minified build if it exists, else the source
const built = join(root, 'distill.min.js');
let engine = join(root, 'src/distill.js');
try { await readFile(built); engine = built; } catch {}
const engineUrl = '/' + engine.replace(root + '/', '');
console.log('engine:', engineUrl.slice(1));

const results = [];
const check = (name, ok, info = '') => { results.push(!!ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  (' + info + ')' : ''}`); };
const step = (page, seconds) => page.evaluate((n) => { for (let i = 0; i < n; i++) window.__distill && window.__distill.step(1 / 60); }, Math.round(seconds * 60));
const closeAll = async (page) => {
  await page.keyboard.press('Escape');
  for (let i = 0; i < 120; i++) {
    const alive = await page.evaluate(() => !!(window.__distill && window.__distill.alive && (window.__distill.step(1 / 60), true)));
    if (!alive) break;
  }
  await page.waitForTimeout(100);
};
const leftovers = (page) => page.evaluate(() => ({
  alive: !!(window.__distill && window.__distill.alive),
  host: document.querySelectorAll('distill-overlay,[data-distill]').length,
  highlights: [...CSS.highlights.keys()].filter((k) => k.startsWith('distill')).length,
  sheets: document.adoptedStyleSheets.length,
  styled: document.querySelectorAll('[style*="!important"]').length,
  text: document.body.innerText,
  html: document.body.outerHTML,
}));
const shadowText = (page) => page.evaluate(() => { const h = document.querySelector('distill-overlay'); return h && h.shadowRoot ? h.shadowRoot.textContent : ''; });

const browser = await chromium.launch();
try {
  // 1. English magazine article: summary, highlights, jump, keyword, Esc
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/test/fixtures/article-en.html`, { waitUntil: 'load' });
    await page.waitForTimeout(150);
    const before = await page.screenshot();
    const textBefore = await page.evaluate(() => document.body.innerText);
    const htmlBefore = await page.evaluate(() => document.body.outerHTML);
    const sheetsBefore = await page.evaluate(() => document.adoptedStyleSheets.length);
    await page.evaluate(() => { window.__DS_MANUAL = true; });
    await page.addScriptTag({ url: engineUrl });
    const r = await page.evaluate(() => window.__distill.result());
    check('finds the article and writes a summary', r.main && r.points.length === 5, `${r.words} words, ${r.points.length} points, ${r.ms} ms`);
    check('picks figures and keywords', r.figures.length >= 2 && r.keywords.length >= 5, r.figures.map((f) => f.value).join(', '));
    check('reading time before and after', r.readMinutes > 4 && r.summarySeconds > 10 && r.summarySeconds < 60, `${r.readMinutes} min -> ${r.summarySeconds} s`);
    await step(page, 3.5);
    const st = await page.evaluate(() => window.__distill.state());
    check('marks key sentences with the CSS Highlight API', st.highlight && (await page.evaluate(() => CSS.highlights.get('distill-key').size)) === 6);
    check('menus, ads and sidebars evaporate', st.chaff >= 8, `${st.chaff} elements`);
    check('the card opens', st.phase === 'idle' && (await shadowText(page)).includes(r.points[0].slice(0, 30)));
    const y0 = await page.evaluate(() => scrollY);
    await page.evaluate(() => window.__distill.jump(3));
    await step(page, 1.2);
    const jumped = await page.evaluate((txt) => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) if (n.data.includes(txt)) { const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); return { y: scrollY, top: b.top }; }
      return null;
    }, r.points[3].slice(0, 25));
    check('clicking a point scrolls to it', jumped && jumped.y !== y0 && jumped.top > -200 && jumped.top < 800, jumped && `scrollY ${jumped.y}`);
    await page.evaluate(() => window.__distill.keyword(1));
    await step(page, 0.5);
    check('clicking a keyword highlights every mention', (await page.evaluate(() => CSS.highlights.get('distill-kw').size)) >= 5);
    const summary = await page.evaluate(() => window.__distill.debug.summaryText());
    check('copy text has the title and the points', summary.startsWith(r.title) && (summary.match(/\n- /g) || []).length === 5);
    await page.evaluate(() => window.scrollTo(0, 0));
    await closeAll(page);
    const left = await leftovers(page);
    const after = await page.screenshot();
    check('Esc switches it off', !left.alive);
    check('no overlay, highlights or style sheets left behind', left.host === 0 && left.highlights === 0 && left.sheets === sheetsBefore && left.styled === 0);
    check('page text is identical', left.text === textBefore);
    check('page markup is identical (inline styles included)', left.html === htmlBefore);
    check('page is pixel-identical after Esc', before.equals(after));
    check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }

  // 2. Running it again toggles it off
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${base}/test/fixtures/docs.html`, { waitUntil: 'load' });
    const htmlBefore = await page.evaluate(() => document.body.outerHTML);
    await page.evaluate(() => { window.__DS_MANUAL = true; });
    await page.addScriptTag({ url: engineUrl });
    const r = await page.evaluate(() => window.__distill.result());
    check('docs page: main idea from the intro, no code blocks', /^Caching lets/.test(r.main) && !r.points.some((p) => /^GET |HTTP\/1\.1/.test(p)));
    await step(page, 3);
    await page.addScriptTag({ url: engineUrl });
    for (let i = 0; i < 60; i++) await step(page, 1 / 60);
    const left = await leftovers(page);
    check('second run puts the page back', !left.alive && left.host === 0 && left.html === htmlBefore);
    await page.close();
  }

  // 3. Strict Content-Security-Policy: no violations from the engine
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${base}/test/fixtures/article-en.html?csp=1`, { waitUntil: 'load' });
    await page.evaluate(() => { window.__violations = []; document.addEventListener('securitypolicyviolation', (e) => window.__violations.push(e.violatedDirective + ' ' + e.blockedURI)); });
    const htmlBefore = await page.evaluate(() => document.body.outerHTML);
    await page.evaluate(() => { window.__DS_MANUAL = true; });
    await page.addScriptTag({ url: engineUrl });
    await step(page, 3.5);
    const ok = await page.evaluate(() => window.__distill.state().phase === 'idle' && CSS.highlights.get('distill-key').size === 6);
    await closeAll(page);
    const v = await page.evaluate(() => window.__violations);
    const html = await page.evaluate(() => document.body.outerHTML);
    check('works under a strict Content-Security-Policy', ok && v.length === 0 && html === htmlBefore, v.slice(0, 3).join(' | '));
    await page.close();
  }

  // 4. Encyclopedia layout: definition first, no reference markers
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${base}/test/fixtures/wiki.html`, { waitUntil: 'load' });
    await page.evaluate(() => { window.__DS_MANUAL = true; });
    await page.addScriptTag({ url: engineUrl });
    const r = await page.evaluate(() => window.__distill.result());
    check('encyclopedia: definition as the main idea, no [1] markers', /^The waggle dance is/.test(r.main) && ![r.main, ...r.points].some((p) => /\[\d+\]|\[edit\]/.test(p)));
    await closeAll(page);
    await page.close();
  }

  // 5. A page with nothing to read
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${base}/test/fixtures/app.html`, { waitUntil: 'load' });
    const htmlBefore = await page.evaluate(() => document.body.outerHTML);
    await page.evaluate(() => { window.__DS_MANUAL = true; });
    await page.addScriptTag({ url: engineUrl });
    await step(page, 2);
    const r = await page.evaluate(() => window.__distill.result());
    const ui = await shadowText(page);
    await closeAll(page);
    const left = await leftovers(page);
    check('app page: says there is little to distill and changes nothing', r.empty && /Not much to distill/.test(ui) && left.html === htmlBefore && left.host === 0);
    await page.close();
  }

  // 6. Phone: the card becomes a bottom sheet
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.goto(`${base}/test/fixtures/article-en.html`, { waitUntil: 'load' });
    await page.evaluate(() => { window.__DS_MANUAL = true; });
    await page.addScriptTag({ url: engineUrl });
    await step(page, 3.5);
    const sheet = await page.evaluate(() => { const c = document.querySelector('distill-overlay').shadowRoot.querySelector('.card'); const r = c.getBoundingClientRect(); return c.classList.contains('sheet') && r.left < 20 && r.right > 370 && r.bottom > 820; });
    check('phone layout: bottom sheet', sheet);
    await closeAll(page);
    await page.close();
  }

  // 7. Chrome's built-in AI (mocked): AI summary, quotes tab and translation
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: 'es-ES' });
    await page.goto(`${base}/test/fixtures/article-en.html`, { waitUntil: 'load' });
    await page.evaluate(() => {
      window.__DS_MANUAL = true;
      window.__DS_AI_TEST = true;
      const points = ['Scouts search the countryside for hollow trees and nest boxes.', 'They advertise good sites with the waggle dance.', 'Support fades unless new scouts keep agreeing.', 'A quorum of 15 to 20 scouts at one site ends the debate.', 'Swarms pick the best box in four out of five trials.'];
      window.Summarizer = {
        availability: async () => 'available',
        create: async (o) => ({
          inputQuota: 3000,
          measureInputUsage: async (t) => Math.ceil(t.length / 4),
          summarize: async () => (o.type === 'tldr' ? 'A honeybee swarm chooses its new home through a debate among a few hundred scouts.' : points.map((p) => '* ' + p).join('\n')),
          summarizeStreaming: () => (async function* () { for (const p of points) { await new Promise((r) => setTimeout(r, 5)); yield '* ' + p + '\n'; } })(),
          destroy() {},
        }),
      };
      window.Translator = {
        availability: async () => 'downloadable',
        create: async () => ({ translate: async (s) => '[es] ' + s }),
      };
    });
    await page.addScriptTag({ url: engineUrl });
    await page.waitForTimeout(400);
    await step(page, 3.5);
    const r = await page.evaluate(() => window.__distill.result());
    const st = await page.evaluate(() => window.__distill.state());
    const ui = await shadowText(page);
    check('card stays in English in a Spanish browser', ui.includes('Main idea') && ui.includes('Key points'));
    check('Chrome AI: writes the points and maps them to the page', st.ai === 'done' && st.mode === 'a' && r.ai && r.ai.points.length === 5 && ui.includes('waggle dance.'));
    await page.evaluate(() => document.querySelector('distill-overlay').shadowRoot.querySelector('[data-act=tr]').click());
    await page.waitForTimeout(300);
    const tr = await page.evaluate(() => window.__distill.state().translated);
    const ui2 = await shadowText(page);
    check('Chrome AI: translates the summary to the reader\'s language', tr && ui2.includes('[es] Scouts search'));
    await page.evaluate(() => document.querySelector('distill-overlay').shadowRoot.querySelector('[data-m=q]').click());
    const ui3 = await shadowText(page);
    check('Chrome AI: quotes tab shows the original sentences', ui3.includes('[es] ' + r.points[0].slice(0, 20)));
    await closeAll(page);
    await page.close();
  }

  // 8. Chrome's AI when the model is not downloaded yet: nothing starts until the reader clicks
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${base}/test/fixtures/docs.html`, { waitUntil: 'load' });
    await page.evaluate(() => {
      window.__DS_MANUAL = true;
      window.__DS_AI_TEST = true;
      window.__created = 0;
      window.Summarizer = {
        availability: async () => 'downloadable',
        create: async (o) => {
          window.__created++;
          if (o.monitor) { const t = new EventTarget(); o.monitor(t); t.dispatchEvent(Object.assign(new Event('downloadprogress'), { loaded: 1 })); }
          return { summarize: async () => (o.type === 'tldr' ? 'Caching reuses responses.' : '* Use max-age for assets.\n* Use no-cache for HTML.\n* Use no-store for private data.'), destroy() {} };
        },
      };
    });
    await page.addScriptTag({ url: engineUrl });
    await page.waitForTimeout(200);
    await step(page, 3);
    const offered = await page.evaluate(() => { const b = document.querySelector('distill-overlay').shadowRoot.querySelector('[data-act=ai]'); return { button: !!b && !b.closest('[hidden]'), created: window.__created }; });
    await page.evaluate(() => document.querySelector('distill-overlay').shadowRoot.querySelector('[data-act=ai]').click());
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => window.__distill.result());
    check('Chrome AI: waits for a click before downloading the model', offered.button && offered.created === 0 && r.ai && r.ai.points.length === 3);
    await closeAll(page);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
const failed = results.filter((r) => !r).length;
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
