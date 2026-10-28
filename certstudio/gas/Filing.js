function fileUi_() {
  return HtmlService.createHtmlOutputFromFile('FileUI').getContent();
}

function fiTidy_(s) { return String(s || '').replace(/[\\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim(); }

function fiFreeName_(folder, name) {
  if (!folder.getFilesByName(name).hasNext()) return name;
  const dot = name.lastIndexOf('.'), base = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
  for (let i = 2; i < 50; i++) { const n = base + ' (' + i + ')' + ext; if (!folder.getFilesByName(n).hasNext()) return n; }
  return base + ' ' + Date.now() + ext;
}

function certFileAndDraft(m) {
  const by = who_();
  m = m || {};
  if (!m.base64) throw new Error('No PDF was built.');
  if (!m.site) throw new Error('Enter the site address first — it is the key.');
  if (!m.client) throw new Error('Enter the client first — it picks the Drive folder.');

  let route = amendSetClient(m.site, m.client, m.date, m.client, m.folderId || '', !!m.createClientFolder);
  if (route.choose) return { choose: route.choose, yr: route.yr };
  const folder = DriveApp.getFolderById(route.folderId);

  const name = fiFreeName_(folder, fiTidy_(m.name || (m.client + ' ' + m.site + ' Height Safety Certificate')).replace(/(\.pdf)?$/i, '.pdf'));
  const blob = Utilities.newBlob(Utilities.base64Decode(m.base64), 'application/pdf', name);
  const file = folder.createFile(blob);
  file.setDescription('Filed by Cert Studio for ' + by + ' · ' + m.site + ' · ' + new Date().toISOString());
  try { amendDraftFiled(m.site, file.getUrl()); } catch (e) {}

  const out = { fileId: file.getId(), fileUrl: file.getUrl(), name: name, folderUrl: route.folderUrl, path: route.path };

  if (m.wantDraft) {
    const to = String(m.to || '').trim();
    const subject = m.subject || ('Height Safety Certificate — ' + m.site);
    const body = m.body || ('Hi,\n\nPlease find attached the Height Safety Certificate for ' + m.site +
      '.\n\nThe annual inspection is due 12 months from the date of works.\n\nKind regards,\nAndrew Barlas\nRealm PCS');
    const opts = { attachments: [file.getBlob()] };
    if (m.cc) opts.cc = String(m.cc);
    const d = GmailApp.createDraft(to, subject, body, opts);
    out.draftId = d.getId();
    out.draftUrl = 'https://mail.google.com/mail/u/0/#drafts';
    out.draftTo = to || '(no recipient yet — add one in Gmail)';
  }
  return out;
}

function certSuggestRecipient(site) {
  who_();
  const k = sp2Key_(site);
  if (!k) return [];
  const seen = {}, out = [];
  GmailApp.search('"' + k.a + ' ' + k.word + '" newer_than:2y -from:' + DOMAIN, 0, 8).forEach(t => {
    t.getMessages().forEach(msg => {
      const em = ((msg.getFrom() || '').match(/[\w.+-]+@[\w.-]+/) || [''])[0].toLowerCase();
      if (em && !em.endsWith('@' + DOMAIN) && !/noreply|no-reply|notification|zoho|xero|deputy/.test(em) && !seen[em]) {
        seen[em] = 1; out.push({ email: em, from: msg.getFrom(), subject: msg.getSubject(), date: msg.getDate().toISOString() });
      }
    });
  });
  return out.slice(0, 5);
}

function waSources(site) {
  who_();
  const k = sp2Key_(site);
  const q = "title contains 'WhatsApp Chat' and trashed = false" + (k ? " and title contains '" + k.q.replace(/'/g, "\\'") + "'" : '');
  const it = DriveApp.searchFiles(q), out = [], seen = {};
  while (it.hasNext() && out.length < 12) {
    const f = it.next(), dk = f.getName() + '|' + f.getSize();
    if (seen[dk]) continue; seen[dk] = 1;
    out.push({ id: f.getId(), name: f.getName(), mb: Math.round(f.getSize() / 1048576 * 10) / 10, url: f.getUrl(), at: f.getLastUpdated().getTime() });
  }
  out.sort((a, b) => b.at - a.at);
  return out;
}

function waRead(fileId) {
  who_();
  const f = DriveApp.getFileById(fileId);
  if (!/whatsapp chat/i.test(f.getName())) throw new Error('That is not a WhatsApp chat export.');
  if (f.getSize() > 45 * 1048576) throw new Error('This export is ' + Math.round(f.getSize() / 1048576) + ' MB — too big to open here. In WhatsApp: group › Export chat › Without media, save to Drive, then try again.');
  const blob = f.getBlob();
  if (/\.zip$/i.test(f.getName()) || blob.getContentType() === 'application/zip') {
    const parts = Utilities.unzip(blob.setContentType('application/zip'));
    const txt = parts.find(p => /\.txt$/i.test(p.getName()));
    if (!txt) throw new Error('No chat text inside that zip.');
    return { name: f.getName(), text: txt.getDataAsString('UTF-8'), media: parts.length - 1 };
  }
  return { name: f.getName(), text: blob.getDataAsString('UTF-8'), media: 0 };
}
