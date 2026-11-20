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
import { useLang, SEVERITY_LABEL } from "../ui/i18n.jsx";

const TEXT = {
  fr: {
    placeholder: "Coller ici la sortie des commandes…",
    empty: "Aucun disque ni composant reconnu dans le texte collé",
    about:
      "Cette commande affiche l'état des disques, de la mémoire, de la carte graphique et du BIOS. Elle ne modifie rien, et aucune donnée n'est collectée",
    components: "Composants",
    memory: "Mémoire",
    sticks: "Barrettes",
    freq: "Fréquence",
    gb: "Go",
    drive: "Disque",
    size: "Taille",
    free: "Libre",
    freePct: "Part libre",
  },
  en: {
    placeholder: "Paste the output of the commands here…",
    empty: "No drive or component found in the pasted text",
    about:
      "This command displays the state of the drives, memory, graphics card and BIOS. It changes nothing, and no data is collected",
    components: "Components",
    memory: "Memory",
    sticks: "Sticks",
    freq: "Frequency",
    gb: "GB",
    drive: "Drive",
    size: "Size",
    free: "Free",
    freePct: "Free share",
  },
};

function useT() {
  const { lang } = useLang();
  return { t: TEXT[lang], label: SEVERITY_LABEL[lang] };
}
import {
  Unfold,
  Verdict,
  VerdictHead,
  StatGrid,
  StatCell,
  Findings,
} from "../ui/verdict.jsx";
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
  const { t } = useT();

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    anchor.current?.scrollIntoView({
      behavior: still ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  return (
    <div ref={anchor} style={{ scrollMarginTop: 24 }}>
      <Unfold gap={8} first={0.1}>
        <PasteStep
          command={COMMAND}
          placeholder={t.placeholder}
          example={EXAMPLE}
          analyze={analyzeHardware}
          empty={t.empty}
          about={t.about}
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
  const { t, label } = useT();
  return (
    <Verdict $color={sev.color} gap={32} first={0}>
      <VerdictHead color={sev.color} tag={c.gpus[0]?.name}>
        {`${t.components} — ${label[c.severity]}`}
      </VerdictHead>
      <StatGrid $cols={4} $border>
        <StatCell k={t.memory} value={c.totalGB} unit={t.gb} />
        <StatCell k={t.sticks} value={c.memory.length || null} />
        <StatCell
          k={t.freq}
          value={c.memory[0]?.configured ?? null}
          unit="MHz"
        />
        <StatCell k="BIOS" value={c.bios?.year} />
      </StatGrid>
      <div style={{ paddingTop: 4 }}>
        <Findings findings={c.findings} engine="components" />
      </div>
    </Verdict>
  );
}

function VolumeVerdict({ v }) {
  const sev = SEVERITY[v.severity];
  const { t, label } = useT();
  return (
    <Verdict $color={sev.color} gap={32} first={0}>
      <VerdictHead
        color={sev.color}
        tag={v.label || `${t.drive} ${v.driveLetter}`}
      >
        {`${v.driveLetter}: — ${label[v.severity]}`}
      </VerdictHead>
      <StatGrid $cols={3} $border>
        <StatCell k={t.size} value={v.sizeGB} unit={t.gb} />
        <StatCell k={t.free} value={v.freeGB} unit={t.gb} />
        <StatCell k={t.freePct} value={v.pct} unit="%" />
      </StatGrid>
      <div style={{ paddingTop: 4 }}>
        <Findings findings={v.findings} engine="storage" />
      </div>
    </Verdict>
  );
}
