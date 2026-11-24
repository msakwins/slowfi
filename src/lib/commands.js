// ─────────────────────────────────────────────────────────────────────────────
// Assemblage des commandes à copier.
//
// Le résultat d'une analyse fait des centaines de lignes : le sélectionner à
// la souris dans PowerShell est pénible. Les commandes Windows et macOS
// placent donc elles-mêmes leur sortie dans le presse-papiers ; il ne reste
// qu'à coller dans la page.
//
// - Windows : tout passe dans un bloc PowerShell, mis en texte (Out-String,
//   assez large pour ne pas couper les lignes) puis Set-Clipboard, qui garde
//   les accents. Le tout fonctionne aussi depuis l'Invite de commandes.
// - macOS : pbcopy.
// - Linux : aucun outil de presse-papiers n'est installé d'office ; la sortie
//   reste dans le terminal.
//
// Sans rien afficher, la commande semblait ne rien faire (les lectures
// prennent quelques secondes), et on la recollait, ce qui collait le
// résultat dans le terminal. Elle annonce donc son début et sa fin, et
// affiche aussi le résultat dans le terminal, en plus de le copier.
//
// Sous Windows, pas de « $ » dans la commande : collée dans PowerShell, la
// chaîne entre guillemets serait développée avant d'arriver au sous-shell.
// D'où Tee-Object -Variable puis Get-Variable -ValueOnly.
// ─────────────────────────────────────────────────────────────────────────────

const MESSAGES = {
  fr: {
    start: "Chargement...",
    done: (keys) =>
      `Résultat copié, vous pouvez maintenant le coller dans la page (${keys})`,
  },
  en: {
    start: "Loading...",
    done: (keys) => `Result copied, you can now paste it into the page (${keys})`,
  },
};
const say = (lang) => MESSAGES[lang] ?? MESSAGES.fr;

/**
 * Texte → expression PowerShell. Les lettres accentuées sont écrites
 * [char]0x… : tapées telles quelles, l'Invite de commandes les transmettrait
 * abîmées à PowerShell.
 */
export function psText(text) {
  const parts = [];
  let plain = "";
  for (const ch of text) {
    if (ch.charCodeAt(0) < 128) {
      plain += ch === "'" ? "''" : ch;
      continue;
    }
    if (plain) parts.push(`'${plain}'`);
    plain = "";
    parts.push(`[char]0x${ch.charCodeAt(0).toString(16).toUpperCase()}`);
  }
  if (plain) parts.push(`'${plain}'`);
  return parts.length === 1 ? parts[0] : `(${parts.join(" + ")})`;
}

/**
 * Lectures PowerShell → une ligne, collable dans cmd, PowerShell ou Terminal.
 * @param {string[]} reads
 * @param {"fr"|"en"} [lang] langue des messages affichés dans le terminal
 */
export function windowsCommand(reads, lang) {
  const m = say(lang);
  return `powershell -NoProfile -Command "Write-Host ${psText(m.start)} -ForegroundColor Cyan; & { ${reads.join("; ")} } | Out-String -Width 300 | Tee-Object -Variable slowfi | Set-Clipboard; Get-Variable slowfi -ValueOnly; Write-Host ${psText(m.done("Ctrl + V"))} -ForegroundColor Green"`;
}

/**
 * Commandes macOS → une ligne dont la sortie s'affiche et part dans le
 * presse-papiers.
 * @param {string[]} parts
 * @param {"fr"|"en"} [lang]
 */
export function macCommand(parts, lang) {
  const m = say(lang);
  return `echo '${m.start}' ; { ${parts.join(" ; ")} ; } 2>&1 | tee /dev/tty | pbcopy && echo '${m.done("Cmd + V")}'`;
}

/** Commandes Linux → une ligne ; la sortie s'affiche dans le terminal. */
export function linuxCommand(parts) {
  return parts.join(" ; ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Application desktop : elle lance elle-même la commande et lit sa sortie. Le
// presse-papiers ne sert plus ; il reste le script à donner au shell du
// système (PowerShell, zsh, bash).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Commande à copier → script à exécuter directement.
 * @param {"windows"|"mac"|"linux"} system
 * @param {string} command
 */
export function appScript(system, command) {
  if (system === "windows") {
    const inner = command.match(/^powershell -NoProfile -Command "([\s\S]*)"$/);
    const body = inner ? inner[1] : command;
    // Ni les messages de début et de fin, ni l'affichage, ni le
    // presse-papiers.
    return body
      .replace(/^Write-Host [^;]*;\s*/, "")
      .replace(/\s*\|\s*Tee-Object[\s\S]*$/, "");
  }
  if (system === "mac")
    return command
      .replace(/^echo [^;]*;\s*/, "")
      .replace(/\s*\|\s*tee \/dev\/tty[\s\S]*$/, "");
  return command;
}

/** Système de l'application, d'après process.platform. */
export function appSystem(platform) {
  return platform === "win32"
    ? "windows"
    : platform === "darwin"
      ? "mac"
      : "linux";
}
