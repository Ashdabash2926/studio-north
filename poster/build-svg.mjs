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
];

// ───────────────────────── extraction (runs in the page) ─────────────────────────
function extract(key) {
  const sel = { v1: '.v1', v2: '.v2', v3: '.v3', story: '.story' }[key];
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
    const c = col(cs.color);
    textLines(el).forEach((ln, i) => {
      const x = anchor === 'end' ? ln.right : anchor === 'middle' ? (ln.left + ln.right) / 2 : ln.left;
      items.push({ group, type: 'text', x: x - P.left, y: (ln.top + ln.bottom) / 2 - P.top, anchor,
        text: up ? ln.text.toUpperCase() : ln.text, fill: c.fill, op: c.op, ff, size, weight, ls, line: i, ...ov });
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

  return { w: P.width, h: P.height, items };
}

// ───────────────────────── assembly (runs in node) ─────────────────────────
function assemble(data, dim) {
  const photos = {};
  for (const it of data.items) if (it.type === 'image' && it.file && !photos[it.file]) {
    photos[it.file] = `data:image/jpeg;base64,${readFileSync(join(__dirname, 'photos', it.file)).toString('base64')}`;
  }
  const qrInner = readFileSync(join(__dirname, 'qr-en.svg'), 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const f = (n) => (Math.round(n * 100) / 100);
  let clipN = 0; const defs = [];
  const draw = (it) => {
    const op = it.op !== undefined && it.op < 1 ? ` opacity="${f(it.op)}"` : '';
    switch (it.type) {
      case 'image': { const id = `clip${++clipN}`;
        defs.push(`<clipPath id="${id}"><rect x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" rx="${it.rx || 0}"/></clipPath>`);
        return `<image x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})" xlink:href="${photos[it.file]}"/>`; }
      case 'rect': return `<rect x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" rx="${it.rx || 0}" fill="${it.grad ? `url(#${it.grad}Grad)` : it.fill}"${op}/>`;
      case 'ghost': return `<rect x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" rx="${it.rx || 0}" fill="none" stroke="rgb(140,133,125)" stroke-width="2" stroke-dasharray="5 4" opacity="0.55"/>`;
      case 'circle': return `<circle cx="${f(it.cx)}" cy="${f(it.cy)}" r="${f(it.r)}" fill="${it.fill}"${op}/>`;
      case 'line': return `<line x1="${f(it.x1)}" y1="${f(it.y1)}" x2="${f(it.x2)}" y2="${f(it.y2)}" stroke="${it.stroke}"${op} stroke-width="1"/>`;
      case 'plus': return `<g opacity="0.5"><line x1="${f(it.x)}" y1="${f(it.y + it.h / 2)}" x2="${f(it.x + it.w)}" y2="${f(it.y + it.h / 2)}" stroke="${it.fill}" stroke-width="1"/><line x1="${f(it.x + it.w / 2)}" y1="${f(it.y)}" x2="${f(it.x + it.w / 2)}" y2="${f(it.y + it.h)}" stroke="${it.fill}" stroke-width="1"/></g>`;
      case 'path': return `<path d="${it.d}" fill="${it.fill}" transform="translate(${f(it.x)} ${f(it.y)}) scale(${f(it.s)})"/>`;
      case 'qr': return `<g transform="translate(${f(it.x)} ${f(it.y)}) scale(${f(it.w / 75)})">${qrInner}</g>`;
      case 'text': { const ls = it.ls ? ` letter-spacing="${f(it.ls)}"` : '';
        let body = esc(it.text);
        if (it.group.includes('Headline') && it.text.endsWith('.')) body = esc(it.text.slice(0, -1)) + '<tspan fill="rgb(214,59,31)" fill-opacity="1">.</tspan>';
        return `<text x="${f(it.x)}" y="${f(it.y)}" fill="${it.fill}"${op} font-family="${it.ff}" font-size="${f(it.size)}" font-weight="${it.weight}" text-anchor="${it.anchor}" dominant-baseline="central"${ls}>${body}</text>`; }
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
let loaded = '';
for (const d of DESIGNS) {
  if (loaded !== d.file) { await page.goto('file://' + join(__dirname, d.file), { waitUntil: 'networkidle0' }); await page.evaluateHandle('document.fonts.ready'); loaded = d.file; }
  const data = await page.evaluate(extract, d.key);
  const { svg, groups, count } = assemble(data, d);
  writeFileSync(join(__dirname, d.out), svg);
  console.log(`✓ ${d.out}  (${groups} named groups, ${count} objects)`);
}
await browser.close();
