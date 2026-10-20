import {readFileSync} from "node:fs";
import {strict as assert} from "node:assert";

const index = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const flow = readFileSync(new URL("./flow.html", import.meta.url), "utf8");
const both = index + "\n" + flow;

const links = [
  "grokbot://app/v1/agent?id=0aca7e2c-756b-4a08-a1c7-d0751a5703bb",
  "grokbot://app/v1/agent?id=7a2f50df-0230-48ec-855a-33b9e7bfeb71",
  "grokbot://app/v1/agent?id=76897f17-7d0b-41a2-b054-4ae80f38e829",
  "grokbot://app/v1/agent?id=812882bb-13e5-4765-8377-b1350f12cbc2",
  "grokbot://app/v1/agent?id=9005ed36-32b9-46ec-9af1-d4f17492f0d7",
  "grokbot://app/v1/agent?id=5a501e95-8fae-4e1f-a9df-2f440f3b8b5a",
  "grokbot://app/v1/agent?id=af33c179-96c8-42db-9dc6-80279fd44066",
  "https://gemini.google.com/app"
];
for (const href of links) assert.ok(index.includes(href), "missing link " + href);
assert.equal(index.includes("a68a9a78-6381-48a6-a7db-39786c1ec08e"), false, "hidden lane link must not ship");
assert.equal(/Ivor/i.test(both), false, "hidden lane name must not ship");
assert.equal(/Elon/.test(both), false, "Elon must appear nowhere");
assert.equal(/Always on/.test(both), false, "Marvin detail must not say Always on");
assert.equal(/Test \(Elon gate\)/.test(both), false);
assert.equal(index.includes("Marvin's 10-point gate"), true);
assert.equal(flow.includes("Marvin's 10-point gate"), true);
assert.equal(/TEST Job [ABC]/.test(both), false, "dummy jobs must be gone");
assert.equal(/Search Studio/.test(both), false);
assert.equal(/cull/i.test(index), false);
assert.equal(/hourly/i.test(index), false);
assert.equal(index.includes("Ara and Marvin both check the live page on the phone (412 and Fold), then the link goes to Ange."), true);
assert.equal(index.includes("Only Ara asks Ange"), true);
assert.equal(index.includes("Ara 2.1"), true);
assert.equal(index.includes("boss and builder"), true);
assert.equal(index.includes("24/7 sweep"), true);
assert.equal(index.includes("status: not wired yet"), true);
assert.equal(index.includes("Nirvana key (not your Desk PIN)"), true);
assert.equal(index.includes("Unlocking… takes a few seconds"), true);
assert.equal(index.includes("Key saved on this phone ✓"), true);
assert.equal(index.includes("Congratulations. You're a genius."), true);
assert.equal(index.includes("Nirvana · v11 · 2026-10-20"), true);
assert.equal(/falcon9\.jpg|pwa\/lanes\//.test(index), false, "no lane image file");
assert.equal(/<img\b[^>]*(?:jpg|png)/i.test(index), false, "lane icons are inline svg");
assert.ok(index.includes('data-icon="ara"') && index.includes('data-icon="marvin"') && index.includes('data-icon="terafab"') && index.includes('data-icon="falcon"') && index.includes('data-icon="neuralink"') && index.includes('data-icon="flow"'));
assert.equal(index.includes("#d4af37"), true);
assert.equal(index.includes("#9b6dff"), true);
assert.equal(index.includes("#5b6b7f"), true);
assert.equal(index.includes("#2bb8d6"), true);
assert.equal(index.includes("#2fbf9a"), true);
assert.equal(/locked hex/i.test(index), false);
for (const gone of ["Projects", "Amend", "History thread", "1300 follow-ups", "Proxmox", "Wi-Fi", "Lock settings", "YOU ARE HERE"]) {
  assert.equal(index.includes(gone), false, "unbuilt control still present: " + gone);
}
assert.equal(flow.includes("nvMount"), false, "flow must not mount the old board");
assert.equal(index.includes("nvMount"), false, "home must not mount the old board");
assert.match(index, /a\.tap\{[^}]*display:\s*inline-flex/);
assert.match(index, /a\.tap\{[^}]*min-height:\s*44px/);
assert.equal(index.includes('id="nvLock"'), true);
assert.match(index, /id="nvLock"[^>]*>Lock</);
const team = index.slice(index.indexOf('id="sheet-team"'), index.indexOf('id="nvWin"'));
assert.equal(team.includes("grokbot://app/v1/agent?id=0aca7e2c-756b-4a08-a1c7-d0751a5703bb"), true, "Ara team chat link");
assert.equal(team.includes("grokbot://app/v1/agent?id=7a2f50df-0230-48ec-855a-33b9e7bfeb71"), true, "Marvin team chat link");
assert.match(index, /#nvMapToast\{[^}]*position:\s*static/);
assert.equal(index.includes("localStorage.removeItem(NVK)"), true);
assert.equal(index.includes("sessionStorage.removeItem(NVK)"), true);

const meta = readFileSync(new URL("./manifest.webmanifest", import.meta.url), "utf8");
assert.equal(meta.includes("Nirvana · v11 · 2026-10-20"), true);

const map = readFileSync(new URL("../metatron3.html", import.meta.url), "utf8");
assert.equal(map.includes("Elon Musk 2.0"), false);
assert.equal(map.includes('"name": "Marvin Musk"'), true);

console.log("v11-check ok");
