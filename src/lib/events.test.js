import { describe, it, expect } from "vitest";
import { parseEventDate, parseEvents, analyzeEvents } from "./events.js";

// Relevé réel (PC fixe, GTX 1660 Ti) : un plantage du pilote le 29 octobre
// (neuf lignes en six secondes), suivi d'un arrêt brutal ; puis trois
// erreurs isolées du pilote.
const RAW = `"TimeCreated","ProviderName","Id"
"17/11/2026 21:49:54","nvlddmkm","14"
"07/11/2026 18:41:08","nvlddmkm","14"
"29/10/2026 21:48:20","Microsoft-Windows-Kernel-Power","41"
"29/10/2026 21:47:16","nvlddmkm","153"
"29/10/2026 21:47:16","nvlddmkm","153"
"29/10/2026 21:47:13","nvlddmkm","153"
"29/10/2026 21:47:11","Display","4101"
"29/10/2026 21:47:10","nvlddmkm","153"
"12/10/2026 18:25:45","nvlddmkm","14"
`;

describe("historique Windows", () => {
  it("lit les dates françaises et anglaises", () => {
    expect(parseEventDate("29/10/2026 21:47:11")).toEqual(
      new Date(2026, 9, 29, 21, 47, 11),
    );
    expect(parseEventDate("10/29/2026 9:47:11 PM")).toEqual(
      new Date(2026, 9, 29, 21, 47, 11),
    );
    // Jour et mois ambigus, sans AM/PM : le jour d'abord (Windows en français).
    expect(parseEventDate("05/11/2026 08:00:00")).toEqual(
      new Date(2026, 10, 5, 8, 0, 0),
    );
  });

  it("regroupe les lignes rapprochées en incidents", () => {
    const e = parseEvents(RAW);
    expect(e.gpu).toHaveLength(4);
    expect(e.shutdown).toHaveLength(1);
    expect(e.afterGpu).toBe(1);
    expect(e.hardware).toHaveLength(0);
  });

  it("signale plantages et arrêt brutal, dans l'ordre de gravité", () => {
    const r = analyzeEvents(RAW);
    expect(r.severity).toBe("warning");
    expect(r.findings.map((f) => f.id)).toEqual([
      "gpu-crashes",
      "hard-shutdowns",
    ]);
    expect(r.findings[0].title).toBe(
      "Pilote graphique planté 4 fois en 90 jours",
    );
    expect(r.findings[0].detail).toContain("17 novembre");
    expect(r.findings[1].detail).toContain(
      "juste après un plantage du pilote graphique",
    );
    expect(r.passed.map((p) => p.id)).toEqual(["no-hardware-error"]);
  });

  it("passe au rouge à partir de cinq plantages ou trois erreurs matérielles", () => {
    const lines = [1, 2, 3, 4, 5].map(
      (d) => `"0${d}/11/2026 10:00:00","nvlddmkm","153"`,
    );
    const whea = [1, 2, 3].map(
      (d) => `"1${d}/11/2026 10:00:00","Microsoft-Windows-WHEA-Logger","17"`,
    );
    const r = analyzeEvents(
      `"TimeCreated","ProviderName","Id"\n${[...lines, ...whea].join("\n")}`,
    );
    expect(r.severity).toBe("problem");
    expect(r.findings.map((f) => [f.id, f.level])).toEqual([
      ["gpu-crashes", "problem"],
      ["hardware-errors", "problem"],
    ]);
  });

  it("historique vide : tout en vert ; lecture absente : rien", () => {
    const r = analyzeEvents(`"TimeCreated","ProviderName","Id"\n`);
    expect(r.severity).toBe("ok");
    expect(r.passed).toHaveLength(3);
    expect(analyzeEvents("autre chose")).toBeNull();
  });
});

describe("test de mémoire de Windows", () => {
  const head = `"TimeCreated","ProviderName","Id"`;
  it("signale le dernier test en échec", () => {
    const r = analyzeEvents(
      `${head}\n"03/11/2026 10:00:00","Microsoft-Windows-MemoryDiagnostics-Results","1202"\n"01/10/2026 10:00:00","Microsoft-Windows-MemoryDiagnostics-Results","1201"`,
    );
    expect(r.severity).toBe("problem");
    expect(r.findings[0].id).toBe("memory-test-failed");
    expect(r.findings[0].detail).toContain("3 novembre");
  });
  it("note un test réussi, le plus récent l'emportant", () => {
    const r = analyzeEvents(
      `${head}\n"03/11/2026 10:00:00","Microsoft-Windows-MemoryDiagnostics-Results","1201"\n"01/10/2026 10:00:00","Microsoft-Windows-MemoryDiagnostics-Results","1202"`,
    );
    expect(r.findings).toHaveLength(0);
    expect(r.passed.at(-1).label).toBe(
      "Test de mémoire de Windows réussi le 3 novembre",
    );
  });
});
