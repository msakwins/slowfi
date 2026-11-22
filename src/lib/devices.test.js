import { describe, it, expect } from "vitest";
import {
  parsePnp,
  parseMacDevices,
  analyzeDevices,
  parseAudioEndpoints,
  parsePrivacy,
  parseServices,
} from "./devices.js";
import { troubleshoot } from "./troubleshoot.js";
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

describe("audio, confidentialité et services sous Windows", () => {
  const PATH = String.raw`Microsoft.PowerShell.Core\Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio`;
  const CONSENT = String.raw`Microsoft.PowerShell.Core\Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore`;
  const PNP = `Name : Microphone (Jabra)\nPNPClass : AudioEndpoint\nStatus : OK\nConfigManagerErrorCode : 0`;
  const ID = String.raw`\Capture\{11111111-1111-1111-1111-111111111111}`;
  const mic = (state, fx = "") =>
    `PSPath : ${PATH}${ID}\nDeviceState : ${state}\n\n` +
    `PSPath : ${PATH}${ID}\\Properties\n{a45c254e-df1c-4efd-8020-67d146a850e0},2 : Microphone\n{b3f8fa53-0004-438e-9003-51a46e139bfc},6 : Jabra\n\n` +
    `PSPath : ${PATH}${ID}\\FxProperties\n${fx}`;
  const VC = String.raw`{9e6136e0-57ab-4949-b57a-3627be142855},100 : SWD\DRIVERENUM\{96bedf2c}#VocaEffectPack&1`;

  it("réunit état, nom et effets de chaque entrée audio", () => {
    expect(parseAudioEndpoints(mic(268435457, VC))).toEqual([
      {
        id: "{11111111-1111-1111-1111-111111111111}",
        flow: "capture",
        name: "Microphone (Jabra)",
        state: "active",
        effects: true,
        voiceClarity: true,
      },
    ]);
    const off = parseAudioEndpoints(
      mic(1, `{1da5d803-d492-4edd-8c23-e0c0ffee7f0e},5 : 1\n${VC}`),
    );
    expect(off[0].effects).toBe(false);
  });

  it("ne fait pas de Voice Clarity un problème général", () => {
    const r = analyzeDevices(`${PNP}\n\n${mic(1, VC)}`);
    expect(r.severity).toBe("ok");
    expect(r.findings.map((f) => f.key)).toEqual(["healthy"]);
  });

  it("désigne Voice Clarity quand on choisit le micro qui ne marche pas", () => {
    const r = analyzeDevices(`${PNP}\n\n${mic(1, VC)}`);
    const t = troubleshoot(r, { name: "Microphone (Jabra)", group: "audio" });
    expect(t.kind).toBe("mic");
    expect(t.found.map((f) => f.key)).toEqual(["voice-clarity"]);
    expect(t.tips[0].key).toBe("tip-mic-mute");
  });

  it("signale l'accès au micro bloqué pour les applications de bureau", () => {
    const r = analyzeDevices(
      `${PNP}\n\nPSPath : ${CONSENT}\\microphone\nValue : Allow\n\nPSPath : ${CONSENT}\\microphone\\NonPackaged\nValue : Deny`,
    );
    expect(parsePrivacy(`PSPath : ${CONSENT}\\webcam\nValue : Deny`)).toEqual([
      { what: "webcam", scope: "user", allowed: false },
    ]);
    expect(r.severity).toBe("problem");
    expect(r.findings[0].key).toBe("privacy-denied");
    expect(r.findings[0].vars.scope).toBe("desktop");
    const t = troubleshoot(r, { name: "Microphone (Jabra)", group: "audio" });
    expect(t.found.map((f) => f.key)).toContain("privacy-denied");
  });

  it("signale le service audio arrêté, pas le Bluetooth à la demande", () => {
    const r = analyzeDevices(
      `${PNP}\n\nName : Audiosrv\nStatus : Stopped\nStartType : Automatic\n\nName : bthserv\nStatus : Stopped\nStartType : Manual`,
    );
    expect(
      parseServices("Name : Spooler\nStatus : Running\nStartType : Disabled")[0]
        .disabled,
    ).toBe(true);
    expect(r.findings.map((f) => f.id)).toEqual(["service-Audiosrv"]);
  });

  it("signale l'absence de micro actif quand le seul est désactivé", () => {
    const r = analyzeDevices(`${PNP}\n\n${mic(2)}`);
    expect(r.findings[0].key).toBe("audio-none-active");
  });

  it("donne des vérifications pour chaque type d'appareil, en anglais aussi", async () => {
    const { localize } = await import("./en.js");
    const r = analyzeDevices(DEVICES_WINDOWS);
    const kinds = new Set();
    for (const d of [...r.devices, null]) {
      const t = troubleshoot(r, d);
      kinds.add(t.kind);
      expect(t.tips.length).toBeGreaterThan(0);
      for (const x of [...t.found, ...t.tips]) {
        expect(localize(x, "en", "devices").title).not.toBe(x.title);
      }
    }
    expect([...kinds].sort()).toEqual(
      [
        "bluetooth",
        "camera",
        "keyboard",
        "mic",
        "missing",
        "monitor",
        "mouse",
        "other",
        "output",
      ].sort(),
    );
  });
});
