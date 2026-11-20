// ─────────────────────────────────────────────────────────────────────────────
// Historique des tests de débit et résumé à partager.
//
// L'historique reste dans le navigateur (localStorage) : rien n'est envoyé.
// Il sert à voir si la ligne ralentit à certaines heures. Les fonctions de
// mise en forme sont pures ; seules load/save touchent au stockage, et
// tolèrent qu'il soit bloqué (navigation privée stricte).
// ─────────────────────────────────────────────────────────────────────────────

const KEY = "slowfi-history";
export const MAX_ENTRIES = 30;

/** @typedef {{at:string, download:number|null, upload:number|null, latency:number|null, jitter:number|null}} Entry */

/** @returns {Entry[]} du plus récent au plus ancien */
export function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Stockage indisponible : l'historique vaut pour la visite en cours.
  }
}

/**
 * Ajoute un test en tête et garde les MAX_ENTRIES plus récents.
 * @param {Entry[]} list
 * @param {Omit<Entry,"at">} m
 * @param {Date} [now]
 */
export function withEntry(list, m, now = new Date()) {
  const entry = {
    at: now.toISOString(),
    download: m.download ?? null,
    upload: m.upload ?? null,
    latency: m.latency ?? null,
    jitter: m.jitter ?? null,
  };
  return [entry, ...list].slice(0, MAX_ENTRIES);
}

export function addToHistory(m) {
  const list = withEntry(loadHistory(), m);
  save(list);
  return list;
}

export function clearHistory() {
  save([]);
  return [];
}

const LABELS = {
  fr: {
    head: "Test de connexion Slowfi",
    grade: "Note",
    down: "Débit descendant",
    up: "Débit montant",
    latency: "Latence",
    jitter: "Variation",
  },
  en: {
    head: "Slowfi connection test",
    grade: "Grade",
    down: "Download",
    up: "Upload",
    latency: "Latency",
    jitter: "Jitter",
  },
};

const LOCALE = { fr: "fr-FR", en: "en-GB" };

/** Nombre arrondi au dixième, écrit à la façon de la langue (« 130,1 »). */
export function formatNumber(n, lang) {
  if (n == null) return "—";
  return (Math.round(n * 10) / 10).toLocaleString(LOCALE[lang]);
}

export function formatDate(iso, lang) {
  return new Date(iso).toLocaleString(LOCALE[lang], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Résumé en texte brut, à coller dans un message au support du fournisseur
 * d'accès ou à un proche.
 * @param {Entry & {gradeLabel?: string}} m
 * @param {"fr"|"en"} lang
 * @param {string} url
 */
export function summarize(m, lang, url) {
  const l = LABELS[lang];
  const n = (v) => formatNumber(v, lang);
  return (
    [
      `${l.head} — ${formatDate(m.at, lang)}`,
      m.gradeLabel ? `${l.grade} : ${m.gradeLabel}` : null,
      `${l.down} : ${n(m.download)} Mb/s`,
      `${l.up} : ${n(m.upload)} Mb/s`,
      `${l.latency} : ${n(m.latency)} ms`,
      `${l.jitter} : ${n(m.jitter)} ms`,
      url,
    ]
      .filter(Boolean)
      // Typographie : espace avant les deux-points en français, pas en anglais.
      .map((line) => (lang === "en" ? line.replace(" : ", ": ") : line))
      .join("\n")
  );
}
