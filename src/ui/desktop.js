// Pont vers l'application desktop (Electron) : présent seulement quand la page
// tourne dans l'application, absent sur le site.
import { appSystem } from "../lib/commands.js";

/** @type {{ platform: string, run: (script: string) => Promise<string> } | null} */
export const desktop =
  typeof window !== "undefined" && window.slowfi ? window.slowfi : null;

/** Système de la machine, quand la page tourne dans l'application. */
export const desktopSystem = desktop ? appSystem(desktop.platform) : null;

// Dans l'application, la page porte data-app sur <html> : les styles propres à
// l'application (logo plus petit…) s'y accrochent.
if (desktop && typeof document !== "undefined")
  document.documentElement.dataset.app = "";
