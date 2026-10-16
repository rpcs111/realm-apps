/* Realm Private service worker (Ara). Scope: ./private.html only. Caches only the page shell and
   manifest so the tile opens offline. Never caches Google or other cross-origin requests.
   Private data lives encrypted in localStorage, not in this cache. */
var C='realm-private-v1';
var SHELL=['./private.html','./private.webmanifest'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(SHELL)}).catch(function(){}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return /^realm-private-/.test(k)&&k!==C}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){
  var r=e.request; if(r.method!=='GET')return;
  var u=new URL(r.url); if(u.origin!==self.location.origin)return;
  if(!/\/private(\.html|\.webmanifest)$/.test(u.pathname))return;
  e.respondWith(fetch(r).then(function(res){
    if(res&&res.ok&&res.type==='basic'){var cp=res.clone();caches.open(C).then(function(c){return c.put(u.pathname.endsWith('.html')?'./private.html':r,cp)})}
    return res;
  }).catch(function(){return caches.match(u.pathname.endsWith('.html')?'./private.html':r).then(function(m){return m||Response.error()})}));
});
