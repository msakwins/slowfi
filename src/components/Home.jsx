// ─────────────────────────────────────────────────────────────────────────────
// L'accueil : le test de débit (Wi-Fi ou Ethernet) en tête, lançable tout de
// suite. Dessous, le diagnostic complet : réseau local, matériel et
// périphériques, à choisir avant de lancer la commande. Dans l'application,
// un tableau de bord les précède (Dashboard.jsx).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useState } from "react";
import styled from "styled-components";
import { Title, Lead } from "../ui/theme.js";
import SpeedTest from "./SpeedTest.jsx";
import CombinedAnalysis from "./CombinedAnalysis.jsx";
import { useText } from "../ui/i18n.jsx";
import Dashboard from "./Dashboard.jsx";

const TEXT = {
  fr: {
    title: "Analyse de la connexion",
    lead: "Mesure du débit descendant et montant, de la latence et de la stabilité de la ligne, en Wi-Fi comme en Ethernet",
    allTitle: "Diagnostic complet",
    toDiagnostic: "Rechercher des améliorations",
  },
  en: {
    title: "Connection analysis",
    lead: "Measures download and upload speed, latency and line stability, over Wi-Fi or Ethernet",
    allTitle: "Full diagnostic",
    toDiagnostic: "Look for improvements",
  },
};

// Le test de débit est en cyan, comme l'analyse du réseau local.
const NETWORK = {
  "--accent": "#22d3ee",
  "--accent-light": "#67e8f9",
  "--accent-rgb": "34 211 238",
};

const Section = styled.section`
  margin-top: 64px;
`;

export default function Home() {
  // Débit du dernier test, comparé ensuite à ce que le Wi-Fi peut porter.
  const [download, setDownload] = useState(null);
  const t = useText(TEXT);
  const diagnostic = useRef(null);

  return (
    <>
      {/* Application : la dernière analyse et les températures, en tête. */}
      <Dashboard />
      <section style={{ ...NETWORK, marginTop: 24 }}>
        <Title>{t.title}</Title>
        <Lead>{t.lead}</Lead>
        {/* Bouton bleu, à la couleur du titre ; le contour aux trois
            couleurs reste réservé au diagnostic complet. */}
        {/* Test terminé : un bouton mène au diagnostic complet, plus bas. */}
        <SpeedTest
          onMeasured={(m) => setDownload(m.download)}
          nextLabel={t.toDiagnostic}
          onDiagnostic={() =>
            diagnostic.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
        />
      </section>

      <Section ref={diagnostic} style={{ scrollMarginTop: 24 }}>
        {/* Même taille que le titre du test de débit. */}
        <Title as="h2">{t.allTitle}</Title>
        {/* Le bouton ouvre la page « Diagnostic ». */}
        <CombinedAnalysis download={download} launcher />
      </Section>
    </>
  );
}
