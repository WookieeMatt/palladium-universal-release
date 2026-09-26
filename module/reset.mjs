import { purchasedItems } from "./animal.mjs";
import { auditNote } from "./audit.mjs";

/**
 * Reset Character (v1.31.0): the only way to roll a character's creation again. The button sits at the end of
 * the Creation Checklist. It clears everything made during character creation and keeps the rest:
 *  - cleared: the animal and everything bought with Bio-E, the backgrounds, skills (Combat Training included),
 *    psionics, attributes, Hit Points, the header's creation fields, Bio-E / size / Human Features, starting money;
 *  - kept: name, portrait and token, XP and level, weapons, armor and gear, notes, spells.
 * Only level 1 characters can be reset. Owners get the number of resets the GM sets in the world setting "Character Resets Allowed" (per character);
 * the GM can always reset and it doesn't count. The audit notes only that a reset happened.
 */

const SCOPE = "palladium-universal";
const SETTING = "characterResets";
const USED = "resetsUsed";

/** Items made during character creation. */
const CREATION_TYPES = new Set(["animal", "background", "skill", "psionic"]);

/** Register the setting (in "init"). */
export function registerResetSettings() {
  game.settings.register(SCOPE, SETTING, {
    name: "Character Resets Allowed",
    hint: "How many times a player may reset each of their characters (Reset Character, at the end of the Creation Checklist) to redo character creation. 0 = never. The GM can always reset, and it doesn't count.",
    scope: "world", config: true, type: Number, default: 1,
    range: { min: 0, max: 10, step: 1 }
  });
}

/** Resets allowed per character (world setting). */
export function resetsAllowed() {
  try { return Math.max(0, Number(game.settings.get(SCOPE, SETTING)) || 0); }
  catch(err) { return 1; }
}

/** How many resets this character has left (Infinity for the GM). */
export function resetsLeft(actor, user = game.user) {
  if ( user?.isGM ) return Infinity;
  return Math.max(0, resetsAllowed() - (actor.getFlag?.(SCOPE, USED) ?? 0));
}

/** The reset button's state for the sheet. */
export function resetState(actor) {
  if ( (actor?.type !== "character") || !actor.isOwner ) return null;
  if ( !isLevelOne(actor) ) return { enabled: false, text: "Level 1 only", hint: "Only a level 1 character can be reset." };
  const left = resetsLeft(actor);
  if ( left === Infinity ) return { enabled: true, text: "GM: unlimited", hint: "Start this character's creation over. As GM your resets don't count." };
  if ( !left ) return { enabled: false, text: "No resets left", hint: "No resets left for this character. The GM can allow more in the System Settings (Character Resets Allowed)." };
  return { enabled: true, text: `${left} reset${left === 1 ? "" : "s"} left`, hint: "Start this character's creation over." };
}

/** Only level 1 characters can be reset (the user's rule, v1.31). */
export function isLevelOne(actor) {
  return (Number(actor?.system?.identity?.level) || 1) <= 1;
}

/** The item ids a reset removes. */
export function creationItemIds(actor) {
  const ids = new Set(purchasedItems(actor).map(i => i.id));
  for ( const i of actor.items ) if ( CREATION_TYPES.has(i.type) ) ids.add(i.id);
  return [...ids];
}

/** A field's starting value from the data model (falls back to the given value). */
function initial(actor, path, fallback) {
  try {
    const field = actor.system.schema.getField(path);
    const v = field?.getInitialValue?.({});
    return v === undefined ? fallback : v;
  }
  catch(err) { return fallback; }
}

/** The actor update that clears the creation fields. */
export function resetUpdate(actor) {
  const update = {};
  const set = (path, fallback) => { update[`system.${path}`] = initial(actor, path, fallback); };
  for ( const k of ["species", "origin", "education", "alignment", "age", "sex", "height", "weight"] ) set(`identity.${k}`, "");
  set("identity.educationBonus", 0);
  for ( const k of Object.keys(actor.system.attributes ?? {}) ) {
    update[`system.attributes.${k}.value`] = null;
    update[`system.attributes.${k}.dice`] = 0;
  }
  set("money.starting", 0);
  for ( const k of ["rolled", "rerollAllowed", "hpRerollAllowed"] ) update[`system.generation.${k}`] = false;
  // Bio-E / Mutation: back to the starting values, except T.E. drift from time travel (that happened in play).
  let keys = [];
  try { keys = Object.keys(actor.system.schema.getField("mutation")?.fields ?? {}); } catch(err) { /* no schema */ }
  for ( const k of keys ) {
    if ( k === "teDrift" ) continue;
    const v = initial(actor, `mutation.${k}`, undefined);
    if ( v !== undefined ) update[`system.mutation.${k}`] = v;
  }
  update["system.health.hp.dice"] = [];
  update["system.health.hp.bonus"] = 0;
  update["system.health.hp.value"] = 0;
  update["system.health.hp.max"] = 0;
  update["system.health.sdc.value"] = 0;
  update["system.health.sdc.bonus"] = 0;
  update["system.health.naturalArmor.ar"] = 0;
  update["system.combat.training"] = "none";
  update["system.combat.bonusLevels"] = 0;
  update["system.saves.isPsychic"] = false;
  update["system.magic.tradition"] = "none";
  update["system.magic.payBioE"] = true;
  update[`flags.${SCOPE}.-=checklistHidden`] = null;
  update[`flags.${SCOPE}.-=checklistShown`] = null;
  return update;
}

/** The confirmation popup's text. */
function confirmText(actor, left) {
  const name = foundry.utils.escapeHTML(actor.name);
  const count = left === Infinity ? "<p>As GM, your resets don't count.</p>"
    : `<p>This character has <strong>${left} reset${left === 1 ? "" : "s"}</strong> left. After this one: <strong>${left - 1}</strong>.</p>`;
  return `<p><strong>Start ${name}'s character creation over?</strong> This can't be undone.</p>
    <p><strong>Cleared:</strong> the animal and everything bought with Bio-E (abilities, natural weapons, psionics, size,
    Human Features), Origin, Creator Organization and Education, skills and Combat Training, the attributes, Hit Points,
    alignment, age, sex, height, weight and starting money.</p>
    <p><strong>Kept:</strong> name, portrait and token, XP and level, weapons, armor and gear, notes and spells.</p>
    ${count}`;
}

/**
 * Reset a character's creation (asks first).
 * @param {Actor} actor
 * @param {object} [options]
 * @param {boolean} [options.confirm=true]   Ask before resetting (macros can skip it)
 * @returns {Promise<boolean>}  Whether it was reset
 */
export async function resetCharacter(actor, { confirm = true } = {}) {
  if ( actor?.type !== "character" ) return false;
  if ( !actor.isOwner ) { ui.notifications?.warn("You don't own this character."); return false; }
  if ( !isLevelOne(actor) ) { ui.notifications?.warn("Only a level 1 character can be reset."); return false; }
  const left = resetsLeft(actor);
  if ( !left ) { ui.notifications?.warn("No resets left for this character. Ask the GM."); return false; }
  if ( confirm ) {
    const ok = await foundry.applications.api.DialogV2.confirm({
      classes: ["palladium-universal", "pu-skill-mods"],
      window: { title: "Reset Character", icon: "fa-solid fa-rotate-left" },
      content: confirmText(actor, left),
      yes: { label: "Reset Character", icon: "fa-solid fa-rotate-left" },
      no: { label: "Cancel", default: true }
    });
    if ( !ok ) return false;
  }
  const ids = creationItemIds(actor);
  // puReset: the audit notes the reset once instead of every removed item.
  if ( ids.length ) await actor.deleteEmbeddedDocuments("Item", ids, { puReset: true });
  const update = resetUpdate(actor);
  if ( !game.user.isGM ) update[`flags.${SCOPE}.${USED}`] = (actor.getFlag(SCOPE, USED) ?? 0) + 1;
  await actor.update(update, { puReset: true });
  auditNote(actor, `Character reset (creation started over) by ${foundry.utils.escapeHTML(game.user.name)}`);
  ui.notifications?.info(`${actor.name} has been reset: character creation starts over.`);
  Hooks.callAll("palladium.resetCharacter", actor, { items: ids.length, by: game.user.id });
  return true;
}
