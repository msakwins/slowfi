// ─────────────────────────────────────────────────────────────────────────────
// Affichage d'un verdict + de ses "findings" (constat → correctif).
// Partagé entre le speed test et l'analyseur Wi-Fi : les deux produisent la
// même forme de résultat { severity, findings }, donc le même rendu.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import styled from "styled-components";

export const Verdict = styled.div`
  margin-top: 32px;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 0 0 1px ${(p) => p.$color}33, 0 8px 40px -12px ${(p) => p.$color}40;
`;

const Head = styled.div`
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
  .tag {
    margin-left: auto;
    font-size: 12px;
    color: #64748b;
    font-family: ui-monospace, monospace;
  }
`;

export const StatGrid = styled.div`
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

const FindingCard = styled.div`
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

export function StatCell({ k, value, unit }) {
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

export function VerdictHead({ color, tag, children }) {
  return (
    <Head $color={color}>
      <span className="dot" />
      <span className="label">{children}</span>
      {tag && <span className="tag">{tag}</span>}
    </Head>
  );
}

export function Findings({ findings }) {
  return findings.map((f) => (
    <FindingCard key={f.id}>
      <h3>{f.title}</h3>
      <p className="detail">{f.detail}</p>
      <p className="fix">
        <span>→ </span>
        {f.fix}
      </p>
    </FindingCard>
  ));
}
