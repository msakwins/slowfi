import { describe, it, expect } from "vitest";
import {
  parseInstalledDrivers,
  driverStatus,
  driverState,
  withAi,
} from "./drivers.js";

const RAW = `
DeviceClass   : DISPLAY
DeviceName    : NVIDIA GeForce GTX 1660 Ti
DriverVersion : 32.0.15.6094
DriverDate    : 20250921000000.******+***
HardWareID    : PCI\\VEN_10DE&DEV_2182&SUBSYS_86F91043&REV_A1

DeviceClass   : NET
DeviceName    : Intel(R) Wireless-AC 9560 160MHz
DriverVersion : 22.250.1.2
DriverDate    : 01/12/2023 02:00:00
HardWareID    : PCI\\VEN_8086&DEV_A370&SUBSYS_00348086

DeviceClass   : NET
DeviceName    : WAN Miniport (IP)
DriverVersion : 10.0.19041.1
DriverDate    : 21/06/2006 02:00:00
HardWareID    : ms_ndiswanip

DeviceClass   : MEDIA
DeviceName    : Realtek High Definition Audio
DriverVersion : 6.0.9239.1
DriverDate    : 12/08/2021 02:00:00
HardWareID    : HDAUDIO\\FUNC_01&VEN_10EC&DEV_0887&SUBSYS_10438445&REV_1003

DeviceClass   : MEDIA
DeviceName    : NVIDIA High Definition Audio
DriverVersion : 1.4.0.1
DriverDate    : 01/01/2024 02:00:00
HardWareID    : HDAUDIO\\FUNC_01&VEN_10DE&DEV_0093&SUBSYS_1043
`;

describe("pilotes installés", () => {
  it("garde les composants physiques, avec leur identifiant de recherche", () => {
    const drivers = parseInstalledDrivers(RAW);
    expect(drivers.map((d) => d.key)).toEqual([
      "PCI\\VEN_10DE&DEV_2182",
      "PCI\\VEN_8086&DEV_A370",
      "HDAUDIO\\FUNC_01&VEN_10EC&DEV_0887",
      "HDAUDIO\\FUNC_01&VEN_10DE&DEV_0093",
    ]);
    expect(drivers[0]).toMatchObject({
      cls: "DISPLAY",
      name: "NVIDIA GeForce GTX 1660 Ti",
      version: "32.0.15.6094",
      date: { year: 2025, month: 9 },
    });
  });

  it("compare avec la dernière version du catalogue", () => {
    const d = { version: "32.0.15.6094" };
    expect(driverStatus(d, { version: "32.0.16.1088" })).toBe("update");
    expect(driverStatus(d, { version: "32.0.15.6094" })).toBe("current");
    expect(driverStatus(d, { version: "31.0.1.1" })).toBe("current");
    expect(driverStatus(d, null)).toBe("unknown");
  });
});

describe("verdict par source", () => {
  const gpu = {
    key: "PCI\\VEN_10DE&DEV_2182",
    cls: "DISPLAY",
    name: "NVIDIA GeForce GTX 1660 Ti",
    version: "32.0.16.2124",
  };
  it("préfère le site de NVIDIA au catalogue", () => {
    const nvidia = (version) => ({
      latest: { version: "32.0.16.1088", date: "2026-07-21" },
      vendor: { source: "nvidia", version, date: "2026-11-12", url: "u" },
    });
    expect(driverState(gpu, nvidia("621.24"))).toMatchObject({
      status: "current",
      source: "nvidia",
    });
    expect(driverState(gpu, nvidia("625.10"))).toMatchObject({
      status: "update",
      version: "625.10",
      url: "u",
    });
  });

  it("garde le catalogue et le lien du fabricant sinon", () => {
    const wifi = {
      key: "PCI\\VEN_8086&DEV_A370",
      cls: "NET",
      name: "Intel(R) Wireless-AC 9560",
      version: "23.150.0.4",
    };
    const state = driverState(wifi, {
      latest: { version: "24.40.0.4", date: "2026-04-12" },
      vendor: null,
    });
    expect(state).toMatchObject({
      status: "update",
      version: "24.40.0.4",
      source: "windows-update",
    });
    expect(state.url).toMatch(/download\/19351/);
  });
});

describe("recherche IA", () => {
  const wifi = {
    key: "PCI\\VEN_8086&DEV_A370",
    cls: "NET",
    name: "Intel(R) Wireless-AC 9560",
    version: "23.150.0.4",
  };
  const catalog = driverState(wifi, {
    latest: { version: "24.40.0.4", date: "2026-04-12" },
    vendor: null,
  });

  it("prend la version du fabricant quand elle est plus récente", () => {
    const state = withAi(catalog, wifi, {
      driverVersion: "24.50.1.2",
      date: "2026-10-14",
      url: "https://www.intel.com/x",
    });
    expect(state).toMatchObject({
      status: "update",
      version: "24.50.1.2",
      source: "ai",
      url: "https://www.intel.com/x",
    });
  });

  it("garde le catalogue s'il est déjà au moins aussi récent", () => {
    expect(
      withAi(catalog, wifi, {
        driverVersion: "24.40.0.4",
        url: "https://www.intel.com/x",
      }).source,
    ).toBe("windows-update");
  });

  it("ne compare pas un numéro de pack à une version de pilote", () => {
    const state = withAi(catalog, wifi, {
      driverVersion: "30.4",
      packageName: "Intel Ethernet Adapter Complete Driver Pack",
      packageVersion: "30.4",
      url: "https://www.intel.com/y",
    });
    expect(state.source).toBe("windows-update");
    expect(state.aiPackage.packageVersion).toBe("30.4");
  });
});

describe("version lue par l'IA", () => {
  const bt = {
    key: "USB\\VID_8087&PID_0AAA",
    cls: "BLUETOOTH",
    name: "Intel(R) Wireless Bluetooth(R)",
    version: "23.90.0.8",
  };
  const catalog = driverState(bt, {
    latest: { version: "24.70.0.4", date: "2026-07-01" },
    vendor: null,
  });

  it("ne garde que le numéro affiché par la page", () => {
    const state = withAi(catalog, bt, {
      driverVersion: "24.80.0.2",
      packageVersion: "24.80.0",
      date: "2026-10-20",
      url: "https://www.intel.com/bt",
    });
    expect(state).toMatchObject({
      status: "update",
      version: "24.80.0",
      source: "ai",
    });
  });

  it("compare sur le même nombre de parties", () => {
    const state = withAi(
      catalog,
      { ...bt, version: "24.80.0.7" },
      { driverVersion: null, packageVersion: "24.80.0", url: "u" },
    );
    expect(state.status).toBe("current");
  });
});
