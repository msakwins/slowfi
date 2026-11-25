// ─────────────────────────────────────────────────────────────────────────────
// Langue de l'interface : français ou anglais.
//
// Sur le site, l'adresse décide : « /en/… » en anglais, le reste en français
// (router.jsx). Au premier passage sur une page française, un navigateur qui
// n'est pas en français est envoyé vers l'adresse anglaise ; le choix fait
// avec le sélecteur est ensuite gardé. Dans l'application, la langue est un
// simple réglage, gardé de la même façon.
// Chaque composant porte ses textes dans les deux langues, à côté de son
// code ; les constats des analyses passent par lib/en.js.
// ─────────────────────────────────────────────────────────────────────────────
import React, { createContext, useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { desktop } from "./desktop.js";
import { useUrlLang, switchUrlLang } from "./router.jsx";

const KEY = "slowfi-lang";
const LangContext = createContext({ lang: "fr", setLang: () => {} });

function savedLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "fr" || saved === "en") return saved;
  } catch {
    // Stockage bloqué (navigation privée stricte) : on s'en tient au navigateur.
  }
  return null;
}
const save = (lang) => {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Sans stockage, le choix vaut pour la visite en cours.
  }
};
const browserLang = () =>
  (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";
// Les robots des moteurs de recherche gardent l'adresse demandée.
const isBot = () => /bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent);

/** Application : la langue est un réglage gardé dans le stockage local. */
function AppLangProvider({ children }) {
  const [lang, setLangState] = useState(() => savedLang() ?? browserLang());
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (next) => {
    setLangState(next);
    save(next);
  };
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

/** Site : la langue suit l'adresse. */
function WebLangProvider({ children }) {
  const lang = useUrlLang();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  // Premier passage sur une page française avec un navigateur dans une autre
  // langue : l'adresse anglaise, sans ajouter d'étape à l'historique.
  useEffect(() => {
    const preferred = savedLang() ?? browserLang();
    if (lang === "fr" && preferred === "en" && !isBot())
      switchUrlLang("en", { replace: true });
    // Une seule fois, à l'arrivée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setLang = (next) => {
    save(next);
    switchUrlLang(next);
  };
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function LangProvider({ children }) {
  return desktop ? (
    <AppLangProvider>{children}</AppLangProvider>
  ) : (
    <WebLangProvider>{children}</WebLangProvider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/** Choisit le texte de la langue courante dans un objet { fr, en }. */
export function useText(table) {
  return table[useLang().lang];
}

// Libellés des niveaux de gravité (les couleurs restent dans theme.js).
export const SEVERITY_LABEL = {
  fr: {
    ok: "Bon état",
    warning: "À surveiller",
    problem: "Problème détecté",
  },
  en: {
    ok: "Good condition",
    warning: "To watch",
    problem: "Problem found",
  },
};

// Petit sélecteur à deux ou trois choix, partagé (langue, système). Il prend
// la couleur d'accent de la section où il se trouve.
export const Segmented = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid #1e293b;
  border-radius: 999px;

  button {
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    padding: 4px 10px;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    background: transparent;
    color: #64748b;
    transition:
      color 0.2s,
      background 0.2s;
  }
  button:hover {
    color: #cdeef6;
  }
  button[aria-pressed="true"] {
    color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.1);
  }
  button:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgb(var(--accent-rgb) / 0.35);
  }
`;

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <Segmented role="group" aria-label={lang === "fr" ? "Langue" : "Language"}>
      {[
        ["fr", "FR", "Français"],
        ["en", "EN", "English"],
      ].map(([code, short, name]) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-label={name}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {short}
        </button>
      ))}
    </Segmented>
  );
}
