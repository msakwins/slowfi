// ─────────────────────────────────────────────────────────────────────────────
// Briques d'UI partagées par toute l'application.
// Un seul endroit pour la charte : fond, couleurs, boutons, titres.
// ─────────────────────────────────────────────────────────────────────────────
import styled, { createGlobalStyle, keyframes } from "styled-components";

// Couleurs des niveaux de gravité, partagées par tous les verdicts. Les
// libellés, traduits, sont dans i18n.jsx (SEVERITY_LABEL).
export const SEVERITY = {
  ok: { color: "#34d399" },
  warning: { color: "#fbbf24" },
  problem: { color: "#fb7185" },
};

export const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; }
  /* Page sombre : barres de défilement et contrôles natifs en sombre aussi. */
  :root {
    color-scheme: dark;
    /* Couleur d'accent : le cyan de la marque par défaut. Une section peut
       la redéfinir (l'analyse du matériel passe en orange) ; titres,
       boutons et étapes de collage la suivent. */
    --accent: #22d3ee;
    --accent-light: #67e8f9;
    --accent-rgb: 34 211 238;
  }
  body {
    margin: 0;
    background: #020617;
    color: #e2e8f0;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  /* Barre de défilement fine et sombre, à la place de la grise du système. */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #1e293b;
    border-radius: 999px;
    border: 3px solid #020617;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #334155;
  }
`;

export const Page = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: 40px 20px 64px;
`;

export const Title = styled.h1`
  font-size: clamp(21px, 3.4vw, 26px);
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--accent);
  margin: 0;
`;

// Titre d'une analyse ouverte à l'intérieur d'une section.
export const Subtitle = styled.h3`
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #f1f5f9;
`;

// Un <div> plutôt qu'un <p> : une introduction peut compter plusieurs
// paragraphes, et des <p> imbriqués dans un <p> sont invalides.
// Attente en cours (« Lecture des capteurs », « Analyse en cours ») : une
// ligne de texte gris, la même partout. Les points de suspension s'écrivent
// un à un ; le texte passé ne les contient pas.
export const Pending = styled.p.attrs({ role: "status" })`
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: #64748b;

  &::after {
    content: "…";
    display: inline-block;
    vertical-align: bottom;
    overflow: hidden;
    width: 0;
    animation: pending-dots 1.4s steps(4, end) infinite;
  }
  @keyframes pending-dots {
    to {
      width: 1.25em;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &::after {
      animation: none;
      width: auto;
    }
  }
`;

export const Lead = styled.div`
  color: #94a3b8;
  line-height: 1.8;
  margin: 12px 0 28px;
  max-width: 62ch;
  text-wrap: pretty; /* évite un mot seul en fin de paragraphe */

  p {
    margin: 0;
  }
  p + p {
    margin-top: 8px;
  }

  /* Deuxième temps d'un même paragraphe : à la ligne. */
  .then {
    display: block;
  }

  code {
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.85em;
    color: var(--accent-light);
    background: #0f172a;
    padding: 2px 6px;
    border-radius: 5px;
  }
`;

export const Button = styled.button`
  font: inherit;
  font-weight: 600;
  padding: 11px 24px;
  border-radius: 999px;
  cursor: pointer;
  background: transparent;
  border: 1px solid;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s,
    box-shadow 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  /* La flèche avance d'un cran au survol : elle indique où mène le bouton. */
  .arrow {
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  &:hover:not(:disabled) .arrow {
    transform: translateX(3px);
  }

  /* Style « ghost » : contour fin, fond transparent. Le bouton principal se
     distingue par la couleur, pas par un aplat. */
  color: ${(p) => (p.$primary ? "var(--accent)" : "#94a3b8")};
  border-color: ${(p) => (p.$primary ? "rgb(var(--accent-rgb) / 0.45)" : "#1e293b")};

  &:hover:not(:disabled) {
    color: ${(p) => (p.$primary ? "var(--accent-light)" : "#e2e8f0")};
    background: ${(p) => (p.$primary ? "rgb(var(--accent-rgb) / 0.08)" : "rgba(148, 163, 184, 0.06)")};
    border-color: ${(p) => (p.$primary ? "rgb(var(--accent-rgb) / 0.8)" : "#475569")};
    box-shadow: ${(p) => (p.$primary ? "0 0 18px rgb(var(--accent-rgb) / 0.18)" : "none")};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.25);
  }
  &:disabled {
    color: #475569;
    border-color: #1e293b;
    cursor: not-allowed;
  }
`;

// Bouton du diagnostic complet : les trois couleurs des analyses (cyan,
// orange, violet) sur le contour.
const NEON =
  "linear-gradient(90deg, #22d3ee, #f97316, #a78bfa, #22d3ee, #f97316, #a78bfa, #22d3ee)";

const neonFlow = keyframes`
  from { background-position: 0 0, 0 0; }
  to { background-position: 0 0, -200% 0; }
`;
// Le dégradé fait quatre fois la largeur du titre : chaque couleur couvre
// environ les deux tiers du texte, on en voit une ou deux à la fois. Le
// décalage de 133,33 % équivaut à une largeur d'image entière (4 × largeur
// du texte), donc la boucle ne saute pas.
const neonTextFlow = keyframes`
  from { background-position: 0 0; }
  to { background-position: -133.333% 0; }
`;

// Titre du diagnostic approfondi : les trois couleurs du bouton, dans les
// lettres, en larges plages qui glissent lentement.
export const NeonText = styled.span`
  background: ${NEON};
  background-size: 400% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: ${neonTextFlow} 16s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const NeonButton = styled.button`
  font: inherit;
  font-weight: 700;
  padding: 11px 26px;
  border-radius: 999px;
  cursor: pointer;
  color: #f1f5f9;
  /* Contour aux trois couleurs : un dégradé sous un fond uni, découpé à la
     bordure. */
  border: 2px solid transparent;
  background:
    linear-gradient(#020617, #020617) padding-box,
    ${NEON} border-box;
  background-size:
    100% 100%,
    200% 100%;
  animation: ${neonFlow} 6s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  &:hover:not(:disabled) {
    background-image: linear-gradient(#0b1220, #0b1220), ${NEON};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.35);
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    animation: none;
  }
`;

export const Ghost = styled.button`
  font: inherit;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 10px 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  &:hover {
    color: #cbd5e1;
  }

  .arrow {
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  &:hover .arrow.back {
    transform: translateX(-3px);
  }
`;

// Zone de collage des analyses approfondies (voir PasteStep).
export const Textarea = styled.textarea`
  width: 100%;
  height: 176px;
  resize: none;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 16px;
  color: #cbd5e1;
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;

  &::placeholder {
    color: #475569;
  }
  &:focus {
    outline: none;
    border-color: rgb(var(--accent-rgb) / 0.6);
    box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.15);
  }
`;

// Bloc de commande à copier, au-dessus des zones de collage.
export const Command = styled.pre`
  margin: 0 0 20px;
  padding: 14px 16px;
  overflow-x: auto;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  font-size: 12px;
  line-height: 1.7;
  color: var(--accent-light);
`;
