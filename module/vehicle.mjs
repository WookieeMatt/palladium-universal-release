import { damageButtons, damageLines, defendingActors, postAttackCard } from "./combat.mjs";
import { postCard, signed } from "./dice.mjs";
import { deviceMalfunction } from "./timetravel.mjs";
import { playAnimation } from "./animations.mjs";

const { DialogV2 } = foundry.applications.api;

/**
 * Vehicles (Errata 2026 vehicle rules; Transdimensional p.54–59) and trans-dimensional devices (p.52–54).
 */

/* -------------------------------------------- */
/*  Damage                                      */
/* -------------------------------------------- */

/**
 * Apply damage to a vehicle. Strikes hit the hull unless the attacker declares another location
 * (Errata, TMNT-TA p.134). A location's armor absorbs Strikes below its A.R. while it has S.D.C.;
 * otherwise the damage goes to the vehicle's S.D.C. (0 = incapacitated, −S.D.C. = totaled).
 * @param {Actor} actor
 * @param {number} amount
 * @param {object} [options]
 * @param {number|null} [options.strike]
 * @param {"normal"|"half"|"hp"} [options.mode]   "hp" = straight to the vehicle's S.D.C.
 * @param {string} [options.location]             Asked for when omitted
 */
export async function applyVehicleDamage(actor, amount, { strike = null, mode = "normal", location } = {}) {
  const sys = actor.system;
  if ( mode === "half" ) amount = Math.floor(amount / 2);
  if ( !location && (mode !== "hp") ) {
    const options = Object.entries(CONFIG.PALLADIUM.VEHICLE_LOCATIONS).map(([k, l]) => `<option value="${k}">${l.label}</option>`).join("");
    location = await DialogV2.prompt({
      classes: ["palladium-universal", "pu-skill-mods"],
      window: { title: `${actor.name}: Location Hit` },
      content: `<div class="form-group"><label>Location</label><div class="form-fields"><select name="location">${options}</select></div></div>
        <p class="hint">Strikes hit the hull unless the attacker declared another exposed location.</p>`,
      ok: { label: "Apply", callback: (event, button) => button.form.elements.location.value },
      rejectClose: false
    });
    if ( !location ) return "Cancelled.";
  }
  location ??= "hull";
  const lines = [];
  const update = {};
  let remaining = amount;

  const loc = sys.locations[location];
  const baseAr = sys.ar ?? 0;
  if ( (mode !== "hp") && loc && (loc.ar > 0) && (loc.sdc.value > 0) && (strike !== null) && (strike < loc.ar) ) {
    const absorbed = Math.min(remaining, loc.sdc.value);
    const after = loc.sdc.value - absorbed;
    update[`system.locations.${location}.sdc.value`] = after;
    lines.push(`${CONFIG.PALLADIUM.VEHICLE_LOCATIONS[location].label} armor (A.R. ${loc.ar}) absorbs ${absorbed}: S.D.C. ${loc.sdc.value} → ${after}.`);
    if ( after <= 0 ) lines.push("That armor is destroyed.");
    remaining -= absorbed;
  }

  // The vehicle's own A.R.: Strikes below it that got past any location armor do nothing.
  if ( (remaining > 0) && (mode !== "hp") && (strike !== null) && (baseAr > 0) && (strike < baseAr) ) {
    lines.push(`Strike ${strike} is under the vehicle's A.R. ${baseAr}: no damage.`);
    remaining = 0;
  }

  if ( remaining > 0 ) {
    if ( (location === "crew") && (mode !== "hp") ) {
      lines.push(`${remaining} damage: ${CONFIG.PALLADIUM.VEHICLE_LOCATIONS.crew.text}`);
      remaining = 0;
    }
    else {
      const sdc = sys.health.sdc;
      const after = sdc.value - remaining;
      update["system.health.sdc.value"] = after;
      lines.push(`Vehicle S.D.C. ${sdc.value} → ${after}.`);
      if ( CONFIG.PALLADIUM.VEHICLE_LOCATIONS[location]?.text && (mode !== "hp") ) lines.push(CONFIG.PALLADIUM.VEHICLE_LOCATIONS[location].text);
      if ( (sdc.max > 0) && (after <= -sdc.max) ) lines.push(`<strong class="pu-failure">Totaled.</strong>`);
      else if ( (sdc.max > 0) && (after <= 0) ) lines.push(`<strong class="pu-failure">Incapacitated: needs major repairs.</strong>`);
    }
  }
  if ( !foundry.utils.isEmpty(update) ) await actor.update(update);
  return lines.join("<br>") || "No damage.";
}

/* -------------------------------------------- */
/*  Piloting                                    */
/* -------------------------------------------- */

/**
 * Control Roll: percentile under the pilot's skill + bonuses. Control Rolls don't cost an action;
 * each vehicle makes one maneuver per round (Errata 2026).
 * @param {Actor} actor
 */
export async function rollControl(actor) {
  const sys = actor.system;
  const target = sys.controlTarget;
  const roll = await new Roll("1d100").evaluate();
  const success = roll.total <= target;
  return postCard(actor, { title: "Control Roll", label: "Control", result: roll.total, rolls: [roll],
    lines: [["Pilot", sys.pilot || "—"], ["Chance", `${target}%`], ["d100", roll.total]],
    notes: [`<span class="${success ? "pu-success" : "pu-failure"}">${success ? "In control" : "Loses control"}</span>`,
      `<span class="hint">One maneuver per round (an action); Control Rolls are free.</span>`] });
}

/** Task difficulty (p.54): the GM gives +5% to +20% for easy tasks, −5% to −20% for hard ones. */
export const MANEUVER_DIFFICULTY = { "20": "Very easy (+20%)", "10": "Easy (+10%)", "0": "Normal (+0%)", "-10": "Hard (−10%)", "-20": "Very hard (−20%)" };

/**
 * A vehicle maneuver (TODO: the book's list of vehicle maneuvers is not in the system yet). The pilot describes
 * it, the GM sets the difficulty (task difficulty, p.54), and a Control Roll decides it; the GM rules what
 * success or failure means. Each vehicle makes one maneuver per round: in combat it spends the vehicle's action.
 * @param {Actor} actor
 * @param {object} [options]
 * @param {string} [options.name]      What the pilot tries (asked when missing)
 * @param {number} [options.modifier]  Difficulty modifier %
 */
export async function rollVehicleManeuver(actor, { name, modifier } = {}) {
  if ( name === undefined ) {
    const options = Object.entries(MANEUVER_DIFFICULTY).map(([v, l]) => `<option value="${v}"${v === "0" ? " selected" : ""}>${l}</option>`).join("");
    const data = await DialogV2.prompt({
      classes: ["palladium-universal", "pu-skill-mods"],
      window: { title: `${actor.name}: Maneuver` },
      content: `<div class="form-group"><label>Maneuver</label><div class="form-fields">
          <input type="text" name="name" list="pu-maneuvers" placeholder="What the pilot tries" autofocus>
          <datalist id="pu-maneuvers"><option value="Sharp turn"><option value="Chase / pursuit"><option value="Ram"><option value="Sideswipe"><option value="Jump"><option value="Bootlegger turn"><option value="Squeeze through a gap"></datalist></div></div>
        <div class="form-group"><label>Difficulty (GM)</label><div class="form-fields"><select name="difficulty">${options}</select></div></div>
        <div class="form-group"><label>Other modifier %</label><div class="form-fields"><input type="number" name="extra" value="0" step="5"></div></div>
        <p class="hint">The GM sets the difficulty (task difficulty, p.54) and decides what success or failure means.</p>`,
      ok: { label: "Roll", icon: "fa-solid fa-car-side", callback: (event, button) => {
        const f = button.form.elements;
        return { name: f.name.value.trim() || "Maneuver", modifier: Number(f.difficulty.value) + (Number(f.extra.value) || 0) };
      } },
      rejectClose: false
    });
    if ( !data ) return null;
    ({ name, modifier } = data);
  }
  modifier = Number(modifier) || 0;
  const sys = actor.system;
  const target = Math.max(0, sys.controlTarget + modifier);
  const roll = await new Roll("1d100").evaluate();
  const success = roll.total <= target;
  // The vehicle's one maneuver this round (its action in the Combat Tracker).
  const combatant = game.combat?.combatants?.find(c => c.actorId === actor.id);
  if ( combatant?.isOwner ) await combatant.setFlag("palladium-universal", "actionsUsed", (combatant.getFlag("palladium-universal", "actionsUsed") ?? 0) + 1);
  return postCard(actor, { title: `Maneuver: ${name}`, label: "Control", result: roll.total, rolls: [roll],
    lines: [["Pilot", sys.pilot || "—"], ["Control", `${sys.controlTarget}%`], ["Difficulty", `${signed(modifier)}%`], ["Chance", `${target}%`], ["d100", roll.total]],
    notes: [`<span class="${success ? "pu-success" : "pu-failure"}">${success ? "The maneuver works" : "The maneuver fails"}</span>`,
      `<span class="hint">${success ? "The GM rules the details (position gained, damage from a ram...)." : "The GM decides what happens: lost ground, a skid, a spin-out, a crash."} One maneuver per round; the Control Roll itself is free.</span>`] });
}

/**
 * The Evade: until its next maneuver, any Strike that doesn't meet or beat this roll misses (Errata, TMNT-TA p.136).
 * @param {Actor} actor
 */
export async function rollEvade(actor) {
  const bonus = actor.system.evadeBonus;
  const roll = await new Roll(`1d20 + ${bonus}`).evaluate();
  return postCard(actor, { title: "Evade", label: "Evade", result: roll.total, rolls: [roll],
    lines: [["d20", roll.dice[0].total], ["Pilot", signed(bonus)], ["Total", roll.total]],
    notes: [`<strong>Strikes must meet or beat ${roll.total}</strong> until the vehicle's next maneuver.`] });
}

/**
 * Fire a vehicle-mounted weapon: d20 + gunner bonus + the weapon's bonus.
 * @param {Actor} actor
 * @param {Item} weapon
 */
export async function rollVehicleAttack(actor, weapon) {
  const parts = { "Gunner": actor.system.gunnerBonus, "Weapon": weapon.system.strikeBonus };
  const bonus = parts.Gunner + parts.Weapon;
  const roll = await new Roll(`1d20 + ${bonus}`).evaluate();
  const natural = roll.dice[0].total;
  return postAttackCard(actor, roll, {
    title: weapon.name, item: weapon, parts, special: { crit: natural === 20, natural },
    flags: { vehicle: true, itemRef: weapon.id, ranged: !weapon.system.isMelee, weaponType: weapon.system.weaponType },
    damageLabel: natural === 20 ? "Roll Critical Damage (×2)" : "Roll Damage"
  });
}

/**
 * Damage for a vehicle-mounted weapon (no strength or training bonuses).
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {object} [options]
 */
export async function rollVehicleDamage(actor, weapon, { crit = false, strike = null } = {}) {
  const w = weapon.system;
  let formula = w.damageBonus ? `${w.damage || "0"} + ${w.damageBonus}` : (w.damage || "0");
  if ( crit ) formula = `(${formula}) * 2`;
  const roll = await new Roll(formula).evaluate();
  const flags = { "palladium-universal": { card: "damage", actorUuid: actor.uuid, damage: roll.total, strike, crit } };
  return postCard(actor, { title: `${weapon.name}: Damage${crit ? " (Critical ×2)" : ""}`, item: weapon, label: "Damage", result: roll.total,
    lines: damageLines(roll, w.damage || "0", { Weapon: w.damageBonus }, { mult: crit ? 2 : 1 }), rolls: [roll],
    buttons: damageButtons(), flags });
}

/* -------------------------------------------- */
/*  Devices                                     */
/* -------------------------------------------- */

/**
 * The best readout device assisting a device type (p.53: only one can assist at a time).
 * @param {object[]} readouts   {name, deviceType, assists, skillBonus}
 * @param {string} deviceType
 */
function bestReadout(readouts, deviceType) {
  return readouts.filter(r => (r.deviceType === "readout") && (r.assists === deviceType))
    .reduce((best, r) => (!best || (r.skillBonus > best.skillBonus)) ? r : best, null);
}

/** Readout devices owned as items by the given actors. */
function itemReadouts(actors) {
  return actors.flatMap(a => (a?.items ?? []).filter(i => i.type === "device").map(i => ({ name: i.name, ...i.system })));
}

/**
 * Roll to operate a trans-dimensional device: the operator must roll under their skill (+ the best
 * readout bonus); a failure is a malfunction, rolled on the device's malfunction table.
 * @param {object} options
 * @param {string} options.name       Device name
 * @param {object} options.data       {deviceType, skill, malfunction, malfunctionTable, maxArea, recharge}
 * @param {Actor} options.owner
 * @param {object[]} [options.readouts]
 * @param {string} [options.extra]    Extra card text
 * @returns {Promise<{success: boolean, malfunction: string}|null>}
 */
async function operate({ name, data, owner, readouts = [], extra = "", item }) {
  // The operator: a selected token's character, else the owner if it's a character.
  const selected = defendingActors().filter(a => !["vehicle", "timeMachine"].includes(a.type));
  const operator = selected[0] ?? (!["vehicle", "timeMachine"].includes(owner?.type) ? owner : null);
  let skill = 0;
  const skillLabel = data.skill || "Operation";
  const skillItem = operator?.items.find(i => (i.type === "skill") && data.skill && (i.name.toLowerCase() === data.skill.toLowerCase()));
  if ( skillItem ) skill = operator.system.skillPercentages(skillItem).primary;
  else {
    skill = await DialogV2.prompt({
      classes: ["palladium-universal", "pu-skill-mods"],
      window: { title: `Operate ${name}` },
      content: `<div class="form-group"><label>${skillLabel} %</label><div class="form-fields">
        <input type="number" name="skill" value="40" min="0" max="100" autofocus></div></div>`,
      ok: { label: "Roll", callback: (event, button) => Number(button.form.elements.skill.value) },
      rejectClose: false
    });
    if ( !Number.isFinite(skill) ) return null;
  }
  const readout = bestReadout([...readouts, ...itemReadouts([owner, operator])], data.deviceType);
  const bonus = readout?.skillBonus ?? 0;
  const target = Math.min(98, skill + bonus);
  const roll = await new Roll("1d100").evaluate();
  const success = roll.total <= target;
  const speaker = operator ?? owner;
  const table = success ? null : await deviceMalfunction(data.malfunctionTable);
  const notes = [`<span class="${success ? "pu-success" : "pu-failure"}">${success ? "Works" : "Malfunction!"}</span>`];
  if ( !success && data.malfunction ) notes.push(`<div class="pu-malfunction">${data.malfunction}</div>`);
  if ( table ) notes.push(table.html);
  playAnimation(owner?.getActiveTokens?.().length ? owner : speaker, item ?? { name }, { kind: "device" });
  await postCard(speaker, { title: `Operates ${name}`, item, label: "Operate", inlineRolls: true, result: roll.total,
    rolls: [roll, ...(table?.rolls ?? [])],
    lines: [[skillLabel, `${skill}%`], ...(readout ? [[readout.name, `+${bonus}%`]] : []), ["Chance", `${target}%`], ["d100", roll.total],
      ...(table?.rolls ?? []).map(r => ["Malfunction roll", r.total])],
    notes,
    body: `${extra ? `<p class="pu-text">${extra}</p>` : ""}${data.maxArea ? `<p class="pu-text">Max area: ${data.maxArea} · Recharge: ${data.recharge || "—"}</p>` : ""}` });
  return { success, malfunction: table?.html.replace(/<[^>]+>/g, "") ?? "" };
}

/**
 * Operate a device item (on a character or vehicle). The device then needs recharging.
 * @param {Item} device
 */
export async function operateDevice(device) {
  const d = device.system;
  if ( !d.charged ) return ui.notifications.warn(`${device.name} needs recharging (${d.recharge || "see its description"}).`);
  const result = await operate({ name: device.name, data: d, owner: device.parent, item: device });
  if ( result && device.isOwner ) await device.update({ "system.charged": false });
  return result?.success ?? null;
}

/**
 * Operate a Time Machine actor's installed device, assisted by its support devices. A jump is logged
 * and, on success, the machine arrives at its destination.
 * @param {Actor} actor   A "timeMachine" actor
 */
export async function operateTimeMachine(actor) {
  const sys = actor.system;
  const entry = sys.device;
  if ( !entry ) return ui.notifications.warn("Drop a Time Machine or Cross-Dimensional Device into the Installed Device slot first.");
  if ( !sys.charged ) return ui.notifications.warn(`${actor.name} needs recharging (${entry.recharge || "see the device"}).`);
  const from = sys.currentTime || "unknown";
  const to = sys.destination || "unknown";
  const result = await operate({ name: `${actor.name} (${entry.name})`, data: { ...entry, deviceType: entry.kind },
    owner: actor, readouts: sys.supportDevices.map(e => ({ ...e, deviceType: e.kind })), extra: `From ${from} to ${to}.` });
  if ( !result || !actor.isOwner ) return result?.success ?? null;
  const log = [...sys.toObject().jumpLog, { from, to, result: result.success ? "Arrived" : `Malfunction: ${result.malfunction}` }];
  const update = { "system.charged": false, "system.jumpLog": log.slice(-20) };
  if ( result.success && sys.destination ) Object.assign(update, { "system.currentTime": sys.destination, "system.destination": "" });
  await actor.update(update);
  return result.success;
}
