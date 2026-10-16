/* ara-capture-rules.js: local brain-dump splitter + category guesser for capture.html (Ara, 16 Oct 2026).
   No AI, no keys: plain keyword rules. AraCapture.split(text) -> [strings]; AraCapture.guess(item) -> category key or '?'. */
(function(root){
  var CATS=[
    {k:'Task',l:'Task',e:'\u2705'},{k:'Note',l:'Note',e:'\uD83D\uDCDD'},{k:'Idea',l:'Idea',e:'\uD83D\uDCA1'},
    {k:'Feeling',l:'Feeling / Emotion',e:'\uD83D\uDC9C'},{k:'Job',l:'Job / Client',e:'\uD83C\uDFE2'},
    {k:'Purchase',l:'Purchase / Reorder',e:'\uD83D\uDED2'},{k:'Calendar',l:'Calendar',e:'\uD83D\uDCC5'},
    {k:'Nova',l:'Nova',e:'\uD83D\uDD37'},{k:'Build',l:'Build',e:'\uD83D\uDEE0\uFE0F'}];
  /* [regex, weight]. Word-boundary, case-insensitive. Highest total wins; ties go to the earlier category in ORDER. */
  var R={
    Nova:[[/\bnova\b/,5],[/\bgemini\b/,3]],
    Build:[[/\b(build|rebuild|deploy|coding|source code|script|apps? ?script|clasp|github|repo|pwa|webapp|web app|website|page|button|layout|feature|bug|widget|ui|dashboard|engine|api|endpoint|prototype)\b/,2],[/\b(app|apps)\b/,1.5],[/\bara\b/,1],[/\bfix (the|that|this) (app|page|button|script|bug|layout)\b/,3]],
    Calendar:[[/\b(today|tonight|tomorrow|tmrw|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thurs|fri|sat|sun|next week|this week|weekend|fortnight)\b/,2],[/\b(at|by|before|after) \d{1,2}(:\d{2})?\s?(am|pm)?\b/,2.5],[/\b\d{1,2}(:\d{2})?\s?(am|pm)\b/,2.5],[/\b(meeting|appointment|appt|booking|book in|schedule|reschedule|calendar|diary|deadline|birthday|anniversary|dentist|doctor|flight|catch ?up)\b/,2.5],[/\b\d{1,2}(st|nd|rd|th)?\s(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/,2.5]],
    Purchase:[[/\b(buy|bought|purchase|order|reorder|re-order|restock|top up|stock up|run(ning)? out|ran out|need more|low on|shopping|grocer(y|ies)|amazon|bunnings|officeworks|acorn|ebay|coles|woolies|woolworths|aldi|kmart|jb ?hi-?fi)\b/,3],[/\b(strings|morning fresh|detergent|supplies|toner|batteries|refill)\b/,2]],
    Job:[[/\b(client|customer|invoice|invoices|quote|quotes|estimate|cert|certs|certificate|essential safety|esm|annual report|inspection|inspect|site visit|site|job|jobs|work order|wo|strata|owners? corp(oration)?|oc|building manager|facility|tenant|mbcm|ace|ignite|select|chevron|knight|zoho|xero|deputy|julie|tech|technician|sub ?contractor|tender|rft)\b/,2.2],[/\b(pay|paid|chase|overdue|debtor)s?\b/,1]],
    Feeling:[[/\b(i feel|i'm feeling|im feeling|feeling|felt|feel)\b/,3],[/\b(stressed|stress|anxious|anxiety|worried|worry|scared|afraid|angry|pissed|frustrated|frustrating|annoyed|sad|down|depressed|lonely|tired|exhausted|burnt out|burned out|overwhelmed|happy|grateful|thankful|proud|excited|stoked|love|hate|hurt|upset|calm|relieved|guilty|ashamed|jealous|nervous|motivated|flat|gutted|buzzing)\b/,2.5],[/\b(emotion|emotional|mood|mental health|heart)\b/,2]],
    Idea:[[/\b(idea|ideas|what if|imagine|maybe we|we could|could we|how about|concept|brainstorm|invent|thought:|shower thought|wouldn't it be|would be cool|would be good|one day)\b/,5]],
    Task:[[/\b(need to|needs to|have to|has to|got to|gotta|must|should|remember to|don't forget|dont forget|make sure|todo|to do|to-do)\b/,2.5],[/^(call|ring|email|text|message|send|reply|fix|check|chase|pay|follow up|sort|sort out|clean|organise|organize|finish|submit|upload|update|cancel|renew|book|pick up|drop off|ask|tell|get|find|print|sign|file|review|prepare|post|install|move|return)\b/,2.5],[/\b(call|ring|email|chase|follow up|sort out|pick up|drop off)\b/,1.2]],
    Note:[[/\b(note to self|fyi|for the record|remember that|reminder that|keep in mind)\b/,6],[/\b(note|notes|noted|log|info)\b/,3],[/^(the|my|our|his|her)\b.{0,40}\b(is|are|was|were)\b/,1.6]]
  };
  var ORDER=['Nova','Calendar','Purchase','Job','Feeling','Build','Idea','Task','Note'];
  function guess(s){var t=' '+String(s||'').toLowerCase().replace(/[\u2019]/g,"'")+' ',best='?',bs=0,tt=t.trim();
    ORDER.forEach(function(k){var sc=0;R[k].forEach(function(p){var re=p[0],n;if(re.source.charAt(0)==='^')n=re.test(tt)?1:0;else n=Math.min(3,(t.match(new RegExp(re.source,'g'))||[]).length);sc+=n*p[1]});if(sc>bs){bs=sc;best=k}});
    return bs>=1.5?best:'?'}
  var SPOKEN=/\s*\b(?:next thing|next item|new item|new line|next one|full stop|period|another thing)\b[,.]?\s*/gi;
  function split(text){var s=String(text||'').replace(/\r/g,'').replace(SPOKEN,'\n');
    var out=[];s.split(/\n+/).forEach(function(line){
      line=line.replace(/^\s*(?:[-*\u2022\u25AA>]+|\d+[.)]|\[ ?\])\s*/,'').trim();if(!line)return;
      /* protect abbreviations, then break after . ! ? (and ; ) followed by a space */
      var p=line.replace(/\b(Mr|Mrs|Ms|Dr|St|Rd|Ave|No|vs|etc|approx|e\.g|i\.e|a\.m|p\.m)\./gi,function(m){return m.replace(/\./g,'\u2024')});
      p.split(/(?<=[.!?;])\s+(?=\S)/).forEach(function(x){x=x.replace(/\u2024/g,'.').replace(/^[\s,;:.-]+|[\s,;]+$/g,'').trim();if(x.replace(/[^\w]/g,'').length>=2)out.push(x)})});
    return out}
  var API={CATS:CATS,guess:guess,split:split,label:function(k){for(var i=0;i<CATS.length;i++)if(CATS[i].k===k)return CATS[i].l;return '?'},emoji:function(k){for(var i=0;i<CATS.length;i++)if(CATS[i].k===k)return CATS[i].e;return '\u2753'}};
  root.AraCapture=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
