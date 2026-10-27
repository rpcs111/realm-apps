/* ara-account.js - Realm apps: open every Google link as info@realmpcs.com
   - adds authuser=info@realmpcs.com to Google links (docs/sheets/drive/mail/calendar/tasks/keep/gemini/admin/script editor)
   - script.google.com/macros web apps: plain link, authuser and /u/N/ removed (27 Oct: authuser caused 'unable to open the file')
   - rewrites <a href> on load + for links added later, and window.open(); never touches fetch/XHR/JSONP calls
   - one-time "Open in" hint: Android -> Chrome Beta, desktop -> Chrome (a web page cannot change the default browser)
     17 Oct: now a slim bar at the top that pushes the page down (was a fixed box over the bottom input); hides itself after 12s.
   Safe to include twice. No data stored except one localStorage flag. */
(function(){
 if(window.AraAccount)return;
 var EMAIL='info@realmpcs.com';
 var HOSTS=/^(script|docs|drive|mail|calendar|tasks|keep|gemini|admin|sites|forms|meet|chat|contacts|photos|myaccount|lookerstudio|datastudio|console\.cloud)\.google\.com$/i;
 function parse(u){try{return new URL(String(u),location.href)}catch(e){return null}}
 function isMacro(x){return /^script\.google\.com$/i.test(x.hostname)&&/^\/(a\/[^\/]+\/)?macros\//.test(x.pathname)}
 /* add/repair authuser; drop /u/N/ index segments (they pin the phone's 1st account) */
 function hint(u){
  var x=parse(u);if(!x||!/^https?:$/.test(x.protocol)||!HOSTS.test(x.hostname))return u;
  x.pathname=x.pathname.replace(/\/u\/\d+(?=\/|$)/,'').replace(/\/b\/\d+(?=\/|$)/,'')||'/';
  x.searchParams.set('authuser',EMAIL);
  return x.toString();
 }
 function chooser(u){return 'https://accounts.google.com/AccountChooser?Email='+encodeURIComponent(EMAIL)+'&continue='+encodeURIComponent(u)}
 /* final href for a link the user opens */
 function link(u){
  var x=parse(u);if(!x||!HOSTS.test(x.hostname||''))return u;
  /* 27 Oct: Apps Script web apps (/macros/.../exec) get NO authuser and no /u/N/. With more than one Google
     account in Chrome, authuser sends them to /macros/u/N/..., which Google answers with "Page not found -
     Sorry, unable to open the file at present". Our web apps open for anyone, so the plain link always works. */
  if(isMacro(x)){x.pathname=x.pathname.replace(/\/u\/\d+(?=\/)/,'');x.searchParams.delete('authuser');var c=x.toString();return c}
  var h=hint(u);return h; /* v20 (17 Oct, Elon Allow hunt): web-app (/macros/.../exec) links are NOT wrapped in AccountChooser any more - on Android it could end in the Gmail app. They keep authuser=info@realmpcs.com. chooser() kept for reference, unused. */
 }
 function fixA(a){
  var raw=a.getAttribute('href');if(!raw||raw.indexOf('google.com')<0)return;
  var n=link(raw);if(n!==raw){a.setAttribute('href',n);a.setAttribute('data-acct','info')}
 }
 function fixAll(root){
  if(!root||!root.querySelectorAll)return;
  if(root.tagName==='A')fixA(root);
  var l=root.querySelectorAll('a[href*="google.com"]');for(var i=0;i<l.length;i++)fixA(l[i]);
 }
 /* last-moment safety net for links whose href was changed by app code */
 document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href]');if(a)fixA(a)},true);
 document.addEventListener('auxclick',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href]');if(a)fixA(a)},true);
 var wo=window.open;
 window.open=function(u){var a=[].slice.call(arguments);if(typeof a[0]==='string'||a[0] instanceof URL)a[0]=link(String(a[0]));return wo.apply(window,a)};
 function start(){
  fixAll(document);
  try{new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var m=ms[i];
   if(m.type==='attributes'){if(m.target.tagName==='A')fixA(m.target)}
   else for(var j=0;j<m.addedNodes.length;j++)if(m.addedNodes[j].nodeType===1)fixAll(m.addedNodes[j])}})
   .observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['href']})}catch(e){}
  openInHint();
 }
 /* ---- one-time "Open in" hint ---- */
 var KEY='ara_openin_hint_v2';
 function openInHint(){
  try{if(localStorage.getItem(KEY))return}catch(e){return}
  var ua=navigator.userAgent||'',and=/Android/i.test(ua),ios=/iPhone|iPad|iPod/i.test(ua);
  var other=/SamsungBrowser|Edg(A|e|iOS)?\/|OPR\/|Opera|Firefox|FxiOS|UCBrowser|YaBrowser|Brave|DuckDuckGo|MiuiBrowser|HuaweiBrowser|; wv\)/i.test(ua)||(navigator.brave&&true);
  var chrome=/Chrome\/\d/.test(ua)&&!other;
  var msg='',btn='';
  if(ios)return;
  if(and){
   /* Chrome Beta and Chrome report the same browser name, so on Chrome we ask once */
   msg='Best in <b>Chrome Beta</b> signed in as <b>'+EMAIL+'</b>';
   if(!chrome)btn='<a class="aa-go" href="intent://'+location.host+location.pathname+location.search+'#Intent;scheme=https;package=com.chrome.beta;S.browser_fallback_url='+encodeURIComponent('https://play.google.com/store/apps/details?id=com.chrome.beta')+';end">Open in Chrome Beta</a>';
  }else{
   if(chrome)return;
   msg='Best in <b>Chrome</b> signed in as <b>'+EMAIL+'</b>';
  }
  var d=document.createElement('div');d.id='ara-openin';d.setAttribute('role','status');
  d.innerHTML='<style>#ara-openin{position:relative;z-index:1;background:#0b1b33;color:#fff;border-bottom:1px solid #00e5ff;padding:6px 12px;padding-top:calc(6px + env(safe-area-inset-top));font:13px/1.3 system-ui,sans-serif;display:flex;gap:8px;align-items:center;flex-wrap:nowrap;margin:0}#ara-openin span{flex:1 1 auto;min-width:0}#ara-openin a.aa-go,#ara-openin button{font:inherit;border-radius:8px;padding:6px 10px;cursor:pointer;text-decoration:none}#ara-openin a.aa-go{background:#00e5ff;color:#001018;font-weight:600}#ara-openin button{background:transparent;color:#fff;border:1px solid #7de9ff}</style>'
   +'<span>'+msg+'</span>'+btn+'<button type="button" aria-label="Dismiss">'+(and&&chrome?'Got it':'&times;')+'</button>';
  d.querySelector('button').onclick=function(){try{localStorage.setItem(KEY,String(Date.now()))}catch(e){}d.remove()};
  /* 17 Oct: slim bar at the very TOP that pushes the page down (never covers the note box / inputs) and goes by itself after 12s */
  var bd=document.body||document.documentElement;bd.insertBefore(d,bd.firstChild);
  setTimeout(function(){if(d.parentNode){try{localStorage.setItem(KEY,String(Date.now()))}catch(e){}d.remove()}},12000);
 }
 window.AraAccount={email:EMAIL,hint:hint,link:link,fixAll:fixAll};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
