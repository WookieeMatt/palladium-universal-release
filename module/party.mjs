import { PARTY_LISTS } from "./data/party.mjs";

/**
 * Parties (v1.19.0): the Party actor's members, the world's Active Party setting and sending the party to
 * the Combat Tracker. The GM Party View and the Session Tools read the Active Party.
 */

const SCOPE = "palladium-universal";

/** The party actors in this world, as setting choices ("" = the only party, if there's just one). */
export function partyChoices() {
  const parties = (game.actors?.filter(a => a.type === "party") ?? []);
  return { "": parties.length === 1 ? `Automatic (${parties[0].name})` : "— None —",
    ...Object.fromEntries(parties.map(a => [a.id, a.name])) };
}

/** Register the Active Party setting (in "init"). The choices are read when the settings window opens. */
export function registerPartySettings() {
  game.settings.register(SCOPE, "activeParty", {
    name: "Active Party",
    hint: "The Party actor the GM Party View and the Session Tools use. With only one Party actor in the world, it's used automatically.",
    scope: "world", config: true, type: String, default: "",
    choices: partyChoices()
  });
  // Refresh the list of parties each time the settings window opens.
  Hooks.on("renderSettingsConfig", (app, html) => {
    const choices = partyChoices();
    const setting = game.settings.settings.get(`${SCOPE}.activeParty`);
    if ( setting ) setting.choices = choices;
    const root = html instanceof HTMLElement ? html : html?.[0];
    const select = root?.querySelector?.(`select[name="${SCOPE}.activeParty"]`);
    if ( !select ) return;
    const current = game.settings.get(SCOPE, "activeParty");
    select.replaceChildren(...Object.entries(choices).map(([value, label]) => {
      const option = document.createElement("option");
      option.value = value; option.textContent = label; option.selected = value === current;
      return option;
    }));
  });
}

/** The Active Party actor: the setting, or the only Party actor in the world. */
export function activeParty() {
  let id = "";
  try { id = game.settings.get(SCOPE, "activeParty"); } catch(err) { id = ""; }
  const chosen = id ? game.actors?.get(id) : null;
  if ( chosen?.type === "party" ) return chosen;
  const parties = game.actors?.filter(a => a.type === "party") ?? [];
  return parties.length === 1 ? parties[0] : null;
}

/** Make a party the Active Party (GM). */
export async function setActiveParty(party) {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM can choose the Active Party.");
  await game.settings.set(SCOPE, "activeParty", party.id);
  ui.notifications.info(`${party.name} is now the Active Party.`);
}

/**
 * Add an actor to a party's list for its type (GM). World actors only: a compendium actor is imported first.
 * @param {Actor} party
 * @param {Actor} actor
 * @returns {Promise<boolean>}
 */
export async function addMember(party, actor) {
  if ( !game.user.isGM ) { ui.notifications.warn("Only the GM can add party members."); return false; }
  const list = PARTY_LISTS[actor?.type];
  if ( !list ) { ui.notifications.warn(`A ${actor?.type ?? "document"} can't join a party.`); return false; }
  if ( actor.pack ) { ui.notifications.warn("Import the actor from the compendium first, then drop it on the party."); return false; }
  const members = party.system.members;
  if ( Object.values(members).some(l => l.includes(actor.uuid)) ) { ui.notifications.info(`${actor.name} is already in ${party.name}.`); return false; }
  await party.update({ [`system.members.${list}`]: [...members[list], actor.uuid] });
  return true;
}

/** Remove a member (GM). */
export async function removeMember(party, uuid) {
  if ( !game.user.isGM ) return ui.notifications.warn("Only the GM can remove party members.");
  const members = party.system.members;
  const update = {};
  for ( const [list, uuids] of Object.entries(members) ) {
    if ( uuids.includes(uuid) ) update[`system.members.${list}`] = uuids.filter(u => u !== uuid);
  }
  if ( Object.keys(update).length ) await party.update(update);
}

/**
 * Put the party's characters and NPCs (not its vehicles) into the Combat Tracker (GM). Members with a token on
 * the current scene join with that token; the others join without one. Anyone already in the combat is skipped.
 * Creates an encounter for the scene if there isn't one.
 * @param {Actor} party
 * @returns {Promise<Combatant[]>}
 */
export async function addPartyToCombat(party) {
  if ( !game.user.isGM ) { ui.notifications.warn("Only the GM can add the party to combat."); return []; }
  const actors = party.system.combatants;
  if ( !actors.length ) { ui.notifications.warn(`${party.name} has no characters or NPCs to add.`); return []; }
  const scene = globalThis.canvas?.scene ?? null;
  let combat = game.combat ?? (scene ? game.combats?.find(c => c.scene?.id === scene.id) : null);
  if ( !combat ) combat = await Combat.create({ scene: scene?.id ?? null, active: true });
  const present = new Set(combat.combatants.map(c => c.actorId));
  const data = [];
  for ( const actor of actors ) {
    if ( present.has(actor.id) ) continue;
    const token = scene?.tokens?.find(t => t.actorId === actor.id);
    data.push(token ? { tokenId: token.id, sceneId: scene.id, actorId: actor.id, hidden: token.hidden } : { actorId: actor.id });
  }
  const created = data.length ? await combat.createEmbeddedDocuments("Combatant", data) : [];
  const skipped = actors.length - data.length;
  ui.notifications.info(`${party.name}: ${created.length} added to the Combat Tracker${skipped ? `, ${skipped} already in it` : ""}.`);
  return created;
}
