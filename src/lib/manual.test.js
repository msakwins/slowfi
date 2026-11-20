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
