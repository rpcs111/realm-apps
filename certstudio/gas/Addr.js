function addrUi_() { return HtmlService.createHtmlOutputFromFile('AddrUI').getContent(); }

function araAddrTerms_(q) {
  q = String(q || '').toLowerCase().replace(/[^\w\s\-\/]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return [];
  const m = q.match(/(\d+[a-z]?(?:[-\/]\d+[a-z]?)?)\s+([a-z]{2,})/);
  if (m) return [m[1].split(/[-\/]/).pop(), m[2]];
  return q.split(' ').filter(function (t) { return t.length > 2 && !/^(st|rd|street|road|ave|vic|the)$/.test(t); }).slice(0, 2);
}

function araAddrOf_(name, terms) {
  let s = String(name || '').replace(/\.(pdf|json|png|jpe?g|docx?)$/i, '')
    .replace(/^(FILED \d{4}-\d{2}-\d{2} · )?DRAFT · /, '').replace(/\s*\((copy|PREV other tab)[^)]*\)\s*$/i, '');
  const num = terms && terms[0] && /\d/.test(terms[0]) ? terms[0] : null;
  if (num) {
    const re = new RegExp('(?:^|[^\\w])((?:\\d+[a-z]?[-\\/])?' + num + '[a-z]?(?:[-\\/]\\d+[a-z]?)?\\s+[A-Za-z].*)$', 'i');
    const m = s.match(re); if (m) s = m[1];
  }
  return s.replace(/\s+\d{1,2}[-.\/]\d{1,2}[-.\/]\d{2,4}.*$/, '')
    .replace(/\s+(height safety|anchor|cert(ificate|ification)?|recert|install|merged|plan only|photos?)\b.*$/i, '')
    .replace(/[\s,·-]+$/, '').trim();
}

function araSuggestSites(q) {
  who_();
  const terms = araAddrTerms_(q);
  if (!terms.length) return { q: q, terms: [], items: [] };
  const ck = 'ASS_' + terms.join('_');
  const cache = CacheService.getScriptCache();
  const hit = cache.get(ck);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  const esc = function (t) { return String(t).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); };
  const base = terms.map(function (t) { return "title contains '" + esc(t) + "'"; }).join(' and ') + ' and trashed = false';
  const names = {};
  function folderInfo(fid) {
    if (names[fid]) return names[fid];
    let n = '', pid = '';
    try { const f = DriveApp.getFolderById(fid); n = f.getName(); const p = f.getParents(); if (p.hasNext()) pid = p.next().getId(); } catch (e) {}
    return (names[fid] = { name: n, parentId: pid });
  }
  function place(file) {
    let pid = '';
    try { const p = file.getParents(); if (p.hasNext()) pid = p.next().getId(); } catch (e) {}
    const p1 = pid ? folderInfo(pid) : { name: '', parentId: '' };
    const p2 = p1.parentId ? folderInfo(p1.parentId) : { name: '' };
    return { pid: pid, p1: p1.name, p2: p2.name };
  }
  const yearOf = function (s) { const m = String(s).match(/(20\d\d)\s*ANCHOR CERTS/i); return m ? m[1] : ''; };
  const items = [], seen = {};
  function add(o) {
    const k = o.addr.toLowerCase().replace(/[^a-z0-9]/g, '') + '|' + (o.client || '').toLowerCase();
    if (!o.addr || seen[k]) return; seen[k] = 1; items.push(o);
  }
  const t0 = Date.now();

  const it = DriveApp.searchFiles(base + " and (mimeType = 'application/pdf' or mimeType = 'application/json')");
  let n = 0;
  while (it.hasNext() && n < 40 && Date.now() - t0 < 20000) {
    const f = it.next(); n++;
    const name = f.getName(), pl = place(f), isDraft = /\.json$/i.test(name) || pl.p1.trim().toUpperCase() === 'INCOMPLETE CERTS';
    const inCerts = /ANCHOR CERTS/i.test(pl.p1 + ' ' + pl.p2), loose = /ANCHOR CERTS/i.test(pl.p1);
    add({ addr: araAddrOf_(name, terms), client: isDraft || loose ? '' : pl.p1.trim(),
      folderId: isDraft || loose ? '' : pl.pid, folderName: pl.p1.trim(), path: [pl.p2, pl.p1].filter(String).join(' › '),
      year: yearOf(pl.p1) || yearOf(pl.p2), kind: isDraft ? 'draft' : (inCerts ? 'cert' : 'file'), name: name, id: f.getId(), url: f.getUrl(),
      date: Utilities.formatDate(f.getLastUpdated(), 'Australia/Melbourne', 'yyyy-MM-dd'), rank: isDraft ? 0 : inCerts ? 1 : 3 });
  }

  const fit = DriveApp.searchFolders(base);
  n = 0;
  while (fit.hasNext() && n < 15 && Date.now() - t0 < 25000) {
    const d = fit.next(); n++;
    let pn = ''; try { const p = d.getParents(); if (p.hasNext()) pn = p.next().getName(); } catch (e) {}
    add({ addr: araAddrOf_(d.getName(), terms), client: '', folderId: d.getId(), folderName: d.getName(), path: [pn, d.getName()].filter(String).join(' › '),
      year: yearOf(pn), kind: 'folder', name: d.getName(), id: d.getId(), url: d.getUrl(),
      date: Utilities.formatDate(d.getLastUpdated(), 'Australia/Melbourne', 'yyyy-MM-dd'), rank: 2 });
  }
  items.sort(function (a, b) { return a.rank - b.rank || String(b.date).localeCompare(String(a.date)); });
  const out = { q: q, terms: terms, items: items.slice(0, 10), ms: Date.now() - t0 };
  try { cache.put(ck, JSON.stringify(out), 300); } catch (e) {}
  return out;
}
