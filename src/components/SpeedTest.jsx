// ─────────────────────────────────────────────────────────────────────────────
// Le speed test de la home : bouton "Tester ma connexion", jauges live pendant
// la mesure, puis verdict interprété par gradeConnection().
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { runSpeedTest } from "../lib/speedtest.js";
import { gradeConnection } from "../lib/connection.js";
import { Button, SEVERITY } from "../ui/theme.js";
import { Verdict, VerdictHead, StatGrid, StatCell, Findings } from "../ui/verdict.jsx";
import { useSmoothed } from "../ui/useSmoothed.js";

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
    /* Chasse fixe : sans ça, chaque changement de chiffre décale la ligne. */
    font-variant-numeric: tabular-nums;
    font-size: 26px;
    color: ${(p) => (p.$active ? "#22d3ee" : p.$filled ? "#f1f5f9" : "#334155")};
    transition: color 0.3s;
    margin-top: 6px;
  }
  .u { font-size: 13px; color: #94a3b8; margin-left: 3px; }
`;

// Chaque jauge garde sa piste visible même à vide : le panneau au repos a une
// structure plutôt que quatre tirets flottants, et la barre donne un mouvement
// lisible là où le nombre seul s'agite trop.
const Track = styled.div`
  position: relative;
  height: 3px;
  margin-top: 10px;
  border-radius: 2px;
  background: #1b2638;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    width: ${(p) => Math.max(0, Math.min(100, p.$pct))}%;
    border-radius: 2px;
    background: ${(p) => (p.$active ? "#22d3ee" : "#334e68")};
    transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1), background 0.3s;
  }
`;

// Au repos, une lueur balaie les pistes : le panneau reste vivant sans
// prétendre afficher une mesure.
const sweep = keyframes`
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
`;

const Sheen = styled.span`
  position: absolute;
  inset: 0;
  width: 33%;
  background: linear-gradient(90deg, transparent, #22d3ee55, transparent);
  animation: ${sweep} 2.6s ease-in-out infinite;
  animation-delay: ${(p) => p.$delay}s;
`;

const Status = styled.p`
  min-height: 20px;
  margin: 0 0 16px;
  font-size: 13px;
  color: #67e8f9;
`;

const fmt = (n) => (n == null ? "—" : Math.round(n * 10) / 10);
const round = (n) => (n == null ? "—" : Math.round(n));

// Échelles de remplissage des pistes. Pour le débit, une valeur de référence
// « bonne connexion » ; pour la latence et la gigue l'échelle est inversée,
// puisque c'est bas qui est bon.
const fill = (v, max) => (v == null ? 0 : Math.min(100, (v / max) * 100));
const fillInverse = (v, worst) => (v == null ? 0 : Math.max(0, 100 - (v / worst) * 100));

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

  // Les valeurs affichées courent après les vraies : le moteur rapporte des
  // dizaines de fois par seconde, ce qui rend les chiffres illisibles bruts.
  const shownDown = useSmoothed(live.download);
  const shownUp = useSmoothed(live.upload);
  const shownLatency = useSmoothed(live.latency);
  const shownJitter = useSmoothed(live.jitter);

  const idle = phase === "idle" && !result;

  const GAUGES = [
    {
      k: "Descendant",
      unit: "Mb/s",
      text: fmt(shownDown),
      filled: live.download != null,
      active: phase === "download",
      pct: fill(shownDown, 500),
    },
    {
      k: "Montant",
      unit: "Mb/s",
      text: fmt(shownUp),
      filled: live.upload != null,
      active: phase === "upload",
      pct: fill(shownUp, 300),
    },
    {
      k: "Latence",
      unit: "ms",
      text: round(shownLatency),
      filled: live.latency != null,
      active: phase === "latency",
      pct: fillInverse(shownLatency, 200),
    },
    {
      k: "Gigue",
      unit: "ms",
      text: round(shownJitter),
      filled: live.jitter != null,
      active: phase === "latency",
      pct: fillInverse(shownJitter, 60),
    },
  ];

  return (
    <Panel>
      <Gauges>
        {GAUGES.map((g, i) => (
          <Gauge key={g.k} $active={g.active} $filled={g.filled}>
            <div className="k">{g.k}</div>
            <div className="v">
              {g.text}
              <span className="u">{g.unit}</span>
            </div>
            <Track $pct={g.pct} $active={g.active}>
              {idle && <Sheen $delay={i * 0.18} />}
            </Track>
          </Gauge>
        ))}
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
