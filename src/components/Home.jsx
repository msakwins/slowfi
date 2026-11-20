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
      <Title>Diagnostic de connexion et de stockage</Title>
      <Lead>
        Slowfi mesure ta connexion et analyse la sortie de tes commandes système pour localiser
        d'où vient la lenteur&nbsp;: Wi-Fi, Ethernet, câbles, disques. Il lit aussi la mémoire, la
        carte graphique et le firmware, qui ne plantent jamais et qu'on ne soupçonne donc pas de
        rendre moins qu'ils ne pourraient. Tout s'exécute dans le navigateur&nbsp;: rien n'est
        envoyé, rien n'est installé.
      </Lead>

      <SpeedTest />

      <Actions>
        <Button onClick={onStartDiagnostic}>Passer et commencer le diagnostic →</Button>
      </Actions>
    </>
  );
}
