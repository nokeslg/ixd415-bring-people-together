// Side Quest (formerly Open Seat, Madi V4), on PartyServer (PartyKit's open-source successor,
// running on Cloudflare). Everyone connects to one live "lobby" room over
// WebSockets. Everything lives in the room's memory: if the room restarts,
// it's wiped.

import { Server, routePartykitRequest } from "partyserver";

// What people can meet up for, and the public spots allowed for each.
const ACTIVITIES = {
  // KU dining. Residence hall dining (North College Cafe, Studio Grill, Mrs. E's,
  // South Dining Commons) is open to everyone, even though it's in dorm buildings.
  // Then retail dining, and the eight Starbucks around campus.
  food: { label: "Food", emoji: "🍕", spots: ["North College Cafe", "Studio Grill", "Mrs. E's", "South Dining Commons", "The Market", "The Underground", "Courtside Cafe", "Starbucks at Kansas Union", "Starbucks at North College Cafe", "Starbucks at Studio Grill", "Starbucks at South Dining Commons", "Starbucks at Courtside Cafe", "Starbucks at The Underground", "Starbucks at Burge Union", "Starbucks at J Café (Capitol Federal Hall)"] },
  study: { label: "Study", emoji: "📚", spots: ["Watson Library", "Anschutz Library", "Wescoe Hall", "Chalmers Hall", "DeBruce Center", "Kansas Union"] },
  hangout: { label: "Hang out", emoji: "☕", spots: ["Starbucks at Kansas Union", "Starbucks at Burge Union", "Kansas Union", "DeBruce Center", "Spencer Museum of Art", "Potter Lake", "Ambler Rec Center"] },
  event: { label: "Events", emoji: "🎟️", spots: ["Lied Center", "Allen Fieldhouse", "Liberty Hall", "Spencer Museum of Art", "Kansas Union Ballroom", "Mass Street (downtown)"] },
};
// Every verified public place people can meet at. Starting a group or a plan
// only works at one of these, so nobody can set a meetup at a dorm room or
// someone's home. A real version would check against a maps service.
const PUBLIC_PLACES = [...new Set([
  ...Object.values(ACTIVITIES).flatMap((a) => a.spots),
  "Granada Theater", "The Bottleneck", "Lawrence Arts Center", "Lawrence Public Library", "Watkins Museum of History",
  "Dole Institute of Politics", "KU Natural History Museum", "Booth Family Hall of Athletics", "David Booth Memorial Stadium",
  "Hoglund Ballpark", "South Park", "Clinton Lake State Park", "Free State Brewing Co.", "The Merc Co+op",
  "Wheatfields Bakery", "Sunflower Outdoor & Bike Shop", "Kansas Union Bookstore", "Burge Union",
])];
// Case doesn't matter, and the part in brackets is optional.
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const placeFor = (s) => PUBLIC_PLACES.find((p) => norm(p) === norm(s) || norm(p.replace(/\s*\(.*\)/, "")) === norm(s)) || null;
const modeOf = (m) => (Object.hasOwn(ACTIVITIES, m) ? m : "food");
const spotFor = (mode, s) => (ACTIVITIES[mode].spots.includes(s) ? s : null);

const SIZES = [3, 4, 5]; // group sizes people can pick. 3 is the minimum, for safety.
const MAX_CHAIRS = 5; // host + 4, the brief's "5 live at once"

// Random groups: fill to the size people asked for, or start early with
// GROUP_MIN once the first person has waited GROUP_WAIT_MS.
const GROUP_SIZE = 5;
const GROUP_MIN = 3;
const GROUP_WAIT_MS = 2 * 60_000;
const GROUP_COLORS = [
  { name: "Purple", hex: "#6a3fd1" },
  { name: "Orange", hex: "#b9500f" },
  { name: "Teal", hex: "#0d7a6e" },
  { name: "Pink", hex: "#b42f72" },
  { name: "Gold", hex: "#8a6800" },
  { name: "Blue", hex: "#2458d0" },
];

// Plans can be made up to 2 weeks ahead.
const PLAN_AHEAD_MS = 14 * 24 * 3600_000;

// Quiz results. Each has a mascot drawn by Madi (the emoji stands in until it's drawn).
const ARCHETYPES = {
  sunshine: { emoji: "🌻", label: "The Sunshine" },
  quiet: { emoji: "🎧", label: "The Quiet One" },
  foodie: { emoji: "🍜", label: "The Foodie" },
  studybuddy: { emoji: "🧠", label: "The Study Buddy" },
  adventurer: { emoji: "🧭", label: "The Adventurer" },
  easygoing: { emoji: "☕", label: "The Easygoing" },
};
const INTERESTS = {
  music: "🎵 Music", sports: "🏀 Sports", gaming: "🎮 Gaming", art: "🎨 Art & design",
  movies: "🎬 Movies & TV", books: "📖 Books", outdoors: "🌲 Outdoors", fitness: "💪 Fitness",
  food: "🍳 Cooking & food", fashion: "👗 Fashion", tech: "💻 Tech", theater: "🎭 Theater",
};
const GENDERS = ["woman", "man", "nonbinary", "unsaid"];
const DIETS = { vegetarian: "🥦 vegetarian", vegan: "🌱 vegan", glutenfree: "🌾 gluten-free", allergies: "⚠️ allergies" };
const BUDGETS = { cheap: "$", mid: "$$" };

// Can these people all sit together? Everyone's setting has to work for
// everyone else at the table. The same three choices exist for every gender:
// - anyone: no limits.
// - buddy: a mix is fine, but I won't be the only one of my gender. The
//   first person to join me has to share my gender; after that, anyone.
// - same: only people of my gender.
// People who chose "Prefer not to say" can only pick "anyone", and never
// count as sharing anyone's gender, so these limits only let in people who shared.
function fitsTogether(people) {
  return people.every((p) => {
    const others = people.filter((o) => o !== p);
    const same = (o) => p.gender !== "unsaid" && o.gender === p.gender;
    if (p.comfort === "same") return others.every(same);
    if (p.comfort === "buddy") return others.length === 0 || others.some(same);
    return true;
  });
}

// How many interests two people share.
const shared = (a, b) => a.interests.filter((i) => b.interests.includes(i)).length;

const id = () => crypto.randomUUID().slice(0, 8);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// ---------- Practice rooms ----------
// Testing on your own: each person gets a private room ("solo-<id>") filled with
// pretend people who start groups, post plans, join yours and chat back, so every
// part of the app can be tried alone. The shared "lobby" never has pretend people.
const PRETEND = [
  { name: "Ava", archetype: "sunshine", gender: "woman", interests: ["music", "movies", "art"] },
  { name: "Marcus", archetype: "adventurer", gender: "man", interests: ["sports", "outdoors", "music"] },
  { name: "Priya", archetype: "studybuddy", gender: "woman", interests: ["books", "tech", "art"] },
  { name: "Jordan", archetype: "easygoing", gender: "nonbinary", interests: ["gaming", "movies", "food"] },
  { name: "Lily", archetype: "foodie", gender: "woman", interests: ["food", "fashion", "music"] },
  { name: "Diego", archetype: "quiet", gender: "man", interests: ["gaming", "books", "tech"] },
  { name: "Noor", archetype: "adventurer", gender: "woman", interests: ["outdoors", "fitness", "theater"] },
  { name: "Sam", archetype: "sunshine", gender: "man", interests: ["sports", "food", "movies"] },
  { name: "Riley", archetype: "easygoing", gender: "nonbinary", interests: ["art", "music", "theater"] },
  { name: "Grace", archetype: "quiet", gender: "woman", interests: ["books", "movies", "outdoors"] },
];
const HELLO = ["Hey! On my way 👋", "Hi! I'll be there in 5", "Yay, see you soon!", "Hey everyone!", "Omw, I'm in a green jacket"];
const REPLY = ["Sounds good!", "Haha same", "Love that", "See you there!", "Totally", "I'm almost there", "Works for me!"];
const HERE = ["I'm here!", "Just got here", "Found a table, come find me", "Here! By the front"];
const clip = (s, n) => String(s ?? "").trim().slice(0, n);

export class OpenSeat extends Server {
  onStart() {
    this.conns = new Map(); // connection id -> uid
    this.users = new Map(); // uid -> user
    this.feedbackRoom = this.name === "feedback";
    if (this.feedbackRoom) return;
    this.practice = this.name.startsWith("solo-");
    this.reset();
    if (this.practice) this.seedPractice();

    // Close groups whose time is up, and start random groups that waited long enough.
    setInterval(() => {
      let changed = this.formGroups();
      for (const t of this.tables.values()) {
        if (Date.now() > t.endsAt) {
          for (const m of t.members) { const u = this.users.get(m); if (u?.tableId === t.id) u.tableId = null; }
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
    this.queues = Object.fromEntries(Object.keys(ACTIVITIES).map((m) => [m, []])); // [{ uid, spot, size, at }]
    this.stats = { uniqueUsers: new Set(this.conns.values()), peakOnline: 0, peakTable: 0, tablesOpened: 0, plansMade: 0, meetups: 0, groupsFormed: 0 };
  }

  online() {
    const set = new Set(this.conns.values());
    for (const u of this.users.values()) if (u.pretend) set.add(u.id);
    return set;
  }

  // What others can see. Gender, comfort settings and email stay private.
  publicUser(u) {
    const tags = [...u.diet.map((d) => DIETS[d]), u.budget && BUDGETS[u.budget], u.access && "♿ accessible spot"].filter(Boolean);
    return { id: u.id, name: u.name, emoji: u.emoji, archetype: ARCHETYPES[u.archetype].label, verified: u.verified, interests: u.interests, tags };
  }

  canJoin(u, t) {
    return fitsTogether([...t.members.map((m) => this.users.get(m)), u]);
  }

  snapshot() {
    const online = this.online();
    return {
      type: "state",
      online: [...online].map((uid) => this.publicUser(this.users.get(uid))),
      activities: ACTIVITIES,
      places: PUBLIC_PLACES,
      interests: INTERESTS,
      sizes: SIZES,
      groupSize: GROUP_SIZE,
      groupMin: GROUP_MIN,
      groupWaitMs: GROUP_WAIT_MS,
      queues: Object.fromEntries(
        Object.entries(this.queues).map(([mode, q]) => [mode, q.map((e) => ({ uid: e.uid, at: e.at, size: e.size }))])
      ),
      tables: [...this.tables.values()].map((t) => ({
        id: t.id,
        hostId: t.hostId,
        group: t.group || null,
        planned: t.planned,
        mode: t.mode,
        title: t.title,
        spot: t.spot,
        topic: t.topic,
        hint: t.hint,
        chairs: t.chairs,
        startsAt: t.startsAt,
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
      const matches = line ? line.filter((e) => fitsTogether([u, this.users.get(e.uid)])) : [];
      // When the countdown started for this person: the longest wait among the
      // people in line who fit with them (that's who a group forms around).
      const myStart = matches.length ? Math.min(...matches.map((e) => e.at)) : null;
      conn.send(JSON.stringify({ ...base, fits, myLine: matches.length, myStart }));
    }
  }

  // Leave a group. For a "right now" group that's the one you're sitting at;
  // planned outings are left by id, since you can be going to several.
  leaveTable(u, t = this.tables.get(u.tableId)) {
    if (!t) return;
    if (u.tableId === t.id) u.tableId = null;
    t.members = t.members.filter((m) => m !== u.id);
    t.checkedIn.delete(u.id);
    if (t.members.length === 0) return this.tables.delete(t.id);
    if (t.hostId === u.id) t.hostId = t.members[0]; // hand the group to the next person
  }

  unqueue(u) {
    for (const mode in this.queues) this.queues[mode] = this.queues[mode].filter((e) => e.uid !== u.id);
  }

  seatAt(u, t) {
    if (t.planned) {
      // Going to a plan doesn't take you out of what you're doing now.
      t.members.push(u.id);
    } else {
      this.unqueue(u);
      if (u.tableId) this.leaveTable(u);
      t.members.push(u.id);
      u.tableId = t.id;
    }
    this.stats.peakTable = Math.max(this.stats.peakTable, t.members.length);
  }

  openTables(mode) {
    // Random groups are closed: you can't Spin or Sit into one.
    return [...this.tables.values()].filter((t) => !t.group && t.members.length < t.chairs && (!mode || t.mode === mode));
  }

  // Find a group in a line: start from whoever has waited longest and add
  // people whose settings fit with everyone picked so far, people who share
  // interests with them first. Everyone picks the biggest group they want, so
  // the group stops at the smallest size anyone in it asked for. If that
  // person can't make a group, try the next person.
  pickGroup(q) {
    for (const anchor of q) {
      const me = this.users.get(anchor.uid);
      const order = [...q].sort((a, b) => shared(me, this.users.get(b.uid)) - shared(me, this.users.get(a.uid)));
      const picked = [anchor];
      let target = anchor.size;
      // Keep passing over the line: someone skipped earlier may fit once
      // another person has joined (for example, a "not the only one" match).
      for (let added = true; added && picked.length < target; ) {
        added = false;
        for (const e of order) {
          if (picked.length >= target) break;
          if (picked.includes(e) || e.size < picked.length + 1) continue;
          if (fitsTogether([...picked, e].map((x) => this.users.get(x.uid)))) {
            picked.push(e); target = Math.min(target, e.size); added = true;
          }
        }
      }
      const full = picked.length >= target;
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
      const wanted = picked.map((e) => e.spot).filter(Boolean);
      const pool = wanted.length ? wanted : ACTIVITIES[mode].spots;
      const color = GROUP_COLORS[this.stats.groupsFormed % GROUP_COLORS.length];
      const t = {
        id: id(),
        hostId: picked[0].uid,
        group: color,
        planned: false,
        mode,
        title: "",
        spot: pool[Math.floor(Math.random() * pool.length)],
        topic: "random group",
        hint: `Look for the ${color.name.toLowerCase()} screen`,
        chairs: picked.length,
        startsAt: Date.now(),
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

  // ---------- Pretend people (practice rooms only) ----------
  later(ms, fn) {
    setTimeout(() => { if (fn() !== false) this.sync(); }, ms);
  }

  seedPractice() {
    for (const p of PRETEND) {
      const u = { ...p, id: "p-" + p.name.toLowerCase(), pretend: true, tableId: null, comfort: "anyone",
        emoji: ARCHETYPES[p.archetype].emoji, diet: [], budget: null, access: false, verified: Math.random() < 0.7 };
      this.users.set(u.id, u);
    }
    const who = (name) => this.users.get("p-" + name.toLowerCase());
    const day = (d, h, m = 0) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, m, 0, 0); return x.getTime(); };
    const make = (host, o, guests = []) => {
      const t = { id: id(), hostId: host.id, group: null, planned: false, title: "", topic: "anything", hint: "", chairs: 5,
        startsAt: Date.now(), endsAt: Date.now() + 40 * 60_000, members: [], checkedIn: new Set(), chat: [], ...o };
      this.tables.set(t.id, t);
      for (const g of [host, ...guests]) this.seatAt(g, t);
      return t;
    };
    // Happening now
    make(who("Lily"), { mode: "food", spot: "Mrs. E's", hint: "1st floor · Big table by the windows", topic: "trying the pasta bar", chairs: 4 }, [who("Sam")]).chat
      .push({ name: "Lily", emoji: who("Lily").emoji, text: "Grabbed a big table!", at: Date.now() });
    make(who("Priya"), { mode: "study", spot: "Watson Library", hint: "3rd floor · Quiet room, red laptop", topic: "finals, anything", chairs: 4 });
    make(who("Jordan"), { mode: "hangout", spot: "Starbucks at Kansas Union", hint: "Ground floor · Couches by the door", topic: "games, chill", chairs: 5 }, [who("Riley")]);
    // Coming up
    make(who("Ava"), { mode: "event", planned: true, title: "Jazz night at Liberty Hall", spot: "Liberty Hall", hint: "Out front, under the sign",
      startsAt: day(2, 19), endsAt: day(2, 21) }, [who("Grace")]);
    make(who("Marcus"), { mode: "event", planned: true, title: "KU basketball game", spot: "Allen Fieldhouse", hint: "Student entrance",
      startsAt: day(3, 18, 30), endsAt: day(3, 21) }, [who("Noor"), who("Sam")]);
    make(who("Diego"), { mode: "study", planned: true, title: "Sunday study session", spot: "Anschutz Library", hint: "2nd floor · Group room",
      startsAt: day(4, 14), endsAt: day(4, 16), chairs: 4 });
  }

  // Pretend people free right now who fit with everyone at a table.
  freePretend(t) {
    const busy = new Set([...this.tables.values()].filter((x) => !x.planned).flatMap((x) => x.members));
    return [...this.users.values()].filter((u) => u.pretend && !busy.has(u.id) && !t.members.includes(u.id) && this.canJoin(u, t))
      .sort(() => Math.random() - 0.5);
  }

  say(t, u, text) {
    if (this.tables.has(t.id) && t.members.includes(u.id)) t.chat.push({ name: u.name, emoji: u.emoji, text, at: Date.now() });
  }

  // After a real person does something, pretend people react a few seconds later.
  react(u, type, b) {
    if (!this.practice) return;
    const t = type === "open" ? this.lastOpened : this.tables.get(b.tableId || u.tableId);
    if (type === "open" && t) {
      // People drop in to your group, or say they're in for your plan.
      const want = Math.min(t.chairs - 1, t.planned ? 2 : 3);
      for (let i = 0; i < want; i++) {
        this.later(4000 + i * 6000 + Math.random() * 2000, () => {
          const g = this.freePretend(t)[0];
          if (!g || !this.tables.has(t.id) || t.members.length >= t.chairs) return false;
          this.seatAt(g, t);
          this.later(1500, () => this.say(t, g, pick(t.planned ? ["Ooh I'm in!", "Count me in", "Yes! I've wanted to go"] : HELLO)));
        });
      }
    }
    if ((type === "join" || type === "spin") && t) {
      const g = t.members.find((m) => m !== u.id && this.users.get(m)?.pretend);
      if (g) this.later(2500, () => this.say(t, this.users.get(g), pick(["Yay, welcome!", "Hi! Glad you're coming", "Welcome! See you there"])));
    }
    if (type === "chat" && t) {
      const others = t.members.filter((m) => this.users.get(m)?.pretend);
      if (others.length) this.later(2000 + Math.random() * 2000, () => this.say(t, this.users.get(pick(others)), pick(REPLY)));
    }
    if (type === "checkin" && t) {
      t.members.filter((m) => this.users.get(m)?.pretend && !t.checkedIn.has(m)).forEach((m, i) => {
        this.later(3000 + i * 3500, () => { if (!this.tables.has(t.id)) return false; t.checkedIn.add(m); this.say(t, this.users.get(m), pick(HERE)); });
      });
    }
    if (type === "queue") {
      // Pretend people get in line one by one, so the countdown fills up.
      const mode = modeOf(b.mode), size = SIZES.includes(Number(b.size)) ? Number(b.size) : GROUP_SIZE;
      for (let i = 1; i < size; i++) {
        this.later(3000 + i * 4000 + Math.random() * 1500, () => {
          const line = this.queues[mode];
          if (!line.some((e) => e.uid === u.id)) return false; // they stopped looking
          const inLine = new Set(line.map((e) => e.uid));
          const people = line.map((e) => this.users.get(e.uid));
          const g = [...this.users.values()].find((p) => p.pretend && !p.tableId && !inLine.has(p.id) && fitsTogether([...people, p]));
          if (!g) return false;
          line.push({ uid: g.id, spot: null, size, at: Date.now() });
          this.formGroups();
          const t2 = this.tables.get(u.tableId);
          if (t2?.group) this.later(2500, () => { const first = t2.members.find((m) => this.users.get(m)?.pretend); if (first) this.say(t2, this.users.get(first), "Hi team! See you there 👋"); });
        });
      }
    }
  }

  // Each action: (user, message) -> optional { error }.
  actions = {
    // Start a group now, or plan one for later (startsAt in the future).
    open: (u, b) => {
      const mode = modeOf(b.mode);
      const spot = placeFor(b.spot);
      if (!spot) return { error: "Pick a verified public place." };
      const minutes = [15, 30, 45, 60, 90, 120, 180].includes(Number(b.minutes)) ? Number(b.minutes) : 30;
      const now = Date.now();
      let startsAt = Number(b.startsAt) || now;
      if (startsAt < now) startsAt = now;
      if (startsAt > now + PLAN_AHEAD_MS) return { error: "Plans can only be up to 2 weeks ahead." };
      const planned = startsAt > now + 10 * 60_000;
      const t = {
        id: id(),
        hostId: u.id,
        group: null,
        planned,
        mode,
        title: clip(b.title, 60),
        spot,
        topic: clip(b.topic, 40) || "anything",
        hint: clip(b.hint, 80),
        chairs: Math.min(MAX_CHAIRS, Math.max(SIZES[0], Number(b.chairs) || 5)),
        startsAt,
        endsAt: startsAt + minutes * 60_000,
        members: [],
        checkedIn: new Set(),
        chat: [],
      };
      this.tables.set(t.id, t);
      this.lastOpened = t;
      if (planned) this.stats.plansMade++; else this.stats.tablesOpened++;
      this.seatAt(u, t);
    },
    join: (u, b) => {
      const t = this.tables.get(b.tableId);
      if (!t) return { error: "That group just closed." };
      if (t.members.includes(u.id)) return;
      if (t.members.length >= t.chairs) return { error: "That group just filled up." };
      if (t.group || !this.canJoin(u, t)) return { error: "That group isn't a match for your settings, or someone's in it." };
      this.seatAt(u, t);
    },
    // Spin only puts you in a group happening now, favoring shared interests.
    spin: (u, b) => {
      const mode = b.mode && Object.hasOwn(ACTIVITIES, b.mode) ? b.mode : undefined;
      const options = this.openTables(mode).filter((t) => !t.planned && !t.members.includes(u.id) && this.canJoin(u, t));
      if (!options.length) return { error: "No open groups for that right now. Want to start one?" };
      const score = (t) => t.members.reduce((n, m) => n + shared(u, this.users.get(m)), 0);
      const best = Math.max(...options.map(score));
      const top = options.filter((t) => score(t) === best);
      this.seatAt(u, top[Math.floor(Math.random() * top.length)]);
    },
    checkin: (u, b) => {
      const t = this.tables.get(b.tableId || u.tableId);
      if (!t || !t.members.includes(u.id)) return;
      if (!t.checkedIn.has(u.id) && t.checkedIn.size === 1) this.stats.meetups++; // 2nd person arrives = a meetup
      t.checkedIn.add(u.id);
    },
    chat: (u, b) => {
      const t = this.tables.get(b.tableId || u.tableId);
      const text = clip(b.text, 200);
      if (t && text && t.members.includes(u.id)) t.chat.push({ name: u.name, emoji: u.emoji, text, at: Date.now() });
    },
    leave: (u, b) => {
      const t = this.tables.get(b.tableId || u.tableId);
      if (t && t.members.includes(u.id)) this.leaveTable(u, t);
    },
    queue: (u, b) => {
      const mode = modeOf(b.mode);
      const size = SIZES.includes(Number(b.size)) ? Number(b.size) : GROUP_SIZE;
      if (u.tableId) this.leaveTable(u);
      this.unqueue(u);
      this.queues[mode].push({ uid: u.id, spot: spotFor(mode, b.spot), size, at: Date.now() });
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
      // "Prefer not to say" can only be "anyone". Older V3 answers map to
      // the closest new choice.
      const old = { wnb: "same", 1: "buddy", 2: "buddy", 3: "buddy" };
      const comfort = ["anyone", "buddy", "same"].includes(p.comfort) ? p.comfort : old[p.comfort] || "anyone";
      u.comfort = u.gender === "unsaid" ? "anyone" : comfort;
      u.interests = (Array.isArray(p.interests) ? p.interests : []).filter((i) => Object.hasOwn(INTERESTS, i)).slice(0, 6);
      u.diet = (Array.isArray(p.diet) ? p.diet : []).filter((d) => Object.hasOwn(DIETS, d));
      u.budget = Object.hasOwn(BUDGETS, p.budget) ? p.budget : null;
      u.access = p.access === true;
      // Prototype only: the app marks you verified after the KU email and ID
      // step. A real version would check this on the server.
      u.verified = p.verified === true;
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
    else this.react(u, b.type, b);
    this.sync();
  }

  onClose(conn) {
    this.conns.delete(conn.id);
    this.sync();
  }

  // GET /parties/open-seat/lobby: numbers for numbers.md.
  // POST with the right x-reset-key header: empty the lobby before a test.
  onRequest(request) {
    if (this.feedbackRoom) return this.feedback(request);
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
      plansMade: this.stats.plansMade,
      meetups: this.stats.meetups,
      groupsFormed: this.stats.groupsFormed,
    });
  }
}

// ---------- Feedback ----------
// Testers send feedback from their profile. It's all kept in one room, "feedback",
// and read at /parties/open-seat/feedback (add ?format=csv to download it).
// Feedback is anonymous: no names or emails are stored.
// If FEEDBACK_KEY is set (npx wrangler secret put FEEDBACK_KEY), reading needs ?key=...
OpenSeat.prototype.feedback = async function (request) {
  const url = new URL(request.url);
  if (request.method === "POST") {
    let b = {};
    try { b = await request.json(); } catch {}
    const entry = {
      at: Date.now(),
      feeling: ["love", "okay", "confused", "no"].includes(b.feeling) ? b.feeling : "",
      parts: (Array.isArray(b.parts) ? b.parts : []).map((x) => clip(x, 30)).slice(0, 6),
      text: clip(b.text, 1000),
      friendType: clip(b.friendType, 30),
      mode: b.mode === "solo" ? "on my own" : "with people",
      device: clip(b.device, 20),
    };
    if (!entry.feeling && !entry.text) return Response.json({ error: "Empty" }, { status: 400 });
    await this.ctx.storage.put(`fb:${entry.at}:${id()}`, entry);
    // Also add it as a row in the team's Google Sheet, if one is set up
    // (FEEDBACK_SHEET_URL in wrangler.jsonc: the sheet's Apps Script web app address).
    if (this.env.FEEDBACK_SHEET_URL) {
      const FEEL = { love: "Love it", okay: "It's okay", confused: "A bit confusing", no: "Not for me" };
      this.ctx.waitUntil(fetch(this.env.FEEDBACK_SHEET_URL, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...entry, feeling: FEEL[entry.feeling] || "", when: new Date(entry.at).toLocaleString("en-US", { timeZone: "America/Chicago" }) }),
      }).catch(() => {}));
    }
    return Response.json({ ok: true });
  }
  if (this.env.FEEDBACK_KEY && url.searchParams.get("key") !== this.env.FEEDBACK_KEY) return new Response("Not allowed", { status: 403 });
  const rows = [...(await this.ctx.storage.list({ prefix: "fb:" })).values()].reverse();
  const when = (t) => new Date(t).toLocaleString("en-US", { timeZone: "America/Chicago" });
  if (url.searchParams.get("format") === "csv") {
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = ["when,feeling,parts,feedback,friend type,mode,device", ...rows.map((r) => [when(r.at), r.feeling, r.parts.join("; "), r.text, r.friendType, r.mode, r.device].map(q).join(","))].join("\n");
    return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=side-quest-feedback.csv" } });
  }
  const e = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const FEEL = { love: "Love it", okay: "It's okay", confused: "Confused", no: "Not for me" };
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Side Quest feedback</title>
<style>body{font:15px/1.45 system-ui,sans-serif;background:#09080b;color:#f6f0e6;margin:0;padding:24px 16px;max-width:860px;margin:auto}h1{font-weight:500}a{color:#c9f03d}
.r{border:1.5px solid #2a2730;border-radius:18px;padding:14px 16px;margin:10px 0;background:#16141a}.m{color:#a49dae;font-size:13px}.f{display:inline-block;background:#c9f03d;color:#17121f;font-weight:700;border-radius:99px;padding:2px 10px;font-size:13px;margin-right:6px}</style>
<h1>Side Quest feedback (${rows.length})</h1><p><a href="?format=csv${url.searchParams.get("key") ? "&key=" + e(url.searchParams.get("key")) : ""}">Download as a spreadsheet (CSV)</a></p>
${rows.map((r) => `<div class="r">${r.feeling ? `<span class="f">${FEEL[r.feeling]}</span>` : ""}<span class="m">${e(when(r.at))} · ${e(r.friendType)} · ${e(r.mode)} · ${e(r.device)}${r.parts.length ? " · " + e(r.parts.join(", ")) : ""}</span>${r.text ? `<p style="margin:8px 0 0">${e(r.text)}</p>` : ""}</div>`).join("") || "<p>No feedback yet.</p>"}`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
};

// The page at sqku.pages.dev sends feedback to this worker from another site,
// so browsers need permission for it. Only our short link (and its previews) gets it.
const corsHeaders = (request) => {
  const origin = request.headers.get("origin") || "";
  if (!/^https:\/\/([a-z0-9-]+\.)?sqku\.pages\.dev$/.test(origin)) return null;
  return { "access-control-allow-origin": origin, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "origin" };
};

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    if (request.method === "OPTIONS") return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    const res = (await routePartykitRequest(request, env)) || new Response("Not found", { status: 404 });
    if (!cors || res.status === 101) return res;
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
};
