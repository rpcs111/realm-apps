/**
 * Load every app page at phone and laptop widths.
 * Fails on an uncaught exception, a same-origin 404, or a console error
 * that is not a live backend (Desk / engine) refusing the request.
 *
 *   node tests/check-pages.mjs
 *   SHOTS_DIR=./shots node tests/check-pages.mjs
 *   BASE_URL=https://rpcs111.github.io/realm-apps node tests/check-pages.mjs
 * Needs playwright-core on NODE_PATH and Chrome at /usr/bin/google-chrome.
 * Cert Studio screenshots go to SHOTS_DIR, or ./test-shots when that is unset.
 * When BASE_URL is set, pages load from that site instead of a local server.
 * index.html and desk.html must match the hashes below.
 * index.html is the restored hub plus the local alert script and the Ara R icon.
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
  { w: 412, h: 915, d: 'fold8' },
  { w: 412, h: 915, d: 'flip6' },
  { w: 1280, h: 800, d: 'fold8' },
  { w: 1280, h: 800, d: 'flip6' }
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

async function run() {
  const drifted = preMergeProblems();
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
    executablePath: process.env.CHROME || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const rows = [];
  let failed = 0;
  for (const pagePath of list) {
    const row = { page: pagePath, views: [] };
    for (const view of VIEWS) {
      const context = await browser.newContext({ viewport: { width: view.w, height: view.h } });
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
      if (pagePath === 'search.html' && view.d === 'fold8' && !loadError) {
        fs.mkdirSync(shotsDir, { recursive: true });
        await page.screenshot({ path: path.join(shotsDir, 'cert-studio-' + view.w + '.png'), fullPage: false });
      }
      let rules = '';
      if (pagePath === 'search.html' && view.w === 412 && view.d === 'fold8' && !loadError) {
        rules = await checkCertRules(page);
        if (rules) errors.push('cert rules: ' + rules);
      }
      if (pagePath === 'ange.html' && !loadError) {
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
      if (pagePath === 'launcher2.html' && !loadError) {
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
      if (hard.length) failed++;
      row.views.push({
        view: view.w + ' ' + view.d,
        pass: hard.length === 0,
        errors: hard.slice(0, 4),
        external: external.length,
        overflow: layout.overflow,
        off: layout.off
      });
      await context.close();
    }
    rows.push(row);
    const mark = row.views.every(v => v.pass) ? 'pass' : 'FAIL';
    console.log(mark + '  ' + pagePath);
  }
  await browser.close();
  if (server) server.close();
  const lines = ['| Page | 412 fold8 | 412 flip6 | 1280 fold8 | 1280 flip6 | Notes |', '| --- | --- | --- | --- | --- | --- |'];
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
  const md = lines.join('\n') + '\n';
  fs.writeFileSync(path.join(root, 'tests', 'results.md'), md);
  console.log('\n' + md);
  console.log(failed ? ('FAILED checks: ' + failed) : 'ALL PASS');
  process.exit(failed ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
