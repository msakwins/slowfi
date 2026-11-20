// ─────────────────────────────────────────────────────────────────────────────
// Flèche dessinée, à la place des caractères → et ←.
//
// Les flèches typographiques changent de forme et de graisse d'une police à
// l'autre, et paraissent maigres à côté du tracé du logo. Un SVG au même trait
// arrondi reste identique partout et suit la couleur du texte (currentColor).
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";

/**
 * @param {{ back?: boolean }} props back : flèche vers la gauche (retour)
 */
export default function Arrow({ back = false }) {
  return (
    <svg
      className={back ? "arrow back" : "arrow"}
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <path
        d={back ? "M13.5 8H3M7 4L3 8l4 4" : "M2.5 8h10.5M9 4l4 4-4 4"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
