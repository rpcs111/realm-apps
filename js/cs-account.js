/* Cert Studio, GitHub version: the account line and the Diary/Email/Drive fallback (29 Oct 2026).
   No sign-in yet (CS_CONFIG.clientId empty): Diary, Email and Drive buttons open the Google version through the account
   chooser with info@ filled in (target _top), and a plain "Switch to info@" line replaces the old
   "Sign in to Chrome with your Realm Google account…" error. With a client id: a "Sign in as info@" button instead.
   Until then, a plain why-not line sits right under each of the Diary, Approval email and Drive folder buttons. */
(function () {
  'use strict';
  var CS = window.CS; if (!CS || (window.CSJobs && CSJobs.busy)) return;
  var $ = function (id) { return document.getElementById(id); };
  var GOOGLE_IDS = ['cDiary', 'cMail', 'cFolder', 'cDrive', 'rfGo', 'mgDrive', 'rdFind', 'phUp', 'ckPrev', 'csGDrive'];
  var OLD_TEXT = /Sign in to Chrome with your Realm Google account[^.]*\.?|Works when you are signed in to Chrome with your Realm Google account\.?/;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var css = document.createElement('style'); css.id = 'csAcctCss';
  css.textContent = '#csAcct{box-sizing:border-box;width:100%;max-width:100%;display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:6px 10px;background:#050706;border-bottom:1px solid #1f2937;color:#d4d4d4;font:13px/1.35 system-ui,-apple-system,Roboto,sans-serif}'
    + '#csAcct *{box-sizing:border-box}#csAcct .cs-why{flex:1 1 100%;font-size:12px;color:#fbbf24}#csAcct .cs-note{flex:1 1 100%;color:#fbbf24}#csAcct .cs-note:empty{display:none}'
    + '#csAcct .cs-b{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:0 12px;border-radius:12px;border:1px solid #16a34a;background:#0a0a0a;color:#86efac;font:700 14px/1.1 system-ui,sans-serif;cursor:pointer;text-decoration:none}'
    + '#csAcct .cs-b:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}';
  document.head.appendChild(css);
  var box = document.createElement('div'); box.id = 'csAcct'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Google account');
  document.body.insertBefore(box, document.body.firstChild);
  function paint() {
    var keep = $('csAcctNote') ? $('csAcctNote').textContent : '';
    box.innerHTML = (CS.mode === 'fallback'
      ? '<span>Diary, Email and Drive open the Google version for now.</span><a class="cs-b" id="csSwitch" href="' + esc(CS.chooserUrl) + '" target="_top" rel="noopener">Switch to info@</a>'
        + '<span class="cs-why">Why not here: the sign-in for this page isn\u2019t set up yet. Your work stays saved on this phone.</span>'
      : (CS.isSignedIn() ? '<span>Signed in as info@.</span>' : '<span>Diary, Email and Drive need the info@ account.</span><button type="button" class="cs-b" id="csSignIn">Sign in as info@</button>'))
      + '<span class="cs-note" id="csAcctNote" role="status">' + esc(keep) + '</span>';
  }
  /* why-not line under Diary, Approval email and Drive folder (fallback only). Each button moves into a small column with its
     line under it; the button keeps its id and its click handlers. */
  var WHY_IDS = ['csGDrive', 'cDiary', 'cMail', 'cFolder'], WHY = 'Opens in Google for now, until the info@ sign-in is set up.';
  function whyNot() {
    if (CS.mode !== 'fallback' || !$('csWhyCss')) return;
    WHY_IDS.forEach(function (id) {
      var b = $(id); if (!b || $(id + 'Why') || !b.parentNode) return;
      var col = document.createElement('span'); col.className = 'cs-wncol';
      b.parentNode.insertBefore(col, b); col.appendChild(b);
      var s = document.createElement('small'); s.className = 'cs-whynot'; s.id = id + 'Why'; s.textContent = WHY; col.appendChild(s);
    });
  }
  if (CS.mode === 'fallback') {
    var wcss = document.createElement('style'); wcss.id = 'csWhyCss';
    wcss.textContent = '.cs-wncol{display:flex;flex-direction:column;gap:3px;flex:1 1 120px;min-width:0}.cs-wncol>button,.cs-split .cs-wncol>.cs-b{width:100%;flex:0 0 auto}'
      + '.cs-wncol .cs-whynot{display:block;font:12px/1.3 system-ui,-apple-system,Roboto,sans-serif;color:#a3a3a3}';
    document.head.appendChild(wcss);
  }
  function note(t) { var n = $('csAcctNote'); if (n) n.textContent = t || ''; }
  box.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('#csSignIn'); if (b) CS.signIn(); });

  /* Diary, Email and Drive: no sign-in yet, so they open the Google version as info@ */
  document.addEventListener('click', function (e) {
    if (CS.mode !== 'fallback') return;
    var b = e.target.closest && e.target.closest('button,a'); if (!b || GOOGLE_IDS.indexOf(b.id) < 0) return;
    e.preventDefault(); e.stopImmediatePropagation();
    try { document.dispatchEvent(new CustomEvent('cs:leaving')); } catch (x) {}
    note('Opening the Google version as info@\u2026');
    CS.openGoogle();
  }, true);

  /* the old "Sign in to Chrome…" line becomes "Switch to info@" */
  function fixText(root) {
    var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, null), n, hit = [];
    while ((n = w.nextNode())) if (OLD_TEXT.test(n.nodeValue)) hit.push(n);
    hit.forEach(function (n) {
      var p = n.parentNode; if (!p) return;
      var parts = n.nodeValue.split(OLD_TEXT), frag = document.createDocumentFragment();
      frag.appendChild(document.createTextNode(parts[0] || ''));
      var span = document.createElement('span'); span.textContent = 'Diary, Email and Drive use the info@ account. ';
      var a = document.createElement('a'); a.textContent = 'Switch to info@'; a.target = '_top'; a.rel = 'noopener'; a.className = 'cs-swl';
      a.style.cssText = 'display:inline-flex;align-items:center;min-height:44px;min-width:44px;padding:0 6px;box-sizing:border-box;vertical-align:middle';
      if (CS.mode === 'fallback') a.href = CS.chooserUrl; else { a.href = '#'; a.addEventListener('click', function (e) { e.preventDefault(); CS.signIn(); }); }
      span.appendChild(a); frag.appendChild(span); frag.appendChild(document.createTextNode(parts.slice(1).join('') || ''));
      p.replaceChild(frag, n);
    });
  }
  paint(); fixText(document.body); whyNot();
  if (window.MutationObserver) { var q = 0; new MutationObserver(function () { if (q) return; q = setTimeout(function () { q = 0; fixText(document.body); whyNot(); }, 50); }).observe(document.body, { childList: true, subtree: true, characterData: true }); }
  document.addEventListener('cs:needsignin', function () { note('Tap \u201cSign in as info@\u201d for Diary, Email and Drive.'); });
  document.addEventListener('cs:signedin', paint);
  document.addEventListener('cs:say', function (e) { note(e.detail || ''); });
  window.CSAccount = { note: note, paint: paint };
})();
