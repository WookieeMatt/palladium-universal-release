# Character Creation

## Header
The top of the sheet holds the character's **name** and **portrait** (click the portrait to change it), plus:
- **Animal**, **Alignment**, **Origin** and **Education**.
- **Level**: set by the XP total (p.75). You can't type it.
- **XP**: the character's total Experience Points.
- **Education Bonus %**: added to Professional skills.
- **Age**, **Sex**, **Height** and **Weight**.

New characters and NPCs get a round token with a green ring.

## Creation checklist
A new character's Core tab starts with a **Creation Checklist**: the steps in book order. Each one ticks itself off when it's done.
1. **Roll Attributes**
2. **Choose the animal**: drag an Animal onto the sheet, or type it in the header.
3. **Spend Bio-E**: shows how much is left, or how much you've overspent.
4. **Origin** and 5. **Education**: drag the backgrounds onto the sheet, or type them in the header.
6. **Skills**
7. **Alignment**
8. **Starting Money**: roll the money your Origin and Education give, and enter it on the Gear tab.
9. **Roll Hit Points** (see *Health & Damage* below)

Click an unfinished step to jump to the tab where it's done.

When all nine steps are done, the checklist disappears. To put it away sooner (for example, to keep some Bio-E for later), click **Hide**. *Show the creation checklist*, at the bottom of the Core tab, brings it back at any time. NPCs don't have a checklist.

Some steps have small green buttons:
- 🎲 **Roll**: Choose the animal, Origin, Roll Attributes and Roll Hit Points.
- 📖 **Open the compendium**: Choose the animal, Origin, Education and Skills, when a compendium with those items is installed (for example the TMNT animals, backgrounds and skills). The Skills book also opens the compendium with the W.P.s (Weapon Proficiencies, on the Combat tab). No compendium, no book.

The buttons disappear once the step is done, and so do **Roll Attributes** and **Roll Hit Points** on the Core tab.

### Reset Character
The checklist ends with a **Reset Character** button: the only way to redo character creation, and only for a **level 1** character. It asks first, telling you what will be cleared, what will be kept and how many resets the character has left.
- **Cleared:** the animal and everything bought with Bio-E (abilities, natural weapons, psionics, size, Human Features), the Origin, Creator Organization and Education, skills, W.P.s and Combat Training, the attributes, Hit Points, alignment, age, sex, height, weight and starting money.
- **Kept:** the name, portrait and token, XP and level, weapons, armor and gear, notes and spells.

The GM sets how many resets each character gets (**Character Resets Allowed** in the System Settings; 1 by default, 0 for none). The GM can always reset a character, and it doesn't count. The audit only notes that a reset happened, and who did it.

### Rolling the animal and the origin (optional)
The *Choose the animal* and *Origin* steps have a 🎲 button that rolls on the book's tables (p.13–15), one table at a time. The same tables are in the **Palladium Universal Tables** compendium.
- **Animal:** first roll the category (Urban, Rural, Wild, Wild Birds, Zoo or Lab), then the animal itself (the button names the category, for example **Roll the Urban animal**).
- **Origin:** roll the origin, then the table it leads to:
  - *Random Mutation* or *Accidental Encounter* → *Wild Animal Education*.
  - *Deliberate Experimentation* → *Creator Organization* → the experiment. *Pet Gone Awry* and *Caged* also lead to *Wild Animal Education*.
  - Click **Roll** for the next table, or **Stop here** to finish.

Each result appears in a small window with three choices:
- **Use …** adds the matching compendium entry, as if you had dragged it onto the sheet. It only appears when there is a match; if several match (for example *Pet Rodent*), they are all offered.
- **Fill it in myself** writes the name in the header (Animal, Origin or Education). A Creator Organization goes after the Origin, in brackets.
- **Cancel** changes nothing.

When you finish, stop or cancel, **one chat card** lists every roll, its result and what you chose. To roll again, click the 🎲 again.

## Rolling attributes
Attributes are rolled **once**, when the character is created, with the **Roll Attributes** button on the Core tab. It rolls all eight at once and saves them. For each attribute:
1. **Base:** roll 3D6.
2. **Exceptional:** on a 16, 17 or 18, add 1D6. With the **Team Character Generation** world setting on, if another character in the same Actors folder rolled a higher bonus die for that attribute, the higher die is used.
3. **Species:** add the animal's bonus, plus bonuses from the animal options you bought and from abilities and powers (for example a Hominid's attribute boosts, or Extraordinary P.E.).
4. **Size Level:** add the size modifier (I.Q., P.S., P.E. and Spd only).
5. **Physical skills:** add their bonuses (P.S., P.P., P.E. and Spd only). Dice bonuses, such as Boxing's +1D4, are rolled now.

One chat card shows the results in a table: the 3D6, the exceptional die, Species, Size, Physical Skills and the final Score.

**Re-rolling:** the Roll Attributes button disappears after the roll. To roll again, use **Reset Character** at the end of the Creation Checklist.

**During play**, attributes are not rolled. Click an attribute's name to **show it in chat**: its score, how it's made up and what it gives (for example P.P. 18: +2 to strike, parry and dodge).

## Core tab
### Attributes
| Column | What it shows |
|---|---|
| **Attribute** | Click to show it in chat. |
| **Rolled** | The 3D6 (plus any exceptional die) from Roll Attributes. You can't edit it. |
| **Species** | The animal's bonus, plus bonuses from bought options and from abilities and powers. |
| **Size** | The Size Level modifier (I.Q., P.S., P.E. and Spd only; N/A for the others). |
| **Physical Skills** | Bonuses from Physical skills (P.S., P.P., P.E. and Spd only). Dice bonuses, such as Boxing's +1D4, show as dice until rolled. |
| **Modifier** | Everything added to the roll. |
| **Score** | The attribute the sheet uses for bonuses, skills, combat and saves. You can't edit it; hover over it to see how it's made up and what it gives. |

### Health & Damage
- **Hit Points** (current / maximum). The **Roll Hit Points** button is in the panel's header (roll the attributes first). It rolls P.E. + 1D6 once and posts a chat card; current HP starts at the maximum.
  - The dice are kept, so the **maximum follows P.E.** if P.E. changes. Use the **HP Bonus** box for anything extra.
  - Like attributes, Hit Points are rolled once, and the button disappears. To roll again, use **Reset Character**. The button comes back (amber) when a new level needs its Hit Points rolled.
  - Characters made before version 1.18 keep their typed maximum until they roll.
- **S.D.C.**: the maximum is calculated from the Size Level's S.D.C. (doubled by effects such as *Extraordinary P.E.*), plus skills, plus the **S.D.C. Bonus** box.
- **Natural Armor A.R.**: an ability with a higher A.R. replaces it.
- **Body Armor**: equip an Armor item on the Combat tab, or type its name, A.R. and S.D.C. here.
- **Status line**: when the character falls into a coma (0 HP) and dies (below −P.E.), how many hours a coma lasts without treatment, and warnings for *In a coma* and *Bleeding out* (at 25% of HP or less).

## Bio-E / Mutation tab
### Animal
Drag an **Animal** item onto the sheet. It sets the species, the starting Bio-E, the original and current Size Level, the build and the costs of Human Features.

The animal's **abilities** and **natural weapons** appear as checkboxes. Tick one to buy it: it's added to the character as an Ability or a natural Weapon, and its Bio-E is spent. Untick it to get the Bio-E back.
- Options in the same group are alternatives: buying one refunds the other.
- Options that cost 0 Bio-E are bought automatically.

**Remove Animal** removes the animal and everything bought from it.

### Background
There are three slots: **Origin**, **Creator Organization** and **Education / Background**. Drag a Background item anywhere onto the sheet and it goes into its slot, replacing the previous one of the same kind. An Education sets the Education field and its bonus. A background that gives Combat Training sets it, if the character doesn't have one yet.

### Bio-E
The panel adds up what the Bio-E was spent on: **Size**, **Human Features**, **Animal Abilities**, **Natural Weapons**, **Psionics** and **Magic Training** (Wizard 30, Time Lord 25, when bought as a background option). It also counts **T.E. Change** from time travel, and **Bonus (items)**: Bio-E given by backgrounds or other items.

The panel's header shows how much is **Remaining**, or **✓ All Bio-E spent** at exactly 0. Overspent Bio-E shows in red. Use *Extra Bio-E not tracked by items* for purchases you haven't made items for.

### Size Level
Use − and + to change the size. Each step costs 5 Bio-E, or gives 5 back. Sizes run from 1 to 25 (21–25 are the giant dinosaur sizes). The size table highlights the current size. You can untick *Apply size modifiers to attributes*.

### Human Features
Hands, Biped, Speech and Looks, each None, Partial or Full. The costs are **relative to what the animal gets for free**: 0 is the free level, and a **negative cost gives Bio-E back** (for example, a mutant Human giving up Full Hands). The costs come from the animal item, and you can edit them.

A feature below Full can have **effects**, set on the Animal item (for example Human Partial Hands: −20% to all skills, −3 to Strike and Parry with hand-held weapons). If the animal sets none, Partial Hands gives the Redux default: **−4 to Strike with hand-held weapons**.

### Lists
The character's Animal Abilities, Natural Weapons and Psionic Powers, with their Bio-E costs. Click **+** to create one, or drag items onto the list.

## Leveling up
Add the Experience Points to **XP** in the header, or use the GM's **Award XP**. The **Level** follows the XP (p.75: level 2 at 2,001 XP, level 3 at 4,001 ... level 15 at 335,001). Hover over the Level to see when the next one comes. Lowering the XP lowers the Level. NPCs keep a typed Level.

Skills, W.P.s, Combat Training, magic and anything else that improves "per level" update automatically.

For Hit Points, the button in Health & Damage turns amber: **Roll HP for Level N** rolls 1D6 for each new level and adds the total to both the maximum and the current HP.
