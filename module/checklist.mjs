/**
 * The Core tab's creation checklist: the character-creation steps in book order, each done or not,
 * with what's missing and the tab to go to. Characters only; it hides once every step is done.
 */

/**
 * @param {Actor} actor
 * @returns {{steps: object[], done: number, total: number, complete: boolean}}
 */
export function creationChecklist(actor) {
  const sys = actor.system;
  const id = sys.identity;
  const items = [...actor.items];
  const has = type => items.some(i => i.type === type);
  const background = kind => items.find(i => (i.type === "background") && (i.system.kind === kind));
  const animal = items.find(i => i.type === "animal");
  const bioe = sys.mutation?.bioe ?? {};
  const skills = items.filter(i => i.type === "skill").length;
  const origin = background("origin")?.name || id.origin;
  const education = background("education")?.name || id.education;
  const hp = sys.health?.hp ?? {};

  const bioeDetail = !(animal || id.species) ? "Choose the animal first"
    : bioe.remaining > 0 ? `${bioe.remaining} Bio-E left to spend`
      : bioe.remaining < 0 ? `Overspent by ${-bioe.remaining} Bio-E` : `All ${bioe.total} Bio-E spent`;

  const steps = [
    { key: "attributes", label: "Roll Attributes", tab: "core", done: !!sys.generation?.rolled,
      action: "rollAttributes", actionHint: "Roll the attributes (once)",
      detail: sys.generation?.rolled ? "Rolled" : "Click the dice to roll them" },
    { key: "animal", label: "Choose the animal", tab: "mutation", roll: "animalCategory", done: !!(animal || id.species),
      detail: animal?.name || id.species || "Drag an Animal onto the sheet, or roll one with the dice" },
    { key: "bioe", label: "Spend Bio-E", tab: "mutation", done: !!(animal || id.species) && (bioe.remaining === 0),
      detail: bioeDetail },
    { key: "origin", label: "Origin", tab: "mutation", roll: "origin", done: !!origin,
      detail: origin || "Drag an Origin onto the sheet, type it at the top, or roll one with the dice" },
    { key: "education", label: "Education", tab: "mutation", done: !!education,
      detail: education || "Drag an Education onto the sheet, or type it at the top" },
    { key: "skills", label: "Skills", tab: "skills", done: skills > 0,
      detail: skills ? `${skills} skill${skills === 1 ? "" : "s"}` : "Add the skills your Origin and Education give you" },
    { key: "alignment", label: "Alignment", tab: "core", done: !!id.alignment,
      detail: id.alignment ? (CONFIG.PALLADIUM.ALIGNMENTS[id.alignment] ?? id.alignment) : "Choose one at the top of the sheet" },
    { key: "money", label: "Starting Money", tab: "gear", done: (sys.money?.starting ?? 0) > 0,
      detail: sys.money?.starting > 0 ? CONFIG.PALLADIUM.formatCost(sys.money.starting) : "Roll your Origin and Education money, enter it on the Gear tab" },
    { key: "hp", label: "Roll Hit Points", tab: "core", done: !!hp.rolled || (hp.max > 0),
      action: sys.generation?.rolled ? "rollHitPoints" : null, actionHint: "Roll the Hit Points (once)",
      detail: (hp.rolled || (hp.max > 0)) ? `${hp.max} Hit Points` : sys.generation?.rolled ? "Click the dice: P.E. + 1D6" : "Roll Attributes first" }
  ];
  const done = steps.filter(s => s.done).length;
  return { steps, done, total: steps.length, complete: done === steps.length };
}

/* -------------------------------------------- */
/*  The compendiums behind a step (book button)  */
/* -------------------------------------------- */

/** Which items each step's compendium holds. */
const STEP_ITEMS = {
  animal: e => e.type === "animal",
  origin: e => (e.type === "background") && (e.system?.kind === "origin"),
  education: e => (e.type === "background") && (e.system?.kind === "education"),
  skills: e => e.type === "skill"
};
/** A pack "is" that kind of compendium when most of its entries are that item type. */
const STEP_TYPE = { animal: "animal", origin: "background", education: "background", skills: "skill" };

let packCache = null;

/**
 * The Item compendiums for the checklist's steps: {animal: [pack], origin: [...], education: [...], skills: [...]}.
 * A step gets the packs that are mostly its item type and hold at least one entry for it (e.g. the
 * Origins & Education pack for both Origin and Education). Empty lists when no such compendium is installed.
 */
export async function stepCompendiums() {
  const packs = game.packs?.filter(p => (p.documentName === "Item") && p.visible !== false) ?? [];
  const key = packs.map(p => p.collection).join();
  if ( packCache?.key === key ) return packCache.result;
  const result = Object.fromEntries(Object.keys(STEP_ITEMS).map(k => [k, []]));
  for ( const pack of packs ) {
    let index;
    try { index = await pack.getIndex({ fields: ["type", "system.kind"] }); } catch(err) { continue; }
    const entries = [...(index?.values?.() ?? index ?? [])];
    if ( !entries.length ) continue;
    for ( const [step, test] of Object.entries(STEP_ITEMS) ) {
      const ofType = entries.filter(e => e.type === STEP_TYPE[step]).length;
      if ( (ofType * 2 > entries.length) && entries.some(test) ) result[step].push(pack);
    }
  }
  packCache = { key, result };
  return result;
}

/** Open a step's compendiums. */
export async function openStepCompendiums(step) {
  const packs = (await stepCompendiums())[step] ?? [];
  for ( const pack of packs ) pack.render(true);
  return packs.length;
}
