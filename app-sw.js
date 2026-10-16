/* Ara per-page service worker (v5, 16 Oct 2026). Registered by js/saveapp.js with scope = the page itself.
   Takes over at once (skipWaiting + clients.claim) and wipes older ara-app-* caches, so an old cached saveapp.js can never come back.
   HTML, JS, CSS and manifests: always network-first with the HTTP cache bypassed (cache:'no-cache'); offline falls back to the last copy.
   Same-origin GET only; never touches script.google.com or other origins. */
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
