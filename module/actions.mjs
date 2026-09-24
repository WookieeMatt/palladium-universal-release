/**
 * Actions per Round tracking (p.84–90). Attacks, maneuvers, spells, psionics and most Reactions spend
 * actions; the count resets when a new combat round starts. Running out only warns: the GM decides.
 */

/**
 * Spend actions for an actor, if it tracks them.
 * @param {Actor} actor
 * @param {number} [count=1]
 * @param {string} [what]      Shown in the warning
 * @returns {Promise<string>}  A note for the chat card ("2 of 4 actions left")
 */
export async function spendActions(actor, count = 1, what = "that") {
  const c = actor?.system.combat;
  if ( !c || (c.actionsLeft === undefined) || !count ) return "";
  if ( c.actionsLeft < count ) {
    ui.notifications.warn(`${actor.name} has ${c.actionsLeft} action${c.actionsLeft === 1 ? "" : "s"} left this round for ${what}.`);
  }
  const used = c.actionsUsed + count;
  if ( actor.isOwner ) await actor.update({ "system.combat.actionsUsed": used });
  const left = Math.max(0, c.totals.actions - used);
  return `<span class="hint">${count === 1 ? "One action" : `${count} actions`} · ${left} of ${c.totals.actions} left this round.</span>`;
}

/**
 * Reset every combatant's actions (and end one-round conditions) when a new round begins.
 * Runs for the GM only, so each update happens once.
 * @param {Combat} combat
 * @param {object} changed
 */
export async function onUpdateCombat(combat, changed) {
  if ( !game.user.isActiveGM || !("round" in changed) ) return;
  for ( const combatant of combat.combatants ) {
    const actor = combatant.actor;
    if ( !actor?.system.combat || (actor.system.combat.actionsUsed === undefined) ) continue;
    if ( actor.system.combat.actionsUsed ) await actor.update({ "system.combat.actionsUsed": 0 });
    // Horrified lasts one melee round (Transdimensional p.89).
    if ( actor.statuses.has("shocked") ) await actor.toggleStatusEffect("shocked", { active: false });
  }
}

/**
 * Clear spent actions when combat ends.
 * @param {Combat} combat
 */
export async function onDeleteCombat(combat) {
  if ( !game.user.isActiveGM ) return;
  for ( const combatant of combat.combatants ) {
    const actor = combatant.actor;
    if ( actor?.system.combat?.actionsUsed ) await actor.update({ "system.combat.actionsUsed": 0 });
  }
}
