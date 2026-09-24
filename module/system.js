import * as PU from "./config.mjs";
import CharacterData from "./data/character.mjs";
import NpcData from "./data/npc.mjs";
import VehicleData from "./data/vehicle.mjs";
import TimeMachineData from "./data/time-machine.mjs";
import { ITEM_MODELS } from "./data/items.mjs";
import PalladiumCharacterSheet from "./sheets/character-sheet.mjs";
import PalladiumItemSheet from "./sheets/item-sheet.mjs";
import PalladiumNpcSheet from "./sheets/npc-sheet.mjs";
import PalladiumVehicleSheet from "./sheets/vehicle-sheet.mjs";
import PalladiumTimeMachineSheet from "./sheets/time-machine-sheet.mjs";
import { onRenderChatMessage } from "./combat.mjs";
import { onDeleteCombat, onUpdateCombat } from "./actions.mjs";

Hooks.once("init", function () {
  console.log("Palladium Universal | Initializing system");

  CONFIG.PALLADIUM = PU;

  // Data models
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.dataModels.npc = NpcData;
  CONFIG.Actor.dataModels.vehicle = VehicleData;
  CONFIG.Actor.dataModels.timeMachine = TimeMachineData;
  Object.assign(CONFIG.Item.dataModels, ITEM_MODELS);
  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["health.hp", "health.sdc", "health.armor.sdc", "health.mdc", "health.forceField", "magic.ppe", "psionics.isp"],
      value: ["combat.totals.actions"]
    },
    npc: {
      bar: ["health.hp", "health.sdc", "health.armor.sdc"],
      value: ["combat.totals.actions", "horrorFactor"]
    },
    vehicle: {
      bar: ["health.sdc", "locations.hull.sdc", "locations.crew.sdc"],
      value: []
    },
    timeMachine: {
      bar: ["health.sdc", "locations.hull.sdc", "locations.crew.sdc"],
      value: []
    }
  };

  // Token status effects are this system's conditions (plus "dead" for defeated combatants).
  CONFIG.statusEffects = PU.statusEffects();

  // Black powder misfire weather (Transdimensional p.68), set by the GM.
  game.settings.register("palladium-universal", "powderWeather", {
    name: "Black Powder Weather",
    hint: "Adds to black powder misfire chances: humid +5%, rain +15%, downpour or dunking +35%.",
    scope: "world",
    config: true,
    type: String,
    choices: Object.fromEntries(Object.entries(PU.POWDER_WEATHER).map(([k, v]) => [k, v.label])),
    default: "dry"
  });

  // Initiative: d20 + Initiative bonus, highest first (p.84)
  CONFIG.Combat.initiative = { formula: "1d20 + @combat.totals.initiative", decimals: 0 };

  // Sheets
  foundry.documents.collections.Actors.registerSheet("palladium-universal", PalladiumCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "PALLADIUMUNIVERSAL.SheetName"
  });
  foundry.documents.collections.Actors.registerSheet("palladium-universal", PalladiumNpcSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "PALLADIUMUNIVERSAL.NpcSheetName"
  });
  foundry.documents.collections.Actors.registerSheet("palladium-universal", PalladiumVehicleSheet, {
    types: ["vehicle"],
    makeDefault: true,
    label: "PALLADIUMUNIVERSAL.VehicleSheetName"
  });
  foundry.documents.collections.Actors.registerSheet("palladium-universal", PalladiumTimeMachineSheet, {
    types: ["timeMachine"],
    makeDefault: true,
    label: "PALLADIUMUNIVERSAL.TimeMachineSheetName"
  });
  foundry.documents.collections.Items.registerSheet("palladium-universal", PalladiumItemSheet, {
    makeDefault: true,
    label: "PALLADIUMUNIVERSAL.ItemSheetName"
  });

  // Partials shared by item sheets
  foundry.applications.handlebars.loadTemplates([
    "systems/palladium-universal/templates/item/parts/effects.hbs",
    "systems/palladium-universal/templates/item/parts/description.hbs",
    "systems/palladium-universal/templates/vehicle/time-machine.hbs"
  ]);
});

// Actions per Round reset each new round
Hooks.on("updateCombat", onUpdateCombat);
Hooks.on("deleteCombat", onDeleteCombat);

// Buttons on attack and damage chat cards
Hooks.on("renderChatMessageHTML", onRenderChatMessage);

// New characters and NPCs get a round portrait token with the system's green ring.
Hooks.on("preCreateActor", (actor, data) => {
  if ( !["character", "npc"].includes(actor.type) ) return;
  if ( foundry.utils.hasProperty(data, "prototypeToken.ring.enabled") ) return;
  actor.updateSource({
    "prototypeToken.ring.enabled": true,
    "prototypeToken.ring.colors.ring": "#3d7a4d",
    "prototypeToken.ring.colors.background": "#efece0",
    "prototypeToken.actorLink": actor.type === "character"
  });
});
