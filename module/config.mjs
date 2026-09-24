/**
 * Rules data for TMNT & Other Strangeness (new edition).
 * Page references are to the printed book. See "TMNT rules digest (Claude).md".
 *
 * Every export is copied into CONFIG.PALLADIUM at init. The system reads the tables and helpers from
 * there, so modules can add to or replace them in their own "init" hook (see the wiki, "For Module Authors").
 */
import * as DEFAULTS from "./config.mjs";

/** The live rules tables: CONFIG.PALLADIUM once the system has initialized, these defaults before that. */
const cfg = () => globalThis.CONFIG?.PALLADIUM ?? DEFAULTS;

/* -------------------------------------------- */
/*  Attributes (p.12)                           */
/* -------------------------------------------- */

export const ATTRIBUTES = {
  iq: "I.Q.", me: "M.E.", ma: "M.A.", ps: "P.S.", pp: "P.P.", pe: "P.E.", pb: "P.B.", spd: "Spd"
};

/** MA and PB percentages are irregular, so they are looked up (index = attribute − 16). */
const MA_PERCENT = [40, 45, 50, 55, 60, 65, 70, 75, 80, 82, 84, 86, 88, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 99, 99];
const PB_PERCENT = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 82, 84, 86, 88, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99];

/**
 * Attribute Bonus Table (p.12). Values below 16 grant nothing; values above 40 use the 40 row.
 * @param {number|null} a   Attribute total
 */
export function attributeBonuses(a) {
  if ( !Number.isFinite(a) || (a < 16) ) {
    return { iqSkill: 0, meSave: 0, maPercent: 0, psDamage: 0, ppCombat: 0, pePercent: 0, peSave: 0, peComa: 0, pbPercent: 0 };
  }
  a = Math.min(a, 40);
  const half = Math.floor((a - 14) / 2);
  const pePercent = a <= 18 ? a - 12 : (2 * a) - 30;
  return {
    iqSkill: a - 14,                  // +% to all skill percentiles
    meSave: half,                     // save vs psionics & strangeness
    maPercent: MA_PERCENT[a - 16],    // % trust / intimidate
    psDamage: a - 15,                 // melee & hurled damage
    ppCombat: half,                   // strike, parry, dodge
    pePercent,                        // % save vs coma/death (as printed)
    peSave: half,                     // save vs toxins & magic
    peComa: Math.floor(pePercent / 5), // House ruling: coma % converted to a d20 bonus
    pbPercent: PB_PERCENT[a - 16]     // % charm / impress
  };
}

/**
 * Attribute generation (p.12): which attributes each modifier step applies to. Size Level changes
 * only I.Q., P.S., P.E. and Spd; physical skills only P.S., P.P., P.E. and Spd.
 */
export const GENERATION = {
  sizeAttributes: ["iq", "ps", "pe", "spd"],
  physicalAttributes: ["ps", "pp", "pe", "spd"]
};

/** Movement Table (p.12). */
export function movement(spd) {
  spd = Math.max(0, spd ?? 0);
  const move = spd >= 25 ? 14 : spd >= 16 ? 12 : spd >= 8 ? 10 : 8;
  return { move, fullRun: spd * 5, sprint: spd * 20 };
}

/** Carry / lift multipliers by PS (p.12). */
export function carryLift(ps) {
  ps = ps ?? 0;
  const [c, l] = ps >= 24 ? [50, 100] : ps >= 20 ? [30, 60] : ps >= 15 ? [20, 40] : [10, 30];
  return { carry: ps * c, lift: ps * l };
}

/* -------------------------------------------- */
/*  Size Levels (p.17)                          */
/* -------------------------------------------- */

/** Index = Size Level. Attribute modifiers, base SDC and max weight. */
export const SIZE_LEVELS = {
  1: { weight: "0–1 lb", iq: -8, ps: -12, pe: -4, spd: 7, sdc: 5 },
  2: { weight: "to 5 lb", iq: -6, ps: -6, pe: -2, spd: 5, sdc: 10 },
  3: { weight: "to 10 lb", iq: -4, ps: -3, pe: -1, spd: 3, sdc: 15 },
  4: { weight: "to 20 lb", iq: -2, ps: -2, pe: 0, spd: 0, sdc: 20 },
  5: { weight: "to 40 lb", iq: 0, ps: -1, pe: 0, spd: 0, sdc: 25 },
  6: { weight: "to 75 lb", iq: 0, ps: 0, pe: 0, spd: 0, sdc: 30 },
  7: { weight: "to 100 lb", iq: 0, ps: 1, pe: 0, spd: 0, sdc: 30 },
  8: { weight: "to 150 lb", iq: 0, ps: 2, pe: 0, spd: 0, sdc: 35 },
  9: { weight: "to 175 lb", iq: 0, ps: 3, pe: 1, spd: 0, sdc: 35 },
  10: { weight: "to 200 lb", iq: 0, ps: 4, pe: 2, spd: 0, sdc: 35 },
  11: { weight: "to 250 lb", iq: 0, ps: 5, pe: 3, spd: -1, sdc: 40 },
  12: { weight: "to 300 lb", iq: 0, ps: 6, pe: 4, spd: -2, sdc: 40 },
  13: { weight: "to 350 lb", iq: 0, ps: 7, pe: 5, spd: -3, sdc: 45 },
  14: { weight: "to 400 lb", iq: 0, ps: 8, pe: 6, spd: -4, sdc: 50 },
  15: { weight: "to 500 lb", iq: 0, ps: 9, pe: 7, spd: -5, sdc: 55 },
  16: { weight: "to 600 lb", iq: 0, ps: 10, pe: 8, spd: -6, sdc: 60 },
  17: { weight: "to 800 lb", iq: 0, ps: 11, pe: 9, spd: -7, sdc: 65 },
  18: { weight: "to 1,000 lb", iq: 0, ps: 12, pe: 10, spd: -8, sdc: 70 },
  19: { weight: "to 1,500 lb", iq: 0, ps: 13, pe: 11, spd: -9, sdc: 75 },
  20: { weight: "to 2,500 lb", iq: 0, ps: 14, pe: 12, spd: -10, sdc: 80 },
  // Size Levels 21–25: Transdimensional TMNT expanded chart (p.17), for giant dinosaurs.
  21: { weight: "to 5,000 lb", iq: -2, ps: 15, pe: 13, spd: -12, sdc: 90 },
  22: { weight: "to 10,000 lb", iq: -4, ps: 16, pe: 14, spd: -15, sdc: 100 },
  23: { weight: "to 20,000 lb", iq: -6, ps: 17, pe: 15, spd: -20, sdc: 120 },
  24: { weight: "to 50,000 lb", iq: -8, ps: 18, pe: 16, spd: -25, sdc: 150 },
  25: { weight: "to 100,000 lb", iq: -10, ps: 19, pe: 17, spd: -30, sdc: 200 }
};

/** Highest Size Level (Transdimensional expanded chart). */
export const MAX_SIZE_LEVEL = 25;

/** Each Size Level step up costs 5 Bio-E; each step down refunds 5 (p.16). */
export const BIOE_PER_SIZE_LEVEL = 5;

/* -------------------------------------------- */
/*  Human Features (p.18–19)                    */
/* -------------------------------------------- */

export const HUMAN_FEATURES = {
  hands: "Hands", biped: "Biped", speech: "Speech", looks: "Looks"
};

export const FEATURE_LEVELS = { none: "None", partial: "Partial", full: "Full" };

/**
 * Effects of a Human Feature below Full when the animal's entry doesn't list its own
 * (animal items can override per level). Redux p.18: Partial Hands −4 Strike with hand-held weapons.
 */
export const DEFAULT_FEATURE_EFFECTS = {
  hands: { partial: [{ target: "handheld.strike", formula: "-4", value: null, group: "" }] }
};

/* -------------------------------------------- */
/*  Alignments (p.50)                           */
/* -------------------------------------------- */

export const ALIGNMENTS = {
  principled: "Principled (Good)",
  scrupulous: "Scrupulous (Good)",
  unprincipled: "Unprincipled (Selfish)",
  anarchist: "Anarchist (Selfish)",
  miscreant: "Miscreant (Evil)",
  aberrant: "Aberrant (Evil)",
  diabolic: "Diabolic (Evil)"
};

/* -------------------------------------------- */
/*  Experience (p.75)                           */
/* -------------------------------------------- */

/** Minimum XP to reach each level (index 0 = level 1). */
export const XP_LEVELS = [0, 2001, 4001, 8001, 14001, 22001, 34001, 50001, 70001, 95001,
  125001, 175001, 225001, 275001, 335001];

export function levelForXP(xp) {
  let level = 1;
  cfg().XP_LEVELS.forEach((min, i) => { if ( xp >= min ) level = i + 1; });
  return level;
}

/* -------------------------------------------- */
/*  Saving Throws (p.20, p.89, p.93)            */
/* -------------------------------------------- */

export const SAVES = {
  psionics: { label: "vs Psionics", target: 15 },     // 10 for psychics
  strangeness: { label: "vs Strangeness", target: 12 },
  toxin: { label: "vs Poison / Toxin", target: 14 },  // 14 lethal, 16 non-lethal, 15 drugs
  magic: { label: "vs Magic", target: 12 },           // 12 apprentice, 16 master; else the caster's spell strength
  circle: { label: "vs Circles & Wards", target: 12 }, // Transdimensional p.42 (target set by the GM)
  coma: { label: "vs Coma", target: 16 }
};

/** Save vs Coma treatment bonuses (p.93). */
export const COMA_TREATMENT = {
  0: "No medically trained personnel (+0)",
  1: "Non-professional with First Aid (+1)",
  3: "Paramedic or R.N. (+3)",
  5: "Doctor without proper facilities (+5)",
  7: "Doctor, basic clinic (+7)",
  9: "Doctor, small hospital (+9)",
  10: "Doctor, large hospital (+10)"
};

/* -------------------------------------------- */
/*  Combat Training (p.62–63)                   */
/* -------------------------------------------- */

/** Abilities every character has, with or without training (p.62; Errata 2026: + Entangle, Hold). */
export const BASELINE_COMBAT = {
  actions: 2,
  critAll: 20,
  attackActions: ["strike", "disarm", "entangle", "hold", "tackle"],
  reactions: ["parry", "dodge", "rollImpact"]
};

/** Pull Punch succeeds on 10+ (Errata 2026, was 11+). */
export const PULL_PUNCH_TARGET = 10;

/**
 * Unlocks granted by Combat Training. Hold and Entangle are baseline Attack Actions since the 2026 errata,
 * so the training's "Hold action" adds nothing new and "Entangle" becomes usable as a Reaction.
 */
export const COMBAT_UNLOCKS = {
  entangle: "Entangle (reaction)",
  throw: "Throw (action)",
  hold: "Hold (action)",
  disarmReaction: "Disarm (reaction)",
  throwReaction: "Throw (reaction)",
  leapAttack: "Leap Attack (action)"
};

/** Unlocks already covered by the baseline actions (not shown as new). */
export const BASELINE_UNLOCKS = ["hold"];

/**
 * Combat maneuvers rolled with the melee Strike bonus (p.86–90).
 * requires: an unlock key needed to use it (else anyone can).
 */
export const MANEUVERS = {
  hold: { label: "Hold", text: "Neither side can move, attack, parry, dodge or react; the victim breaks free with a Strike roll (holder may Parry, no action)." },
  entangle: { label: "Entangle", text: "Traps a limb or weapon (no damage). The victim breaks free with a Strike roll; the entangler may Parry without an action and is +5 to Hold that limb." },
  tackle: { label: "Tackle", damage: true, text: "Unarmed damage; both fall Prone unless the defender makes Basic Athletics or Balancing. On a failure the defender loses Initiative and the attacker is +5 to Hold next action." },
  throw: { label: "Throw", requires: "throw", damage: true, text: "Unarmed damage; the defender is knocked Prone and loses the Initiative." },
  leapAttack: { label: "Jump Kick", requires: "leapAttack", damage: true, actions: 2, leap: true, text: "Leap Attack: only at the start of the round, uses two actions and is the only offensive action this round; double damage (triple on a Critical or Death Blow)." }
};

/** Labels for the baseline Attack Actions and Reactions. */
export const ACTION_LABELS = {
  strike: "Strike", disarm: "Disarm", entangle: "Entangle", hold: "Hold", tackle: "Tackle",
  parry: "Parry", dodge: "Dodge", rollImpact: "Roll with Impact"
};

/**
 * Reactions a defender can make against an attack card (p.87–89; Errata 2026).
 * total: the combat total rolled; requires: a Combat Training unlock; usesAction: always costs an action
 * (Parry only costs one without Automatic Parry); melee: only against adjacent melee attacks.
 */
export const REACTIONS = {
  parry: { label: "Parry", icon: "fa-shield", total: "parry" },
  dodge: { label: "Dodge", icon: "fa-person-running", total: "dodge", usesAction: true },
  rollImpact: { label: "Roll with Impact", icon: "fa-person-falling", total: "rollImpact", usesAction: true },
  entangle: { label: "Entangle", icon: "fa-link", total: "strike", requires: "entangle", usesAction: true, melee: true },
  disarm: { label: "Disarm", icon: "fa-hand", total: "disarm", requires: "disarmReaction", usesAction: true, melee: true },
  throw: { label: "Throw", icon: "fa-arrows-spin", total: "strike", requires: "throwReaction", usesAction: true, melee: true }
};

/** Weapon types that can't be rolled with (bullets, energy blasts; p.90). */
export const NO_ROLL_WITH_IMPACT = ["firearm", "energy", "blackPowder"];

/** Circumstantial modifiers: temporary situational bonuses or penalties set on the Combat tab. */
export const CIRCUMSTANCES = {
  actions: "Actions", initiative: "Initiative", strike: "Strike", parry: "Parry", dodge: "Dodge",
  rollImpact: "Roll with Impact", damage: "Damage", critical: "Critical range"
};

/**
 * Conditions, shown as token status effects. mods are added to combat totals;
 * stunned cuts actions to 1 and removes combat bonuses (p.90); noDefense blocks Reactions.
 */
export const CONDITIONS = {
  stunned: { label: "Stunned", img: "icons/svg/daze.svg", text: "1 action per round, Speed halved, no combat bonuses, no skill checks (1D4 rounds)." },
  shocked: { label: "Horrified", img: "icons/svg/terror.svg", mods: { actions: -1 }, text: "Failed a Horror Factor save: loses the Initiative, can't Parry or Dodge the first attack, loses one action (1 round)." },
  blind: { label: "Blind", img: "icons/svg/blind.svg", mods: { strike: -10, parry: -10, dodge: -10, initiative: -10 }, text: "−10 to Strike, Parry, Dodge and Initiative." },
  held: { label: "Held", img: "icons/svg/net.svg", noDefense: true, text: "In a Hold: can't move, attack, parry, dodge or react. Break free with a Strike roll as an Attack Action." },
  entangled: { label: "Entangled", img: "icons/svg/net.svg", text: "The entangled limb and its weapon can't be used. Break free with a Strike roll." },
  prone: { label: "Prone", img: "icons/svg/falling.svg", text: "Can only crawl; standing up takes an action." },
  deafened: { label: "Deafened", img: "icons/svg/deaf.svg", mods: { strike: -3, parry: -3, dodge: -3 }, text: "−3 Strike/Parry/Dodge (−6 Parry/Dodge vs attacks from behind); automatically loses initiative." },
  pain: { label: "Pain", img: "icons/svg/degen.svg", mods: { strike: -6, parry: -6, dodge: -6 }, text: "−6 Strike/Parry/Dodge; 1 HP damage per minute." },
  paralyzed: { label: "Paralyzed", img: "icons/svg/paralysis.svg", noDefense: true, text: "Can't strike, parry or dodge; can see, hear, speak and think." },
  unconscious: { label: "Unconscious", img: "icons/svg/unconscious.svg", noDefense: true, text: "Knocked out." },
  coma: { label: "Coma", img: "icons/svg/blood.svg", noDefense: true, text: "0 HP or less: Save vs Coma (2 of 3); bleeding out." }
};

/** Token status effects: the conditions plus Foundry's "dead" (used to mark defeated combatants). */
export function statusEffects() {
  const effects = Object.entries(cfg().CONDITIONS).map(([id, c]) => ({ id, name: c.label, img: c.img, description: c.text }));
  effects.push({ id: "dead", name: "Dead", img: "icons/svg/skull.svg" });
  return effects;
}

/**
 * Horror Factor save (Transdimensional p.89): d20 + save vs Strangeness bonus must be ABOVE the H.F.
 * @param {number} total   The save roll total
 * @param {number} hf      Horror Factor
 */
export const horrorSaved = (total, hf) => total > hf;

/**
 * Per-level gains. Keys: strike/parry/dodge/damage/init/rwi/actions are cumulative numeric bonuses;
 * autoParry; unlock: [..]; critAll: N (crit on N–20 with all attacks);
 * critOrStun: N (crit or stun with melee on N–20); sneak: crit-or-stun on melee Sneak Attack;
 * deathBlow: N (death blow with melee on N–20).
 */
export const COMBAT_TRAINING = {
  none: { label: "None", cost: 0, levels: [] },
  basic: {
    label: "Basic", cost: 1,
    levels: [
      { autoParry: true, rwi: 1 },
      { parry: 1, dodge: 1 },
      { strike: 1 },
      { actions: 1 },
      { unlock: ["entangle"] },
      { damage: 1, init: 1 },
      { critAll: 19 },
      { unlock: ["throw"] },
      { actions: 1 },
      { rwi: 1 },
      { parry: 1, dodge: 1, strike: 1 },
      { unlock: ["hold"] },
      { damage: 1, init: 1 },
      { actions: 1 },
      { sneak: true }
    ]
  },
  expert: {
    label: "Expert", cost: 2,
    levels: [
      { autoParry: true, rwi: 2 },
      { parry: 2, dodge: 2, strike: 2 },
      { unlock: ["entangle"] },
      { actions: 1 },
      { unlock: ["throw"] },
      { damage: 2, init: 2 },
      { critAll: 18 },
      { unlock: ["hold"] },
      { actions: 1 },
      { sneak: true },
      { parry: 2, dodge: 2, strike: 2 },
      { unlock: ["disarmReaction"] },
      { rwi: 2 },
      { actions: 1 },
      { deathBlow: 20 }
    ]
  },
  martialArts: {
    label: "Martial Arts", cost: 3,
    levels: [
      { autoParry: true, rwi: 3 },
      { parry: 3, dodge: 3, strike: 3 },
      { unlock: ["entangle", "throw"] },
      { actions: 1 },
      { damage: 3, init: 3 },
      { unlock: ["hold", "disarmReaction"] },
      { critAll: 18 },
      { sneak: true },
      { actions: 1 },
      { unlock: ["leapAttack", "throwReaction"] },
      { parry: 2, dodge: 2, strike: 2 },
      { rwi: 2 },
      { critOrStun: 18 },
      { actions: 1 },
      { deathBlow: 20 }
    ]
  },
  assassin: {
    label: "Assassin (Special)", cost: 0,
    levels: [
      { autoParry: true, rwi: 3 },
      { parry: 2, dodge: 2, strike: 2 },
      { sneak: true },
      { actions: 1 },
      { damage: 3, init: 3 },
      { unlock: ["entangle", "throw"] },
      { critAll: 19 },
      { critOrStun: 17 },
      { actions: 1 },
      { deathBlow: 20 },
      { parry: 2, dodge: 2, strike: 2 },
      { rwi: 2 },
      { damage: 2, init: 2 },
      { actions: 1 },
      { critAll: 17 }
    ]
  },
  ninjutsu: {
    label: "Ninjutsu (Special)", cost: 0,
    levels: [
      { autoParry: true, rwi: 4 },
      { parry: 3, dodge: 3, strike: 3 },
      { unlock: ["entangle", "throw"] },
      { actions: 1, unlock: ["leapAttack"] },
      { sneak: true },
      { damage: 2, init: 2 },
      { critAll: 18 },
      { unlock: ["hold", "disarmReaction"] },
      { actions: 1 },
      { unlock: ["throwReaction"], rwi: 2 },
      { parry: 2, dodge: 2, strike: 2 },
      { deathBlow: 20 },
      { damage: 3, init: 3 },
      { actions: 1 },
      { critOrStun: 17 }
    ]
  },
  feral: {
    label: "Feral (Special)", cost: 0,
    levels: [
      { autoParry: true, rwi: 2 },
      { strike: 3, parry: 2, dodge: 2 },
      { damage: 3, init: 1 },
      { actions: 1 },
      { unlock: ["entangle", "throw"] },
      { damage: 3, init: 1 },
      { critOrStun: 17 },
      { strike: 3 },
      { actions: 1 },
      { unlock: ["leapAttack"] },
      { parry: 2, dodge: 2, rwi: 2 },
      { sneak: true },
      { damage: 4, init: 2 },
      { actions: 1 },
      { deathBlow: 20 }
    ]
  }
};

/**
 * Accumulate a Combat Training table up to a given level.
 * @param {string} type
 * @param {number} level   Effective level (1–15)
 */
export function combatTrainingAt(type, level) {
  const result = {
    strike: 0, parry: 0, dodge: 0, damage: 0, init: 0, rwi: 0,
    actions: cfg().BASELINE_COMBAT.actions,
    autoParry: false, unlocks: [], critAll: cfg().BASELINE_COMBAT.critAll,
    critOrStun: null, sneak: false, deathBlow: null
  };
  const table = cfg().COMBAT_TRAINING[type]?.levels ?? [];
  for ( const gain of table.slice(0, Math.clamp(level, 0, 15)) ) {
    for ( const key of ["strike", "parry", "dodge", "damage", "init", "rwi", "actions"] ) {
      result[key] += gain[key] ?? 0;
    }
    if ( gain.autoParry ) result.autoParry = true;
    if ( gain.sneak ) result.sneak = true;
    if ( gain.unlock ) result.unlocks.push(...gain.unlock);
    if ( gain.critAll ) result.critAll = Math.min(result.critAll, gain.critAll);
    if ( gain.critOrStun ) result.critOrStun = Math.min(result.critOrStun ?? 20, gain.critOrStun);
    if ( gain.deathBlow ) result.deathBlow = Math.min(result.deathBlow ?? 20, gain.deathBlow);
  }
  return result;
}

/* -------------------------------------------- */
/*  Magic (Transdimensional TMNT p.41–51)       */
/* -------------------------------------------- */

/** Base spell strength: the number a target must meet or beat to save vs a caster's spells (p.42). */
export const BASE_SPELL_STRENGTH = 12;

/**
 * Spell-casting traditions. bioe: the Bio-E cost of the option (p.7–9);
 * startingSelections: spell selections at level 1.
 * Per-level gains (cumulative): spellsPerMelee, strength (spell strength bonus), saveSpell,
 * saveCircle, savePsionics, saveChange (% vs T.E. Change).
 */
export const MAGIC_TRADITIONS = {
  none: { label: "None", bioe: 0, levels: [] },
  wizard: {
    label: "Wizard", bioe: 30, startingSelections: 14,
    spellsPerDay: level => 8 + (2 * [3, 6, 9, 12].filter(l => level >= l).length),
    levels: [
      { spellsPerMelee: 2 }, { saveSpell: 1 }, { spellsPerMelee: 1 }, { strength: 2 }, { saveSpell: 1 },
      { spellsPerMelee: 1 }, { strength: 1 }, { saveCircle: 2 }, { spellsPerMelee: 1 }, { savePsionics: 1 },
      { strength: 1 }, { spellsPerMelee: 1 }, { saveSpell: 1 }, { strength: 1 }, { saveCircle: 1 }
    ]
  },
  timeLord: {
    label: "Time Lord (Apprentice)", bioe: 25, startingSelections: 11,
    spellsPerDay: level => 3 + level,
    levels: [
      { spellsPerMelee: 2 }, { saveSpell: 1 }, { saveChange: 10 }, { spellsPerMelee: 1 }, { strength: 2 },
      { saveSpell: 1 }, { saveChange: 10 }, { spellsPerMelee: 1 }, { strength: 1 }, { savePsionics: 1 },
      { saveSpell: 1 }, { saveChange: 10 }, { spellsPerMelee: 1 }, { strength: 1 }, { saveSpell: 1 }
    ]
  }
};

/** Spell lists. */
export const SPELL_TRADITIONS = { wizard: "Wizard", timeLord: "Time Lord (Temporal)" };

/** How a spell's target avoids it. dodge: a Dodge roll that must reach dodgeTarget. */
export const SPELL_SAVES = {
  none: "None", standard: "Standard (vs Spell Strength)", special: "Special", dodge: "Dodge only"
};

/**
 * Automatic abilities of each tradition (p.42, p.49). pct: [base, per level] for a percentile roll.
 */
export const MAGIC_ABILITIES = {
  wizard: [
    { level: 1, label: "Recognize Enchantment", pct: [60, 4] },
    { level: 1, label: "Sense Magic (pinpoint, 200 ft)", pct: [24, 4] },
    { level: 1, label: "Astral Projection (travel)", pct: [50, 0], text: "4 melees per level; lost = trapped" }
  ],
  timeLord: [
    { level: 1, label: "Compute Temporal Coils", text: "Track Twists and Cycles for time magic" },
    { level: 2, label: "Sense Temporal Energy", text: "Touch: T.E. levels and danger" },
    { level: 4, label: "Sense Time Stream", text: "Exact Twist and Cycle of a location" },
    { level: 4, label: "Sense Magic (identify source, 200 ft)", pct: [30, 3] },
    { level: 6, label: "Sense Temporal Magic & Disturbance", text: "Type and power; locate within 5 miles" }
  ]
};

/**
 * Accumulate a magic tradition's progression up to a level.
 * @param {string} tradition
 * @param {number} level
 */
export function magicAt(tradition, level) {
  const t = cfg().MAGIC_TRADITIONS[tradition] ?? cfg().MAGIC_TRADITIONS.none;
  const result = { spellsPerDay: t.spellsPerDay?.(level) ?? 0, spellsPerMelee: 0, strength: 0,
    saveSpell: 0, saveCircle: 0, savePsionics: 0, saveChange: 0 };
  for ( const gain of t.levels.slice(0, Math.clamp(level, 0, 15)) ) {
    for ( const key of Object.keys(gain) ) result[key] += gain[key];
  }
  result.abilities = (cfg().MAGIC_ABILITIES[tradition] ?? []).filter(a => level >= a.level).map(a => ({
    ...a, chance: a.pct ? Math.min(98, a.pct[0] + (a.pct[1] * level)) : null
  }));
  return result;
}

/** Save vs T.E. Change (Transdimensional p.33): percentile + bonuses, 50 or better succeeds. */
export const CHANGE_SAVE_TARGET = 50;

/* -------------------------------------------- */
/*  Black Powder (Transdimensional p.61–69)     */
/* -------------------------------------------- */

/**
 * Black powder firing mechanisms. wp: the W.P. family that covers it and its Aimed strike bonus;
 * clumsy: arquebus-type weapons (−3 Aimed / −8 Wild untrained); shortRange: only 20 ft of extra range.
 */
export const POWDER_LOCKS = {
  arquebus: { label: "Arquebus", wp: "arquebus", misfire: 20, clumsy: true, shortRange: true },
  matchlock: { label: "Matchlock", wp: "arquebus", misfire: 15, clumsy: true, shortRange: true },
  wheellock: { label: "Wheel lock", wp: "wheellock", misfire: 10, shortRange: true },
  flintlock: { label: "Flintlock", wp: "flintlock", misfire: 10 },
  percussion: { label: "Percussion Cap (muzzle-loader)", wp: "percussion", misfire: 5 },
  capAndBall: { label: "Cap-and-Ball Revolver", wp: "capAndBall", misfire: 5 }
};

/** Black Powder W.P.s (p.67): Aimed strike bonus; general = no bonus, no penalty, reloads twice as slowly. */
export const POWDER_WPS = {
  arquebus: { label: "Arquebus and Matchlock", aimed: 1 },
  wheellock: { label: "Wheel lock Rifle or Pistol", aimed: 2 },
  flintlock: { label: "Flintlock Rifle or Pistol", aimed: 2 },
  percussion: { label: "Percussion Cap Rifle (Muzzle-Loader)", aimed: 3 },
  capAndBall: { label: "Cap-and-Ball Pistol (Revolver)", aimed: 3 },
  general: { label: "Black Powder (general)", aimed: 0 }
};

export const PENETRATION = {
  poor: "Poor: stopped by most barriers (wood, stone, brick)",
  fair: "Fair: passes interior walls; stopped by heavy metal armor or stone",
  good: "Good: penetrates most building material and medieval armor",
  excellent: "Excellent: passes brick and cinder block; usually penetrates modern personal armor"
};

/** Added misfire chance by weather (p.68). A world setting chosen by the GM. */
export const POWDER_WEATHER = {
  dry: { label: "Dry", misfire: 0 },
  humid: { label: "Humid (swamp)", misfire: 5 },
  rain: { label: "Rain", misfire: 15 },
  downpour: { label: "Downpour or dunking", misfire: 35 }
};

/** Deliberate Overloading (p.68): extra damage and +25% misfire; needs the right W.P. */
export const OVERLOAD = { pistol: "2D6", rifle: "3D6", misfire: 25 };

/**
 * Beyond effective range (p.67–68), first band. Short-range locks: 20 ft more at −8 and half damage.
 * Pistols: first 25 ft −5 Strike / −4 damage (next 25 ft −12 / −10, then ineffective).
 * Other rifles: −5 Strike / −3 damage per extra 25 ft.
 */
export function powderLongRange(lock, longarm) {
  if ( cfg().POWDER_LOCKS[lock]?.shortRange ) return { strike: -8, half: true, text: "Only 20 ft beyond range; half damage." };
  if ( !longarm ) return { strike: -5, damage: -4, text: "Next 25 ft: −12 Strike, −10 damage; then ineffective." };
  return { strike: -5, damage: -3, text: "Another −5 Strike and −3 damage for every further 25 ft." };
}

/** Misfire Mishaps Table (p.68). */
export const MISFIRE_MISHAPS = [
  { max: 25, key: "misfire", label: "Misfire", text: "Nothing happens. Re-cock and try again (Arquebus: re-light; Matchlock: reset the match, two actions)." },
  { max: 40, key: "badLoad", label: "Bad Load", text: "Bad powder or a blockage: clean and reload, 1D4 melee rounds." },
  { max: 45, key: "jammed", label: "Jammed", text: "Mechanism damaged: 2D6 melee rounds to strip and reassemble, then 25% chance it needs a gunsmith." },
  { max: 75, key: "fizzle", label: "Fizzle", text: "The shot rolls out with sparkles: harmless. Reload and try again." },
  { max: 80, key: "handfire", label: "Handfire / Slow Burn", text: "Fires at the start of the next melee round: normal Strike if still aiming, otherwise it goes off wildly." },
  { max: 90, key: "overloaded", label: "Overloaded!", text: "Too much powder: the target takes double (Critical) damage, but the weapon is destroyed and the shooter takes 1D6." },
  { max: 100, key: "explosion", label: "Explosion!", text: "The weapon blows up: 2D6 damage to the shooter, weapon destroyed, target unhurt." }
];

export const mishapFor = roll => cfg().MISFIRE_MISHAPS.find(m => roll <= m.max);

/* -------------------------------------------- */
/*  Vehicles & Devices                          */
/* -------------------------------------------- */

export const VEHICLE_TYPES = { land: "Landcraft", water: "Watercraft", air: "Aircraft", space: "Spacecraft", other: "Other" };

/**
 * Armored locations (Transdimensional p.56–57). Strikes hit the hull unless the attacker declares an
 * exposed location (Errata 2026, TMNT-TA p.134). Hull = Vehicle Armor.
 */
export const VEHICLE_LOCATIONS = {
  hull: { label: "Hull / Fuselage (Vehicle Armor)", text: "" },
  crew: { label: "Crew / Passenger Compartment", text: "Got through the compartment: the GM applies the damage to an occupant." },
  engine: { label: "Engine", text: "Engine hit: the vehicle may slow or stop (GM)." },
  fuel: { label: "Fuel Tank", text: "Fuel tank hit: it may leak or explode (GM)." },
  turret: { label: "Turret", text: "Turret hit: the weapon or its gunner may be hit (GM)." }
};

export const DEVICE_TYPES = {
  timeMachine: "Time Machine",
  crossDimensional: "Cross-Dimensional Device",
  readout: "Readout / Navigation Aid",
  other: "Other Device"
};

/* -------------------------------------------- */
/*  Time travel tables (Transdimensional)       */
/* -------------------------------------------- */

/** Pick the row of a percentile table ({max, ...} rows sorted by max). */
export const tableRow = (table, roll) => table.find(r => roll <= r.max) ?? table.at(-1);

/** Cycles for the Wrong Cycle mishap (p.86). */
export const MISHAP_CYCLES = [
  { max: 10, label: "Prime (1988 A.D.)" }, { max: 20, label: "A (13,262 B.C.)" }, { max: 30, label: "B (350,000 B.C.)" },
  { max: 40, label: "C (2,800,000 B.C.)" }, { max: 50, label: "D (27 million years ago)" }, { max: 60, label: "E (66 million years ago)" },
  { max: 70, label: "F (189 million years ago)" }, { max: 80, label: "G (265 million years ago)" }, { max: 90, label: "H (480 million years ago)" },
  { max: 95, label: "I (2.3 billion years ago)" }, { max: 98, label: "J (4.7 billion years ago)" }, { max: 99, label: "K (14 billion years ago)" },
  { max: 100, label: "L (impossible to measure)" }
];

/** Twists for the Wrong Twist mishap (p.86; Twists 3 and 4 named as in the p.75 summary). */
export const MISHAP_TWISTS = [
  { max: 5, label: "N, 238 A.D. Mass Chaos in Rome" }, { max: 10, label: "M, 363 A.D. Decline of Rome" },
  { max: 15, label: "I, 863 A.D. Dark Ages" }, { max: 20, label: "H, 988 A.D. Norman/Viking Dominance" },
  { max: 25, label: "E, 1363 A.D. Aftermath of Black Death" }, { max: 30, label: "B, 1738 A.D. High Age of Piracy" },
  { max: 40, label: "A, 1863 A.D. Victorian Age" }, { max: 60, label: "Prime, 1988 A.D. Modern World" },
  { max: 70, label: "\"1\", 2113 A.D. After the Bomb" }, { max: 75, label: "\"2\", 2238 A.D. Wild Planet" },
  { max: 80, label: "\"3\", 2363 A.D. Machine Civilization/Ecology" }, { max: 85, label: "\"4\", 2488 A.D. War!!!" },
  { max: 90, label: "\"5\", 2713 A.D. Early Homidian Evolution" }, { max: 95, label: "\"6\", 2838 A.D. Late Homidian Evolution" },
  { max: 100, label: "\"7\", 2963 A.D. False Eden" }
];

/** Null-Time levels (p.86–87); any other roll is a Common Fragment. */
export const NULL_TIME_LEVELS = {
  1: "1st Level (\"Mirror Level\"): phantasms of where the travellers came from; any Cycle or Twist is reachable from here.",
  8: "8th Level: Max the Merchant's shop (period gear at about 50% more than normal).",
  56: "56th Level (\"the Glade\"): every minute here is a full day everywhere else.",
  73: "73rd Level: direct access only to the Twists of Cycle B.",
  79: "79th Level: home of the Time Lords; intruders are teleported to the dungeon to meet Lord Simultaneous."
};
export const NULL_TIME_FRAGMENT = "Common Null-Time Fragment: grey plains under a grey sky; 1% chance each round that it dissolves into random time. Any Cycle or Twist is reachable.";

/** Temporal Mishap Table (p.86). sub: a follow-up table rolled automatically. */
export const TEMPORAL_MISHAPS = [
  { max: 35, label: "Wrong Direction", text: "The jump works, but in the wrong direction: future ↔ past, same distance." },
  { max: 60, label: "Wrong Cycle", sub: "cycle", text: "Arrives in the wrong Cycle (if it's the starting one, roll a random Twist)." },
  { max: 90, label: "Wrong Twist", sub: "twist", text: "Arrives in the wrong Twist (even if it's the one aimed at or started from)." },
  { max: 100, label: "Null-Time Zone", sub: "nullTime", text: "Lost in a Null-Time Zone." }
];

/** Malfunction tables for cross-dimensional devices (p.53–54). */
export const DEVICE_MALFUNCTIONS = {
  temporal: { label: "Temporal Mishap Table" },
  gateway: {
    label: "Gateway Generator",
    rows: [
      { max: 20, text: "The generator shuts down: recharge and recalibrate." },
      { max: 99, text: "Opens to the wrong dimension (roll a random dimension)." },
      { max: 100, text: "Massive Cross-Dimensional Mislocation: the generator and an area 4D6 × 1,000 ft across slam into another dimension; 20% chance it's the intended one." }
    ]
  },
  portable: {
    label: "Portable Cross-Dimensional Device",
    rows: [
      { max: 5, text: "The device rips free of its housing and transports only itself to a random dimension." },
      { max: 30, text: "Shuts down: recharge and recalibrate." },
      { max: 99, text: "Wrong dimension (roll a random dimension)." },
      { max: 100, text: "Massive Mislocation: device plus an area 3D6 × 1,000 ft across; 10% chance it's the intended dimension." }
    ]
  },
  miniature: {
    label: "Miniature Cross-Dimensional Device",
    rows: [
      { max: 3, text: "Rips free: only the device itself is transported." },
      { max: 10, text: "Shuts down: recharge and recalibrate." },
      { max: 99, text: "Wrong dimension (roll a random dimension)." },
      { max: 100, text: "Massive Mislocation: an area 2D6 × 1,000 ft across; 25% chance of the intended destination." }
    ]
  }
};

/**
 * Learning a spell by practice. Time Lords (p.49): two "complete success" results make it castable.
 * Wizards self-taught (p.41): one complete success after eight months of study.
 */
export const SPELL_PRACTICE = {
  timeLord: [
    { max: 11, text: "Desired effect but imperfect: save vs T.E. Change or suffer 5 Bio-E points of devolution.", change: true },
    { max: 24, text: "Nothing happens." },
    { max: 32, text: "Small explosion: knocked down, 3D6 damage.", damage: "3D6" },
    { max: 42, text: "Dazed and weak: all skills −10%, −1 Strike, Parry and Dodge for 1D4 days." },
    { max: 49, text: "Energy bolt: 6D6 damage.", damage: "6D6" },
    { max: 78, text: "Complete success!", success: true },
    { max: 90, text: "Thrown somewhere in the time stream (Temporal Mishap).", mishap: true },
    { max: 95, text: "Thrown to the fringes of time: 01–45 Cycle H, 46–60 Cycle I, 61–99 Cycle J, 100 Cycle K. Air and T.E. problems: get back quickly!" },
    { max: 100, text: "Complete success!", success: true }
  ],
  wizard: [
    { max: 11, text: "The spell works at half strength, duration, range and damage; another eight months of study might fix it." },
    { max: 24, text: "Nothing: complete failure." },
    { max: 32, text: "Small explosion knocks the caster down: 3D6 damage.", damage: "3D6" },
    { max: 42, text: "Dazed and weak: all skills −10%, −1 Strike, Parry and Dodge for 1D4 days." },
    { max: 49, text: "Energy bolt strikes the caster: 6D6 damage.", damage: "6D6" },
    { max: 78, text: "Complete success!", success: true },
    { max: 88, text: "Summons a hostile otherworldly creature (GM's random table)." },
    { max: 95, text: "Opens a mystic portal to another dimension; closing it takes 1D6 Mystic Portal spells; 70% chance something comes through in the first hour, 48% each day after." },
    { max: 100, text: "Complete success!", success: true }
  ]
};

/** Complete successes needed to master a spell by practice. */
export const PRACTICE_NEEDED = { timeLord: 2, wizard: 1 };

/** T.E. evolution / devolution per failed save vs Change (p.33). */
export const TE_CHANGE_STEP = 5;

/** Vehicle classes for installation costs (Transdimensional p.56). */
export const VEHICLE_CLASSES = {
  truckVan: "Truck / Van", compactSports: "Compact / Sports Car", midSize: "Mid-Size or larger car",
  motorcycle: "Motorcycle", aircraft: "Aircraft", watercraft: "Watercraft", any: "Any other vehicle"
};

/** Vehicle modification categories (Transdimensional p.56–59). */
export const VEHICLE_MOD_CATEGORIES = {
  armor: "Armor", equipment: "Optional Equipment", capability: "Travel Capability", accessory: "Accessory"
};

/**
 * Parse a printed cost ("$8 million", "$180,000", "$1.5 million", "$500 each") into dollars.
 * @param {string} text
 * @returns {number}
 */
export function parseCost(text) {
  const m = String(text ?? "").replace(/,/g, "").match(/\$?\s*([\d.]+)\s*(million|mil|billion|k)?/i);
  if ( !m ) return 0;
  const n = Number(m[1]);
  const scale = { million: 1e6, mil: 1e6, billion: 1e9, k: 1e3 }[m[2]?.toLowerCase()] ?? 1;
  return Number.isFinite(n) ? n * scale : 0;
}

/** Format dollars ("$8,180,000"). */
export const formatCost = n => `$${Math.round(n).toLocaleString("en-US")}`;
