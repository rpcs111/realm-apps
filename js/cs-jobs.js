/* Cert Studio, GitHub version: several jobs open at once (29 Oct 2026).
   The page keeps the job it's on in its own storage (plan, drawing, certificate, tab). Every other open job is parked whole in this
   phone's IndexedDB. Switching parks the current job and puts the other one back, then reloads, so the page itself restores the
   job, the step (tab) and the drawing; the place on the page comes back from the job list. Runs first in <head>, before the page. */
(function () {
  'use strict';
  var KEYS = ['realm-stamper', 'realm-cert', 'realm-tab', 'realm-cert-items', 'realm-cert-photos', 'realm:certstudio-autofill'];
  var REG = 'cs-jobs-v1', SWAP = 'cs-jobs-swap', NOTE = 'cs-jobs-note', MAX = 8;
  var ls = window.localStorage, ss = window.sessionStorage;
  function now() { return Date.now(); }
  function newKey() { return 'c_' + now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function okKey(k) { return /^[A-Za-z0-9_-]{1,64}$/.test(k || ''); }
  function reg() { var r; try { r = JSON.parse(ls.getItem(REG) || 'null'); } catch (e) { r = null; }
    r = r && typeof r === 'object' ? r : {}; r.order = Array.isArray(r.order) ? r.order : []; r.jobs = r.jobs && typeof r.jobs === 'object' ? r.jobs : {}; return r; }
  function saveReg(r) { try { ls.setItem(REG, JSON.stringify(r)); } catch (e) {} }
  var PFX = 'realmLive:'; // the walkthrough's own notes belong to the job too
  function jobKeys() { var a = KEYS.slice(); for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (k && k.indexOf(PFX) === 0) a.push(k); } return a; }
  function grab() { var o = {}; jobKeys().forEach(function (k) { var v = ls.getItem(k); if (v != null) o[k] = v; }); return o; }
  function put(o) { jobKeys().forEach(function (k) { try { ls.removeItem(k); } catch (e) {} });
    Object.keys(o || {}).forEach(function (k) { if (KEYS.indexOf(k) >= 0 || k.indexOf(PFX) === 0) { try { ls.setItem(k, o[k]); } catch (e) {} } }); }
  function db() { return new Promise(function (res, rej) { var q = indexedDB.open('cs-jobs', 1); q.onupgradeneeded = function () { q.result.createObjectStore('snap'); };
    q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; }); }
  function idb(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('snap', mode), s = t.objectStore('snap'), out = fn(s);
    t.oncomplete = function () { res(out && 'result' in out ? out.result : undefined); d.close(); }; t.onerror = function () { rej(t.error); }; }); }); }
  function park(k, snap) { return idb('readwrite', function (s) { s.put(snap, k); }); }
  function unpark(k) { return idb('readonly', function (s) { return s.get(k); }); }
  function forget(k) { return idb('readwrite', function (s) { s.delete(k); }); }
  function param(n) { try { return new URLSearchParams(location.search).get(n); } catch (e) { return null; } }
  function page(q) { return location.pathname + (q || ''); }

  var R = reg();
  if (!R.active || !R.jobs[R.active]) { var k0 = newKey(); R.active = k0; R.jobs[k0] = { title: '', openedAt: now() }; R.order = R.order.filter(function (k) { return R.jobs[k]; }); R.order.push(k0); saveReg(R); }
  var want = param('resume'), swap = null; try { swap = ss.getItem(SWAP); ss.removeItem(SWAP); } catch (e) {}
  var target = swap || want;
  var busy = false;
  if (target && target !== R.active && (target === 'new' || okKey(target))) {
    busy = true;
    try { document.documentElement.style.visibility = 'hidden'; } catch (e) {}
    try { window.stop(); } catch (e) {}           // the page underneath doesn't start, so it can't save over the swap
    var from = R.active, cur = grab();
    (from === '__closed' ? Promise.resolve() : park(from, { keys: cur, at: now() })).then(function () { return target === 'new' ? { keys: {} } : unpark(target); }).then(function (snap) {
      R = reg();
      if (!snap && from === '__closed') { target = 'new'; snap = { keys: {} }; }
      if (!snap) { try { ss.setItem(NOTE, 'That job isn\u2019t saved on this phone, so Cert Studio stayed on the one you had open.'); } catch (e) {} location.replace(page('')); return; }
      var to = target === 'new' ? newKey() : target;
      put(snap.keys || {});
      delete R.jobs.__closed; R.order = R.order.filter(function (k) { return k !== '__closed'; });
      R.active = to; if (!R.jobs[to]) R.jobs[to] = { title: '', openedAt: now() };
      R.order = R.order.filter(function (k) { return k !== to && R.jobs[k]; }); R.order.push(to);
      saveReg(R);
      location.replace(page(target === 'new' ? '' : '?resume=' + encodeURIComponent(to)));
    }).catch(function () { try { ss.setItem(NOTE, 'Couldn\u2019t switch jobs on this phone just now. Nothing was lost.'); } catch (e) {} location.replace(page('')); });
  }
  window.CSJobs = {
    busy: busy, keys: KEYS, max: MAX,
    reg: reg, saveReg: saveReg, active: function () { return reg().active; },
    list: function () { var r = reg(); return r.order.filter(function (k) { return r.jobs[k]; }).map(function (k) { var j = r.jobs[k]; return { key: k, title: j.title || '', where: j.where || '', done: !!j.done, active: k === r.active, savedAt: j.savedAt || j.openedAt }; }); },
    meta: function (k, o) { var r = reg(); if (!r.jobs[k]) return; Object.keys(o).forEach(function (x) { r.jobs[k][x] = o[x]; }); r.jobs[k].savedAt = now(); saveReg(r); },
    switchTo: function (k) { if (k === reg().active) return false; try { ss.setItem(SWAP, k); } catch (e) {} location.replace(page(k === 'new' ? '' : '?resume=' + encodeURIComponent(k))); return true; },
    open: function () { return this.list().length; },
    close: function (k) { // finished or thrown away: off the tabs, its parked copy deleted
      var r = reg(); if (!r.jobs[k]) return; delete r.jobs[k]; r.order = r.order.filter(function (x) { return x !== k; });
      forget(k).catch(function () {});
      if (r.active !== k) { saveReg(r); return; }
      // it's the one on screen: nothing gets parked for it; the swap puts the next job (or a blank one) in its place
      var next = r.order[r.order.length - 1] || 'new';
      r.active = '__closed'; r.jobs.__closed = { title: '' }; saveReg(r);
      try { ss.setItem(SWAP, next); } catch (e) {}
      location.replace(page(next === 'new' ? '' : '?resume=' + encodeURIComponent(next)));
    },
    note: function () { try { var n = ss.getItem(NOTE); ss.removeItem(NOTE); return n || ''; } catch (e) { return ''; } },
    _park: park, _unpark: unpark
  };
})();
