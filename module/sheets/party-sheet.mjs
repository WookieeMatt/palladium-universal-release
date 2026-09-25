import { activeParty, addMember, addPartyToCombat, removeMember, setActiveParty } from "../party.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const TEMPLATE_PATH = "systems/palladium-universal/templates/party";

/**
 * ApplicationV2 sheet for the "party" Actor type (v1.19.0): drop characters, NPCs and vehicles on it (GM),
 * and a shared Party Notes tab everyone in the party can write in.
 */
export default class PalladiumPartySheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["palladium-universal", "actor", "party"],
    position: { width: 720, height: 700 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      openMember: PalladiumPartySheet.#onOpenMember,
      removeMember: PalladiumPartySheet.#onRemoveMember,
      setActive: PalladiumPartySheet.#onSetActive,
      partyView: PalladiumPartySheet.#onPartyView,
      sessionTools: PalladiumPartySheet.#onSessionTools,
      addToCombat: PalladiumPartySheet.#onAddToCombat
    }
  };

  /** @override */
  static PARTS = {
    header: { template: `${TEMPLATE_PATH}/header.hbs` },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    members: { template: `${TEMPLATE_PATH}/tab-members.hbs`, scrollable: [""] },
    notes: { template: `${TEMPLATE_PATH}/tab-notes.hbs`, scrollable: [""] }
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [{ id: "members" }, { id: "notes" }],
      initial: "members",
      labelPrefix: "PALLADIUMUNIVERSAL.PartyTabs"
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const { pcs, npcs, vehicles } = actor.system.actors;
    const row = a => ({
      uuid: a.uuid, name: a.name, img: a.img,
      detail: a.type === "character" ? [`Level ${a.system.identity?.level ?? 1}`, a.system.identity?.species].filter(t => t).join(" · ")
        : a.type === "npc" ? (a.system.role || `Level ${a.system.identity?.level ?? 1}`)
          : (CONFIG.PALLADIUM.VEHICLE_TYPES?.[a.system.vehicleType] ?? (a.type === "timeMachine" ? "Time Machine" : "Vehicle"))
    });
    const isGM = game.user.isGM;
    return Object.assign(context, {
      actor, system: actor.system, isGM,
      isActive: activeParty()?.id === actor.id,
      lists: [
        { key: "pcs", label: "Player Characters", icon: "fa-user", members: pcs.map(row), hint: "Drop characters here" },
        { key: "npcs", label: "NPCs", icon: "fa-user-ninja", members: npcs.map(row), hint: "Drop NPCs here (allies, companions, followers)" },
        { key: "vehicles", label: "Vehicles", icon: "fa-van-shuttle", members: vehicles.map(row), hint: "Drop vehicles and time machines here" }
      ],
      enrichedNotes: await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.notes, { relativeTo: actor })
    });
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if ( context.tabs?.[partId] ) context.tab = context.tabs[partId];
    return context;
  }

  /* -------------------------------------------- */
  /*  Drops: actors join the list for their type   */
  /* -------------------------------------------- */

  /** @override */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( data?.type !== "Actor" ) return super._onDrop?.(event);
    const actor = await fromUuid(data.uuid);
    if ( actor ) await addMember(this.actor, actor);
    return null;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /** @this {PalladiumPartySheet} */
  static async #onOpenMember(event, target) {
    const actor = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    if ( !actor ) return;
    if ( !actor.testUserPermission(game.user, "LIMITED") ) return ui.notifications.warn(`You can't view ${actor.name}.`);
    return actor.sheet.render({ force: true });
  }

  /** @this {PalladiumPartySheet} */
  static #onRemoveMember(event, target) {
    return removeMember(this.actor, target.closest("[data-uuid]").dataset.uuid);
  }

  /** @this {PalladiumPartySheet} */
  static async #onSetActive() {
    await setActiveParty(this.actor);
    this.render();
  }

  /** @this {PalladiumPartySheet} */
  static async #onPartyView() {
    const { openPartyView } = await import("../party-view.mjs");
    return openPartyView(this.actor);
  }

  /** @this {PalladiumPartySheet} */
  static async #onSessionTools() {
    const { openSessionTools } = await import("../session.mjs");
    return openSessionTools(this.actor);
  }

  /** @this {PalladiumPartySheet} */
  static #onAddToCombat() {
    return addPartyToCombat(this.actor);
  }
}
