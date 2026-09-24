import VehicleData from "./vehicle.mjs";

const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

const textField = () => new StringField({ required: true, blank: true, initial: "" });
const intField = (initial = 0) => new NumberField({ required: true, nullable: false, integer: true, initial });

/**
 * A device recorded on a time machine: a copy of the dropped item's data, not an owned item.
 */
const entryField = () => new SchemaField({
  id: textField(),
  name: textField(),
  img: textField(),
  sourceUuid: textField(),
  kind: textField(),            // device type, or "installation"
  details: textField(),
  cost: textField(),
  skill: textField(),
  skillBonus: intField(),
  assists: textField(),
  recharge: textField(),
  maxArea: textField(),
  malfunction: textField(),
  malfunctionTable: textField()
});

/**
 * Data model for the "timeMachine" Actor type: a vehicle (Transdimensional p.54–59) carrying an installed
 * Time Machine or Cross-Dimensional Device, temporal support devices (readouts) and installation records.
 */
export default class TimeMachineData extends VehicleData {

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      timeDevice: new ArrayField(entryField()),        // at most one, enforced when dropping
      supportDevices: new ArrayField(entryField()),
      installations: new ArrayField(entryField()),
      charged: new BooleanField({ initial: true }),
      currentTime: textField(),                        // e.g. "Cycle Prime, 1988 A.D."
      destination: textField(),
      jumpLog: new ArrayField(new SchemaField({ from: textField(), to: textField(), result: textField() }))
    };
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.device = this.timeDevice[0] ?? null;
    const all = [...this.timeDevice, ...this.supportDevices, ...this.installations];
    this.totalCost = CONFIG.PALLADIUM.formatCost(all.reduce((n, e) => n + CONFIG.PALLADIUM.parseCost(e.cost), 0));
  }
}
