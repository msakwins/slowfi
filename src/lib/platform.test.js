import { describe, it, expect } from "vitest";
import {
  windowsSupport,
  macSupport,
  startupNames,
  dateFr,
} from "./platform.js";
import { analyzeSystem } from "./system.js";
import { parseBlocks } from "./powershell.js";

const TODAY = "2026-11-20";

describe("version de Windows", () => {
  const win = (caption, build, dv) =>
    windowsSupport({ caption, build, displayVersion: dv }, TODAY);

  it("Windows 10 n'est plus suivi", () => {
    const s = win("Microsoft Windows 10 Entreprise", 19045, "22H2");
    expect(s.supported).toBe(false);
    expect(s.label).toBe("Windows 10 22H2");
    expect(s.end).toBe("2025-10-14");
  });

  it("tient compte de l'édition", () => {
    expect(win("Microsoft Windows 11 Famille", 26100, "24H2").supported).toBe(
      false,
    );
    expect(
      win("Microsoft Windows 11 Entreprise", 26100, "24H2").supported,
    ).toBe(true);
    expect(
      win("Microsoft Windows 11 Professionnel", 26200, "25H2").supported,
    ).toBe(true);
  });

  it("annonce une fin proche", () => {
    const s = windowsSupport(
      {
        caption: "Windows 11 Entreprise",
        build: 22631,
        displayVersion: "23H2",
      },
      "2026-09-01",
    );
    expect(s.ending).toBe(true);
  });

  it("suppose suivie une version plus récente que la table", () => {
    expect(win("Microsoft Windows 11 Famille", 26400, "26H2").supported).toBe(
      true,
    );
  });

  it("écarte les éditions LTSC", () => {
    expect(win("Microsoft Windows 10 Entreprise LTSC", 19044, null)).toBeNull();
  });

  it("écrit les dates en toutes lettres", () => {
    expect(dateFr("2025-10-14")).toBe("14 octobre 2025");
  });
});

describe("version de macOS", () => {
  it("suit les trois dernières versions", () => {
    expect(macSupport({ major: 27, version: "27.1" }, TODAY).supported).toBe(
      true,
    );
    expect(macSupport({ major: 26, version: "26.4" }, TODAY).supported).toBe(
      true,
    );
    expect(macSupport({ major: 15, version: "15.7" }, TODAY).supported).toBe(
      true,
    );
    expect(macSupport({ major: 14, version: "14.6" }, TODAY).supported).toBe(
      false,
    );
    expect(macSupport({ major: 14, version: "14.6" }, TODAY).label).toBe(
      "macOS 14.6 Sonoma",
    );
  });

  it("avant l'automne, la version de l'année n'est pas encore sortie", () => {
    expect(
      macSupport({ major: 14, version: "14.6" }, "2026-06-01").supported,
    ).toBe(true);
  });
});

// Sortie réelle (PC de bureau sous Windows 10), raccourcie.
const REAL = String.raw`Caption                : Microsoft Windows 10 Entreprise
Version                : 10.0.19045
BuildNumber            : 19045
TotalVisibleMemorySize : 33473532
FreePhysicalMemory     : 22578040

DisplayVersion : 22H2
UBR            : 6456

Command  : C:\Windows\SysWOW64\OneDriveSetup.exe /thfirstsetup
User     : AUTORITE NT\SERVICE LOCAL
Location : HKU\S-1-5-19\SOFTWARE\Microsoft\Windows\CurrentVersion\Run

Command  : "C:\Users\Me\AppData\Local\Microsoft\OneDrive\OneDrive.exe" /background
User     : PC\Me
Location : HKU\S-1-5-21-1-2-3-1001\SOFTWARE\Microsoft\Windows\CurrentVersion\Run

Command  : "G:\Games\Steam\steam.exe" -silent
User     : PC\Me
Location : HKU\S-1-5-21-1-2-3-1001\SOFTWARE\Microsoft\Windows\CurrentVersion\Run

Command  : "C:\Users\Me\AppData\Local\Discord\Update.exe" --processStart Discord.exe --process-start-args
           --start-minimized
User     : PC\Me
Location : HKU\S-1-5-21-1-2-3-1001\SOFTWARE\Microsoft\Windows\CurrentVersion\Run

Command  : %windir%\system32\SecurityHealthSystray.exe
User     : Public
Location : HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`;

describe("système complet", () => {
  it("lit les programmes au démarrage sans les comptes de service", () => {
    const names = startupNames(parseBlocks(REAL).filter((f) => "Command" in f));
    expect(names).toEqual([
      "OneDrive",
      "steam",
      "Discord",
      "SecurityHealthSystray",
    ]);
  });

  it("signale Windows 10 en tête et liste le démarrage", () => {
    const r = analyzeSystem(REAL, { today: TODAY });
    expect(r.findings[0].key).toBe("windows10-unsupported");
    expect(r.findings[0].title).toBe(
      "Windows 10 22H2 : plus de mises à jour de sécurité",
    );
    expect(r.severity).toBe("problem");
    expect(r.passed.map((p) => p.id)).toContain("startup-ok");
  });

  it("signale plus de 15 programmes au démarrage", () => {
    const many = Array.from(
      { length: 16 },
      (_, i) =>
        `Command  : C:\p\app${i}.exe\nUser     : PC\Me\nLocation : HKU\S-1-5-21-1\Run`,
    ).join("\n\n");
    const r = analyzeSystem(many, { today: TODAY });
    expect(r.findings[0].id).toBe("startup-many");
  });

  it("mesure l'usure de la batterie", () => {
    const bat = (full) =>
      analyzeSystem(
        `DesignedCapacity : 50000\n\nFullChargedCapacity : ${full}\n\nCommand : a.exe\nUser : Me\nLocation : HKU\S-1-5-21\Run`,
        { today: TODAY },
      );
    expect(bat(46000).passed.map((p) => p.id)).toContain("battery-ok");
    expect(bat(35000).findings[0]).toMatchObject({ id: "battery-worn" });
    expect(bat(35000).severity).toBe("warning");
    expect(bat(25000).severity).toBe("problem");
  });

  it("lit la batterie et la version d'un Mac", () => {
    const raw =
      "ProductName: macOS\nProductVersion: 14.6.1\n\n      Health Information:\n          Cycle Count: 812\n          Condition: Service Recommended\n          Maximum Capacity: 71%";
    const r = analyzeSystem(raw, { today: TODAY });
    expect(r.platform).toBe("mac");
    expect(r.findings.map((f) => f.id)).toEqual([
      "macos-unsupported",
      "battery-worn",
    ]);
    expect(r.severity).toBe("problem");
  });
});

describe("versions récentes de Windows 11", () => {
  it("connaît 26H2 et 26H1, avec les dates publiées par Microsoft", () => {
    const h2 = windowsSupport(
      { caption: "Windows 11 Famille", build: 26300, displayVersion: "26H2" },
      TODAY,
    );
    expect(h2).toMatchObject({
      label: "Windows 11 26H2",
      end: "2028-10-09",
      supported: true,
    });
    const h1 = windowsSupport(
      {
        caption: "Windows 11 Entreprise",
        build: 28000,
        displayVersion: "26H1",
      },
      TODAY,
    );
    expect(h1).toMatchObject({ end: "2029-03-13", supported: true });
  });
});
