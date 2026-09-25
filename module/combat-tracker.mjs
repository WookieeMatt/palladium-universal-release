/**
 * The Palladium Combat Tracker (v1.19.0), p.84: Initiative is rolled once (ties re-roll) and kept between
 * rounds. Then everyone takes ONE action at a time in Initiative order, going around again while anyone has
 * actions left; when nobody does, a new round starts and actions reset. Losing the Initiative drops a
 * combatant to the bottom, gaining it moves them to the top.
 *
 * Actions are spent by the system's rolls (attacks, Dodges...). A turn that passes without any spent (a move,
 * a skill check, talking) spends one automatically, so the round always ends. Combatants that don't track
 * actions (vehicles) get one action a round.
 *
 * World setting "palladiumTurns" (on by default) switches this off for Foundry's one-turn-each rounds.
 */

const SCOPE = "palladium-universal";

/** Whether the Palladium action-by-action turn order is on. */
export function palladiumTurns() {
  try { return game.settings.get(SCOPE, "palladiumTurns") !== false; } catch(err) { return true; }
}

/**
 * A combatant's actions this round.
 * @param {Combatant} combatant
 * @returns {{used: number, total: number, left: number, tracked: boolean}}
 */
export function combatantActions(combatant) {
  const c = combatant?.actor?.system?.combat;
  if ( c && (c.actionsUsed !== undefined) && (c.totals?.actions !== undefined) ) {
    const total = c.totals.actions ?? 0;
    return { used: c.actionsUsed, total, left: Math.max(0, total - c.actionsUsed), tracked: true };
  }
  const used = combatant?.getFlag?.(SCOPE, "actionsUsed") ?? 0;
  return { used, total: 1, left: Math.max(0, 1 - used), tracked: false };
}

/** Spend one action for a combatant (actor, or the combatant's own count for vehicles). GM or owner. */
async function spendOne(combatant) {
  const a = combatantActions(combatant);
  if ( a.tracked ) return combatant.actor.update({ "system.combat.actionsUsed": a.used + 1 });
  return combatant.setFlag(SCOPE, "actionsUsed", a.used + 1);
}

/**
 * The Combat document class with the Palladium turn order.
 * @param {typeof Combat} Base
 */
export function definePalladiumCombat(Base) {
  return class PalladiumCombat extends Base {

    /** Actions left for a combatant, counting the action the current combatant's turn will cost. */
    projectedLeft(combatant) {
      const a = combatantActions(combatant);
      if ( combatant.id !== this.combatant?.id ) return a.left;
      const start = this.getFlag?.(SCOPE, "turnStart");
      const spentThisTurn = (start?.id === combatant.id) && (a.used > (start.used ?? 0));
      return spentThisTurn ? a.left : Math.max(0, a.left - 1);
    }

    /** Next Turn: the next combatant in Initiative order with actions left; nobody left → next round. */
    async nextTurn() {
      if ( !palladiumTurns() ) return super.nextTurn();
      const turns = this.turns ?? [];
      if ( !turns.length ) return super.nextTurn();
      const current = this.turn ?? -1;
      for ( let step = 1; step <= turns.length; step++ ) {
        const i = (current + step) % turns.length;
        const c = turns[i];
        if ( c.isDefeated ) continue;
        if ( this.projectedLeft(c) > 0 ) return this.update({ turn: i }, { direction: 1 });
      }
      return this.nextRound();
    }

    /** Initiative ties re-roll (p.84), up to five times. */
    async rollInitiative(ids, options = {}) {
      const result = await super.rollInitiative(ids, options);
      if ( !palladiumTurns() ) return result;
      for ( let tries = 0; tries < 5; tries++ ) {
        const byValue = new Map();
        for ( const c of this.combatants ) {
          if ( (c.initiative === null) || (c.initiative === undefined) ) continue;
          byValue.set(c.initiative, [...(byValue.get(c.initiative) ?? []), c.id]);
        }
        const tied = [...byValue.values()].filter(g => g.length > 1).flat();
        if ( !tied.length ) break;
        await super.rollInitiative(tied, { ...options, messageOptions: { ...(options.messageOptions ?? {}), flavor: "Initiative tie: re-roll" } });
      }
      return result;
    }
  };
}

/** Put a combatant at the top ("gains the Initiative") or bottom ("loses the Initiative") of the order. */
export async function shiftInitiative(combatant, gain) {
  const combat = combatant.combat ?? combatant.parent;
  const values = combat.combatants.filter(c => (c.id !== combatant.id) && Number.isFinite(c.initiative)).map(c => c.initiative);
  const value = !values.length ? (combatant.initiative ?? 0) : gain ? Math.max(...values) + 1 : Math.min(...values) - 1;
  await combatant.update({ initiative: value });
  return value;
}

/**
 * The active GM, on every turn or round change: spend an action for the combatant whose turn just ended
 * without spending one, reset the vehicles' actions on a new round, and remember where the new turn started.
 */
export async function onCombatTurn(combat, changed, options) {
  if ( !game.user.isActiveGM || !palladiumTurns() ) return;
  if ( !("turn" in changed) && !("round" in changed) ) return;
  const start = combat.getFlag(SCOPE, "turnStart");
  const newRound = "round" in changed;
  if ( !newRound && start?.id ) {
    const previous = combat.combatants.get(start.id);
    if ( previous && (combatantActions(previous).used <= (start.used ?? 0)) ) await spendOne(previous);
  }
  if ( newRound ) {
    for ( const c of combat.combatants ) if ( c.getFlag(SCOPE, "actionsUsed") ) await c.unsetFlag(SCOPE, "actionsUsed");
  }
  const now = combat.combatant;
  await combat.setFlag(SCOPE, "turnStart", { id: now?.id ?? null, used: newRound ? 0 : combatantActions(now).used });
}

/** Action pips on each combatant in the tracker, and the GM's gain / lose the Initiative buttons. */
export function decorateTracker(app, html) {
  const combat = app.viewed ?? game.combat;
  if ( !combat || !palladiumTurns() ) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  for ( const li of root?.querySelectorAll("[data-combatant-id]") ?? [] ) {
    const combatant = combat.combatants.get(li.dataset.combatantId);
    if ( !combatant || li.querySelector(".pu-tracker-actions") ) continue;
    const a = combatantActions(combatant);
    li.classList.toggle("pu-out-of-actions", a.left <= 0);
    const box = document.createElement("div");
    box.className = "pu-tracker-actions";
    const pips = Array.from({ length: Math.min(a.total, 10) }, (_, i) => `<i class="pu-pip${i < a.left ? " left" : ""}"></i>`).join("");
    box.innerHTML = `<span class="pu-pips" data-tooltip="${a.left} of ${a.total} action${a.total === 1 ? "" : "s"} left this round">${pips}</span>`
      + (game.user.isGM ? `<a class="pu-init-up" data-tooltip="Gains the Initiative (top of the order)"><i class="fa-solid fa-angles-up"></i></a>`
        + `<a class="pu-init-down" data-tooltip="Loses the Initiative (bottom of the order: knocked down, Held, Thrown...)"><i class="fa-solid fa-angles-down"></i></a>` : "");
    box.querySelector(".pu-init-up")?.addEventListener("click", event => { event.stopPropagation(); shiftInitiative(combatant, true); });
    box.querySelector(".pu-init-down")?.addEventListener("click", event => { event.stopPropagation(); shiftInitiative(combatant, false); });
    const name = li.querySelector(".token-name, .name") ?? li;
    name.append(box);
  }
}

/** Register the setting, the Combat class and the hooks (in "init"). */
export function initCombatTracker() {
  game.settings.register(SCOPE, "palladiumTurns", {
    name: "Palladium Turn Order",
    hint: "Combat Tracker: everyone takes one action at a time in Initiative order, going around until nobody has actions left, then a new round (p.84). Initiative ties re-roll. Off: Foundry's one turn each per round.",
    scope: "world", config: true, type: Boolean, default: true
  });
  if ( typeof CONFIG.Combat?.documentClass === "function" ) CONFIG.Combat.documentClass = definePalladiumCombat(CONFIG.Combat.documentClass);
  Hooks.on("updateCombat", onCombatTurn);
  Hooks.on("renderCombatTracker", decorateTracker);
  // Actions change on the actors: refresh the tracker's pips.
  const refresh = actor => { if ( game.combat?.combatants.some(c => c.actorId === actor?.id) ) ui.combat?.render(); };
  Hooks.on("updateActor", (actor, changes) => {
    if ( foundry.utils.hasProperty(changes, "system.combat.actionsUsed") ) refresh(actor);
  });
}
