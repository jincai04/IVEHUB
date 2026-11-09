# IVEHUB (Netlify static version)
Login-gated operations portal. Login page -> hub overview -> app folders (MGM / Lunar / Databases) + live OpenClaw token usage.

## How it works
- `index.html` — animated login page (credentials in `config.js` -> `creds`)
- `portal.html` — hubs + token usage dashboard (fetches from the IVE Token API)
- `config.js` — edit credentials, app lists, and `tokenApi` URL here

## Token API
`portal.html` reads usage from the IVE Token API (`tokenApi` in config.js, default `http://127.0.0.1:3008`).
For Netlify to reach it while your PC is off, expose the API publicly (e.g. via a tunnel) and set `tokenApi` to that URL.
