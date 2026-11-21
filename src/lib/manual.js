// ─────────────────────────────────────────────────────────────────────────────
// Saisie guidée, sans commande : les valeurs relevées à la main dans les
// réglages de Windows ou de macOS sont converties dans la forme que lisent
// les moteurs. Les règles restent les mêmes que pour une commande collée.
//
// Chaque champ est facultatif : on analyse ce qui a été rempli.
// ─────────────────────────────────────────────────────────────────────────────
import { diagnose } from "./diagnostic.js";
import { gradeVolume } from "./storage.js";
import { diagnoseComponents } from "./components.js";
import { diagnoseSystem } from "./system.js";
import { monthOf } from "./powershell.js";
import { diagnoseDevices } from "./devices.js";
import { diagnoseActivity } from "./activity.js";
import { shortMaker } from "./components.js";

// Numéro de build de chaque version de Windows 11, pour retrouver la date de
// fin de support à partir du nom affiché dans les Paramètres (« 24H2 »).
const BUILDS = {
  "21H2": 22000,
  "22H2": 22621,
  "23H2": 22631,
  "24H2": 26100,
  "25H2": 26200,
  "26H1": 28000,
  "26H2": 26300,
};

const GIB = 1024 ** 3;

/** Champ texte → nombre, en acceptant la virgule décimale ; null si vide. */
export function num(v) {
  if (v == null) return null;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return String(v).trim() === "" || !Number.isFinite(n) ? null : n;
}

// Barres de l'icône Wi-Fi (Windows) → ordre de grandeur en %.
const BARS = { 1: 25, 2: 50, 3: 75, 4: 95 };

/**
 * @param {{
 *   band?: "2.4 GHz"|"5 GHz"|"6 GHz"|"",
 *   radio?: string,
 *   channel?: string,
 *   rate?: string,
 *   bars?: string,   Windows : nombre de barres (1–4)
 *   rssi?: string,   macOS : RSSI en dBm
 * }} f
 * @returns {ReturnType<typeof diagnose>|null}
 */
export function wifiFromForm(f) {
  const rssi = num(f.rssi);
  const d = {
    radio: f.radio || null,
    channel: num(f.channel),
    band: f.band || null,
    signal:
      rssi != null
        ? Math.max(0, Math.min(100, 2 * (-Math.abs(rssi) + 100)))
        : (BARS[f.bars] ?? null),
    rx: num(f.rate),
    tx: null,
    ssid: null,
  };
  if (!d.band && d.channel == null && !d.radio) return null;
  return diagnose(d);
}

/**
 * @param {{
 *   platform: "windows"|"mac",
 *   disks: Array<{ name?: string, free?: string, total?: string }>,
 *   memory?: string,     total en Go
 *   speed?: string,      fréquence appliquée (Gestionnaire des tâches), MHz
 *   rated?: string,      fréquence annoncée des barrettes, MHz
 *   slots?: string,      emplacements utilisés
 *   gpuYear?: string,    date du pilote graphique (« 07/11/2026 ») ou son année
 *   gpuState?: "ok"|"error"|"disabled"|"",  icône dans le Gestionnaire de périphériques
 *   biosYear?: string,   année de la date du BIOS
 *   diskType?: "SSD"|"HDD"|"",  type du disque système
 *   uptime?: string,     jours depuis le démarrage (1er nombre de « 3:04:12:55 »)
 *   power?: "saver"|"normal"|"",
 * }} f
 * @param {{ year?: number }} [opts]
 */
export function hardwareFromForm(f, opts) {
  const mac = f.platform === "mac";
  const linux = f.platform === "linux";
  // L'Explorateur Windows compte en Go binaires, macOS et GNOME en Go décimaux.
  const unit = mac || linux ? 1e9 : GIB;

  const volumes = (f.disks || [])
    .map((d, i) => {
      const total = num(d.total);
      const free = num(d.free);
      if (total == null || free == null || total <= 0) return null;
      const letter =
        mac || linux
          ? null
          : (d.name || (i === 0 ? "C" : ""))
              .replace(/[:\s]/g, "")
              .toUpperCase();
      return gradeVolume(
        {
          name: mac ? d.name || "Macintosh HD" : linux ? "/" : `${letter}:`,
          driveLetter: letter,
          label: null,
          size: total * unit,
          free: free * unit,
          health: null,
          operational: null,
        },
        { system: mac || linux || letter === "C" },
      );
    })
    .filter(Boolean);

  const total = num(f.memory);
  const slots = mac ? null : num(f.slots);
  const memory = [];
  if (total != null) {
    if (mac || !slots) {
      // Mac, ou nombre d'emplacements inconnu : un seul bloc, sans règle de
      // simple canal (rien ne dit qu'il n'y a qu'une barrette).
      memory.push({
        slot: null,
        capacity: total * GIB,
        rated: num(f.rated),
        configured: num(f.speed),
        unified: true,
      });
    } else {
      for (let i = 0; i < slots; i++) {
        memory.push({
          slot: null,
          capacity: (total / slots) * GIB,
          rated: num(f.rated),
          configured: num(f.speed),
        });
      }
    }
  }
  // Date complète si elle est saisie telle quelle, sinon l'année seule.
  const gpuDate = monthOf(f.gpuYear || "");
  const gpuYear = gpuDate?.year ?? num(f.gpuYear);
  const gpuState = {
    ok: { status: "OK", errorCode: 0 },
    error: { status: "Error", errorCode: null },
    disabled: { status: "Error", errorCode: 22 },
  }[f.gpuState];
  const biosYear = num(f.biosYear);
  const c = {
    memory,
    gpus:
      gpuYear || gpuState
        ? [
            {
              name: null,
              driverVersion: null,
              driverYear: gpuYear,
              driverMonth: gpuDate?.month ?? null,
              status: gpuState?.status ?? null,
              errorCode: gpuState?.errorCode ?? null,
            },
          ]
        : [],
    bios: biosYear ? { vendor: null, version: null, year: biosYear } : null,
    platform: f.platform,
  };
  const hasComponents = memory.length > 0 || c.gpus.length > 0 || c.bios;

  if (f.boardMaker || f.boardModel) {
    c.machine = {
      kind: "board",
      maker: shortMaker(f.boardMaker),
      model: f.boardModel || null,
      laptop: false,
    };
  }
  const hasMachine = Boolean(c.machine);

  // Version du système, batterie, programmes au démarrage.
  const version = (f.osVersion || "").trim().toUpperCase();
  let os = null;
  if (linux && f.osVersion) {
    os = { kind: "linux", label: f.osVersion.trim() };
  } else if (f.platform === "mac" && version) {
    const m = version.match(/(\d+)(?:\.(\d+))?/);
    if (m)
      os = {
        kind: "mac",
        major: Number(m[1]),
        version: m[2] ? `${m[1]}.${m[2]}` : m[1],
      };
  } else if (f.os) {
    os = {
      kind: "windows",
      caption: {
        w10: "Windows 10",
        "w11-home": "Windows 11 Famille",
        "w11-ent": "Windows 11 Entreprise",
      }[f.os],
      build: f.os === "w10" ? 19045 : (BUILDS[version] ?? null),
      displayVersion: version || null,
    };
  }
  const batteryPct = num(f.batteryPct);
  const startupCount = num(f.startupCount);
  const env = {
    os,
    battery:
      batteryPct != null
        ? { pct: batteryPct, cycles: null, condition: null }
        : null,
    startup: startupCount ? Array(Math.round(startupCount)).fill(null) : null,
  };

  const uptimeDays = num(f.uptime);
  const hasSystem =
    Boolean(f.diskType) ||
    uptimeDays != null ||
    Boolean(f.power) ||
    Boolean(os) ||
    Boolean(env.battery) ||
    Boolean(env.startup);
  const system = hasSystem
    ? diagnoseSystem(
        {
          platform: f.platform,
          disks: [],
          systemDisk: f.diskType
            ? { mediaType: f.diskType, busType: null, name: null }
            : null,
          uptimeDays: uptimeDays == null ? null : Math.floor(uptimeDays),
          powerSaver: f.power ? f.power === "saver" : null,
          env,
        },
        opts?.today ? { today: opts.today } : undefined,
      )
    : null;

  // Activité : les deux pourcentages en tête du Gestionnaire des tâches.
  const cpuLoad = num(f.cpuLoad);
  const memoryPct = num(f.memoryPct);
  const activity =
    cpuLoad != null || memoryPct != null
      ? diagnoseActivity({ platform: f.platform, cpuLoad, memoryPct, top: [] })
      : null;

  const anyComponents = hasComponents || hasMachine;
  if (volumes.length === 0 && !anyComponents && !system && !activity)
    return null;
  return {
    volumes,
    components: anyComponents ? diagnoseComponents(c, opts) : null,
    system,
    activity,
  };
}

/**
 * Périphériques relevés à la main.
 *   Windows : appareils marqués d'un triangle jaune ou d'une flèche vers le
 *   bas dans le Gestionnaire de périphériques, séparés par des virgules.
 *   macOS : appareils absents ou défaillants dans les Réglages Système.
 * @param {{ platform: "windows"|"mac", state?: "none"|"some"|"", errors?: string, disabled?: string, missing?: string }} f
 */
export function devicesFromForm(f) {
  const names = (v) =>
    (v || "")
      .split(/[,;\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
  const devices =
    f.platform !== "windows"
      ? names(f.missing).map((name) => ({
          name,
          group: null,
          code: null,
          status: "Error",
        }))
      : [
          ...names(f.errors).map((name) => ({
            name,
            group: null,
            code: null,
            status: "Error",
          })),
          ...names(f.disabled).map((name) => ({
            name,
            group: null,
            code: 22,
            status: "Error",
          })),
        ];
  if (devices.length === 0 && f.state !== "none") return null;
  return diagnoseDevices({ platform: f.platform, devices });
}
