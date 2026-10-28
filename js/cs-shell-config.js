/* Cert Studio, GitHub version: its entry for js/app-shell.js (Save app, Open, "You can check", Notes, Amend, the mic, Why not).
   Loaded after js/app-shell-config.js and before js/app-shell.js, so it replaces that file's plan-only Cert Studio entry. */
(function () {
  var C = window.APP_SHELL_CONFIG = window.APP_SHELL_CONFIG || { defaults: {}, apps: {} };
  C.apps = C.apps || {};
  var fb = !(window.CS_CONFIG && window.CS_CONFIG.clientId);
  C.apps.certstudio = {
    page: 'certstudio.html', name: 'Cert Studio', icon: 'pwa/searchstudio-cube-192.png?v=20261029c', start: './certstudio.html?go=1', after: '#csBar',
    hide: ['#araSaveRow', '#araSave', '#araTip', '#araHint'],
    checks: ['that several jobs stay open at once, in the tabs at the top', 'that a job you leave partway comes back under \u201cPick up where you left off\u201d, at the same spot'],
    amend: [{ sel: '#csBar', kind: 'jobs bar', pen: false }, { sel: '.qcard', kind: 'certificate question', pen: false }],
    whyNot: [
      { what: 'Diary, Email and Drive here', when: function () { return fb; },
        why: 'The Google sign-in for this page isn\u2019t set up yet, so those buttons open the Google version, with info@ filled in.' },
      { what: 'Walkthrough to Sheets or Docs, and the quote', sel: '#lvWalkMsg',
        why: 'The walkthrough doc and the quote\u2019s scope list from the subtasks sheet still run in the Google version only. Writing to Sheets and Docs from this page isn\u2019t built yet; the quote here uses the built-in service list.' },
      { what: 'WhatsApp chats saved as a zip', why: 'Only the plain text export opens here. In WhatsApp: Export chat \u203a Without media.' },
      { what: 'Picking up on another phone', why: 'Jobs are kept on this phone only. Picking up on another phone or computer needs the Google sign-in set up for it.' },
      { what: 'Answers from the bots', why: 'They don\u2019t show in the app yet, because Ara\u2019s inbox can\u2019t send answers back to the phone. A sent note shows as Sent once the inbox has it.' }
    ]
  };
})();
