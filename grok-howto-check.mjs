/**
 * Checks grok-howto.html against the 20 Oct 2026 rule book and fact-check.
 *
 *   node grok-howto-check.mjs
 *
 * Asserts:
 *   - every section heading from MASTER HOW TO USE GROK is on the page
 *   - no grokbot:// links
 *   - a viewport meta tag is present
 *   - every http(s) URL on the page appears in grok-howto/GROK_GUIDE_FACTCHECK.md
 *   - every factual line is linked or marked UNSOURCED
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(root, 'grok-howto.html');
const factPath = join(root, 'grok-howto', 'GROK_GUIDE_FACTCHECK.md');
const pdfPath = join(root, 'grok-howto', 'MASTER_HOW_TO_USE_GROK.pdf');

const html = readFileSync(htmlPath, 'utf8');
const fact = readFileSync(factPath, 'utf8');

const headings = [
  'What Grok actually is',
  'How Grok was built (the short version)',
  'What you can actually do with it',
  'Subscriptions (what you pay for)',
  'How to use Grok properly (simple habits)',
  'Why Grok is strong (the real reasons)',
  'Quick start if you\u2019re 15',
];

const errors = [];

for (const heading of headings) {
  if (!html.includes(heading)) errors.push('missing section heading: ' + heading);
}
if (!html.includes('<h2>Grok template</h2>')) errors.push('missing Grok template section');
if (!html.includes('Rule book \u00b7 20 Oct 2026')) errors.push('missing Rule book stamp');
if (html.includes('grokbot://')) errors.push('grokbot:// link present');
if (!/<meta\s+[^>]*name=["']viewport["']/i.test(html)) errors.push('viewport meta missing');
if (!existsSync(pdfPath)) errors.push('missing PDF: grok-howto/MASTER_HOW_TO_USE_GROK.pdf');
if (!html.includes('href="grok-howto/MASTER_HOW_TO_USE_GROK.pdf"')) errors.push('page does not link the PDF');

const urlRe = /https?:\/\/[^\s"'<>\\)]+/g;
const pageUrls = new Set();
for (const match of html.matchAll(urlRe)) {
  pageUrls.add(match[0].replace(/[.,;]+$/, ''));
}
const factUrls = new Set();
for (const match of fact.matchAll(urlRe)) {
  factUrls.add(match[0].replace(/[.,;]+$/, ''));
}
for (const url of pageUrls) {
  if (!fact.includes(url)) errors.push('URL not in fact-check: ' + url);
}

const facts = [...html.matchAll(/<p class="fact(?: tpl)?">([\s\S]*?)<\/p>/g)];
if (facts.length === 0) errors.push('no factual lines found');

let linked = 0;
let unsourced = 0;
let both = 0;
let linkedOnly = 0;
let unsourcedOnly = 0;
let tplLinked = 0;
let tplUnsourced = 0;

for (const match of facts) {
  const block = match[0];
  const inner = match[1];
  const hasLink = /<a\s[^>]*href="https?:\/\//.test(inner);
  const hasUn = inner.includes('>UNSOURCED<') || inner.includes('>UNSOURCED</');
  const isTpl = block.includes('class="fact tpl"');
  if (!hasLink && !hasUn) {
    const preview = inner.replace(/<[^>]+>/g, '').slice(0, 80);
    errors.push('factual line has neither a source link nor UNSOURCED: ' + preview);
  }
  if (hasLink && hasUn) both += 1;
  if (hasLink) linked += 1;
  if (hasUn) unsourced += 1;
  if (hasLink && !hasUn) linkedOnly += 1;
  if (hasUn && !hasLink) unsourcedOnly += 1;
  if (isTpl && hasLink) tplLinked += 1;
  if (isTpl && hasUn) tplUnsourced += 1;
}

const lines = [];
lines.push('grok-howto-check');
lines.push('headings: ' + headings.filter((h) => html.includes(h)).length + '/' + headings.length);
lines.push('viewport: ' + (/name=["']viewport["']/.test(html) ? 'present' : 'MISSING'));
lines.push('grokbot://: ' + (html.includes('grokbot://') ? 'PRESENT' : 'none'));
lines.push('pdf: ' + (existsSync(pdfPath) ? 'present' : 'MISSING'));
lines.push('page URLs: ' + pageUrls.size + ' unique, fact-check URLs: ' + factUrls.size);
lines.push('fact lines: ' + facts.length);
lines.push('linked: ' + linked);
lines.push('UNSOURCED: ' + unsourced);
lines.push('linked only: ' + linkedOnly);
lines.push('UNSOURCED only: ' + unsourcedOnly);
lines.push('linked and UNSOURCED: ' + both);
lines.push('Grok template repeat: linked ' + tplLinked + ', UNSOURCED ' + tplUnsourced);
if (errors.length) {
  lines.push('FAIL');
  for (const err of errors) lines.push('  - ' + err);
  console.log(lines.join('\n'));
  process.exit(1);
}
lines.push('ok');
console.log(lines.join('\n'));
