// ─────────────────────────────────────────────────────────────────────────────
// Wi-Fi sans commande : où lire chaque valeur dans les réglages de Windows ou
// dans le menu Wi-Fi de macOS, et les champs pour la reporter.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import { wifiFromForm } from "../lib/manual.js";
import { useLang } from "../ui/i18n.jsx";
import { GuideStep, Fields, Field, NumberInput, Select } from "../ui/Form.jsx";

const RADIOS = [
  ["802.11be", "Wi-Fi 7 (802.11be)"],
  ["802.11ax", "Wi-Fi 6 / 6E (802.11ax)"],
  ["802.11ac", "Wi-Fi 5 (802.11ac)"],
  ["802.11n", "Wi-Fi 4 (802.11n)"],
  ["802.11g", "802.11g / b"],
];

const TEXT = {
  fr: {
    windows: {
      where: (
        <>
          Ouvrir{" "}
          <span className="path">
            Paramètres › Réseau et Internet › Wi-Fi › Propriétés du matériel
          </span>{" "}
          (sous Windows 10 : cliquer sur le nom du réseau, puis descendre
          jusqu'à « Propriétés »)
        </>
      ),
      radio: "Protocole",
      band: "Bande réseau",
      channel: "Canal réseau",
      rate: "Vitesse de liaison (réception)",
      signalWhere: (
        <>
          Regarder l'<span className="path">icône Wi-Fi</span> en bas à droite
          de l'écran : combien de barres sont pleines ?
        </>
      ),
      signal: "Barres de signal",
      bars: [
        ["4", "4 barres"],
        ["3", "3 barres"],
        ["2", "2 barres"],
        ["1", "1 barre"],
      ],
    },
    mac: {
      where: (
        <>
          Maintenir la touche <span className="path">⌥ Option</span> et cliquer
          sur l'
          <span className="path">icône Wi-Fi</span> de la barre des menus : les
          détails du réseau s'affichent en gris
        </>
      ),
      radio: "Mode PHY",
      band: "Bande (dans « Canal », entre parenthèses)",
      channel: "Canal (premier nombre)",
      rate: "Débit Tx",
      rssi: "RSSI",
    },
    linux: {
      where: (
        <>
          Ouvrir <span className="path">Paramètres › Wi-Fi</span>, puis la roue
          dentée du réseau connecté : lignes de vitesse de connexion, de
          fréquence et de force du signal
        </>
      ),
      band: "Fréquence",
      rate: "Vitesse de connexion",
      signal: "Force du signal",
      signals: [
        ["4", "Excellente"],
        ["3", "Bonne"],
        ["2", "Correcte"],
        ["1", "Faible"],
      ],
    },
    pick: "Choisir…",
  },
  en: {
    windows: {
      where: (
        <>
          Open{" "}
          <span className="path">
            Settings › Network & internet › Wi-Fi › Hardware properties
          </span>{" "}
          (on Windows 10: click the network name, then scroll down to
          “Properties”)
        </>
      ),
      radio: "Protocol",
      band: "Network band",
      channel: "Network channel",
      rate: "Link speed (receive)",
      signalWhere: (
        <>
          Look at the <span className="path">Wi-Fi icon</span> at the bottom
          right of the screen: how many bars are full?
        </>
      ),
      signal: "Signal bars",
      bars: [
        ["4", "4 bars"],
        ["3", "3 bars"],
        ["2", "2 bars"],
        ["1", "1 bar"],
      ],
    },
    mac: {
      where: (
        <>
          Hold the <span className="path">⌥ Option</span> key and click the{" "}
          <span className="path">Wi-Fi icon</span> in the menu bar: the network
          details appear in grey
        </>
      ),
      radio: "PHY Mode",
      band: "Band (in “Channel”, in brackets)",
      channel: "Channel (first number)",
      rate: "Tx Rate",
      rssi: "RSSI",
    },
    linux: {
      where: (
        <>
          Open <span className="path">Settings › Wi-Fi</span>, then the gear of
          the connected network: link speed, frequency and signal strength lines
        </>
      ),
      band: "Frequency",
      rate: "Link speed",
      signal: "Signal strength",
      signals: [
        ["4", "Excellent"],
        ["3", "Good"],
        ["2", "Ok"],
        ["1", "Weak"],
      ],
    },
    pick: "Choose…",
  },
};

const BANDS = [
  ["2.4 GHz", "2,4 GHz"],
  ["5 GHz", "5 GHz"],
  ["6 GHz", "6 GHz"],
];

/** @param {{ system: "windows"|"mac", onResult: (r: object|null) => void }} props */
export default function WifiManual({ system, onResult }) {
  const { lang } = useLang();
  const t = TEXT[lang][system];
  const pick = TEXT[lang].pick;
  const [f, setF] = useState({});
  const set = (k) => (v) => setF((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    onResult(
      wifiFromForm(
        system === "mac" ? { ...f, bars: null } : { ...f, rssi: null },
      ),
    );
  }, [f, system, onResult]);

  // GNOME n'affiche ni la norme ni le canal : fréquence, vitesse et force
  // du signal suffisent à l'analyse.
  if (system === "linux") {
    return (
      <GuideStep n="1" where={t.where}>
        <Fields>
          <Field label={t.band}>
            <Select
              value={f.band}
              onChange={set("band")}
              options={BANDS}
              placeholder={pick}
            />
          </Field>
          <Field label={t.rate} hint="Mb/s">
            <NumberInput
              value={f.rate}
              onChange={set("rate")}
              placeholder="866"
            />
          </Field>
          <Field label={t.signal}>
            <Select
              value={f.bars}
              onChange={set("bars")}
              options={t.signals}
              placeholder={pick}
            />
          </Field>
        </Fields>
      </GuideStep>
    );
  }

  return (
    <>
      <GuideStep n="1" where={t.where}>
        <Fields>
          <Field label={t.radio}>
            <Select
              value={f.radio}
              onChange={set("radio")}
              options={RADIOS}
              placeholder={pick}
            />
          </Field>
          <Field label={t.band}>
            <Select
              value={f.band}
              onChange={set("band")}
              options={BANDS}
              placeholder={pick}
            />
          </Field>
          <Field label={t.channel}>
            <NumberInput
              value={f.channel}
              onChange={set("channel")}
              placeholder="36"
            />
          </Field>
          <Field label={t.rate} hint="Mb/s">
            <NumberInput
              value={f.rate}
              onChange={set("rate")}
              placeholder="866"
            />
          </Field>
          {system === "mac" && (
            <Field label={t.rssi} hint="dBm">
              <NumberInput
                value={f.rssi}
                onChange={set("rssi")}
                placeholder="-60"
              />
            </Field>
          )}
        </Fields>
      </GuideStep>

      {system === "windows" && (
        <GuideStep n="2" where={t.signalWhere}>
          <Fields>
            <Field label={t.signal}>
              <Select
                value={f.bars}
                onChange={set("bars")}
                options={t.bars}
                placeholder={pick}
              />
            </Field>
          </Fields>
        </GuideStep>
      )}
    </>
  );
}
