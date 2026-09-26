# GM Tools

## Settings
**Configure Settings → System Settings → Team Character Generation**: when on, a character generating an attribute with an exceptional roll (16–18) uses the highest bonus die a teammate (a character in the same Actors folder) rolled for that attribute, if it's higher than their own.

**Configure Settings → System Settings → Default Portrait**: the portrait and token new characters and NPCs start with: **Mutant turtle (black and white)** (the default), **Mutant turtle (color)**, or **Foundry's mystery man**. Compendium NPCs that still have a default portrait follow the setting when imported. Your own art is never replaced.

**Configure Settings → System Settings → Show the Welcome Cards Again**: tick it and save, and the GM's module card and every player's welcome card show again the next time each of you loads the world (the box unticks itself). Macro: `game.palladium.resetWelcome()`.

**Configure Settings → System Settings → Turn Off Pause**: the world opens unpaused and can't be paused (Space or the pause button is undone at once). Off by default: Foundry's normal pause.

**Configure Settings → System Settings → Character Resets Allowed**: how many times a player may use **Reset Character** (end of the Creation Checklist) on each of their level 1 characters to redo character creation. 1 by default; 0 = never. Your own resets as GM don't count. Each reset shows in the audit as one line (who reset it), without the details of what was cleared. Macro: `game.palladium.resetCharacter(actor)`.

**Configure Settings → System Settings → Optional Damage Side-Effects** (p.93): *Leave it to the GM* (default), *Ask the GM* (a whispered card with a Roll button when a character loses 75% of their S.D.C., 75% of their Hit Points, or goes into a coma) or *Roll and apply automatically*. Results are **Injury** items carrying the penalties (see **Rules Reference**).

**Configure Settings → System Settings → Blood & Death Effects** (each player's own screen, on by default): a blood splash on the token when a character starts Bleeding Out, and a death marker when they die (a bigger splash, a "☠ Dead" float, the skull overlay, and the combatant marked defeated). Uses JB2A's splash through Sequencer when installed, otherwise a built-in one.

**Configure Settings → System Settings → Death Marker**: the image over a dead character's token (and in the Party View). Blank = the preset skull; pick any image with the file picker to replace it. New deaths use it (for a token that's already dead, remove Dead and apply it again).

**Configure Settings → System Settings → TMNT Journal Style** (on by default): journals and journal pages, including the compendium journals and this guide, use the character sheet look: green title bar, parchment pages, comic headings, green-headed striped tables and green link chips. Turn it off to keep Foundry's own journal style (e.g. with a journal module that has its own theme).

## GM macros
The **Palladium Universal Macros (GM)** compendium (hidden from players) holds ready-made macros; drag one to your hotbar:
- **Scene Weather (black powder)**: sets this scene's black powder weather (dry, humid +5%, rain +15%, downpour or dunking +35%), the default in every character's weather prompt when they fire black powder here. Announced in chat; "Not set" clears it.
- **Mark Blunt Weapons**: ticks **Blunt** (Roll with Impact works against it) on every weapon that should have it: world items, characters' and NPCs' weapons, tokens, and **unlocked** compendiums (unlock yours first; locked ones are listed). W.P. Blunt / Staff / Chain weapons (not bladed ones), punches, kicks, tails, hooves and head butts. It never unticks anything; a whispered card lists what changed. You rarely need it: the system does the same by itself (once per world on the GM's first login, and for every weapon created or imported afterwards, e.g. from an older NPC module), so no compendium rebuild can undo it. Untick a weapon by hand and it stays unticked.
- **Check Backgrounds**: compares every character's and NPC's backgrounds with the compendium's current versions (Education Bonus, Combat Training, skill and attribute bonuses), lists what changed, and **Update** swaps in the new copies (as if dropped on the sheet again; nothing else changes). Use it after a compendium update.

## Party, Party View and Session Tools
See **Party & Session Tools**: the Party actor, the live GM Party View (with Add Party to Combat) and the Session Tools (Award XP, the session record and Print to Journal).

## Audit: sheet changes
The system keeps track of what happens to character and NPC sheets, so you don't have to watch every sheet:
- **Items added or removed** (skills, W.P.s, weapons, armor, gear, the animal, backgrounds, abilities, psionics, spells, devices...; anything with an item sheet). Edits inside an item aren't tracked: keep an eye on those yourself.
- **Money / other possessions** (Gear tab): what it said before and after.
- **Characters and NPCs created or deleted.**

**Configure Settings → System Settings** has one choice for **Player Characters** and one for **NPCs**: *Whisper + Audit journal*, *Whisper only*, *Audit journal only* or *Off*. Defaults: characters *Whisper + Audit journal*, NPCs *Audit journal only*.
- **Whisper:** a *Sheet Changes* card to the GM, one per burst of changes, with an **Open Audit Journal** button. Your own changes as GM aren't whispered to you.
- **Audit journals:** *Audit: Player Characters* and *Audit: NPCs*, created the first time they're needed and visible to the GM only. One page per character or NPC, newest entries first, each with the date, time and who made the change (the GM's changes too: the NPC journal is a record of how you built and changed each NPC). A deleted actor's page stays, marked *(deleted)*.
- If a player changes their sheet while no GM is logged in, the entry waits and is written to the journal when a GM logs in.

## Animations (Automated Animations)
Install and enable **Automated Animations**, **Sequencer** and **JB2A** (the free *JB2A_DnD5e* or the Patreon version). The system then plays an animation when something is used:

| What | Animation |
|---|---|
| Weapon attacks (character, NPC, vehicle) | From the attacker's token to your targeted tokens; a miss (4 or less) plays the miss version |
| Maneuvers (Tackle, Throw, Jump Kick…) | Unarmed strike |
| Casting a spell, using a psionic power | The spell or power |
| An item's 🎲 roll (grenades, powers…) | The item |
| Operating a device or time machine | A teleport flash |

Damage, saves and skill checks don't animate. Select your token and target first.

**How animations are chosen:** Automated Animations looks for an entry in its *Global Automatic Recognition* menu named after the item first (so you can give any item its own animation there, or on the item's own A-A tab). If there isn't one, the system's **trigger set** points TMNT names at the built-in entries: katana/sword → *sword*, sai/knife/tanto → *dagger*, bo/staff/nunchaku/tonfa → *greatclub*, spear/naginata → *spear*, kama/axe → *handaxe*, bows → *bow*, bite → *bite*, claws → *claw*, healing → *curewounds*, teleport/time/dimension → *mistystep*, grenades → *fireball*, and so on.

**Guns:** Automated Animations has no built-in gun entry. Add one Range entry named **bullet** in its Global Automatic Recognition menu (pick a JB2A bullet animation) and every firearm and black powder weapon uses it.

Turn animations off with **Configure Settings → System Settings → Automated Animations**. Nothing happens if the module isn't active.

## T.C.R.I. Dice (Dice So Nice)
With the *Dice So Nice* module enabled, the system adds the **T.C.R.I. Dice**, a seven-piece set (d4, d6, d8, d10, d10 %, d12 and d20) of clear green dice filled with glittering liquid. The liquid swirls and the glitter twinkles while the dice roll.

- **Default look:** the world setting **T.C.R.I. Dice by Default** (on unless you turn it off) gives every player the T.C.R.I. Dice until they choose their own dice in Dice So Nice. Changing it reloads the world.
- **Picking them yourself:** open *Dice So Nice Settings* → *Appearance*, then either:
  - set **Dice Presets** to **T.C.R.I. Dice** (group *Palladium Universal*) for the full animated set, or
  - set **Theme** to **T.C.R.I. Dice** to put the same colors and static glitter on another preset.
- **Smoother throws:** the dice load when the world starts, so the first throw doesn't stall. If throws still stutter on a computer, set **T.C.R.I. Dice Finish** (Configure Settings, per computer) to **Fast**: solid, glossy dice that are cheaper to draw than see-through glass. Turning off *advanced glass* in Dice So Nice's graphics settings also helps.
- **No Dice So Nice?** Nothing changes: rolls work as usual.

## Rounds and the Combat Tracker
- Initiative = d20 + the Initiative total.
- Advancing to a **new round** resets everyone's actions and ends **Horrified** (the GM's client does this; a GM must be connected).
- A failed Horror Factor save drops that combatant to the bottom of the order.

## Conditions
Token HUD status effects are this system's conditions (Stunned, Horrified, Blind, Held, Entangled, Prone, Deafened, Pain, Bleeding Out, Paralyzed, Unconscious, Coma, Dead). Each does what its text says (see **Combat → Conditions**); Bleeding Out, Coma and Dead go on and off by themselves with the Hit Points.

## Built-in tables
The system rolls these itself when needed; you can also roll some directly.
| Table | Where |
|---|---|
| Temporal Mishap (with Cycle, Twist and Null-Time follow-ups) | Powers tab (Magic Saves), Time Machine *Mishap* button, failed time machine jumps, spell practice |
| Cross-dimensional device malfunctions (Gateway, Portable, Miniature) | Failed device operation |
| Temporal Spell Experimentation / self-taught spell attempts | *Practice* on unmastered spells |
| Black powder Misfire Mishaps | Every black powder shot that misfires |
| Save vs Coma (three tries) | Combat tab |

Flavor tables (time period encounters, surprise details, branch points, technology base, reactions) are best kept as Foundry **Roll Tables** in a content module.

## Chat card buttons
| Button | Who clicks | Acts on |
|---|---|---|
| Defend (Parry, Dodge...) | The defender | Their selected token or assigned character |
| Roll Damage | The attacker | The attacking actor |
| Apply / Apply ½ / To HP | Whoever owns the target (usually the GM) | Targeted tokens, else selected (Apply halves after their successful Roll with Impact, and takes cover off gunfire) |
| Stop the Bleeding (successful first aid roll) | The medic, or the GM | Targeted tokens, else selected |
| Roll … Side-Effects (whispered) | The GM | The character named on the card |
| Save vs Magic / Dodge / Save vs Psionics / Save vs H.F. | Each target | Their selected token or assigned character |
| Take damage (misfire, practice), Devolve / Evolve, Temporal Mishap | The actor's owner | The actor that made the roll |
| The card's title (📖) | Anyone | Opens a read-only view of the item the card is about |
| Dice in a table result (misfire, malfunction, Temporal Mishap, spell practice), e.g. *2D6* melee rounds | Anyone | Rolls those dice to chat |

## Rules the system follows
- **Meet or beat** everywhere: Reactions vs Strikes, Strikes vs A.R. (defenders win ties).
- Natural criticals need an equal or higher natural roll to defend.
- Roll with Impact: meet or beat the Strike; falls 10+.
- Pull Punch 10+ (Errata 2026).
- Save vs Coma: automatic, P.E. coma % converted to a d20 bonus (÷5).
- Body armor absorbs Strikes below its A.R.; natural armor ignores them.
