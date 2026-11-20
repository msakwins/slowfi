// ─────────────────────────────────────────────────────────────────────────────
// Coquille de l'application : l'accueil, puis l'une des deux familles de
// diagnostic. Pas de routeur — trois vues possibles, un état suffit.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import { GlobalStyle, Page, Ghost } from "../ui/theme.js";
import Logo from "../ui/Logo.jsx";
import Home from "./Home.jsx";
import Diagnostic from "./Diagnostic.jsx";

export { GlobalStyle };

export default function Slowfi() {
  const [family, setFamily] = useState(null); // null = accueil

  return (
    <Page>
      <Logo />
      {family ? (
        <>
          <Ghost onClick={() => setFamily(null)}>← Accueil</Ghost>
          <Diagnostic family={family} />
        </>
      ) : (
        <Home onOpen={setFamily} />
      )}
    </Page>
  );
}
