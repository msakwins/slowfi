// ─────────────────────────────────────────────────────────────────────────────
// Historique de Windows sur 90 jours : plantages du pilote graphique, erreurs
// matérielles (WHEA) et arrêts brutaux (Kernel-Power 41).
//
// Aucune carte graphique ne garde l'historique de ses températures. Ce que
// Windows garde, ce sont les dégâts : un pilote qui plante, une erreur
// matérielle, une machine qui s'éteint d'un coup. C'est le meilleur indice
// d'un composant affaibli par la chaleur ou l'usure.
//
// Lecture (sans droits administrateur), une ligne CSV par événement :
//   "TimeCreated","ProviderName","Id"
// ─────────────────────────────────────────────────────────────────────────────

export const EVENT_DAYS = 90;

export const EVENTS_READ = `Get-WinEvent -FilterHashtable @{LogName='System';Id=4101,13,14,153,1,17,18,19,47,41,1101,1102,1201,1202;StartTime=(Get-Date).AddDays(-${EVENT_DAYS})} -MaxEvents 500 -ErrorAction SilentlyContinue | Where-Object ProviderName -match 'Display|nvlddmkm|amdkmdag|amdwddmg|igfx|WHEA|Kernel-Power|MemoryDiagnostics' | Select-Object TimeCreated,ProviderName,Id | ConvertTo-Csv -NoTypeInformation`;

const HEADER = /^"TimeCreated","ProviderName","Id"\s*$/m;
const LINE = /^"([^"]+)","([^"]+)","(\d+)"\s*$/gm;

// Événements à moins de 10 minutes l'un de l'autre : un seul incident (un
// plantage du pilote écrit souvent une dizaine de lignes en quelques
// secondes).
const INCIDENT_GAP_MS = 10 * 60 * 1000;

/**
 * Date écrite par PowerShell : « 29/10/2026 21:47:11 » (français, jour en
 * premier), « 10/29/2026 9:47:11 PM » (anglais, repérable à AM/PM).
 * @returns {Date|null}
 */
export function parseEventDate(text) {
  const m = text.match(
    /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?/i,
  );
  if (!m) {
    const iso = Date.parse(text);
    return Number.isNaN(iso) ? null : new Date(iso);
  }
  let [a, b] = [Number(m[1]), Number(m[2])];
  const us = Boolean(m[7]);
  const [day, month] = a > 12 ? [a, b] : b > 12 ? [b, a] : us ? [b, a] : [a, b];
  let hour = Number(m[4]);
  if (us && /pm/i.test(m[7]) && hour < 12) hour += 12;
  if (us && /am/i.test(m[7]) && hour === 12) hour = 0;
  return new Date(
    Number(m[3]),
    month - 1,
    day,
    hour,
    Number(m[5]),
    Number(m[6] ?? 0),
  );
}

/** Nature d'un événement. */
function kindOf(provider, id) {
  // Test de mémoire de Windows : 1101/1201 réussi, 1102/1202 erreurs.
  if (/MemoryDiagnostics/i.test(provider))
    return id === 1102 || id === 1202 ? "memoryFail" : "memoryPass";
  if (/WHEA/i.test(provider)) return "hardware";
  if (/Kernel-Power/i.test(provider) && id === 41) return "shutdown";
  if (/Display|nvlddmkm|amdkmdag|amdwddmg|igfx/i.test(provider)) return "gpu";
  return null;
}

/** Résultat du test de mémoire le plus récent. */
function lastMemoryTest({ memoryFail, memoryPass }) {
  const latest = (dates) => dates.reduce((a, d) => (!a || d > a ? d : a), null);
  const fail = latest(memoryFail);
  const pass = latest(memoryPass);
  if (!fail && !pass) return null;
  return fail && (!pass || fail >= pass)
    ? { ok: false, date: fail }
    : { ok: true, date: pass };
}

/**
 * @param {string} raw
 * @returns {{ gpu: Date[], hardware: Date[], shutdown: Date[], afterGpu: number } | null}
 *   null si la lecture de l'historique n'est pas dans le texte collé
 */
export function parseEvents(raw) {
  if (!HEADER.test(raw)) return null;
  const events = {
    gpu: [],
    hardware: [],
    shutdown: [],
    memoryFail: [],
    memoryPass: [],
  };
  for (const m of raw.matchAll(LINE)) {
    const date = parseEventDate(m[1]);
    const kind = kindOf(m[2], Number(m[3]));
    if (date && kind) events[kind].push(date);
  }
  // Un incident par groupe d'événements rapprochés, daté du premier.
  const incidents = (dates) => {
    const sorted = [...dates].sort((x, y) => x - y);
    const out = [];
    for (const d of sorted)
      if (!out.length || d - out.at(-1).last > INCIDENT_GAP_MS)
        out.push({ first: d, last: d });
      else out.at(-1).last = d;
    return out;
  };
  const gpu = incidents(events.gpu);
  const shutdown = incidents(events.shutdown);
  // Arrêt brutal dans les 10 minutes qui suivent un plantage du pilote.
  const afterGpu = shutdown.filter((s) =>
    gpu.some(
      (g) => s.first - g.last >= 0 && s.first - g.last <= INCIDENT_GAP_MS,
    ),
  ).length;
  return {
    gpu: gpu.map((i) => i.first),
    hardware: incidents(events.hardware).map((i) => i.first),
    shutdown: shutdown.map((i) => i.first),
    afterGpu,
    // Dernier test de mémoire de Windows, s'il y en a eu un.
    memoryTest: lastMemoryTest(events),
  };
}

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
const dayFr = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Verdict sur l'historique.
 * @param {ReturnType<typeof parseEvents>} e
 */
export function diagnoseEvents(e) {
  const findings = [];
  const passed = [];
  let severity = "ok";
  const bump = (level) => {
    const rank = { ok: 0, warning: 1, problem: 2 };
    if (rank[level] > rank[severity]) severity = level;
  };

  const gpuN = e.gpu.length;
  if (gpuN > 0) {
    const level = gpuN >= 5 ? "problem" : "warning";
    bump(level);
    const last = e.gpu.at(-1);
    findings.push({
      level,
      id: "gpu-crashes",
      vars: { count: gpuN, last: iso(last) },
      title:
        gpuN === 1
          ? `Pilote graphique planté une fois en ${EVENT_DAYS} jours`
          : `Pilote graphique planté ${gpuN} fois en ${EVENT_DAYS} jours`,
      detail: `Dernier plantage le ${dayFr(last)}. Un pilote qui plante à répétition vient souvent d'une carte qui chauffe trop, d'un pilote abîmé, ou d'une carte qui s'use`,
      fix: "Suivre la température de la carte pendant un jeu (suivi sur une minute de l'application). Au-delà de 85 °C, dépoussiérer la carte et ses ventilateurs. En dessous, réinstaller le pilote depuis le site du fabricant",
    });
  } else {
    passed.push({
      id: "no-gpu-crash",
      vars: { days: EVENT_DAYS },
      label: `Aucun plantage du pilote graphique en ${EVENT_DAYS} jours`,
    });
  }

  const hwN = e.hardware.length;
  if (hwN > 0) {
    const level = hwN >= 3 ? "problem" : "warning";
    bump(level);
    findings.push({
      level,
      id: "hardware-errors",
      vars: { count: hwN, last: iso(e.hardware.at(-1)) },
      title:
        hwN === 1
          ? `Une erreur matérielle signalée par Windows en ${EVENT_DAYS} jours`
          : `${hwN} erreurs matérielles signalées par Windows en ${EVENT_DAYS} jours`,
      detail: `Dernière le ${dayFr(e.hardware.at(-1))}. Le processeur, la mémoire ou une carte a signalé une erreur : un composant qui chauffe, s'use ou est mal alimenté`,
      fix: "Lancer le Diagnostic de mémoire Windows (menu Démarrer) et suivre les températures. Si les erreurs continuent, faire contrôler l'ordinateur",
    });
  } else {
    passed.push({
      id: "no-hardware-error",
      vars: {},
      label: "Aucune erreur matérielle signalée par Windows",
    });
  }

  const offN = e.shutdown.length;
  if (offN > 0) {
    bump("warning");
    findings.push({
      level: "warning",
      id: "hard-shutdowns",
      vars: { count: offN, afterGpu: e.afterGpu, last: iso(e.shutdown.at(-1)) },
      title:
        offN === 1
          ? `Un arrêt brutal en ${EVENT_DAYS} jours`
          : `${offN} arrêts brutaux en ${EVENT_DAYS} jours`,
      detail: `L'ordinateur s'est éteint sans passer par l'arrêt normal, le dernier le ${dayFr(e.shutdown.at(-1))}${
        e.afterGpu
          ? e.afterGpu === offN
            ? ", juste après un plantage du pilote graphique"
            : `, dont ${e.afterGpu} juste après un plantage du pilote graphique`
          : ""
      }. Causes possibles : coupure de courant, bouton maintenu, ou extinction de protection en cas de surchauffe`,
      fix: "Si ce n'est pas une coupure de courant, suivre les températures et vérifier que les ventilateurs tournent",
    });
  } else {
    passed.push({
      id: "no-hard-shutdown",
      vars: { days: EVENT_DAYS },
      label: `Aucun arrêt brutal en ${EVENT_DAYS} jours`,
    });
  }

  const mem = e.memoryTest;
  if (mem && !mem.ok) {
    bump("problem");
    findings.push({
      level: "problem",
      id: "memory-test-failed",
      vars: { date: iso(mem.date) },
      title: "Le test de mémoire de Windows a trouvé des erreurs",
      detail: `Test du ${dayFr(mem.date)}. Une barrette de mémoire défaillante provoque plantages, écrans bleus et fichiers abîmés`,
      fix: "Relancer le test avec une seule barrette à la fois (Diagnostic de mémoire Windows) pour trouver celle qui échoue, puis la remplacer",
    });
  } else if (mem) {
    passed.push({
      id: "memory-test-ok",
      vars: { date: iso(mem.date) },
      label: `Test de mémoire de Windows réussi le ${dayFr(mem.date)}`,
    });
  }

  return { severity, findings, passed };
}

/** Historique lu dans le texte collé, ou null. */
export function analyzeEvents(raw) {
  const e = parseEvents(raw);
  return e ? diagnoseEvents(e) : null;
}
