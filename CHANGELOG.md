# Changelog

## 1.29.1
- **NPC and vehicle sheets**: the header is back to portrait on the left and the fields in one row (the 1.27 compact header had squeezed the fields into a narrow column).
- GM welcome card: **JB2A** shows *Active* with either the free module or the **Patreon** one (it only looked for the free one).

## 1.29.0
- **GM welcome card** lists **Token Action HUD Core** and **Token Action HUD Palladium Universal** (with its manifest URL to paste into *Install Module*). Worlds that already saw the card get the new list once.
- **Player welcome**: each player gets a short card the first time they log in: where the guide is, that the Creation Checklist walks them through making a character, and how to roll in play. `game.palladium.showPlayerWelcome()` shows it again.

## 1.28.1
- **Rich-text boxes fixed**: an opened editor could not be typed in (the sheet's big green buttons made the editor toolbar cover the typing line). The toolbar is small again and the whole box is the typing area. An empty box now collapses to a readable line with the pen button inside it (it was squeezed to a sliver with a scrollbar).
- **Item images on a dark tile** (item cards, the sheets' item lists, the animal picture) so Foundry's white icons show.

## 1.28.0
- **Token Action HUD support**: the new public module *Token Action HUD Palladium Universal* (needs Token Action HUD Core 2.1) puts attacks, maneuvers, combat rolls, saves, attributes, skills, spells, psionics, gear, conditions, Move / Cover / End Turn and healing on a HUD next to the selected token.
- New API functions for macros and modules: `rollCombat(actor, key)` (Initiative, Strike, Parry, Dodge, Roll with Impact, Pull Punch, Disarm, exactly like the sheet's buttons), `attackModes(actor, weapon)`, `COMBAT_ROLLS`, `rollMagicAbility`, `hasMoved`, `toggleMove`, `combatantActions`.

## 1.27.0
- **Readable buttons**: the small green buttons in the comic font (Roll Attributes, Heal, Roll Hit Points, Hide, the Party sheet and GM Party View buttons) now use the plain bold font, white on dark green; locked or secondary ones are dark on parchment.
- **Readable popups**: every system popup (creation rolls, skill modifiers, Initiative, cover, healing, Parry, weather, Horror Factor...) has the parchment look with dark text and a green title bar, whatever Foundry theme you use.
- **More compact sheets**: the header fits in two rows with a smaller portrait; panels, fields and tables are tighter; the Magic panel and the animal's abilities take half the height; the size table shows the sizes around the current one (*All sizes* opens the rest).
- **Weapon cards** only show the fields that apply (range, ammo and reload for ranged weapons, burst damage for automatic ones, Bio-E for natural weapons), with Equipped / Two-handed / Blunt on one line.
- **Empty rich-text boxes** (descriptions, notes) collapse to one line with the green pen to open them.
- **GM Party View**: compact rows and smaller portraits; skill lists wrap instead of scrolling sideways; smaller window.
- The TMNT compendium (0.8.0, private) gives the 214 items that had no description a short one.

## 1.26.0
- **One Initiative button** at the top of the Combat Tracker (GM) instead of five: a dropdown with **Showdown** (everyone rolls), **Ambush** and **Sudden Violence** (then Friendly or Hostile: that side has the Initiative, everyone else rolls).
- **Friendly / Hostile per combatant**: a green shield or red skull on each row; the GM clicks it to flip the side (the token's disposition changes too). Macros: `setCombatantSide`, `toggleCombatantSide`, `combatantSide`, hook `palladium.side`.

## 1.25.0
- **Combat Tracker, tidied**: the GM's buttons at the top are five icons with tooltips: Friendly side, Hostile side, **Showdown**, **Ambush** (one dropdown: Friendly side, Hostile side, or one combatant: they have the Initiative, the rest roll) and **Sudden Violence** (pick who started it); the last one used stays lit. Each combatant row is laid out across the width: actions on the left as fists (bright = available, faded = used; click to spend one, or give one back), then Move and Cover, then the GM's ⇈ / ⇊ on the right.
- **Showdown** (p.84): only the combatants on the tracker take part. It clears the order and posts a *Showdown! Roll Initiative* card; each player online gets a popup with **Roll Initiative** for their own combatants (or Later: the card's button does the same); the GM gets one **Roll NPCs** button for every NPC and anyone whose player is offline. The tracker sorts by the results; ties re-roll.

## 1.24.0
- **Rules Reference** page in the System Guide: experience levels and awards (p.75), the S.D.C. table and shooting through cover (p.90), damage effects and recovery (p.92), the optional side-effect tables (p.93).
- **Roll with Impact** only against **blunt** attacks (p.84): weapons have a **Blunt** box (fists, kicks, staffs, clubs, chains; explosions and maneuvers always count; bullets, energy and blades never). After a successful Roll with Impact, **Apply** halves that attack's damage for that character by itself. GM macro **Mark Blunt Weapons** ticks Blunt on existing weapons (world, sheets, tokens, unlocked compendiums).
- **Cover** (p.90): a bricks icon on each combatant in the Combat Tracker; pick what they're behind (one dropdown, the book's S.D.C. table or a custom S.D.C.). It lasts the whole combat. Firearm, energy and black powder damage loses 2% of the cover's S.D.C., and the cover wears down until it breaks.
- **Bleeding Out** (p.92): a condition that goes on by itself when damage brings the Hit Points to 25% or less and off when healed above; 1 H.P. every 4 rounds in combat. A successful First Aid / Paramedic / Medical Doctor roll has a **Stop the Bleeding** button.
- **Heal** button (Health & Damage, NPC stats): Hit Points by treatment and days (1 / 2 / 2-then-4 a day), 5 S.D.C. per hour of rest.
- **Save vs Coma** card: one try an hour, and the P.E.-hours limit.
- **Optional Damage Side-Effects** setting (p.93): leave it to the GM (default), ask the GM (whispered card) or roll and apply automatically. Results are Injury items that carry the penalties.
- **Blood & Death Effects** (client setting, on): a blood splash on the token when Bleeding Out starts; when a character dies, a death marker (bigger splash, "☠ Dead" float, skull overlay, combatant marked defeated). JB2A through Sequencer when installed, otherwise built in.
- **Death Marker** setting: the preset skull, or pick your own image for dead tokens.
- **Blunt is kept by code**: every weapon created or imported gets Blunt when the rule says so, and once per world the GM's first login ticks it on existing weapons (the macro stays for unlocked compendiums).
- Shorter dropdowns in the Cover and Rest & Heal windows.
- **For macros**: hooks `palladium.condition`, `palladium.hitPoints`, `palladium.stopBleeding`, `palladium.heal`, `palladium.sideEffect`, `palladium.cover`, and API functions for all of it (see For Module Authors).
- Combat Tracker: every action pip and the Move marker have tooltips. The armor layers readout is a small line (the words are in its tooltip).
- The TMNT compendium (0.7.0, private) ticks Blunt on its weapons; its rules journal (0.6.0) was removed: the rules pages are in this guide.

## 1.23.0
- **Conditions do what they say**: Paralyzed, Unconscious and Coma leave no actions; Held, Paralyzed, Unconscious and Coma block attacks and maneuvers (Held alone turns an attack into a **Break Free** Strike the holder may Parry); Stunned and Unconscious block skill checks; Stunned halves Speed and, applied in combat, rolls **1D4 rounds** and ends by itself; Horrified and Deafened **lose the Initiative** (bottom of the order); Horrified refuses the **first Parry or Dodge** of the round; removing Prone in combat spends an action (standing up); Pain costs 1 HP every 4 rounds; **Coma** is set at 0 HP or less (removed above 0) and **Dead** below −P.E.
- **Who goes first** (p.84: the GM decides): **Friendly first / Hostile first** at the top of the Combat Tracker orders the combatants by side, alternating from the chosen side, random within each side. ⇈ / ⇊ still cut in line.
- **Move Action marker** (p.85, once per round): a walking figure next to each combatant's action dots; click it when moving (spends an action; click again to undo). Resets each round.
- **Level follows XP** (p.75): a character's Level is worked out from the XP total (no longer typed). Older characters whose XP is below their level's minimum get the minimum. NPCs keep a typed level.
- **Armor layers** on the Health panel: what a Strike does against you, e.g. *5–7 bounce off natural armor · 8–10 hit the Kevlar Vest · 11+ hit you*.
- **Creation rolls** post one chat card when the chain is done (every roll, the result and what was used), not one per step.
- The TMNT compendium (0.6.0, private) adds a **TMNT: Rules Reference** journal with the Experience page (p.75).

## 1.22.0
- **Roll the Animal and the Origin**: the Creation Checklist's Animal and Origin steps have a 🎲 button that rolls on the book's tables (p.13–15), one step at a time (category → animal; origin → Wild Animal Education or Creator Organization → experiment result). Each result opens a small window: use a matching compendium entry (only when one exists), fill it in yourself, or cancel; the next table waits for the player to roll it. The tables (names only) are also in the new **Palladium Universal Tables** compendium.
- **Skill roll modifiers in play**: before a skill roll, a window asks for extra modifiers (task difficulty, tools / materials, physical or mental trauma; up to two). Setting **Skill Roll Modifiers**: the GM (default; the player then presses Roll), the player rolling, or off.
- **Combat Training checked against the book** (all six trainings, every level): the tables match. Fixed: thrown weapons no longer add the training's melee damage. New melee **Sneak Attack** mode: no defense, and a Critical Strike or Stun when the training grants it.

## 1.21.0
- **Parry with a hand-held weapon**: a character with a hand-held Parry penalty (e.g. Partial Hands, −3) is asked when they Parry, from the sheet or an attack card's Defend button: *Yes: with a hand-held weapon (−3 Parry)* or *No: bare hands or natural weapons (no penalty)*. Closing the question cancels the Parry.
- **Vehicle Maneuver** button: the pilot describes the maneuver, the GM sets the difficulty (task difficulty, p.54), and a Control Roll decides it; the card leaves the outcome to the GM. It spends the vehicle's action in combat. The System Guide's Vehicles page explains how to run vehicle combat until the book's maneuver list is built in.
- **T.E. Change**: a failed save's card tells the GM what changes in the book's order (future: growth; past: mental attributes, then psionics, then size and physical), and the Powers page has a step-by-step way to run it in a session. Still the GM's call.

## 1.20.0
- **Money** (Gear tab, characters): **Starting Money** per character, from the rules: the Origin / Education money is shown with its dice clickable to roll (p.64). **Spent on Items** adds up the listed cost × quantity of every weapon, armor, gear and device on the sheet (removing an item refunds it), plus **Other Expenses**; **Left** shows what remains. Starting Money is a soft cap: going over warns the player and whispers the GM, and nothing is blocked. The creation checklist gains a Starting Money step.
- **Combat Training items**: a skill can be a Combat Training (new *Combat Training* field on the skill sheet). Owning one sets the character's training; dropping another replaces it (one at a time). The Combat tab's Training dropdown is locked while an item sets it and stays as the fallback (NPCs use it). The TMNT compendium (0.5.0) has Basic, Expert, Martial Arts, Assassin, Ninjutsu and Feral.

## 1.19.0
- **Party actor**: a new Actor type. Drop characters, NPCs and vehicles on it (three lists, linked not copied, no token needed); a shared **Party Notes** tab everyone can write in; its own portrait and token that players can move on the map. **Active Party** world setting (automatic with one party), or **Make Active Party** on the sheet.
- **GM Party View** (Actors sidebar button, or the Party sheet): every character and NPC live, with HP and S.D.C. bars, actions left, armor, conditions, level / XP with a Level up! badge, and a compact skill list; vehicles with S.D.C. and status. **Add Party to Combat** puts the characters and NPCs (not vehicles) in the Combat Tracker, with or without tokens.
- **Palladium Combat Tracker**: one action at a time in Initiative order, going around until nobody has actions left, then a new round (p.84). Initiative is kept between rounds and ties re-roll. A turn that spends no action (a move, a skill...) costs one automatically; vehicles get one action a round. Actions left show as dots on each combatant (out of actions: dimmed), and the GM has Gains / Loses the Initiative buttons. World setting **Palladium Turn Order** (on).
- **Session Tools** (GM): **Award XP** from the book's award table (p.75) with automatic level-ups and a chat card; a session record (goals, what happened, hooks, NPCs, scenes, journals, secrets, ideas, experience) kept in the GM-only **Session Log** journal, and **Print to Journal** (one page per session).

## 1.18.0
- **Audit of sheet changes** (GM): items added to or removed from characters and NPCs, Money / possessions changes, and actors created or deleted are whispered to the GM (one *Sheet Changes* card per burst, with an **Open Audit Journal** button) and/or written to the GM-only journals *Audit: Player Characters* and *Audit: NPCs* (one page per actor, newest first, who and when). Two settings, PCs and NPCs: Whisper + Audit journal (PC default), Whisper only, Audit journal only (NPC default), Off. Players' entries wait until a GM is logged in; the GM's own changes are journaled but not whispered.
- **Roll Hit Points**: a button in Health & Damage rolls P.E. + 1D6 once (a chat card shows the math) and sets current HP. The dice are kept, so max HP follows P.E., plus a new **HP Bonus** box. Rolled once like attributes: a player asks the GM to re-roll (Allow Re-roll card), the GM can re-roll directly. On a level-up the button becomes **Roll HP for Level N** (amber): +1D6 per new level to max and current HP. NPCs and characters with a typed max keep it until they roll.
- **Creation Checklist** on the character sheet's Core tab: Roll Attributes, Choose the animal, Spend Bio-E, Origin, Education, Skills, Alignment and Roll Hit Points, ticked off as they're done. Unfinished steps say what's missing and jump to the right tab. It disappears when everything is done; **Hide** puts it away early and a link at the bottom of the tab brings it back. Characters only.

## 1.17.1
- Chat cards: a long roll name (e.g. *Save vs Circles & Wards*) wraps instead of breaking the result number onto two lines.
- The attribute roll card is titled **Rolled Attributes**, and its column headings use the sheet's green header instead of a black box.
- Skill cards at level 1 with no bonuses show just the base, without repeating it as "Skill %".

## 1.17.0
- **Welcome card for the GM**: the first time the system runs in a world, the GM gets a one-time chat card (whispered) recommending the modules the system works with: Dice So Nice, Automated Animations, Sequencer and JB2A. Each shows *Active*, *Installed, not enabled* or *Not installed*, with a link to its page and install steps. It never shows again; `game.palladium.showRecommendedModules()` brings it back.

## 1.16.0
- **Skill cards show the whole calculation**: base, per level, I.Q. bonus, Education bonus (Professional only), Team Characters and misc, then the skill %, the 95% cap when it applies, and the d100 roll. The rules are unchanged: roll at or under the %, 95% maximum, 96–100 always fail.
- **Team Levels on skills** (Team Characters, p.19): +1 skill level per additional team member, for skills every member took; adds *Per Level %* × levels. (Before, it had to go in Misc Bonus.)
- **Save vs Poison / Toxin asks the threat**: lethal poison 14+, harmful drugs 15+ or non-lethal poison 16+ (it was always 14+). The saves table shows 14/15/16+.
- Save cards list the save bonus and any misc modifier; vs Psionics notes which target applies (15+, or 10+ with psionic powers). API: `rollSave(actor, key, {threat})`.

## 1.15.0
- **Scene Weather macro (GM)** in the new *Palladium Universal Macros (GM)* compendium (hidden from players): sets the current scene's black powder weather, announces it in chat, and makes it the default in everyone's weather prompt in that scene (they can still change it per shot). "Not set" clears it. API: `scenePowderWeather`, `setScenePowderWeather`, `sceneWeatherDialog`.

## 1.14.0
- **Black powder weather is asked when you fire** instead of being a world setting: a prompt lists dry, humid (+5%), rain (+15%) and downpour or dunking (+35%), each with the resulting misfire chance; your last pick is the default. Cancelling fires nothing and spends no action. The misfire card and the attack card note the weather; the weapon list shows the dry chance "+ weather".
- The Black Powder Weather setting is gone from the settings menu. Modules can still add weather options to `CONFIG.PALLADIUM.POWDER_WEATHER`; `rollAttack(actor, weapon, mode, {weather})` skips the prompt.

## 1.13.1
- **Cleaner attack cards**: the Defend buttons sit under their own heading in an even three-column grid, icon over label, so long names like *Roll with Impact* and *Entangle* no longer spill out of their buttons. Each note on a card (hit line, actions left, crits) gets its own line.

## 1.13.0
- The default portrait is now the **black and white** mutant turtle (white inside, transparent around the head, so it reads on any map); the **color** turtle ships too.
- New world setting **Default Portrait**: black and white turtle (default), color turtle, or Foundry's mystery man. Compendium NPCs with a default portrait follow it when imported.

## 1.12.0
- **Mutant turtle default portrait**: new characters and NPCs start with a mutant turtle head (portrait and token) instead of Foundry's mystery man. Your own art is never replaced. Vehicles keep Foundry's default.

## 1.11.0
- **Journals take the sheet look**: green title bar, parchment background, comic headings, each page on a paper panel, green-headed striped tables, a green table of contents and green link chips. Applies to every journal, the compendium journals and the System Guide included. World setting **TMNT Journal Style** (on by default) to switch it off.

## 1.10.0
- **Air & space combat** (TMNT Guide to the Universe) on the vehicle sheet: Drive, **Speed Class** (0–50 with its top speed), **T.M.F.**, payload, the pilot's Air-to-Air %, current Mach (over Mach 5 in atmosphere is a penalty) and In Space (energy weapon range ×10, projectiles ×2).
- Tactic buttons: **Dog Tail, Jink, Roll-Over, Speed Escape** (d20 + Speed Class + T.M.F.), **Maneuver Escape**, dodges; **Veer Off** for the chicken games (Mid-Air Ram, Dodge 'Em, Divebomber, Skimming Atmosphere), **Pull-Out** save, **Emergency Landing**, **Crash** damage and **Dumb Luck**.
- **Flying characters and NPCs** (Flight / Glide, or a toggle) get an Air Combat panel: T.M.F. = P.P., Speed Class from their flight speed.
- Two more vehicle armor locations: **Power Plant** (fusion generator) and **Cargo Hold**; Fuel Tank is now Fuel Tank / Energy Pack.

## 1.9.0
- **Roll Attributes** (Core tab): one button rolls all eight attributes at character creation (3D6, +1D6 on 16–18 with the team rule, + species, size and physical skill modifiers; dice bonuses such as Boxing's +1D4 are rolled) and **saves** them. Each attribute shows its **Rolled** dice and final **Score** in boxes that can't be edited; the sheet's bonuses, skills, combat and saves use the Score.
- One detailed chat card: a table of every attribute's 3D6, exceptional die, species, size, physical skills and score.
- **Rolled once:** the button then becomes *Ask GM to Re-roll*; the GM gets a whispered card with an **Allow Re-roll** button. The GM can re-roll directly after a confirmation.
- Clicking an attribute's abbreviation (character and NPC sheets) now **shows it in chat** (score, breakdown and what it gives) instead of rolling.
- Characters that already have all eight attributes count as rolled. NPC attributes stay editable.

## 1.8.0
- **Automated Animations support** (with Sequencer and JB2A): weapon attacks (with hit or miss), maneuvers, spells, psionics, item rolls and device / time machine operation play animations from the user's token to their targets. Damage, saves and skill checks don't. World setting to turn it off.
- **Animation trigger set:** TMNT names (katana, sai, bo staff, nunchaku, naginata, kama, bows, guns, bite, claws, healing, teleport…) map to Automated Animations' built-in entries; an entry named after the item still wins. Editable in `CONFIG.PALLADIUM.ANIMATION_TRIGGERS`.
- Chat cards no longer look like item uses to Automated Animations' generic chat handler, so nothing animates twice (flag `itemId` → `itemRef`; the card's item copy is stored encoded).
- The manifest recommends Automated Animations, Sequencer, JB2A and Dice So Nice.

## 1.7.0
- **Every notes box is a rich-text (ProseMirror) editor:** Skill Notes, Money / other possessions, Mutation Notes, the Modules tab boxes (spells, psionic powers, super powers and weaknesses, mecha M.D.C. and weapon systems, survival supplies and insanity effects) and a device's Malfunction text. Dice written in them show as clickable rolls.
- New **Character notes** box on the Gear tab.
- Existing plain-text notes convert automatically, one paragraph per line.

## 1.6.3
- The **Background** panel (Origin, Creator Organization, Education) moved from the Core tab to the **Bio-E / Mutation** tab, under the Animal.

## 1.6.2
- Attribute generation: the **Species** step (and column) also counts bonuses from purchased animal options and abilities / powers (e.g. Hominid attribute boosts, Extraordinary P.E.).
- An item's own **Roll** is offered first and the other dice in its description are still offered after it (before, the Roll field hid them).
- Works with TMNT compendium 0.2.1, which labels the main roll of 22 items (e.g. Taser: *Stunned (minutes)*).

## 1.6.1
- **Clickable dice in text:** dice written in table results on chat cards (misfire mishaps, device malfunctions, Temporal Mishaps, spell practice) and in item descriptions (item sheet and read-only view) are Foundry inline rolls: click *2D6 melee rounds* to roll it. Roll results on the cards stay plain.
- API: `postCard({inlineRolls: true})`, `enrichDice(html)`.

## 1.6.0
- **Every item with a roll can roll from the sheet.** Items have a new **Roll** field (formula and label); without it, dice written in the description are offered. A 🎲 button appears on W.P.s, armor, gear, devices, abilities, natural weapons, psionics and spells (character and NPC sheets); several dice → pick one.
- **Spell damage** rolls straight from the Powers tab.
- **Item chat cards open a read-only view of the item:** click the card's title. It's a copy saved on the card, so everyone can view it and nothing can be changed.
- API: `rollItem(actor, item)`, `viewItemCopy(itemData)`; `postCard` takes an `item`.

## 1.5.4
- **Every chat card uses the same look:** the green header, then **Roll = Result** (e.g. *Strike = 17*, *Damage = 12*, *Prowl = 42*); click it to expand the dice and every bonus. Success, critical and other notes and all buttons stay visible below. Applies to attacks and maneuvers, damage, defenses, d20 checks and saves, skills and percentile rolls, Save vs Coma, Horror Factor, spells and spell saves, psionics, T.E. Change, spell practice, Temporal Mishaps, misfires, vehicles (Control, Evade, weapons) and device operation.
- Chat cards follow the player's roll mode (public, GM, blind, self).
- API: `postCard(actor, {title, label, result, lines, notes, buttons, rolls, flags})` and `resultDetails()` for modules that want matching cards.

## 1.5.3
- Attribute generation card: green header with the portrait, the result as **I.Q. = 21**, and a click to expand the full calculation (Base 3D6, Exceptional 1D6, Species, Size, Physical Skills, Final Total) in neat rows.
- Result lists on chat cards no longer show stray bullet marks.

## 1.5.2
- Sheet tabs spread evenly across the tab bar.
- Combat Training fields line up (the Training dropdown no longer sits higher than the others).
- Window header buttons show their icons again (only the title uses the comic font).

## 1.5.1
- The attribute table shows the generation modifiers worked out before rolling: **Species**, **Size** (I.Q., P.S., P.E., Spd), **Physical Skills** (P.S., P.P., P.E., Spd) and the total **Modifier**. Clicking an attribute rolls 3D6 (+1D6 on 16–18) and adds exactly those modifiers in chat. Nothing is typed or saved; the Misc, Total and Bonus columns and the carry line were removed from the table.

## 1.5.0
- **Attribute generation** follows the step-by-step rules: click an attribute abbreviation to print *Base 3D6, Exceptional 1D6, Species Bonus, Size Modifier (I.Q., P.S., P.E., Spd only), Physical Skill Bonus (P.S., P.P., P.E., Spd only), Final Total* to chat. **Nothing is saved to the sheet.**
- New world setting **Team Character Generation**: teammates (same Actors folder) share their highest exceptional bonus die per attribute.

## 1.4.0
- **Attribute rolls reworked:** click an attribute's name to roll 3D6 (+1D6 once on 16–18); the roll is added to that line's modifiers (animal, background and skill bonuses, Size Level, Misc) and the final score is printed to chat with every part listed. The dice total is saved behind the scenes; the sheet no longer shows a Rolled column, only the modifiers, the total and what it grants. The Bonuses column's tooltip names each source.
- Removed the other 1.3.0 character creation rolls (Roll All, Hit Points and level-up Hit Points, height and weight, starting money, background tables) and their API functions and hooks.

## 1.3.0
- **Character creation rolls** from the sheet, posted to chat:
  - Click an attribute name to roll it (3D6, +1D6 once on 16–18); **Roll All** rolls all eight (characters and NPCs).
  - Hit Points (P.E. + 1D6, +1D6 per level above first), and an offer to roll the new Hit Points when the Level goes up.
  - Height and weight from the Size Level table and build.
  - Starting money from a background (added to Money / other possessions).
  - Origin, Creator Organization and Education tables, built from background items in your compendiums, with an **Apply** button on the result.
- API: `rollAttribute`, `rollAllAttributes`, `rollHitPoints`, `rollHeightWeight`, `rollMoney`, `rollBackgroundTable`, with matching hooks.

## 1.2.1
- T.C.R.I. Dice load when the world starts (Dice So Nice preload), so the first throw doesn't stall.
- New per-computer setting **T.C.R.I. Dice Finish**: Glass (default) or Fast (solid, glossy) for smoother throws on slower computers.

## 1.2.0
- **T.C.R.I. Dice** for Dice So Nice: a seven-piece set (d4, d6, d8, d10, d10 %, d12, d20) of clear green dice filled with glittering liquid that swirls while rolling. Available as a Dice So Nice dice preset (animated liquid) and a theme (colors, glass and a glitter texture).
- New world setting **T.C.R.I. Dice by Default**: players who haven't customized Dice So Nice roll the T.C.R.I. Dice.

## 1.1.0
- **Open to community modules.** Released under the MIT License.
- `CONFIG.PALLADIUM` is now editable: modules can add to or replace any rules table or helper in their `init` hook, and the whole system reads them from there. Conditions and black powder weather added by modules appear as token status effects and in the weather setting.
- New `game.palladium` API: attacks, damage, defense, skills, saves, spells, time travel, vehicles, character building, plus the system's data model and sheet classes to extend.
- New hooks: `palladium.strikeBonus`, `palladium.preRollAttack` / `rollAttack`, `palladium.preRollDamage` / `rollDamage`, `palladium.preApplyDamage` / `applyDamage`, `palladium.preRollDefense` / `rollDefense`, `palladium.preRollSkill` / `rollSkill`, `palladium.preCastSpell` / `castSpell`, `palladium.preSpendActions`, `palladium.temporalMishap`.
- New System Guide page: **For Module Authors**.
- Fix: damage applied to a Time Machine now uses vehicle damage by location, as for vehicles.

## 1.0.0
- First public release: the rules engine, character / NPC / vehicle / time machine sheets, magic, psionics, black powder, time travel tables and the in-game System Guide.
