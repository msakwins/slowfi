// ─────────────────────────────────────────────────────────────────────────────
// La marque : trois arcs de signal, dont le plus large n'arrive pas jusqu'au
// bout. C'est l'idée du nom en une image — le signal est là, mais il ne porte
// pas aussi loin qu'il le devrait.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import styled from "styled-components";

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
`;

const Mark = styled.svg`
  width: 30px;
  height: 30px;
  flex: none;
  overflow: visible;
`;

const Word = styled.span`
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: lowercase;
  color: #e2e8f0;

  b {
    color: #22d3ee;
    font-weight: 700;
  }
`;

export default function Logo() {
  return (
    <Wrap>
      <Mark viewBox="0 0 32 32" fill="none" aria-hidden="true">
        {/* Le point d'émission, net. */}
        <circle cx="16" cy="23.5" r="2.4" fill="#22d3ee" />
        {/* Deux arcs pleins : le signal proche passe. */}
        <path
          d="M11.76 19.76 A6 6 0 0 1 20.24 19.76"
          stroke="#22d3ee"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M8.93 16.93 A10 10 0 0 1 23.07 16.93"
          stroke="#22d3ee"
          strokeWidth="2.6"
          strokeLinecap="round"
          opacity="0.75"
        />
        {/* Le troisième décroche : pointillé, éteint. */}
        <path
          d="M6.1 14.1 A14 14 0 0 1 25.9 14.1"
          stroke="#475569"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray="3 5"
        />
      </Mark>
      <Word>
        slow<b>fi</b>
      </Word>
    </Wrap>
  );
}
