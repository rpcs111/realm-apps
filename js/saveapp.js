/* Ara "Save app" button. Include with:
   <script src="js/saveapp.js" data-mount="CSS selector (optional)" data-mode="append|float" data-hide="old buttons to hide (optional)" defer></script>
   No mount = small fixed button top-right. */
(function(){
  var S=document.currentScript||document.querySelector('script[src*="saveapp.js"]');
  var cfg={mount:S&&S.getAttribute('data-mount'),mode:(S&&S.getAttribute('data-mode'))||'append',hide:S&&S.getAttribute('data-hide')};
  var path=location.pathname;if(/\/$/.test(path))path+='index.html';
  var KEY='ara_saved:'+path,dp=null,btn,tip;
  var name=(document.querySelector('meta[name="application-name"]')||{}).content||document.title||'this app';
  var ua=navigator.userAgent||'';
  var ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
  var android=/Android/.test(ua),edge=/Edg\//.test(ua),firefox=/Firefox|FxiOS/.test(ua);
  var chrome=/Chrome|CriOS/.test(ua)&&!edge,safari=/Safari/.test(ua)&&!/Chrome|CriOS|FxiOS|EdgiOS|Edg\//.test(ua);
  function standalone(){try{return ['standalone','minimal-ui','window-controls-overlay','fullscreen'].some(function(m){return matchMedia('(display-mode: '+m+')').matches})||navigator.standalone===true}catch(e){return false}}
  function saved(){try{return localStorage.getItem(KEY)==='1'}catch(e){return false}}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  var css='#araSave{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;border:1px solid #22d3ee;background:#000;color:#e6fbff;font:600 11px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;white-space:nowrap;box-shadow:0 0 10px rgba(34,211,238,.25);-webkit-tap-highlight-color:transparent}'+
   '#araSave:hover,#araSave:focus-visible{background:#04161a;color:#fff;box-shadow:0 0 14px rgba(34,211,238,.5)}#araSave svg{width:13px;height:13px;flex:0 0 13px}'+
   '#araSave.fx{position:fixed;top:calc(10px + env(safe-area-inset-top));right:calc(10px + env(safe-area-inset-right));z-index:2147483000}'+
   '#araSave.fl{float:right;margin:0 0 6px 10px}#araSave.ap{margin-left:auto;flex:0 0 auto}#araSave[hidden],#araTip[hidden]{display:none!important}'+
   '#araTip{position:fixed;top:calc(48px + env(safe-area-inset-top));right:calc(10px + env(safe-area-inset-right));z-index:2147483001;max-width:min(300px,calc(100vw - 20px));background:#000;color:#e4e4e7;border:1px solid #22d3ee;border-radius:12px;padding:12px 14px;font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.6);text-align:left;letter-spacing:normal;text-transform:none}'+
   '#araTip b{color:#fff}#araTip .h{color:#22d3ee;font-weight:600;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px}#araTip .x{all:unset;float:right;cursor:pointer;color:#a1a1aa;font-size:16px;line-height:1;padding:0 0 4px 8px}';
  function tipHtml(){
    var n='<b>'+esc(name)+'</b>';
    if(ios)return '<div class="h">Save app</div>'+(safari?'':'Open this page in <b>Safari</b>, then: ')+'tap <b>Share</b> &#x2191;&#xFE0E; &rsaquo; <b>Add to Home Screen</b> &rsaquo; <b>Add</b>.';
    if(android)return '<div class="h">Save app</div>Tap <b>&#8942;</b> (top right) &rsaquo; <b>Install app</b> (or <b>Add to Home screen</b>) &rsaquo; <b>Install</b>.<br><br>Already saved? Open '+n+' from your home screen.';
    if(firefox)return '<div class="h">Save app</div>Firefox can\'t save web apps. Open this page in <b>Chrome</b> and tap Save app there.';
    if(safari)return '<div class="h">Save app</div>In Safari: <b>File</b> &rsaquo; <b>Add to Dock</b>.';
    var how=edge?'Click <b>&middot;&middot;&middot;</b> &rsaquo; <b>Apps</b> &rsaquo; <b>Install this site as an app</b>.':'Click <b>&#8942;</b> &rsaquo; <b>Cast, save and share</b> &rsaquo; <b>Install page as app</b> (or <b>Create shortcut</b> and tick <b>Open as window</b>).';
    var open='Click the <b>Open in app</b> icon at the right of the address bar, or open '+n+' from your Dock, Start menu or desktop.';
    if(saved())return '<div class="h">Open app</div>'+n+' is already saved on this computer. '+open+'<br><br>Not on this computer? '+how;
    return '<div class="h">Save app</div>'+how+'<br><br>Already saved? '+open;
  }
  function showTip(){if(!tip){tip=document.createElement('div');tip.id='araTip';tip.setAttribute('role','dialog');document.body.appendChild(tip)}
    tip.innerHTML='<button class="x" type="button" aria-label="Close">&times;</button>'+tipHtml();tip.hidden=false;
    tip.querySelector('.x').onclick=function(){tip.hidden=true}}
  function label(){if(!btn)return;var open=!dp&&saved()&&!ios&&!android;
    btn.lastChild.textContent=open?'Open app':'Save app';btn.title=open?'Open '+name+' as an app':'Save '+name+' as an app'}
  function refresh(){if(!btn)return;btn.hidden=standalone();if(btn.hidden&&tip)tip.hidden=true;label()}
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();dp=e;try{localStorage.removeItem(KEY)}catch(x){}refresh()});
  window.addEventListener('appinstalled',function(){dp=null;try{localStorage.setItem(KEY,'1')}catch(x){}if(btn)btn.hidden=true;if(tip)tip.hidden=true});
  function init(){
    if(document.getElementById('araSave'))return;
    var st=document.createElement('style');st.id='araSaveCss';st.textContent=css;document.head.appendChild(st);
    btn=document.createElement('button');btn.id='araSave';btn.type='button';
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M6 10l6 6 6-6M4 21h16"/></svg><span>Save app</span>';
    var m=cfg.mount&&document.querySelector(cfg.mount);
    if(m&&cfg.mode==='float'){btn.className='fl';m.insertBefore(btn,m.firstChild)}
    else if(m){btn.className='ap';m.appendChild(btn)}
    else{btn.className='fx';document.body.appendChild(btn)}
    if(cfg.hide)try{document.querySelectorAll(cfg.hide).forEach(function(el){el.style.display='none'})}catch(e){}
    btn.addEventListener('click',function(){
      if(dp){var p=dp;dp=null;p.prompt();(p.userChoice||Promise.resolve({})).then(function(c){if(c&&c.outcome==='accepted'){try{localStorage.setItem(KEY,'1')}catch(x){}}refresh()})}
      else if(tip&&!tip.hidden)tip.hidden=true;else showTip()});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&tip)tip.hidden=true});
    ['standalone','minimal-ui','window-controls-overlay'].forEach(function(mm){try{var q=matchMedia('(display-mode: '+mm+')');q.addEventListener?q.addEventListener('change',refresh):q.addListener(refresh)}catch(e){}});
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  if('serviceWorker' in navigator&&location.protocol!=='file:'){
    var base=(S&&S.src)?new URL('../',S.src):new URL('./',location.href);
    navigator.serviceWorker.register(new URL('app-sw.js',base).href,{scope:new URL(path,location.href).href}).catch(function(){});
  }
})();
