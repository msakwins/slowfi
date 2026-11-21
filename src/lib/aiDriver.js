// ─────────────────────────────────────────────────────────────────────────────
// Lecture assistée par IA (Google Gemini, offre gratuite) de la page de
// pilotes du fabricant, pour ceux dont le site ne se laisse pas lire par un
// programme : AMD, Intel, Realtek.
//
// La recherche Google n'est pas dans l'offre gratuite. Gemini lit donc la page
// de pilotes connue pour ce composant (vendors.js), puis répond en JSON. La
// réponse n'est gardée que si elle tient debout : un numéro de version, et une
// page du fabricant que Gemini a réellement pu lire. Sinon, rien.
// ─────────────────────────────────────────────────────────────────────────────
import { lookupKey } from "./catalog.js";
import { vendorPage } from "./vendors.js";

const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/interactions";
// Modèle léger, disponible dans l'offre gratuite (GEMINI_MODEL pour changer).
export const DEFAULT_MODEL = "gemini-3.5-flash-lite";

// Classes de périphériques acceptées (mêmes que drivers.js).
const CLASSES = ["DISPLAY", "NET", "MEDIA", "BLUETOOTH", "SCSIADAPTER", "HDC"];

/** Fabricants couverts, d'après l'identifiant PCI ou USB. */
const VENDORS = {
  1002: { name: "AMD", domains: ["amd.com"] },
  1022: { name: "AMD", domains: ["amd.com"] },
  8086: { name: "Intel", domains: ["intel.com"] },
  8087: { name: "Intel", domains: ["intel.com"] },
  "10EC": { name: "Realtek", domains: ["realtek.com"] },
};

/** Fabricant couvert par la recherche IA, ou null. */
export function aiVendor(key) {
  const id = key?.match(/(?:VEN|VID)_([0-9A-F]{4})/)?.[1];
  return (id && VENDORS[id]) || null;
}

/** Composant que l'IA peut vérifier : fabricant couvert et page connue. */
export function aiEligible(driver) {
  return Boolean(aiVendor(driver.key) && vendorPage(driver));
}

/** Nom de composant acceptable : court, sans caractères de contrôle. */
export function cleanName(name) {
  const n = String(name ?? "")
    .replace(/[\u0000-\u001f<>{}`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return n.length >= 3 && n.length <= 120 ? n : null;
}

/** Consigne envoyée à Gemini. */
export function buildPrompt({ name, key, vendor, page }) {
  return [
    `Read this ${vendor.name} driver download page: ${page}`,
    "",
    "It is the manufacturer's driver page for this device. Give the latest Windows 10/11 driver it lists:",
    `- Name: ${name}`,
    `- Hardware ID: ${key}`,
    "",
    "Use only what the page says. Answer with one JSON object and nothing else:",
    '{"driverVersion": "...", "packageName": "...", "packageVersion": "...", "releaseDate": "YYYY-MM-DD", "url": "..."}',
    "- driverVersion: the Windows driver version as shown in Device Manager (for example 32.0.21036.18 or 23.150.0.4), or null if the page does not state it",
    "- packageName / packageVersion: the download package and its version (for example AMD Software: Adrenalin Edition 25.11.1)",
    "- url: the page you read",
    'If the page lists no version at all, answer {"driverVersion": null, "packageName": null, "packageVersion": null, "releaseDate": null, "url": null}.',
  ].join("\n");
}

const VERSION = /^\d+(\.\d+){1,4}$/;

/** Premier objet JSON trouvé dans un texte (Gemini l'entoure parfois de ```). */
function firstJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

const onDomain = (url, domains) => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
};

/**
 * Réponse de Gemini → résultat vérifié, ou null.
 * @param {string} text texte de la réponse
 * @param {string[]} read pages que Gemini a réellement lues (ou citées)
 * @param {{ domains: string[] }} vendor
 */
export function parseAnswer(text, read, vendor) {
  const a = firstJson(text);
  if (!a) return null;
  const driverVersion =
    typeof a.driverVersion === "string" && VERSION.test(a.driverVersion.trim())
      ? a.driverVersion.trim()
      : null;
  const packageVersion =
    typeof a.packageVersion === "string" && /\d/.test(a.packageVersion)
      ? a.packageVersion.trim().slice(0, 40)
      : null;
  if (!driverVersion && !packageVersion) return null;
  // Une page du fabricant doit avoir été lue : sinon, la réponse ne vient pas
  // de la page.
  const pages = read.filter((u) => onDomain(u, vendor.domains));
  if (pages.length === 0) return null;
  const url = pages.includes(a.url) ? a.url : pages[0];
  const date =
    typeof a.releaseDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(a.releaseDate)
      ? a.releaseDate
      : null;
  return {
    source: "ai",
    driverVersion,
    packageName:
      typeof a.packageName === "string" ? a.packageName.slice(0, 80) : null,
    packageVersion,
    date,
    url,
  };
}

/** Texte et pages lues (ou citées) d'une réponse de l'API Interactions. */
export function readInteraction(body) {
  const texts = [];
  const read = [];
  for (const step of body?.steps ?? []) {
    if (step.type === "url_context_result") {
      for (const r of step.result ?? [])
        if (r.status === "success" && r.url) read.push(r.url);
      continue;
    }
    if (step.type !== "model_output") continue;
    for (const c of step.content ?? []) {
      if (c.type !== "text" || typeof c.text !== "string") continue;
      texts.push(c.text);
      for (const a of c.annotations ?? [])
        if (a.type === "url_citation" && a.url) read.push(a.url);
    }
  }
  return { text: texts.join("\n"), read };
}

/**
 * Demande à Gemini la dernière version d'un pilote, lue sur la page du
 * fabricant.
 * @param {{ name: string, key: string, cls: string }} device
 * @param {{ apiKey: string, model?: string }} options
 */
export async function aiLookup({ name, key, cls }, { apiKey, model }) {
  const vendor = aiVendor(key);
  const page = vendorPage({ key, cls, name });
  if (!vendor || !page) return null;
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      input: buildPrompt({ name, key, vendor, page }),
      tools: [{ type: "url_context" }],
      store: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const error = new Error(`gemini ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const { text, read } = readInteraction(await response.json());
  return parseAnswer(text, read, vendor);
}

const WEEK = 60 * 60 * 24 * 7;

/**
 * /api/driver-ai?id=…&name=…&cls=… — commun à la fonction Vercel et au
 * serveur de développement. La clé Gemini reste côté serveur (GEMINI_API_KEY).
 * @returns {Promise<{ status: number, body: object, cache: string }>}
 */
export async function handleAiRequest(query, env) {
  const id = String(query.id ?? "").toUpperCase();
  const name = cleanName(query.name);
  const cls = String(query.cls ?? "").toUpperCase();
  const noCache = "no-store";
  if (
    lookupKey(id) !== id ||
    !aiVendor(id) ||
    !name ||
    !CLASSES.includes(cls) ||
    !vendorPage({ key: id, cls, name })
  )
    return { status: 400, body: { error: "input" }, cache: noCache };
  if (!env.GEMINI_API_KEY)
    return { status: 503, body: { error: "disabled" }, cache: noCache };
  try {
    const found = await aiLookup(
      { name, key: id, cls },
      { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL },
    );
    // Même réponse pour tout le monde : le CDN la garde une semaine.
    return {
      status: 200,
      body: { id, found },
      cache: `public, s-maxage=${WEEK}, stale-while-revalidate=${WEEK}`,
    };
  } catch (error) {
    // Quota gratuit épuisé (429) ou modèle surchargé (503) : plus tard.
    const quota = error.status === 429;
    return {
      status: quota ? 429 : 502,
      body: { id, error: quota ? "quota" : "ai" },
      cache: "public, s-maxage=600",
    };
  }
}
