// Renders the Essence Package poster to a 300 DPI print PNG, an A4 PDF, and a web preview PNG.
// Run: node poster/render-essence.mjs
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fileUrl = 'file://' + join(__dirname, 'poster-essence.html');
const NAME = 'studio-north-essence-package';

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();

// A4 = 210×297mm → 2480×3508px @ 300 DPI with deviceScaleFactor 3.125.
await page.setViewport({ width: 900, height: 1300, deviceScaleFactor: 3.125 });
await page.goto(fileUrl, { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');

const el = await page.$('.poster');
await el.screenshot({ path: join(__dirname, `${NAME}.png`) });
console.log(`✓ ${NAME}.png (300 DPI, 2480×3508)`);

await page.pdf({
  path: join(__dirname, `${NAME}.pdf`),
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
});
console.log(`✓ ${NAME}.pdf`);

// Low-res preview for quick visual review.
await page.setViewport({ width: 900, height: 1300, deviceScaleFactor: 1.15 });
await page.goto(fileUrl, { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');
const el2 = await page.$('.poster');
await el2.screenshot({ path: join(__dirname, `${NAME}-preview.png`) });
console.log(`✓ ${NAME}-preview.png (web preview)`);

await browser.close();
