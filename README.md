# IVEHUB

Login-gated personal operations portal: Home · Applications · Projects · My Brain · My Tech · My Life · Settings.
Data syncs through the user's own Google Drive (optional — works without it using browser storage).

## How it works
- `index.html` — animated login page (credentials in `config.js` → `creds`)
- `portal.html` — the portal app (sidebar SPA, hash routing, works on Netlify)
- `gdrive.js` — data layer: Google Drive sync + localStorage fallback (one file, `ivehub-data.json`)
- `config.js` — credentials, Token API URL, Google Client ID, and the seed app lists
- `ivehub-server.mjs` — IVE Token API (its built-in legacy portal page is no longer the main frontend)

## Sections
- **Home** — My Dashboard (token usage + favorites + recent), Quick Access, Recently Used, Today
- **Applications** — Business Apps / Databases (seeded from the old MGM, Lunar, MODU & Database hubs), Personal, Development, Favorites (★ any app)
- **Projects / My Brain** — Phase 2 (structure visible in the sidebar)
- **My Tech / My Life / Settings** — Phase 3

## Google Drive sync (one-time setup, ~10 min)
1. Go to https://console.cloud.google.com/ → create (or pick) a project.
2. **APIs & Services → Library** → search **Google Drive API** → Enable.
3. **APIs & Services → OAuth consent screen** → External → fill app name (IVEHUB) + your email → save. Add yourself as a **Test user**. (No verification needed for personal use — you stay in test mode.)
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** → type **Web application**.
   - **Authorized JavaScript origins**: add your Netlify URL (e.g. `https://ivehub.netlify.app`) and `http://localhost:3000` for local testing.
   - No redirect URIs needed.
5. Copy the **Client ID** (ends in `.apps.googleusercontent.com`) into `config.js`:
   ```js
   google: { clientId: 'XXXX.apps.googleusercontent.com' }
   ```
6. In IVEHUB, click **☁ Connect Drive** in the sidebar and consent once. Your data now lives in a file called `ivehub-data.json` in your Drive (created by the app — searchable in Drive).

Notes:
- The app only requests the `drive.file` scope — it can only see/edit files it created itself.
- Until you connect (or if offline), everything is stored in the browser's localStorage and works normally; connecting uploads the newest copy.

## Token API
`portal.html` reads usage from the IVE Token API (`tokenApi` in config.js).
For Netlify to reach it while your PC is off, expose the API publicly and set `tokenApi` to that URL.

## Local development
```
npx serve .
```
then open http://localhost:3000 and log in with the creds from `config.js`.
