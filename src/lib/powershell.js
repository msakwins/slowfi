// ─────────────────────────────────────────────────────────────────────────────
// Lecture de la sortie de `Format-List`, le format commun à toutes les
// commandes que Slowfi demande de coller.
//
// PowerShell écrit un bloc par objet, séparé par une ligne vide, et un champ
// par ligne sous la forme `Clé : valeur`. On coupe au premier deux-points
// plutôt qu'avec un motif : aucune clé ne peut alors en préfixer une autre
// (`Size` contre `SizeRemaining`), et il n'y a rien à échapper.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Découpe une sortie Format-List en blocs de champs.
 * @param {string} raw
 * @returns {Array<Record<string, string>>}
 */
export function parseBlocks(raw) {
  if (!raw || !raw.trim()) return [];

  return raw
    .split(/\n\s*\n/)
    .map((block) => {
      const fields = {};
      for (const line of block.split(/\r?\n/)) {
        const sep = line.indexOf(":");
        if (sep === -1) continue;
        const key = line.slice(0, sep).trim();
        if (key) fields[key] = line.slice(sep + 1).trim();
      }
      return fields;
    })
    .filter((fields) => Object.keys(fields).length > 0);
}

/** Valeur d'un champ, ou null s'il est absent ou vide. */
export function field(fields, key) {
  const v = fields[key];
  return v == null || v === "" ? null : v;
}

/**
 * Valeur numérique d'un champ. PowerShell peut grouper les milliers avec une
 * espace insécable et utiliser la virgule décimale selon la locale.
 */
export function number(fields, key) {
  const v = field(fields, key);
  if (v == null) return null;
  const n = Number(v.replace(/[\s ]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Année d'une date écrite par PowerShell. Le format est localisé
 * (`14/08/2024 02:00:00` en français, `8/14/2024 2:00:00 AM` en anglais), donc
 * on ne tente pas de distinguer jour et mois : pour juger de l'âge d'un pilote
 * ou d'un firmware, l'année suffit et se lit sans ambiguïté.
 * @param {string|null} value
 * @returns {number|null}
 */
export function yearOf(value) {
  if (!value) return null;
  const m = value.match(/(19|20)\d{2}/);
  return m ? parseInt(m[0], 10) : null;
}

/**
 * Mois et année d'une date écrite par PowerShell. Jour et mois s'inversent
 * selon la langue : « 14/08/2024 » (français), « 8/14/2024 2:00:00 AM »
 * (anglais, repérable à AM/PM). Un nombre au-delà de 12 lève l'ambiguïté.
 * @returns {{year:number, month:number}|null}
 */
export function monthOf(value) {
  if (!value) return null;
  // Date WMI brute (Get-WmiObject) : 20261107000000.******+***, sans ambiguïté.
  const wmi = value.match(/^((?:19|20)\d{2})(\d{2})\d{2}\d{6}\./);
  if (wmi) return { year: Number(wmi[1]), month: Number(wmi[2]) };
  const m = value.match(/(\d{1,2})[/.-](\d{1,2})[/.-]((?:19|20)\d{2})/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const us = /\b[AP]M\b/i.test(value);
    const month = a > 12 ? b : b > 12 ? a : us ? a : b;
    return { year: Number(m[3]), month };
  }
  const iso = value.match(/((?:19|20)\d{2})-(\d{2})-\d{2}/);
  return iso ? { year: Number(iso[1]), month: Number(iso[2]) } : null;
}
