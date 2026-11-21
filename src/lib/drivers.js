// ─────────────────────────────────────────────────────────────────────────────
// Pilotes installés (Windows) et comparaison avec la dernière version
// distribuée par Windows Update.
// ─────────────────────────────────────────────────────────────────────────────
import { parseBlocks, field, monthOf } from "./powershell.js";
import { lookupKey, compareVersions } from "./catalog.js";
import { nvidiaVersion, vendorPage } from "./vendors.js";

// Classes de périphériques lues par la commande.
export const DRIVER_CLASSES = [
  "DISPLAY",
  "NET",
  "MEDIA",
  "BLUETOOTH",
  "SCSIADAPTER",
  "HDC",
];

// Pilotes génériques de Microsoft ou virtuels : rien à chercher ailleurs.
const NOISE =
  /wan miniport|virtual|hyper-v|kernel debug|tap-|vpn|loopback|wi-fi direct|microsoft|standard sata|standard nvm express|remote desktop|vmware|virtualbox/i;

/**
 * Pilotes à vérifier : un par composant physique, avec son identifiant de
 * recherche.
 * @param {string} raw
 * @returns {{ cls: string, name: string, version: string, date: {year:number, month:number}|null, key: string }[]}
 */
export function parseInstalledDrivers(raw) {
  const seen = new Set();
  const drivers = [];
  for (const f of parseBlocks(raw)) {
    if (!("HardWareID" in f) || !("DeviceName" in f)) continue;
    const key = lookupKey(field(f, "HardWareID"));
    const name = field(f, "DeviceName");
    const version = field(f, "DriverVersion");
    if (!key || !name || !version || NOISE.test(name) || seen.has(key))
      continue;
    seen.add(key);
    drivers.push({
      cls: (field(f, "DeviceClass") ?? "").toUpperCase(),
      name,
      version,
      date: monthOf(field(f, "DriverDate")),
      key,
    });
  }
  return drivers;
}

/**
 * État d'un pilote face au catalogue.
 * - "update" : Windows Update propose une version plus récente
 * - "current" : la version installée est la même, ou plus récente
 * - "unknown" : rien dans le catalogue pour ce composant
 * @param {{ version: string }} installed
 * @param {{ version: string } | null} latest
 */
export function driverStatus(installed, latest) {
  if (!latest) return "unknown";
  return compareVersions(installed.version, latest.version) < 0
    ? "update"
    : "current";
}

/**
 * Verdict d'un pilote, avec la source la plus à jour : le site du fabricant
 * quand il a répondu (NVIDIA), sinon le catalogue Windows Update.
 * @param {{ version: string, key: string, cls: string, name: string }} installed
 * @param {{ latest: { version: string, date: string|null }|null, vendor: { version: string, date: string|null, url: string|null }|null }} found
 * @returns {{ status: "update"|"current"|"unknown"|"info", version: string|null, date: string|null, source: "nvidia"|"amd"|"windows-update"|null, url: string|null }}
 */
export function driverState(installed, found) {
  // AMD : dernière version affichée, sans verdict (voir vendors.js).
  if (found.vendor?.source === "amd") {
    return {
      status: "info",
      version: found.vendor.version,
      date: found.vendor.date,
      source: "amd",
      url: found.vendor.url,
    };
  }
  if (found.vendor?.source === "nvidia") {
    const mine = nvidiaVersion(installed.version);
    const status =
      mine && compareVersions(mine, found.vendor.version) < 0
        ? "update"
        : "current";
    return {
      status,
      version: found.vendor.version,
      date: found.vendor.date,
      source: "nvidia",
      url: found.vendor.url ?? vendorPage(installed),
    };
  }
  const status = driverStatus(installed, found.latest);
  return {
    status,
    version: found.latest?.version ?? null,
    date: found.latest?.date ?? null,
    source: found.latest ? "windows-update" : null,
    url: vendorPage(installed),
  };
}

/**
 * Version annoncée par la page, sous la forme la plus sûre. Quand Gemini
 * donne une version de pilote qui prolonge le numéro du pack (24.80.0.2 pour
 * le pack 24.80.0), seul le numéro du pack est gardé : la page l'affiche, le
 * dernier nombre peut avoir été complété par l'IA.
 */
function aiVersion(ai) {
  const { driverVersion: d, packageVersion: p } = ai;
  if (d && p && d.startsWith(`${p}.`)) return p;
  return d ?? (p && /^\d+(\.\d+)+$/.test(p) ? p : null);
}

/** Compare la version installée, ramenée au même nombre de parties. */
function compareTruncated(installed, other) {
  const parts = other.split(".").length;
  return compareVersions(installed.split(".").slice(0, parts).join("."), other);
}

/**
 * Verdict complété par la lecture IA de la page du fabricant. La version
 * trouvée ne compte que si elle a la même forme que la version installée
 * (pas plus de parties, premier nombre proche) : un numéro de pack
 * (Adrenalin 25.11.1, Intel 31.3) ne se compare pas à une version de pilote.
 * @param {ReturnType<typeof driverState>} state
 * @param {{ version: string }} installed
 * @param {{ driverVersion: string|null, packageName: string|null, packageVersion: string|null, date: string|null, url: string } | null} ai
 */
export function withAi(state, installed, ai) {
  if (!ai) return state;
  const version = aiVersion(ai);
  const mine = installed.version.split(".");
  const theirs = version?.split(".") ?? [];
  const comparable =
    theirs.length >= 2 &&
    theirs.length <= mine.length &&
    Math.abs(Number(theirs[0]) - Number(mine[0])) <= 2;
  if (!comparable) {
    // Pas de verdict : le pack est seulement signalé, avec sa page.
    return { ...state, url: ai.url, aiPackage: ai };
  }
  const newerThanState =
    !state.version ||
    state.source === "nvidia" ||
    compareTruncated(state.version, version) < 0;
  if (!newerThanState) return { ...state, url: ai.url, aiConfirmed: ai };
  return {
    status:
      compareTruncated(installed.version, version) < 0 ? "update" : "current",
    version,
    date: ai.date,
    source: "ai",
    url: ai.url,
  };
}
