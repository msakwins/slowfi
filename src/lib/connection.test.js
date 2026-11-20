import { describe, it, expect } from "vitest";
import { gradeConnection } from "./connection.js";

describe("gradeConnection", () => {
  it("classe une connexion rapide et réactive comme excellente", () => {
    const r = gradeConnection({
      download: 300,
      upload: 200,
      latency: 15,
      jitter: 5,
    });
    expect(r.severity).toBe("ok");
    expect(r.grade).toBe("excellent");
    expect(r.findings[0].id).toBe("healthy");
    expect(r.findings[0].title).toBe("Connexion excellente");
  });

  it("classe une connexion sans défaut mais sans marge comme bonne", () => {
    const r = gradeConnection({
      download: 30,
      upload: 10,
      latency: 90,
      jitter: 20,
    });
    expect(r.severity).toBe("ok");
    expect(r.grade).toBe("good");
    expect(r.findings[0].title).toBe("Bonne connexion");
  });

  it("refuse le palier excellent dès qu'un seul chiffre manque de marge", () => {
    const base = { download: 300, upload: 200, latency: 15, jitter: 5 };
    expect(gradeConnection({ ...base, download: 99 }).grade).toBe("good");
    expect(gradeConnection({ ...base, upload: 19 }).grade).toBe("good");
    expect(gradeConnection({ ...base, latency: 41 }).grade).toBe("good");
    expect(gradeConnection({ ...base, jitter: 31 }).grade).toBe("good");
  });

  it("donne un palier à chaque niveau de gravité", () => {
    expect(
      gradeConnection({ download: 18, upload: 10, latency: 20, jitter: 5 })
        .grade,
    ).toBe("fair");
    expect(
      gradeConnection({ download: 6, upload: 5, latency: 20, jitter: 5 }).grade,
    ).toBe("poor");
  });

  it("marque un débit descendant très faible comme problème", () => {
    const r = gradeConnection({
      download: 6,
      upload: 5,
      latency: 20,
      jitter: 5,
    });
    expect(r.severity).toBe("problem");
    expect(r.findings.some((f) => f.id === "down-very-low")).toBe(true);
  });

  it("signale un débit modeste sans crier au problème", () => {
    const r = gradeConnection({
      download: 18,
      upload: 10,
      latency: 20,
      jitter: 5,
    });
    expect(r.severity).toBe("warning");
    expect(r.findings.some((f) => f.id === "down-low")).toBe(true);
  });

  it("escalade une latence extrême en problème", () => {
    const r = gradeConnection({
      download: 300,
      upload: 200,
      latency: 250,
      jitter: 5,
    });
    expect(r.severity).toBe("problem");
    expect(r.findings.some((f) => f.id === "high-latency")).toBe(true);
  });

  it("détecte une gigue élevée", () => {
    const r = gradeConnection({
      download: 300,
      upload: 200,
      latency: 30,
      jitter: 80,
    });
    expect(r.findings.some((f) => f.id === "high-jitter")).toBe(true);
  });
});
