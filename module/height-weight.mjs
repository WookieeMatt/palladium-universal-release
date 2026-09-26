import { postCard } from "./dice.mjs";

/**
 * Height & Weight (p.17): rolled once at character creation from the Size Level and the animal's build
 * (Short / Medium / Long), after the Bio-E is spent (the size is final then). Heights are inches; weights are
 * pounds (Size Level 1: ounces). "1D%" = percentile, "2D%" = two percentile rolls added. Size Levels 21–25 (giant
 * dinosaurs, Transdimensional) have no table: fill them in by hand.
 */
export const HEIGHT_WEIGHT = {
  1: { weight: "3d6", unit: "oz", short: "1d6", medium: "2d6", long: "3d6" },
  2: { weight: "1d6", short: "3d6", medium: "12 + 2d6", long: "12 + 2d6" },
  3: { weight: "4 + 1d6", short: "12 + 1d6", medium: "12 + 3d6", long: "12 + 3d6" },
  4: { weight: "10 + 2d6", short: "12 + 3d6", medium: "24 + 2d6", long: "24 + 3d6" },
  5: { weight: "20 + 4d6", short: "24 + 1d6", medium: "36 + 1d6", long: "36 + 3d6" },
  6: { weight: "40 + 6d6", short: "24 + 2d6", medium: "36 + 2d6", long: "48 + 3d6" },
  7: { weight: "75 + 3d10", short: "24 + 3d6", medium: "48 + 1d6", long: "60 + 2d6" },
  8: { weight: "100 + 6d10", short: "36 + 1d6", medium: "48 + 2d6", long: "60 + 3d6" },
  9: { weight: "150 + 3d10", short: "36 + 2d6", medium: "60 + 2d6", long: "72 + 2d6" },
  10: { weight: "175 + 3d10", short: "36 + 3d6", medium: "60 + 3d6", long: "72 + 3d6" },
  11: { weight: "200 + 6d10", short: "48 + 1d6", medium: "72 + 1d6", long: "84 + 2d6" },
  12: { weight: "250 + 6d10", short: "48 + 2d6", medium: "72 + 2d6", long: "84 + 3d6" },
  13: { weight: "300 + 6d10", short: "48 + 3d6", medium: "72 + 3d6", long: "96 + 2d6" },
  14: { weight: "350 + 6d10", short: "60 + 1d6", medium: "84 + 1d6", long: "96 + 3d6" },
  15: { weight: "400 + 1d100", short: "60 + 2d6", medium: "84 + 2d6", long: "108 + 2d6" },
  16: { weight: "500 + 1d100", short: "60 + 3d6", medium: "84 + 3d6", long: "108 + 3d6" },
  17: { weight: "600 + 2d100", short: "72 + 1d6", medium: "96 + 1d6", long: "120 + 2d6" },
  18: { weight: "800 + 2d100", short: "72 + 2d6", medium: "96 + 2d6", long: "120 + 3d6" },
  19: { weight: "1000 + 5d100", short: "72 + 3d6", medium: "96 + 3d6", long: "132 + 2d6" },
  20: { weight: "1500 + 1d100 * 100", short: "72 + 4d6", medium: "108 + 1d6", long: "132 + 3d6" }
};

const BUILDS = { short: "Short", medium: "Medium", long: "Long" };

/** 62 → "5 ft 2 in"; 9 → "9 in". */
export function formatHeight(inches) {
  const n = Math.round(Number(inches) || 0);
  if ( n < 12 ) return `${n} in`;
  const ft = Math.floor(n / 12), rest = n % 12;
  return rest ? `${ft} ft ${rest} in` : `${ft} ft`;
}

/** 1500 → "1,500 lb"; SL 1 in ounces. */
export function formatWeight(value, unit = "lb") {
  return `${Math.round(Number(value) || 0).toLocaleString("en-US")} ${unit}`;
}

/** Has this character's height and weight been set? */
export function hasHeightWeight(actor) {
  const id = actor.system.identity ?? {};
  return !!(String(id.height ?? "").trim() && String(id.weight ?? "").trim());
}

/**
 * Roll Height and Weight for the character's current Size Level and build; writes them in the header and
 * posts one card. Once set, rolling again needs Reset Character.
 * @param {Actor} actor
 */
export async function rollHeightWeight(actor) {
  if ( hasHeightWeight(actor) ) {
    ui.notifications?.info(`${actor.name}'s height and weight are already set. To start over, use Reset Character at the end of the Creation Checklist.`);
    return null;
  }
  const sl = Number(actor.system.mutation?.sizeLevel) || 6;
  const row = HEIGHT_WEIGHT[sl];
  if ( !row ) {
    ui.notifications?.warn(`There is no height and weight table for Size Level ${sl}: type them in the header.`);
    return null;
  }
  const build = BUILDS[actor.system.mutation?.build] ? actor.system.mutation.build : "medium";
  const heightRoll = await new Roll(row[build]).evaluate();
  const weightRoll = await new Roll(row.weight).evaluate();
  const height = formatHeight(heightRoll.total);
  const weight = formatWeight(weightRoll.total, row.unit);
  await actor.update({ "system.identity.height": height, "system.identity.weight": weight });
  await postCard(actor, {
    title: "Height & Weight", label: "Height", result: height, rolls: [heightRoll, weightRoll],
    caption: `Size Level ${sl}, ${BUILDS[build]} build (p.17)`,
    lines: [["Height", `${row[build].replace(/\s/g, "")} in = ${height}`], ["Weight", `${row.weight.replace(/\s/g, "").replace("1d100*100", "1D%×100").replace(/d100/g, "D%")} ${row.unit ?? "lb"} = ${weight}`]],
    flags: { "palladium-universal": { card: "heightWeight", actorUuid: actor.uuid } }
  });
  Hooks.callAll("palladium.rollHeightWeight", actor, { height, weight, sizeLevel: sl, build });
  return { height, weight };
}
