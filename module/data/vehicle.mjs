
const { HTMLField, NumberField, SchemaField, StringField } = foundry.data.fields;

const intField = (initial = 0, options = {}) => new NumberField({
  required: true, nullable: false, integer: true, initial, ...options
});
const textField = () => new StringField({ required: true, blank: true, initial: "" });
const pool = () => new SchemaField({ value: intField(), max: intField(0, { min: 0 }) });

/**
 * Data model for the "vehicle" Actor type (Redux p.73; Transdimensional p.54–59; Errata 2026 vehicle rules).
 * S.D.C. 0 = incapacitated (major repairs); −S.D.C. (double the damage) = totaled.
 */
export default class VehicleData extends foundry.abstract.TypeDataModel {

  /** @override */
  static defineSchema() {
    return {
      vehicleType: new StringField({ required: true, initial: "land", choices: Object.keys(CONFIG.PALLADIUM.VEHICLE_TYPES) }),
      health: new SchemaField({ sdc: pool() }),
      ar: intField(0, { min: 0 }),               // the vehicle's own A.R. (1st-edition stats): lower Strikes do nothing
      locations: new SchemaField(Object.fromEntries(Object.keys(CONFIG.PALLADIUM.VEHICLE_LOCATIONS).map(key => [key, new SchemaField({
        ar: intField(0, { min: 0 }),
        sdc: pool()
      })]))),
      speed: textField(),
      range: textField(),
      crew: textField(),
      passengers: textField(),
      cargo: textField(),
      cost: textField(),
      pilot: textField(),
      controlSkill: intField(0, { min: 0 }),     // pilot's skill % for Control Rolls
      controlBonus: intField(),                  // e.g. Vehicle Active Suspension +15%
      gunnerBonus: intField(),                   // Strike bonus for mounted weapons
      evadeBonus: intField(),                    // bonus to the pilot's Evade roll
      initiative: intField(),
      notes: new HTMLField({ required: true, blank: true })
    };
  }

  /** @override */
  prepareDerivedData() {
    // Modifications: extra S.D.C. (Ram-Prow) and Control Roll bonuses (Active Suspension).
    const mods = (this.parent?.items ?? []).filter(i => i.type === "vehicleMod");
    const sum = key => mods.reduce((n, i) => n + (i.system[key] ?? 0), 0);
    const sdc = this.health.sdc;
    sdc.bonus = sum("sdcBonus");
    sdc.total = sdc.max + sdc.bonus;
    this.health.incapacitated = (sdc.total > 0) && (sdc.value <= 0);
    this.health.totaled = (sdc.total > 0) && (sdc.value <= -sdc.total);
    this.combat = { totals: { initiative: this.initiative } };
    this.modControlBonus = sum("controlBonus");
    this.controlTarget = this.controlSkill + this.controlBonus + this.modControlBonus;
  }
}
