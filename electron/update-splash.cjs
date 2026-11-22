// ─────────────────────────────────────────────────────────────────────────────
// Fenêtre de mise à jour, à l'image de l'animation d'installation
// (render-splash.cjs) : carte sombre aux coins arrondis, logo qui se dessine,
// barre aux trois couleurs, et une ligne de texte.
// - avant l'installation d'une mise à jour : « Installation de la version … » ;
// - au premier lancement de la nouvelle version : « Version … installée ».
// ─────────────────────────────────────────────────────────────────────────────
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const W = 460;
const H = 210;

const page = (text) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; background: transparent; overflow: hidden; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #f1f5f9;
         display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; position: relative; }
  .card { position: absolute; inset: 0; border-radius: 16px; background: #020617; border: 1px solid #111a2e; }
  .word, .bar, .text { position: relative; }
  .word { display: flex; align-items: center; font-size: 52px; font-weight: 700; letter-spacing: 0.09em; line-height: 1; }
  svg { width: 1.5em; height: 0.9em; margin: 0 0.05em; flex: none; overflow: visible;
        filter: drop-shadow(0 0 5px rgba(34,211,238,.6)) drop-shadow(0 0 13px rgba(34,211,238,.6)); }
  path { stroke-dasharray: 1; animation: draw 1.8s ease-in-out infinite; }
  @keyframes draw { 0% { stroke-dashoffset: 1; } 60%, 100% { stroke-dashoffset: 0; } }
  .bar { width: 230px; height: 5px; border-radius: 5px; background: #111a2e; overflow: hidden; }
  .fill { width: 40%; height: 100%; border-radius: 5px;
          background: linear-gradient(90deg, #22d3ee, #f97316, #a78bfa);
          animation: slide 1.4s ease-in-out infinite; }
  @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
  .text { font-size: 13px; color: #94a3b8; }
</style></head><body>
  <div class="card"></div>
  <div class="word">slo<svg viewBox="0 0 38 24" fill="none" stroke="#22d3ee" stroke-linecap="round" stroke-linejoin="round">
    <path pathLength="1" d="M1.5 14H5l3.8 7 4.6-15 4.6 15 3.6-10 2.6 3H36" stroke-width="2.7"/>
  </svg>fi</div>
  <div class="bar"><div class="fill"></div></div>
  <div class="text">${text}</div>
</body></html>`;

const fr = () => app.getLocale().toLowerCase().startsWith("fr");

/** Ouvre la fenêtre, au centre de l'écran et au-dessus des autres. */
function showSplash(text) {
  const win = new BrowserWindow({
    width: W,
    height: H,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    title: "Slowfi",
  });
  win.loadURL(
    `data:text/html;base64,${Buffer.from(page(text)).toString("base64")}`,
  );
  win.once("ready-to-show", () => win.show());
  return win;
}

/** Juste avant d'installer une mise à jour. */
function showInstalling(version) {
  return showSplash(
    fr()
      ? `Installation de la version ${version}`
      : `Installing version ${version}`,
  );
}

/**
 * Au lancement : si la version a changé depuis le lancement précédent,
 * annonce la nouvelle quelques instants. Rien au tout premier lancement.
 */
function announceIfUpdated() {
  const file = path.join(app.getPath("userData"), "version");
  const version = app.getVersion();
  let previous = null;
  try {
    previous = fs.readFileSync(file, "utf8").trim();
  } catch {
    // Premier lancement, ou dossier illisible.
  }
  try {
    fs.writeFileSync(file, version);
  } catch {
    // Sans écriture possible, pas d'annonce : sans conséquence.
  }
  if (!previous || previous === version) return;
  const win = showSplash(
    fr() ? `Version ${version} installée` : `Version ${version} installed`,
  );
  setTimeout(() => !win.isDestroyed() && win.close(), 2200);
}

module.exports = { showSplash, showInstalling, announceIfUpdated };
