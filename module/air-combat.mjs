import { damageButtons } from "./combat.mjs";
import { postCard, signed } from "./dice.mjs";

const { DialogV2 } = foundry.applications.api;

/**
 * Air & space combat (TMNT Guide to the Universe): aircraft, spacecraft and flying characters.
 * Tactics are opposed d20 rolls plus the rated Speed Class and/or T.M.F.; chicken games are veer-off
 * rolls under Pilot skill + Air-to-Air Combat minus a growing penalty. Rolls post to chat; the GM
 * compares opposed results.
 */

/**
 * The air combat numbers of a vehicle or a flying character.
 * @param {Actor} actor
 * @returns {{sc: number, tmf: number, veer: number, penalty: number, pilot: string, flier: boolean, speed: object}}
 */
export function airStats(actor) {
  const sys = actor.system;
  if ( actor.type === "vehicle" ) {
    const air = sys.air;
    return { sc: air.speedClass, tmf: air.tmf, veer: sys.controlSkill + air.airToAir, landing: sys.controlSkill,
      penalty: air.machPenalty ?? 0, pilot: sys.pilot, flier: false, speed: air.speed, drive: air.drive,
      inSpace: air.inSpace, payload: air.payload };
  }
  const f = sys.flight;
  return { sc: f.effectiveSpeedClass, tmf: f.tmf, veer: f.veerTarget, landing: null, penalty: 0, pilot: actor.name,
    flier: true, speed: f.speed, drive: null, inSpace: false, payload: 0 };
}

/**
 * Roll an air combat tactic (CONFIG.PALLADIUM.AIR_TACTICS): d20 + Speed Class and/or T.M.F.
 * @param {Actor} actor
 * @param {string} key
 */
export async function rollTactic(actor, key) {
  const tactic = CONFIG.PALLADIUM.AIR_TACTICS[key];
  if ( !tactic ) return null;
  const a = airStats(actor);
  const parts = [];
  if ( tactic.sc ) parts.push(["Speed Class", a.sc]);
  if ( tactic.tmf ) parts.push([a.flier ? "T.M.F. (P.P.)" : "T.M.F.", a.tmf]);
  if ( a.penalty ) parts.push([`Over Mach 5 (Mach ${a.penalty})`, -a.penalty]);
  const bonus = parts.reduce((n, [, v]) => n + v, 0);
  const roll = await new Roll(`1d20 + ${bonus}`).evaluate();
  return postCard(actor, { title: tactic.label, label: tactic.label, result: roll.total, rolls: [roll],
    lines: [["d20", roll.dice[0].total], ...parts.map(([k, v]) => [k, signed(v)]), ["Total", roll.total]],
    notes: [tactic.text, `<span class="hint">Opposed: compare with the other side's roll. One tactic per melee.</span>`],
    flags: { "palladium-universal": { card: "airTactic", tactic: key } } });
}

/**
 * A chicken game veer-off roll: percentile under Pilot skill + Air-to-Air Combat − the game's penalty.
 * Asks for the game and the current penalty.
 * @param {Actor} actor
 * @param {object} [options]   {game, penalty} to skip the dialog
 */
export async function rollVeer(actor, { game, penalty } = {}) {
  const a = airStats(actor);
  if ( (game === undefined) || (penalty === undefined) ) {
    const games = Object.entries(CONFIG.PALLADIUM.CHICKEN_GAMES).map(([k, g]) => `<option value="${k}">${g.label}</option>`).join("");
    const result = await DialogV2.prompt({
      window: { title: `${actor.name}: Veer Off` },
      content: `<div class="form-group"><label>Chicken game</label><div class="form-fields"><select name="game">${games}</select></div></div>
        <div class="form-group"><label>Current penalty %</label><div class="form-fields"><input type="number" name="penalty" value="0" min="0" step="10"></div></div>
        <p class="hint">Veer by rolling under ${a.veer}% (Pilot skill + Air-to-Air Combat) minus the penalty. One chance to veer off.</p>`,
      ok: { label: "Roll", callback: (event, button) => ({ game: button.form.elements.game.value, penalty: Number(button.form.elements.penalty.value) || 0 }) },
      rejectClose: false
    });
    if ( !result ) return null;
    ({ game, penalty } = result);
  }
  const chicken = CONFIG.PALLADIUM.CHICKEN_GAMES[game] ?? CONFIG.PALLADIUM.CHICKEN_GAMES.ram;
  const target = a.veer - penalty - a.penalty;
  const roll = await new Roll("1d100").evaluate();
  const success = roll.total <= target;
  const lines = [[a.flier ? "Veer skill + Air-to-Air" : "Pilot skill + Air-to-Air", `${a.veer}%`], [`${chicken.label} penalty`, `−${penalty}%`]];
  if ( a.penalty ) lines.push([`Over Mach 5 (Mach ${a.penalty})`, `−${a.penalty}%`]);
  lines.push(["Chance", `${target}%`], ["d100", roll.total]);
  const notes = [`<span class="${success ? "pu-success" : "pu-failure"}">${success ? "Veers off" : "Fails to veer off"}</span>`];
  if ( game === "divebomb" && success ) notes.push("Now make the <strong>Pull-Out</strong> save (d20 under the T.M.F.) or crash at full speed.");
  if ( game === "skim" ) {
    const stage = Math.floor(penalty / 10);
    notes.push(`This round the ship takes <strong>${a.sc * (2 ** stage)}</strong> damage (Speed Class ${a.sc} × ${2 ** stage}).`);
  }
  notes.push(`<span class="hint">${chicken.text}</span>`);
  return postCard(actor, { title: `Veer Off: ${chicken.label}`, label: "Veer Off", result: roll.total, rolls: [roll], lines, notes });
}

/**
 * The Divebomber's Pull-Out save: d20 under the T.M.F., or the vehicle crashes at full speed.
 * @param {Actor} actor
 */
export async function rollPullOut(actor) {
  const a = airStats(actor);
  const roll = await new Roll("1d20").evaluate();
  const success = roll.total <= a.tmf;
  return postCard(actor, { title: "Pull-Out Save", label: "Pull-Out", result: roll.total, rolls: [roll],
    lines: [["d20", roll.total], ["Needs", `${a.tmf} or less (T.M.F.)`]],
    notes: [`<span class="${success ? "pu-success" : "pu-failure"}">${success ? "Pulls out of the dive" : "Crashes into the ground at full speed: no parachute or ejection seat escape"}</span>`] });
}

/**
 * Emergency Landing: percentile under the Pilot skill (without Air-to-Air), with the drive's penalty.
 * Failing still crashes, but at a third of the speed.
 * @param {Actor} actor   A vehicle
 */
export async function rollEmergencyLanding(actor) {
  const a = airStats(actor);
  const drive = CONFIG.PALLADIUM.DRIVE_TYPES[a.drive] ?? CONFIG.PALLADIUM.DRIVE_TYPES.other;
  const opts = await DialogV2.prompt({
    window: { title: `${actor.name}: Emergency Landing` },
    content: `<div class="form-group"><label>Hovering</label><div class="form-fields"><input type="checkbox" name="hover"></div></div>
      <div class="form-group"><label>Traveling over 720 mph</label><div class="form-fields"><input type="checkbox" name="fast"></div></div>
      <div class="form-group"><label>Other penalty %</label><div class="form-fields"><input type="number" name="other" value="0"></div></div>`,
    ok: { label: "Roll", callback: (event, button) => ({ hover: button.form.elements.hover.checked, fast: button.form.elements.fast.checked,
      other: Number(button.form.elements.other.value) || 0 }) },
    rejectClose: false
  });
  if ( !opts ) return null;
  const lines = [["Pilot skill", `${a.landing}%`]];
  if ( drive.landing ) lines.push([drive.label, `${drive.landing}%`]);
  if ( opts.hover ) lines.push(["Hovering", "−15%"]);
  if ( opts.fast ) lines.push(["Over 720 mph", "−20%"]);
  if ( opts.other ) lines.push(["Other", `${-Math.abs(opts.other)}%`]);
  const target = a.landing + drive.landing - (opts.hover ? 15 : 0) - (opts.fast ? 20 : 0) - Math.abs(opts.other);
  const roll = await new Roll("1d100").evaluate();
  const success = roll.total <= target;
  lines.push(["Chance", `${target}%`], ["d100", roll.total]);
  return postCard(actor, { title: "Emergency Landing", label: "Landing", result: roll.total, rolls: [roll], lines,
    notes: [`<span class="${success ? "pu-success" : "pu-failure"}">${success ? "Lands safely" : "Crashes, but at only a third of its speed"}</span>`] });
}

/**
 * Crash damage from the impact table: by the heaviest vehicle's payload rating, a die per 10 mph
 * (per mph over 720 mph). Both vehicles take the same damage; occupants take half with seat belts or
 * flight/space suits, double without.
 * @param {Actor} actor
 * @param {object} [options]   {mph, payload} to skip the dialog
 */
export async function rollCrash(actor, { mph, payload } = {}) {
  const a = airStats(actor);
  if ( (mph === undefined) || (payload === undefined) ) {
    const opts = await DialogV2.prompt({
      window: { title: `${actor.name}: Crash Damage` },
      content: `<div class="form-group"><label>Speed of impact (mph)</label><div class="form-fields"><input type="number" name="mph" value="${a.speed?.mph ?? 0}" min="0"></div></div>
        <div class="form-group"><label>Heaviest payload rating (lb)</label><div class="form-fields"><input type="number" name="payload" value="${a.payload}" min="0"></div></div>
        <p class="hint">Relative speed: add the speeds of a head-on collision; use the difference when hitting a vehicle from behind.</p>`,
      ok: { label: "Roll", callback: (event, button) => ({ mph: Number(button.form.elements.mph.value) || 0, payload: Number(button.form.elements.payload.value) || 0 }) },
      rejectClose: false
    });
    if ( !opts ) return null;
    ({ mph, payload } = opts);
  }
  const row = CONFIG.PALLADIUM.CRASH_DAMAGE.find(r => payload < r.under);
  const count = mph > 720 ? mph : Math.ceil(mph / 10);
  if ( count <= 0 ) return ui.notifications.warn("No speed, no crash damage.");
  const [n, die] = row.die.includes("d") && /^\d/.test(row.die) ? row.die.split("d") : [1, row.die.slice(1)];
  // Very large crashes: roll up to 1,000 groups and scale (the result is unsurvivable either way).
  const groups = Math.min(count, 1000);
  const roll = await new Roll(`${groups * Number(n)}d${die}${count > groups ? ` * ${Math.round(count / groups)}` : ""}`).evaluate();
  const lines = [["Speed", `${mph} mph`], ["Payload rating", `${payload.toLocaleString()} lb`],
    ["Damage", `${n > 1 ? n : 1}${`D${die}`} per ${mph > 720 ? "mph" : "10 mph"} × ${count}`], ["Total", roll.total]];
  return postCard(actor, { title: "Crash", label: "Crash Damage", result: roll.total, rolls: [roll], lines,
    notes: [`Both vehicles (or the vehicle and the object) take ${roll.total}. Occupants: <strong>${Math.floor(roll.total / 2)}</strong> with seat belts or a flight/space suit (suits absorb half, up to 48 / 36), <strong>${roll.total * 2}</strong> without.`,
      `<span class="hint">Dumb Luck: a 20% or less on percentile throws a character clear with only 4D6.</span>`],
    buttons: damageButtons(), flags: { "palladium-universal": { card: "damage", actorUuid: actor.uuid, damage: roll.total, strike: null } } });
}

/**
 * Dumb Luck: roll 20% or less and survive any crash, thrown clear with only 4D6 damage.
 * @param {Actor} actor
 */
export async function rollDumbLuck(actor) {
  const roll = await new Roll("1d100").evaluate();
  const lucky = roll.total <= 20;
  const rolls = [roll];
  const notes = [];
  if ( lucky ) {
    const dmg = await new Roll("4d6").evaluate();
    rolls.push(dmg);
    notes.push(`<span class="pu-success">Thrown clear!</span> Takes only <strong>${dmg.total}</strong> damage (4D6).`);
  } else notes.push(`<span class="pu-failure">No luck</span>: full crash damage.`);
  return postCard(actor, { title: "Dumb Luck", label: "Dumb Luck", result: roll.total, rolls,
    lines: [["Needs", "20% or less"], ["d100", roll.total]], notes });
}

/**
 * A weapon's range in space: energy weapons ×10, projectiles ×2 (Guide to the Universe). Scales the
 * numbers in a printed range ("1,500 ft" → "15,000 ft").
 */
export function spaceRange(range, weaponType) {
  const factor = weaponType === "energy" ? 10 : ["firearm", "explosive", "bow", "thrown", "blackPowder"].includes(weaponType) ? 2 : 1;
  if ( (factor === 1) || !range ) return range;
  return range.replace(/\d[\d,]*(\.\d+)?/g, n => (Number(n.replace(/,/g, "")) * factor).toLocaleString("en-US"));
}
