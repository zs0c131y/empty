# FTS Mahila Samiti, Bangalore - Certificate Generator

Static site. A visitor enters their full name and downloads the
"Sanatan Ke Rang - Certificate of Appreciation" as an A4 PDF. The PDF is built
in the browser with pdf-lib; no name is ever sent to a server.

## Run locally

    python3 -m http.server 8000     # from the repo root
    # open http://localhost:8000/certificate/

(It must be served over http; opening the file directly blocks the asset fetches.)
Any static host works (GitHub Pages, Netlify, Cloudflare Pages).

## Files

- `index.html`, `styles.css`, `app.js` - the site
- `filename.js` - builds the download name `FTS_Sangam_Certificate_<Name>.pdf` (Hindi names are transliterated to English)
- `assets/certificate-template.jpg` - the template (2480x1754, from the 300 DPI original)
- `assets/logo.png`, `assets/fonts/` - branding and self-hosted fonts (Playfair Display, Noto Serif Devanagari, Inter)
- `vendor/` - pdf-lib, fontkit, regenerator-runtime (needed by fontkit for Devanagari shaping)
- `samples/` - a generated test certificate

## Changing the layout

Name placement is defined by the constants at the top of `app.js`
(`LINE_TOP_FROM_TOP`, `BASELINE_GAP`, `MAX_NAME_WIDTH`, `MAX_FONT`). If the
template is replaced, re-measure the blank line and update them.
