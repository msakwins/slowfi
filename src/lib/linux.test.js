import { describe, it, expect } from "vitest";
import {
  HARDWARE_LINUX,
  WIFI_LINUX,
  ETHERNET_LINUX,
  DEVICES_LINUX,
} from "./examples.js";
import { parseWifi, isWired, diagnose } from "./diagnostic.js";
import { analyzeEthernet } from "./ethernet.js";
import { diagnoseStorage } from "./storage.js";
import { analyzeComponents } from "./components.js";
import { analyzeSystem } from "./system.js";
import { analyzeActivity } from "./activity.js";
import { analyzeDevices } from "./devices.js";
import { parseBlocks } from "./powershell.js";

describe("Linux — réseau", () => {
  it("lit le réseau Wi-Fi utilisé dans nmcli", () => {
    const d = parseWifi(WIFI_LINUX);
    expect(d).toMatchObject({
      ssid: "Livebox-A030_5GHz",
      channel: 36,
      band: "5 GHz",
      signal: 71,
      rx: 540,
    });
    expect(diagnose(d).estimatedReal).toBe(270);
  });

  it("reconnaît une connexion filaire", () => {
    expect(isWired("wifi:disconnected\nethernet:connected\n")).toBe(true);
    expect(isWired(WIFI_LINUX)).toBe(false);
  });

  it("lit la vitesse de la carte Ethernet dans /sys", () => {
    const r = analyzeEthernet(ETHERNET_LINUX);
    expect(r).toMatchObject({
      name: "enp0s31f6",
      speed: 100,
      fullDuplex: true,
    });
    expect(r.findings[0].id).toBe("ethernet-slow-link");
  });
});

describe("Linux — matériel", () => {
  it("lit le disque système, sans doublon pour /home", () => {
    const v = diagnoseStorage(HARDWARE_LINUX).volumes;
    // /home est sur la même partition que « / » : une seule ligne.
    expect(v.map((x) => x.name)).toEqual(["/"]);
    expect(v[0].findings[0].id).toBe("disk-low");
  });

  it("lit processeur, mémoire, carte graphique, BIOS et ordinateur", () => {
    const c = analyzeComponents(HARDWARE_LINUX, { year: 2026 });
    expect(c.platform).toBe("linux");
    expect(c.cpu).toMatchObject({
      name: "Intel(R) Core(TM) i7-8565U CPU @ 1.80GHz",
      cores: 4,
      threads: 8,
      boostMHz: 4600,
    });
    expect(c.totalGB).toBe(15);
    expect(c.gpus[0].name).toBe("Intel UHD Graphics 620");
    expect(c.bios.year).toBe(2019);
    expect(c.machine).toMatchObject({
      kind: "computer",
      maker: "Lenovo",
      model: "ThinkPad T490",
    });
    expect(c.findings.map((f) => f.id)).toContain("bios-ancient");
  });

  it("lit le système : SSD NVMe, batterie, redémarrage, distribution", () => {
    const s = analyzeSystem(HARDWARE_LINUX, { today: "2026-11-20" });
    expect(s.platform).toBe("linux");
    expect(s.kind).toBe("NVMe");
    expect(s.uptimeDays).toBe(8);
    expect(s.osLabel).toBe("Ubuntu 24.04.1 LTS");
    expect(s.findings.map((f) => f.key ?? f.id)).toEqual([
      "uptime-long-linux",
      "battery-worn",
    ]);
    expect(s.passed[0].label).toBe("Système sur un SSD NVMe");
  });

  it("lit l'activité : processeur, mémoire, programmes regroupés", () => {
    const a = analyzeActivity(parseBlocks(HARDWARE_LINUX), HARDWARE_LINUX);
    expect(a.cpuLoad).toBe(7);
    expect(a.memoryPct).toBe(59);
    expect(a.top[0]).toMatchObject({ name: "firefox", count: 2 });
  });

  it("le mode économie d'énergie se lit dans powerprofilesctl", () => {
    const s = analyzeSystem(
      HARDWARE_LINUX.replace("\nbalanced\n", "\npower-saver\n"),
      { today: "2026-11-20" },
    );
    expect(s.findings.map((f) => f.key)).toContain("power-saver-linux");
  });
});

describe("Linux — périphériques", () => {
  it("liste les appareils USB et les cartes son, sans les concentrateurs", () => {
    const r = analyzeDevices(DEVICES_LINUX);
    expect(r.platform).toBe("linux");
    const byGroup = Object.fromEntries(
      r.passed.map((p) => [p.vars.group, p.vars.names]),
    );
    expect(byGroup.camera).toBe("Logitech, Inc. StreamCam");
    expect(byGroup.audio).toBe(
      "Kingston Technology HyperX Cloud Alpha Wireless Headset, HDA Intel PCH",
    );
    expect(byGroup.bluetooth).toBe(
      "Intel Corp. Bluetooth 9460/9560 Jefferson Peak (JfP)",
    );
    expect(byGroup.usb).toBe("Logitech, Inc. Unifying Receiver");
  });
});

describe("Linux — rien ne déborde sur les autres systèmes", () => {
  it("les exemples Windows et macOS ne sont pas pris pour du Linux", async () => {
    const { HARDWARE_WINDOWS, HARDWARE_MAC } = await import("./examples.js");
    expect(analyzeComponents(HARDWARE_WINDOWS, { year: 2026 }).platform).toBe(
      "windows",
    );
    expect(analyzeSystem(HARDWARE_MAC, { today: "2026-11-20" }).platform).toBe(
      "mac",
    );
  });
});

describe("Linux — anglais", () => {
  it("traduit les constats et contrôles propres à Linux", async () => {
    const { EN, localize, passedLabel } = await import("./en.js");
    const hdd = HARDWARE_LINUX.replace(
      "nvme0n1      0 SAMSUNG",
      "nvme0n1      1 SAMSUNG",
    ).replace("\nbalanced\n", "\npower-saver\n");
    const s = analyzeSystem(hdd, { today: "2026-11-20" });
    for (const f of s.findings) {
      expect(EN.system).toHaveProperty(f.key ?? f.id);
      expect(localize(f, "en", "system").title).not.toBe(f.title);
    }
    const ok = analyzeSystem(HARDWARE_LINUX, { today: "2026-11-20" });
    expect(passedLabel(ok.passed[0], "en")).toBe("System on an NVMe SSD");
    const d = analyzeDevices(DEVICES_LINUX);
    expect(d.passed.map((p) => passedLabel(p, "en"))).toContain(
      "USB: Logitech, Inc. Unifying Receiver",
    );
  });
});
