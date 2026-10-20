/* Draft helpers for the Nirvana board. Nothing here sends mail or calls the network. */
var NV_SILENCE_MS = 180000;
var NV_VERSION = "2026.10.20";
var NV_BUILD = "2026-10-20";
var NV_DEVICE_KEY = "nv_device_override";
var NV_WHO_KEY = "nv_who";
var NV_WAIT_KEY = "nv_waiting_yes";
var NV_NOTE_KEY = "nv_group_notes";
var NV_DEVICES = ["Fold 8", "Flip 6", "Desktop", "Phone"];
var NV_FIXED_ROWS = [
  {label: "PR #18", action: "say merge"},
  {label: "PR #19", action: "say merge"},
  {label: "Spong deed", action: "signature needed"}
];
var NV_MAIL_GROUPS = [
  {id: "g1", name: "Strata quote requests and tenders", count: "~25", chips: ["label", "log", "draft reply"], approve: true},
  {id: "g2", name: "Replies to Zoho estimates", count: "~20", chips: ["label", "log", "draft reply"], approve: true},
  {id: "g3", name: "Work orders and purchase orders", count: "~30", chips: ["label", "file to Drive", "log"], approve: true},
  {id: "g4", name: "Remittance advices", count: "~36", chips: ["label", "file to Drive", "log", "archive"], approve: true},
  {id: "g5", name: "Supplier bills and statements", count: "~30", chips: ["label", "file to Drive"], approve: true},
  {id: "g6", name: "Order and delivery updates", count: "~90", chips: ["label", "archive", "file to Drive"], approve: true},
  {id: "g7", name: "Anthropic receipts", count: "50+", chips: ["label", "file to Drive", "log"], approve: true},
  {id: "g8", name: "UniFi access alerts", count: "~24", chips: ["label"], approve: true},
  {id: "g9", name: "Sign-in links, codes and alerts", count: "~20", chips: ["label", "archive"], approve: true},
  {id: "g10", name: "Xero payment authorisation codes", count: "12", chips: ["label", "archive"], approve: true},
  {id: "g11", name: "Payment and bank notices", count: "~30", chips: ["label", "file to Drive", "archive"], approve: true},
  {id: "g12", name: "xAI / Grok spend", count: "16", chips: ["label", "file to Drive", "log"], approve: true},
  {id: "g13", name: "Self-sent REALM EOD", count: "18", chips: ["label", "archive"], approve: true},
  {id: "g14", name: "Newsletters and promotions", count: "~35", chips: ["archive"], approve: true},
  {id: "g15", name: "Zoho Books weekly report", count: "~16", chips: ["file to Drive", "archive"], approve: true},
  {id: "g16", name: "SEEK recruiting", count: "~16", chips: ["label", "log"], approve: true},
  {id: "g17", name: "Xero supplier statements", count: "5", chips: ["label"], approve: true},
  {id: "g18", name: "Client replies to Realm invoices", count: "~8", chips: ["label", "log"], approve: true},
  {id: "g19", name: "Zoho undelivered payment mail", count: "5", chips: ["label"], approve: true},
  {id: "g20", name: "Website and hosting alerts", count: "~11", chips: ["label"], approve: true},
  {id: "g21", name: "Overdue or collection notices", count: "~4", chips: ["label", "draft reply"], approve: true},
  {id: "g22", name: "GitHub notifications", count: "~10", chips: ["label", "archive"], approve: true},
  {id: "g23", name: "Calendar acceptances and bookings", count: "~5", chips: ["label", "archive"], approve: true},
  {id: "g24", name: "Fines Victoria reminders", count: "3", chips: [], approve: true},
  {id: "g25", name: "Zapier weekly task summary", count: "1", chips: [], approve: false, flag: true}
];

function detectNvDevice(ua, width) {
  ua = String(ua || "");
  width = Number(width);
  if (!isFinite(width)) width = 0;
  if (/SM-F96/i.test(ua)) return "Fold 8";
  if (/SM-F74/i.test(ua)) return "Flip 6";
  var mobile = /iPhone|iPod|iPad|Mobile/i.test(ua);
  if (width > 1024 && !mobile) return "Desktop";
  return "Phone";
}

function nextDeviceOverride(current) {
  var i = NV_DEVICES.indexOf(current || "");
  if (i < 0) return NV_DEVICES[0];
  if (i >= NV_DEVICES.length - 1) return "";
  return NV_DEVICES[i + 1];
}

function deviceStamp(o) {
  o = o || {};
  var override = o.override ? String(o.override) : "";
  var name = override || detectNvDevice(o.ua, o.width);
  var how = override ? "set" : "detected";
  return how + " \u00b7 " + name + " \u00b7 v" + o.version + " \u00b7 " + o.build;
}

function nextWho(current) {
  return current === "Julie" ? "Ange" : "Julie";
}

function whoLabel(who) {
  return (who === "Julie" ? "Julie" : "Ange") + " here";
}

function silenceDue(last, now, waitMs) {
  last = Number(last);
  now = Number(now);
  waitMs = Number(waitMs);
  if (!isFinite(last) || !isFinite(now) || !isFinite(waitMs)) return false;
  if (last <= 0) return false;
  return (now - last) >= waitMs;
}

function silenceRows(waiting) {
  var fixed = {};
  NV_FIXED_ROWS.forEach(function(row) { fixed[row.label] = 1; });
  var rows = [];
  (waiting || []).forEach(function(name) {
    name = String(name || "");
    if (!name || fixed[name]) return;
    rows.push({label: name, action: "queued"});
  });
  return rows.concat(NV_FIXED_ROWS);
}

function nvLooksLikeCode(text) {
  var s = String(text || "");
  if (/\b\d{4,}\b/.test(s)) return true;
  if (/\b(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{6,}\b/.test(s)) return true;
  return false;
}

var nvLastActivity = 0;
var nvSilenceOpen = false;

function nvReadList(key) {
  try {
    var v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

function nvReadNotes() {
  try {
    var v = JSON.parse(localStorage.getItem(NV_NOTE_KEY) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch (e) {
    return {};
  }
}

function nvGroupById(id) {
  for (var i = 0; i < NV_MAIL_GROUPS.length; i++) if (NV_MAIL_GROUPS[i].id === id) return NV_MAIL_GROUPS[i];
  return null;
}

function nvQueueYes(label) {
  label = String(label || "").trim();
  if (!label) return nvReadList(NV_WAIT_KEY);
  var list = nvReadList(NV_WAIT_KEY);
  if (list.indexOf(label) < 0) list.push(label);
  localStorage.setItem(NV_WAIT_KEY, JSON.stringify(list));
  return list;
}

function nvPaintStamp() {
  var el = document.getElementById("nvStamp");
  if (!el) return;
  var override = "";
  try { override = localStorage.getItem(NV_DEVICE_KEY) || ""; } catch (e) {}
  if (NV_DEVICES.indexOf(override) < 0) override = "";
  el.textContent = deviceStamp({
    ua: navigator.userAgent,
    width: window.innerWidth,
    override: override,
    version: NV_VERSION,
    build: NV_BUILD
  });
}

function nvPaintWho() {
  var el = document.getElementById("nvWho");
  if (!el) return;
  var who = "Ange";
  try { who = localStorage.getItem(NV_WHO_KEY) || "Ange"; } catch (e) {}
  if (who !== "Julie") who = "Ange";
  el.textContent = whoLabel(who);
}

function nvPaintWaiting() {
  var list = nvReadList(NV_WAIT_KEY);
  var host = document.getElementById("mailWait");
  if (host) {
    host.textContent = "";
    if (!list.length) {
      var empty = document.createElement("li");
      empty.textContent = "None yet. Every group is off.";
      host.appendChild(empty);
    } else {
      list.forEach(function(name) {
        var li = document.createElement("li");
        li.textContent = name;
        host.appendChild(li);
      });
    }
  }
  NV_MAIL_GROUPS.forEach(function(g) {
    var st = document.getElementById("mailSt-" + g.id);
    if (!st) return;
    var on = list.indexOf(g.name) >= 0;
    st.textContent = on ? "Waiting for Ange's yes" : "Off";
  });
  if (nvSilenceOpen) nvPaintSilence();
}

function nvPaintSilence() {
  var card = document.getElementById("nvSilence");
  var list = document.getElementById("nvSilenceList");
  if (!card || !list) return;
  list.textContent = "";
  silenceRows(nvReadList(NV_WAIT_KEY)).forEach(function(row) {
    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nv-q";
    btn.textContent = row.label + " \u00b7 " + row.action;
    btn.addEventListener("click", function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      nvQueueYes(row.label);
    });
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function nvNoteActivity(ts) {
  nvLastActivity = ts || Date.now();
  nvSilenceOpen = false;
  var card = document.getElementById("nvSilence");
  if (card) card.hidden = true;
}

function nvDraftTick(now) {
  now = now || Date.now();
  if (!nvLastActivity) nvLastActivity = now;
  var card = document.getElementById("nvSilence");
  if (!card) return false;
  if (silenceDue(nvLastActivity, now, NV_SILENCE_MS)) {
    nvSilenceOpen = true;
    nvPaintSilence();
    card.hidden = false;
    return true;
  }
  return false;
}

function nvKeepNote(id, text) {
  var g = nvGroupById(id);
  if (!g) return "missing";
  var status = document.getElementById("mailNoteSt-" + id);
  var input = document.querySelector('[data-note="' + id + '"]');
  if (nvLooksLikeCode(text)) {
    if (input) input.value = "";
    var notes = nvReadNotes();
    if (notes[id]) {
      delete notes[id];
      localStorage.setItem(NV_NOTE_KEY, JSON.stringify(notes));
    }
    if (status) status.textContent = "Codes are not kept.";
    return "code";
  }
  var clean = String(text || "").trim();
  var notesOk = nvReadNotes();
  if (clean) notesOk[id] = clean;
  else delete notesOk[id];
  localStorage.setItem(NV_NOTE_KEY, JSON.stringify(notesOk));
  if (status) status.textContent = clean ? "Saved on this phone." : "";
  return "ok";
}

function nvRenderMail() {
  var host = document.getElementById("mailGroups");
  if (!host) return;
  host.textContent = "";
  var notes = nvReadNotes();
  NV_MAIL_GROUPS.forEach(function(g) {
    var art = document.createElement("article");
    art.className = "mailg";
    var h = document.createElement("h3");
    h.textContent = g.name;
    var count = document.createElement("p");
    count.className = "mailcount";
    count.textContent = g.count;
    art.appendChild(h);
    art.appendChild(count);
    if (g.chips && g.chips.length) {
      var chips = document.createElement("p");
      chips.className = "mailchips";
      g.chips.forEach(function(chip) {
        var s = document.createElement("span");
        s.className = "mailchip";
        s.textContent = chip;
        chips.appendChild(s);
      });
      art.appendChild(chips);
    }
    if (g.flag) {
      var flag = document.createElement("p");
      flag.className = "mailflag";
      flag.textContent = "FLAG";
      art.appendChild(flag);
    }
    var row = document.createElement("div");
    row.className = "mailrow";
    var label = document.createElement("label");
    label.textContent = "Note";
    var input = document.createElement("input");
    input.type = "text";
    input.setAttribute("data-note", g.id);
    input.setAttribute("aria-label", "Note for " + g.name);
    input.autocomplete = "off";
    if (notes[g.id] && !nvLooksLikeCode(notes[g.id])) input.value = notes[g.id];
    input.addEventListener("change", function() { nvKeepNote(g.id, input.value); });
    label.appendChild(input);
    row.appendChild(label);
    var mic = document.createElement("button");
    mic.type = "button";
    mic.className = "mailmic";
    mic.textContent = "Speak";
    mic.addEventListener("click", function() { nvSpeakInto(g.id, input); });
    row.appendChild(mic);
    if (g.approve) {
      var ok = document.createElement("button");
      ok.type = "button";
      ok.className = "mailok";
      ok.textContent = "Approve";
      ok.addEventListener("click", function() {
        nvKeepNote(g.id, input.value);
        nvQueueYes(g.name);
        nvPaintWaiting();
      });
      row.appendChild(ok);
    }
    art.appendChild(row);
    var st = document.createElement("p");
    st.className = "mailst";
    st.id = "mailSt-" + g.id;
    st.textContent = "Off";
    art.appendChild(st);
    var noteSt = document.createElement("p");
    noteSt.className = "mailnotest";
    noteSt.id = "mailNoteSt-" + g.id;
    art.appendChild(noteSt);
    host.appendChild(art);
  });
  nvPaintWaiting();
}

function nvSpeakInto(id, input) {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var status = document.getElementById("mailNoteSt-" + id);
  if (!SR) {
    if (status) status.textContent = "Type the note. Speech is not on this phone.";
    input.focus();
    return;
  }
  var rec = new SR();
  rec.lang = "en-AU";
  rec.onresult = function(ev) {
    var said = "";
    try { said = ev.results[0][0].transcript || ""; } catch (e) { said = ""; }
    if (nvLooksLikeCode(said)) {
      input.value = "";
      nvKeepNote(id, "");
      return;
    }
    input.value = said;
    nvKeepNote(id, said);
  };
  rec.onerror = function() {
    if (status) status.textContent = "Type the note. Speech did not start.";
  };
  try { rec.start(); if (status) status.textContent = "Listening\u2026"; }
  catch (e) { if (status) status.textContent = "Type the note. Speech did not start."; }
}

function nvDraftBoot() {
  nvRenderMail();
  nvPaintStamp();
  nvPaintWho();
  nvNoteActivity(Date.now());
  var stamp = document.getElementById("nvStamp");
  if (stamp) stamp.addEventListener("click", function() {
    var cur = "";
    try { cur = localStorage.getItem(NV_DEVICE_KEY) || ""; } catch (e) {}
    var next = nextDeviceOverride(NV_DEVICES.indexOf(cur) < 0 ? "" : cur);
    try {
      if (next) localStorage.setItem(NV_DEVICE_KEY, next);
      else localStorage.removeItem(NV_DEVICE_KEY);
    } catch (e) {}
    nvPaintStamp();
  });
  var who = document.getElementById("nvWho");
  if (who) who.addEventListener("click", function() {
    var cur = "Ange";
    try { cur = localStorage.getItem(NV_WHO_KEY) || "Ange"; } catch (e) {}
    var next = nextWho(cur === "Julie" ? "Julie" : "Ange");
    try { localStorage.setItem(NV_WHO_KEY, next); } catch (e) {}
    nvPaintWho();
  });
  var dismiss = document.getElementById("nvSilenceDismiss");
  if (dismiss) dismiss.addEventListener("click", function(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    nvNoteActivity(Date.now());
  });
  document.addEventListener("pointerdown", function(ev) {
    var card = document.getElementById("nvSilence");
    if (card && card.contains(ev.target)) return;
    nvNoteActivity(Date.now());
  }, true);
  document.addEventListener("keydown", function(ev) {
    var card = document.getElementById("nvSilence");
    if (card && card.contains(ev.target)) return;
    nvNoteActivity(Date.now());
  }, true);
  setInterval(function() { nvDraftTick(Date.now()); }, 5000);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", nvDraftBoot);
  else nvDraftBoot();
}
