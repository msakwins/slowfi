// ─────────────────────────────────────────────────────────────────────────────
// Version du système, batterie et programmes lancés au démarrage. Ces règles
// complètent celles de system.js et s'affichent dans le même bloc.
//
// - Version : un Windows ou un macOS qui ne reçoit plus de correctifs de
//   sécurité. Windows 10 n'est plus suivi depuis le 14 octobre 2025.
// - Batterie : capacité restante par rapport à l'origine. Une batterie usée
//   tient moins longtemps et peut brider le processeur.
// - Démarrage : chaque programme inscrit ralentit l'ouverture de session et
//   occupe de la mémoire en permanence.
// ─────────────────────────────────────────────────────────────────────────────
import { field, number } from "./powershell.js";

// Fin du support de chaque version de Windows 11 (numéro de build), pour les
// éditions Famille et Professionnel, puis Entreprise et Éducation, qui ont
// douze mois de plus. Dernier jour de support, heure du Pacifique.
// Source, vérifiée le 20 novembre 2026 :
//   https://learn.microsoft.com/lifecycle/products/windows-11-home-and-pro
//   https://learn.microsoft.com/lifecycle/products/windows-11-enterprise-and-education
// À compléter à chaque nouvelle version. 26H1 (build 28000) est réservée aux
// nouveaux PC Arm ; 26H2 (build 26300) suit 25H2 sur les autres.
const WINDOWS_11 = [
  [22000, "21H2", "2023-10-10", "2024-10-08"],
  [22621, "22H2", "2024-10-08", "2025-10-14"],
  [22631, "23H2", "2025-11-11", "2026-11-10"],
  [26100, "24H2", "2026-10-13", "2027-10-12"],
  [26200, "25H2", "2027-10-12", "2028-10-10"],
  [26300, "26H2", "2028-10-09", "2029-10-08"],
  [28000, "26H1", "2028-03-14", "2029-03-13"],
];
const WINDOWS_10_END = "2025-10-14";

// Une alerte « fin proche » quand il reste moins de trois mois.
const ENDING_DAYS = 90;

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

/** « 2025-10-14 » → « 14 octobre 2025 ». */
export function dateFr(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

const MAC_NAMES = {
  11: "Big Sur",
  12: "Monterey",
  13: "Ventura",
  14: "Sonoma",
  15: "Sequoia",
  26: "Tahoe",
};

/**
 * @param {Array<Record<string,string>>} blocks blocs Format-List
 * @param {string} raw texte brut (sorties macOS)
 */
export function parsePlatform(blocks, raw) {
  // ── Windows ──
  const osBlock = blocks.find((f) => "Caption" in f && "BuildNumber" in f);
  const verBlock = blocks.find((f) => "DisplayVersion" in f);
  const os = osBlock
    ? {
        kind: "windows",
        caption: field(osBlock, "Caption"),
        build: number(osBlock, "BuildNumber"),
        displayVersion: verBlock ? field(verBlock, "DisplayVersion") : null,
      }
    : null;

  const designed = blocks
    .filter((f) => "DesignedCapacity" in f)
    .reduce((s, f) => s + (number(f, "DesignedCapacity") || 0), 0);
  const full = blocks
    .filter((f) => "FullChargedCapacity" in f)
    .reduce((s, f) => s + (number(f, "FullChargedCapacity") || 0), 0);
  // Nombre de cycles de charge (BatteryCycleCount), quand le portable le
  // renseigne.
  const cycleBlock = blocks.find((f) => "CycleCount" in f);
  const cycleCount = cycleBlock
    ? number(cycleBlock, "CycleCount") || null
    : null;
  let battery =
    designed > 0 && full > 0
      ? {
          pct: Math.min(100, Math.round((full / designed) * 100)),
          cycles: cycleCount,
          condition: null,
        }
      : null;

  const startup = startupNames(
    blocks.filter((f) => "Command" in f && "Location" in f),
  );

  // ── macOS ──
  let mac = null;
  const pv = raw.match(/ProductVersion:\s*(\d+)(?:\.(\d+))?/i);
  if (pv)
    mac = {
      kind: "mac",
      major: Number(pv[1]),
      version: pv[2] ? `${pv[1]}.${pv[2]}` : pv[1],
    };
  const maxCap = raw.match(/Maximum Capacity:\s*(\d+)\s*%/i);
  if (!battery && maxCap) {
    battery = {
      pct: Number(maxCap[1]),
      cycles: Number(raw.match(/Cycle Count:\s*(\d+)/i)?.[1]) || null,
      condition: raw.match(/Condition:\s*(.+)/i)?.[1]?.trim() ?? null,
    };
  }

  return {
    os: os ?? mac,
    battery,
    startup: startup.length > 0 ? startup : null,
  };
}

/**
 * Noms lisibles des programmes au démarrage, sans les entrées des comptes de
 * service de Windows ni les doublons.
 * @param {Array<Record<string,string>>} entries blocs Win32_StartupCommand
 */
export function startupNames(entries) {
  const names = [];
  for (const f of entries) {
    const user = field(f, "User") || "";
    const location = field(f, "Location") || "";
    if (/AUTORIT|NT AUTHORITY|S-1-5-(18|19|20)\b/i.test(`${user} ${location}`))
      continue;
    const cmd = field(f, "Command") || "";
    // Discord et consorts passent par un lanceur : le vrai nom suit --processStart.
    const name =
      cmd.match(/--processStart\s+"?([^\s"]+?)\.exe/i)?.[1] ??
      cmd.match(/([^\\/"]+?)\.exe/i)?.[1] ??
      cmd.split(/\s/)[0];
    if (name && !names.some((n) => n.toLowerCase() === name.toLowerCase()))
      names.push(name);
  }
  return names;
}

/** Version de Windows → { label, end, supported, ending }. */
export function windowsSupport(os, today) {
  const enterprise = /entreprise|enterprise|[ée]ducation/i.test(
    os.caption || "",
  );
  if (/ltsc|ltsb/i.test(os.caption || "")) return null; // cycle de vie à part
  if (os.build == null) return null;
  if (os.build < 22000) {
    const end = WINDOWS_10_END;
    return {
      major: 10,
      label: `Windows 10${os.displayVersion ? ` ${os.displayVersion}` : ""}`,
      end,
      supported: end >= today,
    };
  }
  const row = [...WINDOWS_11].reverse().find(([b]) => os.build >= b);
  if (!row) return null;
  const [build, name, homeEnd, entEnd] = row;
  // Build plus récent que la dernière version connue : suivi par hypothèse.
  if (os.build >= build + 100 && row === WINDOWS_11.at(-1)) {
    return { major: 11, label: "Windows 11", end: null, supported: true };
  }
  const end = enterprise ? entEnd : homeEnd;
  const days = (Date.parse(end) - Date.parse(today)) / 864e5;
  return {
    major: 11,
    label: `Windows 11 ${os.displayVersion || name}`,
    end,
    supported: end >= today,
    ending: end >= today && days < ENDING_DAYS,
  };
}

/** Version de macOS → suivie si elle fait partie des trois dernières. */
export function macSupport(os, today) {
  const [y, m] = today.split("-").map(Number);
  // Depuis 2025, le numéro suit l'année : macOS 26 sort à l'automne 2025.
  const latest = y - 2000 + (m >= 10 ? 1 : 0);
  // Rang dans la suite des versions : …, 14, 15, puis 26, 27…
  const rank = (v) => (v >= 26 ? v - 10 : v);
  const name = MAC_NAMES[os.major];
  return {
    label: `macOS ${os.version}${name ? ` ${name}` : ""}`,
    supported: rank(os.major) > rank(latest) - 3,
  };
}

/**
 * Constats et contrôles passés pour la version, la batterie et le démarrage.
 * @param {ReturnType<typeof parsePlatform>} p
 * @param {string} today date du jour, « AAAA-MM-JJ »
 */
export function platformRules(p, today) {
  const findings = [];
  const passed = [];
  let osLabel = null;

  if (p.os?.kind === "windows") {
    const s = windowsSupport(p.os, today);
    osLabel = s?.label ?? (p.os.caption || "").replace(/^Microsofts+/i, "");
    if (s && !s.supported) {
      findings.push({
        level: "problem",
        id: "windows-unsupported",
        key: s.major === 10 ? "windows10-unsupported" : "windows-unsupported",
        vars: { label: s.label, end: s.end },
        title: `${s.label} : plus de mises à jour de sécurité`,
        detail: `Support terminé le ${dateFr(s.end)} : plus aucun correctif de sécurité ni de fiabilité`,
        fix:
          s.major === 10
            ? "Passer à Windows 11, gratuitement si le PC est compatible (Paramètres › Windows Update). Sinon, prévoir un système encore suivi ou le remplacement du PC"
            : "Installer la dernière version de Windows 11 depuis Paramètres › Windows Update",
      });
    } else if (s?.ending) {
      findings.push({
        level: "warning",
        id: "windows-ending",
        vars: { label: s.label, end: s.end },
        title: `Fin du support de ${s.label} le ${dateFr(s.end)}`,
        detail: "Après cette date, plus aucun correctif de sécurité",
        fix: "Installer la dernière version de Windows 11 depuis Paramètres › Windows Update avant cette date",
      });
    } else if (s) {
      passed.push({
        id: "windows-supported",
        vars: { label: s.label, end: s.end },
        label: s.end
          ? `${s.label}, suivi jusqu'au ${dateFr(s.end)}`
          : `${s.label}, version suivie`,
      });
    }
  }

  if (p.os?.kind === "linux") osLabel = p.os.label;

  if (p.os?.kind === "mac") {
    const s = macSupport(p.os, today);
    osLabel = s.label;
    if (!s.supported) {
      findings.push({
        level: "problem",
        id: "macos-unsupported",
        vars: { label: s.label },
        title: `${s.label} : plus de mises à jour de sécurité`,
        detail: "Apple ne corrige que les trois dernières versions de macOS",
        fix: "Mettre à jour depuis Réglages Système › Général › Mise à jour de logiciels. Si le Mac n'est plus compatible, il ne reçoit plus de correctifs de sécurité",
      });
    } else {
      passed.push({
        id: "macos-supported",
        vars: { label: s.label },
        label: `${s.label}, version encore suivie par Apple`,
      });
    }
  }

  if (p.battery) {
    const { pct, cycles, condition } = p.battery;
    const service = condition && !/^normal$/i.test(condition);
    if (service || pct < 80) {
      findings.push({
        level: service || pct < 60 ? "problem" : "warning",
        id: "battery-worn",
        vars: { pct, cycles },
        title: `Batterie usée : ${pct} % de sa capacité d'origine`,
        detail:
          "Une batterie usée se vide plus vite et, sur certains portables, pousse le système à brider le processeur pour éviter une coupure",
        fix: "Faire remplacer la batterie par le fabricant ou un réparateur. En attendant, travailler branché sur secteur",
      });
    } else {
      passed.push({
        id: "battery-ok",
        vars: { pct, cycles },
        label: `Batterie à ${pct} % de sa capacité d'origine${cycles ? ` (${cycles} cycles)` : ""}`,
      });
    }
  }

  if (p.startup) {
    const n = p.startup.length;
    const names = p.startup.filter(Boolean).join(", ");
    if (n > 15) {
      findings.push({
        level: "warning",
        id: "startup-many",
        vars: { n, names },
        title: `${n} programmes lancés au démarrage`,
        detail: `Chacun ralentit l'ouverture de session et occupe de la mémoire en permanence${names ? ` : ${names}` : ""}`,
        fix: "Désactiver ceux qui ne servent pas chaque jour : Gestionnaire des tâches › Applications de démarrage, clic droit › Désactiver",
      });
    } else {
      passed.push({
        id: "startup-ok",
        vars: { n, names },
        label: `${n} programme${n > 1 ? "s" : ""} au démarrage${names ? ` : ${names}` : ""}`,
      });
    }
  }

  return { findings, passed, osLabel };
}
