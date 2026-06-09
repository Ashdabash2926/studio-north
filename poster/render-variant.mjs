// Generic A4 poster renderer → 300 DPI PNG, A4 PDF, web preview.
// Run: node poster/render-variant.mjs <html-basename> <output-basename>
//  e.g. node poster/render-variant.mjs poster-editorial studio-north-photography-5-editorial
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const [htmlBase, NAME] = process.argv.slice(2);
if (!htmlBase || !NAME) { console.error('usage: node render-variant.mjs <html-basename> <output-basename>'); process.exit(1); }
const fileUrl = 'file://' + join(__dirname, `${htmlBase}.html`);

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();

// A4 = 210×297mm → 2480×3508px @ 300 DPI with deviceScaleFactor 3.125.
await page.setViewport({ width: 900, height: 1300, deviceScaleFactor: 3.125 });
await page.goto(fileUrl, { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');

const el = await page.$('.poster');
await el.screenshot({ path: join(__dirname, `${NAME}.png`) });
console.log(`✓ ${NAME}.png (300 DPI, 2480×3508)`);

await page.pdf({ path: join(__dirname, `${NAME}.pdf`), format: 'A4', printBackground: true, preferCSSPageSize: true });
console.log(`✓ ${NAME}.pdf`);

await page.setViewport({ width: 900, height: 1300, deviceScaleFactor: 1.15 });
await page.goto(fileUrl, { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');
const el2 = await page.$('.poster');
await el2.screenshot({ path: join(__dirname, `${NAME}-preview.png`) });
console.log(`✓ ${NAME}-preview.png (web preview)`);

await browser.close();
