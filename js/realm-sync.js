/* Realm apps sync (Ara, 16 Oct 2026). Loaded by every Realm app that keeps your data.
   1) Every app saves on THIS device first (localStorage), so nothing is lost offline.
   2) Then this script pushes the changes to the Ara Engine (private file in info@ Drive) and pulls the
      other device's changes on open / focus / every minute, so the phone and the desktop show the same thing.
   The device key is NEVER in this repo: open the one-tap link from Ara once per device (...#sync=KEY).
   It is kept on the device (localStorage 'realm_sync_token') and wiped from the address bar.
   28 Oct 2026: the Flow Map (realm_flow_map_v*) is no longer synced here: its step notes merge per step and save to
   Realm Desk with Google sign-in; whole-copy last-write-wins here could undo that merge.
   30 Oct 2026: the jobs file (realm_sot_jobs_v1, read by js/sot-jobs.js) is synced too, so one load reaches every device.
   It always goes in its own push, after the other keys, so a refusal never holds up another app's keys. Before that push the
   whole store is measured from a full pull (the same pull op, since 0): every key plus the Add to Tasks map. If the store with
   the new file would pass 7,000,000 characters, or can't be measured (the pull doesn't return the tasks map), the file is not pushed. A skipped or refused file is not tried again until the page
   reloads or the file changes; it stays on this device and the status line says so (too big only when measured over the limit;
   otherwise that the space can't be checked yet). A page whose sync scope lacks the jobs key (Anchor) never measures or pushes it.
   The jobs file never reloads a page.
   Only the app-data keys listed in INC are synced. Never synced: realm_key, PINs, Private vault, capture outbox. */
(function () {
  'use strict';
  if (window.RealmSync) return;
  var API = 'https://script.google.com/macros/s/AKfycbxzrPy359CBlkbrYuR0-5xJB4GLXIQ6xNDIE6EFEb2xvnoY0n5sodcnljN4Ohqf4nWa/exec';
  var TOK = 'realm_sync_token', BASE = 'realm_sync_base', META = 'realm_sync_meta', DEVK = 'realm_sync_dev';
  var INC = [/^realm_scribe_v\d+$/, /^realm_notes$/, /^realm_notes_tasks_v\d+$/, /^realm_today_blocks$/, /^realm_next_(done|q|snz)_/,
    /^realm_layers_v\d+$/, /^realm_map_app_v\d+$/, /^realm_queue_v1$/, /^realm_queue_dryrun_v1$/,
    /^realm_metatron[A-Za-z0-9_]*$/, /^realm_prism_v\d+$/, /^realm_amends$/, /^realm_video_recent$/, /^realmCrew(Idea|Tree)$/,
    /^realm_setup_[A-Za-z0-9_\-]+$/, /^realm-cert-items$/, /^realm_sot_jobs_v1$/];
  var JOBK = 'realm_sot_jobs_v1', JOB_LIMIT = 7000000, SIZEK = 'realm_sync_jobs_size'; /* SIZEK: local size log, never synced */
  var JOB_TXT = { big: 'Jobs list too big to sync right now. The jobs file stays on this device. Everything else still syncs.',
    nocheck: 'The jobs file stays on this device for now: the sync can\u2019t check the space yet. Everything else still syncs.',
    refused: 'The jobs file stays on this device. Everything else still syncs.' };
  var jobNo = null, jobNote = ''; /* jobNo: the file text that was skipped or refused (not tried again until reload or a new file) */
  var CUR = document.currentScript, LS = window.localStorage, SP = Storage.prototype, rawSet = SP.setItem, rawRemove = SP.removeItem;
  /* Opt-in per page (17 Oct 2026, Search Studio first): <script src="js/realm-sync.js" data-backoff data-allow-text="...">
     data-backoff: while the Engine can't be reached (Allow not done yet / blocked), back off 1, 2, 4 ... 30 min instead of
     retrying every minute and on every focus. A tap on the status line still retries at once. Pages without it behave as before.
     data-allow-text: friendlier wording for the 'allow' state. */
  var BO = !!(CUR && CUR.hasAttribute('data-backoff')), boN = 0, boUntil = 0;
  var ALLOW_TXT = CUR && CUR.getAttribute('data-allow-text');
  /* data-sync-anchor (30 Oct 2026, Anchor Studio only): this page syncs only its own job copies (realm_anchor_job_<address>) and its
     Pick up list (realm_anchor_resume), with its own pull cursor and agreed copies (realm_sync_meta_anchor, realm_sync_base_anchor).
     It never reads or moves the cursor the other pages share, so each side still gets every change made on another screen.
     The device key and device name stay shared. Pages without it sync exactly what they did before. */
  if (CUR && CUR.hasAttribute('data-sync-anchor')) { INC = [/^realm_anchor_job_[a-z0-9_]{1,60}$/, /^realm_anchor_resume$/]; META = 'realm_sync_meta_anchor'; BASE = 'realm_sync_base_anchor'; }
  function inScope(k) { if (!k || k.length > 80 || !/^[A-Za-z0-9_\-]+$/.test(k)) return false; for (var i = 0; i < INC.length; i++) if (INC[i].test(k)) return true; return false; }
  var rawGet = SP.getItem, used = {}; /* used: synced keys this page has read since this file loaded */
  function rd(k) { try { return rawGet.call(LS, k); } catch (e) { return null; } }
  /* 2 Nov: a change from another device reloads this page only if it is this page's own data: a key the page has read (also while
     it redraws from the change), or the full key, in quotes, in this page's own inline scripts. Text, comments outside scripts, data
     blocks, and keys that only start the same way or contain the name do not count. Other apps' data is stored quietly and shows
     when that app opens. */
  var own = null;
  function mine(k) {
    if (used[k]) return true;
    if (own == null) {
      own = '';
      try { var s = document.scripts; for (var i = 0; i < s.length; i++) { var ty = (s[i].type || '').toLowerCase(); if (!s[i].src && (!ty || /javascript|module/.test(ty))) own += s[i].text + '\n'; } } catch (e) {}
    }
    if (own.indexOf('"' + k + '"') >= 0 || own.indexOf("'" + k + "'") >= 0 || own.indexOf('`' + k + '`') >= 0) return true;
    var L = ownList();
    for (var i = 0; i < L.length; i++) { var t = L[i]; if (t === k || (t.charAt(t.length - 1) === '*' && k.indexOf(t.slice(0, -1)) === 0)) return true; }
    return false;
  }
  /* 2 Nov: keys a page reads before this file loads also count as its own when the page names them:
     - listed on this script tag (data-sync-own="realm_a realm_b_*") or in <meta name="realm-sync-own" content="...">;
     - the value of a "key" or "...Key" field in the page's own JSON settings block (e.g. "key": "realm_prism_v2");
     - a quoted key start that the page's own script joins with "+" (e.g. 'realm_setup_' + name), which covers every key with that start.
     A name has to be at least 8 characters with its "*", so a bare 'realm_' never counts. */
  var ownPre = null;
  function ownList() {
    if (ownPre) return ownPre;
    ownPre = [];
    var add = function (t) { t = String(t || '').trim(); if (t.length >= 8 && t.length <= 81 && /^[A-Za-z0-9_\-]+\*?$/.test(t)) ownPre.push(t); };
    try {
      if (CUR) (CUR.getAttribute('data-sync-own') || '').split(/[\s,]+/).forEach(add);
      var mt = document.querySelector('meta[name="realm-sync-own"]'); if (mt) (mt.getAttribute('content') || '').split(/[\s,]+/).forEach(add);
      var sc = document.scripts, x;
      for (var i = 0; i < sc.length; i++) {
        if (sc[i].src) continue;
        var ty = (sc[i].type || '').toLowerCase(), tx = sc[i].text || '';
        if (/json/.test(ty)) { var r1 = /"(?:key|[A-Za-z]+Key)"\s*:\s*"([A-Za-z0-9_\-]{3,80})"/g; while ((x = r1.exec(tx))) add(x[1]); }
        else if (!ty || /javascript|module/.test(ty)) { var r2 = /(['"`])([A-Za-z0-9_\-]{3,79}[_\-])\1\s*\+/g; while ((x = r2.exec(tx))) add(x[2] + '*'); }
      }
    } catch (e) {}
    return ownPre;
  }
  function wr(k, v) { try { if (v == null) rawRemove.call(LS, k); else rawSet.call(LS, k, v); return true; } catch (e) { return false; } }
  function rj(k, d) { try { var v = JSON.parse(rd(k)); return v == null ? d : v; } catch (e) { return d; } }
  function wj(k, o) { return wr(k, JSON.stringify(o)); }

  // ---- one-tap device key: ...#sync=KEY (also accepts the Engine's 64-hex #k= link on non-Desk pages) ----
  function grab() {
    try {
      var h = location.hash || '', m = h.match(/[#&]sync=([A-Za-z0-9]{32,128})/) || h.match(/[#&]k=([0-9a-f]{64})(?:&|$)/);
      if (m) { wr(TOK, m[1]); history.replaceState(null, '', location.pathname + location.search); return true; }
    } catch (e) {}
    return false;
  }
  grab();
  window.addEventListener('hashchange', function () { if (grab()) { boN = 0; boUntil = 0; soon(0); } });
  var dev = rd(DEVK); if (!dev) { dev = (/Android|iPhone|iPad/i.test(navigator.userAgent) ? 'phone-' : 'desktop-') + Math.random().toString(36).slice(2, 8); wr(DEVK, dev); }

  // ---- watch local saves (timestamps for last-write-wins + quick push) ----
  var meta = rj(META, {}); meta.t = meta.t || {}; meta.rev = meta.rev || 0;
  var stale = {}; // keys a remote change landed in while this page still had the old copy in memory
  var guard = null; // set just before a sync reload: the page's own unload save must not overwrite the merged copy
  function touch(k) {
    meta.t[k] = Date.now(); if (stale[k]) { meta.nodel = meta.nodel || {}; meta.nodel[k] = 1; }
    wj(META, meta); soon(1500);
  }
  SP.getItem = function (k) { try { if (this === LS && inScope(String(k))) used[String(k)] = 1; } catch (e) {} return rawGet.apply(this, arguments); };
  SP.setItem = function (k, v) { if (guard && this === LS && guard[String(k)]) return; var r = rawSet.apply(this, arguments); try { if (this === LS && inScope(String(k))) touch(String(k)); } catch (e) {} return r; };
  SP.removeItem = function (k) { if (guard && this === LS && guard[String(k)]) return; var r = rawRemove.apply(this, arguments); try { if (this === LS && inScope(String(k))) touch(String(k)); } catch (e) {} return r; };

  // ---- 3-way merge (base = last copy both sides agreed on) ----
  function P(s) { if (s == null) return undefined; try { return JSON.parse(s); } catch (e) { return undefined; } }
  function J(o) { return o === undefined ? undefined : JSON.stringify(o); }
  function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function idArr(a) { return Array.isArray(a) && a.length > 0 && a.every(function (x) { return isObj(x) && (typeof x.id === 'string' || typeof x.id === 'number'); }); }
  function pick(b, l, r, lNewer) { var bj = J(b), lj = J(l), rj2 = J(r); if (lj === rj2) return l; if (lj === bj) return r; if (rj2 === bj) return l; return lNewer ? l : r; }
  function mergeArr(b, l, r, noDel, lNewer) {
    var B = {}, R = {}, L = {}, out = [];
    (Array.isArray(b) ? b : []).forEach(function (x) { if (isObj(x)) B[x.id] = x; });
    r.forEach(function (x) { R[x.id] = x; }); l.forEach(function (x) { L[x.id] = x; });
    l.forEach(function (x) {
      var id = x.id;
      if (id in R) out.push(pick(B[id], x, R[id], lNewer));
      else if (!(id in B) || noDel || J(x) !== J(B[id])) out.push(x); // new here, or changed here after the other side deleted it
    });
    r.forEach(function (x) {
      var id = x.id; if (id in L) return;
      if (!(id in B) || noDel || J(x) !== J(B[id])) out.push(x); // new there (keep), or deleted here (drop unless changed there)
    });
    return out;
  }
  function mergeObj(b, l, r, noDel, lNewer) {
    var out = {}, B = isObj(b) ? b : {}, ks = {};
    Object.keys(l).concat(Object.keys(r)).forEach(function (k) { ks[k] = 1; });
    Object.keys(ks).forEach(function (k) {
      var inL = k in l, inR = k in r;
      if (inL && inR) out[k] = pick(B[k], l[k], r[k], lNewer);
      else if (inL) { if (!(k in B) || noDel || J(l[k]) !== J(B[k])) out[k] = l[k]; }
      else { if (!(k in B) || noDel || J(r[k]) !== J(B[k])) out[k] = r[k]; }
    });
    return out;
  }
  function merge(bs, ls, rs, noDel, lNewer) {
    if (ls === rs) return ls; if (ls === bs) return rs; if (rs === bs) return ls;
    if (ls == null) return noDel ? rs : (bs == null ? rs : (lNewer ? null : rs));
    if (rs == null) return noDel ? ls : (bs == null ? ls : (lNewer ? ls : null));
    var b = P(bs), l = P(ls), r = P(rs);
    if ((idArr(l) || (Array.isArray(l) && !l.length)) && (idArr(r) || (Array.isArray(r) && !r.length)) && (idArr(l) || idArr(r))) return JSON.stringify(mergeArr(b, l, r, noDel, lNewer));
    if (isObj(l) && isObj(r)) return JSON.stringify(mergeObj(b, l, r, noDel, lNewer));
    return lNewer ? ls : rs; // plain values: last write wins
  }

  // ---- status line ----
  var st = { state: 'local', msg: '', at: 0 }, el = null, statusFns = [], changeFns = [], readyFns = [];
  var TXT = {
    synced: function () { return '\u2713 Synced with your other devices' + (st.at ? ' \u00b7 ' + new Date(st.at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }) : '') + (jobNote ? ' \u00b7 ' + jobNote : ''); },
    syncing: function () { return 'Saved on this device \u00b7 syncing\u2026'; },
    allow: function () { return ALLOW_TXT || 'Saved on this device \u2014 waiting for the sign-in OK'; },
    nokey: function () { return 'Saved on this device \u2014 open the sync link from the team once on this device'; },
    badkey: function () { return 'Saved on this device \u2014 sync link not accepted, ask the team for the new one'; },
    offline: function () { return 'Saved on this device \u2014 offline, syncs when back online'; },
    error: function () { return (!st.msg || st.msg === 'error') ? TXT.allow() : 'Saved on this device \u2014 sync will retry (' + st.msg + ')'; }
  };
  function paint() {
    if (!document.body) return;
    if (!el) {
      el = document.querySelector('[data-realm-sync]');
      if (!el) {
        el = document.createElement('button'); el.type = 'button'; el.id = 'realmSyncPill';
        el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147482000;max-width:calc(100vw - 16px);font:600 11px/1.3 system-ui,sans-serif;min-height:44px;padding:4px 12px;border-radius:999px;border:1px solid #334155;background:rgba(2,6,23,.88);color:#cbd5e1;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
        document.body.appendChild(el);
      }
      el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); el.title = 'Tap to sync now';
      el.addEventListener('click', function () { cycle(true); });
      if (el.tagName !== 'BUTTON') el.style.cursor = 'pointer';
    }
    el.textContent = (TXT[st.state] || TXT.error)();
    el.setAttribute('data-sync-state', st.state);
    if (el.id === 'realmSyncPill') el.style.color = st.state === 'synced' ? '#86efac' : (st.state === 'syncing' ? '#cbd5e1' : '#fcd34d');
  }
  function set(s, msg) {
    if (BO) { if (s === 'allow') { boUntil = Date.now() + Math.min(60000 * Math.pow(2, boN), 1800000); boN++; } else if (s === 'synced' || s === 'nokey') { boN = 0; boUntil = 0; } }
    st.state = s; st.msg = msg || ''; if (s === 'synced') st.at = Date.now(); paint(); statusFns.forEach(function (f) { try { f(st.state); } catch (e) {} }); }

  // ---- talk to the Engine ----
  function post(body, ms) {
    var ctl = window.AbortController ? new AbortController() : null, t = ctl ? setTimeout(function () { ctl.abort(); }, ms || 25000) : 0;
    return fetch(API, { method: 'POST', body: JSON.stringify(body), redirect: 'follow', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .catch(function (e) { clearTimeout(t); var x = new Error(navigator.onLine === false ? 'offline' : 'unreachable'); x.net = true; throw x; });
  }
  function call(body) {
    var k = rd(TOK); if (!k) return Promise.reject(new Error('no key'));
    var b = {}; for (var p in body) b[p] = body[p]; b.app = b.app || 'sync'; b.k = k;
    return post(b);
  }

  var busy = false, again = false, timer = 0;
  function soon(ms) { clearTimeout(timer); timer = setTimeout(cycle, ms || 0); }
  /* 2 Nov: coming back to an app, and the minute timer, only pull when the last pull is 5+ minutes old. Your own changes still send
     within 2 seconds (touch), and the Sync now button and coming back online still pull at once. */
  var lastPull = 0, PULL_GAP = 300000;
  function backSoon() { if (!document.hidden && Date.now() - lastPull >= PULL_GAP) soon(200); }
  function localKeys() { var o = {}; for (var i = 0; i < LS.length; i++) { var k = LS.key(i); if (inScope(k)) o[k] = 1; } return o; }
  function canon(v) { if (Array.isArray(v)) return v.map(canon); if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = canon(v[k]); }); return o; } return v; }
  function same(a, b) { if (a === b) return true; if (a == null || b == null) return false; try { return JSON.stringify(canon(JSON.parse(a))) === JSON.stringify(canon(JSON.parse(b))); } catch (e) { return false; } }
  function applyRemote(keys, base, changed) {
    Object.keys(keys).forEach(function (k) {
      if (!inScope(k)) return;
      var R = keys[k], bb = base[k], L = rd(k), noDel = !!(meta.nodel && meta.nodel[k]);
      var lNewer = (meta.t[k] || 0) > (R.t || 0);
      var m = merge(bb ? bb.v : null, L, R.v == null ? null : R.v, noDel, lNewer);
      if (m !== L) { wr(k, m); if (!same(m, L)) changed.push(k); } /* 2 Nov: only a real change in the data counts (same data, other key order or spacing, does not) */
      base[k] = { v: R.v == null ? null : R.v, r: R.r || 0 };
    });
  }
  /* 2 Nov: after a failed sync, automatic tries back off (30 s, 1, 2, 4 ... up to 30 min) with one timer; tapping the sync line
     or coming back online tries at once. */
  var errN = 0, errUntil = 0, retryT = 0;
  function cycle(force) {
    if (busy) { again = true; return Promise.resolve(); }
    if (force !== true && errUntil && Date.now() < errUntil) { if (!retryT) retryT = setTimeout(function () { retryT = 0; cycle(); }, errUntil - Date.now()); return Promise.resolve(); }
    if (BO && force !== true && boUntil && Date.now() < boUntil) return Promise.resolve(); // backing off: Engine not reachable yet
    var k = rd(TOK);
    if (navigator.onLine === false) { set('offline'); return Promise.resolve(); }
    busy = true; lastPull = Date.now();
    var base = rj(BASE, {}), changed = [];
    var p = !k
      ? post({ app: 'sync', op: 'ping' }).then(function (j) { set(j && j.engine ? 'nokey' : 'allow'); throw { quiet: 1 }; })
      : (set(st.state === 'synced' ? 'synced' : 'syncing'), call({ op: 'pull', since: meta.rev }));
    return p.then(function (j) {
      if (!j || !j.ok) throw new Error(j && j.error || 'no answer');
      applyRemote(j.keys || {}, base, changed); meta.rev = j.rev || meta.rev; wj(BASE, base); wj(META, meta);
      return push(base, changed, 0);
    }).then(function () { return pushJobs(base, changed, 0); }).then(function () {
      if (meta.nodel) { delete meta.nodel; wj(META, meta); }
      errN = 0; errUntil = 0;
      set('synced'); readyFns.forEach(function (f) { try { f(); } catch (e) {} });
      if (changed.length) notify(changed);
    }).catch(function (e) {
      if (e && e.quiet) return;
      errUntil = Date.now() + Math.min(30000 * Math.pow(2, errN), 1800000); errN++;
      if (e && e.net) set(e.message === 'offline' ? 'offline' : 'allow');
      else if (e && /unauthorised/.test(e.message)) set('badkey');
      else set('error', e && e.message);
    }).then(function () { busy = false; if (again) { again = false; soon(500); } });
  }
  function push(base, changed, n) {
    var items = {}, any = false, lk = localKeys();
    Object.keys(lk).concat(Object.keys(base)).forEach(function (k) {
      if (items[k] || !inScope(k) || k === JOBK) return; /* the jobs file goes in its own push (pushJobs) */
      var L = rd(k), bb = base[k];
      if (bb ? bb.v === L : L == null) return;
      items[k] = { v: L, t: meta.t[k] || Date.now(), base: bb ? bb.r : 0 }; any = true;
    });
    if (!any) return Promise.resolve();
    return call({ op: 'push', items: items, dev: (rd('realm_device') ? rd('realm_device') + '/' : '') + dev }).then(function (j) {
      if (!j || !j.ok) throw new Error(j && j.error || 'push failed');
      Object.keys(j.accepted || {}).forEach(function (k) { base[k] = { v: items[k].v, r: j.accepted[k] }; });
      var c = j.conflicts || {};
      wj(BASE, base);
      if (Object.keys(c).length && n < 3) { applyRemote(c, base, changed); wj(BASE, base); return push(base, changed, n + 1); }
    });
  }
  /* the jobs file on its own: measure the store first, then push just that key. Never throws, so other keys' sync is unaffected. */
  function sizeLog(o) { o.at = new Date().toISOString(); o.limit = JOB_LIMIT; wr(SIZEK, JSON.stringify(o)); }
  function pushJobs(base, changed, n) {
    if (!inScope(JOBK)) return Promise.resolve(); /* not this page's key (Anchor's own scope): never measured, never pushed */
    var L = rd(JOBK), bb = base[JOBK];
    if (bb ? bb.v === L : L == null) { if (jobNo !== L) jobNote = ''; return Promise.resolve(); }
    if (jobNo !== null && jobNo === L) return Promise.resolve(); /* skipped or refused before: wait for a reload or a new file */
    var item = { v: L, t: meta.t[JOBK] || Date.now(), base: bb ? bb.r : 0 };
    var stop = function (why) { if (navigator.onLine === false) return; jobNo = L; jobNote = JOB_TXT[why]; };
    /* measure gives 'ok' (measured, fits), 'big' (measured total over the limit) or 'nocheck' (size not known) */
    var measure = L == null ? Promise.resolve('ok') : call({ op: 'pull', since: 0 }).then(function (j) {
      /* pull since 0 returns every key in the store (all apps), the same shape the Engine saves. The whole store also holds the
         Add to Tasks map; it is counted only when the pull returns it as an object. Without it the size is not known: no push. */
      if (!j || !j.ok || !j.keys || typeof j.keys !== 'object') throw new Error('no store');
      var tk = j.tasks, hasT = !!tk && typeof tk === 'object' && !Array.isArray(tk);
      if (!hasT) throw new Error('tasks map not returned');
      var now = JSON.stringify({ rev: j.rev || 0, keys: j.keys, tasks: tk }).length, ks = {};
      Object.keys(j.keys).forEach(function (k) { ks[k] = j.keys[k]; });
      ks[JOBK] = { v: L, t: item.t, r: (j.rev || 0) + 1, dev: dev };
      var after = JSON.stringify({ rev: (j.rev || 0) + 1, keys: ks, tasks: tk }).length, ok = after <= JOB_LIMIT;
      sizeLog({ measured: true, how: 'full pull: every key and the tasks map', store_now: now, store_with_file: after, file: L.length, keys: Object.keys(j.keys).length, tasks: Object.keys(tk).length, push: ok });
      return ok ? 'ok' : 'big';
    }).catch(function (e) { sizeLog({ measured: false, file: L.length, push: false, error: String(e && e.message || e).slice(0, 60) }); return 'nocheck'; });
    return measure.then(function (m) {
      if (m !== 'ok') { stop(m); return; }
      return call({ op: 'push', items: { realm_sot_jobs_v1: item }, dev: (rd('realm_device') ? rd('realm_device') + '/' : '') + dev }).then(function (j) {
        if (!j || !j.ok) throw new Error('refused');
        if (j.accepted && j.accepted[JOBK] != null) { base[JOBK] = { v: item.v, r: j.accepted[JOBK] }; wj(BASE, base); jobNote = ''; jobNo = null; return; }
        var c = j.conflicts || {};
        if (c[JOBK] && n < 2) { var one = {}; one[JOBK] = c[JOBK]; applyRemote(one, base, changed); wj(BASE, base); return pushJobs(base, changed, n + 1); }
        throw new Error('refused');
      });
    }).catch(function () { stop('refused'); });
  }
  function notify(keys) {
    var handled = !!(CUR && CUR.hasAttribute('data-live')); // page reloads itself from 'storage' events (queue, mapper)
    keys.forEach(function (k) { try { window.dispatchEvent(new StorageEvent('storage', { key: k, newValue: rd(k), storageArea: LS, url: location.href })); } catch (e) {} });
    try { window.dispatchEvent(new CustomEvent('realmsync', { detail: { keys: keys } })); } catch (e) {}
    changeFns.forEach(function (f) { try { if (f({ keys: keys }) === true) handled = true; } catch (e) {} });
    /* 2 Nov: pages that can redraw in place listen for 'realm-sync:changed' (detail.keys) and call preventDefault() once they have
       redrawn; then the page does not reload. Pages without a listener keep the one capped reload for their own data. */
    try { var ev = new CustomEvent('realm-sync:changed', { detail: { keys: keys.slice() }, cancelable: true }); window.dispatchEvent(ev); if (ev.defaultPrevented) handled = true; } catch (e) {}
    keys = keys.filter(function (k) { return k !== JOBK && mine(k); }); /* the jobs file never reloads a page: its readers redraw from 'storage'; nor does another app's data */
    if (handled || !keys.length) return;
    keys.forEach(function (k) { stale[k] = 1; });
    reloadWhenIdle();
  }
  /* 2 Nov: hard cap. A page reloads itself for sync at most once every 30 seconds (counted across reloads in this tab).
     Inside that time it shows a "New data, tap to refresh" line instead, and the new data is already saved on this device. */
  var RLK = 'realm_sync_reload_at', RL_GAP = 30000, freshEl = null;
  function lastReload() { try { return +sessionStorage.getItem(RLK) || 0; } catch (e) { return 0; } }
  function doReload() {
    guard = {}; Object.keys(stale).forEach(function (k) { guard[k] = 1; });
    try { sessionStorage.setItem(RLK, String(Date.now())); } catch (e) {}
    keepDrafts();
    location.reload();
  }
  function showFresh() {
    if (freshEl || !document.body) return;
    freshEl = document.createElement('button'); freshEl.type = 'button'; freshEl.id = 'realmSyncFresh';
    freshEl.textContent = 'New data, tap to refresh';
    freshEl.style.cssText = 'position:fixed;left:8px;bottom:60px;z-index:2147482001;max-width:calc(100vw - 16px);min-height:44px;min-width:44px;font:600 14px/1.3 system-ui,sans-serif;padding:8px 16px;border-radius:999px;border:1px solid #fcd34d;background:rgba(2,6,23,.94);color:#fde68a;cursor:pointer';
    freshEl.addEventListener('click', doReload);
    document.body.appendChild(freshEl);
  }
  /* 2 Nov: typed text is never lost to a sync reload. A box (input, textarea or contenteditable) the user typed in and has not
     emptied counts as unsaved, and so does the box that has focus while it holds text. Then the page does not reload: it shows the
     "New data, tap to refresh" line instead. As a backstop, those drafts are kept in this tab (sessionStorage, never synced) when
     the page goes away and put back into the same empty box after any reload. PIN, password, key and code boxes are never kept. */
  var DRK = 'realm_sync_drafts', DR_AGE = 600000, dirty = [];
  function draftable(e) {
    if (!e || !e.tagName || e.hasAttribute('data-no-draft')) return false;
    var ce = e.isContentEditable && e.getAttribute('contenteditable') !== null, t = e.tagName;
    if (t === 'INPUT') { var ty = (e.type || 'text').toLowerCase(); if (!/^(text|search|email|url|tel|number)$/.test(ty)) return false; }
    else if (t !== 'TEXTAREA' && !ce) return false;
    var tag = [e.id, e.name, e.getAttribute('aria-label'), e.getAttribute('autocomplete'), e.getAttribute('placeholder')].join(' ');
    return !/pin|pass|key|token|secret|code|otp/i.test(tag);
  }
  function val(e) { return e.isContentEditable && e.tagName !== 'INPUT' && e.tagName !== 'TEXTAREA' ? (e.innerText || '') : (e.value || ''); }
  function fkey(e) {
    var t = e.tagName.toLowerCase(), k = e.id ? '#' + e.id : e.name ? t + '[name=' + e.name + ']' : '';
    if (!k) { var all = document.querySelectorAll(t); for (var i = 0; i < all.length; i++) if (all[i] === e) { k = t + ':' + i; break; } }
    return k;
  }
  document.addEventListener('input', function (ev) { var e = ev.target; if (draftable(e) && dirty.indexOf(e) < 0) dirty.push(e); }, true);
  function unsaved() {
    dirty = dirty.filter(function (e) { return e.isConnected; });
    for (var i = 0; i < dirty.length; i++) if (val(dirty[i]).trim()) return true;
    var a = document.activeElement;
    return !!(a && draftable(a) && val(a).trim());
  }
  function keepDrafts() {
    var o = {}, n = 0, a = document.activeElement, L = dirty.slice();
    if (a && draftable(a) && L.indexOf(a) < 0) L.push(a);
    L.forEach(function (e) { if (!e.isConnected) return; var v = val(e); if (v.trim()) { o[fkey(e)] = v; n++; } });
    try { if (n) sessionStorage.setItem(DRK, JSON.stringify({ p: location.pathname, t: Date.now(), f: o })); else sessionStorage.removeItem(DRK); } catch (e) {}
  }
  var pend = null;
  function putBackDrafts() {
    if (pend === null) {
      pend = {}; var d = null; try { d = JSON.parse(sessionStorage.getItem(DRK) || 'null'); sessionStorage.removeItem(DRK); } catch (e) {}
      if (d && d.p === location.pathname && d.f && Date.now() - (d.t || 0) <= DR_AGE) pend = d.f;
    }
    Object.keys(pend).forEach(function (k) {
      var e = null, m = /^([a-z0-9]+):(\d+)$/.exec(k);
      try { e = m ? document.querySelectorAll(m[1])[+m[2]] : document.querySelector(k.charAt(0) === '#' ? '[id="' + k.slice(1).replace(/"/g, '') + '"]' : k); } catch (x) {}
      if (!e || !draftable(e) || val(e).trim()) return;
      if (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA') e.value = pend[k]; else e.innerText = pend[k];
      delete pend[k];
      if (dirty.indexOf(e) < 0) dirty.push(e);
      try { e.dispatchEvent(new Event('input', { bubbles: true })); } catch (x) {}
    });
  }
  window.addEventListener('load', function () { putBackDrafts(); setTimeout(putBackDrafts, 600); });
  window.addEventListener('pagehide', keepDrafts);
  window.addEventListener('beforeunload', keepDrafts);
  function reloadWhenIdle() {
    if (Date.now() - lastReload() < RL_GAP || unsaved()) { showFresh(); return; }
    var a = document.activeElement, typing = a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
    if (!typing && !document.hidden) { doReload(); return; }
    var go = function () { document.removeEventListener('visibilitychange', go); document.removeEventListener('focusout', go); setTimeout(reloadWhenIdle, 400); };
    document.addEventListener('visibilitychange', go); document.addEventListener('focusout', go);
  }

  window.RealmSync = {
    status: function () { return st.state; },
    jobsNote: function () { return jobNote; },
    hasKey: function () { return !!rd(TOK); },
    syncNow: cycle,
    call: call,
    /* fn({keys}) after other-device changes land; return true if the page redrew itself (else it reloads once when idle) */
    onChange: function (fn) { changeFns.push(fn); },
    onStatus: function (fn) { statusFns.push(fn); },
    onReady: function (fn) { readyFns.push(fn); },
    _merge: merge
  };
  function start() { putBackDrafts(); paint(); soon(300); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  document.addEventListener('visibilitychange', backSoon);
  window.addEventListener('focus', backSoon);
  window.addEventListener('online', function () { boN = 0; boUntil = 0; errN = 0; errUntil = 0; soon(200); });
  setInterval(function () { if (!document.hidden && Date.now() - lastPull >= PULL_GAP) cycle(); }, 60000);
})();
