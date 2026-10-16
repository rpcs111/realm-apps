# HANDOFF — Ara's Daily Loop

**Owner:** Ange Barlas (Andrew Barlas, Realm PCS, Melbourne UTC+11)
**Last updated:** 2026-10-16
**Rule:** Every new session (box, phone app, voice, any Ara) reads this file FIRST, before touching anything. No rebuilding, no guessing URLs, no new deployments without Ange's yes.

## Where this lives (one brain)

- **MASTER (edit this one only):** GitHub `rpcs111/realm-apps`, branch `main`, `HANDOFF.md`
  - View: https://github.com/rpcs111/realm-apps/blob/main/HANDOFF.md
  - Raw (machine read): https://raw.githubusercontent.com/rpcs111/realm-apps/main/HANDOFF.md
- **Mirrors (read-only copies):**
  - Google Doc "HANDOFF.md — Ara Daily Loop (Realm PCS)": https://docs.google.com/document/d/1YBoG-M9sPP46Gr4BiS19Q9YJedRF_FdlzhNvByn4kfo
  - Box file `/workspace/HANDOVER.md` (refreshed by `/workspace/handoff_sync/sync.sh`)
- **Rule: edit the master; mirrors are overwritten by sync.** Anything written only in a mirror will be lost at the next sync.

---

## 1. Standing Rules — live in the channel doc only

The standing rules live **only** in the Ara–Nova channel doc, under **MASTER STANDING RULES — single source of truth (locked 15 Oct 2026)**:
https://docs.google.com/document/d/1nH48bu2yt3WXMJ5DBBpHs0Dpt-nmW5JPQW3TaN0Kl6M

This file does not hold rules. Rule questions are answered from that master list (rule 38). Where anything in this file conflicts with the master list, the master list wins (see its "Conflicts resolved" section). Claude acts only with Ara's approval (rule 41).

Daily-loop working reminders (from the box handover; the channel doc still wins):
- Emails are draft-only (text files), never sent without Ange's explicit yes for that specific message. Check before anything that sends, spends or deletes.
- One task at a time, result reported before the next. Back up before editing. Log first, report second.
- Do not edit the REALM OPEN REGISTER or ORION_HANDOFF sheets without Ange's OK (register is append-only; row ids repeat, so quote id + item text).

## 2. Verified URLs (do not guess others)

- **Realm Apps (live):** https://rpcs111.github.io/realm-apps/
- **Realm Crew (team page):** https://rpcs111.github.io/realm-apps/team.html
- **Today / staff home:** https://rpcs111.github.io/realm-apps/today.html
- **Ange private gateway:** https://rpcs111.github.io/realm-apps/ange.html
- **Status page:** https://rpcs111.github.io/realm-apps/status.html
- **GitHub repo:** https://github.com/rpcs111/realm-apps
- **Business email:** info@realmpcs.com.au
- **Business phone:** 1300 358 500 / 0404 977 869
- Older register-row URLs (Bridge, Realm Desk, Scribe, Cert Studio, Launcher, Flow Map): box file `/workspace/ACTION_PLAN.md` section 5, copied verbatim from the register.

Sources of truth (sheets):
- REALM OPEN REGISTER sheet `1REJWxu7oD3MY9z7TCPsv-OznnPTu1lAHsONMlU8refM`
- ORION_HANDOFF sheet `1x1xLYJnr3k4z91lBiS40eCzKY5GQbdN2eNWzQ9K82uY`
- Zoho CRM = truth for invoices.

## 3. Current State (as of 2026-10-16)

### Business priorities
- **Base P1 Craigieburn (WO 000915, The Base, 650 Hume Hwy) recert expires 22 Oct 2026.** Reply to David Barkla (Leedwell) drafted, booking **Wed 21 Oct 9:00am** and asking for the **24 Riley Rd work order** (Riley Rd P2 passed its 29 Sep due date). To david.barkla@leedwell.com.au, cc Robert.nucifora@leedwell.com.au, reply on Gmail thread 1a0405d4a2d37e2a. Text in box `LEEDWELL_DRAFT.md`. **NOT sent — waiting on Ange's Send + diary entry.** Riley Rd currently diarised Mon 19 Oct 9:45 (Ange to decide whether it moves to Wed 21).
- **Oasis (OC 438902Q, 33 Inkerman) real balance $89,086.80** per statement (not $77k/$81k/$80.6k — those are stale). A chase WAS sent 14 Oct to Kev + Darren ($89K, AGM ask); no reply yet. Follow-up text in box `CHASE_DRAFT.md` — **drafted, NOT sent.** Stale 13 Oct Gmail draft ($80,600 to accounts@) to be deleted by Ange.
- **PI certificate (The Knight compliance):** The Knight's 7 Oct remittance shows PI "expired 06/08/2026". Current PI = EOS / Lloyd's Policy **03 PII 000519 04**, 4pm 6 Aug 2026 to 4pm 6 Aug 2027 (continuous). The renewal cert was **already sent to compliance@theknight.com.au on 30 Jul 2026** (thread 19ef70e5669ea1e0); The Knight likely filed the old RNL25.26 cert sent 29 Jul. Reply asking them to update records is in box `PI_DRAFT.md` — **drafted, NOT sent.** Attachment copies in box `/workspace/pi_cert/`. Ange to confirm EOS premium (invoice 47262) is paid.
- Selling half of Realm PCS; Julie stepping out. Marijuana dispensary launch in progress.

### NEXT (in order, from ONE_PAGER.md, status as of 16 Oct)
1. Craigieburn date → book + email David Barkla — **DRAFTED (Wed 21 Oct 9am), waiting on Ange's Send.**
2. Oasis chase — **14 Oct chase sent; follow-up DRAFTED, not sent.**
3. PI certificate to compliance@theknight.com.au — **DRAFTED (PI_DRAFT.md), not sent.**
4. WhatsApp Business off the S26 (was due Tue 13 Oct; phone due back ~20 Oct) — **not started.**
5. Fix 17 Oct clash (Queanbeyan / Shepparton / Craigieburn) and 18 Oct (Mt Druitt / Ovolo 10:15) — **not started.**
6. Apps: the 6 clicks marked BROKEN in the ONE_PAGER 17-item list, one at a time — **not started.**

### Apps
- Realm Desk web app live on GitHub Pages. 39 successful deploys, last one 14 Oct (run 39, "Add calm Next focus mode as default on staff/today/ange").
- Repo contains: README.md, team.html, img/family.svg, img/umbrella.svg. gh-pages branch holds the deployed site.
- team.html documents the full crew: ARA (head, live), NOVA (Gemini backend, live), IVOR (AI coach, live), ELON (Musk tracker, live), ECHO (checker, planned), FORGE (Realm ops, planned), MERCHANT (stores, planned), LEDGER (subs/refunds, planned), SENTRY (banned-tool watch, planned), MUSE (personal, planned), ORACLE (five-year goals, planned).
- Daily schedule (Melbourne time) encoded in team.html: 7:30am Elon brief, 8:52am Mon IVOR accountability, 10:00am weekday Ara morning sweep + Merchant store check, 11:11am Ara/Muse reset, 11:52am IVOR daily drill, 1:27pm weekday Forge week-ahead, 2:00pm IVOR nudge, 7:00pm weekday Echo notes drain, 6:00pm Sun Sentry sweep, 1st of month Ledger subscription review, every 2 days 10am Ledger Anthropic refund follow-up, every 2 hours Ara triage alarm.

### Security (post-Claude lockout)
- Claude Google access cut. 0 Apps Script triggers. Zapier removed from info@.
- Open: Ange pulls the claude.ai connectors on his Mac. Ange switches off the Claude billing toggles.
- Banned tools (never re-link): Zapier, Make, n8n, Fireflies, scribehow. Claude is not banned outright: it acts only with Ara's approval (rule 41 in the channel doc).

## 4. Daily Loop Protocol

1. Read this file (master on GitHub main; mirrors only if the master is unreachable).
2. Check the open items in section 3 (recert, Oasis, PI, Claude connectors) and the NEXT list.
3. Execute the next pending task — one at a time.
4. Report the result.
5. Update **this master file's** "Last updated", section 3 and section 6 (session log), then run the sync so mirrors match.
6. Stop. Do not start the next task without Ange's go.

## 5. Habits (the loop that ends the nightly reset)

- **Every session opens with this file.** Not with a greeting, not with a question. The file is the memory.
- **Every session closes by updating section 3.** State moves here, not into chat.
- **One file, one brain.** Edit the GitHub master only; the Google Doc and box copy are mirrors and get overwritten.
- **Rules live in the channel doc, not here and not in chat.** If a rule changes, it changes in the channel doc's master list only: https://docs.google.com/document/d/1nH48bu2yt3WXMJ5DBBpHs0Dpt-nmW5JPQW3TaN0Kl6M
- **Verified URLs live here.** If a URL is unlisted, it is unverified — verify before using.
- **Sends, spends, deletes = Ange's yes first.** Always. No exceptions, no "it's just a draft."

## 6. Session log 16 Oct 2026 (~9:15am Melb) — realm-daily-loop

Backup first: box `backups/handover_20261016_0915/` (HANDOVER.md, CHASE_DRAFT.md, LEEDWELL_DRAFT.md).
- Task 1 DONE (read-only): handover read (+ ACTION_PLAN.md, ONE_PAGER.md "NEXT (in order)"). Drive REALM HANDOFF sheet is a job list only (13 rows, 12 OPEN, mostly Nova/Ange Apps Script items).
- Task 2 DONE (Craigieburn): reply to David Barkla still NOT sent (thread 1a0405d4a2d37e2a). Wed 21 9:00am has no anchor clash. Final text in LEEDWELL_DRAFT.md. Waiting on Ange's yes to send + diary entry. Riley Rd already diarised Mon 19 9:45.
- Task 3 DONE (Oasis): chase WAS sent 14 Oct to Kev + Darren ($89K, AGM ask). No reply yet. Real balance $89,086.80 per statement. Follow-up text in CHASE_DRAFT.md. Stale 13 Oct Gmail draft ($80,600 to accounts@) to be deleted by Ange.
- Task 4 DRAFTED (PI cert): text in PI_DRAFT.md; renewal cert already sent to The Knight 30 Jul 2026; draft asks them to update records. Attachments in /workspace/pi_cert/. Ange to confirm EOS invoice 47262 paid. Backup: backups/handover_20261015_221935/.
- Nothing sent, deleted, deployed or diarised this session (no Gmail drafts created).
- Handoff unified (Ara): GitHub main HANDOFF.md made the single master; Google Doc and box HANDOVER.md now mirrors. Backups of all three pre-merge copies: box `backups/handoff_unify_20261016_010906/`.

## 7. Live job log — written the moment a job starts or finishes (newest first)

Rule (16 Oct 2026, Ange): every job writes here when it STARTS and when it FINISHES (or fails), not just at session end. Any session — phone, laptop, voice, Nova, routines — reads this file first and picks up from the newest line. A RUNNING line with no matching DONE means the job may have been cut off: check its output before redoing it. Format: `time (Melb) | STATUS | job | result / where it is`.

- 6:36pm 16 Oct | RUNNING | Register check + hub icon fix + install status (Search Studio, Notes, side panel) | 1) REALM OPEN REGISTER read-only link check; 2) Realm Apps hub old R tile -> Ara icons on gh-pages; 3) manifest/install check. Backup box /workspace/backups/icons_register_20261016_1835
- 3:01pm 16 Oct | DONE | layers.html visual layer map (the 12:26pm RUNNING line) | reconciled by Handoff mirror sync: gh-pages 6077ca0 (12:28pm, new files) + a099759 (phone Mend fix), later touched by Ara pass 24eadd5; live HTTP 200 https://rpcs111.github.io/realm-apps/layers.html
- 3:01pm 16 Oct | DONE | clasp re-sign-in as info@ (the 12:24pm WAITING line) | reconciled by Handoff mirror sync: box ~/.clasprc.json refreshed 12:49pm; `clasp list` works at 3:01pm (34 scripts); used for the 12:55pm Cert Studio test push. Tasks → Notes (12:51pm) still WAITING ANGE: web app @1 still returns 403 Access denied
- 1:50pm 16 Oct | DONE | Ara pass over all 11 live tiles (t1183u). Shared css/ara-theme.css (navy + cyan, WCAG AA: 0 contrast fails live on all 11 pages at both sizes). Every button/link clicked at 390x844 + 1280x800 on live, no real failures (3 known false reads: mapper paste/clear need a clipboard, Private keypad digits after the PIN is full, Queue phone Board tab already active). Fixed: Queue dry-run sheet blocked clicks (Escape close added), Layers Mend sheet Escape close, Layers + Cert Studio launcher favicons pointed at missing files, launcher missing the newer apps + no fallback when REALM_LINKS fails. Removed: old Install button + help box on Realm Apps, old-bot (Claude/Orion) nodes and wording on Flow Map, Layers, Nova, Queue apps panel. Left on purpose: Prism and step pages (item 5), Queue inventory rows describing Cert Studio v6 / Prism / ange.html, internal ids oi_claude + over.claude (saved data). private.html: theme link only, PIN/crypto untouched. Install check: 0 errors, 11 apps both sizes. gh-pages commits 3e3b8ab, c6093cb, a1b7098, 76f9a3f, 24eadd5, 9d84c36, 0619686, 54a34fc, fcd53ac, 9a20a12, 81cc478, 18b83e1 + 7ba97f3 (re-push: entity decode in transit), 6adbe07 (eta). Backup + shots: box /workspace/backups/ara_pass_20261016T015120Z, /workspace/ara_pass/shots
- 12:55pm 16 Oct | RUNNING | Ara pass over all 11 live tiles (t1183u): test every button/link at 390x844 + 1280x800, fix dead ones, strip Claude/Orion/R leftovers, one shared Ara theme css/ara-theme.css | gh-pages; backup box /workspace/backups/ara_pass_20261016T015120Z; per-page commits; Cert Studio Apps Script + PIN/crypto untouched
- 12:55pm 16 Oct | DONE (waiting Ange's Allow) | Cert Studio (Ara) test copy build 2 | clasp push to TEST project 1dVHQt4X… only + existing test deployment updated to @2 (AKfycby3…, no new deployment). Fixed: address bar pulls from Drive (new araSuggestSites, read-only), UTC date bug (certs before 11am dated yesterday), 29 Feb +12m blank, no-address cert not offered back, warning bar over step bar. Checked undo/redo, save/filing name+folder, 12-month redo, two tabs, autosave, PDF: 22/22 local harness + 7/7 server unit. curl: test link 403 'Access denied' until info@ opens it once and presses Allow; live v6 AKfycbwFil… 200, untouched. Notes: box /workspace/certstudio_ara_v2/CHANGES.md; backup /workspace/backups/certstudio_test_20261016_121711/. Nothing sent.
- 12:51pm 16 Oct | WAITING ANGE | Google Tasks → Notes live copy (t1170u) | script created + pushed + web app deployed @1 (REALM TASKS SYNC (Ara), editor https://script.google.com/d/1cOwVBFeHYsEDCwxqmr_rheJmK3tqhiALYqvfuEd13-rcr6OaYSQ8o-nn/edit). clasp run fails (NOT_FOUND); web app 'Access denied' until authorised. Ange: in editor run syncTasks → Allow, then installTrigger, then setupToken. Not synced yet; no trigger; Notes unchanged.
- 12:44pm 16 Oct | DONE | App tiles: each Realm app installs as its own app (Notes, Search Studio, Flow Map, Cert Studio launcher, Queue, Mapper, Layers, ETA, Nova, Private, Realm Apps) | gh-pages 1a8b197..43677f3, Private icon 9e7e0bb, queue/mapper iPhone tags + ETA 7ac9744. Unique manifest ids, page-only scopes, icons as served files in pwa/ (inline data: icons made Android save a plain shortcut). Live Chrome install check: 0 errors on all, phone + laptop. Notes save/reopen test passed. Ange: remove old R tile, reinstall each from its page. Report: box /workspace/pwa_tiles/REPORT.md
- 12:44pm 16 Oct | DONE | queue.html base layer + mapper.html live paste | gh-pages b88ef0f; live https://rpcs111.github.io/realm-apps/queue.html and /mapper.html; ETA board item 3 marked DONE
- 12:38pm 16 Oct | WAITING ANGE | Google Tasks → Notes live copy (t1170u) | built + mock-tested, NOT run: box /workspace/tasks_sync/ (Code.gs 15-min sync → overlay sheet tab TASKS_LIVE, token-gated web app, scribe.html patch staged, not pushed). Blocked on clasp sign-in, then Ange runs syncTasks/installTrigger/setupToken once in the editor. Steps: /workspace/tasks_sync/RUNBOOK.md
- 12:38pm 16 Oct | RUNNING | Google Tasks → Notes live copy (approved t1170u): every 15 min, all lists, per-task links | building in box /workspace/tasks_sync/; needs clasp sign-in to push
- 12:26pm 16 Oct | RUNNING | layers.html visual layer map (layers 1–3, overlay, connectors, Mend on every item) | building on gh-pages, new files only
- 12:24pm 16 Oct | WAITING ANGE | clasp re-sign-in as info@ (token expired, invalid_rapt) | sign-in link sent in chat; needs the localhost:45763 address back. Blocks clasp push/run.
- 12:17pm 16 Oct | RUNNING | Cert Studio (Ara) test copy full check: Drive address lookup fix, undo, save, 12-month redo, two-places-open, unfinished cert always saves | test project 1dVHQt4X…; live v6 untouched; clasp steps queued until sign-in
- 12:17pm 16 Oct | DONE | Nova wake-up prep | page live https://rpcs111.github.io/realm-apps/nova.html (commit e173fd8); wake-up text in box /workspace/nova/WAKEUP_DRAFT.md, given to Ange to paste; Nova still asleep until she replies
- 12:16pm 16 Oct | DONE | Grok app tools audit + PayPal/Acrobat check | reported in chat; nothing connected
- 12:15pm 16 Oct | RUNNING | queue.html base layer finish + mapper.html live paste page | gh-pages; shared board key realm_queue_v1
- 12:11pm 16 Oct | DONE | Handoff unified + 2-hourly mirror sync (7am–9pm Melb) | commit ba1fc48; Doc + box HANDOVER.md mirror this file
