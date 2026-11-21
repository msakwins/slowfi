// ─────────────────────────────────────────────────────────────────────────────
// Résumé en texte brut d'une analyse (matériel, périphériques), à coller dans
// un message à un réparateur, au support d'un fabricant ou sur un forum.
//
// Un bloc par verdict : son niveau, ses constats avec leur correctif, puis ce
// qui a été vérifié sans anomalie. Le texte suit la langue de la page.
// ─────────────────────────────────────────────────────────────────────────────
import { localize, passedLabel } from "./en.js";

const LEVEL = {
  fr: {
    ok: "Bon état",
    warning: "Point d'attention",
    problem: "Problème détecté",
  },
  en: {
    ok: "Good condition",
    warning: "Worth a look",
    problem: "Problem found",
  },
};

const WORDS = {
  fr: { checked: "Vérifié", fix: "Correctif" },
  en: { checked: "Checked", fix: "Fix" },
};

/**
 * @param {string} title titre du résumé (« Slowfi — analyse du matériel »)
 * @param {Array<{ name: string, engine: string, result: { severity: string, findings: Array, passed?: Array } }>} blocks
 * @param {"fr"|"en"} lang
 * @param {{ date?: Date, url?: string }} [opts]
 */
export function summarizeBlocks(
  title,
  blocks,
  lang,
  { date = new Date(), url } = {},
) {
  const w = WORDS[lang];
  const when = date.toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const sep = lang === "fr" ? " : " : ": ";
  const lines = [`${title} — ${when}`];

  for (const { name, engine, result } of blocks) {
    if (!result) continue;
    lines.push("", `${name}${sep}${LEVEL[lang][result.severity]}`);
    for (const raw of result.findings) {
      // « Aucune anomalie détectée » n'apporte rien de plus que le niveau.
      if (
        raw.id === "healthy" &&
        result.findings.length === 1 &&
        result.passed?.length
      )
        continue;
      const f = localize(raw, lang, engine);
      lines.push(`- ${f.title}`);
      if (f.fix) lines.push(`  ${w.fix}${sep}${f.fix}`);
    }
    if (result.passed?.length) {
      lines.push(
        `${w.checked}${sep}${result.passed.map((p) => passedLabel(p, lang)).join(lang === "fr" ? " ; " : "; ")}`,
      );
    }
  }

  if (url) lines.push("", url);
  return lines.join("\n");
}
