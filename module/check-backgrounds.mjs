import { applyBackground } from "./animal.mjs";

/**
 * Check Backgrounds (GM macro, v1.32): compare every character's and NPC's Background items with the current
 * compendium version of the same background (same name and kind), list what changed (Education Bonus, Combat
 * Training, bonuses) and offer to replace the old copies. Replacing works like dropping the background again.
 */

const escape = s => foundry.utils.escapeHTML(String(s ?? ""));
const fxKey = e => `${e.target}|${String(e.formula ?? "").trim()}|${String(e.group ?? "").trim().toLowerCase()}`;
const TARGET_LABELS = { "skills.all": "All skills", "skills.amateur": "Amateur skills", sdc: "S.D.C.", bioe: "Bio-E", "combat.actions": "Actions" };
/** "Prowl +25%", "All skills +15%", "P.P. +2", "S.D.C. +10". */
function fxText(e) {
  const n = `${/^-/.test(String(e.formula)) ? "" : "+"}${e.formula}`;
  if ( e.target === "skill" ) return `${e.group} ${n}%`;
  if ( e.target.startsWith("skills.") ) return `${TARGET_LABELS[e.target] ?? e.target} ${n}%`;
  const attr = e.target.match(/^attributes\.(\w+)$/)?.[1];
  if ( attr ) return `${globalThis.CONFIG?.PALLADIUM?.ATTRIBUTES?.[attr] ?? attr.toUpperCase()} ${n}`;
  return `${TARGET_LABELS[e.target] ?? e.target} ${n}`;
}

/** The compendium backgrounds, by "kind|name" (the first pack wins). */
async function compendiumBackgrounds() {
  const map = new Map();
  for ( const pack of game.packs?.filter(p => p.documentName === "Item") ?? [] ) {
    let index;
    try { index = await pack.getIndex({ fields: ["type", "system.kind"] }); } catch(err) { continue; }
    for ( const e of index ) {
      if ( e.type !== "background" ) continue;
      const key = `${e.system?.kind ?? ""}|${e.name.toLowerCase()}`;
      if ( !map.has(key) ) map.set(key, { pack, id: e._id });
    }
  }
  return map;
}

/**
 * What differs between an owned background and the compendium's.
 * @returns {string[]}  One line per change (empty = up to date)
 */
export function backgroundDiffs(owned, source) {
  const a = owned.system ?? {}, b = source.system ?? {};
  const out = [];
  if ( (a.educationBonus ?? 0) !== (b.educationBonus ?? 0) ) out.push(`Education Bonus ${a.educationBonus ?? 0}% → ${b.educationBonus ?? 0}%`);
  if ( (a.combatTraining ?? "") !== (b.combatTraining ?? "") ) out.push(`Combat Training ${a.combatTraining || "none"} → ${b.combatTraining || "none"}`);
  const have = new Set((a.effects ?? []).map(fxKey));
  const want = new Set((b.effects ?? []).map(fxKey));
  const added = (b.effects ?? []).filter(e => !have.has(fxKey(e)));
  const removed = (a.effects ?? []).filter(e => !want.has(fxKey(e)));
  if ( added.length ) out.push(`New bonuses: ${added.map(fxText).join(", ")}`);
  if ( removed.length ) out.push(`Bonuses no longer given: ${removed.map(fxText).join(", ")}`);
  return out;
}

/**
 * Find every out-of-date background on characters and NPCs (world actors).
 * @returns {Promise<{actor: Actor, item: Item, source: Item, changes: string[]}[]>}
 */
export async function outdatedBackgrounds() {
  const sources = await compendiumBackgrounds();
  const rows = [];
  for ( const actor of game.actors?.filter(a => ["character", "npc"].includes(a.type)) ?? [] ) {
    for ( const item of actor.items.filter(i => i.type === "background") ) {
      const ref = sources.get(`${item.system.kind ?? ""}|${item.name.toLowerCase()}`);
      if ( !ref ) continue;
      const source = await ref.pack.getDocument(ref.id);
      if ( !source ) continue;
      const changes = backgroundDiffs(item, source);
      if ( changes.length ) rows.push({ actor, item, source, changes });
    }
  }
  return rows;
}

/** Replace the listed backgrounds with the compendium's (like dropping them again). */
export async function updateBackgrounds(rows) {
  for ( const r of rows ) await applyBackground(r.actor, r.source.toObject());
  return rows.length;
}

/** The GM macro: list what's out of date and offer to update it. */
export async function checkBackgrounds() {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM can check the backgrounds.");
  const rows = await outdatedBackgrounds();
  if ( !rows.length ) return ui.notifications.info("Every character's and NPC's backgrounds match the compendium.");
  const list = rows.map(r => `<li><strong>${escape(r.actor.name)}</strong>: ${escape(r.item.name)}
    <ul>${r.changes.map(c => `<li>${escape(c)}</li>`).join("")}</ul></li>`).join("");
  const ok = await foundry.applications.api.DialogV2.confirm({
    classes: ["palladium-universal", "pu-skill-mods"],
    window: { title: "Check Backgrounds", icon: "fa-solid fa-scroll" },
    position: { width: 520 },
    content: `<p>These backgrounds are older than the compendium's:</p><ul class="pu-check-list">${list}</ul>
      <p><strong>Update</strong> replaces each one with the compendium's version, as if dropped on the sheet again.
      Skills, attributes and everything else on the sheet stay as they are.</p>`,
    yes: { label: `Update ${rows.length}`, icon: "fa-solid fa-rotate" },
    no: { label: "Close", default: true }
  });
  if ( !ok ) return 0;
  const n = await updateBackgrounds(rows);
  ui.notifications.info(`${n} background${n === 1 ? "" : "s"} updated.`);
  return n;
}
