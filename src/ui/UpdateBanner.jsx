// ─────────────────────────────────────────────────────────────────────────────
// Bandeau de mise à jour (application desktop) : une nouvelle version est
// prête, redémarrer pour l'installer ; sur macOS, un lien pour la télécharger.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useText } from "./i18n.jsx";
import { desktop } from "./desktop.js";

const TEXT = {
  fr: {
    ready: (v) => `Version ${v} prête`,
    available: (v) => `Version ${v} disponible`,
    restart: "Redémarrer",
    download: "Télécharger",
    later: "Plus tard",
  },
  en: {
    ready: (v) => `Version ${v} ready`,
    available: (v) => `Version ${v} available`,
    restart: "Restart",
    download: "Download",
    later: "Later",
  },
};

const Bar = styled.div`
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: calc(100% - 32px);
  padding: 10px 12px 10px 18px;
  border-radius: 999px;
  border: 1px solid rgb(34 211 238 / 0.45);
  background: #0b1220;
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.45);
  font-size: 14px;
  color: #cdeef6;

  button,
  a {
    font: inherit;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    text-decoration: none;
  }
  .go {
    background: #22d3ee;
    color: #020617;
  }
  .later {
    background: none;
    color: #64748b;
  }
  .later:hover {
    color: #8fb3c4;
  }
`;

export default function UpdateBanner() {
  const t = useText(TEXT);
  const [update, setUpdate] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!desktop?.onUpdate) return undefined;
    desktop.updateState().then((s) => s && setUpdate(s));
    return desktop.onUpdate(setUpdate);
  }, []);

  if (!update || hidden) return null;
  const ready = update.status === "ready";

  return (
    <Bar role="status">
      <span>
        {ready ? t.ready(update.version) : t.available(update.version)}
      </span>
      {ready ? (
        <button className="go" onClick={() => desktop.installUpdate()}>
          {t.restart}
        </button>
      ) : (
        <a className="go" href={update.url} target="_blank" rel="noreferrer">
          {t.download}
        </a>
      )}
      <button className="later" onClick={() => setHidden(true)}>
        {t.later}
      </button>
    </Bar>
  );
}
