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
import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Command, Textarea, Ghost, Button, Pending } from "./theme.js";
import { desktop, desktopSystem } from "./desktop.js";
import { appScript } from "../lib/commands.js";
import { useText, Segmented } from "./i18n.jsx";
import Info from "./Info.jsx";

const TEXT = {
  fr: {
    open: {
      windows: "Coller cette commande dans le terminal, puis appuyer sur Entrée",
      mac: "Coller cette commande dans le terminal, puis appuyer sur Entrée",
      linux: "Coller cette commande dans le terminal, puis appuyer sur Entrée",
    },
    // Détails, dans la bulle « i » à côté de l'étape 1.
    openHow: "Comment faire ?",
    openHelp: {
      windows:
        "Ouvrir le menu Démarrer, taper « PowerShell » puis appuyer sur Entrée. Dans la fenêtre qui s'ouvre, coller la commande avec Ctrl + V ou un clic droit, puis appuyer sur Entrée",
      mac: "Ouvrir Spotlight avec ⌘ + Espace, taper « Terminal » puis appuyer sur Entrée. Dans la fenêtre qui s'ouvre, coller la commande avec ⌘ + V, puis appuyer sur Entrée",
      linux:
        "Ouvrir un terminal avec Ctrl + Alt + T (Ubuntu) ou depuis le menu des applications. Coller la commande avec Ctrl + Maj + V, puis appuyer sur Entrée",
    },
    system: "Système",
    method: "Façon de procéder",
    methods: { command: "Avec une commande", manual: "Sans commande" },
    manualIntro:
      "Reporter les valeurs indiquées, lues dans les réglages. L'analyse se met à jour à chaque champ rempli, et aucun n'est obligatoire",
    about: "Que fait cette commande ?",
    copy: "Copier",
    copied: "Copiée",
    paste: {
      windows: "Coller ici le résultat (Ctrl + V)",
      mac: "Coller ici le résultat (⌘ + V)",
      linux:
        "Sélectionner tout le texte du terminal (clic droit › Tout sélectionner), le copier (Ctrl + Maj + C), puis le coller ici",
    },
    pasteButton: "Coller depuis le presse-papiers",
    running: "Analyse en cours",
    rerun: "Relancer l'analyse",
    failed: "La lecture n'a rien renvoyé",
    example: "Voir un exemple",
    clear: "Effacer",
  },
  en: {
    open: {
      windows: "Paste this command into the terminal, then press Enter",
      mac: "Paste this command into the terminal, then press Enter",
      linux: "Paste this command into the terminal, then press Enter",
    },
    openHow: "How?",
    openHelp: {
      windows:
        "Open the Start menu, type “PowerShell” and press Enter. In the window that opens, paste the command with Ctrl + V or a right-click, then press Enter",
      mac: "Open Spotlight with ⌘ + Space, type “Terminal” and press Enter. In the window that opens, paste the command with ⌘ + V, then press Enter",
      linux:
        "Open a terminal with Ctrl + Alt + T (Ubuntu) or from the applications menu. Paste the command with Ctrl + Shift + V, then press Enter",
    },
    system: "System",
    method: "How to proceed",
    methods: { command: "With a command", manual: "Without a command" },
    manualIntro:
      "Copy the values shown, read from the settings. The analysis updates with each field filled in, and none is required",
    about: "What does this command do?",
    copy: "Copy",
    copied: "Copied",
    paste: {
      windows: "Paste the result here (Ctrl + V)",
      mac: "Paste the result here (⌘ + V)",
      linux:
        "Select all the terminal text (right-click › Select All), copy it (Ctrl + Shift + C), then paste it here",
    },
    pasteButton: "Paste from clipboard",
    running: "Analyzing",
    rerun: "Run the analysis again",
    failed: "The reading returned nothing",
    example: "Show an example",
    clear: "Clear",
  },
};

const SYSTEMS = [
  ["windows", "Windows"],
  ["mac", "macOS"],
  ["linux", "Linux"],
];

// Le système du visiteur, d'après le navigateur. Windows par défaut : c'est
// le cas le plus courant, et le seul choix possible sur mobile.
function detectSystem() {
  const p =
    navigator.userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent;
  if (/mac/i.test(p)) return "mac";
  // Android se déclare aussi « Linux » : écarté, une commande n'y a pas de sens.
  if (/linux/i.test(p) && !/android/i.test(navigator.userAgent)) return "linux";
  return "windows";
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
 *   manualProps?: object,           props supplémentaires de la saisie guidée
 *   children: (result: any) => React.ReactNode,
 * }} props
 */
export default function PasteStep({
  variants,
  placeholder,
  analyze,
  empty,
  manual: Manual,
  manualProps,
  onResult,
  onRunning,
  quiet,
  children,
}) {
  const [system, setSystem] = useState(() => {
    if (desktopSystem) return desktopSystem;
    const detected = detectSystem();
    return variants[detected] ? detected : "windows";
  });
  const [method, setMethod] = useState("command");
  const [manualResult, setManualResult] = useState(null);
  const { command, example, about } = variants[system];
  const [raw, setRaw] = useState("");
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);
  const pre = useRef(null);
  const t = useText(TEXT);

  // Le résultat se déduit du texte collé : pas d'état à synchroniser, pas de
  // bouton « Analyser ».
  const pasted = useMemo(
    () => (raw.trim() ? analyze(raw) : null),
    [raw, analyze],
  );
  const result = method === "manual" ? manualResult : pasted;

  // Pour qui affiche les résultats ailleurs (le diagnostic complet, étape par
  // étape) : chaque nouveau résultat lui est transmis.
  useEffect(() => {
    onResult?.(result);
  }, [result, onResult]);

  const run = async () => {
    setRunning(true);
    onRunning?.(true);
    setFailed(false);
    try {
      const out = await desktop.run(appScript(system, command));
      setRaw(out);
      setFailed(!out.trim());
    } finally {
      setRunning(false);
      onRunning?.(false);
    }
  };
  // La commande change avec les analyses choisies : chaque nouvelle commande
  // est relancée.
  useEffect(() => {
    if (desktop) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command]);

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

  if (desktop) {
    return (
      <>
        <Step>
          {running ? (
            quiet ? null : (
              <Pending>{t.running}</Pending>
            )
          ) : (
            <Button onClick={run}>{t.rerun}</Button>
          )}
        </Step>
        {failed && <Empty>{t.failed}</Empty>}
        {!running && raw.trim() && !result && <Empty>{empty}</Empty>}
        {result && children && <div>{children(result)}</div>}
      </>
    );
  }

  return (
    <>
      <Systems>
        <div className="choice">
          <Segmented role="group" aria-label={t.system}>
            {SYSTEMS.filter(([code]) => variants[code]).map(([code, name]) => (
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
          <Manual
            key={system}
            system={system}
            onResult={setManualResult}
            {...manualProps}
          />
        </>
      ) : (
        <>
          <Step>
            <Label>
              <span className="n">1</span>
              <span>
                {t.open[system]}{" "}
                <Info label={t.openHow}>{t.openHelp[system]}</Info>
              </span>
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
              {t.paste[system]}
            </Label>
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={placeholder}
              spellCheck={false}
            />
            <Links>
              {/* Lecture du presse-papiers : le navigateur demande l'accord du
                  visiteur ; en cas de refus, Ctrl + V reste possible. */}
              {navigator.clipboard?.readText && (
                <Ghost
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setRaw(text);
                    } catch {
                      // Accès refusé : rien à faire, le collage au clavier marche.
                    }
                  }}
                >
                  {t.pasteButton}
                </Ghost>
              )}
              <Ghost onClick={() => setRaw(example)}>{t.example}</Ghost>
              {raw && <Ghost onClick={() => setRaw("")}>{t.clear}</Ghost>}
            </Links>
          </Step>
        </>
      )}

      {method === "command" && raw.trim() && !result && <Empty>{empty}</Empty>}
      {/* Conteneur neutre : le verdict garde sa propre animation d'ouverture,
          même placé dans un bloc qui anime déjà ses enfants. */}
      {result && children && <div>{children(result)}</div>}
    </>
  );
}
