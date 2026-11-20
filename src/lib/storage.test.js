import { describe, it, expect } from "vitest";
import { toGB, parseVolumes, freePercent, gradeVolume, diagnoseStorage } from "./storage.js";

// Sortie réelle d'une machine dont le disque système portait une MFT abîmée
// pendant six semaines sans symptôme visible, et dont le disque de données
// était arrivé à 4,8 % d'espace libre.
const RAW = `
DriveLetter       : C
FileSystemLabel   :
Size              : 249382825984
SizeRemaining     : 34285633536
HealthStatus      : Warning
OperationalStatus : Full Repair Needed

DriveLetter       : G
FileSystemLabel   : HDD
Size              : 966367641600
SizeRemaining     : 45969080320
HealthStatus      : Healthy
OperationalStatus : OK
`;

describe("toGB", () => {
  it("convertit des octets en gigaoctets binaires", () => {
    expect(toGB(1024 ** 3)).toBe(1);
    expect(toGB(249382825984)).toBe(232.3);
  });

  it("laisse passer null", () => {
    expect(toGB(null)).toBeNull();
  });
});

describe("parseVolumes", () => {
  it("extrait un volume par bloc", () => {
    const v = parseVolumes(RAW);
    expect(v).toHaveLength(2);
    expect(v[0].driveLetter).toBe("C");
    expect(v[1].driveLetter).toBe("G");
  });

  it("lit les tailles et l'état", () => {
    const [c] = parseVolumes(RAW);
    expect(c.size).toBe(249382825984);
    expect(c.free).toBe(34285633536);
    expect(c.health).toBe("Warning");
    expect(c.operational).toBe("Full Repair Needed");
  });

  it("traite un libellé vide comme absent", () => {
    const [c, g] = parseVolumes(RAW);
    expect(c.label).toBeNull();
    expect(g.label).toBe("HDD");
  });

  it("ignore les blocs sans lettre de lecteur ni taille", () => {
    expect(parseVolumes("DriveLetter :\nSize :\n")).toEqual([]);
    expect(parseVolumes("")).toEqual([]);
    expect(parseVolumes("   ")).toEqual([]);
  });
});

describe("freePercent", () => {
  it("calcule la part d'espace libre", () => {
    expect(freePercent({ size: 1000, free: 137 })).toBe(13.7);
  });

  it("renvoie null si la taille manque", () => {
    expect(freePercent({ size: null, free: 100 })).toBeNull();
  });
});

describe("gradeVolume", () => {
  const vol = (over) => ({
    driveLetter: "C",
    label: null,
    size: 100 * 1024 ** 3,
    free: 50 * 1024 ** 3,
    health: "Healthy",
    operational: "OK",
    ...over,
  });

  it("valide un volume sain et spacieux", () => {
    const r = gradeVolume(vol());
    expect(r.severity).toBe("ok");
    expect(r.findings[0].id).toBe("healthy");
  });

  it("alerte sous 15 % d'espace libre sans crier au problème", () => {
    const r = gradeVolume(vol({ free: 13 * 1024 ** 3 }));
    expect(r.severity).toBe("warning");
    expect(r.findings.some((f) => f.id === "disk-low")).toBe(true);
  });

  it("escalade en problème sous 5 %", () => {
    const r = gradeVolume(vol({ free: 4 * 1024 ** 3 }));
    expect(r.severity).toBe("problem");
    expect(r.findings.some((f) => f.id === "disk-critical")).toBe(true);
  });

  it("réclame une marge absolue sur le disque système", () => {
    // 18 Go libres sur 100 : 18 % — au-dessus du seuil relatif, mais trop peu
    // en valeur absolue pour une mise à jour de fonctionnalité.
    const r = gradeVolume(vol({ free: 18 * 1024 ** 3 }), { system: true });
    expect(r.findings.some((f) => f.id === "no-update-headroom")).toBe(true);
  });

  it("n'applique pas la marge de mise à jour à un disque de données", () => {
    const r = gradeVolume(vol({ free: 18 * 1024 ** 3 }), { system: false });
    expect(r.findings.some((f) => f.id === "no-update-headroom")).toBe(false);
  });

  it("détecte un système de fichiers à réparer", () => {
    const r = gradeVolume(vol({ health: "Warning", operational: "Full Repair Needed" }));
    expect(r.severity).toBe("problem");
    const f = r.findings.find((x) => x.id === "fs-damaged");
    expect(f).toBeDefined();
    expect(f.fix).toContain("chkdsk C: /f");
  });

  it("accepte un état d'intégrité localisé en français", () => {
    const r = gradeVolume(vol({ health: "Sain" }));
    expect(r.findings.some((f) => f.id === "fs-damaged")).toBe(false);
  });

  it("expose les tailles converties pour l'affichage", () => {
    const r = gradeVolume(vol());
    expect(r.sizeGB).toBe(100);
    expect(r.freeGB).toBe(50);
    expect(r.pct).toBe(50);
  });
});

describe("diagnoseStorage", () => {
  it("note chaque volume et retient la pire gravité", () => {
    const { volumes, severity } = diagnoseStorage(RAW);

    expect(volumes).toHaveLength(2);
    expect(severity).toBe("problem");
  });

  it("repère C: comme disque système", () => {
    const { volumes } = diagnoseStorage(RAW);
    const c = volumes.find((v) => v.driveLetter === "C");

    // 13,7 % : sous le seuil de confort, et la MFT est signalée abîmée.
    expect(c.pct).toBe(13.7);
    expect(c.severity).toBe("problem");
    expect(c.findings.map((f) => f.id)).toEqual(
      expect.arrayContaining(["disk-low", "fs-damaged"]),
    );
  });

  it("voit la saturation du disque de données", () => {
    const { volumes } = diagnoseStorage(RAW);
    const g = volumes.find((v) => v.driveLetter === "G");

    expect(g.pct).toBe(4.8);
    expect(g.findings.some((f) => f.id === "disk-critical")).toBe(true);
  });

  it("renvoie un verdict vide pour une entrée vide", () => {
    expect(diagnoseStorage("")).toEqual({ volumes: [], severity: "ok" });
  });
});
