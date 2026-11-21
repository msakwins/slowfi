// ─────────────────────────────────────────────────────────────────────────────
// Navigation minimale entre les deux pages (accueil, vérifications manuelles).
// De vraies adresses plutôt que des ancres : chaque page peut être indexée et
// partagée. Vercel renvoie index.html pour toutes les adresses (vercel.json).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";

const listeners = new Set();

export function navigate(to) {
  if (to === window.location.pathname) return;
  window.history.pushState(null, "", to);
  // Dans l'application, la page défile dans sa propre zone (Slowfi.jsx).
  (document.getElementById("scroll-root") ?? window).scrollTo(0, 0);
  listeners.forEach((fn) => fn(to));
}

export function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    listeners.add(setPath);
    window.addEventListener("popstate", onPop);
    return () => {
      listeners.delete(setPath);
      window.removeEventListener("popstate", onPop);
    };
  }, []);
  return path;
}

// Lien interne : navigation sans rechargement, mais un vrai <a href> pour
// l'ouverture dans un nouvel onglet et pour les moteurs de recherche.
export function Link({ to, onClick, ...rest }) {
  return (
    <a
      href={to}
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
