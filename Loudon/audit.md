# Loudon: Multiplayer audit (Week 1)

_Wednesday, 11/4. A cleaned-up version of my rough notes and annotations._

## 1. Spotify (Listening activity and Jam)

Music streaming. The Listening activity panel shows what friends played recently, and Jam lets people listen to one shared queue together.

![Spotify Listening activity panel](images/spotify-listening-activity.png)

**Multiplayer design choices:**

- **Profile pictures and display names:** each friend shows up as themselves, with names they chose ("Mr Alex Super Fan," "holly ☆"), so it's partly a performance
- **What they played:** song and artist, plus where it came from, an album (disc icon) or a playlist (note icon)
- **Playlist names:** "me," "Liked Songs," "Nov 26'" give away a little personality people didn't directly choose to share
- **Time stamps:** 9 min, 18 min, 2 hr, newest at the top. Nobody here is listening right now, so it's traces of people, not live presence
- **"Start a Jam" prompt:** "Invite others to your Jam, and listen together from anywhere." Seeing friends' traces is the hook, and the button turns it into something live and together

## 2. Transit (Lawrence bus app)

Live bus tracking for Lawrence Transit. The GO feature lets riders share their trip to improve tracking for everyone.

![Transit app with GO, rankings and live bus](images/transit-go.png)

**Multiplayer design choices:**

- **Emoji rider on the bus:** a small face with signal waves on the moving bus shows someone is riding it right now and sharing their trip. You know someone is there without knowing who
- **Live vs. scheduled:** "22 minutes" is bright with a signal icon because it's live data; "52" and "82" are dimmed and labeled SCHEDULED
- **Rankings:** a leaderboard ("8") for riders who share trips, which rewards helping other riders with a bit of competition
- **Crowd ratings:** ★ 4.8 and ⌛ 73% sum up other riders' experiences as numbers
- **Sharing location as helping:** sharing where you are is presented as useful and a little playful, not creepy

## 3. Slack (Reactions)

Workplace and group chat. Reactions let people respond to a message with an emoji instead of writing a reply.

![Slack message with reactions](images/slack-reactions.png)

**Multiplayer design choices:**

- **Reaction counts:** 👍 3 shows at a glance how many people saw the message and agreed
- **Your reaction highlighted:** the blue outline on 👍 means I'm one of the 3, so you know you're counted
- **Different reactions side by side:** 🌚 1 next to 👍 3 shows a mixed response, adding a sly tone the words alone can't
- **Names on hover:** counts show right away, and who reacted shows when you hover
- **One tap to take part:** joining an existing reaction is the lowest-effort way to be part of a conversation

## What they have in common

All three show that other people are there without making you talk to them: a face on a bus, an emoji under a message, a song with a time stamp. Each one also gives a small next step: join the Jam, ride with GO, add a reaction. Interview 1 said people already use emojis to replace tone and body language when texting, and Slack builds that habit into the design. For our project, this is the pattern to borrow: show that people are around, then make the first step a single tap.
