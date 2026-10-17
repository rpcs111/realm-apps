# Realm apps — agent notes

Read `HANDOFF.md` on the `main` branch before changing anything. It holds the standing rules, the current state, and the daily loop. This file is the short version for a cloud agent working on `gh-pages`.

## Repo

This is a public repo of static PWAs. Pages are served from `gh-pages` at `https://rpcs111.github.io/realm-apps/<page>.html`. Phones open them with `?d=fold8` or `?d=flip6`.

Work on a branch and open a pull request against `gh-pages`. Do not commit straight to `gh-pages`.

## Public repo

Never commit secrets or private business data. That includes keys, codes, phone numbers, money figures, client or people names, and server addresses. If a task needs a secret, stop and say so. Do not invent a result.

## Do not touch

Leave these files alone unless the owner explicitly asks:

- `private.html`
- `cert.html`
- `certstudio.html` (Cert Studio v6 logic)
- `search-grok.html`
- `search.webmanifest`

Keep `js/nirvana.js`, `js/saveapp.js`, and `js/ara-install.js` working.

## Deputy is read-only

Deputy is checked through Desk’s existing roster call. Show what Desk returns. Never write to Deputy, and never invent a matched or missing shift when Desk did not answer or has no Deputy access.

## Data sources

Do not change a data source or a backend URL to make a page look fixed. If Desk or the engine does not answer, show that plainly.
