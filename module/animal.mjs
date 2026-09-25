/**
 * Applying Animal and Background items to a character (Steps 2–4, p.13–19).
 */

import { isBluntWeapon } from "./blunt.mjs";

const FLAG = "palladium-universal";

/** Items on the actor that were bought from its animal's option list. */
export function purchasedItems(actor) {
  return actor.items.filter(i => i.getFlag(FLAG, "animalOption"));
}

/**
 * Make an Animal the character's species: replaces any previous animal (and the abilities bought
 * from it), then sets Bio-E, Size Level, build and Human Feature costs from the animal's entry.
 * @param {Actor} actor
 * @param {object} data   Item data for the animal
 */
export async function applyAnimal(actor, data) {
  const old = actor.items.filter(i => i.type === "animal");
  const bought = purchasedItems(actor);
  if ( old.length || bought.length ) {
    await actor.deleteEmbeddedDocuments("Item", [...old, ...bought].map(i => i.id));
  }

  const itemData = foundry.utils.deepClone(data);
  delete itemData._id;
  const [animal] = await actor.createEmbeddedDocuments("Item", [itemData]);
  const a = animal.system;

  const update = {
    "system.identity.species": animal.name,
    "system.mutation.bioeTotal": a.bioe,
    "system.mutation.originalSizeLevel": a.sizeLevel,
    "system.mutation.sizeLevel": a.sizeLevel,
    "system.mutation.build": a.build
  };
  for ( const [key, f] of Object.entries(a.features) ) {
    // An automatic level costs nothing; the next level up costs the difference listed. Levels below
    // the automatic one only count when the entry lists a negative cost (Bio-E gained by giving it up).
    const below = n => Math.min(0, n);
    update[`system.mutation.features.${key}.level`] = f.auto;
    update[`system.mutation.features.${key}.noneCost`] = f.auto === "none" ? 0 : below(f.none);
    update[`system.mutation.features.${key}.partialCost`] = f.auto === "none" ? f.partial
      : f.auto === "partial" ? 0 : below(f.partial);
    update[`system.mutation.features.${key}.fullCost`] = f.auto === "full" ? 0 : f.full;
    update[`system.mutation.features.${key}.fullAvailable`] = f.fullAvailable;
  }
  await actor.update(update);

  // Options that cost 0 Bio-E are automatic for this animal (e.g. Salamander Regeneration).
  for ( const option of a.options.filter(o => o.bioe === 0) ) await setOptionPurchased(actor, option.id, true);

  ui.notifications.info(`${actor.name} is now a mutant ${animal.name} (${a.bioe} Bio-E, Size Level ${a.sizeLevel}).`);
  return animal;
}

/**
 * Buy or refund one of the animal's abilities or natural weapons.
 * Options in the same choice group are alternatives: buying one refunds the others.
 * @param {Actor} actor
 * @param {string} optionId
 * @param {boolean} buy
 */
export async function setOptionPurchased(actor, optionId, buy) {
  const animal = actor.items.find(i => i.type === "animal");
  const option = animal?.system.options.find(o => o.id === optionId);
  if ( !option ) return;

  const owned = purchasedItems(actor);
  const toDelete = owned.filter(i => {
    const id = i.getFlag(FLAG, "animalOption");
    if ( id === optionId ) return !buy;
    if ( !buy || !option.choiceGroup ) return false;
    const other = animal.system.options.find(o => o.id === id);
    return other?.choiceGroup === option.choiceGroup;
  });
  if ( toDelete.length ) await actor.deleteEmbeddedDocuments("Item", toDelete.map(i => i.id));
  if ( !buy || owned.some(i => i.getFlag(FLAG, "animalOption") === optionId) ) return;

  const flags = { [FLAG]: { animalOption: optionId } };
  const description = option.notes ? `<p>${option.notes}</p>` : "";
  const itemData = option.kind === "weapon"
    ? { name: option.name, type: "weapon", img: "icons/skills/melee/unarmed-punch-fist.webp", flags,
      system: { weaponType: "natural", damage: option.damage || "1D6", bioe: option.bioe, effects: option.effects,
        description, blunt: isBluntWeapon({ type: "weapon", name: option.name, system: { weaponType: "natural" } }) } }
    : { name: option.name, type: "ability", img: "icons/magic/nature/wolf-paw-glow-large-green.webp", flags,
      system: { bioe: option.bioe, naturalAR: option.naturalAR, effects: option.effects, description } };
  await actor.createEmbeddedDocuments("Item", [itemData]);
}

/**
 * Remove the character's animal and everything bought from it.
 * @param {Actor} actor
 */
export async function removeAnimal(actor) {
  const items = [...actor.items.filter(i => i.type === "animal"), ...purchasedItems(actor)];
  if ( items.length ) await actor.deleteEmbeddedDocuments("Item", items.map(i => i.id));
}

/**
 * Apply an Origin, Creator Organization or Education item. One of each kind at a time.
 * @param {Actor} actor
 * @param {object} data   Item data for the background
 */
export async function applyBackground(actor, data) {
  const kind = data.system?.kind ?? "education";
  const old = actor.items.filter(i => (i.type === "background") && (i.system.kind === kind));
  if ( old.length ) await actor.deleteEmbeddedDocuments("Item", old.map(i => i.id));
  const itemData = foundry.utils.deepClone(data);
  delete itemData._id;
  const [item] = await actor.createEmbeddedDocuments("Item", [itemData]);

  const b = item.system;
  const update = {};
  if ( kind === "origin" ) update["system.identity.origin"] = item.name;
  if ( kind === "education" ) {
    update["system.identity.education"] = item.name;
    update["system.identity.educationBonus"] = b.educationBonus;
  }
  if ( b.combatTraining && (b.combatTraining in CONFIG.PALLADIUM.COMBAT_TRAINING)
    && (actor.system.combat.training === "none") ) {
    update["system.combat.training"] = b.combatTraining;
  }
  if ( !foundry.utils.isEmpty(update) ) await actor.update(update);
  return item;
}
