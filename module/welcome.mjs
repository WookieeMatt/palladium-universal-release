import { postCard } from "./dice.mjs";

/**
 * The GM's welcome card: the modules the system works with (CONFIG.PALLADIUM.RECOMMENDED_MODULES) and whether
 * each is active, installed but off, or missing. Posted once per world, whispered to the GMs, and once more
 * whenever WELCOME_VERSION goes up (the module list changed).
 * The players' welcome: a short card, once per player, whispered to them: where the guide is and where to start.
 */

const SETTING = "welcomeShown";
const VERSION_SETTING = "welcomeVersion";
/** Raise when the recommended modules change, so existing worlds see the card again. 2: Token Action HUD. */
export const WELCOME_VERSION = 2;
const GUIDE = "Compendium.palladium-universal.system-guide.JournalEntry.7PKvaJAnvqYA9P9f";
const GUIDE_PAGES = { start: "kgj4mz3yPE5sVc2T", creation: "Jj27bKu7kGH7NPFD", combat: "cF5vmdSONN61qbo9" };
const guideLink = (page, label) => `@UUID[${GUIDE}.JournalEntryPage.${GUIDE_PAGES[page]}]{${label}}`;
const STATUS = {
  active: { icon: "fa-circle-check", text: "Active", cls: "pu-success" },
  inactive: { icon: "fa-circle-exclamation", text: "Installed, not enabled", cls: "pu-warning" },
  missing: { icon: "fa-circle-xmark", text: "Not installed", cls: "pu-failure" }
};

/** Each recommended module with its status in this world. */
export function recommendedModules() {
  return CONFIG.PALLADIUM.RECOMMENDED_MODULES.map(m => {
    // Any of the ids counts (JB2A: the free module or the Patreon one); the active one wins.
    const found = [m.id, ...(m.alternatives ?? [])].map(id => game.modules.get(id)).filter(Boolean);
    const status = !found.length ? "missing" : found.some(mod => mod.active) ? "active" : "inactive";
    return { ...m, status, url: m.url ?? `https://foundryvtt.com/packages/${m.id}` };
  });
}

/** Post the recommended modules card, whispered to the GMs. */
export function showRecommendedModules() {
  const mods = recommendedModules();
  const rows = mods.map(m => {
    const s = STATUS[m.status];
    const manifest = (m.manifest && (m.status === "missing")) ? `<small class="hint">Manifest URL: <code>${m.manifest}</code></small>` : "";
    return `<li><span><a href="${m.url}" target="_blank" rel="noopener">${m.label}</a><small class="hint">${m.reason}</small>${manifest}</span>
      <strong class="${s.cls}"><i class="fa-solid ${s.icon}"></i> ${s.text}</strong></li>`;
  }).join("");
  const allSet = mods.every(m => m.status === "active");
  const body = `<p class="pu-text">${allSet ? "All the modules this system works with are active. Enjoy the game!"
    : "Palladium Universal works best with these free modules. Install them from <strong>Add-on Modules → Install Module</strong> (search the name, or paste the Manifest URL shown), then turn them on in <strong>Game Settings → Manage Modules</strong>."}</p>
    <ul class="pu-lines pu-modules">${rows}</ul>
    <p class="pu-text">Everything else is in the ${guideLink("start", "Palladium Universal Guide")} (Compendium tab). Each player gets a short welcome of their own.</p>
    <p class="pu-text hint">Show this card again with <code>game.palladium.showRecommendedModules()</code>.</p>`;
  const gms = game.users.filter(u => u.isGM).map(u => u.id);
  return postCard({ img: "systems/palladium-universal/assets/tokens/mutant-turtle.svg", name: "Palladium Universal" }, {
    title: "Welcome to Palladium Universal", body, whisper: gms, speaker: { alias: "Palladium Universal" },
    flags: { "palladium-universal": { card: "welcome" } }
  });
}

/** The players' welcome card, whispered to one player (default: this user). */
export function showPlayerWelcome(user = game.user) {
  const body = `<p class="pu-text"><strong>Start here:</strong> ${guideLink("start", "Getting Started")} and ${guideLink("creation", "Character Creation")} in the <em>Palladium Universal Guide</em> (Compendium tab).</p>
    <p class="pu-text"><strong>Your character:</strong> open it from the Actors tab. The <strong>Creation Checklist</strong> on its Core tab takes you through each step in book order.</p>
    <p class="pu-text"><strong>In play:</strong> click a roll on your sheet, or select your token and use the Token Action HUD if your GM has it on. Rules for fights: ${guideLink("combat", "Combat")}.</p>
    <p class="pu-text hint">Show this again with <code>game.palladium.showPlayerWelcome()</code>.</p>`;
  return postCard({ img: "systems/palladium-universal/assets/tokens/mutant-turtle.svg", name: "Palladium Universal" }, {
    title: "Welcome, player!", body, whisper: [user.id], speaker: { alias: "Palladium Universal" },
    flags: { "palladium-universal": { card: "playerWelcome" } }
  });
}

/** On "ready": the active GM posts the modules card (first run, or the list changed); a player gets their welcome once. */
export async function welcomeOnce() {
  if ( !game.user.isGM ) return playerWelcomeOnce();
  const activeGM = game.users.activeGM;
  if ( activeGM && (activeGM.id !== game.user.id) ) return;
  const seen = game.settings.get("palladium-universal", VERSION_SETTING) || (game.settings.get("palladium-universal", SETTING) ? 1 : 0);
  if ( seen >= WELCOME_VERSION ) return;
  await game.settings.set("palladium-universal", SETTING, true);
  await game.settings.set("palladium-universal", VERSION_SETTING, WELCOME_VERSION);
  return showRecommendedModules();
}

/**
 * Show the welcome cards again on the next load: the GM's modules card and every player's welcome.
 * Run by the "Show the Welcome Cards Again" setting (which then unticks itself), or from a macro. GM only.
 */
export async function resetWelcome() {
  if ( !game.user.isGM ) return;
  await game.settings.set("palladium-universal", SETTING, false);
  await game.settings.set("palladium-universal", VERSION_SETTING, 0);
  await Promise.all(game.users.filter(u => !u.isGM && u.getFlag?.("palladium-universal", "welcomed"))
    .map(u => u.unsetFlag("palladium-universal", "welcomed")));
  if ( game.settings.get("palladium-universal", "resetWelcome") ) await game.settings.set("palladium-universal", "resetWelcome", false);
  ui.notifications?.info("Welcome cards reset: everyone sees them again on their next load.");
}

/** A player's welcome, once per player (a flag on their User). */
async function playerWelcomeOnce() {
  const user = game.user;
  if ( user.getFlag?.("palladium-universal", "welcomed") ) return;
  try { await user.setFlag("palladium-universal", "welcomed", true); }
  catch(err) { return; } // Can't remember it: better no card than one every login.
  return showPlayerWelcome(user);
}
