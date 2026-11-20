// ─────────────────────────────────────────────────────────────────────────────
// Briques d'UI partagées par toute l'application.
// Un seul endroit pour la charte : fond, couleurs, boutons, titres.
// ─────────────────────────────────────────────────────────────────────────────
import styled, { createGlobalStyle } from "styled-components";

// Niveaux de gravité partagés par tous les verdicts (couleur + libellé).
export const SEVERITY = {
  ok: { label: "Au vert", color: "#34d399" },
  warning: { label: "À surveiller", color: "#fbbf24" },
  problem: { label: "À corriger", color: "#fb7185" },
};

export const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; }
  /* Page sombre : barres de défilement et contrôles natifs en sombre aussi. */
  :root { color-scheme: dark; }
  body {
    margin: 0;
    background: #020617;
    color: #e2e8f0;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
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
  color: #22d3ee;
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
export const Lead = styled.div`
  color: #94a3b8;
  line-height: 1.8;
  margin: 12px 0 28px;
  max-width: 62ch;
  text-wrap: pretty; /* évite un mot seul en fin de paragraphe */

  p { margin: 0; }
  p + p { margin-top: 8px; }

  /* Deuxième temps d'un même paragraphe : à la ligne. */
  .then { display: block; }

  code {
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.85em;
    color: #67e8f9;
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
  transition: background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  /* La flèche avance d'un cran au survol : elle indique où mène le bouton. */
  .arrow { transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
  &:hover:not(:disabled) .arrow { transform: translateX(3px); }

  /* Style « ghost » : contour fin, fond transparent. Le bouton principal se
     distingue par la couleur, pas par un aplat. */
  color: ${(p) => (p.$primary ? "#22d3ee" : "#94a3b8")};
  border-color: ${(p) => (p.$primary ? "rgba(34, 211, 238, 0.45)" : "#1e293b")};

  &:hover:not(:disabled) {
    color: ${(p) => (p.$primary ? "#67e8f9" : "#e2e8f0")};
    background: ${(p) => (p.$primary ? "rgba(34, 211, 238, 0.08)" : "rgba(148, 163, 184, 0.06)")};
    border-color: ${(p) => (p.$primary ? "rgba(34, 211, 238, 0.8)" : "#475569")};
    box-shadow: ${(p) => (p.$primary ? "0 0 18px rgba(34, 211, 238, 0.18)" : "none")};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.25);
  }
  &:disabled {
    color: #475569;
    border-color: #1e293b;
    cursor: not-allowed;
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
  &:hover { color: #cbd5e1; }

  .arrow { transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
  &:hover .arrow.back { transform: translateX(-3px); }
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

  &::placeholder { color: #475569; }
  &:focus {
    outline: none;
    border-color: rgba(34, 211, 238, 0.6);
    box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.15);
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
  color: #67e8f9;
`;
