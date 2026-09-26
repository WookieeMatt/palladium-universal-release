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
- **Melee**: *Attack*, *Sneak Attack*, and *Leap Attack* once your training unlocks it.
- **Sneak Attack** (melee): the defender can't Parry, Dodge or react (p.84): no Defend buttons. When the Combat Training grants it (Basic 15, Expert 10, Martial Arts 8, Assassin 3, Ninjutsu 5, Feral 12), a hit is a **Critical Strike or Stun** (attacker's choice, ×2 damage).
- Combat Training damage is **melee** damage: thrown weapons add the P.S. damage bonus, not the training's.
- **Modern guns**: *Aimed*, *Burst*, *Wild Burst* (Burst only if the weapon has burst damage).
- **Black powder**: *Aimed*, *Wild*, *Beyond Range* (see Black Powder).
- **Bows and thrown**: *Attack* (P.P. + W.P. Targeting).
- 💥 rolls damage directly; ✊ toggles equipped.

Strike bonuses: melee = your Strike total + W.P. + weapon bonus + skill effects; modern = the W.P. mode bonus (untrained: Burst −3, Wild −6); thrown/bows = P.P. + W.P.; hand-held weapons also take Human Feature penalties.

### Ammo and thrown weapons
- **Guns, bows and black powder weapons** with an **Ammo** max show `8/10` on their row, with − / + and a **Reload** button (back to the max; the weapon's Reload time is in its tooltip). Each attack uses ammo: **Aimed 1, Burst or Wild Burst 3** (a burst is three rounds, p.89); bows and black powder 1 a shot. The attack card shows what's left.
- **Empty**: the attack still rolls (the GM decides), the card says *Empty! Reload* and you get a warning.
- **Thrown weapons** (shuriken, knives, javelins) and **grenades** show how many you have (`×12`) with − / +. Each throw uses one; use + when you pick one up. At 0 the sheet asks before throwing anyway.
- Weapons from the TMNT compendium come with their magazine; a black powder gun holds one load (a pair of pistols two); bows and crossbows start with a quiver of 12 (change it to what you carry). Bows and black powder guns that were on sheets before ammo was counted got the same defaults once (1.35). Set **Ammo** on the weapon's card for anything else; leave it at 0 not to track it.

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

## Roll with Impact (p.84)
Only against **blunt** attacks: fists, feet, staffs, clubs, chains (weapons with **Blunt** ticked), maneuvers (Tackle, Throw...) and explosions; never bullets, energy blasts or blades. The Defend button only appears when it's allowed. Match or beat the Strike (costs an action): the damage is halved when applied, and Stun attacks don't stun. Falls (10+ on a d20, 1D6 per 4 yards) are left to the table. The GM macro **Mark Blunt Weapons** ticks Blunt on existing weapons.

## Conditions
Toggle on the Combat tab or the token HUD, plus Foundry's **Dead**. Each one does what its text says:
| Condition | What the system does |
|---|---|
| **Stunned** | 1 action, no combat bonuses, **Speed halved**, no skill checks. Applied during a combat it rolls **1D4 rounds** (a chat card) and ends by itself. |
| **Horrified** | −1 action, **loses the Initiative** (bottom of the order), and the **first Parry or Dodge** this round is refused (the next attack can be defended). Ends at the next round. |
| **Blind** | −10 Strike, Parry, Dodge and Initiative. |
| **Held** | No Reactions; an attack or maneuver becomes a **Break Free** Strike (an Attack Action; the holder may Parry it). Remove Held when it gets through. |
| **Entangled** | The limb and its weapon can't be used (the GM's call); break free with a Strike. |
| **Prone** | Crawl only; removing Prone during a combat **spends an action** (standing up) and posts a card. |
| **Deafened** | −3 Strike, Parry, Dodge; **loses the Initiative**. |
| **Pain** | −6 Strike, Parry, Dodge; **1 HP every 4 rounds** (a minute) during a combat. |
| **Paralyzed** | **No actions**, no attacks, no Reactions (skills that only need thinking still work). |
| **Unconscious** | No actions, attacks, Reactions or skill checks. |
| **Bleeding Out** | Set **automatically** when damage brings the Hit Points to 25% or less (off when healed above); **1 HP every 4 rounds** in combat. A successful First Aid / Paramedic / Medical Doctor roll has a **Stop the Bleeding** button (target the bleeding character). |
| **Coma** | Set **automatically at 0 HP or less** and removed above 0; no actions. **Dead** is set automatically below −P.E.: skull overlay, the combatant marked defeated, and a death marker effect. Bleeding Out starts with a blood splash on the token (setting *Blood & Death Effects*). |
Losing the Initiative also applies when Initiative is rolled while the condition is on.

## Damage and armor
Damage cards have three buttons that act on your **targeted** tokens (or selected, if none are targeted):
- **Apply**: resolves armor using the Strike roll:
  1. Strike **below Natural A.R.** → no damage.
  2. Strike **below Body Armor A.R.** (armor with S.D.C. left) → the armor's S.D.C. absorbs it (an equipped armor item is updated; at 0 it's destroyed).
  3. Otherwise → the character's S.D.C., then Hit Points.
  Rolls that **meet or beat** an A.R. get through.
  The Health panel shows these layers for each character, e.g. *5–7 bounce off natural armor · 8–10 hit the Kevlar Vest · 11+ hit you* (4 or less always misses).
- **Apply ½**: half damage by hand. After a successful **Roll with Impact** against that attack, **Apply** halves it for that character by itself ("Rolled with Impact: ½").
- **Cover**: a target behind cover this combat (the bricks icon in the Combat Tracker) takes 2% of the cover's S.D.C. less from firearms, energy weapons and black powder; see **Rules Reference**.
- **To HP**: straight to Hit Points (Death Blows, poisons).

A result card lists what absorbed the damage and warns of coma or death. **Heal** (Health & Damage) rests and heals: Hit Points by treatment and days, 5 S.D.C. per hour of rest (p.92). You need ownership of the target (players usually ask the GM to apply damage to NPCs).

## Actions per Round
Attacks, maneuvers, spells, psionics and Reactions that cost an action (Dodge, Roll with Impact, untrained Parry, reaction Entangle/Disarm/Throw) spend actions automatically; cards say how many are left. Leap Attacks and untrained black powder aimed shots cost two. Running out only **warns**: the roll still happens and the GM rules. When a new round starts (see *The Combat Tracker*), everyone's actions reset and **Horrified** ends; ending the combat also clears them. The **↺** button resets by hand.

## The Combat Tracker (Palladium turn order)
Combat runs the book's way (p.84):
- **Who goes first: the GM decides** (p.84). The GM's **Initiative** button at the top of the tracker opens one window with a dropdown (only the combatants on the tracker take part):
  - **Showdown**: the order is cleared and everyone rolls 1D20 + Initiative bonus. Each player online gets a **Roll Initiative** popup for their own combatants (or **Later**: the chat card has the same button); the GM gets one **Roll NPCs** button for every NPC and anyone whose player is offline. The tracker sorts itself; **ties re-roll**.
  - **Ambush** (a Sneak Attack or Surprise Attack started it) or **Sudden Violence**: pick **Friendly** or **Hostile**: that side has the Initiative at the top of the order; everyone else rolls as in a Showdown.
  - Initiative is kept between rounds for the whole combat; anyone can still cut in line with ⇈ / ⇊.
- **Sides**: each combatant shows a green shield (**Friendly**) or a red skull (**Hostile**), from its token (Friendly tokens, or player characters without a token, are Friendly; Hostile and Neutral are Hostile). The GM clicks it to flip the side; a token's disposition changes with it, so it shows on the map and carries into the next fight.
- **One action at a time.** Each combatant takes one action on their turn (an attack, a move, a skill...), then play passes to the next in Initiative order. **Next Turn** goes around again and again while anyone still has actions, skipping those who are out (and the defeated). When nobody has actions left, a **new round** starts and everyone's actions reset.
- Actions are spent by the rolls themselves (attacks, maneuvers, spells, psionics, Dodges and other Reactions made on someone else's turn). A turn that ends without spending one (a move, talking, a skill check) **costs one action** automatically, so the round always ends.
- Each combatant shows its **actions as fists**: bright = available, faded = used; hover for how many are left. The owner or GM can click one to spend an action by hand (or a faded one to give it back). A combatant who's out is dimmed. Vehicles get one action a round.
- **Cover** (p.90): the bricks icon: pick what the combatant is behind (one dropdown); it lasts the combat. See *Damage and armor*.
- **Move Action** (p.85, once per round): the walking figure next to the fists. Click it when moving (owner or GM): it lights up and spends an action; click again to undo. It resets each round. Changing posture (standing up) and object actions are separate.
- **Gains / Loses the Initiative** (GM): the ⇈ / ⇊ buttons next to a combatant move them to the top or the bottom of the order (knocked down, Held, Thrown, Horrified...).

**Add Party to Combat** (Party sheet or GM Party View) puts a whole party in at once. Turn it all off with **Configure Settings → System Settings → Palladium Turn Order** to get Foundry's one-turn-each rounds.

## Saving throws
At the bottom of the Combat tab: vs Psionics (15+, or 10+ with *Psychic* ticked), vs Strangeness (12+), vs Poison/Toxin (asks the threat: lethal poison 14+, harmful drugs 15+, non-lethal poison 16+), vs Magic (12+), vs Circles & Wards (12+), vs Coma, and **vs Horror Factor**.
Every save is d20 + the save bonus and must **meet or beat** the target; the card shows the roll, the bonus and the target.
**Save vs Coma** asks for the treatment available, rolls three times (d20 + P.E. coma bonus + treatment, 16+) and restores 1 HP on two successes.
