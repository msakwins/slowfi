// ─────────────────────────────────────────────────────────────────────────────
// Briques de la saisie guidée : une étape (« où trouver l'information »), puis
// des champs courts, deux par ligne.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useId } from "react";
import styled from "styled-components";
import { useLang } from "./i18n.jsx";

export const Guide = styled.section`
  & + & {
    margin-top: 28px;
  }

  .where {
    display: flex;
    gap: 10px;
    margin: 0 0 14px;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.6;
    color: #cbd5e1;
  }
  .n {
    flex: none;
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 12px;
    line-height: 1.6rem;
    color: var(--accent);
  }
  .path {
    color: var(--accent-light);
    font-weight: 600;
  }
`;

export const Fields = styled.div`
  display: grid;
  grid-template-columns: repeat(${(p) => p.$cols || 2}, minmax(0, 1fr));
  gap: 14px 16px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Box = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;

  .hint {
    color: #475569;
  }

  input,
  select {
    width: 100%;
    font: inherit;
    font-size: 14px;
    padding: 10px 12px;
    color: #e2e8f0;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 10px;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }
  input::placeholder {
    color: #475569;
  }
  input:focus,
  select:focus {
    outline: none;
    border-color: rgb(var(--accent-rgb) / 0.6);
    box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.15);
  }
`;

/** Ligne de la saisie : libellé, aide facultative, puis le champ. */
export function Field({ label, hint, children }) {
  return (
    <Box>
      <span>
        {label}
        {hint && <span className="hint"> · {hint}</span>}
      </span>
      {children}
    </Box>
  );
}

/**
 * Champ numérique, sans flèches, qui accepte la virgule. L'exemple est
 * préfixé (« ex. 16 ») pour ne pas passer pour une valeur déjà remplie.
 */
export function NumberInput({ value, onChange, placeholder, ...rest }) {
  const eg = useLang().lang === "fr" ? "ex. " : "e.g. ";
  placeholder = placeholder && eg + placeholder;
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  );
}

/** Liste déroulante ; `options` : [[valeur, libellé], …]. */
export function Select({ value, onChange, options, placeholder }) {
  const id = useId();
  return (
    <select
      id={id}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder ?? "—"}</option>
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

/** Une étape de la saisie : son numéro, où aller, puis ses champs. */
export function GuideStep({ n, where, children }) {
  return (
    <Guide>
      <p className="where">
        <span className="n">{n}</span>
        <span>{where}</span>
      </p>
      {children}
    </Guide>
  );
}
