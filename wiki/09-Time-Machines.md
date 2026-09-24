# Time Machines

The **Time Machine** actor is a vehicle (everything in *Vehicles* applies) with a **Time Machine** panel on top.

## The panel
- **Current Time / Dimension** and **Destination**: free text, e.g. "Cycle Prime, 1988 A.D." and "Twist B, 1738 A.D.".
- **Status**: Charged or Needs recharging.
- **Total Cost**: the sum of every recorded device and installation cost (understands "$8 million", "$180,000", "$1.5 million").
- **Operate**, **Recharge** and **Mishap** buttons.
- **Jump log**: the last 20 jumps with their results.

## The three drop zones
Drag items from the sidebar or a compendium onto the zones. **Each dropped item is recorded as a data entry (a copy), not an owned item**; removing the original doesn't affect the machine. Each entry shows name, details and cost; **✕** removes it; clicking the name opens the original item if it still exists.

| Zone | Accepts | Notes |
|---|---|---|
| **Installed Time Device** | Device items of type Time Machine or Cross-Dimensional Device | Holds one; a new one replaces it |
| **Temporal Support Devices** | Readout devices (ARD, T.E. Feelie, Q-Dump, Dee-Cee-Dee, Triple-D, beacons) | Any number |
| **Installation Cost Records** | Installation Cost items | Any number |

Items dropped on the wrong zone, or anywhere else on the sheet, are sorted into the right one. Other items (weapons, modifications) are owned by the machine as usual.

## Operating
1. Set the **Destination**.
2. **Select the operator's token** (a character). If the operator owns a skill whose name matches the device's *Operator Skill* (e.g. "Pilot Time Machine"), its % is used; otherwise a prompt asks for the %.
3. Click **Operate**. The roll must be **under the skill + the best support device's bonus** (only one readout can assist a jump; readouts must *assist* the right device type).
4. **Success**: the machine arrives, Current Time becomes the Destination, and the jump is logged.
   **Failure**: a malfunction. The device's text is shown and its **malfunction table** is rolled: the *Temporal Mishap Table* for time machines, or the Gateway Generator / Portable / Miniature cross-dimensional tables. The machine stays where it was and the log records the mishap.
5. Either way the machine needs **Recharge** (the device's recharge time is in the tooltip).

## Building one
Typical workflow: create a Time Machine actor with the base vehicle's S.D.C., A.R. and speed; drop in the device, support devices and installation record; drop vehicle armor modifications (they install on their locations); add mounted weapons. The total cost updates as you go.
