// ─────────────────────────────────────────────────────────────────────────────
// Briques d'UI partagées par toutes les vues (home, diagnostic, analyseurs).
// Un seul endroit pour la charte : fond, couleurs, boutons, titres.
// ─────────────────────────────────────────────────────────────────────────────
import styled, { keyframes, createGlobalStyle } from "styled-components";

// Niveaux de gravité partagés par tous les verdicts (couleur + libellé).
export const SEVERITY = {
  ok: { label: "Rien à signaler", color: "#34d399" },
  warning: { label: "À surveiller", color: "#fbbf24" },
  problem: { label: "À corriger", color: "#fb7185" },
};

export const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #020617;
    color: #e2e8f0;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
`;

export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

export const Page = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: 40px 20px 64px;
`;

export const Eyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 600;
  color: #22d3ee;

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22d3ee;
    animation: ${pulse} 2s ease-in-out infinite;
  }
`;

export const Title = styled.h1`
  font-size: clamp(34px, 6.5vw, 46px);
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #22d3ee;
  margin: 0;
`;

export const Lead = styled.p`
  color: #94a3b8;
  line-height: 1.6;
  margin: 12px 0 28px;

  code {
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.85em;
    color: #67e8f9;
    background: #0f172a;
    padding: 2px 6px;
    border-radius: 5px;
  }
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
`;

export const Button = styled.button`
  font: inherit;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s, color 0.15s;

  background: ${(p) => (p.$primary ? "#06b6d4" : "transparent")};
  color: ${(p) => (p.$primary ? "#020617" : "#cbd5e1")};
  border-color: ${(p) => (p.$primary ? "transparent" : "#334155")};

  &:hover:not(:disabled) {
    background: ${(p) => (p.$primary ? "#22d3ee" : "transparent")};
    border-color: ${(p) => (p.$primary ? "transparent" : "#64748b")};
  }
  &:disabled {
    background: #1e293b;
    color: #475569;
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
  &:hover { color: #cbd5e1; }
`;

// Zone de collage partagée par les analyseurs qui prennent la sortie brute
// d'une commande (netsh pour le Wi-Fi, Get-Volume pour le stockage).
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

// Grille de cartes, partagée par l'accueil (deux portes) et le menu du
// diagnostic (les catégories d'une famille).
export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-top: 24px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const Card = styled.button`
  text-align: left;
  font: inherit;
  cursor: pointer;
  background: #0b1220;
  border: 1px solid #1e293b;
  border-radius: 14px;
  padding: 18px;
  transition: border-color 0.15s, transform 0.1s, background 0.15s;

  &:hover {
    border-color: #22d3ee;
    background: #0f172a;
    transform: translateY(-2px);
  }

  .icon { font-size: 24px; }
  .t { margin: 10px 0 4px; font-size: 16px; font-weight: 700; color: #f1f5f9; }
  .b { margin: 0; font-size: 13px; line-height: 1.5; color: #94a3b8; }
`;

// Petite ligne d'orientation entre deux blocs.
export const Hint = styled.p`
  margin: 32px 0 0;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
  color: #64748b;
`;
