import * as actions from "./actions.mjs";
import * as animal from "./animal.mjs";
import * as combat from "./combat.mjs";
import * as dice from "./dice.mjs";
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
    rollSaveVsComa: dice.rollSaveVsComa,
    cardHeader: dice.cardHeader,
    signed: dice.signed,

    // Combat
    strikeBonus: combat.strikeBonus,
    rollAttack: combat.rollAttack,
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

    // Character building
    applyAnimal: animal.applyAnimal,
    removeAnimal: animal.removeAnimal,
    applyBackground: animal.applyBackground,

    /** Classes to extend: data models and sheets. */
    models: { CharacterData, NpcData, VehicleData, TimeMachineData, ItemDataBase, items: { ...ITEM_MODELS } },
    sheets: { PalladiumCharacterSheet, PalladiumNpcSheet, PalladiumVehicleSheet, PalladiumTimeMachineSheet,
      PalladiumItemSheet }
  };
}
