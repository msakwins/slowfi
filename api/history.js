// ─────────────────────────────────────────────────────────────────────────────
// /api/history — coffre chiffré de l'historique des analyses
// (src/lib/historyApi.js). Le site et l'application desktop l'appellent.
// ─────────────────────────────────────────────────────────────────────────────
import { handleHistory, redisFrom } from "../src/lib/historyApi.js";

export default async function handler(req, res) {
  // L'application desktop (origine app://slowfi) l'appelle aussi.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  try {
    const { status, body } = await handleHistory(
      {
        method: req.method,
        query: req.query,
        body: req.body,
        ip: String(req.headers["x-forwarded-for"] ?? "")
          .split(",")[0]
          .trim(),
      },
      redisFrom(process.env),
    );
    res.status(status).json(body);
  } catch {
    res.status(502).json({ error: "storage" });
  }
}
