/* Realm reconnect (js/reconnect.js)
   Keeps the bot line alive when you jump in and out of the app.
   Connection lifecycle only: no keys, no backend URLs, no backend changes.
   API (all optional, safe to call before or without a line):
     RealmLine.line({name, ping:function(){return Promise}, onUp:function(){}})  declare a backend line (shows the pill)
     RealmLine.ok() / RealmLine.fail(err,hard)  report a real call's result (hard = backend answered with an error page)
     RealmLine.park(retryFn, err)           true = parked; retryFn runs again when the line is back
     RealmLine.isNet(err)                   true for network-type errors (offline, aborted, failed to fetch)
     RealmLine.whenBack()                   Promise that resolves when the line is back
     RealmLine.onBack(fn)                   run fn every time you come back to the page
     RealmLine.mic(key, resumeFn) / micLive(key) / micEnd(key) / micStop(key)
     RealmLine.drafts(['fieldId',...])      save these fields on leave, restore them on return
     RealmLine.fetch(url,opts)              fetch that waits for the line instead of failing on a drop
     RealmLine.pingExec(execUrl)            Promise: true = line answers JSON, 'warn' = it answered with an error / key needed
*/
(function(){
'use strict';
if(window.RealmLine)return;
var page=(location.pathname.split('/').pop()||'index.html').replace(/\.html$/,'')||'index';
var DK='realm_drafts_'+page;
var L={name:'',ping:null,onUp:null,has:false};
var state='idle',tries=0,timer=null,checking=false,hiddenAt=0;
var parked=[],waiters=[],backFns=[],mics={},draftIds=[],pill=null,pillTxt=null,MAXTRY=6;
function now(){return Date.now()}
function lsGet(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
function lsSet(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function log(m){try{(window.__realmLineLog=window.__realmLineLog||[]).push([new Date().toISOString().slice(11,19),m]);if(window.__realmLineLog.length>200)window.__realmLineLog.shift()}catch(e){}}

/* ---------- status pill ---------- */
var TXT={ok:'Connected',warn:'Answering \u00b7 key needed',retry:'Reconnecting\u2026',off:'Offline \u00b7 will reconnect',down:'Not answering \u00b7 tap to retry',tap:'Tap to resume \uD83C\uDFA4'};
var COL={ok:'#16a34a',warn:'#f59e0b',retry:'#d97706',off:'#64748b',down:'#dc2626',tap:'#2563eb'};
function ensurePill(){
 if(pill||!document.body)return;
 var css=document.createElement('style');
 css.textContent='#rlPill{position:fixed;left:10px;top:calc(8px + env(safe-area-inset-top));z-index:9500;display:none;align-items:center;gap:6px;padding:4px 10px 4px 8px;border-radius:999px;border:0;background:rgba(15,23,42,.88);color:#fff;font:600 11px/1.3 system-ui,-apple-system,sans-serif;letter-spacing:.02em;box-shadow:0 1px 6px rgba(0,0,0,.35);cursor:pointer;max-width:70vw}#rlPill i{width:8px;height:8px;border-radius:50%;display:inline-block;flex:none}#rlPill.retry i{animation:rlp 1s infinite}@keyframes rlp{50%{opacity:.3}}#rlPill.ok{opacity:.8}';
 document.head.appendChild(css);
 pill=document.createElement('button');pill.type='button';pill.id='rlPill';pill.setAttribute('aria-live','polite');
 pill.innerHTML='<i></i><span></span>';pillTxt=pill.querySelector('span');
 pill.onclick=function(){if(state==='tap'){tapResume();return}tries=0;check('tap')};
 var mt=document.querySelector('[data-rl-pill]');
 if(mt){pill.style.position='static';pill.style.maxWidth='none';pill.style.marginRight='auto';pill.style.flex='none';mt.insertBefore(pill,mt.firstChild)}else document.body.appendChild(pill);
}
var okHide=null;
function show(s){
 state=s;ensurePill();if(!pill)return;
 var micWait=s==='tap';
 if(!L.has&&!micWait){pill.style.display='none';return}
 pill.className=s;pill.querySelector('i').style.background=COL[s]||'#64748b';pillTxt.textContent=TXT[s]||s;pill.title=(L.name?L.name+': ':'')+(TXT[s]||s);
 pill.style.display='inline-flex';
 clearTimeout(okHide);
 if(s==='ok'&&!L.has){pill.style.display='none'}
}
function setState(s){if(s!==state)log('state '+state+' -> '+s);show(s)}

/* ---------- line checking with backoff (1s,2s,4s ... 30s) ---------- */
function delay(){return Math.min(30000,1000*Math.pow(2,Math.max(0,tries-1)))}
function schedule(){clearTimeout(timer);if(document.hidden)return;if(!navigator.onLine){setState('off');return}
 if(tries>=MAXTRY){setState('down');return}
 var d=delay();log('retry in '+d+'ms');timer=setTimeout(function(){check('backoff')},d)}
function up(st){var was=state;tries=0;clearTimeout(timer);setState(Object.keys(pending).length?'tap':(st||'ok'));
 var p=parked.splice(0);if(p.length)log('replaying '+p.length+' parked call(s)');p.forEach(function(f){try{f()}catch(e){}});
 var w=waiters.splice(0);w.forEach(function(f){try{f()}catch(e){}});
 if(was!=='ok'&&was!=='idle'&&L.onUp){try{L.onUp()}catch(e){}}}
function down(err){tries++;log('down: '+(err&&err.message||err));setState(navigator.onLine?'retry':'off');schedule()}
function check(why){
 if(document.hidden)return;
 if(!navigator.onLine){setState('off');return}
 if(!L.has||!L.ping){up();return}
 if(checking)return;checking=true;setState('retry');log('ping ('+why+')');
 var p;try{p=Promise.resolve(L.ping())}catch(e){p=Promise.reject(e)}
 var guard=new Promise(function(_,rej){setTimeout(function(){rej(new Error('ping timeout'))},20000)});
 Promise.race([p,guard]).then(function(ok){checking=false;if(ok===false)down(new Error('ping false'));else if(ok==='warn')up('warn');else up()},function(e){checking=false;down(e)});
}

/* ---------- mic / speech resume ---------- */
/* Browsers stop SpeechRecognition / the mic when the page is hidden. If it was on when you left,
   we try to restart it on return; if the browser wants a fresh tap, the pill says "Tap to resume". */
var pending={},pendT=null;
function resumeMics(fns){
 var keys=Object.keys(fns);if(!keys.length)return;
 keys.forEach(function(k){pending[k]=fns[k];log('mic resume '+k);try{fns[k]()}catch(e){log('mic resume threw '+e.message)}});
 clearTimeout(pendT);
 pendT=setTimeout(function(){if(Object.keys(pending).length){log('mic needs a tap');setState('tap')}},2500);
}
function tapResume(){var f=pending;pending={};setState(L.has?(navigator.onLine?'ok':'off'):'idle');resumeMics(f)}
/* ---------- drafts ---------- */
function saveDrafts(){if(!draftIds.length)return;var d=lsGet(DK)||{};var t=now();
 draftIds.forEach(function(id){var el=document.getElementById(id);if(!el)return;var v=el.value||'';if(v.trim())d[id]={v:v,t:t};else delete d[id]});
 lsSet(DK,Object.keys(d).length?d:null)}
function restoreDrafts(){if(!draftIds.length)return 0;var d=lsGet(DK);if(!d)return 0;var n=0,old=now()-7*864e5;
 draftIds.forEach(function(id){var el=document.getElementById(id),r=d[id];if(!el||!r||r.t<old)return;if(!el.value){el.value=r.v;n++;try{el.dispatchEvent(new Event('input',{bubbles:true}))}catch(e){}}});
 if(n)log('restored '+n+' draft(s)');return n}
var dTimer=null;
document.addEventListener('input',function(e){if(e.target&&draftIds.indexOf(e.target.id)>=0){clearTimeout(dTimer);dTimer=setTimeout(saveDrafts,400)}},true);

/* ---------- lifecycle ---------- */
var lastBack=0;
function leaving(why){hiddenAt=now();log('leave ('+why+')');saveDrafts();clearTimeout(timer);
 Object.keys(mics).forEach(function(k){mics[k].away=true});
 backFns.forEach(function(f){try{f('leave')}catch(e){}})}
function back(why){
 if(document.hidden)return;var t=now();if(t-lastBack<1200&&why!=='online'&&why!=='pageshow-bfcache')return;lastBack=t;
 log('back ('+why+')'+(hiddenAt?' after '+Math.round((t-hiddenAt)/1000)+'s':''));
 restoreDrafts();
 backFns.forEach(function(f){try{f('back',why)}catch(e){}});
 var fns={};Object.keys(mics).forEach(function(k){if(mics[k].away){fns[k]=mics[k].resume;delete mics[k]}});
 resumeMics(fns);
 tries=0;
 if(L.has)check(why);else if(parked.length||waiters.length)up();
}
document.addEventListener('visibilitychange',function(){if(document.hidden)leaving('hidden');else back('visible')});
window.addEventListener('pagehide',function(){leaving('pagehide')});
window.addEventListener('pageshow',function(e){if(e.persisted)back('pageshow-bfcache');else if(hiddenAt)back('pageshow')});
window.addEventListener('focus',function(){back('focus')});
window.addEventListener('online',function(){back('online')});
window.addEventListener('offline',function(){log('offline');clearTimeout(timer);if(L.has)setState('off')});
document.addEventListener('resume',function(){back('resume')});
document.addEventListener('freeze',function(){leaving('freeze')});

/* ---------- public API ---------- */
var R={
 line:function(o){o=o||{};L.name=o.name||'Line';L.ping=o.ping||null;L.onUp=o.onUp||null;L.has=true;
  /* no green until the line has really answered: start amber-checking, then ping once */
  var go=function(){ensurePill();if(!navigator.onLine){setState('off');return}if(L.ping){tries=0;check('start')}else setState('ok')};if(document.body)go();else document.addEventListener('DOMContentLoaded',go)},
 ok:function(){if(state!=='ok'&&state!=='tap'&&state!=='warn')up()},
 fail:function(e,hard){if(hard||R.isNet(e)||!navigator.onLine){if(!checking)down(e)}},
 isNet:function(e){if(!navigator.onLine)return true;if(!e)return false;var n=e.name||'',m=String(e.message||e);return n==='TypeError'||n==='AbortError'||/failed to fetch|load failed|network|aborted|timeout/i.test(m)},
 park:function(fn,e){if(document.hidden||!navigator.onLine||R.isNet(e)){parked.push(fn);log('parked call ('+(document.hidden?'hidden':!navigator.onLine?'offline':'network')+')');if(!document.hidden&&L.has&&!checking){down(e)}return true}return false},
 whenBack:function(){return new Promise(function(res){waiters.push(res);if(!document.hidden&&navigator.onLine&&!L.has)setTimeout(up,0)})},
 onBack:function(fn){backFns.push(fn)},
 mic:function(k,resume){mics[k]={resume:resume,away:!!document.hidden}},
 micLive:function(k){if(pending[k]){delete pending[k];log('mic live '+k)}if(state==='tap'&&!Object.keys(pending).length)setState(L.has?(navigator.onLine?'ok':'off'):'idle')},
 micEnd:function(k){if(!mics[k])return;if(document.hidden||mics[k].away)return;delete mics[k]},
 micStop:function(k){delete mics[k];delete pending[k];if(state==='tap'&&!Object.keys(pending).length)setState(L.has?'ok':'idle')},
 drafts:function(ids){ids.forEach(function(i){if(draftIds.indexOf(i)<0)draftIds.push(i)});var go=function(){var n=restoreDrafts();if(n)toast(n===1?'Draft restored':n+' drafts restored')};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go()},
 saveDrafts:saveDrafts,
 /* fetch that waits for the line to come back instead of dying on a network drop (max 3 waits) */
 fetch:function(u,o){function attempt(k){return fetch(u,o).then(function(r){R.ok();return r},function(e){if(R.isNet(e)&&k<3){R.fail(e);return R.whenBack().then(function(){return attempt(k+1)})}throw e})}return attempt(0)},
 /* ping an Apps Script exec line with its existing read-only whoami call; JSON answer = alive,
    but an error or key-needed answer shows amber ('warn'), never a green Connected */
 pingExec:function(u){return fetch(u,{method:'POST',redirect:'follow',credentials:'omit',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({fn:'whoami',args:[],key:(function(){try{return localStorage.getItem('realm_key')||''}catch(e){return''}})()})}).then(function(r){return r.text()}).then(function(t){var j=JSON.parse(t);if(/key needed/i.test(t)||(j&&typeof j==='object'&&(j.ok===false||j.error)))return 'warn';return true})},
 check:function(){tries=0;check('manual')},
 get state(){return state},
 _log:function(){return (window.__realmLineLog||[]).slice()}
};
function toast(m){ensurePill();if(!document.body)return;var t=document.createElement('div');t.textContent=m;t.style.cssText='position:fixed;left:50%;top:calc(40px + env(safe-area-inset-top));transform:translateX(-50%);background:#0f172a;color:#fff;font:13px system-ui,sans-serif;padding:6px 12px;border-radius:12px;z-index:9501;opacity:.92';document.body.appendChild(t);setTimeout(function(){t.remove()},2500)}
window.RealmLine=R;
})();
