/* Realm key (16 Oct 2026). The Realm Desk backend answers only with the Realm key.
   The key lives on this device only (localStorage 'realm_key'). Never put it in this repo.
   One-time setup: open any Desk page with #k=YOUR-KEY on the end (the # part never leaves the phone), or type it in the box. */
(function(){
  'use strict';
  if(window.RealmKey)return;
  var LS='realm_key',DESK=/script\.google(usercontent)?\.com\/macros\//;
  function get(){try{return localStorage.getItem(LS)||''}catch(e){return''}}
  function set(k){try{localStorage.setItem(LS,k)}catch(e){}}
  // 1) one-tap link: page.html#k=XXXXX-XXXXX-...
  try{var m=(location.hash||'').match(/[#&]k=([A-Za-z0-9-]{20,})/);if(m){set(m[1].toUpperCase());history.replaceState(null,'',location.pathname+location.search)}}catch(e){}
  var shown=false;
  function ask(why){
    if(shown||!document.body){if(!document.body)document.addEventListener('DOMContentLoaded',function(){ask(why)});return}
    shown=true;
    var w=document.createElement('div');w.id='rkBox';w.setAttribute('role','dialog');w.setAttribute('aria-label','Enter Realm key');
    w.style.cssText='position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:16px';
    w.innerHTML='<form style="background:#0b1220;color:#e4e4e7;border:1px solid #22d3ee;border-radius:14px;padding:16px;max-width:360px;width:100%;font:15px system-ui,sans-serif">'+
      '<b style="font-size:17px">Enter Realm key</b><p id="rkWhy" style="margin:6px 0 10px;color:#94a3b8"></p>'+
      '<input id="rkIn" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" style="width:100%;box-sizing:border-box;min-height:44px;font:16px monospace;padding:8px;border-radius:10px;border:1px solid #334155;background:#000;color:#fff">'+
      '<div style="display:flex;gap:8px;margin-top:12px"><button type="submit" id="rkSave" style="flex:1;min-height:44px;border-radius:10px;border:0;background:#0e7490;color:#fff;font-weight:700">Save</button>'+
      '<button type="button" id="rkX" style="min-height:44px;padding:0 14px;border-radius:10px;border:1px solid #334155;background:#000;color:#e4e4e7">Not now</button></div></form>';
    document.body.appendChild(w);
    w.querySelector('#rkWhy').textContent=why||'One time on this device. Ange has the key.';
    var inp=w.querySelector('#rkIn');setTimeout(function(){try{inp.focus()}catch(e){}},50);
    function close(){shown=false;if(w.parentNode)w.parentNode.removeChild(w)}
    w.querySelector('#rkX').onclick=close;
    document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
    w.querySelector('form').onsubmit=function(e){e.preventDefault();var k=inp.value.trim().toUpperCase();if(k.replace(/[^A-Z0-9]/g,'').length<20){w.querySelector('#rkWhy').textContent='That looks too short. Check the key and try again.';return}set(k);close();location.reload()};
  }
  // 2) watch Desk answers: a key error opens the box
  if(window.fetch){var of=window.fetch;window.fetch=function(u,o){var p=of.apply(this,arguments);try{var url=String(u&&u.url||u);if(DESK.test(url)){p.then(function(r){try{r.clone().text().then(function(t){if(/Realm key needed/.test(t)){if(!get()&&window.REALM_KEY_INLINE){try{window.dispatchEvent(new Event('realmkey-needed'))}catch(e){}return}ask(get()?'That key did not work. Check it and type it again.':'')}},function(){})}catch(e){}},function(){})}}catch(e){}return p}}
  // 3) first use: no key yet (17 Oct: a page that sets window.REALM_KEY_INLINE=1 before this script shows its own small 'Add key' line instead of the popup)
  if(!get()&&!window.REALM_KEY_INLINE)ask('');
  window.RealmKey={get:get,ask:ask};
})();
