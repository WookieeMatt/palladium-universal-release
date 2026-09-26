/**
 * Default ammo for bows and black powder guns (v1.35): weapons made before ammo was counted (1.34) had no Ammo
 * max, so nothing counted down. A black powder gun holds one load (a pair of pistols two), a bow or crossbow a
 * quiver of 12 (the book gives no number: change it on the weapon). Only weapons with no Ammo max set.
 *  - once per world (the active GM): world items and every actor's weapons;
 *  - new weapons of those kinds without an Ammo max (older compendium copies, imports).
 */

const SCOPE = "palladium-universal";
const SETTING = "ammoDefaultsApplied";

/** The default Ammo max for a weapon, or 0 (not a bow / black powder, or already set). */
export function defaultAmmo(weapon) {
  const w = weapon?.system;
  if ( (weapon?.type !== "weapon") || !w || (w.ammo?.max > 0) ) return 0;
  if ( w.weaponType === "blackPowder" ) return /\(pair\)/i.test(weapon.name ?? "") ? 2 : 1;
  if ( w.weaponType === "bow" ) return 12;
  return 0;
}

/** Give every bow and black powder gun in the world its default ammo. @returns {Promise<number>} weapons changed */
export async function applyAmmoDefaults() {
  let n = 0;
  const worldUpdates = (game.items ?? []).filter(i => defaultAmmo(i)).map(i => ({ _id: i.id, "system.ammo.value": defaultAmmo(i), "system.ammo.max": defaultAmmo(i) }));
  if ( worldUpdates.length ) { await Item.updateDocuments(worldUpdates); n += worldUpdates.length; }
  for ( const actor of game.actors ?? [] ) {
    const updates = actor.items.filter(i => defaultAmmo(i)).map(i => ({ _id: i.id, "system.ammo.value": defaultAmmo(i), "system.ammo.max": defaultAmmo(i) }));
    if ( updates.length ) { await actor.updateEmbeddedDocuments("Item", updates); n += updates.length; }
  }
  return n;
}

/** Register the setting and the hooks (in "init"). */
export function initAmmoDefaults() {
  game.settings.register(SCOPE, SETTING, { scope: "world", config: false, type: Boolean, default: false });
  Hooks.on("preCreateItem", (item, data, options) => {
    if ( options.puBlank ) return;
    const n = defaultAmmo(item);
    if ( n ) item.updateSource({ "system.ammo.value": n, "system.ammo.max": n });
  });
  Hooks.once("ready", async () => {
    if ( !game.user.isActiveGM || game.settings.get(SCOPE, SETTING) ) return;
    const n = await applyAmmoDefaults();
    await game.settings.set(SCOPE, SETTING, true);
    if ( n ) ui.notifications.info(`Palladium Universal: ${n} bow${n === 1 ? "" : "s"} and black powder gun${n === 1 ? "" : "s"} now count their ammo (bows 12, black powder 1 load; change it on the weapon).`);
  });
}
