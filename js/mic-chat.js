/* Talk to the bots (28 Oct 2026, local test build). One cyan mic in the header (cyan line SM7B podcast mic, 29 Oct) opens a full-screen talk-or-type screen.
   Talk (the browser's own speech-to-text, Australian English) or type into the chat box, then Send.
   Where it goes: the same path as js/ara-button.js. Saved on THIS device first (localStorage 'mic_chat_outbox'),
   then sent to the Ara Engine capture inbox (append-only, no key, so no key in this repo), text tagged "[LIVE CHAT]".
   The bots read it from there. Replies are not pulled back into this page yet (there is no reply feed without a key).
   The chat history is kept on this device only (localStorage 'mic_chat_log_v1', last 100 lines). Nothing is emailed.
   Every message goes through the code and reference check below before it is saved, and again before every resend.
   A refused message shows 'No codes, links, emails or file names, please.' and is never saved, queued or sent.
   A page opts in with one script tag. It mounts in "header" (or data-mount), or floats bottom-left if there is no header. */
(function () {
  'use strict';
  if (window.MicChat || window.top !== window) return;
  var API = 'https://script.google.com/macros/s/AKfycbxzrPy359CBlkbrYuR0-5xJB4GLXIQ6xNDIE6EFEb2xvnoY0n5sodcnljN4Ohqf4nWa/exec';
  var OUT = 'mic_chat_outbox', LOG = 'mic_chat_log_v1', TAG = '[LIVE CHAT]';
  var S = document.currentScript;
  var appName = (document.querySelector('meta[name="application-name"]') || {}).content || document.title || 'Realm';
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;

  /* ---------- Code and reference check (r5). Runs in send() before anything is saved or queued, and in flush()
     before every resend. Two parts, both copied, not new rules:
     A. the code check from gh-pages js/watchme.js (the same blocker js/letusdo.js copies byte-for-byte), verbatim:
        key safe / lockbox codes, 3+ typed digits, digit runs, and spelled-out codes like "four seven one nine";
     B. the Deck reference check (js/refcheck.js, ELON's verdict rules), verbatim: emails and @; PR, # or pull/ plus a
        number; hex hashes of 7+; links; file paths and file names.
     Each copy sits in its own wrapper so its names cannot clash with this file's. ---------- */
  var WMCHK = (function () {
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
return { hasCode: hasCode };
  })();
  var REFCHK = (function () {
/* REFCHK-BEGIN: verbatim copy of js/refcheck.js, from its 'var MSG' line up to its 'window.RefCheck' line. Swap as one piece with tools/swap_refcheck.py; do not edit by hand. */
var MSG="No codes, links, emails or file names, please.";
var TLD="com|net|org|io|au|app|dev|co|me|gov|edu|info|biz|xyz|ly|gl|page|site|uk|nz|ai|so|sh|gg|tv|us|ca|google|cloud|link|online|store|tech|github";
var EXT="js|mjs|cjs|ts|html?|css|json|md|txt|py|csv|tsv|pdf|png|jpe?g|gif|webp|svg|gs|sh|xlsx?|docx?|pptx?|zip|webmanifest|ya?ml|log|patch|diff|key|pem|env|ini|cfg|sql|xml|rtf|odt|ods|heic|mov|mp4|mp3|wav|m4a";
var PAIRS={"and/or":1,"either/or":1,"he/she":1,"she/he":1,"him/her":1,"his/her":1,"her/his":1,"yes/no":1,"on/off":1,"in/out":1,"n/a":1,"s/he":1,"km/h":1,"w/e":1,"w/o":1,"a/c":1,"c/o":1};
var RULES=[
 ["email",/@|\b[\w.+-]+\s+at\s+[\w-]+\s+dot\s+(?:com|au|net|org)\b/i],
 ["pr ref",/#\s*\d|\bpr\s*#?\s*\d|\bpull\s*\/\s*\d|\bpull\s+request\s*#?\s*\d|\bpulls?\/|\bcommit\s+[0-9a-f]{4,}\b/i],
 ["hash",/(?:^|[^0-9a-z])(?:(?=[0-9a-f]*\d)[0-9a-f]{7,}|[a-f]{8,})(?![0-9a-z])/i],
 ["link",new RegExp("https?:|\\bwww\\.|\\b[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:"+TLD+")\\b","i")],
 ["file",new RegExp("~\\/|(?:^|\\s)\\/[a-z0-9_.~-]|[a-z0-9_]\\\\[a-z0-9_]|\\b[\\w-]+\\.(?:"+EXT+")\\b","i")]
];
function norm(s){s=String(s==null?"":s);try{s=s.normalize("NFKC")}catch(e){}
 return s.replace(/[\u200b-\u200d\u2060\ufeff]/g,"").replace(/[\uff20\ufe6b]/g,"@").replace(/\u2215|\u2044|\uff0f/g,"/")}
function slashHit(s){var re=/[a-z0-9_.~-]+\/[a-z0-9_.~/-]*/ig,m;
 while((m=re.exec(s))){var w=m[0].toLowerCase().replace(/[.]+$/,"");if(!PAIRS[w])return w}return ""}
/* why(s): "" when the note is fine, else the rule name that refused it */
function why(s){s=norm(s);if(!s.trim())return "";
 for(var i=0;i<RULES.length;i++)if(RULES[i][1].test(s))return RULES[i][0];
 return slashHit(s)?"file":""}
/* REFCHK-END */
return { MSG: MSG, why: why };
  })();
  var NO_MSG = 'No codes, links, emails or file names, please.';
  function blocked(s) { s = String(s == null ? '' : s); return WMCHK.hasCode(s) || !!REFCHK.why(s); }
  /* What flush() checks before a row is sent (r7). Only the one known label '[LIVE CHAT] [app \u00b7 device] ' is taken off;
     everything else in the text that is actually sent is checked. If the row has a msg (the typed words), that is checked too.
     The label's own inside ('app \u00b7 device') is checked on its own, the same way send() checks d and an.
     The row is dropped if ANY of these fails. */
  var LABEL = /^\[LIVE CHAT\] \[([^\]]*)\] /;
  function rowBad(x) {
    if (!x || typeof x.text !== 'string') return true;
    var m = LABEL.exec(x.text);
    if (blocked(x.text.replace(LABEL, ''))) return true;
    if (m && blocked(m[1])) return true;
    if (typeof x.msg === 'string' && blocked(x.msg)) return true;
    return false;
  }
  /* chat history on this phone: drop any of my lines that fail the check (bot lines are kept) */
  function cleanLog() { var l = get(LOG), k = l.filter(function (m) { return m && (m.who === 'bot' || !blocked(m.text)); }); if (k.length !== l.length) { put(LOG, k); return true; } return false; }
  /* ---------- end of code and reference check ---------- */

  function get(k) { try { var a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function put(k, a, max) { try { localStorage.setItem(k, JSON.stringify(max ? a.slice(-max) : a)); return true; } catch (e) { return false; } }
  function dev() { try { return localStorage.getItem('realm_device') || ''; } catch (e) { return ''; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hhmm(iso) { try { return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } }

  var MIC = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3.5"/></svg>';

  /* Header button art: the cyan line SM7B podcast mic icon, inlined, background square dropped so the
     button's own black disc shows, stroke thickened so it reads at button size. currentColor keeps the button's cyan.
     To swap the drawing, replace this one string. Keep the viewBox square and wide enough for the strokes:
     drawn extents plus half the stroke width (here x 140-372, y 86-420) must sit inside it, or the art is clipped. */
  var SM7B = '<svg viewBox="76 73 360 360" width="26" height="26" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"><rect x="186" y="96" width="140" height="210" rx="62"/><path d="M206 150h100M200 190h112" opacity=".5"/><path d="M176 250h-26v50h26M336 250h26v50h-26"/><path d="M256 306v66M200 410h112M256 372l-24 38M256 372l24 38"/></svg>';

  var css = ''
    + '#micChatBtn{all:unset;box-sizing:border-box;flex:0 0 44px;width:44px;height:44px;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;border:1px solid #22d3ee;background:#000;color:#22d3ee;cursor:pointer;-webkit-tap-highlight-color:transparent;margin-left:6px}'
    + '#micChatBtn:hover,#micChatBtn:focus-visible{background:#06202a;box-shadow:0 0 12px rgba(34,211,238,.55);outline:none}'
    + '#micChatBtn.fx{position:fixed;left:calc(12px + env(safe-area-inset-left));bottom:calc(14px + env(safe-area-inset-bottom));z-index:2147482500;width:52px;height:52px;flex-basis:52px;margin:0;box-shadow:0 4px 18px rgba(0,0,0,.6)}'
    + '#micChat{position:fixed;inset:0;z-index:2147483200;background:#000;color:#e5e5e5;display:flex;flex-direction:column;font:16px/1.4 system-ui,-apple-system,Roboto,sans-serif;color-scheme:dark}'
    + '#micChat[hidden]{display:none!important}'
    + '#micChat .mc-top{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top)) 12px 8px;border-bottom:1px solid #1f2937}'
    + '#micChat .mc-top b{flex:1 1 auto;min-width:0;font-size:16px;letter-spacing:.06em;color:#22d3ee}'
    + '#micChat .mc-top small{display:block;color:#a3a3a3;font:400 12px/1.3 system-ui,sans-serif;letter-spacing:0}'
    + '#micChat button{box-sizing:border-box;min-height:44px;min-width:44px;border-radius:12px;border:1px solid #334155;background:#0a0a0a;color:#e5e5e5;font:700 15px/1 system-ui,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}'
    + '#micChat button:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}'
    + '#micChat .mc-log{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px;display:flex;flex-direction:column;gap:8px;max-width:760px;width:100%;margin:0 auto;box-sizing:border-box}'
    + '#micChat .mc-empty{color:#a3a3a3;font-size:14px;margin:auto 0;text-align:center}'
    + '#micChat .mc-msg{align-self:flex-end;max-width:85%;background:#06202a;border:1px solid #22d3ee;border-radius:14px 14px 4px 14px;padding:8px 12px;white-space:pre-wrap;overflow-wrap:anywhere}'
    + '#micChat .mc-msg i{display:block;font-style:normal;color:#a3a3a3;font-size:12px;margin-top:4px}'
    + '#micChat .mc-bot{align-self:flex-start;background:#0a0a0a;border-color:#334155;border-radius:14px 14px 14px 4px}'
    + '#micChat .mc-foot{flex:0 0 auto;border-top:1px solid #1f2937;padding:10px 12px calc(10px + env(safe-area-inset-bottom));max-width:760px;width:100%;margin:0 auto;box-sizing:border-box}'
    + '#micChat textarea{display:block;width:100%;box-sizing:border-box;min-height:72px;max-height:34vh;margin:0 0 8px;border-radius:12px;border:1px solid #334155;background:#0a0a0a;color:#fff;font:16px/1.4 system-ui,sans-serif;padding:10px;resize:vertical}'
    + '#micChat textarea:focus{border-color:#22d3ee;outline:none}'
    + '#micChat .mc-row{display:flex;gap:8px}'
    + '#micChat #mcTalk{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:0 16px;border-color:#22d3ee;color:#22d3ee;min-height:52px}'
    + '#micChat #mcTalk.on{background:#22d3ee;color:#000;box-shadow:0 0 16px rgba(34,211,238,.6)}'
    + '#micChat #mcSend{flex:1 1 auto;min-height:52px;background:#22d3ee;border-color:#22d3ee;color:#000}'
    + '#micChat #mcSend[disabled]{opacity:.45;cursor:default}'
    + '#micChat .mc-status{min-height:1.3em;margin-top:6px;color:#cbd5e1;font-size:13px}';

  var btn, ov, logEl, ta, sendB, talkB, stat, rec = null, listening = false, base = '', sending = false, timer = null, fails = 0, lastFocus = null;

  function say(t) { if (stat) stat.textContent = t; }
  function render() {
    if (!logEl) return;
    var log = get(LOG), wait = {};
    get(OUT).forEach(function (x) { wait[x.id] = 1; });
    if (!log.length) { logEl.innerHTML = '<p class="mc-empty">Tap Talk and say it, or type it. Saved for Ara. Ara passes it to 42*.</p>'; return; }
    logEl.innerHTML = log.map(function (m) {
      var st = wait[m.id] ? 'On this phone, sending\u2026' : 'Sent';
      return '<div class="mc-msg' + (m.who === 'bot' ? ' mc-bot' : '') + '">' + esc(m.text) + '<i>' + esc(hhmm(m.ts)) + (m.who === 'bot' ? '' : ' \u00b7 ' + st) + '</i></div>';
    }).join('');
    logEl.scrollTop = logEl.scrollHeight;
  }
  function later(ms) { clearTimeout(timer); timer = setTimeout(flush, ms); }
  function flush() {
    clearTimeout(timer);
    var q = get(OUT), bad = {}, nb = 0;
    /* drop any queued row that fails the check: it is purged from this phone (outbox and chat log) and never sent */
    q.forEach(function (x) { if (rowBad(x)) { bad[x && x.id] = 1; nb++; } });
    if (nb) { q = q.filter(function (x) { return !bad[x && x.id]; }); put(OUT, q); put(LOG, get(LOG).filter(function (m) { return !bad[m && m.id]; })); say(NO_MSG); }
    /* also clean the chat history, then redraw the overlay from the cleaned log */
    if (cleanLog() || nb) render();
    if (!q.length || sending) return Promise.resolve();
    if (navigator.onLine === false) { say('Saved on this phone. It sends when you are back online.'); return Promise.resolve(); }
    sending = true;
    var items = q.slice(0, 50).filter(function (x) { return !rowBad(x); }).map(function (x) { return { id: x.id, text: x.text, category: 'Ara', ts: x.ts }; });
    if (!items.length) { sending = false; return Promise.resolve(); }
    return fetch(API, { method: 'POST', body: JSON.stringify({ app: 'capture', items: items }) })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error('not saved');
        var done = {}; (j.saved || []).concat(j.dupes || []).forEach(function (id) { done[id] = 1; });
        put(OUT, get(OUT).filter(function (x) { return !done[x.id]; })); fails = 0;
        say('\u2713 Saved for Ara');
      })
      .catch(function () { fails++; say('Saved on this phone. It keeps trying by itself.'); later(Math.min(300000, 10000 * Math.pow(2, Math.min(fails - 1, 5)))); })
      .then(function () { sending = false; render(); });
  }
  function send() {
    var v = (ta.value || '').trim(); if (!v) return;
    stopTalk();
    /* the check runs first: a refused message is not saved, logged, queued or sent, and stays in the box to edit */
    if (blocked(v)) { say(NO_MSG); try { ta.focus(); } catch (e) {} return; }
    var id = 'mic_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), ts = new Date().toISOString(), d = dev(), an = appName;
    /* the device and app labels are checked on their own (a ?d= link can set any name); a failing label is left out */
    if (blocked(d)) d = ''; if (blocked(an)) an = 'Realm';
    var row = { id: id, msg: v.slice(0, 1800), text: (TAG + ' [' + an + (d ? ' \u00b7 ' + d : '') + '] ' + v).slice(0, 2000), ts: ts };
    var q = get(OUT); q.push(row);
    var log = get(LOG); log.push({ id: id, who: 'me', text: v.slice(0, 2000), ts: ts });
    if (!put(OUT, q) || !put(LOG, log, 100)) { say('This phone is out of space, so it was not saved.'); return; }
    ta.value = ''; base = ''; sync(); render(); say('Sending\u2026'); try { ta.focus(); } catch (e) {} flush();
  }
  function sync() { if (sendB) sendB.disabled = !(ta.value || '').trim(); }
  function setTalk(on) { listening = on; if (!talkB) return; talkB.classList.toggle('on', on); talkB.setAttribute('aria-pressed', on ? 'true' : 'false'); talkB.querySelector('span').textContent = on ? 'Stop' : 'Talk'; }
  function stopTalk() { if (rec && listening) { try { rec.stop(); } catch (e) {} } setTalk(false); }
  function startTalk() {
    if (!SR) { say('Talk is not on this browser. Use the keyboard mic instead.'); try { ta.focus(); } catch (e) {} return; }
    if (!rec) {
      rec = new SR(); rec.lang = 'en-AU'; rec.continuous = true; rec.interimResults = true;
      /* Rebuild from every result in this listening session each time, so finished words are never doubled or lost. */
      rec.onresult = function (e) {
        var said = [];
        for (var i = 0; i < e.results.length; i++) { var t = (e.results[i][0].transcript || '').trim(); if (t) said.push(t); }
        var heard = said.join(' ');
        ta.value = base + (base && heard ? ' ' : '') + heard; sync();
      };
      rec.onerror = function (e) { setTalk(false); say(e && (e.error === 'not-allowed' || e.error === 'service-not-allowed') ? 'The mic is blocked. Allow it for this app, or type instead.' : 'The mic stopped. Tap Talk to go again.'); };
      rec.onend = function () { if (listening) setTalk(false); };
    }
    base = (ta.value || '').trim();
    try { rec.start(); setTalk(true); say('Listening\u2026 tap Stop when you are done.'); } catch (e) { setTalk(false); say('The mic did not start. Tap Talk again.'); }
  }
  function open() {
    lastFocus = document.activeElement; ov.hidden = false; render(); sync();
    try { document.documentElement.style.overflow = 'hidden'; } catch (e) {}
    var n = get(OUT).length; say(n ? n + (n === 1 ? ' message' : ' messages') + ' still sending.' : '');
    if (/[?&]talk=1\b/.test(location.search)) startTalk(); else setTimeout(function () { try { ta.focus(); } catch (e) {} }, 50);
    flush();
  }
  function close() { stopTalk(); ov.hidden = true; try { document.documentElement.style.overflow = ''; } catch (e) {} try { if (lastFocus && lastFocus.focus) lastFocus.focus(); else btn.focus(); } catch (e) {} }
  function init() {
    if (document.getElementById('micChatBtn')) return;
    var st = document.createElement('style'); st.id = 'micChatCss'; st.textContent = css; document.head.appendChild(st);
    btn = document.createElement('button'); btn.type = 'button'; btn.id = 'micChatBtn';
    btn.setAttribute('aria-label', 'Talk to the bots'); btn.title = 'Talk to the bots'; btn.setAttribute('aria-haspopup', 'dialog');
    btn.innerHTML = SM7B;
    var sel = (S && S.getAttribute('data-mount')) || 'header', host = document.querySelector(sel);
    if (host) host.appendChild(btn); else { btn.className = 'fx'; document.body.appendChild(btn); }
    ov = document.createElement('div'); ov.id = 'micChat'; ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'mcTitle');
    ov.innerHTML = '<div class="mc-top"><b id="mcTitle">TALK TO THE BOTS<small>Saved for Ara. Ara passes it to 42*. Nothing is emailed.</small></b><button type="button" id="mcClose" aria-label="Close">Close</button></div>'
      + '<div class="mc-log" id="mcLog" aria-live="polite"></div>'
      + '<div class="mc-foot"><textarea id="mcText" placeholder="Say it or type it\u2026" aria-label="Message for the bots" enterkeyhint="send"></textarea>'
      + '<div class="mc-row"><button type="button" id="mcTalk" aria-pressed="false">' + MIC + '<span>Talk</span></button><button type="button" id="mcSend" disabled>Send</button></div>'
      + '<div class="mc-status" id="mcStatus" role="status" aria-live="polite"></div></div>';
    document.body.appendChild(ov);
    logEl = ov.querySelector('#mcLog'); ta = ov.querySelector('#mcText'); sendB = ov.querySelector('#mcSend'); talkB = ov.querySelector('#mcTalk'); stat = ov.querySelector('#mcStatus');
    if (!SR) talkB.title = 'Talk is not on this browser. Use the keyboard mic.';
    btn.addEventListener('click', open);
    ov.querySelector('#mcClose').addEventListener('click', close);
    talkB.addEventListener('click', function () { if (listening) stopTalk(); else startTalk(); });
    sendB.addEventListener('click', send);
    ta.addEventListener('input', function () { if (!listening) base = ta.value; sync(); });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia && matchMedia('(pointer:fine)').matches) { e.preventDefault(); send(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov && !ov.hidden) { e.preventDefault(); close(); } });
    ov.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = ov.querySelectorAll('button:not([disabled]),textarea'); if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
    addEventListener('online', function () { flush(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') flush(); else stopTalk(); });
    cleanLog();
    if (/[?&](talk|chat)=1\b/.test(location.search)) open(); else if (get(OUT).length) later(1500);
  }
  window.MicChat = { open: function () { if (ov) open(); }, close: function () { if (ov) close(); }, flush: flush, blocked: blocked };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
