# Daybook

A private daily log for ulcerative colitis, built as a phone web app.

- **No health data in this repo.** This repo holds only the app's code.
- Everything you log stays on your phone. If you turn on sync, the log is
  encrypted on the phone (AES-256-GCM, key from your passphrase via PBKDF2-SHA256)
  and saved as one file, `data/vault.enc`, in a private repo of your choice.
  Without the passphrase the file can't be read.
- Screenshots of test results are read on the phone (tesseract.js, served from this site).
- The toilet finder sends your location only to the OpenStreetMap Overpass server.
- Not medical advice. It is a diary to share with your IBD team.

## Build

`./build.sh` joins `src/*.js` into `site/app.js`. GitHub Actions publishes `site/` to GitHub Pages.

Third-party code in `site/vendor/` keeps its own licence (SheetJS, tesseract.js).
