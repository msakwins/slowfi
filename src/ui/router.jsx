// ─────────────────────────────────────────────────────────────────────────────
// Navigation entre les pages, avec de vraies adresses plutôt que des ancres :
// chaque page peut être indexée et partagée. Vercel sert un fichier HTML par
// page (scripts/prerender.mjs), et index.html pour le reste (vercel.json).
//
// Sur le site, chaque page a deux adresses : française (« /application ») et
// anglaise (« /en/app »). Le code ne manie que l'adresse française ; le
// routeur la traduit à l'affichage selon la langue de l'adresse courante.
// Dans l'application, une seule adresse par page : la langue est un réglage.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import { desktop } from "./desktop.js";

/** Adresse anglaise de chaque page, à partir de l'adresse française. */
export const EN_PATHS = {
  "/": "/en",
  "/application": "/en/app",
  "/diagnostic": "/en/diagnostic",
  "/historique": "/en/history",
  "/depannage": "/en/troubleshooting",
  "/confidentialite": "/en/privacy",
};
const FR_PATHS = Object.fromEntries(
  Object.entries(EN_PATHS).map(([fr, en]) => [en, fr]),
);

/** Page (adresse française) et langue d'une adresse du site. */
export function fromUrl(pathname) {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (FR_PATHS[p]) return { path: FR_PATHS[p], lang: "en" };
  if (p.startsWith("/en/")) return { path: p.slice(3), lang: "en" };
  return { path: p, lang: "fr" };
}

/** Adresse d'une page (française, ancre comprise) dans une langue. */
export function toUrl(to, lang) {
  if (desktop || lang !== "en") return to;
  const [path, hash] = to.split("#");
  const en = EN_PATHS[path] ?? `/en${path}`;
  return hash ? `${en}#${hash}` : en;
}

const listeners = new Set();
const urlLang = () => fromUrl(window.location.pathname).lang;

function go(url, { replace = false } = {}) {
  const [pathname, hash] = url.split("#");
  const here = pathname === window.location.pathname;
  if (here && !hash && !replace) return;
  window.history[replace ? "replaceState" : "pushState"](null, "", url);
  // Dans l'application, la page défile dans sa propre zone (Slowfi.jsx).
  const root = document.getElementById("scroll-root") ?? window;
  if (!hash && !replace) root.scrollTo(0, 0);
  listeners.forEach((fn) => fn(window.location.pathname));
  // Une ancre (« #editeur ») : la section, une fois la page affichée.
  if (hash)
    requestAnimationFrame(() =>
      document
        .getElementById(hash)
        ?.scrollIntoView({ behavior: here ? "smooth" : "auto" }),
    );
}

/** Ouvre une page (adresse française), dans la langue de l'adresse courante. */
export function navigate(to) {
  go(toUrl(to, desktop ? "fr" : urlLang()));
}

/** La même page dans l'autre langue (site seulement). */
export function switchUrlLang(lang, opts) {
  const { path } = fromUrl(window.location.pathname);
  go(toUrl(path + window.location.hash, lang), opts);
}

function useLocation() {
  const [pathname, setPathname] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    listeners.add(setPathname);
    window.addEventListener("popstate", onPop);
    return () => {
      listeners.delete(setPathname);
      window.removeEventListener("popstate", onPop);
    };
  }, []);
  return pathname;
}

/** Page courante, par son adresse française. */
export function usePath() {
  const pathname = useLocation();
  return desktop ? pathname : fromUrl(pathname).path;
}

/** Langue de l'adresse courante (site seulement). */
export function useUrlLang() {
  return fromUrl(useLocation()).lang;
}

// Lien interne : navigation sans rechargement, mais un vrai <a href> pour
// l'ouverture dans un nouvel onglet et pour les moteurs de recherche.
export function Link({ to, onClick, ...rest }) {
  const lang = useUrlLang();
  return (
    <a
      href={toUrl(to, lang)}
      onClick={(e) => {
        onClick?.(e);
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey
        )
          return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    />
  );
}
