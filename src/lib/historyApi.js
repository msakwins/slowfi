// ─────────────────────────────────────────────────────────────────────────────
// /api/history — coffre chiffré de l'historique (voir vault.js).
//
//   GET    ?id=…            → { data }   (404 si rien)
//   PUT    { id, data }     → { ok }
//   DELETE ?id=…            → { ok }
//
// Le serveur ne voit qu'un identifiant et des données chiffrées. Stockage :
// Upstash Redis (API REST), variables posées par l'intégration Vercel :
// UPSTASH_REDIS_REST_URL / _TOKEN, ou KV_REST_API_URL / _TOKEN.
// ─────────────────────────────────────────────────────────────────────────────

const ID = /^[0-9a-f]{40}$/;
const MAX_BYTES = 400_000;
// Coffre gardé deux ans après la dernière écriture.
const TTL_SECONDS = 60 * 60 * 24 * 365 * 2;
// Écritures par adresse IP et par heure, contre le remplissage abusif.
const WRITES_PER_HOUR = 60;

/** Accès à Upstash, ou null si l'historique en ligne n'est pas configuré. */
export function redisFrom(env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return async (...command) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`redis ${response.status}`);
    return (await response.json()).result;
  };
}

/**
 * @param {{ method: string, query: object, body: any, ip: string }} req
 * @param {(...command: any[]) => Promise<any>} redis
 * @returns {Promise<{ status: number, body: object }>}
 */
export async function handleHistory({ method, query, body, ip }, redis) {
  if (!redis) return { status: 503, body: { error: "disabled" } };

  if (method === "GET" || method === "DELETE") {
    const id = String(query.id ?? "");
    if (!ID.test(id)) return { status: 400, body: { error: "id" } };
    if (method === "DELETE") {
      await redis("DEL", `hist:${id}`);
      return { status: 200, body: { ok: true } };
    }
    const data = await redis("GET", `hist:${id}`);
    return data
      ? { status: 200, body: { data } }
      : { status: 404, body: { error: "none" } };
  }

  if (method === "PUT") {
    const { id, data } = body ?? {};
    if (!ID.test(String(id ?? "")))
      return { status: 400, body: { error: "id" } };
    if (
      typeof data !== "string" ||
      !/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/.test(data)
    )
      return { status: 400, body: { error: "data" } };
    if (data.length > MAX_BYTES)
      return { status: 413, body: { error: "size" } };
    const bucket = `rl:${ip || "?"}:${Math.floor(Date.now() / 3_600_000)}`;
    const writes = await redis("INCR", bucket);
    if (writes === 1) await redis("EXPIRE", bucket, 3600);
    if (writes > WRITES_PER_HOUR)
      return { status: 429, body: { error: "rate" } };
    await redis("SET", `hist:${id}`, data, "EX", TTL_SECONDS);
    return { status: 200, body: { ok: true } };
  }

  return { status: 405, body: { error: "method" } };
}
