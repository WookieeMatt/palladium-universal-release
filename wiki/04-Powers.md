# Powers: Magic, Psionics & Strangeness

The **Powers** tab gathers everything supernatural.

## Magic
Magic here is spell-count magic (Transdimensional): a caster has a number of **spells per day**, a **spell strength** that targets must save against, and a number of **spells per melee**. There is no P.P.E. (the *Modules* tab keeps an optional P.P.E. block for other Palladium settings).

### Setting up a caster
Choose **Tradition**:
| Tradition | Spells per day | Spells per melee | Other |
|---|---|---|---|
| **Wizard** | 8 at level 1, +2 at levels 3, 6, 9, 12 | 2, rising with level | Recognize Enchantment, Sense Magic, Astral Projection |
| **Time Lord (Apprentice)** | 4 at level 1, +1 per level | 2, rising with level | Compute Temporal Coils, Sense Temporal Energy, Sense Time Stream, Sense Magic, Sense Temporal Magic (by level) |

**Costs Bio-E** (on by default) charges 30 (Wizard) or 25 (Time Lord) Bio-E, as the background option does; untick it for NPCs or casters from other sources.

The panel shows **Spells Today** (left / per day), **Spells per Melee** and **Spell Strength** (12 + bonuses: the number a target must meet or beat). Magic combat bonuses (spell strength, saves vs magic, circles and psionics, % vs T.E. Change) are applied by level. Misc fields adjust spells per day, per melee and strength. **New Day** restores all daily spells.

**Automatic Abilities** list the tradition's abilities; those with a % have a roll button.

### Spells
Add Spell items (or drag them in). Each row shows the list, range, duration, save and current damage (e.g. `@levelD6` shows `4D6` at level 4). Selections (1–3) count toward the spells known.

- **Cast**: uses one of today's spells and an action. The card shows the spell strength and the spells left, with:
  - **Save vs Magic (N+)**: targets select their token and click; d20 + save vs magic must meet or beat N.
  - **Dodge (N+)**: for dodge-only spells like Fire Ball (18+).
  - **Damage**: rolls the damage with a normal damage card.
- **Practice** replaces Cast on unmastered spells:
  - **Time Lord** spells roll the *Temporal Spell Experimentation Table*; **two complete successes** make the spell castable.
  - **Wizard** spells roll the *self-taught Success or Failure table*; one success is enough.
  - Result buttons: take explosion or energy-bolt damage, *Save vs T.E. Change*, *Temporal Mishap*.

### Magic saves
vs Magic, vs Circles & Wards, and **vs T.E. Change** (percentile + P.E. % + Time Lord bonus; **50+** resists). A failed Change save offers **Devolve −5 Bio-E** (travelled to the past) and **Evolve +5 Bio-E** (travelled to the future); the total appears as *T.E. Change* on the Bio-E tab. **Temporal Mishap** rolls the mishap table (see GM Tools).

## Psionics
Psionic powers are bought with Bio-E (no I.S.P.); they're listed on the Bio-E tab and here. **Use** posts the power's range, duration and save, spends an action, and if the power allows a save adds **Save vs Psionics** for targets (15+, 10+ for psychics, + M.E. bonus).

## Strangeness
Buttons for **Save vs Strangeness**, **Save vs Psionics** and **Horror Factor**.

### Horror Factor
Some creatures and scenes are so strange that everyone must roll **above** their Horror Factor (d20 + save vs Strangeness bonus). On a failure the character is **Horrified** for one round: loses the Initiative (dropped to the bottom of the Combat Tracker), can't Parry or Dodge the first attack, and loses one action. Horrified ends automatically at the next round.
- From a character: **Horror Factor** asks for the H.F. and rolls.
- From an NPC with a Horror Factor: its sheet's 👻 button posts a card; each player selects their token and clicks **Save vs H.F.**
