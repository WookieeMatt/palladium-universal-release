/**
 * Damage Effects & Recovery (v1.24.0, p.92–93).
 * - Bleeding Out: a condition applied when damage brings the Hit Points to 25% or less (conditions.mjs); 1 H.P.
 *   every 4 rounds in combat. A successful First Aid / Paramedic / Medical Doctor roll offers Stop the Bleeding.
 * - Rest & Heal: Hit Points by treatment and days, S.D.C. 5 per hour of rest.
 * - Optional Damage Side-Effects: world setting "damageSideEffects": off (the GM handles it), gm (a whispered card
 *   with a Roll button) or auto (rolled and applied). The result is an Injury item carrying the penalties.
 * Hooks for macros (visual effects...): palladium.stopBleeding(actor, by), palladium.heal(actor, result),
 * palladium.sideEffect(actor, result, item); conditions.mjs adds palladium.condition(actor, id, active) and
 * palladium.hitPoints(actor, {before, after, max}).
 */
import { postCard } from "./dice.mjs";

const SCOPE = "palladium-universal";
const { DialogV2 } = foundry.applications.api;
const escape = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Optional side-effects: "off", "gm" or "auto". */
export function sideEffectMode() {
  let mode;
  try { mode = game.settings.get(SCOPE, "damageSideEffects"); } catch(err) { mode = "off"; }
  return ["off", "gm", "auto"].includes(mode) ? mode : "off";
}

/**
 * Which side-effect table a health change calls for (p.93), or null.
 * S.D.C.: dropping to 25% or less (75%+ gone). H.P.: dropping to 25% or less but above 0; to 0 or less: Near Death.
 * @param {"sdc"|"hp"} kind
 * @param {number} before
 * @param {number} after
 * @param {number} max
 */
export function sideEffectTable(kind, before, after, max) {
  if ( !Number.isFinite(before) || !Number.isFinite(after) || !(max > 0) || (after >= before) ) return null;
  const quarter = Math.floor(max * 0.25);
  if ( kind === "sdc" ) return (before > quarter) && (after <= quarter) ? "sdc" : null;
  if ( (before > 0) && (after <= 0) ) return "nearDeath";
  return (before > quarter) && (after <= quarter) && (after > 0) ? "hp" : null;
}

/** On a health change (conditions.mjs): offer or roll the side-effect table per the setting. */
export async function sideEffectsFor(actor, kind, before, after) {
  const mode = sideEffectMode();
  if ( mode === "off" ) return null;
  const h = actor.system.health;
  const table = sideEffectTable(kind, before, after, kind === "sdc" ? h.sdc.max : h.hp.max);
  if ( !table ) return null;
  if ( mode === "auto" ) return rollSideEffect(actor, table);
  return offerSideEffect(actor, table);
}

/** The GM's card: "Roll Hit Point Side-Effects for Raph?" (whispered to the GMs). */
export function offerSideEffect(actor, table) {
  const t = CONFIG.PALLADIUM.SIDE_EFFECTS[table];
  const gms = game.users?.filter(u => u.isGM).map(u => u.id) ?? [];
  return postCard(actor, { title: `Optional: ${t.label}`, whisper: gms,
    flags: { [SCOPE]: { card: "sideEffect", actorUuid: actor.uuid, table } },
    body: `<p class="pu-text">${escape(actor.name)}: ${escape(t.when)} (p.93, optional). ${t.unit === "permanent" ? "Permanent." : `Lasts ${t.duration.toUpperCase()} ${t.unit}.`}</p>`,
    buttons: `<div class="pu-buttons"><button type="button" data-pu-action="side-effect" data-table="${table}"><i class="fa-solid fa-dice-d20"></i> Roll ${escape(t.label)}</button></div>` });
}

/**
 * Roll a side-effect table and give the character an Injury item with the penalties.
 * @param {Actor} actor
 * @param {"sdc"|"hp"|"nearDeath"} table
 */
export async function rollSideEffect(actor, table) {
  const t = CONFIG.PALLADIUM.SIDE_EFFECTS[table];
  if ( !t ) return null;
  const roll = await new Roll("1d100").evaluate();
  const [, , name, penalties, effects] = t.results.find(([lo, hi]) => (roll.total >= lo) && (roll.total <= hi));
  const rolls = [roll];
  let lasts = "Permanent";
  if ( t.duration ) {
    const d = await new Roll(t.duration).evaluate();
    rolls.push(d);
    lasts = `${d.total} ${d.total === 1 ? t.unit.replace(/s$/, "") : t.unit}`;
  }
  let item = null;
  if ( effects.length && actor.isOwner ) {
    [item] = await actor.createEmbeddedDocuments("Item", [{
      name: `Injury: ${name}`, type: "ability", img: "icons/svg/blood.svg",
      flags: { [SCOPE]: { injury: { table, lasts } } },
      system: { description: `<p><strong>${escape(penalties)}</strong>. ${escape(t.label)} (p.93): ${lasts === "Permanent" ? "permanent" : `lasts ${escape(lasts)}`}. Delete this item when it heals.</p>`,
        source: "Optional Damage Side-Effects (p.93)", bioe: 0, naturalAR: 0,
        effects: effects.map(([target, value]) => ({ target, formula: String(value), value, group: "" })) }
    }]);
  }
  const result = { table, total: roll.total, name, penalties, lasts };
  await postCard(actor, { title: t.label, label: "d100", result: roll.total, rolls,
    lines: [["Injury", name], ["Penalties", penalties], ["Lasts", lasts]],
    notes: [`<span class="hint">${item ? "Added to the sheet as an Injury item (its penalties apply); delete it when it heals." : effects.length ? "Only the owner can add the Injury item." : "No lasting effect."}</span>`] });
  Hooks.callAll("palladium.sideEffect", actor, result, item);
  return result;
}

/* -------------------------------------------- */
/*  Bleeding Out                                */
/* -------------------------------------------- */

/** The button a successful first aid roll gets. */
export const stopBleedingButton = () => `<div class="pu-buttons"><button type="button" data-pu-action="stop-bleeding"
  data-tooltip="First aid stops Bleeding Out for the targeted (or selected) character"><i class="fa-solid fa-kit-medical"></i> Stop the Bleeding</button></div>`;

/**
 * Stop Bleeding Out (first aid, p.92).
 * @param {Actor} actor
 * @param {string} [by]   Who gave first aid
 */
export async function stopBleeding(actor, by = "") {
  if ( !actor?.statuses?.has("bleeding") ) { ui.notifications.info(`${actor?.name ?? "That character"} isn't Bleeding Out.`); return false; }
  if ( !actor.isOwner ) { ui.notifications.warn(`You don't have permission to change ${actor.name}; ask the GM.`); return false; }
  await actor.toggleStatusEffect("bleeding", { active: false });
  await postCard(actor, { title: "Bleeding stopped", notes: [`<span class="pu-success">${escape(actor.name)} stops Bleeding Out${by ? ` (first aid by ${escape(by)})` : ""}.</span>`,
    `<span class="hint">Keep still. ${actor.system.health.hp.value <= 0 ? "Still in a coma: a few hours to get treatment (Save vs Coma)." : "Hit Points heal with rest (Rest & Heal)."}</span>`] });
  Hooks.callAll("palladium.stopBleeding", actor, by);
  return true;
}

/* -------------------------------------------- */
/*  Rest & Heal                                 */
/* -------------------------------------------- */

/**
 * Hit Points healed by treatment over some days (p.92).
 * @param {string} treatment   A CONFIG.PALLADIUM.HEALING key
 * @param {number} days
 */
export function healedHP(treatment, days) {
  const [first, after] = CONFIG.PALLADIUM.HEALING[treatment]?.perDay ?? [0, 0];
  days = Math.max(0, Math.floor(days));
  return days ? first + (days - 1) * after : 0;
}

/**
 * Heal an actor: Hit Points by treatment and days, S.D.C. by hours of rest (up to the maximums).
 * @param {Actor} actor
 * @param {object} options   {treatment, days, hours}
 */
export async function restAndHeal(actor, { treatment = "none", days = 0, hours = 0 } = {}) {
  const h = actor.system.health;
  const hpGain = healedHP(treatment, days);
  const sdcGain = Math.max(0, Math.floor(hours)) * CONFIG.PALLADIUM.SDC_PER_HOUR;
  const hp = { before: h.hp.value, after: Math.min(h.hp.max, h.hp.value + hpGain) };
  const sdc = { before: h.sdc.value, after: Math.min(h.sdc.max, h.sdc.value + sdcGain) };
  if ( h.hp.value <= 0 && hpGain ) hp.after = h.hp.value;   // a coma needs a Save vs Coma first
  const update = {};
  if ( hp.after !== hp.before ) update["system.health.hp.value"] = hp.after;
  if ( sdc.after !== sdc.before ) update["system.health.sdc.value"] = sdc.after;
  if ( Object.keys(update).length ) await actor.update(update);
  const t = CONFIG.PALLADIUM.HEALING[treatment];
  const lines = [];
  if ( days ) lines.push([`${t.label}, ${days} day${days === 1 ? "" : "s"}`, `H.P. ${hp.before} → ${hp.after}`]);
  if ( hours ) lines.push([`Rest, ${hours} hour${hours === 1 ? "" : "s"} (5 S.D.C. an hour)`, `S.D.C. ${sdc.before} → ${sdc.after}`]);
  const notes = [];
  if ( (h.hp.value <= 0) && days ) notes.push(`<span class="hint">In a coma: Hit Points only heal after a successful Save vs Coma.</span>`);
  if ( actor.statuses?.has("bleeding") ) notes.push(`<span class="hint">Still Bleeding Out: first aid first.</span>`);
  const result = { treatment, days, hours, hp, sdc };
  await postCard(actor, { title: "Rest & Heal", label: "Healed", result: `${hp.after - hp.before} H.P., ${sdc.after - sdc.before} S.D.C.`, lines, notes });
  Hooks.callAll("palladium.heal", actor, result);
  return result;
}

/** The Rest & Heal window (one window: treatment, days, hours). */
export async function healDialog(actor) {
  const options = Object.entries(CONFIG.PALLADIUM.HEALING).map(([k, t]) =>
    `<option value="${k}">${t.label} (${t.perDay[0] === t.perDay[1] ? `${t.perDay[0]}/day` : `${t.perDay[0]}, then ${t.perDay[1]}/day`})</option>`).join("");
  const data = await DialogV2.wait({
    window: { title: `${actor.name}: Rest & Heal` }, classes: ["palladium-universal", "pu-skill-mods"],
    content: `<div class="pu-sm"><p class="pu-sm-head"><strong>Hit Points</strong><span class="pu-sm-chance">${actor.system.health.hp.value} / ${actor.system.health.hp.max}</span></p>
      <select name="treatment">${options}</select>
      <label class="pu-sm-ask">Days <input type="number" name="days" value="1" min="0" style="width:4em"></label>
      <p class="pu-sm-head"><strong>S.D.C.</strong><span class="pu-sm-chance">${actor.system.health.sdc.value} / ${actor.system.health.sdc.max}</span></p>
      <label class="pu-sm-ask">Hours of rest <input type="number" name="hours" value="0" min="0" style="width:4em"></label>
      </div>`,
    buttons: [
      { action: "heal", label: "Heal", icon: "fa-solid fa-kit-medical", default: true, callback: (event, button) => {
        const f = button.form.elements;
        return { treatment: f.treatment.value, days: Number(f.days.value) || 0, hours: Number(f.hours.value) || 0 };
      } },
      { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark" }
    ],
    rejectClose: false
  });
  if ( !data || (data === "cancel") ) return null;
  return restAndHeal(actor, data);
}

/** Register the setting (in "init"). */
export function initRecovery() {
  game.settings.register(SCOPE, "damageSideEffects", {
    name: "Optional Damage Side-Effects",
    hint: "p.93 (optional): when a character loses 75% of their S.D.C., 75% of their Hit Points, or goes into a coma. Roll and apply automatically (an Injury item with the penalties), ask the GM (a whispered card with a Roll button), or leave it to the GM.",
    scope: "world", config: true, type: String, default: "off",
    choices: { off: "Leave it to the GM", gm: "Ask the GM (whispered card)", auto: "Roll and apply automatically" }
  });
}
