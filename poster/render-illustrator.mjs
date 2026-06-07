// Renders each design to its own single-page VECTOR PDF for editing in Adobe Illustrator.
// Text = live type (install Bricolage Grotesque + Outfit), shapes/gradients = vector, photos = embedded raster.
// Open the .pdf in Illustrator, then File ▸ Save As ▸ Adobe Illustrator (.ai).
// Run: node poster/render-illustrator.mjs
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const jobs = [
  { file: 'poster-photography.html', sel: '.v1', name: 'studio-north-photography-1-contact-sheet', a4: true },
  { file: 'poster-photography.html', sel: '.v2', name: 'studio-north-photography-2-hero',          a4: true },
  { file: 'poster-photography.html', sel: '.v3', name: 'studio-north-photography-3-split',         a4: true },
  { file: 'social-photography.html', sel: '.story', name: 'studio-north-photography-story',        a4: false, w: '1080px', h: '1920px' },
];

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });

for (const j of jobs) {
  const page = await browser.newPage();
  await page.goto('file://' + join(__dirname, j.file), { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');

  // Isolate the one design: hide labels + the other artboards, strip page margins/breaks.
  await page.evaluate((sel) => {
    document.querySelectorAll('.label').forEach(e => (e.style.display = 'none'));
    document.querySelectorAll('.poster, .story').forEach(e => {
      if (!e.matches(sel)) e.style.display = 'none';
    });
    const t = document.querySelector(sel);
    t.style.boxShadow = 'none';
    t.style.margin = '0';
    t.style.pageBreakAfter = 'auto';
    document.body.style.padding = '0';
    document.body.style.gap = '0';
    document.body.style.background = '#fff';
  }, j.sel);

  const opts = { path: join(__dirname, `${j.name}.pdf`), printBackground: true, preferCSSPageSize: true, pageRanges: '1' };
  if (j.a4) opts.format = 'A4';
  else { opts.width = j.w; opts.height = j.h; }

  await page.pdf(opts);
  console.log(`✓ ${j.name}.pdf  (vector — open in Illustrator, Save As .ai)`);
  await page.close();
}

await browser.close();
