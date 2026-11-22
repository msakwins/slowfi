// ─────────────────────────────────────────────────────────────────────────────
// Application desktop Slowfi (Electron).
//
// La fenêtre affiche le site, servi depuis le dossier dist par un protocole
// interne (app://slowfi) plutôt que file:// : la page garde une vraie origine,
// ce qui permet au test de débit d'interroger speed.cloudflare.com.
//
// Différence avec le site : l'application lance elle-même les lectures de
// l'analyse et lit leur sortie, sans copier-coller. Le script vient de la page,
// qui ne charge que ses propres fichiers ; les liens externes s'ouvrent dans le
// navigateur.
// ─────────────────────────────────────────────────────────────────────────────
const {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  net,
  shell,
} = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const sensors = require("./sensors.cjs");
const { setupUpdates } = require("./updater.cjs");

const DIST = path.join(__dirname, "..", "dist");
const ORIGIN = "app://slowfi";
// En développement, la page vient du serveur Vite.
const DEV_URL = process.env.SLOWFI_DEV_URL;

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

/** Fichiers de dist ; toute route inconnue renvoie index.html (pages du site). */
function serveDist() {
  protocol.handle("app", (request) => {
    const { pathname, searchParams } = new URL(request.url);
    if (pathname === "/api/drivers") return driversApi(searchParams.get("id"));
    const file = path.normalize(path.join(DIST, decodeURIComponent(pathname)));
    const inside = file.startsWith(DIST + path.sep);
    const hasExt = path.extname(file) !== "";
    const target = inside && hasExt ? file : path.join(DIST, "index.html");
    return net.fetch(pathToFileURL(target).toString());
  });
}

/**
 * /api/drivers, comme la fonction Vercel du site : l'application interroge
 * elle-même le catalogue Microsoft Update, sans passer par slowfi.app.
 */
async function driversApi(rawId) {
  const lib = (name) =>
    import(pathToFileURL(path.join(__dirname, "..", "src", "lib", name)).href);
  const { isLookupKey } = await lib("catalog.js");
  const { lookupDriver } = await lib("driverLookup.js");
  const id = String(rawId ?? "").toUpperCase();
  const json = (status, body) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  if (!isLookupKey(id)) return json(400, { error: "id" });
  try {
    return json(200, await lookupDriver(id));
  } catch {
    return json(502, { id, error: "catalog" });
  }
}

/** Lance le script avec le shell du système et renvoie sa sortie. */
function runScript(script) {
  let cmd;
  let args;
  if (process.platform === "win32") {
    // Script encodé en UTF-16 : ni guillemets ni accents à échapper. La sortie
    // est forcée en UTF-8 pour garder les accents des noms de périphériques.
    const full = [
      "[Console]::OutputEncoding = [Text.Encoding]::UTF8",
      "$ProgressPreference = 'SilentlyContinue'",
      script,
    ].join("\n");
    cmd = "powershell.exe";
    args = [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-EncodedCommand",
      Buffer.from(full, "utf16le").toString("base64"),
    ];
  } else if (process.platform === "darwin") {
    cmd = "/bin/zsh";
    args = ["-c", script];
  } else {
    cmd = "/bin/bash";
    args = ["-c", script];
  }

  return new Promise((resolve) => {
    const child = spawn(cmd, args, { windowsHide: true });
    const chunks = [];
    child.stdout.on("data", (d) => chunks.push(d));
    // Sous Windows, PowerShell écrit ses erreurs et sa progression en XML sur
    // stderr : seule la sortie compte, comme avec Set-Clipboard.
    if (process.platform !== "win32") {
      child.stderr.on("data", (d) => chunks.push(d));
    }
    // Garde-fou : une lecture bloquée ne fige pas l'analyse.
    const timer = setTimeout(() => child.kill(), 120_000);
    const done = () => {
      clearTimeout(timer);
      resolve(Buffer.concat(chunks).toString("utf8"));
    };
    child.on("close", done);
    child.on("error", done);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 840,
    height: 760,
    minWidth: 420,
    minHeight: 500,
    backgroundColor: "#020617",
    autoHideMenuBar: true,
    title: "Slowfi",
    // Sans la barre de titre du système : la page dessine la sienne, avec
    // ses boutons (Windows, Linux). macOS garde ses trois boutons natifs,
    // posés sur la page. Windows 11 et macOS arrondissent les coins.
    ...(process.platform === "darwin"
      ? { titleBarStyle: "hiddenInset", trafficLightPosition: { x: 16, y: 14 } }
      : { frame: false }),
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  const home = DEV_URL || `${ORIGIN}/`;
  const ours = (url) => url.startsWith(DEV_URL || ORIGIN);

  // Liens externes (pilotes, code source…) : dans le navigateur par défaut.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!ours(url)) {
      event.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });

  // La page suit l'état agrandi, pour changer l'icône du bouton.
  const sendMaximized = () =>
    win.webContents.send("slowfi:maximized", win.isMaximized());
  win.on("maximize", sendMaximized);
  win.on("unmaximize", sendMaximized);

  win.loadURL(home);
  if (process.argv.includes("--smoke")) smokeTest(win);
  // Capture de la fenêtre au démarrage, pour vérifier son allure :
  // SLOWFI_SHOT_START=chemin.png (l'application quitte ensuite).
  // SLOWFI_SHOT_PAGE=/diagnostic ouvre d'abord cette page par la barre
  // latérale, SLOWFI_SHOT_WAIT=ms règle l'attente avant la capture.
  if (process.env.SLOWFI_SHOT_START) {
    win.webContents.once("did-finish-load", async () => {
      await new Promise((r) => setTimeout(r, 1500));
      const page = process.env.SLOWFI_SHOT_PAGE;
      if (page) {
        await win.webContents.executeJavaScript(
          `document.querySelector('a[href="${page}"]')?.click()`,
        );
        await new Promise((r) =>
          setTimeout(r, Number(process.env.SLOWFI_SHOT_WAIT) || 800),
        );
      }
      const image = await win.webContents.capturePage();
      require("node:fs").writeFileSync(
        process.env.SLOWFI_SHOT_START,
        image.toPNG(),
      );
      app.exit(0);
    });
  }
}

/**
 * Vérification rapide, pour la CI et après chaque build : la page s'affiche,
 * et une lecture passe par le shell avec ses accents. Affiche le résultat
 * puis quitte (code 1 en cas d'échec).
 */
function smokeTest(win) {
  // Le rapport se remplit étape par étape. Une étape en erreur ou trop
  // longue (machine de CI sans carte graphique ni capteurs) est notée dans
  // le rapport au lieu de bloquer : sans cela l'application ne quittait
  // jamais et la CI attendait des heures.
  const report = {};
  const finish = (forced) => {
    const ok =
      !forced &&
      report.title &&
      report.bridge &&
      report.output === "Réseau ok" &&
      typeof report.hardware === "string" &&
      !report.hardware.startsWith("erreur");
    console.log(JSON.stringify(report), ok ? "OK" : "ÉCHEC");
    // Sur GitHub Actions, l'échec devient une annotation, lisible sans
    // ouvrir les journaux. Les retours à la ligne s'y écrivent %0A.
    if (!ok && process.env.GITHUB_ACTIONS) {
      const brief = { ...report };
      for (const k of ["drivers", "sensors"])
        if (Array.isArray(brief[k])) brief[k] = brief[k].slice(0, 6);
      console.log(
        `::error title=Smoke test (${process.platform})::${JSON.stringify(brief)
          .slice(0, 3000)
          .replace(/%/g, "%25")
          .replace(/\r?\n/g, "%0A")}`,
      );
    }
    app.exit(ok ? 0 : 1);
  };
  // Filet de sécurité : quatre minutes au plus, quoi qu'il arrive.
  setTimeout(() => {
    report.timeout = "délai global dépassé";
    finish(true);
  }, 240000).unref();
  const step = (code, ms) =>
    Promise.race([
      win.webContents.executeJavaScript(code),
      new Promise((_, no) =>
        setTimeout(() => no(new Error(`délai de ${ms / 1000} s dépassé`)), ms),
      ),
    ]).catch((e) => `erreur : ${e.message}`);

  // Les libellés cherchés sont en français, et les machines de CI sont en
  // anglais : choisir le français, recharger, puis vérifier.
  win.webContents.once("did-finish-load", () => {
    win.webContents
      .executeJavaScript('localStorage.setItem("slowfi-lang", "fr")')
      .then(() => {
        win.webContents.once("did-finish-load", run);
        win.webContents.reload();
      });
  });

  async function run() {
    await new Promise((r) => setTimeout(r, 1500));
    const script =
      process.platform === "win32"
        ? "Write-Output 'Réseau ok'"
        : "echo 'Réseau ok'";
    const first = await step(
      `(async () => ({
      title: document.querySelector("h1")?.textContent ?? null,
      bridge: typeof window.slowfi?.run === "function",
      output: (await window.slowfi.run(${JSON.stringify(script)})).trim(),
    }))()`,
      30000,
    );
    Object.assign(report, typeof first === "string" ? { start: first } : first);
    // Analyse du matériel réelle : ouvrir le menu, lancer, attendre le verdict.
    report.hardware = await step(
      `(async () => {
      const button = (text) =>
        [...document.querySelectorAll("button")].find((b) => b.textContent.includes(text));
      // Diagnostic complet, matériel seul : la lecture part d'elle-même.
      for (const chip of ["Réseau local", "Périphériques"]) {
        const b = button(chip);
        if (b?.getAttribute("aria-pressed") === "true") b.click();
      }
      await new Promise((r) => setTimeout(r, 300));
      button("Lancer le diagnostic").click();
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const verdict = document.body.innerText.match(/Matériel — .+/i);
        if (verdict) return verdict[0];
      }
      return null;
    })()`,
      90000,
    );
    // Mises à jour des pilotes (Windows) : affichées, sans faire échouer la
    // vérification, car elles dépendent du réseau et du matériel présent.
    report.drivers = await step(
      `(async () => {
      for (let i = 0; i < 40; i++) {
        const text = document.body.innerText;
        const at = text.search(/Mises à jour des pilotes/i);
        if (at < 0) return null;
        // Jusqu'à la liste des points vérifiés (en capitales à l'écran).
        const end = text.slice(at).search(/points vérifiés/i);
        const part = end < 0 ? text.slice(at) : text.slice(at, at + end);
        if (!part.includes("Recherche…")) return part.split("\\n").slice(2);
        await new Promise((r) => setTimeout(r, 500));
      }
      return "délai dépassé";
    })()`,
      30000,
    );
    // Capteurs : lecture, puis quelques secondes de suivi. Absents sur une
    // machine de CI : noté, sans faire échouer.
    report.sensors = await step(
      `(async () => {
      // Page « Capteurs », ouverte depuis la barre latérale.
      document.querySelector('a[href="/capteurs"]')?.click();
      await new Promise((r) => setTimeout(r, 800));
      const section = () =>
        [...document.querySelectorAll("section")].find((s) =>
          s.querySelector("h1")?.textContent === "Capteurs",
        );
      for (let i = 0; i < 60 && section()?.innerText.includes("Lecture des capteurs"); i++)
        await new Promise((r) => setTimeout(r, 500));
      if (!section()) return null;
      const start = [...section().querySelectorAll("button")].find((b) =>
        b.textContent.includes("Lancer le suivi"),
      );
      start?.click();
      await new Promise((r) => setTimeout(r, 6000));
      section().scrollIntoView();
      return section().innerText.split("\\n").filter(Boolean);
    })()`,
      60000,
    );
    // Capture d'écran, pour vérifier l'affichage : SLOWFI_SHOT=chemin.png
    if (process.env.SLOWFI_SHOT) {
      const image = await win.webContents.capturePage();
      require("node:fs").writeFileSync(process.env.SLOWFI_SHOT, image.toPNG());
    }
    finish(false);
  }
}

// Une seule instance : relancer l'application ramène la fenêtre ouverte.
// Installateur Windows (Squirrel) : il lance l'application avec un drapeau
// à l'installation, à la mise à jour et à la désinstallation, pour créer ou
// retirer les raccourcis (bureau, menu Démarrer), puis attend qu'elle quitte.
function handleSquirrelEvent() {
  if (process.platform !== "win32") return false;
  const flag = process.argv[1];
  if (!flag?.startsWith("--squirrel-")) return false;
  const updateExe = path.resolve(
    path.dirname(process.execPath),
    "..",
    "Update.exe",
  );
  const exe = path.basename(process.execPath);
  const run = (args) => {
    try {
      spawn(updateExe, args, { detached: true }).on("close", () => app.quit());
    } catch {
      app.quit();
    }
  };
  if (flag === "--squirrel-install" || flag === "--squirrel-updated") {
    run([`--createShortcut=${exe}`]);
    return true;
  }
  if (flag === "--squirrel-uninstall") {
    run([`--removeShortcut=${exe}`]);
    return true;
  }
  if (flag === "--squirrel-obsolete") {
    app.quit();
    return true;
  }
  return false;
}
const squirrelEvent = handleSquirrelEvent();

// Copie de développement (npm run app) : dossier de données à part, pour
// tourner à côté de l'application installée sans se heurter au verrou
// d'instance unique.
// Vérification et capture : encore à part, pour tourner même quand une
// copie de développement est ouverte.
if (!app.isPackaged) {
  const check =
    process.argv.includes("--smoke") || Boolean(process.env.SLOWFI_SHOT_START);
  app.setPath(
    "userData",
    path.join(app.getPath("appData"), check ? "slowfi-check" : "slowfi-dev"),
  );
}

if (squirrelEvent) {
  // Raccourcis en cours : l'application quitte d'elle-même ensuite.
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    serveDist();
    ipcMain.handle("slowfi:run", (event, script) => {
      // Seule la page de l'application peut demander une lecture.
      if (!event.senderFrame?.url.startsWith(DEV_URL || ORIGIN)) return "";
      if (typeof script !== "string" || script.length > 100_000) return "";
      return runScript(script);
    });
    // Capteurs : réservés à la page de l'application, comme les lectures.
    const fromApp = (event) =>
      event.senderFrame?.url.startsWith(DEV_URL || ORIGIN);
    ipcMain.handle("slowfi:sensors", (event) =>
      fromApp(event) ? sensors.readSensors() : null,
    );
    ipcMain.handle("slowfi:sensors-admin", (event) =>
      fromApp(event) ? sensors.readDisksAsAdmin() : null,
    );
    ipcMain.handle("slowfi:sample", (event, withGpu) =>
      fromApp(event) ? sensors.sample(Boolean(withGpu)) : null,
    );
    // Boutons de la barre de titre dessinée par la page.
    ipcMain.handle("slowfi:window", (event, action) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win || !fromApp(event)) return null;
      if (action === "minimize") win.minimize();
      else if (action === "maximize")
        win.isMaximized() ? win.unmaximize() : win.maximize();
      else if (action === "close") win.close();
      return win.isMaximized();
    });
    createWindow();
    setupUpdates();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
