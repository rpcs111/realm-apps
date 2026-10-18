/* Local phone alerts. No push server, no keys, no paid service.
   One small "Turn on alerts" control plus a "Send test alert" link.
   On/off is stored per app in localStorage. Notifications go through the
   existing app-sw.js registration so they show in the phone shade.
   Due checks use only data the page already has. No invented rows. */
(function(){
  var S=document.currentScript||document.querySelector('script[src*="notify.js"]');
  var app=(S&&S.getAttribute('data-app'))||'app';
  var kind=(S&&S.getAttribute('data-kind'))||'test';
  var KEY='ara_alerts_on:'+app;
  var LAST='ara_alerts_sig:'+app;
  var DB='ara-notify';
  var bar, toggle, test, msg;

  function appName(){
    var n=(S&&S.getAttribute('data-name'))||'';
    if(n)return n;
    var m=document.querySelector('meta[name="application-name"]');
    return (m&&m.content)||document.title||'App';
  }
  function iconUrl(){
    var l=document.querySelector('link[rel="icon"]');
    try{return new URL((l&&l.getAttribute('href'))||'pwa/icon-v4-hub.svg',location.href).href}catch(e){return ''}
  }
  function openUrl(){
    return location.origin+location.pathname+'?app='+encodeURIComponent(app);
  }
  function on(){
    try{return localStorage.getItem(KEY)==='1'}catch(e){return false}
  }
  function setOn(v){
    try{if(v)localStorage.setItem(KEY,'1');else localStorage.removeItem(KEY)}catch(e){}
  }
  function perm(){
    if(!window.Notification)return 'unsupported';
    return Notification.permission||'default';
  }
  function melbKey(d){
    var o={};
    try{
      new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Melbourne',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).forEach(function(p){if(p.type!=='literal')o[p.type]=p.value});
      if(o.year&&o.month&&o.day)return o.year+'-'+o.month+'-'+o.day;
    }catch(e){}
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function addDays(key,n){
    var d=new Date(key+'T00:00:00Z');
    d.setUTCDate(d.getUTCDate()+n);
    return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
  }
  function dateKey(s){
    s=String(s||'').trim();
    if(!s)return '';
    var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m)return m[1]+'-'+m[2]+'-'+m[3];
    m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if(m)return m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
    return '';
  }
  function css(){
    if(document.getElementById('araAlertsCss'))return;
    var st=document.createElement('style');
    st.id='araAlertsCss';
    st.textContent='.ara-alerts{display:flex;flex-wrap:wrap;align-items:center;gap:0 12px;box-sizing:border-box;width:100%;max-width:100%;padding:0 12px;background:#000;color:#9fb3c8;border-bottom:1px solid rgba(255,255,255,.08);font:500 12.5px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}'+
      '.ara-alerts button{all:unset;box-sizing:border-box;cursor:pointer;min-height:44px;padding:0 2px;color:#9fb3c8;-webkit-tap-highlight-color:transparent}'+
      '.ara-alerts button.ara-on{color:#86efac}'+
      '.ara-alerts .ara-test{text-decoration:underline;text-underline-offset:2px}'+
      '.ara-alerts .ara-msg{flex:1 1 100%;margin:0 0 8px;color:#a1a1aa;font-size:12px}'+
      '.ara-alerts .ara-msg:empty{display:none}';
    document.head.appendChild(st);
  }
  function say(t){if(msg)msg.textContent=t||''}
  function paint(){
    if(!toggle)return;
    var live=on()&&perm()==='granted';
    toggle.classList.toggle('ara-on',live);
    toggle.setAttribute('aria-pressed',live?'true':'false');
    toggle.textContent=live?'Alerts on':'Turn on alerts';
  }
  function mount(){
    if(document.getElementById('araAlerts'))return;
    css();
    bar=document.createElement('div');
    bar.id='araAlerts';
    bar.className='ara-alerts';
    bar.setAttribute('role','group');
    bar.setAttribute('aria-label','Alerts');
    toggle=document.createElement('button');
    toggle.type='button';
    toggle.id='araAlertToggle';
    test=document.createElement('button');
    test.type='button';
    test.id='araAlertTest';
    test.className='ara-test';
    test.textContent='Send test alert';
    msg=document.createElement('p');
    msg.className='ara-msg';
    msg.setAttribute('role','status');
    bar.appendChild(toggle);
    bar.appendChild(test);
    bar.appendChild(msg);
    var header=document.querySelector('header');
    if(header&&header.parentNode)header.parentNode.insertBefore(bar,header.nextSibling);
    else document.body.insertBefore(bar,document.body.firstChild);
    toggle.addEventListener('click',onToggle);
    test.addEventListener('click',onTest);
    paint();
  }
  function pageScope(){
    var path=location.pathname;
    if(/\/$/.test(path))path+='index.html';
    return new URL(path,location.href).href;
  }
  function swScript(){
    var save=document.querySelector('script[src*="saveapp.js"]');
    var base=save&&save.src?new URL('../',save.src):new URL('./',location.href);
    return new URL('app-sw.js?v=20261018-1',base).href;
  }
  function registration(){
    if(!('serviceWorker' in navigator))return Promise.reject(new Error('no-sw'));
    var scope=pageScope();
    return navigator.serviceWorker.getRegistration(scope).then(function(reg){
      if(reg)return reg;
      return navigator.serviceWorker.register(swScript(),{scope:scope,updateViaCache:'none'});
    });
  }
  function armPeriodic(reg){
    try{
      if(!reg.periodicSync||typeof reg.periodicSync.register!=='function')return;
      reg.periodicSync.register('ara-notify',{minInterval:12*60*60*1000}).catch(function(){});
    }catch(e){}
  }
  function idb(){
    return new Promise(function(ok,no){
      if(!window.indexedDB){no(new Error('no-idb'));return}
      var r=indexedDB.open(DB,1);
      r.onupgradeneeded=function(){if(!r.result.objectStoreNames.contains('snap'))r.result.createObjectStore('snap')};
      r.onsuccess=function(){ok(r.result)};
      r.onerror=function(){no(r.error||new Error('idb'))};
    });
  }
  function writeSnap(items){
    var rec={on:on()&&perm()==='granted',app:app,name:appName(),icon:iconUrl(),url:openUrl(),items:items||[],at:Date.now()};
    return idb().then(function(db){
      return new Promise(function(ok){
        var tx=db.transaction('snap','readwrite');
        tx.objectStore('snap').put(rec,app);
        tx.oncomplete=function(){ok()};
        tx.onerror=function(){ok()};
      });
    }).catch(function(){});
  }
  function show(title,body,tag){
    return registration().then(function(reg){
      armPeriodic(reg);
      return reg.showNotification(title,{
        body:body,
        icon:iconUrl(),
        badge:iconUrl(),
        tag:tag,
        renotify:false,
        data:{url:openUrl(),app:app}
      });
    });
  }
  function titlesOf(list){
    return list.slice(0,3).map(function(x){return String(x.title||'').replace(/\s+/g,' ').trim()}).filter(Boolean);
  }
  function notesDue(){
    var today=melbKey(new Date()), out=[], seen={};
    function add(t){
      if(!t)return;
      var done=t.gdone||t.status==='completed'||/^completed/i.test(String(t.snap||''));
      if(done)return;
      var key=dateKey(t.due);
      if(!key||key>today)return;
      var id=String(t.gid||t.id||t.title||key);
      if(seen[id])return;
      seen[id]=1;
      out.push({id:id,title:t.title||'Task'});
    }
    var live=window.TASKS;
    if(Array.isArray(live))live.forEach(add);
    try{
      var cache=JSON.parse(localStorage.getItem('realm_tasks_desk_v1')||'null');
      ((cache&&cache.lists)||[]).forEach(function(l){((l&&l.tasks)||[]).forEach(function(t){add({id:t.id,title:t.title,due:t.due,status:t.status})})});
    }catch(e){}
    return out;
  }
  function certInfo(c){
    var api=window.__certWeeks;
    if(api&&typeof api.whenOf==='function')return api.whenOf(c);
    if(api&&typeof api.parseStart==='function')return api.parseStart((c&&(c.startIso||c.start))||'');
    var key=dateKey(c&&(c.startIso||c.start));
    return key?{key:key}:null;
  }
  function certDue(){
    var list=window.__araCertRows;
    if(!Array.isArray(list)||!list.length)return [];
    var anchors=list.filter(function(c){return /anchor/i.test(((c&&c.cal)||'')+' '+((c&&c.title)||''))});
    var src=anchors.length?anchors:list;
    var today=melbKey(new Date()), end=addDays(today,14), out=[], seen={};
    src.forEach(function(c){
      var info=certInfo(c);
      if(!info||!info.key||info.key<today||info.key>end)return;
      var id=(c.title||'')+'|'+(c.startIso||c.start||'')+'|'+(c.where||'');
      if(seen[id])return;
      seen[id]=1;
      out.push({id:id,title:c.title||'Cert'});
    });
    return out;
  }
  function etaDue(){
    var items=window.ITEMS;
    if(!Array.isArray(items))return [];
    var today=melbKey(new Date()), out=[];
    items.forEach(function(i,n){
      var key=dateKey(i&&(i.due||i.eta||i.date));
      if(key!==today)return;
      out.push({id:String(n)+':'+(i.n||''),title:i.n||'Item'});
    });
    return out;
  }
  function dueItems(){
    if(kind==='notes')return notesDue();
    if(kind==='cert')return certDue();
    if(kind==='eta')return etaDue();
    return [];
  }
  function summary(items){
    var n=items.length, names=titlesOf(items), extra=names.length?(': '+names.join(', ')):'';
    if(kind==='notes')return n+' due or overdue'+extra;
    if(kind==='cert')return n+(n===1?' cert due within 14 days':' certs due within 14 days')+extra;
    if(kind==='eta')return n+(n===1?' item due today':' items due today')+extra;
    return '';
  }
  function check(){
    if(!(on()&&perm()==='granted'))return writeSnap([]);
    var items=dueItems();
    writeSnap(items);
    if(!items.length)return;
    var day=melbKey(new Date());
    var sig=day+'|'+items.map(function(x){return x.id}).sort().join(',');
    try{if(localStorage.getItem(LAST)===sig)return;localStorage.setItem(LAST,sig)}catch(e){}
    show(appName(),summary(items),'ara-due-'+app).catch(function(){});
  }
  function ask(){
    if(!window.Notification||typeof Notification.requestPermission!=='function')return Promise.resolve('unsupported');
    try{
      var p=Notification.requestPermission();
      return p&&typeof p.then==='function'?p:Promise.resolve(Notification.permission);
    }catch(e){return Promise.resolve('denied')}
  }
  function onToggle(){
    if(on()&&perm()==='granted'){
      setOn(false);
      paint();
      say('');
      writeSnap([]);
      return;
    }
    ask().then(function(p){
      if(p==='granted'){setOn(true);paint();say('');registration().then(armPeriodic).catch(function(){});check()}
      else{setOn(false);paint();say(p==='unsupported'?'This browser cannot show alerts':'Alerts blocked in this browser')}
    });
  }
  function onTest(){
    ask().then(function(p){
      if(p!=='granted'){say(p==='unsupported'?'This browser cannot show alerts':'Alerts blocked in this browser');return}
      show(appName(),'Test alert','ara-test-'+app).then(function(){say('Test alert sent')}).catch(function(){say('Could not send the test alert')});
    });
  }
  function watchCerts(){
    if(kind!=='cert'||!window.call||window.call.__araAlerts)return;
    var orig=window.call;
    function wrapped(fn){
      var ret=orig.apply(this,arguments);
      if(fn==='getCerts'&&ret&&typeof ret.then==='function'){
        ret.then(function(r){
          window.__araCertRows=Array.isArray(r)?r:((r&&r.rows)||[]);
          if(on()&&perm()==='granted')check();
        },function(){});
      }
      return ret;
    }
    wrapped.__araAlerts=1;
    window.call=wrapped;
  }
  watchCerts();
  function boot(){
    mount();
    if(on()&&perm()==='granted'){registration().then(armPeriodic).catch(function(){});check()}
    else if(on()&&perm()==='denied')say('Alerts blocked in this browser');
    document.addEventListener('visibilitychange',function(){if(!document.hidden)check()});
    window.addEventListener('focus',function(){check()});
    if(kind==='notes'||kind==='cert'||kind==='eta')setInterval(function(){if(!document.hidden)check()},60000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
