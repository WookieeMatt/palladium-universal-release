/**
 * Blunt weapons (v1.24.0): Roll with Impact (p.84) works against blunt physical attacks, so weapons carry a
 * Blunt box. `isBluntWeapon` is the rule of thumb used by the "Mark Blunt Weapons" GM macro to tick it:
 * W.P. Blunt, Staff and Chain weapons (not the bladed chain weapons), and natural weapons that hit like a club
 * (punches, kicks, tails, head butts, hooves). Explosions don't need it (always allowed); bullets and energy never.
 */
import { postCard } from "./dice.mjs";

const BLUNT_PROFICIENCIES = ["blunt", "staff", "chain"];
const BLADED = /sickle|kusarigama|kyoketsu|blade|axe|sword|spear|knife|dagger|claw/i;
const BLUNT_NATURAL = /punch|kick|fist|tail|head ?butt|hoof|hooves|\bram\b|club|slam|body block|shell/i;
const BLUNT_THROWN = /rock|stone|brick|club|boomerang|bola/i;

/**
 * Should this weapon be Blunt?
 * @param {object} item   An Item or its data ({name, type, system})
 */
export function isBluntWeapon(item) {
  if ( item?.type !== "weapon" ) return false;
  const s = item.system ?? {};
  const name = item.name ?? "";
  if ( ["firearm", "energy", "blackPowder", "bow"].includes(s.weaponType) ) return false;
  if ( s.weaponType === "natural" ) return BLUNT_NATURAL.test(name) && !/claw|bite|teeth|fang|spike|horn|talon|beak|stinger/i.test(name);
  if ( s.weaponType === "thrown" ) return BLUNT_THROWN.test(name);
  return BLUNT_PROFICIENCIES.includes(String(s.proficiency ?? "").toLowerCase()) && !BLADED.test(name);
}

/**
 * GM: tick Blunt on every weapon that should have it: world items, actors' items (tokens' too), and the
 * unlocked Item / Actor compendiums. Never unticks anything. Posts a whispered summary.
 * @param {object} [options]
 * @param {boolean} [options.packs=true]   Also unlocked compendiums
 * @param {boolean} [options.quiet=false]  No card when nothing changed
 * @returns {Promise<{updated: string[], locked: string[]}>}
 */
export async function markBluntWeapons({ packs = true, quiet = false } = {}) {
  if ( !game.user.isGM ) { ui.notifications.warn("Only the GM can mark blunt weapons."); return { updated: [], locked: [] }; }
  const updated = [];
  const locked = [];
  const fix = async items => items.filter(i => isBluntWeapon(i) && !i.system.blunt).map(i => ({ _id: i.id, "system.blunt": true }));
  // World items
  let u = await fix([...game.items]);
  if ( u.length ) { await Item.updateDocuments(u); updated.push(`World items: ${u.length}`); }
  // Actors (world) and their embedded weapons
  for ( const actor of game.actors ) {
    u = await fix([...actor.items]);
    if ( u.length ) { await actor.updateEmbeddedDocuments("Item", u); updated.push(`${actor.name}: ${u.length}`); }
  }
  // Unlinked tokens on scenes
  for ( const scene of game.scenes ?? [] ) {
    for ( const token of scene.tokens ?? [] ) {
      if ( token.actorLink || !token.actor ) continue;
      u = await fix([...token.actor.items]);
      if ( u.length ) { await token.actor.updateEmbeddedDocuments("Item", u); updated.push(`${token.name} (token, ${scene.name}): ${u.length}`); }
    }
  }
  // Compendiums
  if ( packs ) {
    for ( const pack of game.packs ?? [] ) {
      if ( !["Item", "Actor"].includes(pack.documentName) ) continue;
      const docs = await pack.getDocuments();
      if ( pack.locked ) {
        const needs = pack.documentName === "Item" ? (await fix(docs)).length
          : (await Promise.all(docs.map(a => fix([...a.items])))).reduce((n, list) => n + list.length, 0);
        if ( needs ) locked.push(`${pack.title} (${needs})`);
        continue;
      }
      if ( pack.documentName === "Item" ) {
        u = await fix(docs);
        if ( u.length ) { await Item.updateDocuments(u, { pack: pack.collection }); updated.push(`${pack.title}: ${u.length}`); }
      }
      else {
        let n = 0;
        for ( const actor of docs ) {
          u = await fix([...actor.items]);
          if ( u.length ) { await actor.updateEmbeddedDocuments("Item", u); n += u.length; }
        }
        if ( n ) updated.push(`${pack.title}: ${n}`);
      }
    }
  }
  if ( quiet && !updated.length && !locked.length ) return { updated, locked };
  const list = a => a.map(t => `<li>${foundry.utils.escapeHTML(t)}</li>`).join("");
  await postCard({ name: "Mark Blunt Weapons", img: "icons/svg/sword.svg" }, { title: "Blunt Weapons Marked", whisper: [game.user.id],
    body: `<p class="pu-text">${updated.length ? "Ticked <strong>Blunt</strong> on:" : "Every weapon that should be Blunt already is."}</p>${updated.length ? `<ul>${list(updated)}</ul>` : ""}
      ${locked.length ? `<p class="hint">Locked compendiums skipped (unlock them and run the macro again):</p><ul>${list(locked)}</ul>` : ""}
      <p class="hint">Rule of thumb: W.P. Blunt / Staff / Chain weapons (not bladed ones), punches, kicks, tails, hooves and head butts. Tick or untick any weapon by hand on its sheet.</p>` });
  return { updated, locked };
}

/* -------------------------------------------- */
/*  Permanent: set in code, not only by the macro */
/* -------------------------------------------- */

/** A weapon's source data with Blunt ticked when the rule says so (unchanged otherwise). */
function withBlunt(data) {
  if ( (data?.type !== "weapon") || data.system?.blunt || !isBluntWeapon(data) ) return data;
  return foundry.utils.mergeObject(data, { system: { blunt: true } }, { inplace: false });
}

/**
 * Blunt is kept by code, so nothing (a compendium rebuild, an old module's items) can undo it:
 * - every weapon created (dropped on a sheet, imported, from an actor's items) gets Blunt when the rule says so;
 * - once per world, the active GM ticks it on the weapons already there (world items, actors, tokens).
 * Untick a weapon by hand afterwards if you disagree; it stays unticked.
 */
export function initBlunt() {
  game.settings.register("palladium-universal", "bluntMigrated", { scope: "world", config: false, type: Boolean, default: false });
  Hooks.on("preCreateItem", item => {
    if ( (item.type === "weapon") && !item.system.blunt && isBluntWeapon(item) ) item.updateSource({ "system.blunt": true });
  });
  Hooks.on("preCreateActor", actor => {
    const items = actor._source?.items ?? [];
    if ( !items.some(i => withBlunt(i) !== i) ) return;
    actor.updateSource({ items: items.map(withBlunt) });
  });
  Hooks.once("ready", async () => {
    if ( !game.user.isActiveGM || game.settings.get("palladium-universal", "bluntMigrated") ) return;
    await markBluntWeapons({ packs: false, quiet: true });
    await game.settings.set("palladium-universal", "bluntMigrated", true);
  });
}
