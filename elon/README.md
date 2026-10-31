# Elon (standalone app)

Its own installable web app at https://rpcs111.github.io/realm-apps/elon/ , separate from the Realm hub.

- Own manifest (`elon.webmanifest`, name "Elon", id/start_url/scope `/realm-apps/elon/`), own Ara icons (inline PNG, 192 / 512 / 512 maskable).
- Own service worker (`sw.js`, scope `/realm-apps/elon/` only, cache `elon-app-v*`). It never touches the hub `sw.js`, `app-sw.js` or `ara-app-*` caches.
- Tiles open the bots in the Grok Bot app: Android uses `intent://app/v1/agent?id=<id>#Intent;scheme=grokbot;package=ai.x.grok.bot;...` with the official https fallback `https://cursor.com/grok-bot/link/v1/agent?id=<id>`. There is no call deep link, so Call and Message both open the bot's chat.
- Family panel (hamburger or swipe right): Julie first, then Ange. No phone numbers, codes or personal data.
- Reads `../version.json` (read-only) to show the last Realm build.

Added 17 Oct 2026. No other file in the repo was changed.
