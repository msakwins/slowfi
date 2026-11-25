// ─────────────────────────────────────────────────────────────────────────────
// Barre de titre de l'application desktop, à la place de celle du système.
// Toute la barre sert à déplacer la fenêtre ; à droite, trois boutons au
// trait, gris : réduire, agrandir, fermer (rouge au survol).
// Sous macOS, les boutons natifs restent : la barre ne fait que la place.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useText } from "./i18n.jsx";
import { desktop } from "./desktop.js";

export const TITLE_BAR_HEIGHT = 40;

const TEXT = {
  fr: {
    minimize: "Réduire",
    maximize: "Agrandir",
    restore: "Restaurer",
    close: "Fermer",
  },
  en: {
    minimize: "Minimize",
    maximize: "Maximize",
    restore: "Restore",
    close: "Close",
  },
};

const Bar = styled.div`
  position: fixed;
  inset: 0 0 auto 0;
  height: ${TITLE_BAR_HEIGHT}px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  -webkit-app-region: drag;
  user-select: none;
  /* La page défile dessous, sans passer sous la barre. */
  background: #020617;
`;

// Contour discret de la fenêtre : sans cadre système, elle se confondrait
// avec un fond d'écran sombre. Arrondi comme les coins de Windows 11.
const Edge = styled.div`
  position: fixed;
  inset: 0;
  z-index: 30;
  pointer-events: none;
  border: 1px solid rgb(148 163 184 / 0.14);
  border-radius: 8px;
`;

// Icône et nom de l'application, à gauche, comme dans toute fenêtre.
const AppName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #8fb3c4;

  img {
    width: 18px;
    height: 18px;
    display: block;
  }
`;

const Dots = styled.div`
  display: flex;
  gap: 2px;
  margin-right: -6px;
  -webkit-app-region: no-drag;

  button {
    width: 32px;
    height: 28px;
    padding: 0;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    display: grid;
    place-items: center;
    background: transparent;
    color: #64748b;
    transition:
      background 0.15s,
      color 0.15s;
  }
  button:hover,
  button:focus-visible {
    background: rgb(148 163 184 / 0.12);
    color: #cdeef6;
    outline: none;
  }
  .close:hover,
  .close:focus-visible {
    background: #e11d48;
    color: #fff;
  }
`;

// Icônes au trait, de la couleur du bouton.
const Icon = ({ d }) => (
  <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
    <path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PATHS = {
  minimize: "M1.5 5h7",
  maximize: "M1.5 1.5h7v7h-7z",
  restore: "M3 3h5.5v5.5H3zM1.5 6.5V1.5h5",
  close: "M1.5 1.5l7 7M8.5 1.5l-7 7",
};

export default function TitleBar() {
  const t = useText(TEXT);
  const [maximized, setMaximized] = useState(false);
  const mac = desktop?.platform === "darwin";

  useEffect(() => {
    const stop = desktop?.onMaximized?.(setMaximized);
    return () => {
      stop?.();
    };
  }, []);

  if (!desktop?.windowAction && !mac) return null;
  const act = (action) => () => desktop.windowAction(action);

  return (
    <>
      {!mac && !maximized && <Edge />}
      <Bar onDoubleClick={mac ? undefined : act("maximize")}>
        {/* Sous macOS, les boutons natifs occupent la gauche. */}
        {!mac && (
          <AppName>
            <img src="/favicon.svg" alt="" />
            Slowfi
          </AppName>
        )}
        {!mac && (
          <Dots onDoubleClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="min"
              onClick={act("minimize")}
              aria-label={t.minimize}
              title={t.minimize}
            >
              <Icon d={PATHS.minimize} />
            </button>
            <button
              type="button"
              className="max"
              onClick={act("maximize")}
              aria-label={maximized ? t.restore : t.maximize}
              title={maximized ? t.restore : t.maximize}
            >
              <Icon d={maximized ? PATHS.restore : PATHS.maximize} />
            </button>
            <button
              type="button"
              className="close"
              onClick={act("close")}
              aria-label={t.close}
              title={t.close}
            >
              <Icon d={PATHS.close} />
            </button>
          </Dots>
        )}
      </Bar>
    </>
  );
}
