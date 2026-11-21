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
          q: "Débit filaire bloqué vers 95 Mb/s ?",
          a: "La carte réseau et la box communiquent à 100 Mb/s au lieu de 1 000. Essayer un autre câble, puis un autre port de la box",
        },
        {
          q: "Coupures en filaire ?",
          a: "Vérifier que les deux prises du câble sont bien enfoncées, jusqu'au clic. Si les coupures continuent, changer de câble",
        },
        {
          q: "Plus lent que le Wi-Fi ?",
          a: "En filaire, le débit devrait être au moins aussi bon qu'en Wi-Fi. Mettre à jour le pilote de la carte réseau depuis le site du fabricant de l'ordinateur ou de la carte mère",
        },
      ],
    },
    {
      title: "Câblage",
      items: [
        {
          q: "Comment savoir si le câble est en cause ?",
          a: "Le remplacer par un câble neuf le temps d'un test. Si le problème disparaît, c'était le câble. Un câble plié ou écrasé sous un meuble s'abîme avec le temps",
        },
        {
          q: "Quel câble choisir ?",
          a: "Un câble Cat 5e ou Cat 6 suffit jusqu'à 1 Gb/s. Pour une fibre plus rapide, prendre du Cat 6a",
        },
        {
          q: "Quelle longueur au maximum ?",
          a: "100 mètres. Pour aller plus loin, placer un switch entre les deux",
        },
      ],
    },
    {
      title: "Box et équipements réseau",
      items: [
        {
          q: "La box ralentit au fil de la journée ?",
          a: "La débrancher 30 secondes, puis la rebrancher. Ce redémarrage règle beaucoup de lenteurs de la box",
        },
        {
          q: "Un répéteur ou un boîtier CPL ralentit la connexion ?",
          a: "Un répéteur Wi-Fi divise souvent le débit par deux. Un boîtier CPL passe par les prises électriques et dépend de leur état. Quand c'est possible, relier un point d'accès Wi-Fi à la box par câble",
        },
        {
          q: "Trop d'appareils connectés ?",
          a: "Une box d'entrée de gamme ralentit au-delà d'une vingtaine d'appareils actifs. Ouvrir la liste des appareils dans l'interface de la box et déconnecter ceux qui ne sont pas reconnus",
        },
        {
          q: "La box est-elle à jour ?",
          a: "Vérifier dans l'interface de la box si une mise à jour est proposée : elle corrige souvent des problèmes de vitesse et de stabilité",
        },
      ],
    },
  ],
  en: [
    {
      title: "Ethernet",
      items: [
        {
          q: "Wired speed stuck around 95 Mb/s?",
          a: "The network card and the router talk at 100 Mb/s instead of 1,000. Try another cable, then another router port",
        },
        {
          q: "Drops on a wired connection?",
          a: "Check that both ends of the cable are pushed fully in, until they click. If the drops continue, change the cable",
        },
        {
          q: "Slower than Wi-Fi?",
          a: "Wired should be at least as fast as Wi-Fi. Update the network card driver from the computer or motherboard maker's website",
        },
      ],
    },
    {
      title: "Cabling",
      items: [
        {
          q: "How to tell if the cable is the problem?",
          a: "Replace it with a new cable for a test. If the problem goes away, it was the cable. A cable that is bent or crushed under furniture wears out over time",
        },
        {
          q: "Which cable to choose?",
          a: "A Cat 5e or Cat 6 cable is enough up to 1 Gb/s. For faster fibre, choose Cat 6a",
        },
        {
          q: "How long can it be?",
          a: "100 metres. To go further, put a switch in between",
        },
      ],
    },
    {
      title: "Router and network equipment",
      items: [
        {
          q: "Router slowing down over the day?",
          a: "Unplug it for 30 seconds, then plug it back in. This restart fixes many router slowdowns",
        },
        {
          q: "A repeater or powerline adapter slowing the connection?",
          a: "A Wi-Fi repeater often halves the speed. A powerline adapter goes through the power sockets and depends on their condition. When possible, connect a Wi-Fi access point to the router with a cable",
        },
        {
          q: "Too many connected devices?",
          a: "An entry-level router slows down beyond about twenty active devices. Open the device list in the router interface and disconnect those you don't recognise",
        },
        {
          q: "Is the router up to date?",
          a: "Check in the router interface whether an update is offered: it often fixes speed and stability problems",
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
  /* Pas de trait sous la dernière question : le pied de page suit. */
  &:last-child {
    border-bottom: none;
  }

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
