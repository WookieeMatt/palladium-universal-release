# Combat

## Combat Training panel
- **Training**: None, Basic, Expert, Martial Arts, Assassin, Ninjutsu, Feral. The sheet applies each level's gains automatically.
- **Team Bonus Levels**: the Team Characters option; adds to the effective training level.
- **Actions Left / per Round**: how many actions remain this round, with a **↺** reset button (see *Actions per Round*).
- **Misc Actions**: extra actions from skills or powers not tracked by items.
- Lists of your **Attack Actions**, **Reactions**, **Unlocked by Training** (e.g. Entangle as a Reaction, Throw, Leap Attack) and **Criticals** (crit range, Critical or Stun, Death Blow).
- Red banners warn when you are **Stunned** or can't react (Held, Paralyzed, Unconscious, Coma).

## Combat Bonuses table
Each row = **Training + Attribute + Skills + Misc + Circumstance + Conditions = Total**, with a d20 button:
Initiative, Strike, Parry, Dodge, Roll with Impact, Pull Punch (needs **10+**), Disarm (uses the Strike circumstance), and Damage.

- **Misc**: permanent adjustments.
- **Circ.** (circumstance): temporary modifiers for the current situation (cover, darkness, "+5 to Hold after a Tackle"). Also **Circ. Actions** and **Circ. Critical range** (+1 = crits on 19–20). **Clear Circumstances** resets them all.
- **Cond.**: from active conditions (e.g. Blind −10).
- **Stunned** replaces everything with: 1 action, no combat bonuses.

## Weapons
Each weapon row shows its type, range, proficiency status ("no WP" warning), damage, and roll buttons:
- **Melee**: *Attack*, and *Leap Attack* once your training unlocks it.
- **Modern guns**: *Aimed*, *Burst*, *Wild Burst* (Burst only if the weapon has burst damage).
- **Black powder**: *Aimed*, *Wild*, *Beyond Range* (see Black Powder).
- **Bows and thrown**: *Attack* (P.P. + W.P. Targeting).
- 💥 rolls damage directly; ✊ toggles equipped.

Strike bonuses: melee = your Strike total + W.P. + weapon bonus + skill effects; modern = the W.P. mode bonus (untrained: Burst −3, Wild −6); thrown/bows = P.P. + W.P.; hand-held weapons also take Human Feature penalties.

## Attack cards
An attack posts a card with the Strike total, breakdown, natural-roll specials and:
- **4 or less misses.**
- **Critical Strike** on your crit range; **Critical or Stun** and **Death Blow** from advanced training (melee only). Against a natural critical, the defender needs a **natural roll equal or higher**.
- **Defend buttons** (Parry, Dodge, Roll with Impact, Entangle, Disarm, Throw) for the defending player.
- **Roll Damage** for the attacker (shows ×2 for criticals, ×2/×3 for Leap Attacks, "Death Blow" for death blows).

## Defending
The defender **selects their own token** (or has an assigned character) and clicks a Defend button on the attack card. Success = **meet or beat the Strike** (defenders win ties; a natural 20 always succeeds unless the attack was a natural 20 critical).
- **Parry**: free with Combat Training (Automatic Parry); uses an action untrained. **Ranged attacks can't be parried without a shield.**
- **Dodge**: always uses an action.
- **Roll with Impact**: uses an action; half damage (use *Apply ½*); not against bullets or energy.
- **Entangle / Disarm / Throw**: only if your training unlocks them as Reactions; melee only; use an action.
- Held, Paralyzed, Unconscious or in a Coma: no Reactions.

## Maneuvers
Buttons rolled with your melee Strike: **Hold**, **Entangle**, **Tackle** (unarmed damage), **Throw** (if unlocked; unarmed damage) and **Jump Kick** (unarmed Leap Attack, if unlocked: 2 actions, ×2 / ×3 damage). Hover for the rules text. Their cards have Defend buttons too.

## Conditions
Toggle on the Combat tab or the token HUD: **Stunned**, **Horrified**, **Blind** (−10 Strike/Parry/Dodge/Initiative), **Held**, **Entangled**, **Prone**, **Deafened** (−3), **Pain** (−6), **Paralyzed**, **Unconscious**, **Coma**, plus Foundry's **Dead**. Modifiers apply to the totals automatically.

## Damage and armor
Damage cards have three buttons that act on your **targeted** tokens (or selected, if none are targeted):
- **Apply**: resolves armor using the Strike roll:
  1. Strike **below Natural A.R.** → no damage.
  2. Strike **below Body Armor A.R.** (armor with S.D.C. left) → the armor's S.D.C. absorbs it (an equipped armor item is updated; at 0 it's destroyed).
  3. Otherwise → the character's S.D.C., then Hit Points.
  Rolls that **meet or beat** an A.R. get through.
- **Apply ½**: a successful Roll with Impact.
- **To HP**: straight to Hit Points (Death Blows, poisons).

A result card lists what absorbed the damage and warns of coma or death. You need ownership of the target (players usually ask the GM to apply damage to NPCs).

## Actions per Round
Attacks, maneuvers, spells, psionics and Reactions that cost an action (Dodge, Roll with Impact, untrained Parry, reaction Entangle/Disarm/Throw) spend actions automatically; cards say how many are left. Leap Attacks and untrained black powder aimed shots cost two. Running out only **warns**: the roll still happens and the GM rules. When the **Combat Tracker** advances to a new round, everyone's actions reset and **Horrified** ends; ending the combat also clears them. The **↺** button resets by hand.

## Saving throws
At the bottom of the Combat tab: vs Psionics (15+, or 10+ with *Psychic* ticked), vs Strangeness (12+), vs Poison/Toxin (14+), vs Magic (12+), vs Circles & Wards (12+), vs Coma, and **vs Horror Factor**.
**Save vs Coma** asks for the treatment available, rolls three times (d20 + P.E. coma bonus + treatment, 16+) and restores 1 HP on two successes.
