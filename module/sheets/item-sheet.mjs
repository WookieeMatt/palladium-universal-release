import { BACKGROUND_KINDS, SKILL_CATEGORIES, WEAPON_TYPES, WP_KINDS } from "../data/items.mjs";
import {
  ATTRIBUTES, COMBAT_TRAINING, DEVICE_MALFUNCTIONS, DEVICE_TYPES, VEHICLE_CLASSES, VEHICLE_LOCATIONS,
  VEHICLE_MOD_CATEGORIES, FEATURE_LEVELS, HUMAN_FEATURES, PENETRATION, POWDER_LOCKS, POWDER_WPS, SPELL_SAVES,
  SPELL_TRADITIONS
} from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

const TEMPLATE_PATH = "systems/palladium-universal/templates/item";

/** Choices for the target of an item effect. */
function effectTargets() {
  const targets = {};
  for ( const [k, v] of Object.entries(ATTRIBUTES) ) targets[`attributes.${k}`] = `Attribute: ${v}`;
  for ( const [k, v] of Object.entries(ATTRIBUTES) ) targets[`attributes.${k}.halve`] = `Attribute: ${v} halved (any value)`;
  targets.bioe = "Bio-E: bonus points";
  targets.sdc = "S.D.C.";
  targets["sdc.doubleSize"] = "S.D.C.: double Size Level S.D.C. (Extraordinary P.E.)";
  const combat = { strike: "Strike", parry: "Parry", dodge: "Dodge", damage: "Damage", rollImpact: "Roll with Impact",
    pullPunch: "Pull Punch", actions: "Actions per Round", initiative: "Initiative", disarm: "Disarm" };
  for ( const [k, v] of Object.entries(combat) ) targets[`combat.${k}`] = `Combat: ${v}`;
  targets["weapon.strike"] = "Weapon group: Strike";
  targets["weapon.parry"] = "Weapon group: Parry";
  targets["weapon.damage"] = "Weapon group: Damage";
  targets.skill = "Skill: % bonus";
  targets["skills.all"] = "All skills: % bonus";
  targets["handheld.strike"] = "Hand-held weapons: Strike";
  targets["handheld.parry"] = "Hand-held weapons: Parry";
  return targets;
}

/**
 * ApplicationV2 sheet for every Item type in the system.
 */
export default class PalladiumItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["palladium-universal", "item"],
    position: { width: 560, height: 640 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      addEffect: PalladiumItemSheet.#onAddEffect,
      deleteEffect: PalladiumItemSheet.#onDeleteEffect,
      addOption: PalladiumItemSheet.#onAddOption,
      addFeatureEffect: PalladiumItemSheet.#onAddFeatureEffect,
      deleteFeatureEffect: PalladiumItemSheet.#onDeleteFeatureEffect,
      deleteOption: PalladiumItemSheet.#onDeleteOption
    }
  };

  /** @override */
  static PARTS = {
    header: { template: `${TEMPLATE_PATH}/header.hbs` },
    details: { template: `${TEMPLATE_PATH}/details-gear.hbs`, scrollable: [""] }
  };

  /** Pick the details template for this item's type. */
  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    parts.details.template = `${TEMPLATE_PATH}/details-${this.item.type}.hbs`;
    return parts;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.item;
    return Object.assign(context, {
      item,
      system: item.system,
      typeLabel: game.i18n.localize(CONFIG.Item.typeLabels[item.type]),
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        item.system.description, { relativeTo: item }
      ),
      skillCategories: SKILL_CATEGORIES,
      trainingChoices: { professional: "Professional", amateur: "Amateur" },
      wpKinds: WP_KINDS,
      weaponTypes: WEAPON_TYPES,
      armorTypes: { body: "Body Armor", shield: "Shield" },
      effectTargets: effectTargets(),
      hasEffects: "effects" in item.system,
      buildChoices: { short: "Short", medium: "Medium", long: "Long" },
      featureLevels: FEATURE_LEVELS,
      featureRows: item.type === "animal"
        ? Object.entries(HUMAN_FEATURES).map(([key, label]) => ({ key, label, ...item.system.features[key] })) : [],
      featureEffectRows: item.type === "animal"
        ? Object.entries(HUMAN_FEATURES).flatMap(([key, label]) => ["partial", "none"].map(level => ({
          key, level, label: `${label}: ${FEATURE_LEVELS[level]}`,
          effects: item.system.features[key][`${level}Effects`]
        }))) : [],
      optionKinds: { ability: "Ability", weapon: "Natural Weapon" },
      backgroundKinds: BACKGROUND_KINDS,
      spellTraditions: SPELL_TRADITIONS,
      deviceTypes: DEVICE_TYPES,
      vehicleClasses: VEHICLE_CLASSES,
      modCategories: VEHICLE_MOD_CATEGORIES,
      modLocations: { none: "None", ...Object.fromEntries(Object.entries(VEHICLE_LOCATIONS).map(([k, v]) => [k, v.label])) },
      malfunctionTables: { none: "None (text only)", ...Object.fromEntries(Object.entries(DEVICE_MALFUNCTIONS).map(([k, v]) => [k, v.label])) },
      assistTypes: { timeMachine: DEVICE_TYPES.timeMachine, crossDimensional: DEVICE_TYPES.crossDimensional },
      powderLocks: Object.fromEntries(Object.entries(POWDER_LOCKS).map(([k, v]) => [k, v.label])),
      powderWPs: Object.fromEntries(Object.entries(POWDER_WPS).map(([k, v]) => [k, `${v.label} (+${v.aimed} Aimed)`])),
      penetrationChoices: Object.fromEntries(Object.entries(PENETRATION).map(([k, v]) => [k, v.split(":")[0]])),
      spellSaves: SPELL_SAVES,
      trainingChoices2: Object.fromEntries(Object.entries(COMBAT_TRAINING).filter(([k]) => k !== "none")
        .map(([k, v]) => [k, v.label]))
    });
  }

  /* -------------------------------------------- */

  /**
   * Animal options carry bonuses that aren't shown in the form; keep them when the form is saved.
   * @override
   */
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    const submitted = data.system?.options;
    if ( submitted && (this.item.type === "animal") ) {
      const current = this.item.system.toObject().options ?? [];
      const list = Array.isArray(submitted) ? submitted : Object.values(submitted);
      data.system.options = list.map(o => {
        const existing = current.find(c => c.id === o.id);
        return { ...o, effects: existing?.effects ?? [] };
      });
    }
    return data;
  }

  /* -------------------------------------------- */

  /** @this {PalladiumItemSheet} */
  static #onAddEffect() {
    const effects = this.item.system.toObject().effects ?? [];
    effects.push({ target: "combat.parry", formula: "1", value: null, group: "" });
    return this.item.update({ "system.effects": effects });
  }

  /** @this {PalladiumItemSheet} */
  static #onAddFeatureEffect(event, target) {
    const { feature, level } = target.dataset;
    const path = `features.${feature}.${level}Effects`;
    const effects = foundry.utils.getProperty(this.item.system.toObject(), path) ?? [];
    effects.push({ target: "handheld.strike", formula: "-3", value: null, group: "" });
    return this.item.update({ [`system.${path}`]: effects });
  }

  /** @this {PalladiumItemSheet} */
  static #onDeleteFeatureEffect(event, target) {
    const { feature, level, index } = target.dataset;
    const path = `features.${feature}.${level}Effects`;
    const effects = foundry.utils.getProperty(this.item.system.toObject(), path) ?? [];
    effects.splice(Number(index), 1);
    return this.item.update({ [`system.${path}`]: effects });
  }

  /** @this {PalladiumItemSheet} */
  static #onAddOption() {
    const options = this.item.system.toObject().options ?? [];
    options.push({ id: foundry.utils.randomID(), name: "New Option", kind: "ability", bioe: 5 });
    return this.item.update({ "system.options": options });
  }

  /** @this {PalladiumItemSheet} */
  static #onDeleteOption(event, target) {
    const options = this.item.system.toObject().options ?? [];
    options.splice(Number(target.dataset.index), 1);
    return this.item.update({ "system.options": options });
  }

  /** @this {PalladiumItemSheet} */
  static #onDeleteEffect(event, target) {
    const effects = this.item.system.toObject().effects ?? [];
    effects.splice(Number(target.dataset.index), 1);
    return this.item.update({ "system.effects": effects });
  }
}
