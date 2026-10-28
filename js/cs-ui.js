/* Cert Studio, GitHub version: the jobs bar, Pick up where you left off, the account line, the WhatsApp and Google Drive buttons,
   and the Diary/Email/Drive fallback (29 Oct 2026). Loaded at the end of the page, after the page's own scripts. */
(function () {
  'use strict';
  var J = window.CSJobs, CS = window.CS, R = window.Resume;
  if (!J || !CS || J.busy) return;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var css = document.createElement('style'); css.id = 'csUiCss';
  css.textContent = '#csBar{box-sizing:border-box;width:100%;max-width:100%;padding:0 10px 6px;background:#050706;border-bottom:1px solid #1f2937;color:#e5e5e5;font:14px/1.35 system-ui,-apple-system,Roboto,sans-serif}'
    + '#csBar *,#csTabs *{box-sizing:border-box}#csTabs{position:sticky;top:0;z-index:40;box-sizing:border-box;width:100%;max-width:100%;padding:6px 10px;background:#050706;border-bottom:1px solid #1f2937;font:14px/1.35 system-ui,-apple-system,Roboto,sans-serif}#csTabs .cs-row{display:flex;gap:6px;align-items:center;overflow-x:auto;max-width:100%;padding-bottom:2px;scrollbar-width:thin}'
    + '#csTabs .cs-b,#csBar .cs-b{all:unset;box-sizing:border-box;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;min-width:44px;max-width:220px;padding:0 12px;border-radius:12px;border:1px solid #334155;background:#0a0a0a;color:#e5e5e5;font:700 14px/1.1 system-ui,sans-serif;cursor:pointer;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '#csTabs .cs-tab.on{border-color:#16a34a;background:#052e16;color:#bbf7d0}#csTabs .cs-tab small{font-weight:600;color:#a3a3a3}'
    + '#csTabs .cs-b:focus-visible,#csBar .cs-b:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}#csBar .cs-pri{border-color:#16a34a;color:#86efac}'
        + '#csBar .cs-note{margin-top:6px;font-size:13px;color:#fbbf24}#csBar .cs-note:empty{display:none}'
        ;
  document.head.appendChild(css);

  /* ---------- the jobs bar ---------- */
  var top = document.createElement('div'); top.id = 'csTabs';           // stays at the top, so switching never needs a scroll back up
  var bar = document.createElement('div'); bar.id = 'csBar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Jobs and account');
  document.body.insertBefore(bar, document.body.firstChild); document.body.insertBefore(top, bar);
  var key = J.active();
  function label(j) { return j.title || 'Untitled job'; }
  function paintBar() {
    var L = J.list(), act = J.active();
    var tabs = L.map(function (j) { return '<button type="button" class="cs-b cs-tab' + (j.key === act ? ' on' : '') + '" data-job="' + esc(j.key) + '"' + (j.key === act ? ' aria-current="true"' : '') + '>'
      + (j.done ? '\u2713 ' : '') + esc(label(j)) + (j.where ? ' <small>' + esc(j.where) + '</small>' : '') + '</button>'; }).join('');
    var keepNote = $('csNote') ? $('csNote').textContent : '';
    top.innerHTML = '<div class="cs-row" role="tablist" aria-label="Open jobs">' + tabs
      + '<button type="button" class="cs-b" id="csNew">+ New job</button><button type="button" class="cs-b" id="csFinish">\u2713 Job finished</button></div>';
    bar.innerHTML = '<div class="cs-note" id="csNote" role="status">' + esc(keepNote) + '</div><div id="csPick"></div>';
    var cur = top.querySelector('.cs-tab.on'), row = top.firstChild; if (cur && row) row.scrollLeft = Math.max(0, cur.offsetLeft - 10);
    if (R) R.mountList($('csPick'), { apps: ['cert'], hideEmpty: true, name: 'Cert Studio', onOpen: pickUp });
  }
  function note(t) { var n = $('csNote'); if (n) n.textContent = t || ''; }
  function barClick(e) {
    var b = e.target.closest && e.target.closest('button'); if (!b || !(bar.contains(b) || top.contains(b))) return;
    if (b.hasAttribute('data-job')) { var k = b.getAttribute('data-job'); if (k !== J.active()) { saveNow(); J.switchTo(k); } return; }
    if (b.id === 'csNew') { if (J.open() >= J.max) { note(J.max + ' jobs are open. Finish one first.'); return; } saveNow(); J.switchTo('new'); return; }
    if (b.id === 'csFinish') {
      if (!b.getAttribute('data-sure')) { b.setAttribute('data-sure', '1'); b.textContent = 'Tap again: finished'; setTimeout(function () { if (b.isConnected) { b.removeAttribute('data-sure'); b.textContent = '\u2713 Job finished'; } }, 4000); return; }
      if (R) R.done('cert', key); J.close(key); return;
    }
    if (b.id === 'csSignIn') { CS.signIn(); return; }
  }
  bar.addEventListener('click', barClick); top.addEventListener('click', barClick);
  function pickUp(t) {
    if (!t || t.app !== 'cert') { location.href = t.link; return; }
    if (t.jobKey === J.active()) { var s = R.get('cert', t.jobKey); if (s && s.state && s.state.scroll) R.scroll.apply(spot(s.state.scroll)); note('This is the job on screen.'); return; }
    if (J.list().some(function (j) { return j.key === t.jobKey; })) { saveNow(); J.switchTo(t.jobKey); return; }
    note('That job isn\u2019t saved on this phone any more.');
  }

  /* ---------- this job: autosave of the spot, INCOMPLETE when left partway ---------- */
  function stamper() { try { return JSON.parse(localStorage.getItem('realm-stamper') || 'null') || {}; } catch (e) { return {}; } }
  function tab() { try { return localStorage.getItem('realm-tab') || 'plan'; } catch (e) { return 'plan'; } }
  function siteText() { var s = $('site'); var v = (s && s.value || '').trim(); return v.split(',')[0].trim().slice(0, 40); }
  function where() { var t = tab(); return t === 'cert' ? 'Certificate' : t === 'merge' ? 'Merge' : 'Anchor plan'; }
  function hasContent() { var S = stamper(); return !!(siteText() || (S.items && S.items.length) || S.aerial || S.img || localStorage.getItem('realm-cert')); }
  var restored = false, sc0 = (J.reg().jobs[key] || {}).scroll || null;   // until the spot is back, keep the saved one
  // the job's spot is kept relative to the top of the app (below the Pick up list and the account line), because those grow and shrink between visits
  function appTop() { var t = 0; ['csBar', 'csAcct'].forEach(function (id) { var e = $(id); if (e && e.offsetParent !== null) t = Math.max(t, Math.round(e.getBoundingClientRect().bottom + scrollY)); }); return t; }
  function scrollNow() { if (!restored && sc0) return sc0; var s = R ? R.scroll.collect(['.side', '.main', '.app']) : { y: Math.round(scrollY) }; s.rel = s.y - appTop(); return s; }
  function spot(sc) { if (!sc || typeof sc.rel !== 'number') return sc; var o = JSON.parse(JSON.stringify(sc)); o.y = Math.max(0, appTop() + sc.rel); return o; }
  function collect() { return { step: tab(), stepLabel: where(), scroll: scrollNow(), fields: { site: ($('site') || {}).value || '', client: ($('client') || {}).value || '' }, drawing: 'kept with the job on this phone', extra: { job: key } }; }
  var begun = false;
  function track(now) {
    if (key === '__closed') return;
    var meta = { title: siteText(), where: where(), scroll: scrollNow() };
    J.meta(key, meta);
    if (!R || !hasContent()) return;
    if (!begun) { begun = true; R.begin('cert', key, { collect: collect, title: meta.title || 'New job', where: meta.where }); }
    (now ? R.saveNow : R.save)('cert', key, collect(), { title: meta.title || 'New job', where: meta.where });
  }
  function saveNow() { try { track(true); } catch (e) {} }
  var t = 0; function soon() { clearTimeout(t); t = setTimeout(function () { track(false); var old = top.querySelector('.cs-tab.on'); var j = J.list().filter(function (x) { return x.active; })[0];
    if (old && j) { var want = esc(label(j)) + (j.where ? ' <small>' + esc(j.where) + '</small>' : ''); if (old.innerHTML !== want) old.innerHTML = want; } }, 600); }
  ['input', 'change', 'pointerup', 'keyup'].forEach(function (ev) { document.addEventListener(ev, function (e) { if (!bar.contains(e.target) && !top.contains(e.target)) soon(); }, true); });
  addEventListener('scroll', soon, true);
  addEventListener('pagehide', function () { if (!J.busy) try { J.meta(key, { title: siteText(), where: where(), scroll: scrollNow() }); } catch (e) {} });
  document.addEventListener('realm:filed', function () { if (R) R.done('cert', key); J.meta(key, { done: true }); begun = false; note('Filed. Tap \u201c\u2713 Job finished\u201d to close this job.'); });

  /* the WhatsApp and Google Drive buttons: js/cs-split.js */

  /* account line, fallback buttons and the Switch to info@ line: js/cs-account.js */
  document.addEventListener('cs:leaving', function () { saveNow(); });

  /* ---------- open: restore the exact spot ---------- */
  if (R) {
    R.register('cert', { name: 'Cert Studio', page: 'certstudio.html' });
    R.restore('cert', function () { return false; });   // takes ?resume= off the address; the page itself has already put the job back
  }
  paintBar();
  var n0 = J.note(); if (n0) note(n0);
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  if (sc0 && R) { var go = function () { document.documentElement.style.overflowAnchor = 'none'; R.scroll.apply(spot(sc0)); setTimeout(function () { document.documentElement.style.overflowAnchor = ''; }, 500); }, fin = function () { go(); setTimeout(function () { restored = true; }, 450); };
    if (document.readyState === 'complete') setTimeout(fin, 200); else addEventListener('load', function () { setTimeout(fin, 200); }); }
  else restored = true;
  if (hasContent()) setTimeout(function () { track(true); }, 300);
  window.CSUI = { track: track, note: note, paint: paintBar };
})();
