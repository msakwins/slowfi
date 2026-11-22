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
import { makeSnapshot, compareSnapshots } from "../lib/snapshots.js";
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

const Runs = styled.ul`
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  color: #94a3b8;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 0;
    border-top: 1px solid #111a2e;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--dot);
    flex: none;
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
                  {f.title}
                </li>
              ))}
              {diff.added.map((f) => (
                <li key={`a-${f.id}`} style={{ "--tag": tagColor.added }}>
                  <span className="tag">{t.added}</span>
                  {f.title}
                </li>
              ))}
              {diff.changed.map((c) => (
                <li key={`c-${c.key}`} style={{ "--tag": tagColor.changed }}>
                  <span className="tag">{t.changed}</span>
                  <span>
                    {c.label} : {c.from}
                    {c.unit && ` ${c.unit}`}{" "}
                    <span className="to">
                      <Arrow />
                    </span>{" "}
                    {c.to}
                    {c.unit && ` ${c.unit}`}
                  </span>
                </li>
              ))}
            </Diff>
          )}
        </>
      )}

      {list.length > 1 && (
        <>
          <Small>{t.past(list.length)}</Small>
          <Runs>
            {list.slice(0, 8).map((s) => (
              <li key={s.t}>
                <span
                  className="dot"
                  style={{ "--dot": SEVERITY[s.level]?.color ?? "#64748b" }}
                />
                {when(s.t)}
                <span>{t.levels[s.level] ?? ""}</span>
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
