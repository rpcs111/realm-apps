/* app-shell-config.js: the per-app list for js/app-shell.js (29 Oct 2026, local build).
   Per app: page, name, icon, start, checks ("You can check ..."), whyNot (what isn't working yet and plainly why),
   amend (cards that get a pencil and a 600ms hold; label is "App · kind · number", never card text), hide (old buttons).
   A whyNot line can have sel (also shown next to that element) and when (only shown while it's true).
   Keep the words plain: no codes, versions or ids on screen. */
window.APP_SHELL_CONFIG={
 defaults:{
  hide:['#araSaveRow','#araSave','#araTip','#araHint'],
  whyNot:[
   {what:'Answers from the bots',why:'They don\u2019t show in the app yet, because Ara\u2019s inbox can\u2019t send answers back to the phone. A sent note shows as Sent once the inbox has it.'}
  ]
 },
 apps:{
  search:{
   page:'search.html',name:'Search Studio',icon:'pwa/searchstudio-cube-192.png?v=20261029-1',start:'./search.html?app=search',
   checks:['last week and next week\u2019s jobs','the path each amend takes'],
   amend:[{sel:'#weeks',kind:'week view'},{sel:'#amendPath',kind:'amend path'},{sel:'#tips',kind:'search tips',pen:false}],
   /* Pick up where you left off: a search is one job. It starts when something is typed and stays open while it's on screen.
      It's finished when the box is cleared, Show all is tapped, or a new search replaces it. Leaving the app with one open
      puts it on the list; Pick up brings back the words, the tab, the week and the place on the page, and runs it again if it had been run. */
   resume:{setup:function(R){
    R.register('search',{name:'Search Studio',page:'search.html'});
    var q=document.getElementById('q');if(!q)return;
    var key=null,ran='',shift=0,t=0;
    function tab(){var b=document.querySelector('.rui-tab[data-k].on,.rui-tab[data-k][aria-selected="true"]');return b?b.getAttribute('data-k'):''}
    function v(){return (q.value||'').trim()}
    function where(){return ran&&ran===v()?'Looking at the results':'Typed, not searched yet'}
    function collect(){return {step:ran&&ran===v()?'results':'typing',stepLabel:where(),fields:{q:q.value},ran:ran,tab:tab(),shift:shift,scroll:R.scroll.collect()}}
    function open(){if(!key){key='s_'+Date.now().toString(36);R.begin('search',key,{collect:collect})}
      R.save('search',key,collect(),{title:'Search: '+v(),where:where()})}
    function finish(){if(key){R.done('search',key);key=null}ran=''}
    function changed(){clearTimeout(t);t=setTimeout(function(){if(!v())finish();else open()},250)}
    q.addEventListener('input',changed);
    function run(){var x=v();if(!x)return;if(key&&ran&&ran!==x){finish()}ran=x;open()}
    var gb=document.getElementById('goBtn');if(gb)gb.addEventListener('click',run,true);
    q.addEventListener('keydown',function(e){if(e.key==='Enter'||e.keyCode===13)run()},true);
    var f=document.getElementById('f');if(f)f.addEventListener('submit',run,true);
    var p=document.getElementById('wkPrev'),n=document.getElementById('wkNext'),sa=document.getElementById('showAll');
    if(p)p.addEventListener('click',function(){shift--;if(key)open()});if(n)n.addEventListener('click',function(){shift++;if(key)open()});
    if(sa)sa.addEventListener('click',function(){finish()});
    document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.rui-tab[data-k]');if(b&&key)setTimeout(open,50)});
    addEventListener('scroll',function(){if(key){clearTimeout(t);t=setTimeout(open,400)}},{passive:true});
    R.restore('search',function(st,rec){key=rec.jobKey;q.value=(st.fields&&st.fields.q)||'';
      var k=st.shift||0;while(k<0&&p){p.click();k++}while(k>0&&n){n.click();k--}
      if(st.tab){var b=document.querySelector('.rui-tab[data-k="'+st.tab+'"]');if(b)b.click()}
      if(st.ran&&st.ran===v()&&gb){ran=st.ran;gb.click();
        var tries=0;(function w(){var o=document.getElementById('out');if(o&&o.children.length||tries++>40){R.scroll.apply(st.scroll);return}setTimeout(w,200)})()}
      else{try{q.focus()}catch(e){}R.scroll.apply(st.scroll)}
      R.begin('search',key,{collect:collect});return false});
   }},
   whyNot:[
{what:'Picking up on another phone',why:'Unfinished jobs are kept on this phone only. Picking up on another phone or computer, or seeing Desk and Cert Studio jobs here, needs the Google sign-in set up for it.'},
    {what:'Search results',why:'Search needs the Realm key on this phone, so results can\u2019t load until it\u2019s added.',when:function(){var e=document.getElementById('rkLine');return !!(e&&!e.hidden)}},
    {what:'Answers from the bots',why:'They don\u2019t show in the app yet, because Ara\u2019s inbox can\u2019t send answers back to the phone. A sent note shows as Sent once the inbox has it.'}
   ]
  },
  map:{
   page:'map.html',name:'Flow Map',icon:'pwa/flowmap.svg?v=20261017-24',start:'./map.html?app=map',
   hide:['#araSaveRow','#araSave','#araTip','#araHint','#sbBar span'],
   checks:['every step and its colour','what each step is waiting on'],
   amend:[{sel:'#list .card',kind:'step card'},{sel:'g.node',kind:'bubble',pen:false},{sel:'#sheet',kind:'open step'}],
   whyNot:[
    {what:'Notes saved on the Flow Map itself',why:'Saving notes to the Flow Map needs the Google side updated. Until then, notes here go to Ara\u2019s inbox instead.'},
    {what:'Tap a step to add a note',why:'The newer Flow Map that does this passed its check but isn\u2019t live yet.'},
    {what:'Answers from the bots',why:'They don\u2019t show in the app yet, because Ara\u2019s inbox can\u2019t send answers back to the phone. A sent note shows as Sent once the inbox has it.'}
   ]
  },
  notes:{
   page:'notes.html',name:'Note',icon:'pwa/star-note-192.png?v=20261026-1',start:'./notes.html?app=notes',
   checks:['your notes and Ange\u2019s to do list','what\u2019s waiting to be picked up'],
   amend:[{sel:'#notes > li',kind:'note',skip:'.empty'},{sel:'#puBody li',kind:'pick-up row',skip:'.empty'},{sel:'#tasks li',kind:'to-do',skip:'.empty'},{sel:'#angeTodo',kind:'Ange to do list',pen:false},{sel:'#pickup',kind:'pick-up list',pen:false}],
   whyNot:[
    {what:'Google Tasks',why:'They haven\u2019t loaded on this phone yet. Connect them once in To do.',when:function(){var e=document.getElementById('gtConnect');return !!(e&&!e.hidden)}},
    {what:'Answers from the bots',why:'They don\u2019t show in the app yet, because Ara\u2019s inbox can\u2019t send answers back to the phone. A sent note shows as Sent once the inbox has it.'}
   ]
  },
  desk:{
   page:'desk-app.html',name:'Desk',icon:'pwa/star-desk-192.png?v=20261026-1',start:'./desk-app.html?app=desk-app',openFrom:'#go',
   checks:['the job board (tap Open)','the Desk icon on this phone (tap Save app)'],
   amend:[{sel:'main',kind:'Desk launcher'},{sel:'.rz-list li',kind:'unfinished job',pen:false}],
   resumeList:{at:'main',how:'after',heading:'Pick up where you left off'},
   whyNot:[
    {what:'This bar inside the job board',why:'The Desk job board is a Google page, so Notes, Amend and Talk only show here on the launcher. Adding them inside needs the Desk Google script updated as info@.'},
    {what:'Desk\u2019s own unfinished jobs here',why:'Desk runs on a Google page that keeps its own list, so its unfinished jobs show inside Desk, not here. When the Desk icon opens straight into Desk, this list is skipped.'},
    {what:'Picking up on another phone',why:'Unfinished jobs are kept on this phone only. Picking up on another phone or computer, or seeing Desk and Cert Studio jobs here, needs the Google sign-in set up for it.'},
    {what:'Desk crash fix and Amend',why:'They\u2019re built and being checked, but not live. Going live needs the info@ sign-in and Ange\u2019s yes.'},
    {what:'Answers from the bots',why:'They don\u2019t show in the app yet, because Ara\u2019s inbox can\u2019t send answers back to the phone. A sent note shows as Sent once the inbox has it.'}
   ]
  },
  deck:{
   page:'deck.html',name:'Deck',icon:'pwa/star-deck-192.png?v=20261026-1',start:'./deck.html?app=deck',
   checks:['what changed and when','your asks and where they\u2019re up to'],
   amend:[{sel:'.card',kind:'card',skip:'.rz-list'},{sel:'.rz-list li',kind:'unfinished job',pen:false}],
   resumeList:{at:'#intro',how:'after',heading:'Pick up where you left off'},
   whyNot:[
    {what:'Picking up on another phone',why:'Unfinished jobs are kept on this phone only. Picking up on another phone or computer, or seeing Desk and Cert Studio jobs here, needs the Google sign-in set up for it.'},
    {what:'Answers from the bots',why:'They don\u2019t show in the app yet, because Ara\u2019s inbox can\u2019t send answers back to the phone. A sent note shows as Sent once the inbox has it.'}
   ]
  },
  certstudio:{
   /* PLAN ONLY: certstudio.html is a protected page and doesn't load this file yet. */
   page:'certstudio.html',name:'Cert Studio',icon:'pwa/certstudio.svg',start:'./certstudio.html?go=1',
   hide:['#araSaveRow','#araSave','#araTip','#araHint','#sbBar span'],
   checks:['the cert opens straight into Cert Studio','the site, client and due date boxes'],
   amend:[{sel:'main',kind:'Cert Studio launcher'}],
   whyNot:[
{what:'Picking up on another phone',why:'Unfinished jobs are kept on this phone only. Picking up on another phone or computer, or seeing Desk and Cert Studio jobs here, needs the Google sign-in set up for it.'},
    {what:'Cert Studio opens in Google',why:'It needs Chrome signed in as info@, or it asks you to sign in.'},
    {what:'The newer Cert Studio',why:'The easier-to-read headings and bigger buttons are built and being checked, but aren\u2019t live. Going live needs the info@ sign-in and Ange\u2019s yes.'},
    {what:'Answers from the bots',why:'They don\u2019t show in the app yet, because Ara\u2019s inbox can\u2019t send answers back to the phone. A sent note shows as Sent once the inbox has it.'}
   ]
  }
 }
};
