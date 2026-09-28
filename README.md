# Memiliki Website Sendiri

Mobile landing page for the RM250 landing page offer, with a booking form.

- `index.html`, `styles.css`, `script.js`, `assets/` — the static site (served by GitHub Pages).
- `google-apps-script/Code.gs` — the form backend. It runs as a Google Apps Script web app bound to the "Tempahan Website" Google Sheet, saving each booking as a row and each receipt to Google Drive. The deployed web app URL is set in `APPS_SCRIPT_URL` in `script.js`.
