import { describe, it, expect } from "vitest";
import { EN, localize } from "./en.js";
import { gradeConnection } from "./connection.js";
import { diagnose } from "./diagnostic.js";
import { diagnoseComponents } from "./components.js";
import { gradeVolume } from "./storage.js";

// Chaque cas déclenche un ou plusieurs constats ; tous doivent exister en
// anglais, avec un correctif quand la version française en a un.
const cases = [
  [
    "connection",
    gradeConnection({ download: 5, upload: 1, latency: 250, jitter: 80 }),
  ],
  [
    "connection",
    gradeConnection({ download: 15, upload: 5, latency: 30, jitter: 5 }),
  ],
  [
    "connection",
    gradeConnection({ download: 500, upload: 100, latency: 10, jitter: 2 }),
  ],
  [
    "connection",
    gradeConnection({ download: 50, upload: 10, latency: 60, jitter: 10 }),
  ],
  ["wifi", diagnose({ radio: "802.11n", channel: 1, signal: 30, rx: 144 })],
  ["wifi", diagnose({ radio: "802.11ac", channel: 36, signal: 80, rx: 200 })],
  ["wifi", diagnose({ radio: "802.11ax", channel: 36, signal: 80, rx: 1200 })],
  [
    "components",
    diagnoseComponents(
      {
        memory: [{ capacity: 8 * 1024 ** 3, rated: 3200, configured: 2133 }],
        gpus: [{ name: "GPU", driverYear: 2020 }],
        bios: { year: 2017 },
      },
      { year: 2026 },
    ),
  ],
  [
    "components",
    diagnoseComponents(
      { memory: [], gpus: [], bios: { year: 2021 } },
      { year: 2026 },
    ),
  ],
  [
    "components",
    diagnoseComponents({ memory: [], gpus: [], bios: null }, { year: 2026 }),
  ],
  [
    "storage",
    gradeVolume(
      {
        driveLetter: "C",
        size: 100e9,
        free: 3e9,
        health: "Warning",
        operational: "Full Repair Needed",
      },
      { system: true },
    ),
  ],
  [
    "storage",
    gradeVolume(
      { driveLetter: "C", size: 200e9, free: 18e9, health: "Healthy" },
      { system: true },
    ),
  ],
  [
    "storage",
    gradeVolume({
      driveLetter: "D",
      size: 200e9,
      free: 100e9,
      health: "Healthy",
    }),
  ],
];

describe("traductions anglaises", () => {
  for (const [engine, result] of cases) {
    for (const f of result.findings) {
      it(`${engine} / ${f.key ?? f.id}`, () => {
        expect(EN[engine][f.key ?? f.id]).toBeTypeOf("function");
        const en = localize(f, "en", engine);
        expect(en.title).not.toBe(f.title);
        expect(Boolean(en.fix)).toBe(Boolean(f.fix));
        expect(en.title).not.toMatch(/undefined/);
        expect(en.detail).not.toMatch(/undefined/);
      });
    }
  }

  it("le français passe tel quel", () => {
    const f = gradeConnection({ download: 5 }).findings[0];
    expect(localize(f, "fr", "connection")).toBe(f);
  });
});
