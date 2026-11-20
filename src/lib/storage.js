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

const GIB = 1024 ** 3;

/** Octets → Go, arrondi à une décimale. */
export function toGB(bytes) {
  return bytes == null ? null : Math.round((bytes / GIB) * 10) / 10;
}

/**
 * Extrait les volumes de la sortie de :
 *   Get-Volume | Where-Object DriveLetter |
 *     Format-List DriveLetter,FileSystemLabel,Size,SizeRemaining,HealthStatus,OperationalStatus
 *
 * Format-List sépare chaque volume par une ligne vide, et chaque champ est un
 * simple `Clé : valeur`. Les noms de propriétés restent anglais même sur un
 * Windows français (ce sont des propriétés .NET), les valeurs aussi.
 * @param {string} raw
 */
export function parseVolumes(raw) {
  if (!raw || !raw.trim()) return [];

  return raw
    .split(/\n\s*\n/) // un bloc par volume
    .map((block) => {
      // Lecture ligne à ligne plutôt qu'au motif : un `Clé : valeur` se coupe
      // au premier deux-points. Pas de motif à échapper, et aucune clé ne peut
      // en préfixer une autre (`Size` contre `SizeRemaining`).
      const fields = {};
      for (const line of block.split(/\r?\n/)) {
        const sep = line.indexOf(":");
        if (sep === -1) continue;
        fields[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
      }

      const grab = (key) => fields[key] || null;
      const num = (key) => {
        const v = grab(key);
        if (v == null) return null;
        const n = Number(v.replace(/[\s ]/g, "").replace(",", "."));
        return Number.isFinite(n) ? n : null;
      };

      return {
        driveLetter: grab("DriveLetter"),
        label: grab("FileSystemLabel"),
        size: num("Size"),
        free: num("SizeRemaining"),
        health: grab("HealthStatus"),
        operational: grab("OperationalStatus"),
      };
    })
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
  const where = `${v.driveLetter}:`;

  // Règle A — saturation. Le symptôme le plus courant et le plus invisible.
  if (pct != null) {
    if (pct < CRITICAL_PCT) {
      bump("problem");
      findings.push({
        id: "disk-critical",
        title: `${where} saturé (${freeGB} Go libres, ${pct} %)`,
        detail:
          "À ce niveau Windows n'a plus de quoi travailler : les mises à jour échouent, le fichier d'échange ne peut plus grandir, et un volume plein finit par abîmer le système de fichiers lui-même.",
        fix: "Libère de la place immédiatement : déplace les gros dossiers (jeux, téléchargements, documents) vers un autre disque, et vide la corbeille.",
      });
    } else if (pct < LOW_PCT) {
      bump("warning");
      findings.push({
        id: "disk-low",
        title: `${where} presque plein (${freeGB} Go libres, ${pct} %)`,
        detail:
          "Un SSD a besoin de blocs libres pour répartir l'usure et garder ses performances d'écriture. En dessous de 15 %, il ralentit et s'use plus vite.",
        fix: "Vise au moins 20 % d'espace libre. Les bibliothèques de jeux et les caches d'applications sont les premiers candidats au déménagement.",
      });
    }
  }

  // Règle B — le disque système a besoin d'une marge absolue, pas seulement
  // d'un pourcentage : une mise à jour de fonctionnalité réclame ~20 Go.
  if (system && freeGB != null && freeGB < UPDATE_HEADROOM_GB && pct >= CRITICAL_PCT) {
    bump("warning");
    findings.push({
      id: "no-update-headroom",
      title: `Marge insuffisante pour les mises à jour (${freeGB} Go)`,
      detail:
        "Une mise à jour de fonctionnalité Windows réclame une vingtaine de gigaoctets de travail temporaire. En dessous, elle échoue sans toujours dire pourquoi.",
      fix: "Garde 20 Go libres en permanence sur le disque système, indépendamment du pourcentage.",
    });
  }

  // Règle C — intégrité. `Get-Volume` sait qu'un volume est abîmé bien avant
  // que l'utilisateur ne s'en aperçoive.
  const healthBad = v.health && !/^(healthy|sain)$/i.test(v.health);
  const repairNeeded = v.operational && /repair needed|r[ée]paration/i.test(v.operational);

  if (healthBad || repairNeeded) {
    bump("problem");
    findings.push({
      id: "fs-damaged",
      title: `Système de fichiers endommagé sur ${where}`,
      detail: `Windows signale « ${v.operational || v.health} ». Une entrée abîmée dans la table de fichiers (MFT) ne se répare pas toute seule et reste signalée à chaque accès, souvent pendant des mois sans symptôme visible.`,
      fix: `Sauvegarde d'abord, puis lance chkdsk ${where} /f. Si la commande refuse de s'exécuter, passe par l'environnement de récupération (Paramètres → Récupération → Démarrage avancé → Invite de commandes).`,
    });
  }

  if (findings.length === 0) {
    findings.push({
      id: "healthy",
      title: `${where} en bonne santé`,
      detail: `${freeGB} Go libres (${pct} %), intégrité vérifiée. Rien à signaler côté stockage.`,
      fix: "Rien à corriger. Si la machine rame quand même, le coupable est ailleurs.",
    });
  }

  return { ...v, pct, freeGB, sizeGB: toGB(v.size), severity, findings };
}

/**
 * Analyse tous les volumes et agrège un verdict global.
 * Le disque système est supposé être C: — c'est le cas sur la quasi-totalité
 * des installations Windows, et `Get-Volume` ne dit pas lequel l'héberge.
 * @param {string} raw sortie brute de Get-Volume
 */
export function diagnoseStorage(raw) {
  const volumes = parseVolumes(raw).map((v) =>
    gradeVolume(v, { system: v.driveLetter.toUpperCase() === "C" }),
  );

  const rank = { ok: 0, warning: 1, problem: 2 };
  const severity = volumes.reduce(
    (worst, v) => (rank[v.severity] > rank[worst] ? v.severity : worst),
    "ok",
  );

  return { volumes, severity };
}
