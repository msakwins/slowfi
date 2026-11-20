// ─────────────────────────────────────────────────────────────────────────────
// Analyseur Wi-Fi : colle la sortie de `netsh wlan show interfaces`, on parse
// et on diagnostique. C'est le cas d'origine du projet, désormais une des
// cartes du diagnostic élargi.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import { parseNetsh, diagnose } from "../lib/diagnostic.js";
import { Lead, Actions, Button, Ghost, Textarea, SEVERITY } from "../ui/theme.js";
import { Verdict, VerdictHead, StatGrid, StatCell, Findings } from "../ui/verdict.jsx";

// Exemple = le cas réel qui a lancé le projet (2,4 GHz, canal 1, signal 89 %).
const EXAMPLE = `    Nom                   : Wi-Fi
    Description           : Intel(R) Wireless-AC 9560 160MHz
    SSID                  : Livebox-A030
    Type de radio         : 802.11n
    Canal                 : 1
    Réception (Mbits/s)   : 144.4
    Transmission (Mbits/s): 130
    Signal                : 89%`;

export default function WifiAnalyzer() {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState(null);

  const run = (text) => setResult(diagnose(parseNetsh(text)));
  const sev = result ? SEVERITY[result.severity] : null;

  return (
    <>
      <Lead>
        Sous Windows, ouvre PowerShell, tape <code>netsh wlan show interfaces</code> et colle le
        résultat ci-dessous.
      </Lead>

      <Textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Colle ici la sortie de netsh wlan show interfaces…"
      />

      <Actions>
        <Button $primary onClick={() => run(raw)} disabled={!raw.trim()}>
          Analyser
        </Button>
        <Button
          onClick={() => {
            setRaw(EXAMPLE);
            run(EXAMPLE);
          }}
        >
          Charger un exemple
        </Button>
        {result && (
          <Ghost
            onClick={() => {
              setRaw("");
              setResult(null);
            }}
          >
            Réinitialiser
          </Ghost>
        )}
      </Actions>

      {result && (
        <>
          <Verdict $color={sev.color}>
            <VerdictHead color={sev.color} tag={result.ssid}>
              {sev.label}
            </VerdictHead>

            <StatGrid $cols={4} $border>
              <StatCell k="Bande" value={result.band} />
              <StatCell k="Norme" value={result.radio} />
              <StatCell k="Signal" value={result.signal} unit="%" />
              <StatCell k="Canal" value={result.channel} />
            </StatGrid>

            <StatGrid $cols={2}>
              <StatCell k="Débit de lien" value={result.linkRate} unit="Mb/s" />
              <StatCell k="Débit réel estimé" value={result.estimatedReal} unit="Mbit/s" />
            </StatGrid>
          </Verdict>

          <Findings findings={result.findings} />
        </>
      )}
    </>
  );
}
