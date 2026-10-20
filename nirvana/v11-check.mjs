import {readFileSync} from "node:fs";
import {strict as assert} from "node:assert";

const index = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const flow = readFileSync(new URL("./flow.html", import.meta.url), "utf8");
const both = index + "\n" + flow;
const blobRaw = readFileSync(new URL("./panels.enc.json", import.meta.url), "utf8");
const blob = JSON.parse(blobRaw);
assert.deepEqual(Object.keys(blob).sort(), ["as_of","ct","iter","iv","kdf","salt","v"], "panels.enc.json holds only the encrypted envelope");
assert.equal(blob.kdf, "PBKDF2-SHA256");
assert.ok(blob.iter >= 600000);
// The page source is the shell only: lane text, team names and agent ids live in panels.enc.json.
assert.equal(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(index), false, "no agent ids in page source");
for (const t of ["Ara 2.1", "Marvin Musk", "Terafab", "Falcon 9", "Neuralink", "Infra Lead", "CRM Lead", "boss and builder", "24/7 sweep", "status: not wired yet", "Only Ara asks Ange", "TEST"]) {
  assert.equal(index.includes(t), false, "lane text in page source: " + t);
}
assert.equal(index.includes("main.enc.json"), false, "unlock must not fetch main.enc.json");
assert.equal(index.includes("main.enc") || flow.includes("main.enc"), false, "index and flow must not name main.enc");
assert.equal(index.includes('nvFetch("panels.enc.json")'), true);
assert.equal(/agent\?id=|Ara 2\.1|Marvin/.test(blobRaw), false, "blob is ciphertext only");

// Lane content checks run against the decrypted panels when NIRVANA_KEY is set (never printed).
const KEY = process.env.NIRVANA_KEY;
let content = "";
if (KEY) {
  const b64 = (x) => Uint8Array.from(Buffer.from(x, "base64"));
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(KEY), "PBKDF2", false, ["deriveKey"]);
  const k = await crypto.subtle.deriveKey({name: "PBKDF2", hash: "SHA-256", salt: b64(blob.salt), iterations: blob.iter}, km, {name: "AES-GCM", length: 256}, false, ["decrypt"]);
  const d = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name: "AES-GCM", iv: b64(blob.iv)}, k, b64(blob.ct))));
  assert.equal(d.v, 1);
  content = d.board + "\n" + d.sheets + "\n" + d.win + "\n" + JSON.stringify(d.map);
} else {
  console.log("v11-check: NIRVANA_KEY not set, encrypted panel checks skipped");
}
const lanes = content;
const all = both + "\n" + content;

function agentHrefs(html) {
  return [...html.matchAll(/href="([^"]*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[^"]*)"/g)].map((m) => m[1]);
}
if (KEY) {
  const found = agentHrefs(lanes);
  const ids = found.map((h) => h.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)[0]);
  assert.ok(new Set(ids).size >= 7, "decrypted panels missing chat links");
  assert.ok(lanes.includes("https://gemini.google.com/app"), "missing Gemini link");
  const team = lanes.slice(lanes.indexOf('id="sheet-team"'));
  assert.ok(agentHrefs(team).length >= 2, "team chat links");
}
assert.equal(/Ivor/i.test(all), false, "hidden lane name must not ship");
assert.equal(/Elon/.test(all), false, "Elon must appear nowhere");
assert.equal(/Always on/.test(all), false, "Marvin detail must not say Always on");
assert.equal(/Test \(Elon gate\)/.test(all), false);
if (KEY) assert.equal(lanes.includes("Marvin's 10-point gate"), true);
assert.equal(flow.includes("Marvin's 10-point gate"), true);
assert.equal(/TEST Job [ABC]/.test(all), false, "dummy jobs must be gone");
assert.equal(/Search Studio/.test(all), false);
assert.equal(/cull/i.test(index + lanes), false);
assert.equal(/hourly/i.test(index + lanes), false);
if (KEY) assert.equal(lanes.includes("Ara and Marvin both check the live page on the phone (412 and Fold), then the link goes to Ange."), true);
if (KEY) assert.equal(lanes.includes("Only Ara asks Ange"), true);
if (KEY) assert.equal(lanes.includes("Ara 2.1"), true);
if (KEY) assert.equal(lanes.includes("boss and builder"), true);
if (KEY) assert.equal(lanes.includes("24/7 sweep"), true);
if (KEY) assert.equal(lanes.includes("status: not wired yet"), true);
assert.equal(index.includes("Nirvana key (not your Desk PIN)"), true);
assert.equal(index.includes("Unlocking… takes a few seconds"), true);
assert.equal(index.includes("Key saved on this phone ✓"), true);
if (KEY) assert.equal(lanes.includes("Congratulations. You're a genius."), true);
assert.equal(index.includes("Nirvana · v11 · 2026-10-20"), true);
assert.equal(/falcon9\.jpg|pwa\/lanes\//.test(index + lanes), false, "no lane image file");
assert.equal(/<img\b[^>]*(?:jpg|png)/i.test(index + lanes), false, "lane icons are inline svg");
if (KEY) assert.ok(lanes.includes('data-icon="ara"') && lanes.includes('data-icon="marvin"') && lanes.includes('data-icon="terafab"') && lanes.includes('data-icon="falcon"') && lanes.includes('data-icon="neuralink"') && lanes.includes('data-icon="flow"'));
assert.equal(index.includes("#d4af37"), true);
assert.equal(index.includes("#9b6dff"), true);
assert.equal(index.includes("#5b6b7f"), true);
assert.equal(index.includes("#2bb8d6"), true);
assert.equal(index.includes("#2fbf9a"), true);
assert.equal(/locked hex/i.test(index + lanes), false);
for (const gone of ["Projects", "Amend", "History thread", "1300 follow-ups", "Proxmox", "Wi-Fi", "Lock settings", "YOU ARE HERE"]) {
  assert.equal((index + lanes).includes(gone), false, "unbuilt control still present: " + gone);
}
assert.equal(flow.includes("nvMount"), false, "flow must not mount the old board");
for (const banned of ["Terafab", "Falcon", "Frankie", "grokbot://app/v1/agent"]) assert.equal(flow.includes(banned), false, "flow.html contains " + banned);
assert.equal(index.includes("nvMount"), false, "home must not mount the old board");
assert.match(index, /a\.tap\{[^}]*display:\s*inline-flex/);
assert.match(index, /a\.tap\{[^}]*min-height:\s*44px/);
assert.equal(index.includes('id="nvLock"'), true);
assert.match(index, /id="nvLock"[^>]*>Lock</);
assert.match(index, /#nvMapToast\{[^}]*position:\s*static/);
assert.equal(index.includes("localStorage.removeItem(NVK)"), true);
assert.equal(index.includes("sessionStorage.removeItem(NVK)"), true);

const meta = readFileSync(new URL("./manifest.webmanifest", import.meta.url), "utf8");
assert.equal(meta.includes("Nirvana · v11 · 2026-10-20"), true);

const map = readFileSync(new URL("../metatron3.html", import.meta.url), "utf8");
assert.equal(map.includes("Elon Musk 2.0"), false);
assert.equal(map.includes('"name": "Marvin Musk"'), true);
assert.equal(/ivor/i.test(map), false, "ivor must not appear in metatron3.html");

console.log("v11-check ok");
