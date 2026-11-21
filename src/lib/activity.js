// ─────────────────────────────────────────────────────────────────────────────
// Activité au moment de la commande : charge du processeur, mémoire utilisée,
// et les programmes qui en consomment le plus.
//
// C'est un instantané : il répond à « pourquoi c'est lent maintenant », pas à
// « est-ce lent en général ». Le suivi dans le temps attendra l'application
// desktop.
//
// Windows : Win32_Processor (LoadPercentage), Win32_OperatingSystem (mémoire
// totale et libre, en Ko) et Get-Process (mémoire de chaque processus, à
// regrouper par programme). macOS : top et memory_pressure.
// ─────────────────────────────────────────────────────────────────────────────
import { field, number } from "./powershell.js";
import { isLinux, parseLinuxActivity } from "./linux.js";

const MEMORY_FULL_PCT = 90;
const CPU_BUSY_PCT = 90;

// La commande elle-même tourne pendant la mesure : ses processus sont écartés.
const SELF =
  /^(powershell|pwsh|conhost|wmiprvse|cmd|windowsterminal|top|system_profiler)$/i;

/**
 * @param {Array<Record<string,string>>} blocks
 * @param {string} raw
 */
export function parseActivity(blocks, raw) {
  const cpu = blocks.find((f) => "LoadPercentage" in f);
  const os = blocks.find((f) => "TotalVisibleMemorySize" in f);
  const procs = blocks.filter((f) => "ProcessName" in f && "WorkingSet64" in f);

  if (cpu || os || procs.length > 0) {
    const total = os ? number(os, "TotalVisibleMemorySize") : null;
    const free = os ? number(os, "FreePhysicalMemory") : null;
    // Un programme ouvre souvent plusieurs processus (un navigateur, un par
    // onglet) : on additionne par nom.
    const byName = new Map();
    for (const f of procs) {
      const name = field(f, "ProcessName");
      if (!name || SELF.test(name)) continue;
      const cur = byName.get(name) ?? { name, bytes: 0, count: 0 };
      cur.bytes += number(f, "WorkingSet64") || 0;
      cur.count += 1;
      byName.set(name, cur);
    }
    return {
      platform: "windows",
      cpuLoad: cpu ? number(cpu, "LoadPercentage") : null,
      memoryPct:
        total && free != null
          ? Math.round(((total - free) / total) * 100)
          : null,
      top: [...byName.values()].sort((a, b) => b.bytes - a.bytes).slice(0, 5),
    };
  }

  if (isLinux(raw)) {
    const linux = parseLinuxActivity(raw);
    if (linux) return linux;
  }

  // macOS : « System-wide memory free percentage: 23% » (memory_pressure) et
  // « CPU usage: 12.5% user, 8.1% sys, 79.3% idle » (top).
  const freePct = raw.match(/memory free percentage:\s*(\d+)\s*%/i);
  const usage = [...raw.matchAll(/CPU usage:.*?([\d.]+)%\s*idle/gi)].at(-1);
  if (!freePct && !usage) return null;

  // Tableau de top : « COMMAND %CPU MEM », dernier échantillon seulement (le
  // premier mesure mal le processeur).
  const top = [];
  const header = [...raw.matchAll(/^COMMAND\s+%CPU\s+MEM\s*$/gim)].at(-1);
  if (header) {
    for (const line of raw
      .slice(header.index + header[0].length)
      .split(/\r?\n/)) {
      const m = line.match(/^(.+?)\s+([\d.]+)\s+([\d.]+)([KMG])\+?\s*$/);
      if (!m || SELF.test(m[1].trim())) continue;
      const unit = { K: 1024, M: 1024 ** 2, G: 1024 ** 3 }[m[4]];
      top.push({
        name: m[1].trim(),
        bytes: Number(m[3]) * unit,
        count: 1,
        cpu: Number(m[2]),
      });
      if (top.length === 5) break;
    }
  }
  return {
    platform: "mac",
    cpuLoad: usage ? Math.round(100 - Number(usage[1])) : null,
    memoryPct: freePct ? 100 - Number(freePct[1]) : null,
    top: top.sort((a, b) => b.bytes - a.bytes),
  };
}

/** Octets → « 1,2 Go » ou « 450 Mo ». */
export function formatBytes(bytes, lang = "fr") {
  const gb = bytes / 1024 ** 3;
  const n = (v) => (lang === "fr" ? String(v).replace(".", ",") : String(v));
  if (gb >= 1)
    return `${n(Math.round(gb * 10) / 10)} ${lang === "fr" ? "Go" : "GB"}`;
  return `${Math.round(bytes / 1024 ** 2)} ${lang === "fr" ? "Mo" : "MB"}`;
}

/** @param {NonNullable<ReturnType<typeof parseActivity>>} a */
export function diagnoseActivity(a) {
  const findings = [];
  let severity = "ok";
  const bump = (level) => {
    const rank = { ok: 0, warning: 1, problem: 2 };
    if (rank[level] > rank[severity]) severity = level;
  };
  const heaviest = a.top
    .slice(0, 3)
    .map((p) => `${p.name} (${formatBytes(p.bytes)})`)
    .join(", ");

  if (a.memoryPct != null && a.memoryPct >= MEMORY_FULL_PCT) {
    bump("warning");
    findings.push({
      level: "warning",
      id: "memory-full",
      vars: { pct: a.memoryPct, top: a.top.slice(0, 3) },
      title: `Mémoire presque pleine (${a.memoryPct} % utilisés)`,
      detail: `Le système commence à écrire sur le disque à la place de la mémoire : tout ralentit.${heaviest ? ` Les plus gros consommateurs : ${heaviest}` : ""}`,
      fix: "Fermer les programmes inutilisés, en commençant par les plus gourmands. Si la mémoire reste pleine au quotidien, en ajouter",
    });
  }

  if (a.cpuLoad != null && a.cpuLoad >= CPU_BUSY_PCT) {
    bump("warning");
    findings.push({
      level: "warning",
      id: "cpu-busy",
      vars: { pct: a.cpuLoad },
      title: `Processeur très sollicité (${a.cpuLoad} %)`,
      detail:
        "Au moment de la commande, le processeur tournait presque à plein : les autres programmes attendent leur tour",
      fix: "Ouvrir le Gestionnaire des tâches (Ctrl + Maj + Échap), trier par « Processeur » et fermer le programme en tête s'il n'est pas utile",
    });
  }

  if (findings.length === 0) {
    findings.push({
      id: "healthy",
      title: "Aucune surcharge au moment de la commande",
    });
  }

  const passed = [];
  if (a.memoryPct != null && a.memoryPct < MEMORY_FULL_PCT) {
    passed.push({
      id: "memory-ok",
      vars: { pct: a.memoryPct },
      label: `Mémoire utilisée à ${a.memoryPct} %`,
    });
  }
  if (a.cpuLoad != null && a.cpuLoad < CPU_BUSY_PCT) {
    passed.push({
      id: "cpu-ok",
      vars: { pct: a.cpuLoad },
      label: `Processeur occupé à ${a.cpuLoad} %`,
    });
  }

  return { ...a, severity, findings, passed };
}

export function analyzeActivity(blocks, raw) {
  const a = parseActivity(blocks, raw);
  return a ? diagnoseActivity(a) : null;
}
