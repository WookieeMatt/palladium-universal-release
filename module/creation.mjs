import { cardHeader } from "./dice.mjs";
import { applyBackground } from "./animal.mjs";
import { BACKGROUND_KINDS } from "./data/items.mjs";

const { DialogV2 } = foundry.applications.api;

/**
 * Character creation rolls: attributes, Hit Points (and level-up Hit Points), height and weight,
 * starting money, and the Origin / Creator Organization / Education tables. Each posts to chat
 * (so Dice So Nice shows it) and fills in the sheet.
 */

const ask = (title, content) => DialogV2.confirm({ window: { title }, content: `<p>${content}</p>` });
const post = (actor, title, subtitle, body, rolls, flags) => ChatMessage.create({
  speaker: ChatMessage.getSpeaker({ actor }), rolls,
  content: `<div class="pu-card">${cardHeader(actor, title, subtitle)}${body}</div>`,
  flags: flags ? { "palladium-universal": flags } : undefined
});

/* -------------------------------------------- */
/*  Attributes (p.12)                           */
/* -------------------------------------------- */

/** Roll one attribute: 3D6, and on 16, 17 or 18 one more 1D6 (once). */
async function attributeRoll(actor, key) {
  const data = { formula: "3d6", exceptional: [16, 17, 18], bonusFormula: "1d6" };
  if ( Hooks.call("palladium.preRollAttribute", actor, key, data) === false ) return null;
  const roll = await new Roll(data.formula).evaluate();
  const rolls = [roll];
  let total = roll.total;
  let text = `${data.formula.toUpperCase()} <strong>${roll.total}</strong>`;
  if ( data.exceptional.includes(roll.total) ) {
    const bonus = await new Roll(data.bonusFormula).evaluate();
    rolls.push(bonus);
    total += bonus.total;
    text += ` · <strong class="pu-crit">Exceptional!</strong> +${data.bonusFormula.toUpperCase()} <strong>${bonus.total}</strong>`;
  }
  return { total, rolls, text };
}

/**
 * Roll an attribute and make it the attribute's Rolled value. Asks before replacing a value.
 * @param {Actor} actor
 * @param {string} key   Attribute key ("iq", "me", ...)
 * @returns {Promise<number|null>}  The new value, or null if cancelled
 */
export async function rollAttribute(actor, key) {
  const label = CONFIG.PALLADIUM.ATTRIBUTES[key];
  const attr = actor.system.attributes?.[key];
  if ( !label || !attr ) return null;
  if ( Number.isFinite(attr.value)
    && !(await ask(`${actor.name}: Roll ${label}`, `Replace the rolled ${label} of <strong>${attr.value}</strong> with a new roll?`)) ) return null;
  const result = await attributeRoll(actor, key);
  if ( !result ) return null;
  await post(actor, `Rolls ${label}`, Number.isFinite(attr.value) ? `Was ${attr.value}` : "",
    `<p class="pu-notes">${result.text}</p><p class="pu-text"><strong>${label} ${result.total}</strong></p>`, result.rolls);
  await actor.update({ [`system.attributes.${key}.value`]: result.total });
  Hooks.callAll("palladium.rollAttribute", actor, key, { total: result.total, rolls: result.rolls });
  return result.total;
}

/**
 * Roll all eight attributes at once. Asks first if any already has a value.
 * @param {Actor} actor
 * @returns {Promise<object|null>}  The new values by key
 */
export async function rollAllAttributes(actor) {
  const attrs = actor.system.attributes;
  if ( !attrs ) return null;
  if ( Object.values(attrs).some(a => Number.isFinite(a.value))
    && !(await ask(`${actor.name}: Roll Attributes`, "Replace every rolled attribute with new rolls?")) ) return null;
  const values = {};
  const lines = [];
  const rolls = [];
  for ( const [key, label] of Object.entries(CONFIG.PALLADIUM.ATTRIBUTES) ) {
    if ( !(key in attrs) ) continue;
    const result = await attributeRoll(actor, key);
    if ( !result ) continue;
    values[key] = result.total;
    rolls.push(...result.rolls);
    lines.push(`<li><strong>${label} ${result.total}</strong> <span class="hint">${result.text}</span></li>`);
  }
  if ( !lines.length ) return null;
  await post(actor, "Rolls Attributes", "3D6 each, +1D6 on 16–18", `<ul class="pu-results">${lines.join("")}</ul>`, rolls);
  await actor.update(Object.fromEntries(Object.entries(values).map(([k, v]) => [`system.attributes.${k}.value`, v])));
  for ( const [key, total] of Object.entries(values) ) Hooks.callAll("palladium.rollAttribute", actor, key, { total });
  return values;
}

/* -------------------------------------------- */
/*  Hit Points (p.20)                           */
/* -------------------------------------------- */

/**
 * Roll Hit Points: P.E. + 1D6, and 1D6 more for each level above first. Sets the maximum, and the
 * current value if the character was at full (or had none).
 * @param {Actor} actor
 * @returns {Promise<number|null>}
 */
export async function rollHitPoints(actor) {
  const sys = actor.system;
  const pe = sys.attributes?.pe?.total;
  if ( !Number.isFinite(pe) ) return ui.notifications.warn("Roll or enter P.E. first: Hit Points start at P.E. + 1D6.");
  const hp = sys.health.hp;
  if ( (hp.max > 0) && !(await ask(`${actor.name}: Roll Hit Points`, `Replace ${hp.max} maximum Hit Points with a new roll?`)) ) return null;
  const level = Math.max(1, sys.identity.level || 1);
  const data = { formula: `${pe} + ${level}d6` };
  if ( Hooks.call("palladium.preRollHitPoints", actor, data) === false ) return null;
  const roll = await new Roll(data.formula).evaluate();
  const update = { "system.health.hp.max": roll.total };
  if ( (hp.value >= hp.max) || !(hp.value > 0) ) update["system.health.hp.value"] = roll.total;
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `<div class="pu-card">${cardHeader(actor, "Rolls Hit Points",
    `P.E. ${pe} + 1D6${level > 1 ? ` + ${level - 1}D6 (levels 2–${level})` : ""}`)}</div>` });
  await actor.update(update);
  Hooks.callAll("palladium.rollHitPoints", actor, { total: roll.total, roll });
  return roll.total;
}

/**
 * Offer the level-up Hit Points (1D6 per level gained). Called on the client that raised the level.
 * @param {Actor} actor
 * @param {number} gained   Levels gained
 */
export async function offerLevelHitPoints(actor, gained) {
  const hp = actor.system.health?.hp;
  if ( !(gained > 0) || !(hp?.max > 0) ) return;
  const level = actor.system.identity.level;
  const ok = await ask(`${actor.name}: Level ${level}`,
    `${actor.name} reached level ${level}. Roll ${gained}D6 more Hit Points?`);
  if ( !ok ) return;
  const roll = await new Roll(`${gained}d6`).evaluate();
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `<div class="pu-card">${cardHeader(actor, `Level ${level}: Hit Points`, `+${gained}D6 · ${hp.max} → ${hp.max + roll.total}`)}</div>` });
  await actor.update({ "system.health.hp.max": hp.max + roll.total, "system.health.hp.value": hp.value + roll.total });
  Hooks.callAll("palladium.rollHitPoints", actor, { total: hp.max + roll.total, roll, levelUp: gained });
}

/* -------------------------------------------- */
/*  Height & Weight (p.17)                      */
/* -------------------------------------------- */

/** 43 → 3 ft 7 in */
export function formatHeight(inches) {
  if ( inches < 12 ) return `${inches} in`;
  const ft = Math.floor(inches / 12);
  const rest = inches % 12;
  return rest ? `${ft} ft ${rest} in` : `${ft} ft`;
}

/**
 * Roll height (by build) and weight from the character's Size Level.
 * @param {Actor} actor
 */
export async function rollHeightWeight(actor) {
  const m = actor.system.mutation;
  const row = CONFIG.PALLADIUM.HEIGHT_WEIGHT[m?.sizeLevel];
  if ( !row ) return ui.notifications.warn(`No height and weight dice for Size Level ${m?.sizeLevel}: the GM sets them.`);
  const id = actor.system.identity;
  if ( (id.height || id.weight) && !(await ask(`${actor.name}: Height & Weight`, "Replace the height and weight with new rolls?")) ) return null;
  const build = m.build in row ? m.build : "medium";
  const data = { height: row[build], weight: row.weight, unit: row.unit };
  if ( Hooks.call("palladium.preRollHeightWeight", actor, data) === false ) return null;
  const height = await new Roll(data.height).evaluate();
  const weight = await new Roll(data.weight).evaluate();
  const heightText = formatHeight(height.total);
  const weightText = `${weight.total.toLocaleString("en-US")} ${data.unit}`;
  await post(actor, "Rolls Height & Weight", `Size Level ${m.sizeLevel}, ${build} build`,
    `<p class="pu-notes">Height ${data.height} in: <strong>${heightText}</strong> · Weight ${data.weight} ${data.unit}: <strong>${weightText}</strong></p>`,
    [height, weight]);
  await actor.update({ "system.identity.height": heightText, "system.identity.weight": weightText });
  Hooks.callAll("palladium.rollHeightWeight", actor, { height: heightText, weight: weightText });
  return { height: heightText, weight: weightText };
}

/* -------------------------------------------- */
/*  Starting money                              */
/* -------------------------------------------- */

/**
 * Turn a background's money text into a roll: "3D6×$1,000 savings" → "3d6 * 1000".
 * @param {string} text
 * @returns {string|null}
 */
export function moneyFormula(text) {
  const m = String(text ?? "").replace(/,/g, "").match(/(\d*)\s*D\s*(\d+|%)\s*[×x*]\s*\$\s*(\d+)/i);
  if ( !m ) return null;
  const faces = m[2] === "%" ? 100 : Number(m[2]);
  return `${m[1] || 1}d${faces} * ${Number(m[3])}`;
}

/**
 * Roll a background's starting money and add it to the character's Money / possessions notes.
 * @param {Actor} actor
 * @param {Item} item   A background item with a money formula
 */
export async function rollMoney(actor, item) {
  const formula = moneyFormula(item?.system.money);
  if ( !formula ) return ui.notifications.warn(`${item?.name ?? "This background"} has no money roll.`);
  const roll = await new Roll(formula).evaluate();
  const amount = `$${roll.total.toLocaleString("en-US")}`;
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `<div class="pu-card">${cardHeader(actor, "Rolls Starting Money", `${item.name}: ${item.system.money}`)}
      <p class="pu-text"><strong>${amount}</strong></p></div>` });
  const line = `Starting money (${item.name}): ${amount}`;
  const gear = actor.system.gear ? `${actor.system.gear}\n${line}` : line;
  await actor.update({ "system.gear": gear });
  Hooks.callAll("palladium.rollMoney", actor, item, { amount: roll.total, roll });
  return roll.total;
}

/* -------------------------------------------- */
/*  Origin, Creator Organization and Education  */
/* -------------------------------------------- */

/**
 * A percentile range ("01–14", "61-00", "00", "7") as numbers; 00 means 100.
 * @param {string} text
 * @returns {{min: number, max: number}|null}
 */
export function parseRange(text) {
  const parts = String(text ?? "").trim().split(/\s*[–—-]\s*/).filter(p => /^\d+$/.test(p));
  if ( !parts.length || (parts.length > 2) ) return null;
  const num = p => ((p === "00") || (p === "000") ? 100 : Number(p));
  const min = num(parts[0]);
  const max = num(parts.at(-1));
  return (min <= max) ? { min, max } : null;
}

/** The smallest standard die that covers a table. */
const dieFor = max => [4, 6, 8, 10, 12, 20, 100].find(f => f >= max) ?? 100;

/**
 * Every background item with a percentile range, from the world and this system's Item compendiums,
 * grouped into tables by compendium folder (or world folder).
 * @param {string[]} kinds   Background kinds to include
 * @returns {Promise<Map<string, {label: string, entries: object[]}>>}
 */
export async function backgroundTables(kinds) {
  const tables = new Map();
  const add = (key, label, entry) => {
    if ( !tables.has(key) ) tables.set(key, { label, entries: [] });
    tables.get(key).entries.push(entry);
  };
  for ( const item of game.items ?? [] ) {
    if ( (item.type !== "background") || !kinds.includes(item.system.kind) ) continue;
    const range = parseRange(item.system.roll);
    if ( !range ) continue;
    const folder = item.folder?.name ?? "World Items";
    add(`world.${item.folder?.id ?? ""}`, `World › ${folder}`, { uuid: item.uuid, name: item.name, ...range });
  }
  for ( const pack of game.packs ?? [] ) {
    if ( (pack.documentName !== "Item") || (pack.metadata.system && (pack.metadata.system !== game.system.id)) ) continue;
    const index = await pack.getIndex({ fields: ["system.kind", "system.roll", "folder"] });
    for ( const entry of index ) {
      if ( (entry.type !== "background") || !kinds.includes(entry.system?.kind) ) continue;
      const range = parseRange(entry.system?.roll);
      if ( !range ) continue;
      const folder = pack.folders.get(entry.folder)?.name;
      add(`${pack.collection}.${entry.folder ?? ""}`, `${pack.title}${folder ? ` › ${folder}` : ""}`,
        { uuid: entry.uuid ?? pack.getUuid(entry._id), name: entry.name, ...range });
    }
  }
  return tables;
}

/**
 * Roll on an Origin, Creator Organization or Education table built from background items, post the
 * result with an Apply button, and return it.
 * @param {Actor} actor
 * @param {string} kind   "origin", "creator" or "education"
 */
export async function rollBackgroundTable(actor, kind) {
  const kindLabel = BACKGROUND_KINDS[kind] ?? kind;
  const tables = await backgroundTables([kind]);
  if ( !tables.size ) {
    return ui.notifications.warn(`No ${kindLabel} items with a percentile range found in the world or compendiums.`);
  }
  let key = tables.keys().next().value;
  if ( tables.size > 1 ) {
    const options = [...tables.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label))
      .map(([k, t]) => `<option value="${k}">${foundry.utils.escapeHTML(t.label)} (${t.entries.length})</option>`).join("");
    key = await DialogV2.prompt({
      window: { title: `${actor.name}: Roll ${kindLabel}` },
      content: `<div class="form-group"><label>Table</label><div class="form-fields"><select name="table">${options}</select></div></div>`,
      ok: { label: "Roll", callback: (event, button) => button.form.elements.table.value },
      rejectClose: false
    });
    if ( !key ) return null;
  }
  const table = tables.get(key);
  const faces = dieFor(Math.max(...table.entries.map(e => e.max)));
  const roll = await new Roll(`1d${faces}`).evaluate();
  const result = table.entries.find(e => (roll.total >= e.min) && (roll.total <= e.max));
  const body = result
    ? `<p class="pu-text">${roll.total}: <strong>@UUID[${result.uuid}]{${result.name}}</strong></p>
       <div class="pu-buttons"><button type="button" data-pu-action="apply-background">
         <i class="fa-solid fa-user-plus"></i> Apply to ${foundry.utils.escapeHTML(actor.name)}</button></div>`
    : `<p class="pu-notes"><span class="hint">${roll.total}: no entry covers this result.</span></p>`;
  await post(actor, `Rolls ${kindLabel}`, table.label, body, [roll],
    result ? { card: "background", actorUuid: actor.uuid, itemUuid: result.uuid } : null);
  Hooks.callAll("palladium.rollBackgroundTable", actor, kind, { roll, result, table: table.label });
  return result ?? null;
}

/**
 * The Apply button on a background table card.
 * @param {object} data   The card's flags
 */
export async function applyBackgroundFromCard(data) {
  const actor = await fromUuid(data.actorUuid);
  if ( !actor?.isOwner ) return ui.notifications.warn("Only the character's owner can apply this.");
  const item = await fromUuid(data.itemUuid);
  if ( !item ) return ui.notifications.warn("That background item no longer exists.");
  await applyBackground(actor, item.toObject());
  ui.notifications.info(`${item.name} applied to ${actor.name}.`);
}
