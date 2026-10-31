/* history.js: HISTORY panel for Deck (29 Oct 2026, LOCAL COPY ONLY, not live).
   Shows the Realm Bot History Log: time (Melbourne), who, what was done, result, problem, workaround.
   Newest first. Search and a bot filter. A table from 600px wide, cards below that.
   Every row has an amend button (pencil) and a 600ms hold; both open one note sheet.
   Notes go through the same "Let us do this" path as letusdo.js (Ara Engine capture inbox, where "Deck · History")
   and are blocked when they look like a code (same check as the Flow mock, plus the Desk box words), and when they
   hold a PR or commit reference, a hash, a link, an email or a file name (js/refcheck.js, loaded before this file).
   DATA: READ_URL is empty until a no-key read for the sheet exists (needs info@, see APPEND.md).
   Until then rows come from history.json on this site (a copy of the sheet, plain words only).
   Rows hold columns A to F plus the id only. The source column stays in the private sheet.
   29 Oct: every row also gets Agree / Disagree (js/verdict.js, mounted through window.DeckVerdict). Disagree opens
   the same note box (window.DeckHistory.note) so Ange can say why.
   Usage: <div id="hist"></div><script src="js/history.js" data-mount="#hist" data-read=""></script> */
(function(){"use strict";
var S=document.currentScript||{},D=(S.dataset||{});
var MOUNT=D.mount||"#hist",READ_URL=D.read||"",LOCAL=D.local||"history.json";
var API="https://script.google.com/macros/s/AKfycbxzrPy359CBlkbrYuR0-5xJB4GLXIQ6xNDIE6EFEb2xvnoY0n5sodcnljN4Ohqf4nWa/exec"; /* Ara Engine capture, same as letusdo.js */
var LS="lud_asks",WHERE="Deck · History",HOLD_MS=600;
var COLS=[["time","Time (Melbourne)"],["who","Who"],["what","What was done"],["result","Result"],["problem","Problem"],["workaround","Workaround"]];
var $=function(s,r){return (r||document).querySelector(s)};
function mk(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}

/* ---- the code check, copied unchanged from the Flow mock (ELON GREEN round 4) ---- */
/* ---- ONE code check, used for every note, voice answer and drop name ----
   1. Normalise: NFKC (full-width digits become 0-9), lower case.
   2. Spoken numbers become digits ("forty seven" 47, "double seven" 77, "triple four" 444,
      a lone "o"/"oh" between digits 0, Roman IV VII I IX when written as numerals).
   3. Anything that isn't a letter, plus the words and/then/dash/comma/etc., counts as a gap.
   4. Any 3 or more digits in a row once the gaps are taken out is treated as a code. */
const ONES={zero:0,oh:0,nought:0,nil:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9};
const TEENS={ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19};
const TENS={twenty:2,thirty:3,forty:4,fifty:5,sixty:6,seventy:7,eighty:8,ninety:9};
const ROMAN={ii:2,iii:3,iv:4,vi:6,vii:7,viii:8,ix:9},ROMAN1={i:1,v:5};
const REP={double:2,triple:3,treble:3};
const GAPW=new Set(['and','n','then','dash','hyphen','comma','space','dot','point','slash','stroke','plus','colon','semicolon','star','hash','bracket','hundred','thousand','oh','o']);
/* round 4: after NFKC, every Unicode decimal digit (Arabic-Indic ٤, Persian ۴, Devanagari ४ and the rest) becomes 0-9.
   Unicode keeps each script's digits as a run of ten (0 to 9), so the value is the distance from the start of the run. */
function asciiDigits(s){return s.replace(/\p{Nd}/gu,c=>{if(c>='0'&&c<='9')return c;const z=c.codePointAt(0);let b=z;while(b>0&&z-b<60&&/\p{Nd}/u.test(String.fromCodePoint(b-1)))b--;return String((z-b)%10)})}
function normText(s){return asciiDigits(String(s==null?'':s).normalize('NFKC')).toLowerCase().replace(/[’‘`]/g,"'")}
/* tokens: {d:'47'} digits, {w:'word'}, {s:' , '} gap characters */
function numTokens(s){
 const raw=normText(s).match(/[a-z']+|\d+|[^a-z'\d]+/g)||[];
 const T=raw.map(x=>/^\d+$/.test(x)?{d:x}:/^[a-z']+$/.test(x)?{w:x}:{s:x});
 const nb=(i,dir)=>{for(let j=i+dir;j>=0&&j<T.length;j+=dir)if(!T[j].s)return j;return -1};
 const romanNear=i=>[nb(i,-1),nb(i,1)].some(j=>j>=0&&T[j].w in ROMAN);
 /* pass 1: words that are numbers on their own */
 for(let i=0;i<T.length;i++){const t=T[i];if(!t.w)continue;const w=t.w;
  if(w in TENS){const j=nb(i,1);if(j===i+1||(j===i+2&&/^[\s-]+$/.test(T[i+1].s))){if(T[j].w in ONES&&ONES[T[j].w]>0&&T[j].w!=='oh'){T[i]={d:String(TENS[w])+ONES[T[j].w]};for(let k=i+1;k<=j;k++)T[k]={s:''};continue}}T[i]={d:TENS[w]+'0'}}
  else if(w in TEENS)T[i]={d:String(TEENS[w])};
  else if(w in ONES&&w!=='oh')T[i]={d:String(ONES[w])};
  else if(w in ROMAN)T[i]={d:String(ROMAN[w]),r:1};}
 for(let i=0;i<T.length;i++)if(T[i].w in ROMAN1&&[nb(i,-1),nb(i,1)].some(j=>j>=0&&T[j].r))T[i]={d:String(ROMAN1[T[i].w]),r:1};
 /* pass 2: double/triple X, and a lone o/oh between digits */
 for(let i=0;i<T.length;i++){const t=T[i];if(!t.w)continue;
  if(t.w in REP){const j=nb(i,1);if(j>=0&&T[j].d&&T[j].d.length===1){T[j]={d:T[j].d.repeat(REP[t.w])};T[i]={s:''}}}
  else if(t.w==='o'||t.w==='oh'){const a=nb(i,-1),b=nb(i,1);if((a>=0&&T[a].d)&&(b>=0&&T[b].d))T[i]={d:'0'};else if(t.w==='oh'&&b>=0&&T[b].d)T[i]={d:'0'}}}
 return T}
function wordsToDigits(s){return numTokens(s).map(t=>t.d!==undefined?t.d:t.w!==undefined?t.w:t.s).join('')}
function looksLikeCode(s){if(!s)return false;let run=0;
 for(const t of numTokens(s)){if(t.d!==undefined){run+=t.d.length;if(run>=3)return true}else if(t.w!==undefined&&!GAPW.has(t.w))run=0}
 return false}
const CODE_MSG='No codes, please. Say "key safe: yes" and leave the number out.';
/* round 4: when there's no code word, say why plainly */
const CODE_WORD=/\b(key|keys|keysafe|safe|lockbox|lock|padlock|code|codes|pin|combo|combination|password|passcode|alarm|gate|door)\b/;
const NUM_MSG='No codes, please. 3 or more digits in a row look like a code, so this can\'t be saved. Write "half ten" or "levels 2 to 4" instead.';
function codeMsg(s){return CODE_WORD.test(normText(s))?CODE_MSG:NUM_MSG}
/* Desk round 3 and 4 rule: with a code word in the note (box, keybox, lockup added), 3 or more digits ANYWHERE block it. */
var CODE_WORD2=/\b(key|keys|keysafe|safe|lockbox|lock|lockup|box|boxes|keybox|keyboxes|keypad|padlock|code|codes|pin|combo|combination|password|passcode|alarm|gate|door)\b/;
function digitCount(s){var n=0;numTokens(s).forEach(function(t){if(t.d!==undefined)n+=t.d.length});return n}
function blocked(s){var t=normText(s);return looksLikeCode(s)||(CODE_WORD2.test(t)&&digitCount(s)>=3)}
function blockMsg(s){return CODE_WORD2.test(normText(s))?CODE_MSG:NUM_MSG}

/* ---- time order: "Wed 28 Oct, 9:35pm" (Melbourne). "time unknown" sorts last. ---- */
var MON={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
function tkey(t){t=String(t||"").toLowerCase();var d=t.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/),h=t.match(/(\d{1,2}):(\d\d)\s*(?:to\s*\d{1,2}:\d\d\s*)?([ap]m)/);
 if(!d)return -1;var k=MON[d[2]]*44640+(+d[1])*1440;if(h){k+=((+h[1])%12+(h[3]==="pm"?12:0))*60+(+h[2])}return k}

function ls(){try{var a=JSON.parse(localStorage.getItem(LS)||"[]");return Array.isArray(a)?a:[]}catch(e){return[]}}
function lsSave(a){try{localStorage.setItem(LS,JSON.stringify(a.slice(-200)))}catch(e){}}
/* The row id never goes on screen and never into checked text (an id like builder-29oct-v3 has 3 digits, so the code
   check would drop the note). It rides in its own field, ask.ref, which only ever holds a plain id, and goes in the sent text. */
function safeRef(id){id=String(id==null?"":id);return /^[a-z0-9][a-z0-9-]{0,39}$/i.test(id)?id:""}
/* "Thu 29 Oct, 1:58am" from the row's Melbourne time; "" if the row has no clear time */
function rowWhen(t){var m=String(t||"").match(/\b(mon|tue|wed|thu|fri|sat|sun)\w*,?\s+(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*,?\s+(\d{1,2}:\d\d)\s*([ap]m)/i);
 if(!m)return "";var cap=function(w){w=w.slice(0,3).toLowerCase();return w[0].toUpperCase()+w.slice(1)};
 return cap(m[1])+" "+(+m[2])+" "+cap(m[3])+", "+m[4]+m[5].toLowerCase()}
function rowShown(r){var w=rowWhen(r.time);return "this row by "+r.who+(w?" ("+w+")":"")}
function post(ask){ /* same body and checks as letusdo.js post() */
 var text="[LET US DO THIS · "+ask.where+"] "+ask.title+(ask.context?" — context: "+ask.context:"")+(ask.how?" — ask: "+ask.how:"")+(safeRef(ask.ref)?" — row: "+ask.ref:"")+" — rule: customer-facing = draft for Ange's OK";
 var ctl=window.AbortController?new AbortController():null,tm=setTimeout(function(){if(ctl)ctl.abort()},30000);
 return fetch(API,{method:"POST",mode:"cors",redirect:"follow",credentials:"omit",signal:ctl?ctl.signal:undefined,headers:{"Content-Type":"text/plain;charset=utf-8"},
  body:JSON.stringify({app:"capture",items:[{id:ask.id,text:text,category:"Ara",ts:new Date(ask.ts).toISOString()}]})})
 .then(function(r){if(!r||!r.ok)throw new Error("HTTP "+((r&&r.status)||0));return r.json()})
 .then(function(j){if(!j||j.ok===false)throw new Error((j&&j.error)||"not ok");
  var hit=(j.saved||[]).concat(j.dupes||[]);if(hit.length&&hit.indexOf(ask.id)<0)throw new Error("inbox did not confirm");return true})
 .then(function(v){clearTimeout(tm);return v},function(e){clearTimeout(tm);throw e})}

function css(){if($("#histCss"))return;var s=mk("style");s.id="histCss";s.textContent=
 "#hist .hbar{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px}"+
 "#hist input[type=search],#hist select{box-sizing:border-box;min-height:44px;border-radius:10px;border:1px solid #404040;background:#000;color:#fff;font:15px system-ui,sans-serif;padding:0 10px}"+
 "#hist input[type=search]{flex:1 1 180px;min-width:0}#hist select{flex:0 1 170px;min-width:44px}"+
 "#hist .hcount{font-size:12px;color:#8a8a8a;margin:0 0 6px}"+
 "#hist table{width:100%;border-collapse:collapse;table-layout:fixed}#hist th{font-size:11px;letter-spacing:.06em;color:#a3a3a3;text-align:left;font-weight:700;padding:6px 6px;border-bottom:1px solid #262626}"+
 "#hist td{vertical-align:top;padding:8px 6px;border-top:1px solid #171717;font-size:13.5px;overflow-wrap:anywhere;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}"+
 "#hist td.c-time{color:#8a8a8a;font-size:12px}#hist td.c-who{color:var(--accent);font-weight:600}"+
 "#hist .rs-fail{color:#fca5a5}#hist .rs-green{color:#86efac}#hist .rs-miss{color:#fcd34d}"+
 "#hist col.c-time{width:13%}#hist col.c-who{width:11%}#hist col.c-what{width:24%}#hist col.c-result{width:14%}#hist col.c-problem{width:18%}#hist col.c-workaround{width:14%}#hist col.c-dv{width:112px}#hist col.c-am{width:56px}"+
 "#hist .h-am{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;border:1px solid var(--accent);border-radius:10px;color:var(--accent);font-size:18px;cursor:pointer}"+
 "#hist tr.holding td{background:#06222a}"+
 "@media (max-width:599.98px){#hist table,#hist tbody,#hist tr,#hist td{display:block;width:auto}#hist thead,#hist colgroup{display:none}"+
 "#hist tr{border:1px solid #262626;border-radius:12px;background:#0a0a0a;margin:0 0 8px;padding:6px 10px 10px;position:relative}"+
 "#hist td{border:0;padding:3px 0}#hist td::before{content:attr(data-l);display:block;font-size:10.5px;letter-spacing:.06em;color:#737373;text-transform:uppercase}"+
 "#hist td.c-time::before,#hist td.c-who::before,#hist td.c-am::before,#hist td.c-dv::before{display:none}#hist td.c-dv{padding-top:6px}#hist td.c-time{padding-right:56px}#hist td.c-am{position:absolute;top:6px;right:8px;padding:0}}"+
 ".hsheet-bg{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2147483550;display:flex;align-items:flex-end;justify-content:center}"+
 ".hsheet{max-height:100%;overflow:auto;box-sizing:border-box;width:100%;max-width:560px;background:#0a0a0a;border:1px solid #333;border-radius:16px 16px 0 0;padding:14px 14px calc(14px + env(safe-area-inset-bottom));color:#e5e5e5;font:15px system-ui,sans-serif}"+
 ".hsheet h3{margin:0 0 6px;font-size:14px;color:#fff}.hsheet .m{font-size:12.5px;color:#a3a3a3;margin:0 0 8px}"+
 ".hsheet textarea{box-sizing:border-box;width:100%;min-height:96px;border-radius:10px;border:1px solid #404040;background:#000;color:#fff;font:15px system-ui,sans-serif;padding:10px}"+
 ".hsheet .err{color:#fca5a5;font-size:13px;margin:6px 0 0;min-height:1em}.hsheet .ok{color:#86efac}"+
 ".hsheet .row{display:flex;gap:8px;margin-top:10px;position:sticky;bottom:0;background:#0a0a0a;padding:6px 0 0}.hsheet button{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;flex:1;min-height:44px;min-width:44px;border-radius:10px;border:1px solid var(--accent);font-weight:600;font-size:14px;cursor:pointer;color:#fff}"+
 ".hsheet button.go{background:#052e1a;border-color:#22c55e;color:#bbf7d0}.hsheet button[disabled]{opacity:.5;cursor:default}";
 document.head.appendChild(s)}

var ALL=[],ROOT=null,SRCNOTE="";
function rsClass(r){r=String(r).toUpperCase();return /FAIL [1-9]|^FAIL/.test(r)&&!/^GREEN/.test(r)?"rs-fail":/GREEN|PASS|CONFIRMED|DONE/.test(r)?"rs-green":/MISS/.test(r)?"rs-miss":""}
function render(){var q=normText($(".h-q",ROOT).value).trim(),who=$(".h-who",ROOT).value;
 var rows=ALL.filter(function(r){if(who&&r.who!==who)return false;if(!q)return true;
  return COLS.some(function(c){return normText(r[c[0]]).indexOf(q)>=0})});
 var tb=$("tbody",ROOT);tb.textContent="";
 rows.forEach(function(r){var tr=mk("tr");tr.setAttribute("data-id",r.id);
  COLS.forEach(function(c){var td=mk("td","c-"+c[0],r[c[0]]||"");td.setAttribute("data-l",c[1]);if(c[0]==="result"){var k=rsClass(r.result);if(k)td.classList.add(k)}tr.appendChild(td)});
  if(window.DeckVerdict){var tv=mk("td","c-dv");tv.setAttribute("data-l","Agree?");DeckVerdict.mount(tv,"hist_"+r.id,"history row "+r.id+" ("+r.who+")",rowShown(r));tr.appendChild(tv)}
  var ta=mk("td","c-am"),b=mk("button","h-am","\u270e");b.type="button";b.setAttribute("aria-label","Amend this row");
  b.addEventListener("click",function(e){e.stopPropagation();openSheet(r)});ta.appendChild(b);tr.appendChild(ta);
  hold(tr,r);tb.appendChild(tr)});
 $(".hcount",ROOT).textContent=rows.length===ALL.length?ALL.length+" rows, newest first. "+SRCNOTE:"Showing "+rows.length+" of "+ALL.length+". "+SRCNOTE;
 if(!rows.length){var tr=mk("tr"),td=mk("td","muted","Nothing matches.");td.colSpan=window.DeckVerdict?8:7;tr.appendChild(td);tb.appendChild(tr)}}

/* 600ms hold opens the sheet. Moving more than 10px or lifting early cancels. The click that ends a hold is swallowed. */
function hold(tr,r){var t=null,x=0,y=0,fired=0,swallow=0;
 function clear(){if(t){clearTimeout(t);t=null}tr.classList.remove("holding")}
 tr.addEventListener("pointerdown",function(e){swallow=0;if(e.button>0||(e.target.closest&&e.target.closest("button")))return;x=e.clientX;y=e.clientY;fired=0;swallow=0;tr.classList.add("holding");
  t=setTimeout(function(){t=null;fired=Date.now();swallow=1;tr.classList.remove("holding");openSheet(r)},HOLD_MS)});
 tr.addEventListener("pointermove",function(e){if(t&&(Math.abs(e.clientX-x)>10||Math.abs(e.clientY-y)>10))clear()});
 ["pointerup","pointercancel","pointerleave"].forEach(function(ev){tr.addEventListener(ev,clear)});
 tr.addEventListener("contextmenu",function(e){if(t||Date.now()-fired<1500)e.preventDefault()});
 /* 1 Nov: swallow only the one click that ends a hold (was: every tap for 0.8s, which read as a dead tap) */
 tr.addEventListener("click",function(e){if(swallow){swallow=0;if(Date.now()-fired<1500){e.preventDefault();e.stopPropagation()}}},true)}

var SHEET=null;
/* 1 Nov r2 (ELON gate): Back closes the box (one history entry while it is open); Escape or a tap outside
   closes it only when it is empty; words typed are kept as a draft for that row whenever the box closes unsent. */
var NEXT_KEY="",DRAFTS={},SHEET_PUSHED=false,SHEET_POPIGNORE=0,SHEET_KEY="",SHEET_TA=null,VV_OFF=null;
function keepDraft(){if(SHEET_TA&&SHEET_KEY){var v=SHEET_TA.value;if(v.trim())DRAFTS[SHEET_KEY]=v;else delete DRAFTS[SHEET_KEY]}}
function closeSheet(fromPop,drop){if(!SHEET)return;if(drop){if(SHEET_KEY)delete DRAFTS[SHEET_KEY]}else keepDraft();
 SHEET.remove();SHEET=null;SHEET_TA=null;SHEET_KEY="";document.removeEventListener("keydown",escClose,true);if(VV_OFF){VV_OFF();VV_OFF=null}
 if(SHEET_PUSHED){SHEET_PUSHED=false;if(fromPop!==true){SHEET_POPIGNORE++;try{history.back()}catch(e){SHEET_POPIGNORE--}}}}
function sheetEmpty(){return !SHEET_TA||!SHEET_TA.value.trim()}
function softClose(){if(sheetEmpty()){closeSheet()}else{var er=SHEET&&SHEET.querySelector(".err");if(er){er.className="err";er.textContent="Your note is still here. Tap Send, or Cancel to drop it."}if(SHEET_TA)SHEET_TA.focus()}}
function escClose(e){if(e.key==="Escape"||e.key==="Esc"){e.preventDefault();softClose()}}
addEventListener("popstate",function(){if(SHEET_POPIGNORE>0){SHEET_POPIGNORE--;return}if(SHEET&&SHEET_PUSHED){SHEET_PUSHED=false;closeSheet(true)}});
/* keep Cancel and Send above the phone keyboard: size the dimmed area to the visible part of the screen */
function pinToViewport(bg){var vv=window.visualViewport;if(!vv)return null;
 function fit(){var v=window.visualViewport||vv;bg.style.top=Math.max(0,v.offsetTop||0)+"px";bg.style.height=v.height+"px";bg.style.bottom="auto"}
 fit();vv.addEventListener("resize",fit);vv.addEventListener("scroll",fit);
 return function(){vv.removeEventListener("resize",fit);vv.removeEventListener("scroll",fit)}}
/* a plain line at the foot of the screen, for a note box that closed without sending */
function toast(msg){var old=document.getElementById("hToast");if(old)old.remove();var t=mk("div",null,msg);t.id="hToast";t.setAttribute("role","status");
 t.style.cssText="position:fixed;left:12px;right:12px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:2147483551;max-width:560px;margin:0 auto;box-sizing:border-box;padding:12px 14px;border-radius:12px;background:#2a0f0f;border:1px solid #7f1d1d;color:#fecaca;font:14px/1.4 system-ui,sans-serif";
 document.body.appendChild(t);setTimeout(function(){if(t.parentNode)t.remove()},6000)}
/* One note box for Amend and for "why I disagree". o: heading, lead, aria, check(note) -> message or "",
   send(note) -> promise, okMsg, failMsg, kept() -> true when a failed note is safe on this phone.
   1 Nov: Cancel, Escape or a tap outside closes it. A failed send closes it with a plain line when the note is kept
   on this phone; when it could not be kept the box stays open so nothing typed is lost. */
function noteBox(o){closeSheet();var bg=mk("div","hsheet-bg"),sh=mk("div","hsheet");sh.setAttribute("role","dialog");sh.setAttribute("aria-modal","true");sh.setAttribute("aria-label",o.heading);
 sh.appendChild(mk("h3",null,o.heading));
 sh.appendChild(mk("p","m",o.lead));
 var ta=mk("textarea");ta.setAttribute("aria-label",o.aria||"Note");ta.maxLength=600;sh.appendChild(ta);
 var key=String(o.key||NEXT_KEY||((o.heading||"note")+"|"+(o.lead||"")));NEXT_KEY="";if(DRAFTS[key])ta.value=DRAFTS[key];
 var er=mk("div","err");er.setAttribute("aria-live","polite");sh.appendChild(er);
 var row=mk("div","row"),cancel=mk("button",null,"Cancel"),send=mk("button","go","Send to the bots");cancel.type=send.type="button";
 row.appendChild(cancel);row.appendChild(send);sh.appendChild(row);bg.appendChild(sh);
 /* a tap outside closes it, but never the lift that ends the hold that opened it (ELON Flow mock round 1):
    the tap must start and end on the dimmed area, and not in the first 0.5s */
 var t0=Date.now(),downBg=false;
 bg.addEventListener("pointerdown",function(e){downBg=e.target===bg});
 bg.addEventListener("click",function(e){if(e.target===bg){if(downBg&&Date.now()-t0>500)softClose();else ta.focus()}downBg=false});
 document.addEventListener("keydown",escClose,true);
 cancel.addEventListener("click",function(){closeSheet(false,true)});
 send.addEventListener("click",function(){var note=ta.value.trim();er.className="err";
  if(!note){er.textContent="Write a note first.";return}
  /* codes, links, emails, file names (js/refcheck.js, shared with the Disagree box): refused, nothing stored or sent.
     If the shared check did not load, nothing is sent either. */
  var RC=window.RefCheck;if(!RC){er.textContent="This note can't be checked right now, so it isn't sent.";return}
  if(RC.blocked(note)){er.textContent=RC.MSG;return}
  var why=o.check?o.check(note):(blocked(note)?blockMsg(note):"");if(why){er.textContent=why;return}
  send.disabled=true;ta.disabled=true;er.textContent="Sending to the bots\u2026";
  o.send(note).then(function(){er.className="err ok";er.textContent=o.okMsg||"Queued. The bots' inbox wrote it down.";send.textContent="Sent";
    setTimeout(function(){closeSheet(false,true)},1400)},
   function(){var fm=typeof o.failMsg==="function"?o.failMsg():o.failMsg;
    fm=fm||"Not sent. It is kept on this phone; tap Send again to retry.";
    var kept=typeof o.kept==="function"?!!o.kept():true;
    if(kept){closeSheet(false,true);toast(fm)}else{er.textContent=fm;send.disabled=false;ta.disabled=false}})});
 document.body.appendChild(bg);SHEET=bg;SHEET_TA=ta;SHEET_KEY=key;VV_OFF=pinToViewport(bg);
 try{history.pushState({deckNote:1},"");SHEET_PUSHED=true}catch(e){}
 setTimeout(function(){ta.focus()},50);return bg}
function openSheet(r){var ask=null;
 /* "kept on this phone" only when the note really is in storage */
 var stored=function(){return !!ask&&ls().some(function(x){return x.id===ask.id})};
 NEXT_KEY="amend:"+(r.id||r._i); /* the draft for this row */
 return noteBox({heading:"Amend this row",aria:"Amend note",
  lead:"Row by "+r.who+". Say what is wrong or missing. It goes to the bots' inbox with Let us do this. No codes, keys or client details.",
  failMsg:function(){return stored()?"Not sent yet. Your note is kept on this phone and goes with Let us do this when it can.":"Not sent, and this phone couldn't keep it. Copy your note and try again."},
  kept:stored,
  send:function(note){
   if(!ask||ask.how!==note){ask={id:"lud_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,6),ts:Date.now(),where:WHERE,title:"Amend history row by "+r.who,ref:safeRef(r.id),context:"",how:note,st:"sending"};
    var a=ls();a.push(ask);lsSave(a)}
   function setSt(st){var a=ls();a.forEach(function(x){if(x.id===ask.id){x.st=st;x.at=Date.now()}});lsSave(a);ask.st=st}
   return post(ask).then(function(){setSt("queued")},function(e){setSt("unsent");throw e})}})}

function build(){ROOT=$(MOUNT);if(!ROOT)return;css();ROOT.textContent="";
 var bar=mk("div","hbar"),q=mk("input","h-q"),sel=mk("select","h-who");q.type="search";q.placeholder="Search the history";q.setAttribute("aria-label","Search the history");
 sel.setAttribute("aria-label","Filter by bot");bar.appendChild(q);bar.appendChild(sel);ROOT.appendChild(bar);ROOT.appendChild(mk("div","hcount","Loading\u2026"));
 var tbl=mk("table"),cg=mk("colgroup"),th=mk("thead"),hr=mk("tr");
 COLS.concat(window.DeckVerdict?[["dv","Agree?"],["am","Amend"]]:[["am","Amend"]]).forEach(function(c){cg.appendChild(mk("col","c-"+c[0]));var h=mk("th",null,c[1]);h.scope="col";hr.appendChild(h)});
 th.appendChild(hr);tbl.appendChild(cg);tbl.appendChild(th);tbl.appendChild(mk("tbody"));ROOT.appendChild(tbl);
 q.addEventListener("input",render);sel.addEventListener("change",render)}
function fill(rows,note){ALL=(rows||[]).filter(function(r){return r&&r.what}).map(function(r,i){r._i=i;return r});
 ALL.sort(function(a,b){var d=tkey(b.time)-tkey(a.time);return d||a._i-b._i});SRCNOTE=note;
 var sel=$(".h-who",ROOT),bots=[];ALL.forEach(function(r){if(bots.indexOf(r.who)<0)bots.push(r.who)});bots.sort();
 sel.textContent="";sel.appendChild(new Option("All bots",""));bots.forEach(function(b){sel.appendChild(new Option(b,b))});render()}
function get(u){return fetch(u,{cache:"no-store",credentials:"omit"}).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).then(function(j){var rows=Array.isArray(j)?j:j.rows;if(!Array.isArray(rows))throw new Error("no rows");return rows})}
function load(){var local=function(why){return get(LOCAL).then(function(rows){fill(rows,why)},function(){fill([],"");$(".hcount",ROOT).textContent="The history could not be loaded on this device."})};
 if(READ_URL)return get(READ_URL).then(function(rows){fill(rows,"Live from the log sheet.")},function(){return local("The log sheet could not be reached, so this is the copy kept with the app.")});
 return local("This is the copy kept with the app (28 and 29 Oct). The live log sheet is not linked yet.")}
function start(){build();if(ROOT)load()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
window.DeckHistory={note:noteBox,blocked:blocked,normText:normText,looksLikeCode:looksLikeCode,tkey:tkey,rows:function(){return ALL}};
})();
