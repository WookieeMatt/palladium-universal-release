import { applyAnimal, applyBackground } from "./animal.mjs";
import { postCard } from "./dice.mjs";

/**
 * Rolling the Animal and the Origin on the book's tables (p.13–15), one step at a time, from the Creation
 * Checklist (v1.22.0). Each roll opens a small window: the result, then "Use <compendium entry>" (only when a
 * compendium or world item matches; several matches are all offered), "Fill it in myself" (the header field)
 * or Cancel. When the book goes on to another table (the animal inside its category, the Creator Organization,
 * the education...), the next window offers to roll it. Rolling again from the checklist re-rolls. The chat gets one
 * card when the chain is done (v1.23.0), not one per step.
 */

const { DialogV2 } = foundry.applications.api;
const escape = s => foundry.utils.escapeHTML(String(s ?? ""));

/** A table's entry for a d100 result. */
export function tableResult(key, total) {
  const table = CONFIG.PALLADIUM.CREATION_TABLES[key];
  const [low, high, name, next] = table.results.find(([lo, hi]) => (total >= lo) && (total <= hi)) ?? [];
  return name ? { key, table, name, next: next ?? table.next, low, high } : null;
}

/** The names a table result could go by: "Pet Rodent (Gerbil, Hamster, etc.)" → Pet Rodent, Gerbil, Hamster. */
export function nameCandidates(name) {
  const clean = s => s.replace(/\betc\.?/gi, "").replace(/^(or|and)\s+/i, "").trim();
  const [base, inner] = [name.replace(/\s*\(.*\)\s*/, "").trim(), (name.match(/\((.*)\)/) ?? [])[1] ?? ""];
  const parts = [name, base, ...base.split(/\s+or\s+/i), ...inner.split(/,|\s+or\s+/i)].map(clean).filter(s => s.length > 2);
  return [...new Set(parts.map(s => s.toLowerCase()))];
}

/** Does an item name fit one of the candidates? */
function fits(itemName, candidates) {
  const n = itemName.toLowerCase().trim();
  const base = n.replace(/\s*\(.*\)\s*/, "").trim();
  return candidates.some(c => (n === c) || (base === c) || n.startsWith(`${c} (`) || (c.endsWith(` ${base}`) && base.length > 3)
    || (base.endsWith(` ${c}`)));
}

/**
 * Compendium (and world) items that match a result: animals for the animal tables, backgrounds of the right
 * kind for the others. At most five.
 * @param {string} name
 * @param {string} field   "animal", "origin", "creator" or "education"
 */
export async function findMatches(name, field) {
  const candidates = nameCandidates(name);
  const wanted = e => (field === "animal") ? (e.type === "animal")
    : (e.type === "background") && ((e.system?.kind ?? field) === field);
  const matches = [];
  for ( const item of game.items ?? [] ) {
    if ( wanted(item) && fits(item.name, candidates) ) matches.push({ uuid: item.uuid, name: item.name, source: "World" });
  }
  for ( const pack of game.packs?.filter(p => p.documentName === "Item") ?? [] ) {
    const index = await pack.getIndex({ fields: ["system.kind"] });
    for ( const e of index ) {
      if ( wanted(e) && fits(e.name, candidates) ) matches.push({ uuid: e.uuid ?? `Compendium.${pack.collection}.Item.${e._id}`, name: e.name, source: pack.title });
    }
  }
  const exact = matches.filter(m => m.name.toLowerCase() === name.toLowerCase());
  return (exact.length ? exact : matches).slice(0, 5);
}

/** "Fill it in myself": the result goes in the header's Animal / Origin / Education field. */
export async function fillField(actor, field, name) {
  const id = actor.system.identity;
  const update = { animal: { "system.identity.species": name }, origin: { "system.identity.origin": name },
    creator: { "system.identity.origin": id.origin ? `${id.origin.replace(/\s*\(.*\)$/, "")} (${name})` : name },
    education: { "system.identity.education": name } }[field];
  if ( update ) await actor.update(update);
}

/** Use a matching compendium entry: applied as if it had been dropped on the sheet. */
async function useMatch(actor, uuid) {
  const doc = await fromUuid(uuid);
  if ( !doc ) return ui.notifications.warn("That entry can't be found any more.");
  const data = doc.toObject();
  return doc.type === "animal" ? applyAnimal(actor, data) : applyBackground(actor, data);
}

/**
 * Roll one table and walk the player through the result (then offer the next table, if the book has one).
 * The chat gets ONE card when the chain is done (every roll, what was used, and where it stopped).
 * @param {Actor} actor
 * @param {string} key   A CONFIG.PALLADIUM.CREATION_TABLES key
 */
export async function rollCreationTable(actor, key) {
  if ( !CONFIG.PALLADIUM.CREATION_TABLES[key] ) return null;
  const chain = { steps: [], rolls: [] };
  const result = await rollStep(actor, key, chain);
  if ( chain.steps.length ) await summaryCard(actor, key, chain);
  return result;
}

/** One step of the chain: roll, choose, maybe go on. */
async function rollStep(actor, key, chain) {
  const table = CONFIG.PALLADIUM.CREATION_TABLES[key];
  const roll = await new Roll("1d100").evaluate();
  const result = tableResult(key, roll.total);
  const step = { label: table.label, total: roll.total, name: result.name, outcome: "" };
  chain.steps.push(step);
  chain.rolls.push(roll);

  const nextLabel = result.next ? CONFIG.PALLADIUM.CREATION_TABLES[result.next].label : "";
  // The Animal Category only leads on to its own table.
  if ( !table.field ) {
    const go = await DialogV2.wait({
      window: { title: `${actor.name}: ${table.label}` }, classes: ["palladium-universal", "pu-creation-roll"],
      content: stepHTML(table.label, roll.total, result.name, `Now roll on the ${nextLabel} table.`),
      buttons: [{ action: "next", label: `Roll the ${result.name} animal`, icon: "fa-solid fa-dice", default: true },
        { action: "cancel", label: "Stop", icon: "fa-solid fa-xmark" }],
      rejectClose: false
    });
    if ( go === "next" ) return rollStep(actor, result.next, chain);
    step.outcome = "Stopped";
    return result;
  }

  const matches = await findMatches(result.name, table.field);
  const buttons = [
    ...matches.map(m => ({ action: `use:${m.uuid}`, label: `Use ${m.name}`, icon: "fa-solid fa-book-open", default: matches.length === 1 })),
    { action: "self", label: "Fill it in myself", icon: "fa-solid fa-pen", default: !matches.length },
    { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark" }
  ];
  const where = { animal: "Animal", origin: "Origin", creator: "Origin", education: "Education" }[table.field];
  const hint = matches.length ? `Use ${matches.length > 1 ? "one of the entries" : "the entry"} from ${[...new Set(matches.map(m => m.source))].join(", ")}, or fill it in yourself (the name goes in the ${where} field).`
    : `Not in any compendium: fill it in yourself (the name goes in the ${where} field).`;
  const choice = await DialogV2.wait({
    window: { title: `${actor.name}: ${table.label}` }, classes: ["palladium-universal", "pu-creation-roll"],
    content: stepHTML(table.label, roll.total, result.name, hint), buttons, rejectClose: false
  });
  if ( !choice || (choice === "cancel") ) { step.outcome = "Cancelled: not used"; return null; }
  if ( choice === "self" ) {
    await fillField(actor, table.field, result.name);
    step.outcome = `Filled in (${where})`;
  }
  else {
    const used = matches.find(m => m.uuid === choice.slice(4));
    await useMatch(actor, choice.slice(4));
    step.outcome = `Used ${used?.name ?? "the compendium entry"}`;
  }

  if ( result.next ) {
    const go = await DialogV2.wait({
      window: { title: `${actor.name}: next step` }, classes: ["palladium-universal", "pu-creation-roll"],
      content: `<div class="pu-cr"><p class="pu-cr-result">${escape(result.name)}</p><p class="hint">The book continues on the <strong>${escape(nextLabel)}</strong> table.</p></div>`,
      buttons: [{ action: "next", label: `Roll ${nextLabel}`, icon: "fa-solid fa-dice", default: true },
        { action: "stop", label: "Stop here", icon: "fa-solid fa-hand" }],
      rejectClose: false
    });
    if ( go === "next" ) return rollStep(actor, result.next, chain);
  }
  return result;
}

/** The one chat card for a finished chain: each table, its d100, the result and what the player did with it. */
function summaryCard(actor, key, chain) {
  const title = key === "origin" ? "Creation: Origin" : "Creation: Animal";
  const rows = chain.steps.map(s => `<tr><td>${escape(s.label)}</td><td class="pu-cr-d">${s.total}</td>
    <td><strong>${escape(s.name)}</strong>${s.outcome ? `<br><span class="hint">${escape(s.outcome)}</span>` : ""}</td></tr>`).join("");
  return postCard(actor, { title, rolls: chain.rolls,
    body: `<table class="pu-cr-summary"><thead><tr><th>Table</th><th>d100</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table>`,
    flags: { "palladium-universal": { card: "creationRoll", table: key } } });
}

/** The compact body of a step window. */
function stepHTML(label, total, name, hint) {
  return `<div class="pu-cr">
    <p class="pu-cr-roll"><span>${escape(label)}</span><span class="pu-cr-d">d100 <strong>${total}</strong></span></p>
    <p class="pu-cr-result">${escape(name)}</p>
    <p class="hint">${escape(hint)}</p></div>`;
}
