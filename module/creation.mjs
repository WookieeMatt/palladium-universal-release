import { cardHeader, signed } from "./dice.mjs";

const { DialogV2 } = foundry.applications.api;

/**
 * Attribute rolls (p.12). Clicking an attribute rolls 3D6 (+1D6 once on 16, 17 or 18), adds that
 * attribute's modifiers (animal, background and skill bonuses, Size Level, Misc) and prints the final
 * score to chat. The rolled base is saved behind the scenes so the sheet's bonuses keep working.
 */

/**
 * The modifiers on an attribute's line, as labelled parts.
 * @param {Actor} actor
 * @param {string} key
 * @returns {Array<{label: string, value: number}>}
 */
export function attributeModifiers(actor, key) {
  const sys = actor.system;
  const attr = sys.attributes[key];
  const parts = [];
  for ( const { source, value } of sys.itemEffects?.sources?.[`attributes.${key}`] ?? [] ) {
    if ( value ) parts.push({ label: source, value });
  }
  if ( attr.sizeMod ) parts.push({ label: `Size Level ${sys.mutation.sizeLevel}`, value: attr.sizeMod });
  if ( attr.mod ) parts.push({ label: "Misc", value: attr.mod });
  return parts;
}

/**
 * Roll an attribute and print the final score to chat.
 * @param {Actor} actor
 * @param {string} key   Attribute key ("iq", "me", ...)
 * @returns {Promise<number|null>}  The final score, or null if cancelled
 */
export async function rollAttribute(actor, key) {
  const label = CONFIG.PALLADIUM.ATTRIBUTES[key];
  const attr = actor.system.attributes?.[key];
  if ( !label || !attr ) return null;
  if ( Number.isFinite(attr.value) && !(await DialogV2.confirm({
    window: { title: `${actor.name}: Roll ${label}` },
    content: `<p>${label} is already rolled (score <strong>${attr.total}</strong>). Roll it again and replace it?</p>`
  })) ) return null;

  const data = { formula: "3d6", exceptional: [16, 17, 18], bonusFormula: "1d6" };
  if ( Hooks.call("palladium.preRollAttribute", actor, key, data) === false ) return null;
  const roll = await new Roll(data.formula).evaluate();
  const rolls = [roll];
  const lines = [`<li>${data.formula.toUpperCase()}: <strong>${roll.total}</strong></li>`];
  let base = roll.total;
  if ( data.exceptional.includes(roll.total) ) {
    const bonus = await new Roll(data.bonusFormula).evaluate();
    rolls.push(bonus);
    base += bonus.total;
    lines.push(`<li><strong class="pu-crit">Exceptional!</strong> ${data.bonusFormula.toUpperCase()}: <strong>+${bonus.total}</strong></li>`);
  }

  await actor.update({ [`system.attributes.${key}.value`]: base });
  const after = actor.system.attributes[key];
  for ( const part of attributeModifiers(actor, key) ) lines.push(`<li>${part.label}: <strong>${signed(part.value)}</strong></li>`);
  if ( after.halved ) lines.push(`<li>Halved by a Human Feature</li>`);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), rolls,
    content: `<div class="pu-card">${cardHeader(actor, `Rolls ${label}`)}
      <ul class="pu-results">${lines.join("")}</ul>
      <p class="pu-text"><strong>${label} ${after.total}</strong></p></div>`
  });
  Hooks.callAll("palladium.rollAttribute", actor, key, { base, total: after.total, rolls });
  return after.total;
}
