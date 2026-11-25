// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic complet, sous le test de débit de l'accueil : choisir les
// analyses (réseau local, matériel, périphériques), puis avancer étape par
// étape — commande (ou saisie guidée), résultats. Une étape terminée se replie en une ligne de
// résumé et la suivante s'ouvre.
//
// Chaque bouton prend la couleur de sa section. La commande se construit à
// partir de la sélection ; le texte collé passe dans chaque analyse choisie,
// qui reconnaît ses propres blocs et ignore ceux des autres.
// ─────────────────────────────────────────────────────────────────────────────
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { useLang } from "../ui/i18n.jsx";
import { Subtitle, NeonButton, Lead, breathe } from "../ui/theme.js";
import { diagnosticIntro } from "../lib/intro.js";
import { Unfold } from "../ui/verdict.jsx";
import PasteStep from "../ui/PasteStep.jsx";
import { recordLocal } from "../ui/historyStore.js";
import { makeSnapshot } from "../lib/snapshots.js";
import { desktop } from "../ui/desktop.js";
import { navigate } from "../ui/router.jsx";
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
import WifiManual from "./WifiManual.jsx";
import HardwareManual from "./HardwareManual.jsx";
import DeviceManual from "./DeviceManual.jsx";
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
    pick: "Choisir les analyses à inclure",
    // Site, après le lancement : les boutons règlent la commande affichée.
    pickCommand: "Analyses incluses",
    labels: {
      network: "Réseau local",
      hardware: "Matériel",
      devices: "Périphériques",
    },
    none: "Choisir au moins une analyse",
    start: "Lancer le diagnostic",
    steps: {
      command: "Commande",
      reading: "Analyse",
      results: "Résultats",
    },
    step: (n) => `Étape ${n}`,
    // Progression, dans l'application.
    reading: "Lecture en cours",
    done: "Analysé",
    nothing: "Rien de reconnu",
    // Résumé : une pastille par niveau.
    none: "Aucun problème détecté",
    problems: (n) => (n > 1 ? "problèmes détectés" : "problème détecté"),
    warnings: (n) => (n > 1 ? "points à surveiller" : "point à surveiller"),
    // Juste au-dessus du bouton, avant le lancement : une ligne par analyse.
    launch: {
      network: "Contrôle du Wi-Fi, de la box et du câblage",
      hardware:
        "Contrôle du système, des disques, de la mémoire, du processeur, de la carte graphique et de la batterie",
      devices:
        "Contrôle des périphériques branchés : audio, caméra, clavier, souris, Bluetooth et écrans",
    },
    intro: {
      network:
        "Une analyse approfondie du Wi-Fi, de la box et du câblage permet de comparer le débit mesuré au débit maximal atteignable",
      hardware:
        "Contrôle du système, des disques, de la mémoire, du processeur, de la carte graphique, du firmware et de la batterie",
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
    pick: "Choose the analyses to include",
    pickCommand: "Included analyses",
    labels: {
      network: "Local network",
      hardware: "Hardware",
      devices: "Devices",
    },
    none: "Choose at least one analysis",
    start: "Run the diagnostic",
    steps: {
      command: "Command",
      reading: "Analysis",
      results: "Results",
    },
    step: (n) => `Step ${n}`,
    reading: "Reading",
    done: "Analyzed",
    nothing: "Nothing recognized",
    none: "No issue found",
    problems: (n) => (n > 1 ? "problems found" : "problem found"),
    warnings: (n) => (n > 1 ? "points to watch" : "point to watch"),
    launch: {
      network: "Checks the Wi-Fi, router and cabling",
      hardware:
        "Checks the system, drives, memory, processor, graphics card and battery",
      devices:
        "Checks connected devices: audio, camera, keyboard, mouse, Bluetooth and displays",
    },
    intro: {
      network:
        "An in-depth analysis of the Wi-Fi, router and cabling compares the measured speed with the maximum achievable speed",
      hardware:
        "Checks the system, drives, memory, processor, graphics card, firmware and battery",
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
  border: 1.5px solid #334155;
  background: transparent;
  color: #64748b;
  transition:
    background 0.2s,
    color 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;

  /* Survol : la couleur de l'analyse, en plus discret que la sélection. */
  &:hover {
    color: var(--accent-light);
    border-color: rgb(var(--accent-rgb) / 0.6);
    background: rgb(var(--accent-rgb) / 0.04);
    animation: ${breathe} 1.8s ease-in-out infinite;
  }
  /* Choisi : néon de la section, contour vif et halo. */
  &[aria-pressed="true"] {
    color: var(--accent-light);
    background: rgb(var(--accent-rgb) / 0.14);
    border-color: var(--accent);
    text-shadow: 0 0 10px rgb(var(--accent-rgb) / 0.6);
    /* Même halo vivant que les boutons au survol. */
    animation: ${breathe} 1.8s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    &,
    &:hover {
      animation: none;
    }
    &[aria-pressed="true"] {
      box-shadow: 0 0 16px rgb(var(--accent-rgb) / 0.55);
    }
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
  margin: 0 0 18px;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 500;
  color: #8fb3c4;
`;

// Une analyse dans les résultats : son nom, et sur la même ligne, à droite,
// sa liste repliable (détails, matériel, périphériques).
const Group = styled.section`
  position: relative;
  margin-top: 44px;

  /* Sous la ligne de titre : 24 px, liste ouverte (avant la liste) comme
     fermée (avant le verdict : 8 + 16). */
  > h3 {
    margin-bottom: 8px;
  }
  > .fold > button {
    position: absolute;
    top: 4px;
    right: 0;
    margin: 0;
  }
  > .fold > .fold-body {
    margin: 26px 0 0 !important;
  }
  /* Sous la liste (ouverte ou fermée) : le verdict suit de près, au lieu
     de son grand espace habituel. */
  > .fold + * > .inner {
    padding-top: 16px !important;
  }
`;

const Missing = styled.p`
  margin: 0;
  font-size: 14px;
  color: #64748b;
`;

/**
 * Défilement lent et doux jusqu'à un élément (environ 1,2 s, accélération et
 * ralentissement progressifs) ; dans l'application, la page défile dans sa
 * propre zone. Sans animation si le système les a désactivées.
 */
function slowScrollTo(el, duration = 1200) {
  if (!el) return;
  const root = document.getElementById("scroll-root");
  const scroller = root ?? document.scrollingElement;
  const top = root ? root.getBoundingClientRect().top : 0;
  const from = scroller.scrollTop;
  const to = from + el.getBoundingClientRect().top - top - 24;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    scroller.scrollTop = to;
    return;
  }
  const start = performance.now();
  const ease = (k) =>
    k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const step = (now) => {
    const k = Math.min(1, (now - start) / duration);
    scroller.scrollTop = from + (to - from) * ease(k);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Choix et débit transmis de l'accueil à la page « Diagnostic »
// (application) : le bouton de l'accueil les dépose, la page les reprend.
// `start` : le bouton de l'accueil demande un lancement immédiat ; ouverte
// depuis la barre latérale, la page attend son propre bouton.
const carried = { chosen: null, download: null, start: false };

/**
 * @param {{
 *   download?: number|null,  débit mesuré par le test de l'accueil
 *   launcher?: boolean,      accueil de l'application : le bouton ouvre la
 *                            page « Diagnostic » au lieu de lancer sur place
 *   autoStart?: boolean,     page « Diagnostic » : démarre aussitôt
 * }} props
 */
export default function CombinedAnalysis({ download, launcher, autoStart }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [chosen, setChosen] = useState(
    () =>
      (autoStart && carried.chosen) || {
        network: true,
        hardware: true,
        devices: true,
      },
  );
  const measured = download ?? (autoStart ? carried.download : null);
  const keys = KEYS.filter((k) => chosen[k]);

  // Une étape après l'autre : la commande, puis les résultats.
  //   idle → command
  const [phase, setPhase] = useState(
    autoStart && carried.start ? "command" : "idle",
  );
  // Demande consommée : revenir plus tard sur la page ne relance rien.
  useEffect(() => {
    if (autoStart) carried.start = false;
  }, [autoStart]);
  // Une étape terminée se replie en une ligne de résumé ; un clic la rouvre.
  const [open, setOpen] = useState({ command: true });
  const [res, setRes] = useState(null);
  // Lecture en cours (application) : pour la progression par analyse.
  const [reading, setReading] = useState(false);

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
      // La commande Wi-Fi commence déjà par « export LC_ALL=C ».
      ...(chosen.network
        ? [WIFI_COMMANDS.linux.replace("export LC_ALL=C ; ", "")]
        : []),
    ];
    const join = (parts) => parts.filter(Boolean).join("\n\n");
    return {
      windows: {
        command: win.length ? windowsCommand(win, lang) : "",
        example: join([
          chosen.hardware && HARDWARE_WINDOWS,
          chosen.devices && DEVICES_WINDOWS,
          chosen.network && WIFI_WINDOWS,
        ]),
        about: t.about,
      },
      mac: {
        command: mac.length ? macCommand(mac, lang) : "",
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
  }, [chosen, t.about, lang]);

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

  // L'étape « Commande » reste ouverte après le collage : le texte collé
  // reste sous les yeux, à corriger ou à recoller. Seul un clic sur
  // l'intertitre la replie.
  const onResult = useCallback((r) => setRes(r), []);

  // Premiers résultats : la page descend jusqu'au résumé, une seule fois (pas
  // à chaque correction du texte collé).
  const resultsRef = useRef(null);
  const hadRes = useRef(false);
  useEffect(() => {
    if (!res) {
      hadRes.current = false;
      return;
    }
    if (hadRes.current) return;
    hadRes.current = true;
    const id = setTimeout(() => slowScrollTo(resultsRef.current), 250);
    return () => clearTimeout(id);
  }, [res]);

  // Chaque résultat est enregistré dans l'historique (page « Historique »).
  useEffect(() => {
    if (res) recordLocal(makeSnapshot(res, { download: measured }));
  }, [res, measured]);

  const commandSummary = res
    ? keys
        .filter((k) => res[k])
        .map((k) => t.labels[k])
        .join(", ")
    : null;

  return (
    <>
      {/* Introduction accordée aux analyses choisies. */}
      {/* Rien de choisi : la consigne prend la place de l'introduction. */}
      <Lead>{diagnosticIntro(chosen, lang) ?? t.none}</Lead>
      {/* Application, analyse lancée : les choix laissent la place à la
          progression, qui nomme déjà chaque analyse. */}
      {!(desktop && phase === "command") && (
        <>
          <Pick>{phase === "command" ? t.pickCommand : t.pick}</Pick>
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
        </>
      )}

      {/* Avant le lancement : ce que couvre chaque analyse, puis le bouton.
          Les trois lignes restent en place, celles qui ne sont pas choisies
          s'estompent : cocher ou décocher ne fait pas bouger la page. */}
      {phase !== "command" && (
        <>
          <Launch>
            {KEYS.map((k) => (
              <li
                key={k}
                style={accentVars(k)}
                aria-hidden={!chosen[k] || undefined}
                className={chosen[k] ? undefined : "off"}
              >
                {t.launch[k]}
              </li>
            ))}
          </Launch>
          <NeonButton
            onClick={() => {
              if (!launcher) return setPhase("command");
              carried.chosen = chosen;
              carried.download = download ?? null;
              carried.start = true;
              navigate("/diagnostic");
            }}
            disabled={keys.length === 0}
          >
            <span className="neon">{t.start}</span>
          </NeonButton>
        </>
      )}

      {/* Application : la progression de chaque analyse, sans étapes (rien
          à copier ni à coller). */}
      {desktop && keys.length > 0 && phase === "command" && (
        <Unfold gap={8} first={0.1}>
          <Progress>
            {keys.map((k) => {
              const state = reading
                ? "reading"
                : res?.[k]
                  ? "done"
                  : res
                    ? "nothing"
                    : "reading";
              return (
                <li key={k} style={accentVars(k)} data-state={state}>
                  <span className="mark" aria-hidden="true">
                    {state === "done" ? (
                      <svg
                        viewBox="0 0 16 16"
                        width="14"
                        height="14"
                        fill="none"
                      >
                        <path
                          d="m3.5 8.5 3 3 6-7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                  <strong>{t.labels[k]}</strong>
                  <span className="state">{t[state]}</span>
                </li>
              );
            })}
          </Progress>
          <PasteStep
            key={keys.join("+")}
            variants={variants}
            placeholder={t.placeholder}
            analyze={analyze}
            empty={t.empty}
            manual={CombinedManual}
            manualProps={{ keys }}
            onResult={onResult}
            onRunning={setReading}
            quiet
          />
        </Unfold>
      )}

      {/* Étape 1 — commande (ou saisie guidée), sur le site. */}
      {!desktop && keys.length > 0 && phase === "command" && (
        <Unfold gap={8} first={0.1}>
          <StepBox
            head={{
              label: t.step(1),
              name: desktop ? t.steps.reading : t.steps.command,
            }}
            summary={!open.command ? commandSummary : null}
            open={open.command}
            onToggle={() => setOpen((o) => ({ ...o, command: !o.command }))}
            // Juste sous les choix d'analyses : moins d'espace qu'entre deux
            // étapes.
            style={{ marginTop: 4 }}
          >
            {/* Les trois restent en place ; celles qui ne sont pas incluses
                s'estompent, comme sur l'accueil. */}
            <Intros>
              {KEYS.map((k) => (
                <p
                  key={k}
                  style={accentVars(k)}
                  className={chosen[k] ? undefined : "off"}
                  aria-hidden={!chosen[k] || undefined}
                >
                  <strong>{t.labels[k]}</strong>
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

      {/* Étape 2 — résultats (sans intertitre d'étape dans l'application),
          avec le résumé en tête. */}
      {res && phase === "command" && (
        <Unfold gap={8} first={0.1}>
          {/* Repère du défilement : au-dessus de l'intertitre « Résultats ». */}
          <div ref={resultsRef} />
          <StepBox
            head={desktop ? null : { label: t.step(2), name: t.steps.results }}
            open
          >
            <Summary res={res} t={t} />
            {keys.map((k) => (
              <Group key={k} id={`group-${k}`} style={accentVars(k)}>
                <Subtitle style={{ color: "var(--accent)" }}>
                  {t.labels[k]}
                </Subtitle>
                {!res[k] ? (
                  <Missing>{t.missing}</Missing>
                ) : k === "network" ? (
                  <WifiResult parsed={res.network} download={measured} />
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

// ── Progression et résumé ───────────────────────────────────────────────────

// Une ligne par analyse : sa couleur, son nom, son état.
const Progress = styled.ul`
  margin: 8px 0 20px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
  font-size: 15px;

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    /* Les lignes arrivent l'une après l'autre. */
    animation: row-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  li:nth-child(2) {
    animation-delay: 0.09s;
  }
  li:nth-child(3) {
    animation-delay: 0.18s;
  }
  @keyframes row-in {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  .mark {
    transition:
      background 0.3s,
      border-color 0.3s;
    width: 22px;
    height: 22px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 2px solid rgb(var(--accent-rgb) / 0.35);
    color: #020617;
  }
  li[data-state="reading"] .mark {
    border-top-color: var(--accent);
    animation: spin 0.9s linear infinite;
  }
  li[data-state="done"] .mark {
    background: var(--accent);
    border-color: var(--accent);
  }
  li[data-state="nothing"] .mark {
    border-color: #334155;
  }
  strong {
    color: var(--accent);
    font-weight: 600;
    min-width: 120px;
  }
  .state {
    color: #8fb3c4;
    font-size: 14px;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    li,
    li[data-state="reading"] .mark {
      animation: none;
    }
  }
`;

// Résumé : une pastille par niveau présent, teintée à sa couleur (rouge pour
// les problèmes, orange pour les points à surveiller) ; verte s'il n'y a rien.
const SummaryBox = styled.div`
  margin: 4px 0 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid rgb(var(--rgb) / 0.35);
    background: rgb(var(--rgb) / 0.12);
    color: var(--text);
    font-size: 14px;
    font-weight: 500;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgb(var(--rgb));
  }
`;

// Teinte de chaque niveau : couleur (r g b) et texte plus clair.
const PILL = {
  problem: { rgb: "251 113 133", text: "#fda4af" },
  warning: { rgb: "251 191 36", text: "#fcd34d" },
  ok: { rgb: "52 211 153", text: "#6ee7b7" },
};

function Summary({ res, t }) {
  const findings = makeSnapshot(res).findings;
  const p = findings.filter((f) => f.level === "problem").length;
  const w = findings.filter((f) => f.level === "warning").length;
  const pills =
    p + w === 0
      ? [["ok", t.none]]
      : [
          p > 0 && ["problem", `${p} ${t.problems(p)}`],
          w > 0 && ["warning", `${w} ${t.warnings(w)}`],
        ].filter(Boolean);
  return (
    <SummaryBox>
      {pills.map(([level, text]) => (
        <span
          key={level}
          className="pill"
          style={{ "--rgb": PILL[level].rgb, "--text": PILL[level].text }}
        >
          <span className="dot" aria-hidden="true" />
          {text}
        </span>
      ))}
    </SummaryBox>
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
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 600;
  color: #8fb3c4;

  .n {
    color: var(--accent);
  }
  .sum {
    margin-left: auto;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 500;
    font-size: 13px;
    color: #b6dbe6;
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
        style={{ display: open ? "block" : "none", marginTop: head ? 22 : 0 }}
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
  color: #8fb3c4;

  /* Pastille à la couleur de l’analyse. */
  li {
    position: relative;
    padding-left: 18px;
    transition: opacity 0.2s;
  }
  li.off {
    opacity: 0.25;
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

// Ce que couvre la commande, une ligne par analyse choisie, à sa couleur.
const Intros = styled.div`
  margin: 0 0 24px;
  max-width: 62ch;

  p {
    margin: 0;
    font-size: 15px;
    line-height: 1.7;
    color: #8fb3c4;
  }
  p + p {
    margin-top: 8px;
  }
  p {
    transition: opacity 0.2s;
  }
  p.off {
    opacity: 0.25;
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
      <Subtitle style={{ color: "var(--accent)" }}>{t.labels[k]}</Subtitle>
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
