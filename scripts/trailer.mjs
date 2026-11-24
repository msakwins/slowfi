// ─────────────────────────────────────────────────────────────────────────────
// Bande-annonce du Microsoft Store : enregistre l'application
// (electron/record-trailer.cjs) puis encode docs/store/trailer-<langue>.mp4,
// en 1920 × 1080, H.264, 30 images par seconde, piste audio muette.
//   node scripts/trailer.mjs fr   (ou en)
// FFMPEG : chemin de ffmpeg s'il n'est pas dans le PATH.
// ─────────────────────────────────────────────────────────────────────────────
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const lang = process.argv[2] === "en" ? "en" : "fr";
const frames = path.join(os.tmpdir(), `slowfi-trailer-${lang}`);
const out = path.resolve("docs", "store", `trailer-${lang}.mp4`);
const ffmpeg = process.env.FFMPEG || "ffmpeg";

const run = (cmd, args, env) => {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32" && cmd === "npx",
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run("npx", ["electron", "."], {
  SLOWFI_TRAILER: frames,
  SLOWFI_TRAILER_LANG: lang,
});
const { fps } = JSON.parse(fs.readFileSync(path.join(frames, "meta.json"), "utf8"));

fs.mkdirSync(path.dirname(out), { recursive: true });
run(ffmpeg, [
  "-y",
  "-loglevel", "error",
  "-framerate", fps.toFixed(3),
  "-i", path.join(frames, "frame-%05d.png"),
  "-f", "lavfi",
  "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
  "-vf", "scale=1920:1080:flags=lanczos,format=yuv420p",
  "-r", "30",
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
