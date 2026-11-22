// ─────────────────────────────────────────────────────────────────────────────
// Historique des analyses, côté page : copie locale (navigateur, ou dossier de
// l'application), et copie en ligne chiffrée quand un code privé est choisi.
// ─────────────────────────────────────────────────────────────────────────────
import { desktop } from "./desktop.js";
import { pushSnapshot } from "../lib/snapshots.js";
import { vaultId, seal, open, mergeHistories } from "../lib/vault.js";

const LIST_KEY = "slowfi-analyses";
const CODE_KEY = "slowfi-history-code";
// L'application appelle le site : la base Upstash y est reliée.
const API = desktop ? "https://www.slowfi.app/api/history" : "/api/history";

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
export const loadCode = () => read(CODE_KEY, null);

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

/**
 * Fusionne l'historique local avec la copie en ligne du code, puis renvoie
 * le tout chiffré au serveur.
 * Avec restore, un code inconnu du serveur est signalé au lieu d'ouvrir un
 * nouveau coffre (code mal recopié).
 * @returns {Promise<{ list: object[], status: "ok"|"disabled"|"unknown"|"error" }>}
 */
export async function syncOnline(code, { restore = false } = {}) {
  const id = await vaultId(code);
  try {
    const got = await fetch(`${API}?id=${id}`);
    if (got.status === 503) return { list: loadHistory(), status: "disabled" };
    let remote = [];
    if (got.ok) remote = await open(code, (await got.json()).data);
    else if (got.status === 404 && restore)
      return { list: loadHistory(), status: "unknown" };
    else if (got.status !== 404) throw new Error(String(got.status));
    const list = mergeHistories(loadHistory(), remote);
    write(LIST_KEY, list);
    const put = await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, data: await seal(code, list) }),
    });
    if (!put.ok) throw new Error(String(put.status));
    write(CODE_KEY, code);
    return { list, status: "ok" };
  } catch {
    return { list: loadHistory(), status: "error" };
  }
}

/** Supprime la copie en ligne et oublie le code sur cet appareil. */
export async function forgetOnline(code) {
  try {
    await fetch(`${API}?id=${await vaultId(code)}`, { method: "DELETE" });
  } catch {
    // Hors ligne : le coffre expirera de lui-même.
  }
  write(CODE_KEY, null);
}
