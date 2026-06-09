// Builds NAMED, layered SVGs of every design for Adobe Illustrator.
// Named groups + live editable text + embedded clipped photos + vector QR/gradients.
// Open an .svg in Illustrator → File ▸ Save As ▸ Adobe Illustrator (.ai).
// Run: node poster/build-svg.mjs
import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DESIGNS = [
  { key: 'v1', file: 'poster-photography.html', out: 'studio-north-photography-1-contact-sheet.svg', w: '210mm', h: '297mm' },
  { key: 'v2', file: 'poster-photography.html', out: 'studio-north-photography-2-hero.svg', w: '210mm', h: '297mm' },
  { key: 'v3', file: 'poster-photography.html', out: 'studio-north-photography-3-split.svg', w: '210mm', h: '297mm' },
  { key: 'story', file: 'social-photography.html', out: 'studio-north-photography-story.svg', w: '1080', h: '1920' },
  { key: 'hs', file: 'poster-hero-split.html', out: 'studio-north-photography-2b-hero-split.svg', w: '210mm', h: '297mm' },
  { key: 'wa', file: 'social-wa-hero.html', out: 'studio-north-photography-whatsapp.svg', w: '1080', h: '1350' },
  { key: 'wav', file: 'social-wa-split.html', out: 'studio-north-photography-whatsapp-split.svg', w: '1080', h: '1350' },
  { key: 'arty', file: 'poster-arty.html', out: 'studio-north-photography-4-arty.svg', w: '210mm', h: '297mm' },
  { key: 'ed', file: 'poster-editorial.html', out: 'studio-north-photography-5-editorial.svg', w: '210mm', h: '297mm' },
];

// ───────────────────────── extraction (runs in the page) ─────────────────────────
function extract(key) {
  const sel = { v1: '.v1', v2: '.v2', v3: '.v3', story: '.story', hs: '.hs', wa: '.wa45', wav: '.wa-split', arty: '.arty', ed: '.ed' }[key];
  const poster = document.querySelector(sel);
  const P = poster.getBoundingClientRect();
  const items = [];
  const col = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return { fill: c, op: 1 };
    const p = m[1].split(',').map(s => parseFloat(s));
    return { fill: `rgb(${p[0]},${p[1]},${p[2]})`, op: p[3] === undefined ? 1 : p[3] };
  };
  const rel = (rc) => ({ x: rc.left - P.left, y: rc.top - P.top, w: rc.width, h: rc.height });
  function textLines(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const nodes = []; let n; while (n = walker.nextNode()) nodes.push(n);
    const buckets = []; const r = document.createRange();
    for (const node of nodes) {
      const t = node.nodeValue;
      for (let i = 0; i < t.length; i++) {
        r.setStart(node, i); r.setEnd(node, i + 1);
        const rc = r.getBoundingClientRect();
        if (rc.height) {
          let b = buckets.find(b => Math.abs(b.top - rc.top) <= 3);
          if (!b) { b = { top: rc.top, bottom: rc.bottom, left: rc.left, right: rc.right, chars: [] }; buckets.push(b); }
          b.top = Math.min(b.top, rc.top); b.bottom = Math.max(b.bottom, rc.bottom);
          b.left = Math.min(b.left, rc.left); b.right = Math.max(b.right, rc.right);
          b.chars.push(t[i]);
        } else if (buckets.length) buckets[buckets.length - 1].chars.push(t[i]);
      }
    }
    buckets.sort((a, b) => a.top - b.top);
    return buckets.map(b => ({ text: b.chars.join('').replace(/\s+/g, ' ').trim(), left: b.left, right: b.right, top: b.top, bottom: b.bottom }));
  }
  function pushText(group, el, anchor = 'start', ov = {}) {
    if (!el) return;
    const cs = getComputedStyle(el);
    const ff = cs.fontFamily.replace(/["']/g, '').split(',')[0].trim();
    const size = parseFloat(cs.fontSize), weight = cs.fontWeight;
    const ls = parseFloat(cs.letterSpacing) || 0, up = cs.textTransform === 'uppercase';
    const style = cs.fontStyle;
    const c = col(cs.color);
    textLines(el).forEach((ln, i) => {
      const x = anchor === 'end' ? ln.right : anchor === 'middle' ? (ln.left + ln.right) / 2 : ln.left;
      items.push({ group, type: 'text', x: x - P.left, y: (ln.top + ln.bottom) / 2 - P.top, anchor,
        text: up ? ln.text.toUpperCase() : ln.text, fill: c.fill, op: c.op, ff, size, weight, ls, style, line: i, ...ov });
    });
  }
  const photoOf = (el) => { const m = getComputedStyle(el).backgroundImage.match(/photos\/([^"')]+)/); return m ? m[1] : null; };
  const Q = (s, r = poster) => r.querySelector(s);
  const QA = (s, r = poster) => [...r.querySelectorAll(s)];

  // shared emitters
  function brand(group, el) {
    const dot = Q('.dot', el); if (dot) { const d = rel(dot.getBoundingClientRect()); items.push({ group, type: 'circle', cx: d.x + d.w / 2, cy: d.y + d.h / 2, r: d.w / 2, fill: 'rgb(214,59,31)', op: 1 }); }
    pushText(group, el, 'start');
  }
  function photoTile(group, tile, rx) {
    const tr = rel(tile.getBoundingClientRect());
    items.push({ group, type: 'image', ...tr, file: photoOf(tile), rx });
    items.push({ group, type: 'rect', ...tr, grad: 'tile', rx });
    const chip = Q('.chip', tile);
    if (chip) { const cr = rel(chip.getBoundingClientRect()); items.push({ group, type: 'rect', ...cr, rx: cr.h / 2, fill: 'rgb(20,18,16)', op: 0.5 }); pushText(group, chip, 'middle', { fill: 'rgb(255,255,255)', op: 0.92 }); }
    pushText(group, Q('.frame', tile), 'end');
    pushText(group, Q('.sub', tile), 'start');
  }
  function priceBlock(group, scope) {
    pushText(group, Q('.price .from', scope), 'start');
    pushText(group, Q('.price .big .cur', scope), 'start');
    const g = Q('.price .big .ghost', scope); if (g) items.push({ group, type: 'ghost', ...rel(g.getBoundingClientRect()), rx: 5 });
    pushText(group, Q('.price .unit', scope), 'start');
  }
  function scanQR(gScan, gQR, scanEl, card) {
    if (scanEl) {
      const sub = Q('i', scanEl), subTop = sub ? sub.getBoundingClientRect().top : 1e9;
      const cs = getComputedStyle(scanEl), ff = cs.fontFamily.replace(/["']/g, '').split(',')[0].trim();
      textLines(scanEl).forEach(ln => {
        const isSub = ln.top >= subTop - 3;
        items.push({ group: gScan, type: 'text', x: ln.right - P.left, y: (ln.top + ln.bottom) / 2 - P.top, anchor: 'end',
          text: ln.text.toUpperCase(), fill: isSub ? 'rgb(140,133,125)' : 'rgb(20,18,16)', op: 1, ff, size: isSub ? 10.5 : 12.5, weight: 700, ls: isSub ? 1.05 : 0.5 });
      });
    }
    if (card) {
      const cr = rel(card.getBoundingClientRect());
      items.push({ group: gQR, type: 'rect', ...cr, rx: 12, fill: 'rgb(255,255,255)', op: 1 });
      items.push({ group: gQR, type: 'qr', ...rel(Q('img', card).getBoundingClientRect()) });
      pushText(gQR, Q('.cap', card), 'middle');
    }
  }
  function strip(gL, gUrl, scope, urlSel = '.url') {
    pushText(gL, Q('.l', scope) || scope, 'start');
    const url = Q(urlSel, scope); if (url) pushText(gUrl, url, scope.matches && scope.matches('.strip') ? 'end' : 'end');
  }
  function ticks() {
    QA('.tick').forEach(t => { const r = rel(t.getBoundingClientRect()); items.push({ group: 'Registration marks', type: 'plus', ...r, fill: t.classList.contains('light') ? 'rgb(255,255,255)' : 'rgb(20,18,16)' }); });
  }

  if (key === 'v1') {
    ticks();
    brand('Header ▸ Brand', Q('.brand'));
    pushText('Header ▸ Eyebrow', Q('.eyebrow'), 'end');
    pushText('Header ▸ Headline', Q('h1'), 'start');
    pushText('Header ▸ Lede', Q('.lede p'), 'start');
    pushText('Header ▸ Shoot-list note', Q('.frames'), 'end');
    QA('.wall .tile').forEach((t, i) => photoTile(`Gallery ▸ ${Q('.chip', t).textContent.trim()} (${i + 1})`, t, 3));
    priceBlock('Footer ▸ Price', Q('.foot .deal'));
    QA('.points div').forEach(pt => { const ln = textLines(pt)[0]; if (ln) { items.push({ group: 'Footer ▸ Value points', type: 'circle', cx: ln.left - P.left - 10, cy: (ln.top + ln.bottom) / 2 - P.top, r: 3, fill: 'rgb(214,59,31)', op: 1 }); pushText('Footer ▸ Value points', pt, 'start'); } });
    scanQR('Footer ▸ Scan label', 'Footer ▸ QR code', Q('.cta .scan'), Q('.cta .qr-card'));
    pushText('Footer ▸ Cross-sell', Q('.strip .l'), 'start');
    pushText('Footer ▸ Website URL', Q('.strip .url'), 'end');
  }

  if (key === 'v2') {
    ticks();
    const hero = Q('.hero');
    items.push({ group: 'Hero ▸ Photo', type: 'image', ...rel(hero.getBoundingClientRect()), file: photoOf(hero), rx: 0 });
    items.push({ group: 'Hero ▸ Scrim', type: 'rect', ...rel(hero.getBoundingClientRect()), grad: 'hero', rx: 0 });
    brand('Hero ▸ Brand', Q('.brand', hero));
    pushText('Hero ▸ Eyebrow', Q('.eyebrow', hero), 'end');
    const chip = Q('.hchip', hero), cr = rel(chip.getBoundingClientRect());
    items.push({ group: 'Hero ▸ Category chip', type: 'rect', ...cr, rx: cr.h / 2, fill: 'rgb(214,59,31)', op: 1 });
    pushText('Hero ▸ Category chip', chip, 'middle', { fill: 'rgb(255,255,255)', op: 1 });
    pushText('Hero ▸ Headline', Q('h1', hero), 'start');
    pushText('Body ▸ Lede', Q('.body .lede'), 'start');
    QA('.strip-film .tile').forEach(t => photoTile(`Filmstrip ▸ ${Q('.chip', t).textContent.trim()} tile`, t, 3));
    priceBlock('Footer ▸ Price', Q('.foot .deal'));
    QA('.points div').forEach(pt => { const ln = textLines(pt)[0]; if (ln) { items.push({ group: 'Footer ▸ Value points', type: 'circle', cx: ln.left - P.left - 10, cy: (ln.top + ln.bottom) / 2 - P.top, r: 3, fill: 'rgb(214,59,31)', op: 1 }); pushText('Footer ▸ Value points', pt, 'start'); } });
    scanQR('Footer ▸ Scan label', 'Footer ▸ QR code', Q('.cta .scan'), Q('.cta .qr-card'));
    pushText('Footer ▸ Cross-sell', Q('.strip .l'), 'start');
    pushText('Footer ▸ Website URL', Q('.strip .url'), 'end');
  }

  if (key === 'v3') {
    ticks();
    QA('.left .tile').forEach((t, i) => photoTile(`Left ▸ ${Q('.chip', t).textContent.trim()} (${i + 1})`, t, 3));
    const right = Q('.right');
    brand('Right ▸ Brand', Q('.brand', right));
    pushText('Right ▸ Eyebrow', Q('.eyebrow', right), 'end');
    pushText('Right ▸ Headline', Q('h1', right), 'start');
    pushText('Right ▸ Lede', Q('.lede', right), 'start');
    // menu with separator lines
    const menu = Q('.menu', right), mr = rel(menu.getBoundingClientRect());
    items.push({ group: 'Right ▸ Service menu', type: 'line', x1: mr.x, y1: mr.y, x2: mr.x + mr.w, y2: mr.y, stroke: 'rgb(20,18,16)', op: 0.12 });
    QA('.row', menu).forEach(row => {
      const rr = rel(row.getBoundingClientRect());
      items.push({ group: 'Right ▸ Service menu', type: 'line', x1: rr.x, y1: rr.y + rr.h, x2: rr.x + rr.w, y2: rr.y + rr.h, stroke: 'rgb(20,18,16)', op: 0.1 });
      pushText('Right ▸ Service menu', Q('.num', row), 'start');
      pushText('Right ▸ Service menu', Q('.name', row), 'start');
      pushText('Right ▸ Service menu', Q('.tag', row), 'end');
    });
    priceBlock('Right ▸ Price', right);
    scanQR('Right ▸ Scan label', 'Right ▸ QR code', Q('.foot .scan', right), Q('.foot .qr-card', right));
    pushText('Right ▸ Cross-sell', Q('.strip', right), 'start');
    pushText('Right ▸ Website URL', Q('.strip .url', right), 'end', { fill: 'rgb(214,59,31)', op: 1 });
  }

  if (key === 'story') {
    const hero = Q('.hero');
    items.push({ group: 'Hero ▸ Photo', type: 'image', ...rel(hero.getBoundingClientRect()), file: photoOf(hero), rx: 0 });
    items.push({ group: 'Hero ▸ Scrim', type: 'rect', ...rel(hero.getBoundingClientRect()), grad: 'hero', rx: 0 });
    brand('Hero ▸ Brand', Q('.brand', hero));
    pushText('Hero ▸ Eyebrow', Q('.eyebrow', hero), 'end');
    const chip = Q('.hchip', hero), cr = rel(chip.getBoundingClientRect());
    items.push({ group: 'Hero ▸ Category chip', type: 'rect', ...cr, rx: cr.h / 2, fill: 'rgb(214,59,31)', op: 1 });
    pushText('Hero ▸ Category chip', chip, 'middle', { fill: 'rgb(255,255,255)', op: 1 });
    pushText('Hero ▸ Headline', Q('h1', hero), 'start');
    pushText('Body ▸ Lede', Q('.body .lede'), 'start');
    QA('.film .tile').forEach(t => photoTile(`Tiles ▸ ${Q('.chip', t).textContent.trim()} tile`, t, 10));
    priceBlock('Footer ▸ Price', Q('.cta'));
    // WhatsApp button
    const wa = Q('.wa'), wr = rel(wa.getBoundingClientRect());
    items.push({ group: 'Footer ▸ WhatsApp button', type: 'rect', ...wr, rx: wr.h / 2, fill: 'rgb(214,59,31)', op: 1 });
    const gsvg = Q('svg', wa), gpath = Q('svg path', wa);
    if (gsvg && gpath) { const gr = rel(gsvg.getBoundingClientRect()); items.push({ group: 'Footer ▸ WhatsApp button', type: 'path', d: gpath.getAttribute('d'), x: gr.x, y: gr.y, s: gr.w / 24, fill: 'rgb(255,255,255)' }); }
    pushText('Footer ▸ WhatsApp button', Q('span', wa), 'start');
    pushText('Footer ▸ WhatsApp button', Q('small', wa), 'start');
    const card = Q('.qr-card');
    const cr2 = rel(card.getBoundingClientRect());
    items.push({ group: 'Footer ▸ QR code', type: 'rect', ...cr2, rx: 18, fill: 'rgb(255,255,255)', op: 1 });
    items.push({ group: 'Footer ▸ QR code', type: 'qr', ...rel(Q('img', card).getBoundingClientRect()) });
    pushText('Footer ▸ QR code', Q('.cap', card), 'middle');
    pushText('Footer ▸ Cross-sell', Q('.foot .l'), 'start');
    pushText('Footer ▸ Website URL', Q('.foot .url'), 'end');
  }

  if (key === 'hs') {
    ticks();
    const hero = Q('.hero'), hr = rel(hero.getBoundingClientRect());
    items.push({ group: 'Hero ▸ Photo', type: 'image', ...hr, file: photoOf(hero), rx: 0 });
    items.push({ group: 'Hero ▸ Scrim', type: 'rect', ...hr, grad: 'hsHero', rx: 0 });
    brand('Hero ▸ Brand', Q('.brand', hero));
    pushText('Hero ▸ Eyebrow', Q('.eyebrow', hero), 'end');
    const hchip = Q('.hchip', hero), hcr = rel(hchip.getBoundingClientRect());
    items.push({ group: 'Hero ▸ Category chip', type: 'rect', ...hcr, rx: hcr.h / 2, fill: 'rgb(214,59,31)', op: 1 });
    pushText('Hero ▸ Category chip', hchip, 'middle', { fill: 'rgb(255,255,255)', op: 1 });
    pushText('Hero ▸ Headline', Q('h1', hero), 'start');

    // editorial kicker = red dash + label
    const kickerDash = (group, el) => {
      const r = rel(el.getBoundingClientRect());
      items.push({ group, type: 'rect', x: r.x, y: r.y + r.h / 2 - 1, w: 16, h: 2, rx: 1, fill: 'rgb(214,59,31)', op: 1 });
      pushText(group, el, 'start');
    };

    // ── left: two named photo boxes ──
    const gallery = Q('.gallery');
    kickerDash('Selected work ▸ Kicker', Q('.kicker', gallery));
    QA('.box', gallery).forEach((box) => {
      const label = Q('.chip', box).textContent.trim();
      const g = `Selected work ▸ ${label} tile`;
      const br = rel(box.getBoundingClientRect());
      items.push({ group: g, type: 'image', ...br, file: photoOf(box), rx: 5 });
      items.push({ group: g, type: 'rect', ...br, grad: 'box', rx: 5 });
      const chipEl = Q('.chip', box), ch = rel(chipEl.getBoundingClientRect());
      items.push({ group: g, type: 'rect', ...ch, rx: ch.h / 2, fill: 'rgb(20,18,16)', op: 0.5 });
      pushText(g, chipEl, 'start', { fill: 'rgb(255,255,255)', op: 0.95 });
      pushText(g, Q('.frame', box), 'end', { fill: 'rgb(255,255,255)', op: 0.78 });
      // caption = bold title line (cap style) + lighter sub line (i style)
      const cap = Q('.cap', box), sub = Q('i', cap), capLine = textLines(cap)[0];
      if (capLine) {
        const cs = getComputedStyle(cap), ff = cs.fontFamily.replace(/["']/g, '').split(',')[0].trim();
        items.push({ group: g, type: 'text', x: capLine.left - P.left, y: (capLine.top + capLine.bottom) / 2 - P.top, anchor: 'start',
          text: capLine.text, fill: 'rgb(255,255,255)', op: 1, ff, size: parseFloat(cs.fontSize), weight: cs.fontWeight, ls: parseFloat(cs.letterSpacing) || 0, line: 0 });
      }
      if (sub) pushText(g, sub, 'start', { fill: 'rgb(255,255,255)', op: 0.84 });
    });

    // ── right: editorial column ──
    const content = Q('.content');
    kickerDash('The studio ▸ Kicker', Q('.kicker', content));
    pushText('The studio ▸ Lede', Q('.lede', content), 'start');
    const rule = Q('.rule', content), rr = rel(rule.getBoundingClientRect());
    items.push({ group: 'The studio ▸ Rule', type: 'line', x1: rr.x, y1: rr.y + rr.h / 2, x2: rr.x + rr.w, y2: rr.y + rr.h / 2, stroke: 'rgb(20,18,16)', op: 0.12 });
    items.push({ group: 'The studio ▸ Rule', type: 'rect', x: rr.x, y: rr.y + rr.h / 2 - 1, w: 22, h: 2, rx: 1, fill: 'rgb(214,59,31)', op: 1 });
    priceBlock('The studio ▸ Price', content);
    QA('.points div', content).forEach(pt => {
      const ln = textLines(pt)[0];
      if (ln) {
        items.push({ group: 'The studio ▸ Value points', type: 'circle', cx: ln.left - P.left - 12, cy: (ln.top + ln.bottom) / 2 - P.top, r: 3, fill: 'rgb(214,59,31)', op: 1 });
        pushText('The studio ▸ Value points', pt, 'start');
      }
    });
    scanQR('Footer ▸ Scan label', 'Footer ▸ QR code', Q('.cta .scan', content), Q('.cta .qr-card', content));
    pushText('Footer ▸ Cross-sell', Q('.websell .l', content), 'start');
    pushText('Footer ▸ Website URL', Q('.websell .url', content), 'end');
  }

  if (key === 'wa') {
    const frame = poster;
    const hero = Q('.hero', frame), hr = rel(hero.getBoundingClientRect());
    items.push({ group: 'Hero ▸ Photo', type: 'image', ...hr, file: photoOf(hero), rx: 0 });
    items.push({ group: 'Hero ▸ Scrim', type: 'rect', ...hr, grad: 'hsHero', rx: 0 });
    brand('Hero ▸ Brand', Q('.brand', hero));
    pushText('Hero ▸ Eyebrow', Q('.eyebrow', hero), 'end');
    const hchip = Q('.hchip', hero), hcr = rel(hchip.getBoundingClientRect());
    items.push({ group: 'Hero ▸ Category chip', type: 'rect', ...hcr, rx: hcr.h / 2, fill: 'rgb(214,59,31)', op: 1 });
    pushText('Hero ▸ Category chip', hchip, 'middle', { fill: 'rgb(255,255,255)', op: 1 });
    pushText('Hero ▸ Headline', Q('h1', hero), 'start');

    const body = Q('.body', frame);
    pushText('Body ▸ Lede', Q('.lede', body), 'start');
    QA('.feat span', body).forEach(sp => {
      const ln = textLines(sp)[0];
      if (ln) {
        items.push({ group: 'Body ▸ Features', type: 'circle', cx: ln.left - P.left - 16, cy: (ln.top + ln.bottom) / 2 - P.top, r: 4.5, fill: 'rgb(214,59,31)', op: 1 });
        pushText('Body ▸ Features', sp, 'start');
      }
    });
    const ml = Q('.midline', body), mr = rel(ml.getBoundingClientRect());
    items.push({ group: 'Body ▸ Rule', type: 'line', x1: mr.x, y1: mr.y + mr.h / 2, x2: mr.x + mr.w, y2: mr.y + mr.h / 2, stroke: 'rgb(20,18,16)', op: 0.12 });
    items.push({ group: 'Body ▸ Rule', type: 'rect', x: mr.x, y: mr.y + mr.h / 2 - 1, w: 34, h: 2, rx: 1, fill: 'rgb(214,59,31)', op: 1 });
    priceBlock('Body ▸ Price', body);

    const wa = Q('.wa', body), wr = rel(wa.getBoundingClientRect());
    items.push({ group: 'Footer ▸ Book button', type: 'rect', ...wr, rx: 26, fill: 'rgb(214,59,31)', op: 1 });
    const gsvg = Q('svg', wa), gpath = Q('svg path', wa);
    if (gsvg && gpath) { const gr = rel(gsvg.getBoundingClientRect()); items.push({ group: 'Footer ▸ Book button', type: 'path', d: gpath.getAttribute('d'), x: gr.x, y: gr.y, s: gr.w / 24, fill: 'rgb(255,255,255)' }); }
    const t = Q('.t', wa), small = Q('small', t), tl = textLines(t)[0];
    if (tl) {
      const cs = getComputedStyle(t), ff = cs.fontFamily.replace(/["']/g, '').split(',')[0].trim();
      items.push({ group: 'Footer ▸ Book button', type: 'text', x: tl.left - P.left, y: (tl.top + tl.bottom) / 2 - P.top, anchor: 'start', text: tl.text, fill: 'rgb(255,255,255)', op: 1, ff, size: parseFloat(cs.fontSize), weight: cs.fontWeight, ls: 0, line: 0 });
    }
    if (small) pushText('Footer ▸ Book button', small, 'start', { fill: 'rgb(255,255,255)', op: 0.92 });

    pushText('Footer ▸ Cross-sell', Q('.foot .l', body), 'start');
    pushText('Footer ▸ Website URL', Q('.foot .url', body), 'end');
  }

  if (key === 'wav') {
    const img = Q('.img'), ir = rel(img.getBoundingClientRect());
    items.push({ group: 'Image ▸ Photo', type: 'image', ...ir, file: photoOf(img), rx: 0 });
    items.push({ group: 'Image ▸ Scrim', type: 'rect', ...ir, grad: 'wavImg', rx: 0 });
    brand('Image ▸ Brand', Q('.brand', img));
    const tag = Q('.tag', img), tgr = rel(tag.getBoundingClientRect());
    items.push({ group: 'Image ▸ Location tag', type: 'rect', x: tgr.x, y: tgr.y + tgr.h / 2 - 1, w: 24, h: 2, rx: 1, fill: 'rgb(214,59,31)', op: 1 });
    pushText('Image ▸ Location tag', tag, 'start', { fill: 'rgb(255,255,255)', op: 1 });

    const col = Q('.col');
    const pill = Q('.pill', col), pr = rel(pill.getBoundingClientRect());
    items.push({ group: 'Content ▸ Category pill', type: 'rect', ...pr, rx: pr.h / 2, fill: 'rgb(214,59,31)', op: 1 });
    pushText('Content ▸ Category pill', pill, 'middle', { fill: 'rgb(255,255,255)', op: 1 });
    pushText('Content ▸ Headline', Q('h1', col), 'start');
    pushText('Content ▸ Lede', Q('.lede', col), 'start');
    QA('.feat span', col).forEach(sp => {
      const ln = textLines(sp)[0];
      if (ln) {
        items.push({ group: 'Content ▸ Features', type: 'circle', cx: ln.left - P.left - 16, cy: (ln.top + ln.bottom) / 2 - P.top, r: 4.5, fill: 'rgb(214,59,31)', op: 1 });
        pushText('Content ▸ Features', sp, 'start');
      }
    });
    priceBlock('Content ▸ Price', col);
    const wa = Q('.wa', col), wr = rel(wa.getBoundingClientRect());
    items.push({ group: 'Footer ▸ Book button', type: 'rect', ...wr, rx: 24, fill: 'rgb(214,59,31)', op: 1 });
    const gsvg = Q('svg', wa), gpath = Q('svg path', wa);
    if (gsvg && gpath) { const gr = rel(gsvg.getBoundingClientRect()); items.push({ group: 'Footer ▸ Book button', type: 'path', d: gpath.getAttribute('d'), x: gr.x, y: gr.y, s: gr.w / 24, fill: 'rgb(255,255,255)' }); }
    const t = Q('.t', wa), small = Q('small', t), tl = textLines(t)[0];
    if (tl) {
      const cs = getComputedStyle(t), ff = cs.fontFamily.replace(/["']/g, '').split(',')[0].trim();
      items.push({ group: 'Footer ▸ Book button', type: 'text', x: tl.left - P.left, y: (tl.top + tl.bottom) / 2 - P.top, anchor: 'start', text: tl.text, fill: 'rgb(255,255,255)', op: 1, ff, size: parseFloat(cs.fontSize), weight: cs.fontWeight, ls: 0, line: 0 });
    }
    if (small) pushText('Footer ▸ Book button', small, 'start', { fill: 'rgb(255,255,255)', op: 0.92 });
    pushText('Footer ▸ Cross-sell', Q('.foot .l', col), 'start');
    pushText('Footer ▸ Website URL', Q('.foot .url', col), 'end');
  }

  if (key === 'arty') {
    const photo = Q('.photo'), pr = rel(photo.getBoundingClientRect());
    items.push({ group: 'Photograph', type: 'image', ...pr, file: photoOf(photo), rx: 0 });
    items.push({ group: 'Grade ▸ Scrim', type: 'rect', ...pr, grad: 'artyV', rx: 0 });
    items.push({ group: 'Grade ▸ Vignette', type: 'rect', ...pr, grad: 'artyVig', rx: 0 });
    items.push({ group: 'Grade ▸ Warm wash', type: 'rect', ...pr, grad: 'artyWarm', rx: 0, op: 0.35 });

    const matte = Q('.matte'), mr = rel(matte.getBoundingClientRect());
    items.push({ group: 'Matte border', type: 'frame', ...mr, stroke: 'rgb(247,244,239)', op: 0.42 });

    pushText('Top ▸ Eyebrow left', Q('.top .eyebrow:not(.r)'), 'start');
    pushText('Top ▸ Eyebrow right', Q('.top .eyebrow.r'), 'end');

    pushText('Wordmark ▸ Headline', Q('.bot h1'), 'start');
    pushText('Tagline', Q('.tag'), 'start');

    const rule = Q('.rule'), rr = rel(rule.getBoundingClientRect());
    items.push({ group: 'Rule', type: 'line', x1: rr.x, y1: rr.y + rr.h / 2, x2: rr.x + rr.w, y2: rr.y + rr.h / 2, stroke: 'rgb(247,244,239)', op: 0.28 });
    items.push({ group: 'Rule', type: 'rect', x: rr.x, y: rr.y + rr.h / 2 - 1, w: 26, h: 2, rx: 1, fill: 'rgb(214,59,31)', op: 1 });

    // scan label (white-on-image, two lines: main + uppercase sub)
    const scanEl = Q('.foot .scan');
    if (scanEl) {
      const sub = Q('i', scanEl), subTop = sub ? sub.getBoundingClientRect().top : 1e9;
      const cs = getComputedStyle(scanEl), ff = cs.fontFamily.replace(/["']/g, '').split(',')[0].trim();
      textLines(scanEl).forEach(ln => {
        const isSub = ln.top >= subTop - 3;
        items.push({ group: 'Footer ▸ Scan label', type: 'text', x: ln.left - P.left, y: (ln.top + ln.bottom) / 2 - P.top, anchor: 'start',
          text: isSub ? ln.text.toUpperCase() : ln.text, fill: isSub ? 'rgb(247,244,239)' : 'rgb(255,255,255)', op: isSub ? 0.66 : 1, ff, size: isSub ? 10.5 : 15, weight: 700, ls: isSub ? 1.26 : 0.3 });
      });
    }
    const card = Q('.foot .qr-card');
    if (card) {
      const cr = rel(card.getBoundingClientRect());
      items.push({ group: 'Footer ▸ QR code', type: 'rect', ...cr, rx: 13, fill: 'rgb(247,244,239)', op: 1 });
      items.push({ group: 'Footer ▸ QR code', type: 'qr', ...rel(Q('img', card).getBoundingClientRect()) });
    }
  }

  if (key === 'ed') {
    // paper washes (sand base + warm radial glows)
    items.push({ group: 'Paper', type: 'rect', x: 0, y: 0, w: P.width, h: P.height, grad: 'edSand', rx: 0 });
    items.push({ group: 'Paper', type: 'rect', x: 0, y: 0, w: P.width, h: P.height, grad: 'edGlowTop', rx: 0 });
    items.push({ group: 'Paper', type: 'rect', x: 0, y: 0, w: P.width, h: P.height, grad: 'edGlowBot', rx: 0 });

    const sun = Q('.sun'), sr = rel(sun.getBoundingClientRect());
    items.push({ group: 'Sun motif', type: 'sun', x: sr.x, y: sr.y, s: sr.w / 100, stroke: 'rgb(194,135,47)' });

    // masthead — two-tone: "Studio" (ink) + "North" (clay italic)
    const mh = Q('.masthead'), itEl = Q('.it', mh), mhLine = textLines(mh)[0];
    const csm = getComputedStyle(mh), mhY = (mhLine.top + mhLine.bottom) / 2 - P.top, itr = itEl.getBoundingClientRect();
    items.push({ group: 'Masthead', type: 'text', x: itr.left - P.left, y: mhY, anchor: 'start', text: 'North', fill: 'rgb(177,74,43)', op: 1, ff: 'Fraunces', size: parseFloat(csm.fontSize), weight: getComputedStyle(itEl).fontWeight, ls: 0, style: 'italic' });
    items.push({ group: 'Masthead', type: 'text', x: itr.left - P.left - parseFloat(csm.fontSize) * 0.26, y: mhY, anchor: 'end', text: 'Studio', fill: 'rgb(44,33,24)', op: 1, ff: 'Fraunces', size: parseFloat(csm.fontSize), weight: csm.fontWeight, ls: 0, style: 'normal' });

    // woven divider
    const weave = Q('.weave');
    QA('.ln', weave).forEach(ln => { const r = rel(ln.getBoundingClientRect()); items.push({ group: 'Divider', type: 'line', x1: r.x, y1: r.y + r.h / 2, x2: r.x + r.w, y2: r.y + r.h / 2, stroke: 'rgb(44,33,24)', op: 0.45 }); });
    QA('.dia', weave).forEach(d => pushText('Divider', d, 'middle'));
    pushText('Divider', Q('.tx', weave), 'middle');

    // arched portal plate
    const plate = Q('.plate'), plr = rel(plate.getBoundingClientRect());
    items.push({ group: 'Photograph', type: 'archimage', ...plr, r: plr.w / 2, b: 7, file: photoOf(plate) });
    items.push({ group: 'Photograph', type: 'archframe', ...plr, r: plr.w / 2, b: 7, stroke: 'rgb(177,74,43)', op: 0.55 });

    // caption + seal
    pushText('Caption', Q('.caption .q'), 'start');
    const stamp = Q('.stamp'), str = rel(stamp.getBoundingClientRect());
    items.push({ group: 'Caption ▸ Seal', type: 'ring', cx: str.x + str.w / 2, cy: str.y + str.h / 2, r: str.w / 2, stroke: 'rgb(125,127,91)', op: 1 });
    pushText('Caption ▸ Seal', stamp, 'middle', { fill: 'rgb(125,127,91)' });

    // footer
    pushText('Footer ▸ Label', Q('.foot .k'), 'start');
    pushText('Footer ▸ Studio', Q('.foot .big'), 'start');
    pushText('Footer ▸ URL', Q('.foot .url'), 'start');
    pushText('Footer ▸ Scan label', Q('.qr-wrap .sc'), 'end');
    const card = Q('.qr-card');
    if (card) {
      const cr = rel(card.getBoundingClientRect());
      items.push({ group: 'Footer ▸ QR code', type: 'rect', ...cr, rx: 3, fill: 'rgb(251,246,236)', op: 1 });
      items.push({ group: 'Footer ▸ QR code', type: 'qr', ...rel(Q('img', card).getBoundingClientRect()) });
    }
  }

  return { w: P.width, h: P.height, items };
}

// ───────────────────────── assembly (runs in node) ─────────────────────────
function assemble(data, dim) {
  const photos = {};
  for (const it of data.items) if ((it.type === 'image' || it.type === 'archimage') && it.file && !photos[it.file]) {
    photos[it.file] = `data:image/jpeg;base64,${readFileSync(join(__dirname, 'photos', it.file)).toString('base64')}`;
  }
  const qrInner = readFileSync(join(__dirname, 'qr-en.svg'), 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const f = (n) => (Math.round(n * 100) / 100);
  let clipN = 0; const defs = [];
  // arched "portal" outline: semicircle top (radius r), small bottom corners (b)
  const archPath = (it) => {
    const x = it.x, y = it.y, w = it.w, h = it.h, r = it.r, b = it.b || 0;
    return `M ${f(x)} ${f(y + r)} A ${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)} L ${f(x + w)} ${f(y + h - b)} Q ${f(x + w)} ${f(y + h)} ${f(x + w - b)} ${f(y + h)} L ${f(x + b)} ${f(y + h)} Q ${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - b)} Z`;
  };
  const SUN_RAYS = [[70,50,80,50],[67.3,60,74.6,64.2],[60,67.3,64.2,74.6],[50,70,50,80],[40,67.3,35.8,74.6],[32.7,60,25.4,64.2],[30,50,20,50],[32.7,40,25.4,35.8],[40,32.7,35.8,25.4],[50,30,50,20],[60,32.7,64.2,25.4],[67.3,40,74.6,35.8]];
  const draw = (it) => {
    const op = it.op !== undefined && it.op < 1 ? ` opacity="${f(it.op)}"` : '';
    switch (it.type) {
      case 'image': { const id = `clip${++clipN}`;
        defs.push(`<clipPath id="${id}"><rect x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" rx="${it.rx || 0}"/></clipPath>`);
        return `<image x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})" xlink:href="${photos[it.file]}"/>`; }
      case 'rect': return `<rect x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" rx="${it.rx || 0}" fill="${it.grad ? `url(#${it.grad}Grad)` : it.fill}"${op}/>`;
      case 'ghost': return `<rect x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" rx="${it.rx || 0}" fill="none" stroke="rgb(140,133,125)" stroke-width="2" stroke-dasharray="5 4" opacity="0.55"/>`;
      case 'frame': return `<rect x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" rx="${it.rx || 0}" fill="none" stroke="${it.stroke}" stroke-width="1"${op}/>`;
      case 'ring': return `<circle cx="${f(it.cx)}" cy="${f(it.cy)}" r="${f(it.r)}" fill="none" stroke="${it.stroke}" stroke-width="1.2"${op}/>`;
      case 'archimage': { const id = `clip${++clipN}`;
        defs.push(`<clipPath id="${id}"><path d="${archPath(it)}"/></clipPath>`);
        return `<image x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})" xlink:href="${photos[it.file]}"/>`; }
      case 'archframe': return `<path d="${archPath(it)}" fill="none" stroke="${it.stroke}" stroke-width="1.4"${op}/>`;
      case 'sun': return `<g transform="translate(${f(it.x)} ${f(it.y)}) scale(${f(it.s)})" fill="none" stroke="${it.stroke}" stroke-width="2" stroke-linecap="round"><circle cx="50" cy="50" r="13"/>${SUN_RAYS.map(l => `<line x1="${l[0]}" y1="${l[1]}" x2="${l[2]}" y2="${l[3]}"/>`).join('')}</g>`;
      case 'circle': return `<circle cx="${f(it.cx)}" cy="${f(it.cy)}" r="${f(it.r)}" fill="${it.fill}"${op}/>`;
      case 'line': return `<line x1="${f(it.x1)}" y1="${f(it.y1)}" x2="${f(it.x2)}" y2="${f(it.y2)}" stroke="${it.stroke}"${op} stroke-width="1"/>`;
      case 'plus': return `<g opacity="0.5"><line x1="${f(it.x)}" y1="${f(it.y + it.h / 2)}" x2="${f(it.x + it.w)}" y2="${f(it.y + it.h / 2)}" stroke="${it.fill}" stroke-width="1"/><line x1="${f(it.x + it.w / 2)}" y1="${f(it.y)}" x2="${f(it.x + it.w / 2)}" y2="${f(it.y + it.h)}" stroke="${it.fill}" stroke-width="1"/></g>`;
      case 'path': return `<path d="${it.d}" fill="${it.fill}" transform="translate(${f(it.x)} ${f(it.y)}) scale(${f(it.s)})"/>`;
      case 'qr': return `<g transform="translate(${f(it.x)} ${f(it.y)}) scale(${f(it.w / 75)})">${qrInner}</g>`;
      case 'text': { const ls = it.ls ? ` letter-spacing="${f(it.ls)}"` : '';
        const st = it.style && it.style !== 'normal' ? ` font-style="${it.style}"` : '';
        let body = esc(it.text);
        if (it.group.includes('Headline') && it.text.endsWith('.')) body = esc(it.text.slice(0, -1)) + '<tspan fill="rgb(214,59,31)" fill-opacity="1">.</tspan>';
        return `<text x="${f(it.x)}" y="${f(it.y)}" fill="${it.fill}"${op} font-family="${it.ff}" font-size="${f(it.size)}" font-weight="${it.weight}"${st} text-anchor="${it.anchor}" dominant-baseline="central"${ls}>${body}</text>`; }
    }
    return '';
  };
  const order = []; const groups = {};
  for (const it of data.items) { if (!groups[it.group]) { groups[it.group] = []; order.push(it.group); } groups[it.group].push(it); }
  const bodyStr = order.map(g => `<g id="${esc(g)}">\n    ${groups[g].map(draw).join('\n    ')}\n  </g>`).join('\n  ');
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${dim.w}" height="${dim.h}" viewBox="0 0 ${f(data.w)} ${f(data.h)}">
  <defs>
    <style>@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&amp;family=Outfit:wght@300;400;500;600;700&amp;display=swap');</style>
    <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(10,9,8)" stop-opacity="0.5"/><stop offset="0.52" stop-color="rgb(10,9,8)" stop-opacity="0.2"/><stop offset="1" stop-color="rgb(10,9,8)" stop-opacity="0.9"/></linearGradient>
    <linearGradient id="tileGrad" x1="0" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="rgb(20,18,16)" stop-opacity="0.1"/><stop offset="1" stop-color="rgb(20,18,16)" stop-opacity="0.45"/></linearGradient>
    <linearGradient id="hsHeroGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(10,9,8)" stop-opacity="0.62"/><stop offset="0.24" stop-color="rgb(10,9,8)" stop-opacity="0.08"/><stop offset="0.42" stop-color="rgb(10,9,8)" stop-opacity="0"/><stop offset="0.84" stop-color="rgb(10,9,8)" stop-opacity="0.8"/><stop offset="1" stop-color="rgb(10,9,8)" stop-opacity="0.93"/></linearGradient>
    <linearGradient id="boxGrad" x1="0.15" y1="0" x2="0.5" y2="1"><stop offset="0" stop-color="rgb(20,18,16)" stop-opacity="0.05"/><stop offset="0.42" stop-color="rgb(20,18,16)" stop-opacity="0.14"/><stop offset="1" stop-color="rgb(20,18,16)" stop-opacity="0.74"/></linearGradient>
    <linearGradient id="wavImgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(10,9,8)" stop-opacity="0.66"/><stop offset="0.22" stop-color="rgb(10,9,8)" stop-opacity="0.04"/><stop offset="0.52" stop-color="rgb(10,9,8)" stop-opacity="0"/><stop offset="1" stop-color="rgb(10,9,8)" stop-opacity="0.62"/></linearGradient>
    <linearGradient id="artyVGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(8,6,5)" stop-opacity="0.5"/><stop offset="0.2" stop-color="rgb(8,6,5)" stop-opacity="0.05"/><stop offset="0.4" stop-color="rgb(8,6,5)" stop-opacity="0"/><stop offset="0.7" stop-color="rgb(8,6,5)" stop-opacity="0.42"/><stop offset="1" stop-color="rgb(8,6,5)" stop-opacity="0.88"/></linearGradient>
    <radialGradient id="artyVigGrad" cx="0.5" cy="0.3" r="0.62"><stop offset="0.5" stop-color="rgb(8,6,5)" stop-opacity="0"/><stop offset="1" stop-color="rgb(8,6,5)" stop-opacity="0.34"/></radialGradient>
    <linearGradient id="artyWarmGrad" x1="0.15" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="rgb(214,59,31)" stop-opacity="0.4"/><stop offset="0.6" stop-color="rgb(20,14,10)" stop-opacity="0.3"/><stop offset="1" stop-color="rgb(8,6,5)" stop-opacity="0.5"/></linearGradient>
    <linearGradient id="edSandGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(232,219,194)"/><stop offset="1" stop-color="rgb(224,207,176)"/></linearGradient>
    <radialGradient id="edGlowTopGrad" cx="0.5" cy="0" r="0.6"><stop offset="0" stop-color="rgb(194,135,47)" stop-opacity="0.2"/><stop offset="1" stop-color="rgb(194,135,47)" stop-opacity="0"/></radialGradient>
    <radialGradient id="edGlowBotGrad" cx="0.5" cy="1" r="0.55"><stop offset="0" stop-color="rgb(177,74,43)" stop-opacity="0.12"/><stop offset="1" stop-color="rgb(177,74,43)" stop-opacity="0"/></radialGradient>
    ${defs.join('\n    ')}
  </defs>
  <g id="Background"><rect x="0" y="0" width="${f(data.w)}" height="${f(data.h)}" fill="rgb(247,244,239)"/></g>
  ${bodyStr}
</svg>
`, groups: order.length, count: data.items.length };
}

// ───────────────────────── run ─────────────────────────
const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 2100, deviceScaleFactor: 1 });
// Optional CLI filter: `node build-svg.mjs hs v1` builds only those keys.
const ONLY = process.argv.slice(2);
let loaded = '';
for (const d of DESIGNS) {
  if (ONLY.length && !ONLY.includes(d.key)) continue;
  if (loaded !== d.file) { await page.goto('file://' + join(__dirname, d.file), { waitUntil: 'networkidle0' }); await page.evaluateHandle('document.fonts.ready'); loaded = d.file; }
  const data = await page.evaluate(extract, d.key);
  const { svg, groups, count } = assemble(data, d);
  writeFileSync(join(__dirname, d.out), svg);
  console.log(`✓ ${d.out}  (${groups} named groups, ${count} objects)`);
}
await browser.close();
