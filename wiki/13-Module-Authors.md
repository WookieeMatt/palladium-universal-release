# For Module Authors

Palladium Universal is open to community modules. The code is released under the **MIT License** (see `LICENSE`), so you may use, copy, fork and extend it. The license covers the code only; Palladium's rules text and the TMNT property belong to their owners, so publish content modules only for material you have the right to share.

## Content modules (compendiums)
The simplest module is a compendium of Items, Actors, RollTables or Journal pages for this system. In your `module.json`:

```json
"relationships": {
  "systems": [{ "id": "palladium-universal", "type": "system", "compatibility": { "minimum": "1.1.0" } }]
},
"packs": [
  { "name": "my-weapons", "label": "My Weapons", "path": "packs/my-weapons", "type": "Item", "system": "palladium-universal" }
]
```

Build items in a world first: every field is on its sheet. The *Item Reference* page lists each type's fields and the effect targets. Then drag the items into your compendium, or build the packs with `@foundryvtt/foundryvtt-cli`.

## The rules tables: `CONFIG.PALLADIUM`
Every rules table and helper function lives in `CONFIG.PALLADIUM`, and the system always reads them from there. Change them in your module's **`init`** hook. The system's own `init` runs first, so the tables already exist.

```js
Hooks.once("init", () => {
  const P = CONFIG.PALLADIUM;

  // A new condition: becomes a token status effect and applies its modifiers.
  P.CONDITIONS.slimed = { label: "Slimed", img: "icons/svg/acid.svg",
    mods: { strike: -2, parry: -2, dodge: -2 }, text: "Covered in mutagen: −2 Strike/Parry/Dodge." };

  // A new black powder weather option for the GM's setting.
  P.POWDER_WEATHER.sewer = { label: "Sewer", misfire: 20 };

  // Replace a whole table, e.g. a house-ruled XP progression.
  P.XP_LEVELS = [0, 1500, 3000, 6000, 12000, 20000, 30000, 45000, 65000, 90000,
    120000, 160000, 210000, 260000, 320000];
});
```

Useful tables include:
- **Character:** `ATTRIBUTES`, `SIZE_LEVELS`, `HUMAN_FEATURES`, `ALIGNMENTS`, `XP_LEVELS` and `SAVES`.
- **Combat:** `COMBAT_TRAINING`, `MANEUVERS`, `REACTIONS`, `CIRCUMSTANCES` and `CONDITIONS`.
- **Magic:** `MAGIC_TRADITIONS`, `MAGIC_ABILITIES` and `SPELL_SAVES`.
- **Black powder:** `POWDER_LOCKS`, `POWDER_WPS`, `POWDER_WEATHER` and `MISFIRE_MISHAPS`.
- **Vehicles and devices:** `VEHICLE_TYPES`, `VEHICLE_LOCATIONS`, `VEHICLE_CLASSES`, `VEHICLE_MOD_CATEGORIES` and `DEVICE_TYPES`.
- **Time travel:** `TEMPORAL_MISHAPS`, `DEVICE_MALFUNCTIONS` and `SPELL_PRACTICE`.

Helper functions such as `attributeBonuses`, `combatTrainingAt`, `magicAt` and `levelForXP` are there too. You can replace a helper with your own function.

Follow the shape of the existing entries: log `CONFIG.PALLADIUM.CONDITIONS` in the console to see them. Keep the keys the system already uses, since character data stores them.

## The API: `game.palladium`
`game.palladium` is available from `init` on. It runs the same actions as the sheet buttons:

| Group | Functions |
|---|---|
| Rolls | `rollD20(actor, {label, bonus, target})`, `rollPercent(actor, {label, target})`, `rollSkill(actor, skillItem)`, `rollSaveVsComa(actor)` |
| Combat | `strikeBonus(actor, weapon, mode)`, `rollAttack(actor, weapon, mode)`, `rollDamage(actor, weapon, options)`, `applyDamage(actor, amount, {strike, mode})`, `rollManeuver(actor, key)`, `rollDefense(defender, key, attack)`, `rollHorrorFactor(actor, hf)`, `spendActions(actor, count)` |
| Magic | `castSpell(actor, spell)`, `newDay(actor)`, `rollChangeSave(actor)`, `usePsionic(actor, power)` |
| Time travel | `temporalMishap()`, `rollTemporalMishap(actor)`, `deviceMalfunction(key)`, `practiceSpell(actor, spell)` |
| Vehicles | `applyVehicleDamage(actor, amount, options)`, `rollControl(actor)`, `rollEvade(actor)`, `operateDevice(device)`, `operateTimeMachine(actor)` |
| Building | `applyAnimal(actor, data)`, `removeAnimal(actor)`, `applyBackground(actor, data)`, `rollAttributes(actor)` (all eight, saved, once), `requestReroll(actor)`, `allowReroll({actorUuid})`, `printAttribute(actor, key)` (score to chat, no roll), `rollAttribute(actor, key)` (one attribute to chat, not saved) |
| Animations | `playAnimation(actor, item, {kind, hit})`, `animationNames(name, kind)`; the trigger set is `CONFIG.PALLADIUM.ANIMATION_TRIGGERS` (rules `{match: RegExp, names: [...]}`) and `ANIMATION_FALLBACKS` |
| Items | `rollItem(actor, item)` (the item's Roll field or description dice), `viewItemCopy(itemData)` (read-only view), `item.system.itemRolls` |
| Chat cards | `postCard(actor, {title, label, result, lines, caption, notes, body, buttons, rolls, flags, item})` (the standard card: header, *Label = Result* expanding to `lines` rows), `resultDetails(label, result, lines)`, `cardHeader(actor, title)`, `damageButtons()`, `signed(n)` |

`game.palladium.config` is the same object as `CONFIG.PALLADIUM`. The `apiVersion` number goes up if the API changes in a way that breaks existing code.

For example, a macro that rolls the selected token's first weapon:

```js
const actor = canvas.tokens.controlled[0]?.actor;
const weapon = actor?.items.find(i => i.type === "weapon");
if ( weapon ) game.palladium.rollAttack(actor, weapon);
```

## Hooks
The system fires these hooks. A `pre…` hook can return `false` to cancel. Its data object can be changed and the change is used.

| Hook | Arguments | Notes |
|---|---|---|
| `palladium.strikeBonus` | `actor, weapon, {mode, parts}` | Add or change labelled parts; they show on the card. |
| `palladium.preRollAttack` | `actor, weapon, {mode}` | Before actions are spent; change `mode` or cancel. |
| `palladium.rollAttack` | `actor, weapon, roll, {mode, natural, special, double, leap, message}` | After the attack card is posted. |
| `palladium.preRollDamage` | `actor, weapon, {base, parts, notes, crit, mode, strike, deathBlow, double, leap}` | Change the dice (`base`), add bonus `parts` or card `notes`. |
| `palladium.rollDamage` | `actor, weapon, roll, {…, message}` | After the damage card is posted. |
| `palladium.preApplyDamage` | `actor, {amount, strike, mode}` | Change the amount, the Strike used against armor, or `mode` (`normal`, `half`, `hp`). |
| `palladium.applyDamage` | `actor, {amount, strike, mode, result}` | `result` is the text shown in chat. |
| `palladium.preRollDefense` | `defender, key, {attack, attackerName}` | Parry, Dodge, Roll with Impact, Entangle… |
| `palladium.rollDefense` | `defender, key, roll, {attack, success, natural, message}` | |
| `palladium.preRollSkill` | `actor, skill, {label, target, secondary}` | Change the target %. |
| `palladium.rollSkill` | `actor, skill, {label, target, secondary, result}` | |
| `palladium.preCastSpell` | `actor, spell` | |
| `palladium.castSpell` | `actor, spell, {strength, damage, message}` | |
| `palladium.preSpendActions` | `actor, count, what` | Return `false` so the action isn't counted. |
| `palladium.temporalMishap` | `{html, rolls, row}` | Change `html` to change the chat text. |
| `palladium.preAnimation` | `actor, item, data` | Before an Automated Animations call; change `data.extraNames`, `targets`, `hitTargets`, or return `false`. |
| `palladium.preRollAttribute` | `actor, key, {formula, exceptional, bonusFormula}` | For each attribute generated; change the dice, e.g. `formula = "4d6kh3"`. |
| `palladium.rollAttribute` | `actor, key, {base, exceptional, exceptionalDie, species, size, physical, total}` | `rollAttribute` (one attribute, chat only). |
| `palladium.rollAttributes` | `actor, results` | After Roll Attributes saved the scores; `results` has one entry per attribute (`rolled`, `dice`, `score`, …). |

For example, a +2 Strike blessing:

```js
Hooks.on("palladium.strikeBonus", (actor, weapon, { parts }) => {
  if ( actor.getFlag("my-module", "blessed") ) parts["Blessing"] = 2;
});
```

## Sheets and data models
The system's classes are in `game.palladium.sheets` and `game.palladium.models`. For example, to register your own character sheet:

```js
Hooks.once("init", () => {
  class MySheet extends game.palladium.sheets.PalladiumCharacterSheet {
    // override parts, templates or _prepareContext
  }
  foundry.documents.collections.Actors.registerSheet("my-module", MySheet, { types: ["character"], label: "My Sheet" });
});
```

Store your module's own data in document **flags** (`actor.setFlag("my-module", ...)`), not in the system's `system` fields.

## Compatibility
- Foundry VTT **v14** only.
- The API, hooks and table names follow the system's version. Breaking changes raise the major version and are listed in the release notes.
