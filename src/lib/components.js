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
    // Perte rapportée à la fréquence nominale : c'est ce qui manque par
    // rapport à ce que les barrettes devraient fournir. (Rapportée à la
    // fréquence appliquée, on obtiendrait le gain possible, plus grand.)
    const loss = Math.round(((rated - configured) / rated) * 100);
    bump("warning");
    findings.push({
      id: "ram-underclocked",
      vars: { configured, rated, loss },
      title: `Mémoire bridée (${configured} MHz au lieu de ${rated} MHz)`,
      detail: `Mémoire utilisée sous sa fréquence nominale, soit environ ${loss} % de bande passante en moins. Sans profil XMP ou EXPO activé, la carte mère applique la fréquence de base`,
      fix: "Activer le profil XMP (Intel) ou EXPO/DOCP (AMD) dans le BIOS, puis relancer l'analyse pour vérifier la fréquence. Gratuit et réversible",
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
        "En simple canal, la bande passante mémoire est divisée par deux. Impact sensible en jeu et avec une carte graphique intégrée",
      fix: "Ajouter une seconde barrette identique dans l'emplacement indiqué par la notice de la carte mère, pour passer en double canal",
    });
  }

  // Règle C — pilote graphique figé. Un pilote ancien coûte des performances
  // et des corrections de bugs, sans jamais le signaler.
  for (const gpu of c.gpus) {
    if (gpu.driverYear != null && year - gpu.driverYear >= GPU_DRIVER_STALE_YEARS) {
      bump("warning");
      findings.push({
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
        id: "bios-ancient",
        vars: { year: c.bios.year, age },
        title: `BIOS de ${c.bios.year}, soit ${age} ans`,
        detail:
          "Les mises à jour de microcode processeur et les correctifs de stabilité publiés depuis ne sont pas appliqués. Impact possible sur les performances",
        fix: "Télécharger le dernier BIOS sur la page support de la carte mère, et l'appliquer depuis l'utilitaire intégré au BIOS, avec le fichier sur une clé USB en FAT32. Jamais depuis un outil Windows",
      });
    } else if (age >= BIOS_STALE_YEARS) {
      bump("warning");
      findings.push({
        id: "bios-stale",
        vars: { year: c.bios.year, age },
        title: `BIOS de ${c.bios.year}, soit ${age} ans`,
        detail:
          "Des mises à jour de firmware, dont du microcode processeur, ont probablement été publiées depuis",
        fix: "Vérifier sur la page support de la carte mère si une version plus récente existe. Mise à jour non urgente",
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      id: "healthy",
      title: "Composants bien réglés",
      detail:
        "Mémoire à sa fréquence nominale, pilotes récents, firmware à jour",
      fix: "Rien à corriger de ce côté",
    });
  }

  return { ...c, totalGB: totalMemoryGB(c.memory), severity, findings };
}

/** Raccourci : texte brut → verdict. */
export function analyzeComponents(raw, opts) {
  return diagnoseComponents(parseComponents(raw), opts);
}
