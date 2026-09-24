import { castSpell, newDay, rollChangeSave, rollMagicAbility, usePsionic } from "../magic.mjs";
import { operateDevice } from "../vehicle.mjs";
import { practiceSpell, rollTemporalMishap } from "../timetravel.mjs";
import { rollD20, rollPercent, rollSaveVsComa, rollSkill, signed } from "../dice.mjs";
import { rollAttribute } from "../creation.mjs";
import {
  FIRE_MODES, MELEE_MODES, POWDER_MODES, misfireChance, rollAttack, rollDamage, rollHorrorFactor, rollManeuver, strikeBonus
} from "../combat.mjs";
import { BACKGROUND_KINDS, SKILL_CATEGORIES, WEAPON_TYPES, WP_KINDS } from "../data/items.mjs";
import { applyAnimal, applyBackground, purchasedItems, removeAnimal, setOptionPurchased } from "../animal.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const TEMPLATE_PATH = "systems/palladium-universal/templates/actor";

/** Short labels for Human Feature effects shown on the Combat tab. */
const EFFECT_LABELS = {
  "handheld.strike": "Strike with hand-held weapons", "handheld.parry": "Parry with hand-held weapons",
  "skills.all": "all skills %"
};

/** Combat rolls available from the Combat tab. */
const COMBAT_ROLLS = {
  initiative: "Initiative",
  strike: "Strike",
  parry: "Parry",
  dodge: "Dodge",
  rollImpact: "Roll with Impact",
  pullPunch: "Pull Punch",
  disarm: "Disarm"
};

/**
 * ApplicationV2 sheet for the "character" Actor type.
 */
export default class PalladiumCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["palladium-universal", "actor", "character"],
    position: { width: 980, height: 860 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      rollCombat: PalladiumCharacterSheet.#onRollCombat,
      rollSave: PalladiumCharacterSheet.#onRollSave,
      rollComa: PalladiumCharacterSheet.#onRollComa,
      rollInfluence: PalladiumCharacterSheet.#onRollInfluence,
      rollAttribute: PalladiumCharacterSheet.#onRollAttribute,
      changeSize: PalladiumCharacterSheet.#onChangeSize,
      itemCreate: PalladiumCharacterSheet.#onItemCreate,
      itemEdit: PalladiumCharacterSheet.#onItemEdit,
      itemDelete: PalladiumCharacterSheet.#onItemDelete,
      itemEquip: PalladiumCharacterSheet.#onItemEquip,
      rollSkill: PalladiumCharacterSheet.#onRollSkill,
      rollAttack: PalladiumCharacterSheet.#onRollAttack,
      rollDamage: PalladiumCharacterSheet.#onRollDamage,
      buyOption: PalladiumCharacterSheet.#onBuyOption,
      rollManeuver: PalladiumCharacterSheet.#onRollManeuver,
      toggleCondition: PalladiumCharacterSheet.#onToggleCondition,
      clearCircumstances: PalladiumCharacterSheet.#onClearCircumstances,
      rollHorror: PalladiumCharacterSheet.#onRollHorror,
      castSpell: PalladiumCharacterSheet.#onCastSpell,
      usePsionic: PalladiumCharacterSheet.#onUsePsionic,
      newDay: PalladiumCharacterSheet.#onNewDay,
      rollMagicAbility: PalladiumCharacterSheet.#onRollMagicAbility,
      rollChange: PalladiumCharacterSheet.#onRollChange,
      operate: PalladiumCharacterSheet.#onOperate,
      recharge: PalladiumCharacterSheet.#onRecharge,
      resetActions: PalladiumCharacterSheet.#onResetActions,
      practiceSpell: PalladiumCharacterSheet.#onPracticeSpell,
      temporalMishap: PalladiumCharacterSheet.#onTemporalMishap,
      removeAnimal: PalladiumCharacterSheet.#onRemoveAnimal
    }
  };

  /** @override */
  static PARTS = {
    header: { template: `${TEMPLATE_PATH}/header.hbs` },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    core: { template: `${TEMPLATE_PATH}/tab-core.hbs`, scrollable: [""] },
    mutation: { template: `${TEMPLATE_PATH}/tab-mutation.hbs`, scrollable: [""] },
    combat: { template: `${TEMPLATE_PATH}/tab-combat.hbs`, scrollable: [""] },
    powers: { template: `${TEMPLATE_PATH}/tab-powers.hbs`, scrollable: [""] },
    skills: { template: `${TEMPLATE_PATH}/tab-skills.hbs`, scrollable: [""] },
    gear: { template: `${TEMPLATE_PATH}/tab-gear.hbs`, scrollable: [""] },
    modules: { template: `${TEMPLATE_PATH}/tab-modules.hbs`, scrollable: [""] }
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "core" },
        { id: "mutation" },
        { id: "combat" },
        { id: "powers" },
        { id: "skills" },
        { id: "gear" },
        { id: "modules" }
      ],
      initial: "core",
      labelPrefix: "PALLADIUMUNIVERSAL.Tabs"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const system = actor.system;
    return Object.assign(context, {
      actor,
      system,
      systemFields: system.schema.fields,
      attributes: this.#prepareAttributes(),
      alignments: CONFIG.PALLADIUM.ALIGNMENTS,
      trainingChoices: Object.fromEntries(Object.entries(CONFIG.PALLADIUM.COMBAT_TRAINING).map(([k, v]) => [k, v.label])),
      featureLevels: CONFIG.PALLADIUM.FEATURE_LEVELS,
      buildChoices: { short: "Short", medium: "Medium", long: "Long" },
      features: Object.entries(CONFIG.PALLADIUM.HUMAN_FEATURES).map(([key, label]) => {
        const f = system.mutation.features[key];
        const levels = f.fullAvailable ? CONFIG.PALLADIUM.FEATURE_LEVELS : { none: CONFIG.PALLADIUM.FEATURE_LEVELS.none, partial: CONFIG.PALLADIUM.FEATURE_LEVELS.partial };
        return { key, label, ...f, levels };
      }),
      sizeTable: Object.entries(CONFIG.PALLADIUM.SIZE_LEVELS).map(([level, row]) => ({
        level: Number(level), ...row, current: Number(level) === system.mutation.sizeLevel
      })),
      combatRolls: this.#prepareCombatRolls(),
      combatInfo: this.#prepareCombatInfo(),
      maneuvers: this.#prepareManeuvers(),
      conditions: Object.entries(CONFIG.PALLADIUM.CONDITIONS).map(([id, c]) => ({
        id, label: c.label, img: c.img, text: c.text, active: system.combat.conditions.active.includes(id)
      })),
      circumstances: ["actions", "critical"].map(key => ({ key, label: CONFIG.PALLADIUM.CIRCUMSTANCES[key], value: system.combat.circ[key] })),
      saves: Object.entries(system.saves.totals).map(([key, s]) => ({
        key, ...s, bonusText: signed(s.bonus), mod: system.saves.mod[key]
      })),
      magic: system.magic.caster,
      magicTraditions: Object.fromEntries(Object.entries(CONFIG.PALLADIUM.MAGIC_TRADITIONS).map(([k, v]) => [k, v.label])),
      saveMagic: signed(system.saves.totals.magic.bonus),
      saveCircle: signed(system.saves.totals.circle.bonus),
      saveChange: signed(system.saves.change.bonus),
      saveStrangeness: signed(system.saves.totals.strangeness.bonus),
      savePsionics: signed(system.saves.totals.psionics.bonus),
      bioeRemainingClass: system.mutation.bioe.remaining < 0 ? "negative" : "",
      items: this.#prepareItems(),
      animal: this.#prepareAnimal(),
      backgrounds: Object.entries(BACKGROUND_KINDS).map(([kind, label]) => {
        const item = actor.items.find(i => (i.type === "background") && (i.system.kind === kind));
        return { kind, label, item: item ? { id: item.id, name: item.name, img: item.img, roll: item.system.roll } : null };
      })
    });
  }

  /* -------------------------------------------- */

  /** Describe the character's animal and its purchasable options. */
  #prepareAnimal() {
    const actor = this.actor;
    const animal = actor.items.find(i => i.type === "animal");
    if ( !animal ) return null;
    const bought = new Set(purchasedItems(actor).map(i => i.getFlag("palladium-universal", "animalOption")));
    const a = animal.system;
    const options = a.options.map(o => ({
      ...o, purchased: bought.has(o.id),
      detail: [o.damage, o.naturalAR ? `A.R. ${o.naturalAR}` : "", o.notes].filter(t => t).join(" · ")
    }));
    const bonuses = a.effects.filter(e => e.target.startsWith("attributes."))
      .map(e => `${CONFIG.PALLADIUM.ATTRIBUTES[e.target.slice(11)]} ${signed(animal.system.constructor.effectValue(e))}`)
      .join(", ");
    const features = Object.entries(a.features).map(([key, f]) => {
      const auto = f.auto !== "none" ? `auto ${f.auto}` : "";
      const costs = [
        (f.auto !== "none") && (f.none < 0) ? `none ${f.none}` : "",
        f.auto === "none" ? `partial ${f.partial}` : (f.auto === "full") && (f.partial < 0) ? `partial ${f.partial}` : "",
        f.auto !== "full" && f.fullAvailable ? `full ${f.full}` : "",
        f.fullAvailable ? "" : "full n/a"].filter(t => t);
      return `${CONFIG.PALLADIUM.HUMAN_FEATURES[key]}: ${[auto, ...costs].filter(t => t).join(", ")}`;
    });
    return {
      id: animal.id, name: animal.name, img: animal.img, bioe: a.bioe, sizeLevel: a.sizeLevel, build: a.build,
      length: a.length, weight: a.weight, bonuses, features,
      abilities: options.filter(o => o.kind === "ability"),
      weapons: options.filter(o => o.kind === "weapon")
    };
  }

  /* -------------------------------------------- */

  /** Group and describe owned items for the sheet's lists. */
  #prepareItems() {
    const actor = this.actor;
    const system = actor.system;
    const byType = type => actor.items.filter(i => i.type === type).sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name));

    const skills = byType("skill").map(item => {
      const pct = system.skillPercentages(item);
      return {
        id: item.id, name: item.name, img: item.img, passive: item.system.passive,
        category: SKILL_CATEGORIES[item.system.category], training: item.system.training,
        pct: pct.primary, pct2: pct.secondary,
        label2: item.system.label2,
        tooltip: Object.entries(pct.breakdown).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(", ")
      };
    });

    const wps = byType("wp").map(item => {
      const b = item.system.bonusesAt(system.identity.level);
      const text = item.system.kind === "modern" ? `Aimed +${b.aimed} · Burst +${b.burst} · Wild +${b.wild}`
        : item.system.kind === "targeting" ? `Ranged Strike +${b.rangedStrike}`
          : item.system.kind === "paired" ? "Strike & parry together; no multiple-attacker penalty"
            : `Strike +${b.strike} · Parry +${b.parry}`;
      return { id: item.id, name: item.name, img: item.img, kind: WP_KINDS[item.system.kind], group: item.system.group, text };
    });

    const weapons = byType("weapon").map(item => {
      const w = item.system;
      const modes = w.isModern
        ? Object.entries(FIRE_MODES).filter(([k]) => (k === "aimed") || w.burstDamage)
          .map(([k, m]) => ({ key: k, label: m.label, strike: signed(strikeBonus(actor, item, k).bonus) }))
        : w.isPowder
          ? Object.entries(POWDER_MODES).map(([k, m]) => ({ key: k, label: m.label, strike: signed(strikeBonus(actor, item, k).bonus) }))
          : w.isMelee
            ? Object.entries(MELEE_MODES).filter(([, m]) => !m.requires || system.combat.trainingData.unlocks.includes(m.requires))
              .map(([k, m]) => ({ key: k, label: m.label, strike: signed(strikeBonus(actor, item, k).bonus) }))
            : [{ key: "aimed", label: "Attack", strike: signed(strikeBonus(actor, item).bonus) }];
      const proficient = !!system.proficiencyFor(item);
      return {
        id: item.id, name: item.name, img: item.img, type: WEAPON_TYPES[w.weaponType], damage: w.damage,
        burstDamage: w.burstDamage, range: w.range, modes, equipped: w.equipped, proficient,
        misfire: w.isPowder ? misfireChance(item) : null, reload: w.reload, overload: w.isPowder && w.powder.overload,
        needsWP: !["natural", "explosive"].includes(w.weaponType), bioe: w.bioe
      };
    });

    const armor = byType("armor").map(item => ({
      id: item.id, name: item.name, img: item.img, type: item.system.armorType === "shield" ? "Shield" : "Body Armor",
      ar: item.system.ar, sdc: item.system.sdc, parry: item.system.parryBonus, equipped: item.system.equipped
    }));

    const simple = type => byType(type).map(item => ({
      id: item.id, name: item.name, img: item.img, bioe: item.system.bioe, quantity: item.system.quantity,
      range: item.system.range, duration: item.system.duration, save: item.system.save
    }));

    const spells = byType("spell").map(item => {
      const s = item.system;
      return {
        id: item.id, name: item.name, img: item.img, selections: s.selections, offensive: s.offensive,
        mastered: s.mastered, successes: s.successes, needed: s.tradition === "timeLord" ? 2 : 1,
        tradition: CONFIG.PALLADIUM.SPELL_TRADITIONS[s.tradition], range: s.range, duration: s.duration,
        save: s.saveType === "dodge" ? `Dodge ${s.dodgeTarget}+` : CONFIG.PALLADIUM.SPELL_SAVES[s.saveType].split(" ")[0],
        damage: s.damage ? s.damageFormula(system.identity.level) : ""
      };
    });

    const devices = byType("device").map(item => ({
      id: item.id, name: item.name, img: item.img, type: CONFIG.PALLADIUM.DEVICE_TYPES[item.system.deviceType],
      readout: item.system.deviceType === "readout", bonus: item.system.skillBonus, charged: item.system.charged,
      recharge: item.system.recharge
    }));

    return {
      spells,
      devices,
      professional: skills.filter(s => s.training === "professional"),
      amateur: skills.filter(s => s.training === "amateur"),
      wps, weapons, armor,
      naturalWeapons: weapons.filter(w => w.type === WEAPON_TYPES.natural),
      psionics: simple("psionic"),
      abilities: simple("ability"),
      gear: simple("gear")
    };
  }

  /* -------------------------------------------- */

  /** Build the attribute rows for the Core tab. */
  #prepareAttributes() {
    const system = this.actor.system;
    const b = system.bonuses;
    return Object.entries(CONFIG.PALLADIUM.ATTRIBUTES).map(([key, label]) => {
      const attr = system.attributes[key];
      let bonus = "";
      let influence = null;
      switch ( key ) {
        case "iq": if ( b.iq.iqSkill ) bonus = `+${b.iq.iqSkill}% all skills`; break;
        case "me": if ( b.me.meSave ) bonus = `${signed(b.me.meSave)} save vs psionics & strangeness`; break;
        case "ma":
          if ( b.ma.maPercent ) {
            bonus = `${b.ma.maPercent}% trust / intimidate`;
            influence = { key: "ma", label: "Trust / Intimidate", target: b.ma.maPercent };
          }
          break;
        case "ps": if ( b.ps.psDamage ) bonus = `${signed(b.ps.psDamage)} melee & hurled damage`; break;
        case "pp": if ( b.pp.ppCombat ) bonus = `${signed(b.pp.ppCombat)} strike, parry, dodge`; break;
        case "pe":
          if ( b.pe.pePercent ) {
            bonus = `${signed(b.pe.peSave)} save vs toxins & magic · ${b.pe.pePercent}% coma/death (${signed(b.pe.peComa)} d20)`;
          }
          break;
        case "pb":
          if ( b.pb.pbPercent ) {
            bonus = `${b.pb.pbPercent}% charm / impress`;
            influence = { key: "pb", label: "Charm / Impress", target: b.pb.pbPercent };
          }
          break;
        case "spd": {
          const mv = system.movement;
          bonus = `Move ${mv.move} yd · Run ${mv.fullRun} yd/round · ${mv.sprint} yd/min`;
          break;
        }
      }
      return {
        key, label, value: attr.value, mod: attr.mod, sizeMod: attr.sizeMod,
        sizeModText: attr.sizeMod ? signed(attr.sizeMod) : "—",
        itemModText: attr.itemMod ? signed(attr.itemMod) : "—",
        itemModTooltip: (system.itemEffects?.sources?.[`attributes.${key}`] ?? []).filter(s => s.value)
          .map(s => `${s.source} ${signed(s.value)}`).join(", ") || "Animal, background, skills and abilities",
        rolled: attr.value !== null,
        total: attr.total ?? "—", bonus, influence, halved: attr.halved
      };
    });
  }

  /* -------------------------------------------- */

  /** Build the roll buttons for the Combat tab. */
  #prepareCombatRolls() {
    const c = this.actor.system.combat;
    return Object.entries(COMBAT_ROLLS).map(([key, label]) => {
      const b = c.breakdown[key];
      return {
        key, label, total: signed(c.totals[key]), mod: c.mod[key],
        training: b.training, attribute: b.attribute, skills: b.skills,
        circKey: key === "disarm" ? null : (key in c.circ ? key : null),
        circ: c.circ[key], conditions: b.conditions
      };
    });
  }

  /* -------------------------------------------- */

  /** Maneuver buttons: the baseline ones plus any unlocked by Combat Training. */
  #prepareManeuvers() {
    const c = this.actor.system.combat;
    return Object.entries(CONFIG.PALLADIUM.MANEUVERS)
      .filter(([, m]) => !m.requires || c.trainingData.unlocks.includes(m.requires))
      .map(([key, m]) => ({ key, label: m.label, text: m.text, strike: signed(c.totals.strike) }));
  }

  /* -------------------------------------------- */

  /** Describe the character's Combat Training state. */
  #prepareCombatInfo() {
    const c = this.actor.system.combat;
    const t = c.trainingData;
    const crits = [`Critical Strike on a Natural ${t.critAll === 20 ? "20" : `${t.critAll}–20`}`];
    if ( t.critOrStun ) crits.push(`Critical Strike or Stun in melee on a Natural ${t.critOrStun}–20`);
    if ( t.sneak ) crits.push("Critical Strike or Stun with a melee Sneak Attack");
    if ( t.deathBlow ) crits.push(`Death Blow with melee attacks on a Natural ${t.deathBlow === 20 ? "20" : `${t.deathBlow}–20`}`);
    if ( c.critRange !== t.critAll ) crits[0] = `Critical Strike on a Natural ${c.critRange === 20 ? "20" : `${c.critRange}–20`} (circumstance)`;
    const unlocks = [...new Set(t.unlocks)].filter(u => !CONFIG.PALLADIUM.BASELINE_UNLOCKS.includes(u));
    return {
      effectiveLevel: c.effectiveLevel,
      autoParry: t.autoParry,
      actions: CONFIG.PALLADIUM.BASELINE_COMBAT.attackActions.map(a => CONFIG.PALLADIUM.ACTION_LABELS[a] ?? a),
      reactions: CONFIG.PALLADIUM.BASELINE_COMBAT.reactions.map(a => CONFIG.PALLADIUM.ACTION_LABELS[a] ?? a),
      unlocks: unlocks.map(u => CONFIG.PALLADIUM.COMBAT_UNLOCKS[u] ?? u),
      crits,
      stunned: c.conditions.stunned,
      featureNotes: (this.actor.system.itemEffects.features ?? [])
        .map(e => `${e.source}: ${EFFECT_LABELS[e.target] ?? e.target} ${e.target.endsWith(".halve") ? "" : signed(e.value)}`),
      noDefense: c.conditions.noDefense.join(", ")
    };
  }

  /* -------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if ( partId in context.tabs ) context.tab = context.tabs[partId];
    return context;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /** @this {PalladiumCharacterSheet} */
  static #onRollCombat(event, target) {
    const key = target.dataset.roll;
    const c = this.actor.system.combat;
    const options = { label: COMBAT_ROLLS[key], bonus: c.totals[key], breakdown: c.rollBreakdown[key] };
    if ( ["strike", "disarm"].includes(key) ) options.critRange = c.critRange;
    if ( key === "pullPunch" ) options.target = CONFIG.PALLADIUM.PULL_PUNCH_TARGET;   // 10+ (Errata 2026)
    return rollD20(this.actor, options);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onRollManeuver(event, target) {
    return rollManeuver(this.actor, target.dataset.maneuver);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onToggleCondition(event, target) {
    return this.actor.toggleStatusEffect(target.dataset.condition);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onClearCircumstances() {
    const update = Object.fromEntries(Object.keys(CONFIG.PALLADIUM.CIRCUMSTANCES).map(k => [`system.combat.circ.${k}`, 0]));
    return this.actor.update(update);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onRollHorror() {
    return rollHorrorFactor(this.actor);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onCastSpell(event, target) {
    const item = this.#itemFromEvent(target);
    if ( item ) return castSpell(this.actor, item);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onUsePsionic(event, target) {
    const item = this.#itemFromEvent(target);
    if ( item ) return usePsionic(this.actor, item);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onNewDay() {
    return newDay(this.actor);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onRollMagicAbility(event, target) {
    return rollMagicAbility(this.actor, Number(target.dataset.index));
  }

  /** @this {PalladiumCharacterSheet} */
  static #onRollChange() {
    return rollChangeSave(this.actor);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onOperate(event, target) {
    const item = this.#itemFromEvent(target);
    if ( item ) return operateDevice(item);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onResetActions() {
    return this.actor.update({ "system.combat.actionsUsed": 0 });
  }

  /** @this {PalladiumCharacterSheet} */
  static #onPracticeSpell(event, target) {
    const item = this.#itemFromEvent(target);
    if ( item ) return practiceSpell(this.actor, item);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onTemporalMishap() {
    return rollTemporalMishap(this.actor);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onRecharge(event, target) {
    return this.#itemFromEvent(target)?.update({ "system.charged": true });
  }

  /** @this {PalladiumCharacterSheet} */
  static #onRollSave(event, target) {
    const save = this.actor.system.saves.totals[target.dataset.save];
    return rollD20(this.actor, { label: `Save ${save.label}`, bonus: save.bonus, target: save.target });
  }

  /** @this {PalladiumCharacterSheet} */
  static #onRollComa() {
    return rollSaveVsComa(this.actor);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onRollAttribute(event, target) {
    return rollAttribute(this.actor, target.dataset.key);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onRollInfluence(event, target) {
    const { label, target: chance } = target.dataset;
    return rollPercent(this.actor, { label, target: Number(chance), skill: false });
  }

  /** Get the owned item for a clicked list row. */
  #itemFromEvent(target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    return this.actor.items.get(id);
  }

  /** @this {PalladiumCharacterSheet} */
  static async #onItemCreate(event, target) {
    const { type, weaponType, training, armorType } = target.dataset;
    const system = {};
    if ( weaponType ) system.weaponType = weaponType;
    if ( training ) system.training = training;
    if ( armorType ) system.armorType = armorType;
    const label = game.i18n.localize(CONFIG.Item.typeLabels[type]);
    const [item] = await this.actor.createEmbeddedDocuments("Item", [{ name: `New ${label}`, type, system }]);
    item?.sheet.render({ force: true });
  }

  /** @this {PalladiumCharacterSheet} */
  static #onItemEdit(event, target) {
    this.#itemFromEvent(target)?.sheet.render({ force: true });
  }

  /** @this {PalladiumCharacterSheet} */
  static #onItemDelete(event, target) {
    return this.#itemFromEvent(target)?.deleteDialog();
  }

  /** @this {PalladiumCharacterSheet} */
  static #onItemEquip(event, target) {
    const item = this.#itemFromEvent(target);
    if ( !item ) return;
    const updates = [{ _id: item.id, "system.equipped": !item.system.equipped }];
    // Only one body armor and one shield can be worn at a time.
    if ( (item.type === "armor") && !item.system.equipped ) {
      for ( const other of this.actor.items ) {
        if ( (other.type === "armor") && (other !== item) && other.system.equipped
          && (other.system.armorType === item.system.armorType) ) updates.push({ _id: other.id, "system.equipped": false });
      }
    }
    return this.actor.updateEmbeddedDocuments("Item", updates);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onRollSkill(event, target) {
    const item = this.#itemFromEvent(target);
    if ( item ) return rollSkill(this.actor, item, target.dataset.secondary === "true");
  }

  /** @this {PalladiumCharacterSheet} */
  static #onRollAttack(event, target) {
    const item = this.#itemFromEvent(target);
    if ( item ) return rollAttack(this.actor, item, target.dataset.mode || "aimed");
  }

  /** @this {PalladiumCharacterSheet} */
  static #onRollDamage(event, target) {
    const item = this.#itemFromEvent(target);
    if ( item ) return rollDamage(this.actor, item, { mode: target.dataset.mode || "aimed" });
  }

  /** @this {PalladiumCharacterSheet} */
  static #onBuyOption(event, target) {
    return setOptionPurchased(this.actor, target.dataset.optionId, target.checked);
  }

  /** @this {PalladiumCharacterSheet} */
  static async #onRemoveAnimal() {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Remove Animal" },
      content: "<p>Remove this animal and every ability or natural weapon bought from it?</p>"
    });
    if ( ok ) return removeAnimal(this.actor);
  }

  /* -------------------------------------------- */
  /*  Drag and Drop                               */
  /* -------------------------------------------- */

  /**
   * Animals and backgrounds are singletons that also set up the character.
   * @override
   */
  async _onDropItem(event, item) {
    if ( !this.actor.isOwner ) return null;
    if ( item.parent === this.actor ) return super._onDropItem(event, item);
    if ( item.type === "animal" ) return applyAnimal(this.actor, item.toObject());
    if ( item.type === "background" ) return applyBackground(this.actor, item.toObject());
    return super._onDropItem(event, item);
  }

  /** @this {PalladiumCharacterSheet} */
  static #onChangeSize(event, target) {
    const delta = Number(target.dataset.delta);
    const size = Math.clamp(this.actor.system.mutation.sizeLevel + delta, 1, CONFIG.PALLADIUM.MAX_SIZE_LEVEL);
    return this.actor.update({ "system.mutation.sizeLevel": size });
  }
}
