import PalladiumVehicleSheet from "./vehicle-sheet.mjs";
import { DEVICE_TYPES, VEHICLE_CLASSES } from "../config.mjs";
import { operateTimeMachine } from "../vehicle.mjs";
import { rollTemporalMishap } from "../timetravel.mjs";

/** The Time Machine's three drop zones. */
const ZONES = {
  timeDevice: { label: "Installed Time Device", hint: "Drop a Time Machine or Cross-Dimensional Device here." },
  supportDevices: { label: "Temporal Support Devices", hint: "Drop readout and navigation devices (ARD, T.E. Feelie, Q-Dump, Dee-Cee-Dee...) here." },
  installations: { label: "Installation Cost Records", hint: "Drop installation cost records here." }
};

/**
 * Sheet for the "timeMachine" Actor type: the vehicle sheet plus the time machine panel. Devices dropped
 * into its zones are recorded as data entries (copies), not owned items.
 */
export default class PalladiumTimeMachineSheet extends PalladiumVehicleSheet {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["time-machine"],
    actions: {
      operateMachine: PalladiumTimeMachineSheet.#onOperate,
      rechargeMachine: PalladiumTimeMachineSheet.#onRecharge,
      removeEntry: PalladiumTimeMachineSheet.#onRemoveEntry,
      openEntry: PalladiumTimeMachineSheet.#onOpenEntry,
      temporalMishap: PalladiumTimeMachineSheet.#onMishap
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.timeMachine = true;
    context.tmZones = Object.entries(ZONES).map(([key, z]) => ({ key, ...z, entries: this.actor.system[key] }));
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Record a dropped item's data as an entry.
   * @param {Item} item
   */
  static entryFromItem(item) {
    const s = item.system;
    const entry = { id: foundry.utils.randomID(), name: item.name, img: item.img, sourceUuid: item.uuid, cost: s.cost ?? "" };
    if ( item.type === "installation" ) {
      return { ...entry, kind: "installation",
        details: [s.device, VEHICLE_CLASSES[s.vehicleClass], s.available ? "" : "not available"].filter(t => t).join(" · ") };
    }
    return { ...entry, kind: s.deviceType, skill: s.skill, skillBonus: s.skillBonus, assists: s.assists,
      recharge: s.recharge, maxArea: s.maxArea, malfunction: s.malfunction, malfunctionTable: s.malfunctionTable,
      details: [DEVICE_TYPES[s.deviceType], s.deviceType === "readout" ? `+${s.skillBonus}% to ${DEVICE_TYPES[s.assists]}` : "",
        s.maxArea && `max area ${s.maxArea}`, s.recharge && `recharge ${s.recharge}`].filter(t => t).join(" · ") };
  }

  /**
   * Devices and installation records dropped on the sheet become entries in the matching zone.
   * Everything else (weapons, modifications...) is owned as usual.
   * @override
   */
  async _onDropItem(event, item) {
    if ( !this.actor.isOwner ) return null;
    if ( !["device", "installation"].includes(item.type) ) return super._onDropItem(event, item);
    let zone = event.target.closest?.("[data-drop-zone]")?.dataset.dropZone;
    const inferred = item.type === "installation" ? "installations"
      : item.system.deviceType === "readout" ? "supportDevices" : "timeDevice";
    if ( !zone || ((zone === "installations") !== (item.type === "installation")) ) zone = inferred;
    if ( (zone === "timeDevice") && (item.system.deviceType === "readout") ) zone = "supportDevices";
    if ( (zone === "supportDevices") && (item.system.deviceType !== "readout") ) zone = "timeDevice";

    const entry = PalladiumTimeMachineSheet.entryFromItem(item);
    const list = zone === "timeDevice" ? [entry] : [...this.actor.system.toObject()[zone], entry];
    await this.actor.update({ [`system.${zone}`]: list });
    if ( zone === "timeDevice" ) ui.notifications.info(`${item.name} installed in ${this.actor.name}.`);
    return null;
  }

  /* -------------------------------------------- */

  /** @this {PalladiumTimeMachineSheet} */
  static #onOperate() {
    return operateTimeMachine(this.actor);
  }

  /** @this {PalladiumTimeMachineSheet} */
  static #onRecharge() {
    return this.actor.update({ "system.charged": true });
  }

  /** @this {PalladiumTimeMachineSheet} */
  static #onRemoveEntry(event, target) {
    const zone = target.dataset.zone;
    const id = target.closest("[data-entry-id]")?.dataset.entryId;
    const list = this.actor.system.toObject()[zone].filter(e => e.id !== id);
    return this.actor.update({ [`system.${zone}`]: list });
  }

  /** @this {PalladiumTimeMachineSheet} */
  static async #onOpenEntry(event, target) {
    const item = await fromUuid(target.dataset.uuid);
    if ( item ) item.sheet.render({ force: true });
    else ui.notifications.warn("The original item no longer exists; the entry keeps its recorded data.");
  }

  /** @this {PalladiumTimeMachineSheet} */
  static #onMishap() {
    return rollTemporalMishap(this.actor);
  }
}
