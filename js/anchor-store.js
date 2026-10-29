/* Anchor Studio (30 Oct 2026): its own storage, kept apart from Cert Studio. Loaded FIRST in anchor.html's <head>, before any
   other script. anchor.html runs Cert Studio's page code and shared scripts (js/cs-jobs.js, js/cs-ui.js) unchanged, and those
   use Cert Studio's storage names. On this page only, those names are put under Anchor's own prefix 'anchor.':
   - localStorage: the open job (realm-stamper, realm-cert, realm-tab, realm-cert-items, realm-cert-photos,
     realm:certstudio-autofill, realmLive:*), the job list (cs-jobs-v1) and the Pick up records (realm-resume-v1)
   - sessionStorage: the job switch notes (cs-jobs-swap, cs-jobs-note)
   - IndexedDB: the parked jobs (cs-jobs) and the merge pages (realm-merge)
   So Anchor never reads or writes Cert Studio's copies, and Cert Studio never sees Anchor's. Nothing is moved over from
   Cert Studio. certstudio.html and the shared scripts are not changed. The Pick up list entries say Anchor Studio and link here. */
(function () {
  'use strict';
  if (window.AnchorStore) return;
  var P = 'anchor.';
  var LKEYS = ['realm-stamper', 'realm-cert', 'realm-tab', 'realm-cert-items', 'realm-cert-photos', 'realm:certstudio-autofill', 'cs-jobs-v1', 'realm-resume-v1'];
  var LPFX = ['realmLive:'], SKEYS = ['cs-jobs-swap', 'cs-jobs-note'], DBS = { 'cs-jobs': 1, 'realm-merge': 1 };
  var LS = null, SS = null;
  try { LS = window.localStorage; } catch (e) {}
  try { SS = window.sessionStorage; } catch (e) {}
  var SP = window.Storage && Storage.prototype;
  function mine(st, k) {
    k = String(k);
    if (st === LS && LS) { if (LKEYS.indexOf(k) >= 0) return true; for (var i = 0; i < LPFX.length; i++) if (k.indexOf(LPFX[i]) === 0) return true; return false; }
    if (st === SS && SS) return SKEYS.indexOf(k) >= 0;
    return false;
  }
  function map(st, k) { return mine(st, k) ? P + String(k) : k; }
  if (SP) {
    var g = SP.getItem, s = SP.setItem, r = SP.removeItem, kf = SP.key, lenD = Object.getOwnPropertyDescriptor(SP, 'length');
    SP.getItem = function (k) { return g.call(this, map(this, k)); };
    SP.setItem = function (k, v) { return s.call(this, map(this, k), v); };
    SP.removeItem = function (k) { return r.call(this, map(this, k)); };
    /* key(i) and length show this page's view: Anchor's copies under their plain names; Cert Studio's copies are not listed */
    var view = function (st) {
      var n = lenD.get.call(st), out = [];
      for (var i = 0; i < n; i++) {
        var x = kf.call(st, i); if (x == null) continue;
        if (mine(st, x)) continue;
        if (x.indexOf(P) === 0 && mine(st, x.slice(P.length))) { out.push(x.slice(P.length)); continue; }
        out.push(x);
      }
      return out;
    };
    var ours = function (st) { return (st === LS && !!LS) || (st === SS && !!SS); };
    SP.key = function (i) { if (!ours(this)) return kf.call(this, i); var v = view(this); i = Math.floor(Number(i)) || 0; return i >= 0 && i < v.length ? v[i] : null; };
    if (lenD && lenD.get && lenD.configurable) Object.defineProperty(SP, 'length', { configurable: true, enumerable: lenD.enumerable,
      get: function () { return ours(this) ? view(this).length : lenD.get.call(this); } });
  }
  try {
    var IF = window.indexedDB;
    if (IF) {
      var op = IF.open, del = IF.deleteDatabase;
      IF.open = function (n) { var a = [].slice.call(arguments); if (DBS[String(n)]) a[0] = P + String(n); return op.apply(IF, a); };
      IF.deleteDatabase = function (n) { var a = [].slice.call(arguments); if (DBS[String(n)]) a[0] = P + String(n); return del.apply(IF, a); };
    }
  } catch (e) {}
  /* Pick up where you left off (js/resume.js): Cert Studio's code says 'cert'; on this page that is Anchor's own 'anchor' list.
     Called once from anchor.html right after js/resume.js loads, before js/cs-ui.js. */
  function wrapResume() {
    var R = window.Resume; if (!R || R.__anchor) return false;
    var A = function (a) { return a === 'cert' ? 'anchor' : a; }, B = function (x) { if (x && x.app === 'anchor') { var y = {}; for (var k in x) y[k] = x[k]; y.app = 'cert'; return y; } return x; };
    var W = {}; for (var k in R) W[k] = R[k];
    R.register('anchor', { name: 'Anchor Studio', page: 'anchor.html' });
    W.register = function (a, o) { if (a === 'cert') return R.register('anchor', { name: 'Anchor Studio', page: 'anchor.html' }); return R.register(a, o); };
    ['save', 'saveNow', 'begin', 'leave', 'done', 'drop', 'get', 'restore', 'link'].forEach(function (m) {
      if (typeof R[m] === 'function') W[m] = function (a) { var x = [].slice.call(arguments); x[0] = A(a); return R[m].apply(R, x); }; });
    W.pending = function (a) { return R.pending(a == null ? a : A(a)); };
    W.mountList = function (el, o) {
      var c = {}; for (var k in (o || {})) c[k] = o[k];
      if (Array.isArray(c.apps)) c.apps = c.apps.map(A);
      if (c.name === 'Cert Studio') c.name = 'Anchor Studio';
      if (typeof c.onOpen === 'function') { var f = c.onOpen; c.onOpen = function (x) { return f(B(x)); }; }
      return R.mountList(el, c);
    };
    W.__anchor = true;
    window.Resume = W; return true;
  }
  window.AnchorStore = { prefix: P, keys: LKEYS.slice(), wrapResume: wrapResume, _mapped: function (k) { return map(LS, k); } };
})();
