/* Ara "Save app" button. Include with:
   <script src="js/saveapp.js" data-mount="CSS selector (optional)" data-mode="append|float" data-hide="old buttons to hide (optional)" defer></script>
   No mount = small fixed button top-right. */
(function(){
  var S=document.currentScript||document.querySelector('script[src*="saveapp.js"]');
  var cfg={mount:S&&S.getAttribute('data-mount'),mode:(S&&S.getAttribute('data-mode'))||'append',hide:S&&S.getAttribute('data-hide')};
  var path=location.pathname;if(/\/$/.test(path))path+='index.html';
  /* Device tag: install links carry ?d=flip6|fold8|phone|desktop|julie. Saved on this device once (localStorage realm_device),
     sent with sync + Ara messages so Ara can see which device did what. Never changes manifest id/scope. */
  try{var dm=location.search.match(/[?&]d=([A-Za-z0-9_-]{2,20})(?:&|$)/);if(dm){localStorage.setItem('realm_device',dm[1].toLowerCase());var q=location.search.replace(/([?&])d=[^&]*&?/,'$1').replace(/[?&]$/,'');history.replaceState(null,'',location.pathname+q+location.hash)}}catch(e){}
  /* Which installed app is this window? Each manifest start_url carries ?app=<tag> (notes|search|cert|hub|...). An app launched
     from its own home-screen icon opens with that marker; we keep it in sessionStorage (per window) and wipe it from the address bar.
     A page that is standalone WITHOUT the marker was swallowed by some OTHER (older, wide-scope) installed app via link capture:
     no badge there, the button offers "Open in Chrome to install" instead. */
  var APPTAG={'notes.html':'notes','scribe.html':'notes','search.html':'search','cert.html':'cert','index.html':'hub','layers.html':'layers'};
  var file=path.split('/').pop(),mine=APPTAG[file]||file.replace(/\.html$/,'');
  try{var am=location.search.match(/[?&]app=([A-Za-z0-9_-]{2,20})(?:&|$)/);if(am){sessionStorage.setItem('ara_win_app',am[1].toLowerCase());var q2=location.search.replace(/([?&])app=[^&]*&?/,'$1').replace(/[?&]$/,'');history.replaceState(null,'',location.pathname+q2+location.hash)}}catch(e){}
  function ownWindow(){try{return sessionStorage.getItem('ara_win_app')===mine}catch(e){return false}}
  var KEY='ara_saved:'+path,dp=null,btn,tip;
  var name=(document.querySelector('meta[name="application-name"]')||{}).content||document.title||'this app';
  var ua=navigator.userAgent||'';
  var ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
  var android=/Android/.test(ua),edge=/Edg\//.test(ua),firefox=/Firefox|FxiOS/.test(ua);
  var chrome=/Chrome|CriOS/.test(ua)&&!edge,safari=/Safari/.test(ua)&&!/Chrome|CriOS|FxiOS|EdgiOS|Edg\//.test(ua);
  /* Running as an installed app on THIS device only: the page's own display mode (never synced/server state, never getInstalledRelatedApps).
     A normal browser tab matches display-mode: browser, so it always gets the Install button. */
  function standalone(){try{if(navigator.standalone===true)return true;var mm=function(m){return matchMedia('(display-mode: '+m+')').matches};if(mm('browser'))return false;return mm('standalone')||mm('minimal-ui')||mm('fullscreen')||mm('window-controls-overlay')}catch(e){return false}}
  function saved(){try{return localStorage.getItem(KEY)==='1'}catch(e){return false}}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  var css='#araSave{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;height:44px;min-height:44px;min-width:44px;padding:0 16px;font-weight:800!important;border-radius:999px;border:1px solid #22d3ee;background:#000;color:#e6fbff;font:600 11px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;white-space:nowrap;box-shadow:0 0 10px rgba(34,211,238,.25);-webkit-tap-highlight-color:transparent}'+
   '#araSave:hover,#araSave:focus-visible{background:#04161a;color:#fff;box-shadow:0 0 14px rgba(34,211,238,.5)}#araSave svg{width:13px;height:13px;flex:0 0 13px}'+
   '#araSaveRow{display:flex;justify-content:flex-end;box-sizing:border-box;width:100%;padding:6px calc(10px + env(safe-area-inset-right)) 6px 10px;margin:0;position:relative;z-index:1}#araSave.fx{position:static}'+
   '#araSave.fl{float:right;margin:0 0 6px 10px}#araSave.ap{margin-left:auto;flex:0 0 auto}#araSave[hidden],#araTip[hidden]{display:none!important}'+
   '#araTip{position:absolute;top:calc(60px + env(safe-area-inset-top));right:calc(10px + env(safe-area-inset-right));z-index:2147483001;max-width:min(300px,calc(100vw - 20px));background:#000;color:#e4e4e7;border:1px solid #22d3ee;border-radius:12px;padding:12px 14px;font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.6);text-align:left;letter-spacing:normal;text-transform:none}'+
   '#araTip b{color:#fff}#araTip .h{color:#22d3ee;font-weight:600;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px}#araTip .x{all:unset;box-sizing:border-box;float:right;display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;margin:-10px -12px 0 4px;cursor:pointer;color:#a1a1aa;font-size:20px;line-height:1}';
  function tipHtml(){
    var n='<b>'+esc(name)+'</b>';
    if(ios)return '<div class="h">Save app</div>'+(safari?'':'Open this page in <b>Safari</b>, then: ')+'tap <b>Share</b> &#x2191;&#xFE0E; &rsaquo; <b>Add to Home Screen</b> &rsaquo; <b>Add</b>.';
    if(android)return '<div class="h">Save app</div>Tap <b>&#8942;</b> (top right) &rsaquo; <b>Install app</b> (or <b>Add to Home screen</b>) &rsaquo; <b>Install</b>. Being installed on your computer does not count for this phone.<br><br>Already saved? Open '+n+' from your home screen.';
    if(firefox)return '<div class="h">Save app</div>Firefox can\'t save web apps. Open this page in <b>Chrome</b> and tap Save app there.';
    if(safari)return '<div class="h">Save app</div>In Safari: <b>File</b> &rsaquo; <b>Add to Dock</b>.';
    var how=edge?'Click <b>&middot;&middot;&middot;</b> &rsaquo; <b>Apps</b> &rsaquo; <b>Install this site as an app</b>.':'Click <b>&#8942;</b> &rsaquo; <b>Cast, save and share</b> &rsaquo; <b>Install page as app</b> (or <b>Create shortcut</b> and tick <b>Open as window</b>).';
    var open='Click the <b>Open in app</b> icon at the right of the address bar, or open '+n+' from your Dock, Start menu or desktop.';
    if(saved())return '<div class="h">Open app</div>'+n+' is already saved on this computer. '+open+'<br><br>Not on this computer? '+how;
    return '<div class="h">Save app</div>'+how+'<br><br>Already saved? '+open;
  }
  function showTip(){if(!tip){tip=document.createElement('div');tip.id='araTip';tip.setAttribute('role','dialog');document.body.appendChild(tip)}
    tip.innerHTML='<button class="x" type="button" aria-label="Close">&times;</button>'+tipHtml();tip.hidden=false;if(hint)hint.style.display='none';place();
    tip.querySelector('.x').onclick=function(){tip.hidden=true}}
  function label(){if(!btn)return;var open=false;
    btn.lastChild.textContent=open?'Open app':'Save app';btn.title=open?'Open '+name+' as an app':'Save '+name+' as an app'}
  function badge(){var b=document.getElementById('araInstalled');if(!standalone()||!ownWindow()){if(b)b.hidden=true;return}if(!b){b=document.createElement('div');b.id='araInstalled';b.setAttribute('role','status');b.textContent='Installed as an app \u2713';b.style.cssText='position:fixed;top:calc(8px + env(safe-area-inset-top));right:calc(8px + env(safe-area-inset-right));z-index:2147483000;background:#16a34a;color:#fff;font:700 13px system-ui,sans-serif;padding:6px 12px;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.5);pointer-events:none';document.body.appendChild(b)}b.hidden=false}
  /* 17 Oct (Elon verdict): the install hint is a slim in-flow bar at the very TOP of the page. It pushes the page down,
     never floats over the header, filters or bubbles. One tap on x hides it for good on this device; it also goes by itself after 12s. */
  var hint,HK='ara_install_hint_gone',hintGone=0;try{hintGone=localStorage.getItem(HK)?1:0}catch(e){}
  function hintTxt(){return ios?'Tap Share, then Add to Home Screen':android?'Tap the three dots \u22ee, then Install app':'Or: browser menu \u22ee, then Install app'}
  function hintBye(){hintGone=1;try{localStorage.setItem(HK,String(Date.now()))}catch(e){}if(hint&&hint.parentNode)hint.parentNode.removeChild(hint);hint=null;place()}
  function paintHint(){if(!btn)return;var odd=standalone()&&!ownWindow(),show=odd||(!standalone()&&!dp);if((hintGone&&!odd)||(tip&&!tip.hidden))show=false;
    if(!show){if(hint)hint.style.display='none';place();return}
    if(!hint){hint=document.createElement('div');hint.id='araHint';hint.setAttribute('role','note');
      hint.style.cssText='position:relative;z-index:1;display:flex;align-items:center;gap:8px;margin:0;min-height:44px;padding:0 0 0 12px;background:#04161a;color:#e6fbff;border-bottom:1px solid #22d3ee;font:600 12.5px/1.3 system-ui,-apple-system,Roboto,sans-serif;text-align:left;box-sizing:border-box;width:100%';
      hint.innerHTML='<span style="flex:1 1 auto;min-width:0"></span><button type="button" aria-label="Hide this tip" style="all:unset;box-sizing:border-box;flex:0 0 auto;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;color:#a1a1aa;font:400 20px/1 system-ui,sans-serif;cursor:pointer">&times;</button>';
      hint.querySelector('button').onclick=hintBye;
      var bd=document.body,first=bd.firstChild,oi=document.getElementById('ara-openin');bd.insertBefore(hint,oi?oi.nextSibling:first);
      if(!odd)setTimeout(hintBye,12000)}
    hint.firstChild.textContent=odd?'This opened inside an older app. Tap Open in Chrome, then Install app':hintTxt();hint.style.display='flex';place()}
  /* 17 Oct (Elon FAIL 2): the Install button is no longer pinned to the screen. With no mount it sits in its own right-aligned
     row at the top of the page (in the flow, under the hint bar), so it scrolls away and never covers text. The tip opens just under it
     (position:absolute, page coordinates) and scrolls away too. */
  function place(){try{
    if(tip&&!tip.hidden&&btn){var b=btn.getBoundingClientRect();tip.style.top=Math.round(b.bottom+(window.scrollY||0)+6)+'px'}}catch(e){}}
  function refresh(){badge();if(!btn)return;btn.hidden=standalone()&&ownWindow();if(standalone()&&!ownWindow()){btn.lastChild.textContent='Open in Chrome to install';btn.hidden=false;paintHint();return}if(btn.hidden&&tip)tip.hidden=true;label();paintHint()}
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();dp=e;try{localStorage.removeItem(KEY)}catch(x){}refresh()});
  window.addEventListener('appinstalled',function(){dp=null;try{localStorage.setItem(KEY,'1')}catch(x){}if(btn)btn.hidden=true;if(tip)tip.hidden=true;if(hint)hint.style.display='none'});
  function init(){
    if(document.getElementById('araSave'))return;
    var st=document.createElement('style');st.id='araSaveCss';st.textContent=css;document.head.appendChild(st);
    btn=document.createElement('button');btn.id='araSave';btn.type='button';
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M6 10l6 6 6-6M4 21h16"/></svg><span>Save app</span>';
    var m=cfg.mount&&document.querySelector(cfg.mount);
    if(m&&cfg.mode==='float'){btn.className='fl';m.insertBefore(btn,m.firstChild)}
    else if(m){btn.className='ap';m.appendChild(btn)}
    else{btn.className='fx';var row=document.createElement('div');row.id='araSaveRow';row.appendChild(btn);var bd=document.body,oi=document.getElementById('ara-openin'),hn=document.getElementById('araHint'),ref=hn||oi;bd.insertBefore(row,ref?ref.nextSibling:bd.firstChild)}
    if(cfg.hide)try{document.querySelectorAll(cfg.hide).forEach(function(el){el.style.display='none'})}catch(e){}
    btn.addEventListener('click',function(){
      if(standalone()&&!ownWindow()){var u=location.href.split('#')[0];if(android){location.href='intent://'+u.replace(/^https?:\/\//,'')+'#Intent;scheme=https;package=com.chrome.beta;S.browser_fallback_url='+encodeURIComponent(u)+';end'}else window.open(u,'_blank','noopener');return}
      if(dp){var p=dp;dp=null;p.prompt();(p.userChoice||Promise.resolve({})).then(function(c){if(c&&c.outcome==='accepted'){try{localStorage.setItem(KEY,'1')}catch(x){}}refresh()})}
      else if(tip&&!tip.hidden)tip.hidden=true;else showTip()});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&tip)tip.hidden=true});
    ['standalone','minimal-ui','window-controls-overlay'].forEach(function(mm){try{var q=matchMedia('(display-mode: '+mm+')');q.addEventListener?q.addEventListener('change',refresh):q.addListener(refresh)}catch(e){}});
    refresh();
    window.addEventListener('resize',place);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  /* Ara button on every app that loads this file (installed apps pick it up on next open) */
  try{if(!document.getElementById('araBtnJs')){var ab=document.createElement('script');ab.id='araBtnJs';ab.src=new URL('ara-button.js?v=20261017-24',(S&&S.src)?S.src:new URL('js/',location.href)).href;(document.head||document.documentElement).appendChild(ab)}}catch(e){}

  if('serviceWorker' in navigator&&location.protocol!=='file:'){
    var base=(S&&S.src)?new URL('../',S.src):new URL('./',location.href);
    navigator.serviceWorker.register(new URL('app-sw.js?v=20261018-1',base).href,{scope:new URL(path,location.href).href,updateViaCache:'none'}).then(function(r){try{r.update()}catch(e){}}).catch(function(){});
  }
})();
