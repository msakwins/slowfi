// ─────────────────────────────────────────────────────────────────────────────
// Liens de recherche Amazon, avec l'identifiant Amazon Partenaires de Slowfi
// quand il est renseigné. Sans identifiant, les liens restent de simples
// recherches : rien ne change pour la personne qui clique.
//
// Identifiant à renseigner (variable d'environnement Vite, au build) :
// - VITE_AMAZON_TAG : identifiant Amazon Partenaires (« slowfi-21 »)
// ─────────────────────────────────────────────────────────────────────────────

const env = import.meta.env ?? {};
export const AMAZON_TAG = env.VITE_AMAZON_TAG || "";

/** Les liens rapportent-ils une commission ? (pour la mention « lien affilié ») */
export const AFFILIATE = Boolean(AMAZON_TAG);

/**
 * Liens vers les marchands pour une recherche.
 * @param {string} query
 * @returns {{ shop: string, url: string }[]}
 */
export function shopLinks(query) {
  const q = encodeURIComponent(query);
  const tag = AMAZON_TAG ? `&tag=${encodeURIComponent(AMAZON_TAG)}` : "";
  return [{ shop: "Amazon", url: `https://www.amazon.fr/s?k=${q}${tag}` }];
}
