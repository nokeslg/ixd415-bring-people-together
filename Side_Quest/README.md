# Side Quest

Our team's app (Cami, Loudon, Madi). Side Quest is the new name for Open Seat: same base app. It started as Madi's V4, a copy of [Loudon's Open Seat V3](../Loudon/Open_Seat_V3/) made on 11/16. It lives here at the top of the repo so anyone on the team can update it. Changes from V3 are listed below.

**Live link: https://sqku.pages.dev** (the short link Plausible tracks). Or run it locally (below).

## What's new in V4

- **Looks and works like a phone app.** On a laptop it shows inside a phone frame; on a real phone it fills the screen. Tabs along the bottom (Home, Plans, ＋, My groups, Profile), a ＋ button that opens a "Meet up" menu, back buttons on every screen, and chat bubbles.
- **My groups tab.** The group you're in right now (or the countdown while one forms), plus the plans you're going to.
- **Profile page.** Your archetype, name, verified badge, KU email, interests and all your preferences in one place, with Save. You can still retake the quiz.
- **KU email and ID verification (prototype).** Sign up with an @ku.edu email, then add a photo of your student ID to get a ✓ Verified badge. Nothing is really checked, and the photo stays on your device.
- **Interests in the quiz.** Pick up to 6. They show on your profile and in groups ("In common: 🎵 Music"). Spin and random groups prefer people who share them.
- **More than lunch and study.** Activities are Food, Study, Hang out and Events, each with its own list of public spots.
- **Plan an outing for later.** Post a plan for any day in the next 2 weeks ("Jazz night at Liberty Hall, Friday 7 PM"). Others see it under Plans, tap "I'm in," and get a group chat before it happens.
- **Group size 3 to 5**, picked when you start a group or get a random one. Three is the minimum, so nobody meets one-on-one.
- **Countdown while your random group forms.** A ring counts down the 2 minutes, and each person found pops into a seat.
- **A neutral comfort question.** Everyone gets the same three choices: "Anyone," "A mix, as long as I'm not the only one of my gender," or "Only people of my gender." "Prefer not to say" is matched with anyone.
- **Quiz answers stay highlighted for a moment** before moving on, so you (and screen recordings) can see what was picked.

### Round 2 (11/17)

- **New look,** inspired by poster design: Instrument Serif (a condensed serif) for headlines, DM Sans for text, and grainy gradient cards. Fonts are bundled in `public/fonts`, so it works offline.
- **Bigger phone on laptops.** It's drawn at real phone size and scaled to fill the screen. The testing panel beside it is gone.
- **A quiz intro** explains it's a personality quiz: what kind of friend you are and who you click with. Results now include "You click with…".
- **Back and Next on every quiz question,** with your earlier answers still selected.
- **Reworded time question:** "How long do you like to hang out with new people?"
- **Type in the place** when you start a group or plan an outing. Suggestions pop up, a spinner checks it, and only verified public places are allowed. Dorm rooms, homes and street addresses are turned away. The server checks this too.
- **Activity picker is a 2 × 2 grid,** so nothing overlaps or scrolls sideways.
- **Black app background,** with lime and pink highlights.
- **Real KU dining spots for Food:** North College Cafe, Studio Grill, Mrs. E's, South Dining Commons, The Market, The Underground, Courtside Cafe, plus all eight campus Starbucks (Kansas Union, North College Cafe, Studio Grill, South Dining Commons, Courtside Cafe, The Underground, Burge Union, and the J Café in Capitol Federal Hall). Typing "Starbucks" asks which one.
- **Floor picker in "How to find you."** Starting a group now requires picking a floor (or "Outside / out front"); it's optional for plans. The group sees it like "2nd floor · By the windows, green backpack."
- **Groups you can't join show up dimmed** with "Not a match" and the reason, instead of disappearing. Comfort settings (yours, or someone's in the group) can rule a group out, for example when the host picked "not the only one of my gender" and the next person to join has to share it.
- **Duplicate-tab warning.** A duplicated tab copies who you are, so it's the same person and can't join that person's groups. That tab now says so and offers "Start as a new person."
- **The quiz intro scrolls** on smaller screens.
- **Madi's mascots** for The Sunshine and The Quiet One (`public/mascots/`) replace their emojis everywhere: quiz result, profile, the profile button, group lists, seats and chat. Their cards switch to a dark glow so the mascots stand out. Other friend types keep emojis until their mascots are drawn.
- **Coming up lines up** with the rest of the home screen.

## Updating it (anyone on the team)

1. `git pull` so you have everyone's latest changes.
2. Edit the app. Almost everything is in two files:
   - `public/index.html`: every screen, the quiz, the text people see, colors and fonts.
   - `src/server.js`: groups, chat, matching rules (`fitsTogether`) and feedback.
   - Mascot art goes in `public/mascots/`.
3. Double-click `Start Side Quest.command` to try it on your laptop. Each browser tab is a different person.
4. Commit and push, and add a line to `log.md` if you tested it with people.
5. Publish (below) when you want testers to see the change.

Who can publish what:

| Step | Where it goes | Cloudflare account | Who can run it |
| --- | --- | --- | --- |
| 1. Server | open-seat-madi-v4.madi-ixd-bpt.workers.dev | Madi's | Madi, or anyone she adds as a member |
| 2. Page | sqku.pages.dev | Loudon's | Loudon, or anyone he adds as a member |

If you're a member of more than one Cloudflare account, wrangler asks which one to use. Pick Madi's for step 1 and Loudon's for step 2.

## Run it locally

Needs [Node.js](https://nodejs.org) 18 or newer. From this folder:

```bash
npm install
npm run dev
```

Then open http://localhost:8788. Each browser tab is a separate person, so you can take the quiz with different answers in different tabs to try the matching.

## Deploy

**Live link: https://sqku.pages.dev**

Double-click `Publish Side Quest.command`, or run the two steps yourself:

1. `npm run deploy` publishes the live server (groups, chat, feedback) to Madi's Cloudflare account at https://open-seat-madi-v4.madi-ixd-bpt.workers.dev. The server keeps its old name on purpose: nobody sees it, and renaming it would start a new, empty server.
2. `npm run deploy:page` publishes the page to Cloudflare Pages at https://sqku.pages.dev, the short link we share and track in [Plausible](../analytics/). The `sqku` project is in Loudon's Cloudflare account, so he runs this step, or adds Madi to his account.

The page on sqku.pages.dev connects back to the server (`SERVER_HOST` in `public/index.html`), so both links share the same groups and chat. Publishing this replaces Loudon's V3 at sqku.pages.dev.

To run it on this Mac without typing commands, double-click `Start Side Quest.command`.

## Files

- `plan.md`: Loudon's V3 plan, from when the app was still called Open Seat.
- `PRODUCT.md`: who it's for, what it does, and brand notes.
- `side-quest-palette.png`: the color palette.
- `open-seat-v4-screens.html`: a board of the screens as of 11/18, before the rename.
- `src/server.js`: the whole backend, including the matching rules (`fitsTogether`).
- `public/index.html`: the whole app, including the quiz.
- `wrangler.jsonc`: Cloudflare settings.
