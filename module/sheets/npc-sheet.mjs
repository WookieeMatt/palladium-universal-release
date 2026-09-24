import PalladiumCharacterSheet from "./character-sheet.mjs";
import { requestHorrorSaves } from "../combat.mjs";

const TEMPLATE_PATH = "systems/palladium-universal/templates/npc";

/**
 * Compact two-tab sheet for NPCs. Uses the character sheet's context and actions.
 */
export default class PalladiumNpcSheet extends PalladiumCharacterSheet {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["npc"],
    position: { width: 720, height: 760 },
    actions: {
      horrorFactor: PalladiumNpcSheet.#onHorrorFactor
    }
  };

  /** @override */
  static PARTS = {
    header: { template: `${TEMPLATE_PATH}/header.hbs` },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    stats: { template: `${TEMPLATE_PATH}/tab-stats.hbs`, scrollable: [""] },
    details: { template: `${TEMPLATE_PATH}/tab-details.hbs`, scrollable: [""] }
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [{ id: "stats" }, { id: "details" }],
      initial: "stats",
      labelPrefix: "PALLADIUMUNIVERSAL.Tabs"
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.enrichedNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.actor.system.notes, { relativeTo: this.actor }
    );
    context.health = this.actor.system.health;
    return context;
  }

  /** @this {PalladiumNpcSheet} */
  static #onHorrorFactor() {
    return requestHorrorSaves(this.actor);
  }
}
