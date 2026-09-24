# Changelog

## 1.1.0
- **Open to community modules.** Released under the MIT License.
- `CONFIG.PALLADIUM` is now editable: modules can add to or replace any rules table or helper in their `init` hook, and the whole system reads them from there. Conditions and black powder weather added by modules appear as token status effects and in the weather setting.
- New `game.palladium` API: attacks, damage, defense, skills, saves, spells, time travel, vehicles, character building, plus the system's data model and sheet classes to extend.
- New hooks: `palladium.strikeBonus`, `palladium.preRollAttack` / `rollAttack`, `palladium.preRollDamage` / `rollDamage`, `palladium.preApplyDamage` / `applyDamage`, `palladium.preRollDefense` / `rollDefense`, `palladium.preRollSkill` / `rollSkill`, `palladium.preCastSpell` / `castSpell`, `palladium.preSpendActions`, `palladium.temporalMishap`.
- New System Guide page: **For Module Authors**.
- Fix: damage applied to a Time Machine now uses vehicle damage by location, as for vehicles.

## 1.0.0
- First public release: the rules engine, character / NPC / vehicle / time machine sheets, magic, psionics, black powder, time travel tables and the in-game System Guide.
