// ─────────────────────────────────────────────────────────────────────────────
// Bouton « Copier le résumé » : place un texte dans le presse-papiers, avec
// un repli pour les navigateurs qui refusent l'accès direct.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import styled from "styled-components";
import { useLang } from "./i18n.jsx";
import { Button } from "./theme.js";

/** Copie un texte ; renvoie true si c'est fait. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Presse-papiers refusé (page sans focus, navigateur ancien) : l'ancienne
    // méthode, par une zone de texte temporaire, passe encore souvent.
    const area = document.createElement("textarea");
    area.value = text;
    area.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

const Wrap = styled.div`
  margin-top: 28px;
`;

/** @param {{ build: () => string }} props construit le texte au moment du clic */
export default function CopySummary({ build }) {
  const { lang } = useLang();
  const [done, setDone] = useState(false);
  const label =
    lang === "fr"
      ? done
        ? "Résumé copié"
        : "Copier le résumé"
      : done
        ? "Summary copied"
        : "Copy summary";

  return (
    <Wrap>
      <Button
        onClick={async () => {
          if (await copyText(build())) {
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          }
        }}
      >
        {label}
      </Button>
    </Wrap>
  );
}
