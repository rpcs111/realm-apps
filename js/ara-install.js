/* ara-install.js (Ara, 17 Oct 2026, v17). One-tap "Install / Save app" that always does something visible.
   Pages opt in with: an inline <head> script that stores beforeinstallprompt on window.__araBIP (before any other script),
   plus <script src="js/ara-install.js" defer>. It takes over clicks on #araSave (the button js/saveapp.js draws):
   - Chrome has a saved install prompt -> prompt() + wait for userChoice.
   - No prompt (already installed, Chrome not offering yet, or page opened inside another saved app) -> a small popover
     right under the button with the exact steps. Closes on x or a tap outside. Nothing is sent anywhere. */
(function(){
  'use strict';
  if(window.AraInstall)return;
  var ua=navigator.userAgent||'';
  var ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1),android=/Android/.test(ua);
  var APPTAG={'notes.html':'notes','scribe.html':'notes','search.html':'search','cert.html':'cert','index.html':'hub','layers.html':'layers'};
  var path=location.pathname;if(/\/$/.test(path))path+='index.html';
  var file=path.split('/').pop(),mine=APPTAG[file]||file.replace(/\.html$/,'');
  function standalone(){try{if(navigator.standalone===true)return true;var mm=function(m){return matchMedia('(display-mode: '+m+')').matches};if(mm('browser'))return false;return mm('standalone')||mm('minimal-ui')||mm('fullscreen')||mm('window-controls-overlay')}catch(e){return false}}
  function own(){try{return sessionStorage.getItem('ara_win_app')===mine}catch(e){return false}}
  if(!('__araBIP' in window)){window.__araBIP=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__araBIP=e})}
  var st=document.createElement('style');st.textContent='#araTip{display:none!important}'+
   '#araPop{position:fixed;z-index:2147483200;width:min(300px,calc(100vw - 16px));box-sizing:border-box;background:#04161a;color:#e6fbff;border:1px solid #22d3ee;border-radius:12px;padding:10px 44px 10px 12px;font:600 13px/1.4 system-ui,-apple-system,Roboto,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.6);text-align:left;letter-spacing:normal;text-transform:none}'+
   '#araPop[hidden]{display:none!important}#araPop b{color:#fff}#araPop .x{all:unset;position:absolute;top:0;right:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:#a1a1aa;font:400 20px/1 system-ui,sans-serif;cursor:pointer}';
  (document.head||document.documentElement).appendChild(st);
  var pop=null;
  function steps(){
    if(standalone()&&!own())return 'This page opened inside another saved app. Tap <b>&#8942;</b> &rsaquo; <b>Open in Chrome</b>, then <b>&#8942;</b> (top right) &rsaquo; <b>Add to home screen</b> &rsaquo; <b>Install</b>.';
    if(ios)return 'Tap <b>Share</b> &#x2191;&#xFE0E; &rsaquo; <b>Add to Home Screen</b> &rsaquo; <b>Add</b>.';
    if(android)return 'Tap <b>&#8942;</b> (top right), then <b>Add to home screen</b>, then <b>Install</b>.';
    return 'Click <b>&#8942;</b> (top right) &rsaquo; <b>Cast, save and share</b> &rsaquo; <b>Install page as app</b>.';
  }
  function place(btn){var r=btn.getBoundingClientRect();pop.style.top=Math.round(r.bottom+6)+'px';pop.style.right=Math.max(8,Math.round(innerWidth-r.right))+'px'}
  function show(btn,extra){if(!pop){pop=document.createElement('div');pop.id='araPop';pop.setAttribute('role','dialog');pop.setAttribute('aria-label','How to install');document.body.appendChild(pop)}
    pop.innerHTML='<button type="button" class="x" aria-label="Close">&times;</button>'+(extra?extra+'<br>':'')+steps();pop.hidden=false;place(btn);
    pop.querySelector('.x').onclick=function(e){e.stopPropagation();pop.hidden=true}}
  function hide(){if(pop)pop.hidden=true}
  function done(){var b=document.getElementById('araSave');if(b)b.hidden=true;hide()}
  document.addEventListener('click',function(e){
    var btn=e.target&&e.target.closest&&e.target.closest('#araSave');
    if(!btn){if(pop&&!pop.hidden&&!e.target.closest('#araPop'))hide();return}
    e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    if(pop&&!pop.hidden){hide();return}
    var p=window.__araBIP;
    if(p&&!(standalone()&&!own())){window.__araBIP=null;
      try{Promise.resolve(p.prompt()).then(function(){return p.userChoice}).then(function(c){if(c&&c.outcome==='accepted'){try{localStorage.setItem('ara_saved:'+path,'1')}catch(x){}done()}else show(btn,'Not installed yet.')}).catch(function(){show(btn)})}catch(x){show(btn)}
      return}
    show(btn);
  },true);
  window.addEventListener('appinstalled',done);
  window.addEventListener('resize',function(){var b=document.getElementById('araSave');if(pop&&!pop.hidden&&b)place(b)});
  window.addEventListener('scroll',function(){var b=document.getElementById('araSave');if(pop&&!pop.hidden&&b)place(b)},{passive:true});

  /* 44px pass (v18): any visible tappable thing under 44px gets a bigger hit area. Inline text links get padding with matching
     negative margin (layout unchanged); other controls get min-height/min-width 44px. Skips SVG, hidden things and realm-ui
     pills (css/ara-clean.css already handles those). Re-runs when the page adds things. */
  var SEL='button,a[href],[role=button],input[type=button],input[type=submit],input[type=text],input[type=search],input[type=url],input[type=email],input[type=password],input:not([type]),select,summary';
  function hit(){try{var n=document.querySelectorAll(SEL);for(var i=0;i<n.length;i++){var e=n[i];if(e.closest('svg')||e.closest('[hidden]')||e.closest('#araPop'))continue;
    var r=e.getBoundingClientRect();if(r.width<1||r.height<1)continue;if(r.height>=44&&r.width>=44)continue;var cs=getComputedStyle(e);
    if(cs.display==='inline'){e.classList.add('ara-hit');if(r.width<44){e.style.setProperty('min-width','44px','important');e.style.setProperty('text-align','center')}continue}
    if(r.height<44)e.style.setProperty('min-height','44px','important');if(r.width<44)e.style.setProperty('min-width','44px','important');
    if(r.height<44&&/^(inline-)?block$/.test(cs.display)&&e.tagName!=='INPUT'&&e.tagName!=='SELECT'&&e.tagName!=='SUMMARY'){e.style.setProperty('display',cs.display==='block'?'flex':'inline-flex');e.style.setProperty('align-items','center');if(cs.textAlign==='center')e.style.setProperty('justify-content','center')}
    if(e.tagName==='SUMMARY'&&r.height<44){e.style.setProperty('display','flex');e.style.setProperty('align-items','center')}}}catch(x){}}

  /* v19: floating sync pill (#realmSyncPill) shows for 3s whenever its text changes, then hides (css/ara-clean.css). */
  function pill(){var el=document.getElementById('realmSyncPill');if(!el||el._araW)return;el._araW=1;var t=0,g=0,last=null,first=true;/* v20: first show ends by ~3.8s after page start (min 1.5s on screen), then display:none after the fade; later only a real text change shows it again for 3s */
    function flash(){var tx=(el.textContent||'').trim();if(!first&&tx===last)return;last=tx;var ms=first?Math.max(1500,3800-(window.performance&&performance.now?performance.now():0)):3000;first=false;
      clearTimeout(t);clearTimeout(g);el.classList.remove('ara-gone');el.classList.add('ara-show');t=setTimeout(function(){el.classList.remove('ara-show');g=setTimeout(function(){el.classList.add('ara-gone')},300)},ms)}
    try{new MutationObserver(flash).observe(el,{childList:true,characterData:true,subtree:true})}catch(x){}flash()}
  var ht=0;function soon(){clearTimeout(ht);ht=setTimeout(function(){hit();pill()},150)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',soon);else soon();
  window.addEventListener('load',soon);
  try{new MutationObserver(soon).observe(document.documentElement,{childList:true,subtree:true})}catch(x){}
  window.AraInstall={show:function(){var b=document.getElementById('araSave');if(b)show(b)},hasPrompt:function(){return !!window.__araBIP}};
})();
