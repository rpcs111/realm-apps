/* app-shell.js: one shared add-on for Ange's apps (29 Oct 2026, local build, not live).
   One script tag turns it on:  <script src="js/app-shell.js?v=20261029-1" data-app="map" defer></script>
   It loads js/app-shell-config.js (the per-app list) and js/mic-chat.js (Talk to the bots, used as-is) from the same folder.
   What it adds, under the page's own header:
   - Save app (the browser's install prompt where there is one, otherwise plain steps). Hidden when the app is already installed.
   - Open (the app's own start page; on the Desk launcher, the job board).
   - A short "You can check ..." line and "Why not" lines for anything not working yet, both from the config.
   - Notes kept on this phone (localStorage app_shell_notes_v1). Send passes one to Ara's capture inbox through the
     same Let us do this path as js/letusdo.js (same public endpoint, same row shape, also listed in lud_asks for Deck).
     The code blocker (below) stops 3+ digit codes before anything is saved. Sends have a 30s limit and never double up:
     one send at a time per note, the same note id every time, and after a timeout the note waits 6 minutes.
   - Amend on every card in the config: a pencil button and a 600ms press-and-hold, both open a note about that card.
     The note's label is only "App · card type · number", never the card's own text.
   - Back closes the shell screen or the mic screen instead of leaving the app.
   No keys. Nothing is sent on load. */
(function(){'use strict';
if(window.RealmShell||window.top!==window)return;
/* ---------- code check: copied from the Desk fix round 4 (DeskFix.html), which grew out of the Flow mock normText ----------
   Normalise (entities, circled / Roman / Chinese / Ethiopic numerals, NFKC, every Unicode digit to 0-9), turn number words,
   ordinals, sound-alikes, run-together words and Roman runs into digits, then block on 3+ digits close together.
   With a code word (key, safe, lockbox, box, pin, code, gate, door...) anywhere, 3+ digits anywhere in the note blocks it. */
/* text shown on a card, with literal entities like &middot; turned back into characters */
var ENT={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',middot:'\u00b7',mdash:'\u2014',ndash:'\u2013',hellip:'\u2026',bull:'\u2022',rarr:'\u2192',larr:'\u2190',times:'\u00d7',check:'\u2713'};
function decodeEnt(s){var prev;s=String(s==null?'':s);
  do{prev=s;s=s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,function(m,c){
    if(c[0]==='#'){var n=c[1]==='x'||c[1]==='X'?parseInt(c.slice(2),16):parseInt(c.slice(1),10);try{return String.fromCodePoint(n)}catch(e){return ''}}
    var v=ENT[c.toLowerCase()];return v==null?m:v})}while(s!==prev);
  return s}
/* ---- code check (round 3) ----
   1. Digit-like characters become 0-9: an explicit table for circled and dingbat numbers (➍ ❹ ⓸), Roman numeral
      characters (Ⅳ ⅶ), Ethiopic and Chinese numerals (四七一九); then NFKC (full-width ４, superscripts, ①);
      any other number character left counts as a digit; every Unicode digit (Arabic-Indic, Persian, Devanagari...) becomes 0-9.
   2. Words: run-together words are split (fourseven = four seven, keysafe = key safe), Roman runs too (ivviiiix);
      number words, ordinals (first..ninth), double/triple, o/oh before a digit (oh oh seven = 007),
      for/fore = 4, to/too = 2, won = 1, ate = 8 when next to a digit.
   3. If a code word is anywhere in the note (key, safe, lockbox, lock, pin, code, combo, alarm, gate, door...),
      3 or more digits ANYWHERE in the note = a code, whatever words sit between them.
   4. Otherwise: 3 or more typed digits anywhere = a code; 3 or more digits in a row with only gaps or filler
      (and, then, um, uh, er, sorry, ok, dash, comma...) between them = a code; 4 or more digits within 8 words = a code. */
var DIGMAP=(function(){var m={};
  function put(start,vals){for(var k=0;k<vals.length;k++)m[String.fromCodePoint(start+k)]=String(vals[k])}
  var r10=[1,2,3,4,5,6,7,8,9,10],r12=[1,2,3,4,5,6,7,8,9,10,11,12];
  put(0x2776,r10);put(0x2780,r10);put(0x278A,r10);put(0x24F5,r10);put(0x24EB,[11,12,13,14,15,16,17,18,19,20]);
  put(0x2160,r12);put(0x2170,r12);put(0x216C,[50,100,500,1000]);put(0x217C,[50,100,500,1000]);put(0x1369,[1,2,3,4,5,6,7,8,9]);put(0x1372,[10,20,30,40,50,60,70,80,90,100]);
  ['\u24FF','\u24EA','\u{1F10B}','\u{1F10C}','\u3007','\u96F6'].forEach(function(c){m[c]='0'});
  var zh='\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D',zf='\u58F9\u8D30\u53C1\u8086\u4F0D\u9646\u67D2\u634C\u7396';
  for(var k=0;k<9;k++){m[zh[k]]=String(k+1);m[zf[k]]=String(k+1)}
  m['\u5341']='10';m['\u5344']='20';m['\u5EFF']='20';m['\u5345']='30';m['\u62FE']='10';m['\u4E24']='2';m['\u5169']='2';m['\u8CB3']='2';m['\u53C3']='3';m['\u9678']='6';
  return m})();
function asciiDigits(s){return s.replace(/\p{Nd}/gu,function(c){if(c>='0'&&c<='9')return c;var z=c.codePointAt(0),b=z;
  while(b>0&&z-b<60&&/\p{Nd}/u.test(String.fromCodePoint(b-1)))b--;return String((z-b)%10)})}
function normText(s){s=decodeEnt(String(s==null?'':s));
  s=Array.from(s).map(function(c){var v=DIGMAP[c];return v==null?c:' '+v+' '}).join('');
  s=s.normalize('NFKC');s=Array.from(s).map(function(c){var v=DIGMAP[c];return v==null?c:' '+v+' '}).join('').replace(/[\p{No}\p{Nl}]/gu,' 0 ');
  return asciiDigits(s).toLowerCase()}
var ONES={zero:0,nought:0,naught:0,nil:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9};
var TEENS={ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19};
var TENS={twenty:2,thirty:3,forty:4,fourty:4,fifty:5,sixty:6,seventy:7,eighty:8,ninety:9};
var ORD={first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9};
var BIG={hundred:'00',thousand:'000'};
var REP={double:2,triple:3,treble:3};
var ROMAN={ii:2,iii:3,iv:4,vi:6,vii:7,viii:8,ix:9,xi:11,xii:12},ROMAN1={i:1,v:5};
var HOMO={for:4,fore:4,won:1,ate:8,to:2,too:2};
var CODEW={key:1,keys:1,keysafe:1,keysafes:1,safe:1,safes:1,lockbox:1,lockboxes:1,lock:1,locks:1,padlock:1,pin:1,pins:1,code:1,codes:1,combo:1,combination:1,alarm:1,gate:1,door:1,passcode:1,password:1,keypad:1,box:1,boxes:1,lockup:1,keybox:1,keyboxes:1};
var FILL={and:1,n:1,then:1,dash:1,hyphen:1,comma:1,x:1,by:1,slash:1,stroke:1,plus:1,times:1,colon:1,semicolon:1,star:1,hash:1,dot:1,point:1,space:1,bracket:1,underscore:1,o:1,oh:1,
  um:1,umm:1,uh:1,uhh:1,er:1,erm:1,ah:1,hmm:1,sorry:1,ok:1,okay:1};
/* the words a run-together word may be split into */
var PARTS=Object.keys(ONES).concat(Object.keys(TEENS),Object.keys(TENS),Object.keys(ORD),Object.keys(BIG),Object.keys(REP),Object.keys(CODEW),['oh']).sort(function(a,b){return b.length-a.length});
function known(w){return ONES[w]!=null||TEENS[w]!=null||TENS[w]!=null||ORD[w]!=null||BIG[w]!=null||REP[w]!=null||ROMAN[w]!=null||ROMAN1[w]!=null||CODEW[w]||FILL[w]||HOMO[w]!=null}
function splitWords(w){if(w.length<5)return null;var memo={};
  function go(i){if(i===w.length)return [];if(memo[i]!==undefined)return memo[i];memo[i]=null;
    for(var k=0;k<PARTS.length;k++){var p=PARTS[k];if(w.substr(i,p.length)===p){var r=go(i+p.length);if(r){memo[i]=[p].concat(r);break}}}
    return memo[i]}
  var r=go(0);return r&&r.length>1?r:null}
var RPARTS=['viii','vii','iii','xii','ix','iv','vi','ii','xi','x','v','i'],RVAL={viii:8,vii:7,iii:3,xii:12,ix:9,iv:4,vi:6,ii:2,xi:11,x:10,v:5,i:1};
function splitRoman(w){if(!/^[ivx]{4,}$/.test(w)||w.indexOf('i')<0)return null;var out=[],i=0;
  while(i<w.length){for(var k=0;k<RPARTS.length;k++){if(w.substr(i,RPARTS[k].length)===RPARTS[k]){out.push(RVAL[RPARTS[k]]);i+=RPARTS[k].length;break}}}
  return out.length>1?out:null}
function codeTokens(s){
  var raw=normText(s).match(/[a-z]+|\d+|[^a-z\d]+/g)||[],T=[];
  raw.forEach(function(x){
    if(/^\d+$/.test(x)){T.push({d:x,typed:1});return}
    if(!/^[a-z]+$/.test(x)){T.push({s:x});return}
    if(!known(x)){var p=splitWords(x);if(p){p.forEach(function(y,k){if(k)T.push({s:' '});T.push({w:y})});return}
      var r=splitRoman(x);if(r){r.forEach(function(y,k){if(k)T.push({s:' '});T.push({d:String(y),r:1})});return}}
    T.push({w:x})});
  function nb(i,dir){for(var j=i+dir;j>=0&&j<T.length;j+=dir)if(!T[j].s)return j;return -1}
  function isD(k){return k>=0&&T[k].d!=null}
  var i,t,j,codeMode=T.some(function(x){return x.w&&CODEW[x.w]});
  for(i=0;i<T.length;i++){t=T[i];if(!t.w)continue;var w=t.w;
    if(TENS[w]!=null){j=nb(i,1);if(j>=0&&ONES[T[j].w]>0){T[i]={d:String(TENS[w])+ONES[T[j].w]};T[j]={s:''};continue}T[i]={d:TENS[w]+'0'}}
    else if(TEENS[w]!=null)T[i]={d:String(TEENS[w])};
    else if(ONES[w]!=null)T[i]={d:String(ONES[w])};
    else if(ORD[w]!=null)T[i]={d:String(ORD[w]),ord:1};
    else if(BIG[w]!=null)T[i]={d:BIG[w]};
    else if(ROMAN[w]!=null)T[i]={d:String(ROMAN[w]),r:1}}
  for(i=0;i<T.length;i++)if(T[i].w&&ROMAN1[T[i].w]!=null&&[nb(i,-1),nb(i,1)].some(function(k){return k>=0&&T[k].r}))T[i]={d:String(ROMAN1[T[i].w]),r:1};
  /* o / oh before a digit is a 0 (right to left, so "oh oh seven" = 007) */
  for(i=T.length-1;i>=0;i--){t=T[i];if(t.w==='o'||t.w==='oh'){if(isD(nb(i,1)))T[i]={d:'0'}}}
  for(i=0;i<T.length;i++){t=T[i];if(t.w&&REP[t.w]!=null){j=nb(i,1);if(j>=0&&T[j].d&&T[j].d.length===1){T[j]={d:T[j].d.repeat(REP[t.w])};T[i]={s:''}}}}
  /* sound-alikes next to a digit (twice, so "for for seven" works). Without a code word they need a digit on both
     sides, and to/too never count ("levels 2 to 4" stays a plain note). */
  for(var pass=0;pass<2;pass++)for(i=0;i<T.length;i++){t=T[i];if(!t.w||HOMO[t.w]==null)continue;
    var a=isD(nb(i,-1)),b=isD(nb(i,1));
    if(codeMode?(a||b):(a&&b&&t.w!=='to'&&t.w!=='too'))T[i]={d:String(HOMO[t.w]),homo:1}}
  T.codeMode=codeMode;return T}
function hasCode(s){s=String(s==null?'':s);if(!s.trim())return false;
  var T=codeTokens(s),i,t,all=0,typed=0,run=0,runNum=0,words=[];
  for(i=0;i<T.length;i++){t=T[i];
    if(t.d!=null){all+=t.d.length;if(t.typed)typed+=t.d.length;words.push(t.d.length);
      run+=t.d.length;if(!t.ord)runNum+=t.d.length;
      if(T.codeMode&&all>=3)return true;
      if(typed>=3)return true;
      if(run>=4||(run>=3&&runNum>0))return true}
    else if(t.w!=null){words.push(0);if(!FILL[t.w]){run=0;runNum=0}}}
  /* 4 or more digits within any 8 words */
  for(i=0;i<words.length;i++){var n=0;for(var k=i;k<words.length&&k<i+8;k++)n+=words[k];if(n>=4)return true}
  return false};
/* ---------- shell ---------- */
var S=document.currentScript||document.querySelector('script[src*="app-shell.js"]');
var SRC=(S&&S.src)||'',BASE=SRC.replace(/[?#].*$/,'').replace(/[^\/]*$/,''),QS=(SRC.split('?')[1]||'').split('#')[0];
/* Same public Ara Engine capture endpoint that js/letusdo.js, js/mic-chat.js and capture.html already post to. It takes no key. */
var API='https://script.google.com/macros/s/AKfycbxzrPy359CBlkbrYuR0-5xJB4GLXIQ6xNDIE6EFEb2xvnoY0n5sodcnljN4Ohqf4nWa/exec';
var SEND_MS=30000,HOLD_MS=600,GUARD_MS=400,UNSURE_MS=6*60*1000,MAXLEN=1000;
var NKEY='app_shell_notes_v1',LUD='lud_asks',TIPKEY='app_shell_tip_hidden_v1';
var CODE_MSG='Note not saved. No codes, please. Say "key safe: yes" and leave the number out.';
var NUM_MSG='Note not saved. 3 or more digits close together look like a code. Write "half ten" or "levels 2 to 4" instead.';
var CODE_WORD=/\b(key|keys|keysafe|safe|lockbox|lock|padlock|code|codes|pin|combo|combination|password|passcode|alarm|gate|door|box|boxes|keybox|lockup)\b/;
function codeMsg(s){return CODE_WORD.test(normText(s))?CODE_MSG:NUM_MSG}

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function jget(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function jput(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function now(){return Date.now()}
function hhmm(t){try{return new Date(t).toLocaleString('en-AU',{timeZone:'Australia/Melbourne',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}catch(e){return ''}}

var C={},A={},KEY='app';
function pickApp(){
  C=window.APP_SHELL_CONFIG||{};var apps=C.apps||{},k=(S&&S.getAttribute('data-app'))||'';
  if(!apps[k]){var f=location.pathname.split('/').pop()||'index.html';k='';for(var x in apps)if(apps[x].page===f){k=x;break}}
  KEY=k||'app';var a=apps[k]||{},d=C.defaults||{};
  A={};for(var y in d)A[y]=d[y];for(var z in a)A[z]=a[z];
  A.name=A.name||((document.querySelector('meta[name="application-name"]')||{}).content)||document.title||'This app';
  /* the page's own icon wins, so the shell always shows the icon the app itself uses */
  var li=document.querySelector('link[rel="icon"]'),lh=li&&li.getAttribute('href');if(lh)A.icon=lh;A.icon=A.icon||'';
  A.start=A.start||location.pathname.split('/').pop()||'./';
  A.checks=A.checks||[];A.whyNot=A.whyNot||[];A.amend=A.amend||[];A.hide=A.hide||[];
  if(!window.APP_SHELL_CONFIG)A.whyNot=A.whyNot.concat([{what:'This app\u2019s list',why:'Its settings didn\u2019t load, so the checks and reasons aren\u2019t shown. Reload once you\u2019re online.'}]);
}

/* ---- notes, kept on this phone ---- */
function allNotes(){var o=jget(NKEY,{});return o&&typeof o==='object'&&!Array.isArray(o)?o:{}}
function notes(){var a=allNotes()[KEY];return Array.isArray(a)?a:[]}
function setNotes(a){var o=allNotes();o[KEY]=a.slice(-200);return jput(NKEY,o)}
function upd(id,fn){var a=notes(),hit=null;a.forEach(function(n){if(n.id===id){fn(n);hit=n}});setNotes(a);return hit}
function lud(n,st){var a=jget(LUD,[]);if(!Array.isArray(a))a=[];var hit=false;
  a.forEach(function(x){if(x.id===n.id){x.st=st;x.at=now();hit=true}});
  if(!hit)a.push({id:n.id,ts:n.ts,where:A.name,title:n.text.slice(0,200),context:n.about||'',how:'',st:st});
  jput(LUD,a.slice(-200))}
function newId(){return 'shell_'+now().toString(36)+'_'+Math.random().toString(36).slice(2,6)}
/* a note left mid-send when the app closed: it may have landed, so it waits 6 minutes before it can go again */
function settle(){var a=notes(),ch=false;a.forEach(function(n){if(n.st==='sending'&&!inflight[n.id]){n.st='unsure';n.holdUntil=Math.max(n.holdUntil||0,(n.at||n.ts)+UNSURE_MS);ch=true}});if(ch)setNotes(a)}

var inflight={},leaving=false;
/* the page is closing mid-send: leave it as sending, so next time it shows as maybe-sent and waits, never a blind resend */
addEventListener('pagehide',function(){leaving=true});addEventListener('beforeunload',function(){leaving=true});addEventListener('pageshow',function(){leaving=false});
function addNote(text,about){
  text=String(text||'').replace(/\s+$/,'').replace(/^\s+/,'');
  if(!text)return {err:'Type a note first.'};
  if(text.length>MAXLEN)return {err:'Note not saved. Keep it under '+MAXLEN+' letters.'};
  if(hasCode(text))return {err:codeMsg(text)};
  var n={id:newId(),ts:now(),text:text,about:about||'',st:'saved'};
  var a=notes();a.push(n);if(!setNotes(a))return {err:'Note not saved. This phone is out of space.'};
  return {note:n};
}
function sendNote(id){
  var n=notes().filter(function(x){return x.id===id})[0];if(!n)return Promise.resolve();
  if(inflight[id]||n.st==='sending'||n.st==='sent')return Promise.resolve();
  if(n.st==='unsure'&&now()<(n.holdUntil||0)){flash(id,'Still sending, check back in a few minutes.');return Promise.resolve()}
  if(hasCode(n.text)){flash(id,codeMsg(n.text));return Promise.resolve()}
  if(navigator.onLine===false){upd(id,function(x){x.st='unsent'});render();flash(id,'You\u2019re offline. It\u2019s saved on this phone. Tap Send when you\u2019re back online.');return Promise.resolve()}
  inflight[id]=1;n=upd(id,function(x){x.st='sending';x.at=now()});lud(n,'sending');render();
  var text='[LET US DO THIS \u00b7 '+A.name+'] Note: '+n.text+(n.about?' \u2014 about: '+n.about:'')+' \u2014 rule: customer-facing = draft for Ange\'s OK';
  var ctl=window.AbortController?new AbortController():null,timedOut=false;
  var t=setTimeout(function(){timedOut=true;if(ctl)ctl.abort()},SEND_MS);
  var req=fetch(API,{method:'POST',mode:'cors',redirect:'follow',credentials:'omit',headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({app:'capture',items:[{id:n.id,text:text.slice(0,2000),category:'Ara',ts:new Date(n.ts).toISOString()}]}),signal:ctl?ctl.signal:undefined});
  /* without AbortController the 30s limit still wins the race */
  var limit=new Promise(function(_,rej){setTimeout(function(){timedOut=true;rej(new Error('timeout'))},SEND_MS+50)});
  return Promise.race([req.then(function(r){if(!r||!r.ok)throw new Error('http');return r.json()}),limit])
    .then(function(j){if(!j||j.ok===false)throw new Error('not ok');var hit=(j.saved||[]).concat(j.dupes||[]);if(hit.length&&hit.indexOf(id)<0)throw new Error('not confirmed');
      var m=upd(id,function(x){x.st='sent';x.sentAt=now()});if(m)lud(m,'queued')})
    .catch(function(){if(leaving)return;var m=upd(id,function(x){if(timedOut){x.st='unsure';x.holdUntil=now()+UNSURE_MS}else x.st='unsent'});if(m)lud(m,timedOut?'sending':'unsent');
      if(timedOut)flash(id,'Still sending, check back in a few minutes.')})
    .then(function(){clearTimeout(t);delete inflight[id];render()});
}
function removeNote(id){if(inflight[id])return;setNotes(notes().filter(function(x){return x.id!==id}));render()}

/* ---- install ---- */
var bip=null;
function standalone(){try{if(navigator.standalone===true)return true;var m=function(q){return matchMedia('(display-mode: '+q+')').matches};if(m('browser'))return false;return m('standalone')||m('minimal-ui')||m('fullscreen')||m('window-controls-overlay')}catch(e){return false}}
addEventListener('beforeinstallprompt',function(e){e.preventDefault();bip=e;paintSave()});
addEventListener('appinstalled',function(){bip=null;window.__araBIP=null;installed=true;paintSave()});
var installed=false;
function paintSave(){var b=document.getElementById('asSave');if(!b)return;b.hidden=standalone()||installed}
function doSave(){var p=bip||window.__araBIP;
  if(p&&p.prompt){try{p.prompt();(p.userChoice||Promise.resolve({})).then(function(c){if(c&&c.outcome==='accepted'){installed=true;paintSave()}});bip=null;window.__araBIP=null;return}catch(e){}}
  openSheet('install')}

/* ---- UI ---- */
var CSS=''
+'#appShellBar{box-sizing:border-box;width:100%;max-width:100%;padding:6px 10px;background:#050505;border-bottom:1px solid #1f2937;color:#e5e5e5;font:14px/1.35 system-ui,-apple-system,Roboto,sans-serif;position:relative;z-index:30}'
+'#appShellBar *,#appShellSheet *{box-sizing:border-box}'
+'#appShellBar .as-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px}'
+'#appShellBar .as-mic{display:inline-flex;margin-left:auto}#appShellBar .as-mic #micChatBtn{margin-left:0}'
+'.as-btn{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:4px;min-height:44px;min-width:44px;padding:0 12px;border-radius:12px;border:1px solid #334155;background:#0a0a0a;color:#e5e5e5;font:700 14px/1 system-ui,sans-serif;cursor:pointer;text-decoration:none;-webkit-tap-highlight-color:transparent;white-space:nowrap}'
+'.as-btn:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}.as-btn[hidden]{display:none!important}.as-btn[disabled]{opacity:.5;cursor:default}'
+'.as-btn.as-pri{border-color:#22d3ee;color:#22d3ee}'
+'#appShellBar .as-tip{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin-top:4px;color:#a3a3a3;font-size:13px}'
+'#appShellBar .as-tip span{flex:1 1 200px;min-width:0;overflow-wrap:anywhere}'
+'.as-link{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;min-height:44px;min-width:44px;padding:0 6px;color:#fbbf24;font:600 13px system-ui,sans-serif;cursor:pointer;text-decoration:underline}'
+'.as-link:focus-visible{outline:2px solid #22d3ee}'
+'.as-penrow{display:flex;justify-content:flex-end;width:100%;max-width:100%}'
+'.as-pen{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;border-radius:10px;color:#93c5fd;font:600 16px system-ui,sans-serif;cursor:pointer}'
+'.as-pen:focus-visible{outline:2px solid #22d3ee}'
+'.as-holdable{-webkit-touch-callout:none}'
+'.as-holding{outline:2px solid #22d3ee!important;outline-offset:2px}'
+'.as-why{display:block;margin:4px 0;color:#fbbf24;font:13px/1.35 system-ui,sans-serif;max-width:100%;overflow-wrap:anywhere}'
+'#appShellSheet{position:fixed;inset:0;z-index:2147483000;background:#000;color:#e5e5e5;display:flex;flex-direction:column;font:15px/1.45 system-ui,-apple-system,Roboto,sans-serif;color-scheme:dark}'
+'#appShellSheet[hidden]{display:none!important}'
+'#appShellSheet .as-top{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:calc(8px + env(safe-area-inset-top)) 12px 8px;border-bottom:1px solid #1f2937}'
+'#appShellSheet .as-top img{width:32px;height:32px;border-radius:8px;flex:0 0 32px}'
+'#appShellSheet .as-top b{flex:1 1 auto;min-width:0;font-size:17px;overflow-wrap:anywhere}'
+'#appShellSheet .as-body{flex:1 1 auto;overflow:auto;padding:12px 12px calc(24px + env(safe-area-inset-bottom));max-width:720px;width:100%;margin:0 auto}'
+'#appShellSheet h3{margin:16px 0 6px;font-size:13px;letter-spacing:.08em;color:#22d3ee;text-transform:uppercase}'
+'#appShellSheet ul{margin:0;padding:0 0 0 18px}#appShellSheet li{margin:4px 0;overflow-wrap:anywhere}'
+'#appShellSheet .as-notes{list-style:none;padding:0}#appShellSheet .as-notes li{border-top:1px solid #1f2937;padding:8px 0}'
+'#appShellSheet .as-meta{font-size:12px;color:#a3a3a3}#appShellSheet .as-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}'
+'#appShellSheet textarea{display:block;width:100%;min-height:96px;padding:10px;border-radius:12px;border:1px solid #334155;background:#0a0a0a;color:#e5e5e5;font:16px/1.4 system-ui,sans-serif;resize:vertical}'
+'#appShellSheet .as-about{font-size:13px;color:#93c5fd;margin:0 0 6px}'
+'#appShellSheet .as-msg{min-height:20px;margin:6px 0;color:#fbbf24;font-size:14px}'
+'#appShellSheet .as-st{font-size:13px}#appShellSheet .as-st.sent{color:#86efac}#appShellSheet .as-st.unsent,#appShellSheet .as-st.unsure{color:#fbbf24}'
+'#appShellSheet .as-hint{font-size:13px;color:#a3a3a3}';

var bar,sheet,ta,msgEl,aboutEl,aboutNow='',layers=[],ignorePop=0,flashes={};
function flash(id,t){flashes[id]=t;render();if(msgEl&&sheet&&!sheet.hidden&&!id)msgEl.textContent=t}
function say(t){if(msgEl)msgEl.textContent=t||''}
function pushLayer(n){layers.push(n);try{history.pushState({appShell:n},'')}catch(e){}}
function dropLayer(n,fromPop){var i=layers.lastIndexOf(n);if(i<0)return;layers.splice(i,1);if(!fromPop){ignorePop++;try{history.back()}catch(e){ignorePop--}}}
addEventListener('popstate',function(){if(ignorePop>0){ignorePop--;return}var n=layers.pop();if(!n)return;
  if(n==='sheet')closeSheet(true);else if(n==='mic'){try{window.MicChat&&window.MicChat.close()}catch(e){}}});

function whyList(){return A.whyNot.filter(function(w){try{return typeof w.when==='function'?!!w.when():true}catch(e){return true}})}
function tipText(){var c=A.checks.slice(0,2);if(!c.length)return '';return 'You can check '+c.join(', you can check ')+'.'}
function buildBar(){
  bar=document.createElement('div');bar.id='appShellBar';bar.setAttribute('role','region');bar.setAttribute('aria-label',A.name+' tools');
  var openHref=A.start;if(A.openFrom){var o=document.querySelector(A.openFrom);if(o&&o.getAttribute('href')&&o.getAttribute('href')!=='#')openHref=o.getAttribute('href')}
  bar.innerHTML='<div class="as-row"><button type="button" class="as-btn as-pri" id="asSave">Save app</button>'
   +'<a class="as-btn" id="asOpen" href="'+esc(openHref)+'">Open</a>'
   +'<button type="button" class="as-btn" id="asAmend" aria-label="Amend: add a note about this screen">\u270e Amend</button>'
   +'<button type="button" class="as-btn" id="asNotesBtn">Notes</button><span class="as-mic" id="asMic"></span></div>'
   +'<div class="as-tip" id="asTip"></div>';
  var host=A.after?document.querySelector(A.after):null;
  if(!host){var h=document.querySelector('body > header, body > .top, body > #sbBar + header');if(h&&getComputedStyle(h).position!=='fixed')host=h}
  if(host&&host.parentNode)host.parentNode.insertBefore(bar,host.nextSibling);else document.body.insertBefore(bar,document.body.firstChild);
  bar.querySelector('#asSave').addEventListener('click',doSave);
  bar.querySelector('#asAmend').addEventListener('click',function(){openSheet('note',A.name+' \u00b7 this screen')});
  bar.querySelector('#asNotesBtn').addEventListener('click',function(){openSheet('note')});
  paintTip();paintSave();
  try{matchMedia('(display-mode: standalone)').addEventListener('change',paintSave)}catch(e){}
}
function paintTip(){var t=bar&&bar.querySelector('#asTip');if(!t)return;var w=whyList(),tip=tipText(),hidden=jget(TIPKEY,{})[KEY];
  t.innerHTML=(tip&&!hidden?'<span>'+esc(tip)+'</span>':'')+(w.length?'<button type="button" class="as-link" id="asWhyBtn">Why not: '+w.length+(w.length===1?' thing':' things')+' not working yet</button>':'');
  t.hidden=!t.innerHTML;var b=t.querySelector('#asWhyBtn');if(b)b.addEventListener('click',function(){openSheet('why')});
  var nb=bar.querySelector('#asNotesBtn'),n=notes().length;if(nb)nb.textContent=n?'Notes ('+n+')':'Notes'}

function buildSheet(){
  sheet=document.createElement('div');sheet.id='appShellSheet';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','asTitle');
  sheet.innerHTML='<div class="as-top">'+(A.icon?'<img alt="" src="'+esc(A.icon)+'">':'')+'<b id="asTitle">'+esc(A.name)+'</b><button type="button" class="as-btn" id="asClose">Close</button></div>'
   +'<div class="as-body"><section id="asInstall" hidden><h3>Save this app</h3><ul>'
   +'<li>Android, in Chrome: tap \u22ee at the top right, then <b>Add to Home screen</b> or <b>Install app</b>, then <b>Install</b>.</li>'
   +'<li>Samsung Internet: tap \u2630, then <b>Add page to</b>, then <b>Home screen</b>.</li>'
   +'<li>iPhone, in Safari: tap Share, then <b>Add to Home Screen</b>.</li>'
   +'<li>Computer, in Chrome: click the install icon at the right end of the address bar.</li></ul></section>'
   +'<section><h3>Notes</h3><p class="as-about" id="asAbout" hidden></p><textarea id="asText" maxlength="'+MAXLEN+'" aria-label="Note" placeholder="Type a note\u2026 (no codes or key numbers)"></textarea>'
   +'<div class="as-acts"><button type="button" class="as-btn as-pri" id="asSaveNote">Save note</button><button type="button" class="as-btn" id="asSaveSend">Save and send to the bots</button></div>'
   +'<div class="as-msg" id="asMsg" role="status" aria-live="polite"></div>'
   +'<p class="as-hint">Notes stay on this phone. <b>Send</b> passes one to Ara\u2019s inbox through Let us do this. Anything for a customer comes back to Ange as a draft first. Press and hold any card for a moment, or tap \u270e, to amend it.</p>'
   +'<ul class="as-notes" id="asList"></ul></section>'
   +'<section id="asChecks"></section><section id="asWhy"></section></div>';
  document.body.appendChild(sheet);
  ta=sheet.querySelector('#asText');msgEl=sheet.querySelector('#asMsg');aboutEl=sheet.querySelector('#asAbout');
  sheet.querySelector('#asClose').addEventListener('click',function(){closeSheet(false)});
  sheet.querySelector('#asSaveNote').addEventListener('click',function(){save(false)});
  sheet.querySelector('#asSaveSend').addEventListener('click',function(){save(true)});
  sheet.querySelector('#asList').addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button[data-act]');if(!b)return;
    var id=b.getAttribute('data-id');if(b.getAttribute('data-act')==='send'){b.disabled=true;sendNote(id)}else if(b.getAttribute('data-act')==='rm')removeNote(id)});
  var ck=A.checks.length?'<h3>You can check</h3><ul>'+A.checks.map(function(c){return '<li>You can check '+esc(c)+'.</li>'}).join('')+'</ul>':'';
  sheet.querySelector('#asChecks').innerHTML=ck;
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&sheet&&!sheet.hidden){e.preventDefault();closeSheet(false)}});
}
var saving=false;
function save(andSend){if(saving)return;saving=true;
  var r=addNote(ta.value,aboutNow);
  if(r.err){say(r.err);saving=false;return}
  ta.value='';say(andSend?'Saved on this phone. Sending\u2026':'Saved on this phone.');render();paintTip();
  if(andSend)sendNote(r.note.id).then(function(){var n=notes().filter(function(x){return x.id===r.note.id})[0];
    if(n)say(n.st==='sent'?'\u2713 Sent to the bots.':n.st==='unsure'?'Still sending, check back in a few minutes.':'Saved on this phone. Not sent yet: tap Send to try again.')});
  setTimeout(function(){saving=false},300)}
var LABEL={saved:'Saved on this phone',sending:'Sending\u2026',sent:'\u2713 Sent to the bots',unsent:'Not sent yet',unsure:'Still sending, check back in a few minutes'};
function render(){if(!sheet)return;var L=sheet.querySelector('#asList'),a=notes().slice().reverse();
  L.innerHTML=a.length?a.map(function(n){var st=n.st,wait=st==='unsure'&&now()<(n.holdUntil||0),canSend=st==='saved'||st==='unsent'||(st==='unsure'&&!wait);
    return '<li><div>'+esc(n.text)+'</div><div class="as-meta">'+(n.about?esc(n.about)+' \u00b7 ':'')+esc(hhmm(n.ts))+' \u00b7 <span class="as-st '+esc(st)+'">'+esc(LABEL[st]||st)+'</span></div>'
      +(flashes[n.id]?'<div class="as-msg">'+esc(flashes[n.id])+'</div>':'')
      +'<div class="as-acts">'+(canSend?'<button type="button" class="as-btn" data-act="send" data-id="'+esc(n.id)+'">'+(st==='saved'?'Send':'Send again')+'</button>':'')
      +(st!=='sending'?'<button type="button" class="as-btn" data-act="rm" data-id="'+esc(n.id)+'">Remove</button>':'')+'</div></li>'}).join(''):'<li class="as-hint">No notes yet.</li>';
  paintTip();
  /* a note waiting out its 6 minutes gets its Send button back on its own */
  var soon=0;a.forEach(function(n){if(n.st==='unsure'&&n.holdUntil>now()&&(!soon||n.holdUntil<soon))soon=n.holdUntil});
  clearTimeout(render._t);if(soon)render._t=setTimeout(render,soon-now()+50)}
function paintWhy(){var w=whyList();sheet.querySelector('#asWhy').innerHTML=w.length?'<h3>Not working yet</h3><ul>'+w.map(function(x){return '<li><b>'+esc(x.what)+'</b>: '+esc(x.why)+'</li>'}).join('')+'</ul>':''}
function openSheet(mode,about){if(!sheet)return;settle();
  aboutNow=about||'';aboutEl.hidden=!aboutNow;aboutEl.textContent=aboutNow?'Amend: '+aboutNow:'';
  sheet.querySelector('#asInstall').hidden=mode!=='install';say('');flashes={};paintWhy();render();
  if(sheet.hidden){sheet.hidden=false;try{document.documentElement.style.overflow='hidden'}catch(e){}pushLayer('sheet')}
  var focusEl=mode==='why'?sheet.querySelector('#asWhy'):mode==='install'?sheet.querySelector('#asInstall'):ta;
  setTimeout(function(){try{if(mode==='note')ta.focus();else focusEl.scrollIntoView({block:'start'})}catch(e){}},30)}
function closeSheet(fromPop){if(!sheet||sheet.hidden)return;sheet.hidden=true;try{document.documentElement.style.overflow=''}catch(e){}aboutNow='';dropLayer('sheet',fromPop)}

/* ---- Amend: a pencil on each card, and a 600ms press-and-hold ---- */
function inShell(el){return !!(el&&el.closest&&el.closest('#appShellBar,#appShellSheet,#micChat,#micChatBtn'))}
function ruleFor(el){if(!el||!el.closest||inShell(el))return null;for(var i=0;i<A.amend.length;i++){var r=A.amend[i],t=el.closest(r.sel);if(t&&!inShell(t))return {rule:r,el:t}}return null}
function labelFor(m){var list=[].slice.call(document.querySelectorAll(m.rule.sel)).filter(function(e){return !inShell(e)}),i=list.indexOf(m.el);
  return A.name+' \u00b7 '+(m.rule.kind||'card')+(i>=0&&list.length>1?' '+(i+1):'')}
function addPens(){A.amend.forEach(function(r){if(r.pen===false)return;
  [].forEach.call(document.querySelectorAll(r.sel),function(el){if(el.getAttribute('data-as-pen')||inShell(el)||!(el instanceof HTMLElement))return;
    if(r.skip&&el.matches(r.skip))return;
    el.setAttribute('data-as-pen','1');var row=document.createElement('div');row.className='as-penrow';
    var b=document.createElement('button');b.type='button';b.className='as-pen';b.textContent='\u270e';b.setAttribute('aria-label','Amend this');b.title='Amend this';
    b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var m=ruleFor(el);if(m)openSheet('note',labelFor(m))});
    row.appendChild(b);el.appendChild(row)})});
  A.amend.forEach(function(r){[].forEach.call(document.querySelectorAll(r.sel),function(el){if(el.classList&&!inShell(el))el.classList.add('as-holdable')})})}
function addWhyLines(){whyList().forEach(function(w){if(!w.sel)return;var el=document.querySelector(w.sel);if(!el||el.getAttribute('data-as-why'))return;
  el.setAttribute('data-as-why','1');var p=document.createElement('span');p.className='as-why';p.textContent='Why not: '+w.why;
  if(el.parentNode)el.parentNode.insertBefore(p,el.nextSibling)})}
var hold=null,swallow=false,guardFrom=0;
function cancelHold(){if(hold){clearTimeout(hold.t);if(hold.m&&hold.m.el.classList)hold.m.el.classList.remove('as-holding');hold=null}}
document.addEventListener('pointerdown',function(e){if(e.button>0)return;var tg=e.target;if(tg&&tg.closest&&tg.closest('input,textarea,select,[contenteditable=""],[contenteditable=true]'))return;
  var m=ruleFor(tg);if(!m)return;cancelHold();
  hold={x:e.clientX,y:e.clientY,m:m,t:setTimeout(function(){if(!hold)return;var mm=hold.m;cancelHold();swallow=true;guardFrom=now();openSheet('note',labelFor(mm))},HOLD_MS)};
  if(m.el.classList)m.el.classList.add('as-holding')},true);
document.addEventListener('pointermove',function(e){if(hold&&(Math.abs(e.clientX-hold.x)>10||Math.abs(e.clientY-hold.y)>10))cancelHold()},true);
function lift(){cancelHold();if(swallow){guardFrom=now();setTimeout(function(){swallow=false},GUARD_MS)}}
document.addEventListener('pointerup',lift,true);document.addEventListener('pointercancel',function(){cancelHold()},true);
addEventListener('scroll',function(){cancelHold()},true);
/* the finger lift after a hold must not tap whatever is now under it: swallow the next click, and any click for 400ms after the lift */
document.addEventListener('click',function(e){if(swallow||now()-guardFrom<GUARD_MS){e.preventDefault();e.stopPropagation();swallow=false}},true);
document.addEventListener('contextmenu',function(e){if(ruleFor(e.target))e.preventDefault()},true);

/* ---- the mic: js/mic-chat.js, loaded as-is ---- */
function watchMic(){var ov=document.getElementById('micChat');if(!ov||!window.MutationObserver)return;
  new MutationObserver(function(){var open=!ov.hidden,i=layers.lastIndexOf('mic');if(open&&i<0)pushLayer('mic');else if(!open&&i>=0)dropLayer('mic',false)}).observe(ov,{attributes:true,attributeFilter:['hidden']})}
function loadMic(){if(A.mic===false)return;
  if(window.MicChat||document.querySelector('script[src*="mic-chat.js"]')){whenMic();return}
  var s=document.createElement('script');s.src=BASE+'mic-chat.js'+(QS?'?'+QS:'');s.setAttribute('data-mount','#asMic');s.onload=whenMic;document.head.appendChild(s)}
function whenMic(){var n=0;(function w(){if(document.getElementById('micChat')){watchMic();var b=document.getElementById('micChatBtn'),h=document.getElementById('asMic');if(b&&h&&b.parentNode!==h&&!b.classList.contains('fx'))h.appendChild(b);return}if(n++<50)setTimeout(w,100)})()}

/* ---- pick up where you left off (js/resume.js, docs/API.md) ---- */
function loadResume(){if(!A.resume&&!A.resumeList)return;
  function go(){var R=window.Resume;if(!R)return;
    try{if(A.resume&&typeof A.resume.setup==='function')A.resume.setup(R,window.RealmShell)}catch(e){}
    var L=A.resumeList;if(L){var at=document.querySelector(L.at||'main')||document.body,box=document.createElement('div');box.className='as-resume';
      if(L.how==='before'&&at.parentNode)at.parentNode.insertBefore(box,at);else if(L.how==='after'&&at.parentNode)at.parentNode.insertBefore(box,at.nextSibling);else if(L.how==='first')at.insertBefore(box,at.firstChild);else at.appendChild(box);
      R.mountList(box,{apps:L.apps,heading:L.heading,max:L.max,hideEmpty:!!L.hideEmpty,name:A.name})}}
  if(window.Resume){go();return}
  var s=document.createElement('script');s.src=BASE+'resume.js'+(QS?'?'+QS:'');s.onload=go;document.head.appendChild(s)}
function hideOld(){if(!A.hide.length)return;var st=document.createElement('style');st.id='appShellHide';st.textContent=A.hide.map(function(x){return 'html:not(#as-keep) '+x}).join(',')+'{display:none!important}';document.head.appendChild(st)}
function start(){
  if(document.getElementById('appShellBar'))return;
  pickApp();
  var st=document.createElement('style');st.id='appShellCss';st.textContent=CSS;document.head.appendChild(st);hideOld();
  if(A.off){return}
  settle();buildBar();buildSheet();addPens();addWhyLines();loadMic();loadResume();
  if(window.MutationObserver){var q=0;new MutationObserver(function(){if(q)return;q=setTimeout(function(){q=0;addPens();addWhyLines();paintTip()},150)}).observe(document.body,{childList:true,subtree:true})}
  addEventListener('storage',function(e){if(e.key===NKEY)render()});
  window.RealmShell={app:KEY,name:A.name,hasCode:hasCode,normText:normText,open:openSheet,close:function(){closeSheet(false)},notes:notes,send:sendNote,_api:API};
}
function boot(){if(window.APP_SHELL_CONFIG){start();return}
  var c=document.createElement('script');c.src=BASE+'app-shell-config.js'+(QS?'?'+QS:'');c.onload=start;c.onerror=start;document.head.appendChild(c)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();

})();
