/* Ara per-page service worker: network-first, same-origin GET only. Registered by js/saveapp.js with scope = the page itself. */
var C='ara-app-v1';
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
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
