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
import styled from "styled-components";
import { diagnoseStorage } from "../lib/storage.js";
import { analyzeComponents } from "../lib/components.js";
import { analyzeSystem } from "../lib/system.js";
import { analyzeActivity, formatBytes } from "../lib/activity.js";
import { parseBlocks } from "../lib/powershell.js";
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
  Passed,
} from "../ui/verdict.jsx";
import PasteStep from "../ui/PasteStep.jsx";
import HardwareManual from "./HardwareManual.jsx";
import Arrow from "../ui/Arrow.jsx";

// Page officielle des pilotes de chaque constructeur. Aucun ne publie de
// service interrogeable par un site : le lien permet de vérifier en un clic
// si une version plus récente que celle installée existe.
const DRIVER_PAGES = [
  [
    /nvidia|geforce|quadro|rtx|gtx/i,
    "NVIDIA",
    {
      fr: "https://www.nvidia.com/fr-fr/geforce/drivers/",
      en: "https://www.nvidia.com/en-us/geforce/drivers/",
    },
  ],
  [
    /amd|radeon/i,
    "AMD",
    {
      fr: "https://www.amd.com/fr/support/download/drivers.html",
      en: "https://www.amd.com/en/support/download/drivers.html",
    },
  ],
  [
    /intel/i,
    "Intel",
    {
      fr: "https://www.intel.fr/content/www/fr/fr/support/detect.html",
      en: "https://www.intel.com/content/www/us/en/support/detect.html",
    },
  ],
];

const SUPPORT_PAGES = {
  ASUS: "https://www.asus.com/support/",
  MSI: "https://www.msi.com/support",
  Gigabyte: "https://www.gigabyte.com/Support",
  ASRock: "https://www.asrock.com/support/index.asp",
  Dell: "https://www.dell.com/support/home",
  HP: "https://support.hp.com/drivers",
  Lenovo: "https://pcsupport.lenovo.com",
  Acer: "https://www.acer.com/support",
};

function driverPage(name, lang) {
  const hit = DRIVER_PAGES.find(([re]) => re.test(name || ""));
  return hit ? { vendor: hit[1], url: hit[2][lang] } : null;
}

const VendorLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;

  .arrow {
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  &:hover .arrow {
    transform: translateX(3px);
  }
`;

const TEXT = {
  fr: {
    placeholder: "Coller ici la sortie des commandes…",
    empty: "Aucun disque ni composant reconnu dans le texte collé",
    about: {
      windows:
        "Cette commande affiche l'état du système et du matériel : version de Windows, disques, mémoire, processeur, carte graphique, BIOS, batterie, programmes ouverts. Elle ne modifie rien, et aucune donnée n'est collectée",
      mac: "Cette commande affiche l'état du système et du matériel : version de macOS, disque, mémoire, processeur, batterie, programmes ouverts. Elle ne modifie rien, et aucune donnée n'est collectée",
    },
    components: "Composants",
    os: "Système installé",
    battery: "Batterie",
    startup: "Au démarrage",
    programs: (n) => (n > 1 ? "programmes" : "programme"),
    cpu: "Processeur",
    cores: "Cœurs / threads",
    coresOnly: "Cœurs",
    maxFreq: "Fréquence de base",
    board: "Carte mère",
    computer: "Ordinateur",
    support: (maker) => `Page support ${maker}`,
    activity: "Activité",
    cpuLoad: "Processeur",
    memUsed: "Mémoire utilisée",
    topTitle: "Programmes les plus gourmands en mémoire",
    processes: (n) => `${n} processus`,
    gpu: "Carte graphique",
    driver: "Pilote",
    state: "État",
    stateOk: "OK",
    stateError: (code) => (code ? `Erreur ${code}` : "Anormal"),
    update: (vendor) => `Vérifier les mises à jour sur le site ${vendor}`,
    memory: "Mémoire",
    sticks: "Barrettes",
    freq: "Fréquence",
    gb: "Go",
    drive: "Disque",
    size: "Taille",
    free: "Libre",
    freePct: "Part libre",
    system: "Système",
    diskType: "Disque système",
    uptime: "Allumé depuis",
    days: (n) => (n <= 1 ? "jour" : "jours"),
    power: "Alimentation",
    saver: "Économie",
    normal: "Normale",
  },
  en: {
    placeholder: "Paste the output of the commands here…",
    empty: "No drive or component found in the pasted text",
    about: {
      windows:
        "This command displays the state of the system and hardware: Windows version, drives, memory, processor, graphics card, BIOS, battery, open programs. It changes nothing, and no data is collected",
      mac: "This command displays the state of the system and hardware: macOS version, drive, memory, processor, battery, open programs. It changes nothing, and no data is collected",
    },
    components: "Components",
    os: "Installed system",
    battery: "Battery",
    startup: "At startup",
    programs: (n) => (n > 1 ? "programs" : "program"),
    cpu: "Processor",
    cores: "Cores / threads",
    coresOnly: "Cores",
    maxFreq: "Base frequency",
    board: "Motherboard",
    computer: "Computer",
    support: (maker) => `${maker} support page`,
    activity: "Activity",
    cpuLoad: "Processor",
    memUsed: "Memory used",
    topTitle: "Programs using the most memory",
    processes: (n) => `${n} process${n > 1 ? "es" : ""}`,
    gpu: "Graphics card",
    driver: "Driver",
    state: "Status",
    stateOk: "OK",
    stateError: (code) => (code ? `Error ${code}` : "Abnormal"),
    update: (vendor) => `Check for updates on the ${vendor} website`,
    memory: "Memory",
    sticks: "Sticks",
    freq: "Frequency",
    gb: "GB",
    drive: "Drive",
    size: "Size",
    free: "Free",
    freePct: "Free share",
    system: "System",
    diskType: "System drive",
    uptime: "Running for",
    days: (n) => (n <= 1 ? "day" : "days"),
    power: "Power",
    saver: "Saving",
    normal: "Normal",
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
  "Get-CimInstance Win32_VideoController | Format-List Name,DriverVersion,DriverDate,Status,ConfigManagerErrorCode",
  "Get-CimInstance Win32_BIOS | Format-List Manufacturer,SMBIOSBIOSVersion,ReleaseDate",
  "Get-PhysicalDisk | Format-List DeviceId,FriendlyName,MediaType,BusType,HealthStatus",
  // Disque qui porte C:, jours depuis le dernier vrai redémarrage, et mode
  // d'alimentation actif, réunis dans un seul bloc Format-List.
  "[pscustomobject]@{SystemDisk=(Get-Partition -DriveLetter C).DiskNumber; UptimeDays=[int]((Get-Date)-(Get-CimInstance Win32_OperatingSystem).LastBootUpTime).TotalDays; PowerScheme=(powercfg /getactivescheme)} | Format-List",
  // Version de Windows (et mémoire totale et libre, pour l'activité), puis
  // son nom commercial (« 22H2 »), absent de Win32_OperatingSystem.
  "Get-CimInstance Win32_OperatingSystem | Format-List Caption,BuildNumber,TotalVisibleMemorySize,FreePhysicalMemory",
  "Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion' | Format-List DisplayVersion",
  // Ordinateur et carte mère : pour nommer la page où trouver le BIOS.
  "Get-CimInstance Win32_ComputerSystem | Format-List Manufacturer,Model,PCSystemType",
  "Get-CimInstance Win32_BaseBoard | Format-List Manufacturer,Product",
  // Processeur, sa charge, et la limite de vitesse imposée par le firmware.
  "Get-CimInstance Win32_Processor | Format-List Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed,LoadPercentage",
  "Get-CimInstance Win32_PerfFormattedData_Counters_ProcessorInformation -ErrorAction SilentlyContinue | Where-Object Name -eq _Total | Format-List PercentPerformanceLimit",
  // Batterie : capacité d'origine et capacité actuelle. Rien sur un PC fixe.
  "Get-CimInstance -Namespace root/wmi -ClassName BatteryStaticData -ErrorAction SilentlyContinue | Format-List DesignedCapacity",
  "Get-CimInstance -Namespace root/wmi -ClassName BatteryFullChargedCapacity -ErrorAction SilentlyContinue | Format-List FullChargedCapacity",
  "Get-CimInstance Win32_StartupCommand | Format-List Command,User,Location",
  // Les 40 processus les plus gourmands en mémoire, regroupés par programme
  // à l'analyse.
  "Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 40 | Format-List ProcessName,WorkingSet64",
  "Get-CimInstance Win32_PnPSignedDriver | Where-Object DeviceClass -eq NET | Format-List DeviceName,DriverVersion,DriverDate",
];
const COMMAND_WINDOWS = `powershell -NoProfile -Command "${READS.join("; ")}"`;
const COMMAND_MAC = [
  "diskutil info /",
  "system_profiler SPMemoryDataType SPPowerDataType",
  "uptime",
  "pmset -g | grep lowpowermode",
  "sw_vers",
  "sysctl machdep.cpu.brand_string hw.physicalcpu hw.ncpu",
  "pmset -g therm",
  "memory_pressure | tail -1",
  "top -l 2 -o mem -n 5 -stats command,cpu,mem",
].join(" ; ");

function analyzeHardware(raw) {
  const storage = diagnoseStorage(raw);
  const c = analyzeComponents(raw);
  const system = analyzeSystem(raw);
  const activity = analyzeActivity(parseBlocks(raw), raw);
  const hasComponents =
    c.memory.length > 0 || c.gpus.length > 0 || c.bios || c.cpu;
  if (storage.volumes.length === 0 && !hasComponents && !system && !activity)
    return null;
  return {
    volumes: storage.volumes,
    components: hasComponents ? c : null,
    system,
    activity,
  };
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
          {({ volumes, components, system, activity }) => (
            <>
              {system && <SystemVerdict s={system} />}
              {activity && <ActivityVerdict a={activity} />}
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

function SystemVerdict({ s }) {
  const sev = SEVERITY[s.severity];
  const { t, label } = useT();
  return (
    <Verdict $color={sev.color} gap={32} first={0}>
      <VerdictHead color={sev.color} tag={s.systemDisk?.name}>
        {`${t.system} — ${label[s.severity]}`}
      </VerdictHead>
      <StatGrid $cols={3} $border>
        <StatCell k={t.diskType} value={s.kind} />
        <StatCell
          k={t.uptime}
          value={
            s.uptimeDays == null
              ? null
              : s.uptimeDays === 0
                ? "< 1"
                : s.uptimeDays
          }
          unit={s.uptimeDays == null ? null : t.days(s.uptimeDays)}
        />
        <StatCell
          k={t.power}
          value={
            s.powerSaver == null ? null : s.powerSaver ? t.saver : t.normal
          }
        />
      </StatGrid>
      {(s.osLabel || s.env?.battery || s.env?.startup) && (
        <StatGrid $cols={3} $border style={{ marginTop: 12 }}>
          <StatCell k={t.os} value={s.osLabel} text />
          {/* Pas de case « Batterie » sur un PC fixe. */}
          {s.env?.battery && (
            <StatCell k={t.battery} value={s.env.battery.pct} unit="%" />
          )}
          <StatCell
            k={t.startup}
            value={s.env?.startup?.length ?? null}
            unit={s.env?.startup ? t.programs(s.env.startup.length) : null}
          />
        </StatGrid>
      )}
      <div style={{ paddingTop: 4 }}>
        <Findings findings={s.findings} engine="system" />
        <Passed items={s.passed} />
      </div>
    </Verdict>
  );
}

const TopList = styled.div`
  margin-top: 18px;

  .head {
    margin: 0 0 8px;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 600;
    color: #64748b;
  }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: top;
  }
  li {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 6px 0;
    border-top: 1px solid #111a2e;
    font-size: 14px;
    color: #cbd5e1;
  }
  li > span:last-child {
    flex: none;
    font-family: ui-monospace, monospace;
    font-size: 13px;
    color: #94a3b8;
  }
`;

function ActivityVerdict({ a }) {
  const sev = SEVERITY[a.severity];
  const { t, label } = useT();
  const { lang } = useLang();
  return (
    <Verdict $color={sev.color} gap={32} first={0}>
      <VerdictHead
        color={sev.color}
      >{`${t.activity} — ${label[a.severity]}`}</VerdictHead>
      <StatGrid $cols={2} $border>
        <StatCell k={t.cpuLoad} value={a.cpuLoad} unit="%" />
        <StatCell k={t.memUsed} value={a.memoryPct} unit="%" />
      </StatGrid>
      <div style={{ paddingTop: 4 }}>
        <Findings findings={a.findings} engine="activity" />
        {a.top.length > 0 && (
          <TopList>
            <p className="head">{t.topTitle}</p>
            <ol>
              {a.top.map((p) => (
                <li key={p.name}>
                  <span>
                    {p.name}
                    {p.count > 1 && (
                      <span style={{ color: "#64748b" }}>
                        {" "}
                        · {t.processes(p.count)}
                      </span>
                    )}
                  </span>
                  <span>{formatBytes(p.bytes, lang)}</span>
                </li>
              ))}
            </ol>
          </TopList>
        )}
        <Passed items={a.passed} />
      </div>
    </Verdict>
  );
}

function ComponentsVerdict({ c }) {
  const sev = SEVERITY[c.severity];
  const { t, label } = useT();
  const { lang } = useLang();
  // Mémoire unifiée (Apple Silicon) : pas de barrette, pas de fréquence lue.
  const unified = c.memory[0]?.unified;
  return (
    <Verdict $color={sev.color} gap={32} first={0}>
      <VerdictHead color={sev.color}>
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
      {/* Une ligne par carte graphique : souvent deux sur un portable
          (intégrée et dédiée). */}
      {c.cpu && (
        <StatGrid $cols={3} $border style={{ marginTop: 12 }}>
          <StatCell k={t.cpu} value={c.cpu.name} text />
          <StatCell
            k={
              c.cpu.threads && c.cpu.threads !== c.cpu.cores
                ? t.cores
                : t.coresOnly
            }
            value={
              c.cpu.cores
                ? c.cpu.threads && c.cpu.threads !== c.cpu.cores
                  ? `${c.cpu.cores} / ${c.cpu.threads}`
                  : c.cpu.cores
                : null
            }
          />
          <StatCell
            k={t.maxFreq}
            value={c.cpu.maxMHz ? Math.round(c.cpu.maxMHz / 100) / 10 : null}
            unit="GHz"
          />
        </StatGrid>
      )}
      {c.machine && (
        <div style={{ marginTop: 12 }}>
          <StatGrid $cols={1} $border>
            <StatCell
              k={c.machine.kind === "board" ? t.board : t.computer}
              value={[c.machine.maker, c.machine.model]
                .filter(Boolean)
                .join(" ")}
              text
            />
          </StatGrid>
          {SUPPORT_PAGES[c.machine.maker] && (
            <VendorLink
              href={SUPPORT_PAGES[c.machine.maker]}
              target="_blank"
              rel="noreferrer"
            >
              {t.support(c.machine.maker)}
              <Arrow />
            </VendorLink>
          )}
        </div>
      )}
      {c.gpus.map((g, i) => {
        const page = driverPage(g.name, lang);
        const known = g.status != null || g.errorCode != null;
        const ok = known && /^ok$/i.test(g.status ?? "OK") && !g.errorCode;
        return (
          <div key={i} style={{ marginTop: 12 }}>
            <StatGrid $cols={3} $border>
              <StatCell k={t.gpu} value={g.name} text />
              <StatCell
                k={t.driver}
                value={
                  g.driverMonth
                    ? `${String(g.driverMonth).padStart(2, "0")}/${g.driverYear}`
                    : g.driverYear
                }
                unit={g.driverVersion ? `v${g.driverVersion}` : null}
              />
              <StatCell
                k={t.state}
                value={
                  known ? (ok ? t.stateOk : t.stateError(g.errorCode)) : null
                }
              />
            </StatGrid>
            {page && (
              <VendorLink href={page.url} target="_blank" rel="noreferrer">
                {t.update(page.vendor)}
                <Arrow />
              </VendorLink>
            )}
          </div>
        );
      })}
      <div style={{ paddingTop: 4 }}>
        <Findings findings={c.findings} engine="components" />
        <Passed items={c.passed} />
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
        <Passed items={v.passed} />
      </div>
    </Verdict>
  );
}
