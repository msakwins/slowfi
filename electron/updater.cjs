// ─────────────────────────────────────────────────────────────────────────────
// Mises à jour de l'application, depuis les releases GitHub publiées.
//
// - Windows et Linux (AppImage) : la nouvelle version se télécharge en fond,
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

function setupUpdates() {
  ipcMain.handle("slowfi:update-state", () => state);

  if (!app.isPackaged || process.argv.includes("--smoke")) return;
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
    if (state?.status === "ready") autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdates().catch(() => {});
}

module.exports = { setupUpdates };
