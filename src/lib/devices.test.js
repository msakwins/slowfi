import { describe, it, expect } from "vitest";
import { parsePnp, parseMacDevices, analyzeDevices } from "./devices.js";
import { DEVICES_WINDOWS, DEVICES_MAC } from "./examples.js";

describe("périphériques sous Windows", () => {
  it("dédoublonne les appareils listés plusieurs fois", () => {
    const names = parsePnp(DEVICES_WINDOWS).map((d) => d.name);
    expect(names.filter((n) => n === "Périphérique clavier IHM")).toHaveLength(
      1,
    );
  });

  it("signale le périphérique sans pilote", () => {
    const r = analyzeDevices(DEVICES_WINDOWS);
    expect(r.severity).toBe("problem");
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].key).toBe("device-no-driver");
    expect(r.findings[0].title).toBe("Pilote manquant : Synthetic Gamepad");
  });

  it("range les appareils par catégorie, sans les entrées techniques", () => {
    const r = analyzeDevices(DEVICES_WINDOWS);
    const byGroup = Object.fromEntries(
      r.passed.map((p) => [p.vars.group, p.vars.names]),
    );
    expect(byGroup.audio).toBe(
      "Casque (HyperX Cloud Alpha Wireless), Microphone (HyperX Cloud Alpha Wireless), Microphone (Logitech StreamCam), BenQ GW2480 (NVIDIA High Definition Audio)",
    );
    expect(byGroup.camera).toBe("Logitech StreamCam");
    expect(byGroup.bluetooth).toBe(
      "Intel(R) Wireless Bluetooth(R), JBL TUNE FLEX",
    );
    expect(byGroup.keyboard).toBe("Périphérique clavier IHM");
    expect(byGroup.monitor).toBe("Moniteur Plug-and-Play générique");
  });

  it("distingue désactivé, arrêté et ignore les appareils débranchés (code 45)", () => {
    const one = (code) =>
      analyzeDevices(
        `Name : Webcam\nPNPClass : Camera\nStatus : Error\nConfigManagerErrorCode : ${code}`,
      );
    expect(one(22).findings[0].key).toBe("device-disabled");
    expect(one(22).severity).toBe("warning");
    expect(one(43).findings[0].key).toBe("device-stopped");
    expect(one(10).findings[0].key).toBe("device-error");
    expect(one(45).findings[0].id).toBe("healthy");
  });

  it("ne voit rien dans un texte sans rapport", () => {
    expect(analyzeDevices("bonjour")).toBeNull();
  });
});

describe("périphériques sous macOS", () => {
  it("liste les appareils de chaque section", () => {
    const d = parseMacDevices(DEVICES_MAC);
    expect(d).toEqual([
      { name: "MacBook Pro Microphone", group: "audio" },
      { name: "MacBook Pro Speakers", group: "audio" },
      { name: "AirPods Pro", group: "bluetooth" },
      { name: "Magic Mouse", group: "bluetooth" },
      { name: "FaceTime HD Camera", group: "camera" },
      { name: "Color LCD", group: "monitor" },
      { name: "DELL U2720Q", group: "monitor" },
    ]);
  });

  it("ne signale rien, faute d'état d'erreur sur macOS", () => {
    const r = analyzeDevices(DEVICES_MAC);
    expect(r.platform).toBe("mac");
    expect(r.findings[0].key).toBe("healthy-mac");
  });
});

describe("périphériques en anglais", () => {
  it("traduit chaque constat et chaque catégorie", async () => {
    const { localize, passedLabel } = await import("./en.js");
    const one = (code) =>
      analyzeDevices(
        `Name : Webcam\nPNPClass : Camera\nStatus : Error\nConfigManagerErrorCode : ${code}`,
      );
    const results = [
      analyzeDevices(DEVICES_WINDOWS),
      analyzeDevices(DEVICES_MAC),
      one(22),
      one(43),
      one(10),
    ];
    for (const r of results) {
      for (const f of r.findings) {
        const en = localize(f, "en", "devices");
        expect(en.title).not.toBe(f.title);
        expect(Boolean(en.fix)).toBe(Boolean(f.fix));
      }
      for (const p of r.passed) expect(passedLabel(p, "en")).not.toBe(p.label);
    }
  });
});
