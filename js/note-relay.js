/* Note relay (17 Oct 2026). Notes app buttons ELON / IVOR / ARA / NOVA: one tap = save the note AND send it to that helper.
   Same path as the TELL ARA button (js/ara-button.js): saved on THIS device first (localStorage 'note_relay_outbox', never trimmed),
   then POSTed to the Ara Engine capture inbox -> private sheet "ARA CAPTURE INBOX" in info@ Drive (append-only).
   Each row's text starts with the helper's tag, so each helper filters on it:
     ELON -> "[ELON CHECK]" (category 'Elon')   IVOR -> "[IVOR]" (category 'Ivor')
     ARA  -> "[FOR ARA]"    (category 'Ara')    NOVA -> "[NOVA JOB]" (category 'Nova')
   The Engine keeps 'Ara' and 'Nova'; it stores '?' for 'Elon'/'Ivor' until they are added to its list, so use the text tag.
   Batches of up to 50; retries by itself (10s, 20s, 40s ... 5 min, plus back online / app reopened) until the Engine confirms
   each id; the Engine dedupes ids, so a retry never writes a row twice. Nothing is emailed. No key in this repo. */
(function () {
  'use strict';
  if (window.NoteRelay) return;
  var API = 'https://script.google.com/macros/s/AKfycbxzrPy359CBlkbrYuR0-5xJB4GLXIQ6xNDIE6EFEb2xvnoY0n5sodcnljN4Ohqf4nWa/exec';
  var OUT = 'note_relay_outbox';
  var T = { elon: { tag: '[ELON CHECK]', cat: 'Elon', name: 'Elon' }, ivor: { tag: '[IVOR]', cat: 'Ivor', name: 'Ivor' },
            ara: { tag: '[FOR ARA]', cat: 'Ara', name: 'Ara' }, nova: { tag: '[NOVA JOB]', cat: 'Nova', name: 'Nova' } };
  var sending = false, fails = 0, timer = null, subs = [], last = '';
  function rd() { try { var a = JSON.parse(localStorage.getItem(OUT) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function wr(a) { try { localStorage.setItem(OUT, JSON.stringify(a)); return true; } catch (e) { return false; } }
  function dev() { try { return localStorage.getItem('realm_device') || (location.search.match(/[?&]d=([A-Za-z0-9_-]{1,20})/) || [])[1] || ''; } catch (e) { return ''; } }
  function app() { return (document.querySelector('meta[name="application-name"]') || {}).content || document.title || 'Realm'; }
  function emit(ev) { last = ev.state; subs.forEach(function (f) { try { f(ev); } catch (e) {} }); }
  function later(ms) { clearTimeout(timer); timer = setTimeout(flush, ms); }
  /* queue('elon'|'ivor'|'ara'|'nova', noteId, title, body) -> true if saved on the device */
  function queue(who, noteId, title, body) {
    var t = T[who]; if (!t) return false;
    var q = rd(), id = (who + '_' + String(noteId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)))).replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 64);
    for (var i = 0; i < q.length; i++) if (q[i].id === id) return true;
    var d = dev(), txt = t.tag + ' [' + app() + (d ? ' \u00b7 ' + d : '') + '] ' + (title || '') + (body && body !== title ? '\n' + body : '');
    q.push({ id: id, who: who, noteId: noteId || '', text: txt.slice(0, 2000), ts: new Date().toISOString() });
    if (!wr(q)) return false;
    emit({ state: 'queued', pending: q.length });
    if (!sending) later(400); /* short pause so a burst of taps goes in one request */
    return true;
  }
  function flush() {
    clearTimeout(timer);
    var q = rd(); if (!q.length) { fails = 0; return Promise.resolve(); }
    if (sending) return Promise.resolve();
    if (navigator.onLine === false) { emit({ state: 'offline', pending: q.length }); return Promise.resolve(); }
    sending = true;
    var batch = q.slice(0, 50), items = batch.map(function (x) { return { id: x.id, text: x.text, category: (T[x.who] || T.ara).cat, ts: x.ts }; });
    return fetch(API, { method: 'POST', body: JSON.stringify({ app: 'capture', items: items }) })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error(j && j.error || 'not saved');
        var done = {}, landed = []; (j.saved || []).concat(j.dupes || []).forEach(function (id) { done[id] = 1; });
        batch.forEach(function (x) { if (done[x.id]) landed.push({ who: x.who, noteId: x.noteId }); });
        var rest = rd().filter(function (x) { return !done[x.id]; }); wr(rest);
        fails = 0; sending = false;
        emit({ state: 'landed', landed: landed, pending: rest.length });
        if (rest.length) later(300);
      })
      .catch(function (e) {
        sending = false; fails++;
        var wait = Math.min(300000, 10000 * Math.pow(2, Math.min(fails - 1, 5)));
        emit({ state: 'waiting', pending: rd().length, retryIn: wait, error: String(e && e.message || e) });
        later(wait);
      });
  }
  window.addEventListener('online', function () { fails = 0; flush(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) flush(); });
  window.NoteRelay = { queue: queue, flush: function () { fails = 0; return flush(); }, pending: function () { return rd().length; },
    onChange: function (f) { subs.push(f); }, state: function () { return last; }, TARGETS: T, OUTBOX: OUT };
  setTimeout(flush, 1500);
})();
