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
import { useText } from "./i18n.jsx";
import Info from "./Info.jsx";

const TEXT = {
  fr: {
    open: "Ouvrir le Terminal, PowerShell ou l'Invite de commandes depuis le menu Démarrer, puis y coller cette commande",
    about: "Que fait cette commande ?",
    copy: "Copier",
    copied: "Copiée",
    paste: "Coller ici le résultat",
    example: "Voir un exemple",
    clear: "Effacer",
  },
  en: {
    open: "Open Terminal, PowerShell or Command Prompt from the Start menu, then paste this command",
    about: "What does this command do?",
    copy: "Copy",
    copied: "Copied",
    paste: "Paste the result here",
    example: "Show an example",
    clear: "Clear",
  },
};

const Step = styled.div`
  & + & {
    margin-top: 24px;
  }
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
    color: var(--accent);
  }
`;

// Le cadre de la commande : la commande défile à gauche, le bouton Copier
// reste fixe à droite, à côté d'elle et non par-dessus, pour ne jamais
// masquer la fin d'une commande longue.
const CommandBox = styled.div`
  display: flex;
  align-items: center;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;

  pre {
    flex: 1;
    min-width: 0;
    margin: 0;
    border: none;
    background: none;
  }
`;

const Copy = styled.button`
  flex: none;
  margin: 0 10px 0 4px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  background: #0b1220;
  color: var(--accent);
  border: 1px solid rgb(var(--accent-rgb) / 0.45);
  transition:
    background 0.2s,
    border-color 0.2s;

  &:hover {
    background: rgb(var(--accent-rgb) / 0.08);
    border-color: rgb(var(--accent-rgb) / 0.8);
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.25);
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
 *   about: React.ReactNode,          ce que fait la commande (infobulle)
 *   children: (result: any) => React.ReactNode,
 * }} props
 */
export default function PasteStep({
  command,
  placeholder,
  example,
  analyze,
  empty,
  about,
  children,
}) {
  const [raw, setRaw] = useState("");
  const [copied, setCopied] = useState(false);
  const pre = useRef(null);
  const t = useText(TEXT);

  // Le résultat se déduit du texte collé : pas d'état à synchroniser, pas de
  // bouton « Analyser ».
  const result = useMemo(
    () => (raw.trim() ? analyze(raw) : null),
    [raw, analyze],
  );

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
          {t.open}
        </Label>
        <CommandBox>
          <Command ref={pre}>{command}</Command>
          <Copy onClick={copy}>{copied ? t.copied : t.copy}</Copy>
        </CommandBox>
        {about && (
          <div style={{ marginTop: 6 }}>
            <Info label={t.about}>{about}</Info>
          </div>
        )}
      </Step>

      <Step>
        <Label>
          <span className="n">2</span>
          {t.paste}
        </Label>
        <Textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
        />
        <Links>
          <Ghost onClick={() => setRaw(example)}>{t.example}</Ghost>
          {raw && <Ghost onClick={() => setRaw("")}>{t.clear}</Ghost>}
        </Links>
      </Step>

      {raw.trim() && !result && <Empty>{empty}</Empty>}
      {/* Conteneur neutre : le verdict garde sa propre animation d'ouverture,
          même placé dans un bloc qui anime déjà ses enfants. */}
      {result && <div>{children(result)}</div>}
    </>
  );
}
