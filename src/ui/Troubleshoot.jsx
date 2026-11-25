// ─────────────────────────────────────────────────────────────────────────────
// « Un appareil ne marche pas ? » sous le verdict des périphériques : on
// choisit l'appareil, et on obtient ce que Slowfi a trouvé pour lui, puis les
// vérifications à faire dans l'ordre.
//
// Windows seulement : ailleurs, les lectures ne disent rien de l'état des
// appareils, et les chemins des réglages ne seraient pas les bons.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import styled from "styled-components";
import { useLang } from "./i18n.jsx";
import { Findings } from "./verdict.jsx";
import { localize } from "../lib/en.js";
import { GROUPS } from "../lib/devices.js";
import { troubleshoot } from "../lib/troubleshoot.js";

const TEXT = {
  fr: {
    head: "Un appareil ne marche pas ?",
    lead: "Le choisir dans la liste : Slowfi regarde ce qui le concerne et donne les vérifications à faire",
    missing: "Il n'est pas dans la liste",
    nothing:
      "Windows ne signale rien d'anormal pour cet appareil : la cause est plutôt un réglage, l'application ou le matériel",
    tips: "À vérifier, dans l'ordre",
  },
  en: {
    head: "A device not working?",
    lead: "Pick it from the list: Slowfi looks at what concerns it and lists the checks to make",
    missing: "It is not in the list",
    nothing:
      "Windows reports nothing wrong with this device: the cause is more likely a setting, the app or the hardware",
    tips: "To check, in order",
  },
};

const Wrap = styled.div`
  --accent: #a78bfa;
  --accent-light: #c4b5fd;
  --accent-rgb: 167 139 250;
`;

const Head = styled.p`
  margin: 32px 0 0;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 500;
  color: #8fb3c4;
`;

const Lead = styled.p`
  margin: 8px 0 16px;
  font-size: 14px;
  line-height: 1.6;
  color: #8fb3c4;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 20px;
`;

const Chip = styled.button`
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid #1e293b;
  background: transparent;
  color: #8fb3c4;
  max-width: 100%;
  overflow-wrap: anywhere;
  text-align: left;
  transition:
    background 0.2s,
    color 0.2s,
    border-color 0.2s;

  &:hover {
    color: #b6dbe6;
    border-color: #334155;
  }
  &[aria-pressed="true"] {
    color: var(--accent-light);
    background: rgb(var(--accent-rgb) / 0.14);
    border-color: var(--accent);
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.35);
  }
  &.ghost {
    border-style: dashed;
  }
`;

const Nothing = styled.p`
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #b6dbe6;
`;

const Tips = styled.ol`
  margin: 8px 0 0;
  padding-left: 22px;
  li {
    padding: 4px 0;
    font-size: 14px;
    line-height: 1.6;
    color: #b6dbe6;
  }
  li::marker {
    color: var(--accent);
    font-weight: 600;
  }
`;

/** @param {{ r: ReturnType<import("../lib/devices.js").analyzeDevices> }} p */
export default function Troubleshoot({ r }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  // Index dans la liste, "missing" pour un appareil absent, null au départ.
  const [chosen, setChosen] = useState(null);
  if (r.platform !== "windows") return null;

  // Un bouton par nom, dans l'ordre des catégories.
  const order = [...GROUPS.map(([g]) => g), null];
  const seen = new Set();
  const devices = [];
  for (const g of order) {
    for (const x of r.devices) {
      if ((x.group ?? null) !== g || seen.has(x.name)) continue;
      seen.add(x.name);
      devices.push({ name: x.name, group: x.group ?? null });
    }
  }

  const device =
    chosen === "missing" || chosen == null ? null : devices[chosen];
  const result = chosen == null ? null : troubleshoot(r, device);

  return (
    <Wrap>
      <Head>{t.head}</Head>
      <Lead>{t.lead}</Lead>
      <Chips role="group" aria-label={t.head}>
        {devices.map((d, i) => (
          <Chip
            key={d.name}
            type="button"
            aria-pressed={chosen === i}
            onClick={() => setChosen(chosen === i ? null : i)}
          >
            {d.name}
          </Chip>
        ))}
        <Chip
          type="button"
          className="ghost"
          aria-pressed={chosen === "missing"}
          onClick={() => setChosen(chosen === "missing" ? null : "missing")}
        >
          {t.missing}
        </Chip>
      </Chips>
      {result && (
        <div aria-live="polite">
          {result.found.length > 0 ? (
            <Findings findings={result.found} engine="devices" />
          ) : (
            <Nothing>{t.nothing}</Nothing>
          )}
          <Head style={{ marginTop: 20 }}>{t.tips}</Head>
          <Tips>
            {result.tips.map((tip) => (
              <li key={tip.id}>{localize(tip, lang, "devices").title}</li>
            ))}
          </Tips>
        </div>
      )}
    </Wrap>
  );
}
