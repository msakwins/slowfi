import { describe, it, expect } from "vitest";
import { summarizeBlocks } from "./report.js";
import { analyzeComponents } from "./components.js";
import { analyzeSystem } from "./system.js";
import { HARDWARE_WINDOWS } from "./examples.js";

const date = new Date(2026, 10, 20, 17, 30);

describe("résumé d'une analyse", () => {
  const blocks = [
    {
      name: "Système",
      engine: "system",
      result: analyzeSystem(HARDWARE_WINDOWS, { today: "2026-11-20" }),
    },
    {
      name: "Composants",
      engine: "components",
      result: analyzeComponents(HARDWARE_WINDOWS, { year: 2026 }),
    },
  ];

  it("liste niveaux, constats, correctifs et contrôles passés", () => {
    const text = summarizeBlocks("Slowfi — analyse du matériel", blocks, "fr", {
      date,
      url: "https://www.slowfi.app",
    });
    const lines = text.split("\n");
    expect(lines[0]).toBe("Slowfi — analyse du matériel — 20/11/2026 17:30");
    expect(text).toContain("Système : À surveiller");
    expect(text).toContain("- Pas de redémarrage depuis 12 jours");
    expect(text).toContain("  Correctif : Utiliser « Redémarrer »");
    expect(text).toContain(
      "Points vérifiés : Windows 11 25H2, suivi jusqu'au 12 octobre 2027 ; Windows sur un SSD",
    );
    expect(lines.at(-1)).toBe("https://www.slowfi.app");
  });

  it("s'écrit en anglais", () => {
    const en = blocks.map((b, i) => ({
      ...b,
      name: ["System", "Components"][i],
    }));
    const text = summarizeBlocks("Slowfi — hardware analysis", en, "en", {
      date,
    });
    expect(text).toContain("System: To watch");
    expect(text).toContain("- No restart for 12 days");
    expect(text).toContain("Fix: Use “Restart”");
    expect(text).not.toMatch(/undefined/);
  });

  it("n'écrit pas « Aucune anomalie » quand la liste des contrôles passés le dit déjà", () => {
    const healthy = analyzeSystem(
      "SystemDisk : 0\nUptimeDays : 1\nPowerScheme : 381b4222-f694-41f0-9685-ff5bb260df2e",
      { today: "2026-11-20" },
    );
    const text = summarizeBlocks(
      "x",
      [{ name: "Système", engine: "system", result: healthy }],
      "fr",
      { date },
    );
    expect(text).not.toContain("Aucune anomalie");
    expect(text).toContain("Système : Bon état");
  });
});
