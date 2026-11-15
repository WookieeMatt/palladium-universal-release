import { PRESETS, PRESET_VERSION } from "./animation-presets.mjs";

/**
 * Automated Animations support (https://github.com/theripper93/autoanimations, with Sequencer and JB2A).
 * When the module is active, the system asks it to play an animation at the moment something is used:
 * weapon attacks (with hit or miss), maneuvers, spells, psionics, item rolls, devices, black powder
 * misfires, Horror Factor and Temporal Mishaps. Damage, saves and skill checks don't animate. The trigger
 * set in CONFIG.PALLADIUM.ANIMATION_TRIGGERS maps TMNT names to Automated Animations' built-in entries;
 * an entry named after the item wins.
 *
 * The system also installs its own presets into Automated Animations' menus (animation-presets.mjs: one
 * for every weapon, spell, psionic, power and device in the TMNT compendium, plus the generic "Palladium: ..."
 * effects and the condition effects), and has a setting for which JB2A pack (free or premium) Automated
 * Animations draws from.
 */

const SCOPE = "palladium-universal";
const AA = "autoanimations";

/** The two JB2A packs and the path Automated Animations' own "jb2aLocation" setting takes for each. */
const JB2A = {
  free: { id: "JB2A_DnD5e", path: "modules/JB2A_DnD5e", label: "free" },
  premium: { id: "jb2a_patreon", path: "modules/jb2a_patreon", label: "premium" }
};

/** Generic device effects, by device type. */
const DEVICE_NAMES = { timeMachine: "Palladium: Time Machine", crossDimensional: "Palladium: Dimensional Device" };

/** Is Automated Animations available and switched on for this world? */
export function animationsEnabled() {
  if ( !globalThis.game?.modules?.get(AA)?.active ) return false;
  if ( typeof globalThis.AutomatedAnimations?.playAnimation !== "function" ) return false;
  try { return game.settings.get(SCOPE, "animations") !== false; } catch(err) { return true; }
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

/**
 * Names that go before the trigger set: a device's effect by its type, and a spell or power with nobody
 * targeted (a bolt needs a target, so a self spell shows its sign on the caster instead).
 */
function priorityNames(kind, { targets = [], deviceType } = {}) {
  if ( kind === "device" ) return [DEVICE_NAMES[deviceType] ?? "Palladium: Device"];
  if ( !targets.length && (kind === "spell") ) return ["Palladium: Spell"];
  if ( !targets.length && (kind === "psionic") ) return ["Palladium: Psionic"];
  return [];
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
 * @param {Item|{name: string}} item   The item, or a stand-in with a name (maneuvers, "Palladium: Misfire"...)
 * @param {object} [options]
 * @param {string} [options.kind]      For the fallback names (weapon type, "maneuver", "spell"...)
 * @param {boolean} [options.hit]      For attacks: true on a hit, false on a miss (plays the miss version)
 * @param {string} [options.deviceType] For devices without an item: the device type
 */
export async function playAnimation(actor, item, { kind, hit, deviceType } = {}) {
  if ( !item || !animationsEnabled() ) return null;
  const token = sourceToken(actor);
  if ( !token ) return null;
  const targets = Array.from(game.user.targets ?? []);
  const first = priorityNames(kind, { targets, deviceType: deviceType ?? item.system?.deviceType });
  const data = { targets, extraNames: [...new Set([...first, ...animationNames(item.name, kind)])] };
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

/* -------------------------------------------- */
/*  Settings and hooks                          */
/* -------------------------------------------- */

/** Register the JB2A and preset settings. Call from the init hook (the on/off setting is registered there). */
export function registerAnimationSettings() {
  game.settings.register(SCOPE, "jb2aSource", {
    name: "JB2A Animation Pack",
    hint: "Which JB2A pack Automated Animations draws from. Automatic uses the premium pack (jb2a_patreon) when it is enabled, otherwise the free one (JB2A_DnD5e). Changing this reloads the game.",
    scope: "world", config: true, type: String, default: "auto", requiresReload: true,
    choices: { auto: "Automatic (premium if enabled, else free)", free: "Free (JB2A_DnD5e)", premium: "Premium (jb2a_patreon)" },
    onChange: () => syncJb2aSource()
  });

  game.settings.register(SCOPE, "animationPresets", {
    name: "Install Animation Presets",
    hint: "The first time Automated Animations loads, add this system's weapon, spell, psionic, power, device and condition animations to its menus. Entries you have edited are never overwritten.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(SCOPE, "presetsVersion", { scope: "world", config: false, type: Number, default: 0 });
  game.settings.register(SCOPE, "jb2aApplied", { scope: "world", config: false, type: String, default: "" });

  // A button that reinstalls the presets (Automated Animations' own settings menus work the same way).
  class PresetInstaller extends foundry.applications.api.ApplicationV2 {
    render() {
      installPresets({ force: true, announce: true });
      return this;
    }
  }
  game.settings.registerMenu(SCOPE, "installAnimationPresets", {
    name: "Reinstall Animation Presets",
    hint: "Add any missing Palladium animation presets to Automated Animations now, for example after switching JB2A packs.",
    label: "Install Presets", icon: "fa-solid fa-wand-magic-sparkles", type: PresetInstaller, restricted: true
  });
}

/** Hooks that connect the settings to Automated Animations. Call once at load. */
export function registerAnimationHooks() {
  Hooks.once("ready", () => syncJb2aSource({ announce: true }));
  Hooks.once("aa.ready", () => installPresets());
}

const setting = key => {
  try { return game.settings.get(SCOPE, key); } catch(err) { return null; }
};

/* -------------------------------------------- */
/*  JB2A free / premium                         */
/* -------------------------------------------- */

/**
 * Point Automated Animations at the chosen JB2A pack. "Automatic" leaves it alone (it uses the premium pack
 * when that is enabled, else the free one) and only undoes a path this system set itself.
 * @param {object} [options]
 * @param {boolean} [options.announce]   Offer a reload when the path had to change (the setting itself already asks)
 */
export async function syncJb2aSource({ announce = false } = {}) {
  if ( !game.user.isGM || !game.modules.get(AA)?.active ) return;
  const mode = setting("jb2aSource");
  let current;
  try { current = game.settings.get(AA, "jb2aLocation") || ""; } catch(err) { return; }
  const applied = setting("jb2aApplied");

  let wanted;
  if ( mode === "auto" ) wanted = (applied && (current === applied)) ? "" : current;
  else {
    const pack = JB2A[mode];
    if ( !pack || !game.modules.get(pack.id)?.active ) {
      ui.notifications.warn(`Palladium Universal: the ${pack?.label ?? mode} JB2A pack (${pack?.id ?? mode}) isn't enabled in this world, so Automated Animations keeps its current choice.`);
      return;
    }
    wanted = pack.path;
  }
  if ( wanted === current ) return;

  await game.settings.set(AA, "jb2aLocation", wanted);
  await game.settings.set(SCOPE, "jb2aApplied", (mode === "auto") ? "" : wanted);
  if ( announce ) foundry.applications.settings.SettingsConfig.reloadConfirm({ world: true });
}

/* -------------------------------------------- */
/*  Presets                                     */
/* -------------------------------------------- */

/** Does the animation database Automated Animations registered have this path (section.type.animation.variant.color)? */
function databaseHas(path) {
  const db = globalThis.Sequencer?.Database;
  if ( !db ) return true;
  const full = `${AA}.${path}`;
  try {
    const flat = db.flattenedEntries;
    if ( Array.isArray(flat) ) return flat.some(e => (e === full) || e.startsWith(`${full}.`) || e.startsWith(`${full}[`));
    return db.entryExists(full);
  } catch(err) { return true; }
}

/** A preset row as a (partial) Automated Animations entry; it fills in the remaining defaults itself. */
export function presetEntry(menu, label, path, opts = {}) {
  const [dbSection, menuType, animation, variant, color] = path.split(".");
  const options = {};
  const entry = {
    label, metaData: { palladium: PRESET_VERSION },
    primary: { video: { dbSection, menuType, animation, variant, color }, options }
  };
  if ( opts.exact ) entry.advanced = { exactMatch: true };
  if ( opts.size ) options.size = opts.size;
  if ( opts.repeat ) {
    options.repeat = opts.repeat;
    options.repeatDelay = opts.repeatDelay ?? 250;
  }
  if ( menu === "ontoken" ) options.playOn = opts.playOn ?? "default";
  if ( menu === "aefx" ) {
    entry.activeEffectType = "ontoken";
    Object.assign(options, { persistent: true, playOn: "source", isRadius: true, addTokenWidth: true, opacity: 0.75, size: 0.75, delay: 0 });
  }
  return entry;
}

/**
 * Add the system's animation presets to Automated Animations' global menus. Entries already there (matched by
 * name) are never changed, so anything the GM edited stays as it is. Presets the active JB2A pack lacks are skipped.
 * @param {object} [options]
 * @param {boolean} [options.force]      Install even if this version was installed before or auto-install is off
 * @param {boolean} [options.announce]   Always tell the GM what happened
 * @returns {Promise<number>}            Entries added
 */
export async function installPresets({ force = false, announce = false } = {}) {
  if ( !game.user.isGM ) return 0;
  const manager = globalThis.game.modules.get(AA)?.active ? globalThis.AutomatedAnimations?.AutorecManager : null;
  if ( !manager?.mergeMenus ) {
    if ( announce ) ui.notifications.warn("Palladium Universal: Automated Animations isn't active, so there is nothing to install into.");
    return 0;
  }
  if ( !force && (!setting("animationPresets") || (setting("presetsVersion") >= PRESET_VERSION)) ) return 0;

  const menus = ["melee", "range", "ontoken", "aefx"];
  const json = { version: manager.getAutorecEntries().version };
  const missing = [];
  for ( const [menu, label, path, opts] of PRESETS ) {
    if ( !databaseHas(path) ) {
      missing.push(`${label} (${path})`);
      continue;
    }
    (json[menu] ??= []).push(presetEntry(menu, label, path, opts));
  }
  if ( missing.length ) console.warn(`Palladium Universal | ${missing.length} animation presets skipped; the active JB2A pack lacks them:`, missing);

  const count = () => menus.reduce((total, menu) => total + manager.getMenu(menu).length, 0);
  const before = count();
  await manager.mergeMenus(json, Object.fromEntries(menus.map(menu => [menu, true])));
  const added = count() - before;

  if ( !missing.length ) await game.settings.set(SCOPE, "presetsVersion", PRESET_VERSION);
  if ( announce || added ) {
    ui.notifications.info(`Palladium Universal: added ${added} animation preset${added === 1 ? "" : "s"} to Automated Animations`
      + `${missing.length ? ` (${missing.length} skipped: not in the active JB2A pack)` : ""}.`);
  }
  return added;
}
