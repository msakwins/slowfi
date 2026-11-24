// ─────────────────────────────────────────────────────────────────────────────
// Suggestions selon l'usage visé : usage courant, jeux en 1080p, jeux récents
// en 1440p et plus, avec un budget modéré ou haut de gamme.
//
// Compare la carte graphique, le processeur et la mémoire à ce que l'usage
// demande, et propose la pièce qui manque. Les modèles conseillés sont dans
// les tableaux ci-dessous, datés : à revoir à chaque nouvelle génération.
// Pas de prix (ils changent trop vite) : un lien de recherche suffit.
// Ce que l'analyse ne lit pas (alimentation, taille du boîtier) est rappelé
// dans la raison.
// ─────────────────────────────────────────────────────────────────────────────

// Mis à jour en novembre 2026.
export const GOALS_DATE = "novembre 2026";

/**
 * Niveau relatif des cartes graphiques en jeu (GTX 1060 = 10), approximatif :
 * sert seulement à savoir si une carte suffit pour un usage.
 * Le premier motif qui correspond l'emporte : les plus précis d'abord.
 */
const GPU_TIERS = [
  [/rtx\s*5090/i, 100],
  [/rtx\s*4090/i, 80],
  [/rtx\s*5080/i, 68],
  [/rtx\s*4080/i, 60],
  [/rtx\s*5070\s*ti/i, 58],
  [/rx\s*9070\s*xt/i, 56],
  [/rx\s*7900/i, 55],
  [/rtx\s*4070\s*ti/i, 50],
  [/rx\s*9070/i, 50],
  [/rtx\s*5070/i, 45],
  [/rtx\s*4070\s*super/i, 42],
  [/rx\s*7800/i, 40],
  [/rtx\s*4070/i, 36],
  [/rtx\s*3080/i, 38],
  [/rx\s*6800/i, 36],
  [/rx\s*9060/i, 32],
  [/rtx\s*5060\s*ti/i, 33],
  [/rx\s*7700/i, 32],
  [/rtx\s*3070/i, 28],
  [/rtx\s*5060/i, 27],
  [/rtx\s*4060\s*ti/i, 27],
  [/rx\s*6700/i, 26],
  [/rtx\s*3060\s*ti/i, 24],
  [/arc\s*b580/i, 24],
  [/rtx\s*4060/i, 22],
  [/rx\s*7600/i, 21],
  [/rtx\s*2070/i, 20],
  [/rtx\s*3060/i, 19],
  [/rx\s*6600/i, 19],
  [/arc\s*a7\d0/i, 19],
  [/rtx\s*2060/i, 16],
  [/rx\s*5700/i, 17],
  [/gtx\s*1660/i, 13],
  [/rx\s*5600/i, 14],
  [/gtx\s*1080/i, 14],
  [/gtx\s*1070/i, 12],
  [/rx\s*(580|590)/i, 10],
  [/gtx\s*1060/i, 10],
  [/rtx\s*3050/i, 12],
  [/gtx\s*1650/i, 7],
  [/rx\s*(570|6500)/i, 8],
  [/gtx\s*1050/i, 5],
  // Graphiques intégrés au processeur.
  [/uhd|iris|hd graphics|radeon(\(tm\))? graphics|vega \d/i, 2],
];

/** Niveau d'une carte graphique d'après son nom, ou null si inconnue. */
export function gpuScore(name) {
  if (!name) return null;
  for (const [re, score] of GPU_TIERS) if (re.test(name)) return score;
  return null;
}

/** Ce que demande chaque usage : niveau de carte et mémoire minimale. */
const NEEDS = {
  office: { gpu: 0, ramGB: 8 },
  gaming1080: { gpu: 22, ramGB: 16 },
  gaming1440: { gpu: 40, ramGB: 32 },
};

/**
 * Carte conseillée par usage et budget : modèle, alimentation recommandée
 * par le fabricant (W), et ce qu'elle permet.
 */
const GPU_PICKS = {
  gaming1080: {
    moderate: { model: "GeForce RTX 5060", psu: 550 },
    high: { model: "GeForce RTX 5070", psu: 650 },
  },
  gaming1440: {
    moderate: { model: "Radeon RX 9070", psu: 650 },
    high: { model: "GeForce RTX 5070 Ti", psu: 750 },
  },
};

/** Plateforme récente conseillée (processeur + carte mère + DDR5) pour le jeu. */
const PLATFORM_PICKS = {
  moderate: { model: "Ryzen 5 9600X", board: "carte mère AM5 B650" },
  high: { model: "Ryzen 7 9800X3D", board: "carte mère AM5 B850" },
};

// Processeurs qui freinent les jeux récents : Intel jusqu'à la 9e génération
// avec 6 threads ou moins, Ryzen 1000 et 2000.
const OLD_CPU = (cpu) =>
  Boolean(cpu?.name) &&
  ((/\bi[357]-[6-9]\d{3}/i.test(cpu.name) && (cpu.threads ?? 99) <= 6) ||
    /\bi[357]-[2-5]\d{3}/i.test(cpu.name) ||
    /ryzen [357] [12]\d{3}/i.test(cpu.name));

/**
 * @param {{
 *   gpu?: string|null,      nom de la carte graphique principale
 *   cpu?: {name:string|null, threads:number|null}|null,
 *   memory?: {capacity:number|null, type:string|null, formFactor:string|null}[],
 *   laptop?: boolean,
 * }} data
 * @param {{ usage: "office"|"gaming1080"|"gaming1440", budget: "moderate"|"high" }} goal
 * @param {"fr"|"en"} [lang]
 * @returns {{ id:string, title:string, reason:string, query:string|null, price:null }[]}
 */
export function recommendForGoal(data, goal, lang = "fr") {
  const en = lang === "en";
  const need = NEEDS[goal.usage];
  if (!need || goal.usage === "office") return [];
  const out = [];

  // Portable : carte graphique et processeur soudés.
  if (data.laptop) {
    out.push({
      id: "goal-laptop",
      title: en ? "Laptop: limited upgrades" : "Portable : évolution limitée",
      reason: en
        ? "The graphics card and processor of a laptop cannot be replaced. For this use, memory and storage are the only upgradable parts"
        : "La carte graphique et le processeur d'un portable ne se remplacent pas. Pour cet usage, seules la mémoire et le stockage peuvent évoluer",
      query: null,
      price: null,
    });
  }

  // Carte graphique : en dessous du niveau demandé.
  const score = gpuScore(data.gpu);
  if (!data.laptop && score != null && score < need.gpu) {
    const pick = GPU_PICKS[goal.usage][goal.budget];
    const target =
      goal.usage === "gaming1080"
        ? en
          ? "current games in 1080p, high settings"
          : "les jeux récents en 1080p, réglages élevés"
        : en
          ? "current games in 1440p and above"
          : "les jeux récents en 1440p et plus";
    out.push({
      id: "goal-gpu",
      title: en
        ? `Graphics card: ${pick.model}`
        : `Carte graphique : ${pick.model}`,
      reason: en
        ? `Current card: ${data.gpu}, insufficient for ${target}`
        : `Carte actuelle : ${data.gpu}, insuffisante pour ${target}`,
      query: pick.model,
      // À vérifier avant l'achat, affiché juste au-dessus du lien.
      checks: en
        ? [
            `${pick.psu} W power supply`,
            "Room in the case",
            "Free PCIe x16 slot",
          ]
        : [
            `Alimentation ${pick.psu} W`,
            "Place dans le boîtier",
            "Port PCIe x16 libre",
          ],
      price: null,
    });
  }

  // Processeur : ancien pour les jeux récents. Haut de gamme : plateforme
  // récente ; budget modéré, la suggestion du même support (upgrades.js).
  if (!data.laptop && goal.budget === "high" && OLD_CPU(data.cpu)) {
    const p = PLATFORM_PICKS.high;
    const current = data.cpu.name.replace(/\(R\)|\(TM\)|CPU|@.*$/gi, "").trim();
    out.push({
      id: "goal-platform",
      title: en
        ? `Platform: ${p.model}, AM5 motherboard and DDR5`
        : `Plateforme : ${p.model}, carte mère AM5 et DDR5`,
      reason: en
        ? `The ${current} holds back current games, and its motherboard cannot take recent processors. Processor, motherboard and memory are replaced together`
        : `Le ${current} freine les jeux récents, et sa carte mère n'accepte pas les processeurs récents. Processeur, carte mère et mémoire se changent ensemble`,
      query: `${p.model} ${p.board.replace("carte mère ", "")}`,
      checks: en
        ? [
            "DDR5 memory",
            "AM5 cooler",
            "Windows reactivation",
          ]
        : [
            "Mémoire DDR5",
            "Ventirad AM5",
            "Réactivation de Windows",
          ],
      price: null,
    });
  }

  // Mémoire : en dessous de ce que l'usage demande.
  const sticks = (data.memory ?? []).filter((m) => m.capacity);
  const totalGB = Math.round(
    sticks.reduce((n, m) => n + m.capacity, 0) / 1024 ** 3,
  );
  if (sticks.length && totalGB < need.ramGB) {
    const type = sticks[0].type ?? "DDR4";
    const laptopRam = sticks[0].formFactor === "SO-DIMM";
    out.push({
      id: "goal-memory",
      title: en
        ? `Memory: ${need.ramGB} GB`
        : `Mémoire : ${need.ramGB} Go`,
      reason: en
        ? `${totalGB} GB installed, below the ${need.ramGB} GB recommended for this use`
        : `${totalGB} Go installés, en dessous des ${need.ramGB} Go conseillés pour cet usage`,
      query: [`kit 2x${need.ramGB / 2} Go`, type, laptopRam && "SO-DIMM"]
        .filter(Boolean)
        .join(" "),
      price: null,
    });
  }
  return out;
}

/**
 * Suggestions finales : celles de l'usage, puis celles de performance
 * (upgrades.js) qui ne font pas doublon.
 */
export function mergeSuggestions(goalParts, perfParts) {
  const ids = new Set(goalParts.map((p) => p.id));
  const drop = new Set();
  if (ids.has("goal-platform")) drop.add("cpu");
  if (ids.has("goal-memory")) drop.add("memory-more");
  return [...goalParts, ...perfParts.filter((p) => !drop.has(p.id))];
}
