// ─────────────────────────────────────────────────────────────────────────────
// Mises à jour de pilotes : pour chaque composant, la version installée face à
// la dernière que Windows Update distribue (catalogue Microsoft Update, lu par
// /api/drivers) ou publiée par NVIDIA. La recherche part d'elle-même une fois
// les résultats affichés ; la recherche par IA sur les sites AMD, Intel et
// Realtek (/api/driver-ai) seulement à la demande.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useLang } from "./i18n.jsx";
import { driverState, withAi } from "../lib/drivers.js";
import { aiVendor } from "../lib/aiDriver.js";
import { desktop } from "./desktop.js";
import { nvidiaVersion } from "../lib/vendors.js";

// Sur le site, une fonction Vercel ; dans l'application, le processus
// principal ; en développement, le serveur Vite. Même adresse partout.
const API = "/api/drivers";

const TEXT = {
  fr: {
    title: "Mises à jour des pilotes",
    intro: "Version installée comparée à la dernière disponible",
    sources: {
      nvidia: "Site NVIDIA",
      amd: "Site AMD",
      "windows-update": "Windows Update",
    },
    latest: (v) => `Dernière version : ${v}`,
    aiSource: (vendor) => `Site ${vendor}, trouvé par IA`,
    aiPackage: (p) => `Pack ${p.packageVersion} sur le site du fabricant`,
    aiButton: (vendors) => `Chercher sur les sites ${vendors}`,
    aiNote:
      "Recherche via Google Gemini : nom et identifiant des composants transmis à Google",
    aiRunning: "Recherche sur les sites des fabricants…",
    aiQuota: "Quota gratuit de recherche épuisé, réessayer demain",
    aiDisabled: "Recherche par IA indisponible pour le moment",
    and: "et",
    page: "Page du pilote",
    download: (v) => `Télécharger la version ${v}`,
    optional: "Ouvrir les mises à jour facultatives de Windows",
    searching: "Recherche…",
    current: "À jour",
    update: (v) => `${v} disponible`,
    unknown: "Absent du catalogue",
    failed: "Recherche impossible",
    months: [
      "janv.",
      "févr.",
      "mars",
      "avr.",
      "mai",
      "juin",
      "juil.",
      "août",
      "sept.",
      "oct.",
      "nov.",
      "déc.",
    ],
  },
  en: {
    title: "Driver updates",
    intro: "Installed version compared with the latest available",
    sources: {
      nvidia: "NVIDIA site",
      amd: "AMD site",
      "windows-update": "Windows Update",
    },
    latest: (v) => `Latest version: ${v}`,
    aiSource: (vendor) => `${vendor} site, found by AI`,
    aiPackage: (p) => `Package ${p.packageVersion} on the maker's site`,
    aiButton: (vendors) => `Search the ${vendors} sites`,
    aiNote:
      "Search via Google Gemini: component names and identifiers are sent to Google",
    aiRunning: "Searching the makers' sites…",
    aiQuota: "Free search quota used up, try again tomorrow",
    aiDisabled: "AI search unavailable for now",
    and: "and",
    page: "Driver page",
    download: (v) => `Download version ${v}`,
    optional: "Open Windows optional updates",
    searching: "Searching…",
    current: "Up to date",
    update: (v) => `${v} available`,
    unknown: "Not in the catalog",
    failed: "Search failed",
    months: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
  },
};

const Head = styled.p`
  margin: 32px 0 0;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 500;
  color: #8fb3c4;
`;

const Intro = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
  max-width: 62ch;
`;

const List = styled.ul`
  margin: 12px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    padding: 9px 0;
    border-top: 1px solid #111a2e;
    font-size: 14px;
    line-height: 1.5;
  }
  .name {
    color: #cdeef6;
  }
  .sub {
    display: block;
    font-size: 13px;
    color: #64748b;
    font-family: ui-monospace, monospace;
  }
  .state {
    flex: none;
    font-size: 13px;
    font-weight: 600;
    text-align: right;
  }
  .current {
    color: #34d399;
  }
  .update {
    color: #fbbf24;
  }
  .info {
    color: #8fb3c4;
  }
  .muted {
    color: #64748b;
    font-weight: 400;
  }
  .state .sub {
    font-family: inherit;
    font-weight: 400;
  }
  a {
    display: inline-block;
    margin-top: 2px;
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    text-decoration: none;
  }
`;

/**
 * @param {{ drivers: { name: string, version: string, date: {year:number, month:number}|null, key: string }[] }} props
 */
export default function DriverUpdates({ drivers }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  // Résultat par identifiant : undefined (en cours), null (échec), ou
  // { latest, vendor } (catalogue et site du fabricant).
  const [found, setFound] = useState({});
  // Recherche IA (Google Gemini) : retirée de l'interface ; aucun résultat.
  const ai = {};
  const keys = drivers.map((d) => d.key).join("|");

  useEffect(() => {
    let alive = true;
    for (const d of drivers) {
      fetch(`${API}?id=${encodeURIComponent(d.key)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(
          (body) => alive && setFound((f) => ({ ...f, [d.key]: body })),
          () => alive && setFound((f) => ({ ...f, [d.key]: null })),
        );
    }
    return () => {
      alive = false;
    };
    // Une nouvelle recherche seulement quand la liste des composants change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys]);

  if (drivers.length === 0) return null;

  const catalogDate = (iso) => {
    if (!iso) return "";
    const [y, m] = iso.split("-").map(Number);
    return `${t.months[m - 1]} ${y}`;
  };

  return (
    <>
      <Head>{t.title}</Head>
      <Intro>{t.intro}</Intro>
      <List>
        {drivers.map((d) => {
          const r = found[d.key];
          let state;
          let link = null;
          let shown = null;
          // Lien direct sûr : l'installateur officiel de NVIDIA, ou les
          // mises à jour facultatives de Windows (application seulement).
          let direct = null;
          if (r === undefined) {
            state = <span className="muted">{t.searching}</span>;
          } else if (r === null) {
            state = <span className="muted">{t.failed}</span>;
          } else {
            const st = withAi(driverState(d, r), d, ai[d.key]);
            const sourceName =
              st.source === "ai"
                ? t.aiSource(aiVendor(d.key).name)
                : t.sources[st.source];
            const where = [
              sourceName,
              catalogDate(st.date),
              st.aiPackage && t.aiPackage(st.aiPackage),
            ]
              .filter(Boolean)
              .join(", ");
            state =
              st.status === "unknown" ? (
                <span className="muted">{t.unknown}</span>
              ) : (
                <span className={st.status}>
                  {st.status === "update"
                    ? t.update(st.version)
                    : st.status === "info"
                      ? t.latest(st.version)
                      : t.current}
                  <span className="sub">{where}</span>
                </span>
              );
            link = st.url;
            shown = st.source === "nvidia" ? nvidiaVersion(d.version) : null;
            if (st.download)
              direct = { href: st.download, label: t.download(st.version) };
            else if (
              desktop &&
              st.status === "update" &&
              st.source === "windows-update"
            )
              direct = {
                href: "ms-settings:windowsupdate-optionalupdates",
                label: t.optional,
              };
          }
          return (
            <li key={d.key}>
              <span className="name">
                {d.name}
                <span className="sub">{shown ?? d.version}</span>
                {direct && (
                  <a
                    href={direct.href}
                    target="_blank"
                    rel="noreferrer"
                    className="direct"
                  >
                    {direct.label}
                  </a>
                )}
                {link && (
                  <a href={link} target="_blank" rel="noreferrer">
                    {t.page}
                  </a>
                )}
              </span>
              <span className="state">{state}</span>
            </li>
          );
        })}
      </List>
    </>
  );
}
