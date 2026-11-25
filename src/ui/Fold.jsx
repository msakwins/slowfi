// ─────────────────────────────────────────────────────────────────────────────
// Liste repliable, fermée d'office, en tête d'un bloc de résultats (« Liste du
// matériel analysé », détails de la connexion, périphériques détectés) : le
// verdict passe en premier à l'œil, la liste s'ouvre au besoin. La même dans
// les trois analyses.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import styled from "styled-components";

const FoldHead = styled.button`
  font: inherit;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  margin: 0 0 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 500;
  color: #8fb3c4;

  svg {
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  &[aria-expanded="true"] svg {
    transform: rotate(180deg);
  }
  &:hover,
  &:focus-visible {
    color: var(--accent);
    outline: none;
  }
`;


/** @param {{ title: string, children: React.ReactNode }} props */
export default function Fold({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fold">
      <FoldHead
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {title}
        <svg
          viewBox="0 0 16 16"
          width="12"
          height="12"
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
      </FoldHead>
      {open && (
        <div className="fold-body" style={{ margin: "24px 0 16px" }}>
          {children}
        </div>
      )}
    </div>
  );
}
