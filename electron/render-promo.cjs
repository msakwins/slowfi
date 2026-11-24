// ─────────────────────────────────────────────────────────────────────────────
// Vidéo de présentation animée (1920 × 1080, 30 images par seconde), rendue
// image par image : titres, logo qui se dessine, écrans de l'application
// (docs/store/screens) qui glissent et zooment, carte de fin.
//   PROMO_LANG=fr PROMO_OUT=dossier npx electron electron/render-promo.cjs
// scripts/promo.mjs enchaîne le rendu et l'encodage en MP4.
// ─────────────────────────────────────────────────────────────────────────────
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const W = 1920;
const H = 1080;
const FPS = 30;
const lang = process.env.PROMO_LANG === "en" ? "en" : "fr";
const OUT = process.env.PROMO_OUT || path.join(os.tmpdir(), `slowfi-promo-${lang}`);
const SCREENS = path.join(__dirname, "..", "docs", "store", "screens");

const TEXT = {
  fr: {
    q1: "Un PC lent ?",
    q2: "Une connexion qui rame ?",
    tagline: "Diagnostic de connexion et de matériel",
    s1: "Un diagnostic complet en un clic",
    s2: "Problèmes détectés et corrections",
    s3: "Températures, usure des SSD, ventilateurs",
    s4: "Avant et après chaque changement",
    end: "Gratuit · Sans compte · Aucune donnée collectée",
    where: "Microsoft Store · slowfi.app",
  },
  en: {
    q1: "Slow PC?",
    q2: "Lagging connection?",
    tagline: "Connection and hardware diagnostics",
    s1: "A full diagnostic in one click",
    s2: "Issues found, and how to fix them",
    s3: "Temperatures, SSD wear, fans",
    s4: "Before and after every change",
    end: "Free · No account · No data collected",
    where: "Microsoft Store · slowfi.app",
  },
}[lang];

const img = (name) =>
  "data:image/png;base64," +
  fs.readFileSync(path.join(SCREENS, `${lang}-${name}.png`)).toString("base64");

// Scènes : [début, fin] en secondes.
const SCENES = {
  q: [0, 3.4],
  logo: [3.4, 7],
  s1: [7, 11.5],
  s2: [11.5, 17],
  s3: [17, 21.5],
  s4: [21.5, 26],
  end: [26, 31],
};
const DURATION = 31;

const page = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #020617; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #f1f5f9; position: relative; }
  .layer { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; }
  .glow { position: absolute; width: 1400px; height: 900px; left: 260px; top: 90px; border-radius: 50%;
          background: radial-gradient(closest-side, rgba(34,211,238,.14), rgba(167,139,250,.06), transparent); }
  .q { font-size: 110px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; text-align: center; }
  .q span { display: block; }
  .q .b { color: #22d3ee; }
  .word { display: flex; align-items: center; font-size: 170px; font-weight: 700; letter-spacing: 0.09em; line-height: 1; }
  .word svg { width: 1.5em; height: 0.9em; margin: 0 0.05em; overflow: visible;
              filter: drop-shadow(0 0 16px rgba(34,211,238,.7)) drop-shadow(0 0 40px rgba(34,211,238,.6)); }
  .tag { margin-top: 44px; font-size: 44px; color: #94a3b8; }
  .bar { margin-top: 40px; width: 560px; height: 8px; border-radius: 8px; background: #111a2e; overflow: hidden; }
  .bar div { height: 100%; background: linear-gradient(90deg, #22d3ee, #f97316, #a78bfa); }
  .shot { position: absolute; left: 50%; top: 56%; width: 1366px; height: 768px; margin: -384px 0 0 -683px;
          border-radius: 14px; overflow: hidden; border: 1px solid #1e293b;
          box-shadow: 0 40px 120px rgba(0,0,0,.6), 0 0 80px rgba(34,211,238,.08); }
  .shot img { display: block; width: 1366px; height: 768px; transform-origin: 0 0; }
  .cap { position: absolute; left: 0; right: 0; top: 70px; text-align: center; font-size: 58px; font-weight: 700; letter-spacing: -0.01em; }
  .cap i { font-style: normal; background: linear-gradient(90deg, #22d3ee, #f97316, #a78bfa); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .end1 { margin-top: 48px; font-size: 40px; color: #cbd5e1; }
  .end2 { margin-top: 22px; font-size: 34px; color: #64748b; }
</style></head><body>
  <div class="glow" id="glow"></div>

  <div class="layer" id="q"><div class="q"><span id="q1">${TEXT.q1}</span><span class="b" id="q2">${TEXT.q2}</span></div></div>

  <div class="layer" id="logo">
    <div class="word">slo<svg viewBox="0 0 38 24" fill="none" stroke="#22d3ee" stroke-linecap="round" stroke-linejoin="round">
      <path id="p1" pathLength="1" d="M1.5 14H5l3.8 7 4.6-15 4.6 15 3.6-10 2.6 3H36" stroke-width="2.7" stroke-dasharray="1"/></svg>fi</div>
    <div class="tag" id="tag">${TEXT.tagline}</div>
    <div class="bar"><div id="fill"></div></div>
  </div>

  ${["s1", "s2", "s3", "s4"]
    .map(
      (s, i) => `<div class="layer" id="${s}">
    <div class="cap" id="${s}c"><i>${TEXT[s]}</i></div>
    <div class="shot" id="${s}w"><img id="${s}i" src="${img(["1-accueil", "2-diagnostic", "3-capteurs", "4-historique"][i])}"></div>
  </div>`,
    )
    .join("\n")}

  <div class="layer" id="end">
    <div class="word">slo<svg viewBox="0 0 38 24" fill="none" stroke="#22d3ee" stroke-linecap="round" stroke-linejoin="round">
      <path id="p2" pathLength="1" d="M1.5 14H5l3.8 7 4.6-15 4.6 15 3.6-10 2.6 3H36" stroke-width="2.7" stroke-dasharray="1"/></svg>fi</div>
    <div class="end1" id="e1">${TEXT.end}</div>
    <div class="end2" id="e2">${TEXT.where}</div>
  </div>
<script>
  const S = ${JSON.stringify(SCENES)};
  const $ = (id) => document.getElementById(id);
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => { x = clamp(x); return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2; };
  const out = (x) => 1 - Math.pow(1 - clamp(x), 3);
  // Opacité d'une scène : fondu de 0,45 s à l'entrée et à la sortie.
  const vis = (t, [a, b]) => clamp((t - a) / 0.45) * clamp((b - t) / 0.45);
  window.setFrame = (t) => {
    $("glow").style.transform = "translate(" + (Math.sin(t / 3) * 120) + "px," + (Math.cos(t / 4) * 60) + "px)";

    // Questions : l'une après l'autre, montée douce.
    $("q").style.opacity = vis(t, S.q);
    const a = out((t - 0.2) / 0.7), b = out((t - 1.1) / 0.7);
    $("q1").style.cssText = "opacity:" + a + ";transform:translateY(" + (40 * (1 - a)) + "px)";
    $("q2").style.cssText = "opacity:" + b + ";transform:translateY(" + (40 * (1 - b)) + "px)";

    // Logo : le w se dessine, la barre se remplit, la phrase apparaît.
    $("logo").style.opacity = vis(t, S.logo);
    const l = (t - S.logo[0]);
    $("p1").style.strokeDashoffset = 1 - ease(l / 1.4);
    $("fill").style.width = (100 * ease((l - 0.3) / 2.6)) + "%";
    const g = out((l - 1.2) / 0.8);
    $("tag").style.cssText = "opacity:" + g + ";transform:translateY(" + (24 * (1 - g)) + "px)";

    // Écrans : arrivée par le bas, puis lent zoom ou défilement.
    const moves = {
      s1: (k) => "scale(" + (1 + 0.06 * k) + ")",
      s2: (k) => "translateY(" + (-120 * k) + "px) scale(1.12)",
      s3: (k) => "scale(" + (1 + 0.08 * k) + ")",
      s4: (k) => "scale(" + (1.04 + 0.05 * k) + ")",
    };
    for (const s of ["s1", "s2", "s3", "s4"]) {
      const [a0, b0] = S[s];
      $(s).style.opacity = vis(t, S[s]);
      const k = clamp((t - a0) / (b0 - a0));
      const enter = out((t - a0) / 0.9);
      $(s + "w").style.transform = "translateY(" + (90 * (1 - enter)) + "px)";
      $(s + "i").style.transform = moves[s](ease(k));
      const c = out((t - a0 - 0.15) / 0.7);
      $(s + "c").style.cssText = "opacity:" + c + ";transform:translateY(" + (-20 * (1 - c)) + "px)";
    }

    // Fin : logo, puis les deux lignes.
    $("end").style.opacity = clamp((t - S.end[0]) / 0.45);
    const e = t - S.end[0];
    $("p2").style.strokeDashoffset = 1 - ease(e / 1.2);
    const e1 = out((e - 0.8) / 0.7), e2 = out((e - 1.3) / 0.7);
    $("e1").style.cssText = "opacity:" + e1 + ";transform:translateY(" + (20 * (1 - e1)) + "px)";
    $("e2").style.cssText = "opacity:" + e2 + ";transform:translateY(" + (20 * (1 - e2)) + "px)";
  };
  setFrame(0);
</script></body></html>`;

app.on("window-all-closed", () => {});

app.whenReady().then(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const win = new BrowserWindow({
    width: W,
    height: H,
    show: false,
    frame: false,
    useContentSize: true,
    enableLargerThanScreen: true,
    webPreferences: { offscreen: true, zoomFactor: 1 },
  });
  const tmp = path.join(os.tmpdir(), `slowfi-promo-${lang}.html`);
  fs.writeFileSync(tmp, page);
  await win.loadFile(tmp);
  await new Promise((r) => setTimeout(r, 800));
  const total = Math.round(DURATION * FPS);
  for (let i = 0; i < total; i++) {
    await win.webContents.executeJavaScript(`setFrame(${i / FPS})`);
    await new Promise((r) => setTimeout(r, 25));
    const image = await win.webContents.capturePage();
    const size = image.getSize();
    const frame =
      size.width === W && size.height === H ? image : image.resize({ width: W, height: H });
    fs.writeFileSync(
      path.join(OUT, `frame-${String(i + 1).padStart(5, "0")}.png`),
      frame.toPNG(),
    );
  }
  fs.rmSync(tmp, { force: true });
  console.log(`ok ${total} images`);
  app.quit();
});
