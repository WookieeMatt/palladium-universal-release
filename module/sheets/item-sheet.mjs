import { BACKGROUND_KINDS, SKILL_CATEGORIES, WEAPON_TYPES, WP_KINDS, inlineDice } from "../data/items.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

const TEMPLATE_PATH = "systems/palladium-universal/templates/item";

/** Choices for the target of an item effect. */
function effectTargets() {
  const targets = {};
  for ( const [k, v] of Object.entries(CONFIG.PALLADIUM.ATTRIBUTES) ) targets[`attributes.${k}`] = `Attribute: ${v}`;
  for ( const [k, v] of Object.entries(CONFIG.PALLADIUM.ATTRIBUTES) ) targets[`attributes.${k}.halve`] = `Attribute: ${v} halved (any value)`;
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

  /**
   * A read-only view (opened from a chat card) never edits, whoever opens it.
   * @override
   */
  get isEditable() {
    return this.options.readOnly ? false : super.isEditable;
  }

  /** @override */
  get title() {
    return this.options.readOnly ? `${super.title} (view only)` : super.title;
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if ( !this.options.readOnly ) return;
    this.element.classList.add("pu-read-only");
    for ( const el of this.element.querySelectorAll(".window-content input, .window-content select, .window-content textarea, .window-content button, .window-content prose-mirror") ) {
      el.disabled = true;
      if ( el.tagName === "PROSE-MIRROR" ) el.setAttribute("disabled", "");
    }
  }

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
      // Dice written in the description ("2D6+6 minutes") show as clickable rolls.
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        inlineDice(item.system.description), { relativeTo: item }
      ),
      enrichedMalfunction: item.type === "device" ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        inlineDice(item.system.malfunction), { relativeTo: item }) : "",
      skillCategories: SKILL_CATEGORIES,
      trainingChoices: { professional: "Professional", amateur: "Amateur" },
      wpKinds: WP_KINDS,
      weaponTypes: WEAPON_TYPES,
      armorTypes: { body: "Body Armor", shield: "Shield" },
      effectTargets: effectTargets(),
      hasEffects: "effects" in item.system,
      buildChoices: { short: "Short", medium: "Medium", long: "Long" },
      featureLevels: CONFIG.PALLADIUM.FEATURE_LEVELS,
      featureRows: item.type === "animal"
        ? Object.entries(CONFIG.PALLADIUM.HUMAN_FEATURES).map(([key, label]) => ({ key, label, ...item.system.features[key] })) : [],
      featureEffectRows: item.type === "animal"
        ? Object.entries(CONFIG.PALLADIUM.HUMAN_FEATURES).flatMap(([key, label]) => ["partial", "none"].map(level => ({
          key, level, label: `${label}: ${CONFIG.PALLADIUM.FEATURE_LEVELS[level]}`,
          effects: item.system.features[key][`${level}Effects`]
        }))) : [],
      optionKinds: { ability: "Ability", weapon: "Natural Weapon" },
      backgroundKinds: BACKGROUND_KINDS,
      spellTraditions: CONFIG.PALLADIUM.SPELL_TRADITIONS,
      deviceTypes: CONFIG.PALLADIUM.DEVICE_TYPES,
      vehicleClasses: CONFIG.PALLADIUM.VEHICLE_CLASSES,
      modCategories: CONFIG.PALLADIUM.VEHICLE_MOD_CATEGORIES,
      modLocations: { none: "None", ...Object.fromEntries(Object.entries(CONFIG.PALLADIUM.VEHICLE_LOCATIONS).map(([k, v]) => [k, v.label])) },
      malfunctionTables: { none: "None (text only)", ...Object.fromEntries(Object.entries(CONFIG.PALLADIUM.DEVICE_MALFUNCTIONS).map(([k, v]) => [k, v.label])) },
      assistTypes: { timeMachine: CONFIG.PALLADIUM.DEVICE_TYPES.timeMachine, crossDimensional: CONFIG.PALLADIUM.DEVICE_TYPES.crossDimensional },
      powderLocks: Object.fromEntries(Object.entries(CONFIG.PALLADIUM.POWDER_LOCKS).map(([k, v]) => [k, v.label])),
      powderWPs: Object.fromEntries(Object.entries(CONFIG.PALLADIUM.POWDER_WPS).map(([k, v]) => [k, `${v.label} (+${v.aimed} Aimed)`])),
      penetrationChoices: Object.fromEntries(Object.entries(CONFIG.PALLADIUM.PENETRATION).map(([k, v]) => [k, v.split(":")[0]])),
      spellSaves: CONFIG.PALLADIUM.SPELL_SAVES,
      trainingChoices2: Object.fromEntries(Object.entries(CONFIG.PALLADIUM.COMBAT_TRAINING).filter(([k]) => k !== "none")
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
