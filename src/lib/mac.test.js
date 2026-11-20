import { describe, it, expect } from "vitest";
import {
  parseWifi,
  parseAirport,
  isWired,
  diagnose,
  compareWithLine,
} from "./diagnostic.js";
import { diagnoseStorage, parseMacDisk } from "./storage.js";
import { analyzeComponents, parseMacMemory } from "./components.js";
import {
  WIFI_WINDOWS,
  WIFI_MAC,
  WIFI_WIRED_WINDOWS,
  HARDWARE_WINDOWS,
  HARDWARE_MAC,
  MEMORY_MAC_INTEL,
} from "./examples.js";

describe("Wi-Fi sur macOS", () => {
  it("lit le réseau courant et ignore les réseaux voisins", () => {
    const d = parseAirport(WIFI_MAC);
    expect(d.ssid).toBe("Livebox-A030");
    expect(d.radio).toBe("802.11ac");
    expect(d.channel).toBe(36);
    expect(d.band).toBe("5 GHz");
    expect(d.rx).toBe(390);
  });

  it("convertit le signal en dBm vers l'échelle en %", () => {
    expect(parseAirport(WIFI_MAC).signal).toBe(66); // -67 dBm
  });

  it("reconnaît le format tout seul", () => {
    expect(parseWifi(WIFI_MAC).band).toBe("5 GHz");
    expect(parseWifi(WIFI_WINDOWS).channel).toBe(1);
  });

  it("donne un verdict avec les mêmes règles", () => {
    const r = diagnose(parseWifi(WIFI_MAC));
    expect(r.band).toBe("5 GHz");
    expect(r.estimatedReal).toBe(195);
  });
});

describe("connexion filaire", () => {
  it("reconnaît une carte Wi-Fi déconnectée sous Windows", () => {
    expect(isWired(WIFI_WIRED_WINDOWS)).toBe(true);
  });

  it("reconnaît l'absence de carte Wi-Fi", () => {
    expect(isWired("Il n'y a aucune interface sans fil sur le système.")).toBe(
      true,
    );
    expect(isWired("There is no wireless interface on the system.")).toBe(true);
  });

  it("reconnaît un Mac au Wi-Fi éteint", () => {
    expect(
      isWired("Interfaces:\n  en0:\n    Card Type: Wi-Fi\n    Status: Off\n"),
    ).toBe(true);
  });

  it("ne se déclenche pas sur une connexion Wi-Fi active", () => {
    expect(isWired(WIFI_WINDOWS)).toBe(false);
    expect(isWired(WIFI_MAC)).toBe(false);
  });
});

describe("comparaison avec le test de débit", () => {
  const wifi = diagnose(parseWifi(WIFI_WINDOWS)); // ~72 Mb/s possibles

  it("désigne le Wi-Fi quand le test approche son maximum", () => {
    const r = compareWithLine(wifi, 68);
    expect(r.findings[0].id).toBe("wifi-limits-line");
    expect(r.findings[0].vars).toEqual({ measured: 68, capacity: 72 });
  });

  it("désigne la ligne quand le Wi-Fi a de la marge", () => {
    const fast = diagnose(parseWifi(WIFI_MAC)); // ~195 Mb/s possibles
    const r = compareWithLine(fast, 40);
    expect(r.findings[0].id).toBe("line-limits");
  });

  it("passe un Wi-Fi sain en « à surveiller » s'il plafonne", () => {
    const healthy = diagnose({
      radio: "802.11ax",
      channel: 36,
      signal: 90,
      rx: 600,
    });
    expect(healthy.severity).toBe("ok");
    expect(compareWithLine(healthy, 290).severity).toBe("warning");
  });

  it("écarte un test fait sur une autre connexion", () => {
    const r = compareWithLine(wifi, 558);
    expect(r.findings[0].id).toBe("measured-above-wifi");
    expect(r.severity).toBe(wifi.severity);
  });

  it("ne change rien sans test de débit", () => {
    expect(compareWithLine(wifi, null)).toBe(wifi);
  });
});

describe("matériel sur macOS", () => {
  it("lit le volume de démarrage", () => {
    const [v] = parseMacDisk(HARDWARE_MAC);
    expect(v.name).toBe("Macintosh HD");
    expect(v.size).toBe(245107195904);
    expect(v.free).toBe(23529717760);
    expect(v.smart).toBe("Verified");
  });

  it("signale un disque presque plein", () => {
    const { volumes } = diagnoseStorage(HARDWARE_MAC);
    expect(volumes).toHaveLength(1);
    expect(volumes[0].findings[0].id).toBe("disk-low");
    expect(volumes[0].findings[0].title).toMatch(/^Macintosh HD presque plein/);
  });

  it("signale un disque défaillant", () => {
    const failing = HARDWARE_MAC.replace(
      "SMART Status:              Verified",
      "SMART Status:              Failing",
    );
    const [v] = diagnoseStorage(failing).volumes;
    expect(v.severity).toBe("problem");
    expect(v.findings.some((f) => f.id === "smart-failing")).toBe(true);
  });

  it("lit la mémoire unifiée sans la croire en simple canal", () => {
    const c = analyzeComponents(HARDWARE_MAC, { year: 2026 });
    expect(c.platform).toBe("mac");
    expect(c.totalGB).toBe(16);
    expect(c.findings.map((f) => f.key ?? f.id)).toEqual(["healthy-mac"]);
  });

  it("lit les barrettes d'un Mac Intel et ignore les emplacements vides", () => {
    const m = parseMacMemory(MEMORY_MAC_INTEL);
    expect(m).toHaveLength(1);
    expect(m[0].rated).toBe(2667);
    const c = analyzeComponents(MEMORY_MAC_INTEL, { year: 2026 });
    expect(c.findings[0].id).toBe("ram-single-channel");
  });

  it("ne confond pas une sortie Windows avec un Mac", () => {
    expect(parseMacDisk(HARDWARE_WINDOWS)).toEqual([]);
    expect(analyzeComponents(HARDWARE_WINDOWS, { year: 2026 }).platform).toBe(
      "windows",
    );
  });
});
