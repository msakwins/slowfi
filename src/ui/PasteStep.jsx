// ─────────────────────────────────────────────────────────────────────────────
// L'étape commune aux analyses approfondies : copier une commande, la lancer
// dans un terminal, coller le résultat. Une commande par système (Windows,
// macOS), le système du visiteur étant choisi d'office.
//
// Pour qui préfère ne pas lancer de commande, une saisie guidée (`manual`)
// indique où lire chaque valeur dans les réglages ; le verdict est le même.
//
// Un navigateur n'a pas le droit de lire la configuration Wi-Fi ni le matériel
// de la machine : ce copier-coller est le seul geste qui reste à l'utilisateur.
// Tout le reste est automatique — l'analyse part dès que le résultat est collé,
// sans bouton à presser.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Command, Textarea, Ghost } from "./theme.js";
import { useText, Segmented } from "./i18n.jsx";
import Info from "./Info.jsx";

const TEXT = {
  fr: {
    open: {
      windows:
        "Ouvrir le Terminal, PowerShell ou l'Invite de commandes depuis le menu Démarrer, puis y coller cette commande",
      mac: "Ouvrir le Terminal (Applications › Utilitaires), puis y coller cette commande",
    },
    system: "Système",
    method: "Façon de procéder",
    methods: { command: "Avec une commande", manual: "Sans commande" },
    manualIntro:
      "Reporter les valeurs indiquées, lues dans les réglages. L'analyse se met à jour à chaque champ rempli, et aucun n'est obligatoire",
    about: "Que fait cette commande ?",
    copy: "Copier",
    copied: "Copiée",
    paste: "Coller ici le résultat",
    example: "Voir un exemple",
    clear: "Effacer",
  },
  en: {
    open: {
      windows:
        "Open Terminal, PowerShell or Command Prompt from the Start menu, then paste this command",
      mac: "Open Terminal (Applications › Utilities), then paste this command",
    },
    system: "System",
    method: "How to proceed",
    methods: { command: "With a command", manual: "Without a command" },
    manualIntro:
      "Copy the values shown, read from the settings. The analysis updates with each field filled in, and none is required",
    about: "What does this command do?",
    copy: "Copy",
    copied: "Copied",
    paste: "Paste the result here",
    example: "Show an example",
    clear: "Clear",
  },
};

const SYSTEMS = [
  ["windows", "Windows"],
  ["mac", "macOS"],
];

// Le système du visiteur, d'après le navigateur. Windows par défaut : c'est
// le cas le plus courant, et le seul choix possible ailleurs (Linux, mobile).
function detectSystem() {
  const p =
    navigator.userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent;
  return /mac/i.test(p) ? "mac" : "windows";
}

const Systems = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 24px;
  margin-bottom: 20px;

  .choice {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  font-size: 13px;
  color: #64748b;
`;

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

const Intro = styled.p`
  margin: 0 0 20px;
  max-width: 62ch;
  font-size: 13px;
  line-height: 1.7;
  color: #64748b;
`;

const Empty = styled.p`
  margin: 16px 0 0;
  font-size: 14px;
  color: #fb7185;
`;

/**
 * @param {{
 *   variants: Record<"windows"|"mac", { command: string, example: string, about?: React.ReactNode }>,
 *   placeholder: string,
 *   analyze: (raw: string) => any,  résultat, ou null si rien n'est reconnu
 *   empty: React.ReactNode,          message quand rien n'est reconnu
 *   manual?: React.ComponentType<{ system: string, onResult: (r: any) => void }>,
 *                                     saisie guidée, sans commande
 *   children: (result: any) => React.ReactNode,
 * }} props
 */
export default function PasteStep({
  variants,
  placeholder,
  analyze,
  empty,
  manual: Manual,
  children,
}) {
  const [system, setSystem] = useState(detectSystem);
  const [method, setMethod] = useState("command");
  const [manualResult, setManualResult] = useState(null);
  const { command, example, about } = variants[system];
  const [raw, setRaw] = useState("");
  const [copied, setCopied] = useState(false);
  const pre = useRef(null);
  const t = useText(TEXT);

  // Le résultat se déduit du texte collé : pas d'état à synchroniser, pas de
  // bouton « Analyser ».
  const pasted = useMemo(
    () => (raw.trim() ? analyze(raw) : null),
    [raw, analyze],
  );
  const result = method === "manual" ? manualResult : pasted;

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
      <Systems>
        <div className="choice">
          <Segmented role="group" aria-label={t.system}>
            {SYSTEMS.map(([code, name]) => (
              <button
                key={code}
                type="button"
                aria-pressed={system === code}
                onClick={() => {
                  setSystem(code);
                  setCopied(false);
                }}
              >
                {name}
              </button>
            ))}
          </Segmented>
        </div>
        {Manual && (
          <div className="choice">
            <Segmented role="group" aria-label={t.method}>
              {["command", "manual"].map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={method === m}
                  onClick={() => setMethod(m)}
                >
                  {t.methods[m]}
                </button>
              ))}
            </Segmented>
          </div>
        )}
      </Systems>

      {method === "manual" && Manual ? (
        <>
          <Intro>{t.manualIntro}</Intro>
          {/* Une saisie par système : changer de système repart de zéro. */}
          <Manual key={system} system={system} onResult={setManualResult} />
        </>
      ) : (
        <>
          <Step>
            <Label>
              <span className="n">1</span>
              {t.open[system]}
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
        </>
      )}

      {method === "command" && raw.trim() && !result && <Empty>{empty}</Empty>}
      {/* Conteneur neutre : le verdict garde sa propre animation d'ouverture,
          même placé dans un bloc qui anime déjà ses enfants. */}
      {result && <div>{children(result)}</div>}
    </>
  );
}
