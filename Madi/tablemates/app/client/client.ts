import PartySocket from "partysocket";


const $ = (id: string) => document.getElementById(id)!;
const EMOJIS = ["🦊", "🐸", "🐼", "🦉", "🐙", "🌵", "🍄", "🌻", "🚀", "🎧", "🧃", "🐢"];
const LOBBY_MS = 120_000;
const CIRC = 2 * Math.PI * 52;

const choice: Record<string, string> = { mode: "lunch", gender: "unsaid" };
let emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
let socket: PartySocket | null = null;
let me = "";
let deadline: number | null = null;
let clockOffset = 0; // serverNow - localNow
let tick: number | undefined;

// ---------- setup screen ----------
document.querySelectorAll<HTMLElement>(".seg").forEach((seg) => {
  seg.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button");
    if (!b) return;
    seg.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    choice[seg.dataset.name!] = b.dataset.v!;
    if (seg.dataset.name === "mode") $("hobbyBox").classList.toggle("hidden", b.dataset.v !== "hobby");
  });
});

const emojiBox = $("emojis");
for (const e of EMOJIS) {
  const b = document.createElement("button");
  b.textContent = e;
  if (e === emoji) b.classList.add("on");
  b.onclick = () => {
    emoji = e;
    emojiBox.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
  };
  emojiBox.appendChild(b);
}

const wantedBoxes = () =>
  [...document.querySelectorAll<HTMLInputElement>("#wants input:checked")].map((i) => i.value);

$("join").onclick = () => {
  const wants = wantedBoxes();
  const hint = $("prefHint");
  if (wants.length === 0) {
    hint.textContent = "Pick at least one group you're open to.";
    hint.classList.add("warn");
    return;
  }
  hint.textContent = "You'll only be grouped with people who are open to you too. Nobody else sees these answers.";
  hint.classList.remove("warn");
  const note = ($("note") as HTMLInputElement).value.trim();
  if (!note) {
    ($("note") as HTMLInputElement).focus();
    ($("note") as HTMLInputElement).placeholder = "Add a quick note so your group can find you";
    return;
  }
  // Each hobby gets its own lobby, so you're only grouped with people into the same thing.
  const hobbySel = $("hobby") as HTMLSelectElement;
  if (choice.mode === "hobby" && !hobbySel.value) {
    hobbySel.classList.add("warn");
    hobbySel.focus();
    return;
  }
  hobbySel.classList.remove("warn");
  const room = choice.mode === "hobby" ? `hobby-${hobbySel.value}` : choice.mode;
  $("roomLabel").textContent =
    choice.mode === "lunch"
      ? "🍜 Lunch lobby"
      : choice.mode === "study"
        ? "📚 Study lobby"
        : `Hobby lobby · ${hobbySel.selectedOptions[0].text}`;

  socket?.close();
  socket = new PartySocket({ host: location.host, party: "lobby", room });
  socket.addEventListener("open", () => {
    socket!.send(
      JSON.stringify({
        type: "join",
        emoji,
        name: ($("name") as HTMLInputElement).value.trim(),
        note,
        gender: choice.gender,
        wants,
      }),
    );
  });
  socket.addEventListener("message", (ev) => handle(JSON.parse(ev.data)));
  show("lobby");
};

// ---------- lobby screen ----------
$("leave").onclick = $("quit").onclick = () => {
  socket?.send(JSON.stringify({ type: "leave" }));
  socket?.close();
  socket = null;
  show("setup");
};
$("keep").onclick = () => {
  socket?.send(JSON.stringify({ type: "keepWaiting" }));
  $("timeoutBox").classList.add("hidden");
};

// ---------- group screen ----------
$("here").onclick = () => socket?.send(JSON.stringify({ type: "here" }));
$("leaveGroup").onclick = () => {
  socket?.send(JSON.stringify({ type: "leaveGroup" }));
  socket?.close();
  socket = null;
  show("setup");
};

// ---------- messages from the server ----------
function handle(msg: any) {
  if (msg.type === "hello") me = msg.you;

  if (msg.type === "lobby") {
    clockOffset = msg.serverNow - Date.now();
    deadline = msg.deadline;
    const w = $("waiting");
    w.innerHTML = "";
    for (const p of msg.waiting) {
      const s = document.createElement("span");
      s.textContent = p.emoji;
      if (p.id === me) s.classList.add("me");
      w.appendChild(s);
    }
    const n = msg.waiting.length;
    const m = msg.matches;
    $("status").textContent =
      n <= 1
        ? "Waiting for others…"
        : m === 0
          ? `${n} waiting · no matches for you yet`
          : `${m} ${m === 1 ? "person" : "people"} here could join your group`;
    $("online").textContent = `${msg.online} online in this lobby · ${msg.groupsFormed} groups formed`;
    startTicking();
  }

  if (msg.type === "timeout") {
    $("timeoutBox").classList.remove("hidden");
  }

  if (msg.type === "group") renderGroup(msg.group);

  if (msg.type === "ungrouped") {
    group = null;
    show("setup");
  }
}

let group: any = null;
let activeTab = "crew";
let seenChat = 0;

function nameOf(id: string) {
  const m = group?.members.find((x: any) => x.id === id);
  if (!m) return "Someone (left)";
  return (m.name || m.emoji) + (id === me ? " (you)" : "");
}
function emojiOf(id: string) {
  return group?.members.find((x: any) => x.id === id)?.emoji ?? "👤";
}

function renderGroup(g: any) {
  const isNew = !group || group.id !== g.id;
  group = g;
  show("group");
  if (isNew) {
    seenChat = 0;
    setTab("crew");
  }
  $("spot").textContent = g.spot;

  // crew list
  const ul = $("members");
  ul.innerHTML = "";
  for (const m of g.members) {
    const arrived = g.here.includes(m.id);
    const li = document.createElement("li");
    if (arrived) li.classList.add("arrived");
    li.innerHTML = `<span class="e"></span><span class="who"><strong></strong><small></small></span><span class="badge"></span>`;
    li.querySelector(".e")!.textContent = m.emoji;
    li.querySelector("strong")!.textContent = (m.name || "Someone") + (m.id === me ? " (you)" : "");
    li.querySelector("small")!.textContent = m.note;
    li.querySelector(".badge")!.textContent = arrived ? "✅ here" : "on the way";
    ul.appendChild(li);
  }
  const iAmHere = g.here.includes(me);
  ($("here") as HTMLButtonElement).disabled = iAmHere;
  $("here").textContent = iAmHere ? "✅ You're checked in" : "📍 I'm here";

  renderChat();
  renderPlans();
  buildPins();
}

// ---------- tabs ----------
$("tabs").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest("button");
  if (b) setTab(b.dataset.tab!);
});
function setTab(tab: string) {
  activeTab = tab;
  document.querySelectorAll<HTMLElement>("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  for (const t of ["crew", "chat", "plans"]) $("tab-" + t).classList.toggle("hidden", t !== tab);
  if (tab === "chat") {
    seenChat = group?.chat.length ?? 0;
    updateUnread();
    const box = $("chat");
    box.scrollTop = box.scrollHeight;
    ($("chatInput") as HTMLInputElement).focus();
  }
}
function updateUnread() {
  const n = Math.max(0, (group?.chat.length ?? 0) - seenChat);
  $("unread").textContent = String(n);
  $("unread").classList.toggle("hidden", n === 0);
}

// ---------- chat ----------
function renderChat() {
  const box = $("chat");
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.innerHTML = "";
  if (group.chat.length === 0) {
    box.innerHTML = '<p class="empty">Say hi 👋 and figure out how you\'ll find each other.</p>';
  }
  for (const c of group.chat) {
    const row = document.createElement("div");
    row.className = "msg" + (c.from === me ? " mine" : "");
    row.innerHTML = `<span class="av"></span><div class="bubble"><small></small><span></span></div>`;
    row.querySelector(".av")!.textContent = emojiOf(c.from);
    row.querySelector("small")!.textContent = nameOf(c.from);
    row.querySelector(".bubble span")!.textContent = c.text;
    box.appendChild(row);
  }
  if (atBottom || group.chat.at(-1)?.from === me) box.scrollTop = box.scrollHeight;
  if (activeTab === "chat") seenChat = group.chat.length;
  updateUnread();
}
$("chatForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("chatInput") as HTMLInputElement;
  const text = input.value.trim();
  if (!text) return;
  socket?.send(JSON.stringify({ type: "chat", text }));
  input.value = "";
});

// ---------- weekend plans ----------
function renderPlans() {
  const box = $("plans");
  box.innerHTML = "";
  if (group.plans.length === 0) {
    box.innerHTML = '<p class="empty">No plans yet. Got a spare ticket or an idea for the weekend? Post it 👇</p>';
  }
  for (const pl of group.plans) {
    const mine = pl.by === me;
    const imIn = pl.joined.includes(me);
    const left = pl.spots - pl.joined.length;
    const card = document.createElement("div");
    card.className = "plan" + (imIn ? " in" : "");
    card.innerHTML = `<div class="plan-top"><strong></strong><span class="when"></span></div>
      <p class="plan-by"></p><div class="going"></div><div class="plan-actions"></div>`;
    card.querySelector("strong")!.textContent = pl.title;
    card.querySelector(".when")!.textContent = pl.when || "This weekend";
    card.querySelector(".plan-by")!.textContent =
      `Posted by ${emojiOf(pl.by)} ${nameOf(pl.by)} · ${left > 0 ? `${left} of ${pl.spots} spot${pl.spots === 1 ? "" : "s"} open` : "full!"}`;
    const going = card.querySelector(".going")!;
    for (let i = 0; i < pl.spots; i++) {
      const seat = document.createElement("span");
      seat.className = "seat" + (pl.joined[i] ? " taken" : "");
      seat.textContent = pl.joined[i] ? emojiOf(pl.joined[i]) : "🎟️";
      seat.title = pl.joined[i] ? nameOf(pl.joined[i]) : "open spot";
      going.appendChild(seat);
    }
    const actions = card.querySelector(".plan-actions")!;
    const btn = document.createElement("button");
    if (mine) {
      btn.textContent = "Remove";
      btn.className = "small ghosty";
      btn.onclick = () => socket?.send(JSON.stringify({ type: "deletePlan", id: pl.id }));
    } else {
      btn.textContent = imIn ? "✅ You're in (tap to drop)" : left > 0 ? "🙋 I'm in!" : "Full";
      btn.className = "small" + (imIn ? " joined" : "");
      btn.disabled = !imIn && left <= 0;
      btn.onclick = () => socket?.send(JSON.stringify({ type: "joinPlan", id: pl.id }));
    }
    actions.appendChild(btn);
    box.appendChild(card);
  }
}
$("planForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = ($("planTitle") as HTMLInputElement).value.trim();
  if (!title) {
    ($("planTitle") as HTMLInputElement).focus();
    return;
  }
  socket?.send(
    JSON.stringify({
      type: "plan",
      title,
      when: ($("planWhen") as HTMLInputElement).value.trim(),
      spots: Number(($("planSpots") as HTMLInputElement).value) || 1,
    }),
  );
  ($("planTitle") as HTMLInputElement).value = "";
  ($("planWhen") as HTMLInputElement).value = "";
  ($("planSpots") as HTMLInputElement).value = "1";
});

// ---------- mock map: everyone's pin walks toward the meeting spot ----------
const CENTER = { x: 160, y: 100 };
const WALK_MS = 90_000; // a pin takes ~90s to "walk" most of the way in
let pinRaf = 0;
function startPoint(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const angle = (h % 360) * (Math.PI / 180);
  return { x: CENTER.x + Math.cos(angle) * 140, y: CENTER.y + Math.sin(angle) * 85 };
}
function buildPins() {
  const pins = $("pins");
  const trails = $("trails");
  pins.innerHTML = "";
  trails.innerHTML = "";
  const NS = "http://www.w3.org/2000/svg";
  for (const m of group.members) {
    const s = startPoint(m.id);
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", String(s.x));
    line.setAttribute("y1", String(s.y));
    line.setAttribute("x2", String(CENTER.x));
    line.setAttribute("y2", String(CENTER.y));
    line.setAttribute("class", "trail" + (m.id === me ? " me" : ""));
    trails.appendChild(line);
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "pin" + (m.id === me ? " me" : ""));
    g.dataset.id = m.id;
    g.innerHTML = `<circle r="14"></circle><text y="6" text-anchor="middle" font-size="16"></text>`;
    g.querySelector("text")!.textContent = m.emoji;
    pins.appendChild(g);
  }
  if (!pinRaf) pinRaf = requestAnimationFrame(animatePins);
}
function animatePins() {
  pinRaf = 0;
  if (!group || $("group").classList.contains("hidden")) return;
  const elapsed = Date.now() + clockOffset - group.formedAt;
  const n = group.here.length;
  const pins = document.querySelectorAll<SVGGElement>("#pins .pin");
  let i = 0;
  pins.forEach((pin) => {
    const id = pin.dataset.id!;
    const s = startPoint(id);
    const arrived = group.here.includes(id);
    // ease in, but stop just short of the spot until they tap "I'm here"
    const p = Math.min(1, Math.max(0, elapsed / WALK_MS));
    const t = arrived ? 1 : Math.min(0.82, 0.05 + 0.95 * (1 - (1 - p) ** 2));
    let x = s.x + (CENTER.x - s.x) * t;
    let y = s.y + (CENTER.y - s.y) * t;
    if (arrived) {
      // arrived pins huddle around the spot instead of stacking
      const k = group.here.indexOf(id);
      const a = (k / Math.max(1, n)) * Math.PI * 2;
      x = CENTER.x + Math.cos(a) * 26;
      y = CENTER.y + Math.sin(a) * 26;
    } else {
      y += Math.sin(Date.now() / 220 + i) * 1.5; // little walking bob
    }
    pin.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    pin.classList.toggle("arrived", arrived);
    i++;
  });
  pinRaf = requestAnimationFrame(animatePins);
}

// ---------- countdown ----------
function startTicking() {
  if (tick) return;
  tick = window.setInterval(draw, 250);
  draw();
}
function draw() {
  const left = deadline ? Math.max(0, deadline - (Date.now() + clockOffset)) : LOBBY_MS;
  const s = Math.ceil(left / 1000);
  $("time").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  ($("bar") as unknown as SVGCircleElement).style.strokeDashoffset = String(CIRC * (1 - left / LOBBY_MS));
}

function show(screen: "setup" | "lobby" | "group") {
  for (const id of ["setup", "lobby", "group"]) $(id).classList.toggle("hidden", id !== screen);
  if (screen !== "lobby") $("timeoutBox").classList.add("hidden");
}
