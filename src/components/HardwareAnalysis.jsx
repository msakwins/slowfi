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
import {
  HARDWARE_WINDOWS,
  HARDWARE_MAC,
  HARDWARE_LINUX,
} from "../lib/examples.js";
import { SEVERITY } from "../ui/theme.js";
import { useLang, SEVERITY_LABEL } from "../ui/i18n.jsx";
import {
  Unfold,
  Verdict,
  VerdictHead,
  Findings,
  Passed,
} from "../ui/verdict.jsx";
import PasteStep from "../ui/PasteStep.jsx";
import { windowsCommand, macCommand, linuxCommand } from "../lib/commands.js";
import HardwareManual from "./HardwareManual.jsx";
import Arrow from "../ui/Arrow.jsx";
import CopySummary from "../ui/CopySummary.jsx";
import { summarizeBlocks } from "../lib/report.js";
import { localize } from "../lib/en.js";

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

const TEXT = {
  fr: {
    placeholder: "Coller ici la sortie des commandes…",
    empty: "Aucun disque ni composant reconnu dans le texte collé",
    about: {
      windows:
        "Cette commande affiche l'état du système et du matériel : version de Windows, disques, mémoire, processeur, carte graphique, BIOS, batterie, programmes ouverts. Elle ne modifie rien, et aucune donnée n'est collectée",
      mac: "Cette commande affiche l'état du système et du matériel : version de macOS, disque, mémoire, processeur, batterie, programmes ouverts. Elle ne modifie rien, et aucune donnée n'est collectée",
      linux:
        "Cette commande affiche l'état du système et du matériel : distribution, disques, mémoire, processeur, carte graphique, BIOS, batterie, programmes ouverts. Elle ne modifie rien, et aucune donnée n'est collectée",
    },
    components: "Composants",
    reportTitle: "Slowfi — analyse du matériel",
    hardware: "Matériel",
    detected: "Matériel détecté",
    results: "Résultats du diagnostic",
    noIssue: "Aucune anomalie détectée",
    sticksN: (n) => `${n} barrette${n > 1 ? "s" : ""}`,
    coresN: (c, th) =>
      th && th !== c ? `${c} cœurs, ${th} threads` : `${c} cœurs`,
    freeOf: (free, pct) => `${free} Go libres (${pct} %)`,
    busy: (cpu, mem) =>
      [
        cpu != null && `Processeur à ${cpu} %`,
        mem != null && `mémoire utilisée à ${mem} %`,
      ]
        .filter(Boolean)
        .join(", "),
    since: (d) =>
      d === 0 ? "moins d'un jour" : `${d} jour${d > 1 ? "s" : ""}`,
    os: "Système installé",
    battery: "Batterie",
    startup: "Au démarrage",
    programs: (n) => (n > 1 ? "programmes" : "programme"),
    cpu: "Processeur",
    cores: "Cœurs / threads",
    coresOnly: "Cœurs",
    maxFreq: "Fréquence de base",
    boostFreq: "Fréquence maximale",
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
      linux:
        "This command displays the state of the system and hardware: distribution, drives, memory, processor, graphics card, BIOS, battery, open programs. It changes nothing, and no data is collected",
    },
    components: "Components",
    reportTitle: "Slowfi — hardware analysis",
    hardware: "Hardware",
    detected: "Detected hardware",
    results: "Diagnostic results",
    noIssue: "No issue found",
    sticksN: (n) => `${n} stick${n > 1 ? "s" : ""}`,
    coresN: (c, th) =>
      th && th !== c ? `${c} cores, ${th} threads` : `${c} cores`,
    freeOf: (free, pct) => `${free} GB free (${pct} %)`,
    busy: (cpu, mem) =>
      [
        cpu != null && `Processor at ${cpu} %`,
        mem != null && `memory ${mem} % used`,
      ]
        .filter(Boolean)
        .join(", "),
    since: (d) => (d === 0 ? "less than a day" : `${d} day${d > 1 ? "s" : ""}`),
    os: "Installed system",
    battery: "Battery",
    startup: "At startup",
    programs: (n) => (n > 1 ? "programs" : "program"),
    cpu: "Processor",
    cores: "Cores / threads",
    coresOnly: "Cores",
    maxFreq: "Base frequency",
    boostFreq: "Maximum frequency",
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
export const HARDWARE_READS = [
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
const COMMAND_WINDOWS = windowsCommand(HARDWARE_READS);
export const HARDWARE_MAC_READS = [
  "diskutil info /",
  "system_profiler SPMemoryDataType SPPowerDataType",
  "uptime",
  "pmset -g | grep lowpowermode",
  "sw_vers",
  "sysctl machdep.cpu.brand_string hw.physicalcpu hw.ncpu",
  "pmset -g therm",
  "memory_pressure | tail -1",
  "top -l 2 -o mem -n 5 -stats command,cpu,mem",
];
const COMMAND_MAC = macCommand(HARDWARE_MAC_READS);

// Linux : outils présents sur toutes les distributions courantes, sans droits
// root. LC_ALL=C pour une sortie en anglais, quelle que soit la langue.
export const HARDWARE_LINUX_READS = [
  "export LC_ALL=C",
  "cat /etc/os-release",
  "df -B1 --output=target,size,avail / /home",
  "findmnt -n -o SOURCE /",
  "lsblk -d -o NAME,ROTA,MODEL",
  "free -b",
  "lscpu",
  "lspci | grep -iE 'vga|3d|display'",
  "grep -sH . /sys/class/dmi/id/bios_date /sys/class/dmi/id/bios_version /sys/class/dmi/id/bios_vendor /sys/class/dmi/id/board_vendor /sys/class/dmi/id/board_name /sys/class/dmi/id/sys_vendor /sys/class/dmi/id/product_name /sys/class/dmi/id/product_version",
  "grep -sH . /sys/class/power_supply/BAT*/*_full*",
  "cat /proc/uptime",
  "powerprofilesctl get 2>/dev/null",
  "top -bn1 | head -5",
  "ps -eo comm,rss --sort=-rss | head -40",
];
const COMMAND_LINUX = linuxCommand(HARDWARE_LINUX_READS);

export function analyzeHardware(raw) {
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

/** Blocs de résultats du matériel, suivis du résumé à copier. */
// Ordre de lecture : ce qui a été détecté, puis les résultats du diagnostic
// (les plus graves d'abord, chacun avec son niveau et la partie concernée),
// puis ce qui a été vérifié sans anomalie.
const RANK = { problem: 0, warning: 1, ok: 2 };

/** Blocs de résultats du matériel, suivis du résumé à copier. */
export function HardwareResults({
  data: { volumes, components: c, system: s, activity: a },
}) {
  const { t, label } = useT();
  const { lang } = useLang();

  const blocks = [
    { name: t.system, engine: "system", result: s },
    { name: t.activity, engine: "activity", result: a },
    { name: t.components, engine: "components", result: c },
    ...volumes.map((v) => ({
      name: v.name ?? `${v.driveLetter}:`,
      engine: "storage",
      result: v,
    })),
  ].filter((b) => b.result);

  const severity = blocks.reduce(
    (worst, b) =>
      RANK[b.result.severity] < RANK[worst] ? b.result.severity : worst,
    "ok",
  );
  const findings = blocks
    .flatMap((b) =>
      b.result.findings
        .filter((f) => f.id !== "healthy")
        .map((f) => ({
          ...localize(f, lang, b.engine),
          id: `${b.name}-${f.id}`,
          area: b.name,
        })),
    )
    .sort((x, y) => RANK[x.level ?? "ok"] - RANK[y.level ?? "ok"]);
  const passed = blocks.flatMap((b) => b.result.passed ?? []);
  const sev = SEVERITY[severity];

  return (
    <>
      <Verdict $color={sev.color} gap={32} first={0}>
        <VerdictHead
          color={sev.color}
        >{`${t.hardware} — ${label[severity]}`}</VerdictHead>
        <Inventory data={{ volumes, c, s, a }} />
        <Section2>{t.results}</Section2>
        {findings.length ? (
          <Findings findings={findings} />
        ) : (
          <p style={{ margin: "12px 0 0", fontSize: 15, color: "#e2e8f0" }}>
            {t.noIssue}
          </p>
        )}
        <Passed items={passed} />
      </Verdict>
      <CopySummary
        build={() =>
          summarizeBlocks(t.reportTitle, blocks, lang, {
            url: window.location.origin,
          })
        }
      />
    </>
  );
}

export const Section2 = styled.p`
  margin: 32px 0 0;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  color: #64748b;
`;

// Liste à deux colonnes : la partie à gauche, ce qui a été lu à droite.
export const Table = styled.dl`
  margin: 16px 0 0;
  display: grid;
  grid-template-columns: minmax(120px, 30%) 1fr;

  dt,
  dd {
    margin: 0;
    padding: 9px 0;
    border-top: 1px solid #111a2e;
    font-size: 14px;
    line-height: 1.5;
  }
  dt {
    color: #64748b;
    padding-right: 16px;
  }
  dd {
    color: #e2e8f0;
  }
  dd .sub {
    color: #94a3b8;
  }
  dd a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    text-decoration: none;
  }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }
  li > span:last-child {
    flex: none;
    font-family: ui-monospace, monospace;
    font-size: 13px;
    color: #94a3b8;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    dt {
      padding-bottom: 0;
    }
    dd {
      border-top: none;
      padding-top: 2px;
    }
  }
`;

/** Ce qui a été lu, partie par partie, sans jugement. */
function Inventory({ data: { volumes, c, s, a } }) {
  const { t } = useT();
  const { lang } = useLang();
  const n = (v, digits = 1) =>
    v == null
      ? null
      : Number(v).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", {
          useGrouping: false,
          maximumFractionDigits: digits,
        });
  const join = (...parts) => parts.filter(Boolean).join(" · ");
  const rows = [];

  if (s?.osLabel) rows.push([t.os, s.osLabel]);
  if (c?.machine) {
    rows.push([
      c.machine.kind === "board" ? t.board : t.computer,
      <>
        {[c.machine.maker, c.machine.model].filter(Boolean).join(" ")}
        {SUPPORT_PAGES[c.machine.maker] && (
          <>
            <br />
            <a
              href={SUPPORT_PAGES[c.machine.maker]}
              target="_blank"
              rel="noreferrer"
            >
              {t.support(c.machine.maker)}
              <Arrow />
            </a>
          </>
        )}
      </>,
    ]);
  }
  if (c?.cpu) {
    const ghz = c.cpu.maxMHz || c.cpu.boostMHz;
    rows.push([
      t.cpu,
      <>
        {c.cpu.name}
        <br />
        <span className="sub">
          {join(
            c.cpu.cores && t.coresN(c.cpu.cores, c.cpu.threads),
            ghz && `${n(ghz / 1000)} GHz`,
          )}
        </span>
      </>,
    ]);
  }
  if (c?.totalGB) {
    const first = c.memory[0];
    rows.push([
      t.memory,
      join(
        `${n(c.totalGB)} ${t.gb}`,
        !first?.unified && c.memory.length && t.sticksN(c.memory.length),
        (first?.configured ?? first?.rated) &&
          `${first.configured ?? first.rated} MHz`,
      ),
    ]);
  }
  for (const g of c?.gpus ?? []) {
    const page = driverPage(g.name, lang);
    const known = g.status != null || g.errorCode != null;
    const ok = known && /^ok$/i.test(g.status ?? "OK") && !g.errorCode;
    rows.push([
      t.gpu,
      <>
        {g.name}
        <br />
        <span className="sub">
          {join(
            g.driverYear &&
              `${t.driver} ${g.driverMonth ? `${String(g.driverMonth).padStart(2, "0")}/` : ""}${g.driverYear}`,
            g.driverVersion && `v${g.driverVersion}`,
            known &&
              `${t.state} : ${ok ? t.stateOk : t.stateError(g.errorCode)}`,
          )}
        </span>
        {page && (
          <>
            <br />
            <a href={page.url} target="_blank" rel="noreferrer">
              {t.update(page.vendor)}
              <Arrow />
            </a>
          </>
        )}
      </>,
    ]);
  }
  if (c?.bios?.year)
    rows.push([
      "BIOS",
      join(c.bios.vendor, c.bios.version, String(c.bios.year)),
    ]);
  if (s?.kind || s?.systemDisk?.name)
    rows.push([t.diskType, join(s.kind, s.systemDisk?.name)]);
  for (const v of volumes) {
    rows.push([
      v.name ?? `${v.driveLetter}:`,
      join(
        v.label,
        `${n(v.sizeGB)} ${t.gb}`,
        v.pct != null && t.freeOf(n(v.freeGB), n(v.pct)),
      ),
    ]);
  }
  if (s?.env?.battery) rows.push([t.battery, `${s.env.battery.pct} %`]);
  if (s?.env?.startup) {
    const names = s.env.startup.filter(Boolean);
    rows.push([
      t.startup,
      join(
        `${s.env.startup.length} ${t.programs(s.env.startup.length)}`,
        names.join(", "),
      ),
    ]);
  }
  if (s?.uptimeDays != null) rows.push([t.uptime, t.since(s.uptimeDays)]);
  if (s?.powerSaver != null)
    rows.push([t.power, s.powerSaver ? t.saver : t.normal]);
  if (a && (a.cpuLoad != null || a.memoryPct != null))
    rows.push([t.activity, t.busy(a.cpuLoad, a.memoryPct)]);
  if (a?.top?.length) {
    rows.push([
      t.topTitle,
      <ol key="top">
        {a.top.map((p) => (
          <li key={p.name}>
            <span>
              {p.name}
              {p.count > 1 && (
                <span className="sub"> · {t.processes(p.count)}</span>
              )}
            </span>
            <span>{formatBytes(p.bytes, lang)}</span>
          </li>
        ))}
      </ol>,
    ]);
  }

  return (
    <>
      <Section2 style={{ marginTop: 8 }}>{t.detected}</Section2>
      <Table>
        {rows.map(([k, v], i) => (
          <React.Fragment key={i}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </React.Fragment>
        ))}
      </Table>
    </>
  );
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
            linux: {
              command: COMMAND_LINUX,
              example: HARDWARE_LINUX,
              about: t.about.linux,
            },
          }}
          placeholder={t.placeholder}
          analyze={analyzeHardware}
          manual={HardwareManual}
          empty={t.empty}
        >
          {(data) => <HardwareResults data={data} />}
        </PasteStep>
      </Unfold>
    </div>
  );
}
