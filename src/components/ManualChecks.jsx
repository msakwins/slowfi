// ─────────────────────────────────────────────────────────────────────────────
// Page « Vérifications manuelles » : ce qu'aucune commande ne lit (état des
// câbles, liaison Ethernet, comportement de la box), en symptôme puis piste.
// Liée depuis le pied de page.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import styled from "styled-components";
import { Title, Lead } from "../ui/theme.js";
import { useLang } from "../ui/i18n.jsx";

const GROUPS = {
  fr: [
    {
      title: "Ethernet",
      items: [
        {
          q: "Le débit filaire plafonne à ~95 Mb/s ?",
          a: "Le lien a négocié en 100 Mb/s (Fast Ethernet) au lieu du Gigabit. Câble abîmé, port de switch limité, ou carte réseau bridée. Tester un autre câble Cat 5e/6 et un autre port",
        },
        {
          q: "Coupures aléatoires en filaire ?",
          a: "Cause fréquente : connecteur RJ45 mal serti ou câble pincé. Réinsérer les deux extrémités jusqu'au clic, puis essayer un câble neuf",
        },
        {
          q: "Plus lent que le Wi-Fi ?",
          a: "Une liaison filaire est normalement plus rapide. Mettre à jour le pilote de la carte réseau (Gestionnaire de périphériques), puis régler vitesse/duplex sur « Auto » dans ses propriétés",
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
          a: "Débrancher la box 30 secondes. Le redémarrage vide les tables saturées et corrige une bonne partie des lenteurs",
        },
        {
          q: "Un répéteur ou un CPL divise le débit ?",
          a: "Les répéteurs Wi-Fi coupent souvent le débit de moitié, et les CPL dépendent de la qualité du circuit électrique. Privilégier un point d'accès relié par câble",
        },
        {
          q: "Trop d'appareils connectés ?",
          a: "Une box d'entrée de gamme sature au-delà de ~20 appareils actifs. Consulter la liste des clients dans l'interface de la box et déconnecter les appareils inconnus",
        },
        {
          q: "Firmware à jour ?",
          a: "Vérifier les mises à jour de firmware de la box ou du routeur, qui corrigent souvent des défauts de performance et de stabilité",
        },
      ],
    },
  ],
  en: [
    {
      title: "Ethernet",
      items: [
        {
          q: "Wired speed capped at ~95 Mb/s?",
          a: "The link negotiated 100 Mb/s (Fast Ethernet) instead of Gigabit. Damaged cable, limited switch port, or a throttled network card. Try another Cat 5e/6 cable and another port",
        },
        {
          q: "Random drops on a wired connection?",
          a: "Common cause: a badly crimped RJ45 connector or a pinched cable. Reseat both ends until they click, then try a new cable",
        },
        {
          q: "Slower than Wi-Fi?",
          a: "A wired link is normally faster. Update the network card driver (Device Manager), then set speed/duplex to “Auto” in its properties",
        },
      ],
    },
    {
      title: "Cabling",
      items: [
        {
          q: "How to tell if a cable is the problem?",
          a: "Swap it for a new, short cable. If the problem goes away, the cable was at fault. Cables bent at right angles or crushed under furniture degrade over time",
        },
        {
          q: "Which cable category to choose?",
          a: "Cat 5e is enough for Gigabit. Cat 6/6a for 2.5–10 Gb/s. Avoid cheap “flat” cables over long distances",
        },
        {
          q: "Maximum length?",
          a: "100 m per copper segment. Beyond that the signal degrades: go through an intermediate switch or fibre",
        },
      ],
    },
    {
      title: "Router and network equipment",
      items: [
        {
          q: "Router hot or slowing down at the end of the day?",
          a: "Unplug the router for 30 seconds. The restart clears saturated tables and fixes a good share of slowdowns",
        },
        {
          q: "A repeater or powerline adapter halving the speed?",
          a: "Wi-Fi repeaters often halve the speed, and powerline adapters depend on the quality of the electrical wiring. Favour an access point connected by cable",
        },
        {
          q: "Too many connected devices?",
          a: "An entry-level router saturates beyond ~20 active devices. Check the client list in the router interface and disconnect unknown devices",
        },
        {
          q: "Firmware up to date?",
          a: "Check for router firmware updates, which often fix performance and stability issues",
        },
      ],
    },
  ],
};

const Wrap = styled.div`
  h4 {
    margin: 0 0 4px;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 600;
    color: #64748b;
  }
  h4:not(:first-of-type) {
    margin-top: 32px;
  }
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
  summary::-webkit-details-marker {
    display: none;
  }
  summary:hover {
    color: #f8fafc;
  }
  summary:focus-visible {
    outline: none;
    color: #22d3ee;
  }

  .chev {
    flex: none;
    color: #64748b;
    transition:
      transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
      color 0.2s;
  }
  &[open] .chev {
    transform: rotate(180deg);
    color: #22d3ee;
  }

  p {
    margin: 0 0 14px;
    font-size: 14px;
    line-height: 1.7;
    color: #94a3b8;
  }
`;

function Chevron() {
  return (
    <svg
      className="chev"
      viewBox="0 0 16 16"
      width="14"
      height="14"
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
  );
}

const TEXT = {
  fr: {
    title: "Vérifications manuelles",
    lead: "Contrôles de l'Ethernet, du câblage et de la box, qu'aucune commande ne peut mesurer",
  },
  en: {
    title: "Manual checks",
    lead: "Checks on Ethernet, cabling and the router that no command can measure",
  },
};

export default function ManualChecks() {
  const { lang } = useLang();
  const t = TEXT[lang];
  return (
    <>
      <Title>{t.title}</Title>
      <Lead>{t.lead}</Lead>
      <Wrap>
        {GROUPS[lang].map((g) => (
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
    </>
  );
}
