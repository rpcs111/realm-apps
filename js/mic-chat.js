/* Talk to the bots (28 Oct 2026, local test build). One cyan mic in the header opens a full-screen talk-or-type screen.
   Talk (the browser's own speech-to-text, Australian English) or type into the chat box, then Send.
   Where it goes: the same path as js/ara-button.js. Saved on THIS device first (localStorage 'mic_chat_outbox'),
   then sent to the Ara Engine capture inbox (append-only, no key, so no key in this repo), text tagged "[LIVE CHAT]".
   The bots read it from there. Replies are not pulled back into this page yet (there is no reply feed without a key).
   The chat history is kept on this device only (localStorage 'mic_chat_log_v1', last 100 lines). Nothing is emailed.
   A page opts in with one script tag. It mounts in "header" (or data-mount), or floats bottom-left if there is no header. */
(function () {
  'use strict';
  if (window.MicChat || window.top !== window) return;
  var API = 'https://script.google.com/macros/s/AKfycbxzrPy359CBlkbrYuR0-5xJB4GLXIQ6xNDIE6EFEb2xvnoY0n5sodcnljN4Ohqf4nWa/exec';
  var OUT = 'mic_chat_outbox', LOG = 'mic_chat_log_v1', TAG = '[LIVE CHAT]';
  var S = document.currentScript;
  var appName = (document.querySelector('meta[name="application-name"]') || {}).content || document.title || 'Realm';
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;

  function get(k) { try { var a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function put(k, a, max) { try { localStorage.setItem(k, JSON.stringify(max ? a.slice(-max) : a)); return true; } catch (e) { return false; } }
  function dev() { try { return localStorage.getItem('realm_device') || ''; } catch (e) { return ''; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hhmm(iso) { try { return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } }

  var MIC = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3.5"/></svg>';

  var css = ''
    + '#micChatBtn{all:unset;box-sizing:border-box;flex:0 0 44px;width:44px;height:44px;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;border:1px solid #22d3ee;background:#000;color:#22d3ee;cursor:pointer;-webkit-tap-highlight-color:transparent;margin-left:6px}'
    + '#micChatBtn:hover,#micChatBtn:focus-visible{background:#06202a;box-shadow:0 0 12px rgba(34,211,238,.55);outline:none}'
    + '#micChatBtn.fx{position:fixed;left:calc(12px + env(safe-area-inset-left));bottom:calc(14px + env(safe-area-inset-bottom));z-index:2147482500;width:52px;height:52px;flex-basis:52px;margin:0;box-shadow:0 4px 18px rgba(0,0,0,.6)}'
    + '#micChat{position:fixed;inset:0;z-index:2147483200;background:#000;color:#e5e5e5;display:flex;flex-direction:column;font:16px/1.4 system-ui,-apple-system,Roboto,sans-serif;color-scheme:dark}'
    + '#micChat[hidden]{display:none!important}'
    + '#micChat .mc-top{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top)) 12px 8px;border-bottom:1px solid #1f2937}'
    + '#micChat .mc-top b{flex:1 1 auto;min-width:0;font-size:16px;letter-spacing:.06em;color:#22d3ee}'
    + '#micChat .mc-top small{display:block;color:#a3a3a3;font:400 12px/1.3 system-ui,sans-serif;letter-spacing:0}'
    + '#micChat button{box-sizing:border-box;min-height:44px;min-width:44px;border-radius:12px;border:1px solid #334155;background:#0a0a0a;color:#e5e5e5;font:700 15px/1 system-ui,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}'
    + '#micChat button:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}'
    + '#micChat .mc-log{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px;display:flex;flex-direction:column;gap:8px;max-width:760px;width:100%;margin:0 auto;box-sizing:border-box}'
    + '#micChat .mc-empty{color:#a3a3a3;font-size:14px;margin:auto 0;text-align:center}'
    + '#micChat .mc-msg{align-self:flex-end;max-width:85%;background:#06202a;border:1px solid #22d3ee;border-radius:14px 14px 4px 14px;padding:8px 12px;white-space:pre-wrap;overflow-wrap:anywhere}'
    + '#micChat .mc-msg i{display:block;font-style:normal;color:#a3a3a3;font-size:12px;margin-top:4px}'
    + '#micChat .mc-bot{align-self:flex-start;background:#0a0a0a;border-color:#334155;border-radius:14px 14px 14px 4px}'
    + '#micChat .mc-foot{flex:0 0 auto;border-top:1px solid #1f2937;padding:10px 12px calc(10px + env(safe-area-inset-bottom));max-width:760px;width:100%;margin:0 auto;box-sizing:border-box}'
    + '#micChat textarea{display:block;width:100%;box-sizing:border-box;min-height:72px;max-height:34vh;margin:0 0 8px;border-radius:12px;border:1px solid #334155;background:#0a0a0a;color:#fff;font:16px/1.4 system-ui,sans-serif;padding:10px;resize:vertical}'
    + '#micChat textarea:focus{border-color:#22d3ee;outline:none}'
    + '#micChat .mc-row{display:flex;gap:8px}'
    + '#micChat #mcTalk{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:0 16px;border-color:#22d3ee;color:#22d3ee;min-height:52px}'
    + '#micChat #mcTalk.on{background:#22d3ee;color:#000;box-shadow:0 0 16px rgba(34,211,238,.6)}'
    + '#micChat #mcSend{flex:1 1 auto;min-height:52px;background:#22d3ee;border-color:#22d3ee;color:#000}'
    + '#micChat #mcSend[disabled]{opacity:.45;cursor:default}'
    + '#micChat .mc-status{min-height:1.3em;margin-top:6px;color:#cbd5e1;font-size:13px}';

  var btn, ov, logEl, ta, sendB, talkB, stat, rec = null, listening = false, base = '', sending = false, timer = null, fails = 0, lastFocus = null;

  function say(t) { if (stat) stat.textContent = t; }
  function render() {
    if (!logEl) return;
    var log = get(LOG), wait = {};
    get(OUT).forEach(function (x) { wait[x.id] = 1; });
    if (!log.length) { logEl.innerHTML = '<p class="mc-empty">Tap Talk and say it, or type it. Saved for Ara. Ara passes it to 42*.</p>'; return; }
    logEl.innerHTML = log.map(function (m) {
      var st = wait[m.id] ? 'On this phone, sending\u2026' : 'Sent';
      return '<div class="mc-msg' + (m.who === 'bot' ? ' mc-bot' : '') + '">' + esc(m.text) + '<i>' + esc(hhmm(m.ts)) + (m.who === 'bot' ? '' : ' \u00b7 ' + st) + '</i></div>';
    }).join('');
    logEl.scrollTop = logEl.scrollHeight;
  }
  function later(ms) { clearTimeout(timer); timer = setTimeout(flush, ms); }
  function flush() {
    clearTimeout(timer);
    var q = get(OUT); if (!q.length || sending) return Promise.resolve();
    if (navigator.onLine === false) { say('Saved on this phone. It sends when you are back online.'); return Promise.resolve(); }
    sending = true;
    var items = q.slice(0, 50).map(function (x) { return { id: x.id, text: x.text, category: 'Ara', ts: x.ts }; });
    return fetch(API, { method: 'POST', body: JSON.stringify({ app: 'capture', items: items }) })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error('not saved');
        var done = {}; (j.saved || []).concat(j.dupes || []).forEach(function (id) { done[id] = 1; });
        put(OUT, get(OUT).filter(function (x) { return !done[x.id]; })); fails = 0;
        say('\u2713 Saved for Ara');
      })
      .catch(function () { fails++; say('Saved on this phone. It keeps trying by itself.'); later(Math.min(300000, 10000 * Math.pow(2, Math.min(fails - 1, 5)))); })
      .then(function () { sending = false; render(); });
  }
  function send() {
    var v = (ta.value || '').trim(); if (!v) return;
    stopTalk();
    var id = 'mic_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), ts = new Date().toISOString(), d = dev();
    var q = get(OUT); q.push({ id: id, text: (TAG + ' [' + appName + (d ? ' \u00b7 ' + d : '') + '] ' + v).slice(0, 2000), ts: ts });
    var log = get(LOG); log.push({ id: id, who: 'me', text: v.slice(0, 2000), ts: ts });
    if (!put(OUT, q) || !put(LOG, log, 100)) { say('This phone is out of space, so it was not saved.'); return; }
    ta.value = ''; base = ''; sync(); render(); say('Sending\u2026'); try { ta.focus(); } catch (e) {} flush();
  }
  function sync() { if (sendB) sendB.disabled = !(ta.value || '').trim(); }
  function setTalk(on) { listening = on; if (!talkB) return; talkB.classList.toggle('on', on); talkB.setAttribute('aria-pressed', on ? 'true' : 'false'); talkB.querySelector('span').textContent = on ? 'Stop' : 'Talk'; }
  function stopTalk() { if (rec && listening) { try { rec.stop(); } catch (e) {} } setTalk(false); }
  function startTalk() {
    if (!SR) { say('Talk is not on this browser. Use the keyboard mic instead.'); try { ta.focus(); } catch (e) {} return; }
    if (!rec) {
      rec = new SR(); rec.lang = 'en-AU'; rec.continuous = true; rec.interimResults = true;
      /* Rebuild from every result in this listening session each time, so finished words are never doubled or lost. */
      rec.onresult = function (e) {
        var said = [];
        for (var i = 0; i < e.results.length; i++) { var t = (e.results[i][0].transcript || '').trim(); if (t) said.push(t); }
        var heard = said.join(' ');
        ta.value = base + (base && heard ? ' ' : '') + heard; sync();
      };
      rec.onerror = function (e) { setTalk(false); say(e && (e.error === 'not-allowed' || e.error === 'service-not-allowed') ? 'The mic is blocked. Allow it for this app, or type instead.' : 'The mic stopped. Tap Talk to go again.'); };
      rec.onend = function () { if (listening) setTalk(false); };
    }
    base = (ta.value || '').trim();
    try { rec.start(); setTalk(true); say('Listening\u2026 tap Stop when you are done.'); } catch (e) { setTalk(false); say('The mic did not start. Tap Talk again.'); }
  }
  function open() {
    lastFocus = document.activeElement; ov.hidden = false; render(); sync();
    try { document.documentElement.style.overflow = 'hidden'; } catch (e) {}
    var n = get(OUT).length; say(n ? n + (n === 1 ? ' message' : ' messages') + ' still sending.' : '');
    if (/[?&]talk=1\b/.test(location.search)) startTalk(); else setTimeout(function () { try { ta.focus(); } catch (e) {} }, 50);
    flush();
  }
  function close() { stopTalk(); ov.hidden = true; try { document.documentElement.style.overflow = ''; } catch (e) {} try { if (lastFocus && lastFocus.focus) lastFocus.focus(); else btn.focus(); } catch (e) {} }
  function init() {
    if (document.getElementById('micChatBtn')) return;
    var st = document.createElement('style'); st.id = 'micChatCss'; st.textContent = css; document.head.appendChild(st);
    btn = document.createElement('button'); btn.type = 'button'; btn.id = 'micChatBtn';
    btn.setAttribute('aria-label', 'Talk to the bots'); btn.title = 'Talk to the bots'; btn.setAttribute('aria-haspopup', 'dialog');
    btn.innerHTML = MIC;
    var sel = (S && S.getAttribute('data-mount')) || 'header', host = document.querySelector(sel);
    if (host) host.appendChild(btn); else { btn.className = 'fx'; document.body.appendChild(btn); }
    ov = document.createElement('div'); ov.id = 'micChat'; ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'mcTitle');
    ov.innerHTML = '<div class="mc-top"><b id="mcTitle">TALK TO THE BOTS<small>Saved for Ara. Ara passes it to 42*. Nothing is emailed.</small></b><button type="button" id="mcClose" aria-label="Close">Close</button></div>'
      + '<div class="mc-log" id="mcLog" aria-live="polite"></div>'
      + '<div class="mc-foot"><textarea id="mcText" placeholder="Say it or type it\u2026" aria-label="Message for the bots" enterkeyhint="send"></textarea>'
      + '<div class="mc-row"><button type="button" id="mcTalk" aria-pressed="false">' + MIC + '<span>Talk</span></button><button type="button" id="mcSend" disabled>Send</button></div>'
      + '<div class="mc-status" id="mcStatus" role="status" aria-live="polite"></div></div>';
    document.body.appendChild(ov);
    logEl = ov.querySelector('#mcLog'); ta = ov.querySelector('#mcText'); sendB = ov.querySelector('#mcSend'); talkB = ov.querySelector('#mcTalk'); stat = ov.querySelector('#mcStatus');
    if (!SR) talkB.title = 'Talk is not on this browser. Use the keyboard mic.';
    btn.addEventListener('click', open);
    ov.querySelector('#mcClose').addEventListener('click', close);
    talkB.addEventListener('click', function () { if (listening) stopTalk(); else startTalk(); });
    sendB.addEventListener('click', send);
    ta.addEventListener('input', function () { if (!listening) base = ta.value; sync(); });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia && matchMedia('(pointer:fine)').matches) { e.preventDefault(); send(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov && !ov.hidden) { e.preventDefault(); close(); } });
    ov.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = ov.querySelectorAll('button:not([disabled]),textarea'); if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
    addEventListener('online', function () { flush(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') flush(); else stopTalk(); });
    if (/[?&](talk|chat)=1\b/.test(location.search)) open(); else if (get(OUT).length) later(1500);
  }
  window.MicChat = { open: function () { if (ov) open(); }, close: function () { if (ov) close(); }, flush: flush };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
