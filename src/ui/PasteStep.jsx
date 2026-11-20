// ─────────────────────────────────────────────────────────────────────────────
// L'étape commune aux analyses approfondies : copier une commande, la lancer
// dans PowerShell, coller le résultat.
//
// Un navigateur n'a pas le droit de lire la configuration Wi-Fi ni le matériel
// de la machine : ce copier-coller est le seul geste qui reste à l'utilisateur.
// Tout le reste est automatique — l'analyse part dès que le résultat est collé,
// sans bouton à presser.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Command, Textarea, Ghost } from "./theme.js";

const Step = styled.div`
  & + & { margin-top: 24px; }
`;

const Label = styled.p`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 500;
  color: #cbd5e1;

  .n {
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 12px;
    color: #22d3ee;
  }
`;

// Le bouton vit sur la ligne du titre, pas sur la commande : une commande
// longue défile sous lui sans qu'il en masque la fin.
const Copy = styled.button`
  margin-left: auto;
  align-self: center;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  background: #0b1220;
  color: #22d3ee;
  border: 1px solid rgba(34, 211, 238, 0.45);
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    background: rgba(34, 211, 238, 0.08);
    border-color: rgba(34, 211, 238, 0.8);
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.25);
  }
`;

const Links = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
  margin-left: -8px;
  font-size: 13px;
`;

const Empty = styled.p`
  margin: 16px 0 0;
  font-size: 14px;
  color: #fb7185;
`;

/**
 * @param {{
 *   command: string,
 *   placeholder: string,
 *   example: string,
 *   analyze: (raw: string) => any,  résultat, ou null si rien n'est reconnu
 *   empty: React.ReactNode,          message quand rien n'est reconnu
 *   children: (result: any) => React.ReactNode,
 * }} props
 */
export default function PasteStep({ command, placeholder, example, analyze, empty, children }) {
  const [raw, setRaw] = useState("");
  const [copied, setCopied] = useState(false);
  const pre = useRef(null);

  // Le résultat se déduit du texte collé : pas d'état à synchroniser, pas de
  // bouton « Analyser ».
  const result = useMemo(() => (raw.trim() ? analyze(raw) : null), [raw, analyze]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers refusé : on sélectionne la commande, Ctrl+C suffit.
      const range = document.createRange();
      range.selectNodeContents(pre.current);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  return (
    <>
      <Step>
        <Label>
          <span className="n">1</span>
          Ouvrir le Terminal, PowerShell ou l'Invite de commandes depuis le menu Démarrer, puis y
          coller cette commande
          <Copy onClick={copy}>{copied ? "Copiée" : "Copier"}</Copy>
        </Label>
        <Command ref={pre} style={{ margin: 0 }}>
          {command}
        </Command>
      </Step>

      <Step>
        <Label>
          <span className="n">2</span>
          Coller ici le résultat
        </Label>
        <Textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
        />
        <Links>
          <Ghost onClick={() => setRaw(example)}>Voir un exemple</Ghost>
          {raw && <Ghost onClick={() => setRaw("")}>Effacer</Ghost>}
        </Links>
      </Step>

      {raw.trim() && !result && <Empty>{empty}</Empty>}
      {/* Conteneur neutre : le verdict garde sa propre animation d'ouverture,
          même placé dans un bloc qui anime déjà ses enfants. */}
      {result && <div>{children(result)}</div>}
    </>
  );
}
