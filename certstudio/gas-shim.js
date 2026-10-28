/* Cert Studio, GitHub version: the Apps Script services the round 6 server files use, rebuilt on Google's REST APIs.
   Runs only inside certstudio/worker.js, only after the Google sign-in (token from the page). Synchronous XHR is allowed in a worker,
   so the server files run unchanged. No keys or ids in this file: the calendar, root folder and sheet are found by name after sign-in.
   Email is draft-only (there is no send here). Nothing is deleted. */
'use strict';
var TOKEN = '', ME = '', PROPS = {}, PROPS_DIRTY = false, CACHE = {};
var API = 'https://www.googleapis.com/';
function api_(method, url, body, opt) {
  opt = opt || {};
  var x = new XMLHttpRequest();
  x.open(method, url.indexOf('http') === 0 ? url : API + url, false);
  x.setRequestHeader('Authorization', 'Bearer ' + TOKEN);
  if (opt.type) x.setRequestHeader('Content-Type', opt.type);
  if (opt.bin) x.responseType = 'arraybuffer';
  x.send(body == null ? null : body);
  if (x.status === 401) throw new Error('The Google sign-in has run out. Tap "Sign in as info@" again.');
  if (x.status < 200 || x.status >= 300) {
    var m = ''; try { m = JSON.parse(x.responseText).error.message; } catch (e) { m = 'HTTP ' + x.status; }
    throw new Error('Google said no: ' + m);
  }
  if (opt.bin) return new Uint8Array(x.response);
  if (opt.raw) return x.responseText;
  return x.responseText ? JSON.parse(x.responseText) : {};
}
function qs_(o) { return Object.keys(o).filter(function (k) { return o[k] != null; }).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(o[k]); }).join('&'); }
function iter_(arr) { var i = 0; return { hasNext: function () { return i < arr.length; }, next: function () { if (i >= arr.length) throw new Error('No more items.'); return arr[i++]; } }; }
function lazyIter_(pageFn) { // Drive search pages fetched as needed
  var buf = [], tok = null, done = false;
  function fill() { while (!buf.length && !done) { var r = pageFn(tok); buf = r.items || []; tok = r.nextPageToken || null; if (!tok) done = true; } }
  return { hasNext: function () { fill(); return buf.length > 0; }, next: function () { fill(); if (!buf.length) throw new Error('No more items.'); return buf.shift(); } };
}
/* ---------- bytes ---------- */
function toU8_(b) { if (b instanceof Uint8Array) return b; if (typeof b === 'string') return new TextEncoder().encode(b); return Uint8Array.from(b || [], function (v) { return v & 255; }); }
function toSigned_(u8) { var a = new Array(u8.length); for (var i = 0; i < u8.length; i++) a[i] = u8[i] > 127 ? u8[i] - 256 : u8[i]; return a; }
function b64_(u8) { var s = '', C = 0x8000; for (var i = 0; i < u8.length; i += C) s += String.fromCharCode.apply(null, u8.subarray(i, i + C)); return btoa(s); }
function unb64_(s) { s = String(s || '').replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''); var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function Blob_(bytes, type, name) {
  var u8 = toU8_(bytes), t = type || 'application/octet-stream', n = name || '';
  var o = {
    getBytes: function () { return toSigned_(u8); }, _u8: function () { return u8; },
    getDataAsString: function () { return new TextDecoder('utf-8').decode(u8); },
    getContentType: function () { return t; }, setContentType: function (v) { t = v; return o; },
    getName: function () { return n; }, setName: function (v) { n = v; return o; }, getBlob: function () { return o; }
  };
  return o;
}
/* ---------- Drive (v2 REST: same query words as DriveApp) ---------- */
// every Drive link handed to the page opens as info@ (never another Realm account that happens to be signed in to the browser)
function asInfo_(u) { u = String(u || ''); if (!/^https:\/\/(drive|docs)\.google\.com\//.test(u)) return u;
  u = u.replace(/([?&])authuser=[^&#]*&?/g, '$1').replace(/[?&]$/, ''); return u + (u.indexOf('?') < 0 ? '?' : '&') + 'authuser=info%40realmpcs.com'; }
var FIELDS = 'id,title,mimeType,modifiedDate,createdDate,fileSize,alternateLink,parents(id),labels(trashed),description';
var META = {};
function dmeta_(id) { if (!META[id]) META[id] = api_('GET', 'drive/v2/files/' + encodeURIComponent(id) + '?' + qs_({ fields: FIELDS, supportsAllDrives: true })); return META[id]; }
function isFolder_(m) { return m.mimeType === 'application/vnd.google-apps.folder'; }
function wrap_(m) { META[m.id] = m; return isFolder_(m) ? Folder_(m.id) : File_(m.id); }
function search_(q) {
  return lazyIter_(function (tok) {
    var r = api_('GET', 'drive/v2/files?' + qs_({ q: q, maxResults: 200, pageToken: tok, fields: 'nextPageToken,items(' + FIELDS + ')', supportsAllDrives: true, includeItemsFromAllDrives: true }));
    r.items = (r.items || []).map(wrap_); return r;
  });
}
function common_(id) {
  return {
    getId: function () { return id; }, getName: function () { return dmeta_(id).title; },
    getUrl: function () { return asInfo_(dmeta_(id).alternateLink || ('https://drive.google.com/open?id=' + id)); },
    getLastUpdated: function () { return new Date(dmeta_(id).modifiedDate); }, getDateCreated: function () { return new Date(dmeta_(id).createdDate); },
    getDescription: function () { return dmeta_(id).description || ''; },
    getParents: function () { return iter_((dmeta_(id).parents || []).map(function (p) { return Folder_(p.id); })); },
    isTrashed: function () { return !!(dmeta_(id).labels || {}).trashed; },
    setName: function (n) { META[id] = api_('PATCH', 'drive/v2/files/' + id + '?' + qs_({ fields: FIELDS, supportsAllDrives: true }), JSON.stringify({ title: n }), { type: 'application/json' }); return this; },
    setDescription: function (d) { META[id] = api_('PATCH', 'drive/v2/files/' + id + '?' + qs_({ fields: FIELDS, supportsAllDrives: true }), JSON.stringify({ description: d }), { type: 'application/json' }); return this; },
    moveTo: function (folder) { var old = (dmeta_(id).parents || []).map(function (p) { return p.id; }).join(',');
      META[id] = api_('PATCH', 'drive/v2/files/' + id + '?' + qs_({ addParents: folder.getId(), removeParents: old, fields: FIELDS, supportsAllDrives: true }), '{}', { type: 'application/json' }); return this; }
  };
}
function File_(id) {
  var f = common_(id);
  f.getMimeType = function () { return dmeta_(id).mimeType; };
  f.getSize = function () { return +(dmeta_(id).fileSize || 0); };
  f.getBlob = function () { var m = dmeta_(id); return Blob_(api_('GET', 'drive/v2/files/' + id + '?alt=media&supportsAllDrives=true', null, { bin: true }), m.mimeType, m.title); };
  f.getAs = function () { throw new Error('Converting files is not in the GitHub version.'); };
  f.setContent = function (s) { META[id] = api_('PUT', 'upload/drive/v2/files/' + id + '?' + qs_({ uploadType: 'media', fields: FIELDS, supportsAllDrives: true }), s, { type: dmeta_(id).mimeType || 'text/plain' }); return f; };
  return f;
}
function q_(s) { return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }
function create_(parentId, name, mime, u8) {
  var meta = JSON.stringify({ title: name, mimeType: mime, parents: [{ id: parentId }] });
  if (mime === 'application/vnd.google-apps.folder') return wrap_(api_('POST', 'drive/v2/files?' + qs_({ fields: FIELDS, supportsAllDrives: true }), meta, { type: 'application/json' }));
  var B = 'csb' + Date.now().toString(36), enc = new TextEncoder();
  var head = enc.encode('--' + B + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + B + '\r\nContent-Type: ' + mime + '\r\n\r\n');
  var tail = enc.encode('\r\n--' + B + '--'), body = new Uint8Array(head.length + u8.length + tail.length);
  body.set(head, 0); body.set(u8, head.length); body.set(tail, head.length + u8.length);
  return wrap_(api_('POST', 'upload/drive/v2/files?' + qs_({ uploadType: 'multipart', fields: FIELDS, supportsAllDrives: true }), body, { type: 'multipart/related; boundary=' + B }));
}
function Folder_(id) {
  var f = common_(id);
  f.createFolder = function (n) { return create_(id, n, 'application/vnd.google-apps.folder'); };
  f.createFile = function (a, content, mime) { // createFile(blob) or createFile(name, content, mime): new files only
    if (a && typeof a === 'object' && a.getBytes) return create_(id, a.getName() || 'Untitled', a.getContentType(), a._u8 ? a._u8() : toU8_(a.getBytes()));
    return create_(id, String(a), mime || 'text/plain', toU8_(String(content == null ? '' : content)));
  };
  f.getFilesByName = function (n) { return search_(q_(id) + ' in parents and title = ' + q_(n) + " and mimeType != 'application/vnd.google-apps.folder' and trashed = false"); };
  f.getFoldersByName = function (n) { return search_(q_(id) + ' in parents and title = ' + q_(n) + " and mimeType = 'application/vnd.google-apps.folder' and trashed = false"); };
  f.getFolders = function () { return search_(q_(id) + " in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"); };
  f.getFiles = function () { return search_(q_(id) + " in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false"); };
  f.addFile = function (file) { api_('PATCH', 'drive/v2/files/' + file.getId() + '?' + qs_({ addParents: id, supportsAllDrives: true }), '{}', { type: 'application/json' }); delete META[file.getId()]; return f; };
  return f;
}
var DriveApp = {
  searchFiles: function (q) { return search_('(' + q + ") and mimeType != 'application/vnd.google-apps.folder'"); },
  searchFolders: function (q) { return search_('(' + q + ") and mimeType = 'application/vnd.google-apps.folder'"); },
  getFileById: function (id) { dmeta_(id); return File_(id); },
  getFolderById: function (id) { dmeta_(id); return Folder_(id); },
  getRootFolder: function () { return Folder_(api_('GET', 'drive/v2/files/root?fields=id').id); },
  createFile: function (a, c, m) { return Folder_(DriveApp.getRootFolder().getId()).createFile(a, c, m); }
};
/* ---------- Calendar (v3 REST) ---------- */
function Event_(e) {
  var allDay = !!(e.start && e.start.date);
  function d(x) { return x.dateTime ? new Date(x.dateTime) : new Date(x.date + 'T00:00:00+11:00'); }
  return { getId: function () { return e.id; }, getTitle: function () { return e.summary || ''; }, getLocation: function () { return e.location || ''; },
    getDescription: function () { return e.description || ''; }, isAllDayEvent: function () { return allDay; },
    getStartTime: function () { return d(e.start); }, getEndTime: function () { return d(e.end || e.start); }, getAllDayStartDate: function () { return d(e.start); } };
}
function Cal_(c) {
  return { getId: function () { return c.id; }, getName: function () { return c.summary || ''; },
    getEvents: function (a, b, o) { var out = [], tok = null;
      do { var r = api_('GET', 'calendar/v3/calendars/' + encodeURIComponent(c.id) + '/events?' + qs_({ timeMin: a.toISOString(), timeMax: b.toISOString(), singleEvents: true, orderBy: 'startTime', maxResults: 2500, q: o && o.search || null, pageToken: tok }));
        (r.items || []).forEach(function (e) { if (e.status !== 'cancelled') out.push(Event_(e)); }); tok = r.nextPageToken; } while (tok);
      return out; } };
}
var CAL_LIST = null;
function calList_() { if (!CAL_LIST) CAL_LIST = (api_('GET', 'calendar/v3/users/me/calendarList?maxResults=250').items || []); return CAL_LIST; }
var CalendarApp = {
  getCalendarById: function (id) { if (!id) return null; var c = calList_().filter(function (x) { return x.id === id; })[0]; return c ? Cal_(c) : null; },
  getAllCalendars: function () { return calList_().map(Cal_); },
  getCalendarsByName: function (n) { return calList_().filter(function (x) { return x.summary === n; }).map(Cal_); }
};
/* ---------- Gmail (v1 REST). Drafts only: no send. ---------- */
function hdr_(m, n) { var h = ((m.payload || {}).headers || []).filter(function (x) { return x.name.toLowerCase() === n.toLowerCase(); })[0]; return h ? h.value : ''; }
function plain_body_(p) { if (!p) return ''; if (p.mimeType === 'text/plain' && p.body && p.body.data) return new TextDecoder().decode(unb64_(p.body.data));
  for (var i = 0; p.parts && i < p.parts.length; i++) { var s = plain_body_(p.parts[i]); if (s) return s; } return ''; }
function Msg_(m) { return { getId: function () { return m.id; }, getSubject: function () { return hdr_(m, 'Subject'); }, getFrom: function () { return hdr_(m, 'From'); },
  getTo: function () { return hdr_(m, 'To'); }, getDate: function () { return new Date(+m.internalDate); }, getPlainBody: function () { return plain_body_(m.payload) || m.snippet || ''; } }; }
function Thread_(id) { var T = null; function t() { if (!T) T = api_('GET', 'gmail/v1/users/me/threads/' + id + '?format=full'); return T; }
  return { getId: function () { return id; }, getMessages: function () { return (t().messages || []).map(Msg_); },
    getFirstMessageSubject: function () { return hdr_((t().messages || [{}])[0], 'Subject'); },
    getLastMessageDate: function () { var a = t().messages || []; return new Date(+(a[a.length - 1] || {}).internalDate || 0); } }; }
function mimeWord_(s) { return /[^\x20-\x7e]/.test(s) ? '=?UTF-8?B?' + b64_(new TextEncoder().encode(s)) + '?=' : s; }
var GmailApp = {
  search: function (q, start, max) { start = start || 0; max = max || 100;
    var r = api_('GET', 'gmail/v1/users/me/threads?' + qs_({ q: q, maxResults: Math.min(500, start + max) }));
    return (r.threads || []).slice(start, start + max).map(function (x) { return Thread_(x.id); }); },
  createDraft: function (to, subject, body, opts) { opts = opts || {}; // DRAFT ONLY
    var B = 'csm' + Date.now().toString(36), L = [];
    L.push('To: ' + (to || ''), opts.cc ? 'Cc: ' + opts.cc : null, 'Subject: ' + mimeWord_(subject || ''), 'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary="' + B + '"', '', '--' + B,
      'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64_(new TextEncoder().encode(body || '')));
    (opts.attachments || []).forEach(function (a) { L.push('--' + B, 'Content-Type: ' + a.getContentType() + '; name="' + a.getName() + '"', 'Content-Disposition: attachment; filename="' + a.getName() + '"',
      'Content-Transfer-Encoding: base64', '', b64_(a._u8 ? a._u8() : toU8_(a.getBytes()))); });
    L.push('--' + B + '--');
    var raw = b64_(new TextEncoder().encode(L.filter(function (x) { return x !== null; }).join('\r\n'))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    var d = api_('POST', 'gmail/v1/users/me/drafts', JSON.stringify({ message: { raw: raw } }), { type: 'application/json' });
    return { getId: function () { return d.id; } }; }
};
/* ---------- the rest ---------- */
var Session = { getActiveUser: function () { return { getEmail: function () { return ME; } }; }, getEffectiveUser: function () { return { getEmail: function () { return ME; } }; } };
var CacheService = { getScriptCache: function () { return { get: function (k) { var e = CACHE[k]; return e && e.t > Date.now() ? e.v : null; }, put: function (k, v, s) { CACHE[k] = { v: String(v), t: Date.now() + 1000 * (s || 600) }; }, remove: function (k) { delete CACHE[k]; } }; } };
var PropertiesService = { getScriptProperties: function () { return { getProperty: function (k) { return Object.prototype.hasOwnProperty.call(PROPS, k) ? PROPS[k] : null; },
  setProperty: function (k, v) { PROPS[k] = String(v); PROPS_DIRTY = true; return this; }, deleteProperty: function (k) { delete PROPS[k]; PROPS_DIRTY = true; return this; }, getProperties: function () { return Object.assign({}, PROPS); } }; } };
PropertiesService.getUserProperties = PropertiesService.getScriptProperties;
var LockService = { getScriptLock: function () { return { waitLock: function () {}, tryLock: function () { return true; }, releaseLock: function () {} }; } };
var Logger = { log: function () {} };
function melParts_(d, tz) { var o = {}; new Intl.DateTimeFormat('en-AU', { timeZone: tz || 'Australia/Melbourne', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false, weekday: 'short' })
  .formatToParts(d).forEach(function (p) { o[p.type] = p.value; }); if (o.hour === '24') o.hour = '0'; return o; }
var Utilities = {
  formatDate: function (d, tz, fmt) { var o = melParts_(d, tz), M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], p2 = function (n) { return ('0' + n).slice(-2); };
    var H = +o.hour, map = { yyyy: o.year, MMM: M[+o.month - 1], MM: p2(o.month), M: String(+o.month), dd: p2(o.day), d: String(+o.day), HH: p2(H), H: String(H), hh: p2(H % 12 || 12), h: String(H % 12 || 12), mm: p2(o.minute), ss: p2(o.second), a: H < 12 ? 'AM' : 'PM', EEE: o.weekday };
    return String(fmt).split(/('[^']*')/).map(function (part) { if (/^'.*'$/.test(part)) return part.slice(1, -1);
      return part.replace(/yyyy|MMM|MM|M|dd|d|HH|H|hh|h|mm|ss|a|EEE/g, function (t) { return map[t]; }); }).join(''); },
  base64Encode: function (b) { return b64_(toU8_(b)); }, base64Decode: function (s) { return toSigned_(unb64_(s)); },
  base64EncodeWebSafe: function (b) { return b64_(toU8_(b)).replace(/\+/g, '-').replace(/\//g, '_'); },
  newBlob: function (b, t, n) { return Blob_(b, t, n); },
  unzip: function () { throw new Error('Opening a zipped WhatsApp export isn\u2019t in the GitHub version yet. Export it as text (Without media) instead, or use the Google version.'); },
  sleep: function () {}, getUuid: function () { return crypto.randomUUID(); }
};
function notHere_(what) { return function () { throw new Error(what + ' isn\u2019t in the GitHub version yet. Use the Google version for this for now.'); }; }
var SpreadsheetApp = { create: notHere_('Writing to Google Sheets'), open: notHere_('Writing to Google Sheets'), openById: notHere_('Reading Google Sheets') };
var DocumentApp = { create: notHere_('Making a Google Doc'), ParagraphHeading: {} };
var HtmlService = { createHtmlOutputFromFile: function () { return { getContent: function () { return ''; } }; }, createHtmlOutput: function (h) { var o = { getContent: function () { return h; }, setTitle: function () { return o; }, addMetaTag: function () { return o; }, setXFrameOptionsMode: function () { return o; } }; return o; }, XFrameOptionsMode: { ALLOWALL: 1 } };
/* ---------- ids found by name after sign-in (nothing hard-coded in this public repo) ---------- */
var CS_NAMES = { cal: 'ANCHOR TESTING', root: 'ANCHOR ROOF TEST', subtasks: 'services and steps for job card and quotes' };
var CS_IDS = {};
function __csId(k) {
  if (k in CS_IDS) return CS_IDS[k];
  var v = '';
  try {
    if (k === 'cal') { var c = calList_().filter(function (x) { return x.summary === CS_NAMES.cal; })[0]; v = c ? c.id : ''; }
    else if (k === 'root') { // the real one sits in My Drive and is owned by this account; stale copies elsewhere are skipped
      var r = api_('GET', 'drive/v2/files?' + qs_({ q: 'title = ' + q_(CS_NAMES.root) + " and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and 'me' in owners and trashed = false", fields: 'items(id,modifiedDate)' }));
      v = ((r.items || []).sort(function (a, b) { return String(b.modifiedDate).localeCompare(String(a.modifiedDate)); })[0] || {}).id || ''; }
    else if (k === 'subtasks') { var s = api_('GET', 'drive/v2/files?' + qs_({ q: 'title = ' + q_(CS_NAMES.subtasks) + " and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false", fields: 'items(id)' }));
      v = ((s.items || [])[0] || {}).id || ''; }
  } catch (e) { v = ''; }
  CS_IDS[k] = v; return v;
}
