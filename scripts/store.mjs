// ─────────────────────────────────────────────────────────────────────────────
// Paquet Microsoft Store (release/Slowfi-Store.appx), à envoyer dans
// Partner Center :   npm run store
//
// Outils Windows récents (winCodeSign 1.1.0), dans un cache à part : sur
// certains PC, l'outil de paquet (makeappx) refuse de démarrer depuis le
// cache habituel d'electron-builder (« spawn UNKNOWN »).
// ─────────────────────────────────────────────────────────────────────────────
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const env = {
  ...process.env,
  ELECTRON_BUILDER_CACHE: path.join(os.tmpdir(), "slowfi-store-cache"),
};
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, env });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run("npm", ["run", "build"]);
run("npx", [
  "electron-builder",
  "--win",
  "appx",
  "--publish",
  "never",
  "-c.toolsets.winCodeSign=1.1.0",
]);
