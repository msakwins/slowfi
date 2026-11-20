// ─────────────────────────────────────────────────────────────────────────────
// La home : on accueille l'utilisateur avec un speed test immédiat
// ("Tester ma connexion"), et une porte de sortie vers le diagnostic complet
// ("Passer et commencer le diagnostic") pour ceux dont le souci n'est pas la
// bande passante.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { Title, Lead, Actions, Button } from "../ui/theme.js";
import SpeedTest from "./SpeedTest.jsx";

export default function Home({ onStartDiagnostic }) {
  return (
    <>
      <Title>Ça rame&nbsp;? On trouve pourquoi.</Title>
      <Lead>
        Commence par tester ta connexion. Si elle est saine mais que ça lague quand même, lance le
        diagnostic complet — Wi-Fi, Ethernet, câble, composants réseau, et bientôt plus.
      </Lead>

      <SpeedTest />

      <Actions>
        <Button onClick={onStartDiagnostic}>Passer et commencer le diagnostic →</Button>
      </Actions>
    </>
  );
}
