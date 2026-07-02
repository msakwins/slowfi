import { describe, it, expect } from "vitest";
import { parseNetsh, bandFromChannel, diagnose } from "./diagnostic.js";

// Le cas réel qui a lancé ce projet : Wi-Fi coincé en 2,4 GHz.
const SAMPLE_2GHZ = `
    Nom                   : Wi-Fi
    Description           : Intel(R) Wireless-AC 9560 160MHz
    SSID                  : Livebox-A030
    Type de radio         : 802.11n
    Canal                 : 1
    Réception (Mbits/s)   : 144.4
    Transmission (Mbits/s): 130
    Signal                : 89%
`;

const SAMPLE_5GHZ = `
    SSID                  : Livebox-A030-5G
    Type de radio         : 802.11ac
    Canal                 : 44
    Réception (Mbits/s)   : 866.7
    Transmission (Mbits/s): 866.7
    Signal                : 89%
`;

const SAMPLE_EN = `
    SSID                  : MyNetwork
    Radio type            : 802.11ax
    Channel               : 100
    Receive rate (Mbps)   : 1200
    Signal                : 72%
`;

describe("parseNetsh", () => {
  it("extrait les champs d'une sortie française", () => {
    const p = parseNetsh(SAMPLE_2GHZ);
    expect(p.radio).toBe("802.11n");
    expect(p.channel).toBe(1);
    expect(p.signal).toBe(89);
    expect(p.rx).toBe(144.4);
    expect(p.ssid).toBe("Livebox-A030");
  });

  it("ne confond pas SSID et BSSID", () => {
    const p = parseNetsh("    BSSID : 78:c2:13:58:b6:60\n    SSID  : MonWifi");
    expect(p.ssid).toBe("MonWifi");
  });

  it("gère les libellés anglais", () => {
    const p = parseNetsh(SAMPLE_EN);
    expect(p.radio).toBe("802.11ax");
    expect(p.channel).toBe(100);
    expect(p.rx).toBe(1200);
  });

  it("renvoie null pour les champs absents", () => {
    const p = parseNetsh("rien d'utile ici");
    expect(p.channel).toBeNull();
    expect(p.signal).toBeNull();
  });
});

describe("bandFromChannel", () => {
  it("mappe les canaux 2,4 GHz", () => {
    expect(bandFromChannel(1)).toBe("2.4 GHz");
    expect(bandFromChannel(11)).toBe("2.4 GHz");
  });
  it("mappe les canaux 5 GHz", () => {
    expect(bandFromChannel(36)).toBe("5 GHz");
    expect(bandFromChannel(100)).toBe("5 GHz");
  });
  it("renvoie null sans canal", () => {
    expect(bandFromChannel(null)).toBeNull();
  });
});

describe("diagnose", () => {
  it("détecte le goulot 2,4 GHz comme un problème", () => {
    const r = diagnose(parseNetsh(SAMPLE_2GHZ));
    expect(r.severity).toBe("problem");
    expect(r.band).toBe("2.4 GHz");
    expect(r.findings.some((f) => f.id === "band-2ghz")).toBe(true);
  });

  it("estime le débit réel à ~50% du lien", () => {
    const r = diagnose(parseNetsh(SAMPLE_2GHZ));
    expect(r.estimatedReal).toBe(72); // 144.4 * 0.5 arrondi
  });

  it("valide une config 5 GHz saine", () => {
    const r = diagnose(parseNetsh(SAMPLE_5GHZ));
    expect(r.severity).toBe("ok");
    expect(r.findings[0].id).toBe("healthy");
  });

  it("signale un signal faible", () => {
    const r = diagnose(parseNetsh("Canal : 44\nSignal : 25%\nRéception (Mbits/s) : 400"));
    expect(r.findings.some((f) => f.id === "weak-signal")).toBe(true);
  });
});
