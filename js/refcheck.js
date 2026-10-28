/* refcheck.js: ONE check for codes, links, emails and file names in anything Ange types on Deck (29 Oct 2026, LOCAL TEST COPY).
   Used by the Amend box and the "Why do you disagree?" box (js/history.js noteBox runs it on every note before it is sent,
   and js/verdict.js runs it again in its own check). Same rules the History Log scrub refuses (deck_history scrub.py):
   1. any @, or an email spelled out ("name at site dot com");
   2. PR, pull/ or # followed by a number ("PR 55", "#55 merged", "pull/55", "pull request 55");
   3. hex hashes as a whole word: 7 or more of 0-9 a-f with a digit ("a8f09dc"), or 8 or more letters a-f with no digit
      ("deadbeef"). Real all-a-to-f English words are 7 letters at most (acceded, defaced, effaced), so they still pass,
      and words like "feedback" or "accepted" have other letters and never match;
   4. links: http, https, www., or a name.tld ("realmpcs.com", "script.google.com");
   5. file paths and file names: ~/, a leading /, a backslash path,
      3 or more slash-separated parts ("notes/a/b"), or name.ext ("verdict.js", "src/Code.js", "a.txt").
      Also (r4): a leading ./ or ../, a file: link, a /.dotfile, word/word.ext with any 2-6 letter extension ("src/App.jsx",
      "nirvana/data.enc"), and word/word when the first part is a repo folder (js, gas, src, app, nirvana, tools, test,
      release, brain, workspace, home: "js/verdict", "gas/Code").
      Also (r5): the repo-folder list is every real top-level folder and first-level subfolder of the repo plus fixed names
      (FOLDERS below, made by tools/refcheck_folders.py), a drive path ("C:/Users", "Q:\\x"), %VAR%\ paths, and
      repo names (origin/gh-pages, rpcs111/realm-apps, rpcs111/<repo>). "Elon/Builder" and "the bin/skip" are refused too (safe side).
      r6: every slash rule has a backslash twin (.\x, ..\secrets, x\.env, \x, ~\x, js\verdict, origin\main), and FOLDERS is the
      repo's top-level folders only (subfolder names like screens, mirror, brand blocked crew words; their paths are caught by the top folder).
      Other two words with one slash are plain words, not a path: front/back, 1/2, 24/7, and/or, yes/no all pass.
   A refused note is not stored and not sent; the box shows MSG. No key, token or secret is in this file. */
(function(){"use strict";
if(window.RefCheck)return;
var MSG="No codes, links, emails or file names, please.";
var TLD="com|net|org|io|au|app|dev|co|me|gov|edu|info|biz|xyz|ly|gl|page|site|uk|nz|ai|so|sh|gg|tv|us|ca|google|cloud|link|online|store|tech|github";
var EXT="js|mjs|cjs|ts|html?|css|json|md|txt|py|csv|tsv|pdf|png|jpe?g|gif|webp|svg|gs|sh|xlsx?|docx?|pptx?|zip|webmanifest|ya?ml|log|patch|diff|key|pem|env|ini|cfg|sql|xml|rtf|odt|ods|heic|mov|mp4|mp3|wav|m4a";
/* FOLDERS-BEGIN: made by tools/refcheck_folders.py from the repo's real top-level folders; rerun it, don't hand-edit */
var FOLDERS=[".cursor","app","bin","brain","brief","css","docs","elon","etc","gas","grok-howto","home","img","js","nirvana","node_modules","pwa","release","src","test","tests","tmp","tools","users","usr","v","var","workspace"];
/* FOLDERS-END */
var RULES=[
 ["email",/@|\b[\w.+-]+\s+at\s+[\w-]+\s+dot\s+(?:com|au|net|org)\b/i],
 ["pr ref",/#\s*\d|\bpr\s*#?\s*\d|\bpull\s*[\/\\]\s*\d|\bpull\s+request\s*#?\s*\d|\bpulls?[\/\\]|\bcommit\s+[0-9a-f]{4,}\b/i],
 ["hash",/(?:^|[^0-9a-z])(?:(?=[0-9a-f]*\d)[0-9a-f]{7,}|[a-f]{8,})(?![0-9a-z])/i],
 ["link",new RegExp("https?:|\\bwww\\.|\\b[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:"+TLD+")\\b","i")],
 ["file",new RegExp("~[\\/\\\\]|(?:^|\\s)[\\/\\\\][a-z0-9_.~-]|[a-z0-9_]\\\\[a-z0-9_]|\\b[\\w-]+\\.(?:"+EXT+")\\b","i")],
 ["file",/(?:^|[^\w.])\.{1,2}[\/\\]|\bfile:|[\/\\]\.[a-z0-9]|[\w-]+[\/\\][\w-]+\.[a-z][a-z0-9]{1,5}\b/i],
 ["file",new RegExp("(?:^|[^\\w.\\/\\\\-])(?:"+FOLDERS.map(function(f){return f.replace(/[.\-]/g,"\\$&")}).join("|")+")[\\/\\\\][\\w.~-]","i")],
 ["file",/(?:^|[^\w])[a-z]:[\/\\]|%\w+%[\\\/]/i],
 ["repo",/\brpcs111[\/\\]|\brealm-apps\b|\borigin[\/\\][\w.-]/i]
];
function norm(s){s=String(s==null?"":s);try{s=s.normalize("NFKC")}catch(e){}
 return s.replace(/[\u200b-\u200d\u2060\ufeff]/g,"").replace(/[\uff20\ufe6b]/g,"@").replace(/\u2215|\u2044|\uff0f/g,"/")}
function slashHit(s){var m=s.match(/[a-z0-9_.~-]+(?:\/[a-z0-9_.~-]+){2,}/i);return m?m[0]:""}
/* why(s): "" when the note is fine, else the rule name that refused it */
function why(s){s=norm(s);if(!s.trim())return "";
 for(var i=0;i<RULES.length;i++)if(RULES[i][1].test(s))return RULES[i][0];
 return slashHit(s)?"file":""}
window.RefCheck={MSG:MSG,why:why,blocked:function(s){return !!why(s)}};
})();
