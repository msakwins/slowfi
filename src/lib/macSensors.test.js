import { describe, it, expect } from "vitest";
import {
  parseMacDisks,
  parsePowermetrics,
  pressureLevel,
} from "./macSensors.js";

const PROFILER = `NVMExpress:

    Apple SSD Controller:

        APPLE SSD AP0512Q:

          Capacity: 500,28 GB (500 277 790 720 bytes)
          Model: APPLE SSD AP0512Q
          S.M.A.R.T. status: Verified

SATA/SATA Express:

    Intel 8 Series Chipset:

        WDC WD10EZEX:

          Model: WDC WD10EZEX-08WN4A0
          Medium Type: Rotational
          S.M.A.R.T. status: Failing
`;

const POWERMETRICS = `**** SMC sensors ****

Fan: 1796.61 rpm
CPU die temperature: 61.94 C (fan)
GPU die temperature: 55.00 C

**** Thermal pressure ****

Current pressure level: Nominal
`;

describe("capteurs macOS", () => {
  it("lit les disques et leur état SMART", () => {
    expect(parseMacDisks(PROFILER)).toEqual([
      {
        name: "APPLE SSD AP0512Q",
        media: "SSD",
        bus: "NVMe",
        smart: "Verified",
      },
      {
        name: "WDC WD10EZEX-08WN4A0",
        media: "HDD",
        bus: "SATA",
        smart: "Failing",
      },
    ]);
  });

  it("lit températures, ventilateurs et niveau de chauffe", () => {
    expect(parsePowermetrics(POWERMETRICS)).toEqual({
      zones: [
        { name: "Processeur", celsius: 61.9 },
        { name: "Puce graphique", celsius: 55 },
      ],
      fans: [{ name: "Ventilateur 1", rpm: 1797 }],
      pressure: "Nominal",
    });
    // Apple Silicon : seulement le niveau de chauffe.
    expect(parsePowermetrics("Current pressure level: Serious").pressure).toBe(
      "Serious",
    );
  });

  it("traduit le niveau de chauffe", () => {
    expect(pressureLevel("Nominal")).toBe("ok");
    expect(pressureLevel("Fair")).toBe("warning");
    expect(pressureLevel("Serious")).toBe("problem");
    expect(pressureLevel(null)).toBe("unknown");
  });
});
