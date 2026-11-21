import { describe, it, expect } from "vitest";
import { nvidiaDevice, nvidiaVersion, vendorPage } from "./vendors.js";

describe("sites des fabricants", () => {
  it("reconnaît une puce NVIDIA", () => {
    expect(nvidiaDevice("PCI\\VEN_10DE&DEV_2182")).toBe("2182");
    expect(nvidiaDevice("PCI\\VEN_8086&DEV_A370")).toBeNull();
    expect(nvidiaDevice("HDAUDIO\\FUNC_01&VEN_10DE&DEV_0099")).toBeNull();
  });

  it("traduit la version Windows en numéro NVIDIA", () => {
    expect(nvidiaVersion("32.0.16.2124")).toBe("621.24");
    expect(nvidiaVersion("32.0.15.6094")).toBe("560.94");
    expect(nvidiaVersion("31.0.15.5222")).toBe("552.22");
    expect(nvidiaVersion("1.4")).toBeNull();
  });

  it("donne la page de pilotes du fabricant", () => {
    expect(
      vendorPage({
        key: "PCI\\VEN_8086&DEV_A370",
        cls: "NET",
        name: "Intel(R) Wireless-AC 9560 160MHz",
      }),
    ).toMatch(/download\/19351/);
    expect(
      vendorPage({
        key: "PCI\\VEN_8086&DEV_15BC",
        cls: "NET",
        name: "Intel(R) Ethernet Connection (7) I219-V",
      }),
    ).toMatch(/download\/18293/);
    expect(
      vendorPage({
        key: "USB\\VID_8087&PID_0AAA",
        cls: "BLUETOOTH",
        name: "Intel(R) Wireless Bluetooth(R)",
      }),
    ).toMatch(/download\/18649/);
    expect(
      vendorPage({ key: "USB\\VID_046D&PID_0893", cls: "MEDIA", name: "x" }),
    ).toBeNull();
  });
});

describe("AMD", () => {
  it("lit la dernière version dans le nom de l'installateur", async () => {
    const { parseAmdNotes, isAmdGpu } = await import("./vendors.js");
    expect(
      parseAmdNotes(
        '<a href="https://drivers.amd.com/drivers/installer/26.20/whql/amd-software-adrenalin-edition-26.11.2-minimalsetup-261118_web.exe">',
      ),
    ).toMatchObject({ version: "26.11.2", date: "2026-11-18" });
    expect(parseAmdNotes("rien")).toBeNull();
    expect(isAmdGpu("PCI\\VEN_1002&DEV_73BF")).toBe(true);
    expect(isAmdGpu("PCI\\VEN_10DE&DEV_2182")).toBe(false);
  });
});
