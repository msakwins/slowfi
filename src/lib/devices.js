// ─────────────────────────────────────────────────────────────────────────────
// Périphériques : audio, caméra, clavier, souris, Bluetooth, écrans,
// imprimantes, et tout appareil que Windows signale en erreur.
//
// Windows connaît l'état de chaque périphérique (le triangle jaune du
// Gestionnaire de périphériques) mais ne le montre que si on va le chercher.
// Le code d'erreur dit pourquoi : pilote absent (28), désactivé (22), arrêté
// après un problème (43)…
//
// Windows : Win32_PnPEntity (Format-List). macOS : system_profiler, qui
// liste les appareils sans état d'erreur.
// ─────────────────────────────────────────────────────────────────────────────
import { parseBlocks, field, number } from "./powershell.js";
import { isLinux, parseLinuxDevices } from "./linux.js";

// Catégories affichées, dans l'ordre, et les classes Windows qui les
// alimentent. AudioEndpoint donne les entrées et sorties telles que
// l'utilisateur les connaît (« Casque », « Microphone ») ; MEDIA ne sert que
// s'il n'y en a aucune.
export const GROUPS = [
  ["audio", ["AudioEndpoint"]],
  ["camera", ["Camera", "Image"]],
  ["keyboard", ["Keyboard"]],
  ["mouse", ["Mouse"]],
  ["bluetooth", ["Bluetooth"]],
  ["monitor", ["Monitor"]],
  ["printer", ["Printer", "PrintQueue"]],
  ["usb", []],
];

export const GROUP_LABEL = {
  audio: "Audio",
  camera: "Caméra",
  keyboard: "Clavier",
  mouse: "Souris",
  bluetooth: "Bluetooth",
  monitor: "Écran",
  printer: "Imprimante",
  usb: "USB",
  other: "Périphérique",
};

// Entrées techniques de Windows, sans intérêt pour l'utilisateur : services
// et protocoles Bluetooth, énumérateurs, proxys.
const NOISE =
  /num[ée]?rateur|enumerator|service|transport|proxy|protocol|rfcomm|avrcp|gatt|hands-free ag|wave extensible|virtual audio/i;

/**
 * @param {string} raw
 * @returns {Array<{name:string, cls:string|null, status:string|null, code:number|null}>}
 */
export function parsePnp(raw) {
  const seen = new Set();
  const out = [];
  for (const f of parseBlocks(raw)) {
    if (!("PNPClass" in f) && !("ConfigManagerErrorCode" in f)) continue;
    // Bloc de la carte graphique (analyse du matériel collée en même temps) :
    // elle a aussi un code d'erreur, mais son verdict est déjà ailleurs.
    if ("DriverVersion" in f) continue;
    const name = field(f, "Name");
    if (!name) continue;
    const cls = field(f, "PNPClass");
    const key = `${name}|${cls}`;
    // Le même appareil apparaît dans les deux listes de la commande, et
    // certains (claviers, souris) une fois par interface : on dédoublonne.
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      cls,
      status: field(f, "Status"),
      code: number(f, "ConfigManagerErrorCode"),
    });
  }
  return out;
}

/**
 * Appareils d'un Mac, d'après `system_profiler SPAudioDataType
 * SPBluetoothDataType SPCameraDataType SPDisplaysDataType`. Chaque section
 * nomme ses appareils sur une ligne « Nom: » plus indentée que son titre.
 * @param {string} raw
 */
export function parseMacDevices(raw) {
  const out = [];
  let section = null;
  let sub = null;
  // Retrait des noms d'appareils dans la sous-section courante : les lignes
  // plus indentées (« Properties: »…) appartiennent à l'appareil.
  let level = null;
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^(\s*)(\S[^:]*):\s*$/);
    if (!m) continue;
    const indent = m[1].length;
    const title = m[2].trim();
    if (indent === 0) {
      section =
        {
          Audio: "audio",
          Bluetooth: "bluetooth",
          Camera: "camera",
          "Graphics/Displays": "monitor",
        }[title] ?? null;
      sub = null;
      level = null;
      continue;
    }
    if (!section) continue;
    if (
      /^(Devices|Connected|Not Connected|Displays|Bluetooth Controller)$/i.test(
        title,
      )
    ) {
      sub = title;
      level = null;
      continue;
    }
    // Un appareil : sous « Devices » (audio), « Connected » (Bluetooth),
    // « Displays » (écrans), ou directement sous « Camera ».
    const wanted =
      (section === "audio" && sub === "Devices") ||
      (section === "bluetooth" && sub === "Connected") ||
      (section === "monitor" && sub === "Displays") ||
      section === "camera";
    if (!wanted) continue;
    if (level == null) level = indent;
    if (indent === level) out.push({ name: title, group: section });
  }
  return out;
}

function groupOf(cls) {
  return GROUPS.find(([, classes]) => classes.includes(cls))?.[0] ?? null;
}

/**
 * @param {{ platform: "windows"|"mac", devices: Array<{name:string, group:string|null, code:number|null, status:string|null}> }} d
 */
export function diagnoseDevices(d) {
  const findings = [];
  let severity = "ok";
  const bump = (level) => {
    const rank = { ok: 0, warning: 1, problem: 2 };
    if (rank[level] > rank[severity]) severity = level;
  };

  // Code 45 : appareil débranché dont Windows garde la trace. Pas une panne.
  const broken = d.devices.filter(
    (x) =>
      (x.code && x.code !== 45) ||
      (x.status && /error|degraded/i.test(x.status) && x.code !== 45),
  );
  for (const x of broken) {
    const disabled = x.code === 22;
    bump(disabled ? "warning" : "problem");
    const kind =
      d.platform !== "windows"
        ? "missing-mac"
        : x.code === 28
          ? "no-driver"
          : disabled
            ? "disabled"
            : x.code === 43
              ? "stopped"
              : "error";
    findings.push({
      level: disabled ? "warning" : "problem",
      id: `device-${kind}-${x.name}`,
      key: `device-${kind}`,
      vars: { name: x.name, code: x.code },
      title: {
        "no-driver": `Pilote manquant : ${x.name}`,
        disabled: `Périphérique désactivé : ${x.name}`,
        stopped: `Périphérique arrêté par Windows : ${x.name}`,
        error: `Périphérique en erreur : ${x.name}`,
        "missing-mac": `Périphérique qui ne fonctionne pas : ${x.name}`,
      }[kind],
      detail: {
        "no-driver":
          "Aucun pilote n'est installé pour ce périphérique (code 28) : Windows le voit mais ne peut pas s'en servir",
        disabled:
          "Le périphérique est désactivé dans Windows (code 22) : il n'est pas utilisé",
        stopped:
          "Windows a arrêté le périphérique après un problème signalé (code 43) : pilote défectueux, câble ou port USB en cause, parfois une panne de l'appareil",
        error: x.code
          ? `Windows signale l'erreur ${x.code} sur ce périphérique : il ne fonctionne pas normalement`
          : "Le périphérique est signalé en erreur et ne fonctionne pas normalement",
        "missing-mac":
          "Appareil signalé absent ou défaillant dans les réglages du système",
      }[kind],
      fix: {
        "no-driver":
          "Installer le pilote depuis le site du fabricant de l'appareil. Si l'appareil n'est plus utilisé, le désinstaller dans le Gestionnaire de périphériques",
        disabled:
          "Clic droit sur le menu Démarrer › Gestionnaire de périphériques › clic droit sur l'appareil › Activer le périphérique",
        stopped:
          "Débrancher l'appareil, le rebrancher sur un autre port, puis réinstaller son pilote depuis le site du fabricant",
        error:
          "Clic droit sur le menu Démarrer › Gestionnaire de périphériques › clic droit sur l'appareil › Désinstaller, puis redémarrer pour que Windows le réinstalle",
        "missing-mac":
          "Débrancher puis rebrancher l'appareil (en Bluetooth : l'oublier, puis l'associer à nouveau), puis redémarrer l'ordinateur",
      }[kind],
    });
  }

  if (findings.length === 0) {
    findings.push({
      id: "healthy",
      key: d.platform === "windows" ? "healthy" : "healthy-mac",
      title: "Aucun périphérique en erreur",
      detail:
        d.platform !== "windows"
          ? "Ce système ne signale pas d'erreur de périphérique : seuls les appareils reconnus sont listés"
          : undefined,
    });
  }

  // Ce qui fonctionne, par catégorie : « Audio : Casque (HyperX…), … ».
  const passed = [];
  for (const [group] of GROUPS) {
    const names = [
      ...new Set(
        d.devices
          .filter((x) => x.group === group && !broken.includes(x))
          .map((x) => x.name),
      ),
    ];
    if (names.length === 0) continue;
    passed.push({
      id: "device-group",
      vars: { group, names: names.join(", ") },
      label: `${GROUP_LABEL[group]} : ${names.join(", ")}`,
    });
  }

  return { ...d, broken, severity, findings, passed };
}

/** Texte collé → verdict, ou null si rien de reconnu. */
export function analyzeDevices(raw) {
  const pnp = parsePnp(raw);
  if (pnp.length > 0) {
    const devices = pnp
      .filter((x) => !NOISE.test(x.name))
      .map((x) => ({ ...x, group: groupOf(x.cls) }));
    // Pas de sortie audio nommée : on se rabat sur les cartes son (MEDIA).
    if (!devices.some((x) => x.group === "audio")) {
      for (const x of devices) if (x.cls === "MEDIA") x.group = "audio";
    }
    return diagnoseDevices({ platform: "windows", devices });
  }
  if (isLinux(raw)) {
    const linux = parseLinuxDevices(raw);
    if (linux.length > 0)
      return diagnoseDevices({ platform: "linux", devices: linux });
  }
  const mac = parseMacDevices(raw);
  if (mac.length > 0) {
    return diagnoseDevices({
      platform: "mac",
      devices: mac.map((x) => ({ ...x, code: null, status: null })),
    });
  }
  return null;
}
