import { describe, it, expect } from "vitest";
import { diagnosticIntro } from "./intro.js";

const all = { network: true, hardware: true, devices: true };

describe("phrase d'introduction du diagnostic", () => {
  it("suit les analyses choisies, en français", () => {
    expect(diagnosticIntro(all, "fr")).toBe(
      "Contrôle du réseau local, du matériel et des périphériques",
    );
    expect(diagnosticIntro({ network: true }, "fr")).toBe(
      "Contrôle du réseau local",
    );
    expect(diagnosticIntro({ hardware: true, devices: true }, "fr")).toBe(
      "Contrôle du matériel et des périphériques",
    );
  });

  it("et en anglais", () => {
    expect(diagnosticIntro(all, "en")).toBe(
      "Checks the local network, hardware and devices",
    );
    expect(diagnosticIntro({ hardware: true }, "en")).toBe(
      "Checks the hardware",
    );
  });

  it("ne dit rien quand rien n'est choisi", () => {
    expect(diagnosticIntro({}, "fr")).toBeNull();
  });
});
