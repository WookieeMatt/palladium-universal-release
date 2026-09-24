# Changelog

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
