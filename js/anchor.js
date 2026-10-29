/* Anchor Studio (30 Oct 2026): what makes anchor.html more than a copy of Cert Studio. Loaded last (defer). No keys, no codes.
   Part 1: name and mic. The shared scripts still say Cert Studio in a few lines; on this page they say Anchor Studio.
   The mic button gets the SM7B-style podcast mic drawing (same art as the 29 Oct redraw), 44px tap. */
(function () {
  'use strict';
  if (window.AnchorStudio || (window.CSJobs && CSJobs.busy)) return;
  var A = window.AnchorStudio = { v: 1 };
  var $ = function (id) { return document.getElementById(id); };
  A.$ = $;
  A.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  A.css = function (id, t) { if ($(id)) return; var s = document.createElement('style'); s.id = id; s.textContent = t; document.head.appendChild(s); };
  A.el = function (tag, attrs, html) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }); if (html != null) e.innerHTML = html; return e; };

  /* ---- the name on screen ---- */
  try { if (window.Resume && Resume.register) Resume.register('cert', { name: 'Anchor Studio', page: 'anchor.html' }); } catch (e) {}
  var OLD = /Cert Studio/g, BAN = /\bloop\b/gi;
  function rename(root) {
    var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) { var v = n.nodeValue; if (OLD.test(v) || BAN.test(v)) { OLD.lastIndex = 0; BAN.lastIndex = 0; n.nodeValue = v.replace(OLD, 'Anchor Studio').replace(BAN, 'round'); } OLD.lastIndex = 0; BAN.lastIndex = 0; }
    [].forEach.call(document.querySelectorAll('[aria-label*="Cert Studio"],[title*="Cert Studio"]'), function (e) {
      ['aria-label', 'title'].forEach(function (k) { var v = e.getAttribute(k); if (v && v.indexOf('Cert Studio') >= 0) e.setAttribute(k, v.replace(OLD, 'Anchor Studio')); }); });
  }
  A.rename = rename;

  /* ---- the mic: SM7B-style podcast mic (no brand text), 44px ---- */
  var SM7B_IN = '<rect x="6.2" y="1.5" width="11.6" height="9.4" rx="4.2" fill="currentColor" fill-opacity=".3"/><path d="M8 4.7h8M7.8 7.8h8.4" stroke-width="1.6"/><path d="M8.9 10.9v2.3a1.5 1.5 0 0 0 1.5 1.5h3.2a1.5 1.5 0 0 0 1.5-1.5v-2.3"/><path d="M5.6 13.6a6.4 5.4 0 0 0 12.8 0" stroke-width="2.4"/><path d="M12 19.2v2.2M8.3 21.8h7.4"/>';
  A.SM7B = '<svg class="an-sm7b" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + SM7B_IN + '</svg>';
  function mic() {
    var host = $('asMic'); if (!host) return false;
    var b = host.querySelector('button'); if (!b) return false;
    if (!b.querySelector('.an-sm7b')) { var old = b.querySelector('svg'); var t = document.createElement('span'); t.innerHTML = A.SM7B; if (old) old.replaceWith(t.firstChild); else b.insertBefore(t.firstChild, b.firstChild); }
    b.style.minWidth = '44px'; b.style.minHeight = '44px';
    if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', 'Talk to the bots');
    return true;
  }
  A.mic = mic;

  var q = 0;
  function tick() { q = 0; rename(document.body); mic(); A.hooks.forEach(function (f) { try { f(); } catch (e) {} }); }
  A.hooks = [];
  A.soon = function () { if (!q) q = setTimeout(tick, 60); };
  if (window.MutationObserver) new MutationObserver(A.soon).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('load', A.soon); setTimeout(A.soon, 300); setTimeout(A.soon, 1500);
})();

/* Part 2 (30 Oct 2026): jobs sync and save across every screen (desktop, second screen, phone).
   Each job is saved under its address (the address is always the key) in localStorage realm_anchor_job_<address>, and
   js/realm-sync.js carries it to info@'s private Drive store (the same Ara Engine sync Notes uses) and back. This device keeps its
   own copy for offline. The parts of a job: plan, drawing, certificate, the cert it's up to, the walkthrough notes. */
(function () {
  'use strict';
  var A = window.AnchorStudio; if (!A || !window.CSJobs) return;
  var $ = A.$, esc = A.esc, ls = window.localStorage, J = window.CSJobs, PFX = 'realm_anchor_job_', LIVE = 'realmLive:';
  var MAXV = 900000, BIG = 100000;
  function jget(k) { try { return JSON.parse(ls.getItem(k) || 'null'); } catch (e) { return null; } }
  A.slug = function (addr) {
    var s = String(addr || '').toLowerCase().replace(/&/g, ' and ').replace(/\b(australia|victoria|vic)\b/g, ' ').replace(/\b3\d{3}\s*$/, ' ')
      .replace(/\bstreet\b/g, 'st').replace(/\broad\b/g, 'rd').replace(/\bavenue\b/g, 'ave').replace(/\bparade\b/g, 'pde').replace(/\bdrive\b/g, 'dr').replace(/\bcourt\b/g, 'ct').replace(/\bplace\b/g, 'pl').replace(/\bcrescent\b/g, 'cres').replace(/\bhighway\b/g, 'hwy')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return s.slice(0, 60).replace(/_+$/, '');
  };
  function field(id) { var e = $(id); return e ? String(e.value || '').trim() : ''; }
  A.address = function () { var s = field('site'); if (!s) { var st = jget('realm-stamper'); s = st && st.site || ''; } if (!s) { var c = jget('realm-cert'); s = c && c.site || ''; } return String(s).trim(); };
  function keysNow() { var ks = J.keys.slice(); for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (k && k.indexOf(LIVE) === 0) ks.push(k); } return ks; }
  function strip(o, dropped) { /* big pictures stay on this device */
    if (typeof o === 'string') { if (o.length > BIG && /^data:/.test(o)) { dropped.pic = 1; return null; } return o; }
    if (Array.isArray(o)) return o.map(function (x) { return strip(x, dropped); });
    if (o && typeof o === 'object') { var r = {}; Object.keys(o).forEach(function (k) { r[k] = strip(o[k], dropped); }); return r; }
    return o;
  }
  function snapNow() {
    var o = {}, kept = [], size = 0, dropped = {};
    keysNow().forEach(function (k) { var v = ls.getItem(k); if (v == null) return; o[k] = v; size += v.length; });
    if (size > MAXV && o['realm-cert-photos']) { size -= o['realm-cert-photos'].length; delete o['realm-cert-photos']; kept.push('photos'); }
    if (size > MAXV) Object.keys(o).forEach(function (k) { if (o[k].length > BIG) { try { var p = JSON.parse(o[k]), d = {}; var s2 = JSON.stringify(strip(p, d)); if (d.pic) { size -= o[k].length - s2.length; o[k] = s2; if (kept.indexOf('the aerial photo') < 0) kept.push('the aerial photo'); } } catch (e) {} } });
    if (size > MAXV) return { snap: null, kept: ['this job'] };
    return { snap: o, kept: kept };
  }
  A.uptoText = function () {
    var tab = String(ls.getItem('realm-tab') || ''), c = jget('realm-cert') || {}, n = (c.items || []).length;
    var pg = document.querySelector('.ip.active'); pg = pg ? pg.textContent.trim() : '';
    var t = /cert/i.test(tab) ? 'the certificate' + (pg ? ', ' + pg : '') : 'the plan';
    return t + (n ? ' \u00b7 ' + n + ' anchor' + (n === 1 ? '' : 's') + ' entered' : '');
  };
  function devName() { var d = ls.getItem('realm_sync_dev') || ''; return /^phone/.test(d) ? 'phone' : (d ? 'computer' : 'this device'); }
  A.rec = function (id) { var r = jget(PFX + id); return r && typeof r === 'object' ? r : null; };
  A.jobs = function () { var out = []; for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (k && k.indexOf(PFX) === 0) { var r = jget(k); if (r && r.address) { r.id = k.slice(PFX.length); out.push(r); } } } return out.sort(function (a, b) { return (b.at || 0) - (a.at || 0); }); };
  A.current = function () { var a = A.address(); return a ? A.slug(a) : ''; };
  var loadedAt = 0;
  A.write = function (id, patch) { /* merge-friendly: one object per job, fields at the top level */
    var r = A.rec(id) || { v: 1 }; Object.keys(patch).forEach(function (k) { r[k] = patch[k]; }); r.at = Date.now(); r.dev = devName();
    try { ls.setItem(PFX + id, JSON.stringify(r)); return true; } catch (e) { A.say('This device is full, so the job wasn\u2019t saved here. Nothing was lost on your other screens.'); return false; }
  };
  var lastSnap = '', lastKept = [], BASEK = 'anchor.base_v1'; /* this device's last agreed copy of each job (not synced) */
  var KEPTK = 'anchor.kept_v1'; /* per job: the other screen's copy he turned down with "Keep the one on this screen" (not synced) */
  function hash(s) { s = String(s || ''); var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return s.length + ':' + h; }
  function bases() { var o = jget(BASEK); return o && typeof o === 'object' ? o : {}; }
  A.setBase = function (id, snapStr) { var o = bases(); o[id] = hash(snapStr); try { set0.call(ls, BASEK, JSON.stringify(o)); } catch (e) {} };
  function kept() { var o = jget(KEPTK); return o && typeof o === 'object' ? o : {}; }
  A.keptOver = function (id, snapStr) { var o = kept(); o[id] = hash(snapStr); try { set0.call(ls, KEPTK, JSON.stringify(o)); } catch (e) {} };
  function turnedDown(id, r) { return !!(r && r.snap && kept()[id] === hash(JSON.stringify(r.snap))); }
  var force = {};
  A.capture = function (forceId) {
    if (forceId) force[forceId] = 1;
    if (J.busy) return;
    var addr = A.address(); if (!addr) { paintStatus(); return; }
    var id = A.slug(addr); if (!id) return;
    var s = snapNow(), cur = A.rec(id) || {};
    var data = JSON.stringify(s.snap), c = jget('realm-cert') || {}, st = jget('realm-stamper') || {};
    var up = A.uptoText();
    if (!force[id] && data === lastSnap && cur.uptoText === up && cur.address) { paintStatus(); return; }
    var remote = cur.snap ? JSON.stringify(cur.snap) : '', base = bases()[id];
    if (!force[id] && remote && remote === data && cur.uptoText === up && cur.address === addr) { lastSnap = data; A.setBase(id, data); paintStatus(); return; }
    if (remote && remote !== data && hash(remote) !== base && !force[id]) { /* another screen changed this job since this device last had it: never write over it */
      if (turnedDown(id, cur)) force[id] = 1; /* he already kept this screen's copy over that one: no banner again */
      else { lastSnap = data; showNewer(cur, hash(data) !== base && !!base); paintStatus(); return; } }
    var forced = !!force[id]; delete force[id];
    lastSnap = data; lastKept = s.kept; A.setBase(id, data);
    var patch = { address: addr, client: field('client') || st.client || c.client || '', due: field('due') || st.due || c.due || '', date: field('date') || st.date || c.date || '', ref: field('jobref') || st.jobref || '', uptoText: up, kept: s.kept };
    if (s.snap) patch.snap = s.snap;
    A.write(id, patch); loadedAt = Date.now(); paintStatus(); drawJobs();
    if (forced && window.RealmSync) { try { RealmSync.syncNow(true); } catch (e) {} } /* the kept copy goes to the other screens now */
  };
  var ct = 0; A.later = function (ms) { clearTimeout(ct); ct = setTimeout(A.capture, ms == null ? 1500 : ms); };
  /* every save the page makes to the job's own keys is followed by a save of the job copy */
  var SP = Storage.prototype, set0 = SP.setItem;
  SP.setItem = function (k, v) { var r = set0.apply(this, arguments); try { k = String(k); if (this === ls && (J.keys.indexOf(k) >= 0 || k.indexOf(LIVE) === 0)) A.later(); } catch (e) {} return r; };
  document.addEventListener('input', function (e) { if (e.target && /^(site|client|date|due|jobref)$/.test(e.target.id)) A.later(); }, true);
  addEventListener('pagehide', function () { try { A.capture(); } catch (e) {} });

  /* ---- "Kept on this phone only" is gone: the Pick up list syncs too ---- */
  try { if (window.Resume && Resume.setSync) Resume.setSync({ push: function (snap) { try { if (snap && Array.isArray(snap.tasks)) snap.tasks = snap.tasks.filter(function (t) { return t && t.app === 'anchor'; }); ls.setItem('realm_anchor_resume', JSON.stringify(snap)); } catch (e) {} return Promise.resolve(); }, pull: function () { return Promise.resolve(jget('realm_anchor_resume')); } }); } catch (e) {}

  /* ---- Your jobs (every screen) ---- */
  A.css('anJobsCss', '#anJobs{box-sizing:border-box;margin:8px 10px;padding:10px 12px;border:1px solid #1f2937;border-radius:14px;background:#050706;color:#e5e5e5;font:14px/1.4 system-ui,-apple-system,Roboto,sans-serif;max-width:100%}'
    + '#anJobs *{box-sizing:border-box}#anJobs summary{min-height:44px;display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:800;letter-spacing:.06em;text-transform:uppercase;font-size:13px;color:#86efac;list-style:none}#anJobs summary::-webkit-details-marker{display:none}'
    + '#anJobs .an-st{font-size:12px;color:#a3a3a3;margin:2px 0 6px}#anJobs .an-st.an-warn{color:#fbbf24}#anJobs ul{list-style:none;margin:0;padding:0}#anJobs li{border-top:1px solid #1f2937;padding:8px 0}'
    + '#anJobs .an-t{font-weight:700;overflow-wrap:anywhere}#anJobs .an-m{font-size:12px;color:#a3a3a3;overflow-wrap:anywhere}#anJobs .an-a{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}'
    + '.an-b{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:0 12px;border-radius:12px;border:1px solid #334155;background:#0a0a0a;color:#e5e5e5;font:700 14px/1.1 system-ui,sans-serif;cursor:pointer;text-decoration:none;text-align:center}'
    + '.an-b.an-p{border-color:#22c55e;color:#86efac}.an-b:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}.an-b[disabled]{opacity:.5;cursor:default}'
    + '#anNewer{box-sizing:border-box;margin:8px 10px;padding:10px 12px;border:1px solid #f59e0b;border-radius:14px;background:#1c1405;color:#fde68a;font:14px/1.4 system-ui,sans-serif}#anNewer[hidden]{display:none}#anSay{color:#fbbf24;font-size:13px}#anSay:empty{display:none}');
  var box = A.el('details', { id: 'anJobs', open: '' }), newer = A.el('div', { id: 'anNewer', role: 'status', hidden: '' });
  box.innerHTML = '<summary>Your jobs \u00b7 every screen</summary><div class="an-st" id="anSyncSt" role="status"></div><div id="anSay" role="status"></div><ul id="anJobList"></ul>';
  var host = $('csAcct') || $('csBar');
  function mount() { var h = $('csAcct') || $('csBar'); if (!h || !h.parentNode) return false; if (box.parentNode) return true; h.parentNode.insertBefore(newer, h.nextSibling); h.parentNode.insertBefore(box, newer.nextSibling); return true; }
  if (!mount()) A.hooks.push(mount);
  A.box = box;
  A.say = function (t) { var s = $('anSay'); if (s) s.textContent = t || ''; };
  function ago(t) { if (!t) return ''; var d = new Date(t), p = {}; try { new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', weekday: 'short', hour: 'numeric', minute: '2-digit' }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; }); } catch (e) {}
    var same = new Date().toDateString() === d.toDateString(); return (same ? 'today' : (p.weekday || '')) + ' ' + (p.hour || d.getHours()) + ':' + (p.minute || ('0' + d.getMinutes()).slice(-2)) + (p.dayPeriod ? ' ' + p.dayPeriod.toLowerCase() : ''); }
  function paintStatus() {
    var el = $('anSyncSt'); if (!el) return;
    var RS = window.RealmSync, st = RS ? RS.status() : 'none', has = RS && RS.hasKey(), addr = A.address();
    var t = !addr ? 'Type the site address to save this job everywhere: the address is the job\u2019s key.'
      : !RS ? 'Saved on this device.' : !has ? 'Saved on this device. Why not on your other screens yet: this device needs the one-tap sync link from Ara, once.'
      : st === 'synced' ? '\u2713 Saved and on your other screens (info@ Drive store).'
      : st === 'offline' ? 'Saved on this device. Offline: it goes to your other screens when you\u2019re back online.'
      : st === 'syncing' ? 'Saved on this device \u00b7 sending to your other screens\u2026'
      : 'Saved on this device. Why not on your other screens yet: the sync store didn\u2019t answer. Tap the sync line just under this to try again.';
    el.textContent = t; el.className = 'an-st' + (st === 'synced' || !addr ? '' : ' an-warn');
  }
  A.paintStatus = paintStatus;
  function drawJobs() {
    var ul = $('anJobList'); if (!ul) return;
    var cur = A.current(), L = A.jobs();
    ul.innerHTML = L.length ? L.slice(0, 30).map(function (r) {
      var here = r.id === cur;
      return '<li data-id="' + esc(r.id) + '"><div class="an-t">' + esc(r.address) + (here ? ' <span style="color:#86efac">\u00b7 open now</span>' : '') + '</div>'
        + '<div class="an-m">' + esc(r.client || '') + (r.client ? ' \u00b7 ' : '') + 'up to ' + esc(r.uptoText || 'the plan') + ' \u00b7 left ' + esc(ago(r.at)) + ' on the ' + esc(r.dev || 'device') + '</div>'
        + (r.kept && r.kept.length ? '<div class="an-m">Stays on the device it was made on: ' + esc(r.kept.join(', ')) + ' (too big to send).</div>' : '')
        + '<div class="an-a">' + (here ? '' : '<button type="button" class="an-b an-p" data-act="open">Pick up this job</button>') + '<span class="an-ex"></span></div></li>';
    }).join('') : '<li class="an-m">No jobs saved yet. Type a site address and it saves here, and on your other screens.</li>';
    A.hooks.forEach(function (f) { if (f.jobs) try { f(); } catch (e) {} });
  }
  A.drawJobs = drawJobs;
  /* open a job: into this tab if it's the same job or an empty one, otherwise into a new tab of its own (the open job is kept) */
  A.open = function (id) {
    if (!A.rec(id)) { A.say('That job isn\u2019t on this device yet. Why not: it hasn\u2019t synced here. Tap the sync line above, then try again.'); return false; }
    A.capture();
    try { sessionStorage.setItem('anchor-load', id); } catch (e) {}
    var cur = A.current();
    if (!cur || cur === id) { location.replace(location.pathname); return true; }
    J.switchTo('new'); return true;
  };
  box.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-act]'); if (!b) return; var li = b.closest('li'); if (b.getAttribute('data-act') === 'open') A.open(li.getAttribute('data-id')); });
  function showNewer(r, both) {
    newer.innerHTML = (both ? 'This job was also changed on your ' : 'A newer copy of this job came from your ') + esc(r.dev || 'other screen') + ' (' + esc(ago(r.at)) + ', up to ' + esc(r.uptoText || 'the plan') + ').'
      + (both ? ' Both copies are kept until you pick one.' : '') + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"><button type="button" class="an-b an-p" data-act="load">Load that copy</button><button type="button" class="an-b" data-act="keep">Keep the one on this screen</button></div>';
    newer.hidden = false;
  }
  A.showNewer = showNewer;
  newer.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-act]'); if (!b) return; var id = A.current();
    if (b.getAttribute('data-act') === 'load') { var r = A.rec(id); if (r && r.snap) A.setBase(id, JSON.stringify(r.snap)); try { sessionStorage.setItem('anchor-load', id); } catch (x) {} location.replace(location.pathname); }
    else { var rk = A.rec(id); if (rk && rk.snap) A.keptOver(id, JSON.stringify(rk.snap)); newer.hidden = true; A.capture(id);
      A.say('Kept the one on this screen. It is now the saved copy, on your other screens too.'); } });
  if (window.RealmSync) {
    RealmSync.onStatus(paintStatus);
    RealmSync.onChange(function (d) {
      var cur = A.current(), mine = cur && (d.keys || []).indexOf(PFX + cur) >= 0;
      drawJobs();
      if (mine) { var r = A.rec(cur); if (r && r.snap && JSON.stringify(r.snap) !== lastSnap) { if (turnedDown(cur, r)) A.capture(cur); else showNewer(r, false); } }
      return true; /* never reload under his fingers */
    });
  }
  try { var EL0 = window.AnchorEarly && AnchorEarly.loaded, R0 = EL0 && A.rec(EL0.id); if (R0 && R0.snap) A.setBase(EL0.id, JSON.stringify(R0.snap)); } catch (e) {}
  try { var EL = window.AnchorEarly && AnchorEarly.loaded; if (EL) setTimeout(function () { A.say('Picked up ' + EL.address + ', where you left it.'); }, 50); } catch (e) {}
  setTimeout(function () { drawJobs(); paintStatus(); A.later(800); }, 400);
})();
