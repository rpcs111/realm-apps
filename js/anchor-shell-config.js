/* Anchor Studio (30 Oct 2026): its entry for js/app-shell.js (Save app, Open, "You can check", Notes, Amend, the mic, Why not).
   Copied from js/cs-shell-config.js (left as is for Cert Studio). Loaded after js/app-shell-config.js, before js/app-shell.js.
   Fix taps on every part of the job come from js/anchor.js; the shell's press-and-hold Amend note stays on the same parts. */
(function () {
  var C = window.APP_SHELL_CONFIG = window.APP_SHELL_CONFIG || { defaults: {}, apps: {} };
  C.apps = C.apps || {};
  var fb = !(window.CS_CONFIG && window.CS_CONFIG.clientId);
  function noSync() { return !(window.RealmSync && window.RealmSync.hasKey()); }
  C.apps.anchor = {
    page: 'anchor.html', name: 'Anchor Studio', icon: 'pwa/anchor-192.png?v=20261030-1', start: './anchor.html?go=1', after: '#csBar',
    hide: ['#araSaveRow', '#araSave', '#araTip', '#araHint'],
    checks: ['that the line at the top says which Google account is open, and offers Switch to info@ when it is the wrong one',
      'that a job you save here shows on your other screens under \u201cYour jobs\u201d, at the cert you were up to',
      'that every part of the job has a \u270e Fix button'],
    amend: [{ sel: '#csBar', kind: 'jobs bar', pen: false }, { sel: '.qcard', kind: 'certificate question', pen: false },
      { sel: '.an-fixwrap', kind: 'job detail', pen: false }, { sel: '#anJobs', kind: 'your jobs', pen: false }],
    whyNot: [
      { what: 'Diary, Email and Drive here', when: function () { return fb; },
        why: 'The Google sign-in for this page isn\u2019t set up yet, so those buttons open the Google version, with info@ filled in.' },
      { what: 'Save to Google Drive from this page', when: function () { return fb; },
        why: 'It needs the info@ Google sign-in for this page. Until then the job is still saved and synced; the folder can be made from the Google version.' },
      { what: 'Jobs on this device showing on your other screens', when: noSync,
        why: 'This device hasn\u2019t had the one-tap sync link from Ara yet. Open it once here and your jobs show on every screen.' },
      { what: 'Walkthrough to Sheets or Docs, and the quote', sel: '#lvWalkMsg',
        why: 'The walkthrough doc and the quote\u2019s scope list from the subtasks sheet still run in the Google version only. Writing to Sheets and Docs from this page isn\u2019t built yet; the quote here uses the built-in service list.' },
      { what: 'WhatsApp chats saved as a zip', why: 'Only the plain text export opens here. In WhatsApp: Export chat \u203a Without media.' },
      { what: 'Answers from the bots', why: 'They don\u2019t show in the app yet, because Ara\u2019s inbox can\u2019t send answers back to the phone. A sent note shows as Sent once the inbox has it.' }
    ]
  };
})();
