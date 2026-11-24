// ─────────────────────────────────────────────────────────────────────────────
// Vidéo de présentation animée : rendu (electron/render-promo.cjs) puis
// encodage de docs/store/promo-<langue>.mp4 (1920 × 1080, H.264, 30 i/s,
// piste audio muette).
//   node scripts/promo.mjs fr   (ou en)
// FFMPEG : chemin de ffmpeg s'il n'est pas dans le PATH.
// ─────────────────────────────────────────────────────────────────────────────
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const lang = process.argv[2] === "en" ? "en" : "fr";
const frames = path.join(os.tmpdir(), `slowfi-promo-${lang}`);
const out = path.resolve("docs", "store", `promo-${lang}.mp4`);
const ffmpeg = process.env.FFMPEG || "ffmpeg";

const run = (cmd, args, env, shell = false) => {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell,
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run("npx electron electron/render-promo.cjs", [], {
  PROMO_LANG: lang,
  PROMO_OUT: frames,
}, true);
run(ffmpeg, [
  "-y",
  "-loglevel", "error",
  "-framerate", "30",
  "-i", path.join(frames, "frame-%05d.png"),
  "-f", "lavfi",
  "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
  "-vf", "format=yuv420p",
  "-c:v", "libx264",
  "-preset", "slow",
  "-crf", "18",
  "-c:a", "aac",
  "-shortest",
  "-movflags", "+faststart",
  out,
]);
fs.rmSync(frames, { recursive: true, force: true });
console.log(`ok ${out}`);
