/**
 * Shooting through cover (v1.24.0, p.90): the S.D.C. is for the whole object and a bullet punching through loses
 * only about 2% of it (an exterior brick wall, 200 S.D.C., takes 4 off the damage). Cover is set per combatant from
 * the Combat Tracker (the bricks icon) and lasts the whole combat; it goes with the combat, so the next one
 * starts without. Click again when the character moves out of or into other cover. Firearms, energy weapons and
 * black powder go through; the cover itself loses the same points and breaks at 0.
 */
const SCOPE = "palladium-universal";
const { DialogV2 } = foundry.applications.api;

/** Weapon types whose shots punch through cover. */
export const PENETRATING = ["firearm", "energy", "blackPowder"];

/** Damage lost through cover of this S.D.C. (2%, at least 1). */
export const coverReduction = sdc => (sdc > 0 ? Math.max(1, Math.round(sdc * 0.02)) : 0);

/** A combatant's cover this combat: {label, sdc, left} or null. */
export function combatantCover(combatant) {
  const cover = combatant?.getFlag?.(SCOPE, "cover");
  return cover?.sdc > 0 ? cover : null;
}

/** An actor's cover in the current combat (its combatant's). */
export function actorCover(actor, combat = game.combat) {
  const c = combat?.combatants?.find?.(c => (c.actor === actor) || (c.actor?.uuid === actor?.uuid));
  return c ? { combatant: c, cover: combatantCover(c) } : { combatant: null, cover: null };
}

/**
 * Put a combatant behind cover (or take it out with null).
 * @param {Combatant} combatant
 * @param {{label: string, sdc: number}|null} cover
 */
export async function setCover(combatant, cover) {
  if ( !cover?.sdc ) {
    await combatant.unsetFlag(SCOPE, "cover");
    Hooks.callAll("palladium.cover", combatant, null);
    return null;
  }
  const data = { label: cover.label || "Cover", sdc: Number(cover.sdc), left: Number(cover.left ?? cover.sdc) };
  await combatant.setFlag(SCOPE, "cover", data);
  Hooks.callAll("palladium.cover", combatant, data);
  return data;
}

/** The cover window: one dropdown (the S.D.C. table, custom, or none). */
export async function coverDialog(combatant) {
  const current = combatantCover(combatant);
  const table = CONFIG.PALLADIUM.COVER_SDC;
  const options = [`<option value="">No cover</option>`,
    ...table.map(([label, sdc], i) => `<option value="${i}"${current?.label === label ? " selected" : ""}>${label} (−${coverReduction(sdc)})</option>`),
    `<option value="custom"${current && !table.some(([l]) => l === current.label) ? " selected" : ""}>Other: type its S.D.C.</option>`].join("");
  const choice = await DialogV2.wait({
    window: { title: `${combatant.name}: cover` }, classes: ["palladium-universal", "pu-skill-mods"],
    content: `<div class="pu-sm"><p class="pu-sm-head"><strong>Behind what?</strong></p>
      <select name="cover">${options}</select>
      <input type="number" name="sdc" min="1" placeholder="S.D.C. (for Other)" value="${current?.sdc ?? ""}" style="margin-top:4px">
      <p class="hint">Shots through lose the (−N). Lasts this combat.</p></div>`,
    buttons: [
      { action: "ok", label: "Set", icon: "fa-solid fa-trowel-bricks", default: true, callback: (event, button) => {
        const f = button.form.elements;
        if ( f.cover.value === "" ) return { none: true };
        if ( f.cover.value === "custom" ) return { label: "Cover", sdc: Number(f.sdc.value) };
        const [label, sdc] = table[Number(f.cover.value)];
        return { label, sdc };
      } },
      { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark" }
    ],
    rejectClose: false
  });
  if ( !choice || (choice === "cancel") ) return undefined;
  return setCover(combatant, choice.none ? null : choice);
}

/**
 * Damage against a target behind cover (applied by the damage card's Apply). The cover loses the same points.
 * @param {Actor} target
 * @param {number} amount
 * @param {string} weaponType
 * @returns {Promise<{amount: number, note: string}>}
 */
export async function throughCover(target, amount, weaponType) {
  if ( !PENETRATING.includes(weaponType) ) return { amount, note: "" };
  const { combatant, cover } = actorCover(target);
  if ( !cover ) return { amount, note: "" };
  const cut = coverReduction(cover.sdc);
  const left = cover.left - cut;
  const note = `through ${cover.label} (−${cut}${left <= 0 ? `; the ${cover.label.toLowerCase()} is broken` : ""})`;
  if ( combatant.isOwner || game.user.isGM ) {
    if ( left <= 0 ) await setCover(combatant, null);
    else await combatant.setFlag(SCOPE, "cover", { ...cover, left });
  }
  return { amount: Math.max(0, amount - cut), note };
}
