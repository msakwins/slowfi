import { describe, it, expect } from "vitest";
import { sensorRows, disksNeedAdmin, seriesSummary } from "./sensors.js";

// Relevé réel d'un PC fixe (GTX 1660 Ti, SSD NVMe, disque dur SATA).
const PC = {
  platform: "windows",
  zones: [{ name: "\\_TZ.TZ00", celsius: 27.9 }],
  fans: [],
  disks: [
    {
      name: "Samsung SSD 970 EVO Plus 250GB",
      media: "SSD",
      bus: "NVMe",
      temperature: 45,
      wear: 0,
      powerOnHours: null,
    },
    {
      name: "WDC WD10EZEX-08WN4A0",
      media: "HDD",
      bus: "SATA",
      temperature: 28,
      wear: 0,
      powerOnHours: 27884,
    },
  ],
  gpus: [
    {
      name: "NVIDIA GeForce GTX 1660 Ti",
      temperature: 33.3,
      fan: 32,
      load: 26,
    },
  ],
};

describe("capteurs", () => {
  it("liste températures, usure et ventilateurs", () => {
    const rows = sensorRows(PC);
    expect(rows.map((r) => [r.kind, r.value, r.level])).toEqual([
      ["gpu", 33.3, "ok"],
      ["zone", 27.9, "ok"],
      ["disk", 45, "ok"],
      ["wear", 0, "ok"],
      ["disk", 28, "ok"],
      ["gpuFan", 32, "ok"],
    ]);
  });

  it("signale la chaleur et l'usure", () => {
    const rows = sensorRows({
      gpus: [{ name: "GPU", temperature: 91 }],
      disks: [
        { name: "SSD", media: "SSD", bus: "SATA", temperature: 72, wear: 96 },
        { name: "HDD", media: "HDD", bus: "SATA", temperature: 52 },
      ],
    });
    expect(rows.map((r) => [r.kind, r.level])).toEqual([
      ["gpu", "problem"],
      ["disk", "warning"],
      ["wear", "problem"],
      ["disk", "warning"],
    ]);
  });

  it("repère les disques illisibles sans droits administrateur", () => {
    expect(disksNeedAdmin(PC)).toBe(false);
    expect(
      disksNeedAdmin({
        platform: "windows",
        disks: [{ name: "SSD", temperature: null, wear: null }],
      }),
    ).toBe(true);
  });

  it("résume une série", () => {
    expect(seriesSummary([10, null, 20, 30])).toEqual({ avg: 20, max: 30 });
    expect(seriesSummary([null])).toBeNull();
  });
});
