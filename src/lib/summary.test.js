import { describe, it, expect } from "vitest";
import { summarize, formatNumber } from "./summary.js";

const m = { download: 564.94, upload: 130.12, latency: 30, jitter: 6 };
const at = new Date(2026, 10, 20, 21, 4);

describe("résumé", () => {
  const entry = { ...m, at: at.toISOString(), gradeLabel: "Excellente" };

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
