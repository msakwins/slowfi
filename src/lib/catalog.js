// ─────────────────────────────────────────────────────────────────────────────
// Catalogue Microsoft Update : la version de pilote la plus récente que
// Windows Update distribue pour un composant, cherchée par son identifiant
// matériel (PCI\VEN_10DE&DEV_2182…).
//
// Gratuit et commun à tous les fabricants. La page de résultats liste les
// pilotes du plus récent au plus ancien : la première page suffit.
// Les fabricants de cartes graphiques publient souvent plus vite sur leur
// propre site : le catalogue donne alors un plancher, pas la dernière version.
// ─────────────────────────────────────────────────────────────────────────────

export const CATALOG_SEARCH =
  "https://www.catalog.update.microsoft.com/Search.aspx?q=";

/**
 * Identifiant de recherche : fabricant et modèle seulement, sans la variante
 * propre au constructeur du PC (SUBSYS) ni la révision. Null pour les
 * périphériques logiciels, absents du catalogue.
 * @param {string|null|undefined} hardwareId
 */
export function lookupKey(hardwareId) {
  if (!hardwareId) return null;
  const id = hardwareId.trim().toUpperCase();
  const pci = id.match(/^PCI\\VEN_[0-9A-F]{4}&DEV_[0-9A-F]{4}/);
  if (pci) return pci[0];
  const usb = id.match(/^USB\\VID_[0-9A-F]{4}&PID_[0-9A-F]{4}/);
  if (usb) return usb[0];
  const audio = id.match(
    /^HDAUDIO\\FUNC_[0-9A-F]{2}&VEN_[0-9A-F]{4}&DEV_[0-9A-F]{4}/,
  );
  if (audio) return audio[0];
  return null;
}

/** Identifiant de recherche valide, tel qu'accepté par l'API. */
export function isLookupKey(key) {
  return typeof key === "string" && lookupKey(key) === key;
}

/** Compare deux versions « 32.0.15.6094 » : négatif si a < b. */
export function compareVersions(a, b) {
  const pa = String(a)
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  const pb = String(b)
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

const text = (html) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/** Date américaine du catalogue (7/21/2026) → « 2026-07-21 ». */
function isoDate(us) {
  const m = us.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

/**
 * Lignes de la page de résultats du catalogue.
 * @param {string} html
 * @returns {{ title: string, classification: string, date: string|null, version: string }[]}
 */
export function parseCatalog(html) {
  const rows = [];
  const re =
    /id="[0-9a-f-]+_C1_R\d+">([\s\S]*?)<\/td>[\s\S]*?_C3_R\d+">([\s\S]*?)<\/td>[\s\S]*?_C4_R\d+">\s*([\d/]+)[\s\S]*?_C5_R\d+">\s*([^<\s]+)/g;
  for (const m of html.matchAll(re)) {
    rows.push({
      title: text(m[1]),
      classification: text(m[2]),
      date: isoDate(m[3]),
      version: m[4].trim(),
    });
  }
  return rows;
}

/** Le pilote le plus récent parmi les résultats (version la plus haute). */
export function latestDriver(rows) {
  const drivers = rows.filter((r) => /^\d+(\.\d+)+$/.test(r.version));
  if (drivers.length === 0) return null;
  return drivers.reduce((best, r) =>
    compareVersions(r.version, best.version) > 0 ? r : best,
  );
}

/**
 * Dernier pilote du catalogue pour un identifiant déjà réduit. Sert à la
 * fonction Vercel (site), à l'application desktop et au serveur de dev.
 * @param {string} id
 */
export async function catalogLatest(id) {
  const response = await fetch(
    `${CATALOG_SEARCH}${encodeURIComponent(`"${id}"`)}`,
    {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Slowfi)" },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) throw new Error(`catalog ${response.status}`);
  return latestDriver(parseCatalog(await response.text()));
}
