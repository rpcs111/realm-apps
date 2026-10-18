/**
 * Load every app page at phone and laptop widths.
 * Fails on an uncaught exception, a same-origin 404, or a console error
 * that is not a live backend (Desk / engine) refusing the request.
 *
 *   node tests/check-pages.mjs
 *   SHOTS_DIR=./shots node tests/check-pages.mjs
 *   BASE_URL=https://rpcs111.github.io/realm-apps node tests/check-pages.mjs
 * Needs playwright-core on NODE_PATH and Google Chrome Beta (Playwright channel chrome-beta).
 * Cert Studio screenshots go to SHOTS_DIR, or ./test-shots when that is unset.
 * When BASE_URL is set, pages load from that site instead of a local server.
 * index.html and desk.html must match the hashes below.
 * index.html is the restored hub plus the local alert script and the Ara R icon.
 * Browser: Chrome Beta at 412x915 and 1280x800, for ?d=fold8 and ?d=flip6.
 * Phone rows (412) use touch, isMobile, deviceScaleFactor 2.625, and an Android
 * Chrome Beta UA. They are the Beta engine with a phone profile, not a handset.
 * Chrome flags drop the back-forward cache and notification prompts so those
 * Beta quirks do not stall a headless run. Each view is its own context, so
 * first-party storage is not split across the panel page and Notes.
 * Every POST to script.google.com is aborted. Nothing is written to Desk.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotsDir = path.resolve(process.env.SHOTS_DIR || 'test-shots');
const baseUrl = (process.env.BASE_URL || '').trim().replace(/\/$/, '');
const PRE_MERGE = {
  'index.html': '7f9d53ef4e3799fdea0d7decb08161f5a4bf19061d362ec93cb9515bd4434b6e',
  'desk.html': '1c37d2520cd6ccc0da30762cef7de24177181d9857a2cd65dc61b2a73c768de1'
};
const SKIP = new Set(['map.backup.html', 'map.v2.backup.html']);
const MIME = {
  '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.css': 'text/css;charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'
};

function pages() {
  const out = [];
  function walk(dir, rel) {
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      const r = rel ? rel + '/' + name : name;
      if (fs.statSync(abs).isDirectory()) {
        if (name === 'node_modules' || name === 'tests' || name === '.git') continue;
        walk(abs, r);
      } else if (name.endsWith('.html') && !SKIP.has(name)) out.push(r);
    }
  }
  walk(root, '');
  return out.sort();
}

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.normalize(path.join(root, url));
    if (!file.startsWith(root)) { res.writeHead(403); res.end('no'); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('missing'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const EXTERNAL = /script\.google\.com|googleapis\.com|gstatic\.com|google\.com|CORS|Failed to fetch|net::ERR_|accounts\.google|youtube\.com|ytimg\.com|ggpht\.com/i;

const VIEWS = [
  { name: '412 fold8', w: 412, h: 915, d: 'fold8', mobile: true, note: 'Chrome Beta engine, emulated' },
  { name: '1280 fold8', w: 1280, h: 800, d: 'fold8', mobile: false },
  { name: '412 flip6', w: 412, h: 915, d: 'flip6', mobile: true, note: 'Chrome Beta engine, emulated' },
  { name: '1280 flip6', w: 1280, h: 800, d: 'flip6', mobile: false }
];
const WRITE_FN = /^(add|set|save|update|delete|complete|append|put|create|remove)/i;
const EMOJI = /\p{Extended_Pictographic}/u;
const CHROME_ARGS = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-back-forward-cache',
  '--disable-notifications',
  '--disable-popup-blocking',
  '--disable-features=BackForwardCache'
];

async function checkCertRules(page) {
  return page.evaluate(() => {
    const api = window.__certWeeks;
    if (!api) return 'missing __certWeeks';
    const sat = api.parseStart('2026-10-17');
    const sun = api.parseStart('18/10/2026');
    const late = api.parseStart('2026-10-19T15:01');
    const onTime = api.parseStart('2026-10-19T15:00');
    const allDay = api.parseStart('2026-10-19');
    const problems = [];
    if (!api.incorrect(sat)) problems.push('Saturday not tagged');
    if (!api.incorrect(sun)) problems.push('Sunday not tagged');
    if (!api.incorrect(late)) problems.push('after 15:00 not tagged');
    if (api.incorrect(onTime)) problems.push('15:00 tagged');
    if (api.incorrect(allDay)) problems.push('weekday all-day tagged');
    const score = api.scoreCert('12 smith street', { title: 'Anchor test', where: '12 Smith Street', cal: 'Anchor Testing' });
    if (score < 2) problems.push('address match failed');
    const timed = { title: 'Anchor', where: '12 Smith Street', start: '2026-10-19T15:30', cal: 'Anchor' };
    const allDayCert = { title: 'Anchor', where: '12 Smith Street', start: '2026-10-19', cal: 'Anchor' };
    if (!api.shiftMatch(timed, ['3:30 pm 12 Smith Street'])) problems.push('string diary miss');
    if (api.shiftMatch(timed, ['9:00 am 12 Smith Street'])) problems.push('far clock matched');
    if (!api.shiftMatch(allDayCert, ['Smith Street roof'])) problems.push('all-day site miss');
    if (api.shiftMatch(allDayCert, ['Other place'])) problems.push('all-day wrong site');
    if (api.deputyLabel(timed, { err: 'no access' }).t !== 'Deputy not checked') problems.push('roster err checked');
    if (api.deputyLabel(timed, { diary: ['9:00 am Other place'], staff: [] }).t !== 'Not built: no Deputy shift') problems.push('clean miss');
    if (api.deputyLabel(timed, { diary: [], staff: ['15:30 12 Smith Street'] }).t !== 'Deputy shift matched') problems.push('staff string miss');
    if (api.deputyLabel(timed, { diary: [{ start: '2026-10-19T15:30:00', area: '12 Smith Street' }] }).t !== 'Deputy shift matched') problems.push('object diary miss');
    if (api.deputyLabel(timed, { diary: [{ start: '2026-10-19T15:30:00', area: '12 Smith Street', leave: true }] }).t !== 'Not built: no Deputy shift') problems.push('leave matched');
    const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const bit = t => parts.find(p => p.type === t).value;
    const today = bit('year') + '-' + bit('month') + '-' + bit('day');
    function expectNamed(day, mon) {
      let year = +today.slice(0, 4);
      let key = year + '-' + mon + '-' + day;
      if (key < api.addDaysKey(today, -183)) key = (year + 1) + '-' + mon + '-' + day;
      return key;
    }
    const dec = api.parseStart('Tue 1 Dec 13:15');
    if (!dec || dec.key.indexOf('2001') === 0 || dec.key !== expectNamed('01', '12') || dec.mins !== 13 * 60 + 15 || dec.allDay) problems.push('Tue 1 Dec 13:15 parsed ' + JSON.stringify(dec));
    const march = api.parseStart('1 Mar 09:00');
    if (!march || march.key !== expectNamed('01', '03') || march.mins !== 9 * 60) problems.push('1 Mar roll parsed ' + JSON.stringify(march));
    const kept = api.parseStart('1 Mar 2020 09:00');
    if (!kept || kept.key !== '2020-03-01' || kept.mins !== 9 * 60) problems.push('explicit year parsed ' + JSON.stringify(kept));
    const isoCert = { title: 'Anchor', where: '12 Smith Street', start: 'Tue 1 Dec 13:15', startIso: '2026-10-19T15:30:00+11:00', cal: 'Anchor' };
    const iso = api.whenOf(isoCert);
    if (!iso || iso.key !== '2026-10-19' || iso.mins !== 15 * 60 + 30) problems.push('startIso unused ' + JSON.stringify(iso));
    if (!api.incorrect(iso)) problems.push('startIso after 3pm not tagged');
    if (api.deputyLabel(isoCert, { diary: [{ start: '2026-10-19T15:30:00', area: '12 Smith Street' }] }).t !== 'Deputy shift matched') problems.push('startIso deputy miss');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let satKey = today;
    for (let i = 0; i < 7; i++) {
      if (new Date(satKey + 'T00:00:00Z').getUTCDay() === 6) break;
      satKey = api.addDaysKey(satKey, 1);
    }
    const satBits = satKey.split('-');
    const satLabel = (+satBits[2]) + ' ' + months[+satBits[1] - 1] + ' 10:00';
    const weekend = api.parseStart(satLabel);
    if (!weekend || weekend.key !== satKey || !api.incorrect(weekend)) problems.push('named Saturday parsed ' + satLabel + ' ' + JSON.stringify(weekend));
    const lateCard = api.cardHtml(isoCert);
    const weekCard = api.cardHtml({ title: 'Weekend job', where: 'Site', start: satLabel, cal: 'Anchor' });
    if (!lateCard || lateCard.indexOf('Incorrect') < 0 || lateCard.indexOf('Deputy not checked') < 0) problems.push('after-3pm card flags');
    if (!weekCard || weekCard.indexOf('Incorrect') < 0) problems.push('weekend card flag');
    return problems.join('; ');
  });
}

function contextOptions(view, version) {
  const base = { viewport: { width: view.w, height: view.h } };
  if (!view.mobile) {
    return Object.assign(base, { isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
  }
  return Object.assign(base, {
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2.625,
    userAgent: 'Mozilla/5.0 (Linux; Android 15; SM-F741B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' + version + ' Mobile Safari/537.36'
  });
}

function panelLeakProblems() {
  const problems = [];
  pages().forEach(file => {
    if (file === 'panel-test.html') return;
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    if (text.includes('ara-panel.js')) problems.push(file + ' loads ara-panel.js');
  });
  return problems;
}

function absUrl(href, pageUrl) {
  return new URL(href, pageUrl).href;
}

function watchPage(p, bucket) {
  p.on('pageerror', err => bucket.push(String(err && err.message || err).slice(0, 200)));
  p.on('console', msg => {
    if (msg.type() !== 'error') return;
    const t = msg.text().slice(0, 300);
    if (EXTERNAL.test(t) || /^Failed to load resource:/.test(t)) return;
    bucket.push(t);
  });
}

function rectsOverlap(a, b) {
  if (!a || !b || a.width < 2 || b.width < 2) return false;
  return a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
}

async function shot(page, name) {
  const dir = '/opt/cursor/artifacts';
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, name), fullPage: false, scale: 'css' });
  return path.join(dir, name);
}

async function checkPanel(page, context, errors, shotTag, opts) {
  opts = opts || {};
  const clickThrough = opts.clickThrough !== false;
  const out = { buttons: [], note: '' };
  const before = errors.length;
  const title = await page.title();
  if (title !== 'Ara panel - test board') errors.push('title ' + title);
  const closedShot = await page.evaluate(() => {
    const sym = document.getElementById('araSym');
    const panel = document.getElementById('araPanel');
    const r = sym ? sym.getBoundingClientRect() : { width: 0, height: 0 };
    const scripts = [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'));
    const visible = [...document.querySelectorAll('#araSym,#ara,#arbBtn,[aria-label="Ara"],[aria-label="Ara 2.0"]')].filter(el => {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || el.hidden) return false;
      const b = el.getBoundingClientRect();
      return b.width >= 20 && b.height >= 20;
    }).length;
    return {
      sym: Math.round(r.width) + 'x' + Math.round(r.height),
      hidden: !panel || panel.hidden === true,
      scripts: scripts.filter(s => (s || '').indexOf('ara-panel.js') >= 0).length,
      visible: visible
    };
  });
  if (closedShot.sym !== '44x44') errors.push('Ara symbol ' + closedShot.sym);
  if (!closedShot.hidden) errors.push('panel visible while closed');
  if (closedShot.scripts !== 1) errors.push('ara-panel.js tags ' + closedShot.scripts);
  if (closedShot.visible !== 1) errors.push('Ara symbols ' + closedShot.visible);
  if (shotTag) await shot(page, 'panel-closed-' + shotTag + '.png');

  await page.click('#araSym');
  await page.waitForFunction(() => document.getElementById('araPanel') && !document.getElementById('araPanel').hidden);
  await page.click('#araSym');
  await page.waitForFunction(() => document.getElementById('araPanel').hidden);
  await page.click('#araSym');
  await page.click('h1');
  await page.waitForFunction(() => document.getElementById('araPanel').hidden);
  await page.click('#araSym');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('araPanel').hidden);
  await page.click('#araSym');
  await page.waitForFunction(() => !document.getElementById('araPanel').hidden);

  const layout = await page.evaluate(() => {
    const panel = document.getElementById('araPanel');
    const sym = document.getElementById('araSym');
    const pr = panel.getBoundingClientRect();
    const sr = sym.getBoundingClientRect();
    function hit(a, b) {
      return a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    }
    const row = panel.querySelector('.ara-p-row');
    const links = [...row.querySelectorAll('a')];
    const tops = links.map(a => Math.round(a.getBoundingClientRect().top));
    const targets = [...panel.querySelectorAll('a,button,input')].map(el => {
      const r = el.getBoundingClientRect();
      return { t: (el.textContent || el.getAttribute('aria-label') || '').trim(), w: r.width, h: r.height, href: el.getAttribute('href') || '' };
    });
    return {
      pw: pr.width,
      mid: (pr.left + pr.right) / 2,
      gap: sr.top - pr.bottom,
      overlap: hit(pr, sr),
      oneRow: tops.length > 0 && Math.max.apply(null, tops) - Math.min.apply(null, tops) <= 1,
      scrolls: row.scrollWidth > row.clientWidth + 8,
      targets: targets,
      labels: links.map(a => a.textContent)
    };
  });
  if (layout.overlap) errors.push('open panel covers the Ara symbol');
  if (layout.gap < 8) errors.push('panel gap ' + Math.round(layout.gap) + 'px');
  if (layout.pw > 640.5) errors.push('panel wider than 640');
  const expectW = Math.min(640, page.viewportSize().width - 24);
  if (Math.abs(layout.pw - expectW) > 3) errors.push('panel width ' + Math.round(layout.pw) + ' expected ' + expectW);
  if (Math.abs(layout.mid - page.viewportSize().width / 2) > 4) errors.push('panel not centred');
  if (!layout.oneRow) errors.push('layer-one buttons wrap onto a second row');
  if (!layout.scrolls) errors.push('button row does not scroll');
  layout.targets.forEach(t => {
    if (t.h < 44 || (t.href && t.w < 44)) errors.push('tap target ' + t.t + ' ' + Math.round(t.w) + 'x' + Math.round(t.h));
    if (EMOJI.test(t.t)) errors.push('emoji in ' + t.t);
  });
  if (shotTag) await shot(page, 'panel-open-' + shotTag + '.png');

  const here = page.url();
  for (const label of layout.labels) {
    const link = page.locator('#araPanel a', { hasText: label }).first();
    const href = await link.getAttribute('href');
    const dest = absUrl(href, here);
    let code = 0;
    try {
      const res = await page.request.get(dest, { timeout: 15000 });
      code = res.status();
    } catch (e) {
      code = 0;
      errors.push(label + ' fetch ' + String(e.message || e).slice(0, 120));
    }
    const row = { label: label, href: href, status: code, pass: code === 200, console: '' };
    if (code !== 200) errors.push(label + ' ' + href + ' ' + code);
    out.buttons.push(row);
  }

  await page.fill('#araPanelIn', 'TEST dummy note - ignore');
  await page.click('#araPanelSend button');
  const said = await page.locator('#araPanelMsg').innerText();
  if (said.indexOf('Saved on this device') < 0) errors.push('notes push said ' + said);
  const notesUrl = absUrl('notes.html', here);
  const notesPage = await context.newPage();
  const noteErrors = [];
  watchPage(notesPage, noteErrors);
  try {
    await notesPage.goto(notesUrl, { waitUntil: 'load', timeout: 20000 });
    await notesPage.waitForFunction(() => document.body.innerText.indexOf('TEST dummy note - ignore') >= 0, null, { timeout: 15000 });
  } catch (e) {
    errors.push('notes page ' + String(e.message || e).slice(0, 160));
  }
  const stored = await notesPage.evaluate(() => {
    try {
      const a = JSON.parse(localStorage.getItem('realm_scribe_v1') || '[]');
      return Array.isArray(a) && a.some(n => (n && (n.title === 'TEST dummy note - ignore' || (n.note || '').indexOf('TEST dummy note - ignore') >= 0)));
    } catch (e) { return false; }
  }).catch(() => false);
  if (!stored) errors.push('TEST note missing from realm_scribe_v1');
  if (noteErrors.length) errors.push('notes console ' + noteErrors[0]);
  if (shotTag) {
    try { await shot(notesPage, 'notes-test-note-' + shotTag + '.png'); } catch (e) {}
  }
  out.note = stored && noteErrors.length === 0 ? 'pass' : 'fail';
  await notesPage.close();

  if (clickThrough) for (const row of out.buttons) {
    const link = page.locator('#araPanel a', { hasText: row.label }).first();
    await link.evaluate(el => { el.target = '_blank'; });
    const bucket = [];
    const onPage = p => watchPage(p, bucket);
    context.on('page', onPage);
    let np = null;
    try {
      const opened = context.waitForEvent('page', { timeout: 8000 });
      await link.click();
      np = await opened;
      await np.waitForLoadState('load', { timeout: 20000 });
      await np.waitForTimeout(400);
      if (row.href === 'notes.html') {
        const still = await np.evaluate(() => document.body.innerText.indexOf('TEST dummy note - ignore') >= 0);
        if (!still) bucket.push('TEST note not on the opened Notes page');
      }
    } catch (e) {
      bucket.push(String(e.message || e).slice(0, 160));
    }
    context.removeListener('page', onPage);
    if (bucket.length) {
      row.console = bucket[0];
      row.pass = false;
      errors.push(row.label + ' console ' + bucket[0]);
    }
    if (np) await np.close();
  }
  if (errors.length === before) out.note = out.note || 'pass';
  return out;
}

function postKind(raw) {
  let fn = '', op = '';
  try {
    const j = JSON.parse(raw || '{}');
    fn = String(j.fn || '');
    op = String(j.op || '');
  } catch (e) {}
  return { fn: fn, op: op, write: WRITE_FN.test(fn) || WRITE_FN.test(op) };
}

/* First launch in standalone shows a full-screen "Saved. You're set." sheet (nirvana.js).
   It covers the page once. A real installed window does this too. Dismiss it, then keep testing. */
async function dismissFirstRun(page) {
  const standalone = await page.evaluate(() => {
    try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
    catch (e) { return false; }
  }).catch(() => false);
  if (!standalone) return false;
  const sheet = page.locator('#araNirvana');
  try { await sheet.waitFor({ state: 'visible', timeout: 2000 }); }
  catch (e) { return false; }
  await sheet.locator('button').click({ timeout: 4000 });
  await page.waitForFunction(() => !document.getElementById('araNirvana'), null, { timeout: 4000 });
  return true;
}

async function checkSearch(page, errors) {
  const out = { skipped: [], searchAll: 0, cycles: 0, firstRun: false };
  const seen = { searchAll: 0, writes: [] };
  if (await dismissFirstRun(page)) out.firstRun = true;
  await page.route('**/*', async route => {
    const req = route.request();
    if (req.method() !== 'POST' || !/script\.google/.test(req.url())) {
      await route.continue();
      return;
    }
    const kind = postKind(req.postData());
    if (kind.write) seen.writes.push(kind.fn || kind.op || 'write');
    if (kind.fn === 'searchAll') seen.searchAll++;
    await route.abort();
  });

  await page.click('#q');
  await page.fill('#q', 'TEST dummy 0000');
  await page.locator('#q').evaluate(el => el.blur());
  const qVal = await page.inputValue('#q');
  if (qVal !== 'TEST dummy 0000') errors.push('search box did not keep the dummy query');

  /* Search keeps one Ara symbol. The header Call Ara button is hidden, and the
     floating symbol opens the message sheet. Either control is exercised, not both. */
  const shown = await page.evaluate(() => {
    function on(id) {
      const el = document.getElementById(id);
      if (!el) return false;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || el.hidden) return false;
      const r = el.getBoundingClientRect();
      return r.width >= 20 && r.height >= 20;
    }
    return { ara: on('ara'), arb: on('arbBtn') };
  });
  if (shown.ara === shown.arb) errors.push('Ara symbols ' + (shown.ara ? 'ara and arbBtn' : 'none'));
  const sheet = shown.arb && !shown.ara
    ? {
        open: '#arbBtn', field: '#arbText', close: '#arbX',
        up: () => { const s = document.getElementById('arbSheet'); return !!(s && !s.hidden); },
        down: () => { const s = document.getElementById('arbSheet'); return !!(s && s.hidden); }
      }
    : {
        open: '#ara', field: '#araT', close: '#araX',
        up: () => document.getElementById('araS').classList.contains('on'),
        down: () => !document.getElementById('araS').classList.contains('on')
      };
  if (shown.ara !== shown.arb) {
    await page.click(sheet.open);
    await page.waitForFunction(sheet.up);
    await page.click(sheet.field);
    await page.fill(sheet.field, 'TEST dummy 0000');
    await page.locator(sheet.field).evaluate(el => el.blur());
    const araVal = await page.inputValue(sheet.field);
    if (araVal.indexOf('TEST dummy 0000') < 0) errors.push('Ara sheet did not keep the dummy line');
    await page.click(sheet.close);
    await page.waitForFunction(sheet.down);
  }
  out.skipped.push(shown.arb && !shown.ara
    ? 'Send to Ara (would post the message; not clicked)'
    : 'Send to Ara (opens grok.com; not a local save)');

  const addKey = page.locator('#rkAdd');
  if (await addKey.isVisible().catch(() => false)) {
    await addKey.click();
    await page.waitForSelector('#rkIn', { timeout: 4000 });
    await page.click('#rkIn');
    await page.click('#rkX');
    const key = await page.evaluate(() => localStorage.getItem('realm_key') || '');
    if (key) errors.push('Add key stored a realm key');
    out.skipped.push('Add key Save (would store a realm key)');
  }

  const beforeSearch = errors.length;
  if (shown.ara !== shown.arb) for (let i = 0; i < 5; i++) {
    await page.click(sheet.open, { timeout: 4000 });
    await page.click(sheet.close, { timeout: 4000 });
    await page.fill('#q', 'TEST dummy 0000');
    await page.click('#goBtn', { timeout: 4000 });
    out.cycles++;
  }
  const focusMs = Date.now();
  await page.click('#q', { timeout: 4000 });
  if (Date.now() - focusMs > 3000) errors.push('search box slow after the cycles');
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
  if (focused !== 'q') errors.push('search box did not focus after the cycles');
  if (shown.ara !== shown.arb) {
    await page.click(sheet.open, { timeout: 4000 });
    const open = await page.evaluate(sheet.up);
    if (!open) errors.push('Ara sheet did not open after the cycles');
    await page.click(sheet.close, { timeout: 4000 });
    const closed = await page.evaluate(sheet.down);
    if (!closed) errors.push('Ara sheet did not close after the cycles');
  }
  try {
    await page.waitForFunction(() => {
      const b = document.getElementById('goBtn');
      return b && !b.classList.contains('busy') && (b.textContent || '').trim() === 'Go';
    }, null, { timeout: 45000 });
  } catch (e) {
    errors.push('Go stayed busy');
  }
  const settled = seen.searchAll;
  await page.waitForTimeout(2000);
  if (seen.searchAll > settled) errors.push('search kept requesting after Go was idle');
  if (seen.searchAll > 12) errors.push('searchAll fired ' + seen.searchAll + ' times');
  if (seen.writes.length) out.skipped.push('blocked write ' + seen.writes.join(', '));
  const amend = await page.locator('button.am').count();
  if (amend) {
    out.skipped.push('Amend Save (posts addNote to Desk; not clicked)');
  } else {
    out.skipped.push('Amend Save not offered (no result card). It posts addNote to Desk, so it would be skipped');
  }
  out.searchAll = seen.searchAll;
  if (errors.length > beforeSearch && out.cycles < 5) errors.push('cycles stopped early');
  try { await page.unroute('**/*'); } catch (e) {}
  return out;
}

function preMergeProblems() {
  const problems = [];
  Object.keys(PRE_MERGE).forEach(name => {
    const got = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
    if (got !== PRE_MERGE[name]) problems.push(name + ' differs from the pre-merge file');
  });
  return problems;
}

function sameOrigin(u, port) {
  if (baseUrl) {
    try { return new URL(u).origin === new URL(baseUrl).origin; }
    catch (e) { return false; }
  }
  return u.startsWith('http://127.0.0.1:' + port);
}

function localPath(u, port) {
  if (!baseUrl) return u.replace('http://127.0.0.1:' + port, '');
  const prefix = baseUrl + '/';
  if (u.startsWith(prefix)) return '/' + u.slice(prefix.length);
  try { return new URL(u).pathname; }
  catch (e) { return u; }
}

function pageUrl(pagePath, view, port) {
  const q = pagePath + '?d=' + view.d;
  return baseUrl ? (baseUrl + '/' + q) : ('http://127.0.0.1:' + port + '/' + q);
}

const STANDALONE_SCRIPT = `(() => {
  const real = window.matchMedia.bind(window);
  window.matchMedia = function (q) {
    const s = String(q);
    if (s.indexOf('display-mode:') >= 0) {
      const on = /display-mode:\\s*standalone/.test(s);
      return { matches: on, media: s, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } };
    }
    return real(q);
  };
  try { Object.defineProperty(navigator, 'standalone', { configurable: true, get() { return true; } }); } catch (e) {}
})();`;

async function run() {
  const drifted = preMergeProblems().concat(panelLeakProblems());
  if (drifted.length) {
    console.error(drifted.join('\n'));
    process.exit(1);
  }
  if (baseUrl) {
    try { new URL(baseUrl); }
    catch (e) { console.error('BASE_URL is not a URL'); process.exit(1); }
  }
  const list = pages();
  let server = null;
  let port = 0;
  if (!baseUrl) {
    server = await serve();
    port = server.address().port;
  }
  const browser = await chromium.launch({
    channel: 'chrome-beta',
    args: CHROME_ARGS
  });
  const version = browser.version();
  console.log('Chrome Beta ' + version);
  const rows = [];
  const focus = [];
  let failed = 0;
  async function oneView(pagePath, view, standalone) {
    const context = await browser.newContext(contextOptions(view, version));
    if (standalone) await context.addInitScript(STANDALONE_SCRIPT);
    await context.route('**/*', async route => {
      const req = route.request();
      if (req.method() === 'POST' && /script\.google/.test(req.url())) {
        await route.abort();
        return;
      }
      await route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    const missing = [];
    const external = [];
    page.on('pageerror', err => errors.push(String(err && err.message || err).slice(0, 240)));
    page.on('console', msg => {
      if (msg.type() !== 'error') return;
      const t = msg.text().slice(0, 300);
      if (EXTERNAL.test(t) || /^Failed to load resource:/.test(t)) { external.push(t); return; }
      else errors.push(t);
    });
    page.on('response', res => {
      const u = res.url();
      const status = res.status();
      if (status < 400) return;
      if (!sameOrigin(u, port)) { external.push(status + ' ' + u.slice(0, 180)); return; }
      if (u.includes('favicon.ico')) return;
      missing.push(status + ' ' + localPath(u, port));
    });
    const url = pageUrl(pagePath, view, port);
    let loadError = '';
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(350);
    } catch (e) {
      loadError = String(e.message || e).slice(0, 240);
    }
    let layout = { overflow: 0, off: [] };
    if (!loadError) {
      layout = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        const off = [];
        function inScroller(el) {
          let n = el.parentElement;
          while (n && n !== document.body) {
            const cs = getComputedStyle(n);
            const ox = cs.overflowX;
            if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 8) return true;
            n = n.parentElement;
          }
          return false;
        }
        document.querySelectorAll('a,button,input,textarea,select').forEach(el => {
          const s = getComputedStyle(el);
          if (s.display === 'none' || s.visibility === 'hidden' || el.hidden) return;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return;
          if (inScroller(el)) return;
          const spills = r.right > innerWidth + 4 || r.left < -4;
          const hits = r.right > 0 && r.left < innerWidth;
          if (spills && hits) off.push(el.id || el.tagName);
        });
        return { overflow, off: off.slice(0, 6) };
      });
    }
    if (!standalone && pagePath === 'search.html' && !loadError) {
      fs.mkdirSync(shotsDir, { recursive: true });
      await page.screenshot({ path: path.join(shotsDir, 'cert-studio-' + view.w + '-' + view.d + '.png'), fullPage: false, scale: 'css' });
    }
    if (!standalone && pagePath === 'search.html' && view.w === 412 && !loadError) {
      const rules = await checkCertRules(page);
      if (rules) errors.push('cert rules: ' + rules);
    }
    const device = view.name + (view.note ? ' (' + view.note + ')' : '') + (standalone ? ' standalone' : '');
    const engine = (view.note || 'Chrome Beta') + (standalone ? ', display-mode standalone' : '');
    if (!loadError && pagePath === 'panel-test.html') {
      const before = errors.length;
      let panel = { buttons: [], note: 'fail' };
      try {
        panel = await checkPanel(page, context, errors, standalone ? '' : (view.w + '-' + view.d), { clickThrough: !standalone });
      } catch (e) {
        errors.push(String(e.message || e).slice(0, 200));
      }
      const ok = errors.length === before;
      focus.push({ app: 'panel test board', device: device, engine: engine, pass: ok, buttons: panel.buttons, note: panel.note });
      focus.push({ app: 'Notes', device: device, engine: engine, pass: panel.note === 'pass', note: panel.note });
    }
    if (!loadError && pagePath === 'search.html') {
      const before = errors.length;
      let search = { skipped: [], searchAll: 0 };
      try { search = await checkSearch(page, errors); }
      catch (e) { errors.push(String(e.message || e).slice(0, 200)); }
      focus.push({ app: 'Search Studio', device: device, engine: engine, pass: errors.length === before, skipped: search.skipped, searchAll: search.searchAll, firstRun: search.firstRun });
    }
    if (!standalone && pagePath === 'ange.html' && !loadError) {
      const taps = await page.evaluate(() => {
        const bad = [];
        ['nxa', 'mic'].forEach(id => {
          const el = document.getElementById(id);
          if (!el) { bad.push(id + ' missing'); return; }
          const r = el.getBoundingClientRect();
          if (r.width < 44 || r.height < 44) bad.push(id + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        });
        return bad.join('; ');
      });
      if (taps) errors.push(taps);
    }
    if (!standalone && pagePath === 'launcher2.html' && !loadError) {
      const overlap = await page.evaluate(() => {
        function hit(a, b) {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return ar.left < br.right - 1 && ar.right > br.left + 1 && ar.top < br.bottom - 1 && ar.bottom > br.top + 1;
        }
        const ara = document.getElementById('arbBtn');
        const pill = document.getElementById('realmSyncPill');
        if (!ara || !pill) return 'missing ' + (!ara ? 'Ara ' : '') + (!pill ? 'sync pill' : '');
        if (hit(ara, pill)) return 'Ara covers sync pill';
        const pr = pill.getBoundingClientRect();
        if (pr.right > innerWidth + 2) return 'sync pill off the right edge';
        return '';
      });
      if (overlap) errors.push(overlap);
    }
    const hard = errors.concat(missing);
    if (loadError) hard.push(loadError);
    await context.close();
    return {
      view: view.w + ' ' + view.d + (standalone ? ' standalone' : ''),
      pass: hard.length === 0,
      errors: hard.slice(0, 4),
      external: external.length,
      overflow: layout.overflow,
      off: layout.off
    };
  }
  for (const pagePath of list) {
    const row = { page: pagePath, views: [] };
    for (const view of VIEWS) {
      const result = await oneView(pagePath, view, false);
      if (!result.pass) failed++;
      row.views.push(result);
    }
    rows.push(row);
    const mark = row.views.every(v => v.pass) ? 'pass' : 'FAIL';
    console.log(mark + '  ' + pagePath);
  }
  const standRow = { page: 'standalone (panel, notes, search)', views: [] };
  for (const pagePath of ['panel-test.html', 'search.html']) {
    for (const view of VIEWS) {
      const result = await oneView(pagePath, view, true);
      if (!result.pass) failed++;
      standRow.views.push(Object.assign({ page: pagePath }, result));
      console.log((result.pass ? 'pass' : 'FAIL') + '  ' + pagePath + ' ' + result.view);
    }
  }
  await browser.close();
  if (server) server.close();
  const head = VIEWS.map(v => v.name + (v.note ? ' (' + v.note + ')' : ''));
  const lines = [
    'Chrome Beta ' + version + '.',
    '',
    '| Page | ' + head.join(' | ') + ' | Notes |',
    '| --- | ' + head.map(() => '---').join(' | ') + ' | --- |'
  ];
  for (const row of rows) {
    const cells = row.views.map(v => v.pass ? 'pass' : 'fail');
    const notes = [];
    row.views.forEach(v => {
      if (v.errors.length) notes.push(v.view + ': ' + v.errors[0]);
      if (v.overflow > 8) notes.push(v.view + ' overflow ' + v.overflow + 'px');
      if (v.off.length) notes.push(v.view + ' offscreen: ' + v.off.join(', '));
      if (v.external) notes.push(v.view + ' external ' + v.external);
    });
    const uniq = [...new Set(notes)].slice(0, 4);
    lines.push('| ' + row.page + ' | ' + cells.join(' | ') + ' | ' + uniq.join('<br>') + ' |');
  }
  lines.push('', '## Standalone display-mode', '', '| Page | View | Result | Notes |', '| --- | --- | --- | --- |');
  standRow.views.forEach(v => {
    const note = (v.errors || []).slice(0, 2).join('; ');
    lines.push('| ' + v.page + ' | ' + v.view + ' | ' + (v.pass ? 'pass' : 'fail') + ' | ' + note + ' |');
  });
  lines.push('', '## Focus (Chrome Beta)', '', '| App | Device | Engine | Result | Detail |', '| --- | --- | --- | --- | --- |');
  focus.forEach(f => {
    const bits = [];
    if (f.note) bits.push('notes push ' + f.note);
    if (f.buttons) bits.push(f.buttons.map(b => b.label + ' ' + (b.pass ? 'pass' : 'fail ' + (b.status || '') + (b.console ? ' ' + b.console : ''))).join('; '));
    if (f.firstRun) bits.push('dismissed first-run install sheet');
    if (f.skipped && f.skipped.length) bits.push('skipped: ' + f.skipped.join('; '));
    if (f.searchAll != null && f.app === 'Search Studio') bits.push('searchAll ' + f.searchAll);
    lines.push('| ' + f.app + ' | ' + f.device + ' | ' + f.engine + ' | ' + (f.pass ? 'pass' : 'fail') + ' | ' + bits.join('<br>').replace(/\|/g, '/') + ' |');
  });
  const md = lines.join('\n') + '\n';
  fs.writeFileSync(path.join(root, 'tests', 'results.md'), md);
  console.log('\n' + md);
  console.log(failed ? ('FAILED checks: ' + failed) : 'ALL PASS');
  process.exit(failed ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
