/* verdict.js: Agree / Disagree on every Deck line (29 Oct 2026, LOCAL TEST COPY, not live).
   Ange, 1:58am 29 Oct, his exact words include "greet and disagree" (voice to text). What he asked for, cleaned up, not
   his exact words: a button to agree and disagree with what was done on every one of these threads from right now.
   Every HISTORY row, every "On this device" line and every "Let us do this" ask on Deck gets two buttons, Agree and Disagree.
   1. A tap is saved on THIS phone first (localStorage "deck_verdicts": line id -> verdict + time) and shows on the line.
   2. Then ONE row goes to the bots' inbox by the SAME path as "Let us do this" (js/letusdo.js, js/history.js): the public
      Ara Engine capture inbox (no key). Text starts "[DECK VERDICT · Deck]" and carries only the verdict, the line's
      reference (history row id, or a short fingerprint plus kind and time for a device line) and the time of the tap.
      The line's own words are NEVER sent, so no note title or client detail leaves the phone.
   3. Disagree also opens the Amend note box (js/history.js) so he can say why. The reason goes through js/refcheck.js
      (no codes, links, emails or file names: the same rules the History Log scrub refuses), then the code check copied
      from js/watchme.js (Desk fix round 4 rules), and only then the same queue. A refused reason is never stored or sent.
   4. Offline queue (localStorage "deck_verdict_q"): unsent taps re-send by themselves when the phone comes back online,
      when the app is reopened, and every 30 seconds while any are waiting. One send at a time, 20 second limit each.
      Each tap has its own id and the Engine ignores a repeat id, so a late re-send never writes a second row.
   Usage: <script src="js/verdict.js" data-where="Deck" data-targets="#dev ul.ev > li, #ludList li.lud-ask"></script>
   (history rows are mounted by js/history.js through window.DeckVerdict.mount). No key, token or secret is in this file. */
(function(){"use strict";
if(window.DeckVerdict)return;
var S=document.currentScript||{},D=S.dataset||{};
var WHERE=D.where||"Deck",TARGETS=D.targets||"";
var API="https://script.google.com/macros/s/AKfycbxzrPy359CBlkbrYuR0-5xJB4GLXIQ6xNDIE6EFEb2xvnoY0n5sodcnljN4Ohqf4nWa/exec"; /* Ara Engine capture: same public URL as js/letusdo.js */
var LSV="deck_verdicts",LSQ="deck_verdict_q",SEND_MS=20000,TICK_MS=30000,WHY_MAX=600;

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
var CODE_MSG='Note not saved. No codes, please. Write "key safe: yes" and leave the number out.';
var NUM_MSG='Note not saved. 3 or more digits close together look like a code. Write "half ten" or "levels 2 to 4" instead.';
function codeMsg(s){return CODE_WORD.test(normText(s))?CODE_MSG:NUM_MSG}

/* ---------- small helpers ---------- */
function mk(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function rd(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function vget(){var v=rd(LSV,{});return v&&typeof v==="object"&&!Array.isArray(v)?v:{}}
function qget(){var q=rd(LSQ,[]);return Array.isArray(q)?q:[]}
function qput(q){wr(LSQ,q.slice(-300))}
function fp(s){var h=2166136261;s=String(s);for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h.toString(36)}
function newId(){return "dv_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7)}
function melb(ts){try{return new Date(ts).toLocaleString("en-AU",{timeZone:"Australia/Melbourne",weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}catch(e){return""}}
function hm(ts){try{return new Date(ts).toLocaleTimeString("en-AU",{timeZone:"Australia/Melbourne",hour:"numeric",minute:"2-digit"})}catch(e){return""}}

/* ---------- send: same body and checks as letusdo.js post(), with a time limit ---------- */
function rowText(it){
 return "[DECK VERDICT · "+WHERE+"] "+(it.v==="agree"?"Agree":"Disagree")+(it.why!=null?" (why)":"")+" — line: "+it.label+" — ref: "+it.line+
  " — tapped: "+melb(it.t)+" Melbourne"+(it.why!=null?" — why: "+it.why:"")+" — rule: customer-facing = draft for Ange's OK"}
function post(it){
 var ctl=window.AbortController?new AbortController():null,tm=setTimeout(function(){if(ctl)ctl.abort()},SEND_MS);
 return fetch(API,{method:"POST",mode:"cors",redirect:"follow",credentials:"omit",signal:ctl?ctl.signal:undefined,headers:{"Content-Type":"text/plain;charset=utf-8"},
  body:JSON.stringify({app:"capture",items:[{id:it.id,text:rowText(it),category:"Ara",ts:new Date(it.t).toISOString()}]})})
 .then(function(r){if(!r||!r.ok)throw new Error("HTTP "+((r&&r.status)||0));return r.json()})
 .then(function(j){if(!j||j.ok===false)throw new Error((j&&j.error)||"not ok");
  var hit=(j.saved||[]).concat(j.dupes||[]);if(hit.length&&hit.indexOf(it.id)<0)throw new Error("inbox did not confirm");return true})
 .then(function(v){clearTimeout(tm);return v},function(e){clearTimeout(tm);throw e})}

/* ---------- the queue ---------- */
var busy=null;
function markSent(it){var v=vget(),s=v[it.line];if(!s)return;
 if(it.why!=null){if(s.whyId===it.id){s.whySent=Date.now()}}else if(s.qid===it.id){s.sent=Date.now()}
 v[it.line]=s;wr(LSV,v)}
function flush(){if(busy)return busy;
 busy=new Promise(function(done){
  function next(){var q=qget();if(!q.length){done(true);return}
   if(navigator.onLine===false){done(false);return}
   var it=q[0];
   post(it).then(function(){var q2=qget().filter(function(x){return x.id!==it.id});qput(q2);markSent(it);paintAll();next()},
    function(e){var q2=qget();q2.forEach(function(x){if(x.id===it.id){x.tries=(x.tries||0)+1;x.err=String(e&&e.message||e).slice(0,60)}});qput(q2);paintAll();done(false)})}
  next()}).then(function(v){busy=null;return v});
 return busy}
function pending(id){return qget().some(function(x){return x.id===id})}

/* ---------- a verdict tap ---------- */
function record(line,label,v){var st=vget(),cur=st[line];
 if(cur&&cur.v===v)return cur; /* same verdict again: already recorded, nothing new is sent */
 var it={id:newId(),line:line,label:label,v:v,t:Date.now()};
 st[line]={v:v,t:it.t,qid:it.id,sent:0};
 if(!wr(LSV,st))return null;
 var q=qget();q.push(it);qput(q);paintAll();flush();return st[line]}
function askWhy(line,label,shown){
 var H=window.DeckHistory;if(!H||!H.note)return;
 var whyIt=null;
 H.note({heading:"Why do you disagree?",aria:"Why you disagree",
  lead:"Disagree with "+(shown||label)+". Say what was wrong so the bots can fix it. It goes to the bots' inbox. No codes, keys or client details.",
  check:function(note){if(note.length>WHY_MAX)return "Keep it shorter, please.";var RC=window.RefCheck;
   if(!RC)return "This note can't be checked right now, so it isn't sent.";if(RC.blocked(note))return RC.MSG;return hasCode(note)?codeMsg(note):""},
  okMsg:"Sent. The bots' inbox wrote it down.",
  kept:function(){return !!(whyIt&&pending(whyIt.id))},
  failMsg:function(){return whyIt&&pending(whyIt.id)?"Kept on this phone. It sends by itself when you're back online.":"Not sent, and this phone couldn't keep it. Copy your reason and try again."},
  send:function(note){var st=vget(),s=st[line];if(!s||s.v!=="disagree")return Promise.reject(new Error("no verdict"));
   if(!whyIt||whyIt.why!==note){whyIt={id:newId(),line:line,label:label,v:"disagree",why:note,t:Date.now()};
    s.whyId=whyIt.id;s.whySent=0;s.why=1;st[line]=s;wr(LSV,st);var q=qget();q.push(whyIt);qput(q);paintAll()}
   var id=whyIt.id;return flush().then(function(){if(pending(id))throw new Error("queued")})}})}

/* ---------- what shows on the line ---------- */
var MOUNTS=[];
function paint(m){var s=vget()[m.line],a=m.a,d=m.d,t=m.t;
 a.setAttribute("aria-pressed",s&&s.v==="agree"?"true":"false");d.setAttribute("aria-pressed",s&&s.v==="disagree"?"true":"false");
 if(!s){t.textContent="";t.hidden=true;return}
 var w=s.v==="agree"?"You agreed":"You disagreed",sent=s.sent||!pending(s.qid);
 var x=w+" \u00b7 "+hm(s.t)+" \u00b7 "+(sent?"sent \u2713":"waiting to send");
 if(s.v==="disagree")x+=s.why?(s.whySent||(s.whyId&&!pending(s.whyId))?" \u00b7 reason sent \u2713":" \u00b7 reason waiting to send"):" \u00b7 tap Disagree to say why";
 t.hidden=false;t.textContent=x;t.className="dv-st "+s.v+(sent?"":" wait")}
function paintAll(){MOUNTS=MOUNTS.filter(function(m){return m.el.isConnected});MOUNTS.forEach(paint)}
/* label goes in the sent row only (it can hold a history row id); shown is what Ange sees, never an id */
function mount(el,line,label,shown){if(!el||el.querySelector(":scope > .dv"))return;
 var box=mk("div","dv"),a=mk("button","dv-b dv-agree","\u2713 Agree"),d=mk("button","dv-b dv-dis","\u2717 Disagree"),t=mk("div","dv-st");
 a.type=d.type="button";a.setAttribute("aria-label","Agree with what was done");d.setAttribute("aria-label","Disagree with what was done");
 t.setAttribute("aria-live","polite");box.setAttribute("data-dv",line);
 a.addEventListener("click",function(e){e.stopPropagation();record(line,label,"agree")});
 d.addEventListener("click",function(e){e.stopPropagation();if(record(line,label,"disagree"))askWhy(line,label,shown)});
 box.appendChild(a);box.appendChild(d);box.appendChild(t);el.appendChild(box);
 var m={el:box,line:line,a:a,d:d,t:t};MOUNTS.push(m);paint(m)}

/* ---------- Deck's other lines: a reference that carries none of the line's words ---------- */
function txt(el){if(!el)return"";var c=el.cloneNode(true);c.querySelectorAll("button,.dv,.lud-st,.lud-btn").forEach(function(x){x.remove()});return c.textContent.replace(/\s+/g," ").trim()}
function dayBefore(li){var ul=li.parentNode,p=ul&&ul.previousElementSibling;while(p&&!(p.classList&&p.classList.contains("day")))p=p.previousElementSibling;return p?p.textContent.trim():""}
function describe(li){
 if(li.matches("#dev ul.ev > li")){var k=txt(li.querySelector(".k"))||"line",tm=txt(li.querySelector(".tm")),dy=dayBefore(li);
  return {line:"dev_"+fp(dy+"|"+tm+"|"+txt(li)),label:"device line ("+k+", "+(dy?dy.toLowerCase()+" ":"")+tm+")"}}
 var first=li.firstElementChild,w=li.querySelector(".w"),meta=w&&w.firstChild&&w.firstChild.nodeType===3?w.firstChild.nodeValue.replace(/[\s\u00b7]+$/,""):"";
 return {line:"ask_"+fp(txt(first)+"|"+meta),label:"Let us do this ask ("+meta+")"}}
function scan(){if(!TARGETS)return;document.querySelectorAll(TARGETS).forEach(function(li){if(li.querySelector(":scope > .dv"))return;
 if(/\bempty\b|\bmuted\b/.test(li.className))return;var o=describe(li);if(o)mount(li,o.line,o.label)})}

function css(){if(document.getElementById("dvCss"))return;var s=mk("style");s.id="dvCss";s.textContent=
 ".dv{display:flex;flex-wrap:wrap;gap:6px;align-items:center;box-sizing:border-box;max-width:100%}"+
 "#dev ul.ev>li{flex-wrap:wrap}#dev ul.ev>li>.dv,#ludList li>.dv{flex:1 0 100%;margin-top:6px}"+
 ".dv-b{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;flex:1 1 0;min-width:44px;min-height:44px;padding:0 10px;border-radius:10px;border:1px solid #404040;background:#0a0a0a;color:#e5e5e5;font:600 14px system-ui,sans-serif;cursor:pointer;white-space:nowrap}"+
 ".dv-b:focus-visible{outline:2px solid var(--accent,#22d3ee);outline-offset:2px}"+
 ".dv-b.dv-agree[aria-pressed=true]{background:#052e1a;border-color:#22c55e;color:#bbf7d0}"+
 ".dv-b.dv-dis[aria-pressed=true]{background:#2a0a0a;border-color:#ef4444;color:#fecaca}"+
 ".dv-st{flex:1 0 100%;font-size:12px;color:#a7f3d0;overflow-wrap:anywhere}.dv-st.disagree{color:#fca5a5}.dv-st.wait{color:#fbbf24}"+
 "#hist td.c-dv .dv{flex-direction:column;align-items:stretch}#hist td.c-dv .dv-b{flex:0 0 auto;width:100%;padding:0 6px}"+
 "@media (max-width:599.98px){#hist td.c-dv .dv{flex-direction:row;flex-wrap:wrap}#hist td.c-dv .dv-b{flex:1 1 0;width:auto}}";
 document.head.appendChild(s)}

function start(){css();scan();
 if(TARGETS&&window.MutationObserver)new MutationObserver(function(){scan()}).observe(document.body,{childList:true,subtree:true});
 addEventListener("online",flush);
 document.addEventListener("visibilitychange",function(){if(!document.hidden)flush()});
 setInterval(function(){if(qget().length)flush()},TICK_MS);
 if(qget().length)flush()}
window.DeckVerdict={refBlocked:function(s){return !window.RefCheck||window.RefCheck.blocked(s)},mount:mount,flush:flush,queue:qget,verdicts:vget,hasCode:hasCode,_text:rowText};
css();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
