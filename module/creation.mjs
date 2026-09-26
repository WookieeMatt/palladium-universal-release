import { cardHeader, postCard, signed } from "./dice.mjs";
import { auditNote } from "./audit.mjs";

const { DialogV2 } = foundry.applications.api;

/**
 * Attribute generation (p.12), done once at character creation with the "Roll Attributes" button:
 *
 *  1. Base: 3D6 for each attribute (or Custom dice, v1.36, when the GM's "Attribute Dice" setting allows).
 *     The player may place the results on the attributes by hand (v1.36).
 *  2. Exceptional ("exploding"): on 16, 17 or 18 add 1D6. Team rule: with team generation on (world setting), if
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

/** The book's attribute dice (p.12): 3D6, and a total of 16–18 "explodes" for +1D6. */
export const BOOK_DICE = { formula: "3d6", explodeAt: 16, bonus: "1d6", custom: false };

/** "3D6, 16+ explodes +1D6" */
export function diceLabel(dice) {
  const f = String(dice.formula).toUpperCase();
  return dice.explodeAt ? `${f}, ${dice.explodeAt}+ explodes +${String(dice.bonus).toUpperCase()}` : `${f}, no exploding die`;
}

/**
 * Roll one attribute's base: the dice, and the exploding bonus die when the total reaches the trigger.
 * @returns {Promise<{base: number, exceptionalDie: number|null}>}
 */
async function rollBase(dice, rolls) {
  const base = await new Roll(dice.formula).evaluate();
  rolls.push(base);
  let exceptionalDie = null;
  if ( dice.explodeAt && (base.total >= dice.explodeAt) && dice.bonus ) {
    const bonus = await new Roll(dice.bonus).evaluate();
    rolls.push(bonus);
    exceptionalDie = bonus.total;
  }
  return { base: base.total, exceptionalDie };
}

/**
 * One attribute from a rolled base (which may have been placed there by the player): the team rule for the
 * exploding die, then the modifiers the sheet worked out (species, size, physical skills; their dice rolled now).
 */
async function finishAttribute(actor, key, rolled, rolls) {
  const label = CONFIG.PALLADIUM.ATTRIBUTES[key];
  let exceptional = rolled.exceptionalDie, team = null;
  if ( exceptional !== null ) {
    const mate = teamBonusDie(actor, key);
    if ( mate && (mate.die > exceptional) ) { exceptional = mate.die; team = mate; }
  }
  const gen = actor.system.attributes[key].gen;
  const speciesDice = await rollDice(gen.speciesDice, rolls);
  const physicalDice = gen.physical === null ? 0 : await rollDice(gen.physicalDice, rolls);
  const species = gen.species + speciesDice;
  const size = gen.size;
  const physical = gen.physical === null ? null : gen.physical + physicalDice;
  const value = rolled.base + (exceptional ?? 0);
  const total = value + species + (size ?? 0) + (physical ?? 0);
  return { key, label, base: rolled.base, exceptional, exceptionalDie: rolled.exceptionalDie, team, species, size, physical,
    rolled: value, dice: speciesDice + physicalDice, total };
}

/**
 * Generate one attribute: roll its base (3D6 + the exploding 1D6 by default) and add the modifiers. Saves nothing.
 * @param {Actor} actor
 * @param {string} key
 * @param {Roll[]} rolls   Collects the rolls made
 * @param {object} [dice=BOOK_DICE]
 * @returns {Promise<object|null>}
 */
async function generate(actor, key, rolls, dice = BOOK_DICE) {
  if ( !CONFIG.PALLADIUM.ATTRIBUTES[key] || !actor.system.attributes?.[key] ) return null;
  const data = { formula: dice.formula, exceptional: dice.explodeAt, bonusFormula: dice.bonus };
  if ( Hooks.call("palladium.preRollAttribute", actor, key, data) === false ) return null;
  const rolled = await rollBase({ formula: data.formula, explodeAt: dice.explodeAt, bonus: data.bonusFormula }, rolls);
  return finishAttribute(actor, key, rolled, rolls);
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

/** May players use Custom dice (world setting "Attribute Dice")? The GM always may. */
export function customDiceAllowed(user = game.user) {
  if ( user?.isGM ) return true;
  try { return game.settings.get("palladium-universal", "attributeDice") === "custom"; } catch(err) { return false; }
}

/**
 * The popup before rolling: which dice (Book, or Custom when allowed) and how to place the results.
 * @returns {Promise<{dice: object, placement: "order"|"choose"}|null>}  null = cancelled (nothing rolled)
 */
export async function attributeRollSetup(actor) {
  const custom = customDiceAllowed();
  const esc = foundry.utils.escapeHTML;
  const content = `<div class="pu-attr-setup">
    <p>Roll ${esc(actor.name)}'s eight attributes (once).</p>
    <div class="form-group"><label>Dice</label>
      <select name="dice">
        <option value="book" selected>Book: 3D6 (16+ explodes +1D6)</option>
        ${custom ? `<option value="custom">Custom</option>` : ""}
      </select></div>
    ${custom ? `<fieldset class="pu-custom-dice"><legend>Custom dice</legend>
      <div class="form-group"><label>Dice expression</label><input type="text" name="formula" value="4d6kh3" placeholder="e.g. 4d6kh3, 2d6+6"></div>
      <div class="form-group"><label>Explodes at</label><input type="number" name="explodeAt" value="16" min="1" placeholder="blank = never">
        <span class="hint">A total this high or higher adds the bonus die.</span></div>
      <div class="form-group"><label>Bonus die</label><input type="text" name="bonus" value="1d6"></div>
      <p class="hint">Custom dice show on the chat card and in the audit.</p></fieldset>` : ""}
    <div class="form-group"><label>Placement</label>
      <select name="placement">
        <option value="order" selected>Random: in order (I.Q., M.E., M.A. ...)</option>
        <option value="choose">I'll place them myself</option>
      </select></div>
  </div>`;
  const form = await DialogV2.prompt({
    classes: ["palladium-universal", "pu-skill-mods"],
    window: { title: "Roll Attributes", icon: "fa-solid fa-dice" },
    content,
    // Show the Custom fields only when Custom is picked.
    render: (event, dialog) => {
      const root = dialog.element ?? event?.target?.element;
      const select = root?.querySelector?.('select[name="dice"]');
      const fields = root?.querySelector?.(".pu-custom-dice");
      if ( !select || !fields ) return;
      const toggle = () => { fields.hidden = select.value !== "custom"; };
      select.addEventListener("change", toggle);
      toggle();
    },
    ok: { label: "Roll", icon: "fa-solid fa-dice", callback: (event, button) => {
      const el = button.form.elements;
      return { dice: el.dice.value, placement: el.placement.value, formula: el.formula?.value, explodeAt: el.explodeAt?.value, bonus: el.bonus?.value };
    } },
    rejectClose: false
  });
  if ( !form ) return null;
  let dice = BOOK_DICE;
  if ( (form.dice === "custom") && custom ) {
    const formula = String(form.formula ?? "").trim();
    const bonus = String(form.bonus ?? "").trim() || "1d6";
    if ( !formula || !Roll.validate(formula) ) { ui.notifications.warn(`"${formula}" isn't a dice expression Foundry can roll.`); return null; }
    if ( !Roll.validate(bonus) ) { ui.notifications.warn(`"${bonus}" isn't a dice expression Foundry can roll.`); return null; }
    const explodeAt = Number(form.explodeAt) > 0 ? Number(form.explodeAt) : null;
    dice = { formula, explodeAt, bonus, custom: true };
    if ( (formula.toLowerCase() === "3d6") && (explodeAt === 16) && (bonus.toLowerCase() === "1d6") ) dice = BOOK_DICE;
  }
  return { dice, placement: form.placement === "choose" ? "choose" : "order" };
}

/**
 * The placement window: the player puts each rolled result on an attribute (each used once). Closing it, or
 * leaving a result unused, keeps the rolled order: the dice are already rolled, so this is never a re-roll.
 * @param {Actor} actor
 * @param {{base: number, exceptionalDie: number|null}[]} pool   The results, in rolled order
 * @param {string[]} keys
 * @returns {Promise<number[]>}  For each attribute (in `keys` order), the index of its result in the pool
 */
export async function placeAttributes(actor, pool, keys) {
  const order = keys.map((k, i) => i);
  const esc = foundry.utils.escapeHTML;
  const letter = i => String.fromCharCode(65 + i);
  const shown = r => r.exceptionalDie ? `${r.base} + ${r.exceptionalDie} = ${r.base + r.exceptionalDie}` : `${r.base}`;
  let current = order;
  let warning = "";
  for ( let attempt = 0; attempt < 5; attempt++ ) {
    const rows = keys.map((key, i) => {
      const gen = actor.system.attributes[key].gen ?? {};
      const mods = (gen.species ?? 0) + (gen.size ?? 0) + (gen.physical ?? 0);
      const options = pool.map((r, j) => `<option value="${j}" ${current[i] === j ? "selected" : ""}>${letter(j)}: ${shown(r)}</option>`).join("");
      return `<tr><th>${esc(CONFIG.PALLADIUM.ATTRIBUTES[key])}</th><td><select name="a${i}">${options}</select></td>
        <td class="hint">${mods ? `${signed(mods)} species / size / skills` : ""}</td></tr>`;
    }).join("");
    const chips = pool.map((r, j) => `<span class="pu-chip"><b>${letter(j)}</b> ${shown(r)}</span>`).join(" ");
    const picked = await DialogV2.prompt({
      classes: ["palladium-universal", "pu-skill-mods"],
      window: { title: "Place Your Attributes", icon: "fa-solid fa-arrows-up-down" },
      content: `<p>Your rolls: ${chips}</p>${warning}<table class="pu-place-table">${rows}</table>
        <p class="hint">Use each roll once. Closing this window keeps them in the order rolled.</p>`,
      ok: { label: "Confirm", icon: "fa-solid fa-check", callback: (event, button) => keys.map((k, i) => Number(button.form.elements[`a${i}`].value)) },
      rejectClose: false
    });
    if ( !picked ) return order;
    if ( new Set(picked).size === picked.length ) return picked;
    current = picked;
    warning = `<p class="pu-failure"><strong>Each roll can only be used once.</strong></p>`;
  }
  return order;
}

/**
 * Roll all eight attributes, save them and post one card with the details. Attributes are rolled once;
 * to roll again the character is reset (Reset Character, module/reset.mjs).
 * The popup first asks which dice (Book 3D6 with the exploding 1D6, or Custom when the GM allows it) and whether
 * to place the results by hand. Pass `options` to skip the popups (macros, tests).
 * @param {Actor} actor
 * @param {object} [options]
 * @param {object} [options.dice]         {formula, explodeAt, bonus, custom}
 * @param {"order"|"choose"} [options.placement]
 * @param {number[]} [options.assignment] For each attribute, the index of its result (placement "choose")
 * @returns {Promise<object[]|null>}  The results, by attribute
 */
export async function rollAttributes(actor, options = null) {
  const state = actor.system.generation;
  // Rolled once. The only way to roll again is Reset Character (the end of the Creation Checklist).
  // (rerollAllowed: an Allow Re-roll card from before 1.31 still works.)
  if ( state?.rolled && !state.rerollAllowed ) {
    ui.notifications.info(`${actor.name}'s attributes are already rolled. To start over, use Reset Character at the end of the Creation Checklist.`);
    return null;
  }
  const setup = options ?? await attributeRollSetup(actor);
  if ( !setup ) return null;
  const dice = setup.dice ?? BOOK_DICE;

  const keys = Object.keys(CONFIG.PALLADIUM.ATTRIBUTES).filter(k => actor.system.attributes?.[k]);
  const rolls = [];
  const pool = [];
  for ( const key of keys ) {
    const data = { formula: dice.formula, exceptional: dice.explodeAt, bonusFormula: dice.bonus };
    if ( Hooks.call("palladium.preRollAttribute", actor, key, data) === false ) return null;
    pool.push(await rollBase({ formula: data.formula, explodeAt: dice.explodeAt, bonus: data.bonusFormula }, rolls));
  }
  if ( !pool.length ) return null;

  let assignment = keys.map((k, i) => i);
  const placed = setup.placement === "choose";
  if ( placed ) {
    assignment = setup.assignment ?? await placeAttributes(actor, pool, keys);
    if ( (assignment.length !== keys.length) || (new Set(assignment).size !== keys.length) ) assignment = keys.map((k, i) => i);
  }
  const byHand = placed && assignment.some((j, i) => j !== i);

  const results = [];
  for ( const [i, key] of keys.entries() ) results.push(await finishAttribute(actor, key, pool[assignment[i]], rolls));

  const update = { "system.generation.rolled": true, "system.generation.rerollAllowed": false };
  for ( const r of results ) {
    update[`system.attributes.${r.key}.value`] = r.rolled;
    update[`system.attributes.${r.key}.dice`] = r.dice;
  }
  await actor.update(update);

  // The saved score is what the sheet uses (it may include other bonuses, e.g. a background's).
  for ( const r of results ) r.score = actor.system.attributes[r.key].total ?? r.total;
  const notes = [];
  if ( dice.custom ) notes.push(`<p class="pu-warning"><strong>Custom dice:</strong> ${foundry.utils.escapeHTML(diceLabel(dice))} (the book: 3D6, 16+ explodes +1D6).</p>`);
  if ( byHand ) notes.push(`<p><strong>Placed by the player:</strong> ${foundry.utils.escapeHTML(game.user.name)} chose where each roll went.</p>`);
  await postCard(actor, {
    title: "Rolled Attributes", rolls,
    body: generationTable(results, dice) + notes.join(""),
    flags: { "palladium-universal": { card: "attributeGeneration", actorUuid: actor.uuid,
      dice: Object.fromEntries(results.filter(r => r.exceptionalDie).map(r => [r.key, r.exceptionalDie])),
      attributeDice: dice.custom ? { formula: dice.formula, explodeAt: dice.explodeAt, bonus: dice.bonus } : null, placed: byHand } }
  });
  if ( dice.custom ) auditNote(actor, `Attributes rolled with custom dice: ${foundry.utils.escapeHTML(diceLabel(dice))} (by ${foundry.utils.escapeHTML(game.user.name)})`);
  Hooks.callAll("palladium.rollAttributes", actor, results, { dice, placed: byHand });
  return results;
}

/** The chat card table for a full attribute roll. */
function generationTable(results, dice = BOOK_DICE) {
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
    dice.custom ? (dice.explodeAt ? `Exploding: +${String(dice.bonus).toUpperCase()} when the roll is ${dice.explodeAt} or more.` : "No exploding die.")
      : "Exploding: +1D6 when the 3D6 is 16–18.",
    team.length ? `* Team die: ${team.join("; ")}.` : "",
    other.length ? `Other bonuses on the sheet: ${other.join(", ")}.` : ""
  ].filter(n => n).map(n => `<p>${n}</p>`).join("");
  return `<table class="pu-gen-table">
    <thead><tr><th>Attr.</th><th>${dice.custom ? "Roll" : "3D6"}</th><th data-tooltip="Exploding die">Exp.</th><th>Species</th><th>Size</th>
      <th data-tooltip="Physical Skills">Phys.</th><th>Score</th></tr></thead>
    <tbody>${rows}</tbody></table><div class="pu-gen-notes">${notes}</div>`;
}

/** Before 1.31 a re-roll needed the GM's permission. Kept so macros and old chat cards still work;
 * the sheet now uses Reset Character instead. */
const REROLLS = {
  attributes: { label: "Attributes", text: "attributes", flag: "system.generation.rerollAllowed" },
  hp: { label: "Hit Points", text: "Hit Points", flag: "system.generation.hpRerollAllowed" }
};

/**
 * A player asks the GM to allow a re-roll: a whispered card with an "Allow Re-roll" button.
 * @param {Actor} actor
 * @param {"attributes"|"hp"} [what="attributes"]
 */
export async function requestReroll(actor, what = "attributes") {
  const r = REROLLS[what] ?? REROLLS.attributes;
  const ok = await DialogV2.confirm({
    classes: ["palladium-universal", "pu-skill-mods"],
    window: { title: `Re-roll ${r.label}` },
    content: `<p>${r.label} are rolled once. Ask the GM for permission to roll them again?</p>`
  });
  if ( !ok ) return null;
  const gms = game.users.filter(u => u.isGM).map(u => u.id);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), whisper: [...new Set([...gms, game.user.id])],
    content: `<div class="pu-card">${cardHeader(actor, `Re-roll ${r.label}?`)}
      <p class="pu-notes">${foundry.utils.escapeHTML(game.user.name)} asks to roll ${foundry.utils.escapeHTML(actor.name)}'s ${r.text} again.</p>
      <div class="pu-buttons"><button type="button" data-pu-action="allow-reroll">Allow Re-roll</button></div></div>`,
    flags: { "palladium-universal": { card: "rerollRequest", actorUuid: actor.uuid, what } }
  });
  ui.notifications.info("Your request has been sent to the GM.");
  return null;
}

/**
 * The GM allows one re-roll of an actor's attributes or Hit Points (the chat card's button).
 * @param {object} data   The card's flags
 */
export async function allowReroll(data) {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM can allow a re-roll.");
  const actor = await fromUuid(data.actorUuid);
  if ( !actor ) return ui.notifications.warn("That character no longer exists.");
  const r = REROLLS[data.what] ?? REROLLS.attributes;
  await actor.update({ [r.flag]: true });
  ui.notifications.info(`${actor.name} may roll ${r.text} once more.`);
}

/* -------------------------------------------- */
/*  Hit Points (p.92): P.E. + 1D6, +1D6 a level */
/* -------------------------------------------- */

/**
 * Roll Hit Points at character creation: one 1D6 per level (a new character: one), saved on the sheet so
 * max HP = P.E. + the dice + HP Bonus. Rolled once; to roll again the character is reset (Reset Character).
 * Current HP is set to the new max.
 * @param {Actor} actor
 */
export async function rollHitPoints(actor) {
  const sys = actor.system;
  if ( !sys.generation?.rolled ) return ui.notifications.warn("Roll Attributes first: Hit Points are P.E. + 1D6.");
  const hp = sys.health.hp;
  const reroll = hp.dice.length > 0;
  if ( reroll && !sys.generation.hpRerollAllowed ) {
    ui.notifications.info(`${actor.name}'s Hit Points are already rolled. To start over, use Reset Character at the end of the Creation Checklist.`);
    return null;
  }
  const levels = Math.max(1, sys.identity.level);
  const roll = await new Roll(`${levels}d6`).evaluate();
  const dice = hpDice(roll, levels);
  await actor.update({ "system.health.hp.dice": dice, "system.generation.hpRerollAllowed": false });
  const max = actor.system.health.hp.max;
  await actor.update({ "system.health.hp.value": max });
  await hpCard(actor, roll, dice, { title: reroll ? "Hit Points (re-rolled)" : "Hit Points",
    note: `Current Hit Points set to ${max}.` });
  Hooks.callAll("palladium.rollHitPoints", actor, { dice, max, levelUp: false });
  return dice;
}

/**
 * Level up: roll 1D6 for each level the character has gained since its last Hit Points roll, raise max
 * HP and current HP by the same amount.
 * @param {Actor} actor
 */
export async function rollLevelHitPoints(actor) {
  const hp = actor.system.health.hp;
  if ( !hp.dice.length ) return rollHitPoints(actor);
  const missing = hp.pendingLevels;
  if ( !missing ) return ui.notifications.info(`${actor.name}'s Hit Points are up to date for level ${actor.system.identity.level}.`);
  const roll = await new Roll(`${missing}d6`).evaluate();
  const added = hpDice(roll, missing);
  const gain = added.reduce((a, b) => a + b, 0);
  const from = hp.dice.length;
  await actor.update({ "system.health.hp.dice": [...hp.dice, ...added],
    "system.health.hp.value": hp.value + gain });
  await hpCard(actor, roll, [...hp.dice, ...added], { title: `Hit Points: Level ${actor.system.identity.level}`, from,
    note: `+${gain} Hit Points: current ${hp.value} → ${hp.value + gain}.` });
  Hooks.callAll("palladium.rollHitPoints", actor, { dice: added, max: actor.system.health.hp.max, levelUp: true });
  return added;
}

/** The individual d6 results of an "Nd6" roll. */
function hpDice(roll, n) {
  return roll.dice[0]?.results?.map(r => r.result).slice(0, n) ?? [roll.total];
}

/** The Hit Points chat card: P.E., each level's die (new ones marked), HP Bonus, max. */
function hpCard(actor, roll, dice, { title, note, from = dice.length }) {
  const hp = actor.system.health.hp;
  const lines = [["P.E.", hp.pe],
    ...dice.map((d, i) => [`Level ${i + 1} (1D6)${i >= from ? ", new" : ""}`, `+${d}`])];
  if ( hp.bonus ) lines.push(["HP Bonus", signed(hp.bonus)]);
  lines.push(["Max Hit Points", hp.max]);
  return postCard(actor, { title, label: "Max HP", result: hp.max, lines, rolls: [roll],
    caption: "P.E. + 1D6 per level", notes: [`<span class="pu-success">${note}</span>`],
    flags: { "palladium-universal": { card: "hitPoints", actorUuid: actor.uuid, dice } } });
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
      return mv ? `Move ${mv.move} yd · Run ${mv.fullRun} yd/round · ${mv.sprint} yd/min${mv.halved ? " (Stunned: Speed halved)" : ""}` : "";
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
