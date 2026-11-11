# Week 2 log: due Wednesday, November 11

**Assignment:** get a multiplayer proof-of-concept demo running with tldraw sync or PartyKit, deployed so multiple people can use it at once.

## What I made

**Tablemates**, a live group lobby for finding people to eat lunch or study with on campus. Built with PartyServer (PartyKit's successor) on Cloudflare.

- **Live link:** https://tablemates.madi-ixd-bpt.workers.dev
- **Code:** [Madi/tablemates](../tablemates/)

How it works:
- Pick Lunch or Study, what you are, and who you're open to being grouped with (women, men, nonbinary people; check any).
- Pick an emoji and write a short "how to spot me" note.
- Everyone in the lobby shares one 120-second countdown and can see who's waiting.
- A group forms when 4 people are all open to each other, or when the timer runs out with 2+ matches.
- The group gets a meeting spot, sees each other's notes, and taps "I'm here" on arrival. Check-ins show up live for everyone.

## Design choices

- **Choose who you're grouped with.** Being randomly put in a group of strangers can feel unsafe, so you pick who you're open to, and a group only forms when everyone is open to everyone else. Nobody sees your answers.
- **"How to spot me" notes.** Everyone writes one, so the group can actually find each other in person.
- **Shared 2-minute countdown.** Searching for a group shouldn't go on forever, so the lobby works like a game lobby with a timer.
- **Big, obvious buttons.** The mode choice is two big buttons, and "I'm here" is the biggest button on the screen.

## Getting it running

- Ran it locally and opened it in two browser windows. Both windows saw the same lobby and countdown right away.
- Fixed a matching problem along the way: the first version could leave someone out even when a match existed, because a less picky person got grouped first. Now the people with the fewest possible matches are grouped first.

## Next

- Get 4+ people on it at the same time and see if groups form the way they should.
