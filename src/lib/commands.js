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
// ─────────────────────────────────────────────────────────────────────────────

/** Lectures PowerShell → une ligne, collable dans cmd, PowerShell ou Terminal. */
export function windowsCommand(reads) {
  return `powershell -NoProfile -Command "& { ${reads.join("; ")} } | Out-String -Width 300 | Set-Clipboard"`;
}

/** Commandes macOS → une ligne dont la sortie part dans le presse-papiers. */
export function macCommand(parts) {
  return `{ ${parts.join(" ; ")} ; } 2>&1 | pbcopy`;
}

/** Commandes Linux → une ligne ; la sortie s'affiche dans le terminal. */
export function linuxCommand(parts) {
  return parts.join(" ; ");
}
