import { auditNote } from "./audit.mjs";

/**
 * Character export / import / printable sheet (v1.33.0), from the sheet's ⋮ menu (players on their own characters too).
 *  - Export: a JSON file with the character, its items and effects, plus which system version wrote it.
 *  - Import: replaces an existing character or NPC with a file (ours, or Foundry's own "Export Data"). Keeps the
 *    actor's owner / permissions and folder; older files are updated by the data models; compendium links that
 *    don't exist in this world are re-linked by name, or dropped. The audit notes one line.
 *  - Printable Sheet: one readable page (attributes, health, combat, saves, weapons, skills, abilities, gear) to
 *    print or save as PDF.
 */

const SYSTEM = "palladium-universal";
export const EXPORT_FORMAT = 1;
const escape = s => foundry.utils.escapeHTML(String(s ?? ""));
const fileName = name => `${String(name || "character").replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-") || "character"}`;

/* -------------------------------------------- */
/*  Export                                      */
/* -------------------------------------------- */

/** The export data: {palladiumUniversal: {...}, actor: {...}}. */
export function exportData(actor) {
  const data = actor.toObject();
  delete data.ownership;
  delete data.folder;
  delete data.sort;
  return {
    palladiumUniversal: { format: EXPORT_FORMAT, system: game.system?.version ?? "", world: game.world?.title ?? "",
      exported: new Date().toISOString() },
    actor: data
  };
}

/** Download the character as a JSON file. */
export function exportCharacter(actor) {
  const json = JSON.stringify(exportData(actor), null, 2);
  foundry.utils.saveDataToFile(json, "application/json", `${fileName(actor.name)}.json`);
  return json;
}

/* -------------------------------------------- */
/*  Import                                      */
/* -------------------------------------------- */

/** Newer than this system? ("1.40.0" vs "1.33.0") */
function isNewer(a, b) {
  return foundry.utils.isNewerVersion?.(a, b) ?? false;
}

/**
 * Check a parsed file and return the actor data, or throw with a message for the user.
 * @param {object} json      The parsed file (ours, or Foundry's own Export Data)
 * @param {Actor} target     The actor it will replace
 * @returns {{data: object, notes: string[]}}
 */
export function readImport(json, target) {
  const data = foundry.utils.deepClone(json?.actor ?? json);
  if ( !data || (typeof data !== "object") || !data.type || !data.system ) throw new Error("This isn't a character file.");
  if ( !["character", "npc"].includes(data.type) ) throw new Error(`This file holds a ${data.type}, not a character or NPC.`);
  const from = json?.palladiumUniversal?.system ?? data._stats?.systemVersion ?? "";
  const systemId = data._stats?.systemId;
  if ( systemId && (systemId !== SYSTEM) ) throw new Error(`This file comes from another game system (${systemId}).`);
  const notes = [];
  if ( data.type !== target.type ) notes.push(`The file is ${data.type === "npc" ? "an NPC" : "a character"}; it will be imported into this ${target.type === "npc" ? "NPC" : "character"}'s sheet type.`);
  if ( from && game.system?.version && isNewer(from, game.system.version) ) {
    notes.push(`It was made with Palladium Universal ${from}, newer than this world's ${game.system.version}: update the system first if anything looks wrong.`);
  }
  data.type = target.type;
  for ( const k of ["_id", "folder", "sort", "ownership", "_stats"] ) delete data[k];
  return { data, notes };
}

/**
 * Compendium links (compendiumSource) that don't exist in this world: re-link to a local compendium entry with
 * the same type and name, or drop the link. The item itself is kept either way (its data is in the file).
 * @returns {Promise<{relinked: number, dropped: number}>}
 */
export async function relinkItems(items) {
  const counts = { relinked: 0, dropped: 0 };
  let index = null;
  for ( const item of items ?? [] ) {
    const src = item._stats?.compendiumSource ?? item.flags?.core?.sourceId;
    if ( !src || !String(src).startsWith("Compendium.") ) continue;
    const packId = String(src).split(".").slice(1, 3).join(".");
    if ( game.packs?.get(packId) ) continue;
    index ??= await localIndex();
    const match = index.get(`${item.type}|${String(item.name).toLowerCase()}`);
    item._stats ??= {};
    item._stats.compendiumSource = match ?? null;
    if ( item.flags?.core?.sourceId ) delete item.flags.core.sourceId;
    if ( match ) counts.relinked++; else counts.dropped++;
  }
  return counts;
}

/** "type|name" → the UUID of the first local compendium Item with that name. */
async function localIndex() {
  const map = new Map();
  for ( const pack of game.packs?.filter(p => p.documentName === "Item") ?? [] ) {
    let index;
    try { index = await pack.getIndex({ fields: ["type"] }); } catch(err) { continue; }
    for ( const e of index ) {
      const key = `${e.type}|${e.name.toLowerCase()}`;
      if ( !map.has(key) ) map.set(key, e.uuid ?? `Compendium.${pack.collection}.Item.${e._id}`);
    }
  }
  return map;
}

/**
 * Replace an actor with imported data (no questions asked: the dialog is importCharacter's job).
 * puImport: the audit notes one line instead of every item.
 */
export async function applyImport(actor, data) {
  const items = data.items ?? [];
  const effects = data.effects ?? [];
  const links = await relinkItems(items);
  const update = foundry.utils.deepClone(data);
  delete update.items;
  delete update.effects;
  if ( actor.items.size ?? actor.items.length ) {
    await actor.deleteEmbeddedDocuments("Item", actor.items.map(i => i.id), { puImport: true });
  }
  if ( actor.effects?.size ?? actor.effects?.length ) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", actor.effects.map(e => e.id), { puImport: true });
  }
  await actor.update(update, { diff: false, recursive: false, puImport: true });
  if ( items.length ) await actor.createEmbeddedDocuments("Item", items, { keepId: true, puImport: true, puBlank: true });
  if ( effects.length ) await actor.createEmbeddedDocuments("ActiveEffect", effects, { keepId: true, puImport: true });
  auditNote(actor, `Imported from a file by ${escape(game.user.name)}`);
  Hooks.callAll("palladium.importCharacter", actor, { items: items.length, ...links });
  return links;
}

/** Ask for a file, check it, confirm, import. */
export async function importCharacter(actor) {
  if ( !actor?.isOwner ) return ui.notifications.warn("You don't own this character.");
  const { DialogV2 } = foundry.applications.api;
  const file = await DialogV2.prompt({
    classes: ["palladium-universal", "pu-skill-mods"],
    window: { title: "Import Character", icon: "fa-solid fa-file-import" },
    content: `<p>Choose a character file (from <strong>Export Character</strong>, or Foundry's own <em>Export Data</em>).
      It replaces <strong>${escape(actor.name)}</strong>: the owner, permissions and folder stay.</p>
      <input type="file" name="file" accept=".json,application/json">`,
    ok: { label: "Next", icon: "fa-solid fa-arrow-right", callback: (event, button) => button.form.elements.file.files?.[0] ?? null },
    rejectClose: false
  });
  if ( !file ) return null;
  let parsed;
  try { parsed = JSON.parse(await foundry.utils.readTextFromFile(file)); }
  catch(err) { return ui.notifications.error("That file couldn't be read as a character file."); }
  let result;
  try { result = readImport(parsed, actor); }
  catch(err) { return ui.notifications.error(err.message); }
  const { data, notes } = result;
  const ok = await DialogV2.confirm({
    classes: ["palladium-universal", "pu-skill-mods"],
    window: { title: "Import Character", icon: "fa-solid fa-file-import" },
    content: `<p><strong>Replace ${escape(actor.name)} with ${escape(data.name)}?</strong> This can't be undone
      (export this character first if you want to keep it).</p>
      <p>Everything on the sheet is replaced: attributes, items, skills, notes, portrait. The owner, permissions and
      folder stay.</p>${notes.map(n => `<p class="hint">${escape(n)}</p>`).join("")}`,
    yes: { label: "Import", icon: "fa-solid fa-file-import" },
    no: { label: "Cancel", default: true }
  });
  if ( !ok ) return null;
  const links = await applyImport(actor, data);
  const extra = links.dropped ? ` ${links.dropped} item${links.dropped === 1 ? "" : "s"} came from a compendium this world doesn't have (kept as they are).` : "";
  ui.notifications.info(`${actor.name} imported.${extra}`);
  return actor;
}

/* -------------------------------------------- */
/*  Printable sheet                             */
/* -------------------------------------------- */

const signed = n => (Number(n) >= 0 ? `+${Number(n)}` : `−${Math.abs(Number(n))}`);
const COMBAT = [["actions", "Actions"], ["initiative", "Initiative"], ["strike", "Strike"], ["parry", "Parry"], ["dodge", "Dodge"],
  ["damage", "Damage"], ["rollImpact", "Roll w/ Impact"], ["pullPunch", "Pull Punch"], ["disarm", "Disarm"]];

/** One readable page of the character, as a complete HTML document. */
export function printableHTML(actor) {
  const s = actor.system, id = s.identity ?? {}, P = CONFIG.PALLADIUM ?? {};
  const items = type => actor.items.filter(i => i.type === type).sort((a, b) => a.name.localeCompare(b.name));
  const row = (k, v) => (v === undefined || v === null || v === "") ? "" : `<div><span>${escape(k)}</span><b>${escape(v)}</b></div>`;
  const attrs = Object.entries(P.ATTRIBUTES ?? {}).map(([k, label]) =>
    `<td><span>${escape(label)}</span><b>${escape(s.attributes?.[k]?.total ?? "—")}</b></td>`).join("");
  const totals = s.combat?.totals ?? {};
  const combat = COMBAT.filter(([k]) => k in totals).map(([k, l]) => row(l, k === "actions" ? totals[k] : signed(totals[k]))).join("");
  const saves = Object.values(s.saves?.totals ?? {}).map(v => row(v.label, `${v.target}+${v.bonus ? ` (${signed(v.bonus)})` : ""}`)).join("");
  const weapons = items("weapon").map(w => `<li><b>${escape(w.name)}</b> ${escape(w.system.damage ?? "")}${w.system.range ? ` · ${escape(w.system.range)}` : ""}</li>`).join("");
  const wps = items("wp").map(w => escape(w.name)).join(", ");
  const skills = items("skill").filter(k => !k.system.passive).map(k => {
    const p = s.skillPercentages?.(k) ?? {};
    return `<li>${escape(k.name)} <b>${p.primary ?? "?"}%</b>${k.system.label2 && (p.secondary !== null) ? ` / ${escape(k.system.label2)} <b>${p.secondary}%</b>` : ""}</li>`;
  }).join("");
  const passive = items("skill").filter(k => k.system.passive).map(k => escape(k.name)).join(", ");
  const powers = ["ability", "psionic", "spell"].flatMap(t => items(t)).map(i => escape(i.name)).join(", ");
  const gear = ["armor", "gear", "device"].flatMap(t => items(t)).map(i => `${escape(i.name)}${i.system.quantity > 1 ? ` ×${i.system.quantity}` : ""}${i.system.equipped ? " (worn)" : ""}`).join(", ");
  const hp = s.health?.hp ?? {}, sdc = s.health?.sdc ?? {};
  const armor = s.health?.armor ?? {};
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(actor.name)}</title><style>
    @page { margin: 12mm; }
    body { font: 11px/1.35 Georgia, serif; color: #1e2a20; margin: 0 auto; max-width: 780px; padding: 12px; }
    h1 { font: bold 24px/1 Impact, "Arial Narrow", sans-serif; color: #234d2f; margin: 0 0 4px; letter-spacing: .02em; }
    h2 { font: bold 13px/1 Impact, "Arial Narrow", sans-serif; color: #234d2f; border-bottom: 2px solid #234d2f; margin: 10px 0 4px; letter-spacing: .04em; text-transform: uppercase; }
    .id, .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px 12px; }
    .grid.two { grid-template-columns: 1fr 1fr; }
    div > span, td > span { color: #666; margin-right: 4px; } div > b { font-weight: bold; }
    table.attrs { width: 100%; border-collapse: collapse; } table.attrs td { border: 1px solid #b9b39a; text-align: center; padding: 3px; }
    table.attrs td span { display: block; font-size: 9px; text-transform: uppercase; } table.attrs td b { font-size: 16px; }
    ul { margin: 0; padding-left: 16px; columns: 2; } li { break-inside: avoid; }
    p { margin: 2px 0; } .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
    .print { position: fixed; top: 8px; right: 8px; } @media print { .print { display: none; } }
    </style></head><body>
    <button class="print" onclick="print()">Print / Save as PDF</button>
    <h1>${escape(actor.name)}</h1>
    <div class="id">${row("Animal", id.species)}${row("Alignment", P.ALIGNMENTS?.[id.alignment] ?? id.alignment)}${row("Level", id.level)}${row("XP", id.xp)}
      ${row("Origin", id.origin)}${row("Education", id.education)}${row("Age / Sex", [id.age, id.sex].filter(x => x).join(" / "))}${row("Height / Weight", [id.height, id.weight].filter(x => x).join(" / "))}
      ${row("Size Level", s.mutation?.sizeLevel)}${row("Education Bonus", id.educationBonus ? `${id.educationBonus}%` : "")}</div>
    <h2>Attributes</h2><table class="attrs"><tr>${attrs}</tr></table>
    <div class="cols"><div><h2>Health</h2><div class="grid two">${row("Hit Points", `${hp.value ?? 0} / ${hp.max ?? 0}`)}${row("S.D.C.", `${sdc.value ?? 0} / ${sdc.max ?? 0}`)}
      ${row("Natural A.R.", s.health?.naturalArmor?.ar || "")}${row("Body Armor", armor.name ? `${armor.name} (A.R. ${armor.ar}, S.D.C. ${armor.sdc?.value ?? 0})` : "")}</div>
      <h2>Saving Throws</h2><div class="grid two">${saves}</div></div>
      <div><h2>Combat</h2><div class="grid two">${row("Training", s.combat?.trainingData?.label ?? s.combat?.training)}${combat}</div></div></div>
    <h2>Weapons</h2>${weapons ? `<ul>${weapons}</ul>` : "<p>None</p>"}${wps ? `<p><span>W.P.s:</span> ${wps}</p>` : ""}
    <h2>Skills</h2>${skills ? `<ul>${skills}</ul>` : "<p>None</p>"}${passive ? `<p><span>Also:</span> ${passive}</p>` : ""}
    ${powers ? `<h2>Abilities, Powers & Spells</h2><p>${powers}</p>` : ""}
    <h2>Gear</h2><p>${gear || "None"}</p>
    </body></html>`;
}

/** Open the printable sheet in a new window (or download it when pop-ups are blocked). */
export function printCharacter(actor) {
  const html = printableHTML(actor);
  const w = window.open("", "_blank");
  if ( w?.document ) {
    w.document.open();
    w.document.write(html);
    w.document.close();
    return w;
  }
  foundry.utils.saveDataToFile(html, "text/html", `${fileName(actor.name)}.html`);
  return null;
}
