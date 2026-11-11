# Open Seat V2: live multiplayer demo

**Try it: https://open-seat.loudonnokes.workers.dev**

Our multiplayer proof of concept. It's [Open Seat V1](../Open_Seat_V1/) (the version I user tested) moved onto [PartyServer](https://github.com/cloudflare/partykit/tree/main/packages/partyserver), PartyKit's open-source successor, running on Cloudflare. Hosted PartyKit shut down in October 2026, so this is the way PartyKit projects deploy now.

Everyone who opens the link joins the same live lobby, from any phone on any network.

## What changed from V1

- It runs in the cloud, so it isn't stuck on one Wi-Fi network anymore.
- "Open a seat" is now **Start a group**: pick Lunch or Study, a spot, how to find you, and a group size (up to 5). Anyone can **Join** it until it's full.
- The main screen lists everyone online under "Here now."
- The random group waiting screen shows your own emoji (it always showed 🙂 in V1).

## Demo with 5 people

Everyone opens the link, types a first name and picks an emoji. Make sure everyone is on the same tab (Lunch or Study), then either:

- **Start a group:** one person taps **＋ Start a group** with group size 5, and the other 4 tap **Join**, or
- **Random group:** all 5 tap **Get a random group**. The group forms the moment the 5th person joins.

All 5 land on the same group screen and can talk in the group chat.

## Run it locally

Needs [Node.js](https://nodejs.org) 18 or newer. From this folder:

```bash
npm install
npm run dev
```

Then open http://localhost:8787. Each browser tab is a separate person.

## Deploy, stats and reset

- **Deploy:** `npm run deploy` (asks you to log in to Cloudflare the first time).
- **Stats for `numbers.md`:** https://open-seat.loudonnokes.workers.dev/parties/open-seat/lobby shows unique people, peak online at once, biggest group, and groups formed.
- **Empty the lobby before a test:** `npm run reset`. One-time setup: put a random key in a `.reset-key` file here (it's not committed) and run `npx wrangler secret put RESET_KEY` with the same key. The lobby also empties itself once nobody has been on it for a few minutes.

## Files

- `src/server.js`: the whole backend, one live room that keeps everything in memory.
- `public/index.html`: the whole app.
- `wrangler.jsonc`: Cloudflare settings.
