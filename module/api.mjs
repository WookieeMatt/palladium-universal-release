import * as actions from "./actions.mjs";
import * as animal from "./animal.mjs";
import * as combat from "./combat.mjs";
import * as creation from "./creation.mjs";
import * as dice from "./dice.mjs";
import * as welcome from "./welcome.mjs";
import * as audit from "./audit.mjs";
import * as itemRolls from "./item-rolls.mjs";
import * as animations from "./animations.mjs";
import * as air from "./air-combat.mjs";
import * as magic from "./magic.mjs";
import * as timetravel from "./timetravel.mjs";
import * as vehicle from "./vehicle.mjs";
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
    auditJournal: audit.auditJournal,
    openAudit: audit.openAudit,
    recommendedModules: welcome.recommendedModules,
    rollSaveVsComa: dice.rollSaveVsComa,
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

    // Magic and psionics
    castSpell: magic.castSpell,
    rollSpellSave: magic.rollSpellSave,
    rollSpellDamage: magic.rollSpellDamage,
    newDay: magic.newDay,
    rollChangeSave: magic.rollChangeSave,
    usePsionic: magic.usePsionic,

    // Time travel
    temporalMishap: timetravel.temporalMishap,
    rollTemporalMishap: timetravel.rollTemporalMishap,
    deviceMalfunction: timetravel.deviceMalfunction,
    practiceSpell: timetravel.practiceSpell,
    applyTeChange: timetravel.applyTeChange,

    // Vehicles and devices
    applyVehicleDamage: vehicle.applyVehicleDamage,
    rollControl: vehicle.rollControl,
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
