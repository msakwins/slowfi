// ─────────────────────────────────────────────────────────────────────────────
// L'application tient sur une page, en deux sections : la connexion d'abord,
// avec le test de débit disponible immédiatement, puis le matériel.
//
// Les analyses approfondies s'ouvrent sur place, sous le bouton qui les lance,
// plutôt que sur une page à part : on garde sous les yeux le résultat qu'elles
// viennent compléter.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import styled from "styled-components";
import { Title, Lead, Button } from "../ui/theme.js";
import SpeedTest from "./SpeedTest.jsx";
import NetworkAnalysis from "./NetworkAnalysis.jsx";
import HardwareAnalysis from "./HardwareAnalysis.jsx";
import Arrow from "../ui/Arrow.jsx";

const Section = styled.section`
  margin-top: 56px;
`;

export default function Home() {
  const [network, setNetwork] = useState(false);
  const [hardware, setHardware] = useState(false);

  return (
    <>
      <Title>Analyse de la connexion</Title>
      <Lead>
        L'analyse de connexion teste le débit descendant et montant, la latence et la stabilité de
        la ligne.
        <span className="then">
          Une analyse approfondie du Wi-Fi, de la box et du câblage permet ensuite de comparer ce
          résultat au débit maximal atteignable
        </span>
      </Lead>

      {/* Une fois l'analyse ouverte, le bouton qui la lance disparaît. */}
      <SpeedTest onDiagnostic={network ? undefined : () => setNetwork(true)} />
      {network && <NetworkAnalysis />}

      <Section>
        <Title as="h2">Analyse du matériel</Title>
        <Lead>
          Contrôle des disques, de la mémoire, de la carte graphique et du firmware, avec un
          correctif pour chaque problème détecté
        </Lead>
        {hardware ? (
          <HardwareAnalysis />
        ) : (
          <Button $primary onClick={() => setHardware(true)}>
            Lancer l'analyse du matériel
            <Arrow />
          </Button>
        )}
      </Section>
    </>
  );
}
