import { postCard } from "./dice.mjs";
import { activeParty } from "./party.mjs";

const { ApplicationV2, DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Session Tools (v1.19.0), GM only: award experience (the book's award table, p.75) with level-up detection,
 * and keep a record of the session (goals, what happened, hooks, NPCs, scenes, journals, secrets, ideas,
 * experience) that prints to the GM-only "Session Log" journal as one page per session.
 *
 * The record in progress lives in the Session Log journal's flags, so secrets never reach players.
 */

const SCOPE = "palladium-universal";
const LOG_NAME = "Session Log";

/** The rich-text sections of a session, in the order they print. */
export const SESSION_SECTIONS = [
  { key: "goals", label: "Goals for This Session", icon: "fa-bullseye", hint: "What this session should accomplish: scenes to reach, questions to answer." },
  { key: "summary", label: "What Happened", icon: "fa-book-open", hint: "The session's events, in order." },
  { key: "hooks", label: "Hooks Planted", icon: "fa-fish-fins", hint: "Leads, rumors and loose threads you've seeded for later." },
  { key: "secrets", label: "Secrets & Reveals", icon: "fa-user-secret", hint: "What the players don't know yet, and what they found out this session." },
  { key: "ideas", label: "Ideas for Next Time", icon: "fa-lightbulb", hint: "Follow-ups, twists, villains to bring back." }
];

/** The linked-document sections: what can be dropped on each. */
export const SESSION_LINKS = [
  { key: "npcs", label: "NPCs Featured", icon: "fa-user-ninja", types: ["Actor"], hint: "Drop NPCs (and allies) from the Actors sidebar" },
  { key: "scenes", label: "Scenes Played", icon: "fa-map", types: ["Scene"], hint: "Drop scenes from the Scenes sidebar" },
  { key: "journals", label: "Journals Referenced", icon: "fa-book", types: ["JournalEntry", "JournalEntryPage"], hint: "Drop journal entries or pages" }
];

/** A blank session record. */
export function blankSession(number = 1) {
  return { number, title: "", date: new Date().toISOString().slice(0, 10),
    goals: "", summary: "", hooks: "", secrets: "", ideas: "",
    npcs: [], scenes: [], journals: [], xp: [] };
}

const escape = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  The Session Log journal (GM only)           */
/* -------------------------------------------- */

/** The GM-only Session Log journal (created when first needed). */
export async function sessionLog({ create = true } = {}) {
  let journal = game.journal.find(j => j.getFlag(SCOPE, "sessionLog"));
  if ( !journal && create ) {
    journal = await JournalEntry.create({ name: LOG_NAME, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
      flags: { [SCOPE]: { sessionLog: true, draft: blankSession(1) } } });
  }
  return journal ?? null;
}

/** The session in progress. */
export async function currentSession() {
  const log = await sessionLog();
  return foundry.utils.mergeObject(blankSession(), log.getFlag(SCOPE, "draft") ?? {}, { inplace: false });
}

/** Save changes to the session in progress. */
export async function saveSession(changes) {
  const log = await sessionLog();
  const draft = foundry.utils.mergeObject(await currentSession(), changes, { inplace: false });
  await log.setFlag(SCOPE, "draft", draft);
  return draft;
}

/* -------------------------------------------- */
/*  Experience                                  */
/* -------------------------------------------- */

/**
 * Award experience points (GM). A character whose XP reaches a new level goes up to it (the book's
 * Experience Levels table); the card points them to Roll HP for Level N. The award is logged in the session.
 * @param {Actor[]} actors
 * @param {number} amount
 * @param {string} [reason]
 * @returns {Promise<object[]>}  One result per actor
 */
export async function awardXP(actors, amount, reason = "") {
  if ( !game.user.isGM ) { ui.notifications.warn("Only the GM can award experience."); return []; }
  amount = Math.trunc(Number(amount) || 0);
  actors = actors.filter(a => a?.system?.identity);
  if ( !amount || !actors.length ) return [];
  const results = [];
  for ( const actor of actors ) {
    const before = actor.system.identity.xp ?? 0;
    const after = Math.max(0, before + amount);
    const levelFrom = actor.system.identity.level ?? 1;
    const levelTo = Math.max(levelFrom, CONFIG.PALLADIUM.levelForXP(after));
    const update = { "system.identity.xp": after };
    if ( levelTo > levelFrom ) update["system.identity.level"] = levelTo;
    await actor.update(update);
    results.push({ uuid: actor.uuid, name: actor.name, before, after, levelFrom, levelTo });
  }
  const ups = results.filter(r => r.levelTo > r.levelFrom);
  const notes = ups.map(r => `<span class="pu-success"><strong>${escape(r.name)} reaches level ${r.levelTo}!</strong> Roll their new Hit Points on the sheet (Health &amp; Damage); skills and combat bonuses go up by themselves.</span>`);
  await postCard({ img: "systems/palladium-universal/assets/tokens/mutant-turtle.svg" }, {
    title: "Experience Awarded", label: reason ? escape(reason) : "Experience", result: `${amount > 0 ? "+" : ""}${amount} XP`,
    lines: results.map(r => [r.name, `${r.before} → ${r.after}`]), notes, speaker: { alias: "Game Master" },
    flags: { [SCOPE]: { card: "xpAward", amount } }
  });
  const session = await currentSession();
  await saveSession({ xp: [...session.xp, { time: Date.now(), reason, amount, results }] });
  Hooks.callAll("palladium.awardXP", results, { amount, reason });
  return results;
}

/** The Award XP dialog: party members (PCs ticked), the book's awards, an amount and a reason. */
export async function awardXPDialog(party = activeParty()) {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM can award experience.");
  const { pcs = [], npcs = [] } = party?.system.actors ?? {};
  const members = [...pcs.map(a => ({ a, checked: true })), ...npcs.map(a => ({ a, checked: false }))];
  if ( !members.length ) return ui.notifications.warn("The Active Party has no characters to award.");
  const groups = {};
  for ( const [i, aw] of CONFIG.PALLADIUM.XP_AWARDS.entries() ) (groups[aw.group] ??= []).push({ i, ...aw });
  const options = Object.entries(groups).map(([g, list]) => `<optgroup label="${escape(g)}">${list.map(aw =>
    `<option value="${aw.i}">${escape(aw.label)} (${aw.min === aw.max ? aw.min : `${aw.min}–${aw.max}`})</option>`).join("")}</optgroup>`).join("");
  const content = `<div class="pu-award-xp">
    <div class="form-group"><label>Award</label><div class="form-fields"><select name="award"><option value="">— Custom —</option>${options}</select></div></div>
    <div class="form-group"><label>XP each</label><div class="form-fields"><input type="number" name="amount" value="50" step="5" autofocus></div></div>
    <div class="form-group"><label>Reason</label><div class="form-fields"><input type="text" name="reason" placeholder="e.g. Talked the Mousers' boss down"></div></div>
    <fieldset><legend>Who gets it</legend>${members.map(({ a, checked }) =>
      `<label class="checkbox"><input type="checkbox" name="who" value="${a.uuid}"${checked ? " checked" : ""}> ${escape(a.name)} <span class="hint">(${a.system.identity?.xp ?? 0} XP, level ${a.system.identity?.level ?? 1})</span></label>`).join("")}</fieldset>
  </div>`;
  const data = await DialogV2.prompt({
    window: { title: "Award Experience", icon: "fa-solid fa-star" },
    content,
    render: (event, dialog) => {
      const root = dialog.element ?? event?.target?.element;
      const select = root?.querySelector('[name="award"]');
      select?.addEventListener("change", () => {
        const aw = CONFIG.PALLADIUM.XP_AWARDS[select.value];
        if ( !aw ) return;
        root.querySelector('[name="amount"]').value = Math.round((aw.min + aw.max) / 2 / 5) * 5;
        const reason = root.querySelector('[name="reason"]');
        if ( !reason.value ) reason.value = aw.label;
      });
    },
    ok: { label: "Award", icon: "fa-solid fa-star", callback: (event, button) => {
      const f = button.form.elements;
      return { amount: Number(f.amount.value), reason: f.reason.value.trim(),
        who: [...button.form.querySelectorAll('[name="who"]:checked')].map(c => c.value) };
    } },
    rejectClose: false
  });
  if ( !data?.who?.length ) return null;
  const actors = (await Promise.all(data.who.map(u => fromUuid(u)))).filter(a => a);
  return awardXP(actors, data.amount, data.reason);
}

/* -------------------------------------------- */
/*  Print to Journal                            */
/* -------------------------------------------- */

/** The session as journal HTML (links as @UUID so the journal makes them clickable). */
export function sessionHTML(s) {
  const when = s.date ? new Date(`${s.date}T12:00:00`).toLocaleDateString(undefined, { dateStyle: "long" }) : "";
  const parts = [when ? `<p><em>Played ${escape(when)}</em></p>` : ""];
  const section = (label, html) => { if ( html?.replace(/<[^>]+>/g, "").trim() ) parts.push(`<h2>${label}</h2>${html}`); };
  const links = (label, list) => { if ( list?.length ) parts.push(`<h2>${label}</h2><ul>${list.map(l => `<li>@UUID[${l.uuid}]{${escape(l.name)}}</li>`).join("")}</ul>`); };
  section("Goals for This Session", s.goals);
  section("What Happened", s.summary);
  section("Hooks Planted", s.hooks);
  links("NPCs Featured", s.npcs);
  links("Scenes Played", s.scenes);
  links("Journals Referenced", s.journals);
  section("Secrets &amp; Reveals", s.secrets);
  section("Ideas for Next Time", s.ideas);
  if ( s.xp?.length ) {
    const totals = {};
    for ( const award of s.xp ) for ( const r of award.results ) {
      const t = (totals[r.uuid] ??= { name: r.name, xp: 0, from: r.levelFrom, to: r.levelTo, after: r.after });
      t.xp += award.amount; t.to = Math.max(t.to, r.levelTo); t.after = r.after;
    }
    parts.push(`<h2>Experience Awarded</h2><table><thead><tr><th>Award</th><th>XP</th><th>Who</th></tr></thead><tbody>${
      s.xp.map(a => `<tr><td>${escape(a.reason || "Experience")}</td><td>${a.amount}</td><td>${a.results.map(r => escape(r.name)).join(", ")}</td></tr>`).join("")
    }</tbody></table><table><thead><tr><th>Character</th><th>Earned</th><th>Total XP</th><th>Level</th></tr></thead><tbody>${
      Object.values(totals).map(t => `<tr><td>${escape(t.name)}</td><td>${t.xp}</td><td>${t.after}</td><td>${t.to > t.from ? `<strong>${t.from} → ${t.to}</strong>` : t.to}</td></tr>`).join("")
    }</tbody></table>`);
  }
  return parts.join("\n");
}

/** Title of a session's journal page. */
export const sessionTitle = s => `Session ${s.number}${s.title ? `: ${s.title}` : ""}`;

/**
 * Print the session to the Session Log journal (one page per session; printing again updates the page) and,
 * if asked, start the next session.
 * @param {object} [options]
 * @param {boolean} [options.startNext]  Start a blank session numbered one higher
 */
export async function printSession({ startNext = false } = {}) {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM can print the session.");
  const log = await sessionLog();
  const s = await currentSession();
  const name = sessionTitle(s);
  const content = sessionHTML(s);
  const page = log.pages.find(p => p.getFlag(SCOPE, "session") === s.number);
  if ( page ) await page.update({ name, "text.content": content });
  else {
    await log.createEmbeddedDocuments("JournalEntryPage", [{ name, type: "text", sort: s.number * 1000,
      text: { content, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1 }, flags: { [SCOPE]: { session: s.number } } }]);
  }
  if ( startNext ) await log.setFlag(SCOPE, "draft", blankSession(s.number + 1));
  ui.notifications.info(`${name} printed to the ${LOG_NAME} journal.`);
  return log;
}

/* -------------------------------------------- */
/*  The window                                  */
/* -------------------------------------------- */

export class SessionTools extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(party, options = {}) {
    super(options);
    this.party = party;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "palladium-session-tools",
    tag: "form",
    classes: ["palladium-universal", "sheet", "pu-session-tools"],
    window: { title: "Session Tools", icon: "fa-solid fa-scroll", resizable: true },
    position: { width: 980, height: 820 },
    form: { handler: SessionTools.#onSubmit, submitOnChange: true, closeOnSubmit: false },
    actions: {
      awardXP: SessionTools.#onAwardXP,
      removeLink: SessionTools.#onRemoveLink,
      openLink: SessionTools.#onOpenLink,
      print: SessionTools.#onPrint,
      openLog: SessionTools.#onOpenLog
    }
  };

  /** @override */
  static PARTS = {
    body: { template: "systems/palladium-universal/templates/party/session-tools.hbs", scrollable: [".pu-session-body"] }
  };

  /** @override */
  async _prepareContext(options) {
    const s = await currentSession();
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const sections = await Promise.all(SESSION_SECTIONS.map(async sec => ({ ...sec, value: s[sec.key],
      enriched: await TextEditor.enrichHTML(s[sec.key] ?? "") })));
    const totals = {};
    for ( const award of s.xp ) for ( const r of award.results ) {
      const t = (totals[r.uuid] ??= { name: r.name, xp: 0, levelUp: false });
      t.xp += award.amount; t.levelUp ||= r.levelTo > r.levelFrom;
    }
    return {
      s, sections, party: this.party,
      links: SESSION_LINKS.map(l => ({ ...l, items: s[l.key] })),
      awards: s.xp.map(a => ({ ...a, who: a.results.map(r => r.name).join(", ") })).reverse(),
      totals: Object.values(totals)
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    // Drop zones for NPCs, scenes and journals.
    for ( const zone of this.element.querySelectorAll("[data-drop]") ) {
      zone.addEventListener("dragover", event => event.preventDefault());
      zone.addEventListener("drop", event => this.#onDropLink(event, zone.dataset.drop));
    }
  }

  async #onDropLink(event, key) {
    event.preventDefault();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const section = SESSION_LINKS.find(l => l.key === key);
    if ( !data?.uuid || !section?.types.includes(data.type) ) {
      return ui.notifications.warn(`Drop ${section?.hint.replace(/^Drop /, "") ?? "a document"} here.`);
    }
    const doc = await fromUuid(data.uuid);
    if ( !doc ) return;
    const s = await currentSession();
    if ( s[key].some(l => l.uuid === doc.uuid) ) return;
    await saveSession({ [key]: [...s[key], { uuid: doc.uuid, name: doc.name }] });
    this.render();
  }

  static async #onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    await saveSession({ number: Math.max(1, Number(data.number) || 1), title: data.title ?? "", date: data.date ?? "",
      ...Object.fromEntries(SESSION_SECTIONS.filter(sec => sec.key in data).map(sec => [sec.key, data[sec.key] ?? ""])) });
  }

  static async #onAwardXP() {
    await awardXPDialog(this.party ?? activeParty());
    this.render();
  }

  static async #onRemoveLink(event, target) {
    const { key, uuid } = target.closest("[data-uuid]").dataset;
    const s = await currentSession();
    await saveSession({ [key]: s[key].filter(l => l.uuid !== uuid) });
    this.render();
  }

  static async #onOpenLink(event, target) {
    const doc = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    if ( doc?.documentName === "Scene" ) return doc.view();
    return doc?.sheet?.render({ force: true });
  }

  static async #onPrint() {
    await this.submit?.();
    const startNext = await DialogV2.confirm({
      window: { title: "Print to Journal" },
      content: `<p>Print this session to the <strong>${LOG_NAME}</strong> journal (GM only). Printing again later updates the same page.</p>
        <p>Start the next session afterwards? (<strong>Yes</strong>: a blank session, numbered one higher. <strong>No</strong>: keep working on this one.)</p>`,
      yes: { label: "Print and start the next session" }, no: { label: "Just print" }, rejectClose: false
    });
    if ( startNext === null ) return;
    const log = await printSession({ startNext: !!startNext });
    this.render();
    return log;
  }

  static async #onOpenLog() {
    const log = await sessionLog({ create: false });
    if ( !log ) return ui.notifications.info("Nothing printed yet.");
    return log.sheet.render({ force: true });
  }
}

let tools = null;

/** Open the Session Tools (GM only). */
export function openSessionTools(party = activeParty()) {
  if ( !game.user.isGM ) return ui.notifications.warn("The Session Tools are for the GM.");
  if ( tools?.rendered ) return tools.bringToFront?.() ?? tools;
  tools = new SessionTools(party);
  return tools.render({ force: true });
}
