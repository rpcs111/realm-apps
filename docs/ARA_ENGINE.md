# Ara Engine — one master Apps Script

**What:** a single standalone Google Apps Script project ("Ara Engine", owned by the Realm Workspace admin account) that holds every Ara job as a module. All OAuth scopes it will ever need are declared up front in `appsscript.json`, so the owner presses **Allow once**. After that Ara pushes new code with clasp and **no new consent screen appears**, as long as the `oauthScopes` list is not changed.

Built 16 Oct 2026. Editor link and deployment status: see HANDOFF.md §7 (not repeated here).

## Hard rules baked in
- No email is ever sent. The copied Cert module only creates Gmail **drafts**.
- No Calendar entries are created (Calendar is read only in code).
- Nothing is deleted. Deputy and Xero are not wired in.
- No keys or secrets in code. Tokens live in Script Properties only.
- Live Cert Studio v6 and Orion's originals are separate projects and are never touched.

## Modules
| Module | Files | What it is | Status |
|---|---|---|---|
| core | `Engine.js` | Router, registry, `run()`, `engine_selfTest()` | live |
| certTest | `certTest_*.js` + UI html files | Copy of the Cert Studio (Ara) **TEST** project. Web UI at `?app=cert` | copy, not live |
| tasksSync | `tasksSync_Code.js` | Copy of REALM TASKS SYNC (Ara): Google Tasks (read only) → sheet → Notes page. Feed at `?app=tasks&k=<token>` | copy, no trigger installed |

The original Cert test and Tasks sync projects keep running unchanged until Ange approves moving over.

## Entry points
- Web app (one URL): `?app=status` (default, JSON), `?app=cert`, `?app=tasks&k=…` (a bare `?k=` also routes to tasks, same as the old script). POST `{"app":"tasks","k":"…"}`.
- `run('module.function')` for the editor Run button and the Apps Script API, e.g. `run('tasksSync.syncTasks')`, `run('core.selfTest')`.

## Scopes (plain English)
| Scope | Why |
|---|---|
| userinfo.email | know who is signed in |
| drive | read/create files and folders (Cert filing, walkthrough docs) |
| documents, spreadsheets, presentations | create/edit Docs, Sheets, Slides |
| calendar | read the diary (code never creates entries) |
| tasks | read Google Tasks (code only reads) |
| gmail.readonly, gmail.compose | search mail, make drafts |
| **mail.google.com** (FLAG) | full Gmail. Needed only because the copied Cert code uses `GmailApp.search` / `GmailApp.createDraft`, which Google ties to this scope. It technically allows sending; the code never sends. Removing it later = rewrite those calls to the Gmail advanced service (compose/readonly) — that change itself would need one more Allow. |
| script.external_request | call outside web addresses |
| script.scriptapp | install time triggers |

Not requested: script.send_mail (no MailApp in code), forms (not used).

## Add a job (no new Allow)
1. Add `<module>_Code.js` with every global prefixed `<module>_`.
2. Add the module to `ENGINE_MODULES` in `Engine.js` (`web`, `post`, `run` entries).
3. Use only services covered by the scopes above. **Do not edit `oauthScopes`** — that forces a new Allow.
4. `clasp push`, `clasp create-version "<note>"`, `clasp update-deployment <deploymentId> -V <n>` (keep the same deployment so URLs never change).
5. Log start/finish in HANDOFF.md §7.

## One-time owner steps
1. **The one Allow:** open the Engine in the editor, choose `engine_selfTest`, press Run → Review permissions → Allow.
2. **Let Ara run functions remotely (Apps Script API):** create a standard Google Cloud project; enable Apps Script API; OAuth consent screen (Google Auth Platform › Audience) = **Internal**; create an OAuth client of type **Desktop app**; in the Engine's Project Settings › Google Cloud Platform (GCP) Project › Change project, paste the project **number**; turn on "Google Apps Script API" at https://script.google.com/home/usersettings; then `clasp login --user engine --use-project-scopes --include-clasp-scopes --creds client_secret.json` (client file stays off the repo). Note: the Apps Script API does not work with service accounts.

## Stop clasp expiring overnight (Workspace admin)
Cause: clasp asks for the `cloud-platform` scope, so Google Cloud session control applies to it; when the session length runs out the refresh token fails with `invalid_rapt`.

Admin console › Security › Access and data control › **Google Cloud session control** › top-level org unit › Reauthentication policy:
- **Option A (simplest):** select **Never require reauthentication** → Save.
- **Option B (tighter):** keep **Require reauthentication**, tick **Exempt trusted apps**, Save; then Security › Access and data control › **API controls** › Manage App Access › find clasp (or your own Engine OAuth client) › Change access › **Trusted**.

Changes can take up to 24 hours. Then `clasp login` once more. If expiry continues, the org may have Google's hidden 16-hour default (introduced June 2026, not visible in Admin console), which is overridden only through the Access Context Manager API.

Sources: https://support.google.com/a/answer/9368756 · https://support.google.com/a/answer/7281227 · https://developers.google.com/apps-script/api/how-tos/execute · https://docs.cloud.google.com/access-context-manager/docs/session-controls-for-reauthentication · https://github.com/google/clasp
