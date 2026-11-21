// ─────────────────────────────────────────────────────────────────────────────
// Lecture des capteurs de l'application desktop : températures, usure des
// SSD, ventilateurs, et suivi de la charge dans le temps.
// ─────────────────────────────────────────────────────────────────────────────

// Seuils, en °C : au-delà du premier, la pièce chauffe plus que d'ordinaire ;
// au-delà du second, elle ralentit pour se protéger ou s'use plus vite.
const LIMITS = {
  gpu: [83, 90],
  zone: [80, 90],
  ssd: [70, 80],
  hdd: [50, 60],
};

/** Usure d'un SSD, en % d'endurance consommée. */
const WEAR = [80, 95];

const level = (value, [warn, bad]) =>
  value == null
    ? "unknown"
    : value >= bad
      ? "problem"
      : value >= warn
        ? "warning"
        : "ok";

/**
 * Lignes à afficher, chacune avec son niveau.
 * @param {{ zones?: {name:string, celsius:number}[], fans?: {name:string, rpm:number}[], disks?: object[], gpus?: object[] }} data
 * @returns {{ kind: "gpu"|"zone"|"disk"|"wear"|"fan"|"gpuFan", name: string, value: number, level: string, unit: string, extra?: object }[]}
 */
export function sensorRows(data) {
  const rows = [];
  for (const g of data.gpus ?? []) {
    if (g.temperature != null)
      rows.push({
        kind: "gpu",
        name: g.name,
        value: g.temperature,
        unit: "°C",
        level: level(g.temperature, LIMITS.gpu),
        extra: { load: g.load, power: g.power },
      });
  }
  for (const z of data.zones ?? []) {
    // Zone à 0 K ou absurde : capteur absent.
    if (!(z.celsius > 0 && z.celsius < 130)) continue;
    rows.push({
      kind: "zone",
      name: z.name,
      value: z.celsius,
      unit: "°C",
      level: level(z.celsius, LIMITS.zone),
    });
  }
  for (const d of data.disks ?? []) {
    const ssd = /ssd/i.test(d.media) || /nvme/i.test(d.bus);
    if (d.temperature > 0)
      rows.push({
        kind: "disk",
        name: d.name,
        value: d.temperature,
        unit: "°C",
        level: level(d.temperature, ssd ? LIMITS.ssd : LIMITS.hdd),
      });
    // Journal de santé NVMe en priorité : l'usure qu'il donne est celle que
    // le SSD calcule lui-même (le compteur de Windows reste souvent à 0).
    const wear = d.nvme?.percentageUsed ?? d.wear;
    if (ssd && wear != null) {
      const heat = d.nvme?.warningTempMinutes ?? null;
      const critical = d.nvme?.criticalTempMinutes ?? null;
      // Quelques minutes au-dessus du seuil d'alerte arrivent ; au-delà
      // d'une heure, ou dès la moindre minute au seuil critique, le SSD a
      // vraiment chauffé.
      const heatLevel =
        critical > 0 ? "problem" : heat >= 60 ? "warning" : "ok";
      const wearLevel = level(wear, WEAR);
      const rank = { ok: 0, unknown: 0, warning: 1, problem: 2 };
      rows.push({
        kind: "wear",
        name: d.name,
        value: wear,
        unit: "%",
        level: rank[heatLevel] > rank[wearLevel] ? heatLevel : wearLevel,
        extra: {
          hours: d.nvme?.powerOnHours ?? d.powerOnHours,
          heatMinutes: heat,
          criticalMinutes: critical,
          mediaErrors: d.nvme?.mediaErrors ?? null,
        },
      });
    }
  }
  for (const g of data.gpus ?? []) {
    if (g.fan != null)
      rows.push({
        kind: "gpuFan",
        name: g.name,
        value: g.fan,
        unit: "%",
        level: "ok",
      });
  }
  for (const f of data.fans ?? []) {
    rows.push({
      kind: "fan",
      name: f.name,
      value: f.rpm,
      unit: "tr/min",
      // Ventilateur déclaré mais arrêté : à vérifier (peut aussi être un
      // ventilateur semi-passif, arrêté au repos).
      level: f.rpm === 0 ? "warning" : "ok",
    });
  }
  return rows;
}

/** Les disques n'ont rien donné : la lecture demande sans doute les droits administrateur. */
export function disksNeedAdmin(data) {
  const disks = data.disks ?? [];
  return (
    data.platform === "windows" &&
    disks.length > 0 &&
    disks.every((d) => d.temperature == null && d.wear == null)
  );
}

/**
 * Résumé d'une série du suivi : moyenne et maximum, en ignorant les trous.
 * @param {(number|null)[]} values
 */
export function seriesSummary(values) {
  const v = values.filter((x) => x != null && Number.isFinite(x));
  if (v.length === 0) return null;
  const avg = v.reduce((a, b) => a + b, 0) / v.length;
  return { avg: Math.round(avg), max: Math.round(Math.max(...v)) };
}

/**
 * Ralentissements de la carte graphique pendant le suivi, en secondes. La
 * carte n'est lue qu'une seconde sur deux : chaque relevé compte pour
 * l'intervalle depuis le précédent.
 * @param {{ t: number, gpuThermal?: boolean|null, gpuPower?: boolean|null }[]} samples
 * @returns {{ thermal: number, power: number } | null} null sans relevé de la carte
 */
export function slowdownSummary(samples) {
  const read = samples.filter((s) => s.gpuThermal != null);
  if (read.length === 0) return null;
  let thermal = 0;
  let power = 0;
  for (let i = 0; i < read.length; i++) {
    const span = i > 0 ? (read[i].t - read[i - 1].t) / 1000 : 1;
    if (read[i].gpuThermal) thermal += span;
    if (read[i].gpuPower) power += span;
  }
  return { thermal: Math.round(thermal), power: Math.round(power) };
}
