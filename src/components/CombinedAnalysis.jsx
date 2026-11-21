// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic complet : choisir les analyses (connexion, matériel,
// périphériques), puis avancer étape par étape — test de débit, commande (ou
// saisie guidée), résultats. Une étape terminée se replie en une ligne de
// résumé et la suivante s'ouvre.
//
// Chaque bouton prend la couleur de sa section. La commande se construit à
// partir de la sélection ; le texte collé passe dans chaque analyse choisie,
// qui reconnaît ses propres blocs et ignore ceux des autres.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useLang } from "../ui/i18n.jsx";
import { Subtitle, Ghost, NeonButton, Lead } from "../ui/theme.js";
import { diagnosticIntro } from "../lib/intro.js";
import { Unfold } from "../ui/verdict.jsx";
import PasteStep from "../ui/PasteStep.jsx";
import { windowsCommand, macCommand, linuxCommand } from "../lib/commands.js";
import { analyzeDevices } from "../lib/devices.js";
import {
  WIFI_WINDOWS,
  WIFI_MAC,
  HARDWARE_WINDOWS,
  HARDWARE_MAC,
  DEVICES_WINDOWS,
  DEVICES_MAC,
  WIFI_LINUX,
  HARDWARE_LINUX,
  DEVICES_LINUX,
} from "../lib/examples.js";
import { analyzeWifi, WifiResult, WIFI_COMMANDS } from "./NetworkAnalysis.jsx";
import SpeedTest from "./SpeedTest.jsx";
import WifiManual from "./WifiManual.jsx";
import HardwareManual from "./HardwareManual.jsx";
import DeviceManual from "./DeviceManual.jsx";
import { gradeConnection } from "../lib/connection.js";
import {
  analyzeHardware,
  HardwareResults,
  HARDWARE_READS,
  HARDWARE_MAC_READS,
  HARDWARE_LINUX_READS,
} from "./HardwareAnalysis.jsx";
import {
  DeviceResult,
  DEVICE_READS,
  DEVICE_MAC_READ,
  DEVICE_LINUX_READ,
} from "./DeviceAnalysis.jsx";

// Couleurs d'accent des trois sections (voir Home.jsx).
const ACCENTS = {
  network: { accent: "#22d3ee", light: "#67e8f9", rgb: "34 211 238" },
  hardware: { accent: "#f97316", light: "#fb923c", rgb: "249 115 22" },
  devices: { accent: "#a78bfa", light: "#c4b5fd", rgb: "167 139 250" },
};

const accentVars = (k) => ({
  "--accent": ACCENTS[k].accent,
  "--accent-light": ACCENTS[k].light,
  "--accent-rgb": ACCENTS[k].rgb,
});

const TEXT = {
  fr: {
    pick: "Analyses à inclure",
    // Le bouton « Connexion » couvre le test de débit et le réseau local.
    labels: {
      network: "Connexion",
      hardware: "Matériel",
      devices: "Périphériques",
    },
    results: { network: "Réseau local" },
    none: "Choisir au moins une analyse",
    start: "Lancer le diagnostic",
    steps: {
      speed: "Test de débit",
      command: "Commande",
      results: "Résultats",
    },
    step: (n) => `Étape ${n}`,
    skip: "Passer à l'étape suivante",
    grades: {
      excellent: "Excellente",
      good: "Bonne",
      fair: "Correcte",
      poor: "Faible",
    },
    // Juste au-dessus du bouton, avant le lancement : une ligne par analyse.
    launch: {
      network: "Test de débit et contrôle du Wi-Fi, de la box et du câblage",
      hardware:
        "Contrôle du système, des disques, de la mémoire, du processeur, de la carte graphique et de la batterie",
      devices:
        "Contrôle des périphériques branchés : audio, caméra, clavier, souris, Bluetooth et écrans",
    },
    intro: {
      speed:
        "L'analyse de connexion teste le débit descendant et montant, la latence et la stabilité de la ligne",
      network:
        "Une analyse approfondie du Wi-Fi, de la box et du câblage permet de comparer ce résultat au débit maximal atteignable",
      hardware:
        "Contrôle du système, des disques, de la mémoire, du processeur, de la carte graphique, du firmware et de la batterie, avec un correctif pour chaque problème détecté",
      devices:
        "Contrôle des appareils branchés : audio, caméra, clavier, souris, Bluetooth et écrans",
    },
    placeholder: "Coller ici le résultat de la commande…",
    empty: "Aucune information reconnue dans le texte collé",
    about:
      "Cette commande réunit les lectures des analyses choisies. Elle ne modifie rien, et aucune donnée n'est collectée",
    missing: "Rien de reconnu pour cette analyse dans le texte collé",
  },
  en: {
    pick: "Analyses to include",
    labels: {
      network: "Connection",
      hardware: "Hardware",
      devices: "Devices",
    },
    results: { network: "Local network" },
    none: "Choose at least one analysis",
    start: "Run the diagnostic",
    steps: { speed: "Speed test", command: "Command", results: "Results" },
    step: (n) => `Step ${n}`,
    skip: "Skip to the next step",
    grades: {
      excellent: "Excellent",
      good: "Good",
      fair: "Fair",
      poor: "Poor",
    },
    launch: {
      network: "Speed test and a check of the Wi-Fi, router and cabling",
      hardware:
        "Checks the system, drives, memory, processor, graphics card and battery",
      devices:
        "Checks connected devices: audio, camera, keyboard, mouse, Bluetooth and displays",
    },
    intro: {
      speed:
        "The connection analysis tests download and upload speed, latency and line stability",
      network:
        "An in-depth analysis of the Wi-Fi, router and cabling compares this result with the maximum achievable speed",
      hardware:
        "Checks the system, drives, memory, processor, graphics card, firmware and battery, with a fix for every problem detected",
      devices:
        "Checks connected devices: audio, camera, keyboard, mouse, Bluetooth and displays",
    },
    placeholder: "Paste the command output here…",
    empty: "No information found in the pasted text",
    about:
      "This command combines the reads of the chosen analyses. It changes nothing, and no data is collected",
    missing: "Nothing found for this analysis in the pasted text",
  },
};

const KEYS = ["network", "hardware", "devices"];

// Bouton à bascule, à la couleur de sa section : néon quand il est choisi,
// contour discret sinon.
const Chip = styled.button`
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  padding: 9px 18px;
  border-radius: 999px;
  cursor: pointer;
  /* Non choisi : neutre, sans couleur. */
  border: 1px solid #1e293b;
  background: transparent;
  color: #64748b;
  transition:
    background 0.2s,
    color 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;

  &:hover {
    color: #cbd5e1;
    border-color: #334155;
  }
  /* Choisi : néon de la section, contour vif et halo. */
  &[aria-pressed="true"] {
    color: var(--accent-light);
    background: rgb(var(--accent-rgb) / 0.14);
    border-color: var(--accent);
    box-shadow:
      0 0 0 1px rgb(var(--accent-rgb) / 0.35),
      0 0 18px rgb(var(--accent-rgb) / 0.45);
    text-shadow: 0 0 10px rgb(var(--accent-rgb) / 0.6);
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.35);
  }
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 28px;
`;

const Pick = styled.p`
  margin: 0 0 12px;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  color: #64748b;
`;

const Group = styled.section`
  margin-top: 40px;
`;

const Missing = styled.p`
  margin: 0;
  font-size: 14px;
  color: #64748b;
`;

/**
 * @param {{
 *   download?: number|null,            débit mesuré par le dernier test
 *   onMeasured?: (m: object) => void,  transmet les mesures d'un test terminé
 * }} props
 */
export default function CombinedAnalysis({ download, onMeasured }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [chosen, setChosen] = useState({
    network: true,
    hardware: true,
    devices: true,
  });
  const keys = KEYS.filter((k) => chosen[k]);
  const offset = chosen.network ? 1 : 0;

  // Une étape après l'autre : le test de débit (si « Connexion » est choisi),
  // puis la commande une fois le test terminé, puis les résultats.
  //   idle → speed → command
  const [phase, setPhase] = useState("idle");
  // Une étape terminée se replie en une ligne de résumé ; un clic la rouvre.
  const [open, setOpen] = useState({ speed: true, command: true });
  const [measures, setMeasures] = useState(null);
  const [res, setRes] = useState(null);

  const variants = useMemo(() => {
    const win = [
      ...(chosen.hardware ? HARDWARE_READS : []),
      ...(chosen.devices ? DEVICE_READS : []),
      ...(chosen.network ? [WIFI_COMMANDS.windows] : []),
    ];
    const mac = [
      ...(chosen.hardware ? HARDWARE_MAC_READS : []),
      ...(chosen.devices ? [DEVICE_MAC_READ] : []),
      ...(chosen.network ? [WIFI_COMMANDS.mac] : []),
    ];
    const linux = [
      ...(chosen.hardware ? HARDWARE_LINUX_READS : ["export LC_ALL=C"]),
      ...(chosen.devices ? [DEVICE_LINUX_READ] : []),
      // La commande Wi-Fi commence déjà par « export LC_ALL=C ».
      ...(chosen.network
        ? [WIFI_COMMANDS.linux.replace("export LC_ALL=C ; ", "")]
        : []),
    ];
    const join = (parts) => parts.filter(Boolean).join("\n\n");
    return {
      windows: {
        command: win.length ? windowsCommand(win) : "",
        example: join([
          chosen.hardware && HARDWARE_WINDOWS,
          chosen.devices && DEVICES_WINDOWS,
          chosen.network && WIFI_WINDOWS,
        ]),
        about: t.about,
      },
      mac: {
        command: mac.length ? macCommand(mac) : "",
        example: join([
          chosen.hardware && HARDWARE_MAC,
          chosen.devices && DEVICES_MAC,
          chosen.network && WIFI_MAC,
        ]),
        about: t.about,
      },
      linux: {
        command: linux.length > 1 ? linuxCommand(linux) : "",
        example: join([
          chosen.hardware && HARDWARE_LINUX,
          chosen.devices && DEVICES_LINUX,
          chosen.network && WIFI_LINUX,
        ]),
        about: t.about,
      },
    };
  }, [chosen, t.about]);

  const analyze = useCallback(
    (raw) => {
      const out = {
        network: chosen.network ? analyzeWifi(raw) : undefined,
        hardware: chosen.hardware ? analyzeHardware(raw) : undefined,
        devices: chosen.devices ? analyzeDevices(raw) : undefined,
      };
      return Object.values(out).some(Boolean) ? out : null;
    },
    [chosen],
  );

  // Dès qu'un résultat arrive, l'étape « Commande » se replie ; s'il
  // disparaît (texte effacé), elle se rouvre.
  const onResult = useCallback((r) => {
    setRes(r);
    setOpen((o) => ({ ...o, command: !r }));
  }, []);

  const n = (v) =>
    v == null
      ? "—"
      : (Math.round(v * 10) / 10).toLocaleString(
          lang === "fr" ? "fr-FR" : "en-GB",
        );
  const speedSummary = measures
    ? `${t.grades[gradeConnection(measures).grade]} · ${n(measures.download)} / ${n(measures.upload)} Mb/s`
    : null;
  const commandSummary = res
    ? keys
        .filter((k) => res[k])
        .map((k) => t.results[k] ?? t.labels[k])
        .join(", ")
    : null;

  return (
    <>
      {/* Introduction accordée aux analyses choisies. */}
      <Lead>{diagnosticIntro(chosen, lang)}</Lead>
      <Pick>{t.pick}</Pick>
      <Chips role="group" aria-label={t.pick}>
        {KEYS.map((k) => (
          <Chip
            key={k}
            type="button"
            style={accentVars(k)}
            aria-pressed={chosen[k]}
            onClick={() => setChosen((c) => ({ ...c, [k]: !c[k] }))}
          >
            {t.labels[k]}
          </Chip>
        ))}
      </Chips>

      {keys.length === 0 && <Missing>{t.none}</Missing>}

      {/* Étape 1 — test de débit. Le composant reste monté une fois replié :
          ses chiffres et son verdict restent disponibles. */}
      {chosen.network && keys.length > 0 && (
        <StepBox
          style={accentVars("network")}
          head={
            phase !== "idle" ? { label: t.step(1), name: t.steps.speed } : null
          }
          summary={!open.speed ? speedSummary : null}
          open={open.speed}
          onToggle={() => setOpen((o) => ({ ...o, speed: !o.speed }))}
        >
          {phase === "idle" ? (
            <Launch>
              {keys.map((k) => (
                <li key={k} style={accentVars(k)}>{t.launch[k]}</li>
              ))}
            </Launch>
          ) : (
            <Intro>{t.intro.speed}</Intro>
          )}
          <SpeedTest
            onMeasured={(m) => {
              onMeasured?.(m);
              setMeasures(m);
              setPhase("command");
              setOpen((o) => ({ ...o, speed: false, command: true }));
            }}
            onStart={() => setPhase((p) => (p === "idle" ? "speed" : p))}
            startLabel={t.start}
            neon
          />
          {/* Échec du test, ou envie d'aller plus vite : la suite reste
              accessible. */}
          {phase === "speed" && (
            <div style={{ marginTop: 12, marginLeft: -8, fontSize: 13 }}>
              <Ghost
                onClick={() => {
                  setPhase("command");
                  setOpen((o) => ({ ...o, speed: false, command: true }));
                }}
              >
                {t.skip}
              </Ghost>
            </div>
          )}
        </StepBox>
      )}

      {/* Sans test de débit, un bouton lance directement la commande. */}
      {!chosen.network && keys.length > 0 && phase !== "command" && (
        <>
          <Launch>
            {keys.map((k) => (
              <li key={k} style={accentVars(k)}>{t.launch[k]}</li>
            ))}
          </Launch>
          <NeonButton onClick={() => setPhase("command")}>
            <span className="neon">{t.start}</span>
          </NeonButton>
        </>
      )}

      {/* Étape 2 — commande (ou saisie guidée). */}
      {keys.length > 0 && phase === "command" && (
        <Unfold gap={8} first={0.1}>
          <StepBox
            head={{ label: t.step(offset + 1), name: t.steps.command }}
            summary={!open.command ? commandSummary : null}
            open={open.command}
            onToggle={() => setOpen((o) => ({ ...o, command: !o.command }))}
          >
            <Intros>
              {keys.map((k) => (
                <p key={k} style={accentVars(k)}>
                  <strong>{t.results[k] ?? t.labels[k]}</strong>
                  {t.intro[k]}
                </p>
              ))}
            </Intros>
            {/* Une sélection différente repart d'un collage vide. */}
            <PasteStep
              key={keys.join("+")}
              variants={variants}
              placeholder={t.placeholder}
              analyze={analyze}
              empty={t.empty}
              manual={CombinedManual}
              manualProps={{ keys }}
              onResult={onResult}
            />
          </StepBox>
        </Unfold>
      )}

      {/* Étape 3 — résultats. */}
      {res && phase === "command" && (
        <Unfold gap={8} first={0.1}>
          <StepBox
            head={{ label: t.step(offset + 2), name: t.steps.results }}
            open
          >
            {keys.map((k) => (
              <Group key={k} style={accentVars(k)}>
                <Subtitle style={{ color: "var(--accent)" }}>
                  {t.results[k] ?? t.labels[k]}
                </Subtitle>
                {!res[k] ? (
                  <Missing>{t.missing}</Missing>
                ) : k === "network" ? (
                  <WifiResult parsed={res.network} download={download} />
                ) : k === "hardware" ? (
                  <HardwareResults data={res.hardware} />
                ) : (
                  <DeviceResult r={res.devices} />
                )}
              </Group>
            ))}
          </StepBox>
        </Unfold>
      )}
    </>
  );
}

// ── Étapes repliables ───────────────────────────────────────────────────────

const StepWrap = styled.section`
  margin-top: 28px;
`;

const StepButton = styled.button`
  font: inherit;
  width: 100%;
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 0;
  margin: 0 0 4px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  color: #94a3b8;

  .n {
    color: var(--accent);
  }
  .sum {
    margin-left: auto;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 500;
    font-size: 13px;
    color: #cbd5e1;
  }
  .chev {
    flex: none;
    align-self: center;
    color: #64748b;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  &[aria-expanded="true"] .chev {
    transform: rotate(180deg);
  }
  &:hover .chev,
  &:focus-visible .chev {
    color: var(--accent);
  }
  &:focus-visible {
    outline: none;
  }
`;

/**
 * Une étape : son intertitre (cliquable pour plier ou déplier) et son contenu,
 * gardé monté même replié pour ne rien perdre de ce qui a été saisi.
 */
function StepBox({ head, summary, open, onToggle, style, children }) {
  return (
    <StepWrap style={style}>
      {head && (
        <StepButton
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          disabled={!onToggle}
        >
          <span className="n">{head.label}</span>
          {head.name}
          {summary && <span className="sum">{summary}</span>}
          {onToggle && (
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
          )}
        </StepButton>
      )}
      <div
        style={{ display: open ? "block" : "none", marginTop: head ? 14 : 0 }}
      >
        {children}
      </div>
    </StepWrap>
  );
}

const Launch = styled.ul`
  margin: 0 0 20px;
  padding: 0;
  list-style: none;
  max-width: 62ch;
  font-size: 15px;
  line-height: 1.7;
  color: #94a3b8;

  /* Pastille à la couleur de l’analyse. */
  li {
    position: relative;
    padding-left: 18px;
  }
  li::before {
    content: "";
    position: absolute;
    left: 2px;
    top: 0.62em;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
  }
`;

const Intro = styled.p`
  margin: 0 0 20px;
  max-width: 62ch;
  font-size: 15px;
  line-height: 1.7;
  color: #94a3b8;
`;

// Ce que couvre la commande, une ligne par analyse choisie, à sa couleur.
const Intros = styled.div`
  margin: 0 0 24px;
  max-width: 62ch;

  p {
    margin: 0;
    font-size: 15px;
    line-height: 1.7;
    color: #94a3b8;
  }
  p + p {
    margin-top: 8px;
  }
  strong {
    color: var(--accent);
    font-weight: 600;
    margin-right: 8px;
  }
`;

// ── Saisie guidée de l'étape 2 : un formulaire par analyse choisie ──────────

function CombinedManual({ system, onResult, keys }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [parts, setParts] = useState({});
  const setNetwork = useCallback(
    (r) => setParts((p) => ({ ...p, network: r })),
    [],
  );
  const setHardware = useCallback(
    (r) => setParts((p) => ({ ...p, hardware: r })),
    [],
  );
  const setDevices = useCallback(
    (r) => setParts((p) => ({ ...p, devices: r })),
    [],
  );

  useEffect(() => {
    const out = {
      network: keys.includes("network")
        ? (parts.network ?? undefined)
        : undefined,
      hardware: keys.includes("hardware")
        ? (parts.hardware ?? undefined)
        : undefined,
      devices: keys.includes("devices")
        ? (parts.devices ?? undefined)
        : undefined,
    };
    onResult(Object.values(out).some(Boolean) ? out : null);
  }, [parts, keys, onResult]);

  return keys.map((k) => (
    <Group key={k} style={{ ...accentVars(k), marginTop: 28 }}>
      <Subtitle style={{ color: "var(--accent)" }}>
        {t.results[k] ?? t.labels[k]}
      </Subtitle>
      {k === "network" ? (
        <WifiManual system={system} onResult={setNetwork} />
      ) : k === "hardware" ? (
        <HardwareManual system={system} onResult={setHardware} />
      ) : (
        <DeviceManual system={system} onResult={setDevices} />
      )}
    </Group>
  ));
}
