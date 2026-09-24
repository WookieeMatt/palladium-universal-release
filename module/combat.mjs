import { bonusLines, cardHeader, decodeItem, postCard, signed } from "./dice.mjs";
import { onMagicCardButton, rollChangeSave } from "./magic.mjs";
import { applyTeChange, rollTemporalMishap } from "./timetravel.mjs";
import { applyVehicleDamage, rollVehicleDamage } from "./vehicle.mjs";
import { spendActions } from "./actions.mjs";
import { viewItemCopy } from "./item-rolls.mjs";
import { playAnimation } from "./animations.mjs";

const { DialogV2 } = foundry.applications.api;

/**
 * Weapon attacks, damage rolls and damage application.
 * All rolls are posted with real Roll objects so Dice So Nice animates them.
 */

/** Modern fire modes (p.61, p.89). Untrained values apply without a matching WP. */
export const FIRE_MODES = {
  aimed: { label: "Aimed", untrained: 0 },
  burst: { label: "Burst", untrained: -3 },
  wild: { label: "Wild Burst", untrained: -6 }
};

/** Black powder fire modes (Transdimensional p.67): no bursts; "long" = just beyond effective range. */
export const POWDER_MODES = {
  aimed: { label: "Aimed" },
  wild: { label: "Wild" },
  long: { label: "Beyond Range" }
};

/** Melee modes: Leap Attack needs the Combat Training unlock (p.88). */
export const MELEE_MODES = {
  aimed: { label: "Attack" },
  leap: { label: "Leap Attack", requires: "leapAttack" }
};

/** The GM's weather setting for black powder misfires. */
export function powderWeather() {
  try { return CONFIG.PALLADIUM.POWDER_WEATHER[game.settings.get("palladium-universal", "powderWeather")] ?? CONFIG.PALLADIUM.POWDER_WEATHER.dry; }
  catch { return CONFIG.PALLADIUM.POWDER_WEATHER.dry; }
}

/**
 * Misfire chance for a black powder weapon: the weapon's rate + weather + deliberate overload.
 * @param {Item} weapon
 */
export function misfireChance(weapon) {
  const p = weapon.system.powder;
  return p.misfire + powderWeather().misfire + (p.overload ? CONFIG.PALLADIUM.OVERLOAD.misfire : 0);
}

/* -------------------------------------------- */
/*  Chat card helpers                           */
/* -------------------------------------------- */

export { cardHeader };

/**
 * Detail rows for a damage roll: the weapon's dice, each bonus, halving and multipliers, the total.
 * @param {Roll} roll
 * @param {string} base      The weapon's dice formula
 * @param {object} parts     Labelled bonuses
 * @param {object} [opts]    {half, mult}
 */
export function damageLines(roll, base, parts = {}, { half = false, mult = 1 } = {}) {
  const dice = (roll.dice ?? []).reduce((n, d) => n + d.total, 0);
  return [
    [`Dice ${String(base).toUpperCase()}`, dice],
    ...bonusLines(parts),
    ...(half ? [["Beyond range", "½"]] : []),
    ...(mult > 1 ? [["Multiplier", `×${mult}`]] : []),
    ["Total", roll.total]
  ];
}

/* -------------------------------------------- */
/*  Attack                                      */
/* -------------------------------------------- */

/**
 * Work out the Strike bonus for a weapon attack.
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {string} [mode]   Fire mode for modern weapons
 * @returns {{bonus: number, parts: object, proficient: boolean}}
 */
export function strikeBonus(actor, weapon, mode = "aimed") {
  const sys = actor.system;
  const w = weapon.system;
  const wp = sys.proficiencyFor(weapon);
  const wpBonus = wp?.system.bonusesAt(sys.identity.level) ?? {};
  const effects = sys.weaponEffects(weapon);
  const stunned = sys.combat.conditions.stunned;
  const parts = {};

  if ( w.isMelee ) {
    // Melee: training + PP + skills + WP (p.86 "Bonus to Strike (Melee)").
    parts["Combat"] = sys.combat.totals.strike;
    if ( (w.weaponType !== "natural") && !stunned ) parts["WP"] = wpBonus.strike ?? 0;
  }
  else if ( w.isPowder ) {
    // Black powder (Transdimensional p.67): Aimed bonus by W.P. family; no P.P. bonus.
    const lock = CONFIG.PALLADIUM.POWDER_LOCKS[w.powder.lock] ?? {};
    if ( mode === "wild" ) parts["Wild"] = wp ? 0 : (lock.clumsy ? -8 : -6);
    else parts["Aimed (WP)"] = wp ? (stunned ? 0 : (wpBonus.aimed ?? 0)) : (lock.clumsy ? -3 : 0);
    if ( mode === "long" ) parts["Beyond range"] = CONFIG.PALLADIUM.powderLongRange(w.powder.lock, w.powder.longarm).strike;
  }
  else if ( w.isModern ) {
    // Modern: WP mode bonus only; untrained penalties otherwise (p.61).
    const m = FIRE_MODES[mode] ?? FIRE_MODES.aimed;
    const untrained = wp ? 0 : m.untrained;
    parts[`${m.label} (WP)`] = stunned ? Math.min(0, untrained) : (wp ? (wpBonus[mode] ?? 0) : untrained);
  }
  else {
    // Thrown and bows: PP + WP Targeting (p.89).
    parts["P.P."] = stunned ? 0 : sys.bonuses.pp.ppCombat;
    parts["WP"] = stunned ? 0 : (wpBonus.rangedStrike ?? 0);
  }
  // Human Features (e.g. Partial Hands −4 Strike with hand-held weapons, p.18).
  if ( !["natural", "explosive"].includes(w.weaponType) ) {
    const hands = sys.itemEffects.totals["handheld.strike"] ?? 0;
    if ( hands ) parts["Hands"] = hands;
  }
  if ( !w.isMelee ) {
    // Melee totals already include circumstances and conditions.
    parts["Circumstance"] = sys.combat.circ.strike;
    parts["Conditions"] = sys.combat.conditions.mods.strike ?? 0;
  }
  parts["Weapon"] = stunned ? Math.min(0, w.strikeBonus) : w.strikeBonus;
  parts["Skills"] = stunned ? 0 : effects.strike;
  Hooks.callAll("palladium.strikeBonus", actor, weapon, { mode, parts });

  const bonus = Object.values(parts).reduce((a, b) => a + b, 0);
  return { bonus, parts, proficient: !!wp };
}

/**
 * Roll an attack with a weapon and post it to chat, with a button to roll damage.
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {string} [mode="aimed"]
 */
export async function rollAttack(actor, weapon, mode = "aimed") {
  const w = weapon.system;
  if ( w.isModern && (mode !== "aimed") && !w.burstDamage ) mode = "aimed";
  if ( w.isPowder && !(mode in POWDER_MODES) ) mode = "aimed";
  if ( (mode === "leap") && (!w.isMelee || !actor.system.combat.trainingData.unlocks.includes("leapAttack")) ) {
    return ui.notifications.warn(`${actor.name}'s Combat Training hasn't unlocked Leap Attack.`);
  }
  const hookOptions = { mode };
  if ( Hooks.call("palladium.preRollAttack", actor, weapon, hookOptions) === false ) return null;
  mode = hookOptions.mode;

  // Actions: Leap Attack uses two; a black powder Aimed shot without the W.P. counts as two attacks.
  const wp = actor.system.proficiencyFor(weapon);
  const cost = ((mode === "leap") || (w.isPowder && !wp && (mode !== "wild"))) ? 2 : 1;
  const actionNote = await spendActions(actor, cost, `${weapon.name}`);

  // Black powder: roll for a misfire before the Strike (p.68).
  let double = false;
  const extra = [];
  if ( w.isPowder ) {
    const mishap = await rollMisfire(actor, weapon);
    if ( mishap && (mishap.key !== "overloaded") ) return null;
    if ( mishap ) double = true;
    if ( !wp && (mode !== "wild") ) extra.push(`<span class="hint">No W.P.: a careful Aimed shot counts as two attacks.</span>`);
    if ( mode === "long" ) extra.push(`<span class="hint">${CONFIG.PALLADIUM.powderLongRange(w.powder.lock, w.powder.longarm).text}</span>`);
    if ( w.powder.overload && (!wp || (wp.system.powderLock === "general")) ) {
      extra.push(`<span class="hint">Deliberate overloading needs the weapon's own W.P.</span>`);
    }
  }

  const { bonus, parts } = strikeBonus(actor, weapon, mode);
  const roll = await new Roll(`1d20 + ${bonus}`).evaluate();
  const natural = roll.dice[0].total;
  const special = naturalSpecials(actor, natural, w.isMelee);
  const modeLabel = w.isModern ? ` (${FIRE_MODES[mode].label})` : w.isPowder ? ` (${POWDER_MODES[mode].label})` : "";
  if ( mode === "wild" ) extra.push(w.isPowder ? `<span class="hint">Shooting wild.</span>`
    : `<span class="hint">20% chance of hitting a bystander.</span>`);
  if ( double ) extra.push(`<strong class="pu-crit">Overloaded: double damage.</strong>`);
  const leap = mode === "leap";
  if ( leap ) extra.push(`<span class="hint">Leap Attack: only at the start of the round and the only offensive action this round; double damage (triple on a Critical or Death Blow). Remaining actions: Parry, Dodge, Roll with Impact or Change Posture only.</span>`);
  if ( actionNote ) extra.push(actionNote);
  const mult = damageMultiplier({ crit: special.crit, deathBlow: special.deathBlow, double, leap });
  const label = special.deathBlow ? `Roll Death Blow (×${mult} to Hit Points)` : (mult > 1) ? `Roll Damage (×${mult})` : "Roll Damage";
  const message = await postAttackCard(actor, roll, {
    title: `${weapon.name}${leap ? " (Leap Attack)" : modeLabel}`, item: weapon, parts, special, extra,
    flags: { itemRef: weapon.id, mode, ranged: !w.isMelee, weaponType: w.weaponType, deathBlow: special.deathBlow, double, leap },
    damageLabel: label
  });
  Hooks.callAll("palladium.rollAttack", actor, weapon, roll, { mode, natural, special, double, leap, message });
  return message;
}

/**
 * Damage multiplier: Critical ×2 (Natural crits, Death Blow, overloaded black powder); a Leap Attack
 * doubles damage, or triples it with a Critical Strike or Death Blow (p.88).
 */
export function damageMultiplier({ crit = false, deathBlow = false, double = false, leap = false } = {}) {
  if ( leap ) return (crit || deathBlow) ? 3 : 2;
  return (crit || deathBlow || double) ? 2 : 1;
}

/**
 * Roll for a black powder misfire (p.68). On a misfire, rolls on the Mishaps table and posts the result.
 * @param {Actor} actor
 * @param {Item} weapon
 * @returns {Promise<object|null>}  The mishap, or null if the gun fires
 */
export async function rollMisfire(actor, weapon) {
  const chance = misfireChance(weapon);
  if ( chance <= 0 ) return null;
  const check = await new Roll("1d100").evaluate();
  if ( check.total > chance ) return null;
  const table = await new Roll("1d100").evaluate();
  const mishap = CONFIG.PALLADIUM.mishapFor(table.total);
  const buttons = [];
  if ( mishap.key === "overloaded" ) buttons.push(["1D6", "Shooter takes 1D6"]);
  if ( mishap.key === "explosion" ) buttons.push(["2D6", "Shooter takes 2D6"]);
  await postCard(actor, {
    title: `${weapon.name}: Misfire!`, item: weapon, label: "Mishap", inlineRolls: true, result: mishap.label, rolls: [check, table],
    lines: [["Misfire chance", `${chance}%`], ["Misfire roll", check.total], ["Mishap roll", table.total]],
    notes: [`<span class="pu-failure">${mishap.text}</span>`],
    buttons: buttons.map(([f, l]) => `<div class="pu-buttons"><button type="button" data-pu-action="self-damage" data-formula="${f}">
      <i class="fa-solid fa-burst"></i> ${l}</button></div>`).join(""),
    flags: { "palladium-universal": { card: "mishap", actorUuid: actor.uuid } }
  });
  if ( ["overloaded", "explosion"].includes(mishap.key) && actor.isOwner ) {
    await weapon.update({ "system.equipped": false, name: `${weapon.name} (destroyed)` });
  }
  return mishap;
}

/**
 * Natural-roll specials for an attack: Critical Strike on the character's crit range; melee
 * Critical-or-Stun and Death Blow from Combat Training (p.84, p.87).
 * @param {Actor} actor
 * @param {number} natural
 * @param {boolean} melee
 */
export function naturalSpecials(actor, natural, melee) {
  const c = actor.system.combat;
  const t = c.trainingData;
  const deathBlow = melee && !!t.deathBlow && (natural >= t.deathBlow);
  const critOrStun = melee && !!t.critOrStun && (natural >= t.critOrStun);
  const crit = (natural >= c.critRange) || critOrStun || deathBlow;
  return { crit, critOrStun, deathBlow, natural };
}

/**
 * Post an attack (or maneuver) card: the Strike result, defend buttons and an optional damage button.
 * @param {Actor} actor
 * @param {Roll} roll
 * @param {object} options
 */
export async function postAttackCard(actor, roll, { title, parts, special, extra = [], flags = {}, damageLabel, text = "", item } = {}) {
  const { crit, critOrStun, deathBlow, natural } = special;
  const hit = crit || (roll.total >= 5);   // 4 or less misses (p.84)
  const notes = [];
  if ( deathBlow ) notes.push(`<strong class="pu-crit">Natural ${natural}: Death Blow! Double damage direct to Hit Points, bypassing armor.</strong>`);
  else if ( critOrStun ) notes.push(`<strong class="pu-crit">Natural ${natural}: Critical Strike or Stun (attacker's choice)!</strong>`);
  else if ( crit ) notes.push(`<strong class="pu-crit">Natural ${natural}: Critical Strike!</strong>`);
  if ( crit ) notes.push(`<span class="hint">Only a natural ${natural}+ can defend.</span>`);
  if ( natural === 1 ) notes.push(`<strong class="pu-fumble">Natural 1</strong>`);
  notes.push(hit ? `<span class="pu-success">Hits unless the defender meets or beats ${roll.total}</span>`
    : `<span class="pu-failure">Miss (4 or less)</span>`);
  notes.push(...extra);

  const data = { card: "attack", actorUuid: actor.uuid, strike: roll.total, natural, crit, ...flags };
  // Automated Animations: the weapon (or the maneuver) swings, hitting or missing the targets.
  playAnimation(actor, item ?? { name: title }, { kind: flags.maneuver ? "maneuver" : flags.weaponType, hit });
  return postCard(actor, {
    title, item, label: "Strike", result: roll.total, rolls: [roll], notes,
    lines: [["d20", natural], ...bonusLines(parts), ["Total", roll.total]],
    body: text ? `<p class="pu-text">${text}</p>` : "",
    buttons: `${hit ? defendButtons(data) : ""}${hit && damageLabel ? `<div class="pu-buttons"><button type="button" data-pu-action="damage">
      <i class="fa-solid fa-burst"></i> ${damageLabel}</button></div>` : ""}`,
    flags: { "palladium-universal": data }
  });
}

/** Reaction buttons for an attack card. Ranged attacks can't be entangled, disarmed or thrown. */
function defendButtons(data) {
  const buttons = Object.entries(CONFIG.PALLADIUM.REACTIONS).filter(([key, r]) => {
    if ( r.melee && data.ranged ) return false;
    if ( (key === "rollImpact") && CONFIG.PALLADIUM.NO_ROLL_WITH_IMPACT.includes(data.weaponType) ) return false;
    return true;
  }).map(([key, r]) => `<button type="button" data-pu-action="defend" data-reaction="${key}"
    data-tooltip="Defend with the selected token">
    <i class="fa-solid ${r.icon}"></i> ${r.label}</button>`);
  return `<div class="pu-buttons pu-defend"><span class="pu-label">Defend:</span>${buttons.join("")}</div>`;
}

/* -------------------------------------------- */
/*  Maneuvers                                   */
/* -------------------------------------------- */

/** Unarmed humanoid damage (p.86). */
export const UNARMED_DAMAGE = "1D4";

/**
 * Roll a combat maneuver (Hold, Entangle, Tackle, Throw) with the melee Strike bonus.
 * @param {Actor} actor
 * @param {string} key   A CONFIG.PALLADIUM.MANEUVERS key
 */
export async function rollManeuver(actor, key) {
  const m = CONFIG.PALLADIUM.MANEUVERS[key];
  if ( !m ) return;
  const c = actor.system.combat;
  if ( m.requires && !c.trainingData.unlocks.includes(m.requires) ) {
    return ui.notifications.warn(`${actor.name}'s Combat Training hasn't unlocked ${m.label}.`);
  }
  const actionNote = await spendActions(actor, m.actions ?? 1, m.label);
  const roll = await new Roll(`1d20 + ${c.totals.strike}`).evaluate();
  const natural = roll.dice[0].total;
  const special = naturalSpecials(actor, natural, true);
  const parts = { "Strike": c.totals.strike };
  return postAttackCard(actor, roll, {
    title: m.label, parts, special, text: m.text, extra: actionNote ? [actionNote] : [],
    flags: { maneuver: key, ranged: false, weaponType: "unarmed", deathBlow: special.deathBlow, leap: !!m.leap },
    damageLabel: m.damage ? (() => {
      const mult = damageMultiplier({ crit: special.crit, deathBlow: special.deathBlow, leap: !!m.leap });
      return mult > 1 ? `Roll Unarmed Damage (×${mult})` : "Roll Unarmed Damage";
    })() : null
  });
}

/**
 * Roll unarmed damage (Tackle, Throw) with Combat damage bonuses.
 * @param {Actor} actor
 * @param {object} [options]
 */
export async function rollUnarmedDamage(actor, { crit = false, strike = null, label = "Unarmed", deathBlow = false,
  leap = false } = {}) {
  const parts = { "Combat": actor.system.combat.totals.damage };
  let formula = parts.Combat ? `${UNARMED_DAMAGE} + ${parts.Combat}` : UNARMED_DAMAGE;
  const mult = damageMultiplier({ crit, deathBlow, leap });
  if ( mult > 1 ) formula = `(${formula}) * ${mult}`;
  const roll = await new Roll(formula).evaluate();
  const flags = { "palladium-universal": { card: "damage", actorUuid: actor.uuid, damage: roll.total, strike, crit } };
  return postCard(actor, { title: `${label}: Damage${mult > 1 ? ` (×${mult})` : ""}`, label: "Damage", result: roll.total,
    lines: damageLines(roll, UNARMED_DAMAGE, parts, { mult }), rolls: [roll], buttons: damageButtons(), flags });
}

/* -------------------------------------------- */
/*  Reactions                                   */
/* -------------------------------------------- */

/**
 * Roll a Reaction against an attack card (p.84, p.87–89; Errata 2026): success = meet or beat the
 * Strike roll; against a natural critical (or Death Blow, Stun), a natural equal or higher is needed.
 * @param {Actor} defender
 * @param {string} key          A CONFIG.PALLADIUM.REACTIONS key
 * @param {object} attack       The attack card's flags
 * @param {string} attackerName
 */
export async function rollDefense(defender, key, attack, attackerName = "the attacker") {
  const r = CONFIG.PALLADIUM.REACTIONS[key];
  const sys = defender.system;
  const c = sys.combat;
  if ( !c ) return ui.notifications.warn(`${defender.name} can't react.`);
  if ( c.conditions.noDefense.length ) {
    return ui.notifications.warn(`${defender.name} can't react while ${c.conditions.noDefense.join(", ")}.`);
  }
  if ( r.requires && !c.trainingData.unlocks.includes(r.requires) ) {
    return ui.notifications.warn(`${defender.name}'s Combat Training hasn't unlocked ${r.label} as a Reaction.`);
  }
  if ( (key === "parry") && attack.ranged && !sys.health.shield ) {
    return ui.notifications.warn("Ranged attacks can't be Parried without a shield: Dodge instead.");
  }
  if ( (key === "rollImpact") && CONFIG.PALLADIUM.NO_ROLL_WITH_IMPACT.includes(attack.weaponType) ) {
    return ui.notifications.warn("You can't Roll with Impact against bullets or energy blasts.");
  }

  const hookOptions = { attack, attackerName };
  if ( Hooks.call("palladium.preRollDefense", defender, key, hookOptions) === false ) return null;
  const bonus = c.totals[r.total];
  const roll = await new Roll(`1d20 + ${bonus}`).evaluate();
  const natural = roll.dice[0].total;
  let success;
  let rule;
  if ( attack.crit ) {
    success = natural >= attack.natural;
    rule = `needs a natural ${attack.natural}+ against a natural critical`;
  }
  else {
    success = (natural === 20) || (roll.total >= attack.strike);
    rule = `needs ${attack.strike}+`;
  }

  const notes = [`<span class="${success ? "pu-success" : "pu-failure"}">${success ? "Success" : "Failure"} (${rule})</span>`];
  if ( natural === 20 ) notes.unshift(`<strong class="pu-crit">Natural 20!</strong>`);
  if ( success ) {
    const outcome = {
      parry: "The attack is parried: no damage.",
      dodge: "The attack is dodged: no damage.",
      rollImpact: "Half damage (use Apply ½), and Stun attacks don't stun.",
      entangle: "The attacking limb or weapon is entangled: it can't be used until released or it breaks free. You're +5 to Hold it later.",
      disarm: `The weapon is knocked away${natural >= c.critRange ? " — and a Critical lets you take it" : ""}.`,
      throw: "The attacker is thrown: knocked Prone and loses the Initiative."
    }[key];
    notes.push(`<span>${outcome}</span>`);
  }
  const usesAction = r.usesAction || ((key === "parry") && !c.trainingData.autoParry);
  if ( usesAction ) notes.push(await spendActions(defender, 1, r.label));
  if ( sys.combat.conditions.active.includes("shocked") ) {
    notes.push(`<span class="hint">Horrified: can't Parry or Dodge the first attack this round.</span>`);
  }

  const message = await postCard(defender, {
    title: `${r.label} vs ${attackerName}`, label: r.label, result: roll.total, rolls: [roll], notes,
    lines: [["d20", natural], ...bonusLines(c.rollBreakdown[r.total] ?? { Bonus: bonus }), ["Total", roll.total]]
  });
  Hooks.callAll("palladium.rollDefense", defender, key, roll, { attack, success, natural, message });
  return success;
}

/* -------------------------------------------- */
/*  Horror Factor                               */
/* -------------------------------------------- */

/**
 * Horror Factor save (Transdimensional p.89): d20 + save vs Strangeness bonus must roll ABOVE the H.F.
 * Failure: stunned for one melee round — loses the Initiative, can't Parry or Dodge the first attack,
 * loses one action (applied as the "Horrified" condition).
 * @param {Actor} actor
 * @param {number|null} [hf]   Horror Factor; asked for when omitted
 * @param {string} [source]    What caused it
 */
export async function rollHorrorFactor(actor, hf = null, source = "") {
  if ( !Number.isFinite(hf) ) {
    hf = await DialogV2.prompt({
      window: { title: `${actor.name}: Horror Factor` },
      content: `<div class="form-group"><label>Horror Factor</label>
        <div class="form-fields"><input type="number" name="hf" value="12" min="1" max="30" autofocus></div></div>`,
      ok: { label: "Roll", callback: (event, button) => Number(button.form.elements.hf.value) },
      rejectClose: false
    });
    if ( !Number.isFinite(hf) ) return null;
  }
  const save = actor.system.saves.totals.strangeness;
  const roll = await new Roll(`1d20 + ${save.bonus}`).evaluate();
  const saved = CONFIG.PALLADIUM.horrorSaved(roll.total, hf);
  const notes = [`<span class="${saved ? "pu-success" : "pu-failure"}">${saved ? "Keeps their nerve" : "Horrified!"}
    (needs over ${hf})</span>`];
  if ( !saved ) notes.push(`<span>${CONFIG.PALLADIUM.CONDITIONS.shocked.text}</span>`);
  await postCard(actor, { title: `Horror Factor ${hf}${source ? `: ${source}` : ""}`, label: "Save", result: roll.total,
    lines: [["d20", roll.dice[0].total], ["Save vs Strangeness", signed(save.bonus)], ["Total", roll.total], ["Needs over", hf]],
    notes, rolls: [roll] });
  if ( !saved ) await applyHorrified(actor);
  return saved;
}

/**
 * Post a Horror Factor card for a creature: selected tokens click to save against it.
 * @param {Actor} actor   The frightening creature
 */
export function requestHorrorSaves(actor) {
  const hf = actor.system.horrorFactor;
  const flags = { "palladium-universal": { card: "horror", actorUuid: actor.uuid, hf, source: actor.name } };
  return postCard(actor, { title: `Horror Factor ${hf}`, flags,
    body: `<p class="pu-text">Everyone who sees ${actor.name} must roll above ${hf} (d20 + save vs Strangeness) or be Horrified for one round.</p>`,
    buttons: `<div class="pu-buttons"><button type="button" data-pu-action="horror-save"><i class="fa-solid fa-ghost"></i> Save vs H.F. ${hf}</button></div>` });
}

/** Apply the Horrified condition and drop the actor to the bottom of the Initiative order. */
async function applyHorrified(actor) {
  if ( actor.isOwner ) await actor.toggleStatusEffect("shocked", { active: true });
  const combat = game.combat;
  const combatants = combat?.combatants.filter(c => c.actor === actor && c.isOwner) ?? [];
  if ( !combatants.length ) return;
  const lowest = Math.min(...combat.combatants.map(c => c.initiative ?? 0));
  for ( const c of combatants ) {
    if ( c.initiative !== null ) await c.update({ initiative: lowest - 1 });
  }
}

/* -------------------------------------------- */
/*  Damage                                      */
/* -------------------------------------------- */

/**
 * Roll damage for a weapon.
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {object} [options]
 * @param {boolean} [options.crit]   Double the damage, after bonuses (p.84)
 * @param {string} [options.mode]    Fire mode (burst uses burst damage)
 * @param {number} [options.strike]  The Strike roll total, used to resolve armor
 */
export async function rollDamage(actor, weapon, { crit = false, mode = "aimed", strike = null, deathBlow = false,
  double = false, leap = false } = {}) {
  const w = weapon.system;
  const sys = actor.system;
  const effects = sys.weaponEffects(weapon);
  let base = (w.isModern && (mode !== "aimed") && w.burstDamage) ? w.burstDamage : (w.damage || "0");
  const parts = {};
  if ( w.addsStrengthDamage ) parts["Combat"] = sys.combat.totals.damage;
  parts["Weapon"] = w.damageBonus;
  parts["Skills"] = effects.damage;
  const notes = [];
  let half = false;
  if ( w.isPowder ) {
    // Deliberate Overloading: +2D6 pistol / +3D6 rifle (p.68).
    if ( w.powder.overload ) base = `${base} + ${w.powder.longarm ? CONFIG.PALLADIUM.OVERLOAD.rifle : CONFIG.PALLADIUM.OVERLOAD.pistol}`;
    if ( mode === "long" ) {
      const long = CONFIG.PALLADIUM.powderLongRange(w.powder.lock, w.powder.longarm);
      if ( long.damage ) parts["Beyond range"] = long.damage;
      half = !!long.half;
    }
    notes.push(`Penetration ${CONFIG.PALLADIUM.PENETRATION[w.powder.penetration]}`);
  }
  const hookData = { base, parts, notes, crit, mode, strike, deathBlow, double, leap };
  if ( Hooks.call("palladium.preRollDamage", actor, weapon, hookData) === false ) return null;
  base = hookData.base;
  const bonus = Object.values(parts).reduce((a, b) => a + b, 0);

  let formula = bonus ? `${base} + ${bonus}` : base;
  if ( half ) formula = `floor((${formula}) / 2)`;
  if ( bonus < 0 ) formula = `max(0, ${formula})`;
  const mult = damageMultiplier({ crit, deathBlow, double, leap });
  if ( mult > 1 ) formula = `(${formula}) * ${mult}`;
  const roll = await new Roll(formula).evaluate();

  const flags = { "palladium-universal": { card: "damage", actorUuid: actor.uuid, itemRef: weapon.id,
    damage: roll.total, strike, crit, deathBlow } };
  const title = deathBlow ? `Death Blow (×${mult}, to Hit Points)` : leap ? `Leap Attack Damage (×${mult})`
    : crit ? "Damage (Critical ×2)" : double ? "Damage (×2)" : "Damage";
  const cardNotes = [];
  if ( deathBlow ) cardNotes.push(`<span class="hint">A Death Blow bypasses all armor: use To HP.</span>`);
  if ( notes.length ) cardNotes.push(`<span class="hint">${notes.join(" · ")}</span>`);
  const message = await postCard(actor, { title: `${weapon.name}: ${title}`, item: weapon, label: "Damage", result: roll.total,
    lines: damageLines(roll, base, parts, { half, mult }), notes: cardNotes, rolls: [roll], buttons: damageButtons(), flags });
  Hooks.callAll("palladium.rollDamage", actor, weapon, roll, { crit, mode, strike, deathBlow, double, leap, message });
  return message;
}

/** Buttons that apply a damage card to the targeted or selected tokens. */
export function damageButtons() {
  return `<div class="pu-buttons">
    <button type="button" data-pu-action="apply" data-tooltip="Resolve against armor, then S.D.C., then Hit Points">
      <i class="fa-solid fa-shield-halved"></i> Apply</button>
    <button type="button" data-pu-action="apply-half" data-tooltip="Successful Roll with Impact: half damage">
      <i class="fa-solid fa-person-falling"></i> Apply ½</button>
    <button type="button" data-pu-action="apply-hp" data-tooltip="Direct to Hit Points (Death Blow, toxins...)">
      <i class="fa-solid fa-heart-crack"></i> To HP</button>
  </div>`;
}

/* -------------------------------------------- */
/*  Applying damage                             */
/* -------------------------------------------- */

/**
 * Apply damage to an actor, resolving armor by the Strike roll (p.84, p.86; "equal or beat" ruling):
 *  - Strike < Natural A.R.: absorbed by natural armor, no damage.
 *  - Strike < Body Armor A.R. (armor has S.D.C.): damages the armor's S.D.C.
 *  - Otherwise: the character's S.D.C., then Hit Points.
 * Without a Strike roll, damage goes straight to S.D.C. then Hit Points.
 * @param {Actor} actor
 * @param {number} amount
 * @param {object} [options]
 * @param {number|null} [options.strike]
 * @param {"normal"|"half"|"hp"} [options.mode="normal"]
 * @returns {Promise<string>}  A description of what absorbed the damage
 */
export async function applyDamage(actor, amount, { strike = null, mode = "normal" } = {}) {
  const hookData = { amount, strike, mode };
  if ( Hooks.call("palladium.preApplyDamage", actor, hookData) === false ) return "Damage cancelled.";
  ({ amount, strike, mode } = hookData);
  const result = await resolveDamage(actor, amount, { strike, mode });
  Hooks.callAll("palladium.applyDamage", actor, { amount, strike, mode, result });
  return result;
}

/** Resolve damage against armor, S.D.C. and Hit Points (see applyDamage). */
async function resolveDamage(actor, amount, { strike, mode }) {
  if ( ["vehicle", "timeMachine"].includes(actor.type) ) return applyVehicleDamage(actor, amount, { strike, mode });
  const sys = actor.system;
  const h = sys.health;
  if ( mode === "half" ) amount = Math.floor(amount / 2);
  const lines = [];
  const actorUpdate = {};
  let remaining = amount;

  if ( mode !== "hp" ) {
    const natAR = h.naturalArmor.total;
    const armor = h.armor.active;
    const armorUp = armor.ar > 0 && armor.sdc.value > 0;

    if ( (strike !== null) && armorUp && (strike < armor.ar) ) {
      if ( natAR && (strike < natAR) ) {
        lines.push(`Strike ${strike} is under Natural A.R. ${natAR}: no damage.`);
        remaining = 0;
      }
      else {
        const absorbed = Math.min(remaining, armor.sdc.value);
        const after = armor.sdc.value - absorbed;
        if ( h.armor.item ) await h.armor.item.update({ "system.sdc.value": after });
        else actorUpdate["system.health.armor.sdc.value"] = after;
        lines.push(`${armor.name || "Body Armor"} (A.R. ${armor.ar}) absorbs ${absorbed}: S.D.C. ${armor.sdc.value} → ${after}.`);
        remaining -= absorbed;
        if ( after <= 0 ) lines.push(`${armor.name || "Body Armor"} is destroyed.`);
      }
    }
    else if ( (strike !== null) && natAR && (strike < natAR) ) {
      lines.push(`Strike ${strike} is under Natural A.R. ${natAR}: no damage.`);
      remaining = 0;
    }

    if ( remaining > 0 ) {
      const before = h.sdc.value;
      const absorbed = Math.min(remaining, Math.max(0, before));
      if ( absorbed ) {
        actorUpdate["system.health.sdc.value"] = before - absorbed;
        lines.push(`S.D.C. ${before} → ${before - absorbed}.`);
        remaining -= absorbed;
      }
    }
  }

  if ( remaining > 0 ) {
    const before = h.hp.value;
    const after = before - remaining;
    actorUpdate["system.health.hp.value"] = after;
    lines.push(`Hit Points ${before} → ${after}.`);
    if ( after < -(sys.attributes.pe.total ?? 0) ) lines.push(`<strong class="pu-failure">Dead (below −P.E.).</strong>`);
    else if ( after <= 0 ) lines.push(`<strong class="pu-failure">In a coma! Bleeding out.</strong>`);
  }

  if ( !foundry.utils.isEmpty(actorUpdate) ) await actor.update(actorUpdate);
  return lines.join("<br>") || "No damage.";
}

/* -------------------------------------------- */
/*  Chat card buttons                           */
/* -------------------------------------------- */

/** The actors that defend: the user's selected tokens they own, else their assigned character. */
export function defendingActors() {
  const tokens = (canvas.tokens?.controlled ?? []).filter(t => t.actor?.isOwner);
  if ( tokens.length ) return tokens.map(t => t.actor);
  return game.user.character ? [game.user.character] : [];
}

/** The actors damage buttons should affect: targeted tokens, else selected tokens. */
function damageTargets() {
  const tokens = game.user.targets.size ? [...game.user.targets] : (canvas.tokens?.controlled ?? []);
  return tokens.map(t => t.actor).filter(a => a);
}

/**
 * Wire up buttons on this system's chat cards.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function onRenderChatMessage(message, html) {
  const data = message.flags?.["palladium-universal"];
  if ( !data ) return;
  for ( const link of html.querySelectorAll(".pu-item-link") ) {
    link.addEventListener("click", event => {
      event.preventDefault();
      viewItemCopy(data.itemSnapshot ? decodeItem(data.itemSnapshot) : data.itemData);
    });
  }
  for ( const button of html.querySelectorAll("[data-pu-action]") ) {
    button.addEventListener("click", event => onCardButton(event, message, data));
  }
}

async function onCardButton(event, message, data) {
  event.preventDefault();
  const action = event.currentTarget.dataset.puAction;
  if ( ["spell-save", "spell-damage", "psionic-save"].includes(action) ) return onMagicCardButton(action, data);

  if ( action === "defend" ) {
    const defenders = defendingActors();
    if ( !defenders.length ) return ui.notifications.warn("Select your token (or set your character) to defend.");
    const attacker = await fromUuid(data.actorUuid);
    for ( const defender of defenders ) {
      await rollDefense(defender, event.currentTarget.dataset.reaction, data, attacker?.name);
    }
    return;
  }

  if ( ["te-change", "change-save", "temporal-mishap"].includes(action) ) {
    const actor = await fromUuid(data.actorUuid);
    if ( !actor?.isOwner ) return ui.notifications.warn("Only the character's owner can do that.");
    if ( action === "te-change" ) return applyTeChange(actor, Number(event.currentTarget.dataset.direction));
    if ( action === "change-save" ) return rollChangeSave(actor);
    return rollTemporalMishap(actor);
  }

  if ( action === "horror-save" ) {
    const targets = defendingActors().filter(a => a.system.saves);
    if ( !targets.length ) return ui.notifications.warn("Select your token (or set your character) to save.");
    for ( const target of targets ) await rollHorrorFactor(target, data.hf, data.source);
    return;
  }

  if ( action === "self-damage" ) {
    const actor = await fromUuid(data.actorUuid);
    if ( !actor?.isOwner ) return ui.notifications.warn("Only the shooter's owner can roll this.");
    const roll = await new Roll(event.currentTarget.dataset.formula).evaluate();
    const flags = { "palladium-universal": { card: "damage", actorUuid: actor.uuid, damage: roll.total, strike: null } };
    return postCard(actor, { title: "Misfire: Damage to the Shooter", label: "Damage", result: roll.total,
      lines: damageLines(roll, event.currentTarget.dataset.formula), rolls: [roll], buttons: damageButtons(), flags });
  }

  if ( (action === "damage") && data.vehicle ) {
    const actor = await fromUuid(data.actorUuid);
    const weapon = actor?.items.get(data.itemRef ?? data.itemId);
    if ( !weapon ) return ui.notifications.warn("That weapon no longer exists.");
    if ( !actor.isOwner ) return ui.notifications.warn("Only the vehicle's owner can roll its damage.");
    return rollVehicleDamage(actor, weapon, { crit: data.crit, strike: data.strike });
  }

  if ( (action === "damage") && data.maneuver ) {
    const actor = await fromUuid(data.actorUuid);
    if ( !actor?.isOwner ) return ui.notifications.warn("Only the attacker's owner can roll its damage.");
    return rollUnarmedDamage(actor, { crit: data.crit, strike: data.strike, label: CONFIG.PALLADIUM.MANEUVERS[data.maneuver]?.label,
      deathBlow: data.deathBlow, leap: data.leap });
  }

  if ( action === "damage" ) {
    const actor = await fromUuid(data.actorUuid);
    const weapon = actor?.items.get(data.itemRef ?? data.itemId);
    if ( !weapon ) return ui.notifications.warn("That weapon no longer exists.");
    if ( !actor.isOwner ) return ui.notifications.warn("Only the attacker's owner can roll its damage.");
    return rollDamage(actor, weapon, { crit: data.crit, mode: data.mode, strike: data.strike, deathBlow: data.deathBlow,
      double: data.double, leap: data.leap });
  }

  // Apply buttons
  const targets = damageTargets();
  if ( !targets.length ) return ui.notifications.warn("Target or select the token(s) to damage first.");
  const mode = { apply: "normal", "apply-half": "half", "apply-hp": "hp" }[action];
  const results = [];
  for ( const target of targets ) {
    if ( !target.isOwner ) {
      ui.notifications.warn(`You don't have permission to damage ${target.name}; ask the GM.`);
      continue;
    }
    const text = await applyDamage(target, data.damage, { strike: data.strike, mode });
    results.push(`<li><strong>${target.name}</strong>: ${text}</li>`);
  }
  if ( !results.length ) return;
  const label = { normal: "Damage Applied", half: "Damage Applied (½, Roll with Impact)", hp: "Damage Applied to Hit Points" }[mode];
  return ChatMessage.create({
    speaker: message.speaker,
    content: `<div class="pu-card"><h3>${label}: ${mode === "half" ? Math.floor(data.damage / 2) : data.damage}</h3>
      <ul class="pu-results">${results.join("")}</ul></div>`
  });
}
