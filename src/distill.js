/*! DISTILL | TL;DR any website. Nothing leaves your browser. | MIT | github.com/shmidtqq65/distill */
(() => {
  'use strict';
  const VERSION = '1.0.0';
  const W = window, D = document, DE = D.documentElement;
  const prior = W.__distill;
  if (prior && prior.alive) { if (prior.state().phase === 'exit') prior.stop(); else prior.toggle(); return; }
  if (!DE || !D.body || !(D.body instanceof HTMLElement)) return;

  const OPT = Object.assign({ ai: true, translate: true, motion: true, credit: true }, W.__DS_OPTIONS || {});
  const MANUAL = !!W.__DS_MANUAL;
  const mq = (q) => !!(W.matchMedia && W.matchMedia(q).matches);
  const RM = !MANUAL && (OPT.motion === false || mq('(prefers-reduced-motion: reduce)'));
  const NS = 'http://www.w3.org/2000/svg';

  // ---------------------------------------------------------------- helpers
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const ease2 = (t) => ((t = clamp(t, 0, 1)), t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let seed = 0x2f6b9a1;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rr = (a, b) => a + rnd() * (b - a);
  const up = (e) => e.parentElement || (e.parentNode && e.parentNode.host) || null;
  const within = (e, r) => { for (; e; e = up(e)) if (e === r) return true; return false; };
  const now = () => (W.performance ? performance.now() : Date.now());

  let cc;
  const rgba = (c) => {
    const m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(c || '');
    if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    if (!cc) { const k = D.createElement('canvas'); k.width = k.height = 1; cc = k.getContext('2d', { willReadFrequently: true }); }
    cc.clearRect(0, 0, 1, 1); cc.fillStyle = '#000'; cc.fillStyle = c || '#000'; cc.fillRect(0, 0, 1, 1);
    const d = cc.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const mix = (a, b, t, al) => 'rgba(' + [0, 1, 2].map((i) => Math.round(lerp(a[i], b[i], t))).join(',') + ',' + (al === undefined ? 1 : al) + ')';
  const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

  // Inline style ledger: every property we touch is put back exactly as it was.
  const ledger = new Map();
  const setCss = (el, p, v) => {
    if (!el.style) return; // foreign-namespace elements have no style
    let r = ledger.get(el);
    if (!r) ledger.set(el, (r = { a: el.getAttribute('style'), p: {}, w: {} }));
    if (!(p in r.p)) r.p[p] = [el.style.getPropertyValue(p), el.style.getPropertyPriority(p)];
    else if (el.style.getPropertyValue(p) !== r.w[p] || el.style.getPropertyPriority(p) !== 'important') return; // the page took this property back
    el.style.setProperty(p, v, 'important');
    r.w[p] = el.style.getPropertyValue(p);
  };
  const normStyle = (s) => { const x = D.createElement('i'); x.style.cssText = s || ''; return x.style.cssText; };
  const unCss = (el) => {
    const r = ledger.get(el);
    if (!r) return;
    ledger.delete(el);
    for (const p in r.p) {
      // if the page changed the property while we were open, its value wins
      if (el.style.getPropertyValue(p) !== r.w[p] || el.style.getPropertyPriority(p) !== 'important') continue;
      const v = r.p[p];
      if (v[0]) el.style.setProperty(p, v[0], v[1]); else el.style.removeProperty(p);
    }
    const cur = el.getAttribute('style');
    if (r.a === null) { if (cur !== null && !el.style.length) el.removeAttribute('style'); }
    else if (cur !== r.a && el.style.cssText === normStyle(r.a)) {
      el.setAttribute('style', r.a);
      if (el.style.cssText !== normStyle(r.a)) el.style.cssText = normStyle(r.a); // style-src CSP refused the attribute
    }
  };

  // ---------------------------------------------------------------- languages
  const STOP = {
    en: 'the,of,and,to,in,a,is,that,for,it,as,was,with,be,by,on,not,he,i,this,are,or,his,from,at,which,but,have,an,they,you,were,her,she,there,one,all,we,their,been,has,would,will,its,if,more,so,who,what,can,no,when,also,about,into,than,them,could,these,only,other,some,my,like,then,do,any,may,just,most,over,out,such,our,new,how,up,after,him,should,very,where,between,through,those,both,each,made,many,before,well,much,even,while,must,because,did,said,back,same,however,under,being,does,during,without,since,own,until,per,via,yet,among,off,few,here,me,too,why,your,am,again,down,once,ever,around,within,upon,s,t,enough,lot,really,quite,almost,often,always,never,something,thing,things,first,last,next,long,little,great,good,best,high,big,small,though,although,already,instead,across,along,every,another,others,less,least,time,times,two,three,four,five,six,seven,eight,nine,ten,hundred,thousand,million,billion,dozen,percent,half,way,ways,get,got,make,use,used,using,need,know,see,say,says,take,still,now,today,year,years,day,days,people,click,press,open,run,read,work,works,show,find,give,keep,put,look,looks,makes,takes,uses,want,try,start,set,add',
    de: 'der,die,und,in,den,von,zu,das,mit,sich,des,auf,fur,ist,im,dem,nicht,ein,eine,als,auch,es,an,werden,aus,er,hat,dass,sie,nach,wird,bei,einer,um,am,sind,noch,wie,einem,uber,einen,so,zum,war,haben,nur,oder,aber,vor,zur,bis,mehr,durch,man,sein,wurde,sei,kann,wenn,diese,was,dann,doch,sehr,unter',
    fr: 'de,la,le,et,les,des,en,un,du,une,que,est,pour,qui,dans,par,sur,au,pas,plus,ne,il,ce,sont,avec,se,ou,mais,elle,son,aux,sa,ont,cette,ses,leur,nous,on,comme,tout,vous,je,lui,y,ete,etre,fait,peut,ces,dont,entre,aussi,bien,tres,sans,apres,meme,ils',
    es: 'de,la,que,el,en,y,a,los,se,del,las,un,por,con,no,una,su,para,es,al,lo,como,mas,pero,sus,le,ha,me,si,sin,sobre,este,ya,entre,cuando,todo,esta,ser,son,dos,tambien,fue,habia,era,muy,hasta,desde,porque,hay,puede,todos,nos,ni,donde,cada,otro,otros',
    it: 'di,e,il,la,che,in,a,per,un,non,una,del,le,si,i,da,con,al,sono,della,lo,come,piu,ma,gli,anche,se,ha,ci,dei,alla,nel,delle,o,questo,suo,sua,loro,dal,ne,essere,molto,tra,cui',
    pt: 'de,a,o,que,e,do,da,em,um,para,com,nao,uma,os,no,se,na,por,mais,as,dos,como,mas,foi,ao,ele,das,tem,seu,sua,ou,ser,quando,muito,ha,nos,ja,esta,tambem,pelo,pela,ate,isso,ela,entre,era',
    nl: 'de,en,van,het,een,in,is,dat,op,te,zijn,met,voor,niet,aan,er,die,maar,om,ook,als,dan,bij,of,uit,nog,door,over,wat,naar,wordt,worden,kan,was,hij,ze,zij,we,heeft,hebben,werd,geen,meer,zo,al,tot',
    zh: '\u4e00\u4e2a,\u6211\u4eec,\u4ed6\u4eec,\u8fd9\u4e2a,\u53ef\u4ee5,\u6ca1\u6709,\u56e0\u4e3a,\u4f46\u662f,\u5c31\u662f,\u4e0d\u662f,\u81ea\u5df1,\u4ec0\u4e48',
    th: '\u0e17\u0e35\u0e48,\u0e01\u0e32\u0e23,\u0e02\u0e2d\u0e07,\u0e41\u0e25\u0e30,\u0e43\u0e19,\u0e40\u0e1b\u0e47\u0e19,\u0e44\u0e14\u0e49,\u0e08\u0e30,\u0e21\u0e35,\u0e44\u0e21\u0e48,\u0e43\u0e2b\u0e49,\u0e27\u0e48\u0e32,\u0e01\u0e31\u0e1a,\u0e19\u0e35\u0e49,\u0e04\u0e27\u0e32\u0e21',
  };
  const WPM = { en: 228, de: 179, fr: 195, es: 218, it: 188, pt: 181, nl: 202, pl: 166, tr: 166, sv: 199, fi: 161, da: 173, ar: 138, he: 187 };
  const CPM = { zh: 255, ja: 357, th: 900, lo: 900, km: 900, my: 900 };
  const ABBR = new RegExp('(?:^|[\\s(\\[])(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|no|nr|fig|inc|ltd|co|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|al|ca|approx|cf|vol|pp|e\\.g|i\\.e|z\\.b|bzw|vgl|usw|d\\.h)\\.$', 'i');
  const LEADIN_EN = /^(this|it|they|these|those|he|she|but|however|also|and|so|then|that|such|its|their|there|here|thus|still|yet|or|because)\b/i;

  // ---------------------------------------------------------------- UI text
  // The card is always in English. UL is the reader's language, used only to offer a translation.
  const UL = String(navigator.language || 'en').toLowerCase();
  const T = {
    main: 'Main idea', points: 'Key points', figs: 'Figures', kws: 'Keywords',
    read: 'read', min: 'min', sec: 's', words: 'words', shorter: '#\u00d7 shorter',
    copy: 'Copy', copied: 'Copied', share: 'Share', tr: 'Translate', orig: 'Original',
    ai: 'AI', quotes: 'Quotes',
    useAi: "Use Chrome's AI", aiOffer: "Chrome's built-in AI can retell this page in its own words.",
    aiDl: 'The first run downloads the model and needs about 22 GB of free disk space.',
    dl: 'Downloading the model', writing: 'Writing a summary', trWork: 'Translating',
    srcQ: 'Picked from the page. Nothing left your browser.', srcA: "Written by Chrome's on-device AI. Nothing left your browser.",
    srcT: "Translated by Chrome's on-device AI.",
    empty: 'Not much to distill here', emptyHint: 'Open an article, a blog post or a docs page and try again.',
    cred: 'Distilled with DISTILL', close: 'Close', mini: 'Minimize', focus: 'Show the page as it is',
    aiFail: "Chrome's AI could not finish, showing quotes.", trFail: 'Translation is not available for this language.',
  };
  const NF = new Intl.NumberFormat('en');

  // ---------------------------------------------------------------- collect text blocks
  const SKIP = new Set('script style noscript template textarea input select option button svg math canvas iframe object embed video audio picture img pre head title meta link dialog datalist meter progress noembed rt rp'.split(' '));
  const HIDECLS = /(?<![a-z])(sr-only|screen-reader|visually-?hidden|a11y-hidden|editsection|noprint|reference|cite-bracket)(?![a-z])/i;
  let host = null;
  const sty = new Map();
  const cs = (e) => { let c = sty.get(e); if (!c) { const s = getComputedStyle(e); c = { d: s.display, v: s.visibility, p: s.position, f: s.cssFloat }; sty.set(e, c); } return c; };
  const isInl = (d) => d.startsWith('inline') || d === 'contents' || d.startsWith('ruby');
  const CJK_RE = /[\u0e00-\u0eff\u1000-\u109f\u1780-\u17ff\u3040-\u30ff\u3400-\u9fff]/g; // Thai, Lao, Burmese, Khmer, kana, Han

  function collect() {
    const blocks = [], bm = new Map(), rc = new Map();
    let last = null;
    const resolve = (e) => {
      if (rc.has(e)) return rc.get(e);
      const c = cs(e);
      let r = null;
      const tiny = (c.f !== 'none' || c.d === 'inline-block') && (e.textContent || '').trim().length <= 2;
      if (c.d === 'none') r = null;
      else if (!isInl(c.d) && !tiny) r = { b: e, a: e.localName === 'a' || !!(e.closest && e.closest('a')), ib: null };
      else {
        const q = up(e), pr = q ? resolve(q) : null;
        r = pr && { b: pr.b, a: pr.a || e.localName === 'a', ib: c.d === 'inline' || c.d === 'contents' || tiny ? pr.ib : e };
      }
      rc.set(e, r);
      return r;
    };
    const vis = (e) => {
      if (e.checkVisibility && !e.checkVisibility()) return false;
      const r = e.getBoundingClientRect();
      return r.width > 1 && r.height > 1;
    };
    const blockFor = (b) => {
      let B = bm.get(b);
      if (B === undefined) { B = vis(b) ? { el: b, t: '', segs: [], link: 0, ib: null } : null; bm.set(b, B); if (B) blocks.push(B); }
      return B;
    };
    const accept = (n) => {
      if (n.nodeType === 3) return 1;
      const t = n.localName;
      if (SKIP.has(t) || n === host || n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('data-distill')) return 2;
      if (t === 'sup' && (n.querySelector('a') || /ref|note|cite/i.test(n.className))) return 2;
      const k = n.getAttribute('class');
      if (k && HIDECLS.test(k)) return 2;
      return 1;
    };
    const visit = (root) => {
      const tw = D.createTreeWalker(root, 5, { acceptNode: accept });
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (n.nodeType === 1) {
          if (n.localName === 'br') {
            const r = n.parentNode && n.parentNode.nodeType === 1 ? resolve(n.parentNode) : null;
            const B = r && bm.get(r.b);
            if (B && B.t && !B.t.endsWith('\n')) B.t += '\n';
          }
          if (n.shadowRoot) visit(n.shadowRoot);
          continue;
        }
        const p = n.parentNode;
        if (!p || p.nodeType !== 1) continue;
        const data = n.data;
        const ws = !/\S/.test(data);
        if (ws && !bm.get(p) && !(rc.get(p) && bm.get(rc.get(p).b))) continue;
        if (cs(p).v !== 'visible') continue;
        const r = resolve(p);
        if (!r) continue;
        let B = ws ? bm.get(r.b) : blockFor(r.b);
        if (!B) continue;
        if (!ws) {
          const end = B.t.charCodeAt(B.t.length - 1);
          if (B !== last && B.t) { if (end !== 10) B.t += '\n'; }
          else if (B.ib !== r.ib && B.t && end !== 32 && end !== 10) B.t += ' ';
          B.ib = r.ib;
          last = B;
        }
        const s = B.t.length;
        B.t += data.replace(/\s/g, ' ');
        B.segs.push(n, s, B.t.length);
        if (r.a) B.link += data.length;
      }
    };
    visit(D.body);
    const out = [];
    for (const B of blocks) {
      if (!/[\p{L}\p{N}]/u.test(B.t)) continue;
      const m = /^h([1-6])$/.exec(B.el.localName);
      B.h = m ? +m[1] : B.el.getAttribute('role') === 'heading' ? +(B.el.getAttribute('aria-level') || 2) : 0;
      B.len = B.t.replace(/\s+/g, '').length;
      const cj = (B.t.match(CJK_RE) || []).length;
      B.words = (B.t.match(/[\p{L}\p{N}]+/gu) || []).length + (cj ? Math.round(cj / 2) : 0);
      B.ld = B.link / Math.max(1, B.t.length);
      out.push(B);
    }
    return out;
  }

  // ---------------------------------------------------------------- find the main content
  const NB = '(?<![a-z])(?<!(?:has|with|no|without|show|hide|is|enable|enabled|disable|disabled|hidden|toggle)[-_])(?:';
  const NEG_STRONG = new RegExp(NB + 'comments?|disqus|related|share|sharing|sharebar|social|newsletter|promo\\w*|ads?|advert\\w*|adslot|ad-?unit|sponsor\\w*|cookies?|consent|gdpr|outbrain|taboola|paywall|subscribe|signup|navbar|breadcrumbs?|recirc\\w*|recommend\\w*|read-?also|see-?also|more-?stories|trending|most-?read|editsection|navbox|reflist|references|catlinks|banner-?ad)(?![a-z0-9])', 'i');
  const NEG_WEAK = new RegExp(NB + 'banner|contact|foot|footer|footnotes?|login|masthead|menu|modal|nav|navigation|pagination|popup|reply|sidebar|shopping|tags?|toolbar|widget|byline|author|bio|popular|infobox|hatnote|toc|metadata|header)(?![a-z0-9])', 'i');
  const CAPTION = /(?<![a-z])(caption|thumbcaption|figcaption|credits?|photo-?credit|image-?credit|infobox)(?![a-z])/i;
  const POS = /(?<![a-z])(article|body|content|entry|hentry|h-entry|main|post|story|text|prose|markdown|rich-?text|blog|page)(?![a-z])/i;
  const NEG_TAG = new Set(['nav', 'aside', 'footer', 'form', 'dialog', 'menu', 'figcaption']);
  const NEG_ROLE = /^(navigation|complementary|contentinfo|banner|search|dialog|alertdialog|menu|menubar|toolbar|tablist|alert)$/;
  const negc = new Map();
  const negSelf = (e) => {
    let v = negc.get(e);
    if (v === undefined) {
      const k = (e.getAttribute('class') || '') + ' ' + (e.id || '');
      const r = e.getAttribute('role');
      v = e !== D.body && e !== DE && (NEG_TAG.has(e.localName) || (!!r && NEG_ROLE.test(r)) || ((NEG_STRONG.test(k) || NEG_WEAK.test(k) || CAPTION.test(k)) && !POS.test(k))) ||
        (e.localName === 'header' && !e.querySelector('h1'));
      negc.set(e, v);
    }
    return v;
  };
  const negUp = (e, stop) => { for (let n = 0; e && e !== stop && e !== D.body && e !== DE && n < 9; e = up(e), n++) if (negSelf(e)) return true; return false; };

  function pickRoot(blocks) {
    const acc = new Map();
    for (const B of blocks) {
      if (B.h) continue;
      // links and boilerplate count against a container, short labels a little, list items not at all
      let good = 0, bad;
      if (negUp(B.el)) bad = B.len;
      else {
        const li = /^(li|dd|dt|td)$/.test(B.el.localName);
        if (B.ld < 0.35 && (B.words >= 10 || (li && B.words >= 3))) good = B.len * (1 - B.ld);
        bad = B.len * B.ld + (good || li ? 0 : B.len * (1 - B.ld) * 0.3);
      }
      for (let e = B.el; e && e !== DE; e = up(e)) {
        const a = acc.get(e);
        if (a) { a[0] += good; a[1] += bad; } else acc.set(e, [good, bad]);
      }
    }
    const score = (e) => {
      const a = acc.get(e);
      if (!a || !a[0]) return -1e9;
      const k = (e.getAttribute('class') || '') + ' ' + (e.id || '');
      return (a[0] - 1.3 * a[1]) * (POS.test(k) ? 1.06 : 1) * (/^(article|main)$/.test(e.localName) ? 1.06 : 1);
    };
    let best = D.body, bs = -1e9;
    for (const e of acc.keys()) { const s = score(e); if (s > bs) { bs = s; best = e; } }
    // climb to the title when it costs little (article header, standfirst)
    for (let k = 0; k < 4; k++) {
      const p = up(best);
      if (!p || p === D.body || p === DE) break;
      const ps = score(p);
      const gain = (!best.querySelector('h1') && p.querySelector('h1')) || (p.localName === 'article' && !/^(article|main)$/.test(best.localName));
      if (gain && ps >= bs * 0.82) { best = p; bs = Math.max(bs, ps); } else break;
    }
    return { root: best, acc };
  }

  // ---------------------------------------------------------------- language detection, tokens
  function detectLang(sample) {
    const x = sample.slice(0, 6000), tag = (DE.getAttribute('lang') || '').toLowerCase().split(/[-_]/)[0];
    const n = (re) => (x.match(re) || []).length;
    const lat = n(/[a-z\u00c0-\u024f]/gi), kana = n(/[\u3040-\u30ff]/g), han = n(/[\u4e00-\u9fff]/g), hang = n(/[\uac00-\ud7af]/g);
    const other = n(/[\u0370-\u06ff\u0900-\u097f]/g), th = n(/[\u0e00-\u0e7f]/g);
    const big = Math.max(lat, kana + han, hang, other, th);
    if (!big) return tag || 'en';
    if (kana + han === big) return kana > 20 ? 'ja' : 'zh';
    if (hang === big) return 'ko';
    if (th === big) return 'th';
    if (other === big) return tag || 'xx';
    // Latin script: vote with the most frequent function words
    const words = sample.slice(0, 12000).toLowerCase().match(/\p{L}+/gu) || [];
    let best = '', bv = 0;
    for (const l of ['en', 'de', 'fr', 'es', 'it', 'pt', 'nl']) {
      const set = new Set(STOP[l].split(',').slice(0, 30));
      let v = 0;
      for (const w of words) if (set.has(norm(w))) v++;
      if (v > bv) { bv = v; best = l; }
    }
    if (tag && tag !== best && STOP[tag] && bv < words.length * 0.12) return tag;
    return bv > words.length * 0.05 ? best : tag || best || 'en';
  }
  const norm = (w) => {
    w = w.toLowerCase();
    if (/[\u00c0-\u024f]/.test(w)) w = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return w.replace(/\u2019/g, "'");
  };

  let LANG = 'en', CJK = false, stopSet = new Set(), segS = null, segW = null;
  const setLang = (l) => {
    LANG = l;
    CJK = /^(zh|ja|th|lo|km|my)$/.test(l);
    stopSet = new Set(((STOP[l] || '') + ',' + STOP.en).split(','));
    try { segS = W.Intl && Intl.Segmenter ? new Intl.Segmenter(l, { granularity: 'sentence' }) : null; segW = W.Intl && Intl.Segmenter ? new Intl.Segmenter(l, { granularity: 'word' }) : null; } catch (e) { segS = segW = null; }
  };
  const stem = (w) => {
    if (CJK || w.length < 3 || /\d/.test(w)) return w;
    if (w.length < 4) return w;
    if (LANG === 'en') {
      w = w.replace(/'s$/, '');
      if (/ies$/.test(w)) w = w.slice(0, -3) + 'y';
      else if (/sses$/.test(w)) w = w.slice(0, -2);
      else if (/[^su]s$/.test(w) && !/(is|us|ss)$/.test(w)) w = w.slice(0, -1);
      if (w.length > 5 && /ing$/.test(w)) w = w.slice(0, -3);
      else if (w.length > 4 && /ed$/.test(w)) w = w.slice(0, -2);
      if (w.length > 3 && /e$/.test(w)) w = w.slice(0, -1);
      if (/([bdfgklmnprt])\1$/.test(w)) w = w.slice(0, -1);
      return w.slice(0, 8);
    }
    w = w.replace(/(es|en|er|os|as|s|e|a|o)$/, (m) => (w.length - m.length >= 4 ? '' : m));
    return w.slice(0, 7);
  };
  const tokenize = (str, base) => {
    const out = [];
    const add = (raw, i) => {
      const w = norm(raw);
      const stop = stopSet.has(w) || (!CJK && w.length < 2) || (LANG === 'ja' && /^[\u3040-\u309f]+$/.test(w));
      out.push({ w, raw, o: base + i, l: raw.length, s: stop ? '' : stem(w), stop });
    };
    if (segW) { for (const s of segW.segment(str)) if (s.isWordLike) add(s.segment, s.index); }
    else { const re = /[\p{L}\p{N}][\p{L}\p{N}\p{M}'\u2019-]*/gu; let m; while ((m = re.exec(str))) add(m[0], m.index); }
    return out;
  };

  // ---------------------------------------------------------------- sentences
  const trimSpan = (t, a, b) => { while (a < b && /\s/.test(t[a])) a++; while (b > a && /\s/.test(t[b - 1])) b--; return [a, b]; };
  function sentencesOf(B) {
    const t = B.t, raw = [];
    if (segS) for (const s of segS.segment(t)) raw.push([s.index, s.index + s.segment.length]);
    else {
      const re = /[^.!?\u3002\uff01\uff1f\n]+(?:[.!?\u3002\uff01\uff1f]+["')\]\u00bb\u201d\u2019]*|\n|$)/g;
      let m;
      while ((m = re.exec(t))) { if (!m[0]) { re.lastIndex++; continue; } raw.push([m.index, m.index + m[0].length]); }
    }
    const out = [];
    for (const r of raw) {
      const p = out[out.length - 1];
      if (p) {
        const ps = t.slice(p[0], p[1]);
        const ns = t.slice(r[0], r[1]).trimStart();
        if (!/\n/.test(ps) && (!ns || /^\p{Ll}/u.test(ns) || /(?:^|[\s.(])\p{Lu}\.\s*$/u.test(ps) || ABBR.test(ps.trimEnd()) || /^[,;:)\]]/.test(ns))) { p[1] = r[1]; continue; }
      }
      out.push(r.slice());
    }
    return out.map((r) => trimSpan(t, r[0], r[1])).filter((r) => r[1] - r[0] > 1);
  }
  const clean = (s) => s.replace(/\[(?:\d+|[a-z]|citation needed)\]/gi, '').replace(/[\u00ad\u200b-\u200d\ufeff]/g, '').replace(/\s+/g, ' ').trim();

  // ---------------------------------------------------------------- analysis
  function analyze() {
    const t0 = now();
    const blocks = collect();
    if (!blocks.length) return null;
    const { root } = pickRoot(blocks);
    const inRoot = blocks.filter((B) => within(B.el, root));
    const heads = inRoot.filter((B) => B.h);
    const prose = inRoot.filter((B) => !B.h && B.words >= 4 && B.ld < 0.5 && !negUp(B.el, root) && !B.el.closest('figure,figcaption,caption,table.infobox,.thumbcaption,.wp-caption-text'));
    const sample = prose.map((B) => B.t).join(' ');
    setLang(OPT.lang || detectLang(sample));

    // title
    let titleEl = null;
    for (const B of blocks) if (B.h === 1 && (!titleEl || within(B.el, root))) { titleEl = B; if (within(B.el, root)) break; }
    let title = titleEl ? clean(titleEl.t) : '';
    if (!title) {
      const og = D.querySelector('meta[property="og:title"]');
      title = clean((og && og.content) || D.title || location.hostname);
    }

    // sentences
    const sents = [];
    let totalWords = 0, cjkChars = 0;
    for (const B of inRoot) {
      if (negUp(B.el, root)) continue;
      totalWords += B.words;
      if (CJK) cjkChars += (B.t.match(CJK_RE) || []).length;
    }
    let sec = 0, bodySeen = false;
    const proseSet = new Set(prose), seenText = new Set(), seenList = [];
    const DEK = /(?<![a-z])(dek|standfirst|subtitle|subhead|lede|lead|summary|excerpt|intro|description|deck|teaser|abstract|strapline|kicker)(?![a-z])/i;
    const isDek = (B) => { for (let e = B.el, n = 0; e && e !== root && n < 4; e = up(e), n++) if (e.localName === 'header' || DEK.test(e.getAttribute('class') || '')) return true; return false; };
    for (const B of inRoot) {
      if (sents.length >= 4000) break; // book-length pages: rank the first 80,000 words or so
      if (B.h && B.h > 1) { sec++; continue; }
      if (!proseSet.has(B)) continue;
      B.dek = !bodySeen && B.h === 0 && isDek(B);
      if (!B.dek && B.words >= 12) bodySeen = true;
      const ss = sentencesOf(B);
      const quoteLike = !!B.el.closest('blockquote,q,aside,figure');
      ss.forEach((r, k) => {
        const key = B.t.slice(r[0], r[1]).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
        if (key.length > 24 && (seenText.has(key) || (quoteLike && seenList.some((x) => x.includes(key))))) return; // pull quotes repeat the text
        seenText.add(key);
        if (key.length > 24) seenList.push(key);
        const tk = tokenize(B.t.slice(r[0], r[1]), r[0]);
        if (!tk.length) return;
        sents.push({ B, a: r[0], b: r[1], k, nk: ss.length, sec, n: CJK ? Math.ceil(tk.reduce((s, x) => s + x.l, 0) / 2) : tk.length, tk, text: clean(B.t.slice(r[0], r[1])) });
      });
    }
    const N = sents.length;
    const wordsOk = CJK ? cjkChars > 200 : totalWords >= 80;
    if (N < 3 || !wordsOk) return { empty: true, title, lang: LANG, root, words: totalWords };

    // tf-idf
    const tid = new Map();
    let nt = 0;
    for (const S of sents) {
      S.tf = new Map();
      for (const k of S.tk) if (k.s) { let id = tid.get(k.s); if (id === undefined) tid.set(k.s, (id = nt++)); S.tf.set(id, (S.tf.get(id) || 0) + 1); }
    }
    const df = new Uint32Array(nt);
    for (const S of sents) for (const id of S.tf.keys()) df[id]++;
    const idf = new Float64Array(nt);
    for (let i = 0; i < nt; i++) idf[i] = Math.log((N + 1) / (df[i] + 0.5));
    for (const S of sents) {
      S.v = new Map();
      let nn = 0;
      for (const [id, c] of S.tf) { const w = (1 + Math.log(c)) * idf[id]; S.v.set(id, w); nn += w * w; }
      S.nn = Math.sqrt(nn) || 1;
    }
    const sim = (P, Q) => { let d = 0; const [s, l] = P.v.size < Q.v.size ? [P.v, Q.v] : [Q.v, P.v]; for (const [id, w] of s) { const x = l.get(id); if (x) d += w * x; } return d / (P.nn * Q.nn); };

    // TextRank over an inverted index (only sentences that share a term are compared)
    const post = Array.from({ length: nt }, () => []);
    sents.forEach((S, i) => { for (const id of S.v.keys()) post[id].push(i); });
    const pair = new Map(), cap = Math.max(4, Math.min(90, N * 0.35));
    for (let id = 0; id < nt; id++) {
      const p = post[id];
      if (p.length < 2 || p.length > cap) continue;
      for (let x = 0; x < p.length; x++) {
        const i = p[x], wi = sents[i].v.get(id);
        for (let y = x + 1; y < p.length; y++) { const j = p[y], key = i * N + j; pair.set(key, (pair.get(key) || 0) + wi * sents[j].v.get(id)); }
      }
    }
    const adj = sents.map(() => []), ws = new Float64Array(N);
    for (const [key, d] of pair) {
      const i = Math.floor(key / N), j = key - i * N, s = d / (sents[i].nn * sents[j].nn);
      if (s < 0.03) continue;
      adj[i].push(j, s); adj[j].push(i, s); ws[i] += s; ws[j] += s;
    }
    let pr = new Float64Array(N).fill(1 / N), nx = new Float64Array(N);
    for (let it = 0; it < 32; it++) {
      nx.fill(0.15 / N);
      for (let i = 0; i < N; i++) {
        if (!ws[i]) continue;
        const c = (0.85 * pr[i]) / ws[i], a = adj[i];
        for (let k = 0; k < a.length; k += 2) nx[a[k]] += c * a[k + 1];
      }
      [pr, nx] = [nx, pr];
    }
    let prMax = 0;
    for (let i = 0; i < N; i++) prMax = Math.max(prMax, pr[i]);

    // title words that occur in the text
    const tv = new Set();
    for (const k of tokenize(title, 0)) if (k.s && tid.has(k.s)) tv.add(tid.get(k.s));

    // keyword stats (also feed the sentence score)
    const uni = new Map(), bi = new Map();
    sents.forEach((S, si) => {
      const tk = S.tk, txt = S.B.t;
      for (let i = 0; i < tk.length; i++) {
        const k = tk[i];
        if (!k.s || /^\d/.test(k.s) || k.w.length < (CJK ? 2 : 3) || (LANG === 'ja' && !/[\u4e00-\u9fff\u30a0-\u30ff]/.test(k.w))) continue;
        let u = uni.get(k.s);
        if (!u) uni.set(k.s, (u = { s: k.s, c: 0, f: new Map(), capC: 0, b: new Set(), occ: [] }));
        u.c++; u.b.add(S.B);
        const lw = i > 0 && /^\p{Lu}/u.test(k.raw) ? k.raw : k.raw.toLowerCase();
        u.f.set(lw, (u.f.get(lw) || 0) + 1);
        if (i > 0 && /^\p{Lu}/u.test(k.raw)) u.capC++;
        if (u.occ.length < 400) u.occ.push([S.B, k.o, k.o + k.l, si]);
        const n2 = tk[i + 1];
        if (n2 && n2.s && !/^\d/.test(n2.s) && (CJK || n2.w.length >= 3) && /^[\s\u00a0-]*$/.test(txt.slice(k.o + k.l, n2.o))) {
          const key = k.s + ' ' + n2.s;
          let g = bi.get(key);
          if (!g) bi.set(key, (g = { s: key, p: [k.s, n2.s], c: 0, f: new Map(), capC: 0, occ: [] }));
          g.c++;
          const form = txt.slice(k.o, n2.o + n2.l).replace(/\s+/g, ' ');
          const lf = i > 0 && /\p{Lu}/u.test(form) ? form : form.toLowerCase();
          g.f.set(lf, (g.f.get(lf) || 0) + 1);
          if (i > 0 && (/^\p{Lu}/u.test(k.raw) || /^\p{Lu}/u.test(n2.raw))) g.capC++;
          if (g.occ.length < 200) g.occ.push([S.B, k.o, n2.o + n2.l, si]);
        }
      }
    });
    const titleStems = new Set(tokenize(title, 0).map((k) => k.s).filter(Boolean));
    const cands = [];
    for (const u of uni.values()) if (u.c >= 2) cands.push({ ...u, sc: u.c * (titleStems.has(u.s) ? 1.6 : 1) * (u.b.size > 1 ? 1 : 0.6) * (u.capC > u.c * 0.6 ? 1.15 : 1), parts: [u.s] });
    for (const g of bi.values()) if (g.c >= 3 || (g.c >= 2 && (g.capC >= g.c || g.p.every((p) => titleStems.has(p))))) cands.push({ ...g, sc: g.c * 2.6 * (g.p.some((p) => titleStems.has(p)) ? 1.4 : 1), parts: g.p });
    cands.sort((a, b) => b.sc - a.sc);
    const kws = [], used = new Set();
    for (const c of cands) {
      if (kws.length >= 7) break;
      if (c.parts.some((p) => used.has(p))) continue;
      if (c.parts.length === 1 && cands.some((d) => d.parts.length === 2 && d.parts.includes(c.s) && d.c >= c.c * 0.7)) continue;
      c.parts.forEach((p) => used.add(p));
      let form = '', fc = 0;
      for (const [f, n] of c.f) if (n > fc || (n === fc && f < form)) { fc = n; form = f; }
      if (c.capC < c.c * 0.5) form = form.toLowerCase();
      kws.push({ label: form, count: c.c, occ: c.occ, parts: c.parts });
    }
    const topStems = new Set();
    for (const k of kws) k.parts.forEach((p) => topStems.add(p));

    // final sentence score
    const leadK = 3 + N * 0.06;
    let pos = 0;
    for (let si = 0; si < N; si++) {
      const S = sents[si], tr = pr[si] / (prMax || 1);
      S.tr = tr;
      S.ts = tv.size ? (() => { let d = 0; for (const id of tv) if (S.v.has(id)) d++; return d / tv.size; })() : 0;
      S.lead = Math.exp(-pos++ / leadK);
      let kw = 0;
      for (const k of S.tk) if (k.s && topStems.has(k.s)) kw++;
      S.kw = Math.min(1, kw / 4);
      const n = S.n;
      let f = n < 5 ? 0.15 : n < 8 ? 0.55 : n <= 38 ? 1 : n <= 55 ? 0.8 : 0.5;
      const txt = S.text;
      if (/\?\s*["'\u201d\u00bb)]*$/.test(txt)) f *= 0.65;
      if (/:\s*$/.test(txt)) f *= 0.55;
      if (/!\s*["'\u201d\u00bb)]*$/.test(txt)) f *= 0.9;
      if (LANG === 'en' && LEADIN_EN.test(txt)) f *= 0.82;
      if (S.B.el.localName === 'li' || S.B.el.closest('li')) f *= 0.88;
      if (S.B.el.closest('blockquote')) f *= 0.8;
      if (S.k === 0) f *= S.nk > 1 ? 1.08 : 1.04;
      else if (S.k === S.nk - 1 && S.nk > 2) f *= 0.96;
      if (/\d/.test(txt)) f *= 1.05;
      if (/\b(cookie|subscribe|sign up|newsletter|all rights reserved|click here|terms of service|privacy policy)\b/i.test(txt) || /\u00a9/.test(txt)) f *= 0.2;
      S.score = (0.54 * tr + 0.14 * S.ts + 0.14 * S.lead + 0.18 * S.kw) * f;
    }
    sents.forEach((S, i) => (S.i = i));

    // the main idea: central, close to the title, early, a sentence that stands on its own
    let main = null, mv = -1;
    let sMax = 0;
    for (const S of sents) sMax = Math.max(sMax, S.score);
    for (const S of sents) {
      if (S.n < (S.i < 3 ? 7 : CJK ? 8 : 10) || S.n > 45 || /\?\s*$/.test(S.text)) continue;
      const v = (0.42 * S.score) / (sMax || 1) + 0.22 * S.ts + 0.26 * S.lead + (S.B.dek ? 0.2 : 0);
      if (v > mv) { mv = v; main = S; }
    }
    if (!main) main = sents.slice().sort((a, b) => b.score - a.score)[0];

    // key points: maximal marginal relevance, then put back in reading order
    const K = N < 10 || totalWords < 400 ? 3 : N < 22 ? 4 : 5;
    const picked = [main];
    const pool = sents.filter((S) => S !== main && !S.B.dek && S.n >= 9 && S.n <= 60).sort((a, b) => b.score - a.score).slice(0, 60);
    if (pool.length < K) pool.push(...sents.filter((S) => S !== main && !pool.includes(S) && S.n >= 6 && S.n <= 60).sort((a, b) => b.score - a.score).slice(0, K));
    const secs = new Set(sents.map((S) => S.sec)).size;
    while (picked.length <= K && pool.length) {
      let bi2 = -1, bv2 = -1e9;
      pool.forEach((S, idx) => {
        let red = 0;
        for (const P of picked) red = Math.max(red, sim(S, P), P.B === S.B ? 0.5 : 0, secs > 2 && P.sec === S.sec ? 0.3 : 0);
        const v = 0.7 * (S.score / (sMax || 1)) - 0.3 * red;
        if (v > bv2) { bv2 = v; bi2 = idx; }
      });
      if (bi2 < 0) break;
      picked.push(pool.splice(bi2, 1)[0]);
    }
    const points = picked.slice(1).sort((a, b) => a.i - b.i);

    // figures
    const figs = figures(sents, sMax);

    // reading time
    const wpm = WPM[LANG] || 200;
    const origSec = CJK ? (cjkChars / (CPM[LANG] || 300)) * 60 : (totalWords / wpm) * 60;
    const sumWords = [main, ...points].reduce((s, S) => s + S.n, 0);
    const sumSec = (sumWords / (CJK ? 180 : wpm)) * 60;
    return {
      title, titleEl: titleEl ? titleEl.el : null, lang: LANG, root, blocks, inRoot, prose, heads, sents, main, points, figs, kws,
      words: CJK ? Math.round(cjkChars / 1.6) : totalWords, sumWords, origSec, sumSec, ms: Math.round(now() - t0),
    };
  }

  // numbers with their context ("40 liters", "37%", "$4.2 billion", "15 to 20")
  const CUR = '$\u20ac\u00a3\u00a5\u20b9';
  const NUM_RE = new RegExp('([' + CUR.replace('$', '\\$') + ']\\s?)?(\\d{1,3}(?:[,\\u00a0\\u202f\\u2009 ]\\d{3})+(?:[.,]\\d+)?|\\d+(?:[.,]\\d+)?)(\\s?(?:%|\\u2030))?', 'g');
  const MAG = 'thousand|million|billion|trillion|bn|mln|mio\\.?|mrd\\.?|millions?|milliards?|millones|mil millones|milioni|miliardi|milh\\p{L}*|bilh\\p{L}*';
  const UNITS = 'percent|per cent|degrees?|\\u00b0\\s?[cf]|km/h|kph|mph|km|kilomet\\p{L}*|miles?|meters?|metres?|cm|mm|kg|grams?|g|tons?|tonnes?|lbs?|pounds?|liters?|litres?|ml|gb|mb|tb|kb|kwh|mwh|gw|mw|kw|hz|khz|ghz|ms|hours?|hrs?|minutes?|mins?|seconds?|secs?|days?|weeks?|months?|years?|decades?|centuries|times|square \\S+|cubic \\S+|dollars?|euros?|usd|eur';
  const UNIT_RE = new RegExp('^(?:\\s?(?:' + MAG + ')(?![\\p{L}]))?(?:\\s?(?:' + UNITS + ')(?![\\p{L}]))?', 'iu');
  const RANGE_RE = new RegExp('^\\s?(?:to|-|\\u2013|\\u2014|bis|\\u00e0|a|al)\\s?(\\d[\\d.,]*)(\\s?%)?', 'i');
  function figures(sents, sMax) {
    const all = [];
    for (const S of sents) {
      const t = S.B.t, seg = t.slice(S.a, S.b);
      NUM_RE.lastIndex = 0;
      let m;
      while ((m = NUM_RE.exec(seg))) {
        const a = S.a + m.index;
        let b = a + m[0].length;
        const numStr = m[2];
        const val = parseFloat(numStr.replace(/[,\u00a0\u202f\u2009 ](?=\d{3}\b)/g, '').replace(',', '.'));
        if (!isFinite(val)) continue;
        if (/\p{L}/u.test(t[a - 1] || '') || /[\p{L}]/u.test(t[b] || '') && !/^\s/.test(t[b] || '')) {
          // glued to a word: "v2", "COVID19"; allow "5m", "10k" style magnitudes only
          if (!/^(k|m|bn)(?![\p{L}])/iu.test(t.slice(b))) continue;
        }
        let kind = m[1] ? 3 : m[3] ? 3 : 0;
        const glued = /^(k|m|bn|b)(?![\p{L}])/iu.exec(t.slice(b, b + 3));
        if (glued) { b += glued[0].length; kind = Math.max(kind, 2.6); }
        const rg = RANGE_RE.exec(t.slice(b, b + 16));
        if (rg) { b += rg[0].length; NUM_RE.lastIndex = b - S.a; if (rg[2]) kind = 3; }
        const u = UNIT_RE.exec(t.slice(b, b + 40));
        let unit = '';
        if (u && u[0].trim()) { unit = u[0]; b += unit.length; kind = Math.max(kind, /percent/i.test(unit) ? 3 : new RegExp('^\\s?(' + MAG + ')', 'iu').test(unit) ? 2.6 : 2); }
        if (!kind) {
          const year = /^\d{4}$/.test(numStr) && val >= 1500 && val <= 2100;
          kind = year ? 0.15 : rg ? 1.6 : val >= 1000 ? 2 : val >= 10 ? 0.9 : 0.25;
        }
        if (/^\s?%/.test(t.slice(b))) continue;
        all.push({ S, a, b, kind, sc: kind * (0.35 + S.score / (sMax || 1)), text: t.slice(a, b).trim() });
      }
    }
    all.sort((x, y) => y.sc - x.sc);
    const out = [], seenS = new Set(), seenV = new Set();
    for (const f of all) {
      if (out.length >= 3 || f.kind < 0.8) break;
      const key = f.text.replace(/\s+/g, '').toLowerCase();
      if (seenS.has(f.S) || seenV.has(key)) continue;
      seenS.add(f.S); seenV.add(key);
      // context: the clause around the number, extended to the previous clause when tiny
      const t = f.S.B.t;
      let s = f.a, e = f.b;
      const stopL = /[.;:!?\u3002\n(]/, stopR = /[.;:!?\u3002\n)]/;
      const wc = (x) => (x.trim() ? x.trim().split(/\s+/).length : 0);
      while (s > f.S.a && !stopL.test(t[s - 1]) && !(t[s - 1] === ',' && wc(t.slice(s, f.a)) >= 3)) s--;
      while (e < f.S.b && !stopR.test(t[e]) && t[e] !== ',') e++;
      if (wc(t.slice(s, e)) - wc(f.text) < 3) { let n = 0; while (e < f.S.b && !stopR.test(t[e]) && n < 6) { if (t[e] === ' ') n++; e++; } }
      let s2 = f.a, e2 = f.b, nb = 0, na = 0;
      while (s2 > s && nb < 7) { s2--; if (t[s2] === ' ' && t[s2 + 1] !== ' ') nb++; }
      while (e2 < e && na < 7) { if (t[e2] === ' ' && t[e2 - 1] !== ' ') na++; e2++; }
      let ctx = (s2 > s ? '\u2026' : '') + clean(t.slice(s2, e2)) + (e2 < e ? '\u2026' : '');
      ctx = ctx.replace(/^[,\s\u2013\u2014-]+|[,\s\u2013\u2014-]+$/g, '');
      out.push({ S: f.S, a: f.a, b: f.b, text: clean(f.text), ctx });
    }
    return out.sort((x, y) => x.S.i - y.S.i || x.a - y.a);
  }

  // ---------------------------------------------------------------- ranges and highlights
  const locate = (B, off, end) => {
    const s = B.segs, n = s.length / 3;
    let lo = 0, hi = n - 1, k = end ? 0 : n - 1;
    if (!end) { while (lo <= hi) { const m = (lo + hi) >> 1; if (s[m * 3 + 2] > off) { k = m; hi = m - 1; } else lo = m + 1; } }
    else { while (lo <= hi) { const m = (lo + hi) >> 1; if (s[m * 3 + 1] < off) { k = m; lo = m + 1; } else hi = m - 1; } }
    const node = s[k * 3];
    return [node, Math.min(node.length, clamp(off, s[k * 3 + 1], s[k * 3 + 2]) - s[k * 3 + 1])];
  };
  const mkRange = (B, a, b) => {
    try {
      const r = D.createRange(), p = locate(B, a, 0), q = locate(B, b, 1);
      r.setStart(p[0], p[1]); r.setEnd(q[0], q[1]);
      return r;
    } catch (e) { return null; }
  };
  const HL = W.CSS && CSS.highlights && W.Highlight ? CSS.highlights : null;
  const hl = {};
  let psheet = null;
  const shadowRoots = new Set();

  // ---------------------------------------------------------------- state
  let R = null; // analysis result
  let alive = true, phase = 'intro', t = 0, raf = 0, lastTs = 0, dark = false;
  let wrap, cv, cx, card, ui = {}, vw = 0, vh = 0, dpr = 1, sheetMode = false;
  let chaff = [], soft = [], steamRects = [], dimRanges = [], keyItems = [];
  const parts = [], drops = [];
  let flask = { x: 0, y: 0, level: 0, show: 0, got: 0, need: 1 };
  let reveal = { start: 2.1, done: false, p: 0 }, exitT = -1, focusOff = false;
  let theme = {}, dimRule = null, keyRule = null, flashRule = null, kwRule = null;
  let scrollAnim = null, flash = null, kwActive = -1, kwPos = -1, mode = 'q', trState = 0, trCache = null, trInst = null;
  const AI = { st: 'none', tldr: '', pts: [], prog: 0, err: '', map: [] };

  // ---------------------------------------------------------------- page effects
  function prepareColors() {
    let bg = null;
    for (let e = R && R.root ? R.root : D.body; e && e.nodeType === 1; e = up(e)) {
      const c = rgba(getComputedStyle(e).backgroundColor);
      if (c[3] > 0.5) { bg = c; break; }
    }
    const ref = (R && R.prose && R.prose[Math.min(2, R.prose.length - 1)]) ? R.prose[Math.min(2, R.prose.length - 1)].el : D.body;
    const fg = rgba(getComputedStyle(ref).color);
    if (!bg || (lum(fg) > 0.75 && lum(bg) > 0.5)) bg = lum(fg) > 0.6 ? [18, 18, 18, 1] : [255, 255, 255, 1];
    dark = lum(bg) < 0.42;
    theme = { bg, fg, dim: mix(fg, bg, dark ? 0.6 : 0.64) };
  }

  function setupHighlights() {
    if (!HL) return;
    for (const k of ['dim', 'key', 'kw', 'flash']) { hl[k] = new Highlight(); hl[k].priority = { dim: 1, key: 2, kw: 3, flash: 4 }[k]; HL.set('distill-' + k, hl[k]); }
    psheet = new CSSStyleSheet();
    psheet.replaceSync('::highlight(distill-dim){}' +
      '::highlight(distill-key){background-color:transparent}' +
      '::highlight(distill-kw){background-color:' + (dark ? '#3d5fc4' : '#cddcff') + ';color:' + (dark ? '#fff' : 'inherit') + '}' +
      '::highlight(distill-flash){background-color:transparent}');
    D.adoptedStyleSheets = [...D.adoptedStyleSheets, psheet];
    const rules = psheet.cssRules;
    dimRule = rules[0]; keyRule = rules[1]; kwRule = rules[2]; flashRule = rules[3];
  }
  const adoptIn = (B) => {
    const rn = B.el.getRootNode();
    if (psheet && rn !== D && rn.adoptedStyleSheets && !shadowRoots.has(rn)) { shadowRoots.add(rn); rn.adoptedStyleSheets = [...rn.adoptedStyleSheets, psheet]; }
  };

  function buildRanges() {
    const keyS = [R.main, ...R.points];
    const byB = new Map();
    for (const S of keyS) { if (!byB.has(S.B)) byB.set(S.B, []); byB.get(S.B).push(S); }
    keyItems = keyS.map((S) => ({ S, r: mkRange(S.B, S.a, S.a), p: 0, start: 0, sweep: false, dropped: false }));
    if (!HL) return;
    for (const S of keyS) adoptIn(S.B);
    // very long pages are not dimmed: painting that much highlighted text makes scrolling janky
    if (R.prose.length > 500 || R.prose.reduce((n, B) => n + B.t.length, 0) > 80000) { for (const k of keyItems) if (k.r) hl.key.add(k.r); return; }
    for (const B of R.prose) {
      adoptIn(B);
      const ks = (byB.get(B) || []).slice().sort((x, y) => x.a - y.a);
      let a = 0;
      for (const S of ks) { const [x, y] = trimSpan(B.t, a, S.a); if (y > x) dimRanges.push(mkRange(B, x, y)); a = S.b; }
      const [x, y] = trimSpan(B.t, a, B.t.length);
      if (y > x) dimRanges.push(mkRange(B, x, y));
    }
    dimRanges = dimRanges.filter(Boolean);
    for (const r of dimRanges) hl.dim.add(r);
    for (const k of keyItems) if (k.r) hl.key.add(k.r);
  }

  function findChaff() {
    const root = R.root, tEl = R.titleEl;
    const out = new Set();
    const inOut = (e) => { for (let x = up(e); x; x = up(x)) if (out.has(x)) return true; return false; };
    const okBox = (e) => {
      if (e === host || !(e instanceof Element) || !e.style || SKIP.has(e.localName) && !/^(iframe|img|video|svg|picture|canvas|button|input|select|textarea|object|embed)$/.test(e.localName)) return false;
      if (/^(script|style|link|meta|template|noscript)$/.test(e.localName)) return false;
      const r = e.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    };
    const add = (e, depth) => {
      if (!okBox(e) || within(root, e) || (tEl && within(e, tEl))) return; // never the article or its headline
      if (tEl && within(tEl, e)) { if (depth < 6) for (const c of e.children) add(c, depth + 1); return; }
      out.add(e);
    };
    for (let e = root; e && e !== D.body && e !== DE; e = up(e)) {
      const p = up(e);
      if (!p) break;
      const kids = p.shadowRoot && e.getRootNode() === p.shadowRoot ? p.shadowRoot.children : p.children;
      for (const c of kids) if (c !== e) add(c, 0);
    }
    // boilerplate inside the article: share bars, ads, read-also boxes, tags, comments
    const proseIn = (e) => R.prose.some((B) => within(B.el, e) && !negUp(B.el, root));
    const scan = (e, depth) => {
      for (const c of e.children) {
        if (c === host) continue;
        if (negSelf(c) || (c.localName === 'iframe' && !proseIn(c))) { if (okBox(c) && !(tEl && within(tEl, c))) out.add(c); continue; }
        if (depth < 12) scan(c, depth + 1);
      }
    };
    scan(root, 0);
    // images and media inside the article fade but don't steam
    const sf = [];
    root.querySelectorAll('img,video,picture,svg,canvas,figure,iframe').forEach((e) => {
      if ((e.closest('figure') && e.localName !== 'figure') || out.has(e) || inOut(e) || !e.style) return;
      if (e.localName === 'svg' && e.getBoundingClientRect().width < 40) return;
      sf.push(e);
    });
    const list = [...out].filter((e) => !inOut(e));
    return { list: list.slice(0, 600), soft: sf.slice(0, 200) };
  }

  function applyChaff(k) {
    // k: 0 = page as is, 1 = fully evaporated. Only what is on screen animates; the rest jumps.
    for (const c of chaff) {
      let p = ease(clamp((k * 1.25 - c.d) / 0.9, 0, 1));
      if (!c.near && p > 0.001) p = 1;
      p = Math.round(p * 50) / 50;
      if (p === c.p) continue;
      c.p = p;
      if (p <= 0.001) { if (c.on) { unCss(c.el); c.on = false; } continue; }
      c.on = true;
      setCss(c.el, 'transition-property', 'none');
      setCss(c.el, 'opacity', String(c.o * (1 - 0.86 * p)));
      setCss(c.el, 'filter', 'blur(' + (1.8 * p).toFixed(2) + 'px) grayscale(' + p.toFixed(2) + ')');
      setCss(c.el, 'translate', '0 ' + (-10 * p).toFixed(1) + 'px');
      setCss(c.el, 'pointer-events', 'none');
    }
    for (const s of soft) {
      const p = Math.round(ease(k) * 50) / 50;
      if (p === s.p) continue;
      s.p = p;
      if (p <= 0.001) { if (s.on) { unCss(s.el); s.on = false; } continue; }
      s.on = true;
      setCss(s.el, 'transition-property', 'none');
      setCss(s.el, 'opacity', String(s.o * (1 - 0.6 * p)));
      setCss(s.el, 'filter', 'grayscale(' + (0.7 * p).toFixed(2) + ')');
    }
  }
  // every change repaints all highlighted text, so colours move in a few steps and only when they change
  let lastDim = -1, lastKey = -1;
  function setDim(k) {
    k = Math.round(k * 4) / 4;
    if (!dimRule || k === lastDim) return;
    lastDim = k;
    if (k <= 0) dimRule.style.removeProperty('color');
    else dimRule.style.setProperty('color', mix(theme.fg, rgba(theme.dim), k));
  }
  function setKeyColor(a) {
    a = Math.round(a * 4) / 4;
    if (!keyRule || a === lastKey) return;
    lastKey = a;
    keyRule.style.setProperty('background-color', dark ? 'rgba(232,220,74,' + a + ')' : 'rgba(255,230,64,' + (0.78 * a).toFixed(3) + ')');
    if (dark && a > 0.5) keyRule.style.setProperty('color', '#15150f'); else keyRule.style.removeProperty('color');
  }

  // ---------------------------------------------------------------- overlay
  const el = (tag, cls, parent, txt) => { const e = D.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; if (parent) parent.appendChild(e); return e; };
  const svg = (tag, attrs, parent) => { const e = D.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const ICON = {
    x: 'M4 4l8 8M12 4l-8 8',
    min: 'M3.5 9.5h9',
    eye: 'M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8z M8 6.2a1.8 1.8 0 1 0 0 3.6a1.8 1.8 0 1 0 0-3.6z',
  };
  const icon = (d) => { const s = svg('svg', { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'aria-hidden': 'true' }); svg('path', { d }, s); return s; };
  const FLASK = 'M9 2.5h6 M10 2.5v7.5L3.6 21.6c-.9 1.7.3 3.4 2.2 3.4h12.4c1.9 0 3.1-1.7 2.2-3.4L14 10V2.5';
  const flaskPath = typeof Path2D !== 'undefined' ? new Path2D('M10 2.5v7.5L3.6 21.6c-.9 1.7.3 3.4 2.2 3.4h12.4c1.9 0 3.1-1.7 2.2-3.4L14 10V2.5z') : null;

  const CSS_TEXT = `:host{all:initial}
*{box-sizing:border-box}
[hidden]{display:none!important}
.w{position:fixed;inset:0;pointer-events:none;font:14px/1.45 var(--f);color:var(--i);-webkit-font-smoothing:antialiased;text-align:start;direction:ltr;--f:var(--distill-sans,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif);--r:var(--distill-serif,"Iowan Old Style",Charter,"Palatino Linotype",Palatino,Georgia,serif)}
.fx{position:absolute;left:0;top:0;width:100%;height:100%}
.card{position:absolute;right:16px;bottom:16px;width:376px;max-height:calc(100% - 32px);display:flex;flex-direction:column;pointer-events:auto;background:var(--g);color:var(--i);border-radius:14px;box-shadow:inset 0 0 0 1px var(--e),0 22px 60px -18px rgba(8,18,28,.45),0 4px 16px rgba(8,18,28,.12);backdrop-filter:blur(18px) saturate(1.4);overflow:hidden;clip-path:inset(100% 0 0 0 round 14px)}
.card.sheet{left:8px;right:8px;bottom:8px;width:auto;max-height:min(72%,640px);border-radius:18px}
button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit;-webkit-tap-highlight-color:transparent}
button:focus-visible{outline:2px solid var(--b);outline-offset:2px}
.hd{display:flex;align-items:center;gap:2px;padding:9px 8px 0 18px;font:500 12px/1.2 var(--f);color:var(--m)}
.wm{font:600 15px/1 var(--r);letter-spacing:-.01em;color:var(--i);margin-right:9px}
.dom{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-top:1px}
.ic{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:var(--m)}
.ic:hover,.ic[aria-pressed=true]{background:var(--h);color:var(--i)}
.ic svg{width:16px;height:16px}
.bd{overflow:auto;overscroll-behavior:contain;padding:2px 18px 6px;scrollbar-width:thin}
.ttl{font:600 17px/1.28 var(--r);letter-spacing:-.005em;margin:2px 0 12px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.meter{margin:0 0 18px}
.rt{display:flex;align-items:baseline;gap:7px;font:600 15px/1.2 var(--f);font-variant-numeric:tabular-nums}
.rt i{font-style:normal;color:var(--b);font-weight:500}
.rt .sv{margin-left:auto;font:500 12px/1.2 var(--f);color:var(--m)}
.scale{position:relative;height:9px;margin:9px 0 7px;border-radius:5px;box-shadow:inset 0 0 0 1px var(--b);overflow:hidden}
.scale b{position:absolute;left:0;top:0;bottom:0;width:100%;background:var(--k);border-right:1px solid var(--b)}
.scale u{position:absolute;top:0;width:1px;height:3px;background:var(--b);opacity:.7}
.wc{font:400 12px/1.3 var(--f);color:var(--m);font-variant-numeric:tabular-nums}
.sec{margin:0 0 18px}
.lbl{display:flex;align-items:center;gap:8px;min-height:20px;font:600 11.5px/1.2 var(--f);color:var(--b);margin:0 0 7px;letter-spacing:.01em}
.tldr{font:400 18px/1.42 var(--r);margin:0;cursor:pointer;display:block;width:100%}
.tldr span{background:linear-gradient(transparent 55%,var(--k) 55%,var(--k) 93%,transparent 93%);-webkit-box-decoration-break:clone;box-decoration-break:clone}
.pts{list-style:none;margin:0;padding:0}
.pt{display:grid;grid-template-columns:22px 1fr;gap:8px;width:calc(100% + 12px);padding:6px 8px 6px 4px;margin:0 -8px 1px -4px;border-radius:9px;font:400 14px/1.48 var(--f)}
.pt:hover,.fig:hover,.tldr:hover span{background-color:var(--h)}
.pt em{font-style:normal;width:20px;height:20px;border-radius:50%;box-shadow:inset 0 0 0 1px var(--b);color:var(--b);font:600 10.5px/20px var(--f);text-align:center;margin-top:1px}
.tabs{margin-left:auto;display:inline-flex;border-radius:999px;padding:2px;box-shadow:inset 0 0 0 1px var(--l)}
.tabs button{padding:3px 9px;border-radius:999px;font:600 11px/1.25 var(--f);color:var(--m)}
.tabs button[aria-pressed=true]{background:var(--i);color:var(--so)}
.g{display:grid;margin:0 -8px;border-top:1px solid var(--l)}
.fig{display:grid;grid-template-columns:92px 1fr;gap:12px;align-items:baseline;width:100%;padding:9px 8px;border-bottom:1px solid var(--l)}
.fig b{font:600 20px/1.1 var(--r);font-variant-numeric:lining-nums;letter-spacing:-.01em;overflow-wrap:anywhere;color:var(--i)}
.fig b i{display:block;font:500 11.5px/1.3 var(--f);font-style:normal;color:var(--m);letter-spacing:0;margin-top:2px}
.fig small{font:400 12.5px/1.42 var(--f);color:var(--i);opacity:.82;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{display:inline-flex;align-items:baseline;gap:6px;padding:5px 10px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--l);font:500 12.5px/1.25 var(--f)}
.chip i{font-style:normal;font-size:11px;color:var(--m);font-variant-numeric:tabular-nums}
.chip:hover{background:var(--h)}
.chip[aria-pressed=true]{background:var(--w);box-shadow:none;color:var(--x)}
.chip[aria-pressed=true] i{color:inherit;opacity:.8}
.aib{display:grid;gap:8px;margin:2px 0 18px;padding:11px 12px;border-radius:10px;background:var(--h);font:400 12.5px/1.42 var(--f);color:var(--i)}
.aib .bar{height:4px;border-radius:2px;background:var(--l);overflow:hidden}
.aib .bar i{display:block;height:100%;width:0;background:var(--b)}
.aib button{justify-self:start}
.ft{border-top:1px solid var(--l);padding:9px 12px 11px 14px;display:grid;grid-template-columns:auto 1fr;gap:5px 10px;align-items:center}
.flask{width:24px;height:28px;grid-row:span 2;overflow:visible}
.acts{display:flex;gap:6px;flex-wrap:wrap}
.b{padding:7px 12px;border-radius:8px;background:var(--i);color:var(--so);font:600 12.5px/1.15 var(--f)}
.b.s{background:transparent;color:var(--i);box-shadow:inset 0 0 0 1px var(--l)}
.b.s:hover{background:var(--h)}
.note{font:400 11px/1.35 var(--f);color:var(--m)}
.mini .bd,.mini .note{display:none}
.mini .ft{border-top:0}
.empty{padding:6px 18px 16px}
.empty p{margin:4px 0 0;color:var(--m);font:400 13px/1.45 var(--f)}
.empty h2{font:600 17px/1.3 var(--r);margin:0}
.bub{animation:bub 1.6s ease-in infinite;opacity:0}
.bub:nth-of-type(2){animation-delay:.55s}.bub:nth-of-type(3){animation-delay:1.1s}
@keyframes bub{0%{opacity:0;transform:translateY(0)}20%{opacity:1}100%{opacity:0;transform:translateY(-9px)}}
@media (prefers-reduced-motion:reduce){.bub{animation:none}}`;

  function themeVars() {
    const v = dark ? {
      g: 'rgba(25,29,31,.93)', so: '#191d1f', i: '#eef1ef', m: '#9ca6a7', l: 'rgba(238,241,239,.15)', h: 'rgba(238,241,239,.07)',
      b: '#93b2ff', k: 'rgba(232,220,74,.42)', w: '#93b2ff', x: '#0d1424', e: 'rgba(255,255,255,.07)',
    } : {
      g: 'rgba(250,251,250,.94)', so: '#fbfcfb', i: '#1b2326', m: '#5c676b', l: 'rgba(27,35,38,.14)', h: 'rgba(31,79,209,.07)',
      b: '#1f4fd1', k: '#ffe84a', w: '#1f4fd1', x: '#ffffff', e: 'rgba(27,35,38,.06)',
    };
    for (const k in v) wrap.style.setProperty('--' + k, v[k]);
  }

  function mountOverlay() {
    host = D.createElement('distill-overlay');
    host.setAttribute('data-distill', '');
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:block';
    const sr = host.attachShadow({ mode: 'open' });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS_TEXT);
    sr.adoptedStyleSheets = [sheet];
    wrap = el('div', 'w', sr);
    cv = el('canvas', 'fx', wrap);
    cx = cv.getContext('2d');
    DE.appendChild(host);
    themeVars();
    resize();
  }
  function resize() {
    const r = wrap.getBoundingClientRect();
    vw = r.width || innerWidth; vh = r.height || innerHeight;
    dpr = Math.min(2, W.devicePixelRatio || 1);
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sheetMode = vw < 640;
    if (card) { card.classList.toggle('sheet', sheetMode); placeFlask(); }
  }
  function placeFlask() {
    if (!ui.flask) return;
    const r = ui.flask.getBoundingClientRect();
    flask.x = r.left + r.width / 2; flask.y = r.top + r.height / 2;
  }

  // ---------------------------------------------------------------- card
  const fmtTime = (sec) => sec < 57.5 ? Math.max(5, Math.round(sec / 5) * 5) + '\u00a0' + T.sec : Math.max(1, Math.round(sec / 60)) + '\u00a0' + T.min;
  function buildCard() {
    card = el('div', 'card', wrap);
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'DISTILL');
    card.classList.toggle('sheet', sheetMode);
    const hd = el('div', 'hd', card);
    el('b', 'wm', hd, 'distill');
    el('span', 'dom', hd, location.hostname.replace(/^www\./, '') || '');
    const mkIc = (d, label, act) => { const b = el('button', 'ic', hd); b.appendChild(icon(d)); b.setAttribute('aria-label', label); b.title = label; b.dataset.act = act; return b; };
    if (R && !R.empty) ui.focus = mkIc(ICON.eye, T.focus, 'focus');
    mkIc(ICON.min, T.mini, 'mini');
    mkIc(ICON.x, T.close + ' (Esc)', 'close');

    if (!R || R.empty) {
      const e = el('div', 'empty', card);
      el('h2', '', e, T.empty);
      el('p', '', e, T.emptyHint);
    } else {
      const bd = ui.bd = el('div', 'bd', card);
      el('h2', 'ttl', bd, R.title).dir = 'auto';
      const m = el('div', 'meter', bd);
      const rt = el('div', 'rt', m);
      el('span', '', rt, fmtTime(R.origSec) + ' ' + T.read);
      el('i', '', rt, '\u2192');
      el('span', '', rt, fmtTime(R.sumSec));
      el('span', 'sv', rt, T.shorter.replace('#', Math.max(1, Math.round(R.words / Math.max(1, R.sumWords)))));
      const sc = el('div', 'scale', m);
      const mins = R.origSec / 60, step = mins > 40 ? 10 : mins > 15 ? 5 : 1;
      for (let x = step; x < mins; x += step) el('u', '', sc).style.left = ((x / mins) * 100).toFixed(2) + '%';
      ui.fill = el('b', '', sc);
      ui.fillTo = clamp(R.sumSec / Math.max(1, R.origSec), 0.012, 1);
      el('div', 'wc', m, NF.format(R.words) + ' \u2192 ' + NF.format(R.sumWords) + ' ' + T.words);

      const s1 = el('section', 'sec', bd);
      el('div', 'lbl', s1, T.main);
      ui.tldr = el('button', 'tldr', s1);
      ui.tldr.dataset.act = 'jump'; ui.tldr.dataset.i = '-1';

      const s2 = el('section', 'sec', bd);
      const l2 = el('div', 'lbl', s2);
      el('span', '', l2, T.points);
      ui.tabs = el('span', 'tabs', l2);
      ui.tabs.hidden = true;
      for (const [k, txt] of [['a', T.ai], ['q', T.quotes]]) { const b = el('button', '', ui.tabs, txt); b.dataset.act = 'mode'; b.dataset.m = k; }
      ui.pts = el('ol', 'pts', s2);
      ui.aib = el('div', 'aib', bd);
      ui.aib.hidden = true;

      if (R.figs.length) {
        const s3 = el('section', 'sec', bd);
        el('div', 'lbl', s3, T.figs);
        const g = el('div', 'g', s3);
        R.figs.forEach((f, i) => {
          const b = el('button', 'fig', g);
          b.dataset.act = 'fig'; b.dataset.i = String(i);
          const m2 = /^(.*\d[\d.,%\u2030+]*)(.*)$/.exec(f.text) || [0, f.text, ''];
          const v = el('b', '', b, m2[1]);
          if (m2[2].trim()) el('i', '', v, m2[2].trim());
          el('small', '', b, f.ctx).dir = 'auto';
        });
      }
      if (R.kws.length) {
        const s4 = el('section', 'sec', bd);
        el('div', 'lbl', s4, T.kws);
        const c = el('div', 'chips', s4);
        ui.chips = R.kws.map((k, i) => {
          const b = el('button', 'chip', c);
          b.dataset.act = 'kw'; b.dataset.i = String(i);
          b.setAttribute('aria-pressed', 'false');
          el('span', '', b, k.label).dir = 'auto';
          el('i', '', b, String(k.count));
          return b;
        });
      }
    }
    const ft = el('div', 'ft', card);
    const fs = ui.flask = svg('svg', { class: 'flask', viewBox: '0 0 24 28', 'aria-hidden': 'true' }, ft);
    const cid = 'dsc' + Math.round(rnd() * 1e6);
    const cp = svg('clipPath', { id: cid }, svg('defs', {}, fs));
    svg('path', { d: 'M10 2.5v7.5L3.6 21.6c-.9 1.7.3 3.4 2.2 3.4h12.4c1.9 0 3.1-1.7 2.2-3.4L14 10V2.5z' }, cp);
    const lq = svg('g', { 'clip-path': 'url(#' + cid + ')' }, fs);
    ui.liq = svg('rect', { x: '0', y: '25', width: '24', height: '28', fill: 'var(--k)' }, lq);
    ui.bubs = svg('g', { opacity: '0' }, lq);
    for (const [x, r] of [[9.5, 1], [13.5, 0.8], [11.5, 1.1]]) svg('circle', { class: 'bub', cx: String(x), cy: '22', r: String(r), fill: 'var(--b)' }, ui.bubs);
    svg('path', { d: FLASK, fill: 'none', stroke: 'var(--b)', 'stroke-width': '1.4', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, fs);
    svg('path', { d: 'M15.2 15.5h2.2M16.2 18.5h2.2M17.2 21.5h2.2', stroke: 'var(--b)', 'stroke-width': '1', opacity: '.7' }, fs);
    const acts = ui.acts = el('div', 'acts', ft);
    if (R && !R.empty) {
      ui.copy = el('button', 'b', acts, T.copy); ui.copy.dataset.act = 'copy';
      ui.tr = el('button', 'b s', acts, T.tr); ui.tr.dataset.act = 'tr'; ui.tr.hidden = true;
      if (navigator.share && mq('(pointer: coarse)')) { const b = el('button', 'b s', acts, T.share); b.dataset.act = 'share'; }
    } else { const b = el('button', 'b', acts, T.close); b.dataset.act = 'close'; }
    ui.note = el('div', 'note', ft, R && !R.empty ? T.srcQ : '');
    card.addEventListener('click', onCardClick);
    // keys and clicks inside the card are not the page's business (players, menus, readers)
    for (const ev of 'keydown keyup keypress click dblclick pointerdown pointerup mousedown mouseup wheel touchstart touchend contextmenu'.split(' ')) card.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    renderPoints();
    placeFlask();
    setFlaskLevel(R && !R.empty ? 0.66 : 0.06);
  }
  const setFlaskLevel = (k) => { if (ui.liq) ui.liq.setAttribute('y', (25 - 15.5 * clamp(k, 0, 1)).toFixed(2)); };

  function view() {
    const useAI = mode === 'a' && AI.pts.length;
    const src = useAI ? { main: AI.tldr || R.main.text, pts: AI.pts } : { main: R.main.text, pts: R.points.map((S) => S.text) };
    const tr = trState === 2 && trCache ? (useAI ? trCache.ai : trCache.q) : null;
    return { useAI, main: (tr && tr.main) || src.main, pts: src.pts.map((p, i) => (tr && tr.pts[i]) || p) };
  }
  function renderPoints() {
    if (!ui.pts) return;
    const v = view(), useAI = v.useAI;
    ui.tldr.textContent = '';
    el('span', '', ui.tldr, v.main).dir = 'auto';
    ui.pts.textContent = '';
    v.pts.forEach((txt, i) => {
      const li = el('li', '', ui.pts);
      const b = el('button', 'pt', li);
      b.dataset.act = 'jump'; b.dataset.i = String(i);
      el('em', '', b, String(i + 1));
      el('span', '', b, txt).dir = 'auto';
    });
    if (AI.st === 'work' && mode === 'a' && !AI.pts.length) {
      const li = el('li', '', ui.pts);
      el('span', 'note', li, T.writing + '\u2026');
    }
    ui.tabs.hidden = !(AI.pts.length || AI.st === 'work');
    for (const b of ui.tabs.children) b.setAttribute('aria-pressed', String(b.dataset.m === mode));
    if (ui.note) ui.note.textContent = trState === 2 ? T.srcT : useAI ? T.srcA : T.srcQ;
  }

  function onCardClick(e) {
    const b = e.target.closest('button');
    if (!b || !b.dataset.act) return;
    e.stopPropagation();
    const i = +b.dataset.i;
    switch (b.dataset.act) {
      case 'close': close(); break;
      case 'mini': card.classList.toggle('mini'); placeFlask(); break;
      case 'focus': toggleFocus(); break;
      case 'jump': jumpPoint(i); break;
      case 'fig': { const f = R.figs[i]; jumpTo(f.S.B, f.S.a, f.S.b, [f.S.B, f.a, f.b]); break; }
      case 'kw': cycleKeyword(i); break;
      case 'copy': copy(); break;
      case 'share': navigator.share({ title: R.title, text: summaryText(), url: location.href }).catch(() => {}); break;
      case 'mode': mode = b.dataset.m; AI.picked = true; renderPoints(); break;
      case 'tr': translate(); break;
      case 'ai': aiRun(true); break;
    }
  }

  function jumpPoint(i) {
    let S;
    if (i < 0) S = mode === 'a' && AI.tldr && AI.map[0] ? AI.map[0] : R.main;
    else if (mode === 'a' && AI.pts.length) S = AI.map[i + 1];
    else S = R.points[i];
    if (S) jumpTo(S.B, S.a, S.b);
  }
  function scrollParentOf(e) {
    const se = D.scrollingElement || DE;
    for (let p = up(e); p && p !== se; p = up(p)) {
      const s = getComputedStyle(p);
      if (/(auto|scroll|overlay)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 4) return p;
    }
    return null;
  }
  function jumpTo(B, a, b, flashSpan) {
    const r = mkRange(B, a, b);
    if (!r) return;
    const rect = r.getBoundingClientRect();
    const sp = scrollParentOf(B.el);
    const cardH = sheetMode && card ? card.getBoundingClientRect().height : 0;
    const want = sheetMode ? Math.max(70, (vh - cardH) * 0.32) : vh * 0.3;
    if (sp) {
      const pr = sp.getBoundingClientRect();
      sp.scrollBy({ top: rect.top - pr.top - Math.min(sp.clientHeight * 0.3, want), behavior: RM || MANUAL ? 'auto' : 'smooth' });
    } else {
      const se = D.scrollingElement || DE;
      const to = clamp(W.scrollY + rect.top - want, 0, se.scrollHeight - vh);
      if (Math.abs(to - W.scrollY) > 2) scrollAnim = { from: W.scrollY, to, t: 0, d: RM ? 0 : clamp(Math.abs(to - W.scrollY) / 2600, 0.35, 0.8) };
    }
    const fr = flashSpan ? mkRange(flashSpan[0], flashSpan[1], flashSpan[2]) : r;
    if (hl.flash && fr) { hl.flash.clear(); hl.flash.add(fr); flash = { t: 0 }; }
    wake();
  }
  function cycleKeyword(i) {
    const k = R.kws[i];
    if (!k || !hl.kw) return;
    if (kwActive !== i) {
      kwActive = i; kwPos = -1;
      hl.kw.clear();
      for (const o of k.occ) { const r = mkRange(o[0], o[1], o[2]); if (r) hl.kw.add(r); }
    }
    kwPos++;
    ui.chips.forEach((c, j) => { c.setAttribute('aria-pressed', String(j === kwActive)); c.lastChild.textContent = String(R.kws[j].count); });
    if (kwPos >= k.occ.length) {
      kwActive = -1; hl.kw.clear();
      ui.chips[i].setAttribute('aria-pressed', 'false');
      return;
    }
    ui.chips[i].lastChild.textContent = kwPos + 1 + '/' + k.occ.length;
    const o = k.occ[kwPos];
    jumpTo(o[0], o[1], o[2]);
  }
  function toggleFocus() {
    focusOff = !focusOff;
    if (ui.focus) ui.focus.setAttribute('aria-pressed', String(focusOff));
    applyChaff(focusOff ? 0 : 1);
    setDim(focusOff ? 0 : 1);
  }
  function summaryText() {
    const v = view();
    let s = R.title + '\n' + location.href + '\n\n' + T.main + ': ' + v.main + '\n\n' + T.points + ':\n' + v.pts.map((p) => '- ' + p).join('\n');
    if (R.figs.length) s += '\n\n' + T.figs + ': ' + R.figs.map((f) => f.text + ' (' + f.ctx + ')').join('; ');
    if (R.kws.length) s += '\n' + T.kws + ': ' + R.kws.map((k) => k.label).join(', ');
    s += '\n\n' + fmtTime(R.origSec) + ' ' + T.read + ' \u2192 ' + fmtTime(R.sumSec);
    if (OPT.credit) s += '\n' + T.cred + ': github.com/shmidtqq65/distill';
    return s;
  }
  function copy() {
    const txt = summaryText();
    const done = () => { ui.copy.textContent = T.copied; setTimeout(() => { if (ui.copy) ui.copy.textContent = T.copy; }, 1600); };
    const fallback = () => {
      const ta = D.createElement('textarea');
      ta.value = txt;
      ta.setAttribute('data-distill', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      DE.appendChild(ta); ta.select();
      try { if (D.execCommand('copy')) done(); } catch (e) {}
      ta.remove();
      ui.copy.focus();
    };
    if (navigator.clipboard && W.isSecureContext) navigator.clipboard.writeText(txt).then(done, fallback);
    else fallback();
  }

  // ---------------------------------------------------------------- Chrome built-in AI (progressive)
  function aiOpts(type, length) {
    return { type, length, format: 'plain-text', expectedInputLanguages: [LANG], expectedContextLanguages: [LANG], outputLanguage: LANG, sharedContext: 'A web page titled "' + R.title + '" from ' + location.hostname + '.' };
  }
  async function aiCheck() {
    if (!OPT.ai || MANUAL && !W.__DS_AI_TEST || !W.Summarizer || !R || R.empty) return;
    let a;
    try { a = await Summarizer.availability(aiOpts('key-points', 'medium')); } catch (e) { return; }
    if (!alive || a === 'unavailable' || !a) return;
    AI.av = a;
    if (a === 'available') aiRun(false);
    else { AI.st = 'offer'; renderAIBanner(); }
  }
  function aiInputText(limitChars) {
    const ordered = R.sents.slice();
    let text = '';
    if (limitChars) {
      const keep = new Set(R.sents.slice().sort((a, b) => b.score - a.score).slice(0, Math.max(8, Math.floor(R.sents.length * limitChars))).map((S) => S.i));
      let lastB = null;
      for (const S of ordered) if (keep.has(S.i)) { text += (lastB && lastB !== S.B ? '\n\n' : lastB ? ' ' : '') + S.text; lastB = S.B; }
      return text;
    }
    let lastB = null;
    for (const S of ordered) { text += (lastB && lastB !== S.B ? '\n\n' : lastB ? ' ' : '') + S.text; lastB = S.B; }
    return text;
  }
  async function fitInput(s) {
    let text = aiInputText(0);
    if (!s.inputQuota || !s.measureInputUsage) return text.slice(0, 12000);
    let use = await s.measureInputUsage(text);
    let k = 1;
    for (let i = 0; i < 5 && use > s.inputQuota; i++) {
      k *= Math.min(0.9, (s.inputQuota / use) * 0.92);
      text = aiInputText(k);
      use = await s.measureInputUsage(text);
    }
    return text;
  }
  async function aiRun(fromClick) {
    if (AI.st === 'work' || AI.st === 'done' || !W.Summarizer) return;
    AI.st = 'work'; AI.prog = 0;
    renderAIBanner(); renderPoints();
    if (ui.bubs) ui.bubs.setAttribute('opacity', '1');
    const monitor = (m) => m.addEventListener('downloadprogress', (e) => { AI.prog = e.loaded; renderAIBanner(); });
    // both sessions are requested right away, while the click still counts as user activation
    const c1 = Summarizer.create({ ...aiOpts('tldr', 'short'), monitor });
    const c2 = Summarizer.create({ ...aiOpts('key-points', 'medium'), monitor });
    c1.catch(() => {}); c2.catch(() => {});
    try {
      const s1 = await c1;
      if (!alive) return;
      const input = await fitInput(s1);
      const ctx = 'Summarize for a busy reader. Keep names and numbers exact.';
      AI.tldr = clean(await s1.summarize(input, { context: ctx }));
      if (!alive) return;
      renderPoints();
      const s2 = await c2;
      let acc = '';
      const parse = () => acc.split('\n').map((l) => clean(l.replace(/^\s*(?:[-*\u2022]|\d+[.)])\s*/, '').replace(/\*\*/g, ''))).filter((l) => l.length > 2);
      if (s2.summarizeStreaming) {
        const stream = s2.summarizeStreaming(input, { context: ctx });
        for await (const chunk of stream) {
          if (!alive) return;
          acc = acc && chunk.startsWith(acc) ? chunk : acc + chunk;
          AI.pts = parse();
          if (AI.pts.length && !AI.picked) mode = 'a';
          renderPoints();
        }
      } else acc = await s2.summarize(input, { context: ctx });
      AI.pts = parse().slice(0, 7);
      AI.map = [AI.tldr, ...AI.pts].map(nearest);
      AI.st = AI.pts.length ? 'done' : 'err';
      if (!AI.pts.length) mode = 'q';
      else if (!AI.picked) mode = 'a';
      if (trState === 2 && trInst) trAI();
    } catch (e) {
      mode = 'q';
      if (!fromClick && !AI.pts.length) AI.st = 'offer'; // Chrome wants a click first
      else { AI.st = 'err'; AI.err = String(e && e.message || e); if (W.console) console.warn('DISTILL', e); }
    } finally {
      for (const c of [c1, c2]) c.then((x) => { try { x.destroy(); } catch (e) {} }, () => {});
    }
    if (ui.bubs) ui.bubs.setAttribute('opacity', '0');
    renderAIBanner(); renderPoints();
  }
  function nearest(txt) {
    const tk = tokenize(txt, 0);
    let best = null, bv = 0;
    for (const S of R.sents) {
      let d = 0;
      for (const k of tk) if (k.s) for (const x of S.tk) if (x.s === k.s) { d++; break; }
      const v = d / Math.sqrt(1 + S.tk.length);
      if (v > bv) { bv = v; best = S; }
    }
    return best;
  }
  function renderAIBanner() {
    const b = ui.aib;
    if (!b) return;
    b.textContent = '';
    b.hidden = !(AI.st === 'offer' || (AI.st === 'work' && AI.prog > 0 && AI.prog < 1) || AI.st === 'err');
    if (AI.st === 'offer') {
      el('div', '', b, T.aiOffer + (AI.av === 'available' ? '' : ' ' + T.aiDl));
      const x = el('button', 'b', b, T.useAi); x.dataset.act = 'ai';
    } else if (AI.st === 'work') {
      el('div', '', b, T.dl + ' ' + Math.round(AI.prog * 100) + '%');
      el('i', '', el('div', 'bar', b)).style.width = (AI.prog * 100).toFixed(1) + '%';
    } else if (AI.st === 'err') el('div', '', b, T.aiFail);
  }

  async function trCheck() {
    if (!OPT.translate || !W.Translator || !R || R.empty || MANUAL && !W.__DS_AI_TEST) return;
    const to = UL.split(/[-_]/)[0];
    if (!to || to === LANG || (to === 'nb' && LANG === 'no')) return;
    try {
      const a = await Translator.availability({ sourceLanguage: LANG, targetLanguage: to });
      if (!alive || !a || a === 'unavailable') return;
      ui.tr.hidden = false;
      try { const n = new Intl.DisplayNames(['en'], { type: 'language' }).of(to); ui.tr.title = n ? n.charAt(0).toUpperCase() + n.slice(1) : to; } catch (e) {}
    } catch (e) {}
  }
  async function trAI(only) {
    const ai = { main: '', pts: [] };
    try {
      if (AI.tldr) ai.main = clean(await trInst.translate(AI.tldr));
      for (const p of AI.pts) ai.pts.push(clean(await trInst.translate(p)));
    } catch (e) {}
    if (only) return ai;
    if (trCache) { trCache.ai = ai; renderPoints(); }
  }
  async function translate() {
    if (trState === 1) return;
    if (trState === 2) { trState = 0; ui.tr.textContent = T.tr; renderPoints(); return; }
    const to = UL.split(/[-_]/)[0];
    trState = 1;
    ui.tr.textContent = T.trWork + '\u2026';
    try {
      const tr = await Translator.create({ sourceLanguage: LANG, targetLanguage: to, monitor: (m) => m.addEventListener('downloadprogress', (e) => { ui.tr.textContent = T.trWork + ' ' + Math.round(e.loaded * 100) + '%'; }) });
      trInst = tr;
      const tx = async (s) => (s ? clean(await tr.translate(s)) : s);
      const q = { main: await tx(R.main.text), pts: [] };
      for (const S of R.points) q.pts.push(await tx(S.text));
      trCache = { q, ai: await trAI(true) };
      trState = 2;
      ui.tr.textContent = T.orig;
    } catch (e) {
      trState = 0;
      ui.tr.textContent = T.tr;
      ui.note.textContent = T.trFail;
      return;
    }
    renderPoints();
  }

  // ---------------------------------------------------------------- particles
  let steamSprite = null;
  const makeSprite = (rgb) => {
    const c = D.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.42, 'rgba(' + rgb + ',.5)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  };
  function emitSteam(dt) {
    if (RM) return;
    const k = clamp(t / 1.1, 0, 1);
    if (k >= 1 || exitT >= 0) return;
    for (const txt of [false, true]) {
      const list = steamRects.filter((r) => r.txt === txt);
      const tot = list.reduce((a, r) => a + r.w, 0);
      let n = (1 - k) * (txt ? 120 : 130) * dt;
      while (n > 0 && list.length) {
        if (n < 1 && rnd() > n) break;
        n--;
        let w = rnd() * tot, r = list[0];
        for (const x of list) { w -= x.w; if (w <= 0) { r = x; break; } }
        spawnSteam(r);
      }
    }
  }
  function spawnSteam(r) {
      if (r.txt) parts.push({ w: 1, x: rr(r.l + 4, r.r - 4), y: r.t + 4, vx: 0, vy: rr(-52, -34), r: rr(1.8, 3), gr: rr(26, 50), age: 0, life: rr(0.9, 1.5), a: rr(0.45, 0.7), sx: rr(3, 7), ph: rr(0, 6.3) });
      else parts.push({ x: rr(r.l, r.r), y: rr(r.t, Math.min(r.b, r.t + 70)), vx: rr(-8, 8), vy: rr(-85, -40), r: rr(10, 20), gr: rr(26, 50), age: 0, life: rr(1.0, 1.9), a: rr(0.08, 0.15), sx: rr(0.55, 0.85) });
  }
  function collectSteamRects() {
    const out = [];
    let tot = 0;
    const add = (rc, txt) => {
      const l = Math.max(0, rc.left), r = Math.min(vw, rc.right), tp = Math.max(0, rc.top), b = Math.min(vh, rc.bottom);
      if (r - l < 6 || b - tp < 4) return;
      const w = (r - l) * Math.min(b - tp, 220) * (txt ? 0.6 : 1);
      out.push({ l, r, t: tp, b, w, txt }); tot += w;
    };
    for (const c of chaff) if (c.near) add(c.r, false);
    let n = 0;
    for (const r of dimRanges) {
      if (n > 80) break;
      const br = r.getBoundingClientRect();
      if (br.bottom < 0 || br.top > vh) continue;
      for (const rc of r.getClientRects()) { add(rc, true); n++; }
    }
    out.tot = tot;
    return out;
  }
  function spawnDrops(item) {
    if (RM || !item.r) return;
    const rects = [...item.r.getClientRects()].filter((r) => r.bottom > 0 && r.top < vh && r.width > 4);
    if (!rects.length) return;
    const n = clamp(rects.length * 4, 6, 12);
    for (let i = 0; i < n; i++) {
      const rc = rects[Math.floor(rnd() * rects.length)];
      const x0 = rr(rc.left + 4, rc.right - 4), y0 = rc.bottom - 2;
      drops.push({ x0, y0, x: x0, y: y0, age: -i * 0.04 - rr(0, 0.06), life: rr(0.72, 0.92), r: rr(3.2, 5.2), sx: rr(-36, 36), done: false, px: x0, py: y0 });
      flask.need++;
    }
  }
  const bez = (p0, p1, p2, p3, u) => { const v = 1 - u; return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3; };

  // ---------------------------------------------------------------- frame
  function frame(dt) {
    dt = Math.min(dt, 0.05);
    t += dt;
    if (RM && phase === 'intro') t = Math.max(t, 3.2);
    const k = clamp((t - 0.05) / 1.0, 0, 1);
    if (phase === 'intro' || phase === 'idle') {
      if (!focusOff && t < 1.4) { applyChaff(k); setDim(clamp((t - 0.15) / 0.75, 0, 1)); }
      // marker sweeps
      let order = 0;
      for (const it of keyItems) {
        if (!it.r) continue;
        if (!it.start) {
          const rc = it.r.getBoundingClientRect();
          const seen = mkRange(it.S.B, it.S.a, it.S.b);
          const br = seen ? seen.getBoundingClientRect() : rc;
          it.sweep = !RM && br.bottom > 0 && br.top < vh && br.height > 0;
          it.start = it.sweep ? 0.45 + order++ * 0.14 : 0.45;
          it.dur = it.sweep ? clamp((it.S.b - it.S.a) / 300, 0.34, 0.62) : 0;
        }
        const p = it.dur ? clamp((t - it.start) / it.dur, 0, 1) : t >= it.start ? 1 : 0;
        if (p !== it.p && p > 0) {
          it.p = p;
          const off = Math.round(lerp(it.S.a, it.S.b, ease2(p)));
          const q = locate(it.S.B, off, 1);
          try { it.r.setEnd(q[0], q[1]); } catch (e) {}
          if (hl.key) { hl.key.delete(it.r); hl.key.add(it.r); }
          if (p >= 1 && it.sweep && !it.dropped) { it.dropped = true; spawnDrops(it); }
        }
      }
      if (t < 1) setKeyColor(clamp((t - 0.5) / 0.2, 0, 1));
      if (t > 0.6 && !flask.show && keyItems.some((it) => it.sweep)) flask.show = 0.001;
    }
    // particles
    emitSteam(dt);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age > p.life) { parts.splice(i, 1); continue; }
      if (p.w) { p.y += p.vy * dt; continue; }
      p.vx += (Math.sin(p.y * 0.02 + p.age * 3) * 22 - p.vx * 0.6) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= 1 - 0.25 * dt;
      p.r += p.gr * dt;
    }
    let pending = 0;
    for (const d of drops) {
      if (d.done) continue;
      d.age += dt;
      if (d.age <= 0) { pending++; continue; }
      const u = clamp(d.age / d.life, 0, 1), e = u * u * (3 - 2 * u) * 0.35 + u * u * 0.65;
      d.px = d.x; d.py = d.y;
      d.x = bez(d.x0, d.x0 + d.sx * 0.3, flask.x + d.sx, flask.x, e);
      d.y = bez(d.y0, d.y0 + 70, flask.y - 190, flask.y - 18, e);
      if (u >= 1) { d.done = true; flask.got++; flask.splash = 1; }
      else pending++;
    }
    if (flask.show) flask.show = Math.min(1, flask.show + dt * 3);
    if (flask.splash) flask.splash = Math.max(0, flask.splash - dt * 4);
    // reveal the card when the drops are in
    if (phase === 'intro') {
      const swept = keyItems.some((it) => it.sweep);
      if (!reveal.go && ((t >= (swept ? 1.75 : 1.0) && !pending) || t >= 2.6)) reveal.go = t;
      if (reveal.go) {
        reveal.p = RM ? 1 : clamp((t - reveal.go) / 0.62, 0, 1);
        if (card) {
          const e = ease(reveal.p);
          card.style.clipPath = 'inset(' + ((1 - e) * 100).toFixed(2) + '% 0 0 0 round ' + (sheetMode ? 18 : 14) + 'px)';
          card.style.opacity = String(clamp(reveal.p * 3, 0, 1));
        }
        if (reveal.p >= 1) { phase = 'idle'; card.style.clipPath = 'none'; reveal.t = t; }
      }
    }
    if (ui.fill && reveal.t !== undefined) {
      const m = ease2(clamp((t - reveal.t - 0.1) / 0.8, 0, 1));
      ui.fill.style.width = (lerp(1, ui.fillTo, m) * 100).toFixed(2) + '%';
    } else if (ui.fill) ui.fill.style.width = '100%';
    // smooth scroll for jumps
    if (scrollAnim) {
      scrollAnim.t += dt;
      const u = scrollAnim.d ? ease2(scrollAnim.t / scrollAnim.d) : 1;
      W.scrollTo({ top: lerp(scrollAnim.from, scrollAnim.to, u), behavior: 'instant' });
      if (u >= 1) scrollAnim = null;
    }
    if (flash) {
      flash.t += dt;
      const a = flash.t < 0.25 ? flash.t / 0.25 : Math.max(0, 1 - (flash.t - 0.25) / 1.1);
      if (flashRule) flashRule.style.setProperty('background-color', dark ? 'rgba(147,178,255,' + (0.55 * a).toFixed(3) + ')' : 'rgba(31,79,209,' + (0.28 * a).toFixed(3) + ')');
      if (flash.t > 1.4) { flash = null; if (hl.flash) hl.flash.clear(); }
    }
    // exit
    if (phase === 'exit') {
      const u = clamp((t - exitT) / 0.42, 0, 1), e = ease(u);
      applyChaff(focusOff ? 0 : 1 - e);
      setDim(focusOff ? 0 : 1 - e);
      setKeyColor(1 - e);
      if (kwRule) kwRule.style.setProperty('background-color', (dark ? 'rgba(61,95,196,' : 'rgba(205,220,255,') + (1 - e).toFixed(3) + ')');
      if (card) { card.style.clipPath = 'inset(' + (e * 100).toFixed(2) + '% 0 0 0 round 14px)'; card.style.opacity = String(1 - e * 0.6); }
      if (u >= 1) { cleanup(); return; }
    }
    draw();
  }

  function draw() {
    cx.clearRect(0, 0, vw, vh);
    // burner glow: a blue flame under the page while it boils
    const g = phase === 'exit' ? 0 : clamp(t / 0.3, 0, 1) * clamp((2.3 - t) / 0.8, 0, 1);
    if (g > 0 && !RM) {
      const fl = 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7.3);
      const gr = cx.createLinearGradient(0, vh, 0, vh - 150);
      gr.addColorStop(0, 'rgba(56,104,255,' + (0.22 * g * fl).toFixed(3) + ')');
      gr.addColorStop(0.35, 'rgba(56,104,255,' + (0.08 * g * fl).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(56,104,255,0)');
      cx.fillStyle = gr; cx.fillRect(0, vh - 150, vw, 150);
    }
    if (parts.length) {
      if (!steamSprite) steamSprite = makeSprite(dark ? '228,234,238' : '104,124,146');
      const wc = dark ? '228,234,238' : '96,118,142';
      cx.lineCap = 'round';
      for (const p of parts) {
        const u = p.age / p.life;
        if (p.w) {
          // a curl of steam: a short wavy stroke that rises, stretches and fades
          const h = p.gr * (0.45 + u), a = p.a * Math.sin(Math.PI * u);
          if (a <= 0.01) continue;
          const g = cx.createLinearGradient(0, p.y, 0, p.y - h);
          g.addColorStop(0, 'rgba(' + wc + ',0)'); g.addColorStop(0.35, 'rgba(' + wc + ',' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + wc + ',0)');
          cx.strokeStyle = g;
          cx.lineWidth = p.r * (1 + u);
          cx.beginPath();
          for (let k = 0; k <= 8; k++) {
            const q = k / 8, x = p.x + Math.sin(p.ph + q * 4.2 + p.age * 4) * p.sx * q, y = p.y - q * h;
            k ? cx.lineTo(x, y) : cx.moveTo(x, y);
          }
          cx.stroke();
          continue;
        }
        const a = p.a * (u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8);
        if (a <= 0.003) continue;
        cx.globalAlpha = a;
        cx.drawImage(steamSprite, p.x - p.r * p.sx, p.y - p.r * 1.25, p.r * 2 * p.sx, p.r * 2.5);
      }
      cx.globalAlpha = 1;
    }
    // flask (only until the card shows its own)
    const fa = flask.show * (reveal.go ? clamp(1 - (t - reveal.go) / 0.3, 0, 1) : 1);
    const level = clamp(flask.got / Math.max(1, flask.need - 1), 0, 1);
    if (card && ui.liq) setFlaskLevel(0.14 + 0.52 * (reveal.go ? 1 : level));
    if (fa > 0.01 && flaskPath) {
      const s = 2.3 - 1.3 * ease(reveal.go ? (t - reveal.go) / 0.3 : 0);
      cx.save();
      cx.globalAlpha = fa;
      cx.translate(flask.x, flask.y);
      cx.scale(s * (1 + 0.05 * (flask.splash || 0)), s * (1 - 0.04 * (flask.splash || 0)));
      cx.translate(-12, -14);
      cx.fillStyle = dark ? 'rgba(25,29,31,.85)' : 'rgba(250,251,250,.9)';
      cx.fill(flaskPath);
      cx.save();
      cx.clip(flaskPath);
      cx.fillStyle = '#ffe84a';
      const ly = 25 - 15.5 * (0.14 + 0.52 * level);
      cx.beginPath();
      cx.moveTo(0, 28);
      for (let x = 0; x <= 24; x += 2) cx.lineTo(x, ly + Math.sin(x * 0.7 + t * 9) * 0.6 * (0.4 + (flask.splash || 0)));
      cx.lineTo(24, 28);
      cx.fill();
      cx.restore();
      cx.strokeStyle = dark ? '#93b2ff' : '#1f4fd1';
      cx.lineWidth = 1.4 / s;
      cx.lineJoin = cx.lineCap = 'round';
      cx.stroke(new Path2D(FLASK));
      cx.restore();
    }
    // drops
    for (const d of drops) {
      if (d.done || d.age <= 0) continue;
      const vx = d.x - d.px, vy = d.y - d.py, sp = Math.hypot(vx, vy);
      cx.save();
      cx.translate(d.x, d.y);
      cx.rotate(Math.atan2(vy, vx));
      const tail = d.r * (1.4 + Math.min(4, sp * 0.16)), r0 = d.r;
      cx.fillStyle = dark ? '#ffe84a' : '#ffd915';
      cx.beginPath();
      cx.moveTo(-tail, 0);
      cx.quadraticCurveTo(-r0 * 0.6, -r0 * 1.02, 0, -r0);
      cx.arc(0, 0, r0, -Math.PI / 2, Math.PI / 2);
      cx.quadraticCurveTo(-r0 * 0.6, r0 * 1.02, -tail, 0);
      cx.fill();
      cx.strokeStyle = dark ? 'rgba(255,255,255,.35)' : 'rgba(160,118,0,.5)';
      cx.lineWidth = 0.8;
      cx.stroke();
      cx.fillStyle = 'rgba(255,255,255,.9)';
      cx.beginPath();
      cx.arc(r0 * 0.25, -r0 * 0.38, r0 * 0.3, 0, Math.PI * 2);
      cx.fill();
      cx.restore();
    }
    // sweep glint at the marker tip
    for (const it of keyItems) {
      if (!it.sweep || it.p <= 0 || it.p >= 1 || !it.r) continue;
      const rs = it.r.getClientRects();
      const rc = rs[rs.length - 1];
      if (!rc) continue;
      const gx = rc.right, gy = rc.top + rc.height / 2;
      const gg = cx.createRadialGradient(gx, gy, 0, gx, gy, rc.height * 0.9);
      gg.addColorStop(0, 'rgba(255,248,180,.9)'); gg.addColorStop(1, 'rgba(255,236,80,0)');
      cx.fillStyle = gg;
      cx.fillRect(gx - rc.height, gy - rc.height, rc.height * 2, rc.height * 2);
    }
  }

  // ---------------------------------------------------------------- loop
  const busy = () => phase !== 'idle' || parts.length || drops.some((d) => !d.done) || scrollAnim || flash || (ui.fill && reveal.t !== undefined && t - reveal.t < 1);
  function loop(ts) {
    raf = 0;
    if (!alive) return;
    const dt = lastTs ? (ts - lastTs) / 1000 : 1 / 60;
    lastTs = ts;
    safeFrame(dt);
    if (alive && busy()) raf = requestAnimationFrame(loop);
    else lastTs = 0;
  }
  function wake() { if (!MANUAL && alive && !raf) { lastTs = 0; raf = requestAnimationFrame(loop); } }
  function safeFrame(dt) { try { frame(dt); } catch (err) { cleanup(); throw err; } }

  // ---------------------------------------------------------------- input
  function onKey(e) {
    if (!alive || e.ctrlKey || e.metaKey || e.altKey) return;
    const tg = e.composedPath ? e.composedPath()[0] : e.target;
    const ln = tg && tg.localName ? tg.localName.toLowerCase() : '';
    if (tg && (tg.isContentEditable || /^(input|textarea|select)$/.test(ln) || (ln.includes('-') && tg !== host))) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (!R || R.empty || phase !== 'idle') return;
    const k = e.key.toLowerCase();
    if (k === 'c' && !e.shiftKey) copy();
    else if (k === 'h') toggleFocus();
    else if (/^[1-7]$/.test(k)) { const i = +k - 1; const n = mode === 'a' && AI.pts.length ? AI.pts.length : R.points.length; if (i < n) jumpPoint(i); }
  }
  const onResize = () => { resize(); steamRects = []; draw(); };
  const stopScroll = () => { scrollAnim = null; };

  // ---------------------------------------------------------------- lifecycle
  function close() {
    if (!alive || phase === 'exit') return;
    if (RM) { cleanup(); return; }
    phase = 'exit'; exitT = t;
    parts.length = 0; drops.length = 0;
    scrollAnim = null;
    wake();
  }
  function cleanup() {
    if (!alive) return;
    alive = false;
    api.alive = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    try { if (trInst) trInst.destroy(); } catch (e) {}
    W.removeEventListener('keydown', onKey, true);
    W.removeEventListener('resize', onResize);
    W.removeEventListener('wheel', stopScroll);
    W.removeEventListener('touchstart', stopScroll);
    if (HL) for (const k of ['dim', 'key', 'kw', 'flash']) if (HL.get('distill-' + k) === hl[k]) HL.delete('distill-' + k);
    if (psheet) {
      D.adoptedStyleSheets = D.adoptedStyleSheets.filter((s) => s !== psheet);
      for (const r of shadowRoots) r.adoptedStyleSheets = r.adoptedStyleSheets.filter((s) => s !== psheet);
    }
    for (const e of [...ledger.keys()]) unCss(e);
    if (host) host.remove();
    host = null;
  }
  const opac = (e) => { const o = parseFloat(getComputedStyle(e).opacity); return isNaN(o) ? 1 : o; };
  function start() {
    mountOverlay();
    try { R = analyze(); } catch (e) { if (W.console) console.warn('DISTILL', e); R = null; }
    prepareColors();
    themeVars();
    if (R && !R.empty) {
      setupHighlights();
      buildRanges();
      const ch = findChaff();
      const rootR = R.root.getBoundingClientRect();
      chaff = ch.list.map((e) => {
        const r = e.getBoundingClientRect();
        const dx = Math.max(0, rootR.left - r.right, r.left - rootR.right), dy = Math.max(0, rootR.top - r.bottom, r.top - rootR.bottom);
        return { el: e, o: opac(e), d: clamp(Math.hypot(dx, dy) / 3000, 0, 0.12) + clamp(r.top / Math.max(1, vh), 0, 1) * 0.16, on: false, p: -1, r, near: r.bottom > -vh * 0.5 && r.top < vh * 1.5 && r.right > 0 && r.left < vw };
      });
      soft = ch.soft.map((e) => ({ el: e, o: opac(e), on: false, p: -1 }));
      steamRects = collectSteamRects();
    } else {
      phase = 'intro';
    }
    buildCard();
    W.addEventListener('keydown', onKey, true);
    W.addEventListener('resize', onResize);
    W.addEventListener('wheel', stopScroll, { passive: true });
    W.addEventListener('touchstart', stopScroll, { passive: true });
    if (R && !R.empty) { aiCheck(); trCheck(); }
    if (!MANUAL) { if (RM && R && !R.empty) { applyChaff(1); setDim(1); setKeyColor(1); } if (RM) frame(4); wake(); }
  }

  const api = W.__distill = {
    version: VERSION,
    alive: true,
    toggle: () => close(),
    close,
    stop: () => cleanup(),
    step: (dt) => { if (alive) safeFrame(dt === undefined ? 1 / 60 : dt); },
    jump: (i) => R && !R.empty && jumpPoint(i),
    keyword: (i) => R && !R.empty && cycleKeyword(i),
    result: () => R && !R.empty ? {
      title: R.title, lang: R.lang, words: R.words, ms: R.ms, readMinutes: +(R.origSec / 60).toFixed(1), summarySeconds: Math.round(R.sumSec),
      main: R.main.text, points: R.points.map((S) => S.text), figures: R.figs.map((f) => ({ value: f.text, context: f.ctx })), keywords: R.kws.map((k) => ({ word: k.label, count: k.count })),
      ai: AI.pts.length ? { main: AI.tldr, points: AI.pts.slice() } : null, root: R.root,
    } : { empty: true, title: R && R.title, words: R && R.words },
    state: () => ({ phase, t, particles: parts.length, drops: drops.filter((d) => !d.done).length, chaff: chaff.length, dim: dimRanges.length, highlight: !!HL, ai: AI.st, mode, translated: trState === 2 }),
    debug: { analyze: () => analyze(), summaryText: () => summaryText(), ai: AI },
  };
  start();
})();
