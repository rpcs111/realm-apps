const NOT_CERT_RE_ = /\b(?:quote|quotes|quoted|quotation|quotations|invoice|invoices|estimate|estimates|swms|job[\s_-]*cards?|jobcards?)\b|\binv[\s_-]?\d|\best[\s_-]?\d/i;
function notCertName_(name) { return NOT_CERT_RE_.test(String(name || '').replace(/_/g, ' ')); }

function araFindCerts(q) {
  who_();
  q = String(q || '').trim();
  if (!q) return { q: q, files: [], note: 'No address yet' };
  const key = keyOf_(q);
  let terms = key.split(' ').filter(function (t) { return t.length > 0; });
  if (!/\d/.test(key)) terms = q.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(function (t) { return t.length > 2; }).slice(0, 3);
  if (!terms.length) return { q: q, key: key, files: [], note: 'Could not read an address' };
  const esc = function (t) { return String(t).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); };
  const query = terms.map(function (t) { return "title contains '" + esc(t) + "'"; }).join(' and ') + ' and trashed = false';
  const it = DriveApp.searchFiles(query), out = [];
  let seen = 0;
  while (it.hasNext() && seen < 80) {
    const f = it.next(); seen++;
    const mime = f.getMimeType();
    if (!/pdf|image\//.test(mime)) continue;
    const chain = araChain_(f);
    const inCerts = /ANCHOR/i.test(chain);
    const name = f.getName();
    if (notCertName_(name)) continue;
    const kind = /pdf/.test(mime) ? (/merged|plan only/i.test(name) ? 'plan-pdf' : 'cert')
      : /plan/i.test(name) ? 'plan' : /aerial|near ?map|satellite/i.test(name) ? 'aerial' : 'photo';
    const ym = chain.match(/(20\d\d)\s*ANCHOR CERTS/i) || name.match(/(?:^|\D)(20\d\d)(?:\D|$)/) || name.match(/\d{1,2}[-.\/]\d{1,2}[-.\/](\d{2})(?:\D|$)/);
    let year = ym ? (ym[1].length === 2 ? '20' + ym[1] : ym[1]) : String(f.getLastUpdated().getFullYear());
    const dm = name.match(/(\d{1,2})[-.\/](\d{1,2})[-.\/](\d{2,4})/);
    const date = dm ? (dm[3].length === 2 ? '20' + dm[3] : dm[3]) + '-' + ('0' + dm[2]).slice(-2) + '-' + ('0' + dm[1]).slice(-2)
      : Utilities.formatDate(f.getDateCreated(), 'Australia/Melbourne', 'yyyy-MM-dd');
    out.push({ id: f.getId(), name: name, mime: mime, kind: kind, year: year, date: date, folder: chain, url: f.getUrl(), size: f.getSize(), inCerts: inCerts });
  }
  let files = out.filter(function (x) { return x.inCerts; });
  const note = files.length ? '' : (out.length ? 'Nothing inside the ANCHOR CERTS folders; showing other Drive matches.' : 'Nothing in Drive with "' + terms.join(' ') + '" in the name.');
  if (!files.length) files = out;
  const rank = { cert: 0, 'plan-pdf': 1, plan: 2, aerial: 3, photo: 4 };
  files.sort(function (a, b) { return ((rank[a.kind] || 0) - (rank[b.kind] || 0)) || (b.date || '').localeCompare(a.date || ''); });
  return { q: q, key: terms.join(' '), files: files.slice(0, 30), note: note };
}

const ARA_FOLDERS_ = {};
function araChain_(f) {
  const names = [];
  try {
    const p0 = f.getParents(); let id = p0.hasNext() ? p0.next().getId() : '', n = 0;
    while (id && n < 4) {
      let c = ARA_FOLDERS_[id];
      if (!c) { const d = DriveApp.getFolderById(id), pp = d.getParents(); c = ARA_FOLDERS_[id] = { name: d.getName(), parent: pp.hasNext() ? pp.next().getId() : '' }; }
      names.unshift(c.name); id = c.parent; n++;
    }
  } catch (e) {}
  return names.join(' › ');
}

function araGetFile(id) {
  who_();
  const f = DriveApp.getFileById(id);
  if (f.getSize() > 20 * 1024 * 1024) throw new Error('That file is over 20 MB. Download it and drop it on the redo panel instead.');
  return { name: f.getName(), mime: f.getMimeType(), b64: Utilities.base64Encode(f.getBlob().getBytes()) };
}
