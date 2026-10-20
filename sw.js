/* Hub service worker (v7, 20 Oct 2026): no caching at all, takes over at once and clears any old ara-app-* caches it can see. */
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return /^ara-app-/.test(k)&&k!=='ara-app-v7'}).map(function(k){return caches.delete(k)}))}).catch(function(){}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(){});
