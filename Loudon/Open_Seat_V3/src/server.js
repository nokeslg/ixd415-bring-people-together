// Open Seat on PartyServer (PartyKit's open-source successor, running on
// Cloudflare). Same rules as V1, but everyone connects to one live "lobby"
// room over WebSockets, and it runs in the cloud.
// Everything lives in the room's memory: if the room restarts, it's wiped.

import { Server, routePartykitRequest } from "partyserver";

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
const GROUP_WAIT_MS = 2 * 60_000;
const GROUP_COLORS = [
  { name: "Purple", hex: "#7b4ce0" },
  { name: "Orange", hex: "#e8752a" },
  { name: "Teal", hex: "#169c8c" },
  { name: "Pink", hex: "#d6458f" },
  { name: "Gold", hex: "#c99a10" },
  { name: "Blue", hex: "#2a6be8" },
];

// Quiz results. The emoji stands in for our own mascots later.
const ARCHETYPES = {
  sunshine: { emoji: "🌻", label: "The Sunshine" },
  quiet: { emoji: "🎧", label: "The Quiet One" },
  foodie: { emoji: "🍜", label: "The Foodie" },
  studybuddy: { emoji: "🧠", label: "The Study Buddy" },
  easygoing: { emoji: "☕", label: "The Easygoing" },
};
const GENDERS = ["woman", "man", "nonbinary", "unsaid"];
const DIETS = { vegetarian: "🥦 vegetarian", vegan: "🌱 vegan", glutenfree: "🌾 gluten-free", allergies: "⚠️ allergies" };
const BUDGETS = { cheap: "$", mid: "$$" };

// Can these people all sit together? Everyone's comfort setting has to work
// for everyone else at the table. "Prefer not to say" counts like a man
// toward a limit, so limits only ever let in people who shared.
function fitsTogether(people) {
  return people.every((p) => {
    const others = people.filter((o) => o !== p);
    const notMen = (o) => o.gender === "woman" || o.gender === "nonbinary";
    if (p.comfort.type === "wnb") return others.every(notMen);
    if (p.comfort.type === "cap") return others.filter((o) => !notMen(o)).length <= p.comfort.maxMen;
    return true;
  });
}

const id = () => crypto.randomUUID().slice(0, 8);
const clip = (s, n) => String(s ?? "").trim().slice(0, n);

export class OpenSeat extends Server {
  onStart() {
    this.conns = new Map(); // connection id -> uid
    this.users = new Map(); // uid -> { id, name, emoji, tableId }
    this.reset();

    // Close tables whose time is up, and start groups that waited long enough.
    setInterval(() => {
      let changed = this.formGroups();
      for (const t of this.tables.values()) {
        if (Date.now() > t.endsAt) {
          for (const m of t.members) this.users.get(m).tableId = null;
          this.tables.delete(t.id);
          changed = true;
        }
      }
      if (changed) this.sync();
    }, 5000);
  }

  // Empty every group and the waiting lines, and zero the stats.
  // People who are online right now stay signed in.
  reset() {
    for (const u of this.users.values()) u.tableId = null;
    this.tables = new Map(); // id -> table
    this.queues = { lunch: [], study: [] }; // [{ uid, spot, at }] waiting for a random group
    this.stats = { uniqueUsers: new Set(this.conns.values()), peakOnline: 0, peakTable: 0, tablesOpened: 0, meetups: 0, groupsFormed: 0 };
  }

  online() {
    return new Set(this.conns.values());
  }

  // What others can see. Gender and comfort settings stay private.
  publicUser(u) {
    const tags = [...u.diet.map((d) => DIETS[d]), u.budget && BUDGETS[u.budget], u.access && "♿ accessible spot"].filter(Boolean);
    return { id: u.id, name: u.name, emoji: u.emoji, archetype: ARCHETYPES[u.archetype].label, tags };
  }

  canJoin(u, t) {
    return fitsTogether([...t.members.map((m) => this.users.get(m)), u]);
  }

  snapshot() {
    const online = this.online();
    return {
      type: "state",
      online: [...online].map((uid) => this.publicUser(this.users.get(uid))),
      spots: SPOTS,
      groupSize: GROUP_SIZE,
      groupMin: GROUP_MIN,
      groupWaitMs: GROUP_WAIT_MS,
      queues: Object.fromEntries(
        Object.entries(this.queues).map(([mode, q]) => [mode, q.map((e) => ({ uid: e.uid, at: e.at }))])
      ),
      tables: [...this.tables.values()].map((t) => ({
        id: t.id,
        hostId: t.hostId,
        group: t.group || null,
        mode: t.mode,
        spot: t.spot,
        topic: t.topic,
        hint: t.hint,
        chairs: t.chairs,
        endsAt: t.endsAt,
        members: t.members.map((m) => ({ ...this.publicUser(this.users.get(m)), here: t.checkedIn.has(m) })),
        chat: t.chat.slice(-30),
      })),
    };
  }

  // Send everyone the latest state, plus which groups fit them and how many
  // people in their random-group line fit with them.
  sync() {
    this.stats.peakOnline = Math.max(this.stats.peakOnline, this.online().size);
    const base = this.snapshot();
    for (const conn of this.getConnections()) {
      const u = this.users.get(this.conns.get(conn.id));
      const fits = u ? this.openTables().filter((t) => this.canJoin(u, t)).map((t) => t.id) : [];
      const line = u && Object.values(this.queues).find((q) => q.some((e) => e.uid === u.id));
      const myLine = line ? line.filter((e) => fitsTogether([u, this.users.get(e.uid)])).length : 0;
      conn.send(JSON.stringify({ ...base, fits, myLine }));
    }
  }

  leaveTable(u) {
    const t = this.tables.get(u.tableId);
    u.tableId = null;
    if (!t) return;
    t.members = t.members.filter((m) => m !== u.id);
    t.checkedIn.delete(u.id);
    if (t.members.length === 0) return this.tables.delete(t.id);
    if (t.hostId === u.id) t.hostId = t.members[0]; // hand the table to the next person
  }

  unqueue(u) {
    for (const mode in this.queues) this.queues[mode] = this.queues[mode].filter((e) => e.uid !== u.id);
  }

  seatAt(u, t) {
    this.unqueue(u);
    if (u.tableId) this.leaveTable(u);
    t.members.push(u.id);
    u.tableId = t.id;
    this.stats.peakTable = Math.max(this.stats.peakTable, t.members.length);
  }

  openTables(mode) {
    // Random groups are closed: you can't Spin or Sit into one.
    return [...this.tables.values()].filter((t) => !t.group && t.members.length < t.chairs && (!mode || t.mode === mode));
  }

  // Find a group in a line: start from whoever has waited longest and add
  // people whose settings fit with everyone picked so far. If that person
  // can't make a group, try the next person in line.
  pickGroup(q) {
    for (const anchor of q) {
      const picked = [anchor];
      for (const e of q) {
        if (picked.length === GROUP_SIZE) break;
        if (picked.includes(e)) continue;
        if (fitsTogether([...picked, e].map((x) => this.users.get(x.uid)))) picked.push(e);
      }
      const full = picked.length === GROUP_SIZE;
      const waitedLongEnough = picked.length >= GROUP_MIN && Date.now() - anchor.at >= GROUP_WAIT_MS;
      if (full || waitedLongEnough) return picked;
    }
    return null;
  }

  // Turn waiting people into random groups. Returns true if any group formed.
  formGroups() {
    let formed = false;
    const online = this.online();
    for (const mode in this.queues) {
      this.queues[mode] = this.queues[mode].filter((e) => online.has(e.uid)); // drop people who closed the app
      const picked = this.pickGroup(this.queues[mode]);
      if (!picked) continue;
      this.queues[mode] = this.queues[mode].filter((e) => !picked.includes(e));
      // Meet at a spot someone asked for, or anywhere if nobody minded.
      const wanted = picked.map((e) => e.spot).filter((s) => SPOTS.includes(s));
      const pool = wanted.length ? wanted : SPOTS;
      const color = GROUP_COLORS[this.stats.groupsFormed % GROUP_COLORS.length];
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
      this.tables.set(t.id, t);
      this.stats.groupsFormed++;
      for (const e of picked) this.seatAt(this.users.get(e.uid), t);
      formed = true;
    }
    return formed;
  }

  // Each action: (user, message) -> optional { error }.
  actions = {
    open: (u, b) => {
      const spot = SPOTS.includes(b.spot) ? b.spot : SPOTS[0];
      const minutes = [15, 30, 45, 60].includes(Number(b.minutes)) ? Number(b.minutes) : 30;
      const t = {
        id: id(),
        hostId: u.id,
        mode: b.mode === "study" ? "study" : "lunch",
        spot,
        topic: clip(b.topic, 40) || "anything",
        hint: clip(b.hint, 80),
        chairs: Math.min(MAX_CHAIRS, Math.max(2, Number(b.chairs) || 5)),
        endsAt: Date.now() + minutes * 60_000,
        members: [],
        checkedIn: new Set(),
        chat: [],
      };
      this.tables.set(t.id, t);
      this.stats.tablesOpened++;
      this.seatAt(u, t);
    },
    join: (u, b) => {
      const t = this.tables.get(b.tableId);
      if (!t) return { error: "That table just closed." };
      if (t.members.includes(u.id)) return;
      if (t.members.length >= t.chairs) return { error: "That table just filled up." };
      if (t.group || !this.canJoin(u, t)) return { error: "That group isn't a match for your settings." };
      this.seatAt(u, t);
    },
    spin: (u, b) => {
      const options = this.openTables(b.mode).filter((t) => !t.members.includes(u.id) && this.canJoin(u, t));
      if (!options.length) return { error: "No open seats for that right now. Open one yourself?" };
      this.seatAt(u, options[Math.floor(Math.random() * options.length)]);
    },
    checkin: (u) => {
      const t = this.tables.get(u.tableId);
      if (!t) return;
      if (!t.checkedIn.has(u.id) && t.checkedIn.size === 1) this.stats.meetups++; // 2nd person arrives = a meetup
      t.checkedIn.add(u.id);
    },
    chat: (u, b) => {
      const t = this.tables.get(u.tableId);
      const text = clip(b.text, 200);
      if (t && text) t.chat.push({ name: u.name, emoji: u.emoji, text, at: Date.now() });
    },
    leave: (u) => {
      this.leaveTable(u);
    },
    queue: (u, b) => {
      const mode = b.mode === "study" ? "study" : "lunch";
      if (u.tableId) this.leaveTable(u);
      this.unqueue(u);
      this.queues[mode].push({ uid: u.id, spot: SPOTS.includes(b.spot) ? b.spot : null, at: Date.now() });
      this.formGroups();
    },
    unqueue: (u) => {
      this.unqueue(u);
    },
  };

  onMessage(conn, raw) {
    let b;
    try { b = JSON.parse(raw); } catch { return; }

    // First message on every connection says who you are. The browser keeps
    // its id, so a refresh (or a room restart) keeps the same person.
    if (b.type === "hello") {
      const uid = clip(b.uid, 40);
      if (!uid) return;
      const u = this.users.get(uid) || { id: uid, tableId: null };
      // Quiz answers. Anything unexpected falls back to the safest default.
      const p = b.profile || {};
      u.name = clip(b.name, 20) || "Someone";
      u.archetype = Object.hasOwn(ARCHETYPES, p.archetype) ? p.archetype : "easygoing";
      u.emoji = ARCHETYPES[u.archetype].emoji;
      u.gender = GENDERS.includes(p.gender) ? p.gender : "unsaid";
      u.comfort = p.comfort === "wnb" ? { type: "wnb" }
        : [1, 2, 3].includes(Number(p.comfort)) ? { type: "cap", maxMen: Number(p.comfort) }
        : { type: "anyone" };
      u.diet = (Array.isArray(p.diet) ? p.diet : []).filter((d) => Object.hasOwn(DIETS, d));
      u.budget = Object.hasOwn(BUDGETS, p.budget) ? p.budget : null;
      u.access = p.access === true;
      this.users.set(uid, u);
      this.stats.uniqueUsers.add(uid);
      this.conns.set(conn.id, uid);
      return this.sync();
    }

    const u = this.users.get(this.conns.get(conn.id));
    const action = this.actions[b.type];
    if (!u || !action) return;
    const result = action(u, b) || {};
    if (result.error) conn.send(JSON.stringify({ type: "error", error: result.error }));
    this.sync();
  }

  onClose(conn) {
    this.conns.delete(conn.id);
    this.sync();
  }

  // GET /parties/open-seat/lobby: numbers for numbers.md.
  // POST with the right x-reset-key header: empty the lobby before a test.
  onRequest(request) {
    if (request.method === "POST") {
      if (!this.env.RESET_KEY || request.headers.get("x-reset-key") !== this.env.RESET_KEY) {
        return new Response("Not allowed", { status: 403 });
      }
      this.reset();
      this.sync();
      return Response.json({ reset: true });
    }
    return Response.json({
      uniquePeople: this.stats.uniqueUsers.size,
      onlineNow: this.online().size,
      peakOnlineAtOnce: this.stats.peakOnline,
      biggestTable: this.stats.peakTable,
      tablesOpened: this.stats.tablesOpened,
      meetups: this.stats.meetups,
      groupsFormed: this.stats.groupsFormed,
    });
  }
}

export default {
  async fetch(request, env) {
    return (await routePartykitRequest(request, env)) || new Response("Not found", { status: 404 });
  },
};
