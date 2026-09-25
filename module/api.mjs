import * as actions from "./actions.mjs";
import * as animal from "./animal.mjs";
import * as combat from "./combat.mjs";
import * as creation from "./creation.mjs";
import * as dice from "./dice.mjs";
import * as welcome from "./welcome.mjs";
import * as creationTables from "./creation-tables.mjs";
import * as audit from "./audit.mjs";
import * as party from "./party.mjs";
import * as partyView from "./party-view.mjs";
import * as session from "./session.mjs";
import * as itemRolls from "./item-rolls.mjs";
import * as animations from "./animations.mjs";
import * as air from "./air-combat.mjs";
import * as magic from "./magic.mjs";
import * as timetravel from "./timetravel.mjs";
import * as vehicle from "./vehicle.mjs";
import * as blunt from "./blunt.mjs";
import * as cover from "./cover.mjs";
import * as recovery from "./recovery.mjs";
import * as fx from "./fx.mjs";
import * as showdown from "./showdown.mjs";
import * as tracker from "./combat-tracker.mjs";
import CharacterData from "./data/character.mjs";
import NpcData from "./data/npc.mjs";
import VehicleData from "./data/vehicle.mjs";
import TimeMachineData from "./data/time-machine.mjs";
import { ITEM_MODELS, ItemDataBase } from "./data/items.mjs";
import PalladiumCharacterSheet from "./sheets/character-sheet.mjs";
import PalladiumItemSheet from "./sheets/item-sheet.mjs";
import PalladiumNpcSheet from "./sheets/npc-sheet.mjs";
import PalladiumVehicleSheet from "./sheets/vehicle-sheet.mjs";
import PalladiumTimeMachineSheet from "./sheets/time-machine-sheet.mjs";

/**
 * The public API for modules, available as game.palladium from the "init" hook on.
 * See the wiki page "For Module Authors" for the hooks and examples.
 */
export const API_VERSION = 1;

export function buildApi() {
  return {
    apiVersion: API_VERSION,
    /** The live rules tables and helpers (the same object as CONFIG.PALLADIUM). */
    get config() { return CONFIG.PALLADIUM; },

    // Rolls and cards
    rollD20: dice.rollD20,
    rollPercent: dice.rollPercent,
    rollSkill: dice.rollSkill,
    rollSave: dice.rollSave,
    showRecommendedModules: welcome.showRecommendedModules,
    showPlayerWelcome: welcome.showPlayerWelcome,
    rollCreationTable: creationTables.rollCreationTable,
    activeParty: party.activeParty,
    addPartyMember: party.addMember,
    addPartyToCombat: party.addPartyToCombat,
    openPartyView: partyView.openPartyView,
    openSessionTools: session.openSessionTools,
    awardXP: session.awardXP,
    printSession: session.printSession,
    auditJournal: audit.auditJournal,
    openAudit: audit.openAudit,
    recommendedModules: welcome.recommendedModules,
    rollSaveVsComa: dice.rollSaveVsComa,

    // Damage effects & recovery (p.92–93): for macros, e.g. visual effects on these hooks:
    // palladium.condition(actor, id, active), palladium.hitPoints(actor, {before, after, max}),
    // palladium.stopBleeding(actor, by), palladium.heal(actor, result), palladium.sideEffect(actor, result, item), palladium.cover(combatant, cover)
    startShowdown: showdown.startShowdown,
    initiativeDialog: showdown.initiativeDialog,
    combatantSide: tracker.combatantSide,
    setCombatantSide: tracker.setCombatantSide,
    toggleCombatantSide: tracker.toggleCombatantSide,
    orderBySide: tracker.orderBySide,
    shiftInitiative: tracker.shiftInitiative,
    hasMoved: tracker.hasMoved,
    toggleMove: tracker.toggleMove,
    combatantActions: tracker.combatantActions,
    rollShowdown: showdown.rollShowdown,
    bloodSplash: fx.bloodSplash,
    deathMarker: fx.deathMarker,
    stopBleeding: recovery.stopBleeding,
    restAndHeal: recovery.restAndHeal,
    healDialog: recovery.healDialog,
    healedHP: recovery.healedHP,
    rollSideEffect: recovery.rollSideEffect,
    offerSideEffect: recovery.offerSideEffect,
    sideEffectTable: recovery.sideEffectTable,
    setCondition: (actor, id, active = true, options = {}) => actor.toggleStatusEffect(id, { active, ...options }),
    cardHeader: dice.cardHeader,
    postCard: dice.postCard,
    enrichDice: dice.enrichDice,
    rollItem: itemRolls.rollItem,
    viewItemCopy: itemRolls.viewItemCopy,
    playAnimation: animations.playAnimation,
    animationNames: animations.animationNames,
    resultDetails: dice.resultDetails,
    signed: dice.signed,

    // Combat
    strikeBonus: combat.strikeBonus,
    rollAttack: combat.rollAttack,
    attackModes: combat.attackModes,
    rollCombat: combat.rollCombat,
    COMBAT_ROLLS: combat.COMBAT_ROLLS,
    askPowderWeather: combat.askPowderWeather,
    scenePowderWeather: combat.scenePowderWeather,
    setScenePowderWeather: combat.setScenePowderWeather,
    sceneWeatherDialog: combat.sceneWeatherDialog,
    rollDamage: combat.rollDamage,
    applyDamage: combat.applyDamage,
    rollManeuver: combat.rollManeuver,
    rollUnarmedDamage: combat.rollUnarmedDamage,
    rollDefense: combat.rollDefense,
    rollHorrorFactor: combat.rollHorrorFactor,
    requestHorrorSaves: combat.requestHorrorSaves,
    damageMultiplier: combat.damageMultiplier,
    damageButtons: combat.damageButtons,
    spendActions: actions.spendActions,
    isBluntWeapon: blunt.isBluntWeapon,
    markBluntWeapons: blunt.markBluntWeapons,
    canRollWithImpact: combat.canRollWithImpact,
    rolledWithImpact: combat.rolledWithImpact,
    setCover: cover.setCover,
    coverDialog: cover.coverDialog,
    actorCover: cover.actorCover,
    throughCover: cover.throughCover,
    coverReduction: cover.coverReduction,

    // Magic and psionics
    castSpell: magic.castSpell,
    rollSpellSave: magic.rollSpellSave,
    rollSpellDamage: magic.rollSpellDamage,
    newDay: magic.newDay,
    rollChangeSave: magic.rollChangeSave,
    usePsionic: magic.usePsionic,
    rollMagicAbility: magic.rollMagicAbility,

    // Time travel
    temporalMishap: timetravel.temporalMishap,
    rollTemporalMishap: timetravel.rollTemporalMishap,
    deviceMalfunction: timetravel.deviceMalfunction,
    practiceSpell: timetravel.practiceSpell,
    applyTeChange: timetravel.applyTeChange,

    // Vehicles and devices
    applyVehicleDamage: vehicle.applyVehicleDamage,
    rollControl: vehicle.rollControl,
    rollVehicleManeuver: vehicle.rollVehicleManeuver,
    rollEvade: vehicle.rollEvade,
    rollVehicleAttack: vehicle.rollVehicleAttack,
    rollVehicleDamage: vehicle.rollVehicleDamage,
    operateDevice: vehicle.operateDevice,
    operateTimeMachine: vehicle.operateTimeMachine,

    // Air & space combat (Guide to the Universe)
    airStats: air.airStats,
    rollTactic: air.rollTactic,
    rollVeer: air.rollVeer,
    rollPullOut: air.rollPullOut,
    rollEmergencyLanding: air.rollEmergencyLanding,
    rollCrash: air.rollCrash,
    rollDumbLuck: air.rollDumbLuck,

    // Character building
    rollAttributes: creation.rollAttributes,
    rollHitPoints: creation.rollHitPoints,
    rollLevelHitPoints: creation.rollLevelHitPoints,
    printAttribute: creation.printAttribute,
    requestReroll: creation.requestReroll,
    allowReroll: creation.allowReroll,
    rollAttribute: creation.rollAttribute,
    applyAnimal: animal.applyAnimal,
    removeAnimal: animal.removeAnimal,
    applyBackground: animal.applyBackground,

    /** Classes to extend: data models and sheets. */
    models: { CharacterData, NpcData, VehicleData, TimeMachineData, ItemDataBase, items: { ...ITEM_MODELS } },
    sheets: { PalladiumCharacterSheet, PalladiumNpcSheet, PalladiumVehicleSheet, PalladiumTimeMachineSheet,
      PalladiumItemSheet }
  };
}
