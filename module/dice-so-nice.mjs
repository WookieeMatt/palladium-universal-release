/**
 * T.C.R.I. Dice for Dice So Nice: translucent green dice filled with glittering liquid that
 * swirls while they roll. Registers a Dice So Nice dice system (the seven standard dice with an
 * animated liquid shader) and a matching theme (colors, glass material and a glitter texture).
 */

export const TCRI_ID = "palladium-tcri";
const TEXTURE_ID = "palladium-tcri-liquid";
const TYPES = {
  d4: ["1", "2", "3", "4"],
  d6: ["1", "2", "3", "4", "5", "6"],
  d8: ["1", "2", "3", "4", "5", "6", "7", "8"],
  d10: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  d100: ["10", "20", "30", "40", "50", "60", "70", "80", "90", "00"],
  d12: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  d20: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"]
};

/** The theme: clear green resin, black numbers, pale edges, glass. */
export const TCRI_COLORSET = {
  name: TCRI_ID,
  description: "T.C.R.I. Dice",
  category: "Palladium Universal",
  foreground: "#101010",
  background: ["#3d9a34", "#46a83b", "#3f9c3f", "#4fb142"],
  outline: "none",
  edge: "#b7e3ad",
  texture: TEXTURE_ID,
  material: "glass",
  font: "Arial",
  visibility: "visible"
};

/** Time in seconds for the swirl, read by the GPU every frame. */
const timeUniform = { get value() { return (performance.now() / 1000) % 3600; } };

/**
 * Add the swirling liquid and twinkling glitter to a die's shader. The pattern follows the die's
 * own geometry (so it tumbles with it) and moves over time (so it swirls). Dark pixels (the
 * numbers) are left alone. Does nothing if the shader doesn't have the expected Three.js chunks.
 */
export function injectLiquid(shader) {
  const v = shader.vertexShader;
  const f = shader.fragmentShader;
  const needs = [[v, "#include <common>"], [v, "#include <begin_vertex>"], [f, "#include <common>"], [f, "#include <map_fragment>"]];
  if ( needs.some(([src, chunk]) => !src.includes(chunk)) ) return false;

  shader.uniforms.tcriTime = timeUniform;
  shader.vertexShader = v
    .replace("#include <common>", "#include <common>\nvarying vec3 vTcriPos;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvTcriPos = position;");
  shader.fragmentShader = f
    .replace("#include <common>", `#include <common>
uniform float tcriTime;
varying vec3 vTcriPos;
float tcriHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`)
    .replace("#include <map_fragment>", `#include <map_fragment>
{
  vec3 tcriDir = normalize(vTcriPos + vec3(1e-5));
  float tcriAng = atan(tcriDir.z, tcriDir.x);
  float tcriSwirl = sin(tcriAng * 2.0 + tcriDir.y * 5.0 + tcriTime * 1.4 + 2.0 * sin(tcriDir.x * 3.0 - tcriTime * 0.9));
  float tcriBand = smoothstep(0.1, 0.95, tcriSwirl * 0.5 + 0.5);
  float tcriSeed = tcriHash(floor(tcriDir * 45.0));
  float tcriSparkle = step(0.965, tcriSeed) * pow(0.5 + 0.5 * sin(tcriTime * 6.0 + tcriSeed * 40.0), 6.0);
  float tcriLum = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
  float tcriBody = smoothstep(0.12, 0.3, tcriLum);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.75 + vec3(0.45, 0.92, 0.35) * 0.35, tcriBand * tcriBody);
  diffuseColor.rgb += vec3(0.4, 0.95, 0.3) * tcriSparkle * tcriBody;
}`);
  return true;
}

/**
 * Register the T.C.R.I. Dice with Dice So Nice.
 * @param {object} dice3d   The Dice So Nice API (from the diceSoNiceReady hook)
 */
export async function registerTcriDice(dice3d) {
  const preferred = game.settings.get("palladium-universal", "tcriDiceDefault") ? "preferred" : "default";
  try {
    await dice3d.addTexture(TEXTURE_ID, {
      name: "T.C.R.I. Liquid Glitter",
      composite: "source-over",
      source: "systems/palladium-universal/assets/dice/tcri-liquid.png"
    });
  }
  catch(err) {
    console.warn("Palladium Universal | T.C.R.I. Dice texture failed to load; using Glitter.", err);
    TCRI_COLORSET.texture = "glitter";
  }
  dice3d.addColorset(TCRI_COLORSET, preferred);

  // The dice system carries the animated liquid; without it the theme still works (static texture).
  let DiceSystem;
  try {
    ({ DiceSystem } = await import(foundry.utils.getRoute("modules/dice-so-nice/api.js")));
  }
  catch(err) {
    console.warn("Palladium Universal | Dice So Nice API not found; T.C.R.I. Dice use the theme only.", err);
    return;
  }
  const system = new DiceSystem(TCRI_ID, "T.C.R.I. Dice", preferred, "Palladium Universal");
  system.registerBeforeShaderCompileCallback(shader => {
    try { injectLiquid(shader); }
    catch(err) { console.warn("Palladium Universal | T.C.R.I. Dice liquid shader skipped.", err); }
  });
  dice3d.addSystem(system);
  for ( const [type, labels] of Object.entries(TYPES) ) {
    dice3d.addDicePreset({ type, labels, system: TCRI_ID, colorset: TCRI_ID });
  }
}
