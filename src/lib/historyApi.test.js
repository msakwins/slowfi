import { describe, it, expect } from "vitest";
import { handleHistory, redisFrom } from "./historyApi.js";

/** Redis en mémoire, pour les tests. */
function fakeRedis() {
  const store = new Map();
  const calls = [];
  const redis = async (cmd, key, ...rest) => {
    calls.push([cmd, key, ...rest]);
    if (cmd === "GET") return store.get(key) ?? null;
    if (cmd === "SET") return store.set(key, rest[0]) && "OK";
    if (cmd === "DEL") return store.delete(key) ? 1 : 0;
    if (cmd === "INCR") {
      const n = (store.get(key) ?? 0) + 1;
      store.set(key, n);
      return n;
    }
    if (cmd === "EXPIRE") return 1;
    return null;
  };
  return { redis, store, calls };
}

const id = "a".repeat(40);
const req = (over) => ({
  method: "GET",
  query: {},
  body: null,
  ip: "1.2.3.4",
  ...over,
});

describe("coffre en ligne", () => {
  it("désactivé sans configuration Upstash", async () => {
    expect(redisFrom({})).toBeNull();
    expect((await handleHistory(req({ query: { id } }), null)).status).toBe(
      503,
    );
  });

  it("range, relit et efface des données chiffrées", async () => {
    const { redis, calls } = fakeRedis();
    expect((await handleHistory(req({ query: { id } }), redis)).status).toBe(
      404,
    );
    const put = await handleHistory(
      req({ method: "PUT", body: { id, data: "aXY=.ZGF0YQ==" } }),
      redis,
    );
    expect(put.status).toBe(200);
    expect(calls.find((c) => c[0] === "SET")).toContain("EX");
    expect(await handleHistory(req({ query: { id } }), redis)).toEqual({
      status: 200,
      body: { data: "aXY=.ZGF0YQ==" },
    });
    await handleHistory(req({ method: "DELETE", query: { id } }), redis);
    expect((await handleHistory(req({ query: { id } }), redis)).status).toBe(
      404,
    );
  });

  it("refuse les identifiants et données mal formés", async () => {
    const { redis } = fakeRedis();
    expect(
      (await handleHistory(req({ query: { id: "x" } }), redis)).status,
    ).toBe(400);
    expect(
      (
        await handleHistory(
          req({ method: "PUT", body: { id, data: "{json}" } }),
          redis,
        )
      ).status,
    ).toBe(400);
  });

  it("limite les écritures par heure", async () => {
    const { redis } = fakeRedis();
    let last;
    for (let i = 0; i < 61; i++)
      last = await handleHistory(
        req({ method: "PUT", body: { id, data: "aXY=.ZGF0YQ==" } }),
        redis,
      );
    expect(last.status).toBe(429);
  });
});
