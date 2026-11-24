import { describe, it, expect } from "vitest";
import { gpuScore, recommendForGoal, mergeSuggestions } from "./goals.js";

const GiB = 1024 ** 3;
const pc = {
  gpu: "NVIDIA GeForce GTX 1660 Ti",
  cpu: { name: "Intel(R) Core(TM) i5-9400F CPU @ 2.90GHz", threads: 6 },
  memory: [
    { capacity: 16 * GiB, type: "DDR4", formFactor: "DIMM" },
    { capacity: 16 * GiB, type: "DDR4", formFactor: "DIMM" },
  ],
  laptop: false,
};
const ids = (goal) => recommendForGoal(pc, goal).map((p) => p.id);

describe("suggestions selon l'usage", () => {
  it("niveaux de cartes", () => {
    expect(gpuScore("NVIDIA GeForce RTX 4060 Ti")).toBe(27);
    expect(gpuScore("NVIDIA GeForce RTX 4060")).toBe(22);
    expect(gpuScore("Intel(R) UHD Graphics 630")).toBe(2);
    expect(gpuScore("Carte inconnue")).toBeNull();
  });
  it("usage courant : rien de plus", () => {
    expect(ids({ usage: "office", budget: "moderate" })).toEqual([]);
  });
  it("jeux 1080p, budget modéré : la carte graphique", () => {
    const [gpu] = recommendForGoal(pc, { usage: "gaming1080", budget: "moderate" });
    expect(gpu.id).toBe("goal-gpu");
    expect(gpu.query).toBe("GeForce RTX 5060");
    expect(gpu.checks[0]).toMatch(/550/);
  });
  it("jeux 1440p, haut de gamme : carte et plateforme", () => {
    expect(ids({ usage: "gaming1440", budget: "high" })).toEqual([
      "goal-gpu",
      "goal-platform",
    ]);
  });
  it("portable : pas de carte ni de processeur", () => {
    const r = recommendForGoal(
      { ...pc, laptop: true },
      { usage: "gaming1440", budget: "high" },
    ).map((p) => p.id);
    expect(r).toEqual(["goal-laptop"]);
  });
  it("la plateforme remplace le processeur du même support", () => {
    const merged = mergeSuggestions(
      [{ id: "goal-platform" }],
      [{ id: "cpu" }, { id: "system-bigger" }],
    );
    expect(merged.map((p) => p.id)).toEqual(["goal-platform", "system-bigger"]);
  });
});
