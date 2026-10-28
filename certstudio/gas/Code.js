const SRC_ID = '';
const DOMAIN = 'realmpcs.com';

const SWAP = [
  ['Works when this page is opened inside Claude with Google Calendar, Gmail and Drive connected.', 'Works when you are signed in to Chrome with your Realm Google account.'],
  ['Works when this page is opened inside Claude with Google Drive connected.', 'Works when you are signed in to Chrome with your Realm Google account.'],
  ['Clean wording needs this page open inside Claude.', 'Clean wording is not wired in the Google version yet — tidy by hand.'],
  ['AI wording fix needs this page open inside Claude — for now, tidy the lines by hand.', 'AI wording fix is not wired in the Google version yet — tidy the lines by hand.'],
  ['Open this page inside Claude (the Claude app) to pull from the diary.', 'Sign in with your Realm Google account to pull from the diary.'],
  ['Open this page inside Claude to search email.', 'Sign in with your Realm Google account to search email.'],
  ['Open inside Claude to search Drive.', 'Sign in with your Realm Google account to search Drive.'],
  ['Open inside Claude to save to Drive — or download and drop it in.', 'Sign in with your Realm Google account to save to Drive — or download and drop it in.'],
  ['Open this page inside Claude with Google Drive connected to upload.', 'Sign in with your Realm Google account to upload.'],
  ['Open this page inside Claude with Google Drive connected, or drop the PDF from Drive on ', 'Sign in with your Realm Google account, or drop the PDF from Drive on '],
  ['<body><title>Realm new cert/anchor plan</title>', '<body>'],
  ['<h1>Realm Cert Studio</h1>', '<h1>Cert Studio</h1>']
];

function doGet() {
  let html = DriveApp.getFileById(SRC_ID).getBlob().getDataAsString('UTF-8');
  SWAP.forEach(([a, b]) => { html = html.split(a).join(b); });
  const shim = HtmlService.createHtmlOutputFromFile('Shim').getContent();
  const inject = '<head>' + shim + START2_HTML + amendUi_() + fileUi_() + walkUi_() + themeUi_() + addrUi_();
  html = html.replace('<head>', () => inject);
  return HtmlService.createHtmlOutput(html)
    .setTitle('Cert Studio')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function themeUi_() { return HtmlService.createHtmlOutputFromFile('Theme').getContent(); }

function who_() {
  const e = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!e.endsWith('@' + DOMAIN)) throw new Error('Sign in to Chrome with your Realm Google account (@' + DOMAIN + ') to use Diary / Email / Drive buttons.');
  return e;
}

function callTool(server, tool, a) {
  who_();
  a = a || {};
  if (server === 'Google Calendar' && tool === 'search_events') return { payload: { events: calSearch_(a.query, a.pageSize || 10) } };
  if (server === 'Gmail' && tool === 'search_threads') return { payload: { threads: mailSearch_(a.query, a.pageSize || 10) } };
  if (server === 'Google Drive') {
    if (tool === 'search_files') return { payload: { files: driveSearch_(a.query, a.pageSize || 10) } };
    if (tool === 'create_file') return { payload: driveCreate_(a) };
    if (tool === 'read_file_content') return { payload: { fileContent: '' } };
    if (tool === 'download_file_content') {
      const f = DriveApp.getFileById(a.fileId);
      return { payload: { content: Utilities.base64Encode(f.getBlob().getBytes()), title: f.getName() } };
    }
  }
  throw new Error('Not wired: ' + server + ' / ' + tool);
}

function calSearch_(q, n) {
  const now = new Date(), from = new Date(now.getTime() - 730 * 864e5), to = new Date(now.getTime() + 180 * 864e5);
  const out = [];
  CalendarApp.getAllCalendars().forEach(c => {
    try {
      c.getEvents(from, to, { search: q }).forEach(ev => {
        const allDay = ev.isAllDayEvent();
        const st = allDay ? Utilities.formatDate(ev.getAllDayStartDate(), 'Australia/Melbourne', 'yyyy-MM-dd') : ev.getStartTime().toISOString();
        out.push({ id: ev.getId(), summary: ev.getTitle(), location: ev.getLocation(), description: ev.getDescription(),
          start: allDay ? { date: st } : { dateTime: st }, calendar: c.getName() });
      });
    } catch (e) {}
  });
  out.sort((x, y) => String(y.start.dateTime || y.start.date).localeCompare(String(x.start.dateTime || x.start.date)));
  return out.slice(0, n);
}

function mailSearch_(q, n) {
  return GmailApp.search(q, 0, n).map(t => ({
    id: t.getId(),
    messages: t.getMessages().slice(0, 5).map(m => ({ subject: m.getSubject(), sender: m.getFrom(), date: m.getDate().toISOString(),
      snippet: (m.getPlainBody() || '').replace(/\s+/g, ' ').slice(0, 400) }))
  }));
}

function toV2_(q) {
  return String(q).replace(/parentId\s*=\s*'([^']+)'/g, "'$1' in parents") + ' and trashed = false';
}
function driveSearch_(q, n) {
  const v2 = toV2_(q), isFolder = /application\/vnd\.google-apps\.folder/.test(q);
  const it = isFolder ? DriveApp.searchFolders(v2) : DriveApp.searchFiles(v2), out = [];
  while (it.hasNext() && out.length < n) {
    const f = it.next();
    out.push({ id: f.getId(), title: f.getName(), mimeType: isFolder ? 'application/vnd.google-apps.folder' : f.getMimeType(),
      modifiedTime: f.getLastUpdated().toISOString(), fileSize: isFolder ? 0 : f.getSize(), viewUrl: f.getUrl() });
  }
  return out;
}
function driveCreate_(a) {

  if (!a.parentId) throw new Error('No parent folder found — create the year folder inside ANCHOR ROOF TEST first, then try again.');
  const parent = DriveApp.getFolderById(a.parentId);
  if (a.contentMimeType === 'application/vnd.google-apps.folder') {
    const f = parent.createFolder(a.title);
    return { id: f.getId(), title: f.getName(), viewUrl: f.getUrl() };
  }
  const blob = Utilities.newBlob(Utilities.base64Decode(a.base64Content || ''), a.contentMimeType || 'application/octet-stream', a.title);
  const f = parent.createFile(blob);
  return { id: f.getId(), title: f.getName(), viewUrl: f.getUrl() };
}

const CAL_ID = __csId('cal');

function keyOf_(s) {
  s = String(s || '').toLowerCase().replace(/\s+/g, ' ');
  const m = s.match(/(\d+(?:\s?[-–]\s?\d+)?)\s+([a-z]+)/);
  if (m) return m[1].replace(/\s/g, '').replace('–', '-') + ' ' + m[2];
  return s.split(' ').slice(0, 2).join(' ').trim();
}

function hit_(names, key) {
  if (!key) return null;
  const re = new RegExp('(^|[^0-9])' + key.replace(/[.*+?^{}$()|[\]\\]/g, '\\$&'));
  return names.find(x => re.test(x.n)) || null;
}

function startData() {
  who_();
  const cal = CalendarApp.getCalendarById(CAL_ID);
  if (!cal) throw new Error('ANCHOR TESTING calendar not found for this account.');
  const now = new Date(), day = 86400000;
  const since = Utilities.formatDate(new Date(now.getTime() - 35 * day), 'UTC', "yyyy-MM-dd'T'HH:mm:ss");
  const names = [];
  const it = DriveApp.searchFiles("title contains 'cert' and mimeType = 'application/pdf' and modifiedDate > '" + since + "'");
  while (it.hasNext() && names.length < 300) { const f = it.next(); names.push({ n: f.getName().toLowerCase(), t: f.getName(), u: f.getUrl() }); }
  const props = PropertiesService.getScriptProperties();
  const done = JSON.parse(props.getProperty('START_DONE') || '{}');
  const rows = cal.getEvents(new Date(now.getTime() - 21 * day), new Date(now.getTime() + 7 * day))
    .filter(e => !e.isAllDayEvent())
    .map(e => {
      const id = e.getId() + '|' + e.getStartTime().getTime();
      const loc = (e.getLocation() || '').replace(/\s+/g, ' ').trim();
      const h = hit_(names, keyOf_(loc || e.getTitle()));
      return { id: id, title: e.getTitle().replace(/\*+/g, '').trim(), loc: loc, when: e.getStartTime().getTime(),
        past: e.getStartTime().getTime() < now.getTime(), cert: h ? h.t : '', certUrl: h ? h.u : '', notes: plain_(e.getDescription()).slice(0, 2000), ticked: !!done[id] };
    });
  return { rows: rows, draft: JSON.parse(props.getProperty('START_DRAFT') || 'null'), at: now.getTime() };
}

function plain_(h) {
  return String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/\n{3,}/g, '\n\n').trim();
}

function startSaveDraft(d) {
  who_();
  PropertiesService.getScriptProperties().setProperty('START_DRAFT', JSON.stringify(d || null));
  return true;
}

function startTick(id, on) {
  who_();
  const p = PropertiesService.getScriptProperties();
  const m = JSON.parse(p.getProperty('START_DONE') || '{}');
  if (on) m[id] = 1; else delete m[id];
  p.setProperty('START_DONE', JSON.stringify(m));
  return true;
}

const START_HTML = [
'<style>',
'#rsb{position:fixed;right:12px;bottom:12px;z-index:99999;background:#e8611a;color:#fff;border:0;border-radius:22px;padding:10px 16px;font:600 14px system-ui;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer}',
'#rs{position:fixed;left:0;top:0;right:0;bottom:0;z-index:99998;background:rgba(0,0,0,.45);display:none}',
'#rs .p{position:absolute;right:0;top:0;bottom:0;width:440px;max-width:100%;box-sizing:border-box;background:#fff;overflow:auto;font:14px system-ui;color:#111;padding:14px 14px 70px}',
'#rs h3{margin:16px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#555}',
'#rs .r{border:1px solid #ddd;border-left-width:5px;border-radius:8px;padding:8px 10px;margin:6px 0}',
'#rs .r b{display:block}#rs .r small{color:#666;display:block}',
'#rs button,#rs a.k{font:600 12px system-ui;border:1px solid #bbb;background:#fff;color:#111;border-radius:6px;padding:5px 9px;margin:6px 6px 0 0;cursor:pointer;text-decoration:none;display:inline-block}',
'#rs .go{background:#e8611a;border-color:#e8611a;color:#fff}',
'#rs .red{border-left-color:#c62828}#rs .grn{border-left-color:#2e7d32}#rs .amb{border-left-color:#f9a825}',
'#rs .msg{color:#666;margin:8px 0}',
'#rs .nt{white-space:pre-wrap;font:12px system-ui;background:#f6f6f6;border-radius:6px;padding:8px;margin:6px 0 0;max-height:260px;overflow:auto}',
'</style>',
'<script>',
'(function(){',
'var P={site:"e.g. 12 Smith",client:"e.g. Strata Co",ref:"e.g. WO"},DATA=null,T=null,box,btn;',
'function inp(k){var a=document.querySelectorAll("input");for(var i=0;i<a.length;i++){if((a[i].placeholder||"").indexOf(P[k])===0)return a[i];}return null;}',
'function dts(){return document.querySelectorAll("input[type=date]");}',
'function setV(el,v){if(!el||v==null)return;var d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");d.set.call(el,v);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));}',
'function two(n){return (n<10?"0":"")+n;}',
'function ymd(t,addY){var d=new Date(t),s;try{s=new Intl.DateTimeFormat("en-CA",{timeZone:"Australia/Melbourne",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);}catch(e){s=d.getFullYear()+"-"+two(d.getMonth()+1)+"-"+two(d.getDate());}if(!addY)return s;var p=s.split("-"),y=+p[0]+addY,m=+p[1],dd=+p[2],last=new Date(y,m,0).getDate();if(dd>last)dd=last;return y+"-"+two(m)+"-"+two(dd);}',
'function nice(t){var d=new Date(t);return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]+" "+d.getDate()+"/"+(d.getMonth()+1);}',
'function val(k){var e=inp(k);return e?e.value:"";}',
'function snap(){var ds=dts();return {site:val("site"),client:val("client"),ref:val("ref"),d0:ds[0]?ds[0].value:"",d1:ds[1]?ds[1].value:"",at:Date.now()};}',
'function fill(d){var ds=dts();setV(inp("site"),d.site);setV(inp("client"),d.client);setV(inp("ref"),d.ref||"");if(d.d0&&ds[0])setV(ds[0],d.d0);if(d.d1&&ds[1])setV(ds[1],d.d1);}',
'function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}',
'function bt(txt,cls,fn){var b=el("button",cls,txt);b.onclick=fn;return b;}',
'function shut(){box.style.display="none";btn.style.display="";}function show(){box.style.display="block";btn.style.display="none";}',
'function row(r,cls){var d=el("div","r "+cls);d.appendChild(el("b",null,r.title));d.appendChild(el("small",null,nice(r.when)+(r.loc?" - "+r.loc:"")));if(r.cert)d.appendChild(el("small",null,"Cert: "+r.cert));if(r.notes){var n=el("pre","nt",r.notes);n.style.display="none";d.appendChild(bt("Booking notes",null,function(){n.style.display=n.style.display==="none"?"block":"none";}));d.appendChild(n);}return d;}',
'function start(r){fill({site:r.loc||r.title,client:r.title,d0:ymd(r.when,0),d1:ymd(r.when,1)});shut();save();}',
'function draw(){var p=box.firstChild;p.innerHTML="";var top=el("div");top.appendChild(el("b",null,"Cert Studio — start here"));top.appendChild(bt("Close",null,shut));top.appendChild(bt("Refresh",null,load));p.appendChild(top);',
'if(!DATA){p.appendChild(el("div","msg","Loading the list..."));return;}',
'if(DATA.err){p.appendChild(el("div","msg",DATA.err));return;}',
'p.appendChild(el("h3",null,"Pick up where we left off"));',
'if(DATA.draft&&DATA.draft.site){var d=el("div","r amb");d.appendChild(el("b",null,DATA.draft.site));d.appendChild(el("small",null,"Site details saved "+new Date(DATA.draft.at).toLocaleString()+". Aerial and anchors are not saved yet."));d.appendChild(bt("Resume","go",function(){fill(DATA.draft);shut();}));d.appendChild(bt("Clear",null,function(){google.script.run.withSuccessHandler(load).startSaveDraft(null);}));p.appendChild(d);}else{p.appendChild(el("div","msg","Nothing unfinished."));}',
'var out=[],wk=[],ok=[];DATA.rows.forEach(function(r){if(!r.past)wk.push(r);else if(r.cert||r.ticked)ok.push(r);else out.push(r);});',
'out.sort(function(a,b){return a.when-b.when;});wk.sort(function(a,b){return a.when-b.when;});ok.sort(function(a,b){return b.when-a.when;});',
'p.appendChild(el("h3",null,"No cert found - last 3 weeks ("+out.length+")"));',
'out.forEach(function(r){var d=row(r,"red");d.appendChild(bt("Start cert","go",function(){start(r);}));d.appendChild(bt("Already filed / not done",null,function(){google.script.run.withSuccessHandler(load).startTick(r.id,true);}));p.appendChild(d);});',
'p.appendChild(el("h3",null,"This week - pre-fill ("+wk.length+")"));',
'wk.forEach(function(r){var d=row(r,"amb");d.appendChild(bt("Pre-fill","go",function(){start(r);}));p.appendChild(d);});',
'p.appendChild(el("h3",null,"Filed - recheck ("+ok.length+")"));',
'ok.forEach(function(r){var d=row(r,"grn");if(r.certUrl){var a=el("a","k","Open cert");a.href=r.certUrl;a.target="_blank";d.appendChild(a);}if(r.ticked)d.appendChild(bt("Undo tick",null,function(){google.script.run.withSuccessHandler(load).startTick(r.id,false);}));p.appendChild(d);});',
'p.appendChild(el("div","msg","A booking in the diary does not prove the test was done. Matching is by street address in the cert file name."));}',
'function load(){DATA=null;draw();google.script.run.withSuccessHandler(function(x){DATA=x;draw();if(x.draft&&x.draft.site&&!val("site"))show();}).withFailureHandler(function(e){DATA={err:String(e&&e.message||e)};draw();}).startData();}',
'function save(){var s=snap();if(!s.site)return;google.script.run.withSuccessHandler(function(){btn.textContent="Start / list - saved "+two(new Date().getHours())+":"+two(new Date().getMinutes());}).startSaveDraft(s);}',
'function init(){btn=el("button",null,"Start / list");btn.id="rsb";btn.onclick=show;box=el("div");box.id="rs";box.appendChild(el("div","p"));box.onclick=function(e){if(e.target===box)shut();};document.body.appendChild(box);document.body.appendChild(btn);',
'document.addEventListener("input",function(e){if(box.contains(e.target))return;clearTimeout(T);T=setTimeout(save,1500);},true);load();}',
'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();',
'})();',
'</script>'
];

function sp2Key_(s) {
  s = String(s || '').toLowerCase().replace(/\s+/g, ' ');
  const m = s.match(/(?:^|[^0-9a-z])(\d+)[a-z]?(?:\s?[-–\/&]\s?(\d+)[a-z]?)?\s+((?:(?:st|mt|the)\s+)?[a-z][a-z']*)/);
  if (!m) return null;
  const words = m[3].split(' ');
  return { a: m[1], b: m[2] || '', word: m[3], q: words[words.length - 1] };
}

function sp2Date_(name, fileMs) {
  const s = String(name || '');
  const re = /(\d{1,2})[-.\/](\d{1,2})[-.\/](\d{4}|\d{2})(?!\d)/g;
  let m, best = null;
  while ((m = re.exec(s))) {
    const d = +m[1], mo = +m[2], y = m[3].length === 2 ? 2000 + (+m[3]) : +m[3];
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 2015 && y <= 2040) best = new Date(y, mo - 1, d, 12).getTime();
  }
  if (best) return { t: best, p: 'd' };
  const ym = s.match(/(?:^|[^0-9])(20[12]\d)(?![0-9])/);
  if (ym) return { t: new Date(+ym[1], 6, 1, 12).getTime(), p: 'y' };
  return { t: Number(fileMs) || 0, p: 'm' };
}

function sp2Find_(k) {
  const esc = function (x) { return String(x).replace(/[.*+?^{}$()|[\]\\]/g, '\\$&'); };
  const num = k.b ? '(?:' + esc(k.a) + '|' + esc(k.b) + ')' : esc(k.a);
  const re = new RegExp('(^|[^0-9])(?:\\d+[a-z]?\\s?[-–\\/&]\\s?)?' + num + '[a-z]?(?:\\s?[-–\\/&]\\s?\\d+[a-z]?)?[\\s,]+' + esc(k.word).replace(/ /g, '\\s+'));
  const it = DriveApp.searchFiles("title contains '" + k.q.replace(/'/g, "\\'") + "' and mimeType = 'application/pdf' and trashed = false");
  const seen = {}, out = [];
  let n = 0;
  while (it.hasNext() && n < 250) {
    n++;
    const f = it.next(), name = f.getName(), low = name.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!re.test(low)) continue;
    if (!/cert|height safety|anchor/.test(low)) continue;
    if (notCertName_(name)) continue;
    const dk = low.replace(/\s*\(\d+\)/g, '').replace(/\s*copy\b/g, '').replace(/\s+/g, ' ').trim();
    if (seen[dk]) continue;
    seen[dk] = 1;
    const d = sp2Date_(name, f.getLastUpdated().getTime());
    out.push({ id: f.getId(), t: name.replace(/\s+/g, ' ').trim(), u: f.getUrl(), d: d.t, p: d.p, kb: Math.round(f.getSize() / 1024) });
  }
  out.sort(function (x, y) { return y.d - x.d; });
  return out.slice(0, 8);
}

function certHistory(items) {
  who_();
  const out = {}, cache = {};
  (items || []).slice(0, 6).forEach(function (r) {
    try {
      const k = sp2Key_(r.loc) || sp2Key_(r.title);
      if (!k) { out[r.id] = { now: null, last: null, n: 0, key: '' }; return; }
      const ck = k.a + '|' + k.b + '|' + k.word;
      if (!cache[ck]) cache[ck] = sp2Find_(k);
      const all = cache[ck], cut = Number(r.when) - 45 * 864e5;
      let now = null, last = null;
      all.forEach(function (f) {
        if (f.p === 'd' && f.d >= cut) { if (!now) now = f; }
        else if (!last) last = f;
      });
      out[r.id] = { now: now, last: last, n: all.length, key: k.a + (k.b ? '-' + k.b : '') + ' ' + k.word };
    } catch (e) {
      out[r.id] = { err: String(e && e.message || e) };
    }
  });
  return out;
}

const START2_HTML = String.raw`<style>
#rsb{position:fixed;right:12px;bottom:12px;z-index:99999;background:#e8611a;color:#fff;border:0;border-radius:22px;padding:10px 16px;font:600 14px system-ui;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer}
#rs{position:fixed;left:0;top:0;right:0;bottom:0;z-index:99998;background:rgba(0,0,0,.45);display:none}
#rs .p{position:absolute;right:0;top:0;bottom:0;width:440px;max-width:100%;box-sizing:border-box;background:#fff;overflow:auto;font:14px system-ui;color:#111;padding:14px 14px 70px}
#rs h3{margin:16px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#666)}
#rs .r{border:1px solid #ddd;border-left-width:5px;border-radius:8px;padding:8px 10px;margin:6px 0}
#rs .r b{display:block}#rs .r small{color:var(--muted,#666);display:block}
#rs button,#rs a.k{font:600 14px system-ui;min-height:44px;min-width:44px;box-sizing:border-box;border:1px solid #bbb;background:#fff;color:#111;border-radius:8px;padding:10px 14px;margin:6px 6px 0 0;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;max-width:100%;white-space:normal;text-align:left}
#rsb{min-height:44px}
/* Round 5: Ange's 44px rule on the main cert screen too. CSS only; screen only, so print is untouched. */
@media screen{body button,body select,body input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]){min-height:44px!important;box-sizing:border-box!important}
body button.amx{min-height:44px!important;box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}
body .links a,body aside.certrail a{display:flex!important;align-items:center;min-height:44px!important;box-sizing:border-box}
body #pgPrev,body #pgNext,body #pgDel,body #pgAdd,body #lvTog,body button.amx{min-width:44px!important;box-sizing:border-box}
body .rtbar button{min-width:44px!important;box-sizing:border-box}
@media (max-width:600px){body{padding-top:54px!important}body #lvTog{position:absolute!important;top:5px!important;bottom:auto!important;left:auto!important;right:12px!important;writing-mode:horizontal-tb!important;transform:none!important;border:1px solid #22c55e!important;border-radius:10px!important;padding:0 10px!important;min-height:44px!important;display:flex!important;align-items:center}body #lvTog .dot{margin:0 6px 0 0!important}body #lvPanel .lv-head{padding-right:84px}body #rs .p{padding-top:58px!important}}
@media (min-width:601px){body{padding-top:54px!important}body #lvTog{position:absolute!important;top:5px!important;bottom:auto!important;left:auto!important;right:12px!important;writing-mode:horizontal-tb!important;transform:none!important;border:1px solid #22c55e!important;border-radius:10px!important;padding:0 10px!important;min-height:44px!important;display:flex!important;align-items:center}body #lvTog .dot{margin:0 6px 0 0!important}body #lvPanel .lv-head{padding-right:84px}body #rs .p{padding-top:58px!important}}
#amb{min-height:44px;box-sizing:border-box}
body label:has(>input[type=checkbox]),body label:has(>input[type=radio]){display:flex;align-items:center;gap:6px;min-height:44px;box-sizing:border-box}}
#rs .due{cursor:pointer}
#rs .due:hover{outline:2px solid #2fbf71;outline-offset:-2px}
#rs .go{background:#e8611a;border-color:#e8611a;color:#fff}
#rs .red{border-left-color:#c62828}#rs .grn{border-left-color:#2e7d32}#rs .amb{border-left-color:#f9a825}
#rs .msg{color:var(--muted,#666);margin:8px 0}
#rs .nt{white-space:pre-wrap;font:12px system-ui;background:#f6f6f6;border-radius:6px;padding:8px;margin:6px 0 0;max-height:260px;overflow:auto}
#rs .chk{color:#333;margin-top:4px}
</style>
<script>
(function(){
var P={site:"e.g. 12 Smith",client:"e.g. Strata Co",ref:"e.g. WO"},DATA=null,H={},DR=null,DUE=null,Q=[],BUSY=false,RUN=0,T=null,box,btn,AFV=null,AFW="",AFD=0;
function inp(k){var a=document.querySelectorAll("input");for(var i=0;i<a.length;i++){if((a[i].placeholder||"").indexOf(P[k])===0)return a[i];}return null;}
function dts(){return document.querySelectorAll("input[type=date]");}
function setV(el,v){if(!el||v==null)return;var d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");d.set.call(el,v);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));}
function two(n){return (n<10?"0":"")+n;}
function ymd(t,addY){var d=new Date(t),s;try{s=new Intl.DateTimeFormat("en-CA",{timeZone:"Australia/Melbourne",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);}catch(e){s=d.getFullYear()+"-"+two(d.getMonth()+1)+"-"+two(d.getDate());}if(!addY)return s;var p=s.split("-"),y=+p[0]+addY,m=+p[1],dd=+p[2],last=new Date(y,m,0).getDate();if(dd>last)dd=last;return y+"-"+two(m)+"-"+two(dd);}
function nice(t){var d=new Date(t);try{var p={};new Intl.DateTimeFormat("en-AU",{timeZone:"Australia/Melbourne",weekday:"short",day:"numeric",month:"numeric"}).formatToParts(d).forEach(function(x){p[x.type]=x.value;});if(p.weekday&&p.day&&p.month)return p.weekday.slice(0,3)+" "+(+p.day)+"/"+(+p.month);}catch(e){}return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]+" "+d.getDate()+"/"+(d.getMonth()+1);}
function cdate(f){if(!f||!f.d)return "";var d=new Date(f.d);if(f.p==="d")return d.getDate()+"/"+(d.getMonth()+1)+"/"+d.getFullYear();return String(d.getFullYear())+(f.p==="m"?" (file date)":"");}
function clientOf(t){var s=String(t||"").trim(),m=s.split(/\s+\d/)[0].trim();return m||s;}
function val(k){var e=inp(k);return e?e.value:"";}
function snap(){var ds=dts();return {site:val("site"),client:val("client"),ref:val("ref"),d0:ds[0]?ds[0].value:"",d1:ds[1]?ds[1].value:"",at:Date.now()};}
function fill(d){var ds=dts();setV(inp("site"),d.site);setV(inp("client"),d.client);setV(inp("ref"),d.ref||"");if(d.d0&&ds[0])setV(ds[0],d.d0);if(d.d1&&ds[1])setV(ds[1],d.d1);}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
function bt(txt,cls,fn){var b=el("button",cls,txt);b.type="button";b.onclick=fn;return b;}
function lk(txt,href){var a=el("a","k",txt);a.href=href;a.target="_blank";a.rel="noopener";return a;}
function shut(){box.style.display="none";btn.style.display="";}
function show(){box.style.display="block";btn.style.display="none";}
function gid(i){return document.getElementById(i);}

function row(r,cls){var d=el("div","r "+cls);d.appendChild(el("b",null,r.title));d.appendChild(el("small",null,nice(r.when)+(r.loc?" - "+r.loc:"")));
 if(r.notes){var n=el("pre","nt",r.notes);n.style.display="none";d.appendChild(bt("Booking notes",null,function(){n.style.display=n.style.display==="none"?"block":"none";}));d.appendChild(n);}
 return d;}

function start(r){fill({site:r.loc||r.title,client:clientOf(r.title),d0:ymd(r.when,0),d1:ymd(r.when,1)});shut();save();}

/* Redo straight from the list: fetch last year's cert from Drive and hand it to the Redo cert window. */
function redo(r,f){
 var rb=gid("redoBtn"),fi=gid("rdFile");
 if(!rb||!fi||f.kb>25000){start(r);window.open(f.u,"_blank");return;}
 shut();window.__rdBooking=r.when?ymd(r.when,0):"";rb.click();
 var m=gid("rdMsg"),fd=gid("rdFound");if(fd)fd.hidden=true;
 if(m)m.textContent="Fetching "+f.t+" from Drive...";
 google.script.run.withSuccessHandler(function(x){
  try{var b64=(x&&x.payload&&x.payload.content)||"";if(!b64)throw new Error("empty file");
   var bin=atob(b64),u8=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
   var file=new File([u8],/\.pdf$/i.test(f.t)?f.t:f.t+".pdf",{type:"application/pdf"}),dt=new DataTransfer();dt.items.add(file);
   fi.files=dt.files;fi.dispatchEvent(new Event("change",{bubbles:true}));waitFound(r,f,0);
  }catch(e){if(m)m.textContent="Could not load the old cert ("+(e.message||e)+"). Use Find in Drive below, or drop the PDF here.";}
 }).withFailureHandler(function(e){if(m)m.textContent="Could not load the old cert ("+(e&&e.message||e)+"). Use Find in Drive below, or drop the PDF here.";})
 .callTool("Google Drive","download_file_content",{fileId:f.id});
}
function put(id,v,always){var e=gid(id);if(!e||!v)return;if(always||!e.value){e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));}}
function waitFound(r,f,n){
 var fd=gid("rdFound");
 if(fd&&!fd.hidden){
  put("rdSite",r.loc,false);put("rdClient",r.client!=null?r.client:clientOf(r.title),false);
  if(window.realmRedoDates)window.realmRedoDates();else if(r.when){put("rdDate",ymd(r.when,0),true);put("rdDue",ymd(r.when,1),true);}
  var note=gid("rsRedoNote");if(!note){note=el("div",null,"");note.id="rsRedoNote";note.style.cssText="background:#fff8e1;border-left:5px solid #f9a825;border-radius:6px;padding:8px 10px;margin:8px 0;font:13px system-ui;color:#333;white-space:pre-wrap";fd.insertBefore(note,fd.firstChild);}
  note.textContent="CHECK BEFORE YOU START\n1. Date of works: "+(r.when?"the diary booking ("+nice(r.when)+")":"today")+", unless the job chat gave the day. Change it if the crew did it on another day.\n2. Client: the managing agent may have changed since "+(cdate(f)||"the last cert")+".\n3. Every component comes in untested. Mark Pass or Fail from what the crew found this year.";
  return;}
 if(n<180)setTimeout(function(){waitFound(r,f,n+1);},500);
}

/* Open a full draft (site, aerial, anchors, certificate) through the Amend panel, which owns the loader. */
function openDraft(x){
 var ab=gid("amb");if(!ab)return;shut();ab.click();
 var tries=0,stage=0,iv=setInterval(function(){tries++;var am=gid("am");if(!am||tries>75){clearInterval(iv);return;}
  if(stage===0){var bs=am.querySelectorAll("button");for(var i=0;i<bs.length;i++){if(bs[i].textContent==="Open an incomplete cert"){bs[i].click();stage=1;return;}}}
  else{var rs=am.querySelectorAll(".r");for(var j=0;j<rs.length;j++){var b=rs[j].querySelector("b");if(b&&b.textContent===x.name){var ob=rs[j].querySelector("button");if(ob){clearInterval(iv);ob.click();}return;}}}
 },400);
}

function tick(r,on){google.script.run.withSuccessHandler(load).startTick(r.id,on);}
/* Ask 2 (28 Oct): the cert he's up to. Walk the past bookings oldest first; the first with no cert filed is it.
   Waits while a booking before it is still being checked against Drive, so it never skips one. */
function upTo(){if(!DATA||!DATA.rows)return {wait:true};var a=DATA.rows.filter(function(r){return r.past&&!r.ticked;}).sort(function(m,n){return m.when-n.when;}),left=0,first=null;
 for(var i=0;i<a.length;i++){var h=H[a[i].id];if(!h&&!first)return {wait:true};if(!h)continue;var filed=h.err?!!a[i].cert:!!h.now;if(!filed){left++;if(!first)first=a[i];}}
 return {r:first,left:left};}
function acts(d,r,h){
  if(!h){d.appendChild(el("small","chk","Checking Drive for past certs..."));d.appendChild(bt("New cert",null,function(){start(r);}));}
  else if(h.err){d.appendChild(el("small","chk","Couldn't check Drive for this job just now. Tap Refresh to try again, or start a new cert."));d.appendChild(bt("New cert","go",function(){start(r);}));}
  else if(h.last){d.appendChild(el("small","chk","No cert for this job yet. Last cert: "+cdate(h.last)+" - "+h.last.t));
   d.appendChild(bt("Redo from "+cdate(h.last)+" cert","go",function(){redo(r,h.last);}));d.appendChild(lk("Open last cert",h.last.u));d.appendChild(bt("New cert (blank)",null,function(){start(r);}));}
  else{d.appendChild(el("small","chk","No past cert found in Drive for "+(h.key||"this address")+". First cert for this site, or the old one is filed under the client or building name: use Redo cert, Find in Drive."));d.appendChild(bt("New cert","go",function(){start(r);}));}
  d.appendChild(bt("Already filed / not done",null,function(){tick(r,true);}));}
/* Ask 3 (28 Oct): fill the job with the next address due, so nothing is typed. Order: the cert he's up to
   (diary), then the next booking this week (diary), then the soonest Due next site (Drive). Only into an empty
   site box, or one this code filled and nobody changed; never over a saved draft. Not saved as a draft by itself. */
function nextDue(){var u=upTo();if(u.wait)return null;
 if(u.r)return {site:u.r.loc||u.r.title,client:clientOf(u.r.title),d0:ymd(u.r.when,0),d1:ymd(u.r.when,1),why:"the cert you're up to ("+nice(u.r.when)+" in the diary)"};
 var wk=DATA.rows.filter(function(r){return !r.past;}).sort(function(m,n){return m.when-n.when;})[0];
 if(wk)return {site:wk.loc||wk.title,client:clientOf(wk.title),d0:ymd(wk.when,0),d1:ymd(wk.when,1),why:"the next booking ("+nice(wk.when)+" in the diary)"};
 if(DUE===null)return null;var x=DUE.items&&DUE.items[0];
 if(x)return {site:x.addr,client:x.client||"",d0:x.booked?ymd(x.booked,0):"",d1:x.booked?ymd(x.booked,1):"",why:"next due ("+dmyS(x.due)+")"};
 return false;}
var AFK="realm:certstudio-autofill",TY={};
/* A box he really types in (a trusted input event) is his, even when the value equals the page's own default. */
document.addEventListener("input",function(e){if(!e.isTrusted)return;var t=e.target,ds=dts();if(t===inp("site"))TY.site=1;else if(t===inp("client"))TY.client=1;else if(t===ds[0])TY.d0=1;else if(t===ds[1])TY.d1=1;},true);
function afGet(){try{return JSON.parse(localStorage.getItem(AFK)||"null");}catch(e){return null;}}
function afNow(){var ds=dts();return {site:val("site"),client:val("client"),d0:ds[0]?ds[0].value:"",d1:ds[1]?ds[1].value:""};}
function autoFill(){if(!DATA||DATA.err||(DATA.draft&&DATA.draft.site))return;
 var a=afGet()||{},c=afNow(),k=["site","client","d0","d1"],ch=false,t0=ymd(Date.now(),0),df={d0:t0,d1:ymd(Date.now(),1)};
 for(var i=0;i<k.length;i++){var v=c[k[i]];if(v&&(TY[k[i]]||v!==a[k[i]]&&v!==df[k[i]]))return;}   /* his own value: hands off (the page's own today / +12 months default is not his, unless he typed it) */
 if(a.site&&c.site===a.site&&AFV!==a.site){AFV=a.site;AFW=a.why||"";ch=true;}
 var n=nextDue(),same=!!a.site;for(i=0;i<k.length;i++)if(c[k[i]]!==a[k[i]])same=false;
 if(n){var w={site:n.site,client:n.client,d0:n.d0||df.d0,d1:n.d1||df.d1},nk=JSON.stringify([w.site,w.client,w.d0,w.d1]);   /* all four fields, so a re-booking at the same address on a new date refills */
  if(!(a.site&&c.site===a.site&&a.nk===nk)){fill(w);clearTimeout(T);TY={};var f=afNow();f.why=n.why;f.nk=nk;try{localStorage.setItem(AFK,JSON.stringify(f));}catch(e){}AFV=f.site;AFW=n.why;ch=true;}}
 else if(n===false&&same){var ds=dts();setV(inp("site"),"");setV(inp("client"),"");if(ds[0])setV(ds[0],df.d0);if(ds[1])setV(ds[1],df.d1);clearTimeout(T);TY={};   /* nothing left to fill: take the old auto-fill down, back to a blank job */
  try{localStorage.removeItem(AFK);}catch(e){}AFV=null;AFW="";ch=true;}
 if(ch&&!AFD){AFD=1;try{draw();}finally{AFD=0;}}}
function dmyS(s){var p=String(s||"").split("-");return p.length<3?String(s||""):(+p[2])+"/"+(+p[1])+"/"+p[0];}
/* Due next: fill the job with the site and client, then open Redo with last year's cert. */
function dueGo(x){fill({site:x.addr,client:x.client||""});save();redo({id:"due|"+x.key,loc:x.addr,title:x.client||x.addr,client:x.client||"",when:x.booked||null},{id:x.id,t:x.name,u:x.url,kb:x.kb||0,d:x.last?new Date(x.last+"T12:00:00").getTime():0,p:x.lastP||"d"});}

function draw(){var p=box.firstChild,keep=p.scrollTop;p.innerHTML="";var top=el("div");top.appendChild(el("b",null,"Cert Studio — start here"));top.appendChild(bt("Close",null,shut));top.appendChild(bt("Refresh",null,load));p.appendChild(top);
 if(!DATA){p.appendChild(el("div","msg","Loading the list..."));return;}
 if(DATA.err){p.appendChild(el("div","msg",DATA.err));return;}

 p.appendChild(el("h3",null,"Pick up where we left off"));
 var any=false;
 if(DR&&DR.length){any=true;DR.slice(0,6).forEach(function(x){var d=el("div","r amb");d.appendChild(el("b",null,x.name));d.appendChild(el("small",null,((x.desc||"").split(" | ")[0]||"no client yet")+" - saved "+new Date(x.at).toLocaleString()+" - "+x.kb+" KB"));d.appendChild(el("small",null,"Full draft in INCOMPLETE CERTS: site, aerial, anchors, certificate."));d.appendChild(bt("Open draft","go",function(){openDraft(x);}));p.appendChild(d);});}
 else if(DR===null){p.appendChild(el("div","msg","Checking INCOMPLETE CERTS in Drive..."));}
 if(DATA.draft&&DATA.draft.site){any=true;var d0=el("div","r amb");d0.appendChild(el("b",null,DATA.draft.site));d0.appendChild(el("small",null,"Site details only, saved "+new Date(DATA.draft.at).toLocaleString()+". No aerial or anchors in this one."));d0.appendChild(bt("Resume","go",function(){fill(DATA.draft);shut();}));d0.appendChild(bt("Clear",null,function(){google.script.run.withSuccessHandler(load).startSaveDraft(null);}));p.appendChild(d0);}
 if(!any&&DR!==null)p.appendChild(el("div","msg","Nothing unfinished."));

 p.appendChild(el("h3",null,"You're up to"));
 var u=upTo();
 if(u.wait)p.appendChild(el("div","msg","Checking the diary against Drive..."));
 else if(!u.r)p.appendChild(el("div","msg","All caught up: every booking in the last 3 weeks has a cert or is ticked off."));
 else{var ud=row(u.r,"red");ud.id="rsUpTo";ud.appendChild(el("small","chk","Oldest booking with no cert yet. "+u.left+" to go, oldest first."));acts(ud,u.r,H[u.r.id]);p.appendChild(ud);}
 if(AFV&&val("site")===AFV)p.appendChild(el("div","msg","Filled in for you: "+AFV+", "+AFW+". Change the site box to pick another."));

 p.appendChild(el("h3",null,"Due next (8 weeks)"+(DUE&&DUE.items?" ("+DUE.items.length+")":"")));
 if(DUE===null)p.appendChild(el("div","msg","Checking last year's certs in Drive..."));
 else if(DUE.err)p.appendChild(el("div","msg","Could not read the certs: "+DUE.err));
 else if(!DUE.items.length)p.appendChild(el("div","msg","Nothing due in the next 8 weeks."));
 else DUE.items.forEach(function(x){var d=el("div","r due "+(x.days<0?"red":x.days<=14?"amb":"grn"));d.appendChild(el("b",null,x.addr));
  d.appendChild(el("small",null,(x.client?x.client+" - ":"")+"last cert "+dmyS(x.last)+" - due "+dmyS(x.due)+" ("+(x.days<0?(-x.days)+" days overdue":x.days===0?"today":"in "+x.days+" days")+")"));
  d.appendChild(el("small","chk",x.booked?"Booked "+nice(x.booked)+" in the diary. Redo is dated that day, next due 12 months on.":"Not booked in the diary yet. Redo is dated today, next due 12 months on."));
  var go=bt("Redo from last cert","go",function(e){e.stopPropagation();dueGo(x);});d.appendChild(go);d.appendChild(lk("Open last cert",x.url));
  d.onclick=function(e){if(e.target.closest("a,button"))return;dueGo(x);};p.appendChild(d);});

 var out=[],wk=[],ok=[];
 DATA.rows.forEach(function(r){var h=H[r.id],filed=(h&&!h.err)?!!h.now:!!r.cert;if(!r.past)wk.push(r);else if(r.ticked||filed)ok.push(r);else out.push(r);});
 out.sort(function(a,b){return a.when-b.when;});wk.sort(function(a,b){return a.when-b.when;});ok.sort(function(a,b){return b.when-a.when;});

 p.appendChild(el("h3",null,"Cert not done - last 3 weeks ("+out.length+")"));
 out.forEach(function(r){var d=row(r,"red");acts(d,r,H[r.id]);p.appendChild(d);});
 if(!out.length)p.appendChild(el("div","msg","Nothing outstanding."));

 p.appendChild(el("h3",null,"This week - pre-fill ("+wk.length+")"));
 wk.forEach(function(r){var d=row(r,"amb"),h=H[r.id];
  if(h&&h.last){d.appendChild(el("small","chk","Last cert: "+cdate(h.last)+" - "+h.last.t));d.appendChild(bt("Pre-fill from "+cdate(h.last)+" cert","go",function(){redo(r,h.last);}));d.appendChild(lk("Open last cert",h.last.u));d.appendChild(bt("Pre-fill blank",null,function(){start(r);}));}
  else{if(!h)d.appendChild(el("small","chk","Checking Drive for past certs..."));else if(!h.err)d.appendChild(el("small","chk","No past cert found in Drive."));d.appendChild(bt("Pre-fill","go",function(){start(r);}));}
  p.appendChild(d);});

 p.appendChild(el("h3",null,"Filed - recheck ("+ok.length+")"));
 ok.forEach(function(r){var d=row(r,"grn"),h=H[r.id],f=h&&h.now;
  if(f){d.appendChild(el("small","chk","Cert: "+f.t));d.appendChild(lk("Open cert",f.u));}
  else if(!h&&r.cert){d.appendChild(el("small","chk","Cert: "+r.cert));if(r.certUrl)d.appendChild(lk("Open cert",r.certUrl));}
  else if(r.ticked){d.appendChild(el("small","chk","Ticked by hand. No cert file matched."+(h&&h.last?" Last cert on file: "+cdate(h.last)+".":"")));}
  if(r.ticked)d.appendChild(bt("Undo tick",null,function(){tick(r,false);}));p.appendChild(d);});

 p.appendChild(el("div","msg","Matched by street address in the cert file name, across every year in Drive. Filed = a cert dated on or after the booking. A booking in the diary does not prove the test was done."));
 p.scrollTop=keep;
 try{autoFill();}catch(e){}
}

function pump(run){
 if(run!==RUN)return;
 if(!Q.length){BUSY=false;return;}
 BUSY=true;var part=Q.splice(0,4);
 google.script.run.withSuccessHandler(function(m){if(run!==RUN)return;for(var k in m)H[k]=m[k];draw();pump(run);})
  .withFailureHandler(function(e){if(run!==RUN)return;part.forEach(function(r){H[r.id]={err:String(e&&e.message||e)};});draw();pump(run);})
  .certHistory(part.map(function(r){return {id:r.id,loc:r.loc,title:r.title,when:r.when};}));
}

function load(){DATA=null;DR=null;DUE=null;H={};Q=[];RUN++;var run=RUN;draw();
 google.script.run.withSuccessHandler(function(d){if(run!==RUN)return;DUE=d&&d.items?d:{items:[]};draw();}).withFailureHandler(function(e){if(run!==RUN)return;DUE={err:String(e&&e.message||e),items:[]};draw();}).dueNext(8);
 google.script.run.withSuccessHandler(function(x){if(run!==RUN)return;DATA=x;
   var a=[],b=[];x.rows.forEach(function(r){if(r.past){if(!r.ticked)a.push(r);}else b.push(r);});
   a.sort(function(m,n){return m.when-n.when;});b.sort(function(m,n){return m.when-n.when;});Q=a.concat(b);
   draw();if(x.draft&&x.draft.site&&!val("site"))show();pump(run);})
  .withFailureHandler(function(e){if(run!==RUN)return;DATA={err:String(e&&e.message||e)};draw();}).startData();
 google.script.run.withSuccessHandler(function(a){if(run!==RUN)return;DR=a||[];draw();}).withFailureHandler(function(){if(run!==RUN)return;DR=[];draw();}).amendDraftList();
}
function save(){var s=snap();if(!s.site)return;google.script.run.withSuccessHandler(function(){btn.textContent="Start / list - saved "+two(new Date().getHours())+":"+two(new Date().getMinutes());}).startSaveDraft(s);}
function init(){btn=el("button",null,"Start / list");btn.id="rsb";btn.type="button";btn.onclick=show;box=el("div");box.id="rs";box.appendChild(el("div","p"));box.onclick=function(e){if(e.target===box)shut();};document.body.appendChild(box);document.body.appendChild(btn);
 document.addEventListener("input",function(e){if(box.contains(e.target))return;var rm=gid("rdModal");if(rm&&rm.contains(e.target))return;clearTimeout(T);T=setTimeout(save,1500);},true);load();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
</script>`;

function bookingFor_(evs, key, nowMs) {
  const start = new Date(nowMs); start.setHours(0, 0, 0, 0);
  let next = null, past = null;
  (evs || []).forEach(function (e) {
    if (e.isAllDayEvent && e.isAllDayEvent()) return;
    const loc = String((e.getLocation && e.getLocation()) || ''), title = String(e.getTitle() || '').replace(/\*+/g, '').trim();
    const k = sp2Key_(loc) || sp2Key_(title); if (!k) return;
    if (k.a + (k.b ? '-' + k.b : '') + ' ' + k.word !== key) return;
    const t = e.getStartTime().getTime(), b = { when: t, title: title };
    if (t >= start.getTime()) { if (!next || t < next.when) next = b; }
    else if (!past || t > past.when) past = b;
  });
  return next || past;
}

function dueNext(weeks) {
  who_();
  weeks = Math.min(Math.max(Number(weeks) || 8, 1), 26);
  const cache = CacheService.getScriptCache(), ck = 'DUE_' + weeks;
  const hit = cache.get(ck);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  const tz = 'Australia/Melbourne', day = 864e5, now = new Date(), t0 = Date.now();
  const iso = function (ms) { return Utilities.formatDate(new Date(ms), tz, 'yyyy-MM-dd'); };
  const today = iso(now.getTime());
  const since = Utilities.formatDate(new Date(now.getTime() - 450 * day), tz, "yyyy-MM-dd'T'HH:mm:ss");
  const it = DriveApp.searchFiles("mimeType = 'application/pdf' and trashed = false and modifiedDate > '" + since + "'");
  const best = {};
  let n = 0;
  while (it.hasNext() && n < 1500 && Date.now() - t0 < 25000) {
    const f = it.next(); n++;
    const name = f.getName(), low = name.toLowerCase();
    if (notCertName_(name) || /\bdraft\b/i.test(name)) continue;
    const k = sp2Key_(name); if (!k) continue;
    let client = '', inCerts = false;
    try { const p = f.getParents(); if (p.hasNext()) { const pf = p.next(), g = pf.getParents(); if (g.hasNext() && /ANCHOR CERTS/i.test(g.next().getName())) { client = pf.getName().trim(); inCerts = true; } else if (/ANCHOR CERTS/i.test(pf.getName())) inCerts = true; } } catch (e) {}
    if (!inCerts && !/cert|height safety|anchor/.test(low)) continue;
    const d = sp2Date_(name, f.getLastUpdated().getTime());
    if (d.p === 'y') continue;
    const key = k.a + (k.b ? '-' + k.b : '') + ' ' + k.word;
    if (best[key] && best[key].t >= d.t) continue;
    let addr = '';
    try { addr = araAddrOf_(name, [k.a]); } catch (e) {}
    best[key] = { t: d.t, p: d.p, key: key, addr: addr || name.replace(/\.pdf$/i, ''), client: client, id: f.getId(), name: name, url: f.getUrl(), kb: Math.round(f.getSize() / 1024) };
  }
  const plusYear = function (s) { const p = s.split('-'); let y = +p[0] + 1, m = +p[1], dd = +p[2]; const last = new Date(y, m, 0).getDate(); if (dd > last) dd = last; return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + dd).slice(-2); };
  const dayNo = function (s) { const p = s.split('-'); return Math.round(new Date(+p[0], +p[1] - 1, +p[2], 12).getTime() / day); };
  const items = [];
  Object.keys(best).forEach(function (key) {
    const b = best[key], last = iso(b.t), due = plusYear(last), days = dayNo(due) - dayNo(today);
    if (days >= -28 && days <= weeks * 7) items.push({ key: key, addr: b.addr, client: b.client, last: last, lastP: b.p, due: due, days: days, id: b.id, name: b.name, url: b.url, kb: b.kb });
  });
  items.sort(function (a, b) { return a.due.localeCompare(b.due) || a.addr.localeCompare(b.addr); });

  try {
    const cal = CalendarApp.getCalendarById(CAL_ID);
    if (cal) {
      const evs = cal.getEvents(new Date(now.getTime() - 21 * day), new Date(now.getTime() + (weeks * 7 + 28) * day));
      items.forEach(function (it) { const b = bookingFor_(evs, it.key, now.getTime()); if (b) { it.booked = b.when; it.bookedTitle = b.title; } });
    }
  } catch (e) {}
  const out = { today: today, weeks: weeks, items: items.slice(0, 40), scanned: n };
  try { cache.put(ck, JSON.stringify(out), 600); } catch (e) {}
  return out;
}
