// ─────────────────────────────────────────────────────────────────────────────
// Historique des tests de débit, replié sous le speed test. Les tests restent
// dans ce navigateur ; il sert à repérer une ligne qui ralentit à certaines
// heures (le soir, typiquement).
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import styled from "styled-components";
import { formatNumber } from "../lib/history.js";
import { useLang } from "../ui/i18n.jsx";
import { Ghost } from "../ui/theme.js";

const TEXT = {
  fr: {
    title: (n) => `Historique des tests (${n})`,
    note: "Débits en Mb/s, latence en ms. Gardé dans ce navigateur uniquement",
    date: "Date",
    down: "Desc.",
    up: "Mont.",
    latency: "Latence",
    jitter: "Var.",
    clear: "Effacer l'historique",
  },
  en: {
    title: (n) => `Test history (${n})`,
    note: "Speeds in Mb/s, latency in ms. Kept in this browser only",
    date: "Date",
    down: "Down",
    up: "Up",
    latency: "Latency",
    jitter: "Jitter",
    clear: "Clear history",
  },
};

const LOCALE = { fr: "fr-FR", en: "en-GB" };

const Wrap = styled.details`
  margin-top: 28px;
  border-bottom: 1px solid #1e293b;

  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    cursor: pointer;
    list-style: none;
    font-size: 14px;
    color: #94a3b8;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary:hover {
    color: #e2e8f0;
  }
  summary:focus-visible {
    outline: none;
    color: var(--accent);
  }
  .chev {
    flex: none;
    color: #64748b;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  &[open] .chev {
    transform: rotate(180deg);
    color: var(--accent);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-variant-numeric: tabular-nums;

  th {
    padding: 6px 0;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
    text-align: right;
  }
  td {
    padding: 7px 0;
    border-top: 1px solid #111a2e;
    color: #cbd5e1;
    text-align: right;
    font-family: ui-monospace, monospace;
  }
  th:first-child,
  td:first-child {
    text-align: left;
    font-family: inherit;
    color: #94a3b8;
  }
  tbody tr:first-child td {
    color: #f1f5f9;
  }
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 8px -8px 8px 0;
  font-size: 12px;
  color: #475569;
`;

function Chevron() {
  return (
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
  );
}

/** @param {{ entries: import("../lib/history.js").Entry[], onClear: () => void }} props */
export default function History({ entries, onClear }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  if (entries.length === 0) return null;

  const when = (iso) =>
    new Date(iso).toLocaleString(LOCALE[lang], {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  const n = (v) => formatNumber(v, lang);

  return (
    <Wrap>
      <summary>
        {t.title(entries.length)}
        <Chevron />
      </summary>
      <Table>
        <thead>
          <tr>
            <th scope="col">{t.date}</th>
            <th scope="col">{t.down}</th>
            <th scope="col">{t.up}</th>
            <th scope="col">{t.latency}</th>
            <th scope="col">{t.jitter}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.at}>
              <td>{when(e.at)}</td>
              <td>{n(e.download)}</td>
              <td>{n(e.upload)}</td>
              <td>{n(e.latency)}</td>
              <td>{n(e.jitter)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Foot>
        {t.note}
        <Ghost onClick={onClear}>{t.clear}</Ghost>
      </Foot>
    </Wrap>
  );
}
