/* Elon app service worker (v1, 17 Oct 2026). Scope: /realm-apps/elon/ only.
   Own cache prefix 'elon-app-' so it never touches the hub's sw.js or the ara-app-* caches, and they never touch it.
   Network first (HTTP cache bypassed), offline falls back to the last saved copy. Same-origin GET only. */
var V='elon-app-v1';
var CORE=['./','./index.html','./elon.webmanifest?v=1','./img/ara-symbol.svg?v=1','../version.json'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(V).then(function(c){return Promise.all(CORE.map(function(u){return fetch(new Request(u,{cache:'no-cache'})).then(function(r){if(r.ok)return c.put(u,r)}).catch(function(){})}))}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return /^elon-app-/.test(k)&&k!==V}).map(function(k){return caches.delete(k)}))}).catch(function(){}).then(function(){return self.clients.claim()}));
});
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET')return;
  var u=new URL(r.url);
  if(u.origin!==self.location.origin)return;
  var mine=u.pathname.indexOf('/realm-apps/elon/')===0||/\/realm-apps\/version\.json$/.test(u.pathname);
  if(!mine)return;
  var req=r.mode==='navigate'?new Request(r.url,{cache:'no-cache',credentials:'same-origin'}):new Request(r,{cache:'no-cache'});
  e.respondWith(fetch(req).then(function(res){
    if(res&&res.ok&&res.type==='basic'){var cp=res.clone();caches.open(V).then(function(c){return c.put(r,cp)}).catch(function(){})}
    return res;
  }).catch(function(err){
    return caches.match(r).then(function(m){return m||caches.match(r,{ignoreSearch:true})}).then(function(m){
      if(m)return m;
      if(r.mode==='navigate')return caches.match('./index.html',{ignoreSearch:true}).then(function(x){if(x)return x;throw err});
      throw err;
    });
  }));
});
