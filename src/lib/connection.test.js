import { describe, it, expect } from "vitest";
import { toMbps } from "./speedtest.js";
import { gradeConnection } from "./connection.js";

describe("toMbps", () => {
  it("convertit octets/durée en mégabits par seconde", () => {
    // 1 000 000 octets en 1 s = 8 Mb/s
    expect(toMbps(1e6, 1000)).toBeCloseTo(8, 5);
  });
  it("renvoie 0 pour une durée nulle", () => {
    expect(toMbps(1e6, 0)).toBe(0);
  });
});

describe("gradeConnection", () => {
  it("valide une bonne connexion", () => {
    const r = gradeConnection({ download: 300, upload: 200, latency: 15, jitter: 5 });
    expect(r.severity).toBe("ok");
    expect(r.findings[0].id).toBe("healthy");
  });

  it("marque un débit descendant très faible comme problème", () => {
    const r = gradeConnection({ download: 6, upload: 5, latency: 20, jitter: 5 });
    expect(r.severity).toBe("problem");
    expect(r.findings.some((f) => f.id === "down-very-low")).toBe(true);
  });

  it("signale un débit modeste sans crier au problème", () => {
    const r = gradeConnection({ download: 18, upload: 10, latency: 20, jitter: 5 });
    expect(r.severity).toBe("warning");
    expect(r.findings.some((f) => f.id === "down-low")).toBe(true);
  });

  it("escalade une latence extrême en problème", () => {
    const r = gradeConnection({ download: 300, upload: 200, latency: 250, jitter: 5 });
    expect(r.severity).toBe("problem");
    expect(r.findings.some((f) => f.id === "high-latency")).toBe(true);
  });

  it("détecte une gigue élevée", () => {
    const r = gradeConnection({ download: 300, upload: 200, latency: 30, jitter: 80 });
    expect(r.findings.some((f) => f.id === "high-jitter")).toBe(true);
  });
});
