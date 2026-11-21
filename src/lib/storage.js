// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic du stockage — même philosophie que `diagnose()` pour le Wi-Fi :
// on colle la sortie d'une commande PowerShell, on parse, on applique des
// règles symptôme → coupable → correctif.
//
// Pourquoi le stockage a sa place dans un outil qui s'appelle « ça rame » : un
// disque système saturé ralentit tout (plus de place pour le fichier d'échange,
// les mises à jour échouent, le contrôleur SSD n'a plus de blocs libres à
// recycler), et une table de fichiers abîmée passe inaperçue pendant des mois.
// Deux pannes invisibles qui se manifestent comme « l'ordi est lent ».
// ─────────────────────────────────────────────────────────────────────────────
import { parseBlocks, field, number } from "./powershell.js";
import { parseDf } from "./linux.js";

const GIB = 1024 ** 3;

/** Nombre écrit à la française (virgule décimale). */
const fr = (n) => String(n).replace(".", ",");

/** Octets → Go, arrondi à une décimale. */
export function toGB(bytes) {
  return bytes == null ? null : Math.round((bytes / GIB) * 10) / 10;
}

/**
 * Extrait les volumes de la sortie de :
 *   Get-Volume | Where-Object DriveLetter |
 *     Format-List DriveLetter,FileSystemLabel,Size,SizeRemaining,HealthStatus,OperationalStatus
 *
 * Les noms de propriétés restent anglais même sur un Windows français (ce sont
 * des propriétés .NET), les valeurs aussi.
 * @param {string} raw
 */
export function parseVolumes(raw) {
  return parseBlocks(raw)
    .map((f) => ({
      driveLetter: field(f, "DriveLetter"),
      label: field(f, "FileSystemLabel"),
      size: number(f, "Size"),
      free: number(f, "SizeRemaining"),
      health: field(f, "HealthStatus"),
      operational: field(f, "OperationalStatus"),
    }))
    .filter((v) => v.driveLetter && v.size);
}

/** Part d'espace libre, en pourcentage (0–100), ou null si indéterminable. */
export function freePercent(v) {
  if (!v.size || v.free == null) return null;
  return Math.round((v.free / v.size) * 1000) / 10;
}

// Seuils. 15 % est le plancher de confort d'un SSD (le contrôleur a besoin de
// blocs libres pour répartir l'usure) ; sous 5 % Windows lui-même commence à
// échouer : mises à jour, fichier d'échange, fichiers temporaires.
const CRITICAL_PCT = 5;
const LOW_PCT = 15;
// En dessous, une mise à jour de fonctionnalité Windows ne passe plus.
const UPDATE_HEADROOM_GB = 20;

/**
 * Note un volume. Fonction pure : un volume parsé → un verdict.
 * @param {ReturnType<typeof parseVolumes>[number]} v
 * @param {{system?: boolean}} [opts] `system` : il s'agit du disque Windows.
 */
export function gradeVolume(v, { system = false } = {}) {
  const findings = [];
  let severity = "ok";
  const bump = (level) => {
    const rank = { ok: 0, warning: 1, problem: 2 };
    if (rank[level] > rank[severity]) severity = level;
  };

  const pct = freePercent(v);
  const freeGB = toGB(v.free);
  // Nom affiché : la lettre sous Windows (« C: »), le nom du volume sur Mac.
  const where = v.name ?? `${v.driveLetter}:`;

  // Règle A — saturation. Le symptôme le plus courant et le plus invisible.
  if (pct != null) {
    if (pct < CRITICAL_PCT) {
      bump("problem");
      findings.push({
        level: "problem",
        id: "disk-critical",
        vars: { where, freeGB, pct },
        title: `${where} saturé (${fr(freeGB)} Go libres, ${fr(pct)} %)`,
        detail:
          "Espace insuffisant pour le fonctionnement de Windows : échec des mises à jour, fichier d'échange bloqué, risque de corruption du système de fichiers",
        fix: "Déplacer les gros dossiers (jeux, téléchargements, documents) vers un autre disque, puis vider la corbeille",
      });
    } else if (pct < LOW_PCT) {
      bump("warning");
      findings.push({
        level: "warning",
        id: "disk-low",
        vars: { where, freeGB, pct },
        title: `${where} presque plein (${fr(freeGB)} Go libres, ${fr(pct)} %)`,
        detail:
          "Sous 15 % d'espace libre, un SSD perd en vitesse d'écriture et s'use plus rapidement",
        fix: "Viser 20 % d'espace libre. Déplacer en priorité les bibliothèques de jeux et les caches d'applications",
      });
    }
  }

  // Règle B — le disque système a besoin d'une marge absolue, pas seulement
  // d'un pourcentage : une mise à jour de fonctionnalité réclame ~20 Go.
  if (
    system &&
    freeGB != null &&
    freeGB < UPDATE_HEADROOM_GB &&
    pct >= CRITICAL_PCT
  ) {
    bump("warning");
    findings.push({
      level: "warning",
      id: "no-update-headroom",
      vars: { freeGB },
      title: `Marge insuffisante pour les mises à jour (${fr(freeGB)} Go)`,
      detail:
        "Les mises à jour de fonctionnalités Windows nécessitent environ 20 Go d'espace temporaire. En dessous, elles peuvent échouer sans message explicite",
      fix: "Garder 20 Go libres en permanence sur le disque système",
    });
  }

  // Règle C — intégrité. `Get-Volume` sait qu'un volume est abîmé bien avant
  // que l'utilisateur ne s'en aperçoive.
  const healthBad = v.health && !/^(healthy|sain)$/i.test(v.health);
  const repairNeeded =
    v.operational && /repair needed|r[ée]paration/i.test(v.operational);

  if (healthBad || repairNeeded) {
    bump("problem");
    findings.push({
      level: "problem",
      id: "fs-damaged",
      vars: { where, state: v.operational || v.health },
      title: `Système de fichiers endommagé sur ${where}`,
      detail: `État signalé par Windows : « ${v.operational || v.health} ». Une erreur dans la table des fichiers (MFT) ne se corrige pas d'elle-même et peut rester sans symptôme visible pendant des mois`,
      fix: `Sauvegarder d'abord. La réparation se lance avec chkdsk ${where} /f ; si la commande refuse de démarrer, elle passe par l'environnement de récupération (Paramètres › Récupération › Démarrage avancé › Invite de commandes)`,
    });
  }

  // Règle D — Mac : le disque signale lui-même une défaillance (SMART).
  if (v.smart && /fail/i.test(v.smart)) {
    bump("problem");
    findings.push({
      level: "problem",
      id: "smart-failing",
      vars: { where },
      title: `Disque signalé défaillant (${where})`,
      detail:
        "Le disque annonce lui-même une panne prochaine (état SMART « Failing »). Les ralentissements et les pertes de données vont s'aggraver",
      fix: "Sauvegarder immédiatement (Time Machine ou copie sur un disque externe), puis faire remplacer le disque",
    });
  }

  if (findings.length === 0) {
    findings.push({
      id: "healthy",
      vars: { where, freeGB, pct },
      title: `${where} en bonne santé`,
      detail: `${fr(freeGB)} Go libres (${fr(pct)} %), intégrité vérifiée`,
    });
  }

  // Quand un point pose problème, ce qui reste sain est listé à part.
  const passed = [];
  if (findings[0].id !== "healthy") {
    if (pct != null && pct >= LOW_PCT) {
      passed.push({
        id: "space-ok",
        vars: { freeGB, pct },
        label: `${fr(freeGB)} Go libres (${fr(pct)} %)`,
      });
    }
    if ((v.health || v.operational) && !healthBad && !repairNeeded) {
      passed.push({ id: "fs-ok", label: "Système de fichiers sain" });
    }
  }

  return {
    ...v,
    pct,
    freeGB,
    sizeGB: toGB(v.size),
    severity,
    findings,
    passed,
  };
}

/**
 * Analyse tous les volumes et agrège un verdict global.
 * Le disque système est supposé être C: — c'est le cas sur la quasi-totalité
 * des installations Windows, et `Get-Volume` ne dit pas lequel l'héberge.
 * @param {string} raw sortie brute de Get-Volume
 */
export function diagnoseStorage(raw) {
  const volumes = [
    ...parseVolumes(raw).map((v) =>
      gradeVolume(v, { system: v.driveLetter.toUpperCase() === "C" }),
    ),
    // Sur Mac, la commande ne décrit que le volume de démarrage.
    ...parseMacDisk(raw).map((v) => gradeVolume(v, { system: true })),
    // Linux : « / » porte le système, « /home » les données.
    ...parseDf(raw).map((v) => gradeVolume(v, { system: v.name === "/" })),
  ];

  const rank = { ok: 0, warning: 1, problem: 2 };
  const severity = volumes.reduce(
    (worst, v) => (rank[v.severity] > rank[worst] ? v.severity : worst),
    "ok",
  );

  return { volumes, severity };
}

/**
 * Volume de démarrage d'un Mac, d'après `diskutil info /`.
 *
 * Sur APFS, l'espace se partage dans un conteneur : c'est sa taille et son
 * espace libre qui comptent, pas ceux du volume. Les tailles se lisent dans la
 * parenthèse en octets, plus précise que l'arrondi affiché devant.
 * @param {string} raw
 * @returns {Array<{name:string, driveLetter:null, label:null, size:number, free:number, health:null, operational:null, smart:string|null}>}
 */
export function parseMacDisk(raw) {
  if (!/Mount Point:\s*\/\s*$/m.test(raw) && !/Volume Name:/i.test(raw))
    return [];
  const bytes = (...labels) => {
    for (const label of labels) {
      const m = raw.match(
        new RegExp(label + ":[^(\\n]*\\((\\d+) Bytes\\)", "i"),
      );
      if (m) return Number(m[1]);
    }
    return null;
  };
  const size = bytes(
    "Container Total Space",
    "Disk Size",
    "Volume Total Space",
  );
  const free = bytes(
    "Container Free Space",
    "Volume Free Space",
    "Volume Available Space",
  );
  if (!size) return [];
  return [
    {
      name: raw.match(/Volume Name:\s*(.+)/i)?.[1]?.trim() || "Macintosh HD",
      driveLetter: null,
      label: null,
      size,
      free,
      health: null,
      operational: null,
      smart: raw.match(/SMART Status:\s*(.+)/i)?.[1]?.trim() ?? null,
    },
  ];
}
