// ─────────────────────────────────────────────────────────────────────────────
// Résumé du test de débit, en texte brut, à coller dans un message au support
// du fournisseur d'accès ou à un proche.
// ─────────────────────────────────────────────────────────────────────────────

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
