/* letusdo.js v2 (29 Oct 2026, LOCAL COPY ONLY, not live). "Let us do this" button.
   Tap it on a note, a to-do or a history line and the ask goes to Ara's capture inbox
   (ARA CAPTURE INBOX sheet, tab INBOX, via the same Ara Engine path as capture.html) as one row.
   v2 changes over the live v1 (20261027-3):
   - In-page sheet instead of window.prompt (44px+ buttons, 16px text, works inside installed apps).
   - "Got it ✓" tick with the time, on the card, in the list and as a toast, only when the inbox
     confirms this ask's id (saved or dupes). No tick on a guess.
   - 20s time limit per try, 3 tries (now, +4s, +15s), then a plain message saying why it failed.
   - An ask that did not send re-sends by itself when the phone comes back online or the app is
     reopened, but only for 5 hours (the Engine ignores the same id for 6 hours, so no double rows).
     After 5 hours it waits for a tap.
   - Code check: the Desk round 4 blocker (DeskFix.html, sha256 9a151949..., copied byte for byte as in
     watchme.js) runs on the title, context, ask and all three together. A blocked ask is never stored
     or sent; the sheet says why. Digit hiding stays as a second layer.
   - On start, every saved ask that fails the code check is dropped from this phone, whatever its status
     (asks saved by v1 could hold a code, e.g. "key safe 4719 · Got it"), before the list is drawn.
   - Status read-back: if the Engine answers GET ?app=capture&ids=... with {statuses:{id:"doing"|"done"|"needs"}},
     the card shows "Bots are on it" / "Done" / "Needs you". The live Engine does not do this yet,
     so nothing changes until it does (read-only GET, no data back except status words).
   Usage: <script src="js/letusdo.js" data-where="Note" data-targets="#notes li, #puBody li, #tasks li" data-list="#ludList"></script> */
(function(){"use strict";
var S=document.currentScript||{},D=(S.dataset||{});
var WHERE=D.where||document.title||"app",TARGETS=D.targets||"",LIST=D.list||"";
var API=D.api||"https://script.google.com/macros/s/AKfycbxzrPy359CBlkbrYuR0-5xJB4GLXIQ6xNDIE6EFEb2xvnoY0n5sodcnljN4Ohqf4nWa/exec"; /* Ara Engine capture (public, same as capture.html) */
var LS="lud_asks",TRY_MS=+(D.tryMs||20000),WAITS=[0,+(D.retry1||4000),+(D.retry2||15000)],AUTO_MAX=5*3600e3,POLL_MS=+(D.pollMs||60000);
var HIDEW=/\b(key|keys|safe|lock ?box(es)?|key ?box(es)?|box(es)?|lockup|lock|pin|code|codes|combo|combination|alarm|gate|door|padlock)\b/i;
/* ---------- code check (copied from the Desk fix round 4 code check, DeskFix.html lines 138-234) ---------- */
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
/* ---------- end of copied code check ---------- */
var CODE_WORD=/\b(key|keys|keysafe|safe|lockbox|lock|padlock|code|codes|pin|combo|combination|password|passcode|alarm|gate|door|keypad|box|boxes|lockup|keybox|keyboxes)\b/;
var CODE_MSG='Not sent. No codes, please. Write "key safe: yes" and leave the number out.';
var NUM_MSG='Not sent. 3 or more digits close together look like a code. Write "half ten" or "levels 2 to 4" instead.';
function codeMsg(s){return CODE_WORD.test(normText(s))?CODE_MSG:NUM_MSG}
/* any code in the title, the context, the ask, or split across them blocks the whole ask: nothing stored, nothing sent */
function blocked(t,c,h){var parts=[t,c,h].map(function(x){return String(x||"")}).filter(function(x){return x.trim()});
 for(var i=0;i<parts.length;i++)if(hasCode(parts[i]))return codeMsg(parts[i]);
 var all=parts.join(" ");return hasCode(all)?codeMsg(all):null}
function ls(){try{var a=JSON.parse(localStorage.getItem(LS)||"[]");return Array.isArray(a)?a:[]}catch(e){return[]}}
function save(a){try{localStorage.setItem(LS,JSON.stringify(a.slice(-200)))}catch(e){}}
function mk(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function hm(t){try{return new Date(t).toLocaleTimeString("en-AU",{timeZone:"Australia/Melbourne",hour:"numeric",minute:"2-digit"})}catch(e){return""}}
var LABEL={sending:"Sending to the bots\u2026",unsent:"Not sent \u2014 tap to retry",queued:"Got it \u2713",doing:"Bots are on it",done:"Done \u2713",needs:"Needs you"};
function label(a){var l=LABEL[a.st]||a.st;if(a.st==="queued"&&a.got)l+=" \u00b7 in Ara's inbox "+hm(a.got);if(a.st==="unsent"&&a.why)l=a.why+" \u2014 tap to retry";return l}
function css(){if(document.getElementById("ludCss"))return;var s=mk("style");s.id="ludCss";
 s.textContent="#notes>li,#puBody li,section[data-k=tasks] .gcol li,#dev ul.ev>li{flex-wrap:wrap}"+
 "#notes>li>.b,#pickup #puBody li>.t,section[data-k=tasks] .gcol li>.b,section[data-k=tasks] .gcol li>.t,#dev ul.ev>li>.x{flex:1 1 60%;min-width:60%;max-width:100%}"+
 "#notes>li .t,#pickup #puBody li .t,section[data-k=tasks] .gcol li .t,#dev ul.ev>li .x{min-width:0;overflow-wrap:break-word;word-break:normal}"+
 ".lud-btn{flex:1 0 100%;box-sizing:border-box;width:100%;max-width:100%;min-height:44px;min-width:44px;padding:0 12px;margin:6px 0 0;border-radius:10px;border:1px solid #22c55e;background:#052e1a;color:#bbf7d0;font:600 14px system-ui,sans-serif;cursor:pointer}.lud-btn[disabled]{opacity:.6}"+
 ".lud-st{flex:1 0 100%;box-sizing:border-box;display:flex;align-items:center;width:100%;max-width:100%;min-height:44px;margin:4px 0 0;padding:0 2px;border:0;background:transparent;text-align:left;font:13px system-ui,sans-serif;color:#a7f3d0;cursor:default}.lud-st.queued,.lud-st.done{color:#4ade80;font-weight:600}.lud-st.unsent{color:#fbbf24;cursor:pointer}.lud-st.needs{color:#f87171}"+
 ".lud-list li{list-style:none;padding:8px 0;border-top:1px solid #1f2937}.lud-list .w{font-size:12px;opacity:.85}"+
 ".lud-list .lud-retry{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;margin:4px 0;padding:0 12px;border-radius:10px;border:1px solid var(--accent,#22d3ee);background:transparent;color:var(--accent,#22d3ee);font:600 14px system-ui,sans-serif;cursor:pointer}"+
 "#ludSheet{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}"+
 "#ludSheet .p{box-sizing:border-box;width:100%;max-width:560px;max-height:90vh;overflow:auto;background:#0b0f14;color:#e5e7eb;border:1px solid #1f2937;border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));font:15px/1.45 system-ui,sans-serif}"+
 "#ludSheet h3{margin:0 0 6px;font-size:16px}#ludSheet .q{margin:0 0 8px;color:#cbd5e1;overflow-wrap:anywhere}#ludSheet .m{font-size:12px;color:#94a3b8;margin:6px 0}#ludSheet .m.warn{color:#fbbf24}"+
 "#ludSheet textarea{box-sizing:border-box;width:100%;min-height:88px;font:16px system-ui,sans-serif;padding:10px;border-radius:10px;border:1px solid #334155;background:#020617;color:#e5e7eb}"+
 "#ludSheet .r{display:flex;gap:10px;margin-top:10px}#ludSheet .r button{flex:1;min-height:48px;border-radius:12px;font:600 15px system-ui,sans-serif;cursor:pointer}"+
 "#ludSheet .go{border:1px solid #22c55e;background:#14532d;color:#dcfce7}#ludSheet .no{border:1px solid #475569;background:transparent;color:#cbd5e1}"+
 "#ludToast{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483001;max-width:calc(100vw - 24px);box-sizing:border-box;padding:12px 16px;min-height:44px;border-radius:12px;background:#14532d;color:#dcfce7;font:600 14px system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5)}#ludToast.bad{background:#78350f;color:#fef3c7}";
 document.head.appendChild(s)}
function clean(el){if(!el)return"";var c=el.cloneNode(true);c.querySelectorAll("button,.lud-st,.dv,.tm,.k,.m,img").forEach(function(x){x.remove()});c.querySelectorAll("b,span,div").forEach(function(x){x.append(" ")});return c.textContent.replace(/\s+/g," ").trim()}
function textOf(li){var t=li.querySelector(".t")||li.querySelector(".x")||li,n=li.querySelector(".n,.pv");
 if(n&&n.classList.contains("pv")&&n.firstElementChild&&n.firstElementChild.tagName==="B"){n=n.cloneNode(true);n.firstElementChild.remove()} /* the preview's date line is not part of the ask */
 return {title:clean(t).slice(0,200),context:clean(n).slice(0,400)}}
/* hide code-looking numbers when a code word is anywhere in the ask */
function normDigits(s){return String(s||"").normalize("NFKC").replace(/\p{Nd}/gu,function(d){var c=d.codePointAt(0),z=c;while(z>0&&/\p{Nd}/u.test(String.fromCodePoint(z-1)))z--;return String((c-z)%10)})}
function hideCodes(s,force){s=normDigits(s);if(!force&&!HIDEW.test(s))return {s:s,hid:false};var hid=false;
 var out=s.replace(/\d(?:[\s\-_.\/,:()*#]*\d){2,}/g,function(){hid=true;return"[number hidden]"});return {s:out,hid:hid}}
function toast(msg,bad){var t=document.getElementById("ludToast");if(!t){t=mk("div");t.id="ludToast";t.setAttribute("role","status");t.setAttribute("aria-live","polite");document.body.appendChild(t)}
 t.className=bad?"bad":"";t.textContent=msg;clearTimeout(toast._t);toast._t=setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t)},6000)}
function postOnce(ask){
 var text="[LET US DO THIS · "+ask.where+"] "+ask.title+(ask.context?" — context: "+ask.context:"")+(ask.how?" — ask: "+ask.how:"")+(refOf(ask)?" — row: "+refOf(ask):"")+" — rule: customer-facing = draft for Ange's OK";
 var ctl=window.AbortController?new AbortController():null,tm=setTimeout(function(){if(ctl)ctl.abort()},TRY_MS);
 if(navigator.onLine===false){clearTimeout(tm);return Promise.reject(new Error("offline"))}
 return fetch(API,{method:"POST",mode:"cors",redirect:"follow",credentials:"omit",signal:ctl?ctl.signal:undefined,headers:{"Content-Type":"text/plain;charset=utf-8"},
  body:JSON.stringify({app:"capture",items:[{id:ask.id,text:text,category:"Ara",ts:new Date(ask.ts).toISOString()}]})})
 .then(function(r){if(!r||!r.ok)throw new Error("http "+((r&&r.status)||0));return r.json()})
 .then(function(j){if(!j||j.ok===false)throw new Error("engine "+((j&&j.error)||"not ok"));
  var hit=(j.saved||[]).concat(j.dupes||[]);if(hit.indexOf(ask.id)<0)throw new Error("unconfirmed");return true},
  function(e){if(e&&e.name==="AbortError")throw new Error("timeout");throw e})
 .then(function(v){clearTimeout(tm);return v},function(e){clearTimeout(tm);throw e})}
function why(e){var m=String(e&&e.message||e);
 if(/offline/.test(m))return "No signal \u2014 kept on this phone, sends itself when you're back online";
 if(/timeout/.test(m))return "Ara's inbox took too long";
 if(/http 403|http 401/.test(m))return "Ara's inbox said no (blocked)";
 if(/http/.test(m))return "Ara's inbox didn't answer";
 if(/unconfirmed/.test(m))return "Ara's inbox didn't confirm it";
 if(/busy/.test(m))return "Ara's inbox was busy";
 return "Couldn't reach Ara's inbox"}
function post(ask){var i=0;
 function attempt(){return postOnce(ask).catch(function(e){if(/offline/.test(e.message))throw e;i++;if(i>=WAITS.length)throw e;
  return new Promise(function(res){setTimeout(res,WAITS[i])}).then(attempt)})}
 return attempt()}
function rows(){return TARGETS?document.querySelectorAll(TARGETS):[]}
function upd(id,patch){var a=ls(),ask=null;a.forEach(function(x){if(x.id===id){for(var k in patch)x[k]=patch[k];x.at=Date.now();ask=x}});save(a);paint();
 if(!ask)return null;rows().forEach(function(li){if(li.getAttribute("data-lud-id")===id||textOf(li).title===ask.title)mark(li,ask)});return ask}
var inflight={};
function send(id,quiet){var ask=ls().filter(function(x){return x.id===id})[0];if(!ask||inflight[id])return;
 if(blockedAsk(ask)){save(ls().filter(function(x){return x.id!==id}));paint();return}inflight[id]=1;
 upd(id,{st:"sending",why:""});
 post(ask).then(function(){var a=upd(id,{st:"queued",got:Date.now(),why:""});if(!quiet)toast("Got it \u2713 Ara's inbox has \u201c"+(a?a.title:"it").slice(0,60)+"\u201d")},
  function(e){var w=why(e);upd(id,{st:"unsent",why:w});if(!quiet)toast(w+". Kept on this phone.",true)})
 .then(function(){delete inflight[id]})}
function sheet(o,done){var old=document.getElementById("ludSheet");if(old)old.remove();
 var h=hideCodes(o.title+(o.context?" "+o.context:""),false);
 var w=mk("div");w.id="ludSheet";w.setAttribute("role","dialog");w.setAttribute("aria-modal","true");w.setAttribute("aria-label","Let us do this");
 var p=mk("div","p");p.appendChild(mk("h3",null,"Let us do this"));p.appendChild(mk("div","q","\u201c"+hideCodes(o.title,HIDEW.test(normDigits(o.title+" "+o.context))).s+"\u201d"));
 var ta=mk("textarea");ta.placeholder="Anything we should know? (optional)";ta.setAttribute("aria-label","Anything we should know? (optional)");ta.maxLength=600;p.appendChild(ta);
 p.appendChild(mk("div","m","Anything for a customer comes back to you as a draft first."));
 p.appendChild(mk("div","m","Leave out lockbox or key-safe codes, door or gate numbers, client names or addresses."));
 var r=mk("div","r"),no=mk("button","no","Cancel"),go=mk("button","go","Send to the bots");no.type=go.type="button";r.appendChild(no);r.appendChild(go);p.appendChild(r);w.appendChild(p);
 function close(v){w.remove();done(v)}
 var bad=mk("div","m warn lud-block");bad.setAttribute("role","alert");bad.hidden=true;p.insertBefore(bad,r);
 function chk(){var m=blocked(o.title,o.context,ta.value);bad.textContent=m||"";bad.hidden=!m;return m}
 no.onclick=function(){close(null)};go.onclick=function(){if(chk()){try{ta.focus({preventScroll:true})}catch(e){}return}go.disabled=true;close(ta.value)};
 w.addEventListener("click",function(e){if(e.target===w)close(null)});
 document.body.appendChild(w);try{ta.focus({preventScroll:true})}catch(e){}}
function go(li,btn){var o=textOf(li);if(!o.title||btn.disabled)return;btn.disabled=true;
 sheet(o,function(how){if(how===null){btn.disabled=false;return}
  if(blocked(o.title,o.context,how)){btn.disabled=false;toast(blocked(o.title,o.context,how),true);return}
  var risky=HIDEW.test(normDigits(o.title+" "+o.context+" "+how));
  var ask={id:"lud_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,6),ts:Date.now(),where:WHERE,
   title:hideCodes(o.title,risky).s,context:hideCodes(o.context,risky).s,how:hideCodes(String(how).trim(),risky).s,
   st:"sending",key:o.title};
  var a=ls();a.push(ask);save(a);mark(li,ask);send(ask.id,false);setTimeout(function(){btn.disabled=false},800)})}
function mark(li,ask){li.setAttribute("data-lud-id",ask.id);var s=li.querySelector(".lud-st");
 if(!s){s=mk("button","lud-st");s.type="button";s.setAttribute("aria-live","polite");li.appendChild(s)}
 s.className="lud-st "+ask.st;s.textContent=label(ask);s.disabled=ask.st==="sending";
 s.onclick=function(e){e.stopPropagation();if(ask.st==="unsent")send(ask.id,false)}}
function add(root){if(!TARGETS)return;var asks=ls();
 root.querySelectorAll(TARGETS).forEach(function(li){if(li.dataset.lud||/\bempty\b/.test(li.className))return;li.dataset.lud="1";
  var b=mk("button","lud-btn","Let us do this");b.type="button";b.setAttribute("aria-label","Let us do this: send to the bots");
  b.onclick=function(e){e.stopPropagation();go(li,b)};li.appendChild(b);
  var o=textOf(li),hit=asks.filter(function(x){return (x.key||x.title)===o.title&&x.where===WHERE}).pop();if(hit)mark(li,hit)})}
function paint(){if(!LIST)return;var L=document.querySelector(LIST);if(!L)return;L.textContent="";var a=ls().slice().reverse();
 if(!a.length){L.appendChild(mk("div","muted","Nothing sent with Let us do this from this device yet."));return}
 var ul=mk("ul","lud-list");a.slice(0,30).forEach(function(x){var li=mk("li"),meta=mk("div","w"),when=new Date(x.ts).toLocaleString("en-AU",{timeZone:"Australia/Melbourne",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
  li.appendChild(mk("div",null,x.title));meta.appendChild(document.createTextNode(x.where+" · "+when+" · "));
  if(x.st==="unsent"){var b=mk("button","lud-retry",label(x));b.type="button";b.setAttribute("data-lud-retry",x.id);b.onclick=function(e){e.stopPropagation();send(x.id,false)};meta.appendChild(b)}
  else meta.appendChild(document.createTextNode(label(x)));
  li.appendChild(meta);ul.appendChild(li)});
 L.appendChild(ul);L.appendChild(mk("div","muted","Got it \u2713 means Ara's inbox wrote it down. Bots are on it, Done and Needs you show here once the bots send status back."))}
/* re-send unsent asks by themselves for 5h (Engine ignores repeat ids for 6h) */
function autoResend(){if(navigator.onLine===false)return;var now=Date.now();
 ls().forEach(function(x){if((x.st==="unsent"||x.st==="sending")&&now-x.ts<AUTO_MAX)send(x.id,true)})}
/* optional status read-back; does nothing until the Engine returns {statuses:{...}} */
function poll(){if(document.hidden||navigator.onLine===false)return;var ids=ls().filter(function(x){return (x.st==="queued"||x.st==="doing"||x.st==="needs")&&Date.now()-x.ts<7*864e5}).slice(-20).map(function(x){return x.id});
 if(!ids.length)return;
 fetch(API+"?app=capture&ids="+encodeURIComponent(ids.join(",")),{method:"GET",credentials:"omit"}).then(function(r){return r.ok?r.json():null}).then(function(j){
  if(!j||!j.statuses||typeof j.statuses!=="object")return;Object.keys(j.statuses).forEach(function(id){var s=String(j.statuses[id]||"");if(/^(doing|done|needs)$/.test(s))upd(id,{st:s})})}).catch(function(){})}
/* drop every saved ask that fails the code check, whatever its status (asks saved by v1 could hold codes, e.g. "key safe 4719 · Got it") */
/* A Deck History amend carries its row id in ask.ref, a field the code check never reads (ids like builder-29oct-v3 have 3
   digits). ref only ever holds a plain id; anything else is dropped from it. The check runs on the words, never on the id. */
function refOf(x){var r=x&&x.ref;return typeof r==="string"&&/^[a-z0-9][a-z0-9-]{0,39}$/i.test(r)?r:""}
/* older Deck History amends put the id in the title: move it to ref before anything is checked */
function migrate(x){var m=x&&x.where==="Deck \u00b7 History"&&typeof x.title==="string"&&x.title.match(/^Amend history row (\S+) \((.*)\)$/);
 if(m&&/^[a-z0-9][a-z0-9-]{0,39}$/i.test(m[1])){x.title="Amend history row by "+m[2];x.ref=m[1];return true}return false}
function blockedAsk(x){return !!(blocked(x.title,x.context,x.how)||(x.key&&blocked(x.key)))}
function purge(){var a=ls(),moved=0;a.forEach(function(x){if(migrate(x))moved++});
 var k=a.filter(function(x){return x&&!blockedAsk(x)});if(k.length!==a.length||moved)save(k)}
function start(){css();purge();add(document);paint();
 if(TARGETS&&window.MutationObserver)new MutationObserver(function(){add(document)}).observe(document.body,{childList:true,subtree:true});
 window.addEventListener("online",autoResend);setTimeout(autoResend,1500);
 if(POLL_MS>0){setTimeout(poll,3000);setInterval(poll,POLL_MS);document.addEventListener("visibilitychange",function(){if(!document.hidden)poll()})}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
window.LetUsDo={asks:ls,hideCodes:hideCodes,hasCode:hasCode,blocked:blocked};
})();
