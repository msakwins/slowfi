// ─────────────────────────────────────────────────────────────────────────────
// Recherche d'un pilote, commune au site (fonction Vercel), à l'application
// desktop et au serveur de développement : catalogue Windows Update, et site
// du fabricant quand il répond (NVIDIA).
// ─────────────────────────────────────────────────────────────────────────────
import { catalogLatest } from "./catalog.js";
import { nvidiaDevice, nvidiaLatest } from "./vendors.js";

/**
 * @param {string} id identifiant déjà réduit (isLookupKey)
 * @returns {Promise<{ id: string, latest: object|null, vendor: object|null }>}
 *   rejette seulement si aucune source n'a répondu
 */
export async function lookupDriver(id) {
  const device = nvidiaDevice(id);
  const [catalog, vendor] = await Promise.allSettled([
    catalogLatest(id),
    device ? nvidiaLatest(device) : Promise.resolve(null),
  ]);
  if (catalog.status === "rejected" && vendor.status === "rejected")
    throw catalog.reason;
  return {
    id,
    latest: catalog.status === "fulfilled" ? catalog.value : null,
    vendor: vendor.status === "fulfilled" ? vendor.value : null,
  };
}
