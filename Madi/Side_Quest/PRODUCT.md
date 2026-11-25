# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

College students who want to meet new people and make friends, but find it hard to start: they struggle with small talk and reaching out, are too busy to make plans, or don't want to bother people. The current prototype is set up for KU (KU email sign-up, KU campus spots), but the product is meant for college students anywhere.

Their job: find a few people to eat, study, hang out or go to something with, right now or later this week, without the pressure of planning it or the awkwardness of meeting one stranger alone.

## Product Purpose

Side Quest is an easy, no-pressure way to go out and make friends. You take a short personality quiz, then drop into a small group that's meeting somewhere public on campus, start one yourself, get matched into a random group, or plan an outing for later.

Success means people actually show up and meet in person, and want to do it again.

## Positioning

What neighboring products can't truthfully claim, all together:

- **Groups of 3 to 5, never one-on-one.** It never feels like a date, and it's not a dating app.
- **Public, verified places only.** Meetups happen at checked public spots (dining halls, libraries, venues, parks), never dorm rooms or homes, with verified students.
- **Personality quiz matching.** A friend type and shared interests decide who you meet, not a profile or photos.
- **Right now and low effort.** Spin or join in a tap; no planning and no small talk before you meet.

## Operating Context

- Used on a phone, in the moment: between classes, at lunch, deciding whether to go to something tonight.
- It's a group project for IXD 415 (Bring People Together), tested with real people every week. The class goal is reaching 100 users, including 5 people live at once.
- Earlier versions: Open Seat V1–V3 by Loudon (repo `Loudon/Open_Seat_V*`); this is Madi's V4.

## Capabilities and Constraints

- **Web app, not a native app and never a website.** People open a link and use it like an app in their phone's browser. There is no App Store version and no marketing site.
- Runs on Cloudflare (PartyServer), one live room everyone shares. Groups and plans live in memory and reset when the server restarts.
- Capabilities in the prototype: personality quiz with friend types (The Sunshine, The Quiet One, The Foodie, The Study Buddy, The Adventurer, The Easygoing) and up to 6 interests; comfort settings ("Anyone," "A mix, as long as I'm not the only one of my gender," "Only people of my gender"); Spin; start a group now; random groups with a 2-minute countdown; plans for up to 2 weeks ahead; group chat; "I'm here" check-in; profile with all preferences.
- Activities: Food, Study, Hang out, Events, each with its own list of verified public places. Groups are 3 to 5 people.
- **Prototype only, not real yet:** KU email and student ID verification don't actually check anything; the public-place check uses a fixed list, not a maps service.
- **Not built yet:** blocking and reporting, a check-in after each meetup, "met before" tags, recently met.

## Brand Commitments

- **Name: Side Quest.** It replaces "Open Seat." Same base app, new name.
- **Voice:** easy, no pressure, friendly. Going out to make friends should feel like a small adventure, not a chore.
- **Mascots:** each friend type gets a hand-drawn mascot by Madi. Done so far: The Sunshine (`public/mascots/sunshine.png`) and The Quiet One (`public/mascots/quiet.png`). The other four still use emojis until drawn.
- **Inclusion rule everyone agrees to:** people of every gender, sexuality, race, religion and background are welcome at every table; disrespect, hate or harassment gets you removed.

## Evidence on Hand

- Interview takeaways: `Madi/madi.md`, `Cami/cami.md`, `notes/` in the group repo.
- User testing: Madi's round 1 log and screenshots, the Nov 13 and Nov 15 test transcripts, Loudon's Nov 16 V3 test (`Loudon/2026-11-16_Open_Seat_V3_Testing.md`), Madi's Nov 16 and Nov 18 logs (`Madi/logs/`).
- Safety and trade-offs: `threats.md` in the group repo.
- Real testers' quotes and findings exist in those notes. No testimonials, user counts, ratings or press exist yet, so none should be invented.

## Product Principles

1. **Safety is the floor, not a feature.** Small groups, public places and comfort settings come before anything else, and the rules are the same for everyone.
2. **No pressure.** Every step should be easy to try and easy to back out of, with no explanation needed.
3. **Get people to meet in person.** The app is the way in, not the place to hang out; chat exists to help people find each other.
4. **Matching should feel fair and explain itself.** If you can't join something, the app says why.
5. **Personality over profiles.** People are introduced by friend type and interests, not photos or bios.

## Accessibility & Inclusion

- Comfort settings offer the same choices to every gender; "Prefer not to say" is always allowed and is matched with anyone.
- People can note an accessible-spot need, dietary needs and budget, which show to their group.
- Text contrast is checked against WCAG AA.
