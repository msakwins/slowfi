// ─────────────────────────────────────────────────────────────────────────────
// Pièces à remplacer : la pièce, pourquoi, quoi chercher, un budget indicatif
// et les liens vers les marchands. N'apparaît que si l'analyse le justifie.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import styled from "styled-components";
import { useLang } from "./i18n.jsx";
import { shopLinks, AFFILIATE } from "../lib/affiliate.js";
import { PRICES_DATE } from "../lib/parts.js";

const TEXT = {
  fr: {
    title: "Pièces à remplacer",
    budget: ([a, b]) => `Budget indicatif : ${a} à ${b} € (${PRICES_DATE})`,
    search: (q) => `Chercher « ${q} »`,
    on: (shop) => `Voir sur ${shop}`,
    affiliate:
      "Lien affilié : en tant que Partenaire Amazon, Slowfi réalise un bénéfice sur les achats remplissant les conditions requises, sans surcoût. Les suggestions ne dépendent que de l'analyse",
    plain: "Suggestions faites seulement à partir de l'analyse",
  },
  en: {
    title: "Parts to replace",
    budget: ([a, b]) => `Rough budget: €${a} to €${b} (November 2026)`,
    search: (q) => `Search for “${q}”`,
    on: (shop) => `See on ${shop}`,
    affiliate:
      "Affiliate link: as an Amazon Associate, Slowfi earns from qualifying purchases, at no extra cost. Suggestions depend only on the analysis",
    plain: "Suggestions based only on the analysis",
  },
};

const Head = styled.p`
  margin: 32px 0 0;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  color: #64748b;
`;

const List = styled.ul`
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;

  li {
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid #1e293b;
    background: #0b1220;
  }
  .title {
    font-size: 15px;
    font-weight: 700;
    color: #e2e8f0;
  }
  .reason,
  .meta {
    margin-top: 4px;
    font-size: 13px;
    line-height: 1.6;
    color: #94a3b8;
  }
  .meta {
    color: #64748b;
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
  .links a {
    font-size: 13px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid rgb(var(--accent-rgb) / 0.45);
    color: var(--accent-light);
    text-decoration: none;
  }
  .links a:hover {
    background: rgb(var(--accent-rgb) / 0.12);
  }
`;

const Note = styled.p`
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: #64748b;
`;

/** @param {{ parts: ReturnType<typeof import("../lib/parts.js").recommendParts> }} props */
export default function PartsToBuy({ parts }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  if (!parts?.length) return null;
  return (
    <>
      <Head>{t.title}</Head>
      <List>
        {parts.map((p) => (
          <li key={p.id}>
            <div className="title">{p.title}</div>
            <div className="reason">{p.reason}</div>
            <div className="meta">
              {[t.search(p.query), p.price && t.budget(p.price)]
                .filter(Boolean)
                .join(". ")}
            </div>
            <div className="links">
              {shopLinks(p.query).map((l) => (
                <a
                  key={l.shop}
                  href={l.url}
                  target="_blank"
                  rel={AFFILIATE ? "sponsored noreferrer" : "noreferrer"}
                >
                  {t.on(l.shop)}
                </a>
              ))}
            </div>
          </li>
        ))}
      </List>
      <Note>{AFFILIATE ? t.affiliate : t.plain}</Note>
    </>
  );
}
