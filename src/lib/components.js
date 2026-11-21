// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic des composants — mémoire, carte graphique, firmware.
//
// Ces trois-là partagent un trait : ils fonctionnent, donc personne ne les
// soupçonne. Une barrette qui tourne sous sa fréquence nominale, un pilote
// graphique vieux de deux ans, un BIOS d'origine jamais mis à jour — rien ne
// plante, rien n'alerte, et la machine rend simplement moins que ce qu'elle
// pourrait. C'est exactement le type de lenteur qu'un diagnostic doit nommer,
// parce que l'utilisateur ne peut pas la voir.
// ─────────────────────────────────────────────────────────────────────────────
import { parseBlocks, field, number, yearOf, monthOf } from "./powershell.js";
import { isLinux, parseLinuxComponents } from "./linux.js";

const GIB = 1024 ** 3;

/**
 * Trie les blocs par nature. L'utilisateur colle la sortie de trois commandes
 * d'un coup ; on reconnaît chaque bloc à ses champs plutôt qu'à son ordre,
 * pour qu'un copier-coller partiel reste exploitable.
 * @param {string} raw
 */
export function parseComponents(raw) {
  const memory = [];
  const gpus = [];
  const netDrivers = [];
  let bios = null;
  let cpu = null;
  let computer = null;
  let board = null;
  let cpuLimit = null;

  for (const f of parseBlocks(raw)) {
    if ("DeviceName" in f && "DriverDate" in f) {
      // Seuls les pilotes réseau comptent ici ; les autres classes servent à
      // la recherche de mises à jour (drivers.js).
      const cls = field(f, "DeviceClass");
      if (cls && cls.toUpperCase() !== "NET") continue;
      // Pilote réseau (Win32_PnPSignedDriver) : à tester avant les cartes
      // graphiques, qui ont aussi un champ DriverVersion.
      netDrivers.push({
        name: field(f, "DeviceName"),
        version: field(f, "DriverVersion"),
        year: yearOf(field(f, "DriverDate")),
        month: monthOf(field(f, "DriverDate"))?.month ?? null,
      });
    } else if ("NumberOfCores" in f) {
      cpu = {
        name: field(f, "Name")?.replace(/\s+/g, " ") ?? null,
        cores: number(f, "NumberOfCores"),
        threads: number(f, "NumberOfLogicalProcessors"),
        maxMHz: number(f, "MaxClockSpeed"),
      };
    } else if ("PercentPerformanceLimit" in f) {
      cpuLimit = number(f, "PercentPerformanceLimit");
    } else if ("PCSystemType" in f) {
      computer = {
        maker: field(f, "Manufacturer"),
        model: field(f, "Model"),
        laptop: number(f, "PCSystemType") === 2,
      };
    } else if ("Product" in f && !("SMBIOSBIOSVersion" in f)) {
      board = { maker: field(f, "Manufacturer"), model: field(f, "Product") };
    } else if ("Capacity" in f || "DeviceLocator" in f) {
      memory.push({
        slot: field(f, "DeviceLocator"),
        capacity: number(f, "Capacity"),
        rated: number(f, "Speed"), // fréquence nominale de la barrette
        configured: number(f, "ConfiguredClockSpeed"), // fréquence réellement appliquée
      });
    } else if ("DriverVersion" in f) {
      gpus.push({
        name: field(f, "Name"),
        driverVersion: field(f, "DriverVersion"),
        driverYear: yearOf(field(f, "DriverDate")),
        driverMonth: monthOf(field(f, "DriverDate"))?.month ?? null,
        status: field(f, "Status"),
        errorCode: number(f, "ConfigManagerErrorCode"),
      });
    } else if ("SMBIOSBIOSVersion" in f) {
      bios = {
        vendor: field(f, "Manufacturer"),
        version: field(f, "SMBIOSBIOSVersion"),
        year: yearOf(field(f, "ReleaseDate")),
      };
    }
  }

  // Rien de Windows : peut-être la sortie d'un Linux (free, lscpu, lspci, /sys).
  let platform = "windows";
  if (
    memory.length === 0 &&
    gpus.length === 0 &&
    !bios &&
    !cpu &&
    isLinux(raw)
  ) {
    const lin = parseLinuxComponents(raw);
    if (lin) {
      memory.push(...lin.memory);
      gpus.push(...lin.gpus);
      bios = lin.bios;
      cpu = lin.cpu;
      cpuLimit = null;
      computer = lin.computer.model ? { ...lin.computer, laptop: false } : null;
      board = lin.board.model ? lin.board : null;
      platform = "linux";
    }
  }

  if (cpu) cpu.limit = cpuLimit;

  // Le modèle de l'ordinateur, sauf s'il est générique (PC monté à la main) :
  // c'est alors la carte mère qui compte, pour trouver son BIOS.
  const generic =
    /system manufacturer|system product name|to be filled|default string|o\.e\.m|not applicable/i;
  const machine =
    computer &&
    computer.model &&
    !generic.test(`${computer.maker} ${computer.model}`)
      ? {
          kind: "computer",
          maker: shortMaker(computer.maker),
          model: computer.model,
          laptop: computer.laptop,
        }
      : board?.model
        ? {
            kind: "board",
            maker: shortMaker(board.maker),
            model: board.model,
            laptop: computer?.laptop ?? false,
          }
        : null;

  const network = netDrivers.filter(
    (d) => d.name && d.year && d.year !== 2006 && !NET_NOISE.test(d.name),
  );

  // Rien en Format-List : peut-être la sortie d'un Mac.
  if (memory.length === 0) {
    const mac = parseMacMemory(raw);
    const macCpu = parseMacCpu(raw);
    if (mac.length > 0 || macCpu) {
      return {
        memory: mac,
        gpus,
        bios,
        cpu: macCpu,
        machine: null,
        network: [],
        platform: "mac",
      };
    }
  }

  return { memory, gpus, bios, cpu, machine, network, platform };
}

/** Total de mémoire installée, en Go. */
export function totalMemoryGB(memory) {
  const total = memory.reduce((sum, m) => sum + (m.capacity || 0), 0);
  return total ? Math.round(total / GIB) : null;
}

const GPU_DRIVER_STALE_YEARS = 2;
const NET_DRIVER_STALE_YEARS = 3;
const CPU_LIMIT_PCT = 90;

// Cartes réseau virtuelles ou techniques de Windows, sans pilote à mettre à
// jour côté utilisateur.
const NET_NOISE =
  /wan miniport|virtual|hyper-v|bluetooth|kernel debug|tap-|vpn|loopback|wi-fi direct|teredo|isatap|6to4|vmware|virtualbox|microsoft/i;

/**
 * Processeur d'un Mac : `sysctl machdep.cpu.brand_string hw.physicalcpu hw.ncpu`
 * et la limite de vitesse de `pmset -g therm` (Mac Intel).
 */
function parseMacCpu(raw) {
  const name = raw.match(/machdep\.cpu\.brand_string:\s*(.+)/i)?.[1]?.trim();
  if (!name) return null;
  const limit = raw.match(/CPU_Speed_Limit\s*=\s*(\d+)/i);
  return {
    name,
    cores: Number(raw.match(/hw\.physicalcpu:\s*(\d+)/i)?.[1]) || null,
    threads: Number(raw.match(/hw\.ncpu:\s*(\d+)/i)?.[1]) || null,
    maxMHz: null,
    limit: limit ? Number(limit[1]) : null,
  };
}
// Au-delà d'un an, une douzaine de versions sont sorties : on le signale.
// En deçà, le pilote reste correct, même si une version plus récente existe.
const GPU_DRIVER_OLD_MONTHS = 12;
const GPU_DRIVER_RECENT_MONTHS = 6;

// Pilote d'affichage générique de Windows : aucune accélération graphique.
const BASIC_DISPLAY =
  /microsoft basic (display|render)|carte graphique de base microsoft|pilote d'affichage de base/i;

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

// Noms de fabricants tels qu'on les connaît, au lieu de la raison sociale
// (« ASUSTeK COMPUTER INC. » → « ASUS »).
const MAKERS = [
  [/asus/i, "ASUS"],
  [/micro-star|\bmsi\b/i, "MSI"],
  [/gigabyte/i, "Gigabyte"],
  [/asrock/i, "ASRock"],
  [/hewlett|^hp\b/i, "HP"],
  [/dell/i, "Dell"],
  [/lenovo/i, "Lenovo"],
  [/acer/i, "Acer"],
  [/microsoft/i, "Microsoft"],
  [/apple/i, "Apple"],
];

export function shortMaker(maker) {
  if (!maker) return null;
  return (
    MAKERS.find(([re]) => re.test(maker))?.[1] ??
    maker
      .replace(/[\s,]*\b(inc|corp|corporation|co|ltd|gmbh)\.?\s*$/gi, "")
      .trim()
  );
}

/** « la page support de la carte mère ASUS TUF B360-PRO », selon ce qui est connu. */
function supportPage(machine) {
  if (!machine) return "la page support de la carte mère";
  const name = [machine.maker, machine.model].filter(Boolean).join(" ");
  return machine.kind === "board"
    ? `la page support de la carte mère (${name})`
    : `la page support du fabricant de l'ordinateur (${name})`;
}

/** « juillet 2026 », ou l'année seule si le mois est inconnu. */
function monthLabel(year, month) {
  return month ? `${MONTHS[month - 1]} ${year}` : String(year);
}
const BIOS_STALE_YEARS = 4;
const BIOS_ANCIENT_YEARS = 6;

/**
 * Applique les règles. `year` est injectable pour que les tests ne dépendent
 * pas de la date du jour.
 * @param {ReturnType<typeof parseComponents>} c
 * @param {{year?: number}} [opts]
 */
export function diagnoseComponents(
  c,
  { year = new Date().getFullYear(), month } = {},
) {
  const findings = [];
  let severity = "ok";
  const bump = (level) => {
    const rank = { ok: 0, warning: 1, problem: 2 };
    if (rank[level] > rank[severity]) severity = level;
  };

  // Règle A — mémoire bridée. Le cas le plus fréquent et le plus gratuit à
  // corriger : sans profil XMP/EXPO activé, la carte mère applique la
  // fréquence JEDEC de base et non celle pour laquelle les barrettes ont été
  // vendues. C'est une case à cocher dans le BIOS.
  const underclocked = c.memory.filter(
    (m) => m.rated != null && m.configured != null && m.configured < m.rated,
  );
  if (underclocked.length > 0) {
    const { rated, configured } = underclocked[0];
    // Perte rapportée à la fréquence nominale : c'est ce qui manque par
    // rapport à ce que les barrettes devraient fournir. (Rapportée à la
    // fréquence appliquée, on obtiendrait le gain possible, plus grand.)
    const loss = Math.round(((rated - configured) / rated) * 100);
    bump("warning");
    findings.push({
      level: "warning",
      id: "ram-underclocked",
      vars: { configured, rated, loss },
      title: `Mémoire bridée (${configured} MHz au lieu de ${rated} MHz)`,
      detail: `Mémoire utilisée sous sa fréquence nominale, soit environ ${loss} % de bande passante en moins. Sans profil XMP ou EXPO activé, la carte mère applique la fréquence de base`,
      fix: "Activer le profil XMP (Intel) ou EXPO/DOCP (AMD) dans le BIOS, puis relancer l'analyse pour vérifier la fréquence. Gratuit et réversible",
    });
  }

  // Règle A2 — trop peu de mémoire. Sous 8 Go, un système récent et un
  // navigateur la remplissent : Windows (ou macOS) écrit alors sur le disque.
  const total = totalMemoryGB(c.memory);
  if (total != null && total < 8) {
    bump(total < 4 ? "problem" : "warning");
    const fixed = c.memory[0]?.unified;
    findings.push({
      level: total < 4 ? "problem" : "warning",
      id: "ram-low",
      key: fixed ? "ram-low-unified" : "ram-low",
      vars: { total },
      title: `Mémoire limitée (${total} Go)`,
      detail:
        "Avec moins de 8 Go, le système et un navigateur ouvert remplissent la mémoire : l'ordinateur bascule alors sur le disque et ralentit nettement",
      fix: fixed
        ? "La mémoire de ce Mac ne s'étend pas : limiter les onglets et applications ouverts, et fermer celles qui restent en arrière-plan"
        : "Ajouter une barrette si un emplacement est libre (voir la notice de l'ordinateur), sinon limiter les onglets et applications ouverts",
    });
  }

  // Règle B — une seule barrette. Deux modules travaillent en double canal et
  // doublent la bande passante ; une seule divise par deux, ce qui se voit
  // surtout sur les machines à carte graphique intégrée.
  // Mémoire unifiée (Mac Apple Silicon) : soudée au processeur, sans
  // barrette à ajouter, la règle ne s'applique pas.
  if (c.memory.length === 1 && !c.memory[0].unified) {
    bump("warning");
    findings.push({
      level: "warning",
      id: "ram-single-channel",
      title: "Une seule barrette de mémoire",
      detail:
        "En simple canal, la bande passante mémoire est divisée par deux. Impact sensible en jeu et avec une carte graphique intégrée",
      fix: "Ajouter une seconde barrette identique dans l'emplacement indiqué par la notice de la carte mère, pour passer en double canal",
    });
  }

  // Mois courant : celui du jour, sauf quand les tests fixent l'année.
  const nowMonth =
    month ?? (arguments[1]?.year != null ? 12 : new Date().getMonth() + 1);

  // Règle C0 — carte graphique en panne ou sans vrai pilote. Windows le sait
  // (code d'erreur du Gestionnaire de périphériques) mais ne l'affiche pas.
  for (const gpu of c.gpus) {
    const name = gpu.name ? ` (${gpu.name})` : "";
    if (gpu.name && BASIC_DISPLAY.test(gpu.name)) {
      bump("problem");
      findings.push({
        level: "problem",
        id: `gpu-no-driver-${gpu.name}`,
        key: "gpu-no-driver",
        title: "Carte graphique sans pilote",
        detail:
          "Windows utilise son pilote d'affichage de base : pas d'accélération graphique, vidéos et jeux saccadés, résolution parfois limitée",
        fix: "Installer le pilote depuis le site du constructeur de la carte graphique (ou de l'ordinateur pour un portable)",
      });
    } else if (gpu.errorCode === 22) {
      bump("problem");
      findings.push({
        level: "problem",
        id: `gpu-disabled-${gpu.name}`,
        key: "gpu-disabled",
        vars: { name: gpu.name },
        title: `Carte graphique désactivée${name}`,
        detail:
          "Le périphérique est désactivé dans Windows (code 22) : la carte n'est pas utilisée",
        fix: "Clic droit sur le menu Démarrer › Gestionnaire de périphériques › Cartes graphiques › clic droit sur la carte › Activer le périphérique",
      });
    } else if (gpu.errorCode) {
      bump("problem");
      findings.push({
        level: "problem",
        id: `gpu-error-${gpu.name}`,
        key: "gpu-error",
        vars: { code: gpu.errorCode, name: gpu.name },
        title: `Carte graphique en erreur (code ${gpu.errorCode})${name}`,
        detail:
          gpu.errorCode === 43
            ? "Windows a arrêté la carte après un problème signalé (code 43) : le plus souvent un pilote corrompu, parfois une panne matérielle"
            : `Windows signale l'erreur ${gpu.errorCode} sur ce périphérique : la carte ne fonctionne pas normalement`,
        fix: "Désinstaller le pilote, puis installer la dernière version depuis le site du constructeur. Si l'erreur persiste, faire tester la carte",
      });
    } else if (gpu.status && !/^ok$/i.test(gpu.status)) {
      bump("problem");
      findings.push({
        level: "problem",
        id: `gpu-status-${gpu.name}`,
        key: "gpu-status",
        vars: { status: gpu.status, name: gpu.name },
        title: `État anormal de la carte graphique${name}`,
        detail: `État signalé par Windows : « ${gpu.status} »`,
        fix: "Ouvrir le Gestionnaire de périphériques › Cartes graphiques, puis réinstaller le pilote depuis le site du constructeur",
      });
    }
  }

  // Règle C — pilote graphique à mettre à jour. Les constructeurs publient
  // un pilote environ chaque mois : passé 6 mois, une version plus récente
  // existe presque sûrement ; passé 2 ans, le retard coûte des performances.
  // Sans le mois (saisie guidée), on compte en années.
  const ageMonths = (gpu) =>
    (year - gpu.driverYear) * 12 + (nowMonth - (gpu.driverMonth ?? nowMonth));
  for (const gpu of c.gpus) {
    if (
      gpu.driverYear != null &&
      ageMonths(gpu) >= GPU_DRIVER_OLD_MONTHS &&
      ageMonths(gpu) < GPU_DRIVER_STALE_YEARS * 12
    ) {
      bump("warning");
      const when = monthLabel(gpu.driverYear, gpu.driverMonth);
      findings.push({
        id: `gpu-driver-old-${gpu.name || "gpu"}`,
        key: "gpu-driver-old",
        level: "warning",
        vars: { year: gpu.driverYear, month: gpu.driverMonth, name: gpu.name },
        title: `Pilote graphique de ${when}, plus d'un an`,
        detail:
          "NVIDIA, AMD et Intel publient un nouveau pilote environ une fois par mois : une douzaine de versions sont sorties depuis, avec des corrections et des optimisations",
        fix: "Mettre à jour le pilote depuis l'application du constructeur (NVIDIA App, AMD Adrenalin, Intel Arc Control) ou sa page de téléchargement",
      });
    }
    if (
      gpu.driverYear != null &&
      ageMonths(gpu) >= GPU_DRIVER_STALE_YEARS * 12
    ) {
      bump("warning");
      findings.push({
        level: "warning",
        id: `gpu-driver-stale-${gpu.name || "gpu"}`,
        key: "gpu-driver-stale",
        vars: { year: gpu.driverYear, name: gpu.name },
        title: `Pilote graphique de ${gpu.driverYear}${gpu.name ? ` (${gpu.name})` : ""}`,
        detail:
          "Les optimisations et correctifs publiés depuis ne sont pas appliqués. Performances graphiques potentiellement réduites",
        fix: "Mettre à jour le pilote depuis l'application du constructeur (NVIDIA App, AMD Adrenalin, Intel Arc Control). Windows Update est souvent en retard sur les pilotes graphiques",
      });
    }
  }

  // Règle D — firmware d'origine. Au-delà de quelques années, c'est autant de
  // microcode processeur et de correctifs de stabilité jamais appliqués.
  if (c.bios?.year != null) {
    const age = year - c.bios.year;
    if (age >= BIOS_ANCIENT_YEARS) {
      bump("problem");
      findings.push({
        level: "problem",
        id: "bios-ancient",
        vars: { year: c.bios.year, age, machine: c.machine },
        title: `BIOS de ${c.bios.year}, soit ${age} ans`,
        detail:
          "Les mises à jour de microcode processeur et les correctifs de stabilité publiés depuis ne sont pas appliqués. Impact possible sur les performances",
        fix: `Télécharger le dernier BIOS sur ${supportPage(c.machine)}, et l'appliquer depuis l'utilitaire intégré au BIOS, avec le fichier sur une clé USB en FAT32. Jamais depuis un outil Windows`,
      });
    } else if (age >= BIOS_STALE_YEARS) {
      bump("warning");
      findings.push({
        level: "warning",
        id: "bios-stale",
        vars: { year: c.bios.year, age, machine: c.machine },
        title: `BIOS de ${c.bios.year}, soit ${age} ans`,
        detail:
          "Des mises à jour de firmware, dont du microcode processeur, ont probablement été publiées depuis",
        fix: `Vérifier sur ${supportPage(c.machine)} si une version plus récente existe. Mise à jour non urgente`,
      });
    }
  }

  if (findings.length === 0 && c.platform === "mac") {
    findings.push({
      id: "healthy",
      key: "healthy-mac",
      title: "Mémoire sans anomalie",
      detail:
        "Sur Mac, les pilotes et le firmware se mettent à jour avec macOS",
      fix: "Garder macOS à jour (Réglages Système › Général › Mise à jour de logiciels)",
    });
  }

  if (findings.length === 0) {
    findings.push({
      id: "healthy",
      title: "Aucune anomalie détectée",
    });
  }

  // Règle E — processeur bridé : le firmware limite sa vitesse (alimentation,
  // chauffe, batterie). Windows le mesure en continu, sans rien afficher.
  if (c.cpu?.limit != null && c.cpu.limit < CPU_LIMIT_PCT) {
    bump("warning");
    findings.push({
      level: "warning",
      id: "cpu-limited",
      key: c.platform === "mac" ? "cpu-limited-mac" : "cpu-limited",
      vars: { pct: c.cpu.limit, name: c.cpu.name },
      title: `Processeur bridé à ${c.cpu.limit} % de sa vitesse`,
      detail:
        "Le processeur ne peut pas atteindre sa pleine vitesse : limite imposée par l'alimentation, la chauffe ou la batterie",
      fix:
        c.platform === "mac"
          ? "Brancher le Mac sur secteur, le poser sur une surface dure et dégagée, et fermer les applications gourmandes"
          : "Brancher le portable sur secteur, choisir « Équilibré » ou « Performances optimales » dans Paramètres › Système › Alimentation, et dépoussiérer les aérations si le bridage persiste",
    });
  }

  // Règle F — pilote réseau ancien : coupures et débits réduits, surtout en
  // Wi-Fi. Ces pilotes évoluent moins vite que ceux des cartes graphiques.
  for (const d of c.network ?? []) {
    if (year - d.year >= NET_DRIVER_STALE_YEARS) {
      bump("warning");
      findings.push({
        level: "warning",
        id: `net-driver-old-${d.name}`,
        key: "net-driver-old",
        vars: { year: d.year, name: d.name },
        title: `Pilote réseau de ${d.year} (${d.name})`,
        detail:
          "Un pilote réseau ancien peut provoquer des coupures et brider le débit, surtout en Wi-Fi",
        fix: "Installer la dernière version depuis le site du fabricant de la carte réseau, de la carte mère ou de l'ordinateur, ou via Paramètres › Windows Update › Options avancées › Mises à jour facultatives",
      });
    }
  }

  // Contrôles passés sans anomalie : affichés à part, pour que ce qui va
  // bien reste visible même quand un autre point pose problème.
  const passed = [];
  const ids = new Set(findings.map((f) => f.key ?? f.id));
  const first = c.memory[0];
  if (
    first?.rated != null &&
    first?.configured != null &&
    !ids.has("ram-underclocked")
  ) {
    passed.push({
      id: "ram-speed",
      vars: { mhz: first.configured },
      label: `Mémoire à sa fréquence nominale (${first.configured} MHz)`,
    });
  }
  if (c.memory.length >= 2 && !first?.unified) {
    passed.push({
      id: "ram-dual",
      vars: { n: c.memory.length },
      label: `Double canal (${c.memory.length} barrettes)`,
    });
  }
  if (total != null && total >= 8) {
    passed.push({
      id: "ram-amount",
      vars: { total },
      label: `${total} Go de mémoire`,
    });
  }
  for (const gpu of c.gpus) {
    const name = gpu.name ? ` (${gpu.name})` : "";
    if (gpu.driverYear != null && ageMonths(gpu) < GPU_DRIVER_OLD_MONTHS) {
      passed.push({
        id: "gpu-driver",
        vars: {
          year: gpu.driverYear,
          month: gpu.driverMonth,
          name: gpu.name,
          recent: ageMonths(gpu) < GPU_DRIVER_RECENT_MONTHS,
        },
        label:
          ageMonths(gpu) < GPU_DRIVER_RECENT_MONTHS
            ? `Pilote graphique récent, de ${monthLabel(gpu.driverYear, gpu.driverMonth)}${name}`
            : `Pilote graphique de ${monthLabel(gpu.driverYear, gpu.driverMonth)}${name}`,
      });
    }
    if (
      (gpu.status || gpu.errorCode != null) &&
      /^ok$/i.test(gpu.status ?? "OK") &&
      !gpu.errorCode &&
      !BASIC_DISPLAY.test(gpu.name ?? "")
    ) {
      passed.push({
        id: "gpu-ok",
        vars: { name: gpu.name },
        label: `Carte graphique en état de marche, sans erreur signalée par Windows${name}`,
      });
    }
  }
  if (c.bios?.year != null && year - c.bios.year < BIOS_STALE_YEARS) {
    passed.push({
      id: "bios-recent",
      vars: { year: c.bios.year },
      label: `BIOS de ${c.bios.year}`,
    });
  }

  if (c.cpu?.limit != null && c.cpu.limit >= CPU_LIMIT_PCT) {
    passed.push({
      id: "cpu-full-speed",
      vars: { name: c.cpu.name },
      label: `Processeur sans bridage${c.cpu.name ? ` (${c.cpu.name})` : ""}`,
    });
  }
  for (const d of c.network ?? []) {
    if (year - d.year < NET_DRIVER_STALE_YEARS) {
      passed.push({
        id: "net-driver-ok",
        vars: { year: d.year, month: d.month, name: d.name },
        label: `Pilote réseau de ${monthLabel(d.year, d.month)} (${d.name})`,
      });
    }
  }

  return { ...c, totalGB: total, severity, findings, passed };
}

/** Raccourci : texte brut → verdict. */
export function analyzeComponents(raw, opts) {
  return diagnoseComponents(parseComponents(raw), opts);
}

/**
 * Mémoire d'un Mac, d'après `system_profiler SPMemoryDataType`.
 *
 * Deux formes : les Mac Intel listent leurs emplacements (BANK…/DIMM…) avec
 * taille et fréquence ; les Mac Apple Silicon n'indiquent qu'un total, la
 * mémoire étant unifiée et soudée au processeur.
 * @param {string} raw
 */
export function parseMacMemory(raw) {
  if (!/^\s*Memory:\s*$/m.test(raw) && !/Memory Slots:/i.test(raw)) return [];

  const slots = [];
  let current = null;
  for (const line of raw.split(/\r?\n/)) {
    const slot = line.match(/^\s*((?:BANK|DIMM)[^:]*):\s*$/i);
    if (slot) {
      current = {
        slot: slot[1].trim(),
        capacity: null,
        rated: null,
        configured: null,
      };
      slots.push(current);
      continue;
    }
    if (!current) continue;
    const size = line.match(/^\s*Size:\s*(\d+)\s*GB/i);
    if (size) current.capacity = Number(size[1]) * GIB;
    const speed = line.match(/^\s*Speed:\s*(\d+)\s*MHz/i);
    if (speed) current.rated = Number(speed[1]);
  }
  const filled = slots.filter((s) => s.capacity);
  if (filled.length > 0) return filled;

  const unified = raw.match(/^\s*Memory:\s*(\d+)\s*GB/im);
  return unified
    ? [
        {
          slot: null,
          capacity: Number(unified[1]) * GIB,
          rated: null,
          configured: null,
          unified: true,
        },
      ]
    : [];
}
