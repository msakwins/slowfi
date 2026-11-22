// ─────────────────────────────────────────────────────────────────────────────
// Améliorations possibles : des pièces qui marchent, mais qui freinent la
// machine. Seulement quand une mesure le montre :
// - processeur à peu de cœurs, avec un modèle bien plus rapide pour la même
//   carte mère (PC fixe seulement) ;
// - Windows sur un disque dur, ou sur un SSD presque plein ;
// - peu de mémoire, ou mémoire presque pleine ;
// - carte Wi-Fi d'ancienne génération (Wi-Fi 4).
// Même forme que les pièces à remplacer (parts.js), affichée par PartsToBuy.
// ─────────────────────────────────────────────────────────────────────────────

const GB = 1e9;

// Budgets indicatifs, en euros, relevés en novembre 2026 (occasion pour les
// processeurs qui ne se vendent plus neufs).
const PRICES = {
  "i7-7700": [50, 80],
  "i7-9700": [90, 140],
  "i7-10700": [120, 180],
  "i5-13400": [160, 200],
  "5700x3d": [180, 230],
  "nvme-1000": [60, 100],
  "nvme-2000": [110, 170],
  "sata-500": [35, 55],
  "sata-1000": [55, 90],
  "sata-2000": [100, 160],
  "ddr3-16": [30, 50],
  "ddr4-16": [30, 50],
  "ddr4-32": [55, 85],
  "ddr5-32": [75, 110],
  wifi: [20, 40],
};

// Processeur plus rapide pour la même carte mère, selon la génération.
// threads : en dessous ou à égalité, le processeur actuel vaut la peine d'être
// changé. bios : la carte peut demander une mise à jour du BIOS avant.
const CPU_UPGRADES = [
  {
    // Intel 6e et 7e génération (LGA 1151, séries 100 et 200).
    test: /\bi[357]-[67]\d{3}/i,
    threads: 4,
    model: "Core i7-7700",
    spec: [4, 8],
    price: "i7-7700",
    bios: false,
  },
  {
    // Intel 8e et 9e génération (LGA 1151, série 300).
    test: /\bi[3579]-[89]\d{3}/i,
    threads: 6,
    model: "Core i7-9700",
    spec: [8, 8],
    price: "i7-9700",
    bios: true,
  },
  {
    // Intel 10e et 11e génération (LGA 1200).
    test: /\bi[3579]-1[01]\d{3}/i,
    threads: 8,
    model: "Core i7-10700",
    spec: [8, 16],
    price: "i7-10700",
    bios: false,
  },
  {
    // Intel 12e à 14e génération (LGA 1700).
    test: /\bi[3579]-1[234]\d{3}/i,
    threads: 8,
    model: "Core i5-13400",
    spec: [10, 16],
    price: "i5-13400",
    bios: true,
  },
  {
    // AMD Ryzen sur AM4 (séries 1000 à 5000, hors portables en U, H, HS).
    test: /ryzen [3579] [1-5]\d{3}(?![uh])/i,
    threads: 12,
    // Ryzen 1000 et 2000 : moins rapides par cœur, à changer même avec
    // 12 threads.
    old: /ryzen [3579] [12]\d{3}/i,
    model: "Ryzen 7 5700X3D",
    spec: [8, 16],
    price: "5700x3d",
    bios: true,
  },
];

const nvmeOrSata = (d) => (/nvme/i.test(d?.busType ?? "") ? "nvme" : "sata");
const isHdd = (d) => /hdd/i.test(d?.mediaType ?? "");

/**
 * @param {{
 *   cpu?: {name:string|null, cores?:number|null, threads:number|null}|null,
 *   laptop?: boolean,
 *   systemDisk?: {name:string|null, mediaType:string|null, busType:string|null, size:number|null}|null,
 *   systemVolume?: {size:number, free:number}|null,
 *   memory?: {capacity:number|null, type:string|null, formFactor:string|null}[],
 *   memoryPct?: number|null,
 *   singleChannel?: boolean,
 *   network?: {name:string|null}[],
 *   replacing?: string[],   identifiants déjà proposés en remplacement (parts.js)
 * }} data
 * @param {"fr"|"en"} [lang]
 * @returns {{ id:string, title:string, reason:string, query:string|null, price:[number,number]|null }[]}
 *   query null : un conseil, rien à acheter.
 */
export function recommendUpgrades(data, lang = "fr") {
  const en = lang === "en";
  const out = [];
  const replacing = data.replacing ?? [];

  // Processeur : seulement sur un PC fixe, le processeur d'un portable est
  // soudé.
  const cpu = data.cpu;
  if (cpu?.name && !data.laptop) {
    const up = CPU_UPGRADES.find((u) => u.test.test(cpu.name));
    const current = cpu.name.replace(/\(R\)|\(TM\)|CPU|@.*$/gi, "").trim();
    const slow =
      up &&
      !new RegExp(up.model.split(" ").pop(), "i").test(cpu.name) &&
      ((cpu.threads != null && cpu.threads <= up.threads) ||
        up.old?.test(cpu.name));
    if (slow) {
      const spec = (c, t, fr) =>
        fr
          ? `${c} cœurs, ${t} threads`
          : `${c} cores, ${t} threads`;
      const now =
        cpu.cores != null
          ? ` (${spec(cpu.cores, cpu.threads, !en)})`
          : "";
      out.push({
        id: "cpu",
        title: en ? `Processor: ${up.model}` : `Processeur : ${up.model}`,
        reason: en
          ? `Current processor: ${current}${now}. The ${up.model} (${spec(...up.spec, false)}) is compatible with the existing motherboard${up.bios ? ". Update the BIOS before replacing the processor" : ""}`
          : `Processeur actuel : ${current}${now}. Le ${up.model} (${spec(...up.spec, true)}) est compatible avec la carte mère existante${up.bios ? ". Mettre à jour le BIOS avant le remplacement" : ""}`,
        query: up.model,
        price: PRICES[up.price],
      });
    }
  }

  // Disque de Windows : un disque dur, ou un SSD presque plein.
  const sys = data.systemDisk;
  const vol = data.systemVolume;
  const sysReplaced = sys?.name && replacing.includes(`disk-${sys.name}`);
  if (sys && !sysReplaced) {
    if (isHdd(sys)) {
      const size = (sys.size ?? 0) / GB <= 520 ? 500 : 1000;
      out.push({
        id: "system-ssd",
        title: en ? "System drive: SSD" : "Disque système : SSD",
        reason: en
          ? "Windows is installed on a hard drive. An SSD greatly reduces startup and loading times"
          : "Windows est installé sur un disque dur. Un SSD réduit fortement les temps de démarrage et de chargement",
        query: `SSD SATA 2,5" ${size === 1000 ? "1 To" : "500 Go"}`,
        price: PRICES[`sata-${size}`],
      });
    } else if (vol?.size && vol.free / vol.size < 0.15) {
      const pct = Math.round((vol.free / vol.size) * 100);
      const freeGB = Math.round(vol.free / GB);
      const sizeGB = Math.round(vol.size / GB);
      if (sizeGB > 520) {
        // Disque déjà grand : faire de la place suffit, rien à acheter.
        out.push({
          id: "system-free",
          title: en
            ? "System drive: free up space"
            : "Disque système : libérer de l'espace",
          reason: en
            ? `${freeGB} GB free out of ${sizeGB} GB (${pct}%). A nearly full SSD loses performance. Recommended: Disk Cleanup including system files, removal of unused programs, transfer of large files to another drive`
            : `${freeGB} Go libres sur ${sizeGB} Go (${pct} %). Un SSD saturé perd en performances. Actions recommandées : Nettoyage de disque avec les fichiers système, désinstallation des programmes inutilisés, transfert des fichiers volumineux vers un autre disque`,
          query: null,
          price: null,
        });
      } else {
        // Petit disque : le nettoyage ne tient pas longtemps, un SSD plus
        // grand règle la question.
        const kind = nvmeOrSata(sys);
        out.push({
          id: "system-bigger",
          title: en ? "System drive: 1 TB SSD" : "Disque système : SSD de 1 To",
          reason: en
            ? `${freeGB} GB free out of ${sizeGB} GB (${pct}%). A nearly full SSD loses performance and holds back Windows updates. Alternative at no cost: migrate Windows to another drive in the PC with enough free space`
            : `${freeGB} Go libres sur ${sizeGB} Go (${pct} %). Un SSD saturé perd en performances et freine les mises à jour de Windows. Alternative sans achat : migrer Windows vers un autre disque du PC disposant d'espace libre`,
          query:
            kind === "nvme" ? "SSD NVMe M.2 1 To" : 'SSD SATA 2,5" 1 To',
          price: PRICES[`${kind}-1000`],
        });
      }
    }
  }

  // Mémoire : 8 Go ou moins, ou presque pleine pendant l'analyse. Une seule
  // barrette : parts.js propose déjà la seconde.
  const sticks = (data.memory ?? []).filter((m) => m.capacity);
  const totalGB = Math.round(
    sticks.reduce((s, m) => s + m.capacity, 0) / 1024 ** 3,
  );
  const full = data.memoryPct != null && data.memoryPct >= 85;
  if (
    sticks.length > 0 &&
    !data.singleChannel &&
    !replacing.includes("memory") &&
    (totalGB <= 8 || (full && totalGB < 32))
  ) {
    const type = sticks[0].type ?? "DDR4";
    const target = totalGB <= 8 ? 16 : 32;
    const laptop = sticks[0].formFactor === "SO-DIMM";
    out.push({
      id: "memory-more",
      title: en ? `Memory: ${target} GB` : `Mémoire : ${target} Go`,
      reason: full
        ? en
          ? `${data.memoryPct}% of ${totalGB} GB in use during the analysis. When memory is saturated, Windows relies on the disk, which is much slower`
          : `${data.memoryPct} % des ${totalGB} Go utilisés pendant l'analyse. Mémoire saturée : Windows s'appuie sur le disque, nettement plus lent`
        : en
          ? `${totalGB} GB installed: insufficient capacity for Windows 11 and a current browser`
          : `${totalGB} Go installés : capacité insuffisante pour Windows 11 et un navigateur actuel`,
      query: [
        `kit 2x${target / 2} Go`,
        type,
        laptop && "SO-DIMM",
      ]
        .filter(Boolean)
        .join(" "),
      price: PRICES[`${type.toLowerCase()}-${target}`] ?? null,
    });
  }

  // Wi-Fi 4 (802.11n) : plafonne vers 150 à 300 Mb/s, souvent sur 2,4 GHz.
  const wifi = (data.network ?? []).find(
    (n) =>
      /wi-?fi|wireless|wlan|802\.11/i.test(n.name ?? "") &&
      /wireless[- ]n\b|802\.11\s?b?g?\/?n\b|\bN\s?(150|300)\b|wi-?fi 4/i.test(
        n.name ?? "",
      ) &&
      !/\bac\b|\bax\b|wi-?fi [567]/i.test(n.name ?? ""),
  );
  if (wifi) {
    out.push({
      id: "wifi",
      title: en ? "Wi-Fi: Wi-Fi 6 adapter" : "Wi-Fi : adaptateur Wi-Fi 6",
      reason: en
        ? `Current adapter: ${wifi.name} (Wi-Fi 4), limited to about 150 to 300 Mb/s`
        : `Adaptateur actuel : ${wifi.name} (Wi-Fi 4), limité à environ 150 à 300 Mb/s`,
      query: data.laptop ? "clé USB Wi-Fi 6" : "carte PCIe Wi-Fi 6",
      price: PRICES.wifi,
    });
  }

  return out;
}
