import { itemCost } from "./data/character.mjs";
import { postCard } from "./dice.mjs";

/**
 * Starting money and spending (v1.20.0). Each character's Starting Money comes from the rules: the money
 * their Origin / Education gives (p.64), rolled by the player. The sheet adds up the listed cost of every
 * priced item it holds (removing an item refunds it) plus Other Expenses. Starting Money is a soft cap:
 * going over tells the player and the GM, and the purchase still goes through.
 */

const escape = s => foundry.utils.escapeHTML(String(s ?? ""));
const format = n => CONFIG.PALLADIUM.formatCost(n);

/**
 * A background's money text with its dice as clickable rolls: "3D6×$1,000" → [[/r 3d6*1000]]{3D6×$1,000}.
 * @param {string} text
 */
export function moneyRolls(text) {
  return escape(text).replace(/(\d+)\s*D\s*(\d+)\s*[×x*]\s*\$\s*([\d,]+)/gi,
    (match, n, sides, amount) => `[[/r ${n}d${sides}*${amount.replace(/,/g, "")}]]{${match.trim()}}`);
}

/** The character's backgrounds that give starting money, for the sheet. */
export function moneySources(actor) {
  return actor.items.filter(i => (i.type === "background") && i.system.money)
    .map(i => ({ name: i.name, kind: i.system.kind, money: i.system.money, html: moneyRolls(i.system.money) }));
}

/**
 * After a change that raised spending: if the character is now over their starting money, tell the player
 * (notification) and the GM (whispered card). Nothing is blocked.
 * @param {Actor} actor
 * @param {number} before   Spending before the change
 * @param {string} what     What was bought
 */
export async function checkBudget(actor, before, what) {
  const m = actor.system.money;
  if ( (actor.type !== "character") || !m?.starting || !m.over || (m.spent <= before) ) return false;
  const over = m.spent - m.starting;
  ui.notifications.warn(`${actor.name} is ${format(over)} over their starting money (${format(m.spent)} of ${format(m.starting)}).`);
  const gms = game.users.filter(u => u.isGM).map(u => u.id);
  await postCard(actor, {
    title: `${actor.name}: Over Starting Money`, label: "Spent", result: format(m.spent),
    lines: [["Starting money", format(m.starting)], ["Items", format(m.itemsTotal)], ["Other expenses", format(m.other ?? 0)], ["Over by", format(over)]],
    notes: [`<span class="pu-failure">${escape(what)} took them over their starting money. Allowed: the GM decides.</span>`],
    whisper: [...new Set([...gms, game.user.id])],
    flags: { "palladium-universal": { card: "overBudget", actorUuid: actor.uuid } }
  });
  return true;
}

/** Hooks: purchases, quantity / cost edits and Other Expenses, on the client that made the change. */
export function initMoney() {
  const mine = userId => userId === game.user.id;
  const isPC = actor => actor?.type === "character";
  Hooks.on("createItem", (item, options, userId) => {
    if ( !mine(userId) || !isPC(item.parent) ) return;
    const cost = itemCost(item);
    if ( cost ) checkBudget(item.parent, item.parent.system.money.spent - cost, `${item.name} (${format(cost)})`);
  });
  Hooks.on("preUpdateItem", (item, changes, options) => {
    if ( isPC(item.parent) ) options.puSpentBefore = item.parent.system.money.spent;
  });
  Hooks.on("updateItem", (item, changes, options, userId) => {
    if ( mine(userId) && isPC(item.parent) && (options.puSpentBefore !== undefined) ) {
      checkBudget(item.parent, options.puSpentBefore, `${item.name} (now ${format(itemCost(item))})`);
    }
  });
  Hooks.on("preUpdateActor", (actor, changes, options) => {
    if ( isPC(actor) && foundry.utils.hasProperty(changes, "system.money") ) options.puSpentBefore = actor.system.money.spent;
  });
  Hooks.on("updateActor", (actor, changes, options, userId) => {
    if ( mine(userId) && isPC(actor) && (options.puSpentBefore !== undefined) ) checkBudget(actor, options.puSpentBefore, "Other expenses");
  });
}
