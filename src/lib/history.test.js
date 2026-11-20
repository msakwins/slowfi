import { describe, it, expect } from "vitest";
import { withEntry, summarize, formatNumber, MAX_ENTRIES } from "./history.js";

const m = { download: 564.94, upload: 130.12, latency: 30, jitter: 6 };
const at = new Date(2026, 10, 20, 21, 4);

describe("historique", () => {
  it("ajoute le test le plus récent en tête", () => {
    const list = withEntry([{ at: "old" }], m, at);
    expect(list[0].at).toBe(at.toISOString());
    expect(list[0].download).toBe(564.94);
    expect(list[1].at).toBe("old");
  });

  it(`garde au plus ${MAX_ENTRIES} tests`, () => {
    let list = [];
    for (let i = 0; i < MAX_ENTRIES + 5; i++) list = withEntry(list, m, at);
    expect(list).toHaveLength(MAX_ENTRIES);
  });
});

describe("résumé", () => {
  const entry = { ...withEntry([], m, at)[0], gradeLabel: "Excellente" };

  it("écrit les nombres à la française", () => {
    expect(formatNumber(130.12, "fr")).toBe("130,1");
    expect(formatNumber(130.12, "en")).toBe("130.1");
  });

  it("donne un texte lisible en français", () => {
    const text = summarize(entry, "fr", "https://slowfi.vercel.app");
    expect(text).toContain("Note : Excellente");
    expect(text).toContain("Débit descendant : 564,9 Mb/s");
    expect(text).toContain("Latence : 30 ms");
    expect(text.split("\n").at(-1)).toBe("https://slowfi.vercel.app");
  });

  it("suit la typographie anglaise", () => {
    const text = summarize({ ...entry, gradeLabel: "Excellent" }, "en", "x");
    expect(text).toContain("Grade: Excellent");
    expect(text).toContain("Download: 564.9 Mb/s");
  });
});
