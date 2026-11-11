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
  const room = choice.mode;
  $("roomLabel").textContent = choice.mode === "lunch" ? "🍜 Lunch lobby" : "📚 Study lobby";

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

  if (msg.type === "ungrouped") show("setup");
}

function renderGroup(g: any) {
  show("group");
  $("spot").textContent = g.spot;
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
