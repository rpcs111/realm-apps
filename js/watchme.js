/* watchme.js: "Watch me work" for Note (29 Oct 2026).
   Ange records himself doing a job (screen where the browser allows it, otherwise a camera clip or a video he picks,
   e.g. from Samsung's own Screen recorder), with his mic narration, plus a short title and a "what this job is" note.
   1. The video is saved on THIS phone first (IndexedDB "realm_watchme_db"), before anything is sent.
   2. Then ONE row goes to the bots' inbox by the SAME path as "Let us do this" (js/letusdo.js): the public Ara Engine
      capture inbox (no key). Text starts "[WATCH ME WORK · Note]" and carries the title, the note, the recording's
      length and size, and a reference (wmw_...). The video itself NEVER goes through that path: the inbox takes
      at most 2,000 characters of text per row and 120,000 bytes per request, so a video cannot fit, and there is
      no keyless upload path. The row says the recording is waiting on the phone.
   3. Sends: 30 second limit; one send at a time per recording; after a time-out the same recording is not sent
      again for 6 minutes ("Still sending, check back in a few minutes."); the Engine also ignores a repeat id
      for 6 hours, so a late retry never writes a second row. Nothing is sent on page load.
   4. Typed title and note go through the code check (same rules as the Desk fix; no 3+ digit codes).
   No key, token or secret is in this file. */
(function(){"use strict";
if(window.WatchMe)return;
var S=document.currentScript||{},D=S.dataset||{};
var WHERE=D.where||"Note",MOUNT=D.mount||".rui-main .rui-status";
var API="https://script.google.com/macros/s/AKfycbxzrPy359CBlkbrYuR0-5xJB4GLXIQ6xNDIE6EFEb2xvnoY0n5sodcnljN4Ohqf4nWa/exec"; /* Ara Engine capture: same public URL as js/letusdo.js and capture.html */
var SEND_MS=30000,HOLD_MS=360000,MAX_SEC=600,MAX_TRIES=5,TITLE_MAX=60,ABOUT_MAX=400;

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
function $(id){return document.getElementById(id)}
function mk(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function now(){return Date.now()}
function newId(){return "wmw_"+now().toString(36)+"_"+Math.random().toString(36).slice(2,7)}
function dev(){try{return localStorage.getItem("realm_device")||(location.search.match(/[?&]d=([A-Za-z0-9_-]{1,20})/)||[])[1]||""}catch(e){return""}}
function mins(sec){if(!(sec>0))return "length unknown";sec=Math.round(sec);var m=Math.floor(sec/60),s=sec%60;return m?(m+" min"+(s?" "+s+" s":"")):(s+" s")}
function mb(n){if(!(n>0))return "size unknown";return n<1048576?Math.max(1,Math.round(n/1024))+" KB":(n/1048576).toFixed(1)+" MB"}
function when(ts){try{return new Date(ts).toLocaleString("en-AU",{timeZone:"Australia/Melbourne",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}catch(e){return""}}
var KIND={screen:"screen recording",camera:"camera clip",file:"video from the phone"};

/* ---------- storage: IndexedDB first (meta + video + voice) ---------- */
var DBN="realm_watchme_db",dbp=null;
function db(){if(dbp)return dbp;dbp=new Promise(function(res,rej){try{if(!window.indexedDB){rej(new Error("no IndexedDB"));return}
  var r=indexedDB.open(DBN,1);r.onupgradeneeded=function(){var d=r.result;if(!d.objectStoreNames.contains("clips"))d.createObjectStore("clips",{keyPath:"id"});if(!d.objectStoreNames.contains("media"))d.createObjectStore("media",{keyPath:"id"})};
  r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error||new Error("IndexedDB open failed"))};r.onblocked=function(){rej(new Error("IndexedDB blocked"))}}catch(e){rej(e)}});
  dbp.catch(function(){dbp=null});return dbp}
function tx(stores,mode,fn){return db().then(function(d){return new Promise(function(res,rej){var t=d.transaction(stores,mode),out;t.oncomplete=function(){res(out)};t.onerror=t.onabort=function(){rej(t.error||new Error("IndexedDB write failed"))};out=fn(t)})})}
function putClip(meta,media){return tx(["clips","media"],"readwrite",function(t){t.objectStore("clips").put(meta);if(media)t.objectStore("media").put(media)})}
function putMeta(meta){return tx(["clips"],"readwrite",function(t){t.objectStore("clips").put(meta)})}
function getAll(){return tx(["clips"],"readonly",function(t){var r=t.objectStore("clips").getAll(),box={v:[]};r.onsuccess=function(){box.v=r.result||[]};return box}).then(function(b){return b.v})}
function getMedia(id){return tx(["media"],"readonly",function(t){var r=t.objectStore("media").get(id),box={v:null};r.onsuccess=function(){box.v=r.result||null};return box}).then(function(b){return b.v})}
function getMeta(id){return tx(["clips"],"readonly",function(t){var r=t.objectStore("clips").get(id),box={v:null};r.onsuccess=function(){box.v=r.result||null};return box}).then(function(b){return b.v})}

/* ---------- the send (same inbox and body shape as "Let us do this") ---------- */
var inflight={};
function rowText(c){var d=dev();
  var t="[WATCH ME WORK \u00b7 "+WHERE+(d?" \u00b7 "+d:"")+"] "+c.title+
   (c.about?" \u2014 what this job is: "+c.about:"")+
   " \u2014 recording: "+(KIND[c.kind]||"video")+", "+mins(c.dur)+", "+mb(c.size)+(c.mic?", with Ange's voice":", no voice")+(c.voice?", plus a separate voice description ("+mins(c.voiceDur)+")":"")+
   " \u2014 the recording is waiting on Ange's phone in the Note app (too big for this inbox), ref "+c.id+
   " \u2014 ask: learn this job and turn it into a skill; anything for a customer comes back as a draft for Ange's OK";
  return t.slice(0,2000)}
function post(c){
  var ctl=window.AbortController?new AbortController():null,timedOut=false,tm=setTimeout(function(){timedOut=true;if(ctl)ctl.abort()},SEND_MS);
  var body=JSON.stringify({app:"capture",items:[{id:c.id,text:rowText(c),category:"Ara",ts:new Date(c.ts).toISOString()}]});
  var p=fetch(API,{method:"POST",mode:"cors",redirect:"follow",credentials:"omit",headers:{"Content-Type":"text/plain;charset=utf-8"},body:body,signal:ctl?ctl.signal:undefined})
   .then(function(r){if(!r||!r.ok)throw new Error("HTTP "+((r&&r.status)||0));return r.json()})
   .then(function(j){if(!j||j.ok===false)throw new Error((j&&j.error)||"not ok");var hit=(j.saved||[]).concat(j.dupes||[]);if(hit.indexOf(c.id)<0)throw new Error("inbox did not confirm");return true});
  /* the 30 s limit holds even where AbortController is missing */
  var lt=0,lim=new Promise(function(res,rej){lt=setTimeout(function(){timedOut=true;rej(new Error("timeout"))},SEND_MS+50)});
  return Promise.race([p,lim]).then(function(v){clearTimeout(tm);clearTimeout(lt);return v},function(e){clearTimeout(tm);clearTimeout(lt);if(timedOut)e={timeout:true};throw e})}
function send(id){
  if(inflight[id])return Promise.resolve("busy");
  inflight[id]=1;
  return getMeta(id).then(function(c){
    if(!c){delete inflight[id];return "gone"}
    if(c.st==="sent"){delete inflight[id];paintList();return "sent"}
    if(c.st==="sending"){c.st="slow";c.slowAt=c.lastTry||now()} /* cut off mid-send: it may have landed */
    if(c.st==="slow"&&now()-(c.slowAt||0)<HOLD_MS){delete inflight[id];paintList();return "hold"}
    if(navigator.onLine===false){c.st="unsent";c.err="offline";return putMeta(c).then(function(){delete inflight[id];paintList();return "offline"})}
    c.st="sending";c.tries=(c.tries||0)+1;c.lastTry=now();
    return putMeta(c).then(function(){paintList();return post(c)}).then(function(){c.st="sent";c.sentAt=now();c.err=""},function(e){
      if(e&&e.timeout){c.st="slow";c.slowAt=now();c.err="timeout"}else{c.st="unsent";c.err=String(e&&e.message||e)}})
     .then(function(){return putMeta(c)}).then(function(){delete inflight[id];paintList();return c.st})
  }).catch(function(e){delete inflight[id];paintList();return "error"})}

/* ---------- recording ---------- */
var md=navigator.mediaDevices||null;
function canScreen(){return !!(md&&typeof md.getDisplayMedia==="function")} /* Chrome on Android does not have it (2026), so phones get the camera / pick-a-video way */
function canCam(){return !!(md&&typeof md.getUserMedia==="function"&&window.MediaRecorder)}
function pickMime(audioOnly){var L=audioOnly?["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg"]:["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"];
  for(var i=0;i<L.length;i++){try{if(MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(L[i]))return L[i]}catch(e){}}return ""}
var rec=null; /* {mr, chunks, streams, kind, t0, timer, audioOnly, mixCtx} */
var draft=null; /* {id, kind, mime, size, dur, mic, blob, voice, voiceDur, voiceMime} */
function stopTracks(list){(list||[]).forEach(function(s){try{s.getTracks().forEach(function(t){t.stop()})}catch(e){}})}
function mixAudio(a,b){/* screen sound + mic into one track */try{var C=window.AudioContext||window.webkitAudioContext;if(!C)return {track:b.getAudioTracks()[0],ctx:null};
  var ctx=new C(),dst=ctx.createMediaStreamDestination();[a,b].forEach(function(s){if(s&&s.getAudioTracks().length)ctx.createMediaStreamSource(s).connect(dst)});
  return {track:dst.stream.getAudioTracks()[0],ctx:ctx}}catch(e){return {track:b.getAudioTracks()[0],ctx:null}}}
function getMic(){return md.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}).catch(function(){return null})}
function startScreen(){if(!canScreen()){say("This phone can't record its screen from Chrome. Use Samsung's Screen recorder, then tap Pick a video.");return Promise.resolve()}
  var ds;return md.getDisplayMedia({video:true,audio:true}).then(function(s){ds=s;return getMic()}).then(function(mic){
    var tracks=ds.getVideoTracks().slice(),streams=[ds],ctx=null,hasMic=!!(mic&&mic.getAudioTracks().length);
    if(mic)streams.push(mic);
    if(hasMic&&ds.getAudioTracks().length){var m=mixAudio(ds,mic);tracks.push(m.track);ctx=m.ctx}
    else if(hasMic)tracks.push(mic.getAudioTracks()[0]);else if(ds.getAudioTracks().length)tracks.push(ds.getAudioTracks()[0]);
    begin("screen",new MediaStream(tracks),streams,ctx,hasMic,false);
    ds.getVideoTracks()[0].addEventListener("ended",function(){if(rec&&rec.kind==="screen")stopRec()});
    if(!hasMic)say("The mic is off, so this one has no voice. You can add a voice description after you stop.")
  },function(e){stopTracks([ds]);say("Screen recording didn't start. Use Record with camera, or Pick a video.")})}
function startCam(){if(!canCam()){$("wmwFileCap").click();return Promise.resolve()}
  return md.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:{echoCancellation:true,noiseSuppression:true}}).then(function(s){begin("camera",s,[s],null,true,false)},
    function(){return md.getUserMedia({video:{facingMode:{ideal:"environment"}}}).then(function(s){begin("camera",s,[s],null,false,false);say("The mic is off, so this one has no voice. You can add a voice description after you stop.")},
      function(){say("The camera didn't open. Tap Film with the camera app instead.");$("wmwCapBtn").hidden=false})})}
function startVoice(){if(!canCam()){say("Voice recording isn't available here.");return Promise.resolve()}
  return getMic().then(function(m){if(!m){say("The mic didn't open. Check Chrome's mic permission for this app.");return}begin("voice",m,[m],null,true,true)})}
function begin(kind,stream,streams,ctx,hasMic,audioOnly){
  var mime=pickMime(audioOnly),mr;try{mr=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream)}catch(e){stopTracks(streams);say("This phone can't record here. Tap Pick a video.");return}
  rec={mr:mr,chunks:[],streams:streams,kind:kind,t0:now(),audioOnly:audioOnly,ctx:ctx,mic:hasMic,mime:mr.mimeType||mime||(audioOnly?"audio/webm":"video/webm")};
  window.WatchMe.last={kind:kind,video:stream.getVideoTracks().length,audio:stream.getAudioTracks().length,mime:rec.mime};
  mr.ondataavailable=function(e){if(e.data&&e.data.size)rec&&rec.chunks.push(e.data)};
  mr.onstop=function(){finish()};
  mr.start(1000);
  var pv=$("wmwPrev");if(!audioOnly){try{pv.srcObject=stream;pv.hidden=false;var pp=pv.play();if(pp&&pp.catch)pp.catch(function(){})}catch(e){}}else pv.hidden=true;
  $("wmwRecLbl").textContent=audioOnly?"Recording your voice description. Say what the job is and how you do it.":"Recording. Talk me through what you're doing.";
  $("wmwRec").hidden=false;$("wmwHow").hidden=true;$("wmwTipScreen").hidden=true;$("wmwReady").hidden=true;$("wmwSave").disabled=true;
  tick();rec.timer=setInterval(tick,500)}
function tick(){if(!rec)return;var s=(now()-rec.t0)/1000;$("wmwTime").textContent=Math.floor(s/60)+":"+("0"+Math.floor(s%60)).slice(-2)+" of 10:00";if(s>=MAX_SEC){say("10 minutes is the most for one recording, so it stopped. It's ready to save.");stopRec()}}
function stopRec(){if(!rec)return;clearInterval(rec.timer);try{if(rec.mr.state!=="inactive"){try{rec.mr.requestData()}catch(e){}rec.mr.stop()}else finish()}catch(e){finish()}}
function finish(){if(!rec)return;var r=rec;rec=null;clearInterval(r.timer);stopTracks(r.streams);try{if(r.ctx)r.ctx.close()}catch(e){}
  var pv=$("wmwPrev");try{pv.srcObject=null}catch(e){}pv.hidden=true;$("wmwRec").hidden=true;$("wmwHow").hidden=false;$("wmwTipScreen").hidden=canScreen();
  var blob=new Blob(r.chunks,{type:r.mime}),dur=(now()-r.t0)/1000;
  if(!blob.size){say("Nothing was recorded. Try again.");paintDraft();return}
  if(r.audioOnly){draft=draft||{id:newId()};draft.voice=blob;draft.voiceDur=dur;draft.voiceMime=r.mime;say("Voice description ready.")}
  else{var keep=draft&&draft.voice?{voice:draft.voice,voiceDur:draft.voiceDur,voiceMime:draft.voiceMime}:{};draft={id:(draft&&draft.id)||newId(),kind:r.kind,mime:r.mime,size:blob.size,dur:dur,mic:r.mic,blob:blob,voice:keep.voice,voiceDur:keep.voiceDur,voiceMime:keep.voiceMime};say("Recording ready. Check the title and note, then tap Save and send.")}
  keepDraft();paintDraft()}
function fromFile(f){if(!f)return;if(f.type&&!/^video\//.test(f.type)){say("That isn't a video. Pick a video file.");return}
  var keep=draft&&draft.voice?draft:{};
  draft={id:(draft&&draft.id)||newId(),kind:"file",mime:f.type||"video/mp4",size:f.size,dur:0,mic:true,blob:f,voice:keep.voice,voiceDur:keep.voiceDur,voiceMime:keep.voiceMime};
  paintDraft();say("Video picked. Check the title and note, then tap Save and send.");
  try{var v=document.createElement("video"),u=URL.createObjectURL(f),done=false;v.preload="metadata";v.muted=true;
    var end=function(){if(done)return;done=true;URL.revokeObjectURL(u);if(draft&&draft.blob===f&&isFinite(v.duration)&&v.duration>0){draft.dur=v.duration;paintDraft()}keepDraft()};
    v.onloadedmetadata=end;v.onerror=end;setTimeout(end,4000);v.src=u}catch(e){keepDraft()}}

/* the unsaved recording is kept on the phone too, so leaving the app never loses it */
function keepDraft(){if(!draft)return;var m={id:"draft",d:{id:draft.id,kind:draft.kind,mime:draft.mime,size:draft.size,dur:draft.dur,mic:draft.mic,voiceDur:draft.voiceDur,voiceMime:draft.voiceMime},blob:draft.blob||null,voice:draft.voice||null};
  tx(["media"],"readwrite",function(t){t.objectStore("media").put(m)}).catch(function(){})}
function dropDraft(){draft=null;return tx(["media"],"readwrite",function(t){t.objectStore("media").delete("draft")}).catch(function(){})}
function loadDraft(){return getMedia("draft").then(function(m){if(m&&m.d&&!draft){draft=m.d;draft.blob=m.blob;draft.voice=m.voice;paintDraft()}}).catch(function(){})}

/* ---------- save: check the words, keep it on the phone, then send one row ---------- */
var saving=false;
function save(){
  if(saving||rec)return Promise.resolve(false);
  var title=$("wmwTitle").value.replace(/\s+/g," ").trim(),about=$("wmwAbout").value.replace(/\s+/g," ").trim();
  if(!draft||!draft.blob){say("Record or pick a video first.");return Promise.resolve(false)}
  if(title.length<2){say("Give it a short title first.");$("wmwTitle").focus();return Promise.resolve(false)}
  if(hasCode(title)){say(codeMsg(title));$("wmwTitle").focus();return Promise.resolve(false)}
  if(about&&hasCode(about)){say(codeMsg(about));$("wmwAbout").focus();return Promise.resolve(false)}
  if(about&&hasCode(title+" "+about)){say(codeMsg(title+" "+about));$("wmwAbout").focus();return Promise.resolve(false)}
  saving=true;$("wmwSave").disabled=true;$("wmwSave").textContent="Saving on this phone\u2026";
  var d=draft,meta={id:d.id,ts:now(),title:title.slice(0,TITLE_MAX),about:about.slice(0,ABOUT_MAX),kind:d.kind,mime:d.mime,size:d.size,dur:d.dur,mic:!!d.mic,voice:!!d.voice,voiceDur:d.voiceDur||0,st:"saved",tries:0};
  var room=navigator.storage&&navigator.storage.estimate?navigator.storage.estimate().catch(function(){return null}):Promise.resolve(null);
  return room.then(function(est){if(est&&est.quota&&(est.quota-(est.usage||0))<(d.size||0)*1.1)throw new Error("full");
    return getMeta(d.id)}).then(function(old){if(old)return "dup";
    return putClip(meta,{id:d.id,video:d.blob,voice:d.voice||null,mime:d.mime,voiceMime:d.voiceMime||""})})
   .then(function(r){saving=false;$("wmwSave").textContent="Save and send to the bots";dropDraft();$("wmwTitle").value="";$("wmwAbout").value="";paintDraft();paintList();
     try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(function(){})}catch(e){}
     if(r==="dup")return true;say("Saved on this phone. Sending the note to the bots\u2026");return send(d.id).then(function(st){say(stMsg(st));return true})},
    function(e){saving=false;$("wmwSave").textContent="Save and send to the bots";paintDraft();say(String(e&&e.message)==="full"?"Not saved: the phone is out of storage for this video. Free some space, then tap Save again.":"Not saved on this phone. Tap Save again.");return false})}
function stMsg(st){return st==="sent"?"Sent. The bots have the note; the video stays on this phone.":st==="slow"?"Still sending, check back in a few minutes.":st==="offline"?"You're offline. It's safe on this phone; tap Not sent when you have signal.":st==="busy"||st==="sending"?"Sending\u2026":"Not sent. It's safe on this phone; tap Not sent to try again."}

/* ---------- screen ---------- */
var msgT=0;function say(t){var m=$("wmwMsg");if(!m)return;m.textContent=t;m.hidden=!t}
function css(){if($("wmwCss"))return;var s=mk("style");s.id="wmwCss";s.textContent=
 ".wmw-open{display:flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box;width:100%;min-height:48px;margin:8px 0;padding:0 14px;border-radius:12px;border:1px solid var(--accent,#22d3ee);background:transparent;color:var(--accent,#22d3ee);font:600 15px system-ui,sans-serif;cursor:pointer}"+
 ".wmw-open i{width:12px;height:12px;border-radius:50%;background:#ef4444;display:inline-block;flex:none}"+
 "#wmw{position:fixed;inset:0;z-index:2147483000;background:#0b0f14;color:#e5e7eb;overflow:auto;-webkit-overflow-scrolling:touch;font:15px/1.4 system-ui,sans-serif}"+
 "#wmw[hidden]{display:none}#wmw *{box-sizing:border-box}"+
 "#wmw .wmw-top{position:sticky;top:0;display:flex;align-items:center;gap:8px;padding:6px 10px;background:#0b0f14;border-bottom:1px solid #1f2937;z-index:1}"+
 "#wmw .wmw-top h2{margin:0;font:700 17px system-ui,sans-serif;text-transform:none;letter-spacing:normal;color:#f9fafb;flex:1;min-width:0}"+
 "#wmw .wmw-in{max-width:720px;margin:0 auto;padding:12px 14px 40px}"+
 "#wmw button,#wmw .wmw-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:0 14px;border-radius:10px;border:1px solid #374151;background:#111827;color:#e5e7eb;font:600 15px system-ui,sans-serif;cursor:pointer;text-align:center;max-width:100%}"+
 "#wmw button:disabled{opacity:.5;cursor:default}"+
 "#wmw .wmw-pri{width:100%;border-color:#22c55e;background:#052e1a;color:#bbf7d0;margin-top:10px}"+
 "#wmw label.wmw-l{display:flex;align-items:flex-end;min-height:44px;margin:0;padding:0 0 4px;font-weight:600;cursor:pointer}"+
 "#wmw input[type=text],#wmw textarea{display:block;width:100%;min-height:44px;padding:10px 12px;border-radius:10px;border:1px solid #374151;background:#030712;color:#f9fafb;font:16px system-ui,sans-serif}"+
 "#wmw textarea{min-height:88px;resize:vertical}"+
 "#wmw .wmw-how{display:grid;grid-template-columns:1fr;gap:8px;margin-top:12px}"+
 "@media (min-width:600px){#wmw .wmw-how{grid-template-columns:1fr 1fr}}"+
 "#wmw .wmw-how button{width:100%}"+
 "#wmw .wmw-tip,#wmw .wmw-hint{font-size:13px;color:#9ca3af;margin:6px 0}"+
 "#wmw .wmw-msg{margin:10px 0 0;padding:10px 12px;border-radius:10px;background:#111827;border:1px solid #374151}"+
 "#wmw .wmw-msg[hidden]{display:none}"+
 "#wmw video{display:block;width:100%;max-height:50vh;background:#000;border-radius:10px;margin-top:8px}"+
 "#wmw video[hidden]{display:none}"+
 "#wmw .wmw-rec{margin-top:12px;padding:12px;border:1px solid #ef4444;border-radius:12px}"+
 "#wmw .wmw-rec[hidden],#wmw .wmw-ready[hidden],#wmw [hidden]{display:none}"+
 "#wmw .wmw-time{font:700 20px ui-monospace,monospace;margin:6px 0}"+
 "#wmw .wmw-stop{width:100%;border-color:#ef4444;background:#450a0a;color:#fecaca}"+
 "#wmw .wmw-ready{margin-top:12px;padding:12px;border:1px solid #374151;border-radius:12px}"+
 "#wmw .wmw-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}"+
 "#wmw ul{list-style:none;margin:6px 0 0;padding:0}#wmw li{display:block;padding:10px 0;border-top:1px solid #1f2937;overflow-wrap:anywhere;background:none}#wmw li>div{display:block}#wmw li>.wmw-row{display:flex}"+
 "#wmw li .w{font-size:13px;color:#9ca3af}#wmw .st-sent{color:#86efac}#wmw .st-unsent{color:#fbbf24;border-color:#fbbf24}#wmw .st-slow{color:#93c5fd}"+
 "#wmw h3{margin:22px 0 4px;font-size:15px}";
 document.head.appendChild(s)}
function build(){
  var o=mk("button","wmw-open");o.type="button";o.id="wmwOpen";o.setAttribute("aria-label","Watch me work: record a job for the bots to learn");o.appendChild(mk("i"));o.appendChild(document.createTextNode("Watch me work"));
  o.addEventListener("click",open);
  var at=document.querySelector(MOUNT);if(at&&at.parentNode)at.parentNode.insertBefore(o,at.nextSibling);else document.body.appendChild(o);
  var w=mk("div");w.id="wmw";w.hidden=true;w.setAttribute("role","dialog");w.setAttribute("aria-modal","true");w.setAttribute("aria-labelledby","wmwH");
  w.innerHTML='<div class="wmw-top"><button type="button" id="wmwBack" aria-label="Back to Note">\u2039 Back</button><h2 id="wmwH">Watch me work</h2></div>'+
  '<div class="wmw-in"><p class="wmw-hint">Show the bots how you do a job. Record it, talk them through it, and they turn it into a skill. Don\u2019t film or say any key safe or lockbox codes, or client names or addresses.</p>'+
  '<label class="wmw-l" for="wmwTitle">Short title</label><input type="text" id="wmwTitle" maxlength="'+TITLE_MAX+'" autocomplete="off" placeholder="e.g. Setting up the rope access gear">'+
  '<label class="wmw-l" for="wmwAbout">What this job is</label><textarea id="wmwAbout" maxlength="'+ABOUT_MAX+'" placeholder="What the job is, and when the bots should use it"></textarea>'+
  '<div class="wmw-msg" id="wmwMsg" role="status" aria-live="polite" hidden></div>'+
  '<div class="wmw-how" id="wmwHow"><button type="button" id="wmwScreen">Record my screen</button><button type="button" id="wmwCam">Record with camera</button>'+
  '<button type="button" id="wmwCapBtn">Film with the camera app</button><button type="button" id="wmwPick">Pick a video</button><button type="button" id="wmwVoice">Add a voice description</button></div>'+
  '<p class="wmw-tip" id="wmwTipScreen">Chrome on this phone can\u2019t record the screen. Use Samsung\u2019s Screen recorder instead (swipe down from the top, tap Screen recorder, pick Media sounds and mic), then tap Pick a video.</p>'+
  '<input type="file" id="wmwFileCap" accept="video/*" capture="environment" hidden><input type="file" id="wmwFile" accept="video/*" hidden>'+
  '<div class="wmw-rec" id="wmwRec" hidden><div id="wmwRecLbl"></div><div class="wmw-time" id="wmwTime">0:00</div><video id="wmwPrev" muted playsinline hidden></video><button type="button" class="wmw-stop" id="wmwStop">Stop</button></div>'+
  '<div class="wmw-ready" id="wmwReady" hidden><div id="wmwReadyTxt"></div><video id="wmwPlay" controls playsinline hidden></video><div class="wmw-row"><button type="button" id="wmwView">Watch it</button><button type="button" id="wmwRedo">Start again</button></div></div>'+
  '<button type="button" class="wmw-pri" id="wmwSave" disabled>Save and send to the bots</button>'+
  '<p class="wmw-tip">The video is saved on this phone first. The bots get a note that it\u2019s waiting here; the video itself stays on the phone until it can be moved safely.</p>'+
  '<h3>On this phone</h3><ul id="wmwList"></ul></div>';
  document.body.appendChild(w);
  $("wmwBack").addEventListener("click",function(){close(false)});
  $("wmwScreen").addEventListener("click",startScreen);
  $("wmwCam").addEventListener("click",startCam);
  $("wmwCapBtn").addEventListener("click",function(){$("wmwFileCap").click()});
  $("wmwPick").addEventListener("click",function(){$("wmwFile").click()});
  $("wmwVoice").addEventListener("click",startVoice);
  $("wmwStop").addEventListener("click",stopRec);
  $("wmwSave").addEventListener("click",save);
  $("wmwRedo").addEventListener("click",function(){if(confirm("Start again? This recording will be thrown away.")){dropDraft().then(paintDraft);say("")}});
  $("wmwView").addEventListener("click",function(){if(!draft||!draft.blob)return;var p=$("wmwPlay");try{if(p.src)URL.revokeObjectURL(p.src)}catch(e){}p.src=URL.createObjectURL(draft.blob);p.hidden=false});
  $("wmwFile").addEventListener("change",function(e){fromFile(e.target.files&&e.target.files[0]);e.target.value=""});
  $("wmwFileCap").addEventListener("change",function(e){fromFile(e.target.files&&e.target.files[0]);if(draft)draft.kind="camera";e.target.value=""});
  ["wmwTitle","wmwAbout"].forEach(function(k){$(k).addEventListener("input",function(){var m=$("wmwMsg");if(m&&/^Note not saved/.test(m.textContent))say("")})});
  $("wmwScreen").hidden=!canScreen();$("wmwTipScreen").hidden=canScreen();
  $("wmwCam").hidden=!canCam();$("wmwCapBtn").hidden=canCam();$("wmwVoice").hidden=!canCam();
}
function paintDraft(){var r=$("wmwReady");if(!r)return;var has=!!(draft&&draft.blob);r.hidden=!has&&!(draft&&draft.voice);
  var t=[];if(has)t.push("Ready: "+(KIND[draft.kind]||"video")+", "+mins(draft.dur)+", "+mb(draft.size)+(draft.mic?", with your voice":", no voice"));
  if(draft&&draft.voice)t.push("Voice description: "+mins(draft.voiceDur));
  if(draft&&!has&&draft.voice)t.push("Now record or pick the video.");
  $("wmwReadyTxt").textContent=t.join(". ");$("wmwView").hidden=!has;$("wmwPlay").hidden=true;
  $("wmwSave").disabled=!has||saving||!!rec}
var LBL={saved:"Saved on this phone",sending:"Sending to the bots\u2026",sent:"Sent to the bots",unsent:"Not sent \u2014 tap to retry",slow:"Still sending, check back in a few minutes"};
function paintList(){var L=$("wmwList");if(!L)return;getAll().then(function(a){L.textContent="";a.sort(function(x,y){return y.ts-x.ts});
  if(!a.length){L.appendChild(mk("li","w","Nothing recorded on this phone yet."));return}
  a.slice(0,50).forEach(function(c){var li=mk("li");li.setAttribute("data-wmw",c.id);li.appendChild(mk("div",null,c.title));
    li.appendChild(mk("div","w",when(c.ts)+" \u00b7 "+(KIND[c.kind]||"video")+" \u00b7 "+mins(c.dur)+" \u00b7 "+mb(c.size)));
    var row=mk("div","wmw-row"),st=c.st;
    if(st==="slow"&&now()-(c.slowAt||0)>=HOLD_MS)st="unsent";
    if(st==="sending"&&!inflight[c.id])st="slow";
    var b=mk("button","st-"+st,LBL[st]||st);b.type="button";b.setAttribute("data-wmw-st",st);
    if(st==="unsent"&&(c.tries||0)>=MAX_TRIES)b.textContent="Not sent after "+c.tries+" tries \u2014 it\u2019s safe here, tap to try again";
    b.disabled=!(st==="unsent"||st==="saved");b.addEventListener("click",function(){send(c.id).then(function(s){say(stMsg(s))})});row.appendChild(b);
    var pl=mk("button",null,"Watch");pl.type="button";pl.addEventListener("click",function(){getMedia(c.id).then(function(m){if(!m||!m.video){say("This video isn't on this phone.");return}var v=li.querySelector("video")||li.appendChild(mk("video"));v.controls=true;v.setAttribute("playsinline","");v.src=URL.createObjectURL(m.video)})});row.appendChild(pl);
    li.appendChild(row);L.appendChild(li)})}).catch(function(){L.textContent="";L.appendChild(mk("li","w","This phone's storage isn't available in this browser mode."))})}
var isOpen=false,ours=false;
function open(){if(isOpen)return;isOpen=true;$("wmw").hidden=false;document.documentElement.style.overflow="hidden";
  try{history.pushState({wmw:1},"",location.href);ours=true}catch(e){ours=false}
  say("");loadDraft();paintDraft();paintList();
  /* a send that was cut off when the app closed is treated as "still sending" so it is never sent twice */
  getAll().then(function(a){a.forEach(function(c){if(c.st==="sending"&&!inflight[c.id]){c.st="slow";c.slowAt=c.lastTry||now();putMeta(c)}});paintList()}).catch(function(){});
  setTimeout(function(){try{$("wmwTitle").focus({preventScroll:true})}catch(e){}},50)}
function close(fromPop){if(!isOpen)return;
  if(rec){say("Still recording. Tap Stop first.");if(fromPop){try{history.pushState({wmw:1},"",location.href);ours=true}catch(e){}}return}
  if(!fromPop&&ours){ours=false;history.back();return}
  isOpen=false;ours=false;$("wmw").hidden=true;document.documentElement.style.overflow="";var o=$("wmwOpen");if(o)try{o.focus({preventScroll:true})}catch(e){}}
addEventListener("popstate",function(){if(isOpen){ours=false;close(true)}});
document.addEventListener("visibilitychange",function(){if(document.hidden&&rec&&rec.kind!=="screen"){stopRec()}});
function start(){css();build();paintDraft()}
window.WatchMe={hasCode:hasCode,codeMsg:codeMsg,normText:normText,rowText:rowText,open:open,close:close,send:send,save:save,list:getAll,last:null,API:API,SEND_MS:SEND_MS,HOLD_MS:HOLD_MS,
  state:function(){return {open:isOpen,recording:!!rec,draft:!!(draft&&draft.blob),voice:!!(draft&&draft.voice),saving:saving,inflight:Object.keys(inflight)}}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
