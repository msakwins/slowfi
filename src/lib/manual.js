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
 *   gpuYear?: string,    année de la date du pilote graphique
 *   biosYear?: string,   année de la date du BIOS
 * }} f
 * @param {{ year?: number }} [opts]
 */
export function hardwareFromForm(f, opts) {
  const mac = f.platform === "mac";
  // L'Explorateur Windows compte en Go binaires, macOS en Go décimaux.
  const unit = mac ? 1e9 : GIB;

  const volumes = (f.disks || [])
    .map((d, i) => {
      const total = num(d.total);
      const free = num(d.free);
      if (total == null || free == null || total <= 0) return null;
      const letter = mac
        ? null
        : (d.name || (i === 0 ? "C" : "")).replace(/[:\s]/g, "").toUpperCase();
      return gradeVolume(
        {
          name: mac ? d.name || "Macintosh HD" : `${letter}:`,
          driveLetter: letter,
          label: null,
          size: total * unit,
          free: free * unit,
          health: null,
          operational: null,
        },
        { system: mac || letter === "C" },
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
  const gpuYear = num(f.gpuYear);
  const biosYear = num(f.biosYear);
  const c = {
    memory,
    gpus: gpuYear
      ? [{ name: null, driverVersion: null, driverYear: gpuYear }]
      : [],
    bios: biosYear ? { vendor: null, version: null, year: biosYear } : null,
    platform: f.platform,
  };
  const hasComponents = memory.length > 0 || c.gpus.length > 0 || c.bios;

  if (volumes.length === 0 && !hasComponents) return null;
  return {
    volumes,
    components: hasComponents ? diagnoseComponents(c, opts) : null,
  };
}
