// ─────────────────────────────────────────────────────────────────────────────
// Analyse approfondie du réseau local, ouverte sous le résultat du test de
// débit, sur la même page.
//
// Le Wi-Fi s'analyse à partir de `netsh wlan show interfaces` (Windows) ou de
// `system_profiler SPAirPortDataType` (macOS) : bande, canal, signal, débit de
// lien. Le débit mesuré par le test est ensuite confronté à ce que le Wi-Fi
// peut porter, pour désigner le facteur limitant.
//
// Une machine en filaire n'a pas de Wi-Fi actif : la sortie le dit, et la
// page renvoie alors aux vérifications Ethernet et câblage.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import {
  parseWifi,
  isWired,
  diagnose,
  compareWithLine,
} from "../lib/diagnostic.js";
import { WIFI_WINDOWS, WIFI_MAC, WIFI_LINUX } from "../lib/examples.js";
import { Subtitle, SEVERITY } from "../ui/theme.js";
import { useLang, SEVERITY_LABEL } from "../ui/i18n.jsx";
import { Link } from "../ui/router.jsx";
import Arrow from "../ui/Arrow.jsx";
import {
  Unfold,
  Verdict,
  VerdictHead,
  StatGrid,
  StatCell,
  Findings,
} from "../ui/verdict.jsx";
import PasteStep from "../ui/PasteStep.jsx";
import { windowsCommand, macCommand } from "../lib/commands.js";
import EthernetCheck from "./EthernetCheck.jsx";
import WifiManual from "./WifiManual.jsx";

const TEXT = {
  fr: {
    title: "Analyse du réseau local",
    placeholder: "Coller ici le résultat de la commande…",
    empty: "Aucune interface Wi-Fi reconnue dans le texte collé",
    about:
      "Cette commande affiche l'état du Wi-Fi. Elle ne modifie rien, et aucune donnée n'est collectée",
    band: "Bande",
    radio: "Norme",
    signal: "Signal",
    channel: "Canal",
    link: "Débit de lien",
    real: "Débit réel estimé",
    measured: "Débit mesuré",
    wiredHead: "Connexion filaire",
    wired: {
      id: "wired",
      title: "Aucune connexion Wi-Fi active",
      detail:
        "L'appareil est relié par câble Ethernet : pas de perte liée au Wi-Fi. Reste à vérifier la vitesse de la liaison, ci-dessous",
    },
    wiredLink: "Consulter les vérifications Ethernet et câblage",
  },
  en: {
    title: "Local network analysis",
    placeholder: "Paste the command output here…",
    empty: "No Wi-Fi interface found in the pasted text",
    about:
      "This command displays the Wi-Fi status. It changes nothing, and no data is collected",
    band: "Band",
    radio: "Standard",
    signal: "Signal",
    channel: "Channel",
    link: "Link rate",
    real: "Estimated real speed",
    measured: "Measured speed",
    wiredHead: "Wired connection",
    wired: {
      id: "wired",
      title: "No active Wi-Fi connection",
      detail:
        "The device is connected by Ethernet cable: no Wi-Fi loss. The link speed remains to be checked, below",
    },
    wiredLink: "See the Ethernet and cabling checks",
  },
};

const More = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;

  .arrow {
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  &:hover .arrow {
    transform: translateX(3px);
  }
`;

// Rien de reconnu : soit la machine est en filaire (la sortie le dit), soit
// le texte n'a rien à voir. Dans ce dernier cas, null, pour que l'étape
// affiche son message au lieu d'un faux verdict « sain ».
export function analyzeWifi(raw) {
  const d = parseWifi(raw);
  if (d.radio == null && d.channel == null && d.signal == null) {
    return isWired(raw) ? { wired: true } : null;
  }
  return diagnose(d);
}

// Commandes de lecture du Wi-Fi, reprises par l'analyse complète.
export const WIFI_COMMANDS = {
  windows: "netsh wlan show interfaces",
  mac: "system_profiler SPAirPortDataType",
  // Sortie en anglais quelle que soit la langue du système, au format « terse ».
  linux:
    "export LC_ALL=C ; nmcli -t -f TYPE,STATE dev ; nmcli -t -f IN-USE,SSID,CHAN,RATE,SIGNAL dev wifi",
};

/** Verdict Wi-Fi (ou filaire), comparé au débit mesuré par le test. */
export function WifiResult({ parsed, download }) {
  const { lang } = useLang();
  const t = TEXT[lang];

  if (parsed.wired) {
    const sev = SEVERITY.ok;
    return (
      <>
        <Verdict $color={sev.color} gap={32} first={0}>
          <VerdictHead color={sev.color}>{t.wiredHead}</VerdictHead>
          <Findings findings={[t.wired]} />
          <More to="/verifications">
            {t.wiredLink}
            <Arrow />
          </More>
        </Verdict>
        {/* En filaire, c'est la liaison Ethernet qui compte. */}
        <EthernetCheck download={download} />
      </>
    );
  }

  const result = compareWithLine(parsed, download);
  const sev = SEVERITY[result.severity];
  return (
    <Verdict $color={sev.color} gap={32} first={0}>
      <VerdictHead color={sev.color} tag={result.ssid}>
        {SEVERITY_LABEL[lang][result.severity]}
      </VerdictHead>
      <StatGrid $cols={4} $border>
        <StatCell
          k={t.band}
          value={lang === "fr" ? result.band?.replace(".", ",") : result.band}
        />
        <StatCell k={t.radio} value={result.radio} />
        <StatCell k={t.signal} value={result.signal} unit="%" />
        <StatCell k={t.channel} value={result.channel} />
      </StatGrid>
      {/* Les deux débits côte à côte : ce que le Wi-Fi peut porter,
                    et ce que le test a obtenu. */}
      <StatGrid $cols={result.measured != null ? 3 : 2}>
        <StatCell k={t.link} value={result.linkRate} unit="Mb/s" />
        <StatCell k={t.real} value={result.estimatedReal} unit="Mb/s" />
        {result.measured != null && (
          <StatCell k={t.measured} value={result.measured} unit="Mb/s" />
        )}
      </StatGrid>
      <div style={{ paddingTop: 4 }}>
        <Findings findings={result.findings} engine="wifi" />
      </div>
    </Verdict>
  );
}

/** @param {{ download?: number|null }} props débit descendant mesuré par le test */
export default function NetworkAnalysis({ download }) {
  const anchor = useRef(null);
  const { lang } = useLang();
  const t = TEXT[lang];

  // La section s'ouvre sous le résultat du test : on l'amène à l'écran.
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    anchor.current?.scrollIntoView({
      behavior: still ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  return (
    <div ref={anchor} style={{ scrollMarginTop: 24 }}>
      <Unfold gap={48} first={0.15}>
        <Subtitle>{t.title}</Subtitle>

        <PasteStep
          variants={{
            windows: {
              command: windowsCommand([WIFI_COMMANDS.windows]),
              example: WIFI_WINDOWS,
              about: t.about,
            },
            mac: {
              command: macCommand([WIFI_COMMANDS.mac]),
              example: WIFI_MAC,
              about: t.about,
            },
            linux: {
              command: WIFI_COMMANDS.linux,
              example: WIFI_LINUX,
              about: t.about,
            },
          }}
          placeholder={t.placeholder}
          analyze={analyzeWifi}
          manual={WifiManual}
          empty={t.empty}
        >
          {(parsed) => <WifiResult parsed={parsed} download={download} />}
        </PasteStep>
      </Unfold>
    </div>
  );
}
