// ─────────────────────────────────────────────────────────────────────────────
// Analyse approfondie du réseau local, ouverte sous le résultat du test de
// débit, sur la même page.
//
// Le Wi-Fi s'analyse à partir de `netsh wlan show interfaces` (bande, canal,
// signal, débit de lien). Les câbles et la box ne se lisent pas depuis une
// commande : ils ont leur page à part, « Vérifications manuelles ».
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from "react";
import { parseNetsh, diagnose } from "../lib/diagnostic.js";
import { Subtitle, SEVERITY } from "../ui/theme.js";
import { useLang, SEVERITY_LABEL } from "../ui/i18n.jsx";

const TEXT = {
  fr: {
    title: "Analyse du réseau local",
    placeholder: "Coller ici la sortie de netsh wlan show interfaces…",
    empty: "Aucune interface Wi-Fi reconnue dans le texte collé",
    about:
      "Cette commande affiche l'état du Wi-Fi. Elle ne modifie rien, et aucune donnée n'est collectée",
    band: "Bande",
    radio: "Norme",
    signal: "Signal",
    channel: "Canal",
    link: "Débit de lien",
    real: "Débit réel estimé",
  },
  en: {
    title: "Local network analysis",
    placeholder: "Paste the output of netsh wlan show interfaces here…",
    empty: "No Wi-Fi interface found in the pasted text",
    about:
      "This command displays the Wi-Fi status. It changes nothing, and no data is collected",
    band: "Band",
    radio: "Standard",
    signal: "Signal",
    channel: "Channel",
    link: "Link rate",
    real: "Estimated real speed",
  },
};
import {
  Unfold,
  Verdict,
  VerdictHead,
  StatGrid,
  StatCell,
  Findings,
} from "../ui/verdict.jsx";
import PasteStep from "../ui/PasteStep.jsx";

const COMMAND = "netsh wlan show interfaces";

// Exemple = le cas réel qui a lancé le projet (2,4 GHz, canal 1, signal 89 %).
const EXAMPLE = `    Nom                   : Wi-Fi
    Description           : Intel(R) Wireless-AC 9560 160MHz
    SSID                  : Livebox-A030
    Type de radio         : 802.11n
    Canal                 : 1
    Réception (Mbits/s)   : 144.4
    Transmission (Mbits/s): 130
    Signal                : 89%`;

// Rien de reconnu (machine en filaire, texte sans rapport) : null, pour que
// l'étape affiche son message au lieu d'un faux verdict « sain ».
function analyzeWifi(raw) {
  const d = parseNetsh(raw);
  if (d.radio == null && d.channel == null && d.signal == null) return null;
  return diagnose(d);
}

export default function NetworkAnalysis() {
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
          command={COMMAND}
          placeholder={t.placeholder}
          example={EXAMPLE}
          analyze={analyzeWifi}
          empty={t.empty}
          about={t.about}
        >
          {(result) => {
            const sev = SEVERITY[result.severity];
            return (
              <Verdict $color={sev.color} gap={32} first={0}>
                <VerdictHead color={sev.color} tag={result.ssid}>
                  {SEVERITY_LABEL[lang][result.severity]}
                </VerdictHead>
                <StatGrid $cols={4} $border>
                  <StatCell k={t.band} value={result.band} />
                  <StatCell k={t.radio} value={result.radio} />
                  <StatCell k={t.signal} value={result.signal} unit="%" />
                  <StatCell k={t.channel} value={result.channel} />
                </StatGrid>
                <StatGrid $cols={2}>
                  <StatCell k={t.link} value={result.linkRate} unit="Mb/s" />
                  <StatCell
                    k={t.real}
                    value={result.estimatedReal}
                    unit="Mb/s"
                  />
                </StatGrid>
                <div style={{ paddingTop: 4 }}>
                  <Findings findings={result.findings} engine="wifi" />
                </div>
              </Verdict>
            );
          }}
        </PasteStep>
      </Unfold>
    </div>
  );
}
