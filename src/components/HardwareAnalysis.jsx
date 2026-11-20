// ─────────────────────────────────────────────────────────────────────────────
// Analyse du matériel, ouverte sur la page d'accueil : disques, mémoire, carte
// graphique et firmware, en une seule commande et un seul collage.
//
// Windows : les quatre commandes produisent toutes du `Format-List`. Chaque
// moteur reconnaît ses blocs à leurs champs (DriveLetter pour un volume,
// Capacity pour une barrette, DriverVersion pour une carte graphique,
// SMBIOSBIOSVersion pour le BIOS) et ignore les autres.
//
// macOS : `diskutil info /` pour le volume de démarrage, `system_profiler`
// pour la mémoire. Pas de pilote ni de BIOS à contrôler : ils suivent macOS.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from "react";
import { diagnoseStorage } from "../lib/storage.js";
import { analyzeComponents } from "../lib/components.js";
import { HARDWARE_WINDOWS, HARDWARE_MAC } from "../lib/examples.js";
import { SEVERITY } from "../ui/theme.js";
import { useLang, SEVERITY_LABEL } from "../ui/i18n.jsx";
import {
  Unfold,
  Verdict,
  VerdictHead,
  StatGrid,
  StatCell,
  Findings,
} from "../ui/verdict.jsx";
import PasteStep from "../ui/PasteStep.jsx";
import HardwareManual from "./HardwareManual.jsx";

const TEXT = {
  fr: {
    placeholder: "Coller ici la sortie des commandes…",
    empty: "Aucun disque ni composant reconnu dans le texte collé",
    about: {
      windows:
        "Cette commande affiche l'état des disques, de la mémoire, de la carte graphique et du BIOS. Elle ne modifie rien, et aucune donnée n'est collectée",
      mac: "Cette commande affiche l'état du disque et de la mémoire. Elle ne modifie rien, et aucune donnée n'est collectée",
    },
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
    about: {
      windows:
        "This command displays the state of the drives, memory, graphics card and BIOS. It changes nothing, and no data is collected",
      mac: "This command displays the state of the drive and memory. It changes nothing, and no data is collected",
    },
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
const COMMAND_WINDOWS = `powershell -NoProfile -Command "${READS.join("; ")}"`;
const COMMAND_MAC = "diskutil info / ; system_profiler SPMemoryDataType";

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
          variants={{
            windows: {
              command: COMMAND_WINDOWS,
              example: HARDWARE_WINDOWS,
              about: t.about.windows,
            },
            mac: {
              command: COMMAND_MAC,
              example: HARDWARE_MAC,
              about: t.about.mac,
            },
          }}
          placeholder={t.placeholder}
          analyze={analyzeHardware}
          manual={HardwareManual}
          empty={t.empty}
        >
          {({ volumes, components }) => (
            <>
              {components && <ComponentsVerdict c={components} />}
              {volumes.map((v) => (
                <VolumeVerdict key={v.name ?? v.driveLetter} v={v} />
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
  // Mémoire unifiée (Apple Silicon) : pas de barrette, pas de fréquence lue.
  const unified = c.memory[0]?.unified;
  return (
    <Verdict $color={sev.color} gap={32} first={0}>
      <VerdictHead color={sev.color} tag={c.gpus[0]?.name}>
        {`${t.components} — ${label[c.severity]}`}
      </VerdictHead>
      <StatGrid $cols={4} $border>
        <StatCell k={t.memory} value={c.totalGB} unit={t.gb} />
        <StatCell
          k={t.sticks}
          value={unified ? null : c.memory.length || null}
        />
        <StatCell
          k={t.freq}
          value={c.memory[0]?.configured ?? c.memory[0]?.rated ?? null}
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
  const name = v.name ?? `${v.driveLetter}:`;
  const tag = v.label || (v.driveLetter ? `${t.drive} ${v.driveLetter}` : null);
  return (
    <Verdict $color={sev.color} gap={32} first={0}>
      <VerdictHead color={sev.color} tag={tag}>
        {`${name} — ${label[v.severity]}`}
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
