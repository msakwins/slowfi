// ─────────────────────────────────────────────────────────────────────────────
// Page « Application » : ce que l'application ajoute au site, le
// téléchargement pour chaque système, et comment l'ouvrir la première fois.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Title, Lead, Button } from "../ui/theme.js";
import { useText } from "../ui/i18n.jsx";
import {
  RELEASES,
  LATEST_API,
  OS_NAMES,
  visitorOs,
  pickDownloads,
  mainDownload,
} from "../lib/download.js";

// Fiche du Microsoft Store : sous Windows, le téléchargement principal
// (paquet signé par Microsoft, sans avertissement à l'installation).
const STORE = "https://apps.microsoft.com/detail/9pj85b7s6txc";

const TEXT = {
  fr: {
    title: "Application",
    lead: "Diagnostic de connexion, de matériel et de périphériques pour Windows, macOS et Linux",
    more: "Uniquement dans l'application",
    items: [
      "Températures de la carte graphique, de la carte mère et des disques",
      "Usure des SSD",
      "Ventilateur de la carte graphique",
      "Charge du processeur, de la mémoire et de la carte graphique, suivie pendant une minute",
    ],
    download: "Téléchargement",
    button: (os) => `Télécharger pour ${os}`,
    store: "Télécharger sur le Microsoft Store",
    direct: "Ou télécharger le fichier d'installation",
    others: "Aussi pour",
    and: "et",
    // Linux : deux formats, selon la distribution.
    appImage: "AppImage",
    appImageFor: "toutes distributions, sans installation",
    deb: ".deb",
    debFor: "Ubuntu, Debian et dérivées",
    or: "ou",
    loading: "Recherche de la dernière version…",
    soon: "Bientôt disponible",
    none: "Aucune version n'est encore publiée",
    failed:
      "Impossible de joindre GitHub. Les fichiers restent disponibles sur",
    releasesPage: "la page des versions",
    open: "Première ouverture",
    unsigned:
      "Au premier lancement, Windows et macOS peuvent afficher un avertissement de sécurité",
    openWindows:
      "Windows, fichier d'installation : dans la fenêtre « Windows a protégé votre ordinateur », cliquer sur « Informations complémentaires », puis « Exécuter quand même ». Depuis le Microsoft Store, aucun avertissement",
    openMac:
      "macOS : clic droit sur Slowfi dans le dossier Applications, puis « Ouvrir », et confirmer",
    privacy: "Confidentialité",
    privacyText:
      "Aucune donnée personnelle n'est collectée",
  },
  en: {
    title: "App",
    lead: "Connection, hardware and device diagnostics for Windows, macOS and Linux",
    more: "Only in the app",
    items: [
      "Graphics card, motherboard and drive temperatures",
      "SSD wear",
      "Graphics card fan",
      "Processor, memory and graphics card load, tracked for one minute",
    ],
    download: "Download",
    button: (os) => `Download for ${os}`,
    store: "Download from the Microsoft Store",
    direct: "Or download the installer file",
    others: "Also for",
    and: "and",
    appImage: "AppImage",
    appImageFor: "any distribution, no install",
    deb: ".deb",
    debFor: "Ubuntu, Debian and derivatives",
    or: "or",
    loading: "Looking for the latest version…",
    soon: "Coming soon",
    none: "No version has been published yet",
    failed: "Unable to reach GitHub. The files are still available on",
    releasesPage: "the releases page",
    open: "First launch",
    unsigned:
      "On first launch, Windows and macOS may display a security warning",
    openWindows:
      "Windows, installer file: in the “Windows protected your PC” window, click “More info”, then “Run anyway”. From the Microsoft Store, no warning",
    openMac:
      "macOS: right-click Slowfi in the Applications folder, then “Open”, and confirm",
    privacy: "Privacy",
    privacyText:
      "No personal data is collected",
  },
};

const Body = styled.div`
  color: #8fb3c4;
  font-size: 15px;
  line-height: 1.8;
  max-width: 62ch;

  h2 {
    margin: 40px 0 16px;
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 500;
    color: #8fb3c4;
  }
  /* Le premier intertitre, juste sous l'introduction. */
  h2:first-child {
    margin-top: 12px;
  }
  p {
    margin: 0;
  }
  p + p {
    margin-top: 10px;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    position: relative;
    padding-left: 18px;
    color: #cdeef6;
  }
  li::before {
    content: "";
    position: absolute;
    left: 2px;
    top: 0.72em;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22d3ee;
  }
  a {
    color: #22d3ee;
    font-weight: 600;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  .sub {
    font-size: 13px;
    color: #64748b;
  }
`;

/**
 * Dernière release publiée sur GitHub.
 * @returns {{ state: "loading"|"ready"|"none"|"failed", files: object }}
 */
function useLatestRelease() {
  const [rel, setRel] = useState({ state: "loading", files: {} });
  useEffect(() => {
    let live = true;
    fetch(LATEST_API, { headers: { Accept: "application/vnd.github+json" } })
      .then((res) => {
        // 404 : aucune release publiée (les brouillons ne comptent pas).
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((json) => {
        if (!live) return;
        const files = pickDownloads(json);
        setRel({
          state: Object.keys(files).length ? "ready" : "none",
          files,
        });
      })
      .catch(() => live && setRel({ state: "failed", files: {} }));
    return () => {
      live = false;
    };
  }, []);
  return rel;
}

export default function AppPage() {
  const t = useText(TEXT);
  const os = visitorOs(navigator.userAgent);
  const { state, files } = useLatestRelease();
  const main = mainDownload(files, os);
  // Les deux autres systèmes, s'ils ont un fichier.
  const others = ["windows", "mac", "linux"]
    .filter((k) => k !== os)
    .map((k) => [k, k === "windows" ? STORE : mainDownload(files, k)])
    .filter(([, url]) => url);
  const linux = (
    <>
      <a href={files.appImage}>{t.appImage}</a> ({t.appImageFor}) {t.or}{" "}
      <a href={files.deb}>{t.deb}</a> ({t.debFor})
    </>
  );

  return (
    <>
      <Title>{t.title}</Title>
      <Lead>{t.lead}</Lead>

      <Body>
        <h2>{t.more}</h2>
        <ul>
          {t.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t.download}</h2>
        {os === "windows" ? (
          <>
            <Button
              as="a"
              $primary
              href={STORE}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none", color: undefined }}
            >
              {t.store}
            </Button>
            {main && (
              <p className="sub" style={{ marginTop: 14 }}>
                <a href={main}>{t.direct}</a>
              </p>
            )}
          </>
        ) : main ? (
          <Button
            as="a"
            $primary
            href={main}
            style={{ textDecoration: "none", color: undefined }}
          >
            {t.button(OS_NAMES[os])}
          </Button>
        ) : (
          <Button disabled>{state === "loading" ? t.loading : t.soon}</Button>
        )}

        {state === "ready" && (
          <>
            {others.length > 0 && (
              <p style={{ marginTop: 14 }}>
                {t.others}{" "}
                {others.map(([k, url], i) => (
                  <React.Fragment key={k}>
                    {i > 0 && ` ${t.and} `}
                    <a href={url}>{OS_NAMES[k]}</a>
                  </React.Fragment>
                ))}
              </p>
            )}
            {files.appImage && files.deb && (
              <p className="sub">
                {OS_NAMES.linux} : {linux}
              </p>
            )}
          </>
        )}
        {state === "none" && (
          <p className="sub" style={{ marginTop: 14 }}>
            {t.none}
          </p>
        )}
        {state === "failed" && (
          <p className="sub" style={{ marginTop: 14 }}>
            {t.failed}{" "}
            <a href={RELEASES} target="_blank" rel="noreferrer">
              {t.releasesPage}
            </a>
          </p>
        )}

        <h2>{t.open}</h2>
        <p>{t.unsigned}</p>
        <p>{t.openWindows}</p>
        <p>{t.openMac}</p>

        <h2>{t.privacy}</h2>
        <p>
          {t.privacyText}
        </p>
        {/* Mention demandée par SignPath sur la page de téléchargement. */}
        <p>
          Code signing provided by{" "}
          <a href="https://about.signpath.io/" target="_blank" rel="noreferrer">
            SignPath.io
          </a>
          , certificate by{" "}
          <a href="https://signpath.org/" target="_blank" rel="noreferrer">
            SignPath Foundation
          </a>{" "}
          (
          <a
            href="https://github.com/msakwins/slowfi/blob/main/CODE_SIGNING_POLICY.md"
            target="_blank"
            rel="noreferrer"
          >
            code signing policy
          </a>
          )
        </p>
      </Body>
    </>
  );
}
