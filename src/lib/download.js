// ─────────────────────────────────────────────────────────────────────────────
// Téléchargement de l'application desktop.
//
// Les installateurs sont joints aux releases GitHub. Plutôt que de deviner
// leurs adresses (un lien vers un fichier absent mène à une page d'erreur
// GitHub), la page demande la dernière release publiée et lie les fichiers
// réellement présents. Sans release publiée, rien n'est lié.
// ─────────────────────────────────────────────────────────────────────────────

export const RELEASES = "https://github.com/msakwins/slowfi/releases";
export const LATEST_API =
  "https://api.github.com/repos/msakwins/slowfi/releases/latest";

export const OS_NAMES = { windows: "Windows", mac: "macOS", linux: "Linux" };

/** Système du visiteur, d'après le navigateur ; Windows par défaut. */
export function visitorOs(userAgent) {
  if (/Mac/i.test(userAgent) && !/iPhone|iPad/i.test(userAgent)) return "mac";
  if (/Linux/i.test(userAgent) && !/Android/i.test(userAgent)) return "linux";
  return "windows";
}

/**
 * Fichiers d'une release → un lien par format.
 * @param {{ assets?: { name: string, browser_download_url: string }[] }} release
 * @returns {{ windows?: string, mac?: string, appImage?: string, deb?: string }}
 */
export function pickDownloads(release) {
  const out = {};
  for (const a of release?.assets ?? []) {
    const url = a.browser_download_url;
    // Windows : l'installateur Squirrel (Slowfi-Setup.exe) d'abord ; l'ancien
    // installateur ne sert plus qu'aux mises à jour des copies déjà installées.
    if (/setup\.exe$/i.test(a.name)) out.windows = url;
    else if (/\.exe$/i.test(a.name) && !/blockmap/i.test(a.name))
      out.windows ??= url;
    else if (/\.dmg$/i.test(a.name)) out.mac ??= url;
    else if (/\.AppImage$/i.test(a.name)) out.appImage ??= url;
    else if (/\.deb$/i.test(a.name)) out.deb ??= url;
  }
  return out;
}

/** Lien principal pour un système (Linux : l'AppImage, qui marche partout). */
export function mainDownload(files, os) {
  return os === "linux" ? (files.appImage ?? files.deb) : files[os];
}
