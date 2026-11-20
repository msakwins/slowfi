// ─────────────────────────────────────────────────────────────────────────────
// Le speed test de la home : bouton "Tester la connexion", jauges live pendant
// la mesure, puis verdict interprété par gradeConnection().
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useState } from "react";
import styled from "styled-components";
import { runSpeedTest } from "../lib/speedtest.js";
import { gradeConnection } from "../lib/connection.js";
import { Button, SEVERITY } from "../ui/theme.js";
import { Verdict, VerdictHead, StatGrid, StatCell, Findings } from "../ui/verdict.jsx";
import { useCountUp } from "../ui/useCountUp.js";
import Arrow from "../ui/Arrow.jsx";

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

  .k {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${(p) => (p.$active ? "#22d3ee" : "#64748b")};
    font-weight: 600;
    transition: color 0.3s;
  }
`;

// L'anneau EST la jauge : il se remplit, et la valeur vit en son centre. Au
// repos il reste un cercle complet — une forme pleine, pas un vide à combler.
const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;

const Dial = styled.div`
  position: relative;
  width: 100%;
  max-width: 104px;
  margin: 10px auto 0;
  aspect-ratio: 1;
`;

const Ring = styled.svg`
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);

  .track {
    stroke: #18233a;
  }
  .fill {
    stroke: ${(p) => (p.$active ? "#22d3ee" : "#3f6480")};
    stroke-dasharray: ${RING_C};
    stroke-dashoffset: ${(p) => RING_C * (1 - Math.max(0, Math.min(100, p.$pct)) / 100)};
    /* Pas de transition : la valeur est déjà animée image par image par
       useCountUp. En ajouter une ferait courir l'anneau derrière le nombre. */
    transition: stroke 0.3s;
  }
`;

const Readout = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;

  .v {
    font-family: ui-monospace, monospace;
    /* Chasse fixe : sans ça, chaque changement de chiffre décale la ligne. */
    font-variant-numeric: tabular-nums;
    font-size: 21px;
    line-height: 1;
    color: ${(p) => (p.$active ? "#22d3ee" : p.$filled ? "#f1f5f9" : "#334155")};
    transition: color 0.3s;
  }
  .u { font-size: 10px; color: #64748b; }
`;


// Les mentions du speed test s'accordent avec « connexion », donc elles ne
// peuvent pas servir au stockage ou aux composants. Chaque analyseur garde les
// couleurs communes de SEVERITY et nomme ses niveaux lui-même.
const GRADE = {
  excellent: "Excellente",
  good: "Bonne",
  fair: "Correcte",
  poor: "Faible",
};

const Next = styled.div`
  margin-top: 26px;
`;

const Status = styled.p`
  min-height: 20px;
  margin: 0 0 16px;
  font-size: 13px;
  color: #67e8f9;
`;

const fmt = (n) => (n == null ? "—" : Math.round(n * 10) / 10);
const round = (n) => (n == null ? "—" : Math.round(n));

// Pendant la mesure, on affiche des entiers : la décimale change à chaque
// rafraîchissement et c'est elle qui donne l'impression de clignotement. Le
// résultat final, lui, garde son dixième.
const live1 = (n, running) => (n == null ? "—" : running ? Math.round(n) : Math.round(n * 10) / 10);

// Le moteur rapporte des dizaines de fois par seconde. On ne pousse dans React
// que toutes les 160 ms : l'anneau comble les intervalles tout seul grâce à sa
// transition CSS, et le nombre ne bouge plus que six fois par seconde.
const PUSH_INTERVAL = 90;

// Remplissage des anneaux de débit, sur une échelle logarithmique.
//
// En linéaire il faut choisir entre deux défauts : un maximum bas et toute
// connexion rapide reste collée au plein, un maximum haut et une ligne à
// 20 Mb/s n'affiche presque rien. Le log règle les deux — l'écart entre 10 et
// 100 Mb/s occupe autant de place que celui entre 100 et 1000, ce qui
// correspond à la façon dont on perçoit un débit.
//
// L'anneau donne donc un ordre de grandeur, pas une proportion. C'est ce que
// font les cadrans des speed tests du commerce, pour la même raison.
const fillLog = (v, min, max) => {
  if (v == null || v <= 0) return 0;
  const span = Math.log10(max) - Math.log10(min);
  const pos = (Math.log10(v) - Math.log10(min)) / span;
  return Math.max(0, Math.min(100, pos * 100));
};

// Descendant : de 5 Mb/s à 2 Gb/s. Une fibre à 600 remplit environ 80 %, il
// reste donc de la marge visible pour les lignes multi-gigabit.
const fillDown = (v) => fillLog(v, 5, 2000);
// Montant : les offres sont plus basses, l'échelle s'arrête au gigabit.
const fillUp = (v) => fillLog(v, 2, 1000);

// Latence et variation : échelle inversée et linéaire, c'est bas qui est bon.
const fillInverse = (v, worst) => (v == null ? 0 : Math.max(0, 100 - (v / worst) * 100));

export default function SpeedTest({ onDiagnostic }) {
  const [phase, setPhase] = useState("idle");
  const [live, setLive] = useState({ download: null, upload: null, latency: null, jitter: null });
  const [result, setResult] = useState(null);
  const abortRef = useRef(null);
  const lastPush = useRef(0);

  const running = phase === "latency" || phase === "download" || phase === "upload";

  const start = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setResult(null);
    setLive({ download: null, upload: null, latency: null, jitter: null });
    setPhase("download");
    lastPush.current = 0;
    try {
      const final = await runSpeedTest({
        signal: controller.signal,
        onProgress: (p) => {
          setPhase(p.phase);

          // Le débit arrive en continu : on l'échantillonne. La latence et la
          // gigue n'arrivent qu'une fois, elles passent toujours.
          const streaming = p.download != null || p.upload != null;
          const now = performance.now();
          if (streaming && now - lastPush.current < PUSH_INTERVAL) return;
          lastPush.current = now;

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

  // Le hook comble les intervalles entre deux échantillons.
  const upDown = useCountUp(live.download);
  const upUp = useCountUp(live.upload);
  const upLatency = useCountUp(live.latency);
  const upJitter = useCountUp(live.jitter);

  const GAUGES = [
    {
      k: "Descendant",
      unit: "Mb/s",
      text: live1(upDown, running),
      filled: live.download != null,
      active: phase === "download",
      pct: fillDown(upDown),
    },
    {
      k: "Montant",
      unit: "Mb/s",
      text: live1(upUp, running),
      filled: live.upload != null,
      active: phase === "upload",
      pct: fillUp(upUp),
    },
    {
      k: "Latence",
      unit: "ms",
      text: round(upLatency),
      filled: live.latency != null,
      active: phase === "latency",
      pct: fillInverse(upLatency, 200),
    },
    {
      k: "Variation",
      unit: "ms",
      text: round(upJitter),
      filled: live.jitter != null,
      active: phase === "latency",
      pct: fillInverse(upJitter, 60),
    },
  ];

  return (
    <Panel>
      <Gauges>
        {GAUGES.map((g) => (
          <Gauge key={g.k} $active={g.active}>
            <div className="k">{g.k}</div>
            <Dial>
              <Ring viewBox="0 0 100 100" $pct={g.pct} $active={g.active}>
                <circle className="track" cx="50" cy="50" r={RING_R} fill="none" strokeWidth="7" />
                <circle
                  className="fill"
                  cx="50"
                  cy="50"
                  r={RING_R}
                  fill="none"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
              </Ring>
              <Readout $active={g.active} $filled={g.filled}>
                <span className="v">{g.text}</span>
                <span className="u">{g.unit}</span>
              </Readout>
            </Dial>
          </Gauge>
        ))}
      </Gauges>

      <Status>
        {PHASE_LABEL[phase]}
        {phase === "error" && (
          <span style={{ color: "#fb7185" }}>
            Impossible de joindre le serveur de test. Vérifier la connexion, puis relancer
          </span>
        )}
      </Status>

      {running ? (
        <Button onClick={stop}>Arrêter</Button>
      ) : (
        <Button $primary={!result} onClick={start}>
          {result ? "Relancer le test" : "Tester la connexion"}
        </Button>
      )}

      {result && (
        <Verdict $color={sev.color}>
          <VerdictHead color={sev.color} tag={`${fmt(result.download)} / ${fmt(result.upload)} Mb/s`}>
            {GRADE[result.grade]}
          </VerdictHead>
          <StatGrid $cols={4} $border>
            <StatCell k="Descendant" value={fmt(result.download)} unit="Mb/s" />
            <StatCell k="Montant" value={fmt(result.upload)} unit="Mb/s" />
            <StatCell k="Latence" value={result.latency} unit="ms" />
            <StatCell k="Variation" value={result.jitter} unit="ms" />
          </StatGrid>
          <div style={{ paddingTop: 4 }}>
            <Findings findings={result.findings} />
          </div>
          {onDiagnostic && (
            <Next>
              {/* Ligne saine : c'est la seule suite possible, donc le bouton principal. */}
              <Button $primary={result.severity === "ok"} onClick={onDiagnostic}>
                Lancer l'analyse du réseau local
                <Arrow />
              </Button>
            </Next>
          )}
        </Verdict>
      )}
    </Panel>
  );
}
