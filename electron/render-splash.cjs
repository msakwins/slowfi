// Génère electron/install-splash.gif : l'animation affichée pendant
// l'installation sous Windows (Squirrel). Le logo et la barre aux trois
// couleurs sur une carte sombre aux coins arrondis : le tracé se dessine puis
// s'illumine, la barre se remplit. Hors de la carte, l'image est transparente.
//   npx electron electron/render-splash.cjs
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const W = 460;
const H = 210;
const FRAMES = 36; // 36 images à 50 ms : 1,8 s par boucle

const page = `<!doctype html><html><head><style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; background: transparent; overflow: hidden; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #f1f5f9;
         display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; position: relative; }
  .card { position: absolute; inset: 0; border-radius: 16px; background: #020617; }
  .word, .bar { position: relative; }
  .bar { width: 230px; height: 5px; border-radius: 5px; background: #111a2e; overflow: hidden; }
  .fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #22d3ee, #f97316, #a78bfa); }
  .word { display: flex; align-items: center; font-size: 52px; font-weight: 700; letter-spacing: 0.09em; line-height: 1; }
  /* Comme le logo du site : 1,5 em × 0,9 em, tracé 38 × 24, halo en ombre. */
  svg { width: 1.5em; height: 0.9em; margin: 0 0.05em; flex: none; overflow: visible; }
</style></head><body>
  <div class="card"></div>
  <div class="word">slo<svg id="s" viewBox="0 0 38 24" fill="none" stroke="#22d3ee" stroke-linecap="round" stroke-linejoin="round">
    <path id="p" d="M1.5 14H5l3.8 7 4.6-15 4.6 15 3.6-10 2.6 3H36" stroke-width="2.7"/>
  </svg>fi</div>
  <div class="bar"><div class="fill" id="f"></div></div>
<script>
  const len = document.getElementById("p").getTotalLength();
  document.getElementById("p").style.strokeDasharray = len;
  window.setFrame = (t) => {
    // Tracé : se dessine sur les deux premiers tiers, puis reste plein ; le
    // halo s'allume quand le tracé est complet.
    const a = (0.45 + 0.55 * Math.max(0, (t - 0.66) / 0.34)).toFixed(2);
    document.getElementById("s").style.filter =
      "drop-shadow(0 0 5px rgba(34,211,238," + a + ")) drop-shadow(0 0 13px rgba(34,211,238," + a + "))";
    const draw = Math.min(1, t / 0.66);
    document.getElementById("p").style.strokeDashoffset = len * (1 - draw);
    document.getElementById("f").style.width = (8 + 92 * t) + "%";
  };
</script></body></html>`;

app.on("window-all-closed", () => {});

app.whenReady().then(async () => {
  const { GIFEncoder, quantize, applyPalette } = require("gifenc");
  const win = new BrowserWindow({
    width: W,
    height: H,
    show: false,
    frame: false,
    useContentSize: true,
    transparent: true,
    backgroundColor: "#00000000",
    webPreferences: { offscreen: true, zoomFactor: 1 },
  });
  const tmp = path.join(os.tmpdir(), "slowfi-splash.html");
  fs.writeFileSync(tmp, page);
  await win.loadFile(tmp);
  await new Promise((r) => setTimeout(r, 500));

  const gif = GIFEncoder();
  let last = null;
  for (let i = 0; i < FRAMES; i++) {
    await win.webContents.executeJavaScript(`setFrame(${i / (FRAMES - 1)})`);
    await new Promise((r) => setTimeout(r, 60));
    const image = (await win.webContents.capturePage()).resize({
      width: W,
      height: H,
    });
    last = image;
    // BGRA (Electron) → RGBA (gifenc).
    const bgra = image.toBitmap();
    const rgba = new Uint8Array(bgra.length);
    for (let j = 0; j < bgra.length; j += 4) {
      rgba[j] = bgra[j + 2];
      rgba[j + 1] = bgra[j + 1];
      rgba[j + 2] = bgra[j];
      rgba[j + 3] = bgra[j + 3] < 128 ? 0 : 255;
    }
    const palette = quantize(rgba, 256, { format: "rgba4444", oneBitAlpha: true });
    const transparentIndex = palette.findIndex((c) => c[3] === 0);
    // Dernière image tenue un peu plus longtemps.
    gif.writeFrame(applyPalette(rgba, palette), W, H, {
      palette,
      transparent: transparentIndex >= 0,
      transparentIndex: Math.max(0, transparentIndex),
      delay: i === FRAMES - 1 ? 700 : 50,
    });
  }
  gif.finish();
  // Dernière image en PNG, pour voir le rendu final sans lire le GIF.
  fs.writeFileSync(path.join(__dirname, "install-splash-end.png"), last.toPNG());
  fs.writeFileSync(path.join(__dirname, "install-splash.gif"), gif.bytes());
  fs.rmSync(tmp, { force: true });
  console.log("ok", gif.bytes().length);
  app.quit();
});
