import React, { useState } from "react";
import styled, { keyframes, createGlobalStyle } from "styled-components";
import { parseNetsh, diagnose } from "../lib/diagnostic.js";

// Exemple = le cas réel qui a lancé le projet (2,4 GHz, canal 1, signal 89 %).
const EXAMPLE = `    Nom                   : Wi-Fi
    Description           : Intel(R) Wireless-AC 9560 160MHz
    SSID                  : Livebox-A030
    Type de radio         : 802.11n
    Canal                 : 1
    Réception (Mbits/s)   : 144.4
    Transmission (Mbits/s): 130
    Signal                : 89%`;

const SEVERITY = {
  ok: { label: "Tout est sain", color: "#34d399" },
  warning: { label: "À surveiller", color: "#fbbf24" },
  problem: { label: "Goulot détecté", color: "#fb7185" },
};

// ── Styles globaux (fond + police de base) ─────────────────────────────────
export const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #020617;
    color: #e2e8f0;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

const Page = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: 40px 20px 64px;
`;

const Eyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 600;
  color: #22d3ee;

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22d3ee;
    animation: ${pulse} 2s ease-in-out infinite;
  }
`;

const Title = styled.h1`
  font-size: 30px;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #f8fafc;
  margin: 0;
`;

const Lead = styled.p`
  color: #94a3b8;
  line-height: 1.6;
  margin: 12px 0 28px;

  code {
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.85em;
    color: #67e8f9;
    background: #0f172a;
    padding: 2px 6px;
    border-radius: 5px;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  height: 176px;
  resize: none;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 16px;
  color: #cbd5e1;
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;

  &::placeholder { color: #475569; }
  &:focus {
    outline: none;
    border-color: rgba(34, 211, 238, 0.6);
    box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.15);
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
`;

const Button = styled.button`
  font: inherit;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s, color 0.15s;

  background: ${(p) => (p.$primary ? "#06b6d4" : "transparent")};
  color: ${(p) => (p.$primary ? "#020617" : "#cbd5e1")};
  border-color: ${(p) => (p.$primary ? "transparent" : "#334155")};

  &:hover:not(:disabled) {
    background: ${(p) => (p.$primary ? "#22d3ee" : "transparent")};
    border-color: ${(p) => (p.$primary ? "transparent" : "#64748b")};
  }
  &:disabled {
    background: #1e293b;
    color: #475569;
    cursor: not-allowed;
  }
`;

const Ghost = styled.button`
  font: inherit;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 10px 8px;
  &:hover { color: #cbd5e1; }
`;

const Verdict = styled.div`
  margin-top: 32px;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 0 0 1px ${(p) => p.$color}33, 0 8px 40px -12px ${(p) => p.$color}40;
`;

const VerdictHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;

  .dot { width: 10px; height: 10px; border-radius: 50%; background: ${(p) => p.$color}; }
  .label {
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 700;
    color: ${(p) => p.$color};
  }
  .ssid {
    margin-left: auto;
    font-size: 12px;
    color: #64748b;
    font-family: ui-monospace, monospace;
  }
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${(p) => p.$cols || 4}, 1fr);
  gap: 16px;
  ${(p) => (p.$border ? "border-bottom: 1px solid #1e293b; padding-bottom: 16px;" : "padding-top: 16px;")}

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  .k { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; font-weight: 500; }
  .v { font-family: ui-monospace, monospace; font-size: 20px; color: #f1f5f9; }
  .u { font-size: 14px; color: #94a3b8; margin-left: 4px; }
`;

const Finding = styled.div`
  margin-top: 12px;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 16px;

  h3 { margin: 0; font-size: 15px; color: #f1f5f9; }
  .detail { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 6px 0 0; }
  .fix { font-size: 14px; line-height: 1.6; margin: 10px 0 0; color: #e2e8f0; }
  .fix span { color: #22d3ee; font-weight: 500; }
`;

function StatCell({ k, value, unit }) {
  return (
    <Stat>
      <span className="k">{k}</span>
      <span className="v">
        {value ?? "—"}
        {value != null && unit ? <span className="u">{unit}</span> : null}
      </span>
    </Stat>
  );
}

export default function Slowfi() {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState(null);

  const run = (text) => setResult(diagnose(parseNetsh(text)));
  const sev = result ? SEVERITY[result.severity] : null;

  return (
    <Page>
      <Eyebrow>slowfi</Eyebrow>
      <Title>Pourquoi ton Wi-Fi rame&nbsp;?</Title>
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
            <VerdictHead $color={sev.color}>
              <span className="dot" />
              <span className="label">{sev.label}</span>
              {result.ssid && <span className="ssid">{result.ssid}</span>}
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

          {result.findings.map((f) => (
            <Finding key={f.id}>
              <h3>{f.title}</h3>
              <p className="detail">{f.detail}</p>
              <p className="fix">
                <span>→ </span>
                {f.fix}
              </p>
            </Finding>
          ))}
        </>
      )}
    </Page>
  );
}
