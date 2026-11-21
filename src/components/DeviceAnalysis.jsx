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
import {
  DEVICES_WINDOWS,
  DEVICES_MAC,
  DEVICES_LINUX,
} from "../lib/examples.js";
import { SEVERITY } from "../ui/theme.js";
import { useLang, SEVERITY_LABEL } from "../ui/i18n.jsx";
import { Unfold, Verdict, VerdictHead, Findings } from "../ui/verdict.jsx";
import PasteStep from "../ui/PasteStep.jsx";
import { windowsCommand, macCommand } from "../lib/commands.js";
import DeviceManual from "./DeviceManual.jsx";
import { Section2, Table } from "./HardwareAnalysis.jsx";
import { GROUPS } from "../lib/devices.js";
import CopySummary from "../ui/CopySummary.jsx";
import { summarizeBlocks } from "../lib/report.js";

const TEXT = {
  fr: {
    placeholder: "Coller ici la sortie de la commande…",
    empty: "Aucun périphérique reconnu dans le texte collé",
    about:
      "Cette commande affiche la liste des périphériques et leur état. Elle ne modifie rien, et aucune donnée n'est collectée",
    head: "Périphériques",
    detected: "Périphériques détectés",
    results: "Résultats du diagnostic",
    groups: {
      audio: "Audio",
      camera: "Caméra",
      keyboard: "Clavier",
      mouse: "Souris",
      bluetooth: "Bluetooth",
      monitor: "Écran",
      printer: "Imprimante",
      usb: "USB",
      other: "Autre",
    },
    inError: "en erreur",
    reportTitle: "Slowfi — analyse des périphériques",
  },
  en: {
    placeholder: "Paste the command output here…",
    empty: "No device found in the pasted text",
    about:
      "This command displays the list of devices and their status. It changes nothing, and no data is collected",
    head: "Devices",
    detected: "Detected devices",
    results: "Diagnostic results",
    groups: {
      audio: "Audio",
      camera: "Camera",
      keyboard: "Keyboard",
      mouse: "Mouse",
      bluetooth: "Bluetooth",
      monitor: "Display",
      printer: "Printer",
      usb: "USB",
      other: "Other",
    },
    inError: "in error",
    reportTitle: "Slowfi — device analysis",
  },
};

const CLASSES =
  "AudioEndpoint,Camera,Image,Keyboard,Mouse,Bluetooth,Monitor,Printer,MEDIA";
const FIELDS = "Format-List Name,PNPClass,Status,ConfigManagerErrorCode";
// Pas de « $ » dans la commande : collée dans PowerShell, la commande
// extérieure le remplacerait avant de la transmettre.
export const DEVICE_READS = [
  `Get-CimInstance Win32_PnPEntity | Where-Object PNPClass -in ${CLASSES} | ${FIELDS}`,
  `Get-CimInstance Win32_PnPEntity | Where-Object ConfigManagerErrorCode -ne 0 | ${FIELDS}`,
];
const COMMAND_WINDOWS = windowsCommand(DEVICE_READS);
// Linux : appareils USB et cartes son. Pas d'état d'erreur lisible sans root.
export const DEVICE_LINUX_READ = "lsusb ; cat /proc/asound/cards";
export const DEVICE_MAC_READ =
  "system_profiler SPAudioDataType SPBluetoothDataType SPCameraDataType SPDisplaysDataType";

/** Verdict des périphériques, avec le résumé à copier. */
export function DeviceResult({ r }) {
  const { lang } = useLang();
  const t = TEXT[lang];

  const sev = SEVERITY[r.severity];
  return (
    <Verdict $color={sev.color} gap={32} first={0}>
      <VerdictHead color={sev.color}>
        {`${t.head} — ${SEVERITY_LABEL[lang][r.severity]}`}
      </VerdictHead>
      {/* D'abord ce qui est branché, par catégorie ; puis les résultats. */}
      <Section2 style={{ marginTop: 8 }}>{t.detected}</Section2>
      <Table>
        {[...GROUPS.map(([g]) => g), "other"].map((g) => {
          const items = r.devices.filter((x) => (x.group ?? "other") === g);
          if (items.length === 0) return null;
          const names = [...new Set(items.map((x) => x.name))];
          return (
            <React.Fragment key={g}>
              <dt>{t.groups[g]}</dt>
              <dd>
                {names.map((name, i) => {
                  const broken = r.broken.some((b) => b.name === name);
                  return (
                    <React.Fragment key={name}>
                      {i > 0 && <br />}
                      {name}
                      {broken && (
                        <span style={{ color: SEVERITY.problem.color }}>
                          {" "}
                          · {t.inError}
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
              </dd>
            </React.Fragment>
          );
        })}
      </Table>
      <Section2>{t.results}</Section2>
      <Findings findings={r.findings} engine="devices" />
      <CopySummary
        build={() =>
          summarizeBlocks(
            t.reportTitle,
            [{ name: t.head, engine: "devices", result: r }],
            lang,
            { url: window.location.origin },
          )
        }
      />
    </Verdict>
  );
}

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
            mac: {
              command: macCommand([DEVICE_MAC_READ]),
              example: DEVICES_MAC,
              about: t.about,
            },
            linux: {
              command: DEVICE_LINUX_READ,
              example: DEVICES_LINUX,
              about: t.about,
            },
          }}
          placeholder={t.placeholder}
          analyze={analyzeDevices}
          empty={t.empty}
          manual={DeviceManual}
        >
          {(r) => <DeviceResult r={r} />}
        </PasteStep>
      </Unfold>
    </div>
  );
}
