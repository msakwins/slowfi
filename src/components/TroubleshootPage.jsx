// ─────────────────────────────────────────────────────────────────────────────
// Page « Dépannage » : choisir le problème (clavier, son, Wi-Fi, lenteur…),
// et seule l'analyse qui le concerne est lancée. Le résultat : ce que
// l'analyse a trouvé pour ce problème, les vérifications à faire, puis les
// autres causes possibles, à examiner d'un clic.
// ─────────────────────────────────────────────────────────────────────────────
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { Title, Lead, breathe } from "../ui/theme.js";
import { useLang } from "../ui/i18n.jsx";
import PasteStep from "../ui/PasteStep.jsx";
import { Findings } from "../ui/verdict.jsx";
import { localize } from "../lib/en.js";
import { TOPICS, TOPIC_GROUPS } from "../lib/topics.js";
import { troubleshoot, kindOf } from "../lib/troubleshoot.js";
import { analyzeDevices } from "../lib/devices.js";
import { windowsCommand, macCommand, linuxCommand } from "../lib/commands.js";
import {
  WIFI_WINDOWS,
  WIFI_MAC,
  WIFI_LINUX,
  HARDWARE_WINDOWS,
  HARDWARE_MAC,
  HARDWARE_LINUX,
  DEVICES_WINDOWS,
  DEVICES_MAC,
  DEVICES_LINUX,
} from "../lib/examples.js";
import { analyzeWifi, WifiResult, WIFI_COMMANDS } from "./NetworkAnalysis.jsx";
import {
  analyzeHardware,
  HardwareResults,
  HARDWARE_READS,
  HARDWARE_MAC_READS,
  HARDWARE_LINUX_READS,
} from "./HardwareAnalysis.jsx";
import {
  DEVICE_READS,
  DEVICE_MAC_READ,
  DEVICE_LINUX_READ,
} from "./DeviceAnalysis.jsx";
import EthernetCheck from "./EthernetCheck.jsx";

const TEXT = {
  fr: {
    title: "Dépannage",
    lead: "Choisir le problème : seule l'analyse qui le concerne est lancée",
    families: { devices: "Périphériques", network: "Réseau", pc: "Ordinateur" },
    topics: {
      keyboard: "Clavier",
      mouse: "Souris",
      sound: "Son",
      mic: "Micro",
      camera: "Caméra",
      bluetooth: "Bluetooth",
      screen: "Écran",
      printer: "Imprimante",
      wifi: "Wi-Fi",
      ethernet: "Ethernet",
      internet: "Box et Internet",
      slow: "Lenteur",
      startup: "Démarrage lent",
      heat: "Surchauffe",
      crashes: "Plantages",
      disk: "Disque",
      battery: "Batterie",
      updates: "Mises à jour",
    },
    placeholder: "Coller ici le résultat de la commande…",
    empty: "Aucune information reconnue dans le texte collé",
    about:
      "Cette commande lit seulement ce qui concerne ce problème. Elle ne modifie rien, et aucune donnée n'est collectée",
    found: "Constaté",
    nothing: "Aucune anomalie relevée pour ce problème",
    tips: "À vérifier",
    which: "Appareil concerné",
    missing: "Absent de la liste",
    related: "Peut aussi venir de",
  },
  en: {
    title: "Troubleshooting",
    lead: "Choose the problem: only the analysis that concerns it runs",
    families: { devices: "Devices", network: "Network", pc: "Computer" },
    topics: {
      keyboard: "Keyboard",
      mouse: "Mouse",
      sound: "Sound",
      mic: "Microphone",
      camera: "Camera",
      bluetooth: "Bluetooth",
      screen: "Display",
      printer: "Printer",
      wifi: "Wi-Fi",
      ethernet: "Ethernet",
      internet: "Router and Internet",
      slow: "Slowness",
      startup: "Slow startup",
      heat: "Overheating",
      crashes: "Crashes",
      disk: "Drive",
      battery: "Battery",
      updates: "Updates",
    },
    placeholder: "Paste the command output here…",
    empty: "No information found in the pasted text",
    about:
      "This command only reads what concerns this problem. It changes nothing, and no data is collected",
    found: "Found",
    nothing: "No issue found for this problem",
    tips: "To check",
    which: "Device concerned",
    missing: "Not in the list",
    related: "Can also come from",
  },
};

// Icônes au trait, 24 px, une par sujet.
const ICONS = {
  keyboard: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10" />
    </>
  ),
  mouse: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="5" />
      <path d="M12 7v3" />
    </>
  ),
  sound: (
    <>
      <path d="M4 10v4h4l5 4V6L8 10H4Z" />
      <path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  camera: (
    <>
      <rect x="3" y="7" width="13" height="10" rx="2" />
      <path d="m16 10.5 5-3v9l-5-3" />
    </>
  ),
  bluetooth: <path d="m7 7 10 10-5 4V3l5 4L7 17" />,
  screen: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  printer: (
    <>
      <path d="M7 9V3h10v6" />
      <rect x="3" y="9" width="18" height="8" rx="2" />
      <path d="M7 14h10v7H7z" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0" />
      <path d="M12 19.5h.01" />
    </>
  ),
  internet: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  slow: (
    <>
      <path d="M4.5 16a8 8 0 1 1 15 0" />
      <path d="m12 16-3.5-4.5" />
    </>
  ),
  ethernet: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 19v-4h8v4M9 9v2M12 9v2M15 9v2" />
    </>
  ),
  startup: (
    <>
      <path d="M12 3v8" />
      <path d="M6.4 7a8 8 0 1 0 11.2 0" />
    </>
  ),
  heat: (
    <>
      <path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Z" />
      <path d="M12 9v7" />
    </>
  ),
  crashes: (
    <>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  battery: (
    <>
      <rect x="3" y="7" width="16" height="10" rx="2" />
      <path d="M21 11v2M6 10v4M9 10v4" />
    </>
  ),
  updates: (
    <>
      <path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9" />
      <path d="M18.5 3v4h-4M5.5 21v-4h4" />
    </>
  ),
  disk: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 15h.01M11 15h6" />
    </>
  ),
};

const Icon = ({ id }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {ICONS[id]}
  </svg>
);

// Couleur de chaque famille, comme les analyses du diagnostic complet.
const FAMILY_COLORS = {
  network: {
    "--accent": "#22d3ee",
    "--accent-light": "#67e8f9",
    "--accent-rgb": "34 211 238",
  },
  pc: {
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
const familyOf = (id) =>
  TOPIC_GROUPS.find(([, ids]) => ids.includes(id))?.[0] ?? "network";

const Family = styled.p`
  margin: 28px 0 10px;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--accent);
`;

const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

// Pastille : icône à la couleur de la famille ; choisie, le néon de la
// famille, comme une analyse choisie.
const Tile = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px 9px 12px;
  border-radius: 999px;
  border: 1.5px solid rgb(var(--accent-rgb) / 0.45);
  background: transparent;
  color: #e0fbff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s,
    box-shadow 0.2s;

  svg {
    width: 18px;
    height: 18px;
    color: var(--accent);
  }
  &:hover,
  &:focus-visible {
    border-color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.05);
    outline: none;
    animation: ${breathe} 1.8s ease-in-out infinite;
  }
  &[aria-pressed="true"] {
    color: var(--accent-light);
    border-color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.14);
    text-shadow: 0 0 10px rgb(var(--accent-rgb) / 0.6);
    animation: ${breathe} 1.8s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    &,
    &:hover {
      animation: none;
    }
  }
`;

const Result = styled.section`
  margin-top: 36px;
  scroll-margin-top: 24px;

  h2 {
    margin: 0 0 16px;
    font-size: 18px;
    font-weight: 600;
    color: #e0fbff;
  }
`;

const Head = styled.p`
  margin: 24px 0 8px;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 500;
  color: #8fb3c4;
`;

const Tips = styled.ol`
  margin: 0;
  padding-left: 22px;
  li {
    padding: 4px 0;
    font-size: 14px;
    line-height: 1.6;
    color: #b6dbe6;
  }
  li::marker {
    color: #22d3ee;
    font-weight: 600;
  }
`;

const Nothing = styled.p`
  margin: 0;
  font-size: 14px;
  color: #b6dbe6;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  button {
    font: inherit;
    font-size: 13px;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1.5px solid #334155;
    background: none;
    color: #8fb3c4;
    cursor: pointer;
  }
  button[aria-pressed="true"],
  button:hover {
    color: #e0fbff;
    border-color: #22d3ee;
  }
`;

const Related = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

/** Commande et exemple par système, pour l'analyse d'un sujet. */
function useVariants(area, lang, about) {
  return useMemo(() => {
    if (area === "network")
      return {
        windows: {
          command: windowsCommand([WIFI_COMMANDS.windows], lang),
          example: WIFI_WINDOWS,
          about,
        },
        mac: {
          command: macCommand([WIFI_COMMANDS.mac], lang),
          example: WIFI_MAC,
          about,
        },
        linux: {
          command: linuxCommand([WIFI_COMMANDS.linux]),
          example: WIFI_LINUX,
          about,
        },
      };
    if (area === "hardware")
      return {
        windows: {
          command: windowsCommand(HARDWARE_READS, lang),
          example: HARDWARE_WINDOWS,
          about,
        },
        mac: {
          command: macCommand(HARDWARE_MAC_READS, lang),
          example: HARDWARE_MAC,
          about,
        },
        linux: {
          command: linuxCommand(HARDWARE_LINUX_READS),
          example: HARDWARE_LINUX,
          about,
        },
      };
    return {
      windows: {
        command: windowsCommand(DEVICE_READS, lang),
        example: DEVICES_WINDOWS,
        about,
      },
      mac: {
        command: macCommand([DEVICE_MAC_READ], lang),
        example: DEVICES_MAC,
        about,
      },
      linux: {
        command: linuxCommand(["export LC_ALL=C", DEVICE_LINUX_READ]),
        example: DEVICES_LINUX,
        about,
      },
    };
  }, [area, lang, about]);
}

/** Périphérique : l'appareil concerné, ce qui a été relevé, quoi vérifier. */
function DeviceTopic({ r, topic, t, lang }) {
  const cfg = TOPICS[topic];
  // Appareils de la catégorie (micro ou sortie pour l'audio), sans doublon.
  const devices = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const d of r.devices ?? []) {
      if (d.group !== cfg.group || seen.has(d.name)) continue;
      if (cfg.flow) {
        const k = kindOf(r, d).kind;
        if ((cfg.flow === "capture") !== (k === "mic")) continue;
      }
      seen.add(d.name);
      out.push({ name: d.name, group: d.group });
    }
    return out;
  }, [r, cfg]);
  const [chosen, setChosen] = useState(0);
  const device = chosen === "missing" ? null : (devices[chosen] ?? null);
  const res = troubleshoot(r, device ?? (devices.length ? null : null));

  return (
    <>
      {devices.length > 0 && (
        <>
          <Head style={{ marginTop: 0 }}>{t.which}</Head>
          <Chips role="group" aria-label={t.which}>
            {devices.map((d, i) => (
              <button
                key={d.name}
                type="button"
                aria-pressed={chosen === i}
                onClick={() => setChosen(i)}
              >
                {d.name}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={chosen === "missing"}
              onClick={() => setChosen("missing")}
            >
              {t.missing}
            </button>
          </Chips>
        </>
      )}
      <Head>{t.found}</Head>
      {res.found.length ? (
        <Findings findings={res.found} engine="devices" />
      ) : (
        <Nothing>{t.nothing}</Nothing>
      )}
      <Head>{t.tips}</Head>
      <Tips>
        {res.tips.map((tip) => (
          <li key={tip.id}>{localize(tip, lang, "devices").title}</li>
        ))}
      </Tips>
    </>
  );
}

export default function TroubleshootPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [topic, setTopic] = useState(null);
  const [res, setRes] = useState(null);
  const resultRef = useRef(null);
  const cfg = topic ? TOPICS[topic] : null;
  const area = cfg?.area ?? "devices";
  const variants = useVariants(area, lang, t.about);

  const analyze = useCallback(
    (raw) =>
      area === "network"
        ? analyzeWifi(raw)
        : area === "hardware"
          ? analyzeHardware(raw)
          : analyzeDevices(raw),
    [area],
  );
  const onResult = useCallback((r) => setRes(r), []);

  // Nouveau sujet : résultat effacé, la page descend jusqu'à l'analyse.
  const choose = (id) => {
    setTopic(id);
    setRes(null);
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  useEffect(() => {
    if (res)
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [res]);

  return (
    <section>
      <Title>{t.title}</Title>
      <Lead>{t.lead}</Lead>

      {TOPIC_GROUPS.map(([family, ids]) => (
        <React.Fragment key={family}>
          <div style={FAMILY_COLORS[family]}>
            <Family>{t.families[family]}</Family>
            <Pills>
              {ids.map((id) => (
                <Tile
                  key={id}
                  type="button"
                  aria-pressed={topic === id}
                  onClick={() => choose(id)}
                >
                  <Icon id={id} />
                  {t.topics[id]}
                </Tile>
              ))}
            </Pills>
          </div>
        </React.Fragment>
      ))}

      {topic && (
        <Result ref={resultRef} style={FAMILY_COLORS[familyOf(topic)]}>
          <h2>{t.topics[topic]}</h2>
          {/* Une analyse par domaine : changer de sujet dans le même domaine
              garde la lecture déjà faite. */}
          {/* Ethernet : sa propre vérification (commande et résultat). */}
          {area === "ethernet" ? (
            <EthernetCheck download={null} />
          ) : (
            <PasteStep
              key={area}
              variants={variants}
              placeholder={t.placeholder}
              analyze={analyze}
              empty={t.empty}
              onResult={onResult}
            />
          )}

          {res && area === "devices" && (
            <DeviceTopic key={topic} r={res} topic={topic} t={t} lang={lang} />
          )}
          {res && area === "network" && (
            <div style={{ marginTop: 24 }}>
              <WifiResult parsed={res} download={null} />
            </div>
          )}
          {res && area === "hardware" && (
            <div style={{ marginTop: 24 }}>
              <HardwareResults data={res} />
            </div>
          )}
          {(res || area === "ethernet") && cfg.tips && (
            <>
              <Head>{t.tips}</Head>
              <Tips>
                {cfg.tips[lang].map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </Tips>
            </>
          )}

          <Head>{t.related}</Head>
          <Related>
            {cfg.related.map((id) => (
              <Tile
                key={id}
                type="button"
                style={FAMILY_COLORS[familyOf(id)]}
                onClick={() => choose(id)}
              >
                <Icon id={id} />
                {t.topics[id]}
              </Tile>
            ))}
          </Related>
        </Result>
      )}
    </section>
  );
}
