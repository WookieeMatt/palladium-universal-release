import { activeParty, addPartyToCombat } from "./party.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * The GM Party View (v1.19.0): every member of a party at a glance, live. Characters and NPCs show Hit Points,
 * S.D.C., armor, actions left, conditions, level / XP and a compact skill list; vehicles show S.D.C. and status.
 */
export class PartyView extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(party, options = {}) {
    super(options);
    this.party = party;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "palladium-party-view",
    classes: ["palladium-universal", "sheet", "pu-party-view"],
    window: { title: "GM Party View", icon: "fa-solid fa-users-viewfinder", resizable: true },
    position: { width: 900, height: 720 },
    actions: {
      openMember: PartyView.#onOpenMember,
      openParty: PartyView.#onOpenParty,
      sessionTools: PartyView.#onSessionTools,
      addToCombat: PartyView.#onAddToCombat
    }
  };

  /** @override */
  static PARTS = {
    body: { template: "systems/palladium-universal/templates/party/party-view.hbs", scrollable: [".pu-party-view-body"] }
  };

  /** @override */
  get title() {
    return `GM Party View: ${this.party?.name ?? "no party"}`;
  }

  /** @override */
  async _prepareContext(options) {
    const party = this.party;
    if ( !party ) return { party: null };
    const { pcs, npcs, vehicles } = party.system.actors;
    return { party, pcs: pcs.map(characterRow), npcs: npcs.map(characterRow), vehicles: vehicles.map(vehicleRow),
      inCombat: !!game.combat };
  }

  /** Re-render soon (several updates in a row render once). */
  refreshSoon() {
    clearTimeout(this._refresh);
    this._refresh = setTimeout(() => { if ( this.rendered ) this.render(); }, 150);
  }

  /** Whether a document change concerns this view. */
  concerns(actor) {
    if ( !actor || !this.party ) return false;
    if ( actor.id === this.party.id ) return true;
    return Object.values(this.party.system.members).some(list => list.includes(actor.uuid));
  }

  static async #onOpenMember(event, target) {
    const actor = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    return actor?.sheet.render({ force: true });
  }

  static #onOpenParty() {
    return this.party?.sheet.render({ force: true });
  }

  static async #onSessionTools() {
    const { openSessionTools } = await import("./session.mjs");
    return openSessionTools(this.party);
  }

  static #onAddToCombat() {
    return addPartyToCombat(this.party);
  }
}

/** One character or NPC line of the view. */
export function characterRow(actor) {
  const sys = actor.system;
  const h = sys.health ?? {};
  const armor = h.armor?.active ?? {};
  const pct = (value, max) => (max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0);
  const hp = h.hp ?? { value: 0, max: 0 };
  const sdc = h.sdc ?? { value: 0, max: 0 };
  const conditions = (sys.combat?.conditions?.active ?? []).map(id => ({ id, ...CONFIG.PALLADIUM.CONDITIONS[id] })).filter(c => c.label);
  if ( actor.statuses?.has?.("dead") ) conditions.push({ id: "dead", label: "Dead", img: "icons/svg/skull.svg" });
  const skills = actor.items.filter(i => (i.type === "skill") && !i.system.passive)
    .map(i => ({ name: i.name, pct: sys.skillPercentages?.(i)?.primary ?? i.system.base }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const level = sys.identity?.level ?? 1;
  const nextXP = CONFIG.PALLADIUM.XP_LEVELS?.[level];
  return {
    uuid: actor.uuid, name: actor.name, img: actor.img, type: actor.type,
    level, xp: sys.identity?.xp ?? 0, nextXP: (actor.type === "character") && Number.isFinite(nextXP) ? nextXP : null,
    levelUp: (actor.type === "character") && ((sys.identity?.xpLevel ?? level) > level),
    species: sys.identity?.species || "",
    hp: { value: hp.value, max: hp.max, pct: pct(hp.value, hp.max), low: h.bleedingOut, down: h.inComa || (hp.max > 0 && hp.value <= 0) },
    sdc: { value: sdc.value, max: sdc.max, pct: pct(sdc.value, sdc.max) },
    armor: armor.ar ? { name: armor.name || "Body armor", ar: armor.ar, sdc: armor.sdc?.value ?? 0, sdcMax: armor.sdc?.max ?? 0 } : null,
    naturalAR: h.naturalArmor?.total || 0,
    actions: { left: sys.combat?.actionsLeft ?? 0, total: sys.combat?.totals?.actions ?? 0 },
    conditions, skills
  };
}

/** One vehicle line of the view. */
export function vehicleRow(actor) {
  const h = actor.system.health ?? {};
  const sdc = h.sdc ?? {};
  const max = sdc.total ?? sdc.max ?? 0;
  return {
    uuid: actor.uuid, name: actor.name, img: actor.img,
    type: CONFIG.PALLADIUM.VEHICLE_TYPES?.[actor.system.vehicleType] ?? (actor.type === "timeMachine" ? "Time Machine" : "Vehicle"),
    sdc: { value: sdc.value ?? 0, max, pct: max > 0 ? Math.max(0, Math.min(100, Math.round(((sdc.value ?? 0) / max) * 100))) : 0 },
    status: h.totaled ? "Totaled" : h.incapacitated ? "Incapacitated" : "Operational",
    speed: actor.system.speed || ""
  };
}

let view = null;

/** Open the GM Party View for a party (default: the Active Party). GM only. */
export function openPartyView(party = activeParty()) {
  if ( !game.user.isGM ) return ui.notifications.warn("The Party View is for the GM.");
  if ( !party ) return ui.notifications.warn("There's no Active Party: create a Party actor, or pick one in the system settings.");
  if ( view?.rendered && (view.party?.id === party.id) ) return view.bringToFront?.() ?? view;
  view?.close?.();
  view = new PartyView(party);
  return view.render({ force: true });
}

/** Live refresh: any change to a member, its items, the party or the combat re-renders the open view. */
export function initPartyView() {
  const touch = actor => { if ( view?.rendered && view.concerns(actor) ) view.refreshSoon(); };
  Hooks.on("updateActor", actor => touch(actor));
  Hooks.on("createItem", item => touch(item.parent));
  Hooks.on("updateItem", item => touch(item.parent));
  Hooks.on("deleteItem", item => touch(item.parent));
  Hooks.on("deleteActor", actor => touch(actor));
  Hooks.on("updateCombat", () => { if ( view?.rendered ) view.refreshSoon(); });
  Hooks.on("deleteCombat", () => { if ( view?.rendered ) view.refreshSoon(); });

  // A GM Party View button in the Actors sidebar.
  Hooks.on("renderActorDirectory", (app, html) => {
    if ( !game.user.isGM ) return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    const actions = root?.querySelector(".header-actions");
    if ( !actions || actions.querySelector(".pu-party-view-button") ) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pu-party-view-button";
    button.innerHTML = `<i class="fa-solid fa-users-viewfinder"></i> <span>GM Party View</span>`;
    button.addEventListener("click", () => openPartyView());
    actions.append(button);
  });
}
