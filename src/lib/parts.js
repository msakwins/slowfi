// ─────────────────────────────────────────────────────────────────────────────
// Pièces à remplacer : seulement quand une mesure le justifie (disque qui
// lâche, SSD usé, batterie fatiguée, mémoire en échec, carte qui chauffe).
// Jamais pour vendre : une machine en bonne santé n'a aucune suggestion.
//
// Chaque suggestion donne ce qu'il faut chercher (compatible avec la pièce
// actuelle : interface, format, génération, capacité), un budget indicatif
// et des liens de recherche chez les marchands (affiliate.js).
// ─────────────────────────────────────────────────────────────────────────────

const GB = 1e9;

// Budgets indicatifs, en euros, relevés en novembre 2026.
export const PRICES_DATE = "novembre 2026";
const PRICES = {
  "nvme-500": [40, 60],
  "nvme-1000": [60, 100],
  "nvme-2000": [110, 170],
  "sata-500": [35, 55],
  "sata-1000": [55, 90],
  "sata-2000": [100, 160],
  "ddr3-8": [15, 25],
  "ddr4-8": [18, 30],
  "ddr4-16": [30, 50],
  "ddr4-32": [55, 85],
  "ddr5-16": [40, 60],
  "ddr5-32": [75, 110],
  battery: [40, 90],
  cleaning: [8, 15],
  paste: [6, 12],
};

/** Capacité de remplacement : au moins l'actuelle, arrondie à 500 Go, 1 ou 2 To. */
function targetSize(bytes) {
  const gb = (bytes ?? 0) / GB;
  if (gb <= 520) return 500;
  if (gb <= 1050) return 1000;
  return 2000;
}
const sizeLabel = (gb) => (gb >= 1000 ? `${gb / 1000} To` : `${gb} Go`);

/**
 * @param {{
 *   disks?: {name:string|null, mediaType:string|null, busType:string|null, health:string|null, size:number|null, uncorrected?:number}[],
 *   ssdHealth?: {name:string, wear:number|null, alerts:string[], spare:number|null}[],
 *   memory?: {capacity:number|null, type:string|null, formFactor:string|null}[],
 *   memoryTestFailed?: boolean,
 *   singleChannel?: boolean,
 *   battery?: {pct:number, condition:string|null}|null,
 *   machine?: {maker:string|null, model:string|null, laptop:boolean}|null,
 *   gpuOverheating?: boolean,
 * }} data
 * @param {"fr"|"en"} [lang]
 * @returns {{ id:string, title:string, reason:string, query:string, price:[number,number]|null }[]}
 */
export function recommendParts(data, lang = "fr") {
  const en = lang === "en";
  const parts = [];

  // Disques : en panne annoncée, secteurs illisibles, ou SSD usé.
  for (const d of data.disks ?? []) {
    const ssd = /ssd/i.test(d.mediaType ?? "") || /nvme/i.test(d.busType ?? "");
    const nvme = /nvme/i.test(d.busType ?? "");
    const health = (data.ssdHealth ?? []).find((h) => h.name === d.name);
    const failing =
      (d.health && !/^(healthy|sain|ok)$/i.test(d.health)) || d.uncorrected > 0;
    const worn =
      health &&
      ((health.wear ?? 0) >= 80 ||
        health.alerts.some((a) => a !== "temperature"));
    if (!failing && !worn) continue;
    const size = targetSize(d.size);
    // Un disque dur qui lâche se remplace par un SSD SATA : même câble, bien
    // plus rapide.
    const kind = nvme ? "nvme" : "sata";
    parts.push({
      id: `disk-${d.name}`,
      title: en
        ? `Replace ${d.name ?? "the drive"}`
        : `Remplacer ${d.name ?? "le disque"}`,
      reason: failing
        ? en
          ? `The ${ssd ? "SSD" : "hard drive"} can no longer read back some data`
          : ssd
            ? "Le SSD n'arrive plus à relire certaines données"
            : "Le disque dur n'arrive plus à relire certaines données"
        : en
          ? `SSD worn to ${health.wear}% of its endurance`
          : `SSD usé à ${health.wear} % de son endurance`,
      query: `SSD ${nvme ? "NVMe M.2" : 'SATA 2,5"'} ${sizeLabel(size)}`,
      price: PRICES[`${kind}-${size}`] ?? null,
    });
  }

  // Mémoire : le test de Windows a trouvé une barrette défaillante.
  if (data.memoryTestFailed && data.memory?.length) {
    const stick = data.memory[0];
    const gb = stick.capacity ? Math.round(stick.capacity / 1024 ** 3) : null;
    const type = stick.type;
    parts.push({
      id: "memory",
      title: en
        ? "Replace the faulty memory stick"
        : "Remplacer la barrette de mémoire défaillante",
      reason: en
        ? "Windows memory test found errors. Test the sticks one at a time to find which one to change"
        : "Le test de mémoire de Windows a trouvé des erreurs. Tester les barrettes une à une pour savoir laquelle changer",
      query: [
        "barrette",
        type,
        gb && `${gb} Go`,
        stick.formFactor === "SO-DIMM" && "SO-DIMM",
      ]
        .filter(Boolean)
        .join(" "),
      price: (type && gb && PRICES[`${type.toLowerCase()}-${gb}`]) ?? null,
    });
  }

  // Une seule barrette : une seconde identique double la bande passante
  // (double canal).
  if (
    data.singleChannel &&
    !data.memoryTestFailed &&
    data.memory?.length === 1
  ) {
    const stick = data.memory[0];
    const gb = stick.capacity ? Math.round(stick.capacity / 1024 ** 3) : null;
    const mhz = stick.rated ?? stick.configured;
    parts.push({
      id: "memory-pair",
      title: en
        ? "Add a second, identical memory stick"
        : "Ajouter une seconde barrette identique",
      reason: en
        ? "With a single stick, memory runs on one channel: half the bandwidth"
        : "Avec une seule barrette, la mémoire tourne sur un seul canal : moitié moins de débit",
      query: [
        "barrette",
        stick.type,
        gb && `${gb} Go`,
        mhz && `${mhz} MHz`,
        stick.formFactor === "SO-DIMM" && "SO-DIMM",
      ]
        .filter(Boolean)
        .join(" "),
      price:
        (stick.type && gb && PRICES[`${stick.type.toLowerCase()}-${gb}`]) ??
        null,
    });
  }

  // Batterie d'un portable usée.
  const b = data.battery;
  if (b && (b.pct < 60 || (b.condition && !/^normal$/i.test(b.condition)))) {
    const model = [data.machine?.maker, data.machine?.model]
      .filter(Boolean)
      .join(" ");
    parts.push({
      id: "battery",
      title: en ? "Replace the battery" : "Remplacer la batterie",
      reason: en
        ? `Battery at ${b.pct}% of its original capacity`
        : `Batterie à ${b.pct} % de sa capacité d'origine`,
      query: model ? `batterie ${model}` : "batterie ordinateur portable",
      price: PRICES.battery,
    });
  }

  // Carte graphique qui ralentit à cause de la chaleur : du nettoyage, pas
  // une nouvelle carte.
  if (data.gpuOverheating) {
    parts.push({
      id: "cleaning",
      title: en
        ? "Dust off the graphics card"
        : "Dépoussiérer la carte graphique",
      reason: en
        ? "The card slows down to avoid overheating: dust often blocks its fans"
        : "La carte ralentit pour ne pas surchauffer : la poussière bloque souvent ses ventilateurs",
      query: "bombe air sec dépoussiérage ordinateur",
      price: PRICES.cleaning,
    });
  }

  return parts;
}
