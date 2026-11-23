# Open Seat V3: personality quiz and comfort settings

**Not deployed yet.** Run it locally (below). The live link for class is still [V2](../Open_Seat_V2/).

What's new and why: see [plan.md](plan.md).

- A quick **personality quiz** replaces the emoji picker. It gives you an archetype (🌻 The Sunshine, 🎧 The Quiet One, 🍜 The Foodie, 🧠 The Study Buddy, ☕ The Easygoing) and sets your comfort settings, time, and optional dietary/budget/accessibility notes.
- **Comfort settings** decide which groups you see and can join, where Spin can put you, and who you're grouped with in a random group. Gender and comfort settings stay private.
- Everyone at a table shows their archetype and tags, not just the host.
- Groups can be 15 minutes.

## Run it locally

Needs [Node.js](https://nodejs.org) 18 or newer. From this folder:

```bash
npm install
npm run dev
```

Then open http://localhost:8788. Each browser tab is a separate person, so you can take the quiz with different answers in different tabs to try the matching.

## Deploy

**Live link: https://sqku.pages.dev**

`npm run deploy` does two things:

1. Deploys the server (lobby, groups, chat) as its own worker, `open-seat-v3` at https://open-seat-v3.loudonnokes.workers.dev, so V2's link keeps working.
2. Publishes the page to Cloudflare Pages at https://sqku.pages.dev, the short link we share and track in Plausible. The page connects back to the worker for the live lobby, so both links share the same groups and chat.

## Files

- `plan.md`: the V3 plan.
- `src/server.js`: the whole backend, including the matching rules (`fitsTogether`).
- `public/index.html`: the whole app, including the quiz.
- `wrangler.jsonc`: Cloudflare settings.
