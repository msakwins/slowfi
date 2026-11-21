// ─────────────────────────────────────────────────────────────────────────────
// L'application tient sur une page : le diagnostic complet en tête, étape par
// étape, puis chaque analyse seule dans un menu dépliant (connexion, matériel,
// périphériques), avec son texte et son bouton de lancement.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import styled from "styled-components";
import { Title, Lead, Button } from "../ui/theme.js";
import SpeedTest from "./SpeedTest.jsx";
import NetworkAnalysis from "./NetworkAnalysis.jsx";
import HardwareAnalysis from "./HardwareAnalysis.jsx";
import DeviceAnalysis from "./DeviceAnalysis.jsx";
import CombinedAnalysis from "./CombinedAnalysis.jsx";
import Arrow from "../ui/Arrow.jsx";
import { useText } from "../ui/i18n.jsx";

const TEXT = {
  fr: {
    allTitle: "Diagnostic complet",
    title: "Analyse de la connexion",
    lead: "L'analyse de connexion teste le débit descendant et montant, la latence et la stabilité de la ligne",
    then: "Une analyse approfondie du Wi-Fi, de la box et du câblage permet ensuite de comparer ce résultat au débit maximal atteignable",
    hwTitle: "Analyse du matériel",
    hwLead:
      "Contrôle du système, des disques, de la mémoire, du processeur, de la carte graphique, du firmware et de la batterie, avec un correctif pour chaque problème détecté",
    hwButton: "Lancer l'analyse du matériel",
    devTitle: "Analyse des périphériques",
    devLead:
      "Contrôle des appareils branchés : audio, caméra, clavier, souris, Bluetooth et écrans",
    devButton: "Lancer l'analyse des périphériques",
  },
  en: {
    allTitle: "Full diagnostic",
    title: "Connection analysis",
    lead: "The connection analysis tests download and upload speed, latency and line stability",
    then: "An in-depth analysis of the Wi-Fi, router and cabling then compares this result with the maximum achievable speed",
    hwTitle: "Hardware analysis",
    hwLead:
      "Checks the system, drives, memory, processor, graphics card, firmware and battery, with a fix for every problem detected",
    hwButton: "Run the hardware analysis",
    devTitle: "Device analysis",
    devLead:
      "Checks connected devices: audio, camera, keyboard, mouse, Bluetooth and displays",
    devButton: "Run the device analysis",
  },
};

// Couleur de chaque analyse : cyan (connexion), orange (matériel), violet
// (périphériques).
const ACCENTS = {
  network: {
    "--accent": "#22d3ee",
    "--accent-light": "#67e8f9",
    "--accent-rgb": "34 211 238",
  },
  hardware: {
    "--accent": "#f97316",
    "--accent-light": "#fb923c",
    "--accent-rgb": "249 115 22",
  },
  devices: {
    "--accent": "#a78bfa",
    "--accent-light": "#c4b5fd",
    "--accent-rgb": "167 139 250",
  },
};

const Separate = styled.div`
  margin-top: 64px;
`;

const Fold = styled.section``;

const FoldHead = styled.button`
  font: inherit;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--accent);
  }
  .chev {
    flex: none;
    color: #64748b;
    transition:
      transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
      color 0.2s;
  }
  &[aria-expanded="true"] .chev {
    transform: rotate(180deg);
    color: var(--accent);
  }
  &:hover .chev,
  &:focus-visible .chev {
    color: var(--accent);
  }
  &:focus-visible {
    outline: none;
  }
`;

const FoldBody = styled.div`
  padding: 0 0 32px;

  /* Le texte d'introduction suit directement le titre. */
  & > div:first-child {
    margin-top: 0;
  }
`;

/**
 * Menu dépliant : le titre seul, puis au clic le texte et l'analyse. Une fois
 * ouvert, le contenu reste monté : le replier ne perd rien.
 */
function Foldout({ accent, title, children }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  return (
    <Fold style={ACCENTS[accent]}>
      <FoldHead
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setSeen(true);
        }}
      >
        <h2>{title}</h2>
        <svg
          className="chev"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </FoldHead>
      {seen && (
        <FoldBody style={{ display: open ? "block" : "none" }}>
          {children}
        </FoldBody>
      )}
    </Fold>
  );
}

export default function Home() {
  const [network, setNetwork] = useState(false);
  const [hardware, setHardware] = useState(false);
  const [devices, setDevices] = useState(false);
  // Débit du dernier test, comparé ensuite à ce que le Wi-Fi peut porter.
  const [download, setDownload] = useState(null);
  const t = useText(TEXT);

  return (
    <>
      <Title>{t.allTitle}</Title>
      <CombinedAnalysis
        download={download}
        onMeasured={(m) => setDownload(m.download)}
      />

      {/* Chaque analyse seule, repliée par défaut. */}
      <Separate>
        <Foldout accent="network" title={t.title}>
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
        </Foldout>

        <Foldout accent="hardware" title={t.hwTitle}>
          <Lead>{t.hwLead}</Lead>
          {hardware ? (
            <HardwareAnalysis />
          ) : (
            <Button $primary onClick={() => setHardware(true)}>
              {t.hwButton}
              <Arrow />
            </Button>
          )}
        </Foldout>

        <Foldout accent="devices" title={t.devTitle}>
          <Lead>{t.devLead}</Lead>
          {devices ? (
            <DeviceAnalysis />
          ) : (
            <Button $primary onClick={() => setDevices(true)}>
              {t.devButton}
              <Arrow />
            </Button>
          )}
        </Foldout>
      </Separate>
    </>
  );
}
