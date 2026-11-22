import { describe, it, expect } from "vitest";
import { recommendParts } from "./parts.js";
import { shopLinks } from "./shopLinks.js";

const healthy = {
  disks: [
    {
      name: "Samsung SSD 970 EVO Plus 250GB",
      mediaType: "SSD",
      busType: "NVMe",
      health: "Healthy",
      size: 250059350016,
      uncorrected: 0,
    },
  ],
  ssdHealth: [
    { name: "Samsung SSD 970 EVO Plus 250GB", wear: 7, alerts: [], spare: 100 },
  ],
  memory: [{ capacity: 17179869184, type: "DDR4", formFactor: "DIMM" }],
  battery: null,
};

describe("pièces à remplacer", () => {
  it("rien pour une machine en bonne santé", () => {
    expect(recommendParts(healthy)).toEqual([]);
  });

  it("un disque dur qui lâche : un SSD SATA de taille suffisante", () => {
    const [p] = recommendParts({
      disks: [
        {
          name: "WDC WD10EZEX",
          mediaType: "HDD",
          busType: "SATA",
          health: "Healthy",
          size: 1000204886016,
          uncorrected: 12,
        },
      ],
    });
    expect(p).toMatchObject({
      title: "Remplacer WDC WD10EZEX",
      query: 'SSD SATA 2,5" 1 To',
      price: [55, 90],
    });
  });

  it("un SSD NVMe usé : même format, capacité arrondie", () => {
    const parts = recommendParts({
      ...healthy,
      ssdHealth: [{ ...healthy.ssdHealth[0], wear: 85 }],
    });
    expect(parts[0]).toMatchObject({
      reason: "SSD usé à 85 % de son endurance",
      query: "SSD NVMe M.2 500 Go",
    });
  });

  it("mémoire en échec, batterie usée, carte qui chauffe", () => {
    const ids = recommendParts({
      memory: [{ capacity: 8589934592, type: "DDR4", formFactor: "SO-DIMM" }],
      memoryTestFailed: true,
      battery: { pct: 52, condition: null },
      machine: { maker: "Lenovo", model: "ThinkPad T480", laptop: true },
      gpuOverheating: true,
    });
    expect(ids.map((p) => [p.id, p.query])).toEqual([
      ["memory", "barrette DDR4 8 Go SO-DIMM"],
      ["battery", "batterie Lenovo ThinkPad T480"],
      ["cleaning", "bombe air sec dépoussiérage ordinateur"],
    ]);
  });

  it("en anglais", () => {
    const [p] = recommendParts(
      { battery: { pct: 50, condition: null }, machine: null },
      "en",
    );
    expect(p.title).toBe("Replace the battery");
  });
});

describe("liens marchands", () => {
  it("recherche Amazon seulement, sans identifiant d'affiliation au test", () => {
    const links = shopLinks('SSD SATA 2,5" 1 To');
    expect(links).toEqual([
      {
        shop: "Amazon",
        url: "https://www.amazon.fr/s?k=SSD%20SATA%202%2C5%22%201%20To",
      },
    ]);
  });
});

describe("seconde barrette", () => {
  it("propose une barrette identique pour passer en double canal", () => {
    const [p] = recommendParts({
      memory: [
        {
          capacity: 17179869184,
          type: "DDR4",
          formFactor: "DIMM",
          rated: 2666,
        },
      ],
      singleChannel: true,
    });
    expect(p).toMatchObject({
      id: "memory-pair",
      query: "barrette DDR4 16 Go 2666 MHz",
      price: [30, 50],
    });
  });
});
