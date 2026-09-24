
const {
  BooleanField, HTMLField, NumberField, SchemaField, StringField
} = foundry.data.fields;

/** An effect's numeric value: the rolled value, or its formula if it has no dice. */
function effectValue(effect) {
  if ( effect.value !== null && effect.value !== undefined ) return effect.value;
  const n = Number(effect.formula);
  return Number.isFinite(n) ? n : 0;
}

/* -------------------------------------------- */
/*  Field helpers                               */
/* -------------------------------------------- */

/** A whole-number field defaulting to 0 (or the given initial value). */
const intField = (initial = 0, options = {}) => new NumberField({
  required: true, nullable: false, integer: true, initial, ...options
});

/** A whole-number field that may be left blank. */
const optionalInt = () => new NumberField({ required: true, nullable: true, integer: true, initial: null });

/** A plain text field. */
const textField = () => new StringField({ required: true, blank: true, initial: "" });

/** A current/max resource pool, usable as a token bar. */
const resourceField = () => new SchemaField({
  value: intField(),
  max: intField()
});

/** A rolled attribute plus a manual modifier. Blank until the player enters a value. */
const attributeField = () => new SchemaField({
  value: optionalInt(),
  mod: intField()
});

/**
 * A Human Feature purchase with its animal-specific costs, relative to the animal's automatic level.
 * Levels below the automatic one have negative costs: they GAIN Bio-E (e.g. a mutant human giving up
 * Full Hands, Transdimensional p.11).
 */
const featureField = () => new SchemaField({
  level: new StringField({ required: true, initial: "none", choices: ["none", "partial", "full"] }),
  noneCost: intField(0),
  partialCost: intField(5),
  fullCost: intField(10),
  fullAvailable: new BooleanField({ initial: true })
});

/** Manual modifiers for combat values, added on top of everything calculated. */
const combatMods = () => new SchemaField({
  actions: intField(),
  initiative: intField(),
  strike: intField(),
  parry: intField(),
  dodge: intField(),
  damage: intField(),
  rollImpact: intField(),
  pullPunch: intField(),
  disarm: intField()
});

/* -------------------------------------------- */

/**
 * Data model for the "character" Actor type (TMNT & Other Strangeness rules).
 */
export default class CharacterData extends foundry.abstract.TypeDataModel {

  /** @override */
  static defineSchema() {
    return {
      identity: new SchemaField({
        alignment: textField(),
        level: intField(1, { min: 1, max: 15 }),
        xp: intField(0, { min: 0 }),
        classType: textField(),
        species: textField(),
        origin: textField(),
        education: textField(),
        educationBonus: intField(),
        age: textField(),
        sex: textField(),
        height: textField(),
        weight: textField(),
        campaign: textField()
      }),

      attributes: new SchemaField(Object.fromEntries(
        Object.keys(CONFIG.PALLADIUM.ATTRIBUTES).map(key => [key, attributeField()])
      )),

      mutation: new SchemaField({
        bioeTotal: intField(0, { min: 0 }),
        originalSizeLevel: intField(6, { min: 1, max: CONFIG.PALLADIUM.MAX_SIZE_LEVEL }),
        sizeLevel: intField(6, { min: 1, max: CONFIG.PALLADIUM.MAX_SIZE_LEVEL }),
        applySizeModifiers: new BooleanField({ initial: true }),
        build: new StringField({ required: true, initial: "medium", choices: ["short", "medium", "long"] }),
        features: new SchemaField(Object.fromEntries(
          Object.keys(CONFIG.PALLADIUM.HUMAN_FEATURES).map(key => [key, featureField()])
        )),
        // Bio-E spent on purchases not yet tracked as items.
        spentAbilities: intField(0, { min: 0 }),
        spentWeapons: intField(0, { min: 0 }),
        spentPsionics: intField(0, { min: 0 }),
        // T.E. evolution (+) or devolution (−) in Bio-E points from time travel (Transdimensional p.33).
        teDrift: intField(),
        abilities: textField(),
        naturalWeapons: textField(),
        notes: textField()
      }),

      health: new SchemaField({
        hp: resourceField(),
        sdc: new SchemaField({
          value: intField(),
          bonus: intField()   // SDC from physical skills, abilities, etc.
        }),
        naturalArmor: new SchemaField({
          ar: intField(0, { min: 0 })   // Natural Armor S.D.C. counts in the character's S.D.C. (TMNT: 126)
        }),
        armor: new SchemaField({
          name: textField(),
          ar: intField(0, { min: 0 }),
          sdc: resourceField()
        }),
        mdc: resourceField(),
        forceField: resourceField()
      }),

      combat: new SchemaField({
        training: new StringField({ required: true, initial: "none" }),
        bonusLevels: intField(0, { min: 0 }),   // Team Characters skill-level bonus
        mod: combatMods(),
        actionsUsed: intField(0, { min: 0 }),   // actions spent this round (reset each round)
        // Temporary situational modifiers (cover, darkness, a +5 Hold after a Tackle...).
        circ: new SchemaField(Object.fromEntries(Object.keys(CONFIG.PALLADIUM.CIRCUMSTANCES).map(key => [key, intField()])))
      }),

      saves: new SchemaField({
        isPsychic: new BooleanField(),
        mod: new SchemaField(Object.fromEntries([...Object.keys(CONFIG.PALLADIUM.SAVES), "change"].map(key => [key, intField()])))
      }),

      skills: textField(),
      gear: textField(),

      toggles: new SchemaField({
        useMdc: new BooleanField(),
        useMagic: new BooleanField(),
        usePsionics: new BooleanField(),
        useMutations: new BooleanField({ initial: true }),
        useSuperPowers: new BooleanField(),
        useMecha: new BooleanField(),
        useSurvivalHorror: new BooleanField()
      }),

      magic: new SchemaField({
        tradition: new StringField({ required: true, initial: "none", choices: Object.keys(CONFIG.PALLADIUM.MAGIC_TRADITIONS) }),
        payBioE: new BooleanField({ initial: true }),   // the tradition was bought as a background option
        spellsUsed: intField(0, { min: 0 }),            // spells cast since the last new day
        mod: new SchemaField({ strength: intField(), spellsPerDay: intField(), spellsPerMelee: intField() }),
        ppe: resourceField(),
        spellStrength: textField(),
        spells: textField()
      }),

      psionics: new SchemaField({
        isp: resourceField(),
        powers: textField()
      }),

      superPowers: new SchemaField({
        category: textField(),
        powers: textField(),
        weaknesses: textField()
      }),

      mecha: new SchemaField({
        name: textField(),
        mdcByLocation: textField(),
        weaponSystems: textField(),
        speed: textField(),
        handling: textField()
      }),

      survival: new SchemaField({
        infectionLevel: textField(),
        supplies: textField(),
        insanityEffects: textField()
      }),

      notes: new HTMLField({ required: true, blank: true })
    };
  }

  /* -------------------------------------------- */
  /*  Migration                                   */
  /* -------------------------------------------- */

  /** @override */
  static migrateData(source) {
    // v0.2.0 sheet saved Initiative/Strike/Parry/Dodge under system.derived by mistake.
    const legacy = source.derived;
    if ( legacy && (typeof legacy === "object") ) {
      source.combat ??= {};
      for ( const key of ["initiative", "strike", "parry", "dodge"] ) {
        if ( (legacy[key] !== undefined) && (legacy[key] !== "") && (source.combat[key] === undefined) ) {
          source.combat[key] = legacy[key];
        }
      }
    }

    // v0.3.0 stored combat values as flat numbers; they become manual modifiers.
    const combat = source.combat;
    if ( combat && !combat.mod ) {
      const map = {
        initiative: "initiative", attacksPerMelee: "actions", strike: "strike", parry: "parry", dodge: "dodge",
        damageBonus: "damage", rollImpact: "rollImpact", pullPunch: "pullPunch", disarm: "disarm"
      };
      const mod = {};
      for ( const [from, to] of Object.entries(map) ) {
        const v = Number(combat[from]);
        if ( Number.isFinite(v) && v ) mod[to] = v;
      }
      combat.mod = mod;
    }

    // v0.3.0 saves were flat numbers; horror becomes strangeness, poison becomes toxin.
    const saves = source.saves;
    if ( saves && !saves.mod ) {
      const map = { magic: "magic", psionics: "psionics", poison: "toxin", horror: "strangeness" };
      const mod = {};
      for ( const [from, to] of Object.entries(map) ) {
        const v = Number(saves[from]);
        if ( Number.isFinite(v) && v ) mod[to] = v;
      }
      saves.mod = mod;
    }

    // v0.3.0 kept Bio-E under system.mutations.
    const old = source.mutations;
    if ( old && !source.mutation ) {
      source.mutation = {
        bioeTotal: Number(old.bioeTotal) || 0,
        abilities: old.mutations ?? ""
      };
      source.identity ??= {};
      if ( old.animalType && !source.identity.species ) source.identity.species = old.animalType;
    }

    // v0.3.0 stored SDC as value/max; max is now calculated.
    const sdc = source.health?.sdc;
    if ( sdc && ("max" in sdc) && !("bonus" in sdc) ) delete sdc.max;

    // v0.4.0 tracked Natural Armor S.D.C. separately; the book counts it in the character's S.D.C.
    const nat = source.health?.naturalArmor;
    if ( nat?.sdc && (typeof nat.sdc === "object") ) {
      source.health.sdc ??= {};
      source.health.sdc.bonus = (Number(source.health.sdc.bonus) || 0) + (Number(nat.sdc.max) || 0);
      delete nat.sdc;
    }

    // v0.3.0 armor was a text description.
    if ( typeof source.health?.armor === "string" ) source.health.armor = { name: source.health.armor };

    // Blank or out-of-range levels from older data.
    if ( source.identity && ("level" in source.identity) ) {
      const level = Number(source.identity.level);
      source.identity.level = Number.isFinite(level) ? Math.clamp(Math.round(level), 1, 15) : 1;
    }

    return super.migrateData(source);
  }

  /* -------------------------------------------- */
  /*  Derived Data                                */
  /* -------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    this.#prepareItemEffects();
    this.#prepareSize();
    this.#prepareAttributes();
    this.#prepareBioE();
    this.#prepareHealth();
    this.#prepareCombat();
    this.#prepareMagic();
    this.#prepareSaves();
    this.#prepareProgress();
  }

  /* -------------------------------------------- */

  /**
   * Total the bonuses granted by owned items (physical skills, animal abilities...).
   * Weapon- and skill-specific effects are kept aside for rolls and skill totals.
   */
  #prepareItemEffects() {
    const totals = {};
    const conditional = [];
    const add = (effect, source) => {
      if ( !effect.target ) return;
      const value = effectValue(effect);
      if ( effect.target.startsWith("weapon.") || (effect.target === "skill") ) conditional.push({ ...effect, value, source });
      else totals[effect.target] = (totals[effect.target] ?? 0) + value;
    };
    const items = this.parent?.items ?? [];
    for ( const item of items ) {
      for ( const effect of item.system.effects ?? [] ) add(effect, item.name);
    }

    // Human Features below Full: the animal's listed effects for that level, else the Redux defaults.
    const animal = items.find(i => i.type === "animal");
    const featureEffects = [];
    for ( const [key, f] of Object.entries(this.mutation.features) ) {
      if ( f.level === "full" ) continue;
      const listed = animal?.system.features[key]?.[`${f.level}Effects`] ?? [];
      const effects = listed.length ? listed : (CONFIG.PALLADIUM.DEFAULT_FEATURE_EFFECTS[key]?.[f.level] ?? []);
      const source = `${CONFIG.PALLADIUM.HUMAN_FEATURES[key]} (${f.level})`;
      for ( const effect of effects ) {
        add(effect, source);
        if ( effect.target ) featureEffects.push({ source, target: effect.target, value: effectValue(effect) });
      }
    }
    this.itemEffects = { totals, conditional, features: featureEffects };
  }

  /** Sum of item effects for a target key. */
  #effect(target) {
    return this.itemEffects.totals[target] ?? 0;
  }

  /* -------------------------------------------- */

  #prepareSize() {
    const m = this.mutation;
    m.size = CONFIG.PALLADIUM.SIZE_LEVELS[m.sizeLevel] ?? CONFIG.PALLADIUM.SIZE_LEVELS[6];
  }

  /* -------------------------------------------- */

  #prepareAttributes() {
    const size = this.mutation.size;
    const applySize = this.mutation.applySizeModifiers;
    for ( const [key, attr] of Object.entries(this.attributes) ) {
      attr.sizeMod = (applySize && (key in size)) ? size[key] : 0;
      attr.itemMod = this.#effect(`attributes.${key}`);
      attr.total = attr.value === null ? null : Math.max(0, attr.value + attr.sizeMod + attr.itemMod + attr.mod);
      attr.halved = this.#effect(`attributes.${key}.halve`) > 0;
      if ( attr.halved && (attr.total !== null) ) attr.total = Math.floor(attr.total / 2);
    }
    const a = this.attributes;
    this.bonuses = {
      iq: CONFIG.PALLADIUM.attributeBonuses(a.iq.total),
      me: CONFIG.PALLADIUM.attributeBonuses(a.me.total),
      ma: CONFIG.PALLADIUM.attributeBonuses(a.ma.total),
      ps: CONFIG.PALLADIUM.attributeBonuses(a.ps.total),
      pp: CONFIG.PALLADIUM.attributeBonuses(a.pp.total),
      pe: CONFIG.PALLADIUM.attributeBonuses(a.pe.total),
      pb: CONFIG.PALLADIUM.attributeBonuses(a.pb.total)
    };
    this.movement = CONFIG.PALLADIUM.movement(a.spd.total);
    this.carry = CONFIG.PALLADIUM.carryLift(a.ps.total);
  }

  /* -------------------------------------------- */

  #prepareBioE() {
    const m = this.mutation;
    const sizeCost = (m.sizeLevel - m.originalSizeLevel) * CONFIG.PALLADIUM.BIOE_PER_SIZE_LEVEL;
    let featureCost = 0;
    for ( const f of Object.values(m.features) ) {
      f.cost = f.level === "full" ? f.fullCost : f.level === "partial" ? f.partialCost : f.noneCost;
      featureCost += f.cost;
    }
    // Bio-E spent on owned items, plus any manual entries.
    const items = this.parent?.items ?? [];
    const itemBioE = type => items.filter(i => i.type === type).reduce((n, i) => n + (i.system.bioe ?? 0), 0);
    const abilities = m.spentAbilities + itemBioE("ability");
    const weapons = m.spentWeapons + items.filter(i => (i.type === "weapon") && (i.system.weaponType === "natural"))
      .reduce((n, i) => n + i.system.bioe, 0);
    const psionics = m.spentPsionics + itemBioE("psionic");
    // Apprentice Wizard / Time Lord options cost Bio-E (Transdimensional p.7–9).
    const mg = this.magic;
    const magic = mg.payBioE ? (CONFIG.PALLADIUM.MAGIC_TRADITIONS[mg.tradition]?.bioe ?? 0) : 0;
    const spent = sizeCost + featureCost + abilities + weapons + psionics + magic;
    const bonus = this.#effect("bioe");   // e.g. a background's "+10 Bio-E"
    m.bioe = {
      total: m.bioeTotal + m.teDrift + bonus,
      te: m.teDrift,
      bonus,
      size: sizeCost,
      features: featureCost,
      abilities,
      weapons,
      psionics,
      magic,
      spent,
      remaining: m.bioeTotal + m.teDrift + bonus - spent
    };
  }

  /* -------------------------------------------- */

  #prepareHealth() {
    const h = this.health;
    const items = this.parent?.items ?? [];
    // Extraordinary P.E. (Transdimensional p.17) doubles the Size Level S.D.C. (not skill S.D.C.).
    h.sdc.doubled = this.#effect("sdc.doubleSize") > 0;
    h.sdc.base = this.mutation.size.sdc * (h.sdc.doubled ? 2 : 1);
    h.sdc.items = this.#effect("sdc");
    h.sdc.max = h.sdc.base + h.sdc.items + h.sdc.bonus;

    // Natural Armor A.R. from abilities (highest wins) or the manual value.
    const abilityAR = Math.max(0, ...items.filter(i => i.type === "ability").map(i => i.system.naturalAR));
    h.naturalArmor.total = Math.max(h.naturalArmor.ar, abilityAR);

    // An equipped body armor item takes the place of the manual armor fields.
    const worn = items.find(i => (i.type === "armor") && (i.system.armorType === "body") && i.system.equipped);
    h.armor.item = worn ?? null;
    h.armor.active = worn
      ? { name: worn.name, ar: worn.system.ar, sdc: worn.system.sdc, ballisticOnly: worn.system.ballisticOnly }
      : { name: h.armor.name, ar: h.armor.ar, sdc: h.armor.sdc, ballisticOnly: false };
    const shield = items.find(i => (i.type === "armor") && (i.system.armorType === "shield") && i.system.equipped);
    h.shield = shield ?? null;

    // Coma and death thresholds (p.92): coma at 0 HP, death below −PE.
    const pe = this.attributes.pe.total ?? 0;
    h.deathThreshold = -pe;
    h.comaHours = pe;
    h.inComa = h.hp.value <= 0 && h.hp.max > 0;
    h.bleedingOut = h.hp.max > 0 && h.hp.value > 0 && h.hp.value <= Math.floor(h.hp.max * 0.25);
  }

  /* -------------------------------------------- */

  #prepareCombat() {
    const c = this.combat;
    const effectiveLevel = Math.min(15, this.identity.level + c.bonusLevels);
    const training = CONFIG.PALLADIUM.combatTrainingAt(c.training, effectiveLevel);
    const pp = this.bonuses.pp.ppCombat;
    const ps = this.bonuses.ps.psDamage;
    const mod = c.mod;
    const shieldParry = this.health.shield?.system.parryBonus ?? 0;
    c.effectiveLevel = effectiveLevel;
    c.trainingData = training;
    c.critRange = Math.clamp(training.critAll - c.circ.critical, 2, 20);

    // Conditions from token status effects.
    const statuses = this.parent?.statuses ?? new Set();
    const active = Object.keys(CONFIG.PALLADIUM.CONDITIONS).filter(id => statuses.has(id));
    const condMods = {};
    for ( const id of active ) {
      for ( const [key, value] of Object.entries(CONFIG.PALLADIUM.CONDITIONS[id].mods ?? {}) ) condMods[key] = (condMods[key] ?? 0) + value;
    }
    const stunned = active.includes("stunned");
    c.conditions = {
      active, mods: condMods, stunned,
      noDefense: active.filter(id => CONFIG.PALLADIUM.CONDITIONS[id].noDefense).map(id => CONFIG.PALLADIUM.CONDITIONS[id].label)
    };

    // Each total = training + attribute + skills/abilities + misc, then circumstances and conditions.
    // [training part, attribute part, circumstance/condition key]
    const parts = {
      actions: [training.actions, 0, "actions"],
      initiative: [training.init, 0, "initiative"],
      strike: [training.strike, pp, "strike"],
      parry: [training.parry, pp, "parry"],
      dodge: [training.dodge, pp, "dodge"],
      damage: [training.damage, ps, "damage"],
      rollImpact: [training.rwi, 0, "rollImpact"],
      pullPunch: [0, 0, null],
      disarm: [training.strike, pp, "strike"]
    };
    c.totals = {};
    c.breakdown = {};
    c.rollBreakdown = {};
    for ( const [key, [trainingPart, attribute, sit]] of Object.entries(parts) ) {
      const skills = this.#effect(`combat.${key}`) + ((key === "parry") ? shieldParry : 0);
      const circ = sit ? c.circ[sit] : 0;
      const conditions = sit ? (condMods[sit] ?? 0) : 0;
      const breakdown = { training: trainingPart, attribute, skills, mod: mod[key], circ, conditions };
      c.breakdown[key] = breakdown;
      // Stunned (p.90): actions reduced to 1 and no combat bonuses.
      if ( stunned && (key === "actions") ) {
        c.totals[key] = 1;
        c.rollBreakdown[key] = { stunned: 1 };
      }
      else if ( stunned ) {
        c.totals[key] = circ + conditions;
        c.rollBreakdown[key] = { circ, conditions };
      }
      else {
        c.totals[key] = trainingPart + attribute + skills + mod[key] + circ + conditions;
        c.rollBreakdown[key] = breakdown;
      }
    }
    c.totals.actions = Math.max(0, c.totals.actions);
    c.actionsLeft = Math.max(0, c.totals.actions - c.actionsUsed);
  }

  /* -------------------------------------------- */

  #prepareMagic() {
    const m = this.magic;
    const level = this.identity.level;
    const p = CONFIG.PALLADIUM.magicAt(m.tradition, level);
    const items = this.parent?.items ?? [];
    const spells = items.filter(i => i.type === "spell");
    m.caster = {
      isCaster: m.tradition !== "none",
      label: CONFIG.PALLADIUM.MAGIC_TRADITIONS[m.tradition]?.label ?? "",
      spellsPerDay: Math.max(0, p.spellsPerDay + m.mod.spellsPerDay),
      spellsPerMelee: Math.max(0, p.spellsPerMelee + m.mod.spellsPerMelee),
      strengthBonus: p.strength + m.mod.strength,
      strength: CONFIG.PALLADIUM.BASE_SPELL_STRENGTH + p.strength + m.mod.strength,
      saves: { magic: p.saveSpell, circle: p.saveCircle, psionics: p.savePsionics, change: p.saveChange },
      abilities: p.abilities,
      selections: spells.reduce((n, i) => n + (i.system.selections ?? 1), 0),
      startingSelections: CONFIG.PALLADIUM.MAGIC_TRADITIONS[m.tradition]?.startingSelections ?? 0
    };
    m.caster.remaining = Math.max(0, m.caster.spellsPerDay - m.spellsUsed);
  }

  /* -------------------------------------------- */

  #prepareSaves() {
    const b = this.bonuses;
    const s = this.saves;
    const magic = this.magic.caster.saves;
    const base = {
      psionics: b.me.meSave + magic.psionics,
      strangeness: b.me.meSave,
      toxin: b.pe.peSave,
      magic: b.pe.peSave + magic.magic,
      circle: b.pe.peSave + magic.circle,
      coma: b.pe.peComa
    };
    s.totals = {};
    for ( const [key, cfg] of Object.entries(CONFIG.PALLADIUM.SAVES) ) {
      const target = (key === "psionics") && s.isPsychic ? 10 : cfg.target;
      s.totals[key] = { label: cfg.label, target, bonus: base[key] + s.mod[key] };
    }
    // Save vs T.E. Change: percentile, P.E. % bonus (Transdimensional p.33).
    s.change = { label: "vs T.E. Change", target: CONFIG.PALLADIUM.CHANGE_SAVE_TARGET, bonus: b.pe.pePercent + magic.change + s.mod.change };
  }

  /* -------------------------------------------- */

  #prepareProgress() {
    const i = this.identity;
    i.xpLevel = CONFIG.PALLADIUM.levelForXP(i.xp);
  }

  /* -------------------------------------------- */
  /*  Helpers used by the sheet and rolls         */
  /* -------------------------------------------- */

  /**
   * Skill percentages for an owned skill item, including other items' skill effects.
   * @param {Item} item
   */
  skillPercentages(item) {
    const name = item.name.toLowerCase();
    const extra = this.itemEffects.conditional
      .filter(e => (e.target === "skill") && (e.group.toLowerCase() === name))
      .reduce((n, e) => n + e.value, 0) + this.#effect("skills.all");
    return item.system.percentages(this, extra);
  }

  /**
   * The Weapon Proficiency item matching a weapon's proficiency group, if any.
   * @param {Item} weapon
   */
  proficiencyFor(weapon) {
    const items = this.parent.items;
    const group = weapon.system.proficiency.trim().toLowerCase();
    const byGroup = group ? items.find(i => (i.type === "wp") && (i.system.group.trim().toLowerCase() === group)
      && (i.system.kind !== "paired")) : null;
    if ( !weapon.system.isPowder ) return byGroup ?? null;
    // Black powder: the W.P. for the weapon's family, else a group match, else W.P. Black Powder (general).
    const powderWPs = items.filter(i => (i.type === "wp") && (i.system.kind === "blackPowder"));
    const family = CONFIG.PALLADIUM.POWDER_LOCKS[weapon.system.powder.lock]?.wp;
    return powderWPs.find(i => i.system.powderLock === family) ?? byGroup
      ?? powderWPs.find(i => i.system.powderLock === "general") ?? null;
  }

  /**
   * Bonuses from item effects that only apply to weapons of one proficiency group (e.g. Fencing).
   * @param {Item} weapon
   */
  weaponEffects(weapon) {
    const group = weapon.system.proficiency.trim().toLowerCase();
    const result = { strike: 0, parry: 0, damage: 0 };
    for ( const e of this.itemEffects.conditional ) {
      if ( !e.target.startsWith("weapon.") || (e.group.trim().toLowerCase() !== group) ) continue;
      const key = e.target.slice(7);
      if ( key in result ) result[key] += e.value;
    }
    return result;
  }
}
