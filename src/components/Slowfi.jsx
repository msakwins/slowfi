// ─────────────────────────────────────────────────────────────────────────────
// Coquille de l'application : gère la navigation entre la home (speed test) et
// le diagnostic élargi (menu par catégorie). Pas de routeur : deux vues, un
// simple état suffit.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import { GlobalStyle, Page, Eyebrow, Ghost } from "../ui/theme.js";
import Home from "./Home.jsx";
import Diagnostic from "./Diagnostic.jsx";

export { GlobalStyle };

export default function Slowfi() {
  const [view, setView] = useState("home"); // "home" | "diagnostic"

  return (
    <Page>
      <Eyebrow>slowfi</Eyebrow>
      {view === "home" ? (
        <Home onStartDiagnostic={() => setView("diagnostic")} />
      ) : (
        <>
          <Ghost onClick={() => setView("home")}>← Accueil</Ghost>
          <Diagnostic />
        </>
      )}
    </Page>
  );
}
