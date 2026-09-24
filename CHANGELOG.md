# Changelog

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
