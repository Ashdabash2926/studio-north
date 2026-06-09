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
| `poster-hero-split.html` | **Hero + split** poster — full-bleed hero photo on top, two photo boxes left + text & QR right |
| `render-hero-split.mjs` | Renders it to a 300 DPI PNG, A4 PDF, and a web preview |
| `studio-north-photography-2b-hero-split.png` / `.pdf` | Print-ready hero-split poster |
| `studio-north-photography-2b-hero-split.svg` | **Named, layered** Illustrator version (built by `build-svg.mjs`) |
| `render-hero-split-a5.mjs` | Renders the **A5** (148.5×210mm) hero-split — PNG (1748×2480), vector PDF, named SVG |
| `studio-north-photography-2b-hero-split-a5.{png,pdf,svg}` | A5 hero-split (print + Illustrator) |
| `social-wa-hero.html` | **WhatsApp share** (4:5, 1080×1350) — hero on top, "Book on WhatsApp" link instead of a QR |
| `social-wa-split.html` | **WhatsApp share — vertical-image split** (4:5) — full-height photo left, content + book link right |
| `render-wa.mjs` | Renders both WhatsApp images to 2160×2700 PNGs (`node render-wa.mjs split` for just one) |
| `studio-north-photography-whatsapp.{png,svg}` | WhatsApp share — hero layout + named SVG (book link → `wa.me/447428725934`) |
| `studio-north-photography-whatsapp-split.{png,svg}` | WhatsApp share — vertical-image-left layout + named SVG |

## Phone-share graphic

`social-photography.html` is the hero design re-composed for a **9:16 screen** (1080×1920). It swaps the print QR-first CTA for a tappable-looking **"Book on WhatsApp"** button (with a small QR kept for cross-device scanning). Same placeholder rules as the posters — drop a real hero photo behind `.hero`, set the price, set the WhatsApp number. Re-render with `node poster/render-social.mjs`.

## Named, layered Illustrator file (SVG → .ai)

The PDF route imports as anonymous `<Path>` objects. For a **properly named, layered** file, use the SVG instead:

```bash
node poster/build-svg.mjs
```
→ `studio-north-photography-1-contact-sheet.svg`, `-2-hero.svg`, `-3-split.svg`, `-story.svg`, `-2b-hero-split.svg`

> **Default for posters:** always hand over the **named SVG** (open → File ▸ Save As ▸ .ai), not the flat PDF — the PDF imports as anonymous `<Clip Group>`/`<Path>` objects. Any new poster HTML must be added to `build-svg.mjs` (the `DESIGNS` array + an `extract()` branch that names every group) so its layers come in named. Clipped photos still nest one unavoidable clip-group *inside* their named parent — that's expected. Photos are centre-cropped in the SVG (the print PNG uses the exact crops); nudge them in Illustrator if needed.

Each opens in Illustrator with **named groups** (`Hero ▸ Headline`, `Filmstrip ▸ Brand tile`, `Footer ▸ QR code`, …), **live editable text**, **embedded clipped photos**, and the **QR + gradients as native vector**. Open one → **File ▸ Save As ▸ Adobe Illustrator (.ai)**. Install **Bricolage Grotesque** + **Outfit** first so the text displays correctly.

`build-svg.mjs` extracts the exact layout from the source HTML, so re-run it after any design change.

## Editing in Adobe Illustrator (flat PDF route)

`render-illustrator.mjs` outputs a **single-page vector PDF per design** (3 posters + the story):

```bash
node poster/render-illustrator.mjs
```
→ `studio-north-photography-1-contact-sheet.pdf`, `-2-hero.pdf`, `-3-split.pdf`, `-story.pdf`

Open any of these in Illustrator, then **File ▸ Save As ▸ Adobe Illustrator (.ai)**. Text comes in as **live, editable type**, shapes/gradients/QR as **vector**; photos stay **embedded raster** (they're photographs — can't be vectorised). The fonts are embedded in the PDF, but to re-type/edit cleanly install the two free Google fonts locally: **Bricolage Grotesque** and **Outfit**.

> These differ from the print PNG/PDF renders, which are flat raster. Use the Illustrator PDFs when you want to *edit*; use the PNGs / `…-posters.pdf` to *print/post as-is*.

## Render only some variants (protect hand-edited files)

`render-photography.mjs`, `render-illustrator.mjs` and `build-svg.mjs` take an optional variant filter so you can regenerate one design without clobbering others:

```bash
node poster/render-photography.mjs v1 v3   # PNGs for contact-sheet + split only (skips combined PDF)
node poster/render-illustrator.mjs v1 v3   # per-design vector PDFs for those two
node poster/build-svg.mjs v1 v3            # named SVGs for those two
node poster/build-svg.mjs wa               # just the WhatsApp SVG
```

> The 3 photography variants share `poster-photography.html` and are all **Pisac-branded** ("Photography that showcases, you."). **Variant 2 (hero) is superseded by `poster-hero-split.html`** — its `studio-north-photography-2-hero.png` was hand-edited in Illustrator (different hero photo), so don't re-render `.v2`; use the filter to touch only `v1`/`v3`.

## Photography posters — before printing

Real photos are now wired in (sources in `photos/`, ~2200px web-ready). Two things still to set:

1. **Set the price** → replace the dashed `.ghost` box in the footer, e.g. `<span class="big"><span class="cur">£</span>250</span>`.
2. **Set the WhatsApp number** → see *Common edits* below (current `447428…` is a UK placeholder).
3. **Re-render** → `node poster/render-photography.mjs` (posters) and `node poster/render-social.mjs` (story).

**Swapping a photo** → each tile is a `<div class="… has-photo" style="background-image:linear-gradient(<scrim>),url('photos/<name>.jpg');background-position:center 30%">`. Change the filename to swap the shot; nudge `background-position` to keep faces in frame. Drop new files into `photos/` (≈2500px long edge keeps print sharp).

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
