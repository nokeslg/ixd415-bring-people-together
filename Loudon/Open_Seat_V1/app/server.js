// Open Seat: rough prototype server.
// No dependencies. Live updates use Server-Sent Events (SSE).
// Everything lives in memory: restarting the server wipes it.

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");

const SPOTS = [
  "Kansas Union",
  "Burge Union",
  "Watson Library",
  "Anschutz Library",
  "Wescoe Hall",
  "DeBruce Center",
  "Chalmers Hall",
  "Mrs. E's",
];
const MAX_CHAIRS = 5; // host + 4, the brief's "5 live at once"

// Random groups: fill to GROUP_SIZE, or start early with GROUP_MIN once
// the first person has waited GROUP_WAIT_MS.
const GROUP_SIZE = 5;
const GROUP_MIN = 3;
const GROUP_WAIT_MS = Number(process.env.GROUP_WAIT_MS) || 2 * 60_000;
const GROUP_COLORS = [
  { name: "Purple", hex: "#7b4ce0" },
  { name: "Orange", hex: "#e8752a" },
  { name: "Teal", hex: "#169c8c" },
  { name: "Pink", hex: "#d6458f" },
  { name: "Gold", hex: "#c99a10" },
  { name: "Blue", hex: "#2a6be8" },
];

const users = new Map(); // id -> { id, name, emoji, tableId }
const tables = new Map(); // id -> table
const queues = { lunch: [], study: [] }; // [{ uid, spot, at }] waiting for a random group
const streams = new Map(); // user id -> Set of open SSE responses
const stats = { uniqueUsers: new Set(), peakOnline: 0, peakTable: 0, tablesOpened: 0, meetups: 0, groupsFormed: 0 };

const id = () => crypto.randomBytes(4).toString("hex");
const clip = (s, n) => String(s ?? "").trim().slice(0, n);

function publicUser(u) {
  return { id: u.id, name: u.name, emoji: u.emoji };
}

function snapshot() {
  return {
    online: [...users.values()].filter((u) => streams.has(u.id)).map(publicUser),
    spots: SPOTS,
    groupSize: GROUP_SIZE,
    groupMin: GROUP_MIN,
    groupWaitMs: GROUP_WAIT_MS,
    queues: Object.fromEntries(
      Object.entries(queues).map(([mode, q]) => [mode, q.map((e) => ({ uid: e.uid, at: e.at }))])
    ),
    tables: [...tables.values()].map((t) => ({
      id: t.id,
      hostId: t.hostId,
      group: t.group || null,
      mode: t.mode,
      spot: t.spot,
      topic: t.topic,
      hint: t.hint,
      chairs: t.chairs,
      endsAt: t.endsAt,
      members: t.members.map((m) => ({ ...publicUser(users.get(m)), here: t.checkedIn.has(m) })),
      chat: t.chat.slice(-30),
    })),
  };
}

function broadcast() {
  const online = [...users.keys()].filter((u) => streams.has(u)).length;
  stats.peakOnline = Math.max(stats.peakOnline, online);
  const data = `data: ${JSON.stringify({ type: "state", ...snapshot() })}\n\n`;
  for (const set of streams.values()) for (const res of set) res.write(data);
}

function leaveTable(u) {
  const t = tables.get(u.tableId);
  u.tableId = null;
  if (!t) return;
  t.members = t.members.filter((m) => m !== u.id);
  t.checkedIn.delete(u.id);
  if (t.members.length === 0) return tables.delete(t.id);
  if (t.hostId === u.id) t.hostId = t.members[0]; // hand the table to the next person
}

function unqueue(u) {
  for (const mode in queues) queues[mode] = queues[mode].filter((e) => e.uid !== u.id);
}

function seatAt(u, t) {
  unqueue(u);
  if (u.tableId) leaveTable(u);
  t.members.push(u.id);
  u.tableId = t.id;
  stats.peakTable = Math.max(stats.peakTable, t.members.length);
}

function openTables(mode) {
  // Random groups are closed: you can't Spin or Sit into one.
  return [...tables.values()].filter((t) => !t.group && t.members.length < t.chairs && (!mode || t.mode === mode));
}

// Turn waiting people into random groups. Returns true if any group formed.
function formGroups() {
  let formed = false;
  for (const mode in queues) {
    queues[mode] = queues[mode].filter((e) => streams.has(e.uid)); // drop people who closed the app
    const q = queues[mode];
    const full = q.length >= GROUP_SIZE;
    const waitedLongEnough = q.length >= GROUP_MIN && Date.now() - q[0].at >= GROUP_WAIT_MS;
    if (!full && !waitedLongEnough) continue;
    const picked = q.splice(0, GROUP_SIZE);
    // Meet at a spot someone asked for, or anywhere if nobody minded.
    const wanted = picked.map((e) => e.spot).filter((s) => SPOTS.includes(s));
    const pool = wanted.length ? wanted : SPOTS;
    const color = GROUP_COLORS[stats.groupsFormed % GROUP_COLORS.length];
    const t = {
      id: id(),
      hostId: picked[0].uid,
      group: color,
      mode,
      spot: pool[Math.floor(Math.random() * pool.length)],
      topic: "random group",
      hint: `Look for the ${color.name.toLowerCase()} screen`,
      chairs: picked.length,
      endsAt: Date.now() + 45 * 60_000,
      members: [],
      checkedIn: new Set(),
      chat: [],
    };
    tables.set(t.id, t);
    stats.groupsFormed++;
    for (const e of picked) seatAt(users.get(e.uid), t);
    formed = true;
  }
  return formed;
}

// Each action: (user, body) -> optional { error } or extra data for the reply.
const actions = {
  open(u, b) {
    const spot = SPOTS.includes(b.spot) ? b.spot : SPOTS[0];
    const minutes = [30, 45, 60].includes(Number(b.minutes)) ? Number(b.minutes) : 30;
    const t = {
      id: id(),
      hostId: u.id,
      mode: b.mode === "study" ? "study" : "lunch",
      spot,
      topic: clip(b.topic, 40) || "anything",
      hint: clip(b.hint, 80),
      chairs: Math.min(MAX_CHAIRS, Math.max(2, Number(b.chairs) || 4)),
      endsAt: Date.now() + minutes * 60_000,
      members: [],
      checkedIn: new Set(),
      chat: [],
    };
    tables.set(t.id, t);
    stats.tablesOpened++;
    seatAt(u, t);
  },
  join(u, b) {
    const t = tables.get(b.tableId);
    if (!t) return { error: "That table just closed." };
    if (t.members.includes(u.id)) return;
    if (t.members.length >= t.chairs) return { error: "That table just filled up." };
    seatAt(u, t);
  },
  spin(u, b) {
    const options = openTables(b.mode).filter((t) => !t.members.includes(u.id));
    if (!options.length) return { error: "No open seats for that right now. Open one yourself?" };
    seatAt(u, options[Math.floor(Math.random() * options.length)]);
  },
  checkin(u) {
    const t = tables.get(u.tableId);
    if (!t) return;
    if (!t.checkedIn.has(u.id) && t.checkedIn.size === 1) stats.meetups++; // 2nd person arrives = a meetup
    t.checkedIn.add(u.id);
  },
  chat(u, b) {
    const t = tables.get(u.tableId);
    const text = clip(b.text, 200);
    if (t && text) t.chat.push({ name: u.name, emoji: u.emoji, text, at: Date.now() });
  },
  leave(u) {
    leaveTable(u);
  },
  queue(u, b) {
    const mode = b.mode === "study" ? "study" : "lunch";
    if (u.tableId) leaveTable(u);
    unqueue(u);
    queues[mode].push({ uid: u.id, spot: SPOTS.includes(b.spot) ? b.spot : null, at: Date.now() });
    formGroups();
  },
  unqueue(u) {
    unqueue(u);
  },
};

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c).length > 10_000 && req.destroy());
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); }
    });
  });
}

function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");

  if (req.method === "POST" && url.pathname === "/api/hello") {
    const b = await readBody(req);
    const u = { id: id(), name: clip(b.name, 20) || "Someone", emoji: clip(b.emoji, 4) || "🙂", tableId: null };
    users.set(u.id, u);
    stats.uniqueUsers.add(u.id);
    return send(res, 200, { uid: u.id });
  }

  if (req.method === "POST" && url.pathname.startsWith("/api/")) {
    const b = await readBody(req);
    const u = users.get(b.uid);
    const action = actions[url.pathname.slice(5)];
    if (!u) return send(res, 401, { error: "unknown user" });
    if (!action) return send(res, 404, { error: "unknown action" });
    const result = action(u, b) || {};
    broadcast();
    return send(res, result.error ? 400 : 200, result);
  }

  if (url.pathname === "/events") {
    const uid = url.searchParams.get("uid");
    if (!users.has(uid)) return send(res, 401, { error: "unknown user" });
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    if (!streams.has(uid)) streams.set(uid, new Set());
    streams.get(uid).add(res);
    broadcast();
    req.on("close", () => {
      const set = streams.get(uid);
      set.delete(res);
      if (set.size === 0) streams.delete(uid);
      broadcast();
    });
    return;
  }

  if (url.pathname === "/stats") {
    return send(res, 200, {
      uniquePeople: stats.uniqueUsers.size,
      onlineNow: streams.size,
      peakOnlineAtOnce: stats.peakOnline,
      biggestTable: stats.peakTable,
      tablesOpened: stats.tablesOpened,
      meetups: stats.meetups,
      groupsFormed: stats.groupsFormed,
    });
  }

  // Static files
  const file = path.join(PUBLIC, url.pathname === "/" ? "index.html" : url.pathname);
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: "nope" });
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, { error: "not found" });
    const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
    res.writeHead(200, { "Content-Type": (types[path.extname(file)] || "application/octet-stream") + "; charset=utf-8" });
    res.end(data);
  });
});

// Close tables whose time is up, start groups that waited long enough,
// and keep SSE connections alive.
setInterval(() => {
  let changed = formGroups();
  for (const t of tables.values()) {
    if (Date.now() > t.endsAt) {
      for (const m of t.members) users.get(m).tableId = null;
      tables.delete(t.id);
      changed = true;
    }
  }
  if (changed) broadcast();
  for (const set of streams.values()) for (const r of set) r.write(": ping\n\n");
}, 5000);

server.listen(PORT, "0.0.0.0", () => console.log(`Open Seat running at http://localhost:${PORT}`));
