/* Realm Google sign-in (prepared 27 Oct 2026). Search Studio and Note prove "this is info@realmpcs.com" with Google,
   never with a typed key. Google Identity Services (FedCM in Chrome) gives an ID token for this site's OAuth client;
   Realm Desk checks it with Google and hands back a signed session kept on this device (localStorage realm_sess, 14 days).
   Nothing secret lives here: the OAuth client id is public by design. No key box, no key link.
   Usage: <script src="js/realm-auth.js" data-client-id="....apps.googleusercontent.com"></script>
   Google's large button is ~40px; scaled 1.1 so the tap target is >= 44px.
   API: RealmAuth.has() · .fields(body) · .ensure(boxEl?) · .reset() · .isAuthErr(msg) · .onChange(fn) */
(function () {
  'use strict';
  if (window.RealmAuth) return;
  var S = document.currentScript || {}, D = S.dataset || {};
  var CLIENT_ID = D.clientId || window.REALM_GIS_CLIENT_ID || '';
  var DESK = 'https://script.google.com/macros/s/AKfycbxhGb1O-6S6C2PJS92EEuViEBDu0wj2AGTzgkGtm_7MixmXsepE-XxF9rgly0f6SwARGw/exec';
  var GSI = 'https://accounts.google.com/gsi/client', HINT = 'info@realmpcs.com', LS = 'realm_sess';
  var subs = [], gisP = null, inited = false, boxes = [], busy = false, prompted = false;
  function rd() { try { var o = JSON.parse(localStorage.getItem(LS) || 'null'); if (o && o.sess && o.exp > Date.now() + 60000) return o; } catch (e) {} return null; }
  function oldKey() { try { return localStorage.getItem('realm_key') || ''; } catch (e) { return ''; } } /* devices that already had one keep working; never asked for */
  function has() { return !!rd() || !!oldKey(); }
  function fields(o) { o = o || {}; o.auth = 'google'; var s = rd(); if (s) o.sess = s.sess; var k = oldKey(); if (k) o.key = k; return o; }
  function isAuthErr(m) { return /Sign-in needed|not allowed|Realm key needed|Sign-in not set up/i.test(String(m || '')); }
  /* tell listeners only on a real change of signed-in state, so a failed call can never re-trigger itself */
  function emit(force) { var v = has(); if (v === last && !force) return; last = v; subs.forEach(function (f) { try { f(v); } catch (e) {} }); }
  /* "has the Desk answered this device yet?" (for the pill: Checking... until the first answer) */
  var seen = false, seenSubs = [];
  function saw() { if (seen) return; seen = true; seenSubs.forEach(function (f) { try { f(); } catch (e) {} }); }
  /* Desk refused this device: drop the session AND any old Realm key it was still sending (that key was refused too).
     One Tap is offered once per page load only, so a refused sign-in can't loop; the Google button stays. */
  function reset() { try { localStorage.removeItem(LS); localStorage.removeItem('realm_key'); } catch (e) {} emit(); }
  function say(t) { boxes.forEach(function (b) { var m = b.querySelector('.ra-msg'); if (m) m.textContent = t; }); }
  function loadGis() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
    if (gisP) return gisP;
    gisP = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = GSI; s.async = true; s.onload = ok; s.onerror = function () { gisP = null; no(new Error('gsi')); }; document.head.appendChild(s); });
    return gisP;
  }
  function onCred(r) {
    if (!r || !r.credential || busy) return; busy = true; say('Signing in\u2026');
    fetch(DESK, { method: 'POST', redirect: 'follow', credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: '__auth', idToken: r.credential }) })
      .then(function (x) { return x.text(); })
      .then(function (t) { var j; try { j = JSON.parse(t); } catch (e) { throw new Error('bad answer'); }
        if (!j || !j.ok || !j.result || !j.result.sess) throw new Error((j && j.error) || 'not signed in');
        try { localStorage.setItem(LS, JSON.stringify({ sess: j.result.sess, exp: j.result.exp })); } catch (e) {}
        busy = false; boxes.forEach(function (b) { b.hidden = true; }); saw(); emit(true); /* every new session is a trigger, even if the watcher never saw the old one expire */ })
      .catch(function (e) { busy = false; try { console.warn('sign-in:', e && e.message); } catch (_) {}
        say(/not allowed/i.test(e && e.message) ? 'That Google account can\u2019t open this. Pick info@realmpcs.com.' : 'Sign-in didn\u2019t finish. Tap the Google button to try again.'); });
  }
  function init() {
    if (inited) return; inited = true;
    google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCred, auto_select: true, login_hint: HINT, context: 'signin',
      use_fedcm_for_prompt: true, use_fedcm_for_button: true, itp_support: true, cancel_on_tap_outside: false });
  }
  /* Show the Google sign-in (one tap, or silent if info@ already said yes on this device). Never a key box. */
  function ensure(box) {
    if (rd()) return;
    if (box && boxes.indexOf(box) < 0) boxes.push(box);
    boxes.forEach(function (b) {
      b.hidden = false;
      if (!b.querySelector('.ra-btn')) b.innerHTML = '<div class="ra-btn"></div><div class="ra-msg">Sign in with Google as ' + HINT + '. One time on this device.</div>';
    });
    if (!CLIENT_ID) { say('Google sign-in isn\u2019t switched on yet.'); return; }
    loadGis().then(function () {
      init();
      boxes.forEach(function (b) { var el = b.querySelector('.ra-btn'); if (el && !el.childNodes.length) google.accounts.id.renderButton(el, { type: 'standard', theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', logo_alignment: 'left' }); });
      if (!prompted) { prompted = true; try { google.accounts.id.prompt(); } catch (e) {} }
    }, function () { say('Google sign-in couldn\u2019t load. Check your signal and reopen.'); });
  }
  /* tell listeners when the session appears, goes, or expires (also from another tab) */
  var last = has();
  function watch() { emit(); }
  setInterval(watch, 15000); window.addEventListener('storage', function (e) { if (!e.key || e.key === LS || e.key === 'realm_key') watch(); });
  var st = document.createElement('style');
  st.textContent = '.ra-box{margin:8px 0;padding:12px;border:1px solid #2a2a2a;border-radius:14px;background:#0a0a0a}.ra-box[hidden]{display:none}.ra-btn{min-height:44px}.ra-btn>div{transform:scale(1.1);transform-origin:left top;margin-bottom:4px}.ra-msg{margin-top:8px;color:#a1a1aa;font-size:13px;line-height:1.4}';
  (document.head || document.documentElement).appendChild(st);
  window.RealmAuth = { has: has, fields: fields, ensure: ensure, reset: reset, isAuthErr: isAuthErr, onChange: function (f) { subs.push(f); }, signedIn: function () { return !!rd(); },
    saw: saw, checked: function () { return seen; }, onSeen: function (f) { seenSubs.push(f); } };
})();
