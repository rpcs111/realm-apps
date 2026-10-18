/* Ara per-page service worker (v5 + local alerts, 18 Oct 2026). Registered by js/saveapp.js with scope = the page itself.
   Takes over at once (skipWaiting + clients.claim) and wipes older ara-app-* caches, so an old cached saveapp.js can never come back.
   HTML, JS, CSS and manifests: always network-first with the HTTP cache bypassed (cache:'no-cache'); offline falls back to the last copy.
   Same-origin GET only; never touches other origins.
   Local alerts: notificationclick opens that app. periodicsync (where the browser allows it) shows due items the page already stored. No push server. */
var C='ara-app-v5';
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('message',function(e){if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return /^ara-app-/.test(k)&&k!==C}).map(function(k){return caches.delete(k)}))}).catch(function(){}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET'||r.headers.has('range'))return;
  var u=new URL(r.url);if(u.origin!==self.location.origin)return;
  var fresh=r.mode==='navigate'||/\.(html|js|css|webmanifest|json)$/.test(u.pathname)||/\/$/.test(u.pathname);
  var net=fresh?fetch(r.mode==='navigate'?new Request(r.url,{cache:'no-cache',credentials:'same-origin',redirect:'follow'}):new Request(r,{cache:'no-cache'})):fetch(r);
  e.respondWith(net.then(function(res){
    if(res&&res.ok&&res.type==='basic'){var cp=res.clone();caches.open(C).then(function(c){return c.put(r,cp)}).catch(function(){})}
    return res;
  }).catch(function(err){
    return caches.match(r).then(function(m){return m||caches.match(r,{ignoreSearch:true})}).then(function(m){if(m)return m;throw err});
  }));
});
function araSnap(){
  return new Promise(function(ok){
    try{
      var r=indexedDB.open('ara-notify',1);
      r.onupgradeneeded=function(){if(!r.result.objectStoreNames.contains('snap'))r.result.createObjectStore('snap')};
      r.onerror=function(){ok(null)};
      r.onsuccess=function(){
        var db=r.result, tx=db.transaction('snap','readonly'), q=tx.objectStore('snap').getAll();
        q.onsuccess=function(){ok(q.result||[])};
        q.onerror=function(){ok(null)};
      };
    }catch(e){ok(null)}
  });
}
self.addEventListener('notificationclick',function(e){
  var url=(e.notification.data&&e.notification.data.url)||new URL('./',self.location.href).href;
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
    var path='';
    try{path=new URL(url,self.location.href).pathname}catch(err){}
    for(var i=0;i<list.length;i++){
      if(path&&list[i].url.indexOf(path)!==-1&&list[i].focus)return list[i].focus();
    }
    if(self.clients.openWindow)return self.clients.openWindow(url);
  }));
});
self.addEventListener('periodicsync',function(e){
  if(e.tag!=='ara-notify')return;
  e.waitUntil(araSnap().then(function(rows){
    if(!rows||!rows.length)return;
    var scope='';
    try{scope=new URL(self.registration.scope).pathname}catch(err){}
    var jobs=[];
    rows.forEach(function(rec){
      if(!rec||!rec.on||!rec.items||!rec.items.length||!rec.url)return;
      var path='';
      try{path=new URL(rec.url,self.location.href).pathname}catch(err){return}
      if(scope&&path!==scope)return;
      if(rec.at&&Date.now()-rec.at>7*24*60*60*1000)return;
      var n=rec.items.length;
      var body=n+(n===1?' item needs a look':' items need a look');
      jobs.push(self.registration.showNotification(rec.name||'App',{
        body:body,
        icon:rec.icon||'',
        badge:rec.icon||'',
        tag:'ara-due-'+(rec.app||'app'),
        data:{url:rec.url,app:rec.app||''}
      }));
    });
    return Promise.all(jobs);
  }));
});
