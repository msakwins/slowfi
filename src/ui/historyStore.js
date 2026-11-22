// ─────────────────────────────────────────────────────────────────────────────
// Historique des analyses, enregistré sur l'appareil (stockage du navigateur,
// ou dossier de l'application).
// ─────────────────────────────────────────────────────────────────────────────
import { pushSnapshot } from "../lib/snapshots.js";

const LIST_KEY = "slowfi-analyses";

// Deux analyses à moins de 3 minutes d'écart : la seconde remplace la
// première (texte recollé, analyse relancée), sans doubler la liste.
const SAME_RUN_MS = 3 * 60 * 1000;

const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage refusé (navigation privée) : l'historique reste en mémoire.
  }
};

export const loadHistory = () => read(LIST_KEY, []);

/** Relevé ajouté en tête (ou remplaçant le précédent s'il est tout récent). */
export function recordLocal(snap) {
  const list = loadHistory();
  const next =
    list[0] && snap.t - list[0].t < SAME_RUN_MS
      ? [snap, ...list.slice(1)]
      : pushSnapshot(list, snap);
  write(LIST_KEY, next);
  return next;
}

export function clearLocal() {
  write(LIST_KEY, null);
}

