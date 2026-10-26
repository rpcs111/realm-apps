/* letusdo.js: "Let us do this" button (27 Oct 2026, spec: Drive doc "Let us do this button — spec").
   Tap it on a note, a to-do or a history line and the ask goes to Ara's capture inbox
   (same Ara Engine path as capture.html) as one row: action + where + context.
   A bot routine picks the row up. Anything that would go to a customer comes back as a DRAFT for Ange's OK.
   Status lives on this device (localStorage "lud_asks"): not sent yet -> queued -> doing -> done / needs you.
   Only "queued" is proven here (the inbox answered 2xx). Doing / done / needs you show once the
   Ara Engine hands statuses back; until then the page says so instead of guessing.
   Nothing is posted on load or when the phone reconnects. An unsent ask posts again only when
   the person taps "Not sent — tap to retry".
   Usage: <script src="js/letusdo.js" data-where="Note" data-targets="#notes li, #puBody li, #tasks li" data-list="#ludList"></script> */
(function(){"use strict";
var S=document.currentScript||{},D=(S.dataset||{});
var WHERE=D.where||document.title||"app",TARGETS=D.targets||"",LIST=D.list||"";
var API="https://script.google.com/macros/s/AKfycbxzrPy359CBlkbrYuR0-5xJB4GLXIQ6xNDIE6EFEb2xvnoY0n5sodcnljN4Ohqf4nWa/exec"; /* Ara Engine capture (public, same as capture.html) */
var LS="lud_asks";
function ls(){try{var a=JSON.parse(localStorage.getItem(LS)||"[]");return Array.isArray(a)?a:[]}catch(e){return[]}}
function save(a){try{localStorage.setItem(LS,JSON.stringify(a.slice(-200)))}catch(e){}}
function mk(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
var LABEL={sending:"Sending to the bots\u2026",unsent:"Not sent \u2014 tap to retry",queued:"Queued",doing:"Bots are on it",done:"Done",needs:"Needs you"};
function css(){if(document.getElementById("ludCss"))return;var s=mk("style");s.id="ludCss";
 s.textContent="#notes>li,#puBody li,section[data-k=tasks] .gcol li,#dev ul.ev>li{flex-wrap:wrap}"+
 "#notes>li>.b,#pickup #puBody li>.t,section[data-k=tasks] .gcol li>.b,section[data-k=tasks] .gcol li>.t,#dev ul.ev>li>.x{flex:1 1 60%;min-width:60%;max-width:100%}"+
 "#notes>li .t,#pickup #puBody li .t,section[data-k=tasks] .gcol li .t,#dev ul.ev>li .x{min-width:0;overflow-wrap:break-word;word-break:normal}"+
 ".lud-btn{flex:1 0 100%;box-sizing:border-box;width:100%;max-width:100%;min-height:44px;min-width:44px;padding:0 12px;margin:6px 0 0;border-radius:10px;border:1px solid #22c55e;background:#052e1a;color:#bbf7d0;font:600 14px system-ui,sans-serif;cursor:pointer}"+
 ".lud-st{flex:1 0 100%;box-sizing:border-box;display:flex;align-items:center;width:100%;max-width:100%;min-height:44px;margin:4px 0 0;padding:0 2px;border:0;background:transparent;text-align:left;font:12px system-ui,sans-serif;color:#a7f3d0;cursor:default}.lud-st.unsent{color:#fbbf24;cursor:pointer}.lud-st.needs{color:#f87171}"+
 ".lud-list li{list-style:none;padding:8px 0;border-top:1px solid #1f2937}.lud-list .w{font-size:12px;opacity:.75}";
 document.head.appendChild(s)}
function clean(el){if(!el)return"";var c=el.cloneNode(true);c.querySelectorAll("button,.lud-st,.tm,.k,.m,img").forEach(function(x){x.remove()});c.querySelectorAll("b,span,div").forEach(function(x){x.append(" ")});return c.textContent.replace(/\s+/g," ").trim()}
function textOf(li){var t=li.querySelector(".t")||li.querySelector(".x")||li,n=li.querySelector(".n,.pv");
 return {title:clean(t).slice(0,200),context:clean(n).slice(0,400)}}
function post(ask){
 var text="[LET US DO THIS · "+ask.where+"] "+ask.title+(ask.context?" — context: "+ask.context:"")+(ask.how?" — ask: "+ask.how:"")+" — rule: customer-facing = draft for Ange's OK";
 return fetch(API,{method:"POST",mode:"cors",redirect:"follow",credentials:"omit",headers:{"Content-Type":"text/plain;charset=utf-8"},
  body:JSON.stringify({app:"capture",items:[{id:ask.id,text:text,category:"Ara",ts:new Date(ask.ts).toISOString()}]})})
 .then(function(r){if(!r||!r.ok)throw new Error("HTTP "+((r&&r.status)||0));return r.json()})
 .then(function(j){if(!j||j.ok===false)throw new Error((j&&j.error)||"not ok");
  var hit=(j.saved||[]).concat(j.dupes||[]);if(hit.length&&hit.indexOf(ask.id)<0)throw new Error("inbox did not confirm");return true})}
function rows(){return TARGETS?document.querySelectorAll(TARGETS):[]}
function setState(id,st){var a=ls(),ask=null;a.forEach(function(x){if(x.id===id){x.st=st;x.at=Date.now();ask=x}});save(a);paint();
 if(!ask)return;
 rows().forEach(function(li){if(li.getAttribute("data-lud-id")===id||textOf(li).title===ask.title)mark(li,ask)})}
function go(li,btn){var o=textOf(li);if(!o.title)return;
 var how=window.prompt("Let us do this:\n\""+o.title+"\"\n\nAnything we should know? (optional)\nAnything for a customer comes back to you as a draft first.","");
 if(how===null)return;
 var ask={id:"lud_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,6),ts:Date.now(),where:WHERE,title:o.title,context:o.context,how:how.trim(),st:"sending"};
 var a=ls();a.push(ask);save(a);mark(li,ask);btn.disabled=true;
 post(ask).then(function(){setState(ask.id,"queued")},function(){setState(ask.id,"unsent")}).then(function(){btn.disabled=false})}
function resend(id){var ask=ls().filter(function(x){return x.id===id})[0];if(!ask||ask.st!=="unsent")return;
 setState(id,"sending");post(ask).then(function(){setState(id,"queued")},function(){setState(id,"unsent")})}
function mark(li,ask){li.setAttribute("data-lud-id",ask.id);var s=li.querySelector(".lud-st");
 if(!s){s=mk("button","lud-st");s.type="button";li.appendChild(s)}
 s.className="lud-st "+ask.st;s.textContent=LABEL[ask.st]||ask.st;s.disabled=ask.st==="sending";
 s.onclick=function(e){e.stopPropagation();if(ask.st==="unsent")resend(ask.id)}}
function add(root){if(!TARGETS)return;var asks=ls();
 root.querySelectorAll(TARGETS).forEach(function(li){if(li.dataset.lud||/\bempty\b/.test(li.className))return;li.dataset.lud="1";
  var b=mk("button","lud-btn","Let us do this");b.type="button";b.setAttribute("aria-label","Let us do this: send to the bots");
  b.onclick=function(e){e.stopPropagation();go(li,b)};li.appendChild(b);
  var o=textOf(li),hit=asks.filter(function(x){return x.title===o.title&&x.where===WHERE}).pop();if(hit)mark(li,hit)})}
function paint(){if(!LIST)return;var L=document.querySelector(LIST);if(!L)return;L.textContent="";var a=ls().slice().reverse();
 if(!a.length){L.appendChild(mk("div","muted","Nothing sent with Let us do this from this device yet."));return}
 var ul=mk("ul","lud-list");a.slice(0,30).forEach(function(x){var li=mk("li");li.appendChild(mk("div",null,x.title));
  li.appendChild(mk("div","w",x.where+" · "+new Date(x.ts).toLocaleString("en-AU",{timeZone:"Australia/Melbourne",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})+" · "+(LABEL[x.st]||x.st)));ul.appendChild(li)});
 L.appendChild(ul);L.appendChild(mk("div","muted","Queued means Ara's inbox wrote it down. Doing, done and needs-you show here once the bots send status back (not switched on yet)."))}
function start(){css();add(document);paint();
 if(TARGETS&&window.MutationObserver)new MutationObserver(function(){add(document)}).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
window.LetUsDo={asks:ls};
})();
