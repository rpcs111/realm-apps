/* Anchor Studio (30 Oct 2026): runs in <head> right after js/cs-jobs.js, before the page. When a job is opened from
   "Your jobs" (or a Drive job link), its saved copy is put back here, so the page itself starts on that job, at the cert
   it was up to. Saved copies live in localStorage realm_anchor_job_<address> and sync through js/realm-sync.js. */
(function () {
  'use strict';
  var J = window.CSJobs; if (!J || J.busy) return;
  var ls = window.localStorage, ss = window.sessionStorage, PFX = 'realm_anchor_job_', LIVE = 'realmLive:';
  function rec(id) { try { var o = JSON.parse(ls.getItem(PFX + id) || 'null'); return o && o.snap ? o : null; } catch (e) { return null; } }
  function okId(id) { return /^[a-z0-9_]{1,60}$/.test(id || ''); }
  function put(o) {
    var ks = J.keys.slice(); for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (k && k.indexOf(LIVE) === 0) ks.push(k); }
    ks.forEach(function (k) { if (k in o) return; if (k === 'realm-cert-photos') return; /* photos too big to sync stay on this device; only ever loaded into the same job or an empty tab */ try { ls.removeItem(k); } catch (e) {} });
    Object.keys(o).forEach(function (k) { if (J.keys.indexOf(k) >= 0 || k.indexOf(LIVE) === 0) { try { ls.setItem(k, o[k]); } catch (e) {} } });
  }
  var id = null; try { id = ss.getItem('anchor-load'); ss.removeItem('anchor-load'); } catch (e) {}
  var how = 'list';
  window.AnchorEarly = { loaded: null, missing: null, okId: okId, rec: rec };
  if (!id) return;
  if (!okId(id)) return;
  var r = rec(id);
  if (!r) { window.AnchorEarly.missing = id; return; }
  put(r.snap || {});
  try { J.meta(J.active(), { title: r.address || '', where: r.uptoText || '' }); } catch (e) {}
  window.AnchorEarly.loaded = { id: id, how: how, at: r.at || 0, address: r.address || '' };
})();

/* The sync line sits inside "Your jobs" (30 Oct 2026), under the status, as a full 44px row, instead of floating over the page
   where it could cover a Fix button near the bottom of the screen. Only on this page; other pages keep their own sync line. */
(function () {
  'use strict';
  var css = '#anJobs #realmSyncPill{position:static!important;left:auto!important;bottom:auto!important;z-index:auto!important;display:flex!important;align-items:center;'
    + 'box-sizing:border-box;width:100%;max-width:100%!important;min-height:44px;margin:2px 0 6px;padding:6px 12px!important;border-radius:12px!important;'
    + 'font:600 13px/1.3 system-ui,sans-serif!important;white-space:normal!important;text-align:left}';
  function dock() {
    var p = document.getElementById('realmSyncPill'), box = document.getElementById('anJobs'), st = document.getElementById('anSyncSt');
    if (!p || !box || !st || p.parentNode === box) return;
    if (!document.getElementById('anPillCss')) { var s = document.createElement('style'); s.id = 'anPillCss'; s.textContent = css; document.head.appendChild(s); }
    box.insertBefore(p, st.nextSibling);
  }
  if (window.MutationObserver) new MutationObserver(dock).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', dock);
})();
