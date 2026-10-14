/* Realm shared voice + edit control. Voice can never delete: deletes stay on-screen with two confirms + typed PIN. */
(function(){
var page=(location.pathname.split('/').pop()||'index.html').replace(/\.html$/,'')||'index';
function $(s){return document.querySelector(s)}
var css=document.createElement('style');css.textContent='#vMic,#vEd{position:fixed;right:14px;z-index:9000;width:52px;height:52px;border-radius:50%;border:0;box-shadow:0 2px 10px rgba(0,0,0,.3);font-size:22px;color:#fff}#vMic{bottom:calc(84px + env(safe-area-inset-bottom));background:#dc2626}#vMic.on{background:#16a34a;animation:vp 1s infinite}#vEd{bottom:calc(146px + env(safe-area-inset-bottom));background:#475569}#vEd.on{background:#2563eb}@keyframes vp{50%{transform:scale(1.1)}}#vToast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(150px + env(safe-area-inset-bottom));z-index:9001;background:#111827;color:#fff;padding:9px 14px;border-radius:12px;font:14px system-ui,sans-serif;max-width:86vw;display:none;text-align:center;overflow-wrap:anywhere}[data-ved]{outline:1px dashed #60a5fa;outline-offset:2px}';
document.head.appendChild(css);
var toastEl=document.createElement('div');toastEl.id='vToast';document.body.appendChild(toastEl);var tt;
function toast(m){toastEl.textContent=m;toastEl.style.display='block';clearTimeout(tt);tt=setTimeout(function(){toastEl.style.display='none'},3500)}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
var APPS={'you got me bro':'scribe.html',scribe:'scribe.html',notes:'scribe.html',tasks:'scribe.html',desk:'desk.html',launcher:'index.html',apps:'index.html',home:'index.html','flow map':'map.html',map:'map.html',flow:'map.html',status:'status.html',video:'video.html',youtube:'video.html',findings:'findings.html','clean up':'cleanup.html',cleanup:'cleanup.html',audit:'cleanup.html',search:'desk.html#search='};
function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
function openApp(x){x=norm(x);if(APPS[x]){location.href='./'+APPS[x];return}
 var best=null;document.querySelectorAll('a[href]').forEach(function(a){if(!best&&norm(a.textContent).indexOf(x)>=0)best=a});
 if(best){toast('Opening '+best.textContent.trim().slice(0,40));best.click();return}
 for(var k in APPS)if(x.indexOf(k)>=0){location.href='./'+APPS[k];return}toast('No app called "'+x+'"')}
/* ---- edit-everywhere for static pages ---- */
var EDSEL={status:'li,h2',findings:'li,h2',cleanup:'.c b,.c p,.c .w,.box',video:'h1'};
var edOn=false,EK='realm_edit_'+page;
function edEls(){return EDSEL[page]?Array.prototype.slice.call(document.querySelectorAll(EDSEL[page])):[]}
function edRestore(){var d;try{d=JSON.parse(ls(EK)||'null')}catch(e){}if(!d)return;var els=edEls();if(d.n!==els.length)return;els.forEach(function(e,i){if(d.t[i]!=null)e.textContent=d.t[i]})}
function edSave(){var els=edEls();ls(EK,JSON.stringify({n:els.length,t:els.map(function(e){return e.textContent})}))}
function edToggle(on){edOn=on==null?!edOn:on;edEls().forEach(function(e){if(edOn){e.setAttribute('contenteditable','true');e.setAttribute('data-ved','1')}else{e.removeAttribute('contenteditable');e.removeAttribute('data-ved')}});var b=$('#vEd');if(b)b.classList.toggle('on',edOn);if(!edOn)edSave();toast(edOn?'Edit on: tap any line to change it':'Saved on this phone')}
function edFind(t){if(!edOn)edToggle(true);var x=norm(t),hit=null;edEls().forEach(function(e){if(!hit&&norm(e.textContent).indexOf(x)>=0)hit=e});if(hit){hit.focus();hit.scrollIntoView({block:'center'});toast('Editing: '+hit.textContent.slice(0,40))}else toast('Not found: '+t)}
/* ---- page hooks ---- */
var H={};
function toScribe(t){location.href='./scribe.html#add='+encodeURIComponent(t)}
function deskSearch(t){location.href='./desk.html#search='+encodeURIComponent(t)}
var last=null;function L(){if(!last)return null;var id=last.id;var f=(window.items||[]).filter(function(x){return x.id===id})[0];if(f)last=f;return f||null}
if(page==='scribe'){
 function sFind(t){var x=norm(t),r=null;(window.items||[]).forEach(function(i){if(!r&&norm(i.title).indexOf(x)>=0)r=i});return r}
 function cur(){return (window.draft&&document.getElementById('sheet').style.display==='flex')?'sheet':null}
 H.add=function(t){addItem(t);last=items[items.length-1];toast('Added: '+t)};
 H.edit=function(t){var i=sFind(t)||last;if(!i){toast('Not found: '+t);return}last=i;openEd(i)};
 H.done=function(t){var i=(t&&sFind(t))||L();if(!i){toast('Say "edit <item>" first');return}if(cur()){toast('Save or cancel first');return}i.done=true;persist();toast('Done: '+i.title)};
 H.assign=function(n){n=n.charAt(0).toUpperCase()+n.slice(1).toLowerCase();if(ON.indexOf(n)<0){toast('Owners: '+ON.join(', '));return}if(cur()){draft.owner=n;drawEd();toast('To '+n+' (say confirm to save)');return}if(!L()){toast('Say "edit <item>" first');return}last.owner=n;persist();toast(last.title+' → '+n)};
 H.confirm=function(){if(cur()){document.getElementById('eS').click();toast('Saved')}else toast('Nothing to confirm')};
 H.cancel=function(){if(cur()){document.getElementById('eC').click();toast('Cancelled')}else toast('Nothing open')};
 var m=location.hash.match(/^#add=(.+)/);if(m){var t=decodeURIComponent(m[1]);history.replaceState(null,'',location.pathname);setTimeout(function(){H.add(t)},0)}
}
if(page==='map'){
 function mFind(t){var x=norm(t),r=null;S.nodes.forEach(function(n){if(!r&&norm(n.title).indexOf(x)>=0)r=n});return r}
 H.add=function(t){$('#add').click();var n=S.nodes[S.nodes.length-1];n.title=t;save();draw();select(n.id);toast('Step added: '+t)};
 H.edit=function(t){var n=mFind(t);if(!n){toast('Not found: '+t);return}select(n.id);var e=document.getElementById('et');if(e)e.focus();toast('Editing: '+n.title)};
 H.done=function(t){var n=t?mFind(t):S.nodes.find(function(x){return x.id==sel});if(!n){toast('Say "edit <step>" first');return}n.done=true;save();draw();panel();toast('Done: '+n.title)};
 H.cancel=function(){var l=document.getElementById('lk');if(l)l.classList.add('hide');select(null);toast('Closed')};
}
if(page==='desk'){
 function dSearch(t){go('search',document.querySelectorAll('nav button')[TABIX.search]);$('#q').value=t;doSearch();toast('Searching: '+t)}
 H.search=dSearch;
 var m2=location.hash.match(/^#search=(.*)/);if(m2){var q=decodeURIComponent(m2[1]);history.replaceState(null,'',location.pathname);setTimeout(function(){if(q)dSearch(q);else go('search',document.querySelectorAll('nav button')[TABIX.search])},0)}
}
if(page==='video'){H.search=function(t){$('#q').value=t;$('#f').requestSubmit?$('#f').requestSubmit():$('#f').onsubmit(new Event('submit'))}}
if(EDSEL[page]){edRestore();H.edit=H.edit||edFind;H.confirm=H.confirm||function(){if(edOn)edToggle(false);else toast('Nothing to confirm')};H.cancel=H.cancel||function(){if(edOn){edOn=true;edToggle(false)}else toast('Nothing open')};
 var eb=document.createElement('button');eb.id='vEd';eb.type='button';eb.setAttribute('aria-label','Edit page');eb.innerHTML='&#9998;';eb.onclick=function(){edToggle()};document.body.appendChild(eb)}
/* ---- command parser ---- */
function run(raw){var s=norm(raw);toast('Heard: "'+raw+'"');var m;
 if(/\b(delete|remove|clear|wipe|erase)\b/.test(s)){setTimeout(function(){toast("Voice can't delete. Use the Delete button: two confirms + your PIN.")},900);return 'blocked'}
 if(m=s.match(/^(?:open|go to|show)\s+(.+)/)){openApp(m[1]);return 'open'}
 if(/^(go )?back$/.test(s)){if(history.length>1)history.back();else location.href='./';return 'back'}
 if(m=s.match(/^(?:add|new)\s+(.+)/)){var t=String(raw).replace(/^\s*(add|new)\s+/i,'');H.add?H.add(t):toScribe(t);return 'add'}
 if(m=s.match(/^edit\s+(.+)/)){H.edit?H.edit(m[1]):toast('Nothing to edit here');return 'edit'}
 if(m=s.match(/^(?:mark )?done(?:\s+(.+))?$/)||s.match(/^mark\s+(.+?)\s+done$/)){H.done?H.done(m[1]||''):toast('Nothing to tick here');return 'done'}
 if(m=s.match(/^(?:assign|give)(?: it)? to\s+(\w+)/)){H.assign?H.assign(m[1]):toast('Assign works in You Got Me Bro');return 'assign'}
 if(m=s.match(/^(?:search|find|look up)\s+(.+)/)){var q=String(raw).replace(/^\s*(search|find|look up)\s+(for\s+)?/i,'');H.search?H.search(q):deskSearch(q);return 'search'}
 if(/^(confirm|yes|save|ok)$/.test(s)){var pin=document.getElementById('pinx');if(pin&&pin.style.display!=='none'){toast('Type your PIN. Voice cannot enter it.');return 'blocked'}H.confirm?H.confirm():toast('Nothing to confirm');return 'confirm'}
 if(/^(cancel|stop|close|no)$/.test(s)){var pin2=document.getElementById('pinNo');if(pin2&&pin2.style.display!=='none'&&document.getElementById('pinx').style.display!=='none'){pin2.click();toast('Cancelled');return 'cancel'}H.cancel?H.cancel():toast('Nothing open');return 'cancel'}
 toast('Try: open, back, add, edit, done, assign to, search, confirm, cancel');return 'unknown'}
window.realmVoice=run;
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;
var b=document.createElement('button');b.id='vMic';b.type='button';b.setAttribute('aria-label','Voice');b.innerHTML='&#127908;';document.body.appendChild(b);
var rec=null;b.onclick=function(){if(rec){rec.stop();return}try{rec=new SR()}catch(e){b.style.display='none';return}rec.lang='en-AU';rec.interimResults=false;rec.maxAlternatives=1;
 rec.onresult=function(e){run(e.results[0][0].transcript)};rec.onerror=function(e){toast(e.error==='not-allowed'?'Mic blocked: allow it in Chrome settings':'Didn\'t catch that')};rec.onend=function(){rec=null;b.classList.remove('on')};
 b.classList.add('on');toast('Listening…');try{rec.start()}catch(e){rec=null;b.classList.remove('on')}};
})();
