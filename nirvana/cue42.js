(function(){
  var errs=window.__nvErrs||(window.__nvErrs=[]);
  function same(u){try{var x=new URL(u,location.href);if(x.origin!==location.origin)return null;if(x.protocol!=="http:"&&x.protocol!=="https:")return null;return x.href}catch(e){return null}}
  async function run(){
    var fails=[];
    if(document.readyState==="loading")fails.push("page not loaded");
    var imgs=[].slice.call(document.images);
    for(var i=0;i<imgs.length;i++){
      var im=imgs[i];
      if(!im.complete)await new Promise(function(res){im.addEventListener("load",res,{once:true});im.addEventListener("error",res,{once:true})});
      var src=im.getAttribute("src")||"";
      if(src.indexOf("data:")===0){if(!im.complete)fails.push("icon "+src.slice(0,24))}
      else if(!(im.naturalWidth>0))fails.push("icon "+src);
    }
    var seen={};
    var icons=[].slice.call(document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]'));
    for(var j=0;j<icons.length;j++){
      var href=icons[j].getAttribute("href");var abs=same(href);if(!abs||seen[abs])continue;seen[abs]=1;
      try{var r=await fetch(abs,{method:"HEAD",cache:"no-store"});if(!r.ok)fails.push("icon "+r.status+" "+href)}catch(e){fails.push("icon "+href)}
    }
    var as=[].slice.call(document.querySelectorAll("a[href]"));
    for(var k=0;k<as.length;k++){
      var href2=as[k].getAttribute("href");var abs2=same(href2);if(!abs2||seen[abs2])continue;seen[abs2]=1;
      try{var r2=await fetch(abs2,{method:"HEAD",cache:"no-store"});if(!r2.ok)fails.push("link "+r2.status+" "+href2)}catch(e2){fails.push("link "+href2)}
    }
    if(errs.length)fails=fails.concat(errs.map(function(x){return "console "+x}));
    var text=fails.length?fails.join(" · "):"The answer is 42 · PASS";
    var toast=document.getElementById("cueToast");
    if(toast){toast.hidden=false;toast.className="cue-toast "+(fails.length?"fail":"pass");toast.textContent=text}
    var st=document.getElementById("flowMapStatus");
    if(st)st.textContent=text;
    return text;
  }
  function cueText(v){v=String(v||"").trim().toLowerCase();return v==="42"||v==="42 is the answer"}
  document.addEventListener("input",function(ev){
    var el=ev.target;if(!el||(el.tagName!=="INPUT"&&el.tagName!=="TEXTAREA"))return;
    var blob=((el.id||"")+" "+(el.name||"")+" "+(el.getAttribute("placeholder")||"")+" "+(el.getAttribute("aria-label")||"")+" "+(el.type||"")).toLowerCase();
    if(!/search|command|amend/.test(blob))return;
    if(cueText(el.value))run();
  });
  var chip=document.getElementById("cue42");if(chip)chip.addEventListener("click",function(){run()});
  var flowA=document.querySelector('a[href="flow.html"]');
  if(flowA)flowA.addEventListener("click",function(ev){
    ev.preventDefault();
    run().then(function(){location.href=flowA.href});
  });
  window.__nvCue42=run;
})();
