import { describe, it, expect } from "vitest";
import {
  makeSnapshot,
  compareSnapshots,
  pushSnapshot,
  MAX_SNAPSHOTS,
} from "./snapshots.js";

const res = (over = {}) => ({
  network: {
    signal: 62,
    linkRate: 433,
    band: "5 GHz",
    findings: [{ id: "weak-signal", level: "warning", title: "Signal faible" }],
  },
  hardware: {
    system: { findings: [], env: { battery: null } },
    components: {
      totalGB: 32,
      findings: [
        { id: "healthy", level: "ok", title: "x" },
        { id: "gpu-driver-old", level: "warning", title: "Pilote ancien" },
      ],
    },
    events: { findings: [] },
    volumes: [{ driveLetter: "C", size: 250e9, free: 23.7e9, findings: [] }],
    drivers: [
      {
        key: "PCI\\VEN_8086&DEV_A370",
        name: "Intel Wi-Fi",
        version: "23.150.0.4",
      },
    ],
  },
  devices: { findings: [] },
  ...over,
});

describe("historique des analyses", () => {
  it("garde constats et valeurs, sans les contrôles réussis", () => {
    const s = makeSnapshot(res(), { download: 312.4, now: 1 });
    expect(s.level).toBe("warning");
    expect(s.findings.map((f) => f.id)).toEqual([
      "wifi:weak-signal",
      "components:gpu-driver-old",
    ]);
    expect(s.values).toMatchObject({
      download: { value: 312, unit: "Mb/s" },
      "wifi:signal": { value: 62 },
      "free:C": { value: 23.7, unit: "Go" },
      "driver:PCI\\VEN_8086&DEV_A370": { value: "23.150.0.4" },
      memory: { value: 32 },
    });
  });

  it("compare avant et après : résolu, nouveau, changé", () => {
    const before = makeSnapshot(res(), { download: 120, now: 1 });
    const after = makeSnapshot(
      res({
        network: { signal: 80, linkRate: 866, band: "5 GHz", findings: [] },
        hardware: {
          ...res().hardware,
          drivers: [
            {
              key: "PCI\\VEN_8086&DEV_A370",
              name: "Intel Wi-Fi",
              version: "24.80.0.2",
            },
          ],
          events: {
            findings: [
              { id: "gpu-crashes", level: "warning", title: "Pilote planté" },
            ],
          },
        },
      }),
      { download: 310, now: 2 },
    );
    const d = compareSnapshots(before, after);
    expect(d.fixed.map((f) => f.id)).toEqual(["wifi:weak-signal"]);
    expect(d.added.map((f) => f.id)).toEqual(["events:gpu-crashes"]);
    expect(d.changed.map((c) => [c.key, c.from, c.to])).toEqual([
      ["download", 120, 310],
      ["wifi:signal", 62, 80],
      ["wifi:link", 433, 866],
      ["driver:PCI\\VEN_8086&DEV_A370", "23.150.0.4", "24.80.0.2"],
    ]);
  });

  it("garde au plus 50 relevés, le plus récent en tête", () => {
    let list = [];
    for (let i = 0; i < MAX_SNAPSHOTS + 5; i++)
      list = pushSnapshot(list, { t: i, findings: [], values: {} });
    expect(list).toHaveLength(MAX_SNAPSHOTS);
    expect(list[0].t).toBe(MAX_SNAPSHOTS + 4);
  });
});
