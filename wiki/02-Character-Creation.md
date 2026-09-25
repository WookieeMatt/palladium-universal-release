# Character Creation

## Header
Name, portrait (click to change), animal, alignment, **level** (follows the XP total, p.75: not typed), **XP** (the Experience total), origin, education, **Education Bonus %** (added to Professional skills), age, sex, height and weight.

New characters and NPCs get a round token with a green ring.

## Creation checklist
New characters get a **Creation Checklist** at the top of the Core tab: the steps in book order, each ticked off as it's done:
1. **Roll Attributes**
2. **Choose the animal** (drag an Animal onto the sheet, or type it in the header)
3. **Spend Bio-E** (shows what's left, or how much is overspent)
4. **Origin** and 5. **Education** (drop the backgrounds, or type them in the header)
6. **Skills**
7. **Alignment**
8. **Starting Money** (the Origin / Education money, entered on the Gear tab)
9. **Roll Hit Points** (see below)

Click an unfinished step to jump to its tab.

**Rolling the Animal and the Origin (optional).** The *Choose the animal* and *Origin* steps have a 🎲 button that rolls on the book's tables (p.13–15), one step at a time; the tables are also in the **Palladium Universal Tables** compendium. Each roll shows its result in a small window; when you're done (or stop, or cancel) **one chat card** lists every roll, its result and what you did with it:
- **Animal:** first the category (Urban, Rural, Wild, Wild Birds, Zoo, Lab), then **Roll the … animal** for the animal itself.
- **Origin:** the origin, then the book's next table: Random Mutation and Accidental Encounter → *Wild Animal Education*; Deliberate Experimentation → *Creator Organization* → the experiment result (and for *Pet Gone Awry* or *Caged*, *Wild Animal Education*). Each next table has a **Roll** button; **Stop here** ends it.
- For each result: **Use …** applies a matching compendium entry, as if dropped (only shown when one exists; several matches, e.g. *Pet Rodent*, are all offered); **Fill it in myself** writes the name in the header (Animal, Origin, or Education; the Creator Organization is added to the Origin in brackets); **Cancel** changes nothing.
- Click the 🎲 again to re-roll. When all nine are done the checklist disappears. **Hide** puts it away early (for example, to keep some Bio-E unspent); *Show the creation checklist* at the bottom of the Core tab brings it back. NPCs don't have one.

## Generating attributes
Attributes are rolled **once, at character creation**, with the **Roll Attributes** button on the Core tab. It rolls every attribute at once and saves the results:

1. **Base:** 3D6.
2. **Exceptional:** on 16, 17 or 18, add 1D6. With **Team Character Generation** on (world setting), if another character in the same Actors folder rolled a higher bonus die for that attribute, theirs is used.
3. **Species:** the animal's flat bonus to that attribute, plus bonuses from its purchased options and the character's abilities / powers (e.g. Hominid attribute boosts, Extraordinary P.E.).
4. **Size Level:** I.Q., P.S., P.E. and Spd only.
5. **Physical skills:** P.S., P.P., P.E. and Spd only (dice bonuses such as Boxing's +1D4 are rolled now).

One chat card shows all eight attributes in a table: 3D6, exceptional die, Species, Size, Physical Skills and the final Score.

**Rolled once:** after the first roll the button becomes **Ask GM to Re-roll**. A player's request goes to the GM as a whispered card with an **Allow Re-roll** button; once allowed, the player can roll once more. The GM can re-roll any character directly (after a confirmation).

During play, click an attribute's abbreviation to **show it in chat**: its score, how it's made up and what it gives (e.g. P.P. 18: +2 strike, parry, dodge). No dice are rolled.

## Core tab
### Attributes
| Column | Meaning |
|---|---|
| **Attribute** | Click to show it in chat. |
| **Rolled** | The 3D6 (+ exceptional die) from Roll Attributes. Not editable. |
| **Species** | The animal's bonus to that attribute, plus purchased options and abilities / powers. |
| **Size** | Size Level modifier (I.Q., P.S., P.E. and Spd only; N/A for the others). |
| **Physical Skills** | Bonuses from Physical skills (P.S., P.P., P.E. and Spd only). Dice such as Boxing's +1D4 are shown as dice. |
| **Modifier** | The sum added to the roll (with dice bonuses as rolled, once rolled). |
| **Score** | The attribute as the sheet uses it for bonuses, skills, combat and saves. Not editable; hover for the breakdown and what it gives. |

### Health & Damage
- **Hit Points** (current / max). **Roll Hit Points** (in the panel header, after Roll Attributes) rolls P.E. + 1D6 once and posts a chat card; current HP starts at the max. The dice are kept, so **max HP follows P.E.** if it changes, plus an **HP Bonus** box for anything extra. Like attributes, it's rolled once: after that a player's button becomes *Ask GM to Re-roll HP* (the GM gets an **Allow Re-roll** card); the GM can re-roll directly. Characters from before 1.18 keep their typed max until they roll.
- **S.D.C.** (the maximum is calculated: Size Level S.D.C., doubled by *Extraordinary P.E.*-type effects, + skills + the **S.D.C. Bonus** field).
- **Natural Armor A.R.** (ability items with an A.R. override it if higher).
- **Body Armor**: equip an Armor item (Combat tab), or type name/A.R./S.D.C. directly.
- Status line: coma at 0 HP, death below −P.E., hours a coma lasts untreated, and warnings for *In a coma* and *Bleeding out* (25% of HP or less).

## Bio-E / Mutation tab
### Animal
Drop an **Animal** item. The sheet sets species, starting Bio-E, original and current Size Level, build, and the Human Feature costs. The animal's **abilities and natural weapons** appear as checkboxes: tick one to buy it (it becomes an owned Ability or natural Weapon item and its Bio-E is spent); untick to refund. Options in the same choice group are alternatives: buying one refunds the other. Options costing 0 Bio-E are bought automatically. **Remove Animal** removes it and everything bought from it.

### Background
Three slots: **Origin**, **Creator Organization**, **Education / Background**. Drop a Background item anywhere on the sheet and it goes into its slot (replacing the previous one of that kind). An Education sets the Education field and bonus; a background that grants Combat Training sets it if you have none.

### Bio-E
The panel adds up **Size**, **Human Features**, **Animal Abilities**, **Natural Weapons**, **Psionics** and **Magic Training** (Wizard 30 / Time Lord 25 when bought as a background option), plus **T.E. Change** from time travel and **Bonus (items)** from backgrounds or other items that grant Bio-E. The header shows **Remaining**, or **✓ All Bio-E spent** at exactly 0. Negative remaining turns red. *Extra Bio-E not tracked by items* lets you record purchases you haven't made items for.

### Size Level
Use − / + to change size: each step costs (or refunds) 5 Bio-E. Levels run 1–25 (21–25 are the giant dinosaur sizes). The size table highlights the current level. *Apply size modifiers* can be switched off.

### Human Features
Hands, Biped, Speech and Looks, each None / Partial / Full. Costs are **relative to the animal's automatic level**: 0 = the free level; **negative costs gain Bio-E** (a mutant Human giving up Full Hands). The costs come from the animal; you can edit them.

Features below Full can carry **effects** defined on the Animal item (e.g. Human Partial Hands: −20% all skills, −3 Strike and Parry with hand-held weapons). Without any, Partial Hands gives the Redux default of **−4 Strike with hand-held weapons**.

### Lists
Animal Abilities, Natural Weapons and Psionic Powers owned by the character, with their Bio-E cost. Use **+** to create one, or drag items in.

## Leveling up
Add the experience to **XP** in the header (or the GM's **Award XP**): the **Level** follows it (p.75: level 2 at 2,001, 3 at 4,001 ... 15 at 335,001; hover the Level for the next one). Lowering the XP lowers the Level. NPCs keep a typed Level. Skills, W.P.s, Combat Training, magic progressions and anything "per level" update automatically. For Hit Points, the button in Health & Damage turns amber: **Roll HP for Level N** rolls 1D6 for each new level and raises both max and current HP by the roll.
