import { WEAPON_TYPES } from "../data/items.mjs";
import { operateDevice, rollControl, rollEvade, rollVehicleAttack, rollVehicleDamage, rollVehicleManeuver } from "../vehicle.mjs";
import { signed } from "../dice.mjs";
import { rollCrash, rollDumbLuck, rollEmergencyLanding, rollPullOut, rollTactic, rollVeer, spaceRange } from "../air-combat.mjs";


const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const TEMPLATE_PATH = "systems/palladium-universal/templates/vehicle";

/**
 * ApplicationV2 sheet for the "vehicle" Actor type.
 */
export default class PalladiumVehicleSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["palladium-universal", "actor", "vehicle"],
    position: { width: 760, height: 780 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      itemCreate: PalladiumVehicleSheet.#onItemCreate,
      itemEdit: PalladiumVehicleSheet.#onItemEdit,
      itemDelete: PalladiumVehicleSheet.#onItemDelete,
      rollControl: PalladiumVehicleSheet.#onRollControl,
      rollManeuver: PalladiumVehicleSheet.#onRollManeuver,
      rollEvade: PalladiumVehicleSheet.#onRollEvade,
      rollAttack: PalladiumVehicleSheet.#onRollAttack,
      rollDamage: PalladiumVehicleSheet.#onRollDamage,
      operate: PalladiumVehicleSheet.#onOperate,
      rollTactic: PalladiumVehicleSheet.#onRollTactic,
      rollVeer: PalladiumVehicleSheet.#onRollVeer,
      rollPullOut: PalladiumVehicleSheet.#onRollPullOut,
      rollLanding: PalladiumVehicleSheet.#onRollLanding,
      rollCrash: PalladiumVehicleSheet.#onRollCrash,
      rollDumbLuck: PalladiumVehicleSheet.#onRollDumbLuck,
      recharge: PalladiumVehicleSheet.#onRecharge
    }
  };

  /** @override */
  static PARTS = {
    body: { template: `${TEMPLATE_PATH}/vehicle.hbs`, scrollable: [".sheet-body"] }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const system = actor.system;
    const byType = type => actor.items.filter(i => i.type === type).sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name));
    return Object.assign(context, {
      actor, system,
      vehicleTypes: CONFIG.PALLADIUM.VEHICLE_TYPES,
      locations: Object.entries(CONFIG.PALLADIUM.VEHICLE_LOCATIONS).map(([key, l]) => ({ key, label: l.label, ...system.locations[key] })),
      status: system.health.totaled ? "Totaled" : system.health.incapacitated ? "Incapacitated" : "Operational",
      speedClasses: Object.fromEntries(CONFIG.PALLADIUM.SPEED_CLASSES.map(c => [c.cls, `${c.cls} — ${c.label}`])),
      drives: Object.fromEntries(Object.entries(CONFIG.PALLADIUM.DRIVE_TYPES).map(([k, d]) => [k, d.label])),
      tactics: Object.entries(CONFIG.PALLADIUM.AIR_TACTICS).map(([key, t]) => ({ key, ...t,
        total: signed((t.sc ? system.air.speedClass : 0) + (t.tmf ? system.air.tmf : 0) - (system.air.machPenalty ?? 0)) })),
      veerTarget: system.controlSkill + system.air.airToAir - (system.air.machPenalty ?? 0),
      maxTmf: CONFIG.PALLADIUM.DRIVE_TYPES[system.air.drive]?.maxTmf,
      weapons: byType("weapon").map(i => ({ id: i.id, name: i.name, img: i.img, damage: i.system.damage,
        range: system.air.inSpace ? spaceRange(i.system.range, i.system.weaponType) : i.system.range, type: WEAPON_TYPES[i.system.weaponType],
        strike: signed(system.gunnerBonus + i.system.strikeBonus) })),
      devices: byType("device").map(i => ({ id: i.id, name: i.name, img: i.img, type: CONFIG.PALLADIUM.DEVICE_TYPES[i.system.deviceType],
        readout: i.system.deviceType === "readout", bonus: i.system.skillBonus, charged: i.system.charged,
        recharge: i.system.recharge, maxArea: i.system.maxArea })),
      mods: actor.items.filter(i => i.type === "vehicleMod").map(i => ({ id: i.id, name: i.name, img: i.img,
        category: CONFIG.PALLADIUM.VEHICLE_MOD_CATEGORIES[i.system.category], cost: i.system.cost,
        effect: [i.system.location !== "none" ? `${CONFIG.PALLADIUM.VEHICLE_LOCATIONS[i.system.location].label.split(" (")[0]} A.R. ${i.system.ar}, S.D.C. ${i.system.sdc}` : "",
          i.system.sdcBonus ? `S.D.C. +${i.system.sdcBonus}` : "", i.system.controlBonus ? `Control +${i.system.controlBonus}%` : "",
          i.system.speed, i.system.effect].filter(t => t).join(" · ") })),
      others: actor.items.filter(i => !["weapon", "device", "vehicleMod"].includes(i.type)).map(i => ({ id: i.id, name: i.name, img: i.img })),
      enrichedNotes: await foundry.applications.ux.TextEditor.implementation.enrichHTML(system.notes, { relativeTo: actor })
    });
  }

  /* -------------------------------------------- */

  /**
   * Armor modifications install themselves: dropping one sets that location's A.R. and S.D.C.
   * @override
   */
  async _onDropItem(event, item) {
    const created = await super._onDropItem(event, item);
    const mod = Array.isArray(created) ? created[0] : created;
    if ( (mod?.type === "vehicleMod") && (mod.system.location !== "none") && (mod.parent === this.actor) ) {
      const loc = mod.system.location;
      await this.actor.update({ [`system.locations.${loc}.ar`]: mod.system.ar,
        [`system.locations.${loc}.sdc.max`]: mod.system.sdc, [`system.locations.${loc}.sdc.value`]: mod.system.sdc });
      ui.notifications.info(`${mod.name} installed: ${CONFIG.PALLADIUM.VEHICLE_LOCATIONS[loc].label} A.R. ${mod.system.ar}, S.D.C. ${mod.system.sdc}.`);
    }
    return created;
  }

  #itemFromEvent(target) {
    return this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
  }

  /** @this {PalladiumVehicleSheet} */
  static async #onItemCreate(event, target) {
    const type = target.dataset.type;
    const system = type === "weapon" ? { weaponType: "firearm" } : {};
    if ( target.dataset.deviceType ) system.deviceType = target.dataset.deviceType;
    const [item] = await this.actor.createEmbeddedDocuments("Item", [{
      name: `New ${game.i18n.localize(CONFIG.Item.typeLabels[type])}`, type, system }]);
    item?.sheet.render({ force: true });
  }

  /** @this {PalladiumVehicleSheet} */
  static #onItemEdit(event, target) {
    this.#itemFromEvent(target)?.sheet.render({ force: true });
  }

  /** @this {PalladiumVehicleSheet} */
  static #onItemDelete(event, target) {
    return this.#itemFromEvent(target)?.deleteDialog();
  }

  /** @this {PalladiumVehicleSheet} */
  static #onRollControl() {
    return rollControl(this.actor);
  }

  /** @this {PalladiumVehicleSheet} */
  static #onRollManeuver() {
    return rollVehicleManeuver(this.actor);
  }

  /** @this {PalladiumVehicleSheet} */
  static #onRollEvade() {
    return rollEvade(this.actor);
  }

  /** @this {PalladiumVehicleSheet} */
  static #onRollAttack(event, target) {
    const item = this.#itemFromEvent(target);
    if ( item ) return rollVehicleAttack(this.actor, item);
  }

  /** @this {PalladiumVehicleSheet} */
  static #onRollDamage(event, target) {
    const item = this.#itemFromEvent(target);
    if ( item ) return rollVehicleDamage(this.actor, item);
  }

  /** @this {PalladiumVehicleSheet} */
  static #onOperate(event, target) {
    const item = this.#itemFromEvent(target);
    if ( item ) return operateDevice(item);
  }

  /** @this {PalladiumVehicleSheet} */
  static #onRollTactic(event, target) {
    return rollTactic(this.actor, target.dataset.tactic);
  }

  /** @this {PalladiumVehicleSheet} */
  static #onRollVeer() {
    return rollVeer(this.actor);
  }

  /** @this {PalladiumVehicleSheet} */
  static #onRollPullOut() {
    return rollPullOut(this.actor);
  }

  /** @this {PalladiumVehicleSheet} */
  static #onRollLanding() {
    return rollEmergencyLanding(this.actor);
  }

  /** @this {PalladiumVehicleSheet} */
  static #onRollCrash() {
    return rollCrash(this.actor);
  }

  /** @this {PalladiumVehicleSheet} */
  static #onRollDumbLuck() {
    return rollDumbLuck(this.actor);
  }

  /** @this {PalladiumVehicleSheet} */
  static #onRecharge(event, target) {
    return this.#itemFromEvent(target)?.update({ "system.charged": true });
  }
}
