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
      detail: sys.generation?.rolled ? "Rolled" : "Roll Attributes button above" },
    { key: "animal", label: "Choose the animal", tab: "mutation", roll: "animalCategory", done: !!(animal || id.species),
      detail: animal?.name || id.species || "Drag an Animal onto the sheet" },
    { key: "bioe", label: "Spend Bio-E", tab: "mutation", done: !!(animal || id.species) && (bioe.remaining === 0),
      detail: bioeDetail },
    { key: "origin", label: "Origin", tab: "mutation", roll: "origin", done: !!origin,
      detail: origin || "Drop an Origin background, or type it in the header" },
    { key: "education", label: "Education", tab: "mutation", done: !!education,
      detail: education || "Drop an Education background, or type it in the header" },
    { key: "skills", label: "Skills", tab: "skills", done: skills > 0,
      detail: skills ? `${skills} skill${skills === 1 ? "" : "s"}` : "Add the skills from the Origin and Education" },
    { key: "alignment", label: "Alignment", tab: "core", done: !!id.alignment,
      detail: id.alignment ? (CONFIG.PALLADIUM.ALIGNMENTS[id.alignment] ?? id.alignment) : "Pick one in the header" },
    { key: "money", label: "Starting Money", tab: "gear", done: (sys.money?.starting ?? 0) > 0,
      detail: sys.money?.starting > 0 ? CONFIG.PALLADIUM.formatCost(sys.money.starting) : "Roll the Origin / Education money, enter it on the Gear tab" },
    { key: "hp", label: "Roll Hit Points", tab: "core", done: !!hp.rolled || (hp.max > 0),
      detail: (hp.rolled || (hp.max > 0)) ? `${hp.max} max` : "P.E. + 1D6: Roll Hit Points under Health & Damage" }
  ];
  const done = steps.filter(s => s.done).length;
  return { steps, done, total: steps.length, complete: done === steps.length };
}
