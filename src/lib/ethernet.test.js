import { describe, it, expect } from "vitest";
import {
  toMbps,
  parseEthernet,
  analyzeEthernet,
  diagnoseEthernet,
} from "./ethernet.js";
import { ETHERNET_WINDOWS, ETHERNET_MAC } from "./examples.js";

describe("toMbps", () => {
  it("convertit les vitesses annoncées", () => {
    expect(toMbps("1 Gbps")).toBe(1000);
    expect(toMbps("2.5 Gbps")).toBe(2500);
    expect(toMbps("100 Mbps")).toBe(100);
    expect(toMbps("1,0 Gbit/s")).toBe(1000);
    expect(toMbps("")).toBeNull();
  });
});

describe("lecture", () => {
  it("garde la carte Ethernet et écarte le Wi-Fi (Windows)", () => {
    const a = parseEthernet(ETHERNET_WINDOWS);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({
      name: "Ethernet",
      up: true,
      speed: 100,
      fullDuplex: true,
    });
  });

  it("lit la ligne media d'ifconfig (macOS)", () => {
    const a = parseEthernet(ETHERNET_MAC);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({
      name: "en7",
      up: true,
      speed: 1000,
      fullDuplex: true,
    });
  });
});

describe("verdict", () => {
  it("signale un lien retombé à 100 Mb/s", () => {
    const r = analyzeEthernet(ETHERNET_WINDOWS);
    expect(r.severity).toBe("problem");
    expect(r.findings[0].id).toBe("ethernet-slow-link");
  });

  it("valide un lien Gigabit", () => {
    const r = analyzeEthernet(ETHERNET_MAC, 300);
    expect(r.severity).toBe("ok");
    expect(r.findings[0].title).toBe("Liaison Ethernet à 1 Gb/s");
  });

  it("repère un lien qui plafonne la ligne", () => {
    const r = analyzeEthernet(ETHERNET_MAC, 940);
    expect(r.findings[0].id).toBe("ethernet-limits-line");
  });

  it("repère le semi-duplex", () => {
    const r = diagnoseEthernet({ speed: 1000, fullDuplex: false });
    expect(r.findings.map((f) => f.id)).toContain("ethernet-half-duplex");
  });

  it("distingue une carte débranchée d'un texte sans rapport", () => {
    expect(
      analyzeEthernet(
        ETHERNET_WINDOWS.replace(
          "Status               : Up",
          "Status               : Disconnected",
        ),
      ),
    ).toEqual({ disconnected: true });
    expect(analyzeEthernet("bonjour")).toBeNull();
  });
});
