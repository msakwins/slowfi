// ─────────────────────────────────────────────────────────────────────────────
// Historique, sous les résultats du diagnostic complet : ce qui a changé
// depuis l'analyse précédente, la liste des analyses, et la copie en ligne
// chiffrée (code privé) pour la garder d'un appareil ou d'un navigateur à
// l'autre.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useLang } from "./i18n.jsx";
import { Ghost, SEVERITY } from "./theme.js";
import Arrow from "./Arrow.jsx";
import { makeSnapshot, compareSnapshots } from "../lib/snapshots.js";
import { newCode, normalizeCode } from "../lib/vault.js";
import {
  loadHistory,
  loadCode,
  recordLocal,
  clearLocal,
  syncOnline,
  forgetOnline,
} from "./historyStore.js";

const TEXT = {
  fr: {
    title: "Historique",
    empty: "Aucune analyse enregistrée : lancer un diagnostic approfondi",
    first:
      "Première analyse enregistrée sur cet appareil. La prochaine sera comparée à celle-ci",
    since: (d) => `Depuis l'analyse du ${d}`,
    fixed: "Résolu",
    added: "Nouveau",
    changed: "Changé",
    same: "Aucun changement depuis l'analyse précédente",
    past: (n) =>
      `${n} analyse${n > 1 ? "s" : ""} enregistrée${n > 1 ? "s" : ""}`,
    levels: {
      ok: "Bon état",
      warning: "À surveiller",
      problem: "Problème détecté",
    },
    local:
      "Enregistré sur cet appareil seulement. Le code privé garde l'historique en ligne, chiffré : Slowfi ne peut pas le lire",
    keep: "Garder l'historique en ligne",
    have: "J'ai déjà un code",
    codeLabel: "Code privé",
    codeNote:
      "À noter et garder : il permet de retrouver l'historique sur un autre appareil ou dans l'application. Perdu, l'historique en ligne est perdu",
    copy: "Copier",
    copied: "Copié",
    use: "Utiliser ce code",
    placeholder: "slow-XXXX-XXXX-XXXX-XXXX",
    syncing: "Synchronisation…",
    synced: "Historique en ligne à jour",
    disabled: "Historique en ligne indisponible pour le moment",
    error: "Synchronisation impossible, réessayer plus tard",
    unknown: "Code inconnu : vérifier qu'il est bien recopié",
    invalid: "Ce code n'a pas le bon format",
    forget: "Ne plus garder en ligne",
    clear: "Effacer l'historique de cet appareil",
  },
  en: {
    title: "History",
    empty: "No analysis saved: run an in-depth diagnostic",
    first:
      "First analysis saved on this device. The next one will be compared with it",
    since: (d) => `Since the analysis of ${d}`,
    fixed: "Fixed",
    added: "New",
    changed: "Changed",
    same: "No change since the previous analysis",
    past: (n) => `${n} analys${n > 1 ? "es" : "is"} saved`,
    levels: {
      ok: "Good condition",
      warning: "To watch",
      problem: "Problem detected",
    },
    local:
      "Saved on this device only. The private code keeps the history online, encrypted: Slowfi cannot read it",
    keep: "Keep the history online",
    have: "I already have a code",
    codeLabel: "Private code",
    codeNote:
      "Write it down and keep it: it brings the history back on another device or in the app. Lost, the online history is lost",
    copy: "Copy",
    copied: "Copied",
    use: "Use this code",
    placeholder: "slow-XXXX-XXXX-XXXX-XXXX",
    syncing: "Syncing…",
    synced: "Online history up to date",
    disabled: "Online history unavailable for now",
    error: "Sync failed, try again later",
    unknown: "Unknown code: check it was copied correctly",
    invalid: "This code does not have the right format",
    forget: "Stop keeping it online",
    clear: "Clear this device's history",
  },
};

const Box = styled.section`
  margin-top: 36px;
  padding-top: 4px;
`;

const Head = styled.p`
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  color: #64748b;
`;

const Line = styled.p`
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: #e2e8f0;
`;

const Small = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
  max-width: 62ch;
`;

const Diff = styled.ul`
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
  font-size: 14px;
  color: #e2e8f0;

  li {
    display: flex;
    gap: 10px;
    align-items: baseline;
  }
  .tag {
    flex: none;
    min-width: 72px;
    font-size: 12px;
    font-weight: 700;
    color: var(--tag);
  }
  .to {
    display: inline-flex;
    vertical-align: -2px;
    color: #64748b;
  }
`;

const Runs = styled.ul`
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  color: #94a3b8;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 0;
    border-top: 1px solid #111a2e;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--dot);
    flex: none;
  }
`;

const Code = styled.div`
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #1e293b;
  background: #0b1220;
  font-family: ui-monospace, monospace;
  font-size: 15px;
  color: #e2e8f0;
`;

const Input = styled.input`
  font: inherit;
  font-family: ui-monospace, monospace;
  font-size: 14px;
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px solid #1e293b;
  background: #0b1220;
  color: #e2e8f0;
  width: 260px;
  max-width: 100%;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin: 10px 0 0 -8px;
`;

/**
 * @param {{ res: object, download?: number|null }} props
 */
export default function HistoryPanel({ res, download, page }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [list, setList] = useState(loadHistory);
  const [code, setCode] = useState(loadCode);
  const [status, setStatus] = useState(null);
  const [typing, setTyping] = useState(null); // null, ou le texte saisi
  const [copied, setCopied] = useState(false);
  const saved = useRef(null);

  const when = (t0) =>
    new Date(t0).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Chaque nouveau résultat est enregistré (un relevé par analyse).
  useEffect(() => {
    if (!res || saved.current === res) return;
    saved.current = res;
    const next = recordLocal(makeSnapshot(res, { download }));
    setList(next);
    if (code) {
      setStatus("syncing");
      syncOnline(code).then((r) => {
        setList(r.list);
        setStatus(r.status === "ok" ? "synced" : r.status);
      });
    }
    // Le code n'entre pas en jeu : il ne doit pas réenregistrer l'analyse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res, download]);

  const sync = async (c, opts) => {
    setStatus("syncing");
    const r = await syncOnline(c, opts);
    setList(r.list);
    if (r.status === "ok") {
      setCode(c);
      setTyping(null);
      setStatus("synced");
    } else setStatus(r.status);
  };

  const [current, previous] = list;
  const diff = current && previous ? compareSnapshots(previous, current) : null;
  const tagColor = {
    fixed: SEVERITY.ok.color,
    added: SEVERITY.warning.color,
    changed: "#94a3b8",
  };

  return (
    <Box>
      {/* Sur la page « Historique », le titre de la page suffit. */}
      {!page && <Head>{t.title}</Head>}
      {!current ? (
        <Line>{t.empty}</Line>
      ) : !previous ? (
        <Line>{t.first}</Line>
      ) : (
        <>
          <Line>{t.since(when(previous.t))}</Line>
          {diff.fixed.length + diff.added.length + diff.changed.length === 0 ? (
            <Small>{t.same}</Small>
          ) : (
            <Diff>
              {diff.fixed.map((f) => (
                <li key={`f-${f.id}`} style={{ "--tag": tagColor.fixed }}>
                  <span className="tag">{t.fixed}</span>
                  {f.title}
                </li>
              ))}
              {diff.added.map((f) => (
                <li key={`a-${f.id}`} style={{ "--tag": tagColor.added }}>
                  <span className="tag">{t.added}</span>
                  {f.title}
                </li>
              ))}
              {diff.changed.map((c) => (
                <li key={`c-${c.key}`} style={{ "--tag": tagColor.changed }}>
                  <span className="tag">{t.changed}</span>
                  <span>
                    {c.label} : {c.from}
                    {c.unit && ` ${c.unit}`}{" "}
                    <span className="to">
                      <Arrow />
                    </span>{" "}
                    {c.to}
                    {c.unit && ` ${c.unit}`}
                  </span>
                </li>
              ))}
            </Diff>
          )}
        </>
      )}

      {list.length > 1 && (
        <>
          <Small>{t.past(list.length)}</Small>
          <Runs>
            {list.slice(0, 8).map((s) => (
              <li key={s.t}>
                <span
                  className="dot"
                  style={{ "--dot": SEVERITY[s.level]?.color ?? "#64748b" }}
                />
                {when(s.t)}
                <span>{t.levels[s.level] ?? ""}</span>
              </li>
            ))}
          </Runs>
        </>
      )}

      {/* Copie en ligne chiffrée. */}
      {code ? (
        <>
          <Code>
            {t.codeLabel} : {code}
            <Ghost
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  // Presse-papiers refusé : le code reste lisible à l'écran.
                }
              }}
            >
              {copied ? t.copied : t.copy}
            </Ghost>
          </Code>
          <Small>{t.codeNote}</Small>
        </>
      ) : (
        <Small>{t.local}</Small>
      )}
      {status && <Small>{t[status]}</Small>}

      {typing != null && (
        <Row>
          <Input
            value={typing}
            onChange={(e) => setTyping(e.target.value)}
            placeholder={t.placeholder}
            aria-label={t.codeLabel}
            spellCheck={false}
          />
          <Ghost
            onClick={() => {
              const c = normalizeCode(typing);
              if (!c) setStatus("invalid");
              else sync(c, { restore: true });
            }}
          >
            {t.use}
          </Ghost>
        </Row>
      )}

      <Row>
        {!code && (
          <>
            <Ghost onClick={() => sync(newCode())}>{t.keep}</Ghost>
            {typing == null && (
              <Ghost onClick={() => setTyping("")}>{t.have}</Ghost>
            )}
          </>
        )}
        {code && (
          <Ghost
            onClick={async () => {
              await forgetOnline(code);
              setCode(null);
              setStatus(null);
            }}
          >
            {t.forget}
          </Ghost>
        )}
        {list.length > 0 && (
          <Ghost
            onClick={() => {
              clearLocal();
              setList([]);
              saved.current = res;
            }}
          >
            {t.clear}
          </Ghost>
        )}
      </Row>
    </Box>
  );
}
