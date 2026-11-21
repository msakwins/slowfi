// ─────────────────────────────────────────────────────────────────────────────
// Sites des fabricants de pilotes.
//
// - NVIDIA : le service de son application (celui qui propose les mises à
//   jour) répond par identifiant de puce, avec la dernière version, sa date et
//   la page officielle du pilote.
// - AMD, Intel, Realtek : pas d'accès lisible par un programme (pages bloquées
//   ou construites dans le navigateur). La version vient alors du catalogue
//   Windows Update, avec un lien vers la page de pilotes du fabricant.
// ─────────────────────────────────────────────────────────────────────────────

const NVIDIA_LOOKUP =
  "https://gfwsl.geforce.com/nvidia_web_services/controller.gfeclientcontent.NG.php/com.nvidia.services.GFEClientContent_NG.getDispDrvrByDevid/";

/** Identifiant de puce NVIDIA (PCI\VEN_10DE&DEV_2182 → 2182), sinon null. */
export function nvidiaDevice(key) {
  return key?.match(/^PCI\\VEN_10DE&DEV_([0-9A-F]{4})$/)?.[1] ?? null;
}

/**
 * Version Windows d'un pilote NVIDIA → numéro affiché par NVIDIA :
 * 32.0.16.2124 → 621.24 (les cinq derniers chiffres).
 */
export function nvidiaVersion(windowsVersion) {
  const parts = String(windowsVersion).split(".");
  if (parts.length < 4) return null;
  const digits = `${parts[2].slice(-1)}${parts[3].padStart(4, "0")}`;
  return `${digits.slice(0, 3)}.${digits.slice(3)}`;
}

/**
 * Dernier pilote NVIDIA pour une puce, d'après le service de NVIDIA.
 * @param {string} device  identifiant de puce (« 2182 »)
 * @returns {Promise<{ source: "nvidia", name: string, version: string, date: string|null, url: string|null } | null>}
 */
export async function nvidiaLatest(device) {
  const query = {
    dIDa: [`${device}_10DE`],
    osC: "10.0",
    osB: "19041",
    is6: "1",
    lg: "1033",
    iLp: "0",
    prvMd: "0",
    gcV: "3.28.0.417",
    gIsB: "0",
    dch: "1",
    upCRD: "0",
    isCRD: "0",
  };
  const response = await fetch(
    NVIDIA_LOOKUP + encodeURIComponent(JSON.stringify(query)),
    {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Slowfi)" },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) throw new Error(`nvidia ${response.status}`);
  const a = (await response.json())?.DriverAttributes;
  if (!a?.Version) return null;
  return {
    source: "nvidia",
    name: a.Name ?? "GeForce",
    version: a.Version,
    date: a.ReleaseDateTime?.slice(0, 10) ?? null,
    url: a.DetailsURL ?? null,
  };
}

// Pages de pilotes, par fabricant (identifiant PCI ou USB) et par classe.
const INTEL_PAGES = {
  wifi: "https://www.intel.com/content/www/us/en/download/19351/windows-10-and-windows-11-wi-fi-drivers-for-intel-wireless-adapters.html",
  bluetooth:
    "https://www.intel.com/content/www/us/en/download/18649/intel-wireless-bluetooth-drivers-for-windows-10-and-windows-11.html",
  ethernet:
    "https://www.intel.com/content/www/us/en/download/18293/intel-network-adapter-driver-for-windows-10.html",
  graphics:
    "https://www.intel.com/content/www/us/en/download/785597/intel-arc-iris-xe-graphics-windows.html",
};

/**
 * Page du fabricant où trouver le pilote d'un composant, ou null.
 * @param {{ key: string, cls: string, name: string }} driver
 */
export function vendorPage({ key, cls, name }) {
  const vendor = key.match(/(?:VEN|VID)_([0-9A-F]{4})/)?.[1];
  if (vendor === "10DE") return "https://www.nvidia.com/drivers";
  if (vendor === "1002" || vendor === "1022")
    return "https://www.amd.com/en/support/download/drivers.html";
  if (vendor === "10EC")
    return "https://www.realtek.com/Download/List?cate_id=593";
  if (vendor === "8086" || vendor === "8087") {
    if (cls === "BLUETOOTH") return INTEL_PAGES.bluetooth;
    if (cls === "DISPLAY") return INTEL_PAGES.graphics;
    if (cls === "NET")
      return /wi-?fi|wireless/i.test(name)
        ? INTEL_PAGES.wifi
        : INTEL_PAGES.ethernet;
  }
  return null;
}

// ── AMD ──────────────────────────────────────────────────────────────────────
// Les pages de pilotes d'AMD se construisent dans le navigateur, illisibles
// pour un programme. La page des notes de version, elle, contient le lien de
// l'installateur le plus récent, avec la version et la date dans son nom :
//   amd-software-adrenalin-edition-26.11.2-minimalsetup-261118_web.exe
// La version d'AMD (26.11.2) ne se rattache pas au numéro de pilote Windows
// (32.0.xxxxx) : pas de verdict, seulement la dernière version et sa date.

const AMD_NOTES = "https://www.amd.com/en/support/kb/release-notes";
export const AMD_DRIVERS =
  "https://www.amd.com/en/support/download/drivers.html";

/** Dernière version d'AMD Software dans le code de la page, ou null. */
export function parseAmdNotes(html) {
  const m = html.match(
    /adrenalin-edition-(\d{2}\.\d{1,2}\.\d{1,2})-minimalsetup-(\d{2})(\d{2})(\d{2})/i,
  );
  if (!m) return null;
  return {
    source: "amd",
    name: "AMD Software: Adrenalin Edition",
    version: m[1],
    date: `20${m[2]}-${m[3]}-${m[4]}`,
    url: AMD_DRIVERS,
  };
}

/** Puce graphique AMD (PCI\VEN_1002), sinon false. */
export function isAmdGpu(key) {
  return /^PCI\\VEN_1002&DEV_[0-9A-F]{4}$/.test(key ?? "");
}

export async function amdLatest() {
  const response = await fetch(AMD_NOTES, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`amd ${response.status}`);
  return parseAmdNotes(await response.text());
}
