// Builds a NAMED, layered SVG of the hero poster (variant 2) for Adobe Illustrator.
// Every element gets an id → Illustrator shows named groups + live editable text.
// Photos embedded (base64), QR inlined as vector, gradients native.
// Run: node poster/build-svg.mjs   →   studio-north-photography-2-hero.svg
import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 1300, deviceScaleFactor: 1 });
await page.goto('file://' + join(__dirname, 'poster-photography.html'), { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');

const data = await page.evaluate(() => {
  const poster = document.querySelector('.v2');
  const P = poster.getBoundingClientRect();
  const items = [];
  const col = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return { fill: c, op: 1 };
    const p = m[1].split(',').map(s => parseFloat(s));
    return { fill: `rgb(${p[0]},${p[1]},${p[2]})`, op: p[3] === undefined ? 1 : p[3] };
  };
  const rel = (rc) => ({ x: rc.left - P.left, y: rc.top - P.top, w: rc.width, h: rc.height });

  // character-bucketed lines → exact per-line text (handles <br> + soft wrap)
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

  function pushText(group, el, anchor = 'start', overrides = {}) {
    if (!el) return;
    const cs = getComputedStyle(el);
    const ff = cs.fontFamily.replace(/["']/g, '').split(',')[0].trim();
    const size = parseFloat(cs.fontSize), weight = cs.fontWeight;
    const ls = parseFloat(cs.letterSpacing) || 0, up = cs.textTransform === 'uppercase';
    const c = col(cs.color);
    textLines(el).forEach((ln, i) => {
      const x = anchor === 'end' ? ln.right : anchor === 'middle' ? (ln.left + ln.right) / 2 : ln.left;
      const y = (ln.top + ln.bottom) / 2;
      items.push({ group, type: 'text', x: x - P.left, y: y - P.top, anchor,
        text: up ? ln.text.toUpperCase() : ln.text, fill: c.fill, op: c.op,
        ff, size, weight, ls, line: i, ...overrides });
    });
  }
  const photoOf = (el) => {
    const m = getComputedStyle(el).backgroundImage.match(/photos\/([^"')]+)/);
    return m ? m[1] : null;
  };

  // ── HERO ──
  const hero = poster.querySelector('.hero');
  items.push({ group: 'Hero ▸ Photo', type: 'image', ...rel(hero.getBoundingClientRect()), file: photoOf(hero), rx: 0 });
  items.push({ group: 'Hero ▸ Scrim', type: 'rect', ...rel(hero.getBoundingClientRect()), grad: 'hero', rx: 0 });
  // brand: dot + text
  const dot = hero.querySelector('.brand .dot'); const dr = rel(dot.getBoundingClientRect());
  items.push({ group: 'Hero ▸ Brand', type: 'circle', cx: dr.x + dr.w / 2, cy: dr.y + dr.h / 2, r: dr.w / 2, fill: 'rgb(214,59,31)', op: 1 });
  pushText('Hero ▸ Brand', hero.querySelector('.brand'), 'start');
  pushText('Hero ▸ Eyebrow', hero.querySelector('.eyebrow'), 'end');
  // chip pill
  const chip = hero.querySelector('.hchip'); const cr = rel(chip.getBoundingClientRect());
  items.push({ group: 'Hero ▸ Category chip', type: 'rect', ...cr, rx: cr.h / 2, fill: 'rgb(214,59,31)', op: 1 });
  pushText('Hero ▸ Category chip', chip, 'middle', { fill: 'rgb(255,255,255)', op: 1 });
  pushText('Hero ▸ Headline', hero.querySelector('h1'), 'start');

  // ── BODY ──
  pushText('Body ▸ Lede', poster.querySelector('.body .lede'), 'start');
  // filmstrip tiles
  poster.querySelectorAll('.strip-film .tile').forEach((tile, i) => {
    const chipEl = tile.querySelector('.chip'); const g = `Filmstrip ▸ ${chipEl.textContent.trim()} tile`;
    const tr = rel(tile.getBoundingClientRect());
    items.push({ group: g, type: 'image', ...tr, file: photoOf(tile), rx: 3 });
    items.push({ group: g, type: 'rect', ...tr, grad: 'tile', rx: 3 });
    const chr = rel(chipEl.getBoundingClientRect());
    items.push({ group: g, type: 'rect', ...chr, rx: chr.h / 2, fill: 'rgb(20,18,16)', op: 0.5 });
    pushText(g, chipEl, 'middle', { fill: 'rgb(255,255,255)', op: 0.92 });
    pushText(g, tile.querySelector('.frame'), 'end');
  });

  // ── FOOTER ──
  pushText('Footer ▸ Price ▸ Label', poster.querySelector('.price .from'), 'start');
  pushText('Footer ▸ Price ▸ Symbol', poster.querySelector('.price .big .cur'), 'start');
  const ghost = poster.querySelector('.price .big .ghost');
  items.push({ group: 'Footer ▸ Price ▸ Amount box', type: 'ghost', ...rel(ghost.getBoundingClientRect()), rx: 5 });
  pushText('Footer ▸ Price ▸ Unit', poster.querySelector('.price .unit'), 'start');
  poster.querySelectorAll('.points div').forEach((pt) => {
    const ln = textLines(pt)[0]; if (!ln) return;
    items.push({ group: 'Footer ▸ Value points', type: 'circle', cx: ln.left - P.left - 10, cy: (ln.top + ln.bottom) / 2 - P.top, r: 3, fill: 'rgb(214,59,31)', op: 1 });
    pushText('Footer ▸ Value points', pt, 'start');
  });
  // scan label (3 lines; last is smaller/lighter)
  const scan = poster.querySelector('.cta .scan');
  const scanCS = getComputedStyle(scan), scanI = scan.querySelector('i');
  const iTop = scanI.getBoundingClientRect().top;
  textLines(scan).forEach((ln) => {
    const isSub = ln.top >= iTop - 3;
    items.push({ group: 'Footer ▸ Scan label', type: 'text', x: ln.right - P.left, y: (ln.top + ln.bottom) / 2 - P.top, anchor: 'end',
      text: ln.text.toUpperCase(), fill: isSub ? 'rgb(140,133,125)' : 'rgb(20,18,16)', op: 1,
      ff: 'Bricolage Grotesque', size: isSub ? 10.5 : 12.5, weight: 700, ls: isSub ? 1.05 : 0.5 });
  });
  // QR card + image area
  const card = poster.querySelector('.qr-card'); const qimg = card.querySelector('img');
  const cardR = rel(card.getBoundingClientRect());
  items.push({ group: 'Footer ▸ QR code', type: 'rect', ...cardR, rx: 12, fill: 'rgb(255,255,255)', op: 1 });
  items.push({ group: 'Footer ▸ QR code', type: 'qr', ...rel(qimg.getBoundingClientRect()) });

  // cross-sell
  pushText('Footer ▸ Cross-sell', poster.querySelector('.strip .l'), 'start');
  pushText('Footer ▸ Website URL', poster.querySelector('.strip .url'), 'end');

  // registration marks
  poster.querySelectorAll('.tick').forEach((t) => {
    const r = rel(t.getBoundingClientRect());
    const light = t.classList.contains('light');
    items.push({ group: 'Registration marks', type: 'plus', ...r, fill: light ? 'rgb(255,255,255)' : 'rgb(20,18,16)' });
  });

  return { w: P.width, h: P.height, items };
});

await browser.close();

// ── assemble SVG ──
const photos = {};
for (const it of data.items) if (it.type === 'image' && it.file && !photos[it.file]) {
  const b = readFileSync(join(__dirname, 'photos', it.file)).toString('base64');
  photos[it.file] = `data:image/jpeg;base64,${b}`;
}
const qrInner = readFileSync(join(__dirname, 'qr-en.svg'), 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f = (n) => (Math.round(n * 100) / 100);
let clipN = 0;
const defs = [];

function draw(it) {
  const op = it.op !== undefined && it.op < 1 ? ` opacity="${f(it.op)}"` : '';
  switch (it.type) {
    case 'image': {
      const id = `clip${++clipN}`;
      defs.push(`<clipPath id="${id}"><rect x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" rx="${it.rx || 0}"/></clipPath>`);
      return `<image x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})" xlink:href="${photos[it.file]}"/>`;
    }
    case 'rect': {
      const fill = it.grad ? `url(#${it.grad}Grad)` : it.fill;
      return `<rect x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" rx="${it.rx || 0}" fill="${fill}"${op}/>`;
    }
    case 'ghost':
      return `<rect x="${f(it.x)}" y="${f(it.y)}" width="${f(it.w)}" height="${f(it.h)}" rx="${it.rx || 0}" fill="none" stroke="rgb(140,133,125)" stroke-width="2" stroke-dasharray="5 4" opacity="0.55"/>`;
    case 'circle':
      return `<circle cx="${f(it.cx)}" cy="${f(it.cy)}" r="${f(it.r)}" fill="${it.fill}"${op}/>`;
    case 'plus':
      return `<g opacity="0.5"><line x1="${f(it.x)}" y1="${f(it.y + it.h / 2)}" x2="${f(it.x + it.w)}" y2="${f(it.y + it.h / 2)}" stroke="${it.fill}" stroke-width="1"/><line x1="${f(it.x + it.w / 2)}" y1="${f(it.y)}" x2="${f(it.x + it.w / 2)}" y2="${f(it.y + it.h)}" stroke="${it.fill}" stroke-width="1"/></g>`;
    case 'text': {
      const ls = it.ls ? ` letter-spacing="${f(it.ls)}"` : '';
      // signature red period on the headline
      let body = esc(it.text);
      if (it.group.startsWith('Hero ▸ Headline') && it.text.endsWith('.'))
        body = esc(it.text.slice(0, -1)) + '<tspan fill="rgb(214,59,31)" fill-opacity="1">.</tspan>';
      return `<text x="${f(it.x)}" y="${f(it.y)}" fill="${it.fill}"${op} font-family="${it.ff}" font-size="${f(it.size)}" font-weight="${it.weight}" text-anchor="${it.anchor}" dominant-baseline="central"${ls}>${body}</text>`;
    }
    case 'qr': {
      const s = it.w / 75; // qr viewBox is 75
      return `<g transform="translate(${f(it.x)} ${f(it.y)}) scale(${f(s)})">${qrInner}</g>`;
    }
  }
  return '';
}

// group items by their group name, preserving order
const order = []; const groups = {};
for (const it of data.items) { if (!groups[it.group]) { groups[it.group] = []; order.push(it.group); } groups[it.group].push(it); }
const body = order.map(g =>
  `<g id="${esc(g)}">\n    ${groups[g].map(draw).join('\n    ')}\n  </g>`
).join('\n  ');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="210mm" height="297mm" viewBox="0 0 ${f(data.w)} ${f(data.h)}">
  <defs>
    <style>@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&amp;family=Outfit:wght@300;400;500;600;700&amp;display=swap');</style>
    <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgb(10,9,8)" stop-opacity="0.5"/>
      <stop offset="0.52" stop-color="rgb(10,9,8)" stop-opacity="0.2"/>
      <stop offset="1" stop-color="rgb(10,9,8)" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="tileGrad" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="rgb(20,18,16)" stop-opacity="0.1"/>
      <stop offset="1" stop-color="rgb(20,18,16)" stop-opacity="0.45"/>
    </linearGradient>
    __DEFS__
  </defs>
  <g id="Background"><rect x="0" y="0" width="${f(data.w)}" height="${f(data.h)}" fill="rgb(247,244,239)"/></g>
  ${body}
</svg>
`.replace('__DEFS__', defs.join('\n    '));

writeFileSync(join(__dirname, 'studio-north-photography-2-hero.svg'), svg);
console.log(`✓ studio-north-photography-2-hero.svg  (${order.length} named groups, ${data.items.length} objects)`);
