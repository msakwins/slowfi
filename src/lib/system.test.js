import { describe, it, expect } from "vitest";
import { parseSystem, analyzeSystem, diskKind } from "./system.js";
import { analyzeComponents } from "./components.js";
import { diagnoseStorage } from "./storage.js";
import { HARDWARE_WINDOWS, HARDWARE_MAC } from "./examples.js";

describe("système sous Windows", () => {
  it("lit les disques physiques et le bloc calculé", () => {
    const s = parseSystem(HARDWARE_WINDOWS);
    expect(s.disks).toHaveLength(2);
    expect(s.systemDisk.name).toBe("Samsung SSD 860 EVO 250GB");
    expect(s.uptimeDays).toBe(12);
    expect(s.powerSaver).toBe(true);
  });

  it("signale le redémarrage ancien et l'économie d'énergie, pas le HDD de données", () => {
    const r = analyzeSystem(HARDWARE_WINDOWS);
    const ids = r.findings.map((f) => f.key ?? f.id);
    expect(ids).toEqual(["uptime-long", "power-saver"]);
    expect(r.kind).toBe("SSD");
  });

  it("signale Windows sur un disque dur", () => {
    const hdd = HARDWARE_WINDOWS.replace("SystemDisk  : 0", "SystemDisk  : 1");
    const r = analyzeSystem(hdd);
    expect(r.severity).toBe("problem");
    expect(r.findings[0].id).toBe("system-hdd");
  });

  it("signale un disque physique en mauvais état", () => {
    const bad = HARDWARE_WINDOWS.replace(
      "HealthStatus : Healthy\n\nDeviceId     : 1",
      "HealthStatus : Warning\n\nDeviceId     : 1",
    );
    const r = analyzeSystem(bad);
    expect(r.findings.some((f) => f.key === "disk-unhealthy")).toBe(true);
  });

  it("reconnaît NVMe, SSD et HDD", () => {
    expect(diskKind({ mediaType: "SSD", busType: "NVMe" })).toBe("NVMe");
    expect(diskKind({ mediaType: "SSD", busType: "SATA" })).toBe("SSD");
    expect(diskKind({ mediaType: "HDD", busType: "SATA" })).toBe("HDD");
    expect(diskKind({ mediaType: "Unspecified", busType: "USB" })).toBeNull();
  });

  it("ne perturbe pas la lecture des volumes et des composants", () => {
    expect(diagnoseStorage(HARDWARE_WINDOWS).volumes).toHaveLength(2);
    expect(
      analyzeComponents(HARDWARE_WINDOWS, { year: 2026 }).memory,
    ).toHaveLength(2);
  });
});

describe("système sous macOS", () => {
  it("lit uptime et le mode économie d'énergie", () => {
    const s = parseSystem(HARDWARE_MAC);
    expect(s.platform).toBe("mac");
    expect(s.uptimeDays).toBe(9);
    expect(s.powerSaver).toBe(false);
    expect(analyzeSystem(HARDWARE_MAC).findings[0].key).toBe("uptime-long-mac");
  });

  it("compte zéro jour sous 24 h", () => {
    expect(parseSystem("10:00  up  3:04, 2 users").uptimeDays).toBe(0);
    expect(parseSystem("10:00  up 5 mins, 2 users").uptimeDays).toBe(0);
  });

  it("ne voit rien dans un texte sans rapport", () => {
    expect(parseSystem("Upgradeable Memory: Yes")).toBeNull();
  });
});

describe("mémoire limitée", () => {
  it("avertit sous 8 Go et alerte sous 4 Go", () => {
    const c = (gb) =>
      analyzeComponents(
        `DeviceLocator : A\nCapacity : ${gb * 1024 ** 3}\nSpeed : 2400\nConfiguredClockSpeed : 2400\n\nDeviceLocator : B\nCapacity : ${gb * 1024 ** 3}\nSpeed : 2400\nConfiguredClockSpeed : 2400`,
        { year: 2026 },
      );
    expect(c(2).findings[0].id).toBe("ram-low"); // 4 Go au total
    expect(c(2).severity).toBe("warning");
    expect(c(1).severity).toBe("problem"); // 2 Go
    expect(c(4).findings.map((f) => f.id)).not.toContain("ram-low"); // 8 Go
  });
});

describe("secteurs illisibles", () => {
  const raw = (n) => `DeviceId     : 0
FriendlyName : WDC WD10EZEX
MediaType    : HDD
BusType      : SATA
HealthStatus : Healthy

DeviceId              : 0
ReadErrorsUncorrected : ${n}
`;
  it("signale un disque qui n'a pas pu relire des données", () => {
    const r = analyzeSystem(raw(12));
    expect(r.severity).toBe("problem");
    expect(r.findings.find((f) => f.key === "disk-unreadable")).toMatchObject({
      key: "disk-unreadable",
      title: "Secteurs illisibles sur le disque WDC WD10EZEX",
    });
    expect(r.passed.map((p) => p.id)).not.toContain("disks-healthy");
  });
  it("aucune erreur : disque en bon état", () => {
    const r = analyzeSystem(raw(0));
    expect(r.findings.some((f) => f.key === "disk-unreadable")).toBe(false);
    expect(r.passed.map((p) => p.id)).toContain("disks-healthy");
  });
});
