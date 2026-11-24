// ─────────────────────────────────────────────────────────────────────────────
// Petite infobulle : une icône « i » suivie d'un libellé court, et une bulle
// d'explication au survol, au focus clavier, ou au clic (seul geste possible
// sur mobile). Échap ou un appui ailleurs la referme.
//
// La bulle est posée par-dessus toute la page (portail, position fixe), à
// partir de la position de l'icône : aucun bloc parent ne peut la couper, et
// elle reste dans la fenêtre, au-dessus ou au-dessous selon la place.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

const MAX = 300; // largeur maximale de la bulle
const MARGIN = 12; // écart minimal avec les bords de la fenêtre

const Wrap = styled.span`
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
  position: fixed;
  z-index: 1000;
  width: max-content;
  max-width: min(${MAX}px, calc(100vw - ${MARGIN * 2}px));
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #1e293b;
  background: #0b1220;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  font-size: 13px;
  line-height: 1.6;
  color: #cbd5e1;
  text-align: left;
  animation: bubble-in 0.18s ease-out both;

  @keyframes bubble-in {
    from {
      opacity: 0;
      transform: translateY(var(--from, 4px));
    }
    to {
      opacity: 1;
      transform: none;
    }
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
  // Ouverte au clic (reste ouverte) ou au survol / focus (tant qu'il dure).
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState(null);
  const id = useId();
  const wrap = useRef(null);
  const bubble = useRef(null);
  const open = pinned || hover;

  // Position : sous ou sur l'icône selon la place, décalée vers la gauche si
  // elle dépasserait le bord droit.
  const place = () => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(MAX, window.innerWidth - MARGIN * 2);
    const left = Math.max(
      MARGIN,
      Math.min(r.left, window.innerWidth - width - MARGIN),
    );
    const below = r.top < 180;
    setPos(
      below
        ? { left, top: r.bottom + 8, from: "-4px" }
        : { left, bottom: window.innerHeight - r.top + 8, from: "4px" },
    );
  };

  // Ouverte : Échap ou un appui ailleurs la referme ; un défilement aussi,
  // la bulle ne suivant pas l'icône.
  useEffect(() => {
    if (!open) return;
    const close = () => {
      setPinned(false);
      setHover(false);
    };
    const onKey = (e) => e.key === "Escape" && close();
    const onDown = (e) =>
      !wrap.current?.contains(e.target) &&
      !bubble.current?.contains(e.target) &&
      close();
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <Wrap
      ref={wrap}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        place();
        setHover(true);
      }}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}
    >
      <Trigger
        type="button"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onFocus={() => {
          place();
          setHover(true);
        }}
        onBlur={() => setHover(false)}
        onClick={() => {
          place();
          setPinned((p) => !p);
        }}
      >
        <Icon />
        {label}
      </Trigger>
      {open &&
        pos &&
        createPortal(
          <Bubble
            ref={bubble}
            id={id}
            role="tooltip"
            style={{
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              "--from": pos.from,
            }}
          >
            {children}
          </Bubble>,
          document.body,
        )}
    </Wrap>
  );
}
