/* Realm jobs file reader (30 Oct 2026). The jobs file (one row per job address, joined from the calendar, office records,
   Drive photos, Anchor Studio, emails, WhatsApp group names and Deputy refs) lives in localStorage 'realm_sot_jobs_v1'.
   js/realm-sync.js carries that key through info@'s private Drive store, so one load reaches every device.
   The file is NEVER in this repo or on the site: nothing here fetches it. Read-only: apps never write a row back.
   Format: /workspace/source_of_truth_1030/APP_NEEDS.md (schema realm.jobs_by_address, version 1). Extra fields are tolerated:
   address_variants are used for matching; a source with applies:false is left out; next_event.placeholder marks a not-booked entry.
   Hidden fallback: a 'Load jobs file' button that only shows when the page is opened with #jobsfile. Never shown by default.
   If a loaded file is too big for the sync (1,000,000 characters per key; this keeps under 900,000), the loader keeps
   jobs coming up plus anything from the last 90 days, and says so in plain words in the file's trim_note. */
(function () {
  'use strict';
  if (window.RealmJobs) return;
  var KEY = 'realm_sot_jobs_v1', SCHEMA = 'realm.jobs_by_address', VERSION = 1, CAP = 900000, DAY = 86400000;
  var SRC = ['calendar', 'invoices', 'drive_photos', 'anchor_search', 'emails', 'whatsapp_groups', 'deputy'];
  var NAME = { calendar: 'Calendar', drive_photos: 'Photos', anchor_search: 'Anchor Studio', emails: 'Emails', whatsapp_groups: 'WhatsApp', deputy: 'Deputy' };
  var MSG = {
    miss: 'This address isn\u2019t in the jobs file yet.',
    missTrim: 'This address isn\u2019t in the jobs file on this device (the file was trimmed to fit the sync).',
    none: 'No jobs file loaded on this device.',
    bad: 'The jobs file on this device can\u2019t be read, so job links aren\u2019t shown.',
    newer: 'This jobs file is newer than this app.'
  };
  var TYPE = { street: 'st', st: 'st', road: 'rd', rd: 'rd', avenue: 'ave', av: 'ave', ave: 'ave', drive: 'dr', drv: 'dr', dr: 'dr',
    court: 'ct', crt: 'ct', ct: 'ct', crescent: 'cres', cres: 'cres', place: 'pl', pl: 'pl', parade: 'pde', pde: 'pde',
    highway: 'hwy', hwy: 'hwy', lane: 'ln', ln: 'ln', terrace: 'tce', tce: 'tce', close: 'cl', cl: 'cl', grove: 'gr', grv: 'gr', gr: 'gr',
    circuit: 'cct', cct: 'cct', boulevard: 'bvd', blvd: 'bvd', bvd: 'bvd', esplanade: 'esp', esp: 'esp', square: 'sq', sq: 'sq',
    parkway: 'pkwy', pkwy: 'pkwy', way: 'wy', wy: 'wy', heights: 'hts', hts: 'hts' };
  var STATE = { vic: 1, victoria: 1, australia: 1 };

  /* address -> parts and key (APP_NEEDS section 3). Returns null when no street address is found. */
  function parse(addr) {
    var s = String(addr || '').toLowerCase().replace(/&/g, ' and ').replace(/\./g, '').replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim();
    if (!s) return null;
    var unit = null, m;
    m = /^(?:unit|u|apt|flat|shop|suite|lvl|level)\s*(\d{1,4}[a-z]?)\s*,?\s*(?=\d)/.exec(s); if (m) { unit = m[1]; s = s.slice(m[0].length); }
    if (!unit) { m = /^(\d{1,4}[a-z]?)\s*\/\s*(?=\d)/.exec(s); if (m) { unit = m[1]; s = s.slice(m[0].length); } }
    var parts = s.split(', ').map(function (p) { return p.trim(); }).filter(Boolean), postcode = null;
    parts = parts.map(function (p) {
      var pc = /(?:^|\s)(\d{4})$/.exec(p); if (pc && p.split(' ').length > 1) { postcode = postcode || pc[1]; p = p.slice(0, pc.index).trim(); }
      var ws = p.split(' '); while (ws.length && STATE[ws[ws.length - 1]]) ws.pop(); /* only a trailing state word is dropped, so a street that shares the state's name keeps it */
      return ws.join(' ');
    }).filter(Boolean);
    if (!parts.length) return null;
    var w = parts[0].split(' ');
    if (!/^\d{1,5}[a-z]?(?:-\d{1,5}[a-z]?)?$/.test(w[0])) return null;
    var no = w[0], ti = -1;
    for (var i = 2; i < w.length; i++) { if (TYPE[w[i]] && !(w[i] === 'st' && i + 1 < w.length && TYPE[w[i + 1]] === undefined && i + 2 < w.length && TYPE[w[i + 2]])) { ti = i; break; } }
    if (ti < 0) return null;
    var street = w.slice(1, ti).concat([TYPE[w[ti]]]).join(' ');
    var rest = w.slice(ti + 1).join(' ');
    var suburb = rest || (parts[1] || '');
    suburb = suburb.replace(/\s+/g, ' ').trim() || null;
    var base = no + ' ' + street;
    return { unit: unit, street_no: no, street: street, suburb: suburb, postcode: postcode,
      key: suburb ? base + ', ' + suburb : base, unitKey: unit ? unit + '/' + (suburb ? base + ', ' + suburb : base) : null, base: base };
  }

  /* ---- read and check the file ---- */
  var cache = { raw: undefined, res: null }; /* undefined = not read yet (null means no file) */
  function check(o) {
    if (!o || typeof o !== 'object' || o.schema !== SCHEMA || typeof o.version !== 'number') return 'bad';
    if (o.version > VERSION) return 'newer';
    if (!Array.isArray(o.rows) || o.row_count !== o.rows.length) return 'bad';
    for (var i = 0; i < o.rows.length; i++) { var r = o.rows[i]; if (!r || typeof r.key !== 'string' || !r.key || !r.links || typeof r.links !== 'object') return 'bad'; }
    return 'ok';
  }
  function read() {
    var raw = null; try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (raw === cache.raw && cache.res) return cache.res;
    var res;
    if (raw == null || raw === '') res = { state: 'none', msg: MSG.none, rows: [] };
    else {
      var o = null; try { o = JSON.parse(raw); } catch (e) {}
      var st = check(o);
      res = st === 'ok' ? { state: 'ok', msg: '', data: o, rows: o.rows } : { state: st, msg: MSG[st], rows: [] };
      if (st === 'ok') {
        var byKey = {}, bySlug = {};
        o.rows.forEach(function (r) { if (!byKey[r.key] || (byKey[r.key].unit && !r.unit)) byKey[r.key] = r; /* keys carry no unit: the building row wins a shared key */ var p = parse(r.address_display || ''); if (p && r.unit && p.unitKey) byKey[p.unitKey] = byKey[p.unitKey] || r; if (r.anchor_slug) bySlug[r.anchor_slug] = r; });
        /* address_variants (other spellings and single numbers folded into a strata range like 10-12): matched after the main keys */
        o.rows.forEach(function (r) { (Array.isArray(r.address_variants) ? r.address_variants : []).forEach(function (v) {
          if (typeof v !== 'string' || !v) return; if (!byKey[v]) byKey[v] = r; var p = parse(v); if (p) { if (!byKey[p.key]) byKey[p.key] = r; if (p.unitKey && !byKey[p.unitKey]) byKey[p.unitKey] = r; } }); });
        /* anchor_slug_aliases (older Anchor keys, when the file has them): after the main anchor_slug, never over it */
        o.rows.forEach(function (r) { (Array.isArray(r.anchor_slug_aliases) ? r.anchor_slug_aliases : []).forEach(function (v) { if (typeof v === 'string' && v && !bySlug[v]) bySlug[v] = r; }); });
        res.byKey = byKey; res.bySlug = bySlug;
      }
    }
    cache = { raw: raw, res: res };
    return res;
  }
  /* the row for a free-text address (calendar 'where'), or null */
  function find(addr) {
    var R = read(); if (R.state !== 'ok') return null;
    var p = parse(addr); if (!p) return null;
    var tries = [p.unitKey, p.key, p.unit ? p.unit + '/' + p.base : null, p.base];
    for (var i = 0; i < tries.length; i++) if (tries[i] && R.byKey[tries[i]]) return R.byKey[tries[i]];
    var sk = slugOf(addr); return (sk && R.bySlug[sk]) || null; /* last: an older Anchor key for the same job (anchor_slug_aliases) */
  }
  /* the same Anchor key rule as Anchor Studio (js/anchor.js A.slug), so Desk and Anchor agree on a job */
  function slugOf(addr) {
    var s = String(addr || '').toLowerCase().replace(/&/g, ' and ').replace(/\b(australia|victoria|vic)\b/g, ' ').replace(/\b3\d{3}\s*$/, ' ')
      .replace(/\bstreet\b/g, 'st').replace(/\broad\b/g, 'rd').replace(/\bavenue\b/g, 'ave').replace(/\bparade\b/g, 'pde').replace(/\bdrive\b/g, 'dr').replace(/\bcourt\b/g, 'ct').replace(/\bplace\b/g, 'pl').replace(/\bcrescent\b/g, 'cres').replace(/\bhighway\b/g, 'hwy')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return s.slice(0, 60).replace(/_+$/, '');
  }
  function bySlug(slug) { var R = read(); return R.state === 'ok' && slug ? (R.bySlug[slug] || null) : null; }
  /* one source's status: {src, name, status: linked|missing|no_access, why, items} */
  /* why lines: the join stores a short code that points into its top-level why_lookup (plain words, shown as written);
     older files carry the text inline. An unknown code is never shown as a bare code.
     A missing 'checked' means it was checked when the file was made (generated_at). */
  function whyOf(L, data) {
    var lk = data && data.why_lookup && typeof data.why_lookup === 'object' ? data.why_lookup : null;
    var code = L.why_code != null ? L.why_code : L.why;
    if (code == null || code === '' || typeof code === 'object') return '';
    if (lk && Object.prototype.hasOwnProperty.call(lk, String(code))) { var v = lk[String(code)]; return String(typeof v === 'string' ? v : (v && (v.text || v.why)) || ''); }
    if (/^[a-z]\d{1,3}$/.test(String(code))) return ''; /* an unknown code: never show a bare code */
    return L.why_code == null ? String(L.why) : '';
  }
  function link(row, src, data) {
    var L = row && row.links && row.links[src] || {}, s = L.status;
    if (data === undefined) { var R = read(); data = R.state === 'ok' ? R.data : null; }
    var why = whyOf(L, data), checked = L.checked || (data && data.generated_at) || '';
    if (L.applies === false) return { src: src, name: NAME[src], status: 'na', why: why, checked: checked, items: [] }; /* doesn't apply to this job (e.g. not an anchor job) */
    if (s !== 'linked' && s !== 'missing' && s !== 'no_access') s = 'no_access';
    return { src: src, name: NAME[src], status: s, why: why || (s === 'no_access' ? 'not checked' : ''), checked: checked, items: Array.isArray(L.items) ? L.items : [] };
  }

  /* ---- trim to fit the sync: jobs coming up, plus anything from the last 90 days ---- */
  function t(s) { var v = Date.parse(s || ''); return isNaN(v) ? 0 : v; }
  function lastAct(r) {
    var x = Math.max(t(r.next_event && r.next_event.start), t(r.last_works_date));
    SRC.forEach(function (k) { var L = r.links && r.links[k]; (L && L.items || []).forEach(function (it) { x = Math.max(x, t(it && it.updated)); }); });
    return x;
  }
  function lastPast(r, now) { /* most recent past work: works date, the other recorded date, or a linked item's date (never a future entry) */
    var x = -Infinity, f = function (v) { var n = t(v); if (n <= now && n > x) x = n; };
    f(r.last_works_date); f(r.last_invoice_date);
    SRC.forEach(function (k) { var L = r.links && r.links[k]; (L && L.items || []).forEach(function (it) { f(it && it.updated); }); });
    return x;
  }
  function trim(o, now) {
    now = now || Date.now();
    var txt = JSON.stringify(o); if (txt.length <= CAP) return { data: o, text: txt, trimmed: false };
    var from = o.rows.length, cut = now - 90 * DAY, today = new Date(now); today.setHours(0, 0, 0, 0);
    var keep = o.rows.filter(function (r) {
      var ne = t(r.next_event && r.next_event.start), rd = t(r.recert_due);
      return ne >= today.getTime() || (rd >= today.getTime() && rd <= now + 90 * DAY) || lastAct(r) >= cut;
    });
    var note = 'Trimmed to fit the sync: kept ' + keep.length + ' of ' + from + ' addresses (jobs coming up, plus anything from the last 90 days).';
    var out = {}; Object.keys(o).forEach(function (k) { out[k] = o[k]; });
    out.rows = keep; out.row_count = keep.length; out.trim_note = note;
    out.trimmed = { from: from, kept: keep.length, rule: 'upcoming or last 90 days', at: new Date(now).toISOString() };
    txt = JSON.stringify(out);
    if (txt.length > CAP) { /* still too big: booked jobs coming up first (soonest first), then this week's placeholders and recerts due in 90 days,
                               then work from the last 90 days, then later placeholders (not booked); add rows in that order while they fit */
      var T0 = today.getTime(), rank = function (r) { var ne = t(r.next_event && r.next_event.start), rd = t(r.recert_due);
        if (ne >= T0 && !r.next_event.placeholder) return [0, ne]; if (ne >= T0 && ne < now + 7 * DAY) return [1, ne]; if (rd >= T0 && rd <= now + 90 * DAY) return [1, rd];
        var la = lastPast(r, now); if (la >= cut) return [2, -la]; return ne >= T0 ? [3, ne] : [4, -la]; };
      var order = keep.map(function (r, i) { return { r: r, i: i, k: rank(r), n: JSON.stringify(r).length + 1 }; })
        .sort(function (a, b) { return a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.i - b.i; });
      out.rows = []; out.trim_note = 'Trimmed to fit the sync: kept the ' + 999999 + ' most important of ' + from + ' addresses (booked jobs coming up first, then this week\u2019s placeholders and recerts due, then work from the last 90 days, then later placeholders; even jobs coming up plus the last 90 days was too big).';
      out.trimmed.rule = 'booked upcoming, then this week placeholders and recerts due, then last 90 days, then later placeholders'; out.trimmed.kept = 999999; out.row_count = 999999;
      var room = CAP - JSON.stringify(out).length, take = [];
      order.forEach(function (x) { if (x.n <= room) { take.push(x); room -= x.n; } });
      take.sort(function (a, b) { return a.i - b.i; }); keep = take.map(function (x) { return x.r; });
      out.rows = keep; out.row_count = keep.length; out.trimmed.kept = keep.length;
      out.trim_note = out.trim_note.replace('999999', String(keep.length)); txt = JSON.stringify(out);
    }
    return { data: out, text: txt, trimmed: true, note: out.trim_note };
  }
  /* store a file's text (hidden fallback loader). Returns {ok, msg} in plain words. */
  function store(text, now) {
    var o = null; try { o = JSON.parse(text); } catch (e) {}
    var st = check(o); if (st !== 'ok') return { ok: false, msg: st === 'newer' ? MSG.newer + ' Not loaded.' : 'That isn\u2019t a jobs file this app can read. Not loaded.' };
    var T = trim(o, now);
    try { localStorage.setItem(KEY, T.text); } catch (e) { return { ok: false, msg: 'This browser won\u2019t keep the jobs file (full or private mode). Not loaded.' }; }
    return { ok: true, trimmed: T.trimmed, msg: 'Jobs file loaded: ' + T.data.rows.length + ' addresses.' + (T.trimmed ? ' ' + T.note : '') };
  }
  function mountLoader(host) {
    if (typeof host === 'string') host = document.querySelector(host);
    if (!host) return;
    var want = /(^|[#&?])jobsfile(=1)?($|&)/.test((location.hash || '').slice(1)) || /(^|[?&])jobsfile=1($|&)/.test((location.search || '').slice(1));
    if (!want) { host.hidden = true; return; }
    host.hidden = false; host.textContent = '';
    var lab = document.createElement('label'); lab.className = 'sot-load'; lab.textContent = 'Load jobs file';
    lab.style.cssText = 'display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:12px;border:1px solid #334155;cursor:pointer;font:600 14px system-ui,sans-serif';
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.style.display = 'none'; lab.appendChild(inp);
    var say = document.createElement('div'); say.className = 'sot-load-msg'; say.setAttribute('role', 'status'); say.style.cssText = 'font-size:13px;margin-top:6px';
    inp.onchange = function () { var f = inp.files && inp.files[0]; if (!f) return; var fr = new FileReader();
      fr.onload = function () { var r = store(String(fr.result || '')); say.textContent = r.msg; fire(); };
      fr.onerror = function () { say.textContent = 'That file couldn\u2019t be read. Not loaded.'; }; fr.readAsText(f); };
    host.appendChild(lab); host.appendChild(say);
  }
  var fns = [];
  function fire() { cache.raw = undefined; fns.forEach(function (f) { try { f(); } catch (e) {} }); }
  window.addEventListener('storage', function (e) { if (!e || e.key === KEY || e.key == null) fire(); });
  /* the line shown when an address has no row; says so when the file on this device was trimmed to fit the sync */
  function missMsg() { var R = read(); return R.data && R.data.trimmed ? MSG.missTrim : MSG.miss; }
  window.RealmJobs = { KEY: KEY, missMsg: missMsg, CAP: CAP, SOURCES: SRC, NAME: NAME, MSG: MSG, parse: parse, read: read, find: find, bySlug: bySlug, link: link,
    trim: trim, store: store, whyOf: whyOf, mountLoader: mountLoader, onChange: function (f) { fns.push(f); } };
})();
