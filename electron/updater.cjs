// ─────────────────────────────────────────────────────────────────────────────
// Mises à jour de l'application, depuis les releases GitHub publiées.
//
// - Windows, installation Squirrel (actuelle) : updater intégré d'Electron et
//   update.electronjs.org (voir setupSquirrelUpdates).
// - Windows (ancien installateur NSIS) et Linux (AppImage) : la nouvelle
//   version se télécharge en fond,
//   puis la page propose de redémarrer ; sinon, elle s'installe à la fermeture.
// - macOS : Apple n'autorise la mise à jour automatique que pour une
//   application signée. En attendant, la page annonce la version et renvoie
//   vers la page de téléchargement.
// - Paquet .deb : mis à jour par le système, pas par l'application.
//
// Rien en développement ni pendant la vérification (--smoke) : seule
// l'application installée cherche des mises à jour.
// ─────────────────────────────────────────────────────────────────────────────
const { app, BrowserWindow, ipcMain } = require("electron");

const RELEASES = "https://github.com/msakwins/slowfi/releases/latest";

/** Dernier état connu, renvoyé à une page qui le demande après coup. */
let state = null;

function notify(next) {
  state = next;
  for (const win of BrowserWindow.getAllWindows())
    win.webContents.send("slowfi:update", state);
}

/**
 * Avant l'installation : la fenêtre de l'application se ferme et la fenêtre
 * de mise à jour (update-splash.cjs) s'affiche, comme à l'installation, le
 * temps que l'installateur prenne le relais.
 */
function withSplash(install) {
  const { showInstalling } = require("./update-splash.cjs");
  for (const win of BrowserWindow.getAllWindows()) win.hide();
  showInstalling(state?.version ?? "");
  setTimeout(install, 1800);
}

/**
 * Installée par Squirrel (Windows) : Update.exe se trouve un dossier au-dessus
 * de l'application.
 */
function installedBySquirrel() {
  const fs = require("node:fs");
  const path = require("node:path");
  return (
    process.platform === "win32" &&
    fs.existsSync(
      path.resolve(path.dirname(process.execPath), "..", "Update.exe"),
    )
  );
}

/**
 * Windows, installation Squirrel : l'updater intégré d'Electron, nourri par
 * update.electronjs.org (gratuit pour les projets libres hébergés sur
 * GitHub), qui lit les releases du dépôt.
 */
function setupSquirrelUpdates() {
  const { autoUpdater } = require("electron");
  autoUpdater.setFeedURL({
    url: `https://update.electronjs.org/msakwins/slowfi/${process.platform}-${process.arch}/${app.getVersion()}`,
  });
  autoUpdater.on("update-downloaded", (_event, _notes, name) => {
    notify({
      status: "ready",
      version: String(name ?? "").replace(/^v/, "") || "",
    });
  });
  autoUpdater.on("error", () => {});
  ipcMain.handle("slowfi:install-update", () => {
    if (state?.status === "ready")
      withSplash(() => autoUpdater.quitAndInstall());
  });
  try {
    autoUpdater.checkForUpdates();
  } catch {
    // Hors ligne : nouvel essai au prochain lancement.
  }
}

function setupUpdates() {
  ipcMain.handle("slowfi:update-state", () => state);

  if (!app.isPackaged || process.argv.includes("--smoke")) return;
  if (installedBySquirrel()) return setupSquirrelUpdates();
  // Paquet .deb : electron-updater ne peut pas le remplacer lui-même.
  if (process.platform === "linux" && !process.env.APPIMAGE) return;

  // Chargé seulement dans l'application installée.
  const { autoUpdater } = require("electron-updater");
  const manual = process.platform === "darwin";
  autoUpdater.autoDownload = !manual;
  autoUpdater.autoInstallOnAppQuit = true;
  // Pas de journal sur disque : rien n'est conservé. SLOWFI_UPDATE_LOG=1
  // affiche les étapes dans le terminal, pour vérifier.
  autoUpdater.logger = process.env.SLOWFI_UPDATE_LOG ? console : null;

  autoUpdater.on("update-available", (info) => {
    if (manual)
      notify({ status: "available", version: info.version, url: RELEASES });
  });
  autoUpdater.on("update-downloaded", (info) => {
    notify({ status: "ready", version: info.version });
  });
  // Hors ligne, release absente… : on réessaiera au prochain lancement.
  autoUpdater.on("error", () => {});

  ipcMain.handle("slowfi:install-update", () => {
    // Installation silencieuse, puis relance : les étapes de l'installateur
    // ne servent qu'à la première installation, pas aux mises à jour.
    if (state?.status === "ready")
      withSplash(() => autoUpdater.quitAndInstall(true, true));
  });

  autoUpdater.checkForUpdates().catch(() => {});
}

module.exports = { setupUpdates };
