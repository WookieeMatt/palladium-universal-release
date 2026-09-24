# GM Tools

## Settings
**Configure Settings → System Settings → Black Powder Weather**: Dry, Humid (+5%), Rain (+15%), Downpour or dunking (+35%). Added to every black powder misfire chance.

**Configure Settings → System Settings → Team Character Generation**: when on, a character generating an attribute with an exceptional roll (16–18) uses the highest bonus die a teammate (a character in the same Actors folder) rolled for that attribute, if it's higher than their own.

**Configure Settings → System Settings → TMNT Journal Style** (on by default): journals and journal pages, including the compendium journals and this guide, use the character sheet look: green title bar, parchment pages, comic headings, green-headed striped tables and green link chips. Turn it off to keep Foundry's own journal style (e.g. with a journal module that has its own theme).

## Animations (Automated Animations)
Install and enable **Automated Animations**, **Sequencer** and **JB2A** (the free *JB2A_DnD5e* or the Patreon version). The system then plays an animation when something is used:

| What | Animation |
|---|---|
| Weapon attacks (character, NPC, vehicle) | From the attacker's token to your targeted tokens; a miss (4 or less) plays the miss version |
| Maneuvers (Tackle, Throw, Jump Kick…) | Unarmed strike |
| Casting a spell, using a psionic power | The spell or power |
| An item's 🎲 roll (grenades, powers…) | The item |
| Operating a device or time machine | A teleport flash |

Damage, saves and skill checks don't animate. Select your token and target first.

**How animations are chosen:** Automated Animations looks for an entry in its *Global Automatic Recognition* menu named after the item first (so you can give any item its own animation there, or on the item's own A-A tab). If there isn't one, the system's **trigger set** points TMNT names at the built-in entries: katana/sword → *sword*, sai/knife/tanto → *dagger*, bo/staff/nunchaku/tonfa → *greatclub*, spear/naginata → *spear*, kama/axe → *handaxe*, bows → *bow*, bite → *bite*, claws → *claw*, healing → *curewounds*, teleport/time/dimension → *mistystep*, grenades → *fireball*, and so on.

**Guns:** Automated Animations has no built-in gun entry. Add one Range entry named **bullet** in its Global Automatic Recognition menu (pick a JB2A bullet animation) and every firearm and black powder weapon uses it.

Turn animations off with **Configure Settings → System Settings → Automated Animations**. Nothing happens if the module isn't active.

## T.C.R.I. Dice (Dice So Nice)
With the *Dice So Nice* module enabled, the system adds the **T.C.R.I. Dice**, a seven-piece set (d4, d6, d8, d10, d10 %, d12 and d20) of clear green dice filled with glittering liquid. The liquid swirls and the glitter twinkles while the dice roll.

- **Default look:** the world setting **T.C.R.I. Dice by Default** (on unless you turn it off) gives every player the T.C.R.I. Dice until they choose their own dice in Dice So Nice. Changing it reloads the world.
- **Picking them yourself:** open *Dice So Nice Settings* → *Appearance*, then either:
  - set **Dice Presets** to **T.C.R.I. Dice** (group *Palladium Universal*) for the full animated set, or
  - set **Theme** to **T.C.R.I. Dice** to put the same colors and static glitter on another preset.
- **Smoother throws:** the dice load when the world starts, so the first throw doesn't stall. If throws still stutter on a computer, set **T.C.R.I. Dice Finish** (Configure Settings, per computer) to **Fast**: solid, glossy dice that are cheaper to draw than see-through glass. Turning off *advanced glass* in Dice So Nice's graphics settings also helps.
- **No Dice So Nice?** Nothing changes: rolls work as usual.

## Rounds and the Combat Tracker
- Initiative = d20 + the Initiative total.
- Advancing to a **new round** resets everyone's actions and ends **Horrified** (the GM's client does this; a GM must be connected).
- A failed Horror Factor save drops that combatant to the bottom of the order.

## Conditions
Token HUD status effects are this system's conditions (Stunned, Horrified, Blind, Held, Entangled, Prone, Deafened, Pain, Paralyzed, Unconscious, Coma, Dead). Their modifiers apply to combat totals; Held, Paralyzed, Unconscious and Coma block Reactions.

## Built-in tables
The system rolls these itself when needed; you can also roll some directly.
| Table | Where |
|---|---|
| Temporal Mishap (with Cycle, Twist and Null-Time follow-ups) | Powers tab (Magic Saves), Time Machine *Mishap* button, failed time machine jumps, spell practice |
| Cross-dimensional device malfunctions (Gateway, Portable, Miniature) | Failed device operation |
| Temporal Spell Experimentation / self-taught spell attempts | *Practice* on unmastered spells |
| Black powder Misfire Mishaps | Every black powder shot that misfires |
| Save vs Coma (three tries) | Combat tab |

Flavor tables (time period encounters, surprise details, branch points, technology base, reactions) are best kept as Foundry **Roll Tables** in a content module.

## Chat card buttons
| Button | Who clicks | Acts on |
|---|---|---|
| Defend (Parry, Dodge...) | The defender | Their selected token or assigned character |
| Roll Damage | The attacker | The attacking actor |
| Apply / Apply ½ / To HP | Whoever owns the target (usually the GM) | Targeted tokens, else selected |
| Save vs Magic / Dodge / Save vs Psionics / Save vs H.F. | Each target | Their selected token or assigned character |
| Take damage (misfire, practice), Devolve / Evolve, Temporal Mishap | The actor's owner | The actor that made the roll |
| The card's title (📖) | Anyone | Opens a read-only view of the item the card is about |
| Dice in a table result (misfire, malfunction, Temporal Mishap, spell practice), e.g. *2D6* melee rounds | Anyone | Rolls those dice to chat |

## Rules the system follows
- **Meet or beat** everywhere: Reactions vs Strikes, Strikes vs A.R. (defenders win ties).
- Natural criticals need an equal or higher natural roll to defend.
- Roll with Impact: meet or beat the Strike; falls 10+.
- Pull Punch 10+ (Errata 2026).
- Save vs Coma: automatic, P.E. coma % converted to a d20 bonus (÷5).
- Body armor absorbs Strikes below its A.R.; natural armor ignores them.
