/**
 * Automated Animations support (https://github.com/theripper93/autoanimations, with Sequencer and JB2A).
 * When the module is active, the system asks it to play an animation at the moment something is used:
 * weapon attacks (with hit or miss), maneuvers, spells, psionics, item rolls and devices. Damage,
 * saves and skill checks don't animate. The trigger set in CONFIG.PALLADIUM.ANIMATION_TRIGGERS maps
 * TMNT names to Automated Animations' built-in entries; an entry named after the item wins.
 */

/** Is Automated Animations available and switched on for this world? */
export function animationsEnabled() {
  if ( !globalThis.game?.modules?.get("autoanimations")?.active ) return false;
  if ( typeof globalThis.AutomatedAnimations?.playAnimation !== "function" ) return false;
  try { return game.settings.get("palladium-universal", "animations") !== false; } catch(err) { return true; }
}

/**
 * The extra names to try for an item, from the trigger set, then the fallback for its kind.
 * @param {string} name
 * @param {string} [kind]   Weapon type, or "maneuver", "spell", "psionic", "device"...
 * @returns {string[]}
 */
export function animationNames(name, kind) {
  const rule = (CONFIG.PALLADIUM.ANIMATION_TRIGGERS ?? []).find(r => r.match?.test(name ?? ""));
  const names = [...(rule?.names ?? []), ...(CONFIG.PALLADIUM.ANIMATION_FALLBACKS?.[kind] ?? [])];
  return [...new Set(names)];
}

/** The token to animate from: the user's controlled token for this actor, else one on the scene. */
function sourceToken(actor) {
  if ( !actor || !globalThis.canvas?.tokens ) return null;
  return canvas.tokens.controlled.find(t => t.actor?.id === actor.id)
    ?? actor.token?.object ?? actor.getActiveTokens?.()[0] ?? null;
}

/**
 * Play an animation for something the actor used.
 * @param {Actor} actor
 * @param {Item|{name: string}} item   The item, or a stand-in with a name (maneuvers)
 * @param {object} [options]
 * @param {string} [options.kind]      For the fallback names (weapon type, "maneuver", "spell"...)
 * @param {boolean} [options.hit]      For attacks: true on a hit, false on a miss (plays the miss version)
 */
export async function playAnimation(actor, item, { kind, hit } = {}) {
  if ( !item || !animationsEnabled() ) return null;
  const token = sourceToken(actor);
  if ( !token ) return null;
  const targets = Array.from(game.user.targets ?? []);
  const data = { targets, extraNames: animationNames(item.name, kind) };
  if ( hit !== undefined ) {
    data.hitTargets = hit ? targets : [];
    data.playOnMiss = true;
  }
  if ( Hooks.call("palladium.preAnimation", actor, item, data) === false ) return null;
  try {
    return await AutomatedAnimations.playAnimation(token, item, data);
  } catch(err) {
    console.warn("Palladium Universal | Automated Animations could not play the animation.", err);
    return null;
  }
}
