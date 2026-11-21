import { describe, it, expect } from "vitest";
import {
  lookupKey,
  isLookupKey,
  compareVersions,
  parseCatalog,
  latestDriver,
} from "./catalog.js";

// Extrait réduit d'une page de résultats du catalogue (deux lignes).
const row = (n, title, cls, date, version) => `
<tr id="aaaa-${n}_R${n}">
<td class="resultsbottomBorder resultspadding" id="aaaa-${n}_C1_R${n}">
  <a href="#">${title}</a>
</td><td class="resultsbottomBorder resultspadding" id="aaaa-${n}_C2_R${n}">Windows 10 and later drivers</td>
<td class="resultsbottomBorder resultspadding" id="aaaa-${n}_C3_R${n}">${cls}</td>
<td class="resultsbottomBorder resultspadding " id="aaaa-${n}_C4_R${n}">
  ${date}
</td><td class="resultsbottomBorder resultspadding" id="aaaa-${n}_C5_R${n}">
  ${version}
</td></tr>`;
const PAGE =
  row(
    0,
    "NVIDIA Display Driver Update (32.0.15.9000)",
    "Drivers (Display)",
    "6/8/2026",
    "32.0.15.9000",
  ) +
  row(
    1,
    "NVIDIA Display Driver Update (32.0.16.1088)",
    "Drivers (Display)",
    "7/21/2026",
    "32.0.16.1088",
  );

describe("catalogue Microsoft Update", () => {
  it("réduit l'identifiant matériel au fabricant et au modèle", () => {
    expect(lookupKey("PCI\\VEN_10DE&DEV_2182&SUBSYS_86F91043&REV_A1")).toBe(
      "PCI\\VEN_10DE&DEV_2182",
    );
    expect(lookupKey("USB\\VID_8087&PID_0AAA&REV_0002")).toBe(
      "USB\\VID_8087&PID_0AAA",
    );
    expect(lookupKey("HDAUDIO\\FUNC_01&VEN_10EC&DEV_0887&SUBSYS_1043")).toBe(
      "HDAUDIO\\FUNC_01&VEN_10EC&DEV_0887",
    );
    expect(lookupKey("SWD\\MMDEVAPI\\{0.0.0}")).toBeNull();
    expect(lookupKey(null)).toBeNull();
  });

  it("n'accepte que des identifiants déjà réduits", () => {
    expect(isLookupKey("PCI\\VEN_10DE&DEV_2182")).toBe(true);
    expect(isLookupKey("PCI\\VEN_10DE&DEV_2182&SUBSYS_1")).toBe(false);
    expect(isLookupKey("https://example.com")).toBe(false);
  });

  it("compare les versions nombre par nombre", () => {
    expect(compareVersions("32.0.15.6094", "32.0.16.1088")).toBeLessThan(0);
    expect(compareVersions("10.79.50.1003", "10.79.50.1003")).toBe(0);
    expect(compareVersions("12.19.2.66", "12.19.1.37")).toBeGreaterThan(0);
  });

  it("lit les lignes et garde la version la plus haute", () => {
    const rows = parseCatalog(PAGE);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      title: "NVIDIA Display Driver Update (32.0.15.9000)",
      classification: "Drivers (Display)",
      date: "2026-06-08",
      version: "32.0.15.9000",
    });
    expect(latestDriver(rows).version).toBe("32.0.16.1088");
    expect(latestDriver([])).toBeNull();
  });
});
