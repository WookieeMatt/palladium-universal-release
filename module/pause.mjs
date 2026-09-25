/**
 * "Turn Off Pause" (world setting, GM): the world never stays paused. It opens unpaused, and when anyone
 * pauses (the space bar, the pause button, a module) the active GM unpauses it straight away.
 */

const SETTING = "noPause";

/** Is the setting on? */
export function pauseOff() {
  try { return !!game.settings.get("palladium-universal", SETTING); }
  catch(err) { return false; }
}

/** The active GM unpauses the world for everyone. */
export function unpause() {
  if ( !game.user?.isActiveGM || !game.paused ) return;
  return game.togglePause(false, { broadcast: true });
}

/** Register the setting and the hooks (called from "init"). */
export function initPause() {
  game.settings.register("palladium-universal", SETTING, {
    name: "Turn Off Pause",
    hint: "The world opens unpaused and can't be paused: pressing Space or the pause button is undone at once. Untick to use Foundry's normal pause.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => { if ( value ) unpause(); }
  });
  Hooks.on("pauseGame", paused => { if ( paused && pauseOff() ) unpause(); });
  Hooks.once("ready", () => { if ( pauseOff() ) unpause(); });
}
