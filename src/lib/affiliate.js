// ─────────────────────────────────────────────────────────────────────────────
// Liens de recherche chez les marchands, avec l'identifiant d'affiliation de
// Slowfi quand il est renseigné. Sans identifiant, les liens restent de
// simples recherches : rien ne change pour la personne qui clique.
//
// Identifiants à renseigner (variables d'environnement Vite, au build) :
// - VITE_AMAZON_TAG : identifiant Amazon Partenaires (« slowfi-21 »)
// - VITE_LDLC_TAG : identifiant du programme d'affiliation LDLC
// ─────────────────────────────────────────────────────────────────────────────

const env = import.meta.env ?? {};
export const AMAZON_TAG = env.VITE_AMAZON_TAG || "";
export const LDLC_TAG = env.VITE_LDLC_TAG || "";

/** Les liens rapportent-ils une commission ? (pour la mention « lien affilié ») */
export const AFFILIATE = Boolean(AMAZON_TAG || LDLC_TAG);

/**
 * Liens vers les marchands pour une recherche.
 * @param {string} query
 * @param {"fr"|"en"} lang
 * @returns {{ shop: string, url: string }[]}
 */
export function shopLinks(query, lang) {
  const q = encodeURIComponent(query);
  if (lang === "en") {
    return [
      {
        shop: "Amazon",
        url: `https://www.amazon.fr/s?k=${q}${AMAZON_TAG ? `&tag=${encodeURIComponent(AMAZON_TAG)}` : ""}`,
      },
    ];
  }
  return [
    {
      shop: "Amazon",
      url: `https://www.amazon.fr/s?k=${q}${AMAZON_TAG ? `&tag=${encodeURIComponent(AMAZON_TAG)}` : ""}`,
    },
    {
      shop: "LDLC",
      url: `https://www.ldlc.com/recherche/${q}/${LDLC_TAG ? `?${LDLC_TAG}` : ""}`,
    },
  ];
}
