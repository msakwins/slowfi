// ─────────────────────────────────────────────────────────────────────────────
// Tableau de bord, en tête de l'accueil de l'application : la dernière analyse
// enregistrée (niveau, date, nombre de problèmes) et les températures du
// moment, avec un lien vers la page de chacune.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { SEVERITY } from "../ui/theme.js";
import { useLang, SEVERITY_LABEL } from "../ui/i18n.jsx";
import { Link } from "../ui/router.jsx";
import { desktop } from "../ui/desktop.js";
import { loadHistory } from "../ui/historyStore.js";
import { sensorRows } from "../lib/sensors.js";

const TEXT = {
  fr: {
    last: "Dernière analyse",
    none: "Aucune analyse enregistrée",
    counts: (p, w) =>
      p + w === 0
        ? "Aucun problème détecté"
        : [
            p && `${p} problème${p > 1 ? "s" : ""}`,
            w && `${w} à surveiller`,
          ]
            .filter(Boolean)
            .join(" · "),
    history: "Voir l'historique",
    temps: "Températures",
    reading: "Lecture des capteurs",
    noTemps: "Aucune température lisible",
    sensors: "Voir les capteurs",
  },
  en: {
    last: "Last analysis",
    none: "No analysis saved",
    counts: (p, w) =>
      p + w === 0
        ? "No issue found"
        : [p && `${p} problem${p > 1 ? "s" : ""}`, w && `${w} to watch`]
            .filter(Boolean)
            .join(" · "),
    history: "View history",
    temps: "Temperatures",
    reading: "Reading sensors",
    noTemps: "No readable temperature",
    sensors: "View sensors",
  },
};

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
  margin: 4px 0 40px;
`;

const Card = styled.section`
  padding: 18px 20px;
  border-radius: 16px;
  border: 1px solid #1e293b;
  background: #0b1220;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;

  h2 {
    margin: 0;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #8fb3c4;
  }
  .main {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 700;
    color: #e0fbff;
  }
  .dot {
    width: 10px;
    height: 10px;
    flex: none;
    border-radius: 50%;
    background: var(--dot);
    box-shadow: 0 0 10px var(--dot);
  }
  .sub {
    font-size: 13px;
    color: #64748b;
  }
  ul {
    margin: 2px 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 6px;
  }
  li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 14px;
    color: #b6dbe6;
  }
  li span:first-child {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  li b {
    flex: none;
    font-variant-numeric: tabular-nums;
  }
  a {
    margin-top: auto;
    padding-top: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #22d3ee;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`;

export default function Dashboard() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [last] = useState(() => loadHistory()[0] ?? null);
  const [temps, setTemps] = useState(undefined); // undefined : lecture en cours

  useEffect(() => {
    let live = true;
    desktop
      ?.sensors()
      .then((data) => {
        if (!live) return;
        const rows = data ? sensorRows(data) : [];
        setTemps(
          rows
            .filter((r) => ["gpu", "zone", "disk"].includes(r.kind))
            .sort((a, b) => b.value - a.value)
            .slice(0, 3),
        );
      })
      .catch(() => live && setTemps([]));
    return () => {
      live = false;
    };
  }, []);

  if (!desktop) return null;

  const when = (t0) =>
    new Date(t0).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  const p = last?.findings?.filter((f) => f.level === "problem").length ?? 0;
  const w = last?.findings?.filter((f) => f.level === "warning").length ?? 0;
  // Zone ACPI de Windows : nommée « carte mère », comme sur la page Capteurs.
  const label = (r) =>
    r.kind === "zone" && r.name.startsWith("\\")
      ? lang === "fr"
        ? "Carte mère"
        : "Motherboard"
      : r.name;

  return (
    <Grid>
      <Card>
        <h2>{t.last}</h2>
        {last ? (
          <>
            <div
              className="main"
              style={{ "--dot": SEVERITY[last.level]?.color ?? "#64748b" }}
            >
              <span className="dot" aria-hidden="true" />
              {SEVERITY_LABEL[lang][last.level]}
            </div>
            <div className="sub">
              {when(last.t)} · {t.counts(p, w)}
            </div>
          </>
        ) : (
          <div className="sub">{t.none}</div>
        )}
        <Link to="/historique">{t.history}</Link>
      </Card>

      <Card>
        <h2>{t.temps}</h2>
        {temps === undefined ? (
          <div className="sub">{t.reading}…</div>
        ) : temps.length === 0 ? (
          <div className="sub">{t.noTemps}</div>
        ) : (
          <ul>
            {temps.map((r) => (
              <li key={`${r.kind}-${r.name}`}>
                <span title={label(r)}>{label(r)}</span>
                <b style={{ color: SEVERITY[r.level]?.color ?? "#cdeef6" }}>
                  {Math.round(r.value)} °C
                </b>
              </li>
            ))}
          </ul>
        )}
        <Link to="/capteurs">{t.sensors}</Link>
      </Card>
    </Grid>
  );
}
