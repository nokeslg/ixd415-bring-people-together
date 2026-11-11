import { routePartykitRequest, Server, type Connection } from "partyserver";

type Env = { Lobby: DurableObjectNamespace<Lobby>; ASSETS: Fetcher };

// Tablemates: one PartyServer room = one lobby ("lunch", "study", or "hobby-<interest>").
// People wait together on a shared 120s countdown. Everyone says what they are
// and who they're open to being grouped with; a group only forms between people
// who are ALL open to each other. Once grouped, everyone sees each other's
// "how to spot me" note and live "I'm here" check-ins.

const LOBBY_SECONDS = 120;
const MAX_GROUP = 4;
const GENDERS = ["woman", "man", "nonbinary"] as const;
const SPOTS = [
  "Student Union, big tables by the windows",
  "Library ground floor, near the café",
  "Dining hall, back corner booths",
  "Quad benches by the fountain",
  "Campus center, 2nd floor lounge",
];

type Gender = (typeof GENDERS)[number] | "unsaid";
type Person = {
  id: string;
  emoji: string;
  name: string;
  note: string;
  gender: Gender;
  wants: string[]; // subset of GENDERS
};
type PublicPerson = Pick<Person, "id" | "emoji" | "name" | "note">;
type ChatMsg = { id: string; from: string; text: string; at: number };
type Plan = { id: string; by: string; title: string; when: string; spots: number; joined: string[] };
type Group = {
  id: string;
  spot: string;
  formedAt: number;
  members: PublicPerson[];
  here: string[];
  chat: ChatMsg[];
  plans: Plan[];
};
const MAX_CHAT = 200;
const MAX_PLANS = 12;
const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// a accepts b if b's gender is one a checked.
// "prefer not to say" is only matched with people open to everyone.
function accepts(a: Person, b: Person) {
  if (b.gender === "unsaid") return GENDERS.every((g) => a.wants.includes(g));
  return a.wants.includes(b.gender);
}
const compatible = (a: Person, b: Person) => accepts(a, b) && accepts(b, a);

export class Lobby extends Server<Env> {
  waiting = new Map<string, Person>(); // insertion order = join order
  deadline: number | null = null;
  timer: ReturnType<typeof setTimeout> | null = null;
  groups = new Map<string, Group>();
  groupOf = new Map<string, string>();
  lastChat = new Map<string, number>(); // per-person rate limit

  onConnect(conn: Connection) {
    conn.send(JSON.stringify({ type: "hello", you: conn.id }));
    conn.send(JSON.stringify(this.lobbyState(conn.id)));
  }

  onMessage(sender: Connection, raw: string | ArrayBuffer) {
    if (typeof raw !== "string" || raw.length > 1000) return;
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "join") {
      if (this.groupOf.has(sender.id)) return;
      const gender: Gender = [...GENDERS, "unsaid"].includes(msg.gender) ? msg.gender : "unsaid";
      const wants = (Array.isArray(msg.wants) ? msg.wants : []).filter((w: string) =>
        (GENDERS as readonly string[]).includes(w),
      );
      if (wants.length === 0) return;
      this.waiting.set(sender.id, {
        id: sender.id,
        emoji: String(msg.emoji || "🙂").slice(0, 4),
        name: String(msg.name || "").slice(0, 24),
        note: String(msg.note || "").slice(0, 80),
        gender,
        wants,
      });
      if (this.deadline === null) this.startTimer();
      this.formFullGroups();
      this.broadcastLobby();
    }

    if (msg.type === "leave") this.removeFromLobby(sender.id);

    if (msg.type === "keepWaiting" && this.waiting.has(sender.id) && this.deadline === null) {
      this.startTimer();
      this.broadcastLobby();
    }

    if (msg.type === "here") {
      const g = this.groups.get(this.groupOf.get(sender.id) || "");
      if (g && !g.here.includes(sender.id)) {
        g.here.push(sender.id);
        this.sendGroup(g);
      }
    }

    if (msg.type === "leaveGroup") this.leaveGroup(sender.id);

    // ---- group chat ----
    if (msg.type === "chat") {
      const g = this.groups.get(this.groupOf.get(sender.id) || "");
      const text = clean(msg.text, 280);
      const now = Date.now();
      // guardrail: at most ~2 messages a second per person
      if (!g || !text || now - (this.lastChat.get(sender.id) ?? 0) < 500) return;
      this.lastChat.set(sender.id, now);
      g.chat.push({ id: crypto.randomUUID().slice(0, 8), from: sender.id, text, at: now });
      if (g.chat.length > MAX_CHAT) g.chat.shift();
      this.sendGroup(g);
    }

    // ---- weekend plans ----
    if (msg.type === "plan") {
      const g = this.groups.get(this.groupOf.get(sender.id) || "");
      const title = clean(msg.title, 80);
      if (!g || !title || g.plans.length >= MAX_PLANS) return;
      const spots = Math.max(1, Math.min(10, Math.floor(Number(msg.spots) || 1)));
      g.plans.push({ id: crypto.randomUUID().slice(0, 8), by: sender.id, title, when: clean(msg.when, 40), spots, joined: [] });
      this.sendGroup(g);
    }

    if (msg.type === "joinPlan") {
      const g = this.groups.get(this.groupOf.get(sender.id) || "");
      const plan = g?.plans.find((pl) => pl.id === msg.id);
      if (!g || !plan || plan.by === sender.id) return;
      if (plan.joined.includes(sender.id)) plan.joined = plan.joined.filter((j) => j !== sender.id); // tap again to drop out
      else if (plan.joined.length < plan.spots) plan.joined.push(sender.id);
      else return;
      this.sendGroup(g);
    }

    if (msg.type === "deletePlan") {
      const g = this.groups.get(this.groupOf.get(sender.id) || "");
      if (!g) return;
      g.plans = g.plans.filter((pl) => !(pl.id === msg.id && pl.by === sender.id));
      this.sendGroup(g);
    }
  }

  onClose(conn: Connection) {
    this.removeFromLobby(conn.id);
    this.leaveGroup(conn.id);
  }

  // ---- matching ----
  // Starting from `seed`, add people (in join order) who are compatible with
  // everyone already in the group.
  // Pickiest people (fewest compatible matches) go first, so nobody who
  // could have been matched gets left out by an earlier, less picky group.
  byPickiness(): Person[] {
    const all = [...this.waiting.values()];
    const options = (p: Person) => all.filter((o) => o.id !== p.id && compatible(p, o)).length;
    return all
      .map((p, i) => ({ p, i, n: options(p) }))
      .sort((a, b) => a.n - b.n || a.i - b.i)
      .map((x) => x.p);
  }

  buildGroup(seed: Person): Person[] {
    const group = [seed];
    for (const p of this.byPickiness()) {
      if (group.length >= MAX_GROUP) break;
      if (p.id !== seed.id && group.every((g) => compatible(g, p))) group.push(p);
    }
    return group;
  }

  // Form a group immediately whenever 4 mutually-compatible people are waiting.
  formFullGroups() {
    let formed = true;
    while (formed) {
      formed = false;
      for (const seed of this.byPickiness()) {
        const g = this.buildGroup(seed);
        if (g.length >= MAX_GROUP) {
          this.formGroup(g);
          formed = true;
          break;
        }
      }
    }
  }

  // When the clock runs out, form every group of 2+ we can.
  onTimeUp() {
    this.stopTimer();
    let formed = true;
    while (formed) {
      formed = false;
      for (const seed of this.byPickiness()) {
        const g = this.buildGroup(seed);
        if (g.length >= 2) {
          this.formGroup(g);
          formed = true;
          break;
        }
      }
    }
    for (const id of this.waiting.keys()) {
      this.getConnection(id)?.send(JSON.stringify({ type: "timeout" }));
    }
    this.broadcastLobby();
  }

  formGroup(members: Person[]) {
    const g: Group = {
      id: crypto.randomUUID().slice(0, 8),
      spot: SPOTS[Math.floor(Math.random() * SPOTS.length)],
      // gender/preferences are never sent to other people
      members: members.map(({ id, emoji, name, note }) => ({ id, emoji, name, note })),
      here: [],
      formedAt: Date.now(),
      chat: [],
      plans: [],
    };
    this.groups.set(g.id, g);
    for (const m of members) {
      this.waiting.delete(m.id);
      this.groupOf.set(m.id, g.id);
    }
    if (this.waiting.size === 0) this.stopTimer();
    this.sendGroup(g);
  }

  // ---- lobby ----
  startTimer() {
    this.deadline = Date.now() + LOBBY_SECONDS * 1000;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.onTimeUp(), LOBBY_SECONDS * 1000);
  }

  stopTimer() {
    this.deadline = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  removeFromLobby(id: string) {
    if (!this.waiting.delete(id)) return;
    if (this.waiting.size === 0) this.stopTimer();
    this.broadcastLobby();
  }

  lobbyState(forId: string) {
    const me = this.waiting.get(forId);
    const others = [...this.waiting.values()].filter((p) => p.id !== forId);
    return {
      type: "lobby",
      waiting: [...this.waiting.values()].map(({ id, emoji }) => ({ id, emoji })),
      matches: me ? others.filter((p) => compatible(me, p)).length : 0,
      deadline: this.deadline,
      serverNow: Date.now(),
      groupsFormed: this.groups.size,
      online: [...this.getConnections()].length,
    };
  }

  // each person gets their own copy, because "matches" is personal
  broadcastLobby() {
    for (const conn of this.getConnections()) {
      conn.send(JSON.stringify(this.lobbyState(conn.id)));
    }
  }

  // ---- groups ----
  sendGroup(g: Group) {
    const payload = JSON.stringify({ type: "group", group: g });
    for (const m of g.members) this.getConnection(m.id)?.send(payload);
  }

  leaveGroup(id: string) {
    const gid = this.groupOf.get(id);
    if (!gid) return;
    this.groupOf.delete(id);
    const g = this.groups.get(gid);
    if (!g) return;
    g.members = g.members.filter((m) => m.id !== id);
    g.here = g.here.filter((h) => h !== id);
    for (const pl of g.plans) pl.joined = pl.joined.filter((j) => j !== id);
    this.lastChat.delete(id);
    if (g.members.length === 0) this.groups.delete(gid);
    else this.sendGroup(g);
    this.getConnection(id)?.send(JSON.stringify({ type: "ungrouped" }));
    this.broadcastLobby();
  }
}

export default {
  async fetch(request: Request, env: Env) {
    // WebSockets go to /parties/lobby/<lunch|study>; everything else is the web page.
    return (await routePartykitRequest(request, env)) || env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
