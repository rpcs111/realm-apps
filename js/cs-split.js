/* Cert Studio: "Google Drive" and "WhatsApp" as two buttons (were one, "WhatsApp / Drive"). 29 Oct 2026.
   Sits under "+12 months" in the job panel. WhatsApp opens the page's own paste-the-group-chat box.
   Google Drive finds this site's WhatsApp chat export in Drive and opens it in that box (needs the info@ sign-in);
   until the sign-in is set up it opens the Google version as info@ instead. Uses only what the page already has. */
(function () {
  'use strict';
  var INFO = 'info@realmpcs.com';
  var GOOGLE_VERSION = 'https://script.google.com/macros/s/AKfycbwFil-RiQujoffiDoBnGk6YvjLuyr1vaqCQKVUPtWT9NmGVQryPcwEsjIlieL93Yps/exec';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fallback() { return !(window.CS && window.CS.mode === 'signin'); }
  function plain(m) { return window.CS && CS.plain ? CS.plain(m) : String(m || ''); }
  function openGoogle() {
    if (window.CS && CS.openGoogle) { CS.openGoogle(); return; }
    var a = document.createElement('a'); a.href = 'https://accounts.google.com/AccountChooser?Email=' + encodeURIComponent(INFO) + '&continue=' + encodeURIComponent(GOOGLE_VERSION);
    a.target = '_top'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
  }
  function mount() {
    var d12 = $('due12'); if (!d12 || $('csWhatsApp')) return;
    var st = document.createElement('style'); st.id = 'csSplitCss';
    st.textContent = '.cs-split{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;max-width:100%}'
      + '.cs-split .cs-b{all:unset;box-sizing:border-box;flex:1 1 120px;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;min-width:44px;padding:0 12px;border-radius:12px;border:1px solid #334155;background:#0a0a0a;color:#e5e5e5;font:700 14px/1.1 system-ui,sans-serif;cursor:pointer;white-space:normal;text-align:center}'
      + '.cs-split .cs-b:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}.cs-split .cs-why{flex:1 1 100%;font-size:12px;color:#a3a3a3}'
      + '#csGPick{flex:1 1 100%;display:flex;flex-direction:column;gap:6px;font-size:13px;color:#d4d4d4}#csGPick:empty{display:none}#csGPick .cs-b{justify-content:flex-start;text-align:left}';
    document.head.appendChild(st);
    var box = document.createElement('div'); box.className = 'cs-split'; box.id = 'csSplit';
    box.innerHTML = '<button type="button" class="cs-b" id="csGDrive">\u2601 Google Drive</button><button type="button" class="cs-b" id="csWhatsApp">\ud83d\udcac WhatsApp</button>'
      + '<span class="cs-why" id="csSplitWhy">' + (fallback() ? 'Google Drive opens the Google version for now (the sign-in here isn\u2019t set up yet). WhatsApp: paste the group chat here.' : 'Google Drive finds this site\u2019s WhatsApp chat saved in Drive. WhatsApp: paste the group chat here.') + '</span><div id="csGPick" role="status"></div>';
    var row = d12.closest('.row') || d12.parentNode; row.parentNode.insertBefore(box, row.nextSibling);
    $('csWhatsApp').addEventListener('click', function () { var m = $('waModal'); if (m) { m.classList.add('on'); setTimeout(function () { var i = $('waIn'); if (i) i.focus(); }, 50); } });
    $('csGDrive').addEventListener('click', function (e) {
      if (fallback()) { e.preventDefault(); openGoogle(); return; }
      var out = $('csGPick'); out.textContent = 'Looking in Drive\u2026';
      google.script.run.withSuccessHandler(function (L) {
        if (!L || !L.length) { out.textContent = 'No WhatsApp chat for this site in Drive. In WhatsApp: group \u203a Export chat \u203a Without media \u203a save to Drive.'; return; }
        out.innerHTML = L.map(function (f, i) { return '<button type="button" class="cs-b" data-i="' + i + '">\ud83d\udcac ' + esc(f.name) + '</button>'; }).join('');
        out.onclick = function (ev) { var b = ev.target.closest('button[data-i]'); if (!b) return; var f = L[+b.getAttribute('data-i')]; out.textContent = 'Opening ' + f.name + '\u2026';
          google.script.run.withSuccessHandler(function (r) { out.textContent = ''; var m = $('waModal'), i = $('waIn'); if (m && i) { i.value = r.text || ''; m.classList.add('on'); var rd = $('waRead'); if (rd) rd.click(); } })
            .withFailureHandler(function (er) { out.textContent = plain(er && er.message || er); }).waRead(f.id); };
      }).withFailureHandler(function (er) { out.textContent = plain(er && er.message || er); }).waSources(($('site') || {}).value || '');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
