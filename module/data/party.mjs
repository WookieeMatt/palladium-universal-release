const { ArrayField, HTMLField, SchemaField, StringField } = foundry.data.fields;

const uuidList = () => new ArrayField(new StringField({ required: true, blank: false }));

/** Which member list an actor type goes in. */
export const PARTY_LISTS = {
  character: "pcs",
  npc: "npcs",
  vehicle: "vehicles",
  timeMachine: "vehicles"
};

/**
 * Data model for the "party" Actor type (v1.19.0): links to the party's characters, NPCs and vehicles
 * (world actor UUIDs, not copies) and a shared notes page. Its token stands for the whole group on a map.
 */
export default class PartyData extends foundry.abstract.TypeDataModel {

  /** @override */
  static defineSchema() {
    return {
      members: new SchemaField({
        pcs: uuidList(),
        npcs: uuidList(),
        vehicles: uuidList()
      }),
      notes: new HTMLField({ required: true, blank: true })
    };
  }

  /**
   * The member actors, by list (missing ones, e.g. deleted actors, are left out).
   * @returns {{pcs: Actor[], npcs: Actor[], vehicles: Actor[]}}
   */
  get actors() {
    const resolve = list => list.map(uuid => globalThis.fromUuidSync?.(uuid)).filter(a => a);
    return { pcs: resolve(this.members.pcs), npcs: resolve(this.members.npcs), vehicles: resolve(this.members.vehicles) };
  }

  /** PCs and NPCs (who fight; vehicles don't join the Combat Tracker). */
  get combatants() {
    const { pcs, npcs } = this.actors;
    return [...pcs, ...npcs];
  }
}
