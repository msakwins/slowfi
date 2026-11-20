import { describe, it, expect, vi, afterEach } from "vitest";
import { toMbps, deadline, measureLatency } from "./speedtest.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("toMbps", () => {
  it("convertit octets/durée en mégabits par seconde", () => {
    // 1 000 000 octets en 1 s = 8 Mb/s
    expect(toMbps(1e6, 1000)).toBeCloseTo(8, 5);
  });

  it("renvoie 0 pour une durée nulle", () => {
    expect(toMbps(1e6, 0)).toBe(0);
  });
});

// Le cœur subtil du module : sans échéance ferme, un flux qui se fige bloque
// reader.read() pour toujours. On vérifie les trois sorties possibles.
describe("deadline", () => {
  it("abandonne tout seul une fois le délai écoulé", () => {
    vi.useFakeTimers();
    const d = deadline(1000);

    expect(d.signal.aborted).toBe(false);
    vi.advanceTimersByTime(1000);

    expect(d.signal.aborted).toBe(true);
    expect(d.timedOut()).toBe(true); // fin normale, pas une annulation
    d.cleanup();
  });

  it("abandonne quand le signal externe se déclenche, sans marquer timedOut", () => {
    vi.useFakeTimers();
    const external = new AbortController();
    const d = deadline(1000, external.signal);

    external.abort();

    expect(d.signal.aborted).toBe(true);
    expect(d.timedOut()).toBe(false); // vraie annulation utilisateur
    d.cleanup();
  });

  it("abandonne immédiatement si le signal externe est déjà annulé", () => {
    const external = new AbortController();
    external.abort();

    const d = deadline(1000, external.signal);

    expect(d.signal.aborted).toBe(true);
    expect(d.timedOut()).toBe(false);
    d.cleanup();
  });

  it("cleanup() désarme le minuteur", () => {
    vi.useFakeTimers();
    const d = deadline(1000);

    d.cleanup();
    vi.advanceTimersByTime(5000);

    expect(d.signal.aborted).toBe(false);
    expect(d.timedOut()).toBe(false);
  });

  it("se détache du signal externe au cleanup", () => {
    vi.useFakeTimers();
    const external = new AbortController();
    const d = deadline(1000, external.signal);

    d.cleanup();
    external.abort();

    expect(d.signal.aborted).toBe(false);
  });
});

describe("measureLatency", () => {
  // performance.now() est consulté deux fois par échantillon (avant/après le
  // fetch). On pilote la séquence pour obtenir des allers-retours connus.
  const mockNow = (values) => {
    let i = 0;
    vi.spyOn(performance, "now").mockImplementation(
      () => values[i++] ?? values.at(-1),
    );
  };

  it("retient le minimum comme latence et la dispersion comme gigue", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    // Allers-retours : 10 ms, 30 ms, 20 ms.
    mockNow([0, 10, 100, 130, 200, 220]);

    const { latency, jitter } = await measureLatency(3);

    expect(latency).toBe(10); // plancher réseau, pas la médiane
    // médiane = 20 ; écart absolu moyen = (10 + 0 + 10) / 3 = 6,67 → 7
    expect(jitter).toBe(7);
  });

  it("échauffe la connexion sans compter la requête de warmup", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    mockNow([0, 5, 100, 105]);

    await measureLatency(2);

    // 1 warmup + 2 échantillons
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain("warmup=1");
  });

  it("transmet le signal d'abandon à chaque requête", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    mockNow([0, 5]);
    const ctrl = new AbortController();

    await measureLatency(1, { signal: ctrl.signal });

    for (const [, init] of fetchMock.mock.calls) {
      expect(init.signal).toBe(ctrl.signal);
    }
  });
});
