// ─────────────────────────────────────────────────────────────────────────────
// Historique, sous les résultats du diagnostic complet : ce qui a changé
// depuis l'analyse précédente et la liste des analyses, enregistrées sur
// l'appareil.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useLang } from "./i18n.jsx";
import { Ghost, NeonButton, SEVERITY } from "./theme.js";
import { navigate } from "./router.jsx";
import Arrow from "./Arrow.jsx";
import {
  makeSnapshot,
  compareSnapshots,
  findingTitle,
  valueLabel,
} from "../lib/snapshots.js";
import { loadHistory, recordLocal, clearLocal } from "./historyStore.js";

const TEXT = {
  fr: {
    title: "Historique",
    empty: "Aucune analyse enregistrée",
    start: "Lancer le diagnostic",
    first: "Une analyse enregistrée",
    since: (d) => `Depuis l'analyse du ${d}`,
    fixed: "Résolu",
    added: "Nouveau",
    changed: "Changé",
    same: "Aucun changement depuis l'analyse précédente",
    past: (n) =>
      `${n} analyse${n > 1 ? "s" : ""} enregistrée${n > 1 ? "s" : ""}`,
    levels: {
      ok: "Bon état",
      warning: "À surveiller",
      problem: "Problème détecté",
    },
    clear: "Effacer l'historique",
    noFinding: "Aucune anomalie détectée",
  },
  en: {
    title: "History",
    empty: "No analysis saved",
    start: "Run the diagnostic",
    first: "One analysis saved",
    since: (d) => `Since the analysis of ${d}`,
    fixed: "Fixed",
    added: "New",
    changed: "Changed",
    same: "No change since the previous analysis",
    past: (n) => `${n} analys${n > 1 ? "es" : "is"} saved`,
    levels: {
      ok: "Good condition",
      warning: "To watch",
      problem: "Problem detected",
    },
    clear: "Clear history",
    noFinding: "No issue found",
  },
};

const Box = styled.section`
  margin-top: 36px;
  padding-top: 4px;
`;

const Head = styled.p`
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  color: #64748b;
`;

const Line = styled.p`
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: #e2e8f0;
`;

const Small = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
  max-width: 62ch;
`;

// Page « Historique » sans analyse : la phrase, puis le bouton vers le
// diagnostic, comme sur les autres pages.
const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;

  p {
    margin: 0;
    font-size: 15px;
    line-height: 1.7;
    color: #94a3b8;
  }
`;

const Diff = styled.ul`
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
  font-size: 14px;
  color: #e2e8f0;

  li {
    display: flex;
    gap: 10px;
    align-items: baseline;
  }
  .tag {
    flex: none;
    min-width: 72px;
    font-size: 12px;
    font-weight: 700;
    color: var(--tag);
  }
  .to {
    display: inline-flex;
    vertical-align: -2px;
    color: #64748b;
  }
`;

// Une ligne par analyse ; un clic l'ouvre sur ses constats et ses valeurs.
const Runs = styled.ul`
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  color: #94a3b8;

  li {
    border-top: 1px solid #111a2e;
  }
  .run {
    font: inherit;
    color: inherit;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 0;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
  }
  .run:hover,
  .run:focus-visible {
    color: #e2e8f0;
    outline: none;
  }
  .chev {
    margin-left: auto;
    flex: none;
    color: #64748b;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .run[aria-expanded="true"] .chev {
    transform: rotate(180deg);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--dot);
    flex: none;
  }
  .detail {
    padding: 2px 0 14px 18px;
    display: grid;
    gap: 4px;
    color: #cbd5e1;
  }
  .detail p {
    margin: 0;
    display: flex;
    gap: 10px;
    align-items: baseline;
  }
  .detail .dot {
    width: 6px;
    height: 6px;
    transform: translateY(-1px);
  }
  .detail .label {
    color: #64748b;
  }
  .detail .sep {
    margin-top: 6px;
  }
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin: 10px 0 0 -8px;
`;

/**
 * @param {{ res: object, download?: number|null }} props
 */
export default function HistoryPanel({ res, download, page }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [list, setList] = useState(loadHistory);
  // Analyse ouverte dans la liste (par son heure), ou aucune.
  const [opened, setOpened] = useState(null);
  const saved = useRef(null);

  const when = (t0) =>
    new Date(t0).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Chaque nouveau résultat est enregistré (un relevé par analyse).
  useEffect(() => {
    if (!res || saved.current === res) return;
    saved.current = res;
    const next = recordLocal(makeSnapshot(res, { download }));
    setList(next);
  }, [res, download]);

  const [current, previous] = list;
  const diff = current && previous ? compareSnapshots(previous, current) : null;
  const tagColor = {
    fixed: SEVERITY.ok.color,
    added: SEVERITY.warning.color,
    changed: "#94a3b8",
  };

  return (
    <Box>
      {/* Sur la page « Historique », le titre de la page suffit. */}
      {!page && <Head>{t.title}</Head>}
      {!current && page ? (
        <Empty>
          <p>{t.empty}</p>
          <NeonButton onClick={() => navigate("/diagnostic")}>
            <span className="neon">{t.start}</span>
          </NeonButton>
        </Empty>
      ) : !current ? (
        <Line>{t.empty}</Line>
      ) : !previous ? (
        <Line>{t.first}</Line>
      ) : (
        <>
          <Line>{t.since(when(previous.t))}</Line>
          {diff.fixed.length + diff.added.length + diff.changed.length === 0 ? (
            <Small>{t.same}</Small>
          ) : (
            <Diff>
              {diff.fixed.map((f) => (
                <li key={`f-${f.id}`} style={{ "--tag": tagColor.fixed }}>
                  <span className="tag">{t.fixed}</span>
                  {findingTitle(f, lang)}
                </li>
              ))}
              {diff.added.map((f) => (
                <li key={`a-${f.id}`} style={{ "--tag": tagColor.added }}>
                  <span className="tag">{t.added}</span>
                  {findingTitle(f, lang)}
                </li>
              ))}
              {diff.changed.map((c) => (
                <li key={`c-${c.key}`} style={{ "--tag": tagColor.changed }}>
                  <span className="tag">{t.changed}</span>
                  <span>
                    {valueLabel(c.key, c, lang).label}
                    {lang === "fr" ? " : " : ": "}
                    {c.from}
                    {c.unit && ` ${valueLabel(c.key, c, lang).unit}`}{" "}
                    <span className="to">
                      <Arrow />
                    </span>{" "}
                    {c.to}
                    {c.unit && ` ${valueLabel(c.key, c, lang).unit}`}
                  </span>
                </li>
              ))}
            </Diff>
          )}
        </>
      )}

      {(page ? list.length > 0 : list.length > 1) && (
        <>
          <Small>{t.past(list.length)}</Small>
          <Runs>
            {(page ? list : list.slice(0, 8)).map((s) => (
              <li key={s.t}>
                <button
                  type="button"
                  className="run"
                  aria-expanded={opened === s.t}
                  onClick={() => setOpened(opened === s.t ? null : s.t)}
                >
                  <span
                    className="dot"
                    style={{ "--dot": SEVERITY[s.level]?.color ?? "#64748b" }}
                  />
                  {when(s.t)}
                  <span>{t.levels[s.level] ?? ""}</span>
                  <svg
                    className="chev"
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {opened === s.t && (
                  <div className="detail">
                    {(s.findings ?? []).length === 0 ? (
                      <p>{t.noFinding}</p>
                    ) : (
                      s.findings.map((f) => (
                        <p key={f.id}>
                          <span
                            className="dot"
                            style={{ "--dot": SEVERITY[f.level]?.color }}
                          />
                          {findingTitle(f, lang)}
                        </p>
                      ))
                    )}
                    {Object.entries(s.values ?? {}).map(([k, v], i) => (
                      <p key={k} className={i === 0 ? "sep" : undefined}>
                        <span className="label">
                          {valueLabel(k, v, lang).label}
                        </span>
                        {v.value}
                        {v.unit && ` ${valueLabel(k, v, lang).unit}`}
                      </p>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </Runs>
        </>
      )}

      <Row>
        {list.length > 0 && (
          <Ghost
            onClick={() => {
              clearLocal();
              setList([]);
              saved.current = res;
            }}
          >
            {t.clear}
          </Ghost>
        )}
      </Row>
    </Box>
  );
}
