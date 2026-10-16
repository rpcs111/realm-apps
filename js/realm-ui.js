/* realm-ui.js: shared helpers for the realm-ui.css layout (Ara, 16 Oct 2026).
   RealmUI.tabs(railEl, listEl, onChange) - rail/tab buttons with data-k filter the list (sets list[data-k]).
   RealmUI.counts({k:n}) - writes counts into .rui-tab[data-k] i.
   Row excerpts (.rui-x) open/close on tap. */
(function(){
  var R=window.RealmUI={};
  R.tabs=function(rail,list,cb){if(!rail||!list)return;
    rail.addEventListener('click',function(e){var b=e.target.closest('.rui-tab');if(!b)return;
      [].forEach.call(rail.querySelectorAll('.rui-tab'),function(x){x.classList.toggle('on',x===b);x.setAttribute('aria-selected',x===b?'true':'false')});
      var k=b.getAttribute('data-k')||'all';if(k==='all')list.removeAttribute('data-k');else list.setAttribute('data-k',k);
      try{window.scrollTo({top:0})}catch(_){}
      cb&&cb(k)})};
  R.counts=function(m){for(var k in m){var t=document.querySelector('.rui-tab[data-k="'+k+'"] i');if(t)t.textContent=m[k]}};
  document.addEventListener('click',function(e){var x=e.target.closest('.rui-x');if(x&&!e.target.closest('a,button'))x.classList.toggle('open')});
})();
