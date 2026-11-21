// ─────────────────────────────────────────────────────────────────────────────
// Vérification de la liaison Ethernet, proposée quand l'appareil est relié
// par câble : vitesse négociée (1 Gb/s attendu), duplex, et comparaison avec
// le débit mesuré par le test.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from "react";
import { analyzeEthernet, diagnoseEthernet } from "../lib/ethernet.js";
import {
  ETHERNET_WINDOWS,
  ETHERNET_MAC,
  ETHERNET_LINUX,
} from "../lib/examples.js";
import { Subtitle, SEVERITY } from "../ui/theme.js";
import { useLang, SEVERITY_LABEL } from "../ui/i18n.jsx";
import {
  Unfold,
  Verdict,
  VerdictHead,
  StatGrid,
  StatCell,
  Findings,
} from "../ui/verdict.jsx";
import { GuideStep, Fields, Field, Select } from "../ui/Form.jsx";
import PasteStep from "../ui/PasteStep.jsx";
import { windowsCommand, macCommand } from "../lib/commands.js";

const TEXT = {
  fr: {
    title: "Vérification de la liaison Ethernet",
    placeholder: "Coller ici le résultat de la commande…",
    empty: "Aucune carte Ethernet reconnue dans le texte collé",
    disconnected: "Aucune carte Ethernet connectée dans le texte collé",
    about:
      "Cette commande affiche la vitesse de la carte réseau. Elle ne modifie rien, et aucune donnée n'est collectée",
    speed: "Vitesse du lien",
    duplex: "Duplex",
    full: "Intégral",
    half: "Semi",
    where: {
      windows: (
        <>
          Ouvrir{" "}
          <span className="path">
            Paramètres › Réseau et Internet › Ethernet
          </span>
          , puis descendre jusqu'à « Vitesse de liaison (réception/transmission)
          »
        </>
      ),
      mac: (
        <>
          Ouvrir{" "}
          <span className="path">
            Réglages Système › Réseau › Ethernet › Détails… › Matériel
          </span>{" "}
          : ligne « Vitesse »
        </>
      ),
      linux: (
        <>
          Ouvrir <span className="path">Paramètres › Réseau</span>, puis la roue
          dentée de la connexion filaire : ligne de vitesse de connexion
        </>
      ),
    },
    pick: "Choisir…",
  },
  en: {
    title: "Ethernet link check",
    placeholder: "Paste the command output here…",
    empty: "No Ethernet card found in the pasted text",
    disconnected: "No connected Ethernet card in the pasted text",
    about:
      "This command displays the network card speed. It changes nothing, and no data is collected",
    speed: "Link speed",
    duplex: "Duplex",
    full: "Full",
    half: "Half",
    where: {
      windows: (
        <>
          Open{" "}
          <span className="path">Settings › Network & internet › Ethernet</span>
          , then scroll down to “Link speed (Receive/Transmit)”
        </>
      ),
      mac: (
        <>
          Open{" "}
          <span className="path">
            System Settings › Network › Ethernet › Details… › Hardware
          </span>
          : “Speed” line
        </>
      ),
      linux: (
        <>
          Open <span className="path">Settings › Network</span>, then the gear
          of the wired connection: link speed line
        </>
      ),
    },
    pick: "Choose…",
  },
};

const SPEEDS = [
  ["10", "10 Mb/s"],
  ["100", "100 Mb/s"],
  ["1000", "1 Gb/s (1000)"],
  ["2500", "2,5 Gb/s (2500)"],
  ["5000", "5 Gb/s (5000)"],
  ["10000", "10 Gb/s (10000)"],
];

const COMMAND_WINDOWS = windowsCommand([
  "Get-NetAdapter -Physical | Format-List Name,InterfaceDescription,Status,LinkSpeed,FullDuplex",
]);
const COMMAND_MAC = macCommand(["ifconfig"]);
// Cartes filaires (eth0, enp…, eno…) : vitesse, duplex et état, lus dans /sys.
const COMMAND_LINUX =
  "grep -sH . /sys/class/net/e*/speed /sys/class/net/e*/duplex /sys/class/net/e*/operstate";

// Saisie guidée : la vitesse lue dans les réglages suffit.
function EthernetManual({ system, onResult, download }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [speed, setSpeed] = useState("");
  useEffect(() => {
    onResult(
      speed
        ? diagnoseEthernet({ speed: Number(speed), fullDuplex: null }, download)
        : null,
    );
  }, [speed, download, onResult]);
  return (
    <GuideStep n="1" where={t.where[system]}>
      <Fields>
        <Field label={t.speed}>
          <Select
            value={speed}
            onChange={setSpeed}
            options={SPEEDS}
            placeholder={t.pick}
          />
        </Field>
      </Fields>
    </GuideStep>
  );
}

/** @param {{ download?: number|null }} props */
export default function EthernetCheck({ download }) {
  const { lang } = useLang();
  const t = TEXT[lang];

  const analyze = useCallback(
    (raw) => analyzeEthernet(raw, download),
    [download],
  );

  return (
    <Unfold gap={40} first={0.1}>
      <Subtitle>{t.title}</Subtitle>
      <PasteStep
        variants={{
          windows: {
            command: COMMAND_WINDOWS,
            example: ETHERNET_WINDOWS,
            about: t.about,
          },
          mac: { command: COMMAND_MAC, example: ETHERNET_MAC, about: t.about },
          linux: {
            command: COMMAND_LINUX,
            example: ETHERNET_LINUX,
            about: t.about,
          },
        }}
        placeholder={t.placeholder}
        analyze={analyze}
        empty={t.empty}
        manual={EthernetManual}
        manualProps={{ download }}
      >
        {(r) => {
          if (r.disconnected) {
            return (
              <p style={{ margin: "16px 0 0", fontSize: 14, color: "#fb7185" }}>
                {t.disconnected}
              </p>
            );
          }
          const sev = SEVERITY[r.severity];
          return (
            <Verdict $color={sev.color} gap={32} first={0}>
              <VerdictHead color={sev.color} tag={r.description ?? r.name}>
                {SEVERITY_LABEL[lang][r.severity]}
              </VerdictHead>
              <StatGrid $cols={2} $border>
                <StatCell k={t.speed} value={r.speed} unit="Mb/s" />
                <StatCell
                  k={t.duplex}
                  value={
                    r.fullDuplex == null ? null : r.fullDuplex ? t.full : t.half
                  }
                />
              </StatGrid>
              <div style={{ paddingTop: 4 }}>
                <Findings findings={r.findings} engine="ethernet" />
              </div>
            </Verdict>
          );
        }}
      </PasteStep>
    </Unfold>
  );
}
