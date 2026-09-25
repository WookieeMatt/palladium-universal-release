# Party & Session Tools

## The Party actor
Create an Actor of type **Party** (e.g. "The Team"). Its sheet has two tabs:
- **Members:** three lists, **Player Characters**, **NPCs** (allies, companions, followers) and **Vehicles** (vehicles and time machines). The GM drags actors from the Actors sidebar onto the sheet and each goes in its own list. Members are linked, not copied, so the party always shows their current state, and they don't need a token on the map. Click a name to open its sheet; the GM can remove members with ✕. (A compendium actor has to be imported first.)
- **Party Notes:** a shared page everyone in the party can write in (plans, clues, loot).

The Party has its own portrait and token: drop it on a map to show the group as one marker (for travel, say). Players can move it.

**Active Party:** the GM Party View and the Session Tools use the Active Party. With a single Party actor it's automatic; with several, pick one in **Configure Settings → System Settings → Active Party**, or click **Make Active Party** on its sheet.

## GM Party View
Open it with **GM Party View** at the top of the Actors sidebar, or from the Party sheet. For every character and NPC it shows, live:
- Hit Points and S.D.C. (bars), actions left this round, armor (A.R. and S.D.C.) and natural A.R.
- Level, XP toward the next level and a **Level up!** badge when their XP has reached it; **Down** / **Bleeding out** badges.
- Active conditions (Stunned, Prone...).
- A compact list of their skills with percentages.

Vehicles show their S.D.C., speed and status (Operational, Incapacitated, Totaled). Click any name to open the sheet.

**Add Party to Combat** (GM) puts every character and NPC in the party, but not the vehicles, into the Combat Tracker: with their token if it's on the current scene, without one otherwise. Anyone already in the combat is skipped, and an encounter is created if there isn't one. Roll initiative from the tracker as usual.

## Session Tools (GM)
Open them from the Party sheet or the GM Party View. One window holds the session you're running:
- **Session number, title and date played.**
- **Goals for This Session**, **What Happened**, **Hooks Planted**, **Secrets & Reveals** and **Ideas for Next Time**: rich-text notes.
- **NPCs Featured**, **Scenes Played** and **Journals Referenced**: drag actors, scenes and journal entries in; they print as links.
- **Experience Awarded:** every award this session and each character's total.

Everything saves as you type, in the GM-only **Session Log** journal, so players never see your secrets.

**Award XP** lists the book's Experience Points Award Table (p.75): pick an award (the amount is filled in from its range, and you can change it), add a reason, tick who gets it (the party's characters are ticked; NPCs aren't). A chat card shows everyone's new XP. A character whose XP reaches the next level (Experience Levels table) goes up a level automatically; the card says so, and their sheet's Hit Points button turns into **Roll HP for Level N**.

**Print to Journal** writes the session as a page of the **Session Log** journal (one page per session: "Session 12: The Mousers Return"), with headings, clickable links and the experience tables. Print again later to update the page, or start the next session (a blank Session 13).
