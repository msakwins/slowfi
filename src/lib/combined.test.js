// L'analyse du matériel colle d'un seul tenant la sortie de Get-Volume et de
// trois Get-CimInstance. Chaque moteur doit y retrouver ses blocs et ignorer
// ceux des autres.
import { describe, it, expect } from "vitest";
import { parseVolumes } from "./storage.js";
import { parseComponents } from "./components.js";

const COMBINED = `DriveLetter       : C
FileSystemLabel   :
Size              : 249382825984
SizeRemaining     : 34285633536
HealthStatus      : Healthy
OperationalStatus : OK

DeviceLocator        : ChannelA-DIMM2
Capacity             : 17179869184
Speed                : 2666
ConfiguredClockSpeed : 2133

Name          : NVIDIA GeForce GTX 1660 Ti
DriverVersion : 32.0.15.6094
DriverDate    : 14/08/2024 02:00:00

Manufacturer      : American Megatrends Inc.
SMBIOSBIOSVersion : 1303
ReleaseDate       : 20/03/2019 01:00:00`;

describe("collage combiné stockage + composants", () => {
  it("le stockage ne garde que les volumes", () => {
    const volumes = parseVolumes(COMBINED);
    expect(volumes).toHaveLength(1);
    expect(volumes[0].driveLetter).toBe("C");
  });

  it("les composants ne gardent que mémoire, carte graphique et BIOS", () => {
    const c = parseComponents(COMBINED);
    expect(c.memory).toHaveLength(1);
    expect(c.gpus).toHaveLength(1);
    expect(c.bios?.version).toBe("1303");
  });
});
