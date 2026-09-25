# Combat

## Combat Training panel
- **Training**: drop a **Combat Training** item from the compendium's Skills pack (*Combat Training: Basic, Expert, Martial Arts, Assassin, Ninjutsu, Feral*) on the character: it sets the training and shows in the Skills list. Only one at a time: dropping another (say, Expert over Basic) replaces it. While an item sets it, the field is locked; without one, pick it from the dropdown (NPCs use the dropdown). The sheet applies each level's gains automatically.
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
An attack posts a card with **Strike = total** (click it for the d20 and each bonus), natural-roll specials and:
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
Attacks, maneuvers, spells, psionics and Reactions that cost an action (Dodge, Roll with Impact, untrained Parry, reaction Entangle/Disarm/Throw) spend actions automatically; cards say how many are left. Leap Attacks and untrained black powder aimed shots cost two. Running out only **warns**: the roll still happens and the GM rules. When a new round starts (see *The Combat Tracker*), everyone's actions reset and **Horrified** ends; ending the combat also clears them. The **↺** button resets by hand.

## The Combat Tracker (Palladium turn order)
Combat runs the book's way (p.84):
- **Initiative** is 1D20 + Initiative bonus, rolled **once** at the start of combat and kept between rounds. **Ties re-roll** automatically.
- **One action at a time.** Each combatant takes one action on their turn (an attack, a move, a skill...), then play passes to the next in Initiative order. **Next Turn** goes around again and again while anyone still has actions, skipping those who are out (and the defeated). When nobody has actions left, a **new round** starts and everyone's actions reset.
- Actions are spent by the rolls themselves (attacks, maneuvers, spells, psionics, Dodges and other Reactions made on someone else's turn). A turn that ends without spending one (a move, talking, a skill check) **costs one action** automatically, so the round always ends.
- Each combatant shows its **actions left as dots**; a combatant who's out is dimmed. Vehicles get one action a round.
- **Gains / Loses the Initiative** (GM): the ⇈ / ⇊ buttons next to a combatant move them to the top or the bottom of the order (knocked down, Held, Thrown, Horrified...).

**Add Party to Combat** (Party sheet or GM Party View) puts a whole party in at once. Turn it all off with **Configure Settings → System Settings → Palladium Turn Order** to get Foundry's one-turn-each rounds.

## Saving throws
At the bottom of the Combat tab: vs Psionics (15+, or 10+ with *Psychic* ticked), vs Strangeness (12+), vs Poison/Toxin (asks the threat: lethal poison 14+, harmful drugs 15+, non-lethal poison 16+), vs Magic (12+), vs Circles & Wards (12+), vs Coma, and **vs Horror Factor**.
Every save is d20 + the save bonus and must **meet or beat** the target; the card shows the roll, the bonus and the target.
**Save vs Coma** asks for the treatment available, rolls three times (d20 + P.E. coma bonus + treatment, 16+) and restores 1 HP on two successes.
