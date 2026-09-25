import { postCard } from "./dice.mjs";

/**
 * The GM's welcome card: the modules the system works with (CONFIG.PALLADIUM.RECOMMENDED_MODULES) and whether
 * each is active, installed but off, or missing. Posted once per world, whispered to the GMs.
 */

const SETTING = "welcomeShown";
const STATUS = {
  active: { icon: "fa-circle-check", text: "Active", cls: "pu-success" },
  inactive: { icon: "fa-circle-exclamation", text: "Installed, not enabled", cls: "pu-warning" },
  missing: { icon: "fa-circle-xmark", text: "Not installed", cls: "pu-failure" }
};

/** Each recommended module with its status in this world. */
export function recommendedModules() {
  return CONFIG.PALLADIUM.RECOMMENDED_MODULES.map(m => {
    const mod = game.modules.get(m.id);
    const status = !mod ? "missing" : mod.active ? "active" : "inactive";
    return { ...m, status, url: `https://foundryvtt.com/packages/${m.id}` };
  });
}

/** Post the recommended modules card, whispered to the GMs. */
export function showRecommendedModules() {
  const mods = recommendedModules();
  const rows = mods.map(m => {
    const s = STATUS[m.status];
    return `<li><span><a href="${m.url}" target="_blank" rel="noopener">${m.label}</a><small class="hint">${m.reason}</small></span>
      <strong class="${s.cls}"><i class="fa-solid ${s.icon}"></i> ${s.text}</strong></li>`;
  }).join("");
  const allSet = mods.every(m => m.status === "active");
  const body = `<p class="pu-text">${allSet ? "All the modules this system works with are active. Enjoy the game!"
    : "Palladium Universal works best with these free modules. Install them from <strong>Add-on Modules → Install Module</strong> on Foundry's setup screen (search the name), then turn them on in <strong>Game Settings → Manage Modules</strong>."}</p>
    <ul class="pu-lines pu-modules">${rows}</ul>
    <p class="pu-text hint">This card is shown to the GM once. Show it again with <code>game.palladium.showRecommendedModules()</code>.</p>`;
  const gms = game.users.filter(u => u.isGM).map(u => u.id);
  return postCard({ img: "systems/palladium-universal/assets/tokens/mutant-turtle.svg", name: "Palladium Universal" }, {
    title: "Welcome to Palladium Universal", body, whisper: gms, speaker: { alias: "Palladium Universal" },
    flags: { "palladium-universal": { card: "welcome" } }
  });
}

/** On "ready": the first time the system runs in a world, the active GM posts the card. */
export async function welcomeOnce() {
  if ( !game.user.isGM ) return;
  const activeGM = game.users.activeGM;
  if ( activeGM && (activeGM.id !== game.user.id) ) return;
  if ( game.settings.get("palladium-universal", SETTING) ) return;
  await game.settings.set("palladium-universal", SETTING, true);
  return showRecommendedModules();
}
