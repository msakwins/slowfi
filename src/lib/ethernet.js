// ─────────────────────────────────────────────────────────────────────────────
// Liaison Ethernet : la vitesse négociée entre la carte réseau et la box.
//
// Un câble abîmé, trop ancien (Cat 5) ou un connecteur mal serti fait souvent
// retomber le lien de 1 Gb/s à 100 Mb/s, sans message ni coupure : la ligne
// reste plafonnée à ~95 Mb/s, quelle que soit l'offre souscrite.
//
// Windows : Get-NetAdapter (Format-List). macOS : ifconfig, ligne « media ».
// ─────────────────────────────────────────────────────────────────────────────
import { parseBlocks, field } from "./powershell.js";
import { parseSysNet } from "./linux.js";

/** « 1 Gbps », « 100 Mbps », « 2.5 Gbps » → Mb/s. */
export function toMbps(text) {
  if (!text) return null;
  const m = String(text).match(/([\d.,]+)\s*([GMK])b(?:ps|it\/s|\/s)?/i);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return { G: 1000, M: 1, K: 0.001 }[m[2].toUpperCase()] * n;
}

const WIRELESS = /wi-?fi|wireless|wlan|802\.11|bluetooth|sans fil/i;

/**
 * Cartes Ethernet connectées, d'après :
 *   Get-NetAdapter -Physical | Format-List Name,InterfaceDescription,Status,LinkSpeed,FullDuplex
 * @param {string} raw
 */
export function parseNetAdapters(raw) {
  return parseBlocks(raw)
    .filter((f) => "LinkSpeed" in f)
    .map((f) => ({
      name: field(f, "Name"),
      description: field(f, "InterfaceDescription"),
      up: /^up$/i.test(field(f, "Status") || ""),
      speed: toMbps(field(f, "LinkSpeed")),
      fullDuplex:
        field(f, "FullDuplex") == null
          ? null
          : /true/i.test(field(f, "FullDuplex")),
    }))
    .filter((a) => !WIRELESS.test(`${a.name} ${a.description}`));
}

/**
 * Interfaces Ethernet actives d'un Mac, d'après `ifconfig` : la ligne
 * « media: autoselect (1000baseT <full-duplex>) » donne vitesse et duplex.
 * @param {string} raw
 */
export function parseIfconfig(raw) {
  const adapters = [];
  for (const block of raw.split(/\n(?=\S)/)) {
    const name = block.match(/^(\w+):/)?.[1];
    const media = block.match(
      /media:.*\((\d+(?:\.\d+)?)(G?)base-?T[^<)]*(?:<([^>]*)>)?/i,
    );
    if (!name || !media) continue;
    adapters.push({
      name,
      description: null,
      up: /status:\s*active/i.test(block),
      speed: Number(media[1]) * (media[2] ? 1000 : 1),
      fullDuplex: media[3] ? /full-duplex/i.test(media[3]) : null,
    });
  }
  return adapters;
}

/** Les deux formats, reconnus au contenu. */
export function parseEthernet(raw) {
  // Linux : /sys/class/net/<carte>/speed, duplex et operstate.
  if (/\/sys\/class\/net\//.test(raw)) return parseSysNet(raw);
  return /LinkSpeed\s*:/i.test(raw)
    ? parseNetAdapters(raw)
    : parseIfconfig(raw);
}

/**
 * @param {{ speed: number|null, fullDuplex: boolean|null }} link
 * @param {number|null|undefined} download débit mesuré par le test, en Mb/s
 */
export function diagnoseEthernet(link, download) {
  const findings = [];
  let severity = "ok";
  const bump = (level) => {
    const rank = { ok: 0, warning: 1, problem: 2 };
    if (rank[level] > rank[severity]) severity = level;
  };
  const speed = link.speed;
  const label =
    speed >= 1000
      ? `${String(speed / 1000).replace(".", ",")} Gb/s`
      : `${speed} Mb/s`;
  const labelEn = speed >= 1000 ? `${speed / 1000} Gb/s` : `${speed} Mb/s`;

  // Règle A — lien retombé à 100 Mb/s (ou 10). Le cas le plus courant.
  if (speed != null && speed <= 100) {
    bump("problem");
    findings.push({
      level: "problem",
      id: "ethernet-slow-link",
      vars: { speed: labelEn },
      title: `Liaison Ethernet limitée à ${label}`,
      detail:
        "La carte réseau et la box communiquent à 100 Mb/s au lieu de 1 000 : le débit ne dépasse pas 95 Mb/s environ, quelle que soit l'offre",
      fix: "Essayer un autre câble (Cat 5e ou Cat 6), enfoncé jusqu'au clic des deux côtés, puis un autre port de la box",
    });
  }

  // Règle B — semi-duplex : collisions, débit et latence dégradés.
  if (link.fullDuplex === false) {
    bump("warning");
    findings.push({
      level: "warning",
      id: "ethernet-half-duplex",
      title: "Liaison en semi-duplex",
      detail:
        "La carte ne peut pas envoyer et recevoir en même temps : débit réduit et latence irrégulière. Signe fréquent d'un câble ou d'un réglage forcé",
      fix: "Dans les propriétés de la carte réseau (Gestionnaire de périphériques › Avancé), régler « Vitesse et duplex » sur « Négociation automatique », puis changer de câble si rien ne change",
    });
  }

  // Règle C — le test atteint la vitesse du lien : c'est le câble qui plafonne
  // (ligne fibre plus rapide que le port Gigabit, par exemple).
  if (speed > 100 && download != null && download >= speed * 0.85) {
    bump("warning");
    findings.push({
      level: "warning",
      id: "ethernet-limits-line",
      vars: { speed: labelEn, measured: Math.round(download) },
      title: `Le débit mesuré atteint la vitesse du lien (${Math.round(download)} Mb/s sur ${label})`,
      detail:
        "La ligne peut sans doute aller plus vite que la liaison Ethernet : c'est elle qui plafonne",
      fix: "Pour dépasser cette vitesse, il faut une carte réseau et un port de box plus rapides (2,5 Gb/s ou plus)",
    });
  }

  if (findings.length === 0) {
    findings.push({
      id: "healthy",
      vars: { speed: labelEn },
      title: `Liaison Ethernet à ${label}`,
      detail: "Le câble et la carte réseau ne limitent pas le débit",
    });
  }

  return { ...link, severity, findings };
}

/**
 * Texte collé → verdict de la carte Ethernet active, ou null si aucune.
 * @param {string} raw
 * @param {number|null|undefined} download
 */
export function analyzeEthernet(raw, download) {
  const adapters = parseEthernet(raw).filter((a) => a.speed != null);
  const active = adapters.find((a) => a.up) ?? null;
  if (!active) return adapters.length > 0 ? { disconnected: true } : null;
  return diagnoseEthernet(active, download);
}
