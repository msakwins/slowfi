// ─────────────────────────────────────────────────────────────────────────────
// Le speed test de la home : au repos, un seul bouton. Au lancement, un cadre
// s'ouvre avec les jauges en direct ; le verdict (gradeConnection) apparaît
// ensuite dans le même cadre, sous les jauges qui gardent les chiffres finaux.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { runSpeedTest } from "../lib/speedtest.js";
import { gradeConnection } from "../lib/connection.js";
import { Button, Ghost, SEVERITY } from "../ui/theme.js";
import { Unfold, Verdict, VerdictHead, Findings } from "../ui/verdict.jsx";
import { useCountUp } from "../ui/useCountUp.js";
import Arrow from "../ui/Arrow.jsx";
import { useLang } from "../ui/i18n.jsx";
import {
  loadHistory,
  addToHistory,
  clearHistory,
  summarize,
} from "../lib/history.js";
import History from "./History.jsx";

// Les mentions de la note s'accordent avec « connexion » : elles sont
// propres au speed test, les autres analyses nomment leurs niveaux elles-mêmes.
const TEXT = {
  fr: {
    phase: {
      latency: "Mesure de la latence…",
      download: "Test du débit descendant…",
      upload: "Test du débit montant…",
    },
    error:
      "Impossible de joindre le serveur de test. Vérifier la connexion, puis relancer",
    stop: "Arrêter",
    start: "Tester la connexion",
    again: "Relancer le test",
    next: "Lancer l'analyse du réseau local",
    summary: "Copier le résumé",
    summaryDone: "Résumé copié",
    down: "Descendant",
    up: "Montant",
    latency: "Latence",
    jitter: "Variation",
    grade: {
      excellent: "Excellente",
      good: "Bonne",
      fair: "Correcte",
      poor: "Faible",
    },
  },
  en: {
    phase: {
      latency: "Measuring latency…",
      download: "Testing download speed…",
      upload: "Testing upload speed…",
    },
    error:
      "Unable to reach the test server. Check the connection, then try again",
    stop: "Stop",
    start: "Test the connection",
    again: "Run the test again",
    next: "Run the local network analysis",
    summary: "Copy summary",
    summaryDone: "Summary copied",
    down: "Download",
    up: "Upload",
    latency: "Latency",
    jitter: "Jitter",
    grade: { excellent: "Excellent", good: "Good", fair: "Fair", poor: "Poor" },
  },
};

// Le cadre de la mesure, ouvert seulement une fois le test lancé.
const Box = styled.div`
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
  .u {
    font-size: 10px;
    color: #64748b;
  }
`;

const Status = styled.p`
  min-height: 20px;
  margin: 0 0 16px;
  font-size: 13px;
  color: #67e8f9;
`;

const round = (n) => (n == null ? "—" : Math.round(n));

// Pendant la mesure, on affiche des entiers : la décimale change à chaque
// rafraîchissement et c'est elle qui donne l'impression de clignotement. Le
// résultat final, lui, garde son dixième.
const live1 = (n, running) =>
  n == null ? "—" : running ? Math.round(n) : Math.round(n * 10) / 10;

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
const fillInverse = (v, worst) =>
  v == null ? 0 : Math.max(0, 100 - (v / worst) * 100);

/**
 * @param {{
 *   onDiagnostic?: () => void,     ouvre l'analyse du réseau local
 *   onMeasured?: (m: object) => void, transmet les mesures d'un test terminé
 * }} props
 */
export default function SpeedTest({ onDiagnostic, onMeasured }) {
  const [phase, setPhase] = useState("idle");
  const [live, setLive] = useState({
    download: null,
    upload: null,
    latency: null,
    jitter: null,
  });
  // Les mesures brutes sont gardées, le verdict s'en déduit à l'affichage :
  // il suit ainsi un changement de langue.
  const [measures, setMeasures] = useState(null);
  const result = useMemo(
    () => (measures ? gradeConnection(measures) : null),
    [measures],
  );
  const { lang } = useLang();
  const t = TEXT[lang];
  const [history, setHistory] = useState(loadHistory);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const abortRef = useRef(null);
  const lastPush = useRef(0);

  const running =
    phase === "latency" || phase === "download" || phase === "upload";

  const start = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setMeasures(null);
    setSummaryCopied(false);
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
      // La date du test accompagne les mesures, pour le résumé.
      setMeasures({ ...final, at: new Date().toISOString() });
      setHistory(addToHistory(final));
      onMeasured?.(final);
      setPhase("done");
    } catch (err) {
      if (err.name !== "AbortError") setPhase("error");
    }
  };

  const copySummary = async () => {
    const text = summarize(
      { ...measures, gradeLabel: t.grade[result.grade] },
      lang,
      window.location.origin,
    );
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Presse-papiers refusé (page sans focus, navigateur ancien) : l'ancienne
      // méthode, par une zone de texte temporaire, passe encore souvent.
      const area = document.createElement("textarea");
      area.value = text;
      area.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      if (!ok) return;
    }
    setSummaryCopied(true);
    setTimeout(() => setSummaryCopied(false), 2000);
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
      k: t.down,
      unit: "Mb/s",
      text: live1(upDown, running),
      filled: live.download != null,
      active: phase === "download",
      pct: fillDown(upDown),
    },
    {
      k: t.up,
      unit: "Mb/s",
      text: live1(upUp, running),
      filled: live.upload != null,
      active: phase === "upload",
      pct: fillUp(upUp),
    },
    {
      k: t.latency,
      unit: "ms",
      text: round(upLatency),
      filled: live.latency != null,
      active: phase === "latency",
      pct: fillInverse(upLatency, 200),
    },
    {
      k: t.jitter,
      unit: "ms",
      text: round(upJitter),
      filled: live.jitter != null,
      active: phase === "latency",
      pct: fillInverse(upJitter, 60),
    },
  ];

  // Le cadre reste ouvert dès qu'il y a quelque chose à montrer : mesure en
  // cours, résultat ou erreur. Un arrêt en cours de route le referme.
  const open = running || result != null || phase === "error";

  return (
    <div>
      {running ? (
        <Button onClick={stop}>{t.stop}</Button>
      ) : (
        <Button $primary={!result} onClick={start}>
          {result ? t.again : t.start}
        </Button>
      )}

      {open && (
        <Unfold gap={24} first={0}>
          <Box>
            <Gauges>
              {GAUGES.map((g) => (
                <Gauge key={g.k} $active={g.active}>
                  <div className="k">{g.k}</div>
                  <Dial>
                    <Ring viewBox="0 0 100 100" $pct={g.pct} $active={g.active}>
                      <circle
                        className="track"
                        cx="50"
                        cy="50"
                        r={RING_R}
                        fill="none"
                        strokeWidth="7"
                      />
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
                      <span className="v">
                        {typeof g.text === "number"
                          ? g.text.toLocaleString(
                              lang === "fr" ? "fr-FR" : "en-GB",
                              {
                                useGrouping: false,
                              },
                            )
                          : g.text}
                      </span>
                      <span className="u">{g.unit}</span>
                    </Readout>
                  </Dial>
                </Gauge>
              ))}
            </Gauges>

            {(running || phase === "error") && (
              <Status>
                {t.phase[phase]}
                {phase === "error" && (
                  <span style={{ color: "#fb7185" }}>{t.error}</span>
                )}
              </Status>
            )}

            {/* Les jauges portent déjà les chiffres finaux : le verdict n'y
                ajoute que la note et les constats. */}
            {result && (
              <Verdict $color={sev.color} gap={8}>
                <VerdictHead color={sev.color}>
                  {t.grade[result.grade]}
                </VerdictHead>
                <Findings findings={result.findings} engine="connection" />
                <div style={{ marginLeft: -8, fontSize: 13 }}>
                  <Ghost onClick={copySummary}>
                    {summaryCopied ? t.summaryDone : t.summary}
                  </Ghost>
                </div>
              </Verdict>
            )}
          </Box>
        </Unfold>
      )}

      {result && onDiagnostic && (
        <Unfold gap={24} first={0.6}>
          {/* Ligne saine : c'est la seule suite possible, donc le bouton principal. */}
          <Button $primary={result.severity === "ok"} onClick={onDiagnostic}>
            {t.next}
            <Arrow />
          </Button>
        </Unfold>
      )}

      {!running && (
        <History entries={history} onClear={() => setHistory(clearHistory())} />
      )}
    </div>
  );
}
