/* Anchor Studio: links from the jobs file (30 Oct 2026). Read-only.
   The jobs file (one row per job address) sits in localStorage 'realm_sot_jobs_v1'; the other Realm pages' sync
   (js/realm-sync.js) brings it to this device from info@'s Drive store. It is never in this repo and nothing here fetches it.
   Each job is matched on its Anchor key (anchor_slug = A.slug(address)), then any anchor_slug_aliases, then address_variants. "Your jobs" rows get a Linked line (photos, calendar,
   WhatsApp group names), and the open job gets its last result, recert due and last cert from the file (no job or quote numbers, and never an email subject).
   The calendar link opens the next visit (through next_event.ref), else the soonest entry coming up, else the latest past one. With no jobs file it shows nothing.
   It never writes the job record or any realm_anchor_job_* key. Format: APP_NEEDS.md (realm.jobs_by_address, version 1). */
(function () {
  'use strict';
  var KEY = 'realm_sot_jobs_v1', NAME = { calendar: 'Calendar', drive_photos: 'Photos', whatsapp_groups: 'WhatsApp' };
  var MSG = { bad: 'The jobs file on this device can\u2019t be read, so job links aren\u2019t shown.', newer: 'This jobs file is newer than this app.' };
  var cache = { raw: undefined, res: null };
  /* why lines: the join stores a short code that points into its top-level why_lookup (plain words, shown as written);
     older files carry the text inline. An unknown code is never shown as a bare code. */
  var WHY = null;
  function whyOf(L) {
    var code = L.why_code != null ? L.why_code : L.why; if (code == null || code === '' || typeof code === 'object') return '';
    if (WHY && Object.prototype.hasOwnProperty.call(WHY, String(code))) { var v = WHY[String(code)]; return String(typeof v === 'string' ? v : (v && (v.text || v.why)) || ''); }
    if (/^[a-z]\d{1,3}$/.test(String(code))) return ''; /* an unknown code: never show a bare code */
    return L.why_code == null ? String(L.why) : '';
  }
  function t(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime(); var v = Date.parse(s || ''); return isNaN(v) ? NaN : v; }
  /* the calendar entry to open: the next visit (next_event.ref names its item in the calendar list); without one, the soonest
     entry still to come, else the latest past one */
  function calUrl(row, items) {
    var c = items.filter(function (x) { return x && /^https:\/\//.test(x.url || ''); }), ne = row.next_event;
    if (ne && ne.ref != null) for (var i = 0; i < c.length; i++) if (c[i].ref === ne.ref) return c[i].url;
    if (ne && /^https:\/\//.test(ne.url || '')) return ne.url; /* older files */
    var d0 = new Date(); d0.setHours(0, 0, 0, 0); var now = d0.getTime(), up = null, past = null;
    c.forEach(function (x) { var v = t(x.updated); if (isNaN(v)) return; if (v >= now) { if (!up || v < up.t) up = { u: x.url, t: v }; } else if (!past || v > past.t) past = { u: x.url, t: v }; });
    return up ? up.u : past ? past.u : (c[0] ? c[0].url : '');
  }
  function read() {
    var raw = null; try { raw = localStorage.getItem(KEY); } catch (e) {}
    var sl = window.AnchorStudio && AnchorStudio.slug;
    if (raw === cache.raw && cache.sl === !!sl) return cache.res;
    var res = { state: 'none', bySlug: {} };
    if (raw) {
      var o = null; try { o = JSON.parse(raw); } catch (e) {}
      if (!o || o.schema !== 'realm.jobs_by_address' || typeof o.version !== 'number') res.state = 'bad';
      else if (o.version > 1) res.state = 'newer';
      else if (!Array.isArray(o.rows) || o.row_count !== o.rows.length) res.state = 'bad';
      else {
        res.state = 'ok'; res.trimmed = !!o.trimmed; WHY = o.why_lookup && typeof o.why_lookup === 'object' ? o.why_lookup : null; o.rows.forEach(function (r) { if (r && r.anchor_slug && r.links) res.bySlug[r.anchor_slug] = r; });
        /* address_variants: a job saved as "105 X St" still finds the strata row "105-113 X St"; never overrides a main slug */
        /* anchor_slug_aliases (when the file has them): older Anchor keys for the same job still find it; checked after the main keys, before address_variants */
        o.rows.forEach(function (r) { if (r && r.links && Array.isArray(r.anchor_slug_aliases)) r.anchor_slug_aliases.forEach(function (v) { if (typeof v !== 'string' || !v) return; if (!res.bySlug[v]) res.bySlug[v] = r; var k = sl && sl(v); if (k && !res.bySlug[k]) res.bySlug[k] = r; }); });
        if (sl) o.rows.forEach(function (r) { if (r && r.links && Array.isArray(r.address_variants)) r.address_variants.forEach(function (v) { var k = typeof v === 'string' && sl(v); if (k && !res.bySlug[k]) res.bySlug[k] = r; }); });
      }
    }
    cache = { raw: raw, res: res, sl: !!sl }; return res;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function link(row, k) {
    var L = row.links[k] || {}, s = L.status; if (s !== 'linked' && s !== 'missing') s = 'no_access';
    var items = Array.isArray(L.items) ? L.items : [], why = whyOf(L), n = NAME[k];
    if (s === 'linked') {
      if (k === 'whatsapp_groups') { var nm = items.map(function (x) { return x && (x.ref || x.label); }).filter(Boolean).join(', '); return '<span class="an-sot-ok">\u2713 ' + n + ' (read-only): ' + esc(nm || 'linked') + '</span>'; }
      var u = '';
      if (k === 'calendar') u = calUrl(row, items); else items.some(function (x) { if (x && /^https:\/\//.test(x.url || '')) { u = x.url; return true; } return false; });
      return u ? '<a class="an-sot-ok" href="' + esc(u) + '" target="_blank" rel="noopener">\u2713 ' + n + '</a>' : '<span class="an-sot-ok">\u2713 ' + n + '</span>';
    }
    return '<span class="' + (s === 'missing' ? 'an-sot-mi' : 'an-sot-na') + '">' + n + ': ' + (s === 'missing' ? 'missing' : 'no access') + (why ? ' \u00b7 ' + esc(why) : '') + '</span>';
  }
  /* last cert (APP_NEEDS_DELTA section 11): a https:// value is a link. A value starting with "held" shows one plain line
     ("held for Ange"), never the held text or last_cert_note. Any other value shows nothing. No non-https value is put in an href. */
  function certBit(row) {
    var u = row.last_cert_url, n = row.last_cert_note;
    if (typeof u !== 'string' || !u.trim()) return '';
    if (/^https:\/\//.test(u)) return '<a href="' + esc(u) + '" target="_blank" rel="noopener">Last cert</a>';
    /* 1 Nov: a held cert shows one plain line only. The held text and its note name files, list sections and other
     addresses, so neither is shown. Any other non-https value shows nothing. */
    if (/^\s*held\b/i.test(u)) return '<span class="an-held">Last cert: held for Ange. No cert link is shown until Ange says.</span>';
    return '';
  }
  function day(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return ''; return +m[3] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] + ' ' + m[1]; }
  function lineFor(row) { return '<div class="an-sot"><b>Linked</b> ' + ['drive_photos', 'calendar', 'whatsapp_groups'].map(function (k) { return link(row, k); }).join(' ') + '</div>'; }
  function css() {
    if (document.getElementById('anSotCss')) return; var s = document.createElement('style'); s.id = 'anSotCss';
    s.textContent = '.an-sot{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font:12px/1.35 system-ui,sans-serif;color:#a3a3a3;margin-top:6px;overflow-wrap:anywhere}.an-sot b{color:#e5e5e5;font-weight:700}'
      + '.an-sot a,.an-sot span{display:inline-flex;align-items:center;min-height:44px;padding:2px 10px;border-radius:10px;border:1px solid #334155;box-sizing:border-box;max-width:100%;text-decoration:none}'
      + '.an-sot-ok{color:#86efac!important;border-color:#166534!important}.an-sot-mi{color:#fbbf24!important;border-color:#92400e!important}.an-sot-na{color:#a3a3a3!important}'
      + '#anSotOpen{margin:2px 0 6px}#anSotOpen .an-m{font-size:12px;color:#a3a3a3;overflow-wrap:anywhere}#anSotOpen a{color:#86efac}';
    document.head.appendChild(s);
  }
  function paint() {
    var A = window.AnchorStudio; if (!A || !A.current) return;
    var ul = document.getElementById('anJobList'), say = document.getElementById('anSay'); if (!ul || !say) return;
    css();
    var R = read(), cur = A.current();
    [].forEach.call(ul.querySelectorAll('li[data-id]'), function (li) {
      var old = li.querySelector(':scope > .an-sot'), row = R.state === 'ok' && R.bySlug[li.getAttribute('data-id')];
      var want = row ? lineFor(row) : ''; if (old && old.getAttribute('data-sig') === want) return; /* unchanged: leave the DOM alone */
      if (old) old.remove(); if (!row) return;
      var a = li.querySelector(':scope > .an-a'), d = document.createElement('div'); d.innerHTML = want; var n = d.firstChild; n.setAttribute('data-sig', want);
      if (a) li.insertBefore(n, a); else li.appendChild(n);
    });
    var box = document.getElementById('anSotOpen');
    if (!box) { box = document.createElement('div'); box.id = 'anSotOpen'; box.setAttribute('role', 'status'); say.parentNode.insertBefore(box, say.nextSibling); }
    function put(h) { if (box.getAttribute('data-sig') !== h) { box.setAttribute('data-sig', h); box.innerHTML = h; } }
    if (!cur || R.state === 'none') { put(''); box.hidden = true; return; } /* no open job, or no jobs file: show nothing */
    box.hidden = false;
    if (R.state !== 'ok') { put('<div class="an-m">' + esc(MSG[R.state]) + '</div>'); return; }
    var row = R.bySlug[cur];
    if (!row) { put('<div class="an-m">' + (R.trimmed ? 'This address isn\u2019t in the jobs file on this device (the file was trimmed to fit the sync).' : 'This address isn\u2019t in the jobs file yet.') + '</div>'); return; }
    var bits = [row.last_result ? 'Last result ' + esc(row.last_result) + (row.last_works_date ? ' (' + esc(day(row.last_works_date)) + ')' : '') : '',
      row.recert_due ? 'Recert due ' + esc(day(row.recert_due)) + (/email/i.test(row.recert_due_source || '') ? ' (from email)' : '') : '', /* the source wording itself is never shown */
      certBit(row)].filter(Boolean);
    put('<div class="an-m">From the jobs file: ' + esc(row.address_display || row.key) + (bits.length ? ' \u00b7 ' + bits.join(' \u00b7 ') : '') + '</div>' + lineFor(row));
  }
  var q = 0; function soon() { clearTimeout(q); q = setTimeout(paint, 80); }
  function start() {
    var A = window.AnchorStudio; if (!A || !A.hooks) { if (start.n++ < 40) setTimeout(start, 250); return; }
    paint.jobs = true; A.hooks.push(paint); soon();
    window.addEventListener('storage', function (e) { if (!e || e.key === KEY || e.key == null) { cache.raw = undefined; soon(); } });
    document.addEventListener('input', function (e) { if (e.target && e.target.id === 'site') setTimeout(soon, 1700); }, true);
    if (window.RealmSync && RealmSync.onChange) RealmSync.onChange(function (d) { if (d && d.keys && d.keys.indexOf(KEY) >= 0) { cache.raw = undefined; soon(); } });
  }
  start.n = 0;
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
