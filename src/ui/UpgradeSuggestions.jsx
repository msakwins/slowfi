// ─────────────────────────────────────────────────────────────────────────────
// Suggestions d'amélioration, selon l'usage visé : l'usage (courant, jeux en
// 1080p, jeux récents en 1440p et plus) et le budget (modéré, haut de gamme)
// se choisissent en tête ; la liste suit (lib/goals.js, lib/upgrades.js).
// Le choix est gardé dans le navigateur.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import styled from "styled-components";
import { useLang, Segmented } from "./i18n.jsx";
import PartsToBuy from "./PartsToBuy.jsx";
import { recommendForGoal, mergeSuggestions } from "../lib/goals.js";

const KEY = "slowfi-goal";

const TEXT = {
  fr: {
    title: "Suggestions d'amélioration",
    usage: "Usage",
    budget: "Budget",
    usages: {
      office: "Usage courant",
      gaming1080: "Jeux en 1080p",
      gaming1440: "Jeux en 1440p et plus",
    },
    budgets: { moderate: "Modéré", high: "Haut de gamme" },
    none: "Aucune amélioration utile pour cet usage",
  },
  en: {
    title: "Upgrade suggestions",
    usage: "Use",
    budget: "Budget",
    usages: {
      office: "Everyday use",
      gaming1080: "1080p gaming",
      gaming1440: "1440p gaming and above",
    },
    budgets: { moderate: "Moderate", high: "High end" },
    none: "No useful upgrade for this use",
  },
};

const Head = styled.p`
  margin: 32px 0 0;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 500;
  color: #94a3b8;
`;

const Pickers = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 12px;
`;

const None = styled.p`
  margin: 12px 0 0;
  font-size: 14px;
  color: #94a3b8;
`;

function loadGoal() {
  try {
    const g = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (g?.usage && g?.budget) return g;
  } catch {
    // Choix illisible : valeurs par défaut.
  }
  return { usage: "office", budget: "moderate" };
}

/**
 * @param {{ data: object, perf: object[] }} props
 *   data : ce que lit recommendForGoal ; perf : suggestions de performance
 */
export default function UpgradeSuggestions({ data, perf }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [goal, setGoal] = useState(loadGoal);
  const choose = (next) => {
    const g = { ...goal, ...next };
    setGoal(g);
    try {
      localStorage.setItem(KEY, JSON.stringify(g));
    } catch {
      // Sans stockage, le choix vaut pour la visite en cours.
    }
  };
  const parts = mergeSuggestions(recommendForGoal(data, goal, lang), perf);

  return (
    <>
      <Head>{t.title}</Head>
      <Pickers>
        <Segmented role="group" aria-label={t.usage}>
          {Object.keys(t.usages).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={goal.usage === u}
              onClick={() => choose({ usage: u })}
            >
              {t.usages[u]}
            </button>
          ))}
        </Segmented>
        {goal.usage !== "office" && (
          <Segmented role="group" aria-label={t.budget}>
            {Object.keys(t.budgets).map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={goal.budget === b}
                onClick={() => choose({ budget: b })}
              >
                {t.budgets[b]}
              </button>
            ))}
          </Segmented>
        )}
      </Pickers>
      {parts.length ? (
        <PartsToBuy parts={parts} kind="upgrades" bare />
      ) : (
        <None>{t.none}</None>
      )}
    </>
  );
}
