const AM_ROOT_ID = __csId('root');
const AM_INCOMPLETE = 'INCOMPLETE CERTS';

function amendUi_() {
  return HtmlService.createHtmlOutputFromFile('AmendUI').getContent();
}

function amKey_(s) {
  s = String(s || '').toLowerCase().replace(/\s+/g, ' ');
  const m = s.match(/\b(\d+[a-z]?(?:\s?[-–\/]\s?\d+[a-z]?)?)\s+((?:(?:st|mt|the)\s+)?[a-z][a-z']*)/);
  if (m) return m[1].replace(/\s/g, '').replace('–', '-') + ' ' + m[2];
  return s.replace(/[^a-z0-9 ]/g, '').split(' ').slice(0, 3).join(' ').trim();
}

function amYear_(dateIso) {
  const y = String(dateIso || '').slice(0, 4);
  return /^20\d\d$/.test(y) ? y : String(new Date().getFullYear());
}

function amYearFolder_(yr, create) {
  const root = DriveApp.getFolderById(AM_ROOT_ID);
  const it = root.getFolders();
  const re = new RegExp('^\\s*' + yr + '\\s*anchor certs', 'i');
  while (it.hasNext()) { const f = it.next(); if (re.test(f.getName())) return f; }
  return create ? root.createFolder(yr + ' ANCHOR CERTS') : null;
}

function amSubs_(yf) {
  const out = [];
  if (!yf) return out;
  const it = yf.getFolders();
  while (it.hasNext() && out.length < 400) {
    const f = it.next(), n = f.getName();
    if (n.trim().toUpperCase() === AM_INCOMPLETE || n.trim().toUpperCase() === 'CERT STUDIO WALKTHROUGHS') continue;
    out.push({ id: f.getId(), n: n });
  }
  out.sort((a, b) => a.n.localeCompare(b.n));
  return out;
}

function amHist_(key) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('AMH_' + key) || '[]'); } catch (e) { return []; }
}

function amHistAdd_(key, row) {
  const h = amHist_(key);
  h.push(row);
  PropertiesService.getScriptProperties().setProperty('AMH_' + key, JSON.stringify(h.slice(-30)));
  return h.slice(-30);
}

function amWord_(name) {
  const skip = { the: 1, pty: 1, ltd: 1, and: 1, body: 1, corporate: 1, strata: 1, management: 1, group: 1, services: 1 };
  const w = String(name || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(x => x.length > 2 && !skip[x]);
  return w[0] || String(name || '').toLowerCase().trim().split(' ')[0] || '';
}

function amendLookup(addr, client, dateIso, part) {
  who_();
  const key = amKey_(addr);
  if (!key) throw new Error('Enter the site address first — it is the key.');
  const yr = amYear_(dateIso);
  const out = { key: key, addr: addr, yr: yr, cal: [], mail: [], zoho: [], certs: [], folders: [], cands: [], wa: '', history: amHist_(key), checks: [] };
  const cw = amWord_(client);
  const seen = {};
  const cand = (n, src) => {
    n = String(n || '').replace(/\s+/g, ' ').trim();
    if (n.length < 2 || n.length > 80) return;
    const k = n.toLowerCase();
    if (seen[k]) { if (seen[k].src.indexOf(src) < 0) seen[k].src += ' + ' + src; return; }
    seen[k] = { n: n, src: src }; out.cands.push(seen[k]);
  };

  if (!part || part === 'cal') try {
    out.cal = calSearch_(key, 8).map(e => ({
      t: String(e.summary || '').replace(/\*+/g, '').trim(), d: String(e.start.dateTime || e.start.date).slice(0, 10), c: e.calendar,
      loc: String(e.location || '').replace(/\s+/g, ' ').trim(),
      wa: (String(e.description || '').match(/https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/) || [''])[0]
    }));
    const w = out.cal.find(e => e.wa); out.wa = w ? w.wa : '';
    const dn = {};
    out.cal.forEach(e => { const n = e.t.split(/\s*[-–]\s*\d|\s[-–]\s|\s\d/)[0].trim(); if (n && !/^(quote|quotes|tbc|hold)$/i.test(n)) dn[n.toUpperCase()] = 1; });
    const dl = Object.keys(dn);
    dl.forEach(n => cand(n, 'diary'));
    if (!out.cal.length) out.checks.push({ s: 'Diary', lvl: 'red', m: 'No booking found for this address.' });
    else if (dl.length > 1) out.checks.push({ s: 'Diary', lvl: 'amb', m: out.cal.length + ' booking(s), but they name different companies: ' + dl.slice(0, 4).join(' / ') + '. Pick the right one here, then amend the diary entry.' });
    else {
      const top = out.cal[0];
      const named = cw && out.cal.some(e => e.t.toLowerCase().indexOf(cw) >= 0);
      out.checks.push({ s: 'Diary', lvl: (!cw || named) ? 'grn' : 'amb',
        m: (!cw || named) ? out.cal.length + ' booking(s). Latest: ' + top.t + ' · ' + top.d + ' · ' + top.c
                          : 'Booking does not name this client. Diary says: ' + top.t + ' · ' + top.d + ' — amend the diary entry.' });
    }
  } catch (e) { out.checks.push({ s: 'Diary', lvl: 'red', m: 'Could not read the diary: ' + (e.message || e) }); }

  if (!part || part === 'mail') try {
    GmailApp.search('"' + key + '" newer_than:2y', 0, 6).forEach(t => {
      const ms = t.getMessages();
      const ext = ms.map(m => m.getFrom()).filter(f => !/realmpcs\.com|zoho/i.test(f))[0] || ms[0].getFrom();
      out.mail.push({ sub: t.getFirstMessageSubject(), from: ext, d: Utilities.formatDate(t.getLastMessageDate(), 'Australia/Melbourne', 'yyyy-MM-dd'), id: t.getId() });
      const zq = t.getFirstMessageSubject().match(/(?:Quotation|Estimate|Invoice)\s*-\s*((?:EST|INV)-\d+).*?-\s*(.+)$/i);
      if (zq) { const zn = zq[2].split(/[.,]?\s+\d/)[0].trim(); if (zn) { cand(zn, 'Zoho ' + zq[1].toUpperCase() + ' email'); out.zoho.push(zq[1].toUpperCase() + ' — ' + zn); } }
    });
    out.checks.push({ s: 'Gmail', lvl: out.mail.length ? 'grn' : 'amb',
      m: out.mail.length ? out.mail.length + ' thread(s). Latest from: ' + out.mail[0].from.replace(/<.*>/, '').trim() + ' · ' + out.mail[0].d : 'No email found with this address in the last two years.' });
  } catch (e) { out.checks.push({ s: 'Gmail', lvl: 'red', m: 'Could not read Gmail: ' + (e.message || e) }); }

  if (!part || part === 'mail') try {
    GmailApp.search('from:zohobooks.com "' + key + '"', 0, 5).forEach(t => {
      const sub = t.getFirstMessageSubject();
      out.zoho.push(sub);
      let m = sub.match(/^(.+?) has (?:accepted|declined|viewed) your (?:quote|estimate)/i);
      if (m) cand(m[1], 'Zoho Books email');
      m = sub.match(/from Parker Barlas Enterprises Pty Ltd\s*-\s*(.+)$/i);
      if (m) cand(m[1], 'Zoho Books email');
    });
    out.checks.push({ s: 'Zoho Books', lvl: 'amb',
      m: 'Not linked to Cert Studio yet (no Zoho API key). ' + (out.zoho.length ? 'Read from Zoho emails: ' + out.zoho[0] : 'No Zoho email mentions this address — check the customer name in Zoho Books.') });
  } catch (e) { out.checks.push({ s: 'Zoho Books', lvl: 'amb', m: 'Not linked to Cert Studio yet.' }); }

  if (!part || part === 'drive') try {
    const street = key.split(' ').slice(1).join(' ');
    const re = new RegExp('(^|[^0-9])' + key.replace(/[.*+?^{}$()|[\]\\\/]/g, '\\$&'));
    const names = {};
    const it = DriveApp.searchFiles("title contains '" + street.replace(/'/g, "\\'") + "' and mimeType = 'application/pdf' and trashed = false");
    let n = 0;
    while (it.hasNext() && n < 200 && out.certs.length < 10) {
      const f = it.next(); n++;
      const nm = f.getName();
      if (!re.test(nm.toLowerCase()) || names[nm]) continue;
      names[nm] = 1;
      let par = '', isClient = false;
      try { const p = f.getParents(); if (p.hasNext()) { const pf = p.next(); par = pf.getName(); const g = pf.getParents(); if (g.hasNext() && /anchor certs/i.test(g.next().getName())) isClient = true; } } catch (e2) {}
      out.certs.push({ n: nm, u: f.getUrl(), d: Utilities.formatDate(f.getLastUpdated(), 'Australia/Melbourne', 'yyyy-MM-dd'), par: par, ok: isClient });
    }
    out.certs.sort((a, b) => (b.ok - a.ok) || b.d.localeCompare(a.d));
    out.certs.forEach(c => {
      if (c.ok) cand(c.par, 'client folder of last cert');
      const m = c.n.match(/^([A-Za-z][A-Za-z&'. ]{1,60}?)\s+\d/);
      if (m && /cert/i.test(c.n)) cand(m[1], 'name on cert ' + c.d.slice(0, 4));
    });
    const last = out.certs[0];
    if (!last) out.checks.push({ s: 'Drive', lvl: 'amb', m: 'No earlier cert PDF found for this address — first cert, or filed under another spelling.' });
    else {
      const same = !cw || (last.par + ' ' + last.n).toLowerCase().indexOf(cw) >= 0;
      out.checks.push({ s: 'Drive', lvl: same ? 'grn' : 'amb', m: (same ? 'Last cert: ' : 'Last cert was under a different company: ') + last.n + ' (folder: ' + (last.par || '?') + ')' });
    }
  } catch (e) { out.checks.push({ s: 'Drive', lvl: 'red', m: 'Could not search Drive: ' + (e.message || e) }); }

  if (!part || part === 'cal') try {
    out.folders = amSubs_(amYearFolder_(yr, false));
    const w2 = out.cal.length ? amWord_(out.cal[0].t) : '';
    out.folders.forEach(f => { const l = f.n.toLowerCase(); if ((cw && l.indexOf(cw) >= 0) || (w2 && l.indexOf(w2) >= 0)) cand(f.n, yr + ' folder'); });
  } catch (e) {}

  if (!part || part === 'drive') out.checks.push({ s: 'Deputy', lvl: 'amb', m: 'Not linked to Cert Studio (read-only system, no token here). Check the shift by hand.' });
  return out;
}

function amendSetClient(addr, newClient, dateIso, oldClient, folderId, create) {
  const by = who_();
  const key = amKey_(addr);
  newClient = String(newClient || '').replace(/\s+/g, ' ').trim();
  if (!key) throw new Error('Enter the site address first — it is the key.');
  if (!newClient) throw new Error('Type or pick the client name.');
  const yr = amYear_(dateIso);
  const yf = amYearFolder_(yr, true);
  const subs = amSubs_(yf);
  let folder = null, created = false;
  if (folderId) {
    const hit = subs.find(s => s.id === folderId);
    if (!hit) throw new Error('That folder is not inside ' + yr + ' ANCHOR CERTS.');
    folder = DriveApp.getFolderById(folderId);
  } else {
    const lc = newClient.toLowerCase();
    const exact = subs.filter(s => s.n.trim().toLowerCase() === lc);
    if (exact.length === 1) folder = DriveApp.getFolderById(exact[0].id);
    else if (!create) {
      const w = amWord_(newClient);
      const near = subs.filter(s => { const l = s.n.toLowerCase(); return (w && l.indexOf(w) >= 0) || lc.indexOf(l.trim()) >= 0; });
      if (near.length) return { choose: near, yr: yr };
    }
    if (!folder) { folder = yf.createFolder(newClient); created = true; }
  }
  const old = String(oldClient || '').replace(/\s+/g, ' ').trim();
  let history = amHist_(key);
  if (old.toLowerCase() !== newClient.toLowerCase()) {
    history = amHistAdd_(key, { at: new Date().toISOString(), from: old, to: newClient, by: by, folder: folder.getName(), addr: addr });
  }
  return { folderId: folder.getId(), folderName: folder.getName(), folderUrl: folder.getUrl(), path: yr + ' ANCHOR CERTS › ' + folder.getName(), created: created, history: history, client: newClient };
}

function amIncomplete_(yr, create) {
  const yf = amYearFolder_(yr, create);
  if (!yf) return null;
  const it = yf.getFoldersByName(AM_INCOMPLETE);
  if (it.hasNext()) return it.next();
  return create ? yf.createFolder(AM_INCOMPLETE) : null;
}

function amDraftFile_(key) {
  const id = PropertiesService.getScriptProperties().getProperty('AMD_' + key);
  if (!id) return null;
  try { const f = DriveApp.getFileById(id); return f.isTrashed() ? null : f; } catch (e) { return null; }
}

function amendDraftSave(addr, client, json) {
  const by = who_();
  const key = amKey_(addr);
  if (!key) throw new Error('Enter the site address first — it is the key.');
  const body = '{"v":1,"key":' + JSON.stringify(key) + ',"addr":' + JSON.stringify(addr) + ',"client":' + JSON.stringify(client || '') +
    ',"savedAt":' + JSON.stringify(new Date().toISOString()) + ',"by":' + JSON.stringify(by) + ',"data":' + json + '}';
  let f = amDraftFile_(key);
  if (f && /^FILED /.test(f.getName())) f = null;
  if (f) f.setContent(body);
  else {
    const folder = amIncomplete_(String(new Date().getFullYear()), true);
    const name = 'DRAFT · ' + String(addr).replace(/[\\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() + '.json';
    f = folder.createFile(name, body, 'application/json');
    PropertiesService.getScriptProperties().setProperty('AMD_' + key, f.getId());
  }
  f.setDescription((client || 'no client yet') + ' | ' + addr + ' | saved by ' + by);
  let folderUrl = '';
  try { folderUrl = f.getParents().next().getUrl(); } catch (e) {}
  return { id: f.getId(), name: f.getName(), at: Date.now(), kb: Math.round(body.length / 1024), folderUrl: folderUrl };
}

function amendDraftList() {
  who_();
  const out = [];
  const y = new Date().getFullYear();
  [y, y - 1].forEach(yr => {
    const folder = amIncomplete_(String(yr), false);
    if (!folder) return;
    const it = folder.getFiles();
    while (it.hasNext() && out.length < 60) {
      const f = it.next(), n = f.getName();
      if (/^FILED /.test(n)) continue;
      out.push({ id: f.getId(), name: n.replace(/^DRAFT · /, '').replace(/\.json$/, ''), desc: f.getDescription() || '', at: f.getLastUpdated().getTime(), kb: Math.round(f.getSize() / 1024) });
    }
  });
  out.sort((a, b) => b.at - a.at);
  return out;
}

function amendDraftLoad(id) {
  who_();
  const f = DriveApp.getFileById(id);
  const p = f.getParents();
  if (!p.hasNext() || p.next().getName().trim().toUpperCase() !== AM_INCOMPLETE) throw new Error('That file is not in INCOMPLETE CERTS.');
  return f.getBlob().getDataAsString('UTF-8');
}

function amendDraftFiled(addr, certUrl) {
  who_();
  const key = amKey_(addr);
  const f = amDraftFile_(key);
  if (!f) return false;
  if (!/^FILED /.test(f.getName())) {
    f.setName('FILED ' + Utilities.formatDate(new Date(), 'Australia/Melbourne', 'yyyy-MM-dd') + ' · ' + f.getName());
    f.setDescription((f.getDescription() || '') + ' | cert: ' + (certUrl || ''));
  }
  return true;
}

function amendRekey(oldAddr, newAddr) {
  const by = who_();
  const ok = amKey_(oldAddr), nk = amKey_(newAddr);
  if (!ok || !nk) throw new Error('Both addresses are needed.');
  const p = PropertiesService.getScriptProperties();
  if (ok !== nk) {
    const h = amHist_(ok).concat(amHist_(nk));
    const d = p.getProperty('AMD_' + ok);
    if (d) { p.setProperty('AMD_' + nk, d); p.deleteProperty('AMD_' + ok); }
    p.deleteProperty('AMH_' + ok);
    p.setProperty('AMH_' + nk, JSON.stringify(h.slice(-29)));
  }
  const f = amDraftFile_(nk);
  if (f && !/^FILED /.test(f.getName())) f.setName('DRAFT · ' + String(newAddr).replace(/[\\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() + '.json');
  return { key: nk, history: amHistAdd_(nk, { at: new Date().toISOString(), from: '', to: '', by: by, note: 'Address corrected: ' + oldAddr + ' → ' + newAddr, addr: newAddr }) };
}
