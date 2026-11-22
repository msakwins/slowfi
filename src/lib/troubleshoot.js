// ─────────────────────────────────────────────────────────────────────────────
// « Cet appareil ne marche pas » : l'utilisateur choisit un périphérique dans
// la liste, et on lui répond pour celui-là.
//
// Beaucoup de pannes ne laissent aucune trace dans le Gestionnaire de
// périphériques : micro coupé par Voice Clarity, accès bloqué par la
// confidentialité, mauvais appareil choisi dans l'application. On met donc
// d'abord ce que les lectures disent de cet appareil (effets audio, état de
// l'entrée, service, accès), puis les vérifications à faire à la main, dans
// l'ordre où elles règlent le plus souvent le problème.
// ─────────────────────────────────────────────────────────────────────────────

const lower = (s) => (s ?? "").toLowerCase();

/** Micro ou sortie : d'après l'entrée audio, sinon d'après le nom. */
function audioKind(r, name) {
  const e = (r.audio ?? []).find((x) => lower(x.name) === lower(name));
  if (e) return { kind: e.flow === "capture" ? "mic" : "output", endpoint: e };
  return {
    kind: /micro|mic\b|input|entr[ée]e|line in|ligne/i.test(name)
      ? "mic"
      : "output",
    endpoint: null,
  };
}

/** Type de panne à traiter pour l'appareil choisi. */
export function kindOf(r, device) {
  if (!device) return { kind: "missing", endpoint: null };
  if (device.group === "audio") return audioKind(r, device.name);
  return {
    kind:
      {
        camera: "camera",
        keyboard: "keyboard",
        mouse: "mouse",
        bluetooth: "bluetooth",
        monitor: "monitor",
        printer: "printer",
      }[device.group] ?? "other",
    endpoint: null,
  };
}

// Constats généraux qui concernent chaque type d'appareil.
const RELATED = {
  mic: (f) =>
    f.key === "audio-none-active"
      ? f.vars.flow === "capture"
      : f.key === "service-down"
        ? f.vars.group === "audio"
        : f.key === "privacy-denied" && f.vars.what === "microphone",
  output: (f) =>
    f.key === "audio-none-active"
      ? f.vars.flow === "render"
      : f.key === "service-down" && f.vars.group === "audio",
  camera: (f) => f.key === "privacy-denied" && f.vars.what === "webcam",
  bluetooth: (f) => f.key === "service-down" && f.vars.group === "bluetooth",
  printer: (f) => f.key === "service-down" && f.vars.group === "printer",
};

/** Constats propres à une entrée ou sortie audio. */
function endpointFindings(e) {
  const out = [];
  const mic = e.flow === "capture";
  if (e.state === "disabled") {
    out.push({
      level: "problem",
      id: `endpoint-disabled-${e.id}`,
      key: "endpoint-disabled",
      vars: { name: e.name, mic },
      title: `${mic ? "Micro désactivé" : "Sortie désactivée"} dans Windows : ${e.name}`,
      detail: "Windows le voit mais ne s'en sert pas",
      fix: `Paramètres › Système › Son › Plus de paramètres de son › onglet ${mic ? "Enregistrement" : "Lecture"} › clic droit sur l'appareil › Activer`,
    });
  }
  if (e.effects && e.voiceClarity && mic) {
    out.push({
      level: "problem",
      id: `voice-clarity-${e.id}`,
      key: "voice-clarity",
      vars: { name: e.name },
      title: `Voice Clarity est activé sur ce micro`,
      detail:
        "Cet effet de Windows retire le bruit et l'écho. Avec certains casques et micros USB, il coupe la voix, la rend hachée ou la fait disparaître : c'est la cause la plus probable",
      fix: "Paramètres › Système › Son › cliquer sur le micro › « Améliorations audio » : Désactivé. Puis refaire un essai dans l'application",
    });
  } else if (e.effects && mic) {
    // Sur une sortie, les améliorations sont activées presque partout :
    // c'est une simple vérification de la liste (tip-out-effects).
    out.push({
      level: "warning",
      id: `effects-${e.id}`,
      key: "audio-effects",
      vars: { name: e.name, mic },
      title: "Améliorations audio activées",
      detail: mic
        ? "Les effets du pilote ou de Windows (réduction de bruit, gain automatique) coupent ou étouffent la voix avec certains micros"
        : "Les effets du pilote ou de Windows (son spatial, égaliseur) déforment le son ou le coupent avec certains casques et enceintes",
      fix: `Paramètres › Système › Son › cliquer sur ${mic ? "le micro" : "la sortie"} › « Améliorations audio » : Désactivé, puis refaire un essai`,
    });
  }
  return out;
}

// Vérifications à faire à la main, par type d'appareil, dans l'ordre.
export const TIPS = {
  mic: [
    [
      "mic-mute",
      "Vérifier le bouton muet du casque ou du micro (souvent un bouton sur le fil ou la perche relevée), et la molette de volume du casque",
    ],
    [
      "mic-app",
      "Choisir ce micro dans l'application (Discord, Teams, Zoom, le jeu) : elle garde souvent l'ancien micro, même quand Windows a changé",
    ],
    [
      "mic-level",
      "Paramètres › Système › Son › cliquer sur le micro : régler le volume d'entrée vers 80 et parler en regardant la jauge « Tester le micro »",
    ],
    [
      "mic-exclusive",
      "Fermer les autres applications qui utilisent le micro : certaines le prennent pour elles seules",
    ],
    [
      "replug",
      "Débrancher puis rebrancher l'appareil, sur un port USB de l'ordinateur plutôt que sur un hub ou une façade",
    ],
  ],
  output: [
    [
      "out-default",
      "Cliquer sur l'icône du son dans la barre des tâches › flèche à côté du volume : choisir cette sortie",
    ],
    [
      "out-mixer",
      "Clic droit sur l'icône du son › Ouvrir le mélangeur de volume : vérifier que l'application n'est ni muette ni à zéro, et qu'elle sort sur le bon appareil",
    ],
    [
      "out-app",
      "Choisir cette sortie dans les réglages audio de l'application (Discord, Teams, le jeu)",
    ],
    [
      "out-bt",
      "Casque Bluetooth : choisir l'entrée « Casque » ou « Stéréo » et non « Mains libres », qui donne un son de téléphone",
    ],
    [
      "replug",
      "Débrancher puis rebrancher l'appareil, sur un port USB de l'ordinateur plutôt que sur un hub ou une façade",
    ],
  ],
  camera: [
    [
      "cam-shutter",
      "Vérifier le cache de l'objectif et la touche caméra du clavier (souvent F8 ou F10 sur les portables)",
    ],
    [
      "cam-busy",
      "Fermer les autres applications qui utilisent la caméra : une seule à la fois peut s'en servir",
    ],
    [
      "cam-app",
      "Choisir cette caméra dans les réglages vidéo de l'application",
    ],
    [
      "replug",
      "Débrancher puis rebrancher l'appareil, sur un port USB de l'ordinateur plutôt que sur un hub ou une façade",
    ],
  ],
  keyboard: [
    [
      "wireless-battery",
      "Sans fil : changer ou recharger les piles, et rapprocher le récepteur USB (une rallonge USB aide quand le PC est sous le bureau)",
    ],
    [
      "replug",
      "Débrancher puis rebrancher l'appareil, sur un port USB de l'ordinateur plutôt que sur un hub ou une façade",
    ],
    [
      "kb-filter",
      "Touches lentes ou ignorées : Paramètres › Accessibilité › Clavier › désactiver « Touches filtres » et « Touches rémanentes »",
    ],
  ],
  mouse: [
    [
      "wireless-battery",
      "Sans fil : changer ou recharger les piles, et rapprocher le récepteur USB (une rallonge USB aide quand le PC est sous le bureau)",
    ],
    [
      "mouse-surface",
      "Curseur qui saute : nettoyer le capteur et essayer sur un tapis, pas sur du verre ou une surface brillante",
    ],
    [
      "replug",
      "Débrancher puis rebrancher l'appareil, sur un port USB de l'ordinateur plutôt que sur un hub ou une façade",
    ],
  ],
  bluetooth: [
    [
      "bt-toggle",
      "Désactiver puis réactiver le Bluetooth (Paramètres › Bluetooth et appareils)",
    ],
    [
      "bt-repair",
      "Supprimer l'appareil dans Paramètres › Bluetooth et appareils, le remettre en mode association, puis l'ajouter à nouveau",
    ],
    [
      "bt-range",
      "Rapprocher l'appareil et éloigner le PC des sources d'ondes (routeur, clés USB 3 branchées à côté du récepteur)",
    ],
    [
      "bt-other",
      "Le déconnecter du téléphone ou de l'autre ordinateur auquel il est encore associé",
    ],
  ],
  monitor: [
    [
      "mon-cable",
      "Vérifier le câble aux deux bouts, et la source choisie dans le menu de l'écran (HDMI, DisplayPort)",
    ],
    [
      "mon-gpu",
      "PC fixe : brancher l'écran sur la carte graphique, pas sur les prises de la carte mère",
    ],
    [
      "mon-reset",
      "Écran noir ou figé : Windows + Ctrl + Maj + B relance le pilote graphique sans fermer les applications",
    ],
    [
      "mon-detect",
      "Paramètres › Système › Écran › Plusieurs écrans › Détecter, puis vérifier la fréquence dans Écran › Paramètres d'affichage avancés",
    ],
  ],
  printer: [
    [
      "print-queue",
      "Ouvrir la file d'attente (Paramètres › Bluetooth et appareils › Imprimantes et scanners › l'imprimante) et annuler les documents bloqués",
    ],
    [
      "print-default",
      "Vérifier que c'est l'imprimante choisie au moment d'imprimer, et qu'elle n'est pas « hors connexion »",
    ],
    [
      "print-network",
      "Imprimante en Wi-Fi : l'éteindre et la rallumer, et vérifier qu'elle est sur le même réseau que l'ordinateur",
    ],
    [
      "print-driver",
      "Supprimer l'imprimante dans Windows, puis l'ajouter à nouveau avec le pilote du site du fabricant",
    ],
  ],
  other: [
    [
      "replug",
      "Débrancher puis rebrancher l'appareil, sur un port USB de l'ordinateur plutôt que sur un hub ou une façade",
    ],
    [
      "other-driver",
      "Installer le pilote ou le logiciel du fabricant de l'appareil",
    ],
    ["restart", "Redémarrer l'ordinateur (Redémarrer, pas Arrêter)"],
  ],
  missing: [
    [
      "replug",
      "Débrancher puis rebrancher l'appareil, sur un port USB de l'ordinateur plutôt que sur un hub ou une façade",
    ],
    [
      "missing-power",
      "Vérifier qu'il est allumé, chargé, et, pour un appareil sans fil, que son récepteur ou son association Bluetooth est en place",
    ],
    [
      "missing-scan",
      "Clic droit sur le menu Démarrer › Gestionnaire de périphériques › Action › Rechercher les modifications sur le matériel",
    ],
    [
      "missing-cable",
      "Essayer un autre câble : beaucoup de câbles USB ne font que charger et ne transmettent rien",
    ],
    ["restart", "Redémarrer l'ordinateur (Redémarrer, pas Arrêter)"],
  ],
};

/**
 * Ce que Slowfi sait de l'appareil choisi, puis ce qu'il reste à vérifier.
 * @param {ReturnType<import("./devices.js").analyzeDevices>} r
 * @param {{name:string, group:string|null}|null} device null : appareil absent de la liste
 * @returns {{kind:string, found:object[], tips:object[]}}
 */
export function troubleshoot(r, device) {
  const { kind, endpoint } = kindOf(r, device);
  const found = [];

  // Le périphérique lui-même en erreur (code du Gestionnaire).
  if (device) {
    for (const f of r.findings)
      if (f.vars?.name === device.name && f.level) found.push(f);
  }
  if (endpoint) found.push(...endpointFindings(endpoint));
  // Service, confidentialité : ce qui touche ce type d'appareil. Appareil
  // absent : tous les constats généraux.
  const related = kind === "missing" ? () => true : RELATED[kind];
  if (related) {
    for (const f of r.findings)
      if (f.level && !found.includes(f) && !f.vars?.name && related(f))
        found.push(f);
  }

  const tips = [];
  // Plusieurs micros ou sorties en service : l'application prend peut-être
  // l'autre.
  if (kind === "mic" || kind === "output") {
    const flow = kind === "mic" ? "capture" : "render";
    const others = (r.audio ?? []).filter(
      (e) =>
        e.flow === flow &&
        e.state === "active" &&
        lower(e.name) !== lower(device?.name),
    );
    if (others.length > 0) {
      const names = others.map((e) => e.name).join(", ");
      tips.push({
        id: "tip-others",
        key: "tip-others",
        vars: { names, mic: kind === "mic" },
        title: `${kind === "mic" ? "D'autres micros sont" : "D'autres sorties sont"} en service (${names}) : l'application utilise peut-être l'un d'eux`,
      });
    }
  }
  for (const [id, title] of TIPS[kind] ?? TIPS.other)
    tips.push({ id: `tip-${id}`, key: `tip-${id}`, title });
  if (kind === "output" && endpoint?.effects) {
    tips.push({
      id: "tip-out-effects",
      key: "tip-out-effects",
      title:
        "Son déformé ou coupé : Paramètres › Système › Son › cliquer sur la sortie › « Améliorations audio » : Désactivé",
    });
  }

  return { kind, found, tips };
}
