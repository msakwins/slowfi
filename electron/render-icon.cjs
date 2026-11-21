// Génère electron/icon.png (1024 px) à partir de public/favicon.svg, pour les
// installateurs. À relancer seulement si le logo change :
//   npx electron electron/render-icon.cjs
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const SIZE = 1024;
const svg = fs.readFileSync(
  path.join(__dirname, "..", "public", "favicon.svg"),
  "utf8",
);

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    frame: false,
    transparent: true,
    useContentSize: true,
    webPreferences: { offscreen: true, zoomFactor: 1 },
  });
  const html = `<html><body style="margin:0;background:transparent">
    <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"
      width="${SIZE}" height="${SIZE}" style="display:block"></body></html>`;
  await win.loadURL(`data:text/html;base64,${Buffer.from(html).toString("base64")}`);
  await new Promise((r) => setTimeout(r, 500));
  const image = await win.webContents.capturePage();
  const png = image.resize({ width: SIZE, height: SIZE }).toPNG();
  fs.writeFileSync(path.join(__dirname, "icon.png"), png);
  console.log("icon.png", png.length);
  app.quit();
});
