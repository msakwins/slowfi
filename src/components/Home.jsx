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
import DeviceAnalysis from "./DeviceAnalysis.jsx";
import Arrow from "../ui/Arrow.jsx";
import { useText } from "../ui/i18n.jsx";

const TEXT = {
  fr: {
    title: "Analyse de la connexion",
    lead: "L'analyse de connexion teste le débit descendant et montant, la latence et la stabilité de la ligne",
    then: "Une analyse approfondie du Wi-Fi, de la box et du câblage permet ensuite de comparer ce résultat au débit maximal atteignable",
    hwTitle: "Analyse du matériel",
    hwLead:
      "Contrôle du système, des disques, de la mémoire, du processeur, de la carte graphique, du firmware et de la batterie, avec un correctif pour chaque problème détecté",
    hwButton: "Lancer l'analyse du matériel",
    devTitle: "Analyse des périphériques",
    devLead:
      "Contrôle de l'audio, de la caméra, du clavier, de la souris, du Bluetooth et des écrans, avec un correctif pour chaque périphérique en erreur",
    devButton: "Lancer l'analyse des périphériques",
  },
  en: {
    title: "Connection analysis",
    lead: "The connection analysis tests download and upload speed, latency and line stability",
    then: "An in-depth analysis of the Wi-Fi, router and cabling then compares this result with the maximum achievable speed",
    hwTitle: "Hardware analysis",
    hwLead:
      "Checks the system, drives, memory, processor, graphics card, firmware and battery, with a fix for every problem detected",
    hwButton: "Run the hardware analysis",
    devTitle: "Device analysis",
    devLead:
      "Checks audio, camera, keyboard, mouse, Bluetooth and displays, with a fix for every device in error",
    devButton: "Run the device analysis",
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

// Les périphériques, en violet : troisième couleur, troisième analyse.
const Devices = styled(Section)`
  --accent: #a78bfa;
  --accent-light: #c4b5fd;
  --accent-rgb: 167 139 250;
`;

export default function Home() {
  const [network, setNetwork] = useState(false);
  const [hardware, setHardware] = useState(false);
  const [devices, setDevices] = useState(false);
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

      <Devices>
        <Title as="h2">{t.devTitle}</Title>
        <Lead>{t.devLead}</Lead>
        {devices ? (
          <DeviceAnalysis />
        ) : (
          <Button $primary onClick={() => setDevices(true)}>
            {t.devButton}
            <Arrow />
          </Button>
        )}
      </Devices>
    </>
  );
}
