// ─────────────────────────────────────────────────────────────────────────────
// Page « Dépannage » : un problème à la fois. Chaque sujet dit quelle analyse
// lancer (périphériques, réseau ou matériel), quel type d'appareil regarder,
// quoi vérifier à la main, et quels autres sujets peuvent être en cause.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * area   : analyse à lancer (« devices », « network », « ethernet »,
 *          « hardware »)
 * group  : catégorie d'appareil (devices.js), pour les périphériques
 * flow   : « capture » (micro) ou « render » (sortie), pour l'audio
 * related: sujets à examiner ensuite
 * tips   : vérifications à la main (réseau, matériel ; les périphériques ont
 *          les leurs dans troubleshoot.js)
 */
export const TOPICS = {
  keyboard: { area: "devices", group: "keyboard", related: ["bluetooth", "mouse", "slow"] },
  mouse: { area: "devices", group: "mouse", related: ["bluetooth", "keyboard", "slow"] },
  sound: { area: "devices", group: "audio", flow: "render", related: ["bluetooth", "mic", "screen"] },
  mic: { area: "devices", group: "audio", flow: "capture", related: ["sound", "camera", "bluetooth"] },
  camera: { area: "devices", group: "camera", related: ["mic", "slow"] },
  bluetooth: { area: "devices", group: "bluetooth", related: ["keyboard", "mouse", "sound"] },
  screen: { area: "devices", group: "monitor", related: ["slow", "sound"] },
  printer: { area: "devices", group: "printer", related: ["wifi", "internet"] },
  wifi: {
    area: "network",
    related: ["internet", "slow"],
    tips: {
      fr: [
        "Se rapprocher de la box, ou passer sur le réseau 5 GHz",
        "Redémarrer la box et l'ordinateur",
        "Mettre à jour le pilote de la carte Wi-Fi",
      ],
      en: [
        "Move closer to the router, or switch to the 5 GHz network",
        "Restart the router and the computer",
        "Update the Wi-Fi card driver",
      ],
    },
  },
  ethernet: {
    area: "ethernet",
    related: ["internet", "wifi"],
    tips: {
      fr: [
        "Essayer un autre câble, puis un autre port de la box",
        "Préférer un câble de catégorie 5e ou supérieure",
        "Mettre à jour le pilote de la carte réseau",
      ],
      en: [
        "Try another cable, then another router port",
        "Use a category 5e cable or better",
        "Update the network card driver",
      ],
    },
  },
  internet: {
    area: "network",
    related: ["wifi", "slow"],
    tips: {
      fr: [
        "Redémarrer la box : la débrancher 30 secondes",
        "Tester avec un câble Ethernet, pour savoir si le Wi-Fi est en cause",
        "Vérifier l'état de la ligne sur le site du fournisseur d'accès",
      ],
      en: [
        "Restart the router: unplug it for 30 seconds",
        "Test with an Ethernet cable, to find out whether the Wi-Fi is the cause",
        "Check the line status on the internet provider's website",
      ],
    },
  },
  disk: {
    area: "hardware",
    related: ["slow"],
    tips: {
      fr: [
        "Garder au moins 20 % d'espace libre sur le disque de Windows",
        "Sauvegarder sans attendre si un disque signale des erreurs",
      ],
      en: [
        "Keep at least 20% free space on the Windows drive",
        "Back up right away if a drive reports errors",
      ],
    },
  },
  startup: {
    area: "hardware",
    related: ["slow", "disk", "updates"],
    tips: {
      fr: [
        "Désactiver les programmes inutiles au démarrage : Gestionnaire des tâches › Applications de démarrage",
        "Passer Windows sur un SSD s'il est installé sur un disque dur",
        "Laisser les mises à jour de Windows se terminer",
      ],
      en: [
        "Disable unneeded startup programs: Task Manager › Startup apps",
        "Move Windows to an SSD if it is installed on a hard drive",
        "Let Windows updates finish",
      ],
    },
  },
  heat: {
    area: "hardware",
    related: ["slow", "crashes"],
    tips: {
      fr: [
        "Dépoussiérer les ventilateurs et les grilles d'aération",
        "Laisser de l'espace autour de l'ordinateur pour la circulation de l'air",
        "Suivre les températures sur la page Capteurs (application)",
      ],
      en: [
        "Dust the fans and air vents",
        "Leave room around the computer for airflow",
        "Track temperatures on the Sensors page (app)",
      ],
    },
  },
  crashes: {
    area: "hardware",
    related: ["heat", "disk", "updates"],
    tips: {
      fr: [
        "Mettre à jour le pilote graphique et le BIOS",
        "Tester la mémoire avec l'outil Diagnostic de mémoire Windows",
        "Vérifier les températures et l'alimentation électrique",
      ],
      en: [
        "Update the graphics driver and the BIOS",
        "Test the memory with the Windows Memory Diagnostic tool",
        "Check temperatures and the power supply",
      ],
    },
  },
  battery: {
    area: "hardware",
    related: ["heat", "slow"],
    tips: {
      fr: [
        "Activer la charge limitée si le fabricant la propose, pour ménager la batterie",
        "Réduire la luminosité et fermer les programmes gourmands",
        "Prévoir le remplacement au-delà de 40 % d'usure",
      ],
      en: [
        "Enable limited charging if the maker offers it, to spare the battery",
        "Lower the brightness and close demanding programs",
        "Plan a replacement beyond 40% wear",
      ],
    },
  },
  updates: {
    area: "hardware",
    related: ["disk", "startup"],
    tips: {
      fr: [
        "Garder au moins 20 Go libres sur le disque de Windows",
        "Lancer l'utilitaire de résolution des problèmes de Windows Update",
        "Redémarrer, puis relancer la recherche de mises à jour",
      ],
      en: [
        "Keep at least 20 GB free on the Windows drive",
        "Run the Windows Update troubleshooter",
        "Restart, then search for updates again",
      ],
    },
  },
  slow: {
    area: "hardware",
    related: ["disk", "wifi"],
    tips: {
      fr: [
        "Désactiver les programmes inutiles au démarrage",
        "Redémarrer l'ordinateur : un arrêt rapide ne le remet pas à zéro",
        "Vérifier les températures sur la page Capteurs (application)",
      ],
      en: [
        "Disable unneeded startup programs",
        "Restart the computer: a fast shutdown does not reset it",
        "Check the temperatures on the Sensors page (app)",
      ],
    },
  },
};

/** Ordre d'affichage, par famille : le même que le diagnostic complet. */
export const TOPIC_GROUPS = [
  ["network", ["wifi", "ethernet", "internet"]],
  ["pc", ["slow", "startup", "heat", "crashes", "disk", "battery", "updates"]],
  ["devices", ["keyboard", "mouse", "sound", "mic", "camera", "bluetooth", "screen", "printer"]],
];
