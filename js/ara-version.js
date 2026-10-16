/* ara-version.js: auto-refresh stale apps (Ara, 16 Oct 2026).
   On load and whenever the app comes back to the front, fetch version.json with no-store.
   If v differs from the one this device last ran: update the service worker (skipWaiting/claim),
   clear old ara-app-* caches, then reload ONCE (sessionStorage guard stops loops).
   Include: <script src="js/ara-version.js" defer></script>  (path relative to the page) */
(function(){
  var S=document.currentScript,base=S&&S.src?new URL('../',S.src).href:new URL('./',location.href).href;
  var URLV=base+'version.json',KEY='ara_ver',busy=false,last=0;
  function get(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function set(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function once(v){try{if(sessionStorage.getItem('ara_ver_reloaded')===v)return false;sessionStorage.setItem('ara_ver_reloaded',v);return true}catch(e){return false}}
  function swUpdate(){if(!('serviceWorker' in navigator))return Promise.resolve();
    return navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){
      return r.update().catch(function(){}).then(function(){var w=r.waiting||r.installing;if(w)try{w.postMessage({type:'SKIP_WAITING'})}catch(e){}})}))}).catch(function(){})}
  function clearCaches(){if(!window.caches)return Promise.resolve();return caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return /^ara-app-/.test(k)}).map(function(k){return caches.delete(k)}))}).catch(function(){})}
  function check(){var now=Date.now();if(busy||now-last<15000)return;busy=true;last=now;
    fetch(URLV+'?t='+now,{cache:'no-store',credentials:'omit'}).then(function(r){return r.ok?r.json():null}).then(function(j){
      if(!j||!j.v)return;var have=get(KEY);window.ARA_VERSION=j.v;
      if(!have){set(KEY,j.v);return}
      if(have===j.v)return;
      set(KEY,j.v);
      if(!once(j.v))return;
      return swUpdate().then(clearCaches).then(function(){location.reload()});
    }).catch(function(){}).then(function(){busy=false})}
  check();
  addEventListener('focus',check);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)check()});
  addEventListener('pageshow',function(e){if(e.persisted)check()});
})();
