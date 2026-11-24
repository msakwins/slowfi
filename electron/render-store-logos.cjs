// Génère docs/store/logos/ : affiche 9:16 et carré 1:1 de la fiche du
// Microsoft Store, avec le logo « slowfi » du site (le w en tracé lumineux)
// sur le fond sombre de l'application. Tailles minimales acceptées par le
// Store (720 × 1080 et 1080 × 1080) : Electron ne rend pas une fenêtre plus
// haute que l'écran.
//   npx electron electron/render-store-logos.cjs
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const OUT = path.join(__dirname, "..", "docs", "store", "logos");
const LOGOS = [
  { file: "affiche-9x16.png", w: 720, h: 1080, font: 125 },
  { file: "carre-1x1.png", w: 1080, h: 1080, font: 180 },
];

const page = ({ w, h, font }) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: ${w}px; height: ${h}px; background: #020617; overflow: hidden; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #f1f5f9;
         display: flex; align-items: center; justify-content: center; }
  .word { display: flex; align-items: center; font-size: ${font}px; font-weight: 700; letter-spacing: 0.09em; line-height: 1; }
  /* Comme le logo du site : 1,5 em × 0,9 em, tracé 38 × 24, halo en ombre. */
  svg { width: 1.5em; height: 0.9em; margin: 0 0.05em; flex: none; overflow: visible;
        filter: drop-shadow(0 0 ${font * 0.1}px rgba(34,211,238,.6)) drop-shadow(0 0 ${font * 0.25}px rgba(34,211,238,.6)); }
</style></head><body>
  <div class="word">slo<svg viewBox="0 0 38 24" fill="none" stroke="#22d3ee" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1.5 14H5l3.8 7 4.6-15 4.6 15 3.6-10 2.6 3H36" stroke-width="2.7"/>
  </svg>fi</div>
</body></html>`;

app.on("window-all-closed", () => {});

app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const logo of LOGOS) {
    const win = new BrowserWindow({
      width: logo.w,
      height: logo.h,
      show: false,
      frame: false,
      useContentSize: true,
      enableLargerThanScreen: true,
      webPreferences: { offscreen: true, zoomFactor: 1 },
    });
    const tmp = path.join(os.tmpdir(), "slowfi-store-logo.html");
    fs.writeFileSync(tmp, page(logo));
    await win.loadFile(tmp);
    await new Promise((r) => setTimeout(r, 600));
    const image = (await win.webContents.capturePage()).resize({
      width: logo.w,
      height: logo.h,
      quality: "best",
    });
    fs.writeFileSync(path.join(OUT, logo.file), image.toPNG());
    win.destroy();
    fs.rmSync(tmp, { force: true });
  }
  console.log("ok");
  app.quit();
});
