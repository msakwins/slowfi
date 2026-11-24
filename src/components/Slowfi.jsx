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
import Legal from "./Legal.jsx";
import AppPage from "./AppPage.jsx";
import { desktop } from "../ui/desktop.js";
import UpdateBanner from "../ui/UpdateBanner.jsx";
import TitleBar, { TITLE_BAR_HEIGHT } from "../ui/TitleBar.jsx";
import Sidebar, { SIDEBAR_WIDTH, SIDEBAR_BREAK } from "../ui/Sidebar.jsx";
import Sensors from "./Sensors.jsx";
import DiagnosticPage from "./DiagnosticPage.jsx";
import HistoryPage from "./HistoryPage.jsx";

export { GlobalStyle };

// Les adresses restent en français dans les deux langues : une seule adresse
// par page, quel que soit le choix du visiteur.
const PAGES = {
  "/": Home,
  "/confidentialite": Legal,
  "/application": AppPage,
  "/diagnostic": DiagnosticPage,
  "/historique": HistoryPage,
  // Capteurs : page de l'application seulement, un navigateur ne lit pas
  // les sondes.
  ...(desktop ? { "/capteurs": Sensors } : {}),
};

const TEXT = {
  fr: {
    titles: {
      "/": "Slowfi — diagnostic de connexion et de matériel",
      "/confidentialite": "Confidentialité et mentions légales — Slowfi",
      "/application": "Application — Slowfi",
      "/capteurs": "Capteurs — Slowfi",
      "/diagnostic": "Diagnostic approfondi — Slowfi",
      "/historique": "Historique — Slowfi",
    },
    // Pied de page : deux entrées de la page « Confidentialité ».
    nav: {
      "/confidentialite": "Confidentialité",
      "/confidentialite#editeur": "Mentions légales",
    },
    contact: "Contact",
    home: "Slowfi, accueil",
    note: "Aucune donnée personnelle n'est collectée",
    download: "Télécharger l'application",
    downloadShort: "Télécharger",
    app: "Application",
  },
  en: {
    titles: {
      "/": "Slowfi — connection and hardware diagnostics",
      "/confidentialite": "Privacy and legal notice — Slowfi",
      "/application": "App — Slowfi",
      "/capteurs": "Sensors — Slowfi",
      "/diagnostic": "In-depth diagnostic — Slowfi",
      "/historique": "History — Slowfi",
    },
    nav: {
      "/confidentialite": "Privacy",
      "/confidentialite#editeur": "Legal notice",
    },
    contact: "Contact",
    home: "Slowfi, home",
    note: "No personal data is collected",
    download: "Download the app",
    downloadShort: "Download",
    app: "App",
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

const ScrollArea = styled.div`
  position: fixed;
  top: ${TITLE_BAR_HEIGHT}px;
  /* À droite de la barre latérale. */
  left: var(--sidebar, ${SIDEBAR_WIDTH}px);
  transition: left 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  right: 3px;
  bottom: 3px;
  overflow-y: auto;
  overscroll-behavior: contain;
`;

// Sur le site : la page à droite de la barre latérale ; sur téléphone, la
// barre passe en bas et la page garde toute la largeur.
// La page occupe au moins toute la hauteur de la fenêtre : la mention reste
// en bas, même sur une page courte.
const WebShell = styled.div`
  box-sizing: border-box;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding-left: var(--sidebar, ${SIDEBAR_WIDTH}px);
  transition: padding-left 0.2s cubic-bezier(0.22, 1, 0.36, 1);

  & > div:last-child {
    flex: 1;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }
  @media (max-width: ${SIDEBAR_BREAK}px) {
    padding-left: 0;
    padding-bottom: 64px;
  }
`;

const PageIn = styled.div`
  animation: page-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;

  @keyframes page-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
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

// Poussée en bas de la page ; au moins 96 px sous le contenu.
const FooterGap = styled.div`
  flex: none;
  height: 96px;
`;

// Les liens et la mention sur une seule ligne (sur deux si la place manque).
const Footer = styled.footer`
  margin-top: auto;
  font-size: 13px;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 24px;

  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 24px;
  }
  p {
    margin: 0;
    color: #475569;
  }
  /* Un point sépare les liens de la mention. */
  nav + p::before {
    content: "•";
    margin-right: 24px;
    color: #475569;
    font-size: 16px;
    line-height: 0;
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

  // Adresse ouverte avec une ancre (« /confidentialite#editeur ») : la section,
  // une fois la page affichée.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  // Dans l'application, une colonne de 720 px centrée dans la fenêtre, avec
  // des marges égales de chaque côté.
  const page = (
    <Page
      style={
        desktop
          ? { maxWidth: 720, padding: "24px 28px 48px" }
          : // Sur le site, la mention descend presque au bord de la fenêtre.
            { paddingBottom: 24 }
      }
    >
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
      {/* Changement de page : la nouvelle entre en fondu, légèrement montante. */}
      <PageIn key={path}>
        <Current />
      </PageIn>
      {desktop && <UpdateBanner />}
      {/* Dans l'application, pas de pied de page : la barre latérale mène à
          la confidentialité. */}
      {!desktop && <FooterGap aria-hidden="true" />}
      {!desktop && (
        <Footer>
          <nav>
            {Object.keys(t.nav).map((to) => (
              <Link
                key={to}
                to={to}
              >
                {t.nav[to]}
              </Link>
            ))}
            <a href="mailto:contact@slowfi.app">{t.contact}</a>
          </nav>
          <p>{t.note}</p>
        </Footer>
      )}
    </Page>
  );

  // Sur le site, la page défile avec la fenêtre du navigateur. Dans
  // l'application, seule la zone sous la barre de titre défile : la barre de
  // défilement commence sous les boutons, un peu en retrait du bord.
  if (!desktop)
    return (
      <WebShell>
        <Sidebar path={path} top={0} />
        {page}
      </WebShell>
    );
  return (
    <>
      <TitleBar />
      <Sidebar path={path} top={TITLE_BAR_HEIGHT} />
      <ScrollArea id="scroll-root">{page}</ScrollArea>
    </>
  );
}
