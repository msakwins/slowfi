// ─────────────────────────────────────────────────────────────────────────────
// Barre latérale, sur le site comme dans l'application : une icône blanche
// par page, la page ouverte en surbrillance, son nom au survol. Sur
// téléphone, elle passe en bas de l'écran.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Link } from "./router.jsx";
import { useText } from "./i18n.jsx";
import { desktop } from "./desktop.js";

export const SIDEBAR_WIDTH = 60;
// Barre ouverte, avec le nom des pages à côté des icônes.
export const SIDEBAR_OPEN = 240;
const OPEN_KEY = "slowfi-sidebar-open";
// En dessous de cette largeur (site seulement), la barre passe en bas.
export const SIDEBAR_BREAK = 640;

const TEXT = {
  fr: {
    "/": "Accueil",
    "/diagnostic": "Diagnostic complet",
    "/historique": "Historique",
    "/depannage": "Dépannage",
    "/capteurs": "Capteurs",
    "/application": "Application",
    "/confidentialite": "Confidentialité",
    nav: "Navigation",
    brand: "Slowfi, accueil",
    expand: "Afficher le nom des pages",
    collapse: "Masquer le nom des pages",
    reduce: "Réduire",
  },
  en: {
    "/": "Home",
    "/diagnostic": "Full diagnostic",
    "/historique": "History",
    "/depannage": "Troubleshooting",
    "/capteurs": "Sensors",
    "/application": "App",
    "/confidentialite": "Privacy",
    nav: "Navigation",
    brand: "Slowfi, home",
    expand: "Show page names",
    collapse: "Hide page names",
    reduce: "Collapse",
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
  // Clé à molette : le dépannage.
  "/depannage": (
    <path d="M12.5 3.5a3.5 3.5 0 0 0-3.3 4.6L3.8 13.5a1.4 1.4 0 0 0 2 2l5.4-5.4a3.5 3.5 0 0 0 4.6-3.3l-2 2-1.8-.5-.5-1.8 2-2a3.5 3.5 0 0 0-1-.5Z" />
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
  "/depannage",
  "/historique",
  ...(desktop ? ["/capteurs"] : []),
  ...(desktop ? [] : ["/application"]),
];
// Confidentialité : liée depuis le pied de page du site, pas depuis la barre.
const BOTTOM = [];

const Bar = styled.nav`
  position: fixed;
  top: var(--top);
  bottom: 0;
  left: 0;
  width: var(--sidebar, ${SIDEBAR_WIDTH}px);
  z-index: 15;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;
  transition: width 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  gap: 8px;
  padding: 12px 10px 16px;
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
    &[data-web] .tip,
    &[data-web] .toggle,
    &[data-web] .label {
      display: none;
    }
    &[data-web] a {
      width: 40px;
    }
  }
`;

const Item = styled(Link)`
  position: relative;
  flex: none;
  height: 46px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 18px 0 10px;
  border-radius: 12px;
  text-decoration: none;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
  color: rgb(241 245 249 / 0.55);
  transition:
    background 0.15s,
    color 0.15s;

  svg {
    flex: none;
    width: 20px;
    height: 20px;
  }
  /* Le nom de la page, visible quand la barre est ouverte. */
  .label {
    opacity: var(--labels, 0);
    transition: opacity 0.15s;
  }
  .wordmark {
    font-family: "Nunito Variable", system-ui, -apple-system, sans-serif;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: 0.09em;
    color: #e0fbff;
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
    width: 20px;
    height: 13px;
    overflow: visible;
    filter: drop-shadow(0 0 4px rgb(34 211 238 / 0.55));
  }
  &:hover,
  &:focus-visible {
    color: #e0fbff;
    background: rgb(148 163 184 / 0.1);
    outline: none;
  }
  &[aria-current="page"] {
    color: #e0fbff;
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
    color: #e0fbff;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.12s;
  }
  &:hover .tip,
  &:focus-visible .tip {
    opacity: calc(1 - var(--labels, 0));
  }
`;

// Bouton d'ouverture, en bas de la barre.
const Toggle = styled.button`
  flex: none;
  height: 36px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 10px;
  margin-top: 4px;
  border: none;
  border-radius: 12px;
  background: none;
  color: rgb(241 245 249 / 0.4);
  font: inherit;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;

  svg {
    flex: none;
    width: 20px;
    height: 20px;
    transition: transform 0.2s;
  }
  &[aria-expanded="true"] svg {
    transform: rotate(180deg);
  }
  /* « Réduire », visible quand la barre est ouverte. */
  .label {
    opacity: var(--labels, 0);
    transition: opacity 0.15s;
  }
  &:hover,
  &:focus-visible {
    color: #e0fbff;
    background: rgb(148 163 184 / 0.1);
    outline: none;
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
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(OPEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  // La largeur sert aussi à la page (Slowfi.jsx), qui se décale d'autant.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar",
      `${open ? SIDEBAR_OPEN : SIDEBAR_WIDTH}px`,
    );
    document.documentElement.style.setProperty("--labels", open ? "1" : "0");
    try {
      localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
      // Sans stockage, le choix vaut pour la visite en cours.
    }
  }, [open]);
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
      <span className="label" aria-hidden="true">
        {t[to]}
      </span>
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
        {/* Barre ouverte : le nom à côté du logo. */}
        <span className="label wordmark" aria-hidden="true">
          slowfi
        </span>
      </Item>
      {TOP.map(item)}
      <div className="spacer" />
      {BOTTOM.map(item)}
      <Toggle
        type="button"
        className="toggle"
        aria-expanded={open}
        aria-label={open ? t.collapse : t.expand}
        onClick={() => setOpen((o) => !o)}
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
          <path d="m8 6 4 4-4 4" />
        </svg>
        <span className="label" aria-hidden="true">
          {t.reduce}
        </span>
      </Toggle>
    </Bar>
  );
}
