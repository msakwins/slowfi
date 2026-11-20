import { describe, it, expect } from "vitest";
import {
  parseComponents,
  totalMemoryGB,
  diagnoseComponents,
  analyzeComponents,
} from "./components.js";

// Machine réelle, avant correction : 32 Go vendus pour 2666 MHz mais appliqués
// à 2133 faute de profil XMP, un pilote graphique figé depuis deux ans, et le
// BIOS d'origine de 2019 jamais mis à jour.
const RAW = `
DeviceLocator        : ChannelA-DIMM2
Capacity             : 17179869184
Speed                : 2666
ConfiguredClockSpeed : 2133

DeviceLocator        : ChannelB-DIMM2
Capacity             : 17179869184
Speed                : 2666
ConfiguredClockSpeed : 2133

Name          : NVIDIA GeForce GTX 1660 Ti
DriverVersion : 32.0.15.6094
DriverDate    : 14/08/2024 02:00:00

Manufacturer      : American Megatrends Inc.
SMBIOSBIOSVersion : 1303
ReleaseDate       : 20/03/2019 01:00:00
`;

describe("parseComponents", () => {
  it("trie les blocs par nature", () => {
    const c = parseComponents(RAW);
    expect(c.memory).toHaveLength(2);
    expect(c.gpus).toHaveLength(1);
    expect(c.bios).not.toBeNull();
  });

  it("lit les fréquences nominale et appliquée", () => {
    const [m] = parseComponents(RAW).memory;
    expect(m.slot).toBe("ChannelA-DIMM2");
    expect(m.rated).toBe(2666);
    expect(m.configured).toBe(2133);
  });

  it("retient l'année des dates localisées sans deviner le jour", () => {
    const c = parseComponents(RAW);
    expect(c.gpus[0].driverYear).toBe(2024);
    expect(c.bios.year).toBe(2019);
  });

  it("accepte un collage partiel", () => {
    const c = parseComponents("DeviceLocator : A1\nCapacity : 8589934592\nSpeed : 3200\n");
    expect(c.memory).toHaveLength(1);
    expect(c.gpus).toEqual([]);
    expect(c.bios).toBeNull();
  });

  it("ne trouve rien dans une entrée vide", () => {
    expect(parseComponents("")).toEqual({ memory: [], gpus: [], bios: null });
  });
});

describe("totalMemoryGB", () => {
  it("additionne les barrettes", () => {
    expect(totalMemoryGB(parseComponents(RAW).memory)).toBe(32);
  });

  it("renvoie null sans barrette", () => {
    expect(totalMemoryGB([])).toBeNull();
  });
});

describe("diagnoseComponents", () => {
  const healthy = {
    memory: [
      { slot: "A1", capacity: 17179869184, rated: 3200, configured: 3200 },
      { slot: "B1", capacity: 17179869184, rated: 3200, configured: 3200 },
    ],
    gpus: [{ name: "GPU", driverVersion: "1.0", driverYear: 2026 }],
    bios: { vendor: "ASUS", version: "3001", year: 2026 },
  };

  it("ne signale rien sur une machine bien réglée", () => {
    const r = diagnoseComponents(healthy, { year: 2026 });
    expect(r.severity).toBe("ok");
    expect(r.findings[0].id).toBe("healthy");
  });

  it("détecte la mémoire bridée et chiffre la perte", () => {
    const r = analyzeComponents(RAW, { year: 2026 });
    const f = r.findings.find((x) => x.id === "ram-underclocked");
    expect(f).toBeDefined();
    expect(f.title).toContain("2133");
    expect(f.title).toContain("2666");
    // Perte par rapport à la fréquence nominale : (2666 - 2133) / 2666 ≈ 20 %,
    // et non 25 %, qui serait le gain rapporté à la fréquence appliquée.
    expect(f.detail).toContain("20 %");
  });

  it("signale une barrette seule", () => {
    const r = diagnoseComponents(
      { ...healthy, memory: [healthy.memory[0]] },
      { year: 2026 },
    );
    expect(r.findings.some((f) => f.id === "ram-single-channel")).toBe(true);
  });

  it("ne crie pas au simple canal avec deux barrettes", () => {
    const r = diagnoseComponents(healthy, { year: 2026 });
    expect(r.findings.some((f) => f.id === "ram-single-channel")).toBe(false);
  });

  it("signale un pilote graphique de deux ans ou plus", () => {
    const r = analyzeComponents(RAW, { year: 2026 });
    expect(r.findings.some((f) => f.id.startsWith("gpu-driver-stale"))).toBe(true);
  });

  it("laisse passer un pilote de l'an dernier", () => {
    const r = diagnoseComponents(
      { ...healthy, gpus: [{ name: "GPU", driverYear: 2025 }] },
      { year: 2026 },
    );
    expect(r.findings.some((f) => f.id.startsWith("gpu-driver-stale"))).toBe(false);
  });

  it("escalade un BIOS de six ans et plus en problème", () => {
    const r = analyzeComponents(RAW, { year: 2026 });
    expect(r.severity).toBe("problem");
    const f = r.findings.find((x) => x.id === "bios-ancient");
    expect(f.title).toContain("7 ans");
  });

  it("se contente d'un avertissement entre quatre et six ans", () => {
    const r = diagnoseComponents(
      { ...healthy, bios: { vendor: "ASUS", version: "1", year: 2021 } },
      { year: 2026 },
    );
    expect(r.severity).toBe("warning");
    expect(r.findings.some((f) => f.id === "bios-stale")).toBe(true);
  });

  it("ignore un firmware dont la date est illisible", () => {
    const r = diagnoseComponents(
      { ...healthy, bios: { vendor: "ASUS", version: "1", year: null } },
      { year: 2026 },
    );
    expect(r.findings.some((f) => f.id.startsWith("bios-"))).toBe(false);
  });

  it("expose le total mémoire pour l'affichage", () => {
    expect(analyzeComponents(RAW, { year: 2026 }).totalGB).toBe(32);
  });
});
