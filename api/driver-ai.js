// ─────────────────────────────────────────────────────────────────────────────
// GET /api/driver-ai?id=PCI\VEN_8086&DEV_A370&name=Intel(R) Wireless-AC 9560
//
// Dernière version d'un pilote AMD, Intel ou Realtek sur le site du fabricant,
// cherchée par Google Gemini (offre gratuite). Lancée seulement à la demande
// de la personne. La clé reste ici, dans les variables d'environnement de
// Vercel (GEMINI_API_KEY, et GEMINI_MODEL pour changer de modèle).
// ─────────────────────────────────────────────────────────────────────────────
import { handleAiRequest } from "../src/lib/aiDriver.js";

export default async function handler(req, res) {
  // Le site et l'application desktop (origine app://slowfi).
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    res.status(405).json({ error: "method" });
    return;
  }
  const { status, body, cache } = await handleAiRequest(req.query, process.env);
  res.setHeader("Cache-Control", cache);
  res.status(status).json(body);
}
