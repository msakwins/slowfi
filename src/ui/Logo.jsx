// ─────────────────────────────────────────────────────────────────────────────
// La marque : le w de slowfi devient un tracé d'électrocardiogramme. La lettre
// est déjà un zigzag, donc le dessin ne force rien — et un électro dit
// « diagnostic » sans dire « panne ».
//
// Texte blanc, tracé bleu avec un halo : le contraste met le tracé en avant,
// c'est lui qu'on regarde en premier. Le halo ne tient que sur fond sombre,
// à revoir si un thème clair apparaît un jour.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import styled from "styled-components";

const ACCENT = "#22d3ee";

const Word = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 44px;
  font-size: clamp(34px, 5.6vw, 44px);
  font-weight: 700;
  letter-spacing: 0.09em;
  line-height: 1;
  color: #f1f5f9;
  user-select: none;
`;

const Trace = styled.svg`
  width: 1.5em;
  height: 0.9em;
  margin: 0 0.05em;
  flex: none;
  color: ${ACCENT};
  filter: drop-shadow(0 0 5px ${ACCENT}) drop-shadow(0 0 13px ${ACCENT});
`;

export default function Logo() {
  return (
    <Word aria-label="slowfi">
      <span aria-hidden="true">slo</span>
      <Trace viewBox="0 0 38 24" fill="none" aria-hidden="true">
        <path
          d="M1.5 14H5l3.8 7 4.6-15 4.6 15 3.6-10 2.6 3H36"
          stroke="currentColor"
          strokeWidth="2.7"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Trace>
      <span aria-hidden="true">fi</span>
    </Word>
  );
}
