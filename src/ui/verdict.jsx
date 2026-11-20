// ─────────────────────────────────────────────────────────────────────────────
// Affichage d'un verdict + de ses "findings" (constat → correctif).
// Partagé entre le speed test et l'analyseur Wi-Fi : les deux produisent la
// même forme de résultat { severity, findings }, donc le même rendu.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import styled, { keyframes, css } from "styled-components";
import Arrow from "./Arrow.jsx";
import { useLang } from "./i18n.jsx";
import { localize, passedLabel } from "../lib/en.js";

// Le verdict arrive en deux temps, parce qu'un bloc qui surgit d'un coup est
// brutal à double titre : son contenu apparaît d'un seul tenant, et tout ce
// qui suit sur la page saute vers le bas.
//
// 1. La place s'ouvre : la hauteur passe de 0 à sa taille naturelle (une grille
//    à une ligne qui va de 0fr à 1fr, sans avoir à connaître la hauteur), et ce
//    qui est en dessous glisse au lieu de sauter.
// 2. Le contenu monte ensuite pièce par pièce — verdict, chiffres, constats,
//    bouton — pour qu'on lise dans l'ordre plutôt que tout à la fois.
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// La marge négative compense l'espacement du haut, qui sinon apparaîtrait
// d'un coup avant même que la grille commence à s'ouvrir.
const open = keyframes`
  from { grid-template-rows: 0fr; margin-top: calc(-1 * var(--gap, 40px)); }
  to   { grid-template-rows: 1fr; margin-top: 0; }
`;

const appear = keyframes`
  from { opacity: 0; transform: translateY(12px); filter: blur(3px); }
  to   { opacity: 1; transform: none; filter: none; }
`;

// Décalage entre deux pièces, et attente avant la première : on laisse aux
// compteurs des jauges le temps de se poser avant de les interpréter.
const FIRST = 0.25;
const STEP = 0.14;
const PIECES = 8;

const stagger = css`
  ${Array.from(
    { length: PIECES },
    (_, i) =>
      `& > *:nth-child(${i + 1}) { animation-delay: calc(var(--first, ${FIRST}s) + ${i * STEP}s); }`,
  ).join("\n")}
`;

const Reveal = styled.div`
  display: grid;
  animation: ${open} 0.7s ${EASE} both;

  /* Ni cadre ni filet : le verdict vit déjà dans un panneau, et l'écart suffit
     à marquer qu'on passe de la mesure à son interprétation. La marge est à
     l'intérieur pour s'ouvrir avec le reste. */
  /* Le débord masqué rognerait le halo des boutons : on lui laisse 24 px de
     jeu sur les côtés (20 px, soit la marge de la page : au-delà, la page
     défilerait en largeur), repris par une marge négative. */
  .inner {
    min-height: 0;
    overflow: hidden;
    padding: var(--gap, 40px) 20px 24px;
    margin: 0 -20px -24px;
  }

  .inner > * {
    animation: ${appear} 0.7s ${EASE} both;
  }
  .inner {
    ${stagger}
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    .inner > * {
      animation: none;
    }
  }
`;

/**
 * Bloc qui s'ouvre en hauteur, puis révèle ses enfants un par un.
 * @param {{ gap?: number, first?: number }} props
 *   gap   : espace au-dessus, en px (il s'ouvre avec le reste)
 *   first : attente avant le premier enfant, en secondes
 */
export function Unfold({ children, gap, first, style, ...rest }) {
  const vars = {
    ...(gap != null && { "--gap": `${gap}px` }),
    ...(first != null && { "--first": `${first}s` }),
    ...style,
  };
  return (
    <Reveal style={vars} {...rest}>
      <div className="inner">{children}</div>
    </Reveal>
  );
}

// Le verdict d'une analyse : un Unfold avec les réglages par défaut.
export const Verdict = Unfold;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${(p) => p.$color};
  }
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
  ${(p) => (p.$border ? "padding-bottom: 8px;" : "padding-top: 16px;")}

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  .k {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 500;
  }
  .v {
    font-family: ui-monospace, monospace;
    font-size: 20px;
    color: #f1f5f9;
  }
  .u {
    font-size: 14px;
    color: #94a3b8;
    margin-left: 4px;
  }
  /* Valeur en toutes lettres (un nom de carte graphique) : plus petite, pour
     tenir sur une ou deux lignes. */
  .v.text {
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.4;
  }
`;

// Ni cadre ni filet : l'espacement et le titre suffisent à séparer deux
// constats. Multiplier les traits gris alourdissait l'écran.
const FindingCard = styled.div`
  margin-top: 26px;

  h3 {
    margin: 0;
    font-size: 15px;
    color: #f1f5f9;
  }
  .detail {
    font-size: 14px;
    color: #94a3b8;
    line-height: 1.6;
    margin: 6px 0 0;
  }
  .fix {
    font-size: 14px;
    line-height: 1.6;
    margin: 10px 0 0;
    color: #e2e8f0;
  }
  .fix .arrow {
    color: var(--accent);
    vertical-align: -0.15em;
    margin-right: 8px;
  }
`;

// Nombres écrits selon la langue (« 232,3 » en français), sans séparateur
// de milliers pour que les années restent lisibles (« 2019 »).
export function StatCell({ k, value, unit, text }) {
  const { lang } = useLang();
  const shown =
    typeof value === "number"
      ? value.toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", {
          useGrouping: false,
          maximumFractionDigits: 1,
        })
      : value;
  return (
    <Stat>
      <span className="k">{k}</span>
      <span className={text ? "v text" : "v"}>
        {shown ?? "—"}
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

// `engine` dit de quel moteur viennent les constats, pour trouver leur
// traduction anglaise (lib/en.js).
export function Findings({ findings, engine }) {
  const { lang } = useLang();
  return findings
    .map((raw) => localize(raw, lang, engine))
    .map((f) => (
      <FindingCard key={f.id}>
        <h3>{f.title}</h3>
        {f.detail && <p className="detail">{f.detail}</p>}
        {/* Certains constats n'appellent pas de correctif écrit — la suite est
          alors un bouton, pas une phrase. */}
        {f.fix && (
          <p className="fix">
            <Arrow />
            {f.fix}
          </p>
        )}
      </FindingCard>
    ));
}

// Contrôles passés sans anomalie : une ligne courte chacun, sous les constats.
// Ce qui va bien reste ainsi visible, même quand un autre point pose problème.
const PassedList = styled.div`
  margin-top: 18px;

  .head {
    margin: 0 0 8px;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 600;
    color: #64748b;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    gap: 10px;
    padding: 3px 0;
    font-size: 14px;
    line-height: 1.6;
    color: #94a3b8;
  }
  svg {
    flex: none;
    margin-top: 5px;
    color: #34d399;
  }
`;

export function Passed({ items }) {
  const { lang } = useLang();
  if (!items || items.length === 0) return null;
  return (
    <PassedList>
      <p className="head">
        {lang === "fr" ? "Vérifié, sans anomalie" : "Checked, no issue"}
      </p>
      <ul>
        {items.map((p) => (
          <li key={p.id + (p.label ?? "")}>
            <svg
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 8.5l3.2 3L13 4.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {passedLabel(p, lang)}
          </li>
        ))}
      </ul>
    </PassedList>
  );
}
