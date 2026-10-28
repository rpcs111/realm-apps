/* hub-shelves.js (29 Oct 2026): two shelves on the HUB home page.
   HISTORY: what the bots did, newest first, from the same public history.json the Deck uses
   (sort order and the code check come from js/history.js via window.DeckHistory; both files stay unchanged).
   10 rows, then "Show all". Refreshes when the Hub opens, when it comes back on screen, and every 60s (cache: no-store).
   Every row goes through guard() before it is drawn: a row holding a path, a hash-like string, a key prefix,
   an email, a street address, a code, a PR/job/invoice number, a version tag, a titled name or a banned word is not shown at all.
   FLOW MAP: one button. It stays disabled with a plain why-not line until FLOWMAP_READY is true. */
(function(){"use strict";
var FLOWMAP_READY=true;            /* flip to true in the PR that ships the passed Flow Map */
var FLOWMAP_URL="./map.html";
var FEED="history.json",EVERY_MS=60000,FIRST=10;
var WHY_FEED="History can't load right now; try again in a minute.";
var WHY_FLOW="Flow Map opens here once its fixes pass the check.";
var ROLE={"ELON":"Gate: checks the work","Builder":"Builder: builds and fixes","42*":"Lead: sets the order and merges","Money & Admin":"Money and admin"};
var FIELDS=["time","who","role","what","result","problem","workaround"];
var $=function(id){return document.getElementById(id)};
function mk(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}

/* ---- the guard ---- */
var MONTHS="jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december";
var NOT_STREET=new RegExp("^(?:"+MONTHS+"|mon|tue|wed|thu|fri|sat|sun|am|pm)$","i");
var RX={
 path:/(?:^|[\s("'`])(?:~|\.{1,2})?\/[\w.@-]+\/|[A-Za-z]:\\[\w]|\b[\w-]+\/[\w-]+\/[\w.-]+|\b[\w-]+\.(?:html?|js|mjs|json|md|py|sh|zip|png|jpe?g|svg|webmanifest|patch|diff|txt|csv|bak\w*)\b/i,
 hash:/\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,}\b|\b[0-9a-f]{12,}\b|\b[A-Za-z0-9_-]{32,}\b/i,
 key:/sk-|ghp_|gho_|github_pat_|xox[abp]-|AKfyc|AIza|\bBearer\s/i,
 email:/[\w.+-]+@[\w-]+\.[\w.]+/,
 /* any case: "12 Smith St", "12 smith st", "12 SMITH ST", "45 high street hawthorn", "Unit 4/12 Smith Street" */
 street:/\b\d{1,5}[a-z]?\s+(?:[a-z'-]+\s+){0,3}(?:St|Street|Rd|Road|Ave|Avenue|Ct|Crt|Court|Pde|Parade|Dr|Drive|Ln|Lane|Way|Pl|Place|Hwy|Highway|Blvd|Bvd|Boulevard|Cres|Crescent|Tce|Terrace|Gr|Grove|Cl|Close|Esp|Esplanade|Sq|Square)\b\.?/i,
 banned:/second[\s_-]*brain|2026\.10\.20|1300|\bloop|\bmarvin\b|\barra\b|\bnirvana|\beternity|\boasis\b|\belon[\s_-]*musk[\s_-]*2\.0|\bara[\s_-]*2\.0|\bSB1\b|\baccounts@|claude\.ai|\d\s*px\b/i,
 /* a titled name: Mr, Mrs, Ms, Miss or Dr (any case) then a capitalised name ("Visited Mrs Jones", "MR SMITH") */
 titled:/\b(?:[Mm][Rr][Ss]?|[Mm][Ss]|[Mm][Ii][Ss][Ss]|[Dd][Rr])\.?\s+[A-Z][A-Za-z'-]+/,
/* Mr, Mrs or Ms then any name in any case ("mr smith", "MRS jones", "ms. lee", "mr o'brien"); miss and dr stay capital-only above because real rows say "Own miss logged" */
titledAny:/\b(?:mrs?|ms)\.?\s+[a-z][a-z'-]+/i,
 /* a number after PR, pull, #, job, invoice, inv, work order or wo ("PR #53", "pull/58", "closed #54", "job 47", "invoice 12", "work order 9", "wo 77") */
 ref:/\b(?:prs?|pulls?(?:\s*requests?)?|jobs?|invoices?|invs?|work[\s_-]*orders?|wos?)[\s#:./\-]*(?:(?:no|num|number)\.?\s*)?\d|#\s*\d/i,
 /* a version tag: v followed by a digit ("v9 desk live", "V2", "v.3") */
 ver:/\bv\.?\d/i,
 longnum:/\d{3,}/
};
/* times ("12:52am", "10:58 to 11:10am") and dates ("28 Oct") are fine; take them out before the digit checks */
function stripTimes(s){return String(s).replace(/\b\d{1,2}:\d\d\s*(?:to\s*\d{1,2}:\d\d\s*)?(?:[ap]m)?/gi," ").replace(new RegExp("\\b\\d{1,2}\\s+(?:"+MONTHS+")\\b","gi")," ")}
/* a number then a place name ("93 Pelham", "93 PELHAM"). Capitalised or ALL-CAPS words only: an any-case rule would also hide
   plain counts like "36 asks" or "9 open". Lower-case addresses are caught by the street rule above (it needs St, Road ...). */
var NOT_PLACE=/^(?:PASS|PASSED|FAIL|FAILS|FAILED|GREEN|RED|AMBER|OK|DONE|LIVE|NEW|OPEN|TODO|HOLD|BLOCKED|ALL|AND|THE|FOR|NOT|ROWS|TESTS|CHECKS)$/;
function numberThenName(s){var re=/\b\d{1,5}[a-z]?\s+([A-Z][a-z']{2,}|[A-Z]{3,})\b/g,m;while((m=re.exec(s))){if(!NOT_STREET.test(m[1])&&!NOT_PLACE.test(m[1]))return true}return false}
/* codes: the Deck's own spoken-number check (3 or more digits in a row, "four seven two" too), plus any digit right after a code word.
   (The Desk's stricter "code word anywhere" rule is not used here: history rows talk about the code blocker itself.) */
var CODE_NEAR=/\b(?:code|codes|pin|keysafe|key\s*safe|lockbox|keybox|lockup|padlock|combo|combination|password|passcode|alarm)\b[^.\n\u2016]{0,20}\d/i;
function codeLike(s){var D=window.DeckHistory;return CODE_NEAR.test(s)||(D&&D.looksLikeCode?D.looksLikeCode(s):RX.longnum.test(s))}
/* r is a row straight from the feed; the role the Hub adds itself is not checked, only a role the feed sends */
function guard(r){
 var all=FIELDS.map(function(k){return r[k]==null?"":String(r[k])}).join(" \u2016 ");
 if(RX.path.test(all)||RX.hash.test(all)||RX.key.test(all)||RX.email.test(all)||RX.street.test(all)||RX.banned.test(all)||RX.ref.test(all)||RX.ver.test(all)||RX.titled.test(all)||RX.titledAny.test(all))return false;
 var bare=stripTimes(all);
 if(numberThenName(bare)||RX.longnum.test(bare)||codeLike(bare))return false;
 return true}

/* ---- order ---- */
function tkey(t){var D=window.DeckHistory;if(D&&D.tkey)return D.tkey(t);return -1}

/* ---- history shelf ---- */
var ROWS=[],HIDDEN=0,SHOWALL=false,LOADS=0,TIMER=null,BUSY=false;
function clean(r){var o={};FIELDS.forEach(function(k){o[k]=r[k]==null?"":String(r[k]).trim()});if(!o.role)o.role=ROLE[o.who]||"Bot";return o}
function draw(){var list=$("hhList"),more=$("hhMore"),cnt=$("hhCount");if(!list)return;list.textContent="";
 var show=SHOWALL?ROWS:ROWS.slice(0,FIRST);
 show.forEach(function(r){var li=mk("li","hh-row");
  var top=mk("div","hh-top");top.appendChild(mk("span","hh-who",r.who||"A bot"));top.appendChild(mk("span","hh-role",r.role));top.appendChild(mk("span","hh-time",r.time||"time not logged"));li.appendChild(top);
  li.appendChild(mk("div","hh-what",r.what));
  if(r.result){var d=mk("div","hh-res");d.appendChild(mk("b",null,"Delivered: "));d.appendChild(document.createTextNode(r.result));li.appendChild(d)}
  list.appendChild(li)});
 cnt.textContent=ROWS.length?("Newest first. Showing "+show.length+" of "+ROWS.length+". Times are Melbourne."+(HIDDEN?" "+HIDDEN+(HIDDEN===1?" row is":" rows are")+" not shown because they held private details.":"")):"";
 if(ROWS.length>FIRST){more.hidden=false;more.textContent=SHOWALL?"Show fewer":"Show all ("+ROWS.length+")";more.setAttribute("aria-expanded",SHOWALL?"true":"false")}else more.hidden=true}
function fail(){var w=$("hhWhy");if(w){w.hidden=false;w.textContent=WHY_FEED}if(!ROWS.length){$("hhCount").textContent="";$("hhMore").hidden=true}}
function load(){if(BUSY)return Promise.resolve();BUSY=true;LOADS++;
 return fetch(FEED,{cache:"no-store",credentials:"omit"}).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()})
 .then(function(j){var rows=Array.isArray(j)?j:(j&&j.rows);if(!Array.isArray(rows))throw new Error("no rows");
  var ok=[],hid=0;rows.forEach(function(r,i){if(!r||typeof r!=="object"||!r.what)return;if(!guard(r)){hid++;return}var c=clean(r);c._i=i;ok.push(c)});
  ok.sort(function(a,b){return (tkey(b.time)-tkey(a.time))||(a._i-b._i)});
  ROWS=ok;HIDDEN=hid;$("hhWhy").hidden=true;draw()})
 .catch(fail).then(function(){BUSY=false;var s=$("hhShelf");if(s)s.setAttribute("data-loads",String(LOADS))})}
function startHistory(){var more=$("hhMore");if(!more)return;
 more.addEventListener("click",function(){SHOWALL=!SHOWALL;draw();if(!SHOWALL){var s=$("hhShelf");if(s&&s.scrollIntoView&&s.getBoundingClientRect().top<0)s.scrollIntoView()}});
 load();TIMER=setInterval(load,EVERY_MS);
 document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")load()})}

/* ---- flow map shelf ---- */
function startFlow(){var box=$("fmSlot"),why=$("fmWhy");if(!box)return;box.textContent="";
 if(FLOWMAP_READY){var sa=(typeof HUB_SA!=="undefined"&&HUB_SA);var a=mk("a","shelf-btn","Open Flow Map");a.href=FLOWMAP_URL;a.target=sa?"_blank":"_self";a.rel="noopener";box.appendChild(a);why.hidden=true}
 else{var b=mk("button","shelf-btn","Open Flow Map");b.type="button";b.disabled=true;b.setAttribute("aria-describedby","fmWhy");box.appendChild(b);why.hidden=false;why.textContent=WHY_FLOW}}

/* ---- keep shelf text out from under the floating TELL ARA button ----
   On phones and the Fold the button floats bottom-right over the page. Measured from the real button: each shelf gets
   right padding so its text ends at least GAP px left of the button (button width plus a gap). Nothing changes where the
   button sits inline in the header or is absent. Re-measured on resize, when the button appears and when its count changes. */
var GAP=8,FITQ=0;
function fitTell(){FITQ=0;var b=$("arbBtn"),sh=[$("hhShelf"),$("fmShelf")];
 sh.forEach(function(x){if(x)x.style.paddingRight=""});
 if(!b||getComputedStyle(b).position!=="fixed")return;var br=b.getBoundingClientRect();if(!br.width)return;
 sh.forEach(function(x){if(!x)return;var sr=x.getBoundingClientRect(),pad=parseFloat(getComputedStyle(x).paddingRight)||0;
  var need=Math.ceil(sr.right-(br.left-GAP));if(br.left<sr.right&&need>pad)x.style.paddingRight=need+"px"})}
function fitSoon(){if(!FITQ)FITQ=setTimeout(fitTell,60)}
function watchTell(){fitTell();addEventListener("resize",fitSoon);addEventListener("orientationchange",fitSoon);
 if(!window.MutationObserver)return;var seen=null;
 new MutationObserver(function(){var b=$("arbBtn");if(b&&b!==seen){seen=b;new MutationObserver(fitSoon).observe(b,{attributes:true,childList:true,subtree:true,characterData:true})}fitSoon()}).observe(document.body,{childList:true})}
function start(){startHistory();startFlow();watchTell()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
window.HubShelves={guard:guard,fitTell:fitTell,load:load,rows:function(){return ROWS},hidden:function(){return HIDDEN},FLOWMAP_READY:FLOWMAP_READY,EVERY_MS:EVERY_MS};
})();
