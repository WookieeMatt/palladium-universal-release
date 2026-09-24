# Item Reference

Every item has a **Description** (rich text) and **Source** (book and page). Items with a **Bonuses** panel grant effects to their owner (see *Effects* below).

## Skill
| Field | Meaning |
|---|---|
| Category | Communications, Domestic, Electrical, Espionage, Mechanical, Medical, Military, Physical, Piloting, Science, Technical, Other |
| Training | Professional or Amateur (only Professional skills get the Education bonus) |
| Base % / Per Level | Starting % and progression per level after acquiring it |
| Second roll | Label and base % of a second percentage (e.g. "Treat") |
| Level Acquired | Progression counts from here |
| Misc % | e.g. an origin's "+20%" |
| Passive | No percentile roll (physical skills) |
| Requires | Prerequisites (text) |

## Weapon Proficiency
Kind (Ancient, Targeting, Modern, Paired, Shield, Black Powder), **Weapon Group** (matched against weapons' Proficiency), Black Powder family, Level Acquired, Team Bonus Levels.

## Weapon
Type (Melee, Thrown, Bow/Crossbow, Firearm, Energy, Natural, Explosive/Area, Black Powder), Proficiency (W.P. group), Damage, Burst Damage, Range, Two-handed, Strike/Parry/Damage bonuses, Ammo, Reload, Bio-E (natural weapons), Equipped, Quantity, Weight, Cost, plus the Black Powder panel. Natural weapons (bought from an animal) count toward Bio-E.

## Armor / Shield
Body Armor or Shield, A.R., S.D.C. (value/max), Parry bonus (shields), Ballistic only, Penalties, Equipped, Weight, Cost.

## Psionic Power
Bio-E cost, Range, Duration, Saving Throw (write "None" for powers without one).

## Spell
Spell List (Wizard or Time Lord), Selections (1–3), Range, Duration, Saving Throw (None, Standard, Special, Dodge only + the Dodge number), Save Notes, Damage (`@level` = caster level, e.g. `@levelD6`), Strictly offensive, **Mastered** (castable) and **Practice Successes**.

## Ability / Power
Animal abilities, mutant human powers, hominid special abilities: Bio-E cost, Natural Armor A.R., Bonuses.

## Gear
Quantity, Weight, Cost.

## Animal
Bio-E, Size Level (1–25), Build, Length/Height, Weight, and:
- **Human Features** per feature: Automatic level, None / Partial / Full costs (None and Partial may be negative below an automatic level), Full available.
- **Feature Effects**: effects applied while a character has the feature at Partial or None (e.g. Human: Hands Partial → All skills −20, Hand-held Strike −3, Hand-held Parry −3; Looks Partial → P.B. −1; Looks None → P.B. halved).
- **Abilities & Natural Weapons**: purchasable options (name, kind, Bio-E, damage, A.R., choice group).
- **Bonuses**: attribute bonuses the mutation grants.

## Background
Kind (Mutant Animal Origin, Creator Organization, Education / Background), table roll range, Education Bonus %, Professional and Amateur skills, Combat Training granted, equipment, money, "hunted", Bonuses.

## Device
Type (Time Machine, Cross-Dimensional Device, Readout / Navigation Aid, Other), **Operator Skill** (skill name), Max Area, Recharge, Charged, **Malfunction Table** (None, Temporal Mishap, Gateway Generator, Portable C-D Device, Miniature C-D Device), Malfunction text, Weight, Cost. Readouts instead have **Assists** (which device type) and **Bonus to Operate %**.

## Installation Cost
Device installed, Vehicle Class, Cost, Available. Recorded on Time Machines.

## Vehicle Modification
Category (Armor, Optional Equipment, Travel Capability, Accessory), Armor Location with A.R. and S.D.C., Extra Vehicle S.D.C., Control Roll Bonus %, Speed, Effect summary, Weight, Cost.

## Effects (the Bonuses panel)
Each row: **Applies to**, **Formula** (a number, or dice rolled once when the item is added to an actor, e.g. `1D6`), the **Rolled** value, and a **Group / Skill** where needed.

| Applies to | Effect |
|---|---|
| Attribute: X | Adds to that attribute's total |
| Attribute: X halved | Any value halves the attribute |
| Bio-E: bonus points | Adds to the character's Bio-E (e.g. a background's "+10 Bio-E") |
| S.D.C. | Adds to max S.D.C. |
| S.D.C.: double Size Level S.D.C. | Doubles the size S.D.C. (Extraordinary P.E.) |
| Combat: Strike, Parry, Dodge, Damage, Roll with Impact, Pull Punch, Actions, Initiative, Disarm | Adds to the combat total |
| Weapon group: Strike / Parry / Damage | Only with weapons whose Proficiency matches *Group* (e.g. Fencing: Sword) |
| Skill: % bonus | Adds to the skill named in *Group* |
| All skills: % bonus | Adds to every skill |
| Hand-held weapons: Strike / Parry | With hand-held (non-natural) weapons |
