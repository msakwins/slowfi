// ─────────────────────────────────────────────────────────────────────────────
// Périphériques sans commande : le Gestionnaire de périphériques (Windows)
// marque d'une icône chaque appareil en erreur ou désactivé ; sur Mac, les
// Réglages Système montrent ce qui est reconnu.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import { devicesFromForm } from "../lib/manual.js";
import { useLang } from "../ui/i18n.jsx";
import { GuideStep, Fields, Field, Select } from "../ui/Form.jsx";

const TEXT = {
  fr: {
    windows: (
      <>
        Clic droit sur le menu Démarrer ›{" "}
        <span className="path">Gestionnaire de périphériques</span>. Un appareil
        en erreur porte un triangle jaune, un appareil désactivé une flèche vers
        le bas. Les catégories concernées s'ouvrent d'elles-mêmes
      </>
    ),
    mac: (
      <>
        Ouvrir <span className="path">Réglages Système › Son</span>, puis{" "}
        <span className="path">Bluetooth</span> : chaque appareil branché ou
        associé doit y apparaître
      </>
    ),
    state: "Icônes affichées",
    states: [
      ["none", "Aucune icône"],
      ["some", "Au moins une icône"],
    ],
    macState: "Appareils",
    macStates: [
      ["none", "Tous présents et fonctionnels"],
      ["some", "Un appareil manque ou ne fonctionne pas"],
    ],
    errors: "Avec un triangle jaune",
    disabled: "Avec une flèche vers le bas",
    missing: "Appareils concernés",
    hint: "noms séparés par des virgules",
    pick: "Choisir…",
  },
  en: {
    windows: (
      <>
        Right-click the Start menu ›{" "}
        <span className="path">Device Manager</span>. A device in error shows a
        yellow triangle, a disabled device a down arrow. The affected categories
        open by themselves
      </>
    ),
    mac: (
      <>
        Open <span className="path">System Settings › Sound</span>, then{" "}
        <span className="path">Bluetooth</span>: every plugged-in or paired
        device should appear there
      </>
    ),
    state: "Icons shown",
    states: [
      ["none", "No icon"],
      ["some", "At least one icon"],
    ],
    macState: "Devices",
    macStates: [
      ["none", "All present and working"],
      ["some", "A device is missing or not working"],
    ],
    errors: "With a yellow triangle",
    disabled: "With a down arrow",
    missing: "Affected devices",
    hint: "names separated by commas",
    pick: "Choose…",
  },
};

/** @param {{ system: "windows"|"mac", onResult: (r: object|null) => void }} props */
export default function DeviceManual({ system, onResult }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  const mac = system === "mac";
  const [f, setF] = useState({});
  const set = (k) => (v) => setF((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    onResult(devicesFromForm({ platform: system, ...f }));
  }, [f, system, onResult]);

  const text = (k) => (
    <input
      type="text"
      autoComplete="off"
      value={f[k] ?? ""}
      onChange={(e) => set(k)(e.target.value)}
    />
  );

  return (
    <GuideStep n="1" where={mac ? t.mac : t.windows}>
      <Fields>
        <Field label={mac ? t.macState : t.state}>
          <Select
            value={f.state}
            onChange={set("state")}
            options={mac ? t.macStates : t.states}
            placeholder={t.pick}
          />
        </Field>
      </Fields>
      {f.state === "some" && (
        <div style={{ marginTop: 14 }}>
          <Fields>
            {mac ? (
              <Field label={t.missing} hint={t.hint}>
                {text("missing")}
              </Field>
            ) : (
              <>
                <Field label={t.errors} hint={t.hint}>
                  {text("errors")}
                </Field>
                <Field label={t.disabled} hint={t.hint}>
                  {text("disabled")}
                </Field>
              </>
            )}
          </Fields>
        </div>
      )}
    </GuideStep>
  );
}
