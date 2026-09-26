import * as PU from "./config.mjs";
import CharacterData from "./data/character.mjs";
import NpcData from "./data/npc.mjs";
import VehicleData from "./data/vehicle.mjs";
import TimeMachineData from "./data/time-machine.mjs";
import PartyData from "./data/party.mjs";
import { ITEM_MODELS } from "./data/items.mjs";
import PalladiumCharacterSheet from "./sheets/character-sheet.mjs";
import PalladiumItemSheet from "./sheets/item-sheet.mjs";
import PalladiumNpcSheet from "./sheets/npc-sheet.mjs";
import PalladiumVehicleSheet from "./sheets/vehicle-sheet.mjs";
import PalladiumTimeMachineSheet from "./sheets/time-machine-sheet.mjs";
import PalladiumPartySheet from "./sheets/party-sheet.mjs";
import { registerPartySettings } from "./party.mjs";
import { initPartyView } from "./party-view.mjs";
import { initCombatTracker } from "./combat-tracker.mjs";
import { initConditions } from "./conditions.mjs";
import { initRecovery } from "./recovery.mjs";
import { initBlunt } from "./blunt.mjs";
import { initFx } from "./fx.mjs";
import { initPause } from "./pause.mjs";
import { initAutoEquip } from "./equip.mjs";
import { initAmmoDefaults } from "./ammo-defaults.mjs";
import { initShowdown } from "./showdown.mjs";
import { initMoney } from "./money.mjs";
import { initSkillModifiers } from "./skill-modifiers.mjs";
import { onRenderChatMessage } from "./combat.mjs";
import { onDeleteCombat, onUpdateCombat } from "./actions.mjs";
import { buildApi } from "./api.mjs";
import { registerTcriDice, TCRI_FINISHES } from "./dice-so-nice.mjs";
import { resetWelcome, welcomeOnce } from "./welcome.mjs";
import { initAudit, registerAuditSettings } from "./audit.mjs";
import { registerResetSettings } from "./reset.mjs";

Hooks.once("init", function () {
  registerAuditSettings();
  registerResetSettings();
  // Attribute dice (v1.36): the book's 3D6 only, or let players roll with Custom dice (noted on the card and audit).
  game.settings.register("palladium-universal", "attributeDice", {
    name: "Attribute Dice",
    hint: "Roll Attributes always offers the book's 3D6 (16+ explodes +1D6). Allow Custom to let players type their own dice (e.g. 4d6kh3) and exploding rule; the chat card and the audit say so. The GM can always use Custom.",
    scope: "world", config: true, type: String,
    choices: { book: "Book only (3D6)", custom: "Players may use Custom dice" }, default: "book"
  });
  registerPartySettings();
  initPartyView();
  initMoney();
  initSkillModifiers();
  initAudit();
  console.log("Palladium Universal | Initializing system");

  // An editable copy of the rules tables: modules change them in their own "init" hook.
  CONFIG.PALLADIUM = { ...PU };
  game.palladium = buildApi();

  // Data models
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.dataModels.npc = NpcData;
  CONFIG.Actor.dataModels.vehicle = VehicleData;
  CONFIG.Actor.dataModels.timeMachine = TimeMachineData;
  CONFIG.Actor.dataModels.party = PartyData;
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
    },
    party: { bar: [], value: [] }
  };

  // Token status effects are this system's conditions (plus "dead" for defeated combatants).
  CONFIG.statusEffects = CONFIG.PALLADIUM.statusEffects();

  // Dice So Nice: make the T.C.R.I. Dice the preferred look for players who haven't picked their own.
  game.settings.register("palladium-universal", "tcriDiceDefault", {
    name: "T.C.R.I. Dice by Default",
    hint: "With Dice So Nice, players who haven't customized their dice roll the T.C.R.I. Dice (green glitter liquid). Everyone can still pick them in Dice So Nice's settings.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });
  game.settings.register("palladium-universal", "tcriDiceFinish", {
    name: "T.C.R.I. Dice Finish",
    hint: "Glass looks like the real dice. If throws stutter on this computer, choose Fast (solid, glossy dice).",
    scope: "client",
    config: true,
    type: String,
    choices: TCRI_FINISHES,
    default: "glass",
    requiresReload: true
  });

  // Automated Animations (with Sequencer and JB2A): play animations when things are used.
  game.settings.register("palladium-universal", "defaultArt", {
    name: "Default Portrait",
    hint: "The portrait and token new characters and NPCs start with (compendium NPCs with a default portrait follow it too when imported). Your own art is never replaced.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      bw: "Mutant turtle (black and white)",
      color: "Mutant turtle (color)",
      foundry: "Foundry's mystery man"
    },
    default: "bw"
  });

  game.settings.register("palladium-universal", "journalTheme", {
    name: "TMNT Journal Style",
    hint: "Journals (including the compendium journals and the System Guide) use the character sheet look: green title bar, parchment pages, comic headings and green tables. Turn off to keep Foundry's journal style.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("palladium-universal", "animations", {
    name: "Automated Animations",
    hint: "With the Automated Animations module active, attacks, maneuvers, spells, psionics, item rolls and devices play animations (JB2A via Sequencer). Damage, saves and skill checks don't.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Team Character generation (p.12): teammates share their highest exceptional bonus die.
  game.settings.register("palladium-universal", "teamGeneration", {
    name: "Team Character Generation",
    hint: "When generating an attribute scores 16–18, use a higher exceptional bonus die rolled for that attribute by another character in the same Actors folder (the team).",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Initiative: d20 + Initiative bonus, highest first (p.84)
  CONFIG.Combat.initiative = { formula: "1d20 + @combat.totals.initiative", decimals: 0 };
  initCombatTracker();
  initConditions();
  initRecovery();
  initBlunt();
  initFx();
  initPause();
  initAutoEquip();
  initAmmoDefaults();
  initShowdown();

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
  foundry.documents.collections.Actors.registerSheet("palladium-universal", PalladiumPartySheet, {
    types: ["party"],
    makeDefault: true,
    label: "PALLADIUMUNIVERSAL.PartySheetName"
  });
  foundry.documents.collections.Items.registerSheet("palladium-universal", PalladiumItemSheet, {
    makeDefault: true,
    label: "PALLADIUMUNIVERSAL.ItemSheetName"
  });

  // Partials shared by item sheets
  foundry.applications.handlebars.loadTemplates([
    "systems/palladium-universal/templates/item/parts/effects.hbs",
    "systems/palladium-universal/templates/item/parts/description.hbs",
    "systems/palladium-universal/templates/vehicle/time-machine.hbs",
    "systems/palladium-universal/templates/actor/parts/item-roll.hbs",
    "systems/palladium-universal/templates/actor/parts/counter.hbs",
    "systems/palladium-universal/templates/actor/parts/air-combat.hbs"
  ]);
});

// After every module's "init": pick up conditions that modules added to CONFIG.PALLADIUM.
Hooks.once("setup", function () {
  const known = new Set(CONFIG.statusEffects.map(e => e.id));
  for ( const effect of CONFIG.PALLADIUM.statusEffects() ) {
    if ( !known.has(effect.id) ) CONFIG.statusEffects.push(effect);
  }

  // Black powder misfire weather is asked when a black powder weapon fires; this remembers the last choice.
  game.settings.register("palladium-universal", "powderWeatherLast", {
    scope: "client",
    config: false,
    type: String,
    default: "dry"
  });

  // The GM's welcome card (recommended modules): shown once, and again when the module list grows.
  game.settings.register("palladium-universal", "welcomeShown", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
  game.settings.register("palladium-universal", "welcomeVersion", {
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
  game.settings.register("palladium-universal", "resetWelcome", {
    name: "Show the Welcome Cards Again",
    hint: "Tick and save: the GM's module card and every player's welcome card show again the next time each of you loads the world. The box unticks itself.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => { if ( value ) resetWelcome(); }
  });
});

// First run in a world: the active GM gets the recommended modules card; each player gets a short welcome, once.
Hooks.once("ready", () => welcomeOnce());

// Dice So Nice: the T.C.R.I. Dice (theme and animated dice system).
Hooks.once("diceSoNiceReady", dice3d => registerTcriDice(dice3d));

// Actions per Round reset each new round
Hooks.on("updateCombat", onUpdateCombat);
Hooks.on("deleteCombat", onDeleteCombat);

// Journals and journal pages take the sheet look (world setting "journalTheme").
function styleJournal(app, element) {
  let on = true;
  try { on = game.settings.get("palladium-universal", "journalTheme"); } catch(err) { on = true; }
  const root = element instanceof HTMLElement ? element : app.element;
  root?.classList.toggle("pu-journal", on);
}
Hooks.on("renderJournalEntrySheet", styleJournal);
Hooks.on("renderJournalEntryPageSheet", styleJournal);

// Buttons on attack and damage chat cards
Hooks.on("renderChatMessageHTML", onRenderChatMessage);

// Characters and NPCs: the default portrait and token is the mutant turtle (world setting "defaultArt":
// black and white, color, or Foundry's mystery man), and new ones get a round token with the green ring.
const MYSTERY_MAN = "icons/svg/mystery-man.svg";
/** A new Party actor's portrait and token (v1.19.0). */
const PARTY_ART = "systems/palladium-universal/assets/tokens/mutant-turtle-color.svg";
export const ACTOR_ART = {
  bw: "systems/palladium-universal/assets/tokens/mutant-turtle.svg",
  color: "systems/palladium-universal/assets/tokens/mutant-turtle-color.svg",
  foundry: MYSTERY_MAN
};
/** The default portrait for characters and NPCs, per the world setting. */
export function defaultActorArt() {
  let choice = "bw";
  try { choice = game.settings.get("palladium-universal", "defaultArt"); } catch(err) { choice = "bw"; }
  return ACTOR_ART[choice] ?? ACTOR_ART.bw;
}
/** Any of the defaults (or no image): replaced by the current choice, so compendium NPCs follow the setting. */
const isDefaultArt = src => !src || Object.values(ACTOR_ART).includes(src);

Hooks.once("init", () => {
  const ActorClass = CONFIG.Actor?.documentClass;
  const getDefaultArtwork = ActorClass?.getDefaultArtwork;
  if ( typeof getDefaultArtwork !== "function" ) return;
  ActorClass.getDefaultArtwork = function(actorData = {}) {
    const art = getDefaultArtwork.call(this, actorData);
    if ( !["character", "npc"].includes(actorData.type) ) return art;
    const src = defaultActorArt();
    return { ...art, img: src, texture: { ...(art.texture ?? {}), src } };
  };
});

Hooks.on("preCreateActor", (actor, data) => {
  // A party: everyone can move its token and write in its notes (only the GM changes the members).
  if ( actor.type === "party" ) {
    const update = { "ownership.default": CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER, "prototypeToken.actorLink": true };
    if ( isDefaultArt(actor.img) || (actor.img === MYSTERY_MAN) ) {
      update.img = PARTY_ART;
      update["prototypeToken.texture.src"] = PARTY_ART;
    }
    actor.updateSource(update);
    return;
  }
  if ( !["character", "npc"].includes(actor.type) ) return;
  const update = {};
  const art = defaultActorArt();
  if ( isDefaultArt(actor.img) && (actor.img !== art) ) update.img = art;
  const token = actor.prototypeToken?.texture?.src;
  if ( isDefaultArt(token) && (token !== art) ) update["prototypeToken.texture.src"] = art;
  if ( !foundry.utils.hasProperty(data, "prototypeToken.ring.enabled") ) Object.assign(update, {
    "prototypeToken.ring.enabled": true,
    "prototypeToken.ring.colors.ring": "#3d7a4d",
    "prototypeToken.ring.colors.background": "#efece0",
    "prototypeToken.actorLink": actor.type === "character"
  });
  if ( !foundry.utils.isEmpty(update) ) actor.updateSource(update);
});
