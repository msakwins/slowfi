// ─────────────────────────────────────────────────────────────────────────────
// Barre latérale, sur le site comme dans l'application : une icône blanche
// par page, la page ouverte en surbrillance, son nom au survol. Sur
// téléphone, elle passe en bas de l'écran.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import styled from "styled-components";
import { Link } from "./router.jsx";
import { useText } from "./i18n.jsx";
import { desktop } from "./desktop.js";

export const SIDEBAR_WIDTH = 60;
// En dessous de cette largeur (site seulement), la barre passe en bas.
export const SIDEBAR_BREAK = 640;

const TEXT = {
  fr: {
    "/": "Accueil",
    "/diagnostic": "Diagnostic approfondi",
    "/historique": "Historique",
    "/capteurs": "Capteurs",
    "/application": "Application",
    "/confidentialite": "Confidentialité",
    nav: "Navigation",
    brand: "Slowfi, accueil",
  },
  en: {
    "/": "Home",
    "/diagnostic": "In-depth diagnostic",
    "/historique": "History",
    "/capteurs": "Sensors",
    "/application": "App",
    "/confidentialite": "Privacy",
    nav: "Navigation",
    brand: "Slowfi, home",
  },
};

// Icônes au trait, 20 px, de la couleur du texte.
const ICONS = {
  "/": (
    <path d="M3.5 9.5 10 4l6.5 5.5V16a1 1 0 0 1-1 1H12v-4.5H8V17H4.5a1 1 0 0 1-1-1V9.5Z" />
  ),
  // Jauge : la mesure en détail.
  "/diagnostic": (
    <>
      <path d="M3.5 14.5a6.5 6.5 0 1 1 13 0" />
      <path d="m10 14.5 3-4" />
      <circle cx="10" cy="14.5" r="1" />
    </>
  ),
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
  // Flèche dans un cercle : télécharger l'application.
  "/application": (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.5v6M7.5 10.5 10 13l2.5-2.5" />
    </>
  ),
  "/confidentialite": (
    <path d="M10 3 4.5 5v4.5c0 3.5 2.4 6.2 5.5 7.5 3.1-1.3 5.5-4 5.5-7.5V5L10 3Z" />
  ),
};

// Capteurs dans l'application seulement ; l'application à télécharger,
// sur le site seulement.
const TOP = [
  "/",
  "/diagnostic",
  "/historique",
  ...(desktop ? ["/capteurs"] : []),
  ...(desktop ? [] : ["/application"]),
];
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

  /* Site sur téléphone : barre en bas, icônes réparties sur la largeur. */
  @media (max-width: ${SIDEBAR_BREAK}px) {
    &[data-web] {
      top: auto;
      right: 0;
      width: auto;
      height: 60px;
      flex-direction: row;
      justify-content: space-around;
      padding: 0 6px;
      border-right: none;
      border-top: 1px solid #111a2e;
    }
    &[data-web] .brand,
    &[data-web] .spacer {
      display: none;
    }
    &[data-web] .tip {
      display: none;
    }
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
  /* Le logo : sans fond au survol, un peu détaché des pages. */
  &.brand {
    margin-bottom: 8px;
  }
  &.brand:hover,
  &.brand:focus-visible {
    background: none;
  }
  svg.logo {
    width: 28px;
    height: 18px;
    overflow: visible;
    filter: drop-shadow(0 0 4px rgb(34 211 238 / 0.55));
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

// Le w du logo (même tracé que Logo.jsx), en cyan avec son halo.
function LogoMark() {
  return (
    <svg
      className="logo"
      viewBox="0 0 38 24"
      fill="none"
      stroke="#22d3ee"
      strokeWidth="2.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1.5 14H5l3.8 7 4.6-15 4.6 15 3.6-10 2.6 3H36" />
    </svg>
  );
}

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
    <Bar
      aria-label={t.nav}
      data-web={desktop ? undefined : ""}
      style={{ "--top": `${top}px` }}
    >
      {/* Le logo en tête, qui ramène aussi à l'accueil. */}
      <Item to="/" className="brand" aria-label={t.brand}>
        <LogoMark />
      </Item>
      {TOP.map(item)}
      <div className="spacer" />
      {BOTTOM.map(item)}
    </Bar>
  );
}
