import { describe, it, expect } from "vitest";
import { recommendUpgrades } from "./upgrades.js";

const GiB = 1024 ** 3;

// Le PC de référence : i5-9400F, 2 × 16 Go, Windows sur un SSD de 250 Go
// presque plein, Wi-Fi AC 9560.
const pc = {
  cpu: { name: "Intel(R) Core(TM) i5-9400F CPU @ 2.90GHz", threads: 6 },
  laptop: false,
  systemDisk: {
    name: "Samsung SSD 970 EVO Plus 250GB",
    mediaType: "SSD",
    busType: "NVMe",
    size: 250e9,
  },
  systemVolume: { size: 249e9, free: 25e9 },
  memory: [
    { capacity: 16 * GiB, type: "DDR4", formFactor: "DIMM" },
    { capacity: 16 * GiB, type: "DDR4", formFactor: "DIMM" },
  ],
  memoryPct: 40,
  network: [{ name: "Intel(R) Wireless-AC 9560 160MHz" }],
};

const ids = (data) => recommendUpgrades(data).map((u) => u.id);

describe("améliorations possibles", () => {
  it("le PC de référence : processeur et SSD plus grand", () => {
    expect(ids(pc)).toEqual(["cpu", "system-bigger"]);
    const [cpu, disk] = recommendUpgrades(pc);
    expect(cpu.query).toBe("Core i7-9700");
    expect(cpu.reason).toMatch(/BIOS/);
    expect(disk.query).toBe("SSD NVMe M.2 1 To");
  });

  it("rien pour une machine déjà rapide", () => {
    expect(
      ids({
        ...pc,
        cpu: { name: "Intel(R) Core(TM) i7-9700 CPU", threads: 8 },
        systemVolume: { size: 249e9, free: 120e9 },
      }),
    ).toEqual([]);
  });

  it("grand disque presque plein : faire de la place, rien à acheter", () => {
    const [u] = recommendUpgrades({
      ...pc,
      cpu: null,
      systemDisk: { ...pc.systemDisk, size: 1000e9 },
      systemVolume: { size: 1000e9, free: 60e9 },
    });
    expect(u.id).toBe("system-free");
    expect(u.query).toBeNull();
  });

  it("Windows sur un disque dur : un SSD", () => {
    const [u] = recommendUpgrades({
      ...pc,
      cpu: null,
      systemDisk: { name: "WDC", mediaType: "HDD", busType: "SATA", size: 1e12 },
    });
    expect(u.id).toBe("system-ssd");
    expect(u.query).toMatch(/SATA/);
  });

  it("pas de processeur sur un portable", () => {
    expect(ids({ ...pc, laptop: true })).not.toContain("cpu");
  });

  it("Ryzen 1000 : même avec 12 threads", () => {
    const [u] = recommendUpgrades({
      cpu: { name: "AMD Ryzen 5 1600 Six-Core Processor", threads: 12 },
    });
    expect(u.query).toBe("Ryzen 7 5700X3D");
  });

  it("8 Go : un kit de 16 Go du même type", () => {
    const [u] = recommendUpgrades({
      memory: [
        { capacity: 4 * GiB, type: "DDR4", formFactor: "SO-DIMM" },
        { capacity: 4 * GiB, type: "DDR4", formFactor: "SO-DIMM" },
      ],
    });
    expect(u.query).toBe("kit 2x8 Go DDR4 SO-DIMM");
  });

  it("Wi-Fi 4 : une carte Wi-Fi 6", () => {
    expect(
      ids({ network: [{ name: "Realtek RTL8188EE Wireless LAN 802.11n PCI-E NIC" }] }),
    ).toEqual(["wifi"]);
  });
});
