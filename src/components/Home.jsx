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
import { useText } from "../ui/i18n.jsx";

const TEXT = {
  fr: {
    title: "Analyse de la connexion",
    lead: "L'analyse de connexion teste le débit descendant et montant, la latence et la stabilité de la ligne.",
    then: "Une analyse approfondie du Wi-Fi, de la box et du câblage permet ensuite de comparer ce résultat au débit maximal atteignable",
    hwTitle: "Analyse du matériel",
    hwLead:
      "Contrôle des disques, de la mémoire, de la carte graphique et du firmware, avec un correctif pour chaque problème détecté",
    hwButton: "Lancer l'analyse du matériel",
  },
  en: {
    title: "Connection analysis",
    lead: "The connection analysis tests download and upload speed, latency and line stability.",
    then: "An in-depth analysis of the Wi-Fi, router and cabling then compares this result with the maximum achievable speed",
    hwTitle: "Hardware analysis",
    hwLead:
      "Checks drives, memory, graphics card and firmware, with a fix for every problem detected",
    hwButton: "Run the hardware analysis",
  },
};

const Section = styled.section`
  margin-top: 56px;
`;

// Le matériel a sa propre couleur, l'orange, pour le distinguer de la
// connexion d'un coup d'œil.
const Hardware = styled(Section)`
  --accent: #f97316;
  --accent-light: #fb923c;
  --accent-rgb: 249 115 22;
`;

export default function Home() {
  const [network, setNetwork] = useState(false);
  const [hardware, setHardware] = useState(false);
  // Débit du dernier test, comparé ensuite à ce que le Wi-Fi peut porter.
  const [download, setDownload] = useState(null);
  const t = useText(TEXT);

  return (
    <>
      <Title>{t.title}</Title>
      <Lead>
        {t.lead}
        <span className="then">{t.then}</span>
      </Lead>

      {/* Une fois l'analyse ouverte, le bouton qui la lance disparaît. */}
      <SpeedTest
        onDiagnostic={network ? undefined : () => setNetwork(true)}
        onMeasured={(m) => setDownload(m.download)}
      />
      {network && <NetworkAnalysis download={download} />}

      <Hardware>
        <Title as="h2">{t.hwTitle}</Title>
        <Lead>{t.hwLead}</Lead>
        {hardware ? (
          <HardwareAnalysis />
        ) : (
          <Button $primary onClick={() => setHardware(true)}>
            {t.hwButton}
            <Arrow />
          </Button>
        )}
      </Hardware>
    </>
  );
}
