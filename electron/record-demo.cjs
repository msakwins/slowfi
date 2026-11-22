// ─────────────────────────────────────────────────────────────────────────────
// Démo animée de l'application (GIF), pour les présentations :
//   SLOWFI_RECORD=demo.gif SLOWFI_RECORD_LANG=en npx electron .
// Accueil, lancement du diagnostic, analyse en cours, puis défilement des
// résultats. L'attente de l'analyse n'est pas filmée en entier.
// Outil de développement : n'est pas inclus dans l'application publiée.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require("node:fs");

const WIDTH = 640; // largeur du GIF, la fenêtre est réduite à l'échelle
const STEP = 110; // ms entre deux images

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function recordDemo(win, out, lang = "fr") {
  const { GIFEncoder, quantize, applyPalette } = require("gifenc");
  const js = (code) => win.webContents.executeJavaScript(code);

  await js(`localStorage.setItem("slowfi-lang", ${JSON.stringify(lang)})`);
  win.webContents.reload();
  await new Promise((r) => win.webContents.once("did-finish-load", r));
  await wait(1500);

  const frames = [];
  let recording = false;
  let size = null;
  const grab = async () => {
    const image = (await win.webContents.capturePage()).resize({
      width: WIDTH,
      quality: "good",
    });
    size = image.getSize();
    frames.push({ bitmap: image.toBitmap(), delay: STEP });
  };
  const loop = (async () => {
    while (recording !== null) {
      if (recording) await grab();
      await wait(STEP);
    }
  })();

  // Accueil, un temps de lecture.
  recording = true;
  await wait(2000);

  // Lancement : la page « Diagnostic » s'ouvre et l'analyse démarre.
  const start = lang === "en" ? "Run the diagnostic" : "Lancer le diagnostic";
  await js(`[...document.querySelectorAll("button")]
    .find((b) => b.textContent.includes(${JSON.stringify(start)}))?.click()`);
  await wait(2500);

  // L'attente n'est pas filmée : une seule image tenue plus longtemps.
  recording = false;
  frames[frames.length - 1].delay = 900;
  const verdict = lang === "en" ? /Hardware — / : /Matériel — /;
  for (let i = 0; i < 180; i++) {
    const text = await js("document.body.innerText");
    if (verdict.test(text)) break;
    await wait(500);
  }
  await wait(1200);

  // Résultats : défilement régulier jusqu'en bas.
  recording = true;
  await wait(1500);
  await js(`(async () => {
    const el = document.getElementById("scroll-root");
    const end = el.scrollHeight - el.clientHeight;
    for (let y = 0; y <= end; y += 9) {
      el.scrollTop = y;
      await new Promise((r) => setTimeout(r, 16));
    }
  })()`);
  await wait(1800);
  recording = null;
  await loop;
  frames[frames.length - 1].delay = 2500;

  // Encodage : une palette par image, BGRA (Electron) vers RGBA (gifenc).
  const gif = GIFEncoder();
  for (const f of frames) {
    const rgba = new Uint8Array(f.bitmap.length);
    for (let j = 0; j < rgba.length; j += 4) {
      rgba[j] = f.bitmap[j + 2];
      rgba[j + 1] = f.bitmap[j + 1];
      rgba[j + 2] = f.bitmap[j];
      rgba[j + 3] = 255;
    }
    const palette = quantize(rgba, 256);
    gif.writeFrame(applyPalette(rgba, palette), size.width, size.height, {
      palette,
      delay: f.delay,
    });
  }
  gif.finish();
  fs.writeFileSync(out, gif.bytes());
  console.log(`ok ${frames.length} images, ${Math.round(gif.bytes().length / 1024)} Ko`);
};
