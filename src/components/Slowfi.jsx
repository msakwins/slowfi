// ─────────────────────────────────────────────────────────────────────────────
// Coquille de l'application : le logo et le sélecteur de langue, la page
// courante, puis le pied de page.
// Deux pages utiles : l'accueil (les analyses, ouvertes sur place) et les
// vérifications manuelles, plus la page de confidentialité, liées depuis le
// pied de page.
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

export { GlobalStyle };

// Les adresses restent en français dans les deux langues : une seule adresse
// par page, quel que soit le choix du visiteur.
const PAGES = {
  "/": Home,
  "/verifications": ManualChecks,
  "/confidentialite": Legal,
};

const TEXT = {
  fr: {
    titles: {
      "/": "Slowfi — diagnostic de connexion et de matériel",
      "/verifications": "Vérifications manuelles — Slowfi",
      "/confidentialite": "Confidentialité et mentions légales — Slowfi",
    },
    nav: {
      "/": "Analyses",
      "/verifications": "Vérifications manuelles",
      "/confidentialite": "Confidentialité et mentions légales",
    },
    home: "Slowfi, accueil",
    source: "Code source",
    note: "Aucune donnée collectée · Analyses exécutées dans le navigateur",
  },
  en: {
    titles: {
      "/": "Slowfi — connection and hardware diagnostics",
      "/verifications": "Manual checks — Slowfi",
      "/confidentialite": "Privacy and legal notice — Slowfi",
    },
    nav: {
      "/": "Analyses",
      "/verifications": "Manual checks",
      "/confidentialite": "Privacy and legal notice",
    },
    home: "Slowfi, home",
    source: "Source code",
    note: "No data collected · Analyses run in the browser",
  },
};

// Le logo à gauche, le sélecteur à droite, sur la même ligne.
const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
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
        <LangSwitch />
      </Header>
      <Current />
      <Footer>
        <nav>
          {Object.keys(PAGES).map((to) => (
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
        <p>{t.note}</p>
      </Footer>
    </Page>
  );
}
