/* Anchor Studio (30 Oct 2026): what makes anchor.html more than a copy of Cert Studio. Loaded last (defer). No keys, no codes.
   Part 1: name and mic. The shared scripts still say Cert Studio in a few lines; on this page they say Anchor Studio.
   The mic button gets the SM7B-style podcast mic drawing (same art as the 29 Oct redraw), 44px tap. */
(function () {
  'use strict';
  if (window.AnchorStudio || (window.CSJobs && CSJobs.busy)) return;
  var A = window.AnchorStudio = { v: 1 };
  var $ = function (id) { return document.getElementById(id); };
  A.$ = $;
  A.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  A.css = function (id, t) { if ($(id)) return; var s = document.createElement('style'); s.id = id; s.textContent = t; document.head.appendChild(s); };
  A.el = function (tag, attrs, html) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }); if (html != null) e.innerHTML = html; return e; };

  /* ---- the name on screen ---- */
  try { if (window.Resume && Resume.register) Resume.register('cert', { name: 'Anchor Studio', page: 'anchor.html' }); } catch (e) {}
  var OLD = /Cert Studio/g, BAN = /\bloop\b/gi;
  function rename(root) {
    var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) { var v = n.nodeValue; if (OLD.test(v) || BAN.test(v)) { OLD.lastIndex = 0; BAN.lastIndex = 0; n.nodeValue = v.replace(OLD, 'Anchor Studio').replace(BAN, 'round'); } OLD.lastIndex = 0; BAN.lastIndex = 0; }
    [].forEach.call(document.querySelectorAll('[aria-label*="Cert Studio"],[title*="Cert Studio"]'), function (e) {
      ['aria-label', 'title'].forEach(function (k) { var v = e.getAttribute(k); if (v && v.indexOf('Cert Studio') >= 0) e.setAttribute(k, v.replace(OLD, 'Anchor Studio')); }); });
  }
  A.rename = rename;

  /* ---- the mic: SM7B-style podcast mic (no brand text), 44px ---- */
  var SM7B_IN = '<rect x="6.2" y="1.5" width="11.6" height="9.4" rx="4.2" fill="currentColor" fill-opacity=".3"/><path d="M8 4.7h8M7.8 7.8h8.4" stroke-width="1.6"/><path d="M8.9 10.9v2.3a1.5 1.5 0 0 0 1.5 1.5h3.2a1.5 1.5 0 0 0 1.5-1.5v-2.3"/><path d="M5.6 13.6a6.4 5.4 0 0 0 12.8 0" stroke-width="2.4"/><path d="M12 19.2v2.2M8.3 21.8h7.4"/>';
  A.SM7B = '<svg class="an-sm7b" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + SM7B_IN + '</svg>';
  function mic() {
    var host = $('asMic'); if (!host) return false;
    var b = host.querySelector('button'); if (!b) return false;
    if (!b.querySelector('.an-sm7b')) { var old = b.querySelector('svg'); var t = document.createElement('span'); t.innerHTML = A.SM7B; if (old) old.replaceWith(t.firstChild); else b.insertBefore(t.firstChild, b.firstChild); }
    b.style.minWidth = '44px'; b.style.minHeight = '44px';
    if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', 'Talk to the bots');
    return true;
  }
  A.mic = mic;

  var q = 0;
  function tick() { q = 0; rename(document.body); mic(); A.hooks.forEach(function (f) { try { f(); } catch (e) {} }); }
  A.hooks = [];
  A.soon = function () { if (!q) q = setTimeout(tick, 60); };
  if (window.MutationObserver) new MutationObserver(A.soon).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('load', A.soon); setTimeout(A.soon, 300); setTimeout(A.soon, 1500);
})();
