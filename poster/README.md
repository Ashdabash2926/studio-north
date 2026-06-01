# Studio North — A4 Posters

Three print-ready A4 poster variants advertising **website + photography packages** (English, "From S/ 1,000"), each with a WhatsApp QR code that opens a chat with a pre-filled message.

## Files

| File | What it is |
|---|---|
| `poster.html` | Source — all 3 variants in one page (preview in a browser) |
| `gen-qr.mjs` | Generates the WhatsApp QR code (`qr-en.svg`) |
| `render.mjs` | Renders each variant to a 300 DPI PNG + a combined PDF |
| `studio-north-poster-1-editorial.png` | Variant 1 — editorial / on-brand |
| `studio-north-poster-2-photographic.png` | Variant 2 — bold, full-bleed photo |
| `studio-north-poster-3-split.png` | Variant 3 — split 50/50 |
| `studio-north-posters.pdf` | All three, true A4, for the print shop |

## Common edits

**Change the WhatsApp number / pre-filled messages** → edit `PHONE` and `MESSAGES` in `gen-qr.mjs`, then:
```bash
node poster/gen-qr.mjs && node poster/render.mjs
```
> ⚠️ Current number `447428725934` is a **placeholder** (UK). Swap it for the real +51 number before printing.

**Drop in real photos** (variants 2 & 3) → replace the `.photo` placeholder block. Easiest: put an `<img>` or `background-image` on `.photo` and delete the `.photo-tag`. Use a high-res image (≈2500px on the long edge) so it stays crisp at A4.

**Re-render after any change:**
```bash
node poster/render.mjs
```

## Print notes
- PNGs are 2480×3508px = exactly 300 DPI at A4.
- Bricolage Grotesque + Outfit load from Google Fonts at render time (needs internet).
- For a print shop, send the **PDF** (or the PNG of the variant you pick).
