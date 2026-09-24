import { cardHeader, postCard, signed } from "./dice.mjs";

const { DialogV2 } = foundry.applications.api;

/**
 * Attribute generation (p.12), done once at character creation with the "Roll Attributes" button:
 *
 *  1. Base: 3D6 for each attribute.
 *  2. Exceptional: on 16, 17 or 18 add 1D6. Team rule: with team generation on (world setting), if
 *     another member of the team (same Actors folder) rolled a higher bonus die for this attribute,
 *     use theirs.
 *  3–5. The modifiers the character sheet works out before any roll (CharacterData, attr.gen):
 *     species (animal, purchased options, abilities / powers), Size Level (I.Q., P.S., P.E., Spd) and
 *     physical skills (P.S., P.P., P.E., Spd). Dice bonuses (e.g. Boxing +1D4) are rolled here.
 *
 * The roll (3D6 + exceptional die) is saved in attributes.<key>.value and the rolled dice bonuses in
 * attributes.<key>.dice; the sheet shows them in non-editable boxes. Attributes are rolled once: after
 * that a player must ask the GM, who allows one re-roll (system.generation.rerollAllowed).
 * During play, clicking an attribute prints its score and bonuses to chat (no roll).
 */

/** Roll dice bonuses (e.g. "1D4") and return their sum. */
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
    if ( data?.card !== "attributeGeneration" ) continue;
    // One card per attribute (1.5–1.8, `key` + `exceptionalDie`) or one card for all (`dice` by key).
    const die = data.dice ? data.dice[key] : (data.key === key ? data.exceptionalDie : null);
    if ( !die || (data.actorUuid === actor.uuid) ) continue;
    const mate = fromUuidSync(data.actorUuid);
    if ( mate?.folder?.id !== folder ) continue;
    if ( !best || (die > best.die) ) best = { die, name: mate.name };
  }
  return best;
}

/**
 * Generate one attribute: roll 3D6 (+ the exceptional 1D6) and the unrolled dice bonuses, and add the
 * modifiers the sheet worked out. Saves nothing.
 * @param {Actor} actor
 * @param {string} key
 * @param {Roll[]} rolls   Collects the rolls made
 * @returns {Promise<object|null>}
 */
async function generate(actor, key, rolls) {
  const label = CONFIG.PALLADIUM.ATTRIBUTES[key];
  if ( !label || !actor.system.attributes?.[key] ) return null;
  const data = { formula: "3d6", exceptional: [16, 17, 18], bonusFormula: "1d6" };
  if ( Hooks.call("palladium.preRollAttribute", actor, key, data) === false ) return null;

  const base = await new Roll(data.formula).evaluate();
  rolls.push(base);
  let exceptional = null;
  let exceptionalDie = null;
  let team = null;
  if ( data.exceptional.includes(base.total) ) {
    const bonus = await new Roll(data.bonusFormula).evaluate();
    rolls.push(bonus);
    exceptionalDie = exceptional = bonus.total;
    const mate = teamBonusDie(actor, key);
    if ( mate && (mate.die > bonus.total) ) {
      exceptional = mate.die;
      team = mate;
    }
  }

  const gen = actor.system.attributes[key].gen;
  const speciesDice = await rollDice(gen.speciesDice, rolls);
  const physicalDice = gen.physical === null ? 0 : await rollDice(gen.physicalDice, rolls);
  const species = gen.species + speciesDice;
  const size = gen.size;
  const physical = gen.physical === null ? null : gen.physical + physicalDice;
  const rolled = base.total + (exceptional ?? 0);
  const total = rolled + species + (size ?? 0) + (physical ?? 0);
  return { key, label, base: base.total, exceptional, exceptionalDie, team, species, size, physical, rolled,
    dice: speciesDice + physicalDice, total };
}

/**
 * Generate a single attribute and print the calculation to chat, saving nothing. Kept for the API
 * (game.palladium.rollAttribute); the sheet uses rollAttributes.
 * @param {Actor} actor
 * @param {string} key
 */
export async function rollAttribute(actor, key) {
  const rolls = [];
  const r = await generate(actor, key, rolls);
  if ( !r ) return null;
  await postCard(actor, {
    title: `Rolls ${r.label}`, label: r.label, result: r.total, caption: `Generating ${r.label}`, rolls,
    lines: [
      ["Base 3D6", r.base],
      ["Exceptional 1D6", exceptionalText(r)],
      ["Species Bonus", signed(r.species)],
      ["Size Modifier", r.size === null ? "N/A" : signed(r.size)],
      ["Physical Skill Bonus", r.physical === null ? "N/A" : signed(r.physical)],
      ["Final Total", r.total]
    ],
    flags: { "palladium-universal": { card: "attributeGeneration", actorUuid: actor.uuid, key, exceptionalDie: r.exceptionalDie } }
  });
  Hooks.callAll("palladium.rollAttribute", actor, key, r);
  return r;
}

function exceptionalText(r) {
  if ( r.exceptional === null ) return "N/A";
  return r.team ? `${r.team.die} (team: ${r.team.name}'s die replaces ${r.exceptionalDie})` : `${r.exceptional}`;
}

/* -------------------------------------------- */
/*  Roll Attributes (character creation)        */
/* -------------------------------------------- */

/**
 * Roll all eight attributes, save them and post one card with the details. Attributes are rolled once;
 * after that a player asks the GM for permission, and a GM is asked to confirm.
 * @param {Actor} actor
 * @returns {Promise<object[]|null>}  The results, by attribute
 */
export async function rollAttributes(actor) {
  const state = actor.system.generation;
  if ( state?.rolled && !state.rerollAllowed ) {
    if ( !game.user.isGM ) return requestReroll(actor);
    const ok = await DialogV2.confirm({
      window: { title: "Re-roll Attributes" },
      content: `<p>${foundry.utils.escapeHTML(actor.name)}'s attributes have already been rolled. Roll them again and replace the scores?</p>`
    });
    if ( !ok ) return null;
  }

  const rolls = [];
  const results = [];
  for ( const key of Object.keys(CONFIG.PALLADIUM.ATTRIBUTES) ) {
    const r = await generate(actor, key, rolls);
    if ( r ) results.push(r);
  }
  if ( !results.length ) return null;

  const update = { "system.generation.rolled": true, "system.generation.rerollAllowed": false };
  for ( const r of results ) {
    update[`system.attributes.${r.key}.value`] = r.rolled;
    update[`system.attributes.${r.key}.dice`] = r.dice;
  }
  await actor.update(update);

  // The saved score is what the sheet uses (it may include other bonuses, e.g. a background's).
  for ( const r of results ) r.score = actor.system.attributes[r.key].total ?? r.total;
  await postCard(actor, {
    title: "Rolls Attributes", rolls,
    body: generationTable(results),
    flags: { "palladium-universal": { card: "attributeGeneration", actorUuid: actor.uuid,
      dice: Object.fromEntries(results.filter(r => r.exceptionalDie).map(r => [r.key, r.exceptionalDie])) } }
  });
  Hooks.callAll("palladium.rollAttributes", actor, results);
  return results;
}

/** The chat card table for a full attribute roll. */
function generationTable(results) {
  const mod = (value, applies = true) => !applies ? `<td class="na">—</td>` : `<td>${value ? signed(value) : "—"}</td>`;
  const rows = results.map(r => `<tr>
      <th scope="row">${r.label}</th>
      <td>${r.base}</td>
      <td>${r.exceptional === null ? "—" : `+${r.exceptional}${r.team ? "*" : ""}`}</td>
      ${mod(r.species)}${mod(r.size, r.size !== null)}${mod(r.physical, r.physical !== null)}
      <td class="score">${r.score}</td>
    </tr>`).join("");
  const team = results.filter(r => r.team)
    .map(r => `${r.label}: ${foundry.utils.escapeHTML(r.team.name)}'s ${r.team.die} replaces ${r.exceptionalDie}`);
  const other = results.filter(r => r.score !== r.total).map(r => `${r.label} ${signed(r.score - r.total)}`);
  const notes = [
    "Exceptional: +1D6 when the 3D6 is 16–18.",
    team.length ? `* Team die: ${team.join("; ")}.` : "",
    other.length ? `Other bonuses on the sheet: ${other.join(", ")}.` : ""
  ].filter(n => n).map(n => `<p>${n}</p>`).join("");
  return `<table class="pu-gen-table">
    <thead><tr><th>Attr.</th><th>3D6</th><th data-tooltip="Exceptional 1D6">Exc.</th><th>Species</th><th>Size</th>
      <th data-tooltip="Physical Skills">Phys.</th><th>Score</th></tr></thead>
    <tbody>${rows}</tbody></table><div class="pu-gen-notes">${notes}</div>`;
}

/**
 * A player asks the GM to allow a re-roll: a whispered card with an "Allow Re-roll" button.
 * @param {Actor} actor
 */
export async function requestReroll(actor) {
  const ok = await DialogV2.confirm({
    window: { title: "Re-roll Attributes" },
    content: "<p>Attributes are rolled once. Ask the GM for permission to roll them again?</p>"
  });
  if ( !ok ) return null;
  const gms = game.users.filter(u => u.isGM).map(u => u.id);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), whisper: [...new Set([...gms, game.user.id])],
    content: `<div class="pu-card">${cardHeader(actor, "Re-roll Attributes?")}
      <p class="pu-notes">${foundry.utils.escapeHTML(game.user.name)} asks to roll ${foundry.utils.escapeHTML(actor.name)}'s attributes again.</p>
      <div class="pu-buttons"><button type="button" data-pu-action="allow-reroll">Allow Re-roll</button></div></div>`,
    flags: { "palladium-universal": { card: "rerollRequest", actorUuid: actor.uuid } }
  });
  ui.notifications.info("Your request has been sent to the GM.");
  return null;
}

/**
 * The GM allows one re-roll of an actor's attributes (the chat card's button).
 * @param {object} data   The card's flags
 */
export async function allowReroll(data) {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM can allow a re-roll.");
  const actor = await fromUuid(data.actorUuid);
  if ( !actor ) return ui.notifications.warn("That character no longer exists.");
  await actor.update({ "system.generation.rerollAllowed": true });
  ui.notifications.info(`${actor.name} may roll attributes once more.`);
}

/* -------------------------------------------- */
/*  Print an attribute to chat (gameplay)       */
/* -------------------------------------------- */

/**
 * What an attribute's score gives, as one line of text.
 * @param {object} system  Actor system data (with derived bonuses)
 * @param {string} key
 * @returns {string}
 */
export function attributeBonusText(system, key) {
  const b = system.bonuses;
  switch ( key ) {
    case "iq": return b.iq.iqSkill ? `+${b.iq.iqSkill}% all skills` : "";
    case "me": return b.me.meSave ? `${signed(b.me.meSave)} save vs psionics & strangeness` : "";
    case "ma": return b.ma.maPercent ? `${b.ma.maPercent}% trust / intimidate` : "";
    case "ps": return b.ps.psDamage ? `${signed(b.ps.psDamage)} melee & hurled damage` : "";
    case "pp": return b.pp.ppCombat ? `${signed(b.pp.ppCombat)} strike, parry, dodge` : "";
    case "pe": return b.pe.pePercent
      ? `${signed(b.pe.peSave)} save vs toxins & magic · ${b.pe.pePercent}% coma/death (${signed(b.pe.peComa)} d20)` : "";
    case "pb": return b.pb.pbPercent ? `${b.pb.pbPercent}% charm / impress` : "";
    case "spd": {
      const mv = system.movement;
      return mv ? `Move ${mv.move} yd · Run ${mv.fullRun} yd/round · ${mv.sprint} yd/min` : "";
    }
  }
  return "";
}

/**
 * Print an attribute's score and what it gives to chat. No dice are rolled.
 * @param {Actor} actor
 * @param {string} key
 */
export async function printAttribute(actor, key) {
  const label = CONFIG.PALLADIUM.ATTRIBUTES[key];
  const attr = actor.system.attributes?.[key];
  if ( !label || !attr ) return null;
  if ( attr.total === null ) {
    return ui.notifications.warn(actor.type === "npc" ? `${actor.name} has no ${label} score.`
      : `${actor.name}'s attributes haven't been rolled yet: use Roll Attributes on the Core tab.`);
  }
  const lines = [];
  if ( actor.type === "npc" ) {
    lines.push(["Score", attr.value]);
    if ( attr.total !== attr.value ) lines.push(["Modifiers", signed(attr.total - attr.value)]);
  } else {
    const gen = attr.gen;
    const other = attr.halved ? 0 : attr.total - attr.value - gen.modifier - attr.dice;
    lines.push(["Rolled", attr.value], ["Species", signed(gen.species)]);
    if ( gen.size !== null ) lines.push(["Size", signed(gen.size)]);
    if ( gen.physical !== null ) lines.push(["Physical Skills", signed(gen.physical)]);
    if ( attr.dice ) lines.push(["Rolled Bonus Dice", signed(attr.dice)]);
    if ( other ) lines.push(["Other Bonuses", signed(other)]);
  }
  if ( attr.halved ) lines.push(["Halved", "Yes"]);
  lines.push(["Score", attr.total]);
  const bonus = attributeBonusText(actor.system, key);
  return postCard(actor, { title: label, label, result: attr.total, lines, notes: bonus ? [bonus] : [] });
}
