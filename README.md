# IVEHUB
IVE Systems Operations Control Portal — local dashboard (port 3007) with:
- JWT-style session login page (animated, Totoro logo)
- "Welcome back Boss" splash
- MGM / Lunar / Databases app hubs
- Live z.ai GLM token usage monitor (5h window + monthly, auto-refresh)

## Run
Set env vars before starting (no default credentials in code):
```
set IVE_USER=jincai04
set IVE_PASS=yourpassword
node ivehub-server.mjs
```
Requires Node 22+ (built-in `node:sqlite`). Reads the z.ai key from the local OpenClaw auth store — keep this file private.
