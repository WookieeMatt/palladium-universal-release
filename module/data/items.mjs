
const {
  ArrayField, BooleanField, HTMLField, NumberField, SchemaField, StringField
} = foundry.data.fields;

/* -------------------------------------------- */
/*  Field helpers                               */
/* -------------------------------------------- */

const intField = (initial = 0, options = {}) => new NumberField({
  required: true, nullable: false, integer: true, initial, ...options
});
const textField = (initial = "") => new StringField({ required: true, blank: true, initial });
const choiceField = (choices, initial) => new StringField({ required: true, initial, choices });

/**
 * A list of bonuses an item grants to its owner. Formulas may contain dice (e.g. "1D6" SDC from
 * Climbing); dice are rolled once when the item is added to an actor and the result is kept in
 * `value`. Targets:
 *   attributes.<iq|me|ma|ps|pp|pe|pb|spd>, bioe (bonus Bio-E points), sdc, sdc.doubleSize (any value > 0 doubles the Size Level S.D.C.),
 *   combat.<strike|parry|dodge|damage|rollImpact|pullPunch|actions|initiative|disarm>,
 *   weapon.<strike|parry|damage> (only with weapons whose proficiency group matches `group`),
 *   skill (adds % to the skill named in `group`), skills.all (% to every skill),
 *   handheld.<strike|parry> (with hand-held, non-natural weapons),
 *   attributes.<key>.halve (any value > 0 halves that attribute, e.g. featureless Looks: P.B. halved)
 */
const effectsField = () => new ArrayField(new SchemaField({
  target: textField(),
  formula: textField(),
  value: new NumberField({ required: true, nullable: true, integer: true, initial: null }),
  group: textField()
}));

/* -------------------------------------------- */
/*  Base                                        */
/* -------------------------------------------- */

/** Dice written in text: "2D6+6", "1D4", "3D6×$100", "1D%". */
const DICE_PATTERN = /\d+\s*[dD]\s*(?:\d+|%)(?:\s*[×x*]\s*\$?\s*\d[\d,]*)?(?:\s*[+\-−]\s*\d+(?:\s*[dD]\s*\d+)?)*/g;

/**
 * Turn written dice into a Foundry formula: "2D6+6" → "2d6+6", "3D6×$100" → "3d6*100", "1D%" → "1d100".
 * @param {string} text
 * @returns {string}
 */
export function diceFormula(text) {
  return String(text).replace(/\s+/g, "").replace(/[dD]%/g, "d100").replace(/[dD]/g, "d")
    .replace(/[×x]\$?/g, "*").replace(/\$/g, "").replace(/,/g, "").replace(/−/g, "-");
}

/**
 * Mark the dice written in some HTML as Foundry inline rolls ("2D6+6" → "[[/r 2d6+6]]{2D6+6}"), so
 * enriching the HTML turns them into clickable dice. Tags and existing inline rolls are left alone.
 * @param {string} html
 * @returns {string}
 */
export function inlineDice(html) {
  return String(html ?? "").split(/(<[^>]+>|\[\[.*?\]\](?:\{[^}]*\})?)/g).map((part, i) => {
    if ( i % 2 ) return part;   // a tag or an existing inline roll
    return part.replace(DICE_PATTERN, match => `[[/r ${diceFormula(match)}]]{${match.trim()}}`);
  }).join("");
}

class ItemDataBase extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: true, blank: true }),
      source: textField(),   // book & page reference
      // An optional roll for the item (e.g. a smoke grenade's 1D6 melee rounds). Blank: dice written in
      // the description are offered instead.
      itemRoll: new SchemaField({ formula: textField(), label: textField() })
    };
  }

  /**
   * The rolls this item offers on the character sheet: its own Roll field first (with its label), then
   * each other dice expression in its description, labelled with the sentence it appears in.
   * @returns {Array<{label: string, formula: string, text: string}>}
   */
  get itemRolls() {
    const own = this.itemRoll;
    const rolls = [];
    if ( own?.formula?.trim() ) {
      rolls.push({ label: own.label || "Roll", formula: diceFormula(own.formula), text: own.formula });
    }
    const plain = String(this.description ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
    for ( const match of plain.matchAll(DICE_PATTERN) ) {
      const formula = diceFormula(match[0]);
      if ( rolls.some(r => r.formula === formula) ) continue;
      const start = Math.max(plain.lastIndexOf(".", match.index) + 1, match.index - 60);
      const endDot = plain.indexOf(".", match.index + match[0].length);
      const end = Math.min(endDot === -1 ? plain.length : endDot, match.index + match[0].length + 50);
      rolls.push({ label: match[0].replace(/\s+/g, ""), formula, text: plain.slice(start, end).trim() });
    }
    return rolls;
  }

  /**
   * Roll any dice in effect formulas once, when the item is added to an actor.
   * @override
   */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;
    if ( !("effects" in this) || !this.parent?.parent ) return;
    const effects = this.effects.map(e => ({ ...e }));
    let changed = false;
    for ( const effect of effects ) {
      if ( (effect.value !== null) || !effect.formula ) continue;
      const roll = await new Roll(effect.formula).evaluate();
      effect.value = roll.total;
      changed = true;
    }
    if ( changed ) this.updateSource({ effects });
  }

  /**
   * The numeric value of an effect: the rolled value, or the formula if it has no dice.
   * @param {object} effect
   */
  static effectValue(effect) {
    if ( effect.value !== null ) return effect.value;
    const n = Number(effect.formula);
    return Number.isFinite(n) ? n : 0;
  }
}

/* -------------------------------------------- */
/*  Skill (p.54–61)                             */
/* -------------------------------------------- */

export const SKILL_CATEGORIES = {
  communications: "Communications", domestic: "Domestic", electrical: "Electrical", espionage: "Espionage",
  mechanical: "Mechanical", medical: "Medical", military: "Military", physical: "Physical",
  piloting: "Piloting", science: "Science", technical: "Technical", other: "Other"
};

export class SkillData extends ItemDataBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: choiceField(Object.keys(SKILL_CATEGORIES), "other"),
      training: choiceField(["professional", "amateur"], "professional"),
      base: intField(0, { min: 0 }),
      perLevel: intField(5, { min: 0 }),
      label2: textField(),              // e.g. "Treat" for Medical Doctor, "Jumping" for Acrobatics
      base2: new NumberField({ required: true, nullable: true, integer: true, initial: null }),
      levelAcquired: intField(1, { min: 1, max: 15 }),
      bonus: intField(),                // misc %, e.g. origin "+20%" or Team Characters levels
      passive: new BooleanField(),      // physical skills with no percentile roll
      requires: textField(),
      effects: effectsField()
    };
  }

  /**
   * Calculate the skill percentages for its owner.
   * @param {object} actorSystem   The owner's system data (with derived bonuses)
   * @param {number} [extra=0]     Extra % from other items' skill effects
   */
  percentages(actorSystem, extra = 0) {
    const level = actorSystem.identity.level;
    const progress = this.perLevel * Math.max(0, level - this.levelAcquired);
    const iq = actorSystem.bonuses?.iq.iqSkill ?? 0;
    const education = this.training === "professional" ? actorSystem.identity.educationBonus : 0;
    const common = progress + iq + education + this.bonus + extra;
    return {
      primary: this.base + common,
      secondary: this.base2 === null ? null : this.base2 + common,
      breakdown: { base: this.base, level: progress, iq, education, misc: this.bonus + extra }
    };
  }
}

/* -------------------------------------------- */
/*  Weapon Proficiency (p.61–62)                */
/* -------------------------------------------- */

export const WP_KINDS = {
  ancient: "Ancient (melee)", targeting: "Targeting (ranged)", modern: "Modern (firearms)",
  paired: "Paired Weapons", shield: "Shield", blackPowder: "Black Powder"
};

/** Levels at which WPs gain another +1 (p.61). */
const WP_STEPS = [1, 4, 7, 10, 13];

export class WeaponProficiencyData extends ItemDataBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      kind: choiceField(Object.keys(WP_KINDS), "ancient"),
      group: textField(),               // e.g. "Sword", "Knife", "Handgun"; matched against weapons
      powderLock: choiceField(Object.keys(CONFIG.PALLADIUM.POWDER_WPS), "general"),   // Black Powder W.P. family
      levelAcquired: intField(1, { min: 1, max: 15 }),
      bonusLevels: intField(0, { min: 0 })
    };
  }

  /**
   * Bonuses at the owner's level.
   * @param {number} level
   */
  bonusesAt(level) {
    const effective = Math.min(15, level + this.bonusLevels - this.levelAcquired + 1);
    const steps = WP_STEPS.filter(s => effective >= s).length;
    switch ( this.kind ) {
      case "ancient":
      case "shield":
        return { strike: steps, parry: steps };
      case "targeting":
        return { rangedStrike: steps };
      case "modern":
        // +3 Aimed, +1 Burst, +0 Wild, plus +1 at levels 4, 7, 10, 13.
        return { aimed: 3 + Math.max(0, steps - 1), burst: 1 + Math.max(0, steps - 1), wild: Math.max(0, steps - 1) };
      case "blackPowder":
        // Aimed bonus by weapon family, +1 at levels 4, 7, 10, 13; Wild: no bonus (Transdimensional p.67).
        return { aimed: (CONFIG.PALLADIUM.POWDER_WPS[this.powderLock]?.aimed ?? 0) + Math.max(0, steps - 1), wild: 0 };
      default:
        return {};
    }
  }
}

/* -------------------------------------------- */
/*  Weapon (p.64–69)                            */
/* -------------------------------------------- */

export const WEAPON_TYPES = {
  melee: "Melee", thrown: "Thrown", bow: "Bow / Crossbow", firearm: "Firearm",
  energy: "Energy Weapon", natural: "Natural Weapon", explosive: "Explosive / Area", blackPowder: "Black Powder"
};

export class WeaponData extends ItemDataBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      weaponType: choiceField(Object.keys(WEAPON_TYPES), "melee"),
      proficiency: textField(),          // WP group, e.g. "Sword"
      damage: textField("1D6"),
      burstDamage: textField(),          // three-round burst damage (automatic weapons)
      range: textField(),
      twoHanded: new BooleanField(),
      strikeBonus: intField(),           // quality bonus, e.g. "Great Wind" +2
      parryBonus: intField(),
      damageBonus: intField(),
      effects: effectsField(),           // e.g. climbing claws: +20% Climbing
      ammo: new SchemaField({ value: intField(0, { min: 0 }), max: intField(0, { min: 0 }) }),
      reload: textField(),
      // Black powder weapons (Transdimensional p.61–69).
      powder: new SchemaField({
        lock: choiceField(Object.keys(CONFIG.PALLADIUM.POWDER_LOCKS), "flintlock"),
        misfire: intField(10, { min: 0, max: 100 }),
        penetration: choiceField(Object.keys(CONFIG.PALLADIUM.PENETRATION), "fair"),
        longarm: new BooleanField({ initial: true }),    // rifle/musket (else pistol)
        overload: new BooleanField()                     // deliberately overloaded with powder
      }),
      bioe: intField(0, { min: 0 }),     // Bio-E cost for natural weapons
      equipped: new BooleanField({ initial: true }),
      quantity: intField(1, { min: 0 }),
      weight: textField(),
      cost: textField()
    };
  }

  /** Is this a melee weapon (gets training, PP strike and PS damage)? */
  get isMelee() {
    return ["melee", "natural"].includes(this.weaponType);
  }

  /** Does PS and Combat Training damage apply (melee and hurled, not bows or guns; p.86)? */
  get addsStrengthDamage() {
    return ["melee", "natural", "thrown"].includes(this.weaponType);
  }

  /** Is this a black powder gun (misfires, Aimed / Wild / beyond range)? */
  get isPowder() {
    return this.weaponType === "blackPowder";
  }

  /** Does this weapon use the modern Aimed / Burst / Wild fire modes? */
  get isModern() {
    return ["firearm", "energy"].includes(this.weaponType);
  }
}

/* -------------------------------------------- */
/*  Armor & Shields (p.65, 70)                  */
/* -------------------------------------------- */

export class ArmorData extends ItemDataBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      armorType: choiceField(["body", "shield"], "body"),
      ar: intField(0, { min: 0 }),
      sdc: new SchemaField({ value: intField(0, { min: 0 }), max: intField(0, { min: 0 }) }),
      parryBonus: intField(),
      ballisticOnly: new BooleanField(),  // only stops handgun, SMG, shotgun
      penalties: textField(),
      equipped: new BooleanField(),
      weight: textField(),
      cost: textField()
    };
  }
}

/* -------------------------------------------- */
/*  Psionic Power (p.20–21)                     */
/* -------------------------------------------- */

export class PsionicData extends ItemDataBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      bioe: intField(0, { min: 0 }),
      range: textField(),
      duration: textField(),
      save: textField("Standard")
    };
  }
}

/* -------------------------------------------- */
/*  Spell (Transdimensional p.41–52)            */
/* -------------------------------------------- */

export class SpellData extends ItemDataBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      tradition: choiceField(["wizard", "timeLord"], "wizard"),
      selections: intField(1, { min: 1, max: 3 }),     // counts as 1–3 spells learned
      range: textField(),
      duration: textField(),
      saveType: choiceField(["none", "standard", "special", "dodge"], "standard"),
      save: textField(),                                // wording of a special save
      dodgeTarget: intField(18, { min: 1, max: 30 }),   // Dodge-only spells: roll this or higher
      damage: textField(),                              // formula; @level = caster level, e.g. "@levelD6"
      offensive: new BooleanField(),                    // strictly offensive (*)
      mastered: new BooleanField({ initial: true }),    // Time Lord spells need two complete successes
      successes: intField(0, { min: 0 })                // complete successes while practicing
    };
  }

  /** The damage formula with the caster's level filled in ("@levelD6" at level 3 → "3D6"). */
  damageFormula(level) {
    return this.damage.replace(/@level/gi, String(level));
  }
}

/* -------------------------------------------- */
/*  Animal Ability (p.22–23)                    */
/* -------------------------------------------- */

export class AbilityData extends ItemDataBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      bioe: intField(0, { min: 0 }),
      naturalAR: intField(0, { min: 0 }),  // Natural Armor: A.R. granted
      effects: effectsField()
    };
  }
}

/* -------------------------------------------- */
/*  Gear                                        */
/* -------------------------------------------- */

export class GearData extends ItemDataBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: intField(1, { min: 0 }),
      weight: textField(),
      cost: textField()
    };
  }
}

/* -------------------------------------------- */
/*  Animal (p.24–50)                            */
/* -------------------------------------------- */

/**
 * Costs for one Human Feature, as listed in an animal's entry. Levels below the automatic one may
 * have negative costs (Bio-E gained), e.g. Human: Hands auto Full, Partial −15, None −30.
 */
const animalFeatureField = () => new SchemaField({
  auto: choiceField(["none", "partial", "full"], "none"),   // level granted for free
  none: intField(0),
  partial: intField(5),
  full: intField(10),
  fullAvailable: new BooleanField({ initial: true }),
  // Penalties or bonuses while the character has this feature at Partial or None.
  partialEffects: effectsField(),
  noneEffects: effectsField()
});

export class AnimalData extends ItemDataBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      bioe: intField(0, { min: 0 }),
      sizeLevel: intField(6, { min: 1, max: 25 }),
      build: choiceField(["short", "medium", "long"], "medium"),
      length: textField(),
      weight: textField(),
      features: new SchemaField({
        hands: animalFeatureField(),
        biped: animalFeatureField(),
        speech: animalFeatureField(),
        looks: animalFeatureField()
      }),
      // Attribute bonuses and anything else the mutation grants (applied while the animal is owned).
      effects: effectsField(),
      // Purchasable abilities and natural weapons.
      options: new ArrayField(new SchemaField({
        id: textField(),
        name: textField(),
        kind: choiceField(["ability", "weapon"], "ability"),
        bioe: intField(0, { min: 0 }),
        damage: textField(),
        choiceGroup: textField(),     // options sharing a group are alternatives (buy one)
        naturalAR: intField(0, { min: 0 }),
        effects: effectsField(),
        notes: textField()
      }))
    };
  }

  /** @override */
  static migrateData(source) {
    // Give every option a stable id.
    for ( const option of source.options ?? [] ) option.id ||= foundry.utils.randomID();
    return super.migrateData(source);
  }
}

/* -------------------------------------------- */
/*  Background: Origin, Creator, Education      */
/* -------------------------------------------- */

export const BACKGROUND_KINDS = {
  origin: "Mutant Animal Origin",
  creator: "Creator Organization",
  education: "Education / Background"
};

export class BackgroundData extends ItemDataBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      kind: choiceField(Object.keys(BACKGROUND_KINDS), "education"),
      roll: textField(),                 // percentile range on its table, e.g. "41–90"
      educationBonus: intField(),
      professionalSkills: textField(),   // e.g. "10 at +20%"
      amateurSkills: textField(),
      combatTraining: textField(),       // e.g. "ninjutsu" if granted
      equipment: textField(),
      money: textField(),                // e.g. "3D6×$1,000"
      hunted: textField(),
      effects: effectsField()
    };
  }
}

/* -------------------------------------------- */
/*  Device (Transdimensional p.52–54)           */
/* -------------------------------------------- */

export class DeviceData extends ItemDataBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      deviceType: choiceField(["timeMachine", "crossDimensional", "readout", "other"], "timeMachine"),
      skill: textField(),                // operator skill name, e.g. "Pilot Time Machine"
      skillBonus: intField(),            // readout devices: +% to operate the assisted device type
      assists: choiceField(["timeMachine", "crossDimensional"], "timeMachine"),
      recharge: textField(),
      maxArea: textField(),
      malfunction: new HTMLField({ required: true, blank: true }),   // what happens on a failed operation roll (rich text)
      malfunctionTable: choiceField(["none", "temporal", "gateway", "portable", "miniature"], "none"),
      charged: new BooleanField({ initial: true }),
      weight: textField(),
      cost: textField()
    };
  }

  /** @override */
  static migrateData(source) {
    // 1.7.0: the malfunction text became rich text.
    const text = source.malfunction;
    if ( (typeof text === "string") && text.trim() && !/<[a-z][\s\S]*>/i.test(text) ) {
      source.malfunction = text.split(/\r?\n/).filter(l => l.trim())
        .map(l => `<p>${l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`).join("");
    }
    return super.migrateData(source);
  }
}

/* -------------------------------------------- */
/*  Installation cost record (Transdimensional p.56) */
/* -------------------------------------------- */

export class InstallationData extends ItemDataBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      device: textField(),                                   // e.g. "Portable Time Machine"
      vehicleClass: choiceField(["truckVan", "compactSports", "midSize", "motorcycle", "aircraft", "watercraft", "any"], "truckVan"),
      available: new BooleanField({ initial: true }),         // "Not available" for this vehicle class
      cost: textField()
    };
  }
}

/* -------------------------------------------- */
/*  Vehicle modification (Transdimensional p.56–59) */
/* -------------------------------------------- */

export class VehicleModData extends ItemDataBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: choiceField(["armor", "equipment", "capability", "accessory"], "equipment"),
      location: choiceField(["none", "hull", "crew", "engine", "fuel", "turret"], "none"),  // armor installs here
      ar: intField(0, { min: 0 }),
      sdc: intField(0, { min: 0 }),
      sdcBonus: intField(),            // e.g. Ram-Prow +75 S.D.C.
      controlBonus: intField(),        // e.g. Vehicle Active Suspension +15%
      speed: textField(),              // e.g. "Speed Class 5 (hover)"
      effect: textField(),             // short summary shown on the vehicle
      weight: textField(),
      cost: textField()
    };
  }
}

export const ITEM_MODELS = {
  skill: SkillData,
  wp: WeaponProficiencyData,
  weapon: WeaponData,
  armor: ArmorData,
  psionic: PsionicData,
  spell: SpellData,
  ability: AbilityData,
  gear: GearData,
  animal: AnimalData,
  background: BackgroundData,
  device: DeviceData,
  installation: InstallationData,
  vehicleMod: VehicleModData
};

export { ItemDataBase };
