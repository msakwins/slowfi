import { describe, it, expect } from "vitest";
import {
  sensorRows,
  disksNeedAdmin,
  seriesSummary,
  slowdownSummary,
  nvmeAlerts,
} from "./sensors.js";

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

describe("ralentissements de la carte graphique", () => {
  it("compte les secondes ralenties par la chaleur ou la consommation", () => {
    const at = (s, thermal, power) => ({
      t: s * 1000,
      gpuThermal: thermal,
      gpuPower: power,
    });
    expect(
      slowdownSummary([
        { t: 0, gpuThermal: null },
        at(1, false, false),
        at(3, true, false),
        at(5, true, true),
        at(7, false, false),
      ]),
    ).toEqual({ thermal: 4, power: 2 });
  });

  it("rien sans relevé de la carte", () => {
    expect(slowdownSummary([{ t: 0, gpuThermal: null }])).toBeNull();
  });
});

describe("journal de santé NVMe", () => {
  const ssd = (nvme) => ({
    gpus: [],
    disks: [
      {
        name: "SSD",
        media: "SSD",
        bus: "NVMe",
        temperature: 50,
        wear: 0,
        nvme,
      },
    ],
  });
  it("préfère l'usure et l'historique de chaleur du SSD", () => {
    const [, wear] = sensorRows(
      ssd({
        percentageUsed: 7,
        powerOnHours: 10967,
        warningTempMinutes: 0,
        criticalTempMinutes: 0,
        mediaErrors: 0,
      }),
    );
    expect(wear).toMatchObject({
      kind: "wear",
      value: 7,
      level: "ok",
      extra: { hours: 10967, heatMinutes: 0 },
    });
  });
  it("signale un SSD qui a longtemps chauffé", () => {
    const [, hot] = sensorRows(
      ssd({
        percentageUsed: 7,
        warningTempMinutes: 300,
        criticalTempMinutes: 0,
      }),
    );
    expect(hot.level).toBe("warning");
    const [, burnt] = sensorRows(
      ssd({
        percentageUsed: 7,
        warningTempMinutes: 300,
        criticalTempMinutes: 2,
      }),
    );
    expect(burnt.level).toBe("problem");
  });
});

describe("alertes et réserve des SSD NVMe", () => {
  const row = (nvme) =>
    sensorRows({
      disks: [
        { name: "SSD", media: "SSD", bus: "NVMe", temperature: 40, nvme },
      ],
    })[1];
  it("lit les alertes levées par le SSD", () => {
    expect(nvmeAlerts({ criticalWarning: 0 })).toEqual([]);
    expect(nvmeAlerts({ criticalWarning: 5 })).toEqual([
      "spare",
      "reliability",
    ]);
  });
  it("passe au rouge sur alerte de fiabilité ou réserve épuisée", () => {
    const base = {
      percentageUsed: 10,
      availableSpare: 100,
      spareThreshold: 10,
    };
    expect(row(base).level).toBe("ok");
    expect(row({ ...base, criticalWarning: 4 }).level).toBe("problem");
    expect(row({ ...base, availableSpare: 8 }).level).toBe("problem");
    expect(row({ ...base, availableSpare: 40 }).level).toBe("warning");
  });
});

describe("macOS", () => {
  it("état SMART, niveau de chauffe, mot de passe à demander", () => {
    const data = {
      platform: "mac",
      zones: [],
      disks: [
        { name: "APPLE SSD", media: "SSD", bus: "NVMe", smart: "Verified" },
      ],
    };
    expect(disksNeedAdmin(data)).toBe(true);
    expect(sensorRows(data).map((r) => [r.kind, r.level])).toEqual([
      ["smart", "ok"],
    ]);
    const hot = {
      ...data,
      pressure: "Serious",
      zones: [{ name: "Processeur", celsius: 88 }],
    };
    expect(disksNeedAdmin(hot)).toBe(false);
    expect(sensorRows(hot).map((r) => [r.kind, r.level])).toEqual([
      ["zone", "warning"],
      ["smart", "ok"],
      ["pressure", "problem"],
    ]);
  });
});
