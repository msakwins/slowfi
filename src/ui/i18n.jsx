// ─────────────────────────────────────────────────────────────────────────────
// Langue de l'interface : français ou anglais.
//
// Au premier passage, la langue du navigateur décide (français s'il est en
// français, anglais sinon). Le choix fait avec le sélecteur est ensuite gardé
// dans le navigateur. Chaque composant porte ses textes dans les deux langues,
// à côté de son code ; les constats des analyses passent par lib/en.js.
// ─────────────────────────────────────────────────────────────────────────────
import React, { createContext, useContext, useEffect, useState } from "react";
import styled from "styled-components";

const KEY = "slowfi-lang";
const LangContext = createContext({ lang: "fr", setLang: () => {} });

function initialLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "fr" || saved === "en") return saved;
  } catch {
    // Stockage bloqué (navigation privée stricte) : on s'en tient au navigateur.
  }
  return (navigator.language || "fr").toLowerCase().startsWith("fr")
    ? "fr"
    : "en";
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next) => {
    setLangState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Sans stockage, le choix vaut pour la visite en cours.
    }
  };

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
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
    warning: "Point d'attention",
    problem: "Problème détecté",
  },
  en: {
    ok: "Good condition",
    warning: "Worth a look",
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
    color: #e2e8f0;
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
