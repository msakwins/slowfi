// ─────────────────────────────────────────────────────────────────────────────
// Capteurs sous macOS (application desktop).
//
// - Santé des SSD, sans droits : system_profiler SPNVMeDataType
//   SPSerialATADataType (« SMART Status: Verified »).
// - Températures, ventilateurs, niveau de chauffe : powermetrics, qui exige
//   le mot de passe administrateur (macOS l'affiche dans sa propre fenêtre).
//   Les Mac Apple Silicon ne donnent que le niveau de chauffe (« Nominal »,
//   « Fair », « Serious », « Critical ») ; les Mac Intel donnent aussi les
//   températures du processeur et de la puce graphique, et les ventilateurs.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Disques de system_profiler : nom et état SMART.
 * @returns {{ name: string, media: string, bus: string, smart: string|null }[]}
 */
export function parseMacDisks(text) {
  const disks = [];
  let current = null;
  let bus = "SATA";
  for (const line of String(text).split(/\r?\n/)) {
    if (/^NVMExpress:/i.test(line.trim())) bus = "NVMe";
    if (/^SATA(\/SATA Express)?:/i.test(line.trim())) bus = "SATA";
    const model = line.match(/^\s+Model:\s*(.+)$/);
    if (model) {
      current = { name: model[1].trim(), media: "SSD", bus, smart: null };
      disks.push(current);
      continue;
    }
    const medium = line.match(/^\s+Medium Type:\s*(.+)$/);
    if (medium && current)
      current.media = /rotational/i.test(medium[1]) ? "HDD" : "SSD";
    const smart = line.match(/^\s+S\.M\.A\.R\.T\. status:\s*(.+)$/i);
    if (smart && current) current.smart = smart[1].trim();
  }
  return disks;
}

/**
 * Sortie de powermetrics (--samplers smc,thermal).
 * @returns {{ zones: {name:string, celsius:number}[], fans: {name:string, rpm:number}[], pressure: string|null }}
 */
export function parsePowermetrics(text) {
  const zones = [];
  const fans = [];
  const t = String(text);
  for (const m of t.matchAll(/^(CPU|GPU) die temperature:\s*([\d.]+)\s*C/gim)) {
    zones.push({
      name: m[1].toUpperCase() === "CPU" ? "Processeur" : "Puce graphique",
      celsius: Math.round(Number(m[2]) * 10) / 10,
    });
  }
  let i = 0;
  for (const m of t.matchAll(/^Fan:\s*([\d.]+)\s*rpm/gim)) {
    i += 1;
    fans.push({ name: `Ventilateur ${i}`, rpm: Math.round(Number(m[1])) });
  }
  const pressure = t.match(/Current pressure level:\s*(\w+)/i)?.[1] ?? null;
  return { zones, fans, pressure };
}

/** Niveau de chauffe de macOS → niveau Slowfi. */
export function pressureLevel(pressure) {
  if (!pressure) return "unknown";
  if (/nominal/i.test(pressure)) return "ok";
  if (/fair|moderate/i.test(pressure)) return "warning";
  return "problem";
}
