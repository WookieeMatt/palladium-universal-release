
const { DialogV2 } = foundry.applications.api;

/** Format a signed bonus, e.g. +3 / −2. */
export const signed = n => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/**
 * Build the header of a chat card: a green strip with the portrait and title. A subtitle made of
 * several " · "-separated parts (a bonus breakdown) is listed line by line under the header.
 * @param {Actor} actor
 * @param {string} title
 * @param {string} [subtitle]
 */
export function cardHeader(actor, title, subtitle = "", linked = false) {
  const parts = subtitle ? subtitle.split(" · ") : [];
  const lines = parts.length > 1
    ? `<ul class="pu-bonuses">${parts.map(p => `<li>${p}</li>`).join("")}</ul>` : "";
  return `<header class="pu-card-header">
    <img src="${actor.img}" alt="" width="36" height="36">
    <div><h3>${linked ? `<a class="pu-item-link" data-tooltip="View the item"><i class="fa-solid fa-book-open"></i> ${title}</a>` : title}</h3>${parts.length === 1 ? `<span>${subtitle}</span>` : ""}</div>
  </header>${lines}`;
}

/**
 * A roll result that expands to its details on click: "I.Q. = 21", then the calculation lines.
 * @param {string} label                 What was rolled
 * @param {string|number} result         The result
 * @param {Array<[string, string|number]>} lines   Detail rows (label, value)
 * @param {string} [caption]             A small heading above the rows
 */
export function resultDetails(label, result, lines, caption = "") {
  const rows = lines.map(([name, value]) => `<li><span>${name}</span><strong>${value}</strong></li>`).join("");
  return `<details class="pu-details">
    <summary><span class="pu-roll-label">${label}</span><span class="pu-roll-eq">=</span>
      <strong class="pu-roll-result">${result}</strong><i class="fa-solid fa-chevron-down pu-roll-toggle"></i></summary>
    ${caption ? `<p class="pu-details-caption">${caption}</p>` : ""}<ul class="pu-lines">${rows}</ul>
  </details>`;
}

/**
 * Turn written dice in some HTML into clickable inline rolls (Foundry's enricher makes the links).
 * @param {string} html
 * @returns {Promise<string>}
 */
export async function enrichDice(html) {
  if ( !html ) return html;
  const { inlineDice } = await import("./data/items.mjs");
  const marked = inlineDice(html);
  if ( marked === html ) return html;
  const TextEditor = foundry.applications?.ux?.TextEditor?.implementation;
  return TextEditor ? TextEditor.enrichHTML(marked) : marked;
}

/**
 * A copy of an item for a chat card's read-only view, encoded so that animation modules which scan
 * chat data for item links (Automated Animations) don't mistake the card for an item use.
 * @param {Item} item
 * @returns {string}
 */
export function encodeItem(item) {
  const data = item.toObject();
  delete data._stats;
  delete data.flags;
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let binary = "";
  for ( let i = 0; i < bytes.length; i += 0x8000 ) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/**
 * Decode a card's item copy (see encodeItem).
 * @param {string} snapshot
 * @returns {object|null}
 */
export function decodeItem(snapshot) {
  try {
    const bytes = Uint8Array.from(atob(snapshot), c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch(err) { return null; }
}

/** Bonus parts as detail rows, skipping zeros: [["Training", "+3"], ...]. */
export function bonusLines(parts = {}) {
  const labels = { training: "Training", attribute: "Attribute", skills: "Skills", mod: "Misc", treatment: "Treatment",
    circ: "Circumstance", conditions: "Conditions" };
  if ( parts.stunned ) return [["Stunned", "no combat bonuses"]];
  return Object.entries(parts).filter(([, v]) => v).map(([k, v]) => [labels[k] ?? k, signed(v)]);
}

/**
 * Post a system chat card: the green header, then "Label = Result" (click to expand the details),
 * then notes, any extra body and buttons. Rolls are attached (Dice So Nice shows them) and the
 * user's roll mode applies.
 * @param {Actor} actor
 * @param {object} card
 * @param {string} card.title                  Header title
 * @param {string} [card.label]                Short name of the roll ("Strike")
 * @param {string|number} [card.result]        The result
 * @param {Array} [card.lines]                 Detail rows [label, value]
 * @param {string} [card.caption]              Small heading above the detail rows
 * @param {string[]} [card.notes]              Always-visible notes (success, critical...)
 * @param {string} [card.body]                 Extra HTML (lists, text)
 * @param {string} [card.buttons]              Button HTML
 * @param {Roll[]} [card.rolls]
 * @param {object} [card.flags]                Message flags
 * @param {object} [card.speaker]
 * @param {Item} [card.item]                   The item the card is about: its title opens a read-only view
 * @param {string[]} [card.whisper]           User ids to whisper to (skips the roll mode)
 * @param {boolean} [card.inlineRolls]         Make dice written in the notes and body clickable (table results
 *                                             that call for another roll, e.g. "2D6 melee rounds")
 */
export async function postCard(actor, { title, label, result, lines = [], caption = "", notes = [], body = "",
  buttons = "", rolls = [], flags, speaker, item, inlineRolls = false, whisper } = {}) {
  if ( inlineRolls ) {
    notes = await Promise.all(notes.map(enrichDice));
    body = await enrichDice(body);
  }
  if ( item ) {
    flags = foundry.utils.mergeObject(flags ?? {}, { "palladium-universal": { itemSnapshot: encodeItem(item) } }, { inplace: false });
  }
  const content = `<div class="pu-card">${cardHeader(actor, title, "", !!item)}
    ${label !== undefined ? resultDetails(label, result, lines, caption) : ""}
    ${notes.length ? `<p class="pu-notes">${notes.join(" ")}</p>` : ""}${body}${buttons}</div>`;
  const data = { speaker: speaker ?? ChatMessage.getSpeaker({ actor }), content, rolls };
  if ( flags ) data.flags = flags;
  if ( whisper ) data.whisper = whisper;
  else try { ChatMessage.applyRollMode?.(data, game.settings.get("core", "rollMode")); } catch(err) { /* default mode */ }
  return ChatMessage.create(data);
}

/* -------------------------------------------- */

/**
 * Roll a d20 check (Strike, Parry, Dodge, Initiative, saves...) and post it to chat.
 * @param {Actor} actor
 * @param {object} options
 * @param {string} options.label          Card title
 * @param {number} options.bonus          Total bonus added to the d20
 * @param {object} [options.breakdown]    Bonus components for display
 * @param {number} [options.target]       Target number (meet or beat)
 * @param {number} [options.critRange]    Natural roll at or above which the result is a critical
 */
export async function rollD20(actor, { label, bonus = 0, breakdown, target, critRange, above = false, note = "" }) {
  const roll = await new Roll(`1d20 + ${bonus}`).evaluate();
  const natural = roll.dice[0].total;
  const notes = [];
  if ( critRange && (natural >= critRange) ) notes.push(`<strong class="pu-crit">Natural ${natural}: Critical!</strong>`);
  else if ( natural === 20 ) notes.push(`<strong class="pu-crit">Natural 20!</strong>`);
  if ( natural === 1 ) notes.push(`<strong class="pu-fumble">Natural 1</strong>`);
  let success = null;
  if ( target !== undefined ) {
    success = above ? roll.total > target : roll.total >= target;
    const needs = above ? `needs over ${target}` : `needs ${target}+`;
    notes.push(`<span class="${success ? "pu-success" : "pu-failure"}">${success ? "Success" : "Failure"} (${needs})</span>`);
  }
  if ( note ) notes.push(note);
  const lines = [["d20", natural], ...bonusLines(breakdown ?? { Bonus: bonus }), ["Total", roll.total]];
  await postCard(actor, { title: label, label, result: roll.total, lines, notes, rolls: [roll] });
  return { roll, natural, success };
}

/* -------------------------------------------- */

/**
 * Roll a saving throw: d20 + save bonus, meet or beat the target (p.90). Save vs Poison / Toxin asks which
 * threat it is (lethal poison 14+, harmful drugs 15+, non-lethal poison 16+); vs Psionics is 15+, or 10+
 * for a character with psionic powers.
 * @param {Actor} actor
 * @param {string} key               A CONFIG.PALLADIUM.SAVES key
 * @param {object} [options]
 * @param {string} [options.threat]  A CONFIG.PALLADIUM.TOXIN_SAVES key (skips the question)
 */
export async function rollSave(actor, key, { threat } = {}) {
  const save = actor.system.saves?.totals?.[key];
  if ( !save ) return null;
  let { label, target } = save;
  let note = "";
  if ( key === "toxin" ) {
    const threats = CONFIG.PALLADIUM.TOXIN_SAVES;
    if ( !(threat in threats) ) {
      const options = Object.entries(threats).map(([k, t]) => `<option value="${k}">${t.label} (${t.target}+)</option>`).join("");
      threat = await DialogV2.prompt({
        window: { title: `${actor.name}: Save vs Poison / Toxin` },
        content: `<div class="form-group"><label>Threat</label><div class="form-fields"><select name="threat" autofocus>${options}</select></div></div>
          <p class="hint">Drug saves can vary with potency: the GM can adjust the target with a circumstance.</p>`,
        ok: { label: "Roll", icon: "fa-solid fa-dice-d20", callback: (event, button) => button.form.elements.threat.value },
        rejectClose: false
      });
      if ( !threat ) return null;
    }
    label = `vs ${threats[threat].label}`;
    target = threats[threat].target;
  }
  else if ( key === "psionics" ) {
    note = `<span class="hint">${actor.system.saves.isPsychic ? "Has psionic powers: 10+" : "No psionic powers: 15+"}</span>`;
  }
  const mod = actor.system.saves.mod?.[key] ?? 0;
  return rollD20(actor, { label: `Save ${label}`, bonus: save.bonus, target, note,
    breakdown: { "Save bonus": save.bonus - mod, mod } });
}

/* -------------------------------------------- */

/**
 * Roll a percentile check and post it to chat. Skill checks cap at 95%; 96–100 always fail (p.54).
 * @param {Actor} actor
 * @param {object} options
 * @param {string} options.label
 * @param {number} options.target        Percentage chance
 * @param {boolean} [options.skill=true] Apply the 95% skill cap
 * @param {object} [options.breakdown]   How the percentage is made up (skill breakdown), shown in the details
 */
export async function rollPercent(actor, { label, target, skill = true, item, breakdown } = {}) {
  const chance = skill ? Math.min(target, 95) : target;
  const roll = await new Roll("1d100").evaluate();
  const success = (roll.total <= chance) && !(skill && (roll.total >= 96));
  const lines = [];
  if ( breakdown ) {
    const names = { base: "Base", level: "Per level", iq: "I.Q. bonus", education: "Education bonus", team: "Team Characters", misc: "Misc" };
    for ( const [k, v] of Object.entries(breakdown) ) if ( v || (k === "base") ) lines.push([names[k] ?? k, k === "base" ? `${v}%` : `${signed(v)}%`]);
    const sum = Object.values(breakdown).reduce((a, b) => a + b, 0);
    if ( sum !== target ) lines.push(["Adjusted", `${signed(target - sum)}%`]);
    lines.push(["Skill %", `${target}%`]);
  }
  if ( skill && (target > 95) ) lines.push(["Skill cap", "95%"]);
  if ( !breakdown || (chance !== target) ) lines.push(["Chance", `${chance}%`]);
  lines.push(["d100", roll.total]);
  return postCard(actor, { title: label, item, label, result: roll.total, lines, rolls: [roll],
    notes: [`<span class="${success ? "pu-success" : "pu-failure"}">${success ? "Success" : "Failure"} (${chance}% or under)</span>`] });
}

/* -------------------------------------------- */

/**
 * Roll a skill check for an owned skill item.
 * @param {Actor} actor
 * @param {Item} skill
 * @param {boolean} [secondary=false]   Roll the skill's second percentage (e.g. Medical Doctor "Treat")
 */
export async function rollSkill(actor, skill, secondary = false) {
  const pct = actor.system.skillPercentages(skill);
  const target = secondary ? pct.secondary : pct.primary;
  const label = secondary && skill.system.label2 ? `${skill.name}: ${skill.system.label2}` : skill.name;
  const hookData = { label, target, secondary };
  if ( Hooks.call("palladium.preRollSkill", actor, skill, hookData) === false ) return null;
  const breakdown = { ...pct.breakdown, base: secondary ? skill.system.base2 : pct.breakdown.base };
  const result = await rollPercent(actor, { label: hookData.label, target: hookData.target, skill: true, item: skill, breakdown });
  Hooks.callAll("palladium.rollSkill", actor, skill, { ...hookData, result });
  return result;
}

/* -------------------------------------------- */

/**
 * Automated Save vs Coma (p.93, with house ruling): three d20 rolls at 16+, adding the converted
 * PE bonus and a treatment bonus. Two successes out of three restore the character to 1 HP.
 * @param {Actor} actor
 */
export async function rollSaveVsComa(actor) {
  const options = Object.entries(CONFIG.PALLADIUM.COMA_TREATMENT)
    .map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  const treatment = await DialogV2.prompt({
    window: { title: `${actor.name}: Save vs Coma` },
    content: `<div class="form-group"><label>Treatment</label>
      <div class="form-fields"><select name="treatment">${options}</select></div></div>`,
    ok: { label: "Roll", callback: (event, button) => Number(button.form.elements.treatment.value) },
    rejectClose: false
  });
  if ( treatment === null || treatment === undefined ) return null;

  const save = actor.system.saves.totals.coma;
  const bonus = save.bonus + treatment;
  const rolls = [];
  for ( let i = 0; i < 3; i++ ) rolls.push(await new Roll(`1d20 + ${bonus}`).evaluate());
  const successes = rolls.filter(r => r.total >= save.target).length;
  const recovered = successes >= 2;

  const lines = [
    ...bonusLines({ attribute: save.bonus - actor.system.saves.mod.coma, mod: actor.system.saves.mod.coma, treatment }),
    ...rolls.map((r, i) => [`Try ${i + 1}: d20 ${r.dice[0].total} ${signed(bonus)}`,
      `${r.total} ${r.total >= save.target ? "✔" : "✘"}`])
  ];

  if ( recovered && (actor.system.health.hp.value < 1) ) await actor.update({ "system.health.hp.value": 1 });
  return postCard(actor, { title: "Save vs Coma", label: "Successes", result: `${successes} of 3`, lines, rolls,
    caption: `Three tries at ${save.target}+`,
    notes: [`<span class="${recovered ? "pu-success" : "pu-failure"}">${recovered ? "Recovers: stabilised at 1 HP." : "Still in a coma."}</span>`] });
}
