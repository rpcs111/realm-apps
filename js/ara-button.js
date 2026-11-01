/* Ara button (16 Oct 2026). Loaded automatically by js/saveapp.js on every Realm app, so installed apps get it on next open.
   Type a message -> saved on this device first (localStorage 'ara_button_outbox') -> sent to the Ara Engine capture inbox
   (private sheet ARA CAPTURE INBOX in info@ Drive, category 'Ara', append-only). Ara reads it from there.
   Nothing is emailed or sent anywhere else. No key needed (append-only inbox), so no key in this repo. */
(function () {
  'use strict';
  if (window.AraButton || window.top !== window) return;
  var API = 'https://script.google.com/macros/s/AKfycbxzrPy359CBlkbrYuR0-5xJB4GLXIQ6xNDIE6EFEb2xvnoY0n5sodcnljN4Ohqf4nWa/exec';
  var OUT = 'ara_button_outbox', S = document.currentScript;
  var appName = (document.querySelector('meta[name="application-name"]') || {}).content || document.title || location.pathname.split('/').pop();
  function devTag() { try { return localStorage.getItem('realm_device') || ''; } catch (e) { return ''; } }
  function rd() { try { var a = JSON.parse(localStorage.getItem(OUT) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function wr(a) { try { localStorage.setItem(OUT, JSON.stringify(a.slice(-200))); return true; } catch (e) { return false; } }
  var css = '#arbBtn{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:999px;border:1px solid #a78bfa;background:#000;color:#ede9fe;font:800 12px/1 system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;flex:0 0 auto;margin-left:8px}' +
    '#arbBtn:hover,#arbBtn:focus-visible{background:#1e1b2e;box-shadow:0 0 14px rgba(167,139,250,.5)}#arbBtn i{font-style:normal;background:#a78bfa;color:#000;border-radius:999px;min-width:16px;height:16px;font-size:10px;display:inline-flex;align-items:center;justify-content:center;padding:0 4px}' +
    '#arbBtn.fx{position:fixed;right:calc(12px + env(safe-area-inset-right));bottom:calc(14px + env(safe-area-inset-bottom));z-index:2147482500;height:52px;min-width:52px;padding:0 14px;justify-content:center;box-shadow:0 4px 18px rgba(0,0,0,.6);background:#1e1b2e}' +
    '#arbSheet{position:fixed;inset:0;z-index:2147483100;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}#arbSheet[hidden]{display:none}' +
    '#arbSheet form{width:100%;max-width:560px;background:#0b0f1a;color:#e4e4e7;border:1px solid #00aeef;border-radius:16px 16px 0 0;padding:14px 14px calc(14px + env(safe-area-inset-bottom));font:15px system-ui,sans-serif;box-sizing:border-box;box-shadow:0 0 28px rgba(0,174,239,.28)}' +
    '#arbSheet b{font-size:17px;color:#00aeef}#arbSheet textarea{width:100%;box-sizing:border-box;min-height:110px;margin:10px 0;border-radius:12px;border:1px solid #334155;background:#000;color:#fff;font:16px system-ui,sans-serif;padding:10px;resize:vertical}#arbSheet textarea:focus{border-color:#00aeef;outline:none}' +
    '#arbSheet .r{display:flex;gap:8px}#arbSheet button{min-height:48px;border-radius:12px;border:0;font:800 16px system-ui,sans-serif;cursor:pointer}#arbSend{flex:1;background:#7c3aed;color:#fff}#arbX{padding:0 16px;background:#1f2937;color:#e4e4e7}' +
    '#arbMsg{min-height:1.2em;color:#cbd5e1;font-size:13px;margin-top:8px}';
  var btn, sheet, ta, msg, sending = false;
  function count() { if (!btn) return; var n = rd().length; var i = btn.querySelector('i'); if (n) { if (!i) { i = document.createElement('i'); btn.appendChild(i); } i.textContent = n; i.title = n + ' waiting to reach the apps team'; } else if (i) i.remove(); }
  function say(t) { if (msg) msg.textContent = t; }
  function flush() {
    var q = rd(); if (!q.length || sending) return Promise.resolve();
    if (navigator.onLine === false) { say('Saved on this device. Sends to the apps team when you are back online.'); return Promise.resolve(); }
    sending = true;
    var items = q.slice(0, 50).map(function (x) { return { id: x.id, text: x.text, category: 'Ara', ts: x.ts }; });
    return fetch(API, { method: 'POST', body: JSON.stringify({ app: 'capture', items: items }) })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error(j && j.error || 'not saved');
        var done = {}; (j.saved || []).concat(j.dupes || []).forEach(function (id) { done[id] = 1; });
        wr(rd().filter(function (x) { return !done[x.id]; })); count();
        say('\u2713 The apps team has it.');
      })
      .catch(function () { say('Saved on this device \u2014 it reaches the apps team once sending is allowed (it retries by itself).'); })
      .then(function () { sending = false; });
  }
  function open() { sheet.hidden = false; say(rd().length ? rd().length + ' message(s) waiting to reach the apps team.' : ''); setTimeout(function () { try { ta.focus(); } catch (e) {} }, 50); }
  function close() { sheet.hidden = true; }
  function init() {
    if (document.getElementById('arbBtn')) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    btn = document.createElement('button'); btn.type = 'button'; btn.id = 'arbBtn'; btn.setAttribute('aria-label', 'Message the apps team'); btn.title = 'Type a message to the apps team';
    btn.appendChild(document.createTextNode('TELL APPS'));
    var save = document.getElementById('araSave');
    var inline = window.innerWidth >= 600 && save && save.className !== 'fx' && save.parentNode;
    if (inline) save.parentNode.insertBefore(btn, save); else { btn.className = 'fx'; document.body.appendChild(btn); }
    if (inline) btn.style.marginLeft = 'auto';
    if (inline && save.className === 'ap') save.style.marginLeft = '8px';
    sheet = document.createElement('div'); sheet.id = 'arbSheet'; sheet.hidden = true; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Message the apps team');
    sheet.innerHTML = '<form><b>Message the apps team</b><div style="color:#94a3b8;font-size:13px">From ' + appName.replace(/[<>&"]/g, '') + '. Saved on this device first, then goes to the apps team\u2019s inbox. Nothing is emailed.</div>' +
      '<textarea id="arbText" placeholder="Type (or use the keyboard mic) \u2026" aria-label="Message for the apps team"></textarea>' +
      '<div class="r"><button type="submit" id="arbSend">Send</button><button type="button" id="arbX">Close</button></div><div id="arbMsg" role="status" aria-live="polite"></div></form>';
    document.body.appendChild(sheet);
    ta = sheet.querySelector('#arbText'); msg = sheet.querySelector('#arbMsg');
    btn.addEventListener('click', open);
    sheet.querySelector('#arbX').addEventListener('click', close);
    sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) close(); });
    sheet.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault(); var t = ta.value.trim(); if (!t) { say('Type something first.'); return; }
      var q = rd(); q.push({ id: 'ara_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), text: ('[' + appName + (devTag() ? ' \u00b7 ' + devTag() : '') + '] ' + t).slice(0, 2000), dev: devTag(), ts: new Date().toISOString() });
      if (!wr(q)) { say('This browser is not saving (private mode?).'); return; }
      ta.value = ''; count(); say('Saved on this device. Sending\u2026'); flush();
    });
    if (!inline) lift();
    count(); flush();
  }
  /* phone: round button bottom-right, sitting above any pinned bottom bar (Notes / Search input) */
  function lift() {
    var y = 14, x = window.innerWidth - 30, h = window.innerHeight;
    btn.style.visibility = 'hidden';
    for (var yy = 20; yy < 160; yy += 10) {
      var el = document.elementFromPoint(x, h - yy), fixed = false;
      for (var n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) { var pos = getComputedStyle(n).position; if (pos === 'fixed' || pos === 'sticky') { fixed = true; break; } }
      if (fixed) y = yy + 14; else if (yy > 20) break;
    }
    btn.style.visibility = '';
    btn.style.bottom = 'calc(' + y + 'px + env(safe-area-inset-bottom))';
  }
  window.addEventListener('online', flush);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) flush(); });
  window.AraButton = { open: function () { if (sheet) open(); }, flush: flush };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); }); else setTimeout(init, 0);
})();
