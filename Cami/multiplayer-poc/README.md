# Group 3 Test Room

IXD415, Bring People Together: multiplayer proof of concept.

A shared live board. Everyone who opens the link sees each other's cursors with names,
taps to drop emoji stickers that everyone sees instantly, and sees a live "people here"
count. It's a setup test for real-time multiplayer, not our actual project.

Built with **PartyServer** (PartyKit's successor, now run by Cloudflare) on a free
Cloudflare Workers account. One Durable Object runs per room and relays every
cursor move and sticker to everyone connected.

- Default room is `lobby`. Make a separate room with `?room=anything` on the URL.
- Guardrails: names capped at 20 characters, stickers only from the emoji palette,
  a per-person rate limit on stickers, and at most 400 stickers per room.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:8787 in two or more windows.

## Deploy (free, about 5 minutes)

1. Make a free account at https://dash.cloudflare.com/sign-up
2. In this folder:
   ```bash
   npx wrangler login     # opens your browser, click Allow
   npm run deploy
   ```
   If it asks you to pick a workers.dev subdomain, type any name.
3. It prints a URL like `https://group3-test-room.<your-subdomain>.workers.dev`. That's the link to share.

## Files

- `src/server.ts`: the multiplayer server (who's in the room, cursors, stickers)
- `public/index.html`: the page people see
- `wrangler.jsonc`: Cloudflare config
