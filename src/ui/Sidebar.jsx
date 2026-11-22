// ─────────────────────────────────────────────────────────────────────────────
// Barre latérale de l'application desktop : une icône blanche par page,
// la page ouverte en surbrillance, son nom au survol. Le site garde ses liens
// en pied de page.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import styled from "styled-components";
import { Link } from "./router.jsx";
import { useText } from "./i18n.jsx";

export const SIDEBAR_WIDTH = 60;

const TEXT = {
  fr: {
    "/": "Accueil",
    "/diagnostic": "Diagnostic approfondi",
    "/historique": "Historique",
    "/capteurs": "Capteurs",
    "/verifications": "Vérifications manuelles",
    "/confidentialite": "Confidentialité",
    nav: "Navigation",
  },
  en: {
    "/": "Home",
    "/diagnostic": "In-depth diagnostic",
    "/historique": "History",
    "/capteurs": "Sensors",
    "/verifications": "Manual checks",
    "/confidentialite": "Privacy",
    nav: "Navigation",
  },
};

// Icônes au trait, 20 px, de la couleur du texte.
const ICONS = {
  "/": (
    <path d="M3.5 9.5 10 4l6.5 5.5V16a1 1 0 0 1-1 1H12v-4.5H8V17H4.5a1 1 0 0 1-1-1V9.5Z" />
  ),
  // Tracé d'électrocardiogramme, comme le w du logo.
  "/diagnostic": <path d="M2.5 10.5h3l1.8-4 2.6 8 2.2-6 1.4 2h4" />,
  // Horloge avec flèche de retour.
  "/historique": (
    <>
      <path d="M3.5 10a6.5 6.5 0 1 0 2-4.7" />
      <path d="M3.5 3.5v2.5H6" />
      <path d="M10 6.5V10l2.5 1.5" />
    </>
  ),
  "/capteurs": (
    <>
      <path d="M8 11.5V4.5a2 2 0 1 1 4 0v7a3.5 3.5 0 1 1-4 0Z" />
      <path d="M10 8v5" />
    </>
  ),
  "/verifications": (
    <>
      <path d="M8 6h8M8 10h8M8 14h8" />
      <path d="m3.5 6 1 1 1.5-2M3.5 10l1 1 1.5-2M3.5 14l1 1 1.5-2" />
    </>
  ),
  "/confidentialite": (
    <path d="M10 3 4.5 5v4.5c0 3.5 2.4 6.2 5.5 7.5 3.1-1.3 5.5-4 5.5-7.5V5L10 3Z" />
  ),
};

const TOP = ["/", "/diagnostic", "/historique", "/capteurs", "/verifications"];
const BOTTOM = ["/confidentialite"];

const Bar = styled.nav`
  position: fixed;
  top: var(--top);
  bottom: 0;
  left: 0;
  width: ${SIDEBAR_WIDTH}px;
  z-index: 15;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 0 14px;
  border-right: 1px solid #111a2e;
  background: #020617;

  .spacer {
    flex: 1;
  }
`;

const Item = styled(Link)`
  position: relative;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: rgb(241 245 249 / 0.55);
  transition:
    background 0.15s,
    color 0.15s;

  svg {
    width: 20px;
    height: 20px;
  }
  &:hover,
  &:focus-visible {
    color: #f1f5f9;
    background: rgb(148 163 184 / 0.1);
    outline: none;
  }
  &[aria-current="page"] {
    color: #f1f5f9;
    background: rgb(148 163 184 / 0.16);
  }
  /* Nom de la page au survol. */
  .tip {
    position: absolute;
    left: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%);
    padding: 5px 10px;
    border-radius: 8px;
    background: #1e293b;
    color: #f1f5f9;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.12s;
  }
  &:hover .tip,
  &:focus-visible .tip {
    opacity: 1;
  }
`;

/** @param {{ path: string, top: number }} props */
export default function Sidebar({ path, top }) {
  const t = useText(TEXT);
  const item = (to) => (
    <Item
      key={to}
      to={to}
      aria-label={t[to]}
      aria-current={path === to ? "page" : undefined}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICONS[to]}
      </svg>
      <span className="tip" aria-hidden="true">
        {t[to]}
      </span>
    </Item>
  );
  return (
    <Bar aria-label={t.nav} style={{ "--top": `${top}px` }}>
      {TOP.map(item)}
      <div className="spacer" />
      {BOTTOM.map(item)}
    </Bar>
  );
}
