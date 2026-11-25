// ─────────────────────────────────────────────────────────────────────────────
// Couleurs du texte : blanc froid d'origine ↔ blanc teinté de cyan (option A).
//   node scripts/text-tint.mjs        applique la teinte cyan
//   node scripts/text-tint.mjs back   revient au blanc d'origine
// Remplace les couleurs dans src/ (titres, texte, texte secondaire).
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";

const PAIRS = [
  ["#f1f5f9", "#e0fbff"], // titres, texte principal
  ["#e2e8f0", "#cdeef6"], // texte courant
  ["#cbd5e1", "#b6dbe6"], // texte clair secondaire
  ["#94a3b8", "#8fb3c4"], // texte secondaire, intro
];
const back = process.argv[2] === "back";
const map = back ? PAIRS.map(([a, b]) => [b, a]) : PAIRS;

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(jsx?|css)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(p);
  }
})("src");

let changed = 0;
for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  const before = s;
  for (const [from, to] of map) s = s.split(from).join(to).split(from.toUpperCase()).join(to);
  if (s !== before) {
    fs.writeFileSync(f, s);
    changed++;
  }
}
console.log(`${back ? "blanc d'origine" : "teinte cyan"} : ${changed} fichiers`);
