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
| `poster-photography.html` | **Photography posters** — 3 variants in one page advertising full-service photo shoots (brand · portrait · events · product) |
| `render-photography.mjs` | Renders all 3 variants to 300 DPI PNGs + a combined 3-page A4 PDF |
| `studio-north-photography-1-contact-sheet.png` | Variant 1 — contact-sheet / gallery wall |
| `studio-north-photography-2-hero.png` | Variant 2 — hero + filmstrip |
| `studio-north-photography-3-split.png` | Variant 3 — editorial split 50/50 |
| `studio-north-photography-posters.pdf` | All three, true A4, for the print shop |
| `social-photography.html` | **Phone-share version** of the hero (variant 2) styled — 9:16 for WhatsApp Status / IG & FB Stories |
| `render-social.mjs` | Renders the 9:16 graphic to a crisp 2160×3840 PNG |
| `studio-north-photography-story.png` | Phone-share graphic (post to a story / status as-is) |

## Phone-share graphic

`social-photography.html` is the hero design re-composed for a **9:16 screen** (1080×1920). It swaps the print QR-first CTA for a tappable-looking **"Book on WhatsApp"** button (with a small QR kept for cross-device scanning). Same placeholder rules as the posters — drop a real hero photo behind `.hero`, set the price, set the WhatsApp number. Re-render with `node poster/render-social.mjs`.

## Photography posters — before printing

`poster-photography.html` holds all 3 variants and ships with **tagged placeholder tiles**. To finish them:

1. **Drop in real photos** → give each `.cell` a `background-image` (or an absolutely-positioned `<img>` filling the cell) and remove that cell's `.hint` block. Keep the `.chip` + `.frame` labels on top. Use ≈2500px-long-edge images so they stay crisp at A4. The `.feature` tile is the hero — use your strongest shot.
2. **Set the price** → replace the dashed `.ghost` box in the footer, e.g. `<span class="big"><span class="cur">£</span>250</span>`.
3. **Set the WhatsApp number** → see below (current `447428…` is a UK placeholder).
4. **Re-render** → `node poster/render-photography.mjs`

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
