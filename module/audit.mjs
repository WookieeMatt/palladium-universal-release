import { postCard } from "./dice.mjs";

/**
 * The audit trail (v1.18.0): items added to or removed from characters and NPCs, changes to the Money / other
 * possessions box, and actors created or deleted. World settings choose, for PCs and NPCs separately,
 * a whisper to the GM, the audit journal ("Audit: Player Characters" / "Audit: NPCs", one page per actor,
 * newest first, GM only), both, or nothing.
 *
 * The client that made a change records it (grouped per actor for a moment). Journals are GM-only, so a
 * player's entries wait in a queue on their User until the active GM writes them (also when the GM logs in
 * later). The GM's own changes go to the journal (that's how NPC work is remembered) but aren't whispered.
 */

const SCOPE = "palladium-universal";
const DELAY = 1500;

export const AUDIT_MODES = {
  both: "Whisper + Audit journal",
  whisper: "Whisper only",
  journal: "Audit journal only",
  off: "Off"
};

const KINDS = {
  character: { setting: "auditPC", key: "pc", journal: "Audit: Player Characters", label: "Character" },
  npc: { setting: "auditNPC", key: "npc", journal: "Audit: NPCs", label: "NPC" }
};

/** Register the two settings (in "init"). */
export function registerAuditSettings() {
  game.settings.register(SCOPE, "auditPC", {
    name: "Audit: Player Characters",
    hint: "Items added to or removed from characters, Money / possessions changes, characters created or deleted: whisper the GM (players' changes), write them to the GM-only \"Audit: Player Characters\" journal, both, or nothing.",
    scope: "world", config: true, type: String, choices: AUDIT_MODES, default: "both"
  });
  game.settings.register(SCOPE, "auditNPC", {
    name: "Audit: NPCs",
    hint: "The same for NPCs, in the \"Audit: NPCs\" journal: a record of how you built and changed each NPC over time.",
    scope: "world", config: true, type: String, choices: AUDIT_MODES, default: "journal"
  });
}

/** The audit mode for an actor type, or null if it isn't audited. */
function modeFor(type) {
  const kind = KINDS[type];
  if ( !kind ) return null;
  try { return game.settings.get(SCOPE, kind.setting) ?? "off"; } catch(err) { return "off"; }
}

const wantsWhisper = mode => (mode === "both") || (mode === "whisper");
const wantsJournal = mode => (mode === "both") || (mode === "journal");
const escape = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Recording (the client that made the change) */
/* -------------------------------------------- */

const pending = new Map();

/** Add a line for an actor; lines within a moment of each other become one entry. */
function record(actor, line) {
  const mode = modeFor(actor?.type);
  if ( !mode || (mode === "off") ) return;
  let p = pending.get(actor.uuid);
  if ( !p ) {
    p = { actor: { uuid: actor.uuid, id: actor.id, name: actor.name, img: actor.img, type: actor.type }, lines: [] };
    pending.set(actor.uuid, p);
  }
  p.actor.name = actor.name;
  p.lines.push(line);
  clearTimeout(p.timer);
  p.timer = setTimeout(() => flush(actor.uuid), DELAY);
}

/** Send every waiting entry now (tests, and before the page unloads). */
export async function flushAll() {
  for ( const uuid of [...pending.keys()] ) await flush(uuid);
}

async function flush(uuid) {
  const p = pending.get(uuid);
  pending.delete(uuid);
  if ( !p?.lines.length ) return;
  clearTimeout(p.timer);
  const mode = modeFor(p.actor.type);
  const entry = { id: foundry.utils.randomID(), time: Date.now(), user: game.user.name, gm: !!game.user.isGM,
    actor: p.actor, lines: p.lines };
  if ( wantsWhisper(mode) && !game.user.isGM ) await whisper(entry, wantsJournal(mode));
  if ( wantsJournal(mode) ) {
    if ( game.user.isGM ) await writeEntries([entry]);
    else await queueEntry(entry);
  }
  Hooks.callAll("palladium.audit", entry, mode);
}

/** The whispered card for the GMs, with a button to the actor's audit page. */
function whisper(entry, journal) {
  const gms = game.users.filter(u => u.isGM).map(u => u.id);
  if ( !gms.length ) return null;
  return postCard({ img: entry.actor.img }, {
    title: `${entry.actor.name}: Sheet Changes`,
    body: `<ul class="pu-results pu-audit-lines">${entry.lines.map(l => `<li>${l}</li>`).join("")}</ul>
      <p class="pu-text hint">By ${escape(entry.user)}</p>`,
    buttons: journal ? `<div class="pu-buttons"><button type="button" data-pu-action="open-audit">
      <i class="fa-solid fa-book"></i> Open Audit Journal</button></div>` : "",
    whisper: gms, speaker: { alias: entry.actor.name },
    flags: { [SCOPE]: { card: "audit", actorUuid: entry.actor.uuid, actorType: entry.actor.type } }
  });
}

/** A player's entry waits on their User until the active GM writes it to the journal. */
async function queueEntry(entry) {
  const queue = game.user.getFlag(SCOPE, "auditQueue") ?? [];
  await game.user.setFlag(SCOPE, "auditQueue", [...queue, entry]);
}

/* -------------------------------------------- */
/*  The journals (GM)                           */
/* -------------------------------------------- */

const isActiveGM = () => game.user.isGM && (!game.users.activeGM || (game.users.activeGM.id === game.user.id));

/** The audit journal for "pc" or "npc" (created, GM only, when needed). */
export async function auditJournal(key, { create = true } = {}) {
  const kind = Object.values(KINDS).find(k => k.key === key);
  let journal = game.journal.find(j => j.getFlag(SCOPE, "audit") === key);
  if ( !journal && create && kind ) {
    journal = await JournalEntry.create({ name: kind.journal, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
      flags: { [SCOPE]: { audit: key } } });
  }
  return journal ?? null;
}

/** One entry as journal HTML. */
function entryHTML(entry) {
  const when = new Date(entry.time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  return `<section class="pu-audit-entry"><p><strong>${escape(when)}</strong> · ${escape(entry.user)}${entry.gm ? " (GM)" : ""}</p>
    <ul>${entry.lines.map(l => `<li>${l}</li>`).join("")}</ul></section>`;
}

let writing = Promise.resolve();

/** Write entries to the audit journals, newest first on each actor's page (one write at a time). */
export function writeEntries(entries) {
  writing = writing.then(() => doWrite(entries)).catch(err => console.error("Palladium Universal | audit journal", err));
  return writing;
}

async function doWrite(entries) {
  for ( const entry of entries ) {
    const kind = KINDS[entry.actor.type];
    if ( !kind ) continue;
    const journal = await auditJournal(kind.key);
    if ( !journal ) continue;
    const deleted = entry.lines.some(l => l === "Deleted");
    const name = deleted ? `${entry.actor.name} (deleted)` : entry.actor.name;
    const page = journal.pages.find(p => p.getFlag(SCOPE, "actorUuid") === entry.actor.uuid);
    if ( page ) await page.update({ name, "text.content": entryHTML(entry) + (page.text?.content ?? "") });
    else {
      await journal.createEmbeddedDocuments("JournalEntryPage", [{ name, type: "text",
        text: { content: entryHTML(entry), format: CONST.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1 },
        flags: { [SCOPE]: { actorUuid: entry.actor.uuid } } }]);
    }
  }
}

/** The active GM writes players' queued entries (on login, and whenever a queue changes). */
export async function flushQueues(users = game.users) {
  if ( !isActiveGM() ) return;
  for ( const user of users ) {
    const queue = user.getFlag(SCOPE, "auditQueue");
    if ( !queue?.length ) continue;
    await writeEntries(queue);
    const done = new Set(queue.map(e => e.id));
    const rest = (user.getFlag(SCOPE, "auditQueue") ?? []).filter(e => !done.has(e.id));
    if ( rest.length ) await user.setFlag(SCOPE, "auditQueue", rest);
    else await user.unsetFlag(SCOPE, "auditQueue");
  }
}

/** Open an actor's page in its audit journal (the whisper's button). */
export async function openAudit(data) {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM can open the audit journal.");
  const kind = KINDS[data.actorType];
  const journal = kind ? await auditJournal(kind.key, { create: false }) : null;
  if ( !journal ) return ui.notifications.info("Nothing has been written to the audit journal yet.");
  const page = journal.pages.find(p => p.getFlag(SCOPE, "actorUuid") === data.actorUuid);
  return journal.sheet.render({ force: true, pageId: page?.id });
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

const itemLabel = item => {
  const label = CONFIG.Item.typeLabels?.[item.type];
  return label ? game.i18n.localize(label) : (item.type.charAt(0).toUpperCase() + item.type.slice(1));
};
const plain = html => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const clip = s => (s.length > 150 ? `${s.slice(0, 147)}…` : s) || "(empty)";
const mine = userId => userId === game.user.id;
const audited = actor => !!KINDS[actor?.type];

/** Hook up the audit (in "init"). */
export function initAudit() {
  Hooks.on("createActor", (actor, options, userId) => {
    if ( mine(userId) && audited(actor) ) record(actor, `Created (${KINDS[actor.type].label})`);
  });
  Hooks.on("deleteActor", (actor, options, userId) => {
    if ( mine(userId) && audited(actor) ) { record(actor, "Deleted"); flush(actor.uuid); }
  });
  Hooks.on("createItem", (item, options, userId) => {
    if ( mine(userId) && audited(item.parent) ) record(item.parent, `Added ${escape(itemLabel(item))}: <strong>${escape(item.name)}</strong>`);
  });
  Hooks.on("deleteItem", (item, options, userId) => {
    if ( mine(userId) && audited(item.parent) ) record(item.parent, `Removed ${escape(itemLabel(item))}: <strong>${escape(item.name)}</strong>`);
  });
  // Money / other possessions: remember the old text before the update, compare after.
  Hooks.on("preUpdateActor", (actor, changes, options) => {
    if ( audited(actor) && foundry.utils.hasProperty(changes, "system.gear") ) options.puAuditGear = actor.system.gear ?? "";
  });
  Hooks.on("updateActor", (actor, changes, options, userId) => {
    if ( !mine(userId) || !audited(actor) || (options.puAuditGear === undefined) ) return;
    const before = plain(options.puAuditGear), after = plain(actor.system.gear);
    if ( before !== after ) record(actor, `Money / possessions: “${escape(clip(before))}” → “${escape(clip(after))}”`);
  });
  Hooks.on("updateUser", (user, changes) => {
    if ( foundry.utils.hasProperty(changes, `flags.${SCOPE}.auditQueue`) ) flushQueues([user]);
  });
  Hooks.once("ready", () => flushQueues());
}
