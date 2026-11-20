// ─────────────────────────────────────────────────────────────────────────────
// Vérifications manuelles du réseau local : ce qu'aucune commande ne lit
// (état des câbles, comportement de la box). Repliées par défaut, sous
// l'analyse Wi-Fi, en symptôme → piste.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import styled from "styled-components";

const GROUPS = [
  {
    title: "Ethernet",
    items: [
      {
        q: "Le débit filaire plafonne à ~95 Mb/s ?",
        a: "Le lien a négocié en 100 Mb/s (Fast Ethernet) au lieu du Gigabit. Câble abîmé, port de switch limité, ou carte réseau bridée. Tester un autre câble Cat 5e/6 et un autre port",
      },
      {
        q: "Coupures aléatoires en filaire ?",
        a: "Souvent un connecteur RJ45 mal serti ou un câble pincé. Réinsérer les deux extrémités jusqu'au clic, puis remplacer le câble par un neuf pour écarter le doute",
      },
      {
        q: "Plus lent que le Wi-Fi ?",
        a: "Anormal : mettre à jour le pilote de la carte réseau (Gestionnaire de périphériques) et forcer la vitesse/duplex sur « Auto » dans ses propriétés",
      },
    ],
  },
  {
    title: "Câblage",
    items: [
      {
        q: "Comment savoir si un câble est en cause ?",
        a: "L'échanger contre un câble neuf et court. Si le problème disparaît, le câble était fautif. Les câbles pliés à angle droit ou écrasés sous un meuble se dégradent avec le temps",
      },
      {
        q: "Quelle catégorie de câble choisir ?",
        a: "Cat 5e suffit pour du Gigabit. Cat 6/6a pour du 2,5–10 Gb/s. Éviter les câbles « plats » bas de gamme sur les longues distances",
      },
      {
        q: "Longueur maximale ?",
        a: "100 m par segment en cuivre. Au-delà, le signal se dégrade : passer par un switch intermédiaire ou de la fibre",
      },
    ],
  },
  {
    title: "Box et équipements réseau",
    items: [
      {
        q: "La box chauffe ou ralentit en fin de journée ?",
        a: "Un simple redémarrage (débranchée 30 s) vide les tables saturées et corrige beaucoup de lenteurs. À faire avant tout diagnostic poussé",
      },
      {
        q: "Un répéteur ou un CPL divise le débit ?",
        a: "Les répéteurs Wi-Fi coupent souvent le débit de moitié, et les CPL dépendent de la qualité du circuit électrique. Préférer un vrai point d'accès câblé si possible",
      },
      {
        q: "Trop d'appareils connectés ?",
        a: "Une box d'entrée de gamme sature au-delà de ~20 appareils actifs. Consulter la liste des clients dans l'interface de la box et déconnecter les appareils inconnus",
      },
      {
        q: "Firmware à jour ?",
        a: "Vérifier les mises à jour de firmware de la box ou du routeur : elles corrigent souvent des bugs de performance et de stabilité",
      },
    ],
  },
];

const Wrap = styled.div`
  margin-top: 40px;

  h4 {
    margin: 0 0 4px;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 600;
    color: #64748b;
  }
  h4:not(:first-of-type) { margin-top: 24px; }
`;

const Heading = styled.p`
  margin: 0 0 20px;
  font-size: 15px;
  font-weight: 600;
  color: #f1f5f9;
`;

// Pas de cadre : une ligne fine sépare les questions, comme une liste.
const Item = styled.details`
  border-bottom: 1px solid #1e293b;

  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    cursor: pointer;
    list-style: none;
    font-size: 14px;
    color: #e2e8f0;
  }
  summary::-webkit-details-marker { display: none; }
  summary:hover { color: #f8fafc; }
  summary:focus-visible { outline: none; color: #22d3ee; }

  .chev {
    flex: none;
    color: #64748b;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), color 0.2s;
  }
  &[open] .chev { transform: rotate(180deg); color: #22d3ee; }

  p {
    margin: 0 0 14px;
    font-size: 14px;
    line-height: 1.7;
    color: #94a3b8;
  }
`;

function Chevron() {
  return (
    <svg className="chev" viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ManualChecks() {
  return (
    <Wrap>
      <Heading>Vérifications manuelles</Heading>
      {GROUPS.map((g) => (
        <React.Fragment key={g.title}>
          <h4>{g.title}</h4>
          {g.items.map((item) => (
            <Item key={item.q}>
              <summary>
                {item.q}
                <Chevron />
              </summary>
              <p>{item.a}</p>
            </Item>
          ))}
        </React.Fragment>
      ))}
    </Wrap>
  );
}
