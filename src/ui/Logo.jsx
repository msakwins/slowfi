// ─────────────────────────────────────────────────────────────────────────────
// La marque : pas de pictogramme posé à côté du mot, mais dedans. Le « o » de
// slowfi est un rond — donc déjà la bonne forme pour contenir un signal. On le
// remplace par un anneau avec une onde et son point d'émission.
//
// L'avantage sur un logo séparé : rien à accorder entre deux objets, et le nom
// reste lisible même si le dessin ne l'est plus, à très petite taille.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import styled from "styled-components";

const Word = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0.09em;
  color: #22d3ee;
  line-height: 1;
  user-select: none;
`;

// Le « o » : même diamètre apparent que la hauteur d'x des autres lettres, et
// posé sur la même ligne de base.
const Oh = styled.svg`
  width: 0.82em;
  height: 0.82em;
  margin: 0 0.06em;
  flex: none;
  transform: translateY(0.055em);
`;

export default function Logo() {
  return (
    <Word aria-label="slowfi">
      <span aria-hidden="true">sl</span>
      <Oh viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9.6" stroke="currentColor" strokeWidth="2.7" />
        <path
          d="M8.1 13.1 A5.3 5.3 0 0 1 15.9 13.1"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <circle cx="12" cy="15.7" r="1.5" fill="currentColor" />
      </Oh>
      <span aria-hidden="true">wfi</span>
    </Word>
  );
}
