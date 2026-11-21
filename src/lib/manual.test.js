import { describe, it, expect } from "vitest";
import { num, wifiFromForm, hardwareFromForm } from "./manual.js";

describe("num", () => {
  it("accepte la virgule et les espaces", () => {
    expect(num("21,9")).toBe(21.9);
    expect(num(" 1 024 ")).toBe(1024);
  });
  it("renvoie null pour un champ vide ou invalide", () => {
    expect(num("")).toBeNull();
    expect(num("abc")).toBeNull();
    expect(num(undefined)).toBeNull();
  });
});

describe("Wi-Fi saisi à la main", () => {
  it("donne le même verdict qu'une commande collée", () => {
    const r = wifiFromForm({
      band: "2.4 GHz",
      radio: "802.11n",
      channel: "1",
      rate: "144",
      bars: "4",
    });
    expect(r.band).toBe("2.4 GHz");
    expect(r.estimatedReal).toBe(72);
    expect(r.findings[0].id).toBe("band-2ghz");
  });

  it("convertit le RSSI d'un Mac et les barres de Windows", () => {
    expect(wifiFromForm({ band: "5 GHz", rssi: "-67" }).signal).toBe(66);
    expect(wifiFromForm({ band: "5 GHz", rssi: "67" }).signal).toBe(66);
    expect(wifiFromForm({ band: "5 GHz", bars: "1" }).signal).toBe(25);
  });

  it("attend au moins la bande, le canal ou la norme", () => {
    expect(wifiFromForm({ rate: "300" })).toBeNull();
    expect(wifiFromForm({})).toBeNull();
  });
});

describe("matériel saisi à la main", () => {
  it("analyse les disques remplis et ignore les lignes incomplètes", () => {
    const r = hardwareFromForm({
      platform: "windows",
      disks: [
        { name: "C", free: "31,9", total: "232" },
        { name: "D", free: "", total: "900" },
      ],
    });
    expect(r.volumes).toHaveLength(1);
    expect(r.volumes[0].name).toBe("C:");
    expect(r.volumes[0].findings[0].id).toBe("disk-low");
    expect(r.components).toBeNull();
  });

  it("repère la mémoire bridée et la barrette seule", () => {
    const r = hardwareFromForm(
      {
        platform: "windows",
        disks: [],
        memory: "16",
        slots: "1",
        speed: "2133",
        rated: "3200",
      },
      { year: 2026 },
    );
    const ids = r.components.findings.map((f) => f.id);
    expect(ids).toContain("ram-underclocked");
    expect(ids).toContain("ram-single-channel");
    expect(r.components.totalGB).toBe(16);
  });

  it("n'invente pas de simple canal sans nombre d'emplacements", () => {
    const r = hardwareFromForm(
      { platform: "windows", disks: [], memory: "16" },
      { year: 2026 },
    );
    expect(r.components.findings.map((f) => f.id)).not.toContain(
      "ram-single-channel",
    );
  });

  it("date le pilote graphique et le BIOS", () => {
    const r = hardwareFromForm(
      { platform: "windows", disks: [], gpuYear: "2022", biosYear: "2018" },
      { year: 2026 },
    );
    const ids = r.components.findings.map((f) => f.key ?? f.id);
    expect(ids).toContain("gpu-driver-stale");
    expect(ids).toContain("bios-ancient");
  });

  it("lit un Mac en Go décimaux", () => {
    const r = hardwareFromForm(
      {
        platform: "mac",
        disks: [{ free: "23,5", total: "245" }],
        memory: "16",
      },
      { year: 2026 },
    );
    expect(r.volumes[0].name).toBe("Macintosh HD");
    expect(r.volumes[0].pct).toBe(9.6);
    expect(r.components.findings[0].key).toBe("healthy-mac");
  });

  it("renvoie null quand rien n'est rempli", () => {
    expect(hardwareFromForm({ platform: "windows", disks: [{}] })).toBeNull();
  });
});

describe("système saisi à la main", () => {
  it("signale un disque dur, un redémarrage ancien et l'économie d'énergie", () => {
    const r = hardwareFromForm({
      platform: "windows",
      disks: [],
      diskType: "HDD",
      uptime: "12",
      power: "saver",
    });
    expect(r.system.findings.map((f) => f.key ?? f.id)).toEqual([
      "system-hdd",
      "uptime-long",
      "power-saver",
    ]);
  });

  it("lit le mode économie d'énergie d'un Mac", () => {
    const r = hardwareFromForm({ platform: "mac", disks: [], power: "saver" });
    expect(r.system.findings[0].key).toBe("power-saver-mac");
  });
});

describe("carte graphique saisie à la main", () => {
  it("lit la date complète du pilote et l'icône du Gestionnaire de périphériques", () => {
    const r = hardwareFromForm(
      {
        platform: "windows",
        disks: [],
        gpuYear: "10/09/2025",
        gpuState: "error",
      },
      { year: 2026, month: 11 },
    );
    const ids = r.components.findings.map((f) => f.key ?? f.id);
    expect(ids).toContain("gpu-status");
    expect(ids).toContain("gpu-driver-old");
  });

  it("reconnaît une carte désactivée", () => {
    const r = hardwareFromForm({
      platform: "windows",
      disks: [],
      gpuState: "disabled",
    });
    expect(r.components.findings[0].key).toBe("gpu-disabled");
  });

  it("valide une carte sans icône", () => {
    const r = hardwareFromForm(
      { platform: "windows", disks: [], gpuYear: "07/11/2026", gpuState: "ok" },
      { year: 2026, month: 11 },
    );
    expect(r.components.passed.map((p) => p.id)).toEqual([
      "gpu-driver",
      "gpu-ok",
    ]);
  });
});

describe("périphériques saisis à la main", async () => {
  const { devicesFromForm } = await import("./manual.js");

  it("signale les appareils marqués d'un triangle ou d'une flèche", () => {
    const r = devicesFromForm({
      platform: "windows",
      state: "some",
      errors: "Webcam, Manette",
      disabled: "Lecteur de cartes",
    });
    expect(r.findings.map((f) => f.key)).toEqual([
      "device-error",
      "device-error",
      "device-disabled",
    ]);
  });

  it("valide l'absence d'icône", () => {
    expect(
      devicesFromForm({ platform: "windows", state: "none" }).findings[0].id,
    ).toBe("healthy");
    expect(devicesFromForm({ platform: "windows" })).toBeNull();
  });

  it("donne un correctif propre au Mac", () => {
    const r = devicesFromForm({
      platform: "mac",
      state: "some",
      missing: "AirPods",
    });
    expect(r.findings[0].key).toBe("device-missing-mac");
  });
});

describe("système et activité saisis à la main", () => {
  it("retrouve la fin de support depuis l'édition et la version", () => {
    const r = hardwareFromForm(
      { platform: "windows", disks: [], os: "w11-home", osVersion: "24h2" },
      { year: 2026, month: 11, today: "2026-11-20" },
    );
    expect(r.system.findings[0].id).toBe("windows-unsupported");
    expect(r.system.osLabel).toBe("Windows 11 24H2");
  });

  it("valide Windows 11 25H2 et compte le démarrage sans les noms", () => {
    const r = hardwareFromForm(
      {
        platform: "windows",
        disks: [],
        os: "w11-home",
        osVersion: "25H2",
        startupCount: "6",
      },
      { year: 2026, month: 11, today: "2026-11-20" },
    );
    expect(r.system.passed.map((p) => p.label)).toEqual([
      "Windows 11 25H2, suivi jusqu'au 12 octobre 2027",
      "6 programmes au démarrage",
    ]);
  });

  it("signale la mémoire pleine lue dans le Gestionnaire des tâches", () => {
    const r = hardwareFromForm({
      platform: "windows",
      disks: [],
      cpuLoad: "15",
      memoryPct: "94",
    });
    expect(r.activity.findings[0].id).toBe("memory-full");
  });

  it("nomme la carte mère dans le correctif du BIOS", () => {
    const r = hardwareFromForm(
      {
        platform: "windows",
        disks: [],
        biosYear: "2018",
        boardMaker: "ASUSTeK COMPUTER INC.",
        boardModel: "PRIME B450M-A",
      },
      { year: 2026 },
    );
    expect(r.components.findings[0].fix).toContain(
      "carte mère (ASUS PRIME B450M-A)",
    );
  });

  it("lit la version et la batterie d'un Mac", () => {
    const r = hardwareFromForm(
      { platform: "mac", disks: [], osVersion: "14.6", batteryPct: "72" },
      { today: "2026-11-20" },
    );
    expect(r.system.findings.map((f) => f.id)).toEqual([
      "macos-unsupported",
      "battery-worn",
    ]);
  });
});

describe("saisie guidée sous Linux", () => {
  it("lit le disque, le système, l'activité et l'alimentation", () => {
    const r = hardwareFromForm(
      {
        platform: "linux",
        disks: [{ free: "40", total: "512" }],
        osVersion: "Ubuntu 24.04",
        memory: "16",
        cpuLoad: "8",
        memoryPct: "92",
        power: "saver",
      },
      { year: 2026, today: "2026-11-20" },
    );
    expect(r.volumes[0].name).toBe("/");
    expect(r.volumes[0].findings[0].id).toBe("disk-low");
    expect(r.system.osLabel).toBe("Ubuntu 24.04");
    expect(r.system.findings.map((f) => f.key)).toContain("power-saver-linux");
    expect(r.activity.findings[0].id).toBe("memory-full");
  });

  it("Wi-Fi et périphériques sans commande", async () => {
    const { devicesFromForm } = await import("./manual.js");
    expect(wifiFromForm({ band: "5 GHz", rate: "540", bars: "3" }).signal).toBe(
      75,
    );
    expect(
      devicesFromForm({ platform: "linux", state: "some", missing: "Casque" })
        .findings[0].key,
    ).toBe("device-missing-mac");
  });
});
