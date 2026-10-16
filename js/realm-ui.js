/* realm-ui.js: shared helpers for the realm-ui.css layout (Ara, 16 Oct 2026).
   RealmUI.tabs(railEl, listEl, onChange) - rail/tab buttons with data-k filter the list:
     sets list[data-k] (CSS) and hides <section data-k> that don't match (JS, re-applied when the list changes).
   RealmUI.counts({k:n}) - writes counts into .rui-tab[data-k] i.
   Row excerpts (.rui-x, li .n, .rui-note) open/close on tap. textarea[data-autogrow] grows with its text. */
(function(){
  var R=window.RealmUI={};
  function apply(list){var k=list.getAttribute('data-k')||'all';[].forEach.call(list.querySelectorAll('section[data-k]'),function(s){var h=k!=='all'&&s.getAttribute('data-k')!==k;if(h)s.setAttribute('hidden','');else s.removeAttribute('hidden')})}
  R.tabs=function(rail,list,cb){if(!rail||!list)return;
    rail.addEventListener('click',function(e){var b=e.target.closest('.rui-tab');if(!b)return;
      [].forEach.call(rail.querySelectorAll('.rui-tab'),function(x){x.classList.toggle('on',x===b);x.setAttribute('aria-selected',x===b?'true':'false')});
      var k=b.getAttribute('data-k')||'all';if(k==='all')list.removeAttribute('data-k');else list.setAttribute('data-k',k);
      apply(list);try{window.scrollTo({top:0})}catch(_){}
      cb&&cb(k)});
    try{new MutationObserver(function(){apply(list)}).observe(list,{childList:true})}catch(_){}};
  R.counts=function(m){for(var k in m){var t=document.querySelector('.rui-tab[data-k="'+k+'"] i');if(t)t.textContent=m[k]}};
  document.addEventListener('click',function(e){if(e.target.closest('a,button'))return;var x=e.target.closest('.rui-x,.rui-list li .n,.rui-note');if(x)x.classList.toggle('open')});
  function grow(t){t.style.height='auto';t.style.height=Math.min(t.scrollHeight,innerHeight*0.3)+'px'}
  document.addEventListener('input',function(e){if(e.target.matches&&e.target.matches('textarea[data-autogrow]'))grow(e.target)});
})();
/* Google account pin (16 Oct 2026): every page using realm-ui also loads js/ara-account.js (info@ on all Google links + one-time Open-in hint). */
(function(){if(window.AraAccount||document.querySelector('script[src*="ara-account.js"]'))return;var me=document.currentScript&&document.currentScript.src;var x=document.createElement('script');x.src=me?me.replace(/realm-ui\.js.*$/,'ara-account.js?v=20261016a'):'js/ara-account.js?v=20261016a';x.defer=true;document.head.appendChild(x)})();
