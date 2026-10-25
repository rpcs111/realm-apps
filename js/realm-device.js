/* realm-device.js (25 Oct 2026). One answer to "which device is this?" for every Realm panel.
   Order: ?d= in the link -> realm_device saved on this device -> phone model (Chrome userAgentData, async: SM-F96 Fold 8, SM-F74 Flip 6)
   -> wide screen (900px+) on a non-mobile browser = Desktop -> Phone.
   Load it as a plain (non-defer) script in <head>, before js/saveapp.js, so it reads ?d= before saveapp strips it.
   A page that IS one device (desk.html = fold8) sets window.REALM_DEVICE_PAGE first; that is used instead of the generic "Phone".
   Any element with data-realm-device gets the label (e.g. "Fold 8", "Desktop"). RealmDevice.on(fn) runs now and on every change.
   Nothing leaves the device. Saved value sits in localStorage realm_device (+ realm_device_src: param|model|page|width). */
(function(){
  'use strict';
  if(window.RealmDevice)return;
  var KEY='realm_device',SKEY='realm_device_src';
  var LABELS={fold8:'Fold 8',flip6:'Flip 6',fold8cover:'Fold 8 cover',desktop:'Desktop',phone:'Phone',julie:'Julie'};
  var subs=[],cur=null;
  function get(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function set(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function label(id){id=String(id||'').toLowerCase();return LABELS[id]||(id?id.charAt(0).toUpperCase()+id.slice(1):'')}
  function fromModel(s){s=String(s||'');if(/SM-F96/i.test(s))return 'fold8';if(/SM-F74/i.test(s))return 'flip6';return ''}
  function mobile(){var d=navigator.userAgentData;if(d&&d.mobile)return true;return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')||(/Macintosh/.test(navigator.userAgent||'')&&navigator.maxTouchPoints>1)}
  function wide(){return (window.innerWidth||0)>=900&&!mobile()}
  function page(){var p=String(window.REALM_DEVICE_PAGE||'').toLowerCase();return LABELS[p]?p:''}
  function pick(id,src){cur={id:id,label:label(id),source:src};return cur}
  function resolve(){
    var m=(location.search||'').match(/[?&]d=([A-Za-z0-9_-]{2,20})(?:&|$)/);
    if(m){var p=m[1].toLowerCase();set(KEY,p);set(SKEY,'param');return pick(p,'param')}
    var sv=String(get(KEY)||'').toLowerCase(),ss=get(SKEY)||'';
    /* A value from a link or the phone model is trusted. An older page-set value (Desk used to always write fold8) is weaker than
       the page's own device and the wide-screen check, so a desktop that once opened Desk is not stuck as "Fold 8". */
    if(sv&&(ss==='param'||ss==='model'))return pick(sv,'saved');
    var u=fromModel(navigator.userAgent);if(u){set(KEY,u);set(SKEY,'model');return pick(u,'model')}
    if(wide()){set(KEY,'desktop');set(SKEY,'width');return pick('desktop','width')} /* saved weakly so js/saveapp.js's device chip agrees */
    var pg=page();if(pg){set(KEY,pg);set(SKEY,'page');return pick(pg,'page')}
    if(sv)return pick(sv,'saved');
    return pick('phone','width');
  }
  function paint(){try{var n=document.querySelectorAll('[data-realm-device]');for(var i=0;i<n.length;i++)n[i].textContent=cur.label}catch(e){}}
  function emit(){paint();for(var i=0;i<subs.length;i++){try{subs[i](cur)}catch(e){}}try{window.dispatchEvent(new CustomEvent('realmdevice',{detail:cur}))}catch(e){}}
  resolve();
  /* Plain Chrome on Android hides the model ("Android 10; K"), so ask userAgentData for it. Only overrides a guess, never a ?d= or a model answer. */
  try{var ud=navigator.userAgentData;if(ud&&ud.getHighEntropyValues&&cur.source!=='param'&&cur.source!=='model'&&!(cur.source==='saved'&&(get(SKEY)==='param'||get(SKEY)==='model'))){
    ud.getHighEntropyValues(['model']).then(function(v){var id=fromModel(v&&v.model);if(!id)return;set(KEY,id);set(SKEY,'model');if(cur.id!==id){pick(id,'model');emit()}}).catch(function(){})}}catch(e){}
  var lastWide=wide();
  window.addEventListener('resize',function(){var w=wide();if(w===lastWide)return;lastWide=w;var before=cur.id;if(cur.source==='width'||cur.source==='page'){resolve();if(cur.id!==before)emit()}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint);else paint();
  window.RealmDevice={get:function(){return cur},label:label,on:function(fn){if(typeof fn==='function'){subs.push(fn);try{fn(cur)}catch(e){}}},paint:paint};
})();
