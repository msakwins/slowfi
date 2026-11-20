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
import { parseBlocks, field, number, yearOf } from "./powershell.js";

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
  let bios = null;

  for (const f of parseBlocks(raw)) {
    if ("Capacity" in f || "DeviceLocator" in f) {
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
      });
    } else if ("SMBIOSBIOSVersion" in f) {
      bios = {
        vendor: field(f, "Manufacturer"),
        version: field(f, "SMBIOSBIOSVersion"),
        year: yearOf(field(f, "ReleaseDate")),
      };
    }
  }

  return { memory, gpus, bios };
}

/** Total de mémoire installée, en Go. */
export function totalMemoryGB(memory) {
  const total = memory.reduce((sum, m) => sum + (m.capacity || 0), 0);
  return total ? Math.round(total / GIB) : null;
}

const GPU_DRIVER_STALE_YEARS = 2;
const BIOS_STALE_YEARS = 4;
const BIOS_ANCIENT_YEARS = 6;

/**
 * Applique les règles. `year` est injectable pour que les tests ne dépendent
 * pas de la date du jour.
 * @param {ReturnType<typeof parseComponents>} c
 * @param {{year?: number}} [opts]
 */
export function diagnoseComponents(c, { year = new Date().getFullYear() } = {}) {
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
    const loss = Math.round(((rated - configured) / configured) * 100);
    bump("warning");
    findings.push({
      id: "ram-underclocked",
      title: `Mémoire bridée (${configured} MHz au lieu de ${rated} MHz)`,
      detail: `Les barrettes tournent sous leur fréquence nominale : environ ${loss} % de bande passante mémoire laissée de côté. Sans profil activé, la carte mère applique la fréquence de base et non celle inscrite sur les modules.`,
      fix: "Active le profil XMP (Intel) ou EXPO/DOCP (AMD) dans le BIOS, puis vérifie la fréquence appliquée. C'est gratuit et réversible.",
    });
  }

  // Règle B — une seule barrette. Deux modules travaillent en double canal et
  // doublent la bande passante ; une seule divise par deux, ce qui se voit
  // surtout sur les machines à carte graphique intégrée.
  if (c.memory.length === 1) {
    bump("warning");
    findings.push({
      id: "ram-single-channel",
      title: "Une seule barrette de mémoire",
      detail:
        "En simple canal, la bande passante mémoire est divisée par deux. L'effet est net sur les jeux et sur tout ce qui s'appuie sur une carte graphique intégrée.",
      fix: "Ajoute une barrette identique dans le bon emplacement (la notice de la carte mère indique lequel) pour passer en double canal.",
    });
  }

  // Règle C — pilote graphique figé. Un pilote ancien coûte des performances
  // et des corrections de bugs, sans jamais le signaler.
  for (const gpu of c.gpus) {
    if (gpu.driverYear != null && year - gpu.driverYear >= GPU_DRIVER_STALE_YEARS) {
      bump("warning");
      findings.push({
        id: `gpu-driver-stale-${gpu.name || "gpu"}`,
        title: `Pilote graphique de ${gpu.driverYear}${gpu.name ? ` (${gpu.name})` : ""}`,
        detail:
          "Un pilote qui a plusieurs années laisse de côté les gains de performance et les correctifs publiés depuis. Rien ne plante, mais la carte rend moins que ce qu'elle peut.",
        fix: "Mets à jour via l'application du constructeur (NVIDIA App, AMD Adrenalin, Intel Arc Control) plutôt que par Windows Update, qui reste souvent en retard.",
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
        id: "bios-ancient",
        title: `BIOS de ${c.bios.year}, soit ${age} ans`,
        detail:
          "Un firmware aussi ancien n'a reçu aucune des mises à jour de microcode processeur ni des correctifs de stabilité publiés depuis. Sur certaines machines, cela coûte aussi des performances.",
        fix: "Récupère le dernier BIOS sur la page support de ta carte mère et applique-le depuis l'utilitaire intégré au BIOS, avec le fichier sur une clé USB en FAT32 — jamais depuis un outil Windows.",
      });
    } else if (age >= BIOS_STALE_YEARS) {
      bump("warning");
      findings.push({
        id: "bios-stale",
        title: `BIOS de ${c.bios.year}, soit ${age} ans`,
        detail:
          "Plusieurs mises à jour de firmware ont probablement été publiées depuis, dont du microcode processeur.",
        fix: "Vérifie la page support de ta carte mère. La mise à jour n'est pas urgente, mais elle est en retard.",
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      id: "healthy",
      title: "Composants bien réglés",
      detail:
        "Mémoire à sa fréquence nominale, pilotes récents, firmware à jour. Rien à récupérer de ce côté.",
      fix: "Rien à corriger. Si la machine rame quand même, le coupable est ailleurs.",
    });
  }

  return { ...c, totalGB: totalMemoryGB(c.memory), severity, findings };
}

/** Raccourci : texte brut → verdict. */
export function analyzeComponents(raw, opts) {
  return diagnoseComponents(parseComponents(raw), opts);
}
