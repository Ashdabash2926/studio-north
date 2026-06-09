// Renders the 4:5 WhatsApp share images (1080×1350) at 2× for crispness.
// Run: node poster/render-wa.mjs   (optionally: node poster/render-wa.mjs split)
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ONLY = process.argv.slice(2);
const ALL = [
  { key: 'hero',  file: 'social-wa-hero.html',  sel: '.wa45',     name: 'studio-north-photography-whatsapp' },
  { key: 'split', file: 'social-wa-split.html', sel: '.wa-split', name: 'studio-north-photography-whatsapp-split' },
];
const jobs = ONLY.length ? ALL.filter(j => ONLY.includes(j.key)) : ALL;

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
for (const j of jobs) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
  await page.goto('file://' + join(__dirname, j.file), { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  const el = await page.$(j.sel);
  await el.screenshot({ path: join(__dirname, `${j.name}.png`) });
  console.log(`✓ ${j.name}.png (4:5 · 2160×2700)`);
  await page.close();
}
await browser.close();
