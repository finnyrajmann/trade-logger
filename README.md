# Trade Logger

A personal PWA for logging live trades (with partial-exit support) and tracking
categorized to-dos. Data lives entirely in a Google Sheet in your own Drive
(auto-created on first sign-in, named `TradeLoggerData`) — the app itself has
no backend and no database of its own.

## Stack

- React + Vite
- Google Identity Services (OAuth, browser-only — no client secret)
- Google Sheets API + Drive API (`drive.file` scope — the app can only see
  files it creates, not your whole Drive)
- Deployed as a static site to GitHub Pages, installable as a PWA

## One-time setup already done

- Google Cloud project `trade-logger` with Sheets API + Drive API enabled
- OAuth consent screen (Testing mode, your Gmail added as a test user)
- OAuth Client ID with authorized origin `https://<your-username>.github.io`

The Client ID is already wired into `src/lib/config.js`.

## Deploying

1. Push this repo to GitHub as `trade-logger`.
2. In the repo settings, go to **Settings -> Pages -> Build and deployment**,
   set **Source** to **GitHub Actions**.
3. Push to `main` — the included workflow (`.github/workflows/deploy.yml`)
   builds and publishes automatically to
   `https://<your-username>.github.io/trade-logger/`.
4. On your phone, open that URL in Chrome -> menu -> **Add to Home Screen**.

## Local development

```bash
npm install
npm run dev
```

If you want to test sign-in locally, add `http://localhost:5173` as an
additional Authorized JavaScript origin on the OAuth Client in Google Cloud
Console (Credentials -> your client -> Authorized JavaScript origins).

## Data model (inside the generated spreadsheet)

- **Trades** — one row per open entry or closed exit. A partial exit splits
  a row: the original entry row's `openQty` shrinks, and a new locked
  `CLOSED` row is appended for the exited portion. Rows created from the same
  original entry share a `groupId`, shown in the app as a small colored tag.
- **Todos** — `categoryId`, `text`, `done`, `createdDate`.
- **Categories** — free-form, create/remove any time from the To-Dos tab.

You can always open the spreadsheet directly in Google Sheets to inspect or
backup the raw data.
