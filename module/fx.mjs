/**
 * Blood & death effects (v1.24.0): a blood splash on the token when a character starts Bleeding Out, and a death
 * marker when they die (Foundry's skull overlay, plus a splash and a "Dead" float; the combatant is marked defeated
 * in conditions.mjs). Runs on every client from the createActiveEffect hook, so each screen plays it locally.
 * With Sequencer + JB2A the JB2A splash is used; otherwise a small built-in canvas splash.
 * Client setting "bloodEffects" (on by default) turns it off per player. Macros: game.palladium.bloodSplash(token),
 * game.palladium.deathMarker(token).
 */
const SCOPE = "palladium-universal";
const SPLASH = ["jb2a.liquid.splash.red", "jb2a.liquid.splash_side.red", "jb2a.liquid.blood_splatter.red"];

/** Whether this client plays the effects. */
export function effectsOn() {
  try { return game.settings.get(SCOPE, "bloodEffects") !== false; } catch(err) { return true; }
}

/** The first Sequencer database entry that exists, or null. */
function sequencerFile(names) {
  if ( !game.modules?.get("sequencer")?.active || !globalThis.Sequencer?.Database ) return null;
  return names.find(n => Sequencer.Database.entryExists(n)) ?? null;
}

/**
 * The built-in splash: red drops flying out from the token and fading (PIXI 7 or 8).
 * @param {Token} token
 * @param {object} [options]   {scale, color, duration}
 */
function canvasSplash(token, { scale = 1, color = 0x8a0303, duration = 900 } = {}) {
  if ( !globalThis.canvas?.ready || !globalThis.PIXI || !token?.center ) return;
  const layer = canvas.interface ?? canvas.stage;
  const box = new PIXI.Container();
  box.position.set(token.center.x, token.center.y);
  layer.addChild(box);
  const size = (token.w ?? canvas.grid.size) * scale;
  const drops = Array.from({ length: Math.round(16 * scale) }, () => {
    const g = new PIXI.Graphics();
    const r = (0.02 + Math.random() * 0.05) * size;
    if ( typeof g.circle === "function" && typeof g.fill === "function" && !g.beginFill ) g.circle(0, 0, r).fill({ color, alpha: 0.9 });
    else g.beginFill(color, 0.9).drawCircle(0, 0, r).endFill();
    const a = Math.random() * Math.PI * 2;
    const d = (0.25 + Math.random() * 0.45) * size;
    box.addChild(g);
    return { g, dx: Math.cos(a) * d, dy: Math.sin(a) * d };
  });
  const start = performance.now();
  const tick = () => {
    const p = Math.min(1, (performance.now() - start) / duration);
    const e = 1 - ((1 - p) ** 3);
    for ( const d of drops ) { d.g.position.set(d.dx * e, d.dy * e); d.g.alpha = 1 - (p * p); }
    if ( p >= 1 ) { canvas.app.ticker.remove(tick); box.destroy({ children: true }); }
  };
  canvas.app.ticker.add(tick);
}

/** A blood splash on a token (this client only). */
export function bloodSplash(token, { scale = 1 } = {}) {
  if ( !token ) return;
  const file = sequencerFile(SPLASH);
  if ( file ) return new Sequence().effect().file(file).atLocation(token).scaleToObject(1.4 * scale).randomRotation().locally().play();
  return canvasSplash(token, { scale });
}

/** The death marker's effect: a bigger splash and a "Dead" float (the skull overlay is the "dead" status). */
export function deathMarker(token) {
  if ( !token ) return;
  bloodSplash(token, { scale: 1.6 });
  canvas?.interface?.createScrollingText?.(token.center, "☠ Dead", {
    anchor: globalThis.CONST?.TEXT_ANCHOR_POINTS?.TOP, direction: globalThis.CONST?.TEXT_ANCHOR_POINTS?.TOP, distance: token.h ?? 100,
    fontSize: 36, fill: "#b3121b", stroke: 0x000000, strokeThickness: 5, jitter: 0.25
  });
}

/** createActiveEffect (every client): play the effect for Bleeding Out and Dead. */
export function onEffectFx(effect) {
  if ( !effectsOn() ) return;
  const actor = effect.parent;
  if ( actor?.documentName !== "Actor" ) return;
  const statuses = effect.statuses ?? new Set();
  const tokens = actor.getActiveTokens?.() ?? [];
  if ( statuses.has("dead") ) for ( const t of tokens ) deathMarker(t);
  else if ( statuses.has("bleeding") ) for ( const t of tokens ) bloodSplash(t);
}

/** The preset death marker: Foundry's skull. */
export const DEFAULT_DEATH_MARKER = "icons/svg/skull.svg";

/** The death marker image (world setting "deathMarker"; blank = the preset skull). */
export function deathMarkerImage() {
  let img;
  try { img = game.settings.get(SCOPE, "deathMarker"); } catch(err) { img = ""; }
  return img || DEFAULT_DEATH_MARKER;
}

/** Point the "dead" status (the token overlay) at the chosen image. */
export function applyDeathMarkerImage() {
  const dead = CONFIG.statusEffects?.find(e => e.id === "dead");
  if ( dead ) dead.img = deathMarkerImage();
}

/** Register the setting and the hook (in "init"). */
export function initFx() {
  game.settings.register(SCOPE, "deathMarker", {
    name: "Death Marker",
    hint: "The image shown over a dead character's token (the \"Dead\" status overlay). Leave blank for the preset skull, or pick your own image. New deaths use it; to update a token that's already dead, remove Dead and apply it again.",
    scope: "world", config: true, type: String, default: "", filePicker: "image",
    onChange: () => applyDeathMarkerImage()
  });
  Hooks.once("setup", applyDeathMarkerImage);
  Hooks.once("ready", applyDeathMarkerImage);
  game.settings.register(SCOPE, "bloodEffects", {
    name: "Blood & Death Effects",
    hint: "A blood splash on the token when a character starts Bleeding Out, and a splash and \"Dead\" float when they die (with the skull overlay). Uses JB2A through Sequencer when installed. This player's screen only.",
    scope: "client", config: true, type: Boolean, default: true
  });
  Hooks.on("createActiveEffect", onEffectFx);
}
