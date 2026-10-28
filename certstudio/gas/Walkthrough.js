const WK_FOLDER = 'CERT STUDIO WALKTHROUGHS';
const WK_SHEET = 'CERT STUDIO WALKTHROUGH LOG';
const LIVE_SHEET = 'CERT STUDIO LIVE LOG';
const SUBTASKS_ID = __csId('subtasks');

function walkUi_() {
  return HtmlService.createHtmlOutputFromFile('WalkthroughUI').getContent();
}

function wkFolder_(yr) {
  const yf = amYearFolder_(yr, true);
  const it = yf.getFoldersByName(WK_FOLDER);
  return it.hasNext() ? it.next() : yf.createFolder(WK_FOLDER);
}

function wkMove_(id, folder) {
  const f = DriveApp.getFileById(id);
  try { f.moveTo(folder); } catch (e) { folder.addFile(f); }
}

function wkSheet_(name, header) {
  const props = PropertiesService.getScriptProperties(), key = 'SHEET_' + name;
  const id = props.getProperty(key);
  if (id) { try { const f = DriveApp.getFileById(id); if (!f.isTrashed()) return SpreadsheetApp.openById(id); } catch (e) {} }
  const folder = wkFolder_(String(new Date().getFullYear()));
  const it = folder.getFilesByName(name);
  let ss;
  if (it.hasNext()) ss = SpreadsheetApp.open(it.next());
  else { ss = SpreadsheetApp.create(name); ss.getSheets()[0].appendRow(header); ss.getSheets()[0].setFrozenRows(1); wkMove_(ss.getId(), folder); }
  props.setProperty(key, ss.getId());
  return ss;
}

function walkthroughSave(p) {
  const by = who_();
  p = p || {};
  if (!p.site) throw new Error('No site address — it is the key.');
  const entries = (p.entries || []).filter(e => e && (e.why || e.how));
  if (!entries.length) throw new Error('No answers to save yet.');
  const folder = wkFolder_(amYear_(p.date));
  const day = p.date || Utilities.formatDate(new Date(), 'Australia/Melbourne', 'yyyy-MM-dd');
  const name = fiFreeName_(folder, fiTidy_('WALKTHROUGH - ' + p.site + ' - ' + day));

  const doc = DocumentApp.create(name), b = doc.getBody();
  b.appendParagraph(name).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  b.appendParagraph('Client: ' + (p.client || '—') + '   ·   Site: ' + p.site + '   ·   Date of works: ' + day);
  if (p.certUrl) b.appendParagraph('Cert: ' + p.certUrl);
  b.appendParagraph('Recorded by ' + by + ' in Cert Studio (LIVE mode).');
  entries.forEach((e, i) => {
    b.appendParagraph((i + 1) + '. ' + (e.label || e.step) + '  —  ' + Utilities.formatDate(new Date(e.at), 'Australia/Melbourne', 'd MMM yyyy h:mm a'))
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    b.appendParagraph('Why: ' + (e.why || '—'));
    b.appendParagraph('How: ' + (e.how || '—') + (e.via ? '   [' + e.via + ']' : ''));
  });
  doc.saveAndClose();
  wkMove_(doc.getId(), folder);

  const ss = wkSheet_(WK_SHEET, ['Logged', 'Answered', 'Site', 'Client', 'Date of works', 'Step', 'Why', 'How', 'Via', 'Walkthrough doc', 'Cert', 'By', 'Entry id']);
  const want = {}; (p.logIds || entries.map(e => e.id)).forEach(id => want[id] = 1);
  const now = new Date(), rows = entries.filter(e => want[e.id]).map(e =>
    [now, new Date(e.at), p.site, p.client || '', day, e.label || e.step, e.why || '', e.how || '', e.via || '', doc.getUrl(), p.certUrl || '', by, e.id]);
  wkAppend_(ss, rows);
  return { docUrl: doc.getUrl(), docName: name, sheetUrl: ss.getUrl(), folderUrl: folder.getUrl(), logged: rows.map(r => r[12]) };
}

function wkAppend_(ss, rows) {
  if (!rows.length) return;
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { const sh = ss.getSheets()[0]; sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows); }
  finally { lock.releaseLock(); }
}

function liveLog(rows) {
  const by = who_();
  const ss = wkSheet_(LIVE_SHEET, ['Logged', 'When', 'Kind', 'Step / action', 'Screen', 'Site', 'Client', 'Text', 'Via', 'By', 'Entry id']);
  const now = new Date();
  const out = (rows || []).slice(0, 50).map(r => [now, new Date(r.at || Date.now()), r.kind || '', r.step || '', r.screen || '', r.site || '', r.client || '',
    String(r.text || '').slice(0, 5000), r.via || '', by, r.id || '']);
  wkAppend_(ss, out);
  return { ok: out.map(r => r[10]), sheetUrl: ss.getUrl() };
}

function quoteServices() {
  who_();
  const v = SpreadsheetApp.openById(SUBTASKS_ID).getSheets()[0].getDataRange().getDisplayValues();
  const out = []; let cur = null;
  v.forEach(r => {
    const a = String(r[0] || '').trim(), c = String(r[2] || '').trim();
    if (a) { cur = { service: a, steps: [] }; out.push(cur); }
    if (cur && c) cur.steps.push(c + (r[3] ? ' (' + r.slice(3).filter(String).join(', ') + ')' : ''));
  });
  return out;
}
