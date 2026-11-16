# Threats and trade-offs

What we're protecting against, what we're allowing as a trade-off, and why. This comes from Wednesday's discussion, our user testing, and crit.

Our app puts strangers at the same table in real life, so the biggest risk is someone getting hurt or feeling unsafe at a meetup, not something breaking online. We put most of our effort there and accept more risk in places where the worst case is small.

## What we protect against

| Threat | Why it matters | What we do |
| --- | --- | --- |
| **Meeting in an unsafe place** | Strangers meeting in a dorm, apartment or car is where things could really go wrong. | You can only pick from a short list of public campus spots (Kansas Union, Watson, DeBruce, etc.). There's no way to type in your own address. |
| **Feeling unsafe with who's at the table** | A woman tester said she wouldn't feel safe being put in a random group of all men. | Comfort settings from the quiz: "anyone," "women and nonbinary people only," or "mixed, up to 1, 2 or 3 men." Matching has to work for everyone at the table, both ways. |
| **Outing someone or exposing private info** | Gender and comfort settings are personal, and some people don't want to share them. | Nobody sees anyone else's gender or comfort settings. You only see groups that fit you. "Prefer not to say" is always an option. |
| **Hateful or homophobic people** | We joked about it at crit, but it's real: people need to know they won't be harassed for who they are. | The "Open Seat is for everyone" agreement in the quiz, comfort settings, and (next) block, report, and a private "Did you feel safe?" check after each meetup. Someone who keeps getting flagged stops getting matched. |
| **Being stuck in a meetup forever** | Not knowing how long something lasts makes it harder to say yes, and harder to leave. | Every group has a set time (15–60 min) and closes on its own. You can leave any time. |
| **Revealing who you are** | Testers liked staying anonymous until they actually meet. | No photos or real profiles: just a first name, an archetype emoji, and a short "how to find me" note. |
| **Spam and trolling in chat** | Chat is how people find each other, so it needs to stay usable. | No open lobby chat (removed in V2). Chat only exists inside a group, messages are short (200 characters), and old chat disappears when the group closes. |

## What we allow as a trade-off

| Trade-off | What could go wrong | Why we're OK with it for now |
| --- | --- | --- |
| **No verification (face scan / KU email)** | Anyone with the link can join, including people who aren't KU students. | Verification makes signing up slow, which kills spontaneous meetups, and we need 100 testers in 5 weeks. We meet in public places and you can always leave. This is on hold, not dropped. |
| **People can lie on the quiz** | Someone could pick a different gender or click "I'm in" without meaning it. | No quiz can catch a liar. We rely on layers instead (public spots, comfort settings, reporting, the private safety check) and say so honestly. |
| **"Prefer not to say" counts like a man toward limits** | Someone who isn't a man might get left out of women and nonbinary only groups. | It's the only way limits mean anything if someone hasn't shared. We still need to agree on this as a group. |
| **No public ratings** | Bad behavior is harder for other users to see ahead of time. | Public star ratings turn meeting people into a popularity contest and can be used to bully people. We keep ratings private, just for us to spot problems. |
| **We don't match on political views** | Some users wanted to avoid people who disagree with them. | Filtering by politics splits people up, which is the opposite of what we're making. We protect against how people *act* (hate, harassment) instead of what they believe. |
| **"How to find me" notes describe what you look like** | Someone could use a "purple backpack" note to spot you. | You can't find the other person without it. It's only shown to people in your group, and only until the group closes. |
| **Prototype-level tech** | Accounts aren't real logins, so a tech-savvy person could pretend to be someone else, and everything is wiped when the server restarts. | We're testing whether people will show up, not building a bank. Wiping data also means we don't keep anything about anyone. We'd fix this before a real launch. |

## Still to build

- Block and report.
- The private "Did you feel safe? / Would you meet again?" check after a meetup.
- Accessibility needs in the quiz so the spot works for everyone (wheelchair access is in V3, more to come).

## Ideas we listed at crit

### Safety and trust

- **Identity verification:** confirm users are real, for example with a face scan matched to a photo ID, checked on our end.
- **Verified public places only:** groups can only meet at approved public spots, never dorms or homes.
- **Blocking and reporting:** let users block someone and report bad behavior.
- **Rating after a meetup:** a quick check-in afterward on how it went, which helps us catch problem users.
- **Group comfort settings:** let users choose what group makeup they're comfortable with, such as how many men or women are in the group.

### Matching

- **Personality test:** a short quiz during sign-up to help match people.
- **Archetype tags:** short labels from the quiz (like "the planner" or "the talker") that show on a profile.
- **Interests:** let users pick their interests so groups have something in common.
- **Preferences:** settings for who users want to meet, such as class year or gender.
- **Matching system:** decide how the app actually builds groups from all of these inputs.
- **Shared values:** some users may want to match with people whose political or social views are similar to theirs. We need to decide whether to support this and how.

### Inclusivity and access

- **Gender inclusivity:** make sure gender options and group settings work for nonbinary and trans users.
- **Accessibility:** let users share disabilities or access needs, so the meeting spot and activity work for everyone.
- **Food needs:** let users note allergies or dietary restrictions for meal meetups.

### Logistics

- **Distance:** let users set how far they're willing to travel.
- **Cost:** show whether an activity costs money and roughly how much.
- **Time commitment:** set an expected length for each meetup, possibly with a cap, so people know what they're signing up for.

### Profile and history

- **Mascots as emojis:** use emojis as avatars to keep users anonymous.
- **Recently met:** a list of the people you've met before.
- **"Met before" tag:** show when someone in your new group is someone you've already met.
