/* Realm apps sync (Ara, 16 Oct 2026). Loaded by every Realm app that keeps your data.
   1) Every app saves on THIS device first (localStorage), so nothing is lost offline.
   2) Then this script pushes the changes to the Ara Engine (private file in info@ Drive) and pulls the
      other device's changes on open / focus / every minute, so the phone and the desktop show the same thing.
   The device key is NEVER in this repo: open the one-tap link from Ara once per device (...#sync=KEY).
   It is kept on the device (localStorage 'realm_sync_token') and wiped from the address bar.
   Only the app-data keys listed in INC are synced. Never synced: realm_key, PINs, Private vault, capture outbox. */
(function () {
  'use strict';
  if (window.RealmSync) return;
  var API = 'https://script.google.com/macros/s/AKfycbxzrPy359CBlkbrYuR0-5xJB4GLXIQ6xNDIE6EFEb2xvnoY0n5sodcnljN4Ohqf4nWa/exec';
  var TOK = 'realm_sync_token', BASE = 'realm_sync_base', META = 'realm_sync_meta', DEVK = 'realm_sync_dev';
  var INC = [/^realm_scribe_v\d+$/, /^realm_notes$/, /^realm_notes_tasks_v\d+$/, /^realm_today_blocks$/, /^realm_next_(done|q|snz)_/,
    /^realm_layers_v\d+$/, /^realm_flow_map_v\d+$/, /^realm_map_app_v\d+$/, /^realm_queue_v1$/, /^realm_queue_dryrun_v1$/,
    /^realm_metatron[A-Za-z0-9_]*$/, /^realm_prism_v\d+$/, /^realm_amends$/, /^realm_video_recent$/, /^realmCrew(Idea|Tree)$/,
    /^realm_setup_[A-Za-z0-9_\-]+$/, /^realm-cert-items$/];
  var CUR = document.currentScript, LS = window.localStorage, SP = Storage.prototype, rawSet = SP.setItem, rawRemove = SP.removeItem;
  /* Opt-in per page (17 Oct 2026, Search Studio first): <script src="js/realm-sync.js" data-backoff data-allow-text="...">
     data-backoff: while the Engine can't be reached (Allow not done yet / blocked), back off 1, 2, 4 ... 30 min instead of
     retrying every minute and on every focus. A tap on the status line still retries at once. Pages without it behave as before.
     data-allow-text: friendlier wording for the 'allow' state. */
  var BO = !!(CUR && CUR.hasAttribute('data-backoff')), boN = 0, boUntil = 0;
  var ALLOW_TXT = CUR && CUR.getAttribute('data-allow-text');
  function inScope(k) { if (!k || k.length > 80 || !/^[A-Za-z0-9_\-]+$/.test(k)) return false; for (var i = 0; i < INC.length; i++) if (INC[i].test(k)) return true; return false; }
  function rd(k) { try { return LS.getItem(k); } catch (e) { return null; } }
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
    synced: function () { return '\u2713 Synced with your other devices' + (st.at ? ' \u00b7 ' + new Date(st.at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }) : ''); },
    syncing: function () { return 'Saved on this device \u00b7 syncing\u2026'; },
    allow: function () { return ALLOW_TXT || 'Saved on this device \u2014 waiting for Ara Engine Allow'; },
    nokey: function () { return 'Saved on this device \u2014 open the sync link from Ara once on this device'; },
    badkey: function () { return 'Saved on this device \u2014 sync link not accepted, ask Ara for the new one'; },
    offline: function () { return 'Saved on this device \u2014 offline, syncs when back online'; },
    error: function () { return (!st.msg || st.msg === 'error') ? TXT.allow() : 'Saved on this device \u2014 sync will retry (' + st.msg + ')'; }
  };
  function paint() {
    if (!document.body) return;
    if (!el) {
      el = document.querySelector('[data-realm-sync]');
      if (!el) {
        el = document.createElement('button'); el.type = 'button'; el.id = 'realmSyncPill';
        el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147482000;max-width:calc(100vw - 16px);font:600 11px/1.3 system-ui,sans-serif;padding:4px 9px;border-radius:999px;border:1px solid #334155;background:rgba(2,6,23,.88);color:#cbd5e1;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
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
  function localKeys() { var o = {}; for (var i = 0; i < LS.length; i++) { var k = LS.key(i); if (inScope(k)) o[k] = 1; } return o; }
  function applyRemote(keys, base, changed) {
    Object.keys(keys).forEach(function (k) {
      if (!inScope(k)) return;
      var R = keys[k], bb = base[k], L = rd(k), noDel = !!(meta.nodel && meta.nodel[k]);
      var lNewer = (meta.t[k] || 0) > (R.t || 0);
      var m = merge(bb ? bb.v : null, L, R.v == null ? null : R.v, noDel, lNewer);
      if (m !== L) { wr(k, m); changed.push(k); }
      base[k] = { v: R.v == null ? null : R.v, r: R.r || 0 };
    });
  }
  function cycle(force) {
    if (busy) { again = true; return Promise.resolve(); }
    if (BO && force !== true && boUntil && Date.now() < boUntil) return Promise.resolve(); // backing off: Engine not reachable yet
    var k = rd(TOK);
    if (navigator.onLine === false) { set('offline'); return Promise.resolve(); }
    busy = true;
    var base = rj(BASE, {}), changed = [];
    var p = !k
      ? post({ app: 'sync', op: 'ping' }).then(function (j) { set(j && j.engine ? 'nokey' : 'allow'); throw { quiet: 1 }; })
      : (set(st.state === 'synced' ? 'synced' : 'syncing'), call({ op: 'pull', since: meta.rev }));
    return p.then(function (j) {
      if (!j || !j.ok) throw new Error(j && j.error || 'no answer');
      applyRemote(j.keys || {}, base, changed); meta.rev = j.rev || meta.rev; wj(BASE, base); wj(META, meta);
      return push(base, changed, 0);
    }).then(function () {
      if (meta.nodel) { delete meta.nodel; wj(META, meta); }
      set('synced'); readyFns.forEach(function (f) { try { f(); } catch (e) {} });
      if (changed.length) notify(changed);
    }).catch(function (e) {
      if (e && e.quiet) return;
      if (e && e.net) set(e.message === 'offline' ? 'offline' : 'allow');
      else if (e && /unauthorised/.test(e.message)) set('badkey');
      else set('error', e && e.message);
    }).then(function () { busy = false; if (again) { again = false; soon(500); } });
  }
  function push(base, changed, n) {
    var items = {}, any = false, lk = localKeys();
    Object.keys(lk).concat(Object.keys(base)).forEach(function (k) {
      if (items[k] || !inScope(k)) return;
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
  function notify(keys) {
    var handled = !!(CUR && CUR.hasAttribute('data-live')); // page reloads itself from 'storage' events (queue, mapper)
    keys.forEach(function (k) { try { window.dispatchEvent(new StorageEvent('storage', { key: k, newValue: rd(k), storageArea: LS, url: location.href })); } catch (e) {} });
    try { window.dispatchEvent(new CustomEvent('realmsync', { detail: { keys: keys } })); } catch (e) {}
    changeFns.forEach(function (f) { try { if (f({ keys: keys }) === true) handled = true; } catch (e) {} });
    if (handled) return;
    keys.forEach(function (k) { stale[k] = 1; });
    reloadWhenIdle();
  }
  function reloadWhenIdle() {
    var a = document.activeElement, typing = a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
    if (!typing && !document.hidden) { guard = {}; Object.keys(stale).forEach(function (k) { guard[k] = 1; }); location.reload(); return; }
    var go = function () { document.removeEventListener('visibilitychange', go); document.removeEventListener('focusout', go); setTimeout(reloadWhenIdle, 400); };
    document.addEventListener('visibilitychange', go); document.addEventListener('focusout', go);
  }

  window.RealmSync = {
    status: function () { return st.state; },
    hasKey: function () { return !!rd(TOK); },
    syncNow: cycle,
    call: call,
    /* fn({keys}) after other-device changes land; return true if the page redrew itself (else it reloads once when idle) */
    onChange: function (fn) { changeFns.push(fn); },
    onStatus: function (fn) { statusFns.push(fn); },
    onReady: function (fn) { readyFns.push(fn); },
    _merge: merge
  };
  function start() { paint(); soon(300); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) soon(200); });
  window.addEventListener('focus', function () { soon(200); });
  window.addEventListener('online', function () { boN = 0; boUntil = 0; soon(200); });
  setInterval(function () { if (!document.hidden) cycle(); }, 60000);
})();
