/* resume.js: "Pick up where you left off" for Ange's apps (29 Oct 2026, local build, not live). API: docs/API.md (frozen v1).
   Saves each job's spot on this phone, flags a job INCOMPLETE when it's left partway and puts it on the shared list
   (localStorage realm-tasks) with a link straight back to that spot. Finishing clears it. Nothing is sent anywhere. */
(function(){'use strict';
if(window.Resume&&window.Resume.v===1)return;
var RKEY='realm-resume-v1',TKEY='realm-tasks',MAXREC=40,MAXBYTES=1500000,DEBOUNCE=800;
var APPS={cert:{name:'Cert Studio',page:'certstudio.html'},search:{name:'Search Studio',page:'search.html'},desk:{name:'Desk',page:'desk-app.html'}};
var active=null,timers={},pendingSave={},sync=null,syncT=0;
function now(){return Date.now()}
function jget(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch(e){return d}}
function jput(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function okApp(a){return typeof a==='string'&&/^[a-z0-9-]{1,24}$/.test(a)}
function okKey(k){return typeof k==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(k)}
function id(a,k){return a+'::'+k}
function emit(a,k,what){try{dispatchEvent(new CustomEvent('resume:change',{detail:{app:a,jobKey:k,what:what}}))}catch(e){}queueSync()}
function appName(a){return (APPS[a]&&APPS[a].name)||a}
/* titles and places are shown on screen: plain words only, so anything that looks like a code is replaced */
function hasCode(s){try{if(window.RealmShell&&window.RealmShell.hasCode)return window.RealmShell.hasCode(s)}catch(e){}
  return /\d[\s\-./]*\d[\s\-./]*\d/.test(String(s).normalize?String(s).normalize('NFKC'):String(s))}
function plain(s,fallback){s=String(s==null?'':s).replace(/\s+/g,' ').trim().slice(0,80);if(!s)return fallback;return hasCode(s)?fallback:s}
function link(a,k){var A=APPS[a]||{};try{if(typeof A.link==='function'){var u=A.link(k);if(u)return String(u)}}catch(e){}
  return (A.page||(a+'.html'))+'?resume='+encodeURIComponent(k)}
function recs(){var o=jget(RKEY,{});return o&&typeof o==='object'&&!Array.isArray(o)?o:{}}
function tasks(){var a=jget(TKEY,[]);return Array.isArray(a)?a:[]}
function prune(o){var ks=Object.keys(o);if(ks.length<=MAXREC)return o;
  ks.sort(function(x,y){var a=o[x],b=o[y];return (a.incomplete?1:0)-(b.incomplete?1:0)||(a.savedAt||0)-(b.savedAt||0)});
  while(ks.length>MAXREC)delete o[ks.shift()];return o}
function write(a,k,state,opts){
  if(!okApp(a)||!okKey(k))return {ok:false,why:'That job can\u2019t be saved (its name isn\u2019t valid).'};
  var o=recs(),r=o[id(a,k)]||{app:a,jobKey:k,startedAt:now(),incomplete:false};
  var s;try{s=JSON.stringify(state==null?{}:state)}catch(e){return {ok:false,why:'That job can\u2019t be saved (it has something that won\u2019t store).'}}
  if(s.length>MAXBYTES)return {ok:false,why:'That job is too big to keep on this phone.'};
  r.state=JSON.parse(s);r.savedAt=now();opts=opts||{};
  if(opts.title!=null)r.title=String(opts.title).slice(0,120);if(opts.where!=null)r.where=String(opts.where).slice(0,80);
  o[id(a,k)]=r;prune(o);
  if(!jput(RKEY,o)){/* out of space: drop the oldest other jobs and try once more */
    var ks=Object.keys(o).filter(function(x){return x!==id(a,k)}).sort(function(x,y){return (o[x].savedAt||0)-(o[y].savedAt||0)});
    ks.slice(0,Math.ceil(ks.length/2)).forEach(function(x){if(!o[x].incomplete)delete o[x]});
    if(!jput(RKEY,o))return {ok:false,why:'This phone is out of space, so this job\u2019s spot isn\u2019t saved.'}}
  if(r.incomplete)upTask(r);
  return {ok:true}}
function setActive(a,k,collect,opts){
  if(active&&(active.app!==a||active.jobKey!==k))leave(active.app,active.jobKey);
  if(!active||active.app!==a||active.jobKey!==k)active={app:a,jobKey:k,collect:null,opts:{}};
  if(collect)active.collect=collect;if(opts)active.opts=opts}
function upTask(r){var t=tasks(),tid='resume:'+r.app+':'+r.jobKey,hit=null;
  t.forEach(function(x){if(x&&x.id===tid)hit=x});
  var nm=appName(r.app);
  if(!hit){hit={id:tid,type:'incomplete',status:'open',app:r.app,createdAt:now()};t.push(hit)}
  hit.appName=nm;hit.jobKey=r.jobKey;hit.title=plain(r.title,nm+' job');hit.where=plain(r.where,'');hit.link=link(r.app,r.jobKey);hit.updatedAt=now();hit.status='open';
  jput(TKEY,t.slice(-200))}
function rmTask(a,k){var tid='resume:'+a+':'+k,t=tasks(),n=t.filter(function(x){return !(x&&x.id===tid)});if(n.length!==t.length)jput(TKEY,n)}
function flush(a,k){var i=id(a,k);if(timers[i]){clearTimeout(timers[i]);timers[i]=0}
  var p=pendingSave[i];if(p){delete pendingSave[i];return write(a,k,p.state,p.opts)}return {ok:true}}
function save(a,k,state,opts){if(!okApp(a)||!okKey(k))return false;var i=id(a,k);
  setActive(a,k);if(opts)active.opts=opts;var first=pendingSave[i]?pendingSave[i].first:now();pendingSave[i]={state:state,opts:opts,first:first};clearTimeout(timers[i]);
  /* steady changes (typing, scrolling) still get written at least every 3 seconds */
  if(now()-first>=3000){timers[i]=0;delete pendingSave[i];write(a,k,state,opts);emit(a,k,'save');return true}
  timers[i]=setTimeout(function(){timers[i]=0;var p=pendingSave[i];delete pendingSave[i];if(p){write(a,k,p.state,p.opts);emit(a,k,'save')}},DEBOUNCE);return true}
function saveNow(a,k,state,opts){if(!okApp(a)||!okKey(k))return {ok:false,why:'That job can\u2019t be saved (its name isn\u2019t valid).'};
  setActive(a,k);if(opts)active.opts=opts;var i=id(a,k);clearTimeout(timers[i]);timers[i]=0;delete pendingSave[i];var r=write(a,k,state,opts);if(r.ok)emit(a,k,'save');return r}
function begin(a,k,o){if(!okApp(a)||!okKey(k))return false;o=o||{};setActive(a,k,o.collect,{title:o.title,where:o.where});
  if(o.title!=null||o.where!=null){var R=recs()[id(a,k)];if(!R)write(a,k,o.collect?safeCollect(o.collect):{},o);else write(a,k,R.state,o)}return true}
function safeCollect(f){try{return f()}catch(e){return null}}
function leave(a,k){if(!a&&active){a=active.app;k=active.jobKey}if(!okApp(a)||!okKey(k))return false;
  if(active&&active.app===a&&active.jobKey===k&&active.collect){var s=safeCollect(active.collect);if(s!=null){delete pendingSave[id(a,k)];write(a,k,s,active.opts)}}
  flush(a,k);
  var o=recs(),r=o[id(a,k)];if(!r)return false;
  r.incomplete=true;r.leftAt=now();o[id(a,k)]=r;jput(RKEY,o);upTask(r);
  if(active&&active.app===a&&active.jobKey===k)active.left=true;
  emit(a,k,'leave');return true}
function done(a,k,what){if(!okApp(a)||!okKey(k))return false;var i=id(a,k);clearTimeout(timers[i]);timers[i]=0;delete pendingSave[i];
  var o=recs();delete o[i];jput(RKEY,o);rmTask(a,k);if(active&&active.app===a&&active.jobKey===k)active=null;emit(a,k,what||'done');return true}
function get(a,k){var r=recs()[id(a,k)];return r?JSON.parse(JSON.stringify(r)):null}
function pending(a){return tasks().filter(function(x){return x&&typeof x.id==='string'&&x.id.indexOf('resume:')===0&&x.status==='open'&&(!a||x.app===a)})
  .sort(function(x,y){return (y.updatedAt||0)-(x.updatedAt||0)})}
function param(n){try{return new URLSearchParams(location.search).get(n)}catch(e){var m=new RegExp('[?&]'+n+'=([^&#]*)').exec(location.search);return m?decodeURIComponent(m[1]):null}}
function restore(a,apply,opts){opts=opts||{};var k=opts.jobKey||param('resume');if(!okApp(a)||!okKey(k||''))return null;
  var r=get(a,k);if(!r)return null;
  var keep=true;try{if(apply)keep=apply(r.state||{},r)!==false}catch(e){}
  if(keep&&r.state&&r.state.scroll)scrollApply(r.state.scroll);
  active=null;setActive(a,k);
  if(!opts.keepUrl){try{var u=new URL(location.href);u.searchParams.delete('resume');history.replaceState(history.state,'',u.pathname+u.search+u.hash)}catch(e){}}
  return r}
/* ---- helpers ---- */
function fcollect(root){root=typeof root==='string'?document.querySelector(root):(root||document);var f={};if(!root)return f;
  [].forEach.call(root.querySelectorAll('input,select,textarea'),function(e){var n=e.id||e.name;if(!n||e.type==='password'||e.type==='file'||e.type==='hidden')return;
    if(e.type==='checkbox')f[n]=!!e.checked;else if(e.type==='radio'){if(e.checked)f[e.name||n]=e.value}else f[n]=e.value});return f}
function fapply(root,f){root=typeof root==='string'?document.querySelector(root):(root||document);if(!root||!f)return 0;var c=0;
  Object.keys(f).forEach(function(n){var es=root.querySelectorAll('#'+cssEsc(n)+',[name="'+String(n).replace(/"/g,'\\"')+'"]');
    [].forEach.call(es,function(e){if(e.type==='password'||e.type==='file')return;
      if(e.type==='checkbox')e.checked=!!f[n];else if(e.type==='radio')e.checked=(e.value===f[n]);else e.value=f[n];
      try{e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}catch(x){}c++})});return c}
function cssEsc(s){return window.CSS&&CSS.escape?CSS.escape(s):String(s).replace(/[^A-Za-z0-9_-]/g,'\\$&')}
function scrollCollect(sels){var s={y:Math.round(window.scrollY||document.documentElement.scrollTop||0),inner:{}};
  (sels||[]).forEach(function(q){var e=document.querySelector(q);if(e)s.inner[q]=Math.round(e.scrollTop)});return s}
function scrollApply(s){if(!s)return;var go=function(){try{if(typeof s.y==='number')window.scrollTo(0,s.y);Object.keys(s.inner||{}).forEach(function(q){var e=document.querySelector(q);if(e)e.scrollTop=s.inner[q]})}catch(e){}};
  go();setTimeout(go,60);setTimeout(go,400)}
/* ---- list ---- */
var CSS='.rz-list{box-sizing:border-box;max-width:100%;margin:10px 0;padding:10px 12px;border:1px solid #1f2937;border-radius:14px;background:#050505;color:#e5e5e5;font:14px/1.4 system-ui,-apple-system,Roboto,sans-serif}'
+'.rz-list *{box-sizing:border-box}.rz-list h3{margin:0 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#fbbf24}'
+'.rz-list ul{list-style:none;margin:0;padding:0}.rz-list li{border-top:1px solid #1f2937;padding:8px 0}.rz-list li:first-child{border-top:0}'
+'.rz-list .rz-t{font-weight:700;overflow-wrap:anywhere}.rz-list .rz-m{font-size:12px;color:#a3a3a3;overflow-wrap:anywhere}'
+'.rz-list .rz-flag{display:inline-block;margin-right:6px;padding:1px 6px;border-radius:6px;background:#422006;color:#fbbf24;font-size:11px;font-weight:800;letter-spacing:.04em}'
+'.rz-list .rz-a{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}'
+'.rz-list .rz-b{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:0 12px;border-radius:12px;border:1px solid #334155;background:#0a0a0a;color:#e5e5e5;font:700 14px/1 system-ui,sans-serif;cursor:pointer;text-decoration:none}'
+'.rz-list .rz-b.rz-p{border-color:#22d3ee;color:#22d3ee}.rz-list .rz-b:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}'
+'.rz-list .rz-e,.rz-list .rz-w{font-size:13px;color:#a3a3a3;margin:4px 0}.rz-list .rz-w{color:#fbbf24}';
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function ago(t){var d=new Date(t),h=d.getHours(),m=d.getMinutes(),ap=h<12?'am':'pm';h=h%12||12;
  var day=new Date().toDateString()===d.toDateString()?'today':['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];return 'Left '+day+' '+h+':'+(m<10?'0':'')+m+ap}
function mountList(el,opts){opts=opts||{};if(typeof el==='string')el=document.querySelector(el);if(!el)return null;
  if(!document.getElementById('rzCss')){var st=document.createElement('style');st.id='rzCss';st.textContent=CSS;(document.head||document.documentElement).appendChild(st)}
  var box=document.createElement('section');box.className='rz-list';box.setAttribute('aria-label',opts.heading||'Pick up where you left off');el.appendChild(box);
  function draw(){var L=pending().filter(function(x){return !opts.apps||opts.apps.indexOf(x.app)>=0}).slice(0,opts.max||12);
    box.hidden=!!opts.hideEmpty&&!L.length;
    box.innerHTML='<h3>'+esc(opts.heading||'Pick up where you left off')+'</h3>'+(L.length?'<ul>'+L.map(function(x,i){
      return '<li data-i="'+i+'"><div class="rz-t"><span class="rz-flag">INCOMPLETE</span>'+esc(x.title||(x.appName+' job'))+'</div>'
       +'<div class="rz-m">'+esc(x.appName||x.app)+(x.where?' \u00b7 '+esc(x.where):'')+' \u00b7 '+esc(ago(x.updatedAt||x.createdAt))+'</div>'
       +'<div class="rz-a"><a class="rz-b rz-p" data-act="open" href="'+esc(x.link)+'"'+(opts.target?' target="'+esc(opts.target)+'"':'')+'>Pick up</a>'
       +'<button type="button" class="rz-b" data-act="amend">\u270e Amend</button>'
       +'<button type="button" class="rz-b" data-act="rm">Remove</button></div></li>'}).join('')+'</ul>':'<p class="rz-e">Nothing left unfinished.</p>')
      +(sync?'':'<p class="rz-w">Why not on other phones: '+esc(syncStatus().why)+'</p>');
    box._L=L}
  box.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-act]');if(!b||!box.contains(b))return;
    var li=b.closest('li'),x=li&&box._L[+li.getAttribute('data-i')];if(!x)return;var act=b.getAttribute('data-act');
    if(act==='open'){if(opts.onOpen){e.preventDefault();try{opts.onOpen(x)}catch(er){}}return}
    if(act==='rm'){e.preventDefault();if(b.getAttribute('data-sure')){drop(x.app,x.jobKey)}else{b.setAttribute('data-sure','1');b.textContent='Tap again to remove';setTimeout(function(){if(b.isConnected){b.removeAttribute('data-sure');b.textContent='Remove'}},4000)}}
    else if(act==='amend'){e.preventDefault();var lab=(opts.name||'Pick up')+' \u00b7 unfinished '+(x.appName||x.app)+' job '+((+li.getAttribute('data-i'))+1);
      if(window.RealmShell&&window.RealmShell.open)window.RealmShell.open('note',lab);else if(opts.onAmend)opts.onAmend(x,lab)}});
  addEventListener('resume:change',draw);addEventListener('storage',function(e){if(!e.key||e.key===TKEY)draw()});
  draw();return box}
function drop(a,k){return done(a,k,'drop')}
/* ---- sync hook (off until set) ---- */
function syncStatus(){return sync?{on:true,why:''}:{on:false,why:'Picking up on another phone or computer, or from Deck for Desk and Cert Studio jobs, needs the Google sign-in set up for it. For now jobs are kept on this phone only.'}}
function setSync(ad){sync=ad&&typeof ad.push==='function'?ad:null;if(sync&&typeof sync.pull==='function'){try{Promise.resolve(sync.pull()).then(merge).catch(function(){})}catch(e){}}}
function queueSync(){if(!sync)return;clearTimeout(syncT);syncT=setTimeout(function(){try{Promise.resolve(sync.push({records:recs(),tasks:pending(),at:now()})).catch(function(){})}catch(e){}},5000)}
function merge(snap){if(!snap||!snap.records)return;var o=recs(),ch=false;
  Object.keys(snap.records).forEach(function(i){var r=snap.records[i];if(!r||!okApp(r.app)||!okKey(r.jobKey))return;if(!o[i]||(r.savedAt||0)>(o[i].savedAt||0)){o[i]=r;ch=true;if(r.incomplete)upTask(r)}});
  if(ch){jput(RKEY,prune(o));emit('','','sync')}}
/* ---- leaving ---- */
function onLeave(){if(active&&!active.left)leave(active.app,active.jobKey)}
addEventListener('pagehide',onLeave);addEventListener('beforeunload',onLeave);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')onLeave();else if(active)active.left=false});
window.Resume={v:1,register:function(a,o){if(!okApp(a))return false;APPS[a]=Object.assign({},APPS[a]||{},o||{});return true},
  save:save,saveNow:saveNow,begin:begin,leave:leave,done:done,drop:drop,get:get,restore:restore,pending:pending,link:link,mountList:mountList,
  fields:{collect:fcollect,apply:fapply},scroll:{collect:scrollCollect,apply:scrollApply},setSync:setSync,syncStatus:syncStatus,
  _active:function(){return active?{app:active.app,jobKey:active.jobKey,left:!!active.left}:null}};
})();
