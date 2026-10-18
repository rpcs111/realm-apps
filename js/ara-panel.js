/* Ara panel. One shared file: behaviour and CSS live here, and a page opts in with a single script tag.
   It does not draw a second always-on control. It opens from the page's existing Ara symbol.

   Which links: the hub's main tiles, the list Ange named.
   index.html ARA_APPS plus Notes and Hub: Queue, Realm Flow Map, Layers, ETA, Nova, Cert Studio, Private, Notes, Hub.
   queue.html's footer says "Layer 1: queue only." layers.html calls Layer 1 the base queue board (queue.html).
   That is the queue step. This bar is the hub list, not that narrower board.
   Cert Studio Test sits in ARA_APPS and is not a button here. Search Studio is not a button here.
   Cert Studio on this bar is cert.html, the hub tile.

   Send to Notes writes localStorage realm_scribe_v1 with the same object shape notes.html saveNote() stores,
   so the Notes page on this device shows the line. */
(function () {
  'use strict';
  if (window.AraPanel) return;

  var LINKS = [
    ['Queue', 'queue.html'],
    ['Realm Flow Map', 'metatron3.html'],
    ['Layers', 'layers.html'],
    ['ETA', 'eta.html'],
    ['Nova', 'nova.html'],
    ['Cert Studio', 'cert.html'],
    ['Private', 'private.html'],
    ['Notes', 'notes.html'],
    ['Hub', 'index.html']
  ];
  var NOTE_KEY = 'realm_scribe_v1';

  var css = ''
    + '#araPanel{position:fixed;z-index:2147482400;left:50%;transform:translateX(-50%);'
    + 'bottom:calc(72px + env(safe-area-inset-bottom));width:min(640px,calc(100% - 24px));'
    + 'box-sizing:border-box;margin:0;padding:8px;background:#000;color:#fff;color-scheme:dark;'
    + 'border:1px solid #fff;border-radius:22px;font:600 13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;'
    + 'box-shadow:0 8px 24px rgba(0,0,0,.45)}'
    + '#araPanel[hidden]{display:none!important}'
    + '#araPanel .ara-p-row{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;overflow-y:hidden;'
    + '-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:thin}'
    + '#araPanel .ara-p-row a{flex:0 0 auto;box-sizing:border-box;min-height:44px;min-width:44px;padding:0 14px;'
    + 'display:inline-flex;align-items:center;justify-content:center;border-radius:999px;'
    + 'border:1px solid #fff;background:#000;color:#fff;text-decoration:none;white-space:nowrap;'
    + '-webkit-tap-highlight-color:transparent}'
    + '#araPanel .ara-p-row a:focus-visible{outline:2px solid #fff;outline-offset:2px}'
    + '#araPanel .ara-p-send{display:flex;align-items:center;gap:6px;margin-top:6px}'
    + '#araPanel .ara-p-send input{flex:1;min-width:0;box-sizing:border-box;min-height:44px;margin:0;'
    + 'padding:0 14px;border-radius:999px;border:1px solid #fff;background:#000;color:#fff;'
    + 'font:16px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}'
    + '#araPanel .ara-p-send input::placeholder{color:#a3a3a3}'
    + '#araPanel .ara-p-send input:focus-visible{outline:2px solid #fff;outline-offset:2px}'
    + '#araPanel .ara-p-send button{flex:0 0 auto;box-sizing:border-box;min-height:44px;padding:0 14px;'
    + 'border-radius:999px;border:1px solid #fff;background:#fff;color:#000;font:700 13px/1 system-ui,-apple-system,sans-serif;'
    + 'white-space:nowrap;cursor:pointer;-webkit-tap-highlight-color:transparent}'
    + '#araPanel .ara-p-send button:focus-visible{outline:2px solid #fff;outline-offset:2px}'
    + '#araPanel .ara-p-msg{margin:6px 2px 0;min-height:0;color:#d4d4d4;font:500 12px/1.3 system-ui,sans-serif}'
    + '#araPanel .ara-p-msg:empty{display:none}';

  function symbol() {
    return document.getElementById('araSym') || document.getElementById('ara') || document.getElementById('arbBtn');
  }

  function readNotes() {
    try {
      var cur = JSON.parse(localStorage.getItem(NOTE_KEY));
      return Array.isArray(cur) ? cur : [];
    } catch (e) {
      return [];
    }
  }

  /* Same fields and title/body split as notes.html saveNote(). */
  function pushNote(v) {
    var lines = v.split('\n');
    var n = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: lines[0].slice(0, 140),
      note: (lines.length > 1 || lines[0].length > 140) ? v : '',
      done: false,
      from: 'Ange',
      urgent: false,
      owner: 'Ange',
      att: [],
      ts: Date.now(),
      mt: Date.now()
    };
    var notes = readNotes();
    notes.push(n);
    try {
      localStorage.setItem(NOTE_KEY, JSON.stringify(notes));
      return true;
    } catch (e) {
      return false;
    }
  }

  function boot() {
    if (document.getElementById('araPanel')) return;
    var sym = symbol();
    if (!sym) return;
    var st = document.createElement('style');
    st.id = 'araPanelCss';
    st.textContent = css;
    document.head.appendChild(st);

    var panel = document.createElement('div');
    panel.id = 'araPanel';
    panel.hidden = true;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Ara panel');
    var row = document.createElement('div');
    row.className = 'ara-p-row';
    LINKS.forEach(function (pair) {
      var a = document.createElement('a');
      a.setAttribute('href', pair[1]);
      a.textContent = pair[0];
      row.appendChild(a);
    });
    var form = document.createElement('form');
    form.className = 'ara-p-send';
    form.id = 'araPanelSend';
    var input = document.createElement('input');
    input.id = 'araPanelIn';
    input.type = 'text';
    input.maxLength = 2000;
    input.autocomplete = 'off';
    input.placeholder = 'Send to Notes';
    input.setAttribute('aria-label', 'Send to Notes');
    var btn = document.createElement('button');
    btn.type = 'submit';
    btn.textContent = 'Send to Notes';
    var msg = document.createElement('p');
    msg.className = 'ara-p-msg';
    msg.id = 'araPanelMsg';
    msg.setAttribute('role', 'status');
    form.appendChild(input);
    form.appendChild(btn);
    panel.appendChild(row);
    panel.appendChild(form);
    panel.appendChild(msg);
    document.body.appendChild(panel);

    sym.setAttribute('aria-expanded', 'false');
    sym.setAttribute('aria-controls', 'araPanel');

    function say(t) { msg.textContent = t || ''; }
    function open() {
      panel.hidden = false;
      sym.setAttribute('aria-expanded', 'true');
    }
    function close() {
      panel.hidden = true;
      sym.setAttribute('aria-expanded', 'false');
    }
    function toggle() { if (panel.hidden) open(); else close(); }

    sym.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
    document.addEventListener('pointerdown', function (e) {
      if (panel.hidden) return;
      var t = e.target;
      if (t === sym || (sym.contains && sym.contains(t))) return;
      if (panel.contains(t)) return;
      close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) {
        e.preventDefault();
        close();
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) { say('Type a note first.'); return; }
      if (!pushNote(v)) { say('This browser is not saving.'); return; }
      input.value = '';
      say('Saved on this device.');
    });

    window.AraPanel = { open: open, close: close, toggle: toggle, links: LINKS.slice(), noteKey: NOTE_KEY };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
