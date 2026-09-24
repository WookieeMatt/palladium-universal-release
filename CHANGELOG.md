# Changelog

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
