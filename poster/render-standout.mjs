// Renders each standout poster variant to a 300 DPI print-ready PNG + a combined PDF.
// Run: node poster/render-standout.mjs
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fileUrl = 'file://' + join(__dirname, 'poster-standout.html');

// A4 = 210×297mm → 2480×3508px @ 300 DPI with deviceScaleFactor 3.125.
const DSF = 3.125;
const variants = [
  { sel: '.sa', name: 'studio-north-standout-a-black' },
  { sel: '.sb', name: 'studio-north-standout-b-cobalt' },
  { sel: '.sc', name: 'studio-north-standout-c-white' },
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

await page.pdf({
  path: join(__dirname, 'studio-north-standout-posters.pdf'),
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
});
console.log('✓ studio-north-standout-posters.pdf');

await browser.close();
