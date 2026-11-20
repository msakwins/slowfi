// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic élargi : l'utilisateur choisit une zone à explorer.
// Périmètre actuel : Internet, Wi-Fi, Ethernet, Câble, Composants réseau.
// (GPU, carte mère, audio… viendront s'ajouter comme de nouvelles cartes.)
//
// Chaque catégorie ouvre soit un outil interactif (speed test, analyseur Wi-Fi),
// soit une checklist guidée symptôme → piste.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import styled from "styled-components";
import { Ghost } from "../ui/theme.js";
import SpeedTest from "./SpeedTest.jsx";
import WifiAnalyzer from "./WifiAnalyzer.jsx";

const CATEGORIES = [
  {
    id: "internet",
    icon: "🌐",
    title: "Internet",
    blurb: "Débit et latence de ta ligne, côté FAI.",
    render: () => <SpeedTest />,
  },
  {
    id: "wifi",
    icon: "📶",
    title: "Wi-Fi",
    blurb: "Bande, canal, signal, débit de lien de ta carte sans-fil.",
    render: () => <WifiAnalyzer />,
  },
  {
    id: "ethernet",
    icon: "🔌",
    title: "Ethernet",
    blurb: "Connexion filaire : négociation de lien, débit bridé.",
    checklist: [
      {
        q: "Le débit filaire plafonne à ~95 Mb/s ?",
        a: "Le lien a négocié en 100 Mb/s (Fast Ethernet) au lieu du Gigabit. Câble abîmé, port de switch limité, ou carte réseau bridée. Teste un autre câble Cat 5e/6 et un autre port.",
      },
      {
        q: "Coupures aléatoires en filaire ?",
        a: "Souvent un connecteur RJ45 mal serti ou un câble pincé. Réinsère les deux extrémités jusqu'au clic, remplace le câble par un neuf pour écarter le doute.",
      },
      {
        q: "Plus lent que le Wi-Fi ?",
        a: "Anormal : mets à jour le pilote de la carte réseau (Gestionnaire de périphériques) et force la vitesse/duplex sur « Auto » dans ses propriétés.",
      },
    ],
  },
  {
    id: "cable",
    icon: "🧵",
    title: "Câble",
    blurb: "État physique des câbles réseau et de leurs connecteurs.",
    checklist: [
      {
        q: "Comment savoir si un câble est en cause ?",
        a: "Échange-le avec un câble neuf et court. Si le problème disparaît, le câble était fautif. Les câbles pliés à angle droit ou écrasés sous un meuble se dégradent avec le temps.",
      },
      {
        q: "Quelle catégorie de câble choisir ?",
        a: "Cat 5e suffit pour du Gigabit. Cat 6/6a pour du 2,5–10 Gb/s. Évite les câbles « plats » bas de gamme sur les longues distances.",
      },
      {
        q: "Longueur maximale ?",
        a: "100 m par segment en cuivre. Au-delà, le signal se dégrade : passe par un switch intermédiaire ou de la fibre.",
      },
    ],
  },
  {
    id: "network-gear",
    icon: "🖧",
    title: "Composants réseau",
    blurb: "Box, routeur, switch, répéteur, carte réseau.",
    checklist: [
      {
        q: "La box chauffe ou rame en fin de journée ?",
        a: "Un simple redémarrage (débranchée 30 s) vide les tables saturées et corrige beaucoup de lenteurs. À faire avant tout diagnostic poussé.",
      },
      {
        q: "Un répéteur/CPL divise ton débit ?",
        a: "Les répéteurs Wi-Fi coupent souvent le débit de moitié, et les CPL dépendent de la qualité du circuit électrique. Préfère un vrai point d'accès câblé si possible.",
      },
      {
        q: "Trop d'appareils connectés ?",
        a: "Une box d'entrée de gamme sature au-delà de ~20 appareils actifs. Regarde la liste des clients dans l'interface de la box et débranche les intrus.",
      },
      {
        q: "Firmware à jour ?",
        a: "Vérifie les mises à jour de firmware de la box/routeur : elles corrigent souvent des bugs de performance et de stabilité.",
      },
    ],
  },
];

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-top: 24px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.button`
  text-align: left;
  font: inherit;
  cursor: pointer;
  background: #0b1220;
  border: 1px solid #1e293b;
  border-radius: 14px;
  padding: 18px;
  transition: border-color 0.15s, transform 0.1s, background 0.15s;

  &:hover {
    border-color: #22d3ee;
    background: #0f172a;
    transform: translateY(-2px);
  }

  .icon { font-size: 24px; }
  .t { margin: 10px 0 4px; font-size: 16px; font-weight: 700; color: #f1f5f9; }
  .b { margin: 0; font-size: 13px; line-height: 1.5; color: #94a3b8; }
`;

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0 4px;

  .icon { font-size: 22px; }
  h2 { margin: 0; font-size: 20px; color: #f8fafc; }
`;

const Check = styled.details`
  margin-top: 12px;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 14px 16px;

  summary {
    cursor: pointer;
    font-weight: 600;
    color: #f1f5f9;
    list-style: none;
  }
  summary::-webkit-details-marker { display: none; }
  summary::before { content: "▸ "; color: #22d3ee; }
  &[open] summary::before { content: "▾ "; }

  p { margin: 10px 0 0; font-size: 14px; line-height: 1.6; color: #94a3b8; }
`;

export default function Diagnostic() {
  const [active, setActive] = useState(null);
  const cat = CATEGORIES.find((c) => c.id === active);

  if (cat) {
    return (
      <>
        <Ghost onClick={() => setActive(null)}>← Toutes les catégories</Ghost>
        <PanelHead>
          <span className="icon">{cat.icon}</span>
          <h2>{cat.title}</h2>
        </PanelHead>
        {cat.render ? (
          <div style={{ marginTop: 16 }}>{cat.render()}</div>
        ) : (
          cat.checklist.map((item) => (
            <Check key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </Check>
          ))
        )}
      </>
    );
  }

  return (
    <Grid>
      {CATEGORIES.map((c) => (
        <Card key={c.id} onClick={() => setActive(c.id)}>
          <div className="icon">{c.icon}</div>
          <p className="t">{c.title}</p>
          <p className="b">{c.blurb}</p>
        </Card>
      ))}
    </Grid>
  );
}
