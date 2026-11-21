// ─────────────────────────────────────────────────────────────────────────────
// Phrase d'introduction du diagnostic complet, accordée aux analyses choisies.
// Le détail de chaque analyse est donné au-dessus du bouton de lancement.
// ─────────────────────────────────────────────────────────────────────────────

/** « a », « a et b », « a, b et c ». */
function joinList(items, and) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${and} ${items.at(-1)}`;
}

/**
 * @param {{ network?: boolean, hardware?: boolean, devices?: boolean }} chosen
 * @param {"fr"|"en"} lang
 * @returns {string|null} null quand rien n'est choisi
 */
export function diagnosticIntro(chosen, lang) {
  const en = lang === "en";
  const items = [
    chosen.network && (en ? "local network" : "du réseau local"),
    chosen.hardware && (en ? "hardware" : "du matériel"),
    chosen.devices && (en ? "devices" : "des périphériques"),
  ].filter(Boolean);
  if (items.length === 0) return null;
  return en
    ? `Checks the ${joinList(items, "and")}`
    : `Contrôle ${joinList(items, "et")}`;
}
