/* Ara per-page service worker (v5 + local alerts, 18 Oct 2026). Registered by js/saveapp.js with scope = the page itself.
   Takes over at once (skipWaiting + clients.claim) and wipes older ara-app-* caches, so an old cached saveapp.js can never come back.
   HTML, JS, CSS and manifests: always network-first with the HTTP cache bypassed (cache:'no-cache'); offline falls back to the last copy.
   Same-origin GET only; never touches other origins.
   Local alerts: notificationclick opens that app. periodicsync (where the browser allows it) shows due items the page already stored. No push server. */
var C='ara-app-v5';
self.addEventListener('install',function(e){self.skipWaiting();e.waitUntil(araWarm())});
self.addEventListener('message',function(e){if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return /^ara-app-/.test(k)&&k!==C}).map(function(k){return caches.delete(k)}))}).catch(function(){}).then(function(){return self.clients.claim()}))});
/* 1 Nov 2026: first open works offline. While the worker installs (before it controls any page) it fetches its own page and the same-origin files that page names
   (scripts, styles, manifest, icons; at most 80) into the cache, so the app opens offline after ONE online open, not two. Same-origin only. */
function araWarm(){
  var s=self.registration.scope;
  return caches.open(C).then(function(c){
    return fetch(new Request(s,{cache:'no-cache',credentials:'same-origin'})).then(function(res){
      if(!res||!res.ok||res.type!=='basic')return;
      return c.put(s,res.clone()).then(function(){return res.text()}).then(function(h){
        var seen={},list=[],re=/(?:src|href)\s*=\s*["']([^"'#]+)["']/g,m;
        while((m=re.exec(h))&&list.length<80){try{var u=new URL(m[1],s);if(u.origin===self.location.origin&&/\.(js|css|webmanifest|json|png|svg|webp|ico|jpg)$/.test(u.pathname)&&!seen[u.href]){seen[u.href]=1;list.push(u.href)}}catch(err){}}
        return Promise.all(list.map(function(u){return c.match(u).then(function(hit){if(hit)return;return fetch(new Request(u,{cache:'no-cache'})).then(function(r){if(r&&r.ok&&r.type==='basic')return c.put(u,r)}).catch(function(){})})}));
      });
    }).then(function(){return araWarmShared(c)});
  }).catch(function(){});
}
/* 1 Nov 2026 (ELON gate): files the page loads LATER (not named in its HTML) are stored at install too, so the first offline open
   matches a second one: Deck's history.json, version.json, the Tell button (ara-button.js, loaded by saveapp.js), the mic (mic-chat.js)
   and the app list (app-shell-config.js, loaded by app-shell.js), plus the app icons named in that list and in this page's manifests.
   Stored without the ?v= tag; offline the fetch handler already falls back to the same file ignoring the tag. Same-origin only, at most 60 icons. */
/* 1 Nov r2 gate: also the Tell button's picture and the star/watermark art the pages draw from CSS, and the resume panel
   (js/resume.js, loaded later by app-shell.js), so the Tell button, the Desk resume panel, Deck and Search look the same offline. */
var ARA_SHARED=['history.json','version.json','js/ara-button.js','js/mic-chat.js','js/app-shell-config.js','js/resume.js','js/reconnect.js',
  'pwa/hub-ara-v3-192.svg','pwa/star-deck.svg','pwa/star-desk.svg','pwa/realm-watermark.svg'];
function araWarmShared(c){
  var root=new URL('./',self.location.href).href,put=function(u){return c.match(u,{ignoreSearch:true}).then(function(hit){if(hit)return null;
    return fetch(new Request(u,{cache:'no-cache'})).then(function(r){if(!r||!r.ok||r.type!=='basic')return null;var t=r.clone();return c.put(u,r).then(function(){return t})})}).catch(function(){return null})};
  return Promise.all(ARA_SHARED.map(function(f){return put(root+f)})).then(function(rs){
    return c.keys().then(function(ks){
      var mans=ks.map(function(k){return k.url}).filter(function(u){return /\.webmanifest$/.test(new URL(u).pathname)});
      return Promise.all(mans.map(function(u){return c.match(u).then(function(r){return r?r.text():''}).then(function(t){return {t:t,b:u}})})).then(function(ms){
        var cfg=c.match(root+'js/app-shell-config.js',{ignoreSearch:true}).then(function(r){return r?r.text():''});
        return cfg.then(function(ct){
          var seen={},icons=[],re=/(?:\.\.?\/)?(pwa\/[A-Za-z0-9._\/-]+\.(?:png|svg|webp|ico))/g,m,add=function(rel,base){if(icons.length>=60)return;try{var u=new URL(rel,base);if(u.origin===self.location.origin){u.search='';if(!seen[u.href]){seen[u.href]=1;icons.push(u.href)}}}catch(err){}};
          while((m=re.exec(ct)))add(m[1],root);
          ms.forEach(function(o){var mm,r2=/"src"\s*:\s*"([^"]+)"/g;while((mm=r2.exec(o.t)))add(mm[1],o.b)});
          return Promise.all(icons.map(put));
        });
      });
    });
  }).catch(function(){});
}

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
