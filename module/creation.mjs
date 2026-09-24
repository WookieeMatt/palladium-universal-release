import { signed } from "./dice.mjs";

/**
 * Attribute generation (p.12). Clicking an attribute abbreviation on the character sheet runs the
 * calculation below and prints it to chat. Nothing is saved to the character: the result is
 * ephemeral.
 *
 *  1. Base: 3D6.
 *  2. Exceptional: on 16, 17 or 18 add 1D6. Team rule: with team generation on (world setting), if
 *     another member of the team (same Actors folder) rolled a higher bonus die for this attribute,
 *     use theirs.
 *  3–5. The modifiers the character sheet works out before any roll (CharacterData, attr.gen):
 *     species, Size Level (I.Q., P.S., P.E., Spd) and physical skills (P.S., P.P., P.E., Spd).
 *     Dice bonuses that haven't been rolled (e.g. Boxing +1D4) are rolled here.
 */

/** Roll unrolled dice bonuses (e.g. "1D4") and return their sum. */
async function rollDice(formulas, rolls) {
  let total = 0;
  for ( const formula of formulas ) {
    if ( !Roll.validate(formula) ) continue;
    const roll = await new Roll(formula).evaluate();
    rolls.push(roll);
    total += roll.total;
  }
  return total;
}

/**
 * The highest exceptional die a teammate rolled for this attribute, read from their generation cards
 * in the chat log. Team generation is a world setting; the team is the character's Actors folder.
 * @param {Actor} actor
 * @param {string} key
 * @returns {{die: number, name: string}|null}
 */
export function teamBonusDie(actor, key) {
  let enabled = false;
  try { enabled = game.settings.get("palladium-universal", "teamGeneration"); } catch(err) { enabled = false; }
  const folder = actor.folder?.id;
  if ( !enabled || !folder ) return null;
  let best = null;
  for ( const message of game.messages ?? [] ) {
    const data = message.flags?.["palladium-universal"];
    if ( (data?.card !== "attributeGeneration") || (data.key !== key) || !data.exceptionalDie ) continue;
    if ( data.actorUuid === actor.uuid ) continue;
    const mate = fromUuidSync(data.actorUuid);
    if ( mate?.folder?.id !== folder ) continue;
    if ( !best || (data.exceptionalDie > best.die) ) best = { die: data.exceptionalDie, name: mate.name };
  }
  return best;
}

/**
 * Generate an attribute and print the calculation to chat. Nothing is saved.
 * @param {Actor} actor
 * @param {string} key   Attribute key ("iq", "me", ...)
 * @returns {Promise<object|null>}  The calculation
 */
export async function rollAttribute(actor, key) {
  const label = CONFIG.PALLADIUM.ATTRIBUTES[key];
  if ( !label || !actor.system.attributes?.[key] ) return null;
  const data = { formula: "3d6", exceptional: [16, 17, 18], bonusFormula: "1d6" };
  if ( Hooks.call("palladium.preRollAttribute", actor, key, data) === false ) return null;
  const rolls = [];

  // Steps 1–2: base roll and exceptional die.
  const base = await new Roll(data.formula).evaluate();
  rolls.push(base);
  let exceptional = null;
  let exceptionalDie = null;
  let exceptionalText = "N/A";
  if ( data.exceptional.includes(base.total) ) {
    const bonus = await new Roll(data.bonusFormula).evaluate();
    rolls.push(bonus);
    exceptionalDie = exceptional = bonus.total;
    exceptionalText = `${bonus.total}`;
    const team = teamBonusDie(actor, key);
    if ( team && (team.die > bonus.total) ) {
      exceptional = team.die;
      exceptionalText = `${team.die} (team: ${team.name}'s die replaces ${bonus.total})`;
    }
  }

  // Steps 3–5: the modifiers the sheet already worked out (species, size, physical skills); only
  // dice bonuses nobody has rolled yet are rolled now.
  const gen = actor.system.attributes[key].gen;
  const species = gen.species + await rollDice(gen.speciesDice, rolls);
  const size = gen.size;
  const physical = gen.physical === null ? null : gen.physical + await rollDice(gen.physicalDice, rolls);

  const total = base.total + (exceptional ?? 0) + species + (size ?? 0) + (physical ?? 0);
  const result = { key, base: base.total, exceptional, exceptionalDie, species, size, physical, total };

  // Step 6: chat log, then discard.
  const line = (name, value) => `<li>${name}: ${value}</li>`;
  const content = `<div class="pu-card"><p class="pu-text"><strong>Generating ${label}</strong></p>
    <ul class="pu-results">
      ${line("Base 3D6", base.total)}
      ${line("Exceptional 1D6", exceptionalText)}
      ${line("Species Bonus", signed(species))}
      ${line("Size Modifier", size === null ? "N/A" : signed(size))}
      ${line("Physical Skill Bonus", physical === null ? "N/A" : signed(physical))}
    </ul>
    <p class="pu-text"><strong>Final Total: ${total}</strong></p></div>`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), rolls, content,
    flags: { "palladium-universal": { card: "attributeGeneration", actorUuid: actor.uuid, key, exceptionalDie } }
  });
  Hooks.callAll("palladium.rollAttribute", actor, key, result);
  return result;
}
