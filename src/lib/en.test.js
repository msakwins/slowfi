import { describe, it, expect } from "vitest";
import { EN, localize } from "./en.js";
import { gradeConnection } from "./connection.js";
import { diagnose } from "./diagnostic.js";
import { diagnoseComponents } from "./components.js";
import { gradeVolume, diagnoseStorage } from "./storage.js";
import { compareWithLine } from "./diagnostic.js";
import { analyzeComponents } from "./components.js";
import { HARDWARE_MAC } from "./examples.js";
import { diagnoseEthernet } from "./ethernet.js";
import { analyzeSystem } from "./system.js";
import { HARDWARE_WINDOWS } from "./examples.js";

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
  ["wifi", compareWithLine(diagnose({ channel: 1, signal: 90, rx: 144 }), 70)],
  ["wifi", compareWithLine(diagnose({ channel: 36, signal: 90, rx: 866 }), 50)],
  ["wifi", compareWithLine(diagnose({ channel: 1, signal: 90, rx: 144 }), 500)],
  ["components", analyzeComponents(HARDWARE_MAC, { year: 2026 })],
  ["ethernet", diagnoseEthernet({ speed: 100, fullDuplex: false })],
  [
    "components",
    analyzeComponents(
      "Name : GPU\nDriverVersion : 1\nDriverDate : 10/03/2026\nStatus : OK\nConfigManagerErrorCode : 0",
      { year: 2026, month: 11 },
    ),
  ],
  [
    "components",
    analyzeComponents(
      "Name : GPU\nDriverVersion : 1\nDriverDate : 07/11/2026\nStatus : Error\nConfigManagerErrorCode : 43",
      { year: 2026, month: 11 },
    ),
  ],
  [
    "components",
    analyzeComponents(
      "Name : GPU\nDriverVersion : 1\nDriverDate : 07/11/2026\nStatus : Error\nConfigManagerErrorCode : 22",
      { year: 2026, month: 11 },
    ),
  ],
  [
    "components",
    analyzeComponents(
      "Name : GPU\nDriverVersion : 1\nDriverDate : 07/11/2026\nStatus : Degraded\nConfigManagerErrorCode : 0",
      { year: 2026, month: 11 },
    ),
  ],
  [
    "components",
    analyzeComponents(
      "Name : Microsoft Basic Display Adapter\nDriverVersion : 1\nDriverDate : 21/06/2006",
      { year: 2026, month: 11 },
    ),
  ],
  ["system", analyzeSystem(HARDWARE_WINDOWS)],
  [
    "system",
    analyzeSystem(
      HARDWARE_WINDOWS.replace("SystemDisk  : 0", "SystemDisk  : 1").replace(
        "HealthStatus : Healthy",
        "HealthStatus : Warning",
      ),
    ),
  ],
  [
    "system",
    analyzeSystem(
      HARDWARE_MAC.replace("lowpowermode         0", "lowpowermode         1"),
    ),
  ],
  ["system", analyzeSystem("SystemDisk : 0\nUptimeDays : 1\nPowerScheme : x")],
  [
    "components",
    analyzeComponents("Memory:\n\n      Memory: 4 GB\n", { year: 2026 }),
  ],
  [
    "components",
    analyzeComponents(
      "DeviceLocator : A\nCapacity : 4294967296\nSpeed : 2400\nConfiguredClockSpeed : 2400",
      { year: 2026 },
    ),
  ],
  ["ethernet", diagnoseEthernet({ speed: 1000, fullDuplex: true }, 950)],
  ["ethernet", diagnoseEthernet({ speed: 2500, fullDuplex: true }, 300)],
  [
    "storage",
    diagnoseStorage(HARDWARE_MAC.replace("Verified", "Failing")).volumes[0],
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
        expect(en.detail ?? "").not.toMatch(/undefined/);
      });
    }
  }

  it("le français passe tel quel", () => {
    const f = gradeConnection({ download: 5 }).findings[0];
    expect(localize(f, "fr", "connection")).toBe(f);
  });
});

describe("contrôles passés en anglais", () => {
  it("traduit chaque contrôle passé", async () => {
    const { PASSED_EN, passedLabel } = await import("./en.js");
    const { analyzeComponents } = await import("./components.js");
    const { analyzeSystem } = await import("./system.js");
    const { gradeVolume } = await import("./storage.js");
    const { HARDWARE_WINDOWS } = await import("./examples.js");
    const raw = HARDWARE_WINDOWS.replace(
      "ConfiguredClockSpeed : 2133",
      "ConfiguredClockSpeed : 2666",
    )
      .replace("ConfiguredClockSpeed : 2133", "ConfiguredClockSpeed : 2666")
      .replace("14/08/2024", "14/08/2026")
      .replace("20/03/2019", "20/03/2025")
      .replace("UptimeDays  : 12", "UptimeDays  : 2")
      .replace(
        "a1841308-3541-4fab-bc81-f71556f20b4a",
        "381b4222-f694-41f0-9685-ff5bb260df2e",
      );
    const items = [
      ...analyzeComponents(raw, { year: 2026 }).passed,
      ...analyzeSystem(raw).passed,
      ...gradeVolume({
        driveLetter: "D",
        size: 100e9,
        free: 50e9,
        health: "Warning",
        operational: "OK",
      }).passed,
      ...gradeVolume({
        driveLetter: "E",
        size: 100e9,
        free: 3e9,
        health: "Healthy",
        operational: "OK",
      }).passed,
    ];
    const ids = new Set(items.map((p) => p.id));
    for (const id of ids) expect(PASSED_EN).toHaveProperty(id);
    for (const p of items) {
      expect(passedLabel(p, "en")).not.toBe(p.label);
      expect(passedLabel(p, "en")).not.toMatch(/undefined/);
    }
  });
});

describe("couverture des contrôles passés", () => {
  it("chaque libellé anglais correspond à un contrôle réellement produit", async () => {
    const { PASSED_EN } = await import("./en.js");
    const { analyzeComponents } = await import("./components.js");
    const { analyzeSystem } = await import("./system.js");
    const { analyzeActivity } = await import("./activity.js");
    const { gradeVolume } = await import("./storage.js");
    const { analyzeDevices } = await import("./devices.js");
    const { parseBlocks } = await import("./powershell.js");
    const ex = await import("./examples.js");
    const healthyWin = ex.HARDWARE_WINDOWS.replaceAll(
      "ConfiguredClockSpeed : 2133",
      "ConfiguredClockSpeed : 2666",
    )
      .replace("14/08/2024", "14/10/2026")
      .replace("20/03/2019", "20/03/2025")
      .replace("UptimeDays  : 12", "UptimeDays  : 2")
      .replace(
        "a1841308-3541-4fab-bc81-f71556f20b4a",
        "381b4222-f694-41f0-9685-ff5bb260df2e",
      )
      .replace(
        "FreePhysicalMemory     : 2342147",
        "FreePhysicalMemory     : 22342147",
      );
    const produced = new Set(
      [
        ...analyzeComponents(healthyWin, { year: 2026, month: 11 }).passed,
        ...analyzeSystem(healthyWin, { today: "2026-11-20" }).passed,
        ...analyzeSystem(ex.HARDWARE_MAC, { today: "2026-11-20" }).passed,
        ...analyzeActivity(parseBlocks(healthyWin), healthyWin).passed,
        ...analyzeDevices(ex.DEVICES_WINDOWS).passed,
        ...gradeVolume({
          driveLetter: "D",
          size: 100e9,
          free: 50e9,
          health: "Warning",
          operational: "OK",
        }).passed,
        ...gradeVolume({
          driveLetter: "E",
          size: 100e9,
          free: 3e9,
          health: "Healthy",
          operational: "OK",
        }).passed,
      ].map((p) => p.id),
    );
    expect([...produced].sort()).toEqual(Object.keys(PASSED_EN).sort());
  });
});

describe("nouveaux constats en anglais", () => {
  it("version, batterie, démarrage, processeur, pilotes réseau, activité", async () => {
    const { EN, localize } = await import("./en.js");
    const { analyzeComponents } = await import("./components.js");
    const { analyzeSystem } = await import("./system.js");
    const { diagnoseActivity } = await import("./activity.js");
    const ex = await import("./examples.js");
    const startup = Array.from(
      { length: 16 },
      (_, i) => `Command : app${i}.exe\nUser : Me\nLocation : HKU\S-1-5-21\Run`,
    ).join("\n\n");
    const groups = [
      [
        "system",
        analyzeSystem(
          "Caption : Microsoft Windows 10 Professionnel\nBuildNumber : 19045\n\nDisplayVersion : 22H2",
          { today: "2026-11-20" },
        ),
      ],
      [
        "system",
        analyzeSystem(
          "Caption : Microsoft Windows 11 Famille\nBuildNumber : 22631",
          { today: "2026-11-20" },
        ),
      ],
      [
        "system",
        analyzeSystem(
          "Caption : Microsoft Windows 11 Entreprise\nBuildNumber : 22631",
          { today: "2026-09-01" },
        ),
      ],
      [
        "system",
        analyzeSystem("ProductVersion: 13.6\nMaximum Capacity: 55%", {
          today: "2026-11-20",
        }),
      ],
      ["system", analyzeSystem(startup, { today: "2026-11-20" })],
      [
        "components",
        analyzeComponents(
          ex.HARDWARE_WINDOWS.replace(
            "PercentPerformanceLimit : 100",
            "PercentPerformanceLimit : 60",
          ),
          { year: 2026 },
        ),
      ],
      [
        "components",
        analyzeComponents(
          "machdep.cpu.brand_string: Intel Core i7\nCPU_Speed_Limit = 50",
          { year: 2026 },
        ),
      ],
      [
        "activity",
        diagnoseActivity({
          platform: "windows",
          cpuLoad: 97,
          memoryPct: 95,
          top: [{ name: "chrome", bytes: 3e9, count: 4 }],
        }),
      ],
    ];
    for (const [engine, r] of groups) {
      for (const f of r.findings) {
        expect(EN[engine]).toHaveProperty(f.key ?? f.id);
        const en = localize(f, "en", engine);
        expect(en.title).not.toBe(f.title);
        expect(`${en.title} ${en.detail ?? ""} ${en.fix ?? ""}`).not.toMatch(
          /undefined|NaN/,
        );
      }
    }
  });
});

describe("niveau de chaque constat", () => {
  it("tout constat autre que « healthy » porte un niveau", async () => {
    const ex = await import("./examples.js");
    const { analyzeComponents } = await import("./components.js");
    const { analyzeSystem } = await import("./system.js");
    const { analyzeActivity } = await import("./activity.js");
    const { diagnoseStorage } = await import("./storage.js");
    const { analyzeDevices } = await import("./devices.js");
    const { parseBlocks } = await import("./powershell.js");
    const all = [
      ...analyzeComponents(ex.HARDWARE_WINDOWS, { year: 2026, month: 11 })
        .findings,
      ...analyzeSystem(ex.HARDWARE_WINDOWS, { today: "2026-11-20" }).findings,
      ...analyzeSystem(ex.HARDWARE_LINUX, { today: "2026-11-20" }).findings,
      ...analyzeActivity(parseBlocks(ex.HARDWARE_WINDOWS), ex.HARDWARE_WINDOWS)
        .findings,
      ...diagnoseStorage(ex.HARDWARE_WINDOWS).volumes.flatMap(
        (v) => v.findings,
      ),
      ...analyzeDevices(ex.DEVICES_WINDOWS).findings,
    ].filter((f) => f.id !== "healthy");
    expect(all.length).toBeGreaterThan(8);
    for (const f of all) expect(["warning", "problem"]).toContain(f.level);
  });
});
