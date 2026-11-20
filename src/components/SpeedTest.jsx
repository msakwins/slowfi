// ─────────────────────────────────────────────────────────────────────────────
// Le speed test de la home : bouton "Tester ma connexion", jauges live pendant
// la mesure, puis verdict interprété par gradeConnection().
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useState } from "react";
import styled from "styled-components";
import { runSpeedTest } from "../lib/speedtest.js";
import { gradeConnection } from "../lib/connection.js";
import { Button, SEVERITY } from "../ui/theme.js";
import { Verdict, VerdictHead, StatGrid, StatCell, Findings } from "../ui/verdict.jsx";

const PHASE_LABEL = {
  idle: null,
  latency: "Mesure de la latence…",
  download: "Test du débit descendant…",
  upload: "Test du débit montant…",
  done: null,
  error: null,
};

const Panel = styled.div`
  border: 1px solid #1e293b;
  border-radius: 16px;
  padding: 24px;
  background: linear-gradient(180deg, #0b1220 0%, #060b16 100%);
`;

const Gauges = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Gauge = styled.div`
  text-align: center;

  .k { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; font-weight: 600; }
  .v {
    font-family: ui-monospace, monospace;
    font-size: 26px;
    color: ${(p) => (p.$active ? "#22d3ee" : "#f1f5f9")};
    transition: color 0.2s;
    margin-top: 6px;
  }
  .u { font-size: 13px; color: #94a3b8; margin-left: 3px; }
`;

const Status = styled.p`
  min-height: 20px;
  margin: 0 0 16px;
  font-size: 13px;
  color: #67e8f9;
`;

const fmt = (n) => (n == null ? "—" : Math.round(n * 10) / 10);

export default function SpeedTest() {
  const [phase, setPhase] = useState("idle");
  const [live, setLive] = useState({ download: null, upload: null, latency: null, jitter: null });
  const [result, setResult] = useState(null);
  const abortRef = useRef(null);

  const running = phase === "latency" || phase === "download" || phase === "upload";

  const start = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setResult(null);
    setLive({ download: null, upload: null, latency: null, jitter: null });
    setPhase("latency");
    try {
      const final = await runSpeedTest({
        signal: controller.signal,
        onProgress: (p) => {
          setPhase(p.phase);
          setLive((prev) => ({
            download: p.download != null ? p.download : prev.download,
            upload: p.upload != null ? p.upload : prev.upload,
            latency: p.latency != null ? p.latency : prev.latency,
            jitter: p.jitter != null ? p.jitter : prev.jitter,
          }));
        },
      });
      setLive(final);
      setResult(gradeConnection(final));
      setPhase("done");
    } catch (err) {
      if (err.name !== "AbortError") setPhase("error");
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setPhase("idle");
  };

  const sev = result ? SEVERITY[result.severity] : null;

  return (
    <Panel>
      <Gauges>
        <Gauge $active={phase === "download"}>
          <div className="k">Descendant</div>
          <div className="v">{fmt(live.download)}<span className="u">Mb/s</span></div>
        </Gauge>
        <Gauge $active={phase === "upload"}>
          <div className="k">Montant</div>
          <div className="v">{fmt(live.upload)}<span className="u">Mb/s</span></div>
        </Gauge>
        <Gauge $active={phase === "latency"}>
          <div className="k">Latence</div>
          <div className="v">{live.latency ?? "—"}<span className="u">ms</span></div>
        </Gauge>
        <Gauge $active={phase === "latency"}>
          <div className="k">Gigue</div>
          <div className="v">{live.jitter ?? "—"}<span className="u">ms</span></div>
        </Gauge>
      </Gauges>

      <Status>
        {PHASE_LABEL[phase]}
        {phase === "error" && (
          <span style={{ color: "#fb7185" }}>
            Impossible de joindre le serveur de test. Vérifie ta connexion et réessaie.
          </span>
        )}
      </Status>

      {running ? (
        <Button onClick={stop}>Arrêter</Button>
      ) : (
        <Button $primary onClick={start}>
          {result ? "Relancer le test" : "Tester ma connexion"}
        </Button>
      )}

      {result && (
        <Verdict $color={sev.color}>
          <VerdictHead color={sev.color} tag={`${fmt(result.download)} / ${fmt(result.upload)} Mb/s`}>
            {sev.label}
          </VerdictHead>
          <StatGrid $cols={4} $border>
            <StatCell k="Descendant" value={fmt(result.download)} unit="Mb/s" />
            <StatCell k="Montant" value={fmt(result.upload)} unit="Mb/s" />
            <StatCell k="Latence" value={result.latency} unit="ms" />
            <StatCell k="Gigue" value={result.jitter} unit="ms" />
          </StatGrid>
          <div style={{ paddingTop: 4 }}>
            <Findings findings={result.findings} />
          </div>
        </Verdict>
      )}
    </Panel>
  );
}
