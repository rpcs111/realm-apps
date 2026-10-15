/* Ara per-page service worker: network-first, same-origin GET only. Registered by js/saveapp.js with scope = the page itself. */
var C='ara-app-v2'; /* v2 15 Oct 2026: per-app Ara icons, mic fixes */
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return /^ara-app-/.test(k)&&k!==C}).map(function(k){return caches.delete(k)}))}).catch(function(){}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET'||r.headers.has('range'))return;
  if(new URL(r.url).origin!==self.location.origin)return;
  e.respondWith(fetch(r).then(function(res){
    if(res&&res.ok&&res.type==='basic'){var cp=res.clone();caches.open(C).then(function(c){return c.put(r,cp)}).catch(function(){})}
    return res;
  }).catch(function(err){
    return caches.match(r).then(function(m){return m||caches.match(r,{ignoreSearch:true})}).then(function(m){if(m)return m;throw err});
  }));
});
