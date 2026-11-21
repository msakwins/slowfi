// ─────────────────────────────────────────────────────────────────────────────
// Coquille de l'application : le logo et le sélecteur de langue, la page
// courante, puis le pied de page.
// Pages : l'accueil (les analyses, ouvertes sur place), les vérifications
// manuelles, la confidentialité, et l'application à télécharger (liée depuis
// l'en-tête et le pied de page).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect } from "react";
import styled from "styled-components";
import { GlobalStyle, Page } from "../ui/theme.js";
import Logo from "../ui/Logo.jsx";
import { Link, usePath } from "../ui/router.jsx";
import { LangSwitch, useLang } from "../ui/i18n.jsx";
import Home from "./Home.jsx";
import ManualChecks from "./ManualChecks.jsx";
import Legal from "./Legal.jsx";
import AppPage from "./AppPage.jsx";
import { desktop } from "../ui/desktop.js";

export { GlobalStyle };

// Les adresses restent en français dans les deux langues : une seule adresse
// par page, quel que soit le choix du visiteur.
const PAGES = {
  "/": Home,
  "/verifications": ManualChecks,
  "/confidentialite": Legal,
  "/application": AppPage,
};

const TEXT = {
  fr: {
    titles: {
      "/": "Slowfi — diagnostic de connexion et de matériel",
      "/verifications": "Vérifications manuelles — Slowfi",
      "/confidentialite": "Confidentialité et mentions légales — Slowfi",
      "/application": "Application — Slowfi",
    },
    nav: {
      "/": "Analyses",
      "/verifications": "Vérifications manuelles",
      "/confidentialite": "Confidentialité et mentions légales",
    },
    home: "Slowfi, accueil",
    source: "Code source",
    note: "Aucune donnée collectée · Analyses exécutées dans le navigateur",
    download: "Télécharger l'application",
    downloadShort: "Télécharger",
    app: "Application",
    appNote: "Aucune donnée collectée · Analyses exécutées sur cet ordinateur",
  },
  en: {
    titles: {
      "/": "Slowfi — connection and hardware diagnostics",
      "/verifications": "Manual checks — Slowfi",
      "/confidentialite": "Privacy and legal notice — Slowfi",
      "/application": "App — Slowfi",
    },
    nav: {
      "/": "Analyses",
      "/verifications": "Manual checks",
      "/confidentialite": "Privacy and legal notice",
    },
    home: "Slowfi, home",
    source: "Source code",
    note: "No data collected · Analyses run in the browser",
    download: "Download the app",
    downloadShort: "Download",
    app: "App",
    appNote: "No data collected · Analyses run on this computer",
  },
};

// Le logo à gauche, le sélecteur à droite, sur la même ligne.
const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

// Bouton discret, à contour bleu, la couleur de la marque.
const DownloadLink = styled.a`
  font-size: 13px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid rgb(34 211 238 / 0.5);
  color: #67e8f9;
  text-decoration: none;
  white-space: nowrap;
  transition:
    border-color 0.2s,
    background 0.2s;

  .short {
    display: none;
  }
  /* Sur téléphone, le libellé court : le logo et le sélecteur de langue
     doivent tenir sur la même ligne. */
  @media (max-width: 520px) {
    .long {
      display: none;
    }
    .short {
      display: inline;
    }
  }

  &:hover,
  &:focus-visible {
    border-color: #22d3ee;
    background: rgb(34 211 238 / 0.1);
    outline: none;
  }
`;

const HomeLink = styled(Link)`
  display: inline-block;
  color: inherit;
  text-decoration: none;
  &:focus-visible {
    outline: none;
  }
`;

const Footer = styled.footer`
  margin-top: 96px;
  padding-top: 20px;
  border-top: 1px solid #1e293b;
  font-size: 13px;

  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 24px;
  }
  nav + nav {
    margin-top: 12px;
  }
  p {
    margin: 16px 0 0;
    color: #475569;
  }

  a {
    color: #64748b;
    text-decoration: none;
    transition: color 0.2s;
  }
  a:hover,
  a:focus-visible {
    color: #22d3ee;
    outline: none;
  }
  a[aria-current="page"] {
    color: #94a3b8;
  }
`;

export default function Slowfi() {
  const pathname = usePath();
  const path = pathname in PAGES ? pathname : "/";
  const Current = PAGES[path];
  const { lang } = useLang();
  const t = TEXT[lang];

  useEffect(() => {
    document.title = t.titles[path];
  }, [t, path]);

  return (
    <Page>
      <Header>
        <HomeLink to="/" aria-label={t.home}>
          <Logo />
        </HomeLink>
        <Actions>
          {/* Sur le site seulement : dans l'application, inutile. */}
          {!desktop && (
            <DownloadLink as={Link} to="/application">
              <span className="long">{t.download}</span>
              <span className="short">{t.downloadShort}</span>
            </DownloadLink>
          )}
          <LangSwitch />
        </Actions>
      </Header>
      <Current />
      <Footer>
        <nav>
          {Object.keys(PAGES)
            .filter((to) => to !== "/application")
            .map((to) => (
              <Link
                key={to}
                to={to}
                aria-current={path === to ? "page" : undefined}
              >
                {t.nav[to]}
              </Link>
            ))}
          <a
            href="https://github.com/msakwins/slowfi"
            target="_blank"
            rel="noreferrer"
          >
            {t.source}
          </a>
        </nav>
        {!desktop && (
          <nav aria-label={t.app}>
            <Link
              to="/application"
              aria-current={path === "/application" ? "page" : undefined}
            >
              {t.app}
            </Link>
            {/* Pas de lien direct vers les fichiers : la page Application
                vérifie qu'une version est publiée avant de les lier. */}
          </nav>
        )}
        <p>{desktop ? t.appNote : t.note}</p>
      </Footer>
    </Page>
  );
}
