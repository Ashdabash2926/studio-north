// A5 (148.5×210mm) version of the hero-split poster — same artwork, faithfully scaled.
// A-series ratios match (A5 = A4 ÷ √2), so the design scales 1:1 with no relayout.
// Outputs: A5 print PNG (1748×2480 @ 300 DPI), A5 vector PDF, A5 named SVG.
// Run: node poster/render-hero-split-a5.mjs   (run render-hero-split.mjs + build-svg.mjs first)
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'poster-hero-split.html');
const A4PNG = join(__dirname, 'studio-north-photography-2b-hero-split.png');
const A4SVG = join(__dirname, 'studio-north-photography-2b-hero-split.svg');
const NAME = 'studio-north-photography-2b-hero-split-a5';
const K = 148.5 / 210; // 0.70714 — A4→A5 scale

// 1) A5 PNG @ 300 DPI = 1748×2480, downscaled from the A4 print PNG (stays crisp).
await sharp(A4PNG).resize(1748, 2480).toFile(join(__dirname, `${NAME}.png`));
console.log(`✓ ${NAME}.png (A5 · 300 DPI · 1748×2480)`);

// 2) A5 vector PDF — re-render with the poster scaled to A5 (text stays live vector).
const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('file://' + SRC, { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');
await page.evaluate((k) => {
  document.querySelectorAll('.label').forEach(e => (e.style.display = 'none'));
  const s = document.createElement('style');
  s.textContent = '@page{size:148.5mm 210mm;margin:0} html,body{margin:0;padding:0;background:#fff;width:148.5mm;height:210mm;overflow:hidden}';
  document.head.appendChild(s);
  const p = document.querySelector('.poster');
  p.style.transformOrigin = 'top left';
  p.style.transform = `scale(${k})`;
  p.style.boxShadow = 'none';
}, K);
await page.pdf({ path: join(__dirname, `${NAME}.pdf`), preferCSSPageSize: true, printBackground: true, pageRanges: '1' });
console.log(`✓ ${NAME}.pdf (A5 · vector)`);
await browser.close();

// 3) A5 named SVG — identical vector artwork at A5 page size (just the page box changes).
const svg = readFileSync(A4SVG, 'utf8').replace('width="210mm" height="297mm"', 'width="148.5mm" height="210mm"');
writeFileSync(join(__dirname, `${NAME}.svg`), svg);
console.log(`✓ ${NAME}.svg (A5 · named layers)`);
