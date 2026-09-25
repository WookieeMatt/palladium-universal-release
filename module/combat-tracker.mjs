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
 * Who goes first (v1.23.0): the GM decides (p.84). A "Friendly first / Hostile first" bar at the top of the tracker
 * orders the combatants by side, alternating, in random order within each side; ⇈ / ⇊ cut in line.
 * Move Action (p.85): once per round, as an action; a walking figure on each combatant shows it was taken.
 *
 * World setting "palladiumTurns" (on by default) switches this off for Foundry's one-turn-each rounds.
 */

import { combatantCover, coverDialog, coverReduction } from "./cover.mjs";

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
      // Horrified, Deafened...: automatically lose the Initiative (bottom of the order).
      const rolled = new Set(typeof ids === "string" ? [ids] : ids);
      for ( const c of this.combatants ) {
        if ( !rolled.has(c.id) || !Number.isFinite(c.initiative) ) continue;
        const loses = [...(c.actor?.statuses ?? [])].some(id => CONFIG.PALLADIUM?.CONDITIONS?.[id]?.losesInitiative);
        if ( loses ) await shiftInitiative(c, false);
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

/* -------------------------------------------- */
/*  Who goes first (p.84: the GM decides)       */
/* -------------------------------------------- */

/** The GM's choices for who goes first. */
export const SIDES = {
  friendly: { label: "Friendly first", tooltip: "The GM gives the Friendly side (the heroes: Friendly tokens) the Initiative. Sides alternate from there, in random order within each side." },
  hostile: { label: "Hostile first", tooltip: "The GM gives the Hostile side (the villains: Hostile and Neutral tokens) the Initiative. Sides alternate from there, in random order within each side." }
};

/**
 * A combatant's side: "friendly" (Friendly tokens, or player characters without a token) or "hostile".
 * @param {Combatant} combatant
 */
export function combatantSide(combatant) {
  const friendly = globalThis.CONST?.TOKEN_DISPOSITIONS?.FRIENDLY ?? 1;
  const disposition = combatant.token?.disposition ?? combatant.actor?.prototypeToken?.disposition;
  if ( Number.isFinite(disposition) ) return disposition === friendly ? "friendly" : "hostile";
  return combatant.actor?.hasPlayerOwner ? "friendly" : "hostile";
}

/** Shuffle a copy of a list. */
function shuffle(list, random = Math.random) {
  const out = [...list];
  for ( let i = out.length - 1; i > 0; i-- ) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/**
 * Set the order by side (p.84, the GM decides who has the Initiative): the chosen side goes first, then the
 * sides alternate, each side in random order; whoever is left over goes at the end. Initiative values count
 * down from the number of combatants, so the ⇈ / ⇊ buttons can still move anyone (cutting in line).
 * @param {Combat} combat
 * @param {"friendly"|"hostile"} first
 * @param {Function} [random]
 * @returns {Promise<Combatant[]>}  The new order
 */
export async function orderBySide(combat, first = "friendly", random = Math.random) {
  const all = [...combat.combatants];
  const sides = { friendly: shuffle(all.filter(c => combatantSide(c) === "friendly"), random), hostile: shuffle(all.filter(c => combatantSide(c) === "hostile"), random) };
  const order = [];
  let side = first;
  while ( sides.friendly.length || sides.hostile.length ) {
    const next = sides[side].shift() ?? sides[side === "friendly" ? "hostile" : "friendly"].shift();
    order.push(next);
    side = side === "friendly" ? "hostile" : "friendly";
  }
  const updates = order.map((c, i) => ({ _id: c.id, initiative: order.length - i }));
  if ( typeof combat.updateEmbeddedDocuments === "function" ) await combat.updateEmbeddedDocuments("Combatant", updates);
  else for ( const u of updates ) await combat.combatants.get(u._id).update({ initiative: u.initiative });
  await combat.setFlag?.(SCOPE, "firstSide", first);
  return order;
}

/* -------------------------------------------- */
/*  Move Action (p.85: once per round)          */
/* -------------------------------------------- */

/** Whether a combatant has taken its Move Action this round. */
export function hasMoved(combatant) {
  const combat = combatant.combat ?? combatant.parent;
  return (combatant.getFlag?.(SCOPE, "moved") ?? null) === (combat?.round ?? 0);
}

/**
 * Take (or undo) the combatant's Move Action: once per round, as an action (p.85). Undo gives the action back.
 * @param {Combatant} combatant
 */
export async function toggleMove(combatant) {
  const combat = combatant.combat ?? combatant.parent;
  const a = combatantActions(combatant);
  if ( hasMoved(combatant) ) {
    await combatant.unsetFlag(SCOPE, "moved");
    if ( a.used > 0 ) {
      if ( a.tracked ) await combatant.actor.update({ "system.combat.actionsUsed": a.used - 1 });
      else await combatant.setFlag(SCOPE, "actionsUsed", a.used - 1);
    }
    return false;
  }
  if ( a.left <= 0 ) ui.notifications?.warn(`${combatant.name ?? combatant.actor?.name} has no actions left this round for a Move Action.`);
  await combatant.setFlag(SCOPE, "moved", combat?.round ?? 0);
  await spendOne(combatant);
  return true;
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

/** The cover marker (p.90): lit when the combatant is behind cover this combat. */
function coverIcon(combatant, canSet) {
  const cover = combatantCover(combatant);
  const tip = cover ? `Behind cover: ${cover.label} (${cover.left} of ${cover.sdc} S.D.C. left). Bullets, energy and black powder lose ${coverReduction(cover.sdc)}.`
    : "Not behind cover.";
  const tag = canSet ? "a" : "span";
  return `<${tag} aria-label="Cover" class="pu-cover${cover ? " covered" : ""}" data-tooltip="${tip}${canSet ? " Click to set or change it (lasts this combat)." : ""}"><i class="fa-solid fa-trowel-bricks"></i></${tag}>`;
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
    const pips = Array.from({ length: Math.min(a.total, 10) }, (_, i) => `<i class="pu-pip${i < a.left ? " left" : ""}" data-tooltip="${a.left} of ${a.total} action${a.total === 1 ? "" : "s"} left this round (filled = left, empty = spent)" aria-label="Action ${i + 1}: ${i < a.left ? "left" : "spent"}"></i>`).join("");
    const moved = hasMoved(combatant);
    const canMove = game.user.isGM || combatant.isOwner;
    const moveTip = moved ? "Move Action: taken this round (it cost an action)" : "Move Action: not taken yet (once per round, costs an action)";
    box.innerHTML = `<span class="pu-pips" data-tooltip="${a.left} of ${a.total} action${a.total === 1 ? "" : "s"} left this round (filled = left, empty = spent)">${pips}</span>`
      + `<${canMove ? "a" : "span"} aria-label="Move Action" class="pu-move${moved ? " moved" : ""}" data-tooltip="${moveTip}${canMove ? (moved ? ". Click to undo." : ". Click when moving.") : ""}"><i class="fa-solid fa-person-walking"></i></${canMove ? "a" : "span"}>`
      + coverIcon(combatant, canMove)
      + (game.user.isGM ? `<a class="pu-init-up" data-tooltip="Gains the Initiative (top of the order)"><i class="fa-solid fa-angles-up"></i></a>`
        + `<a class="pu-init-down" data-tooltip="Loses the Initiative (bottom of the order: knocked down, Held, Thrown...)"><i class="fa-solid fa-angles-down"></i></a>` : "");
    box.querySelector(".pu-init-up")?.addEventListener("click", event => { event.stopPropagation(); shiftInitiative(combatant, true); });
    box.querySelector(".pu-init-down")?.addEventListener("click", event => { event.stopPropagation(); shiftInitiative(combatant, false); });
    box.querySelector("a.pu-move")?.addEventListener("click", event => { event.stopPropagation(); toggleMove(combatant); });
    box.querySelector("a.pu-cover")?.addEventListener("click", event => { event.stopPropagation(); coverDialog(combatant); });
    const name = li.querySelector(".token-name, .name") ?? li;
    name.append(box);
  }
  // The GM's "who goes first" bar above the list.
  if ( game.user.isGM && root && !root.querySelector(".pu-first-side") ) {
    const chosen = combat.getFlag?.(SCOPE, "firstSide");
    const bar = document.createElement("div");
    bar.className = "pu-first-side";
    bar.innerHTML = `<span class="pu-first-label" data-tooltip="p.84: the GM decides who has the Initiative. Use ⇈ / ⇊ on a combatant to cut in line.">Who goes first?</span>`
      + Object.entries(SIDES).map(([key, side]) => `<button type="button" class="pu-side ${key}${chosen === key ? " active" : ""}" data-side="${key}" data-tooltip="${side.tooltip}">${side.label}</button>`).join("");
    for ( const button of bar.querySelectorAll("button") ) {
      button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); orderBySide(combat, button.dataset.side); });
    }
    const list = root.querySelector("ol.combat-tracker, .combat-tracker");
    const header = root.querySelector("header");
    if ( list ) list.before(bar);
    else if ( header ) header.after(bar);
    else root.prepend(bar);
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
