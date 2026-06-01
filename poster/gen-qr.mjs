// Generates print-ready WhatsApp QR codes (SVG) for the poster.
// Run: node poster/gen-qr.mjs
import QRCode from 'qrcode';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Placeholder number for now — swap the digits to change every QR at once.
const PHONE = '447428725934';

const MESSAGES = {
  en: "Hi Studio North, I saw your poster and I'm interested in a website with professional photography. Can you tell me more?",
};

const qrOpts = {
  errorCorrectionLevel: 'H', // survives print smudges / partial damage
  type: 'svg',
  margin: 1,
  color: { dark: '#141210', light: '#00000000' }, // ink on transparent
};

for (const [lang, msg] of Object.entries(MESSAGES)) {
  const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
  const svg = await QRCode.toString(url, qrOpts);
  const out = join(__dirname, `qr-${lang}.svg`);
  writeFileSync(out, svg);
  console.log(`✓ qr-${lang}.svg  →  ${url}`);
}
