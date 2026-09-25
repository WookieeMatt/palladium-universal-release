import { postCard } from "./dice.mjs";
import { playAnimation } from "./animations.mjs";

const { DialogV2 } = foundry.applications.api;

/**
 * Roll an item's own roll (its Roll field, or dice written in its description) and post a card that
 * links back to the item.
 * @param {Actor} actor
 * @param {Item} item
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollItem(actor, item) {
  const rolls = item?.system.itemRolls ?? [];
  if ( !rolls.length ) return ui.notifications.warn(`${item?.name ?? "This item"} has nothing to roll.`);
  let choice = rolls[0];
  if ( rolls.length > 1 ) {
    const options = rolls.map((r, i) => `<option value="${i}">${r.label}: ${foundry.utils.escapeHTML(r.text)}</option>`).join("");
    const index = await DialogV2.prompt({
      classes: ["palladium-universal", "pu-skill-mods"],
      window: { title: `Roll ${item.name}` },
      content: `<div class="form-group"><label>Roll</label><div class="form-fields"><select name="roll">${options}</select></div></div>`,
      ok: { label: "Roll", callback: (event, button) => Number(button.form.elements.roll.value) },
      rejectClose: false
    });
    if ( !Number.isInteger(index) ) return null;
    choice = rolls[index];
  }
  if ( !Roll.validate(choice.formula) ) return ui.notifications.warn(`${item.name}: "${choice.text}" isn't a dice roll.`);
  const roll = await new Roll(choice.formula).evaluate();
  const dice = (roll.dice ?? []).reduce((n, d) => n + d.total, 0);
  playAnimation(actor, item, { kind: item.type });
  return postCard(actor, {
    title: item.name, item, label: choice.label, result: roll.total, rolls: [roll],
    caption: choice.text !== choice.label ? choice.text : "",
    lines: [["Formula", choice.formula], ["Dice", dice], ["Total", roll.total]]
  });
}

/**
 * Open a read-only view of an item from the copy saved on a chat card. The copy is used (not the
 * live item), so anyone can view it even without permission on the owner, and nothing can change.
 * @param {object} itemData   item.toObject() saved in the card's flags
 */
export async function viewItemCopy(itemData) {
  if ( !itemData ) return;
  const { default: PalladiumItemSheet } = await import("./sheets/item-sheet.mjs");
  const data = foundry.utils.mergeObject(itemData, { ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } },
    { inplace: false });
  const item = new CONFIG.Item.documentClass(data);
  const sheet = new PalladiumItemSheet({ document: item, readOnly: true,
    id: `pu-item-view-${item.id ?? foundry.utils.randomID()}-${foundry.utils.randomID(4)}` });
  return sheet.render({ force: true });
}
