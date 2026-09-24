import {
  DEVICE_MALFUNCTIONS, MISHAP_CYCLES, MISHAP_TWISTS, NULL_TIME_FRAGMENT, NULL_TIME_LEVELS, PRACTICE_NEEDED,
  SPELL_PRACTICE, TEMPORAL_MISHAPS, TE_CHANGE_STEP, tableRow
} from "./config.mjs";
import { cardHeader } from "./dice.mjs";

/**
 * Time travel tables (Transdimensional TMNT p.33, p.41, p.49, p.53–54, p.86–87).
 */

/**
 * Roll the Temporal Mishap Table, including its follow-up table.
 * @returns {Promise<{html: string, rolls: Roll[]}>}
 */
export async function temporalMishap() {
  const roll = await new Roll("1d100").evaluate();
  const row = tableRow(TEMPORAL_MISHAPS, roll.total);
  const rolls = [roll];
  let detail = "";
  if ( row.sub ) {
    const sub = await new Roll("1d100").evaluate();
    rolls.push(sub);
    if ( row.sub === "cycle" ) detail = `Cycle ${tableRow(MISHAP_CYCLES, sub.total).label}`;
    else if ( row.sub === "twist" ) detail = `Twist ${tableRow(MISHAP_TWISTS, sub.total).label}`;
    else detail = NULL_TIME_LEVELS[sub.total] ?? NULL_TIME_FRAGMENT;
    detail = `<br><strong>${detail}</strong> <span class="hint">(${sub.total})</span>`;
  }
  const html = `<strong>Temporal Mishap ${roll.total}: ${row.label}.</strong> ${row.text}${detail}`;
  return { html, rolls };
}

/**
 * Post a Temporal Mishap card.
 * @param {Actor} actor
 * @param {string} [title]
 */
export async function rollTemporalMishap(actor, title = "Temporal Mishap") {
  const { html, rolls } = await temporalMishap();
  const content = `<div class="pu-card">${cardHeader(actor, title)}<p class="pu-notes">${html}</p></div>`;
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls });
}

/**
 * Roll a device's malfunction table.
 * @param {string} key   A DEVICE_MALFUNCTIONS key ("temporal", "gateway", "portable", "miniature")
 * @returns {Promise<{html: string, rolls: Roll[]}|null>}
 */
export async function deviceMalfunction(key) {
  if ( key === "temporal" ) return temporalMishap();
  const table = DEVICE_MALFUNCTIONS[key];
  if ( !table?.rows ) return null;
  const roll = await new Roll("1d100").evaluate();
  return { html: `<strong>${table.label} malfunction ${roll.total}:</strong> ${tableRow(table.rows, roll.total).text}`, rolls: [roll] };
}

/* -------------------------------------------- */
/*  Spell practice                              */
/* -------------------------------------------- */

/**
 * Practice an unmastered spell: Time Lords roll the Temporal Spell Experimentation Table (two complete
 * successes make it castable, p.49); wizards the self-taught Success or Failure table (p.41).
 * @param {Actor} actor
 * @param {Item} spell
 */
export async function practiceSpell(actor, spell) {
  const tradition = spell.system.tradition;
  const table = SPELL_PRACTICE[tradition];
  const needed = PRACTICE_NEEDED[tradition];
  const roll = await new Roll("1d100").evaluate();
  const row = tableRow(table, roll.total);
  let status = "";
  if ( row.success ) {
    const successes = spell.system.successes + 1;
    const mastered = successes >= needed;
    await spell.update({ "system.successes": successes, "system.mastered": mastered });
    status = mastered ? `<strong class="pu-success">${spell.name} is mastered and can be cast.</strong>`
      : `<span class="pu-success">${successes} of ${needed} complete successes.</span>`;
  }
  const buttons = [];
  if ( row.damage ) buttons.push(`<button type="button" data-pu-action="self-damage" data-formula="${row.damage}"><i class="fa-solid fa-burst"></i> Take ${row.damage}</button>`);
  if ( row.change ) buttons.push(`<button type="button" data-pu-action="change-save"><i class="fa-solid fa-hourglass-half"></i> Save vs T.E. Change</button>`);
  if ( row.mishap ) buttons.push(`<button type="button" data-pu-action="temporal-mishap"><i class="fa-solid fa-clock-rotate-left"></i> Temporal Mishap</button>`);
  const title = tradition === "timeLord" ? "Temporal Spell Experimentation" : "Self-Taught Spell Attempt";
  const content = `<div class="pu-card">${cardHeader(actor, `${title}: ${spell.name}`, `Roll ${roll.total}`)}
    <p class="pu-notes"><span class="${row.success ? "pu-success" : "pu-failure"}">${row.text}</span> ${status}</p>
    ${buttons.length ? `<div class="pu-buttons">${buttons.join("")}</div>` : ""}</div>`;
  const flags = { "palladium-universal": { card: "practice", actorUuid: actor.uuid } };
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls: [roll], flags });
}

/* -------------------------------------------- */
/*  T.E. evolution / devolution                 */
/* -------------------------------------------- */

/**
 * Record T.E. change after a failed save vs Change: ±5 Bio-E points (p.33).
 * @param {Actor} actor
 * @param {number} direction   +1 evolution (moved forward in time), −1 devolution (moved back)
 */
export async function applyTeChange(actor, direction) {
  if ( !actor?.isOwner ) return ui.notifications.warn("Only the character's owner can record T.E. change.");
  const drift = actor.system.mutation.teDrift + (direction * TE_CHANGE_STEP);
  await actor.update({ "system.mutation.teDrift": drift });
  const word = direction > 0 ? "evolves" : "devolves";
  ui.notifications.info(`${actor.name} ${word}: T.E. change is now ${drift > 0 ? "+" : ""}${drift} Bio-E.`);
}
