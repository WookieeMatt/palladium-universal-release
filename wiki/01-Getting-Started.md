# Getting Started

## Installing
1. In Foundry's setup screen open **Game Systems → Install System**.
2. Paste the manifest URL into **Manifest URL** at the bottom and click **Install**:
   `https://github.com/WookieeMatt/palladium-universal-release/releases/latest/download/system.json`
3. Create a world with the **Palladium Universal** system.

Updates arrive through Foundry's normal **Update** button on the Game Systems tab.

**Welcome cards:** the first time the system runs in a world, the GM gets a chat card (whispered, players don't see it) listing the modules the system works with, **Dice So Nice**, **Automated Animations**, **Sequencer**, **JB2A** (free or Patreon version), **Token Action HUD Core** and **Token Action HUD Palladium Universal**, each marked *Active*, *Installed, not enabled* or *Not installed*, with a link to its page (and the manifest URL for the HUD, which you paste into *Install Module*). The card comes back once when this list changes. Show it again any time with the macro `game.palladium.showRecommendedModules()`.

Each **player** gets a short welcome of their own the first time they log in: where the guide is (Getting Started, Character Creation, Combat), that the Creation Checklist on the Core tab walks them through making a character, and how to roll in play. Show it again with `game.palladium.showPlayerWelcome()`. To show both cards to everyone again on their next load, tick **Show the Welcome Cards Again** in the System Settings.

**Token Action HUD:** with *Token Action HUD Core* (2.1) and *Token Action HUD Palladium Universal* on, selecting a token opens a HUD with its attacks (one button per attack mode), maneuvers, combat rolls, saves, skills, spells, psionics, item rolls, conditions and, in combat, Roll Initiative / Move Action / Cover / End Turn. Right-click an entry to open the item. Install the HUD module with `https://github.com/WookieeMatt/token-action-hud-palladium-universal/releases/latest/download/module.json`.

**Requirements:** Foundry VTT v14. *Dice So Nice* is supported (every roll is a real Foundry roll) but not required. With it, the system adds the **T.C.R.I. Dice** (see *GM Tools*).

## Document types
**Actors**
| Type | Use it for |
|---|---|
| **Character** | Player characters: the full seven-tab sheet. |
| **NPC** | Villains, bystanders, creatures, Time Lords. Same rules as characters on a compact two-tab sheet, plus a **Horror Factor**. |
| **Vehicle** | Cars, trucks, boats, aircraft. S.D.C., armored locations, piloting, mounted weapons, modifications. |
| **Time Machine** | A vehicle carrying a time machine or cross-dimensional device, with drop zones for the device, its support devices and installation costs. |

**Items**: Skill, Weapon Proficiency, Weapon, Armor / Shield, Psionic Power, Spell, Ability / Power, Gear, Animal, Background, Device, Installation Cost, Vehicle Modification. See **Item Reference**.

## Content
The system provides rules and sheets, not book content. Create items yourself, or install a content module with compendiums (animals, skills, weapons and so on) and drag from there.

## First steps
1. Create a **Character** actor and open it.
2. Click **Roll Attributes** on the **Core** tab (once; re-rolls need the GM's permission).
3. Drag an **Animal** item onto the sheet (Bio-E, Size Level and Human Feature costs are filled in).
4. Drag **Origin**, **Creator Organization** and **Education** background items onto the Core tab's slots.
5. Spend Bio-E on the **Bio-E / Mutation** tab, choose Combat Training on the **Combat** tab, add skills, W.P.s and gear.

New characters and NPCs start with the system's **mutant turtle** portrait and token (black and white, or color with the **Default Portrait** setting), in a round token with a green ring. Click the portrait to use your own art.
