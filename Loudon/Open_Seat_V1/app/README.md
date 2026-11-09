# Open Seat prototype (V1)

A very rough, working prototype of Open Seat. This is V1, the version I user tested in Week 2 (see [my testing notes](../../../notes/Loudon_V1_User_Testing_Notes.md)). See [`../plan.md`](../plan.md) for the idea, flow, and testing plan.

## Run it

Needs [Node.js](https://nodejs.org) 18 or newer. No installs. Run it from the repo root:

```bash
node Loudon/Open_Seat_V1/app/server.js
```

Then open http://localhost:3000.

- **More people on one computer:** each browser tab is a separate person, so open a few tabs.
- **Phones on the same Wi-Fi:** find your laptop's local IP (`ipconfig getifaddr en0` on a Mac) and open `http://<that IP>:3000` on the phone. KU's campus Wi-Fi may block this; a phone hotspot works.
- **Numbers for `numbers.md`:** open http://localhost:3000/stats for unique people, peak online at once, biggest table, meetups (2+ people checked in at one table), and random groups formed.
- **Random group timing:** a group forms at 5 people, or with 3+ once the first person has waited 2 minutes. For a quick demo, shorten the wait: `GROUP_WAIT_MS=10000 node Loudon/Open_Seat_V1/app/server.js` (10 seconds).

## Files

- `server.js`: the whole backend. Keeps everything in memory and pushes live updates with Server-Sent Events.
- `public/index.html`: the whole app (join, board, open a seat, table).

## Known limits

Restarting the server wipes everything. No logins, no report/block, no contact swap, and it only runs where the server runs. To test beyond one Wi-Fi network, it needs to be deployed (for example to Render, Railway or Glitch) or rebuilt on PartyKit.
