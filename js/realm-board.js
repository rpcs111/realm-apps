/* Realm board (Ara) - shared model for queue.html (Layer 1) and mapper.html (live paste).
   One board, one key: localStorage "realm_queue_v1". Both pages read and write the same object.
   No network calls. Nothing leaves this browser. 16 Oct 2026. */
(function(){
'use strict';
var KEY='realm_queue_v1';
/* Booking status buttons, in Ange's order. Ids unchanged from Layer 1 so old boards keep their chips. */
var STAT=[['keys','Waiting for keys','st-keys'],['booked','Booked','st-booked'],['await','Awaiting confirmation','st-await'],['conf','Confirmed','st-conf'],['van','Assigned van','st-van'],['staff','Assigned staff','st-staff']];
var TYPES={job:'Job',task:'Task',staff:'Staff',step:'Core step',system:'System',centre:'Centre',app:'App',action:'App button'};
var REG='https://docs.google.com/spreadsheets/d/1REJWxu7oD3MY9z7TCPsv-OznnPTu1lAHsONMlU8refM/edit';
var CAL='https://calendar.google.com/calendar/u/0/r?authuser=info@realmpcs.com';
/* Core steps, in flow order. src = where the step was found (15 Oct sources). kw = smart-paste keywords. */
var STEPS=[
 {id:'step_enquiry',name:'Enquiry',url:'https://mail.google.com/mail/u/0/#inbox',note:'Email / work order / call / WhatsApp comes in.',kw:['enquiry','enquire','work order','workorder','wo ','request','new client','lead','call from']},
 {id:'step_quote',name:'Quote',url:'https://books.zoho.com/app#/quotes',note:'Estimate in Zoho Books (EST-).',kw:['quote','estimate','est-','pricing','price']},
 {id:'step_followup',name:'Follow-up',url:'./scribe.html',note:'Chase the quote / re-quote.',kw:['follow up','follow-up','followup','chase quote','re-quote','requote','no reply']},
 {id:'step_booking',name:'Booking',url:CAL,note:'Booked into Google Calendar (the centre). Statuses: keys / booked / awaiting / confirmed / van / staff.',kw:['booking','book in','booked','date','reschedule','moved to','diary']},
 {id:'step_roster',name:'Rostering',url:'',note:'Deputy roster, look-only. Nobody edits shifts (one-touch payroll).',kw:['roster','rostering','shift','deputy','crew','who is on']},
 {id:'step_0',name:'Job',url:'',note:'Job card / job day (calendar notes template: hours, site contact, scope, access, equipment, parking, last INV, WhatsApp, last cert).',kw:['job card','job day','on site','onsite','scope','access','parking','completed','job sheet']},
 {id:'step_1',name:'Cert',url:'https://script.google.com/macros/s/AKfycbwFil-RiQujoffiDoBnGk6YvjLuyr1vaqCQKVUPtWT9NmGVQryPcwEsjIlieL93Yps/exec',note:'',kw:['cert','certificate','recert','re cert','anchor test','load test','inspection due']},
 {id:'step_2',name:'Invoice',url:'https://books.zoho.com/',note:'',kw:['invoice','inv-','bill ','billed','raise inv']},
 {id:'step_3',name:'Outstanding',url:REG,note:'',kw:['outstanding','overdue','owed','owing','statement','balance','debtor','chase']},
 {id:'step_remit',name:'Remittance',url:'',note:'Payment / remittance in info@ closes the invoice.',kw:['remittance','remit','paid','payment received','eft','deposit']},
 {id:'step_4',name:'P&L',url:'https://docs.google.com/spreadsheets/d/1HXLRRgHZJDHSj0p_dp3WHgHO-6-Rxg8s/edit',note:'',kw:['p&l','pnl','profit','margin','labour cost','cost']},
 {id:'step_5',name:'Close',url:'',note:'',kw:['close','closed','close out','close-out','done','finished']},
 {id:'step_rebook',name:'Rebook',url:'',note:'Next due date / recurring rebook (not built yet).',kw:['rebook','next due','recurring','annual','12 months','next year']}
];
var SYS=[
 {id:'sys_gcal',type:'centre',name:'Google Calendar',url:CAL,note:'The single centre and source of truth. Bookings live here.',kw:['calendar','gcal','diary']},
 {id:'sys_deputy',type:'system',name:'Deputy (look-only)',url:'https://www.deputy.com/',note:'Look-only. Its own system, not merged with Google Tasks.',kw:[]},
 {id:'sys_gtasks',type:'system',name:'Google Tasks',url:'https://tasks.google.com/',note:'Its own system, not merged with Deputy.',kw:['google task','gtask','to do','todo']},
 {id:'sys_overlay',type:'system',name:'Google Tasks overlay (reference)',url:'https://docs.google.com/spreadsheets/d/1JXjBlr019zrZpNmEpI_a1ZqZ3EFwc5O0HOKbXae2hsg/edit',note:'Reference sheet only. Not merged into Google Tasks.',kw:[]}
];
/* Chain + centre links */
var EDGES=[['step_enquiry','step_quote'],['step_quote','step_followup'],['step_followup','step_booking'],['step_booking','sys_gcal'],['sys_gcal','step_roster'],['step_roster','sys_deputy'],['sys_gcal','step_0'],['step_roster','step_0'],['step_0','step_1'],['step_1','step_2'],['step_2','step_3'],['step_3','step_remit'],['step_remit','step_4'],['step_4','step_5'],['step_5','step_rebook']];
/* Service checklists, verbatim from the sheet "services and steps for job card and quotes" (1731nkVw...), read-only. */
var SERVICES={"Anchor certification":["new Cert","re cert","load tester","Harness","tags","tools and fixxings","mark up needed","last cert attched","rope access","a frame","hatch","external access","access via","codes","realm has keys","SMWS","issues","job completed","fill onsite"],"Rope access":["kits","crane slings","wfp kit","cross brace","spotter","additional ropes","anchor test via ropes","8 m ladder","aframe","surveyors","corking kits","chasulking","inspections report","codes","meet on site","car pool","parking","van3 rope","van4","realm has keys","SMWS","issues","job completed","need stock rubbers"],"Gutter cleaning":["hand tools","ppe","rubbish nin on site","take rubbish off site","blowers 1","anchor sytem","spotter","sharness","gutter vac","8 m ladder","roof hatch","access ladder int ext","report","van1","van2","kia truck","meet onsite","realm has keys","SMWS","issues","job completed"],"Window cleaning":["van1","van2","ute","meet onsite","80 ft pole","quatro","no water","taps","power","internal","long poles","towels","soap","plat forms ladder","time limits","cleart way s","parking","ramps","extra bollard s","mop and bucket","wet vac","realm has keys","SMWS","issues","job completed"],"Pressure washing":["kia ruck and rinse kit","van1","van2","4000psi pw","pw poles","wet vac","blowers 1","blowers 2","site plan","rinse only ares","realm has keys","SMWS","issues","job completed"],"Quotes":["SMWS","issues","job completed","decline","site visit needed","anchor system","Machine hire needed","permits","serices"]};
var W=1900,H=1050;
/* New board layout */
var POS={step_enquiry:[40,40],step_quote:[180,40],step_followup:[320,40],step_booking:[470,40],step_roster:[620,40],step_0:[780,40],step_1:[900,40],step_2:[1020,40],step_3:[1150,40],step_4:[1430,40],step_remit:[1290,40],step_5:[1560,40],step_rebook:[1680,40],
 sys_gcal:[660,170],sys_deputy:[40,150],sys_gtasks:[250,150],sys_overlay:[1000,170]};
/* Where new nodes go on a Layer 1 board (free space right of the old layout) */
var MPOS={step_enquiry:[1080,40],step_quote:[1220,40],step_followup:[1360,40],step_booking:[1510,40],step_roster:[1660,40],step_remit:[1080,130],step_rebook:[1240,130],sys_gcal:[600,240]};
function mk(d,type,p){return {id:d.id,type:type||d.type||'step',name:d.name,x:p[0],y:p[1],url:d.url||'',status:[],note:d.note||''}}
function seed(){
 var n=STEPS.map(function(d){return mk(d,'step',POS[d.id])});
 SYS.forEach(function(d){n.push(mk(d,d.type,POS[d.id]))});
 n.push({id:'job_example',type:'job',name:'New job (rename me)',x:40,y:260,url:'',status:['await'],note:''});
 var e=EDGES.map(function(p){return {a:p[0],b:p[1]}});
 return {v:2,nodes:n,edges:e,seq:1};
}
function byId(S,id){for(var i=0;i<S.nodes.length;i++)if(S.nodes[i].id===id)return S.nodes[i];return null}
/* Migrate an old board in place. Never wipes: only adds what's missing, once. */
function migrate(S){
 if(!S||!S.nodes||!S.edges)return seed();
 var changed=false;
 S.nodes.forEach(function(n){if(!Array.isArray(n.status)){n.status=[];changed=true}if(n.note==null){n.note='';changed=true}if(n.url==null){n.url='';changed=true}});
 if((S.v||1)<2){
  STEPS.concat(SYS).forEach(function(d){if(!byId(S,d.id)){var p=MPOS[d.id]||POS[d.id];S.nodes.push(mk(d,d.type||'step',p))}});
  var j=byId(S,'step_0');if(j&&!j.note)j.note=STEPS[5].note;
  EDGES.forEach(function(p){if(byId(S,p[0])&&byId(S,p[1])&&!S.edges.some(function(e){return(e.a===p[0]&&e.b===p[1])||(e.a===p[1]&&e.b===p[0])}))S.edges.push({a:p[0],b:p[1]})});
  S.v=2;S.migratedFrom1=new Date().toISOString();changed=true;
 }
 S._changed=changed;return S;
}
function load(){var S=null;try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}S=migrate(S);var c=S._changed;delete S._changed;if(c)save(S);return S}
function save(S){S.saved=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(S))}
function kwOf(n){var all=STEPS.concat(SYS);for(var i=0;i<all.length;i++)if(all[i].id===n.id)return all[i].kw||[];return[]}
function stamp(d){d=d||new Date();var M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];function z(x){return(x<10?'0':'')+x}return d.getDate()+' '+M[d.getMonth()]+' '+d.getFullYear()+' '+z(d.getHours())+':'+z(d.getMinutes())}
/* File pasted text into a node's notes, timestamped. Returns the node. */
function file(S,id,text,src){var n=byId(S,id);text=String(text||'').trim();if(!n||!text)return null;var d=new Date();
 n.pastes=n.pastes||[];n.pastes.push({t:d.toISOString(),text:text,src:src||'paste'});
 n.note=(n.note?n.note.replace(/\s+$/,'')+'\n\n':'')+'['+stamp(d)+'] '+text;return n}
function norm(s){return String(s||'').toLowerCase().replace(/&amp;/g,'&').replace(/[^a-z0-9&\- ]+/g,' ').replace(/\s+/g,' ').trim()}
var STOP={st:1,rd:1,street:1,road:1,ave:1,the:1,and:1,new:1,job:1,place:1,pl:1,way:1,lane:1,ln:1,dr:1,rename:1,me:1,of:1};
/* Smart paste: rank nodes for a pasted text. Name/address matches beat step keywords. */
function suggest(S,text,max){
 var t=' '+norm(text)+' ',out=[];if(t.trim().length<2)return out;
 S.nodes.forEach(function(n){
  var nm=norm(n.name),sc=0,why='';if(!nm)return;
  if(nm.length>=3&&t.indexOf(' '+nm+' ')>=0){sc+=60+nm.length;why='name'}
  else if(nm.length>=3&&t.indexOf(nm)>=0){sc+=40+nm.length;why='name'}
  else{var w=nm.split(' ').filter(function(x){return x.length>=3&&!STOP[x]||/^\d+[a-z]?$/.test(x)}),hit=0,num=0;
   w.forEach(function(x){if(t.indexOf(' '+x+' ')>=0||t.indexOf(' '+x)>=0){hit++;if(/^\d/.test(x))num++}});
   if(w.length&&hit){sc+=Math.round(30*hit/w.length)+(num&&hit>num?15:0);why='words'}}
  kwOf(n).forEach(function(k){var kk=norm(k);if(kk&&t.indexOf(kk.length<4?' '+kk+' ':kk)>=0){sc+=12;why=why||'keyword: '+k}});
  if(n.type==='job'&&sc&&why&&why.indexOf('keyword')!==0)sc+=5;
  if(sc>0)out.push({id:n.id,name:n.name,type:n.type,score:sc,why:why});
 });
 out.sort(function(a,b){return b.score-a.score});return out.slice(0,max||5);
}
window.RealmBoard={KEY:KEY,STAT:STAT,TYPES:TYPES,STEPS:STEPS,SYS:SYS,SERVICES:SERVICES,W:W,H:H,seed:seed,migrate:migrate,load:load,save:save,byId:byId,file:file,suggest:suggest,stamp:stamp};
})();
