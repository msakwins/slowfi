// ─────────────────────────────────────────────────────────────────────────────
// État du système : type et santé du disque de démarrage, durée depuis le
// dernier redémarrage, mode d'économie d'énergie.
//
// Trois causes de lenteur que rien ne signale : Windows sur un disque dur
// mécanique, une machine jamais vraiment redémarrée (le démarrage rapide de
// Windows fait d'un « Arrêter » une mise en veille prolongée), et un mode
// d'économie d'énergie oublié qui bride le processeur.
//
// Windows : Get-PhysicalDisk, plus un bloc calculé (disque système, jours
// depuis le démarrage, mode d'alimentation). macOS : uptime et pmset.
// ─────────────────────────────────────────────────────────────────────────────
import { parseBlocks, field, number } from "./powershell.js";
import { parsePlatform, platformRules } from "./platform.js";

// Mode « Économies d'énergie » de Windows : identifiant fixe, quelle que soit
// la langue du système.
const POWER_SAVER_GUID = "a1841308-3541-4fab-bc81-f71556f20b4a";

const UPTIME_DAYS = 7;

/**
 * @param {string} raw
 * @returns {{
 *   platform: "windows"|"mac",
 *   disks: Array<{id:string|null, name:string|null, mediaType:string|null, busType:string|null, health:string|null}>,
 *   systemDisk: object|null,
 *   uptimeDays: number|null,
 *   powerSaver: boolean|null,
 * }|null}
 */
export function parseSystem(raw) {
  const blocks = parseBlocks(raw);
  const disks = blocks
    .filter((f) => "MediaType" in f || "BusType" in f)
    .map((f) => ({
      id: field(f, "DeviceId"),
      name: field(f, "FriendlyName"),
      mediaType: field(f, "MediaType"),
      busType: field(f, "BusType"),
      health: field(f, "HealthStatus"),
    }));
  const info = blocks.find(
    (f) => "UptimeDays" in f || "SystemDisk" in f || "PowerScheme" in f,
  );
  // Version du système, batterie, programmes au démarrage (platform.js).
  const env = parsePlatform(blocks, raw);

  if (disks.length > 0 || info || env.os?.kind === "windows" || env.startup) {
    const systemId = info ? field(info, "SystemDisk") : null;
    const scheme = info ? field(info, "PowerScheme") : null;
    return {
      platform: "windows",
      disks,
      // Une seule unité physique : c'est forcément elle qui porte Windows.
      systemDisk:
        disks.find((d) => systemId != null && d.id === systemId) ??
        (disks.length === 1 ? disks[0] : null),
      uptimeDays: info ? number(info, "UptimeDays") : null,
      powerSaver: scheme
        ? scheme.toLowerCase().includes(POWER_SAVER_GUID)
        : null,
      env,
    };
  }

  // macOS : « up 12 days, 3:04 » ; moins d'un jour, « up 3:04 » ou « up 5 mins ».
  const up = raw.match(/\bup\s+(?:(\d+)\s+days?,?|\d+:\d+|\d+\s+mins?)/i);
  const lowPower = raw.match(/lowpowermode\s+(\d)/i);
  if (!up && !lowPower && !env.os && !env.battery) return null;
  return {
    platform: "mac",
    disks: [],
    systemDisk: null,
    uptimeDays: up ? Number(up[1] ?? 0) : null,
    powerSaver: lowPower ? lowPower[1] === "1" : null,
    env,
  };
}

/** Type de disque lisible : NVMe, SSD ou HDD. */
export function diskKind(d) {
  if (!d) return null;
  if (/hdd/i.test(d.mediaType || "")) return "HDD";
  if (/nvme/i.test(d.busType || "")) return "NVMe";
  if (/ssd/i.test(d.mediaType || "")) return "SSD";
  return null;
}

/**
 * @param {NonNullable<ReturnType<typeof parseSystem>>} s
 * @param {{ today?: string }} [opts] date du jour (« AAAA-MM-JJ »), fixée par les tests
 */
export function diagnoseSystem(
  s,
  { today = new Date().toISOString().slice(0, 10) } = {},
) {
  const findings = [];
  let severity = "ok";
  const bump = (level) => {
    const rank = { ok: 0, warning: 1, problem: 2 };
    if (rank[level] > rank[severity]) severity = level;
  };

  // Règle A — Windows sur un disque dur mécanique.
  if (diskKind(s.systemDisk) === "HDD") {
    bump("problem");
    findings.push({
      id: "system-hdd",
      title: "Windows installé sur un disque dur mécanique",
      detail:
        "Un disque dur est bien plus lent qu'un SSD pour démarrer, ouvrir des applications ou installer des mises à jour. C'est la cause de lenteur la plus fréquente sur un PC de plus de cinq ans",
      fix: "Remplacer le disque système par un SSD, en clonant le disque actuel ou en réinstallant Windows. C'est l'amélioration la plus visible sur un PC ancien",
    });
  }

  // Règle B — un disque physique se signale lui-même en mauvais état.
  for (const d of s.disks) {
    if (d.health && !/^(healthy|sain|ok)$/i.test(d.health)) {
      bump("problem");
      findings.push({
        id: `disk-unhealthy-${d.id ?? d.name}`,
        key: "disk-unhealthy",
        vars: { name: d.name || "?", state: d.health },
        title: `Disque en mauvais état (${d.name || "?"})`,
        detail: `État signalé par Windows : « ${d.health} ». Le disque anticipe lui-même une panne`,
        fix: "Sauvegarder immédiatement, puis remplacer le disque",
      });
    }
  }

  // Règle C — pas de redémarrage depuis longtemps.
  if (s.uptimeDays != null && s.uptimeDays >= UPTIME_DAYS) {
    bump("warning");
    const mac = s.platform === "mac";
    findings.push({
      id: "uptime-long",
      key: mac ? "uptime-long-mac" : "uptime-long",
      vars: { days: s.uptimeDays },
      title: `Pas de redémarrage depuis ${s.uptimeDays} jours`,
      detail: mac
        ? "Mémoire encombrée et mises à jour en attente s'accumulent tant que le Mac n'est pas redémarré"
        : "Avec le démarrage rapide de Windows, « Arrêter » ne remet pas le système à zéro : seul « Redémarrer » le fait. Mémoire encombrée et mises à jour en attente s'accumulent",
      fix: mac
        ? "Redémarrer le Mac (Menu Pomme › Redémarrer) au moins une fois par semaine"
        : "Utiliser « Redémarrer », et non « Arrêter », au moins une fois par semaine",
    });
  }

  // Règle D — mode d'économie d'énergie actif.
  if (s.powerSaver) {
    bump("warning");
    const mac = s.platform === "mac";
    findings.push({
      id: "power-saver",
      key: mac ? "power-saver-mac" : "power-saver",
      title: "Mode économie d'énergie actif",
      detail:
        "Le processeur est volontairement bridé pour économiser l'énergie : les applications répondent plus lentement",
      fix: mac
        ? "Régler « Mode économie d'énergie » sur « Jamais » ou « Sur batterie uniquement » dans Réglages Système › Batterie"
        : "Choisir « Équilibré » dans Paramètres › Système › Alimentation › Mode d'alimentation, ou dans les Options d'alimentation du Panneau de configuration",
    });
  }

  // Règles E à G — version du système, batterie, démarrage.
  const env = platformRules(s.env ?? {}, today);
  for (const { level, ...finding } of env.findings) {
    bump(level);
    // La version du système passe en tête : c'est le point le plus grave.
    if (/windows|macos/.test(finding.id)) findings.unshift(finding);
    else findings.push(finding);
  }

  if (findings.length === 0) {
    findings.push({
      id: "healthy",
      title: "Aucune anomalie détectée",
    });
  }

  // Contrôles passés sans anomalie, affichés à part.
  const passed = [...env.passed.filter((p) => /windows|macos/.test(p.id))];
  const kind = diskKind(s.systemDisk);
  if (kind === "SSD" || kind === "NVMe") {
    passed.push({
      id: "system-ssd",
      vars: { kind },
      label: kind === "NVMe" ? "Windows sur un SSD NVMe" : "Windows sur un SSD",
    });
  }
  const healthy = s.disks.filter(
    (d) => d.health && /^(healthy|sain|ok)$/i.test(d.health),
  );
  if (healthy.length > 0 && healthy.length === s.disks.length) {
    const n = healthy.length;
    passed.push({
      id: "disks-healthy",
      vars: {
        n,
        names: healthy
          .map((d) => d.name)
          .filter(Boolean)
          .join(", "),
      },
      label: `${n > 1 ? `${n} disques physiques en bon état` : "Disque physique en bon état"} : ${healthy
        .map((d) => d.name)
        .filter(Boolean)
        .join(", ")}`,
    });
  }
  if (s.uptimeDays != null && s.uptimeDays < UPTIME_DAYS) {
    const d = s.uptimeDays;
    passed.push({
      id: "uptime-ok",
      vars: { days: d },
      label:
        d === 0
          ? "Redémarré il y a moins d'un jour"
          : `Redémarré il y a ${d} jour${d > 1 ? "s" : ""}`,
    });
  }
  if (s.powerSaver === false) {
    passed.push({ id: "power-ok", label: "Mode d'alimentation normal" });
  }

  passed.push(...env.passed.filter((p) => !/windows|macos/.test(p.id)));

  return { ...s, kind, osLabel: env.osLabel, severity, findings, passed };
}

/** Texte brut → verdict, ou null si rien de reconnu. */
export function analyzeSystem(raw, opts) {
  const s = parseSystem(raw);
  return s ? diagnoseSystem(s, opts) : null;
}
