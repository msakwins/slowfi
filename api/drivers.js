// ─────────────────────────────────────────────────────────────────────────────
// GET /api/drivers?id=PCI\VEN_10DE&DEV_2182
//
// Dernier pilote distribué par Windows Update pour un composant, lu dans le
// catalogue Microsoft Update, et sur le site du fabricant quand il répond. Le navigateur ne peut pas interroger le
// catalogue lui-même (pas d'en-têtes CORS) : cette fonction s'en charge.
//
// Rien n'est enregistré. La réponse dépend seulement de l'identifiant du
// composant, jamais de la personne : le CDN de Vercel la garde un jour, et
// une même carte n'est cherchée qu'une fois par jour pour tout le monde.
// ─────────────────────────────────────────────────────────────────────────────
import { isLookupKey } from "../src/lib/catalog.js";
import { lookupDriver } from "../src/lib/driverLookup.js";

const DAY = 60 * 60 * 24;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method" });
    return;
  }
  const id = String(req.query.id ?? "").toUpperCase();
  if (!isLookupKey(id)) {
    res.status(400).json({ error: "id" });
    return;
  }
  try {
    const found = await lookupDriver(id);
    res.setHeader(
      "Cache-Control",
      `public, s-maxage=${DAY}, stale-while-revalidate=${DAY}`,
    );
    res.status(200).json(found);
  } catch {
    // Catalogue indisponible : courte mise en cache, pour réessayer bientôt.
    res.setHeader("Cache-Control", "public, s-maxage=300");
    res.status(502).json({ id, error: "catalog" });
  }
}
