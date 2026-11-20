// ─────────────────────────────────────────────────────────────────────────────
// Petite infobulle : une icône « i » suivie d'un libellé court, et une bulle
// d'explication au survol, au focus clavier, ou au clic (seul geste possible
// sur mobile). Échap ou un appui ailleurs la referme.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useId, useRef, useState } from "react";
import styled from "styled-components";

const Wrap = styled.span`
  position: relative;
  display: inline-block;
`;

const Trigger = styled.button`
  font: inherit;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border: none;
  background: none;
  color: #64748b;
  cursor: help;
  transition: color 0.2s;

  svg {
    flex: none;
    color: var(--accent);
  }
  &:hover,
  &:focus-visible,
  &[aria-expanded="true"] {
    color: #cbd5e1;
    outline: none;
  }
`;

const Bubble = styled.span`
  position: absolute;
  z-index: 10;
  left: 0;
  bottom: calc(100% + 8px);
  width: max-content;
  max-width: min(300px, calc(100vw - 40px));
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #1e293b;
  background: #0b1220;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  font-size: 13px;
  line-height: 1.6;
  color: #cbd5e1;
  text-align: left;

  opacity: 0;
  transform: translateY(4px);
  pointer-events: none;
  transition:
    opacity 0.18s,
    transform 0.18s;

  ${Wrap}:hover &,
  ${Trigger}:focus-visible + &,
  &[data-open="true"] {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
`;

function Icon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.6" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 7.2v4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
    </svg>
  );
}

export default function Info({ label, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef(null);

  // Ouverte au toucher : un appui ailleurs ou Échap la referme.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onDown = (e) => !wrap.current?.contains(e.target) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <Wrap ref={wrap}>
      <Trigger
        type="button"
        aria-expanded={open}
        aria-describedby={id}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon />
        {label}
      </Trigger>
      <Bubble id={id} role="tooltip" data-open={open}>
        {children}
      </Bubble>
    </Wrap>
  );
}
