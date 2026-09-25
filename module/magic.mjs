import { postCard, rollD20, rollPercent, signed } from "./dice.mjs";
import { damageButtons, damageLines, defendingActors } from "./combat.mjs";
import { spendActions } from "./actions.mjs";
import { playAnimation } from "./animations.mjs";

/**
 * Spell casting (Transdimensional TMNT p.41–52) and psionic power use.
 * Spells are counted per day, not paid with P.P.E.; targets save by meeting or beating the caster's
 * spell strength (12 + bonuses).
 */

/**
 * Cast a spell: uses one of the day's spells and posts a card with save and damage buttons.
 * @param {Actor} actor
 * @param {Item} spell
 */
export async function castSpell(actor, spell) {
  const m = actor.system.magic;
  const caster = m.caster;
  const s = spell.system;
  if ( !s.mastered ) {
    return ui.notifications.warn(`${spell.name} isn't mastered yet: it needs two complete successes on the Experimentation Table.`);
  }
  if ( caster.remaining <= 0 ) {
    return ui.notifications.warn(`${actor.name} has cast all ${caster.spellsPerDay} spells for today. Use New Day to reset.`);
  }
  if ( Hooks.call("palladium.preCastSpell", actor, spell) === false ) return null;
  await actor.update({ "system.magic.spellsUsed": m.spellsUsed + 1 });
  const actionNote = await spendActions(actor, 1, spell.name);

  const level = actor.system.identity.level;
  const damage = s.damage ? s.damageFormula(level) : "";
  const strength = caster.strength;
  const details = [s.range && ["Range", s.range], s.duration && ["Duration", s.duration],
    ["Save", `${s.saveType === "dodge" ? `Dodge ${s.dodgeTarget}+` : CONFIG.PALLADIUM.SPELL_SAVES[s.saveType]}${s.save ? ` (${s.save})` : ""}`]]
    .filter(t => t);
  const buttons = [];
  if ( ["standard", "special"].includes(s.saveType) ) {
    buttons.push(`<button type="button" data-pu-action="spell-save" data-tooltip="Selected tokens save vs Magic">
      <i class="fa-solid fa-shield-heart"></i> Save vs Magic (${strength}+)</button>`);
  }
  if ( s.saveType === "dodge" ) {
    buttons.push(`<button type="button" data-pu-action="spell-save" data-tooltip="Selected tokens try to Dodge">
      <i class="fa-solid fa-person-running"></i> Dodge (${s.dodgeTarget}+)</button>`);
  }
  if ( damage ) {
    buttons.push(`<button type="button" data-pu-action="spell-damage"><i class="fa-solid fa-burst"></i> Damage ${damage}</button>`);
  }

  const left = caster.remaining - 1;
  const notes = [];
  if ( s.offensive ) notes.push(`<span class="hint">Magic attacks hit automatically; parry and dodge usually impossible.</span>`);
  if ( actionNote ) notes.push(actionNote);
  const flags = { "palladium-universal": { card: "spell", actorUuid: actor.uuid, itemRef: spell.id, strength,
    saveType: s.saveType, dodgeTarget: s.dodgeTarget, saveNote: s.save, damage, spell: spell.name } };
  const message = await postCard(actor, { title: `Casts ${spell.name}`, item: spell, label: "Spell Strength", result: strength,
    lines: [...details, ...(damage ? [["Damage", damage]] : []), ["Spells left today", `${left} of ${caster.spellsPerDay}`]],
    notes, buttons: buttons.length ? `<div class="pu-buttons">${buttons.join("")}</div>` : "", flags });
  Hooks.callAll("palladium.castSpell", actor, spell, { strength, damage, message });
  playAnimation(actor, spell, { kind: "spell" });
  return message;
}

/**
 * A target's save against a cast spell: d20 + save vs Magic bonus meets or beats the spell strength,
 * or a Dodge roll for Dodge-only spells (Fire Ball 18+, Magic Net 16+, Paralysis Bolt 19+).
 * @param {Actor} actor
 * @param {object} data   The spell card's flags
 */
export async function rollSpellSave(actor, data) {
  const sys = actor.system;
  if ( data.saveType === "dodge" ) {
    const c = sys.combat;
    if ( c?.conditions.noDefense.length ) return ui.notifications.warn(`${actor.name} can't dodge while ${c.conditions.noDefense.join(", ")}.`);
    return rollD20(actor, { label: `Dodge ${data.spell}`, bonus: c?.totals.dodge ?? 0, breakdown: c?.rollBreakdown.dodge,
      target: data.dodgeTarget, note: `<span class="hint">Only if aware of the attack; uses an action.</span>` });
  }
  const save = sys.saves?.totals.magic;
  return rollD20(actor, { label: `Save vs ${data.spell}`, bonus: save?.bonus ?? 0, breakdown: { "vs Magic": save?.bonus ?? 0 },
    target: data.strength, note: data.saveNote ? `<span class="hint">${data.saveNote}</span>` : "" });
}

/**
 * Roll a spell's damage and post a damage card.
 * @param {Actor} actor
 * @param {object} data   The spell card's flags
 */
export async function rollSpellDamage(actor, data) {
  const roll = await new Roll(data.damage).evaluate();
  const flags = { "palladium-universal": { card: "damage", actorUuid: actor.uuid, damage: roll.total, strike: null } };
  return postCard(actor, { title: `${data.spell}: Damage`, item: actor.items?.get(data.itemRef ?? data.itemId), label: "Damage", result: roll.total,
    lines: damageLines(roll, data.damage), rolls: [roll], buttons: damageButtons(), flags });
}

/**
 * Start a new day: every daily spell is available again.
 * @param {Actor} actor
 */
export async function newDay(actor) {
  await actor.update({ "system.magic.spellsUsed": 0 });
  ui.notifications.info(`${actor.name}: a new day. All ${actor.system.magic.caster.spellsPerDay} spells are available.`);
}

/**
 * Roll one of the tradition's automatic percentile abilities (Recognize Enchantment, Sense Magic...).
 * @param {Actor} actor
 * @param {number} index   Index into magic.caster.abilities
 */
export function rollMagicAbility(actor, index) {
  const a = actor.system.magic.caster.abilities[index];
  if ( a?.chance ) return rollPercent(actor, { label: a.label, target: a.chance, skill: false });
}

/**
 * Save vs T.E. Change (Transdimensional p.33): percentile + P.E. % bonus + Time Lord bonus; 50+ succeeds.
 * A failure means 5 Bio-E points of T.E. evolution or devolution.
 * @param {Actor} actor
 */
export async function rollChangeSave(actor) {
  const save = actor.system.saves.change;
  const roll = await new Roll(`1d100 + ${save.bonus}`).evaluate();
  const success = roll.total >= save.target;
  const buttons = success ? "" : `<div class="pu-buttons">
    <button type="button" data-pu-action="te-change" data-direction="-1" data-tooltip="Travelled into the past"><i class="fa-solid fa-backward"></i> Devolve −5 Bio-E</button>
    <button type="button" data-pu-action="te-change" data-direction="1" data-tooltip="Travelled into the future"><i class="fa-solid fa-forward"></i> Evolve +5 Bio-E</button></div>`;
  const flags = { "palladium-universal": { card: "change", actorUuid: actor.uuid } };
  return postCard(actor, { title: "Save vs T.E. Change", label: "Save", result: roll.total, rolls: [roll], buttons, flags,
    lines: [["d100", roll.dice[0].total], ["P.E. and training", `${signed(save.bonus)}%`], ["Total", roll.total], ["Needs", `${save.target}+`]],
    notes: [`<span class="${success ? "pu-success" : "pu-failure"}">${success ? "Resists the Change" : "Fails: 5 Bio-E points of T.E. change"}</span>`,
      ...(success ? [] : [`<span class="hint">GM, what changes (p.33): <strong>into the future</strong> the character grows (Size Level, I.Q., M.E., P.S.); <strong>into the past</strong> it devolves (I.Q., M.E., M.A. first, then psionics, then Size Level and physical attributes). Record it as a "T.E. Change" ability with attribute effects; going home reverses it over 2D6 days. See the System Guide: Powers → Running T.E. Change.</span>`])] });
}

/* -------------------------------------------- */
/*  Psionics                                    */
/* -------------------------------------------- */

/**
 * Use a psionic power (no I.S.P.: usable as an action as often as desired, p.19–20). Powers with a
 * saving throw get a button for the targets to save vs psionics (15+, or 10+ for psychics).
 * @param {Actor} actor
 * @param {Item} power
 */
export async function usePsionic(actor, power) {
  const p = power.system;
  const hasSave = p.save && !/^\s*(none|no)\b/i.test(p.save);
  const actionNote = await spendActions(actor, 1, power.name);
  const flags = { "palladium-universal": { card: "psionic", actorUuid: actor.uuid, itemRef: power.id, power: power.name } };
  playAnimation(actor, power, { kind: "psionic" });
  return postCard(actor, { title: `Uses ${power.name}`, item: power, label: "Save", result: p.save || "None", flags,
    lines: [["Psionic power", "one action"], ...[p.range && ["Range", p.range], p.duration && ["Duration", p.duration]].filter(t => t)],
    notes: actionNote ? [actionNote] : [],
    buttons: hasSave ? `<div class="pu-buttons"><button type="button" data-pu-action="psionic-save"
      data-tooltip="Selected tokens save vs Psionics"><i class="fa-solid fa-brain"></i> Save vs Psionics</button></div>` : "" });
}

/**
 * A target's save vs a psionic power, against their own target number.
 * @param {Actor} actor
 * @param {object} data
 */
export function rollPsionicSave(actor, data) {
  const save = actor.system.saves?.totals.psionics;
  if ( !save ) return;
  return rollD20(actor, { label: `Save vs ${data.power}`, bonus: save.bonus, target: save.target });
}

/**
 * Chat card buttons for spell and psionic cards.
 * @param {string} action
 * @param {object} data
 */
export async function onMagicCardButton(action, data) {
  if ( action === "spell-damage" ) {
    const actor = await fromUuid(data.actorUuid);
    if ( !actor?.isOwner ) return ui.notifications.warn("Only the caster's owner can roll its damage.");
    return rollSpellDamage(actor, data);
  }
  const targets = defendingActors();
  if ( !targets.length ) return ui.notifications.warn("Select your token (or set your character) to save.");
  for ( const target of targets ) {
    if ( action === "spell-save" ) await rollSpellSave(target, data);
    else if ( action === "psionic-save" ) await rollPsionicSave(target, data);
  }
}
