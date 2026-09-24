import CharacterData from "./character.mjs";

const { NumberField, StringField } = foundry.data.fields;

/**
 * Data model for the "npc" Actor type: the character rules with a Horror Factor
 * (Transdimensional p.89) and a short role line, shown on a compact sheet.
 */
export default class NpcData extends CharacterData {

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      horrorFactor: new NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
      role: new StringField({ required: true, blank: true, initial: "" })
    };
  }
}
