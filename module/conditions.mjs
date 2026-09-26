/**
 * Conditions that act on their own (v1.23.0), so each does what its text says:
 * - Losing the Initiative (Horrified, Deafened): applied in combat, the combatant drops to the bottom of the order.
 * - Stunned: applied in combat, it lasts 1D4 rounds (rolled and posted) and ends by itself.
 * - Prone: removing it in combat spends an action (standing up).
 * - Pain: 1 Hit Point every 4 rounds (a minute) in combat.
 * - Coma and Dead: set by Hit Points (0 or less: Coma; below −P.E.: Dead); Coma ends above 0 HP.
 * Attacks, skills, Reactions and actions are blocked in the data model and the rolls (see CONFIG.PALLADIUM.CONDITIONS).
 */
import { postCard } from "./dice.mjs";
import { spendActions } from "./actions.mjs";
import { shiftInitiative } from "./combat-tracker.mjs";
import { sideEffectsFor } from "./recovery.mjs";

const SCOPE = "palladium-universal";
const cond = id => CONFIG.PALLADIUM.CONDITIONS[id];

/** The running combat's combatants for an actor (started combats only). */
function combatantsOf(actor, combat = game.combat) {
  if ( !combat?.started || !actor ) return [];
  return combat.combatants.filter(c => (c.actor === actor) || (c.actor?.uuid === actor.uuid));
}

/** The status ids an effect adds, that are system conditions. */
const conditionIds = effect => [...(effect.statuses ?? [])].filter(id => cond(id));

/**
 * A condition was applied.
 * @param {ActiveEffect} effect
 * @param {object} options
 * @param {string} userId
 */
export async function onCreateEffect(effect, options, userId) {
  if ( options?.puImport ) return; // importing a character: its conditions come in as they were
  if ( userId !== game.user.id ) return;
  const actor = effect.parent;
  if ( !actor || (actor.documentName !== "Actor") ) return;
  for ( const id of effect.statuses ?? [] ) Hooks.callAll("palladium.condition", actor, id, true);
  const combatants = combatantsOf(actor);
  if ( !combatants.length ) return;
  const round = game.combat.round ?? 0;
  for ( const id of conditionIds(effect) ) {
    const c = cond(id);
    if ( c.losesInitiative ) {
      for ( const cb of combatants ) if ( cb.isOwner && Number.isFinite(cb.initiative) ) await shiftInitiative(cb, false);
    }
    if ( c.rounds ) {
      const roll = await new Roll(c.rounds).evaluate();
      await actor.setFlag(SCOPE, `${id}Until`, round + roll.total);
      await postCard(actor, { title: c.label, label: "Rounds", result: roll.total, rolls: [roll],
        lines: [[c.rounds.toUpperCase(), roll.total]],
        notes: [`<span>${c.text}</span>`, `<span class="hint">Ends at the start of round ${round + roll.total}.</span>`] });
    }
    if ( c.hpLoss ) await actor.setFlag(SCOPE, `${id}Since`, round);
  }
}

/**
 * A condition was removed.
 * @param {ActiveEffect} effect
 * @param {object} options
 * @param {string} userId
 */
export async function onDeleteEffect(effect, options, userId) {
  if ( options?.puImport ) return;
  if ( userId !== game.user.id ) return;
  const actor = effect.parent;
  if ( !actor || (actor.documentName !== "Actor") ) return;
  for ( const id of effect.statuses ?? [] ) Hooks.callAll("palladium.condition", actor, id, false);
  for ( const id of conditionIds(effect) ) {
    const c = cond(id);
    if ( c.rounds && actor.getFlag(SCOPE, `${id}Until`) !== undefined ) await actor.unsetFlag(SCOPE, `${id}Until`);
    if ( c.hpLoss && actor.getFlag(SCOPE, `${id}Since`) !== undefined ) await actor.unsetFlag(SCOPE, `${id}Since`);
    if ( (id === "shocked") && actor.getFlag(SCOPE, "shockFirstTaken") ) await actor.unsetFlag(SCOPE, "shockFirstTaken");
    // Standing up takes an action.
    if ( (id === "prone") && combatantsOf(actor).length && !options.palladiumNoAction ) {
      const note = await spendActions(actor, 1, "standing up");
      await postCard(actor, { title: "Stands up", notes: [`<span>Standing up from Prone takes an action.</span>`, note] });
    }
  }
}

/**
 * A new round (active GM): Stunned ends when its rounds are up; Pain costs 1 HP every 4 rounds.
 * @param {Combat} combat
 * @param {object} changed
 */
export async function onConditionRound(combat, changed) {
  if ( !game.user.isActiveGM || !("round" in changed) ) return;
  const round = combat.round;
  const seen = new Set();
  for ( const combatant of combat.combatants ) {
    const actor = combatant.actor;
    if ( !actor || seen.has(actor.uuid) ) continue;
    seen.add(actor.uuid);
    for ( const [id, c] of Object.entries(CONFIG.PALLADIUM.CONDITIONS) ) {
      if ( !actor.statuses?.has(id) ) continue;
      if ( c.rounds ) {
        const until = actor.getFlag(SCOPE, `${id}Until`);
        if ( Number.isFinite(until) && (round >= until) ) await actor.toggleStatusEffect(id, { active: false });
      }
      if ( c.hpLoss ) {
        const since = actor.getFlag(SCOPE, `${id}Since`);
        if ( !Number.isFinite(since) ) { await actor.setFlag(SCOPE, `${id}Since`, round); continue; }
        const hp = actor.system.health?.hp;
        if ( !hp || (round <= since) || ((round - since) % c.hpLoss.every) ) continue;
        await actor.update({ "system.health.hp.value": hp.value - 1 });
        const why = id === "bleeding" ? "A minute of blood loss (first aid stops it)" : `A minute of ${c.label.toLowerCase()}`;
        await postCard(actor, { title: c.label, notes: [`<span>${why}: 1 Hit Point (${hp.value} → ${hp.value - 1}).</span>`] });
      }
    }
  }
}

/** Before a health change: remember the old Hit Points and S.D.C. (for Bleeding Out and side-effects). */
export function onPreHealth(actor, changes, options) {
  const hp = foundry.utils.hasProperty(changes, "system.health.hp.value");
  const sdc = foundry.utils.hasProperty(changes, "system.health.sdc.value");
  if ( !hp && !sdc ) return;
  const h = actor.system?.health;
  if ( h ) options.puHealthBefore = { hp: h.hp?.value, sdc: h.sdc?.value };
}

/**
 * Hit Points or S.D.C. changed (on the client that changed them): Coma at 0 or less, Dead below −P.E.; Coma ends
 * above 0 (p.92). Bleeding Out starts when damage brings the Hit Points to 25% or less and ends above 25%.
 * Optional side-effects are offered per the setting (recovery.mjs). Hook "palladium.hitPoints".
 * @param {Actor} actor
 * @param {object} changes
 * @param {object} options
 * @param {string} userId
 */
export async function onHitPoints(actor, changes, options, userId) {
  if ( userId !== game.user.id ) return;
  const hpChanged = foundry.utils.hasProperty(changes, "system.health.hp.value");
  const sdcChanged = foundry.utils.hasProperty(changes, "system.health.sdc.value");
  if ( !hpChanged && !sdcChanged ) return;
  if ( !["character", "npc"].includes(actor.type) ) return;
  const h = actor.system.health;
  const before = options?.puHealthBefore ?? {};
  if ( sdcChanged ) await sideEffectsFor(actor, "sdc", before.sdc, h.sdc.value);
  if ( !hpChanged || !(h?.hp?.max > 0) ) return;
  const value = h.hp.value;
  Hooks.callAll("palladium.hitPoints", actor, { before: before.hp, after: value, max: h.hp.max });
  const statuses = actor.statuses ?? new Set();
  if ( (value < h.deathThreshold) && !statuses.has("dead") ) {
    await actor.toggleStatusEffect("dead", { active: true, overlay: true });
    // The death marker: the skull overlay (above), the combatant marked defeated, and the fx (fx.mjs).
    for ( const c of game.combat?.combatants?.filter?.(c => (c.actor === actor) || (c.actor?.uuid === actor.uuid)) ?? [] ) {
      if ( c.isOwner && !c.defeated ) await c.update({ defeated: true });
    }
    if ( statuses.has("bleeding") ) await actor.toggleStatusEffect("bleeding", { active: false });
  }
  if ( (value <= 0) && !statuses.has("coma") ) await actor.toggleStatusEffect("coma", { active: true });
  if ( (value > 0) && statuses.has("coma") ) await actor.toggleStatusEffect("coma", { active: false });
  // Bleeding Out (p.92): new damage down to 25% or less; healing above 25% ends it.
  const bleedAt = Math.floor(h.hp.max * 0.25);
  const hurt = Number.isFinite(before.hp) ? value < before.hp : true;
  if ( hurt && (value <= bleedAt) && (value >= h.deathThreshold) && !statuses.has("bleeding") ) await actor.toggleStatusEffect("bleeding", { active: true });
  if ( (value > bleedAt) && statuses.has("bleeding") ) await actor.toggleStatusEffect("bleeding", { active: false });
  await sideEffectsFor(actor, "hp", before.hp, value);
}

/** Register the hooks (in "init"). */
export function initConditions() {
  Hooks.on("createActiveEffect", onCreateEffect);
  Hooks.on("deleteActiveEffect", onDeleteEffect);
  Hooks.on("updateCombat", onConditionRound);
  Hooks.on("preUpdateActor", onPreHealth);
  Hooks.on("updateActor", onHitPoints);
}
