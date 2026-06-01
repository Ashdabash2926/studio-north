// Renders each poster variant to a 300 DPI print-ready PNG + a combined PDF.
// Run: node poster/render.mjs
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fileUrl = 'file://' + join(__dirname, 'poster.html');

// A4 = 210×297mm. CSS renders mm at 96dpi → 793.7×1122.5px.
// deviceScaleFactor 3.125 lands us on exactly 2480×3508px = 300 DPI.
const DSF = 3.125;
const variants = [
  { sel: '.v1', name: 'studio-north-poster-1-editorial' },
  { sel: '.v2', name: 'studio-north-poster-2-photographic' },
  { sel: '.v3', name: 'studio-north-poster-3-split' },
];

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 1300, deviceScaleFactor: DSF });
await page.goto(fileUrl, { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');

for (const v of variants) {
  const el = await page.$(v.sel);
  const out = join(__dirname, `${v.name}.png`);
  await el.screenshot({ path: out });
  console.log(`✓ ${v.name}.png (300 DPI)`);
}

// Combined print-ready PDF (all three pages, true A4, no margins)
await page.pdf({
  path: join(__dirname, 'studio-north-posters.pdf'),
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
});
console.log('✓ studio-north-posters.pdf');

await browser.close();
