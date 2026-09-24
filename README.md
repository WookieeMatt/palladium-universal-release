# Palladium Universal

A Foundry VTT **v14** game system for **Teenage Mutant Ninja Turtles & Other Strangeness (Redux)**, including the **Transdimensional** material: time travel, dimensional travel, magic, dinosaurs, black powder weapons and time machines.

![Foundry v14](https://img.shields.io/badge/Foundry-v14-green)

## Install
In Foundry's setup screen: **Game Systems → Install System**, paste this **Manifest URL**, and click **Install**:

```
https://github.com/WookieeMatt/palladium-universal-release/releases/latest/download/system.json
```

Updates then come through Foundry's normal *Update* button.

## Features
- **Characters**: attributes with automatic bonuses, animals and Bio-E (size levels 1–25, Human Features with per-level effects, abilities and natural weapons), backgrounds, skills, W.P.s, Combat Training progressions, saves including automated Save vs Coma.
- **Combat**: chat cards showing **Roll = Result** that expand to the dice and every bonus, circumstantial modifiers, conditions as token status effects, maneuvers (Hold, Entangle, Tackle, Throw, Jump Kick), Leap Attacks, **Defend buttons** on attack cards (meet or beat; natural-critical rule), armor resolution by Strike roll, damage application, actions per round.
- **Powers**: Wizard and Time Lord magic (spells per day, spell strength, practice tables), psionics, Horror Factor, T.E. change.
- **Black powder**: misfires and mishaps, GM weather setting, W.P. families, range bands, deliberate overloading.
- **NPCs** on a compact sheet, **Vehicles** with armor locations and piloting, **Time Machines** with device, support-device and installation drop zones.
- **Built-in tables**: Temporal Mishap, device malfunctions, spell experimentation, misfire mishaps.
- A parchment and dark-green comic look, and the **T.C.R.I. Dice** for Dice So Nice (green glitter liquid dice).

## Documentation
The **System Guide** ships inside the system: open the Compendium Packs sidebar → **Palladium Universal Guide**. The same pages are in the [`wiki`](wiki/00-Home.md) folder.

## Content
The system provides the rules engine and sheets. It does not include book content (animals, skills, weapons...); create your own items or use a content module. You need the Palladium Books rulebooks to play.

## Modules and license
The code is released under the [MIT License](LICENSE): community modules, forks and add-ons are welcome. Modules can change the rules tables (`CONFIG.PALLADIUM`), call the `game.palladium` API and listen to `palladium.*` hooks. See [For Module Authors](wiki/13-Module-Authors.md). The license covers the code, not Palladium's game text or trademarks.

## Credits
- Fonts: [Bangers](https://github.com/googlefonts/bangers) and [Comic Neue](https://github.com/crozynski/comicneue), SIL Open Font License 1.1 (see `assets/fonts`).
- *Teenage Mutant Ninja Turtles & Other Strangeness* and *Palladium Books* are trademarks of their respective owners. This is an unofficial fan-made system, not affiliated with or endorsed by them.
