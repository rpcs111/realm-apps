/* Cert Studio, GitHub version: runs the round 6 Apps Script server files (certstudio/gas/) unchanged, in this worker,
   on the REST shim (gas-shim.js). The page talks to it through js/cs-gas.js (google.script.run stand-in).
   Starts only after the Google sign-in. Nothing here holds a key. */
'use strict';
importScripts('gas-shim.js?v=20261029-2');
var FILES = ['Addr.js', 'Amend.js', 'Code.js', 'Filing.js', 'Redo.js', 'Walkthrough.js'];
var loaded = false;
function loadServer() { if (loaded) return; FILES.forEach(function (f) { importScripts('gas/' + f + '?v=20261029-2'); }); loaded = true; }
var NOT_CALLABLE = /_$|^doGet$/;
var INFO = 'info@realmpcs.com';
// links going back to the page open as info@: Gmail's "first account" (/u/0/) becomes info@, Drive and Docs links get authuser=info@
function infoLinks_(v) { if (v.indexOf('.google.com/') < 0) return v;
  v = v.replace(/https:\/\/mail\.google\.com\/mail\/u\/[^/#?]+\//g, 'https://mail.google.com/mail/u/info@realmpcs.com/');
  return /^https:\/\/(drive|docs)\.google\.com\/\S*$/.test(v) ? asInfo_(v) : v; }
onmessage = function (e) {
  var m = e.data || {};
  if (m.type === 'token') { TOKEN = m.token || ''; ME = ''; if (m.props) PROPS = m.props; return; } // who it is always comes from Google, never from the page
  if (m.type !== 'call') return;
  var out = { type: 'reply', id: m.id };
  try {
    if (!TOKEN) throw new Error('Sign in as info@ first.');
    if (!ME) ME = String(api_('GET', 'oauth2/v3/userinfo').email || '').toLowerCase();
    // Drive, Diary and Email only ever run as info@: any other account is refused
    if (ME !== INFO) { var who = ME; ME = ''; throw new Error('Signed in as ' + (who || 'another account') + '. Cert Studio only uses info@. Tap \u201cSwitch to info@\u201d.'); }
    loadServer();
    var f = self[m.name];
    if (NOT_CALLABLE.test(m.name) || typeof f !== 'function') throw new Error('Not in the GitHub version: ' + m.name);
    var r = f.apply(null, m.args || []);
    out.ok = r === undefined ? null : JSON.parse(JSON.stringify(r, function (k, v) { return v instanceof Date ? v.toISOString() : typeof v === 'string' ? infoLinks_(v) : v; }));
  } catch (err) { out.err = String(err && err.message || err); }
  if (PROPS_DIRTY) { out.props = PROPS; PROPS_DIRTY = false; }
  postMessage(out);
};
