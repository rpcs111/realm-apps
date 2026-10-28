/* Cert Studio, GitHub version: stands in for google.script.run (29 Oct 2026).
   Signed in (clientId set): every call goes to certstudio/worker.js, which runs the round 6 server files on Google's REST APIs
   with a token from the Google sign-in (login hint info@). Fallback (clientId empty, what ships now): server calls fail with a
   plain line, and Diary, Email and Drive open the Google version through the account chooser with info@ filled in. No keys here. */
(function () {
  'use strict';
  var C = window.CS_CONFIG || {}, INFO = 'info@realmpcs.com';
  var GOOGLE_VERSION = 'https://script.google.com/macros/s/AKfycbwFil-RiQujoffiDoBnGk6YvjLuyr1vaqCQKVUPtWT9NmGVQryPcwEsjIlieL93Yps/exec';
  var CHOOSER = 'https://accounts.google.com/AccountChooser?Email=' + encodeURIComponent(INFO) + '&continue=' + encodeURIComponent(GOOGLE_VERSION);
  var SCOPES = 'openid email https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/drive.appdata';
  var FALLBACK_MSG = 'Diary, Email and Drive work in the Google version for now. Tap \u201cSwitch to info@\u201d to open it as info@.';
  var OLD_ERR = /Sign in to Chrome with your Realm Google account[^.]*\.?/;
  var SWITCH_MSG = 'This needs the info@ account. Tap \u201cSwitch to info@\u201d.';
  var PKEY = 'cs-gas-props-v1';
  var signedIn = !!C.clientId;
  var token = '', tokenExp = 0, email = '', worker = null, seq = 0, waiting = {}, tokenClient = null, queue = [];
  function props() { try { return JSON.parse(localStorage.getItem(PKEY) || '{}') || {}; } catch (e) { return {}; } }
  function plain(msg) { msg = String(msg || ''); return OLD_ERR.test(msg) ? SWITCH_MSG : msg; }
  function fail(f, msg) { setTimeout(function () { if (f) { try { f(new Error(plain(msg))); } catch (e) { setTimeout(function () { throw e; }); } } }, 0); }
  function ensureWorker() {
    if (worker) return worker;
    worker = new Worker('certstudio/worker.js?v=20261029-2');
    worker.onmessage = function (e) { var m = e.data || {}; if (m.type !== 'reply') return; var w = waiting[m.id]; delete waiting[m.id];
      if (m.props) { try { localStorage.setItem(PKEY, JSON.stringify(m.props)); } catch (x) {} }
      if (!w) return; if ('err' in m) { if (w.f) w.f(new Error(plain(m.err))); } else if (w.s) w.s(m.ok, w.u); };
    worker.onerror = function (e) { e.preventDefault && e.preventDefault(); Object.keys(waiting).forEach(function (k) { var w = waiting[k]; delete waiting[k]; if (w.f) w.f(new Error('Cert Studio hit a snag reaching Google. Try again.')); }); };
    return worker;
  }
  function sendToken() { ensureWorker().postMessage({ type: 'token', token: token, email: email, props: props() }); }
  function haveToken() { return token && Date.now() < tokenExp - 60000; }
  function call(name, args, s, f, u) {
    if (!signedIn) { fail(f, FALLBACK_MSG); return; }
    if (!haveToken()) { queue.push([name, args, s, f, u]); CS.needSignIn(); return; }
    var id = ++seq; waiting[id] = { s: s, f: f, u: u };
    ensureWorker().postMessage({ type: 'call', id: id, name: name, args: JSON.parse(JSON.stringify(args || [])) });
  }
  function R(s, f, u) {
    var o = { withSuccessHandler: function (h) { return R(h, f, u); }, withFailureHandler: function (h) { return R(s, h, u); }, withUserObject: function (x) { return R(s, f, x); } };
    return new Proxy(o, { get: function (t, n) { if (n in t) return t[n]; if (typeof n !== 'string') return undefined;
      return function () { call(n, [].slice.call(arguments), s, f, u); }; } });
  }
  var script = { run: R(null, null, null), host: { close: function () {}, setHeight: function () {}, origin: location.origin }, url: { getLocation: function (cb) { cb && cb({ parameter: {}, parameters: {}, hash: location.hash.slice(1) }); } } };
  window.google = window.google || {}; window.google.script = script;
  function gis(cb) {
    if (window.google && google.accounts && google.accounts.oauth2) return cb();
    var el = document.createElement('script'); el.src = 'https://accounts.google.com/gsi/client'; el.async = true;
    el.onload = function () { window.google.script = script; cb(); }; el.onerror = function () { CS.say('Couldn\u2019t reach Google to sign in. Check the signal and try again.'); };
    document.head.appendChild(el);
  }
  window.CS = {
    mode: signedIn ? 'signin' : 'fallback', info: INFO, googleVersion: GOOGLE_VERSION, chooserUrl: CHOOSER, fallbackMsg: FALLBACK_MSG, switchMsg: SWITCH_MSG,
    isSignedIn: function () { return haveToken(); },
    openGoogle: function () { var a = document.createElement('a'); a.href = CHOOSER; a.target = '_top'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); },
    signIn: function () { // must run from a tap (Google opens its own window)
      if (!signedIn) { CS.openGoogle(); return; }
      gis(function () {
        if (!tokenClient) tokenClient = google.accounts.oauth2.initTokenClient({ client_id: C.clientId, scope: SCOPES, login_hint: INFO, hint: INFO, prompt: '',
          callback: function (r) { if (!r || r.error || !r.access_token) { CS.say('Google sign-in didn\u2019t finish. Tap \u201cSign in as info@\u201d to try again.'); return; }
            token = r.access_token; tokenExp = Date.now() + 1000 * (+r.expires_in || 3600); sendToken(); CS.say('');
            try { document.dispatchEvent(new CustomEvent('cs:signedin')); } catch (e) {}
            var q = queue; queue = []; q.forEach(function (c) { call.apply(null, c); }); } });
        tokenClient.requestAccessToken({ login_hint: INFO, hint: INFO });
      });
    },
    needSignIn: function () { try { document.dispatchEvent(new CustomEvent('cs:needsignin')); } catch (e) {} },
    say: function (t) { try { document.dispatchEvent(new CustomEvent('cs:say', { detail: t })); } catch (e) {} },
    plain: plain
  };
})();
