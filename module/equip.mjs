/**
 * Armor equips itself (v1.32.0): body armor or a shield dropped on a character or NPC is equipped when that
 * actor wears none of that kind yet. One already worn stays on; the new one arrives unequipped. A blank armor
 * made with the sheet's + button isn't equipped (it has no stats yet).
 */

/** Should this new armor be equipped? */
export function shouldAutoEquip(item, actor, options = {}) {
  if ( (item?.type !== "armor") || !["character", "npc"].includes(actor?.type) || options.puBlank ) return false;
  const kind = item.system?.armorType ?? "body";
  if ( options.puEquipped?.[kind] ) return false; // several dropped at once: only the first
  return !actor.items.some(i => (i.type === "armor") && ((i.system?.armorType ?? "body") === kind) && i.system?.equipped);
}

/** Hook it up (in "init"). */
export function initAutoEquip() {
  Hooks.on("preCreateItem", (item, data, options) => {
    if ( !shouldAutoEquip(item, item.parent, options) ) return;
    const kind = item.system?.armorType ?? "body";
    options.puEquipped = { ...(options.puEquipped ?? {}), [kind]: true };
    item.updateSource({ "system.equipped": true });
  });
}
