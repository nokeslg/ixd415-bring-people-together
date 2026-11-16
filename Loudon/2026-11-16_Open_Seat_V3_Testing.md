# Open Seat V3 testing: Mon 11/16

- **What I tested:** [Open Seat V3](Open_Seat_V3/), with the new personality quiz and comfort settings, live at https://open-seat-v3.loudonnokes.workers.dev
- **With whom:** 5 people
- **Recordings:** users 1 and 2 (user 1 on my phone, user 2 on my laptop)
- **What each user did:** in the [log](../log.md#loudon-user-testing-open-seat-v3)

## Summary

V3 replaced the profile form with a short personality quiz, and added comfort settings so people only get matched into groups they're OK with. I had 5 people make a profile and either start or join a group.

The quiz itself went smoothly. User 1 went from opening the link to hosting a group in about a minute and a half without help, and by the end of the session 4 people were in one group chatting together. But testing turned up one serious bug and showed that the comfort matching, even though it works the way it was built, is confusing because people can't see why groups are hidden.

## The biggest finding: groups can disappear

**The recording caught a bug.** User 2 joined user 1's lunch group and sent "Coming." in the table chat. About 3 seconds later the group was gone for everyone:

- Nobody tapped Leave.
- There were still 44 minutes left on the timer.
- Both people were still online. The board just said "2 online · 0 in groups."

Right now groups only live in the server's memory, so my best guess is that the room restarted and lost everything, but I haven't confirmed the cause yet. Either way, to a real user this looks like getting kicked out of the group, possibly while they're already walking there. This is the first thing to fix, and groups should be saved somewhere that survives a restart.

## Takeaways

1. **The comfort matching works, but it's invisible.** User 3 chose "Women and nonbinary people only" and couldn't find the group she was told to join, with no idea why. User 5 couldn't see the second group at all. Both are what the app was built to do, but nothing tells people that a group is hidden or why. This is the big design question: how do we get people into specific groups, and which groups should be visible?
2. **The comfort question doesn't fit everyone.** Everyone gets the same options, so a man was offered "Mixed, up to 3 men," which confused him. The question needs to change depending on how someone answered "I am a…."
3. **The nonbinary option worked.** User 4 is genderfluid and picked "Nonbinary," and could see both groups. They joined user 1's group because it was bigger.
4. **Live group chat worked with 4 people.** By user 5, there were 4 members in one group, and everyone could chat and see the chat. That's our closest yet to the brief's 5 at once.
5. **Joining across devices worked.** User 2 saw user 1's group, joined it from a different device, and their chat message showed up right away (right before the bug hit).
6. **There's no selected state, so the recordings don't show choices.** I didn't realize until afterward that you can't tell what's being clicked in the recordings. Quiz answers jump straight to the next question without showing what was picked, and buttons don't show a pressed state. Only the food/budget chips and the Lunch/Study switch show a selection. So gender and comfort answers can't be seen on video at all (user 1's "up to 3 men" is from my memory). This is a design problem too: people need to see what they picked.

### Smaller things from the recordings

- The name box shows "Loudon" as its example text, so testers might think it's already filled in. It should say "Your first name."
- On my phone, the browser's "AutoFill Contact" bar kept covering the name box and the group form.
- The board opened on the Study tab even though user 1 wanted lunch.

## What we need to figure out and focus on next

1. **Fix the disappearing groups.** Find out what wiped the group, and save groups so they survive a restart.
2. **Make hidden groups make sense.** Some options:
   - Show a line like "1 more group isn't shown because of your comfort settings."
   - Show every group but grey out the ones that don't fit, with a reason.
   - When there's nothing that fits, suggest starting your own group with your settings.
   - We need to decide as a team how much to show, without exposing anyone's private settings.
3. **Rewrite the comfort question by gender.** For example, men could get "Anyone" or "Groups with other men," and women and nonbinary people keep the current options. We also still need to decide how "Prefer not to say" should count.
4. **Add selected and pressed states** to quiz answers and buttons (even a quick flash before the next question), so people and recordings can see what was chosen.
5. **Get 5 people live in one group** to hit the brief, and screen record more than one device at a time.
6. **Testing setup:** start the board on the tab people pick, change the name example text, and record every tester, not just the first two.
