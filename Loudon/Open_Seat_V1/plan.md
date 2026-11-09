# Open Seat: app plan

Working name. Lunch roulette + study buddy: you say "I have an open seat" at a campus spot, and other students come sit with you, for lunch or to study.

## The idea in one line

Put yourself out there for 30–60 minutes at a public spot on campus, and let someone come meet you (or go meet them).

## Why this, from our interviews

| What we heard | How Open Seat answers it |
| --- | --- |
| Joining a group is hard unless you're clearly invited | An open seat *is* the invitation. Nobody has to ask. |
| Fear of being perceived | Everyone on the board has opted in, so nobody is "the weird one." No profiles, just a first name and an emoji. |
| Doing something together beats introducing yourself | You're already eating or studying. The activity carries the conversation. |
| Friendships happen outside class | It runs in the gaps between classes, in places students already go. |
| Busy, clashing schedules (Madi) | It's live and short. No planning ahead, just "I'm free right now." |
| Live signs of others feel exciting (interview 3) | A live count: "9 people have open seats right now." |
| Safety concerns about meeting up | Public campus spots only, no GPS, seats expire, everyone can leave anytime. |

## Who it's for

KU students between classes who'd be open to company but wouldn't walk up to a stranger.

## Core concepts

- **Seat (table):** a host, a mode (lunch or study), a campus spot, a time window (30/45/60 min), an optional topic ("BIO 150," "anything"), and 1–4 open chairs. Up to 5 people per table, which is the brief's 5 live at once.
- **Spot:** a public place from a fixed list (Kansas Union, Watson Library, Wescoe…). We never share GPS, only the spot name plus a hint the host types ("by the windows, green backpack").
- **Spin:** roulette. Drops you into a random open table that matches your mode. If none exists, it offers to open one for you.
- **Random group:** you join a waiting line for lunch or study, optionally with a spot you'd like. When 5 people are waiting, they become a group at a spot one of them asked for (or a random one). If at least 3 have waited 2 minutes, the group starts with whoever's there. Names stay hidden until the group forms. Each group gets a color ("Purple group") shown full screen, so people can hold up their phones and find each other. Random groups are closed: nobody else can Spin or Sit into them.
- **Check-in:** "I'm here" button. Shows everyone at the table who has actually arrived.

## User flow

```
Join (first name + emoji)
   │
   ▼
Board: "N people open right now" ── live list of open tables, filter Lunch / Study
   │                 │                  │                    │
   ▼                 ▼                  ▼                    ▼
Open a seat      Join a table       Spin               Get a random group
(mode, spot,     (tap a table       (joins a random    (wait in line: "3 of 5 found";
 time, topic,     with an empty      open table)        group forms at 5, or at 3+
 chairs, hint)    chair)                │               after 2 min, with a color)
   │                 │                  │                    │
   └─────────────────┴──► Table screen ◄┴────────────────────┘
                     - who's at the table, who has checked in
                     - where to find it (spot + hint)
                     - countdown timer
                     - tiny table chat ("running 5 min late")
                     - I'm here / Leave
                        │
                        ▼
                   Table ends (timer, or everyone leaves)
                     - "Want to swap contacts?" (both have to say yes)
                     - back to the Board
```

## Screens

1. **Join:** first name, pick an emoji. That's all.
2. **Board:** live counter, Lunch/Study filter, list of tables (spot, host, topic, chairs filled, minutes left), buttons for Open a seat and Spin.
3. **Open a seat:** a form with the seat options.
4. **Table:** members, check-ins, the spot and hint, a countdown, chat, I'm here, Leave.
5. **After:** a contact swap that only happens if both people say yes. *Not in the prototype yet.*

## Safety and guardrails

- Public spots only, chosen from a list. No addresses, no GPS.
- First names and emoji only. No photos or profiles.
- Seats expire automatically, so nobody's location stays visible.
- Anyone can leave at any time, no explanation needed.
- Later: KU email login, report/block, a host can remove someone, and an option for women-only tables (suggested in interview 3).

## What the prototype does (and doesn't)

**Does:** live board across many phones or tabs, open a seat, join, spin, random groups, check in, table chat, countdown, auto-expiring tables, and a stats page with unique people and the peak live count for `numbers.md`.

**Doesn't (yet):** logins, accounts, saving data (a server restart wipes everything), the contact swap, maps, notifications, report/block.

## How we'd test it each week

- **Week 2:** run it on laptops and phones in class and in the Union at lunch. Count unique people and the peak live count from `/stats`.
- **Week 3:** post a QR code at one spot (a Watson table, the Union) at a fixed time each day so there are always some open seats.
- **Week 4:** recruit through clubs and group chats. "Bring a friend to your first table" for growth.
- **Week 5:** a scheduled "lunch rush" event to get 5+ people at tables at the same moment, filmed for documentation.

## Questions to answer by testing

- Will people actually host, or only join? (Do we need to seed tables ourselves at first?)
- Lunch or study: which gets more people to show up?
- Does Spin feel exciting or scary compared to picking a table?
- Do people prefer a random group (safety in numbers) over a one-on-one seat?
- How long will people wait for a group before giving up? Is 2 minutes right?
- How long should a seat stay open?
- What makes people actually walk over, and what stops them at the last second?
