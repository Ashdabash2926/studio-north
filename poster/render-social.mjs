// Renders the phone-share photography graphic (9:16 story / WhatsApp status).
// Run: node poster/render-social.mjs
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fileUrl = 'file://' + join(__dirname, 'social-photography.html');

// 1080×1920 design @ deviceScaleFactor 2 → crisp 2160×3840 export (platforms downscale).
const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 1960, deviceScaleFactor: 2 });
await page.goto(fileUrl, { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');

const el = await page.$('.story');
await el.screenshot({ path: join(__dirname, 'studio-north-photography-story.png') });
console.log('✓ studio-north-photography-story.png (9:16, 2160×3840)');

await browser.close();
