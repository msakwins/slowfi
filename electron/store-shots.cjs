// ─────────────────────────────────────────────────────────────────────────────
// Captures d'écran pour le Microsoft Store (1366 × 768), dans une langue :
//   SLOWFI_STORE_SHOTS=docs/store/screens SLOWFI_STORE_LANG=fr npx electron .
// Accueil, résultats du diagnostic, capteurs, historique.
// Outil de développement : n'est pas inclus dans l'application publiée.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require("node:fs");
const path = require("node:path");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function storeShots(win, dir, lang = "fr") {
  const js = (code) => win.webContents.executeJavaScript(code);
  fs.mkdirSync(dir, { recursive: true });
  win.setContentSize(1366, 768);
  win.center();
  await js(`localStorage.setItem("slowfi-lang", ${JSON.stringify(lang)})`);
  win.webContents.reload();
  await new Promise((r) => win.webContents.once("did-finish-load", r));
  await wait(1500);

  const shot = async (name) => {
    const image = await win.webContents.capturePage();
    fs.writeFileSync(path.join(dir, `${lang}-${name}.png`), image.toPNG());
  };
  const click = (sel) => js(`document.querySelector(${JSON.stringify(sel)})?.click()`);

  await shot("1-accueil");

  // Diagnostic complet : depuis le bouton de l'accueil, jusqu'au verdict.
  const start = lang === "en" ? "Run the diagnostic" : "Lancer le diagnostic";
  await js(`[...document.querySelectorAll("button")]
    .find((b) => b.textContent.includes(${JSON.stringify(start)}))?.click()`);
  const verdict = lang === "en" ? "Hardware — " : "Matériel — ";
  for (let i = 0; i < 180; i++) {
    if ((await js("document.body.innerText")).includes(verdict)) break;
    await wait(500);
  }
  await wait(1500);
  // Le verdict du matériel en haut de la zone visible.
  await js(`(() => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walk.nextNode()))
      if (node.textContent.startsWith(${JSON.stringify(verdict)})) break;
    const root = document.getElementById("scroll-root");
    if (!node) return;
    const top = node.parentElement.getBoundingClientRect().top;
    root.scrollTop += top - root.getBoundingClientRect().top - 24;
  })()`);
  await wait(600);
  await shot("2-diagnostic");

  // Capteurs, avec les lectures affichées.
  await click('a[href="/capteurs"]');
  await wait(9000);
  await shot("3-capteurs");

  // Historique, la dernière analyse ouverte.
  await click('a[href="/historique"]');
  await wait(800);
  await click("button.run");
  await wait(600);
  await shot("4-historique");
};
