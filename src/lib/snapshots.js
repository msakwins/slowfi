// ─────────────────────────────────────────────────────────────────────────────
// Historique des analyses : un relevé court de chaque diagnostic complet, pour
// comparer avant et après un changement (pilote mis à jour, disque remplacé,
// box déplacée…).
//
// Un relevé garde les constats (identifiant, niveau, titre) et quelques
// valeurs mesurées (débit, signal Wi-Fi, versions de pilotes, espace libre,
// mémoire, batterie). Rien d'autre : ni le texte collé, ni les noms de fichiers.
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_SNAPSHOTS = 50;

const LEVELS = { ok: 0, warning: 1, problem: 2 };

/** Pire niveau d'une liste de constats. */
function worst(findings) {
  return findings.reduce(
    (w, f) => (LEVELS[f.level] > LEVELS[w] ? f.level : w),
    "ok",
  );
}

/**
 * Relevé d'un diagnostic complet.
 * @param {{ network?: object|null, hardware?: object|null, devices?: object|null }} res
 * @param {{ download?: number|null, upload?: number|null, now?: number }} [extra]
 */
export function makeSnapshot(res, extra = {}) {
  const findings = [];
  const add = (area, list) => {
    for (const f of list ?? []) {
      if (!f || f.id === "healthy" || !f.level || f.level === "ok") continue;
      findings.push({ id: `${area}:${f.id}`, level: f.level, title: f.title });
    }
  };
  const values = {};
  const set = (key, label, value, unit = "") => {
    if (value == null || value === "" || Number.isNaN(value)) return;
    values[key] = { label, value, unit };
  };

  if (extra.download != null)
    set("download", "Débit descendant", Math.round(extra.download), "Mb/s");
  if (extra.upload != null)
    set("upload", "Débit montant", Math.round(extra.upload), "Mb/s");

  const w = res.network;
  if (w && !w.wired) {
    add("wifi", w.findings);
    set("wifi:signal", "Signal Wi-Fi", w.signal, "%");
    set("wifi:link", "Vitesse du lien Wi-Fi", w.linkRate, "Mb/s");
    set("wifi:band", "Bande Wi-Fi", w.band);
  }

  const h = res.hardware;
  if (h) {
    add("system", h.system?.findings);
    add("components", h.components?.findings);
    add("activity", h.activity?.findings);
    add("events", h.events?.findings);
    for (const v of h.volumes ?? []) {
      add(`disk-${v.driveLetter}`, v.findings);
      if (v.size && v.free != null)
        set(
          `free:${v.driveLetter}`,
          `Espace libre sur ${v.driveLetter}:`,
          Math.round((v.free / 1e9) * 10) / 10,
          "Go",
        );
    }
    for (const d of h.drivers ?? [])
      set(`driver:${d.key}`, `Pilote ${d.name}`, d.version);
    set("memory", "Mémoire", h.components?.totalGB, "Go");
    set("battery", "Batterie", h.system?.env?.battery?.pct, "%");
  }

  add("devices", res.devices?.findings);

  return {
    t: extra.now ?? Date.now(),
    level: worst(findings),
    findings,
    values,
  };
}

/**
 * Ce qui a changé entre deux relevés.
 * @returns {{ fixed: object[], added: object[], changed: {key:string, label:string, from:any, to:any, unit:string}[] }}
 */
export function compareSnapshots(before, after) {
  const ids = (s) => new Set(s.findings.map((f) => f.id));
  const was = ids(before);
  const now = ids(after);
  const fixed = before.findings.filter((f) => !now.has(f.id));
  const added = after.findings.filter((f) => !was.has(f.id));
  const changed = [];
  for (const [key, v] of Object.entries(after.values)) {
    const old = before.values[key];
    if (old && String(old.value) !== String(v.value))
      changed.push({
        key,
        label: v.label,
        from: old.value,
        to: v.value,
        unit: v.unit,
      });
  }
  return { fixed, added, changed };
}

/** Ajoute un relevé en tête, au plus MAX_SNAPSHOTS. */
export function pushSnapshot(list, snap) {
  return [snap, ...(list ?? [])].slice(0, MAX_SNAPSHOTS);
}
