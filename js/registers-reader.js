/* Nova readers (1 Nov 2026, staged, held for Ange's word). Read-only.
   Shows, by address key, what the calendar says about an address and the newest cert on file, from two private info@
   Sheets (the Calendar Address Register and Certs by Address). The data is NEVER in this repo: it comes at run time
   from the Ara Engine ({"app":"registers","op":"read"}, same device token as js/realm-sync.js) and is kept on this
   device (localStorage 'realm_nova_registers_v1', not synced) so it still shows offline. That copy expires after 7 days.
   The status line gives the real reason when it can't update, each with a "Why not" line: not set up on this phone
   (no sync key), the key wasn't accepted, no signal, can't reach the Engine, the Engine update is waiting on Ange's OK
   (held, only when the Engine answers 'unknown app'), the Engine had a problem (any other error), or the Engine has it
   but the registers aren't linked yet. Engine answers are trimmed to the allow-list before use and before saving; a copy already on the phone is trimmed and saved again when it is loaded.
   Mount: <script src="js/registers-reader.js" data-mount="search|anchor" defer></script>
     search: a panel in Search Studio with its own address box. Only an EXACT address-key match (or a spelling the
       calendar saw for that same address, never across suburbs) shows its calendar and cert lines and the cert link.
       Near matches (other suburb, other number, close spelling, no suburb typed) show the address and a plain label
       only, e.g. "Different suburb, not this address": no cert link, no cert details, no calendar details.
     anchor: under the open job in Anchor Studio (anchor.html, Cert Studio's new name): the same exact-key lookup;
       newest cert for the address, or the "no cert file" flag. Never shows near matches.
   Address key rule (APP_NEEDS section 3): lowercase; & -> and; unit in its own field; drop vic/australia; postcode in its
   own field; street type shortened; key = "<no> <street>, <suburb>". Never shows titles, notes, file names, calendar
   names, free text, or any job, invoice, quote or PS number. Never writes anything off the device.
   Data shape: version 2 only (the Engine allow-list): address keys, YYYY-MM-DD dates, counts, Y/N flags, https Drive
   links. Anything else is ignored; a date that isn't YYYY-MM-DD is not shown. */
(function () {
  'use strict';
  if (window.RealmRegisters) return;
  var CUR = document.currentScript, MODE = (CUR && CUR.getAttribute('data-mount')) || '';
  var CK = 'realm_nova_registers_v1', MAXAGE = 7 * 24 * 3600 * 1000; /* the copy on this phone expires after 7 days */
  var TYPES = { street: 'st', st: 'st', road: 'rd', rd: 'rd', avenue: 'ave', av: 'ave', ave: 'ave', drive: 'dr', drv: 'dr', dr: 'dr',
    court: 'ct', crt: 'ct', ct: 'ct', crescent: 'cres', cres: 'cres', place: 'pl', pl: 'pl', parade: 'pde', pde: 'pde',
    highway: 'hwy', hwy: 'hwy', lane: 'ln', ln: 'ln', la: 'ln', terrace: 'tce', tce: 'tce', close: 'cl', cl: 'cl',
    grove: 'gr', grv: 'gr', gr: 'gr', circuit: 'cct', cct: 'cct', boulevard: 'bvd', blvd: 'bvd', bvd: 'bvd',
    esplanade: 'esp', esp: 'esp', square: 'sq', sq: 'sq', parkway: 'pkwy', pkwy: 'pkwy', way: 'wy', wy: 'wy', heights: 'hts', hts: 'hts' };
  var DROP = { vic: 1, victoria: 1, australia: 1, nsw: 1, qld: 1, tas: 1, sa: 1, wa: 1, act: 1, nt: 1, au: 1 };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---- address key ---- */
  function parse(text) {
    var s = String(text || '').toLowerCase().replace(/&/g, ' and ').replace(/\./g, '').replace(/\s*,\s*/g, ' , ').replace(/\s+/g, ' ').trim();
    if (!s) return null;
    var unit = '', m = /^(?:unit|u|apt|flat|shop|suite|lvl|level)\s*(\d{1,4}[a-z]?)\s*,?\s*/.exec(s);
    if (m) { unit = m[1]; s = s.slice(m[0].length); }
    m = /^(\d{1,4}[a-z]?)\s*\/\s*(?=\d)/.exec(s); if (m) { unit = m[1]; s = s.slice(m[0].length); }
    s = s.replace(/(\d{1,5}[a-z]?)\s*[-\u2013]\s*(\d{1,5}[a-z]?)(?=\s[a-z])/g, '$1-$2');
    var t = s.split(' '), i, no = '', name = [], typ = '', sub = [], pc = '', end = 0;
    for (i = 0; i < t.length; i++) if (/^\d{1,5}[a-z]?(-\d{1,5}[a-z]?)?$/.test(t[i])) { no = t[i]; break; }
    if (!no) return null;
    for (i = i + 1; i < t.length; i++) {
      var w = t[i];
      if (w === ',') { if (name.length) break; continue; }
      if (name.length && TYPES[w]) { typ = TYPES[w]; i++; break; }
      if (!/^[a-z']+$/.test(w) || name.length >= 5) break;
      name.push(w);
    }
    if (!name.length) return null;
    for (; i < t.length; i++) {
      var x = t[i];
      if (x === ',') { if (sub.length) break; continue; }
      if (/^\d{4}$/.test(x)) { pc = x; break; }
      if (DROP[x]) { end = 1; continue; } /* vic / australia: dropped; a postcode may still follow */
      if (end || !/^[a-z']+$/.test(x) || sub.length >= 3) break;
      sub.push(x);
    }
    var street = name.join(' ') + (typ ? ' ' + typ : '');
    return { unit: unit, no: no, street: street, suburb: sub.join(' '), postcode: pc, key: no + ' ' + street + (sub.length ? ', ' + sub.join(' ') : '') };
  }
  function keyOf(text) { var a = parse(text); return a ? a.key : ''; }
  function nosub(k) { return String(k || '').split(', ')[0]; }

  /* ---- data: Engine -> this device ---- */
  var state = { data: null, at: 0, live: false, why: '', dropped: '' }, fns = []; /* dropped: 'old' | 'shape' | 'future' */
  function loadCache() {
    try {
      var c = JSON.parse(localStorage.getItem(CK) || 'null'); if (!c) return;
      var age = Date.now() - (Number(c.at) || 0);
      var drop = !c.data || !okShape(c.data) ? 'shape' : age < -300000 ? 'future' : !(age <= MAXAGE) ? 'old' : '';
      if (drop) { localStorage.removeItem(CK); state.dropped = c.data ? drop : ''; return; }
      state.data = trim(c.data); state.at = Number(c.at);
      /* re-save the trimmed copy (same saved time, so the 7-day expiry is unchanged): nothing outside the allow-list stays on the phone */
      var t = JSON.stringify({ at: state.at, data: state.data }); if (t !== localStorage.getItem(CK)) { try { localStorage.setItem(CK, t); } catch (e) {} }
    } catch (e) {}
  }
  function expire() { /* a page left open past 7 days drops its copy too */
    if (state.data && !state.live && Date.now() - state.at > MAXAGE) { state.data = null; state.at = 0; state.dropped = 'old'; idx = null; try { localStorage.removeItem(CK); } catch (e) {} }
  }
  /* a real calendar date only: YYYY-MM-DD that survives a round trip through Date in UTC (no 2026-13-45, no 2026-02-30) */
  function realDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === 'string' ? s : ''); if (!m) return '';
    var y = +m[1], mo = +m[2], d = +m[3], t = new Date(Date.UTC(y, mo - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? s : '';
  }
  /* trim an Engine answer to the allow-list before it is used or kept on the phone */
  var FIELDS = {
    cal: { key: 'key', alts: 'keys', n: 'count', first: 'date', last_wk: 'date', next: 'date', in_sot: 'yn' },
    newest: { key: 'key', url: 'drive', works: 'date', modified: 'date', files: 'count', due: 'date', in_sot: 'yn' },
    none: { key: 'key', visits: 'count', first: 'date', last: 'date', near: 'yn', emailed: 'yn' }
  };
  function okKey(k) { return typeof k === 'string' && k.length <= 120 && /^[a-z0-9][a-z0-9 ,'\/-]*$/.test(k) ? k : ''; }
  function trimRows(rows, spec) {
    var out = [];
    (rows || []).forEach(function (r) {
      if (!r || typeof r !== 'object') return; var o = {};
      Object.keys(spec).forEach(function (f) {
        var t = spec[f], v = r[f];
        o[f] = t === 'key' ? okKey(v) : t === 'keys' ? (Array.isArray(v) ? v : []).map(okKey).filter(Boolean).slice(0, 6)
          : t === 'count' ? Math.max(0, Math.min(99999, Math.floor(Number(v) || 0))) : t === 'date' ? realDate(v)
          : t === 'yn' ? (v === 'Y' || v === 'N' ? v : '') : /^https:\/\/(drive|docs)\.google\.com\//.test(typeof v === 'string' ? v : '') ? v : '';
      });
      if (o.key) out.push(o);
    });
    return out;
  }
  function trim(j) {
    return { ok: true, schema: 'realm.nova_registers', version: 2, built: realDate(j.built), calendar: { rows: trimRows(j.calendar.rows, FIELDS.cal) },
      certs: { newest: trimRows(j.certs.newest, FIELDS.newest), no_cert: trimRows(j.certs.no_cert, FIELDS.none) } };
  }
  function okShape(j) { return j && j.ok && j.schema === 'realm.nova_registers' && j.version === 2 && j.calendar && Array.isArray(j.calendar.rows) && j.certs && Array.isArray(j.certs.newest) && Array.isArray(j.certs.no_cert); }
  var idx = null;
  function sub(k) { var i = String(k || '').indexOf(', '); return i < 0 ? '' : String(k).slice(i + 2); }
  function index() {
    if (idx && idx.d === state.data) return idx;
    var d = state.data, I = { d: d, cal: {}, alias: {}, cert: {}, none: {}, all: {} };
    if (d) {
      d.calendar.rows.forEach(function (r) {
        if (!r || !r.key) return; I.cal[r.key] = r; I.all[r.key] = 1;
        /* a spelling the calendar saw counts as this address only inside the same suburb */
        (r.alts || []).forEach(function (a) { if (a && a !== r.key && sub(a) === sub(r.key) && !I.alias[a]) I.alias[a] = r.key; });
      });
      d.certs.newest.forEach(function (r) { if (r && r.key) { I.cert[r.key] = r; I.all[r.key] = 1; } });
      d.certs.no_cert.forEach(function (r) { if (r && r.key) { I.none[r.key] = r; I.all[r.key] = 1; } });
      I.parts = Object.keys(I.all).map(function (k) { var a = parse(k); return a ? { key: k, no: a.no, street: a.street, suburb: a.suburb } : null; }).filter(Boolean);
    }
    return (idx = I);
  }
  function lev(a, b) {
    if (a === b) return 0; if (Math.abs(a.length - b.length) > 2) return 9;
    var p = [], i, j; for (j = 0; j <= b.length; j++) p[j] = j;
    for (i = 1; i <= a.length; i++) { var q = [i]; for (j = 1; j <= b.length; j++) q[j] = Math.min(p[j] + 1, q[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = q; }
    return p[b.length];
  }
  function close(a, b) { return !!a && !!b && a !== b && (lev(a, b) <= 2 || (a.length >= 4 && b.indexOf(a) === 0)); }
  function refresh() {
    var RS = window.RealmSync;
    function not(why) { state.live = false; state.why = why; expire(); emit(); }
    if (!RS || !RS.call || !RS.hasKey || !RS.hasKey()) { not('nokey'); return Promise.resolve(); }
    if (navigator.onLine === false) { not('offline'); return Promise.resolve(); }
    return RS.call({ app: 'registers', op: 'read' }).then(function (j) {
      if (j && j.error === 'unauthorised') return not('badkey');
      if (j && j.error === 'not set up') return not('notset');
      if (j && j.error === 'unknown app') return not('engine'); /* only this answer means the Engine doesn't have the update yet */
      if (!okShape(j)) return not('problem'); /* any other error or a shape it doesn't know: neutral, nobody blamed */
      var t = trim(j); /* only allow-list fields are used or kept on the phone */
      state.data = t; state.at = Date.now(); state.live = true; state.why = ''; state.dropped = ''; idx = null;
      try { localStorage.setItem(CK, JSON.stringify({ at: state.at, data: t })); } catch (e) {}
      emit();
    }).catch(function (e) { not(e && e.net ? (navigator.onLine === false ? 'offline' : 'unreach') : e && /no key/.test(e.message) ? 'nokey' : 'problem'); });
  }
  function emit() { fns.forEach(function (f) { try { f(state); } catch (e) {} }); }

  /* exact key: the typed address key, or a calendar spelling of the same address in the same suburb. Never crosses suburbs. */
  function exactKey(a) {
    var I = index(); if (!a || !a.suburb) return '';
    if (I.all[a.key]) return a.key;
    var k = I.alias[a.key]; return k && sub(k) === a.suburb ? k : '';
  }
  /* lookup: [the exact match] if there is one. Otherwise near matches, each with a plain reason and NO data:
     near = 'suburb' (same number + street, other suburb), 'spelling' (close spelling of the suburb or street),
     'number' (same street + suburb, other number), 'nosuburb' (no suburb typed). */
  function lookup(text) {
    var I = index(), a = parse(text); if (!a || !state.data) return [];
    var k = exactKey(a);
    if (k) return [{ key: k, exact: true, cal: I.cal[k] || null, cert: I.cert[k] || null, noCert: I.none[k] || null }];
    var near = [];
    I.parts.forEach(function (p) {
      var why = '';
      if (p.no === a.no && p.street === a.street) why = !a.suburb ? 'nosuburb' : close(a.suburb, p.suburb) ? 'spelling' : 'suburb';
      else if (p.no === a.no && a.suburb && p.suburb === a.suburb && close(a.street, p.street)) why = 'spelling';
      else if (a.suburb && p.suburb === a.suburb && p.street === a.street) why = 'number';
      if (why) near.push({ key: p.key, exact: false, near: why });
    });
    var rank = { spelling: 0, nosuburb: 1, suburb: 2, number: 3 };
    return near.sort(function (x, y) { return rank[x.near] - rank[y.near] || (x.key < y.key ? -1 : 1); }).slice(0, 8);
  }
  var NEAR = {
    suburb: 'Different suburb, not this address. No cert shown.',
    spelling: 'Close spelling, not confirmed as this address. Check the spelling and search again to see its cert.',
    number: 'Different street number, not this address. No cert shown.',
    nosuburb: 'No suburb typed, so not confirmed as this address. Add the suburb to see its cert.'
  };

  /* ---- plain words ---- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function day(s) { var d = realDate(s); return d ? +d.slice(8) + ' ' + MON[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4) : ''; }
  function title(k) { return String(k).replace(/\b([a-z])/g, function (c) { return c.toUpperCase(); }); }
  /* status: [main line, why-not line]. The main line says the real reason; the why-not line says why and what fixes it. */
  var WHY = {
    nokey: ['Not set up on this phone yet.', 'Why not: this phone has no sync key, so it can\u2019t ask the Engine. Set up sync on this phone once and this fills in.'],
    badkey: ['This phone\u2019s sync key wasn\u2019t accepted.', 'Why not: the Engine turned the key down. Set up sync on this phone again.'],
    offline: ['No signal.', 'Why not: the registers need a signal to update. It tries again when the signal is back.'],
    unreach: ['Can\u2019t reach the Engine right now.', 'Why not: the Engine didn\u2019t answer. It tries again next time this page opens.'],
    engine: ['Waiting on Ange\u2019s OK for the Engine update.', 'Why not: the Engine part that sends the registers is held until Ange says yes. Nothing is wrong with this phone.'],
    problem: ['The Engine had a problem.', 'Why not: the Engine answered but couldn\u2019t send the registers. It tries again next time this page opens; nothing to do on this phone.'],
    notset: ['The Engine has the update, but the registers aren\u2019t linked yet.', 'Why not: the two register Sheets still need linking in the Engine (a one-off step for Ange).']
  };
  var DROPPED = {
    old: 'The copy kept on this phone was over 7 days old, so it was cleared.',
    shape: 'The copy kept on this phone was in an old format, so it was cleared.',
    future: 'The copy kept on this phone had a date in the future, so it was cleared.'
  };
  function when(t) { return new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }); }
  function status() {
    if (state.live) return ['From the calendar and cert registers \u00b7 updated ' + new Date(state.at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }), ''];
    var w = WHY[state.why];
    if (!w) return ['Checking for the calendar and cert registers\u2026', ''];
    var kept = state.data ? ' Showing the copy kept on this phone from ' + when(state.at) + '.'
      : DROPPED[state.dropped] ? ' ' + DROPPED[state.dropped] : '';
    return [w[0] + kept, w[1]];
  }
  function statusLine() { return status()[0]; }
  function statusHtml() { var s = status(); return '<div class="rr-st' + (state.live ? ' rr-live' : '') + '">' + esc(s[0]) + '</div>' + (s[1] ? '<div class="rr-why">' + esc(s[1]) + '</div>' : ''); }
  function certLine(r) {
    if (r.cert) {
      var c = r.cert, url = /^https:\/\/(drive|docs)\.google\.com\//.test(c.url || '') ? c.url : '';
      var when = day(c.works) ? 'works dated ' + day(c.works) : day(c.modified) ? 'saved ' + day(c.modified) : '';
      return '<div class="rr-l rr-ok">' + esc('Newest cert on file' + (when ? ': ' + when : '') + (day(c.due) ? ' \u00b7 next due ' + day(c.due) : '')) + '</div>'
        + (url ? '<a class="rr-btn" href="' + esc(url) + '" target="_blank" rel="noopener">Open newest cert</a>' : '');
    }
    if (r.noCert) {
      var x = r.noCert;
      return '<div class="rr-l rr-warn">No cert file found for the Anchor visit' + (x.visits > 1 ? 's' : '') + ' on ' + esc(day(x.last) || day(x.first))
        + (x.emailed === 'Y' ? ' \u00b7 a cert email did go out' : ' \u00b7 no cert email found') + (x.near === 'Y' ? ' \u00b7 a cert for a similar address exists' : '') + '</div>';
    }
    return '<div class="rr-l rr-dim">No cert on file for this address.</div>';
  }
  function calLine(r) {
    var c = r.cal; if (!c) return '<div class="rr-l rr-dim">No calendar entry since June 2026.</div>';
    var n = Math.max(0, Math.floor(Number(c.n) || 0)), bits = [n + ' calendar ' + (n === 1 ? 'entry' : 'entries')];
    if (c.last_wk) bits.push('last done ' + day(c.last_wk)); if (c.next) bits.push('next ' + day(c.next));
    return '<div class="rr-l">' + esc(bits.join(' \u00b7 ')) + '</div>'
      + (c.in_sot === 'N' ? '<div class="rr-l rr-warn">Not in the job list yet</div>' : '');
  }
  /* near matches get the address and the plain label only: never a cert link, cert details or calendar details */
  function card(r) {
    if (!r.exact) return '<div class="rr-card rr-near"><div class="rr-k">' + esc(title(r.key)) + '</div><div class="rr-l rr-warn">' + esc(NEAR[r.near] || NEAR.suburb) + '</div></div>';
    return '<div class="rr-card"><div class="rr-k">' + esc(title(r.key)) + '</div>' + calLine(r) + certLine(r) + '</div>';
  }
  function css() {
    if (document.getElementById('rrCss')) return; var s = document.createElement('style'); s.id = 'rrCss';
    s.textContent = '.rr{margin:10px 0;padding:10px 12px;border:1px solid #334155;border-radius:14px;background:rgba(15,23,42,.6);font:13px/1.4 system-ui,sans-serif;color:#cbd5e1;overflow-wrap:anywhere}'
      + '.rr h2{font-size:15px;margin:0 0 6px;color:#e5e5e5}.rr-row{display:flex;gap:8px;flex-wrap:wrap}'
      + '.rr input{flex:1 1 200px;min-width:0;min-height:44px;box-sizing:border-box;padding:8px 12px;border-radius:12px;border:1px solid #475569;background:#0b1220;color:#f1f5f9;font:inherit;font-size:16px}'
      + '.rr button,.rr-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:6px 14px;border-radius:12px;border:1px solid #475569;background:#111827;color:#e5e7eb;font:600 14px system-ui,sans-serif;text-decoration:none;box-sizing:border-box;cursor:pointer;margin-top:4px}'
      + '.rr-st{font-size:12px;color:#fcd34d;margin:6px 0}.rr-st.rr-live{color:#86efac}.rr-why{font-size:12px;color:#94a3b8;margin:-2px 0 6px}.rr-card{border-top:1px solid #1f2937;padding:8px 0}.rr-k{font-weight:700;color:#f1f5f9}'
      + '.rr-l{margin:2px 0}.rr-ok{color:#86efac}.rr-warn{color:#fbbf24}.rr-dim{color:#94a3b8}';
    document.head.appendChild(s);
  }

  /* ---- Search Studio panel ---- */
  function mountSearch() {
    css();
    var host = document.querySelector('main') || document.body, sec = document.createElement('section');
    sec.className = 'rr'; sec.id = 'rrSearch'; sec.setAttribute('aria-label', 'Calendar and certs by address');
    sec.innerHTML = '<h2>Calendar and certs by address</h2><form class="rr-row" id="rrForm" autocomplete="off"><input id="rrQ" type="search" enterkeyhint="search" placeholder="Address, e.g. 12 Smith St, Suburb" aria-label="Address"><button type="submit">Find</button></form>'
      + '<div id="rrSt" role="status" aria-live="polite"></div><div id="rrOut"></div>';
    var before = document.getElementById('weeks'); if (before && before.parentNode === host) host.insertBefore(sec, before); else host.insertBefore(sec, host.firstChild);
    var q = sec.querySelector('#rrQ'), out = sec.querySelector('#rrOut'), st = sec.querySelector('#rrSt');
    function show() {
      expire(); st.innerHTML = statusHtml();
      var v = q.value.trim(); if (!v) { out.innerHTML = ''; return; }
      if (!state.data) { out.innerHTML = ''; return; }
      if (!parse(v)) { out.innerHTML = '<div class="rr-l rr-dim">Type a street number and street, e.g. 12 Smith St.</div>'; return; }
      var res = lookup(v); out.innerHTML = res.length ? res.map(card).join('') : '<div class="rr-l rr-dim">No calendar entry or cert for ' + esc(title(keyOf(v))) + '.</div>';
    }
    sec.querySelector('#rrForm').addEventListener('submit', function (e) { e.preventDefault(); show(); });
    var tq = 0; q.addEventListener('input', function () { clearTimeout(tq); tq = setTimeout(show, 250); });
    fns.push(show); show();
  }

  /* ---- Anchor Studio (anchor.html, Cert Studio's new name): under the open job, exact key only ---- */
  function mountAnchor() {
    css();
    var box = null;
    function place() {
      if (box && box.isConnected) return box;
      var say = document.getElementById('anSotOpen') || document.getElementById('anSay'), site = document.getElementById('site');
      var at = say || (site && site.parentNode); if (!at || !at.parentNode) return null;
      box = document.createElement('div'); box.className = 'rr'; box.id = 'rrAnchor'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
      at.parentNode.insertBefore(box, at.nextSibling); return box;
    }
    function addr() { var A = window.AnchorStudio; if (A && A.address) { try { return A.address(); } catch (e) {} } var s = document.getElementById('site'); return s ? s.value.trim() : ''; }
    function show() {
      var b = place(); if (!b) return;
      var a = addr(), html;
      if (!a) { b.hidden = true; b.innerHTML = ''; return; }
      b.hidden = false;
      expire();
      if (!state.data) html = statusHtml() + (state.why ? '<div class="rr-l rr-dim">The newest cert for this address shows here once it can update.</div>' : '');
      else {
        var p = parse(a), res = lookup(a).filter(function (r) { return r.exact; }); /* exact key or same-suburb spelling only */
        html = statusHtml()
          + (res.length ? card(res[0]) : '<div class="rr-l rr-dim">' + (!p ? 'Add the street number and street to see its cert.' : !p.suburb ? 'Add the suburb to see its cert.' : 'No calendar entry or cert for ' + esc(title(p.key)) + '.') + '</div>');
      }
      if (b.getAttribute('data-sig') !== html) { b.setAttribute('data-sig', html); b.innerHTML = html; }
    }
    var tq = 0; document.addEventListener('input', function (e) { if (e.target && e.target.id === 'site') { clearTimeout(tq); tq = setTimeout(show, 400); } }, true);
    var A = window.AnchorStudio; if (A && A.hooks) A.hooks.push(show);
    fns.push(show); show();
  }

  loadCache();
  window.RealmRegisters = { parse: parse, keyOf: keyOf, lookup: lookup, refresh: refresh, status: status, realDate: realDate, state: function () { return state; }, onUpdate: function (f) { fns.push(f); } };
  function start() {
    if (MODE === 'search') mountSearch(); else if (MODE === 'anchor') mountAnchor();
    setTimeout(refresh, 600);
    window.addEventListener('online', function () { refresh(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && (!state.live || Date.now() - state.at > 1800000)) refresh(); });
  }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
