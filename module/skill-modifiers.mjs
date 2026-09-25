/**
 * In-play skill roll modifiers (v1.22.0), p.54: task difficulty (+20% to −20%), tools / materials (+20% to
 * −20%) and physical / mental trauma (0 to −20%). Before a skill roll a small window asks whoever the world
 * setting names (the GM by default, or the player rolling) whether there are additional modifiers: Yes reveals
 * a type, then its value, and optionally a second one. When the GM sets them for a player's roll, the player then
 * gets the final window and presses Roll. Cancel anywhere: nothing is rolled. With no GM online the player
 * rolling is asked instead.
 */

const SCOPE = "palladium-universal";
const QUERY = `${SCOPE}.skillModifiers`;
const { DialogV2 } = foundry.applications.api;

const steps = (from, to) => { const out = []; for ( let v = from; v >= to; v -= 5 ) if ( v ) out.push(v); return out; };
/** The modifier types and their values. */
export const SKILL_MODIFIERS = {
  difficulty: { label: "Task difficulty", values: steps(20, -20) },
  tools: { label: "Tools / materials", values: steps(20, -20) },
  trauma: { label: "Physical / mental trauma", values: steps(-5, -20) }
};

const signed = n => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
const escape = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Who is asked: "gm" (default), "roller" or "off". */
export function modifierMode() {
  let mode;
  try { mode = game.settings.get(SCOPE, "skillModifiers"); } catch(err) { mode = "gm"; }
  return ["gm", "roller", "off"].includes(mode) ? mode : "gm";
}

/**
 * The modifier window's HTML.
 * @param {object} data   {actorName, label, target}
 */
function windowHTML({ actorName, label, target }) {
  const typeOptions = `<option value="">— Choose —</option>${Object.entries(SKILL_MODIFIERS).map(([k, m]) => `<option value="${k}">${m.label}</option>`).join("")}`;
  const row = n => `<div class="pu-sm-row" data-row="${n}"${n === 2 ? " hidden" : ""}>
      <select name="type${n}">${typeOptions}</select><select name="value${n}" hidden></select></div>`;
  return `<div class="pu-sm" data-target="${target}">
    <p class="pu-sm-head"><strong>${escape(actorName)}: ${escape(label)}</strong><span class="pu-sm-chance">${target}%</span></p>
    <div class="pu-sm-ask"><span>Any additional modifiers?</span>
      <label><input type="radio" name="any" value="no" checked> No</label><label><input type="radio" name="any" value="yes"> Yes</label></div>
    <div class="pu-sm-mods" hidden>${row(1)}${row(2)}<a class="pu-sm-add">+ Add a second modifier</a></div>
  </div>`;
}

/** Wire the window: reveal the dropdowns, the second row, and keep the new chance up to date. */
function wire(root) {
  const box = root?.querySelector(".pu-sm");
  if ( !box ) return;
  const target = Number(box.dataset.target);
  const $ = s => box.querySelector(s);
  const refresh = () => {
    const mods = readForm(box);
    const total = mods.reduce((n, m) => n + m.value, 0);
    $(".pu-sm-chance").textContent = total ? `${target}% → ${target + total}%` : `${target}%`;
    // The second row can't repeat the first row's type.
    const first = $("[name=type1]").value;
    for ( const o of $("[name=type2]").options ) o.disabled = !!o.value && (o.value === first);
  };
  for ( const radio of box.querySelectorAll("[name=any]") ) {
    radio.addEventListener("change", () => { $(".pu-sm-mods").hidden = radio.value !== "yes" || !radio.checked; refresh(); });
  }
  for ( const n of [1, 2] ) {
    const type = $(`[name=type${n}]`), value = $(`[name=value${n}]`);
    type.addEventListener("change", () => {
      const m = SKILL_MODIFIERS[type.value];
      value.hidden = !m;
      value.innerHTML = m ? m.values.map(v => `<option value="${v}">${signed(v)}%</option>`).join("") : "";
      refresh();
    });
    value.addEventListener("change", refresh);
  }
  $(".pu-sm-add").addEventListener("click", () => { $("[data-row='2']").hidden = false; $(".pu-sm-add").hidden = true; refresh(); });
}

/** The chosen modifiers: [{type, label, value}], at most two, one of each type. */
export function readForm(box) {
  if ( box.querySelector("[name=any]:checked")?.value !== "yes" ) return [];
  const out = [];
  for ( const n of [1, 2] ) {
    const row = box.querySelector(`[data-row='${n}']`);
    const type = box.querySelector(`[name=type${n}]`)?.value;
    const value = Number(box.querySelector(`[name=value${n}]`)?.value);
    if ( row?.hidden || !SKILL_MODIFIERS[type] || !value || out.some(m => m.type === type) ) continue;
    out.push({ type, label: SKILL_MODIFIERS[type].label, value });
  }
  return out;
}

/**
 * Open the modifier window.
 * @param {object} data            {actorName, label, target}
 * @param {object} [options]
 * @param {boolean} [options.send]  The GM answering for a player: "Send to player" instead of "Roll"
 * @returns {Promise<object[]|null>}  The modifiers, or null if cancelled
 */
export async function modifierWindow(data, { send = false } = {}) {
  const result = await DialogV2.wait({
    window: { title: send ? `Skill roll: ${data.actorName}` : "Skill roll" }, classes: ["palladium-universal", "pu-skill-mods"],
    content: windowHTML(data),
    render: (event, dialog) => wire(dialog.element ?? event?.target?.element),
    buttons: [
      { action: "roll", label: send ? "Send to player" : "Roll", icon: send ? "fa-solid fa-paper-plane" : "fa-solid fa-dice-d20", default: true,
        callback: (event, button) => readForm(button.form.querySelector(".pu-sm")) },
      { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark", callback: () => null }
    ],
    rejectClose: false
  });
  return Array.isArray(result) ? result : null;
}

/** The player's final window after the GM set the modifiers: press Roll (or Cancel). */
async function confirmWindow(data, mods) {
  const total = mods.reduce((n, m) => n + m.value, 0);
  const list = mods.length ? mods.map(m => `<li>${escape(m.label)} <strong>${signed(m.value)}%</strong></li>`).join("") : "<li>No additional modifiers</li>";
  const go = await DialogV2.wait({
    window: { title: "Skill roll" }, classes: ["palladium-universal", "pu-skill-mods"],
    content: `<div class="pu-sm"><p class="pu-sm-head"><strong>${escape(data.actorName)}: ${escape(data.label)}</strong>
      <span class="pu-sm-chance">${total ? `${data.target}% → ${data.target + total}%` : `${data.target}%`}</span></p>
      <p class="hint">The GM set:</p><ul class="pu-sm-list">${list}</ul></div>`,
    buttons: [{ action: "roll", label: "Roll", icon: "fa-solid fa-dice-d20", default: true },
      { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark" }],
    rejectClose: false
  });
  return go === "roll";
}

/**
 * Ask for the modifiers of a skill roll, per the setting.
 * @param {object} data   {actorName, label, target}
 * @returns {Promise<{mods: object[], by: string}|null>}  null = cancelled
 */
export async function askSkillModifiers(data) {
  const mode = modifierMode();
  if ( mode === "off" ) return { mods: [], by: "" };
  const gm = game.users?.activeGM;
  if ( (mode === "gm") && !game.user.isGM && gm && (typeof gm.query === "function") ) {
    ui.notifications.info(`Waiting for the GM to set the modifiers for ${data.label}…`);
    let answer;
    try { answer = await gm.query(QUERY, data, { timeout: 180000 }); } catch(err) { answer = undefined; }
    if ( answer === null ) { ui.notifications.info("The GM cancelled the roll."); return null; }
    if ( Array.isArray(answer) ) return (await confirmWindow(data, answer)) ? { mods: answer, by: "GM" } : null;
    // No answer from the GM: the player decides.
  }
  const mods = await modifierWindow(data);
  return mods ? { mods, by: "" } : null;
}

/** Register the setting and the GM's query handler (in "init"). */
export function initSkillModifiers() {
  game.settings.register(SCOPE, "skillModifiers", {
    name: "Skill Roll Modifiers",
    hint: "Before a skill roll in play, who is asked for extra modifiers (task difficulty, tools / materials, physical or mental trauma, p.54). The GM: the window opens on the GM's screen and the player then presses Roll. With no GM online, the player rolling is asked.",
    scope: "world", config: true, type: String, default: "gm",
    choices: { gm: "The GM", roller: "The player rolling", off: "Off (no question)" }
  });
  if ( CONFIG.queries ) CONFIG.queries[QUERY] = data => modifierWindow(data, { send: true });
}
