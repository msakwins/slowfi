// ─────────────────────────────────────────────────────────────────────────────
// Capteurs, réservés à l'application : ce qu'un site ne peut pas lire, même
// par copier-coller.
//
// - Windows : zones thermiques ACPI (compteurs de performance), température
//   et usure des disques (Get-StorageReliabilityCounter, qui peut demander
//   les droits administrateur selon la machine).
// - Linux : /sys/class/hwmon (températures et ventilateurs, sans root).
// - Carte graphique NVIDIA, sur tous les systèmes : nvidia-smi, installé avec
//   le pilote (température, ventilateur, charge, consommation).
// - Suivi dans le temps : charge du processeur et de la mémoire, mesurées par
//   Node, sans lancer de commande.
// ─────────────────────────────────────────────────────────────────────────────
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const WINDOWS_SENSORS = `
$zones = @(Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation -ErrorAction SilentlyContinue | ForEach-Object {
  @{ name = $_.Name; celsius = [math]::Round($_.HighPrecisionTemperature / 10 - 273.15, 1) }
})
$disks = @(Get-PhysicalDisk | ForEach-Object {
  $r = $_ | Get-StorageReliabilityCounter -ErrorAction SilentlyContinue
  @{
    name = $_.FriendlyName; media = [string]$_.MediaType; bus = [string]$_.BusType
    temperature = $r.Temperature; temperatureMax = $r.TemperatureMax
    wear = $r.Wear; powerOnHours = $r.PowerOnHours
    readErrors = $r.ReadErrorsTotal; writeErrors = $r.WriteErrorsTotal
  }
})
@{ zones = $zones; disks = $disks } | ConvertTo-Json -Depth 4 -Compress
`;

/** Script PowerShell encodé, sortie en UTF-8. */
function powershellArgs(script) {
  const full = `[Console]::OutputEncoding = [Text.Encoding]::UTF8\n$ProgressPreference = 'SilentlyContinue'\n${script}`;
  return [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-EncodedCommand",
    Buffer.from(full, "utf16le").toString("base64"),
  ];
}

function run(cmd, args, timeout = 30_000) {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      { windowsHide: true, timeout, maxBuffer: 4 << 20 },
      (error, stdout) => resolve(error && !stdout ? null : String(stdout)),
    );
  });
}

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// ── Carte graphique NVIDIA ──────────────────────────────────────────────────

const SMI_FIELDS = [
  "name",
  "temperature.gpu",
  "fan.speed",
  "utilization.gpu",
  "power.draw",
  "memory.used",
  "memory.total",
];

/** Une ligne par carte NVIDIA, ou [] sans nvidia-smi. */
async function readNvidia() {
  const out = await run(
    "nvidia-smi",
    [`--query-gpu=${SMI_FIELDS.join(",")}`, "--format=csv,noheader,nounits"],
    8000,
  );
  if (!out) return [];
  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  return out
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(",").map((s) => s.trim()))
    .filter((p) => p.length >= SMI_FIELDS.length)
    .map(([name, temp, fan, load, power, used, total]) => ({
      name,
      temperature: num(temp),
      fan: num(fan),
      load: num(load),
      power: num(power),
      memoryUsed: num(used),
      memoryTotal: num(total),
    }));
}

// ── Linux : hwmon ───────────────────────────────────────────────────────────

function readHwmon() {
  const base = "/sys/class/hwmon";
  const zones = [];
  const fans = [];
  let entries = [];
  try {
    entries = fs.readdirSync(base);
  } catch {
    return { zones, fans };
  }
  const read = (file) => {
    try {
      return fs.readFileSync(file, "utf8").trim();
    } catch {
      return null;
    }
  };
  for (const dir of entries) {
    const full = path.join(base, dir);
    const chip = read(path.join(full, "name")) ?? dir;
    let files = [];
    try {
      files = fs.readdirSync(full);
    } catch {
      continue;
    }
    for (const f of files) {
      const temp = f.match(/^temp(\d+)_input$/);
      const fan = f.match(/^fan(\d+)_input$/);
      if (temp) {
        const value = Number(read(path.join(full, f)));
        if (!Number.isFinite(value) || value <= 0) continue;
        const label = read(path.join(full, `temp${temp[1]}_label`));
        zones.push({
          name: label ? `${chip} ${label}` : chip,
          celsius: Math.round(value / 100) / 10,
        });
      } else if (fan) {
        const rpm = Number(read(path.join(full, f)));
        if (!Number.isFinite(rpm)) continue;
        const label = read(path.join(full, `fan${fan[1]}_label`));
        fans.push({ name: label ? `${chip} ${label}` : chip, rpm });
      }
    }
  }
  return { zones, fans };
}

// ── Lecture complète ────────────────────────────────────────────────────────

/**
 * @returns {Promise<{ platform: string, zones: {name:string, celsius:number}[], fans: {name:string, rpm:number}[], disks: object[], gpus: object[] }>}
 */
/**
 * Journal de santé des SSD NVMe (nvme-health.ps1) : usure, heures, minutes
 * passées trop chaud depuis la fabrication. Une entrée par SSD NVMe.
 */
async function readNvmeHealth() {
  let script;
  try {
    // Lu depuis l'archive de l'application : Electron sait lire dans app.asar.
    script = fs.readFileSync(path.join(__dirname, "nvme-health.ps1"), "utf8");
  } catch {
    return [];
  }
  const out = await run("powershell.exe", powershellArgs(script), 60_000);
  return (out ?? "")
    .split(/\r?\n/)
    .map((line) => parseJson(line.trim()))
    .filter((d) => d?.readable);
}

async function readSensors() {
  const gpus = await readNvidia();
  if (process.platform === "win32") {
    const [raw, nvme] = await Promise.all([
      run("powershell.exe", powershellArgs(WINDOWS_SENSORS), 60_000),
      readNvmeHealth(),
    ]);
    const data = parseJson(raw) ?? {};
    // Chaque SSD NVMe reçoit son journal de santé, reconnu à son nom.
    const disks = [data.disks ?? []].flat().map((d) => ({
      ...d,
      nvme: nvme.find((n) => n.name === d.name) ?? null,
    }));
    return {
      platform: "windows",
      zones: [data.zones ?? []].flat(),
      fans: [],
      disks,
      gpus,
    };
  }
  if (process.platform === "linux") {
    return { platform: "linux", ...readHwmon(), disks: [], gpus };
  }
  return { platform: "mac", zones: [], fans: [], disks: [], gpus };
}

/**
 * Même lecture des disques, dans un PowerShell lancé avec les droits
 * administrateur : Windows affiche sa demande d'autorisation. Le résultat
 * passe par un fichier temporaire, effacé ensuite.
 */
async function readDisksAsAdmin() {
  if (process.platform !== "win32") return null;
  const file = path.join(os.tmpdir(), `slowfi-disks-${process.pid}.json`);
  const inner = `${WINDOWS_SENSORS.trim()} | Set-Content -Encoding UTF8 -LiteralPath '${file.replace(/'/g, "''")}'`;
  const encoded = Buffer.from(
    `$ProgressPreference = 'SilentlyContinue'\n${inner}`,
    "utf16le",
  ).toString("base64");
  const launcher = `Start-Process powershell.exe -Verb RunAs -WindowStyle Hidden -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand','${encoded}'`;
  await run("powershell.exe", powershellArgs(launcher), 120_000);
  try {
    const data = parseJson(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
    return data ? [data.disks ?? []].flat() : null;
  } catch {
    // Autorisation refusée : pas de fichier.
    return null;
  } finally {
    fs.rm(file, { force: true }, () => {});
  }
}

// ── Ralentissements de la carte NVIDIA ───────────────────────────────────────
// La carte baisse d'elle-même sa fréquence quand elle chauffe trop
// (« thermal ») ou atteint sa limite de consommation (« power »). Les champs
// s'appellent clocks_event_reasons depuis 2023, clocks_throttle_reasons
// avant : l'ancien nom sert de repli.

const SLOW_FIELDS = [
  "hw_thermal_slowdown",
  "sw_thermal_slowdown",
  "sw_power_cap",
  "hw_power_brake_slowdown",
];
let slowPrefix = "clocks_event_reasons";

async function readSlowdown() {
  for (const prefix of [slowPrefix, "clocks_throttle_reasons"]) {
    const out = await run(
      "nvidia-smi",
      [
        `--query-gpu=${SLOW_FIELDS.map((f) => `${prefix}.${f}`).join(",")}`,
        "--format=csv,noheader",
      ],
      8000,
    );
    const line = out?.trim().split(/\r?\n/)[0];
    if (!line || /field|invalid/i.test(line)) continue;
    slowPrefix = prefix;
    const [hwHot, swHot, power, brake] = line
      .split(",")
      .map((v) => /^\s*active/i.test(v));
    return { thermal: hwHot || swHot, power: power || brake };
  }
  return null;
}

// ── Suivi dans le temps ─────────────────────────────────────────────────────

let lastCpu = null;

function cpuTimes() {
  return os.cpus().reduce(
    (t, c) => {
      const total = Object.values(c.times).reduce((a, b) => a + b, 0);
      return { idle: t.idle + c.times.idle, total: t.total + total };
    },
    { idle: 0, total: 0 },
  );
}

/** Charge du processeur depuis l'échantillon précédent, mémoire, carte NVIDIA. */
async function sample(withGpu) {
  const now = cpuTimes();
  let cpu = null;
  if (lastCpu) {
    const total = now.total - lastCpu.total;
    const idle = now.idle - lastCpu.idle;
    cpu = total > 0 ? Math.round((1 - idle / total) * 1000) / 10 : null;
  }
  lastCpu = now;
  const memory = Math.round((1 - os.freemem() / os.totalmem()) * 1000) / 10;
  const [gpu, slow] = withGpu
    ? await Promise.all([
        readNvidia().then((g) => g[0] ?? null),
        readSlowdown(),
      ])
    : [null, null];
  return {
    t: Date.now(),
    cpu,
    memory,
    gpuLoad: gpu?.load ?? null,
    gpuTemperature: gpu?.temperature ?? null,
    // Ralentie pour chaleur ou pour consommation, à cet instant.
    gpuThermal: slow ? slow.thermal : null,
    gpuPower: slow ? slow.power : null,
  };
}

module.exports = { readSensors, readDisksAsAdmin, sample };
