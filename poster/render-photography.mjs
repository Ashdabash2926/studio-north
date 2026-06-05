// Renders the photography poster to a 300 DPI print-ready PNG + an A4 PDF.
// Run: node poster/render-photography.mjs
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fileUrl = 'file://' + join(__dirname, 'poster-photography.html');

// A4 = 210×297mm → 2480×3508px @ 300 DPI with deviceScaleFactor 3.125.
const DSF = 3.125;

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 1300, deviceScaleFactor: DSF });
await page.goto(fileUrl, { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');

const el = await page.$('.poster');
await el.screenshot({ path: join(__dirname, 'studio-north-photography.png') });
console.log('✓ studio-north-photography.png (300 DPI, 2480×3508)');

await page.pdf({
  path: join(__dirname, 'studio-north-photography.pdf'),
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
});
console.log('✓ studio-north-photography.pdf');

await browser.close();
