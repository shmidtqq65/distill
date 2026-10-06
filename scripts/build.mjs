// Build: minify src/distill.js, write the bookmarklet, sync the extension and the userscript.
// Usage: npm install && npm run build
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(resolve(root, 'src/distill.js'), 'utf8');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const version = (src.match(/const VERSION = '([^']+)'/) || [])[1];
if (version !== pkg.version) throw new Error(`version mismatch: src ${version} vs package.json ${pkg.version}`);

// Keep the source ASCII: a non-ASCII character costs 6 to 9 characters in the bookmarklet (%E2%80%94),
// so src/distill.js writes them as \u escapes.
if (/[^\x00-\x7f]/.test(src)) throw new Error('non-ASCII character in src/distill.js: ' + src.match(/[^\x00-\x7f]/)[0]);

// Internal property names that are safe to shorten. Never list anything that is part of the public
// API (window.__distill, result(), state()), a CSS variable name or a key the code reads through a
// computed name (hl[k], STOP[lang], dataset.*). Terser also refuses to rename DOM property names.
const PRIVATE = /^(segs|ld|dek|nk|sec|tk|tf|nn|lead|score|capC|occ|parts|kind|ctx|inRoot|prose|heads|sents|figs|kws|sumWords|origSec|sumSec|dur|sweep|dropped|gr|age|life|sx|x0|y0|px|py|splash|got|need|fillTo|tldr|tabs|pts|aib|chips|liq|bubs|acts|prog|picked|raw|el|ib|sc|tr|txt|tot|bg|fg|lw|go|ts|tid|label|level|st|err|av|copied|orig|quotes|useAi|aiOffer|aiDl|writing|trWork|srcQ|srcA|srcT|emptyHint|mini|aiFail|trFail|shorter|flask|note|wm|ph|len|link|blocks|titleEl|cred)$/;

const out = await minify(src, {
  ecma: 2020,
  compress: { passes: 3, unsafe: true, unsafe_arrows: true, unsafe_methods: true, pure_getters: true },
  mangle: { properties: { regex: PRIVATE } },
  format: { quote_style: 1, comments: false, ascii_only: true },
});
const min = out.code.trim();
const banner = `/*! DISTILL v${version} | TL;DR any website, nothing leaves your browser | MIT | github.com/shmidtqq65/distill */`;
writeFileSync(resolve(root, 'distill.min.js'), banner + '\n' + min + '\n');

// Bookmarklet: the whole engine inline, so it also runs on sites with a strict Content-Security-Policy.
// Encode only what a javascript: URL can't carry as-is (%, #, control and non-ASCII characters).
const encode = (s) => s.replace(/[%#\u0000-\u001f\u007f-\u{10FFFF}]/gu, (c) => encodeURIComponent(c));
const bookmarklet = 'javascript:' + encode(`/*distill v${version}*/` + min);
// Firefox silently truncates bookmark URLs longer than 65,536 characters (bugzilla 604374). It keeps
// ASCII as it is in javascript: URLs (only non-ASCII gets escaped, and we escape that ourselves),
// so the limit applies to this exact string. Keep a margin of about 1,000 characters.
if (bookmarklet.length > 64500) throw new Error(`bookmarklet too long for Firefox: ${bookmarklet.length} chars`);
writeFileSync(resolve(root, 'bookmarklet.txt'), bookmarklet + '\n');

// The extension ships its own copy (Manifest V3 forbids remote code).
mkdirSync(resolve(root, 'extension'), { recursive: true });
writeFileSync(resolve(root, 'extension/distill.js'), banner + '\n' + min + '\n');
const manifestPath = resolve(root, 'extension/manifest.json');
const mf = JSON.parse(readFileSync(manifestPath, 'utf8'));
mf.version = version;
writeFileSync(manifestPath, JSON.stringify(mf, null, 2) + '\n');

// Userscript: Alt+Shift+D distills the page; pressing it again (or Esc) puts the page back.
const raw = 'https://raw.githubusercontent.com/shmidtqq65/distill/main/userscript/distill.user.js';
const us = `// ==UserScript==
// @name         DISTILL
// @namespace    https://github.com/shmidtqq65/distill
// @version      ${version}
// @description  TL;DR any website. Press Alt+Shift+D for the summary, Esc to put the page back. Nothing leaves your browser.
// @author       shmidtqq
// @license      MIT
// @homepageURL  https://github.com/shmidtqq65/distill
// @downloadURL  ${raw}
// @updateURL    ${raw}
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==
(function () {
  'use strict';
  function run() {
${min}
  }
  window.addEventListener('keydown', function (e) {
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || e.repeat || e.code !== 'KeyD') return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    run();
  }, true);
})();
`;
mkdirSync(resolve(root, 'userscript'), { recursive: true });
writeFileSync(resolve(root, 'userscript/distill.user.js'), us);

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(`distill.min.js ${kb(Buffer.byteLength(min))}, bookmarklet ${bookmarklet.length} chars (Firefox limit 65,536), v${version}`);
