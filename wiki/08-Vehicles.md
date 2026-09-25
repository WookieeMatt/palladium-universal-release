# Vehicles

## Vehicle sheet
- **Type** (land, water, air, space, other) and **S.D.C.** (value / max). The status reads **Operational**, **Incapacitated** (S.D.C. 0: needs major repairs) or **Totaled** (damage equal to double the S.D.C.). Modifications can add S.D.C. (shown as "+N from modifications").
- **A.R.**: the vehicle's own Armor Rating (1st-edition vehicle stats). Strikes below it do no damage.
- Top speed, range, crew, passengers, cargo, cost.

## Armor locations
**Hull / Fuselage** (vehicle armor), **Crew / Passenger Compartment**, **Engine**, **Fuel Tank / Energy Pack**, **Power Plant** (fusion generator), **Cargo Hold**, **Turret**, each with A.R. and S.D.C.

### Damage by location
When damage is applied to a vehicle token, a prompt asks for the **location hit**. Strikes hit the hull unless the attacker declared another exposed location. A location's armor absorbs Strikes **below its A.R.** while it has S.D.C.; Strikes that meet or beat it get through:
- Then the vehicle's own **A.R.**: Strikes below it do no damage.
- Hull, engine, fuel tank, turret → the vehicle's S.D.C. (with a note for engine/fuel/turret hits).
- Crew compartment → the damage goes to an occupant (the card says so; apply it to them).
*To HP* on a vehicle means straight to the vehicle's S.D.C.

## Piloting
Pilot name, **Pilot Skill %**, **Control Bonus %** (modifications add theirs), **Evade Bonus**, **Gunner Strike Bonus**, **Initiative**.
- **Control Roll**: percentile under skill + bonuses. Control Rolls don't cost an action.
- **Evade**: d20 + Evade Bonus; until the vehicle's next maneuver, Strikes must meet or beat the roll.
- **Maneuver**: describe what the pilot tries (a sharp turn, a ram, a jump...); the GM picks the difficulty (task difficulty, p.54: +20% very easy to −20% very hard, plus any other modifier) and a Control Roll decides it. The card says whether it works; **the GM rules what that means**. In combat it spends the vehicle's action.
- Each vehicle makes **one maneuver per round**.

### Playing vehicle combat for now
The system has the **Control Roll**, the **Maneuver** roll, the **Evade**, mounted weapons, damage by location and (for aircraft) the full air-combat panel. The book's list of ground-vehicle maneuvers (ramming damage, stunts) isn't built in yet, so the GM decides those. A way to run a chase or a fight:
1. **Initiative:** put the vehicles in the Combat Tracker with their drivers (each vehicle's **Initiative** field). A vehicle gets **one action (its maneuver) a round**; its driver and gunners use their own actions.
2. **Each round, each driver declares a maneuver** and presses **Maneuver**. The GM sets the difficulty from the situation (speed, terrain, weather, damage). Control Rolls that come with a maneuver are free.
3. **Success:** the maneuver happens (the vehicle gets where it wanted, shakes a pursuer, lines up a shot). **Failure:** the GM decides: lost ground, a skid, a spin-out; a bad failure at speed can be a crash.
4. **Evade:** a driver who Evades makes every Strike against the vehicle need to meet or beat the Evade roll until its next maneuver.
5. **Shooting:** gunners fire the mounted weapons (Strike + Gunner bonus). Hits strike the **hull** unless the attacker named an exposed location (crew compartment, turret, tire); roll damage and use **Apply** with the vehicle's token selected: it goes to that location's armor.
6. **Rams and crashes:** make the ram a Maneuver; on a success the GM rolls damage for both vehicles (bigger and faster hits harder) and applies it to the hull. Aircraft have their own Crash and Emergency Landing buttons.
7. **Out of control:** a vehicle at 0 S.D.C. is incapacitated; at −(its S.D.C.) it's totaled.



## Mounted weapons
Weapon items on the vehicle fire with d20 + gunner bonus + the weapon's own bonus; damage has no strength or training bonus. Attack cards have Defend buttons as usual.

## Modifications
Vehicle Modification items (armor, optional equipment, travel capabilities, accessories):
- **Armor** with a location installs itself when dropped: that location's A.R. and S.D.C. are set.
- **Extra Vehicle S.D.C.** (e.g. Ram-Prow +75) and **Control Roll Bonus** (e.g. Active Suspension +15%) apply automatically.
- Speed and effect notes are listed for reference.

## Devices
Plain vehicles can also carry Device items (Operate / Recharge). For a proper time machine, use the **Time Machine** actor.

## Air & space combat
Aircraft and spacecraft (type Air or Space, or any vehicle with a Speed Class or T.M.F.) get an **Air & Space Combat** panel (TMNT Guide to the Universe rules):
- **Drive** (helicopter, propeller airplane, jet, ion drive): sets the Emergency Landing penalty and how far the T.M.F. can be upgraded (7 / 8 / 8 / 10).
- **Speed Class** (0–50, with its top speed: 10 = 150 mph, 28 = Mach 1, 34 = Mach 5, 50 = trans-light). The **rated** Speed Class is always the bonus, whatever the current speed.
- **T.M.F.** (Transient Maneuvering Factor): how fast the vehicle answers its controls.
- **Payload** (lb): the Basic Aircraft Form's rating; it picks the crash damage row.
- **Air-to-Air %**: the pilot's Air-to-Air Combat skill, added to veer rolls (it can go over 100%).
- **Current Mach**: over Mach 5 in atmosphere, the Mach number is a penalty on control rolls and maneuvers.
- **In Space**: energy weapon ranges ×10 and projectile ranges ×2 (shown on the weapons).

Buttons (each tactic takes a full melee; opposed rolls, the GM compares):

| Button | Roll | Use |
|---|---|---|
| Dog Tail | d20 + Speed Class + T.M.F. | Get on (or stay on) the enemy's tail: the Dog Tail fires every weapon every round |
| Jink | d20 + Speed Class + T.M.F. | Dodge all fire this melee (doesn't shake a Dog Tail) |
| Roll-Over | d20 + Speed Class + T.M.F. | Take the advantage / shake a Dog Tail |
| Speed Escape | d20 + Speed Class + T.M.F. | Run: no firing, no dodges |
| Maneuver Escape | d20 + Speed Class | Leave combat and any Dog Tails |
| Dodge Ground Fire | d20 + Speed Class | |
| Dodge the Dog's Fire | d20 + T.M.F. | Also the dodge during a Roll-Over |
| Veer Off | d100 under Pilot skill + Air-to-Air − penalty | Chicken games: Mid-Air Ram, Dodge 'Em, Divebomber, Skimming Atmosphere (asks for the game and penalty; Skimming shows that round's damage) |
| Pull-Out | d20 under the T.M.F. | Divebomber: or crash at full speed |
| Emergency Landing | d100 under Pilot skill + drive penalty | Helicopter −30, jet −10, ion drive −50; hovering −15; over 720 mph −20. Failing still crashes at a third of the speed |
| Crash | By payload and speed | A die per 10 mph (per mph over 720): D6 under 1,000 lb up to 3D6 over 1,000,000 lb. Occupants take half with seat belts or a suit, double without; Apply buttons |
| Dumb Luck | d100 ≤ 20 | Thrown clear of any crash with only 4D6 |

Speed Class and T.M.F. upgrades are typed in; their prices, the Basic Aircraft Forms, weapons, armor and equipment are in the **Air & Space Vehicle Tables** journal of the TMNT compendium (with the armor and equipment as Vehicle Modification items you drop on the vehicle).

### Flying characters
Characters and NPCs with a **Flight** or **Glide** ability (or the "flies without a Flight ability" box on the Combat tab) get an **Air Combat** panel with the same tactics: **T.M.F. = P.P.**, and the Speed Class comes from the ability's speed (Flight 160 mph = 10, Glide 120 mph = 8) unless you type one. **Veer %** is the GM's call for flyers (the book gives them no pilot skill); an Air-to-Air Combat skill adds to it.

