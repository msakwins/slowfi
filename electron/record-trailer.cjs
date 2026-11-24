// ─────────────────────────────────────────────────────────────────────────────
// Images de la bande-annonce du Microsoft Store, dans une langue :
//   SLOWFI_TRAILER=dossier SLOWFI_TRAILER_LANG=fr npx electron .
// Fenêtre de 1280 × 720 ; les images (frame-00001.png…) et le rythme réel
// (meta.json) vont dans le dossier, scripts/trailer.mjs en fait la vidéo.
// Accueil, diagnostic, résultats, capteurs avec le suivi, historique.
// L'attente de l'analyse n'est pas filmée.
// Outil de développement : n'est pas inclus dans l'application publiée.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require("node:fs");
const path = require("node:path");

const STEP = 66; // ms visés entre deux images (environ 15 par seconde)
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function recordTrailer(win, dir, lang = "fr") {
  const js = (code) => win.webContents.executeJavaScript(code);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  win.setContentSize(1280, 720);
  win.center();
  await js(`localStorage.setItem("slowfi-lang", ${JSON.stringify(lang)})`);
  win.webContents.reload();
  await new Promise((r) => win.webContents.once("did-finish-load", r));
  await wait(1500);

  let n = 0;
  let filmed = 0; // durée filmée, en ms
  let recording = false;
  let stop = false;
  const loop = (async () => {
    let last = Date.now();
    while (!stop) {
      const t0 = Date.now();
      if (recording) {
        const image = await win.webContents.capturePage();
        n += 1;
        fs.writeFileSync(
          path.join(dir, `frame-${String(n).padStart(5, "0")}.png`),
          image.toPNG(),
        );
        filmed += Date.now() - last;
      }
      last = Date.now();
      await wait(Math.max(0, STEP - (Date.now() - t0)));
    }
  })();
  const smoothScroll = (px, ms) =>
    js(`(async () => {
      const el = document.getElementById("scroll-root");
      const from = el.scrollTop, steps = Math.round(${ms} / 16);
      for (let i = 1; i <= steps; i++) {
        const k = i / steps, ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        el.scrollTop = from + ${px} * ease;
        await new Promise((r) => setTimeout(r, 16));
      }
    })()`);
  const click = (sel) =>
    js(`document.querySelector(${JSON.stringify(sel)})?.click()`);
  const clickText = (text) =>
    js(`[...document.querySelectorAll("button")]
      .find((b) => b.textContent.includes(${JSON.stringify(text)}))?.click()`);

  // 1. Accueil.
  recording = true;
  await wait(3000);

  // 2. Diagnostic : lancement, analyse en cours.
  await clickText(lang === "en" ? "Run the diagnostic" : "Lancer le diagnostic");
  await wait(2500);
  recording = false;
  const verdict = lang === "en" ? "Hardware — " : "Matériel — ";
  for (let i = 0; i < 180; i++) {
    if ((await js("document.body.innerText")).includes(verdict)) break;
    await wait(500);
  }
  await wait(1500);

  // 3. Résultats : défilement jusqu'au verdict du matériel, puis lecture.
  recording = true;
  await wait(800);
  const target = await js(`(() => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walk.nextNode()))
      if (node.textContent.startsWith(${JSON.stringify(verdict)})) break;
    const root = document.getElementById("scroll-root");
    return node ? node.parentElement.getBoundingClientRect().top - root.getBoundingClientRect().top - 24 : 0;
  })()`);
  await smoothScroll(target, 2200);
  await wait(2500);
  await smoothScroll(900, 4000);
  await wait(2000);

  // 4. Capteurs, puis le suivi de la charge quelques secondes.
  await click('a[href="/capteurs"]');
  recording = false;
  await wait(8000);
  recording = true;
  await wait(2500);
  await clickText(lang === "en" ? "Start tracking" : "Lancer le suivi");
  await smoothScroll(700, 2500);
  await wait(6000);

  // 5. Historique, une analyse ouverte.
  await click('a[href="/historique"]');
  await wait(1500);
  await click("button.run");
  await wait(3500);

  stop = true;
  await loop;
  fs.writeFileSync(
    path.join(dir, "meta.json"),
    JSON.stringify({ frames: n, fps: (n * 1000) / filmed }),
  );
  console.log(`ok ${n} images, ${((n * 1000) / filmed).toFixed(1)} i/s`);
};
