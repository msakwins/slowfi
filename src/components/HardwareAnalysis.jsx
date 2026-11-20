// ─────────────────────────────────────────────────────────────────────────────
// Analyse du matériel, ouverte sur la page d'accueil : disques, mémoire, carte
// graphique et firmware, en une seule commande et un seul collage.
//
// Les quatre commandes produisent toutes du `Format-List`. Chaque moteur
// reconnaît ses blocs à leurs champs (DriveLetter pour un volume, Capacity
// pour une barrette, DriverVersion pour une carte graphique, SMBIOSBIOSVersion
// pour le BIOS) et ignore les autres : un seul texte nourrit les deux analyses.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from "react";
import { diagnoseStorage } from "../lib/storage.js";
import { analyzeComponents } from "../lib/components.js";
import { SEVERITY } from "../ui/theme.js";
import { Unfold, Verdict, VerdictHead, StatGrid, StatCell, Findings } from "../ui/verdict.jsx";
import PasteStep from "../ui/PasteStep.jsx";

// Get-Volume et Get-CimInstance n'existent que dans PowerShell. Collées dans
// l'Invite de commandes (cmd), elles échouent — et rien ne distingue les deux
// fenêtres pour l'utilisateur. Enveloppées dans `powershell -Command "…"`, sur
// une seule ligne, elles s'exécutent pareil depuis cmd, PowerShell ou Terminal.
const READS = [
  "Get-Volume | Where-Object DriveLetter | Format-List DriveLetter,FileSystemLabel,Size,SizeRemaining,HealthStatus,OperationalStatus",
  "Get-CimInstance Win32_PhysicalMemory | Format-List DeviceLocator,Capacity,Speed,ConfiguredClockSpeed",
  "Get-CimInstance Win32_VideoController | Format-List Name,DriverVersion,DriverDate",
  "Get-CimInstance Win32_BIOS | Format-List Manufacturer,SMBIOSBIOSVersion,ReleaseDate",
];
const COMMAND = `powershell -NoProfile -Command "${READS.join("; ")}"`;

// Exemple = deux machines réelles réunies : disque système à 13,7 % avec une
// MFT abîmée, disque de données saturé, mémoire bridée faute de profil XMP,
// pilote graphique de deux ans, BIOS d'origine.
const EXAMPLE = `DriveLetter       : C
FileSystemLabel   :
Size              : 249382825984
SizeRemaining     : 34285633536
HealthStatus      : Warning
OperationalStatus : Full Repair Needed

DriveLetter       : G
FileSystemLabel   : HDD
Size              : 966367641600
SizeRemaining     : 45969080320
HealthStatus      : Healthy
OperationalStatus : OK

DeviceLocator        : ChannelA-DIMM2
Capacity             : 17179869184
Speed                : 2666
ConfiguredClockSpeed : 2133

DeviceLocator        : ChannelB-DIMM2
Capacity             : 17179869184
Speed                : 2666
ConfiguredClockSpeed : 2133

Name          : NVIDIA GeForce GTX 1660 Ti
DriverVersion : 32.0.15.6094
DriverDate    : 14/08/2024 02:00:00

Manufacturer      : American Megatrends Inc.
SMBIOSBIOSVersion : 1303
ReleaseDate       : 20/03/2019 01:00:00`;

function analyzeHardware(raw) {
  const storage = diagnoseStorage(raw);
  const c = analyzeComponents(raw);
  const hasComponents = c.memory.length > 0 || c.gpus.length > 0 || c.bios;
  if (storage.volumes.length === 0 && !hasComponents) return null;
  return { volumes: storage.volumes, components: hasComponents ? c : null };
}

export default function HardwareAnalysis() {
  const anchor = useRef(null);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    anchor.current?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  }, []);

  return (
    <div ref={anchor} style={{ scrollMarginTop: 24 }}>
      <Unfold gap={8} first={0.1}>
        <PasteStep
          command={COMMAND}
          placeholder="Coller ici la sortie des commandes…"
          example={EXAMPLE}
          analyze={analyzeHardware}
          empty="Aucun disque ni composant reconnu dans le texte collé"
        >
          {({ volumes, components }) => (
            <>
              {components && <ComponentsVerdict c={components} />}
              {volumes.map((v) => (
                <VolumeVerdict key={v.driveLetter} v={v} />
              ))}
            </>
          )}
        </PasteStep>
      </Unfold>
    </div>
  );
}

function ComponentsVerdict({ c }) {
  const sev = SEVERITY[c.severity];
  return (
    <Verdict $color={sev.color} gap={32} first={0}>
      <VerdictHead color={sev.color} tag={c.gpus[0]?.name}>
        {`Composants — ${sev.label}`}
      </VerdictHead>
      <StatGrid $cols={4} $border>
        <StatCell k="Mémoire" value={c.totalGB} unit="Go" />
        <StatCell k="Barrettes" value={c.memory.length || null} />
        <StatCell k="Fréquence" value={c.memory[0]?.configured ?? null} unit="MHz" />
        <StatCell k="BIOS" value={c.bios?.year} />
      </StatGrid>
      <div style={{ paddingTop: 4 }}>
        <Findings findings={c.findings} />
      </div>
    </Verdict>
  );
}

function VolumeVerdict({ v }) {
  const sev = SEVERITY[v.severity];
  return (
    <Verdict $color={sev.color} gap={32} first={0}>
      <VerdictHead color={sev.color} tag={v.label || `Disque ${v.driveLetter}`}>
        {`${v.driveLetter}: — ${sev.label}`}
      </VerdictHead>
      <StatGrid $cols={3} $border>
        <StatCell k="Taille" value={v.sizeGB} unit="Go" />
        <StatCell k="Libre" value={v.freeGB} unit="Go" />
        <StatCell k="Part libre" value={v.pct} unit="%" />
      </StatGrid>
      <div style={{ paddingTop: 4 }}>
        <Findings findings={v.findings} />
      </div>
    </Verdict>
  );
}
