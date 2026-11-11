# Tablemates: PartyServer proof of concept

**Live multiplayer link: https://tablemates.madi-ixd-bpt.workers.dev**

A live group lobby for meeting people on campus for lunch or studying. Everyone waits together on a shared 2-minute countdown, and the app puts people who are open to each other into a small group with a place to meet.

Log: [Week 2 (due Wednesday, November 11)](../logs/week-2_due-wednesday-november-11.md)

## How it works
1. Pick **Lunch**, **Study**, or **Hobby** (then choose an interest like artsy or athletic; each interest has its own lobby), what you are (woman, man, nonbinary, or prefer not to say), and who you're open to being grouped with.
2. Pick an emoji and write a short "how to spot me" note (e.g. green hoodie, red backpack).
3. Join the lobby. Everyone sees the same 120-second countdown and who's waiting, plus how many of them could join *your* group.
4. A group forms as soon as 4 people are all open to each other, or when the timer ends (2+ people). If nobody matches, you can keep waiting or leave.
5. The group gets a meeting spot and sees each other's notes. Tap **📍 I'm here** when you arrive, and it turns green for everyone.

## Matching rules
- Everyone in a group must be open to everyone else's answer.
- "Prefer not to say" is only grouped with people who are open to everyone.
- Nobody sees anyone else's answers. Your group only sees your emoji, name, and note.
- The pickiest people (fewest possible matches) are grouped first, so nobody is left out when a match exists.

## Stack
- PartyServer (PartyKit's successor) on Cloudflare Workers, one room per lobby (`lunch`, `study`, `hobby-artsy`, …), plain HTML/CSS, TypeScript client
- Hosted PartyKit shut down on Oct 23, 2026, so this deploys to Cloudflare instead
- Lobbies live in memory, so they reset when everyone leaves.

## Run locally
    cd app
    npm install
    npm run dev

Open http://localhost:8787 in two windows to act as two people.

## Deploy
    cd app
    npm run deploy

The first deploy asks you to log in to Cloudflare (free account).
