/**
 * Showdown (v1.25.0, p.84): "Otherwise, when combat begins the Initiative goes to whoever rolls highest on a D20
 * after adding Initiative bonuses. In the case of a tie, reroll." The GM's d20 button at the top of the Combat
 * Tracker clears the order and asks the table to roll: each player gets a popup with a Roll Initiative button for
 * their own combatants, the GM gets one button that rolls every NPC (anyone without a player online), and a chat
 * card keeps a Roll Initiative button for anyone who missed the popup. Foundry sorts the tracker by the results;
 * ties re-roll (combat-tracker.mjs).
 */
import { postCard } from "./dice.mjs";
import { combatantSide } from "./combat-tracker.mjs";

const SCOPE = "palladium-universal";
const QUERY = `${SCOPE}.showdown`;
const { DialogV2 } = foundry.applications.api;
const escape = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Whether a combatant is rolled by a player (a non-GM owner who is online). */
export function playerRolled(combatant) {
  const players = combatant.players ?? [];
  return players.some(u => u.active && !u.isGM);
}

/** Combatants a user rolls for: their own (players), or the NPCs (the GM). Only those without Initiative. */
export function showdownIds(combat, user = game.user) {
  const open = [...combat.combatants].filter(c => !Number.isFinite(c.initiative) && !c.isDefeated);
  if ( user.isGM ) return open.filter(c => !playerRolled(c)).map(c => c.id);
  return open.filter(c => c.testUserPermission?.(user, "OWNER") ?? c.isOwner).map(c => c.id);
}

/** Roll this user's Showdown Initiative (their combatants, or the NPCs for the GM). */
export async function rollShowdown(combat, user = game.user) {
  const ids = showdownIds(combat, user);
  if ( !ids.length ) { ui.notifications.info("Nothing left for you to roll."); return []; }
  await combat.rollInitiative(ids);
  return ids;
}

/** The player's popup (the query handler): Roll Initiative or Later. */
export async function showdownPopup({ combatId } = {}) {
  const combat = game.combats?.get(combatId) ?? game.combat;
  if ( !combat ) return false;
  const ids = showdownIds(combat);
  if ( !ids.length ) return false;
  const names = ids.map(id => escape(combat.combatants.get(id)?.name)).join(", ");
  const go = await DialogV2.wait({
    window: { title: "Showdown!" }, classes: ["palladium-universal", "pu-skill-mods"],
    content: `<div class="pu-sm"><p class="pu-sm-head"><strong>Roll Initiative</strong><span class="pu-sm-chance"><i class="fa-solid fa-dice-d20"></i></span></p>
      <p>${names}: d20 + Initiative bonus. Highest goes first; ties re-roll.</p></div>`,
    buttons: [{ action: "roll", label: "Roll Initiative", icon: "fa-solid fa-dice-d20", default: true },
      { action: "later", label: "Later", icon: "fa-solid fa-clock" }],
    rejectClose: false
  });
  if ( go !== "roll" ) return false;
  await rollShowdown(combat);
  return true;
}

/**
 * GM: start a Showdown. Combatants in `first` (an ambush or sudden violence) get the Initiative at the top of the
 * order; everyone else in THIS combat rolls: the order is cleared, a chat card is posted, each player online who
 * owns one of these combatants gets their popup, and the GM gets the Roll NPCs button. Nobody outside the tracker
 * is asked.
 * @param {Combat} combat
 * @param {object} [options]
 * @param {string[]} [options.first]   Combatant ids that have the Initiative
 * @param {string} [options.mode]      "showdown", "ambush" or "violence" (for the tracker's highlight and the card)
 */
export async function startShowdown(combat = game.combat, { first = [], mode = "showdown" } = {}) {
  if ( !game.user.isGM || !combat ) return null;
  const inFight = [...combat.combatants].filter(c => !c.isDefeated);
  const top = inFight.filter(c => first.includes(c.id)).sort(() => Math.random() - 0.5);
  const updates = inFight.map(c => ({ _id: c.id, initiative: null }));
  top.forEach((c, i) => { updates.find(u => u._id === c.id).initiative = 1000 + top.length - i; });
  if ( updates.length ) await combat.updateEmbeddedDocuments("Combatant", updates);
  await combat.unsetFlag?.(SCOPE, "firstSide");
  await combat.setFlag?.(SCOPE, "initiativeMode", mode);
  const lead = top.map(c => escape(c.name)).join(", ");
  const title = { ambush: "Ambush!", violence: "Sudden Violence!" }[mode] ?? "Showdown!";
  const rest = inFight.length - top.length;
  await postCard({ name: "Showdown", img: "icons/svg/d20-black.svg" }, { title: `${title}${rest ? " Roll Initiative" : ""}`,
    flags: { [SCOPE]: { card: "showdown", combatId: combat.id } },
    body: `<p class="pu-text">${lead ? `<strong>${lead}</strong> ${top.length === 1 ? "has" : "have"} the Initiative. ` : ""}${rest ? `${top.length ? "Everyone else rolls" : "Everyone rolls"} d20 + Initiative bonus: highest goes first, ties re-roll (p.84).` : ""} The order stays for the whole combat.</p>`,
    buttons: rest ? `<div class="pu-buttons"><button type="button" data-pu-action="showdown-roll" data-tooltip="Rolls your combatants in this fight (the GM: the NPCs)"><i class="fa-solid fa-dice-d20"></i> Roll Initiative</button></div>` : "" });
  if ( !rest ) return 0;
  // Each player online who owns a combatant still to roll in THIS combat: a popup.
  const waiting = inFight.filter(c => !first.includes(c.id));
  const players = game.users.filter(u => u.active && !u.isGM && waiting.some(c => c.testUserPermission?.(u, "OWNER")));
  for ( const user of players ) user.query?.(QUERY, { combatId: combat.id }, { timeout: 600000 }).catch(() => null);
  // The GM: one button for every NPC.
  const npcs = showdownIds(combat, game.user).length;
  if ( !npcs ) return players.length;
  const go = await DialogV2.wait({
    window: { title }, classes: ["palladium-universal", "pu-skill-mods"],
    content: `<div class="pu-sm"><p class="pu-sm-head"><strong>Roll Initiative</strong><span class="pu-sm-chance"><i class="fa-solid fa-dice-d20"></i></span></p>
      <p>${players.length ? `${players.length} player${players.length === 1 ? " has" : "s have"} been asked to roll.` : "No players online with a combatant to roll."} Roll the NPCs (and anyone without a player online):</p></div>`,
    buttons: [{ action: "roll", label: `Roll NPCs (${npcs})`, icon: "fa-solid fa-dice-d20", default: true },
      { action: "later", label: "Later", icon: "fa-solid fa-clock" }],
    rejectClose: false
  });
  if ( go === "roll" ) await rollShowdown(combat, game.user);
  return players.length;
}

/**
 * The tracker's Initiative button (GM, p.84): one window with a dropdown: Showdown (everyone rolls), Ambush or
 * Sudden Violence (then Friendly or Hostile: that side has the Initiative, everyone else rolls).
 * @param {Combat} combat
 */
export async function initiativeDialog(combat = game.combat) {
  if ( !game.user.isGM || !combat ) return null;
  const choice = await DialogV2.wait({
    window: { title: "Initiative" }, classes: ["palladium-universal", "pu-skill-mods"],
    content: `<div class="pu-sm">
      <select name="mode"><option value="showdown">Showdown</option><option value="ambush">Ambush</option><option value="violence">Sudden Violence</option></select>
      <select name="side" hidden style="margin-top:4px"><option value="friendly">Friendly</option><option value="hostile">Hostile</option></select>
      <p class="hint pu-init-hint">Everyone rolls d20 + Initiative bonus.</p></div>`,
    render: (event, dialog) => {
      const root = dialog?.element ?? event?.target?.element;
      const mode = root?.querySelector?.("[name=mode]");
      const side = root?.querySelector?.("[name=side]");
      const hint = root?.querySelector?.(".pu-init-hint");
      mode?.addEventListener("change", () => {
        side.hidden = mode.value === "showdown";
        hint.textContent = { showdown: "Everyone rolls d20 + Initiative bonus.", ambush: "Which side sprang the ambush? They have the Initiative; everyone else rolls.",
          violence: "Which side started it? They have the Initiative; everyone else rolls." }[mode.value];
      });
    },
    buttons: [{ action: "go", label: "Start", icon: "fa-solid fa-dice-d20", default: true,
      callback: (event, button) => ({ mode: button.form.elements.mode.value, side: button.form.elements.side.value }) },
      { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark" }],
    rejectClose: false
  });
  if ( !choice?.mode ) return null;
  if ( choice.mode === "showdown" ) return startShowdown(combat);
  const first = [...combat.combatants].filter(c => !c.isDefeated && (combatantSide(c) === choice.side)).map(c => c.id);
  if ( !first.length ) return ui.notifications.warn(`Nobody on the ${choice.side === "friendly" ? "Friendly" : "Hostile"} side is in this fight.`), null;
  return startShowdown(combat, { first, mode: choice.mode });
}

/** Register the players' popup (in "init"). */
export function initShowdown() {
  if ( CONFIG.queries ) CONFIG.queries[QUERY] = data => showdownPopup(data);
}
