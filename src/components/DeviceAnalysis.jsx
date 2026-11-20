// ─────────────────────────────────────────────────────────────────────────────
// Analyse des périphériques : audio, caméra, clavier, souris, Bluetooth,
// écrans, imprimantes, et tout appareil que Windows signale en erreur.
//
// Windows : deux lectures de Win32_PnPEntity, les catégories utiles d'abord,
// puis tout appareil en erreur, quelle que soit sa catégorie. macOS ne
// signale pas d'erreur de périphérique : la liste dit ce qui est reconnu.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from "react";
import { analyzeDevices } from "../lib/devices.js";
import { DEVICES_WINDOWS, DEVICES_MAC } from "../lib/examples.js";
import { SEVERITY } from "../ui/theme.js";
import { useLang, SEVERITY_LABEL } from "../ui/i18n.jsx";
import {
  Unfold,
  Verdict,
  VerdictHead,
  Findings,
  Passed,
} from "../ui/verdict.jsx";
import PasteStep from "../ui/PasteStep.jsx";
import DeviceManual from "./DeviceManual.jsx";

const TEXT = {
  fr: {
    placeholder: "Coller ici la sortie de la commande…",
    empty: "Aucun périphérique reconnu dans le texte collé",
    about:
      "Cette commande affiche la liste des périphériques et leur état. Elle ne modifie rien, et aucune donnée n'est collectée",
    head: "Périphériques",
  },
  en: {
    placeholder: "Paste the command output here…",
    empty: "No device found in the pasted text",
    about:
      "This command displays the list of devices and their status. It changes nothing, and no data is collected",
    head: "Devices",
  },
};

const CLASSES =
  "AudioEndpoint,Camera,Image,Keyboard,Mouse,Bluetooth,Monitor,Printer,MEDIA";
const FIELDS = "Format-List Name,PNPClass,Status,ConfigManagerErrorCode";
// Pas de « $ » dans la commande : collée dans PowerShell, la commande
// extérieure le remplacerait avant de la transmettre.
const COMMAND_WINDOWS = `powershell -NoProfile -Command "Get-CimInstance Win32_PnPEntity | Where-Object PNPClass -in ${CLASSES} | ${FIELDS}; Get-CimInstance Win32_PnPEntity | Where-Object ConfigManagerErrorCode -ne 0 | ${FIELDS}"`;
const COMMAND_MAC =
  "system_profiler SPAudioDataType SPBluetoothDataType SPCameraDataType SPDisplaysDataType";

export default function DeviceAnalysis() {
  const anchor = useRef(null);
  const { lang } = useLang();
  const t = TEXT[lang];

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    anchor.current?.scrollIntoView({
      behavior: still ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  return (
    <div ref={anchor} style={{ scrollMarginTop: 24 }}>
      <Unfold gap={8} first={0.1}>
        <PasteStep
          variants={{
            windows: {
              command: COMMAND_WINDOWS,
              example: DEVICES_WINDOWS,
              about: t.about,
            },
            mac: { command: COMMAND_MAC, example: DEVICES_MAC, about: t.about },
          }}
          placeholder={t.placeholder}
          analyze={analyzeDevices}
          empty={t.empty}
          manual={DeviceManual}
        >
          {(r) => {
            const sev = SEVERITY[r.severity];
            return (
              <Verdict $color={sev.color} gap={32} first={0}>
                <VerdictHead color={sev.color}>
                  {`${t.head} — ${SEVERITY_LABEL[lang][r.severity]}`}
                </VerdictHead>
                <Findings findings={r.findings} engine="devices" />
                <Passed items={r.passed} />
              </Verdict>
            );
          }}
        </PasteStep>
      </Unfold>
    </div>
  );
}
