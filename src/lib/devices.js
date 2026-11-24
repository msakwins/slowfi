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
//
// Un appareil peut aussi être « en bon état » pour Windows et ne pas marcher :
// micro bloqué par la confidentialité, service audio arrêté, effet de Windows
// (Voice Clarity) qui coupe la voix avec certains casques. Sous Windows, on lit
// donc aussi les entrées et sorties audio dans le registre, l'accès au micro
// et à la caméra, et les services dont dépendent le son, le Bluetooth et
// l'impression.
// ─────────────────────────────────────────────────────────────────────────────
import { parseBlocks, field, number } from "./powershell.js";
import { isLinux, parseLinuxDevices } from "./linux.js";

// Catégories affichées, dans l'ordre, et les classes Windows qui les
// alimentent. AudioEndpoint donne les entrées et sorties telles que
// l'utilisateur les connaît (« Casque », « Microphone ») ; MEDIA ne sert que
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
 * nomme ses appareils sur une ligne « Nom: » plus indentée que son titre.
 * @param {string} raw
 */
export function parseMacDevices(raw) {
  const out = [];
  let section = null;
  let sub = null;
  // Retrait des noms d'appareils dans la sous-section courante : les lignes
  // plus indentées (« Properties: »…) appartiennent à l'appareil.
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
    // Un appareil : sous « Devices » (audio), « Connected » (Bluetooth),
    // « Displays » (écrans), ou directement sous « Camera ».
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

// ── Audio, confidentialité et services (Windows) ────────────────────────────

const MMDEV =
  /MMDevices\\Audio\\(Capture|Render)\\(\{[0-9a-f-]{36}\})(\\\w+)?$/i;
// Nom court (« Microphone ») et nom de l'appareil (« HyperX Cloud Alpha »).
const KIND = "{a45c254e-df1c-4efd-8020-67d146a850e0},2";
const MODEL = "{b3f8fa53-0004-438e-9003-51a46e139bfc},6";
// PKEY_AudioEndpoint_Disable_SysFx : 1 = « Améliorations audio » désactivées.
const SYSFX_OFF = "{1da5d803-d492-4edd-8c23-e0c0ffee7f0e},5";
// Pack d'effets attaché à l'entrée ; VocaEffectPack est celui de Voice Clarity.
const EFFECT_PACK = "{9e6136e0-57ab-4949-b57a-3627be142855},100";
// DeviceState (4 bits de poids faible) : 1 actif, 2 désactivé, 4 absent,
// 8 débranché.
const STATES = { 1: "active", 2: "disabled", 4: "absent", 8: "unplugged" };

/**
 * Entrées et sorties audio, d'après trois lectures du registre (état, noms,
 * effets), réunies par identifiant.
 * @param {string} raw
 * @returns {Array<{id:string, flow:"capture"|"render", name:string|null, state:string|null, effects:boolean|null, voiceClarity:boolean}>}
 */
export function parseAudioEndpoints(raw) {
  const byId = new Map();
  for (const f of parseBlocks(raw)) {
    const m = (field(f, "PSPath") ?? "").match(MMDEV);
    if (!m) continue;
    const id = m[2].toLowerCase();
    const e = byId.get(id) ?? {
      id,
      flow: m[1].toLowerCase() === "capture" ? "capture" : "render",
      name: null,
      state: null,
      effects: null,
      voiceClarity: false,
    };
    byId.set(id, e);
    const sub = (m[3] ?? "").slice(1).toLowerCase();
    if (sub === "") {
      const n = number(f, "DeviceState");
      if (n != null) e.state = STATES[n & 0xf] ?? null;
    } else if (sub === "properties") {
      const kind = field(f, KIND);
      const model = field(f, MODEL);
      // Même forme que dans le Gestionnaire de périphériques :
      // « Microphone (HyperX Cloud Alpha Wireless) ».
      e.name = kind && model ? `${kind} (${model})` : (kind ?? model);
    } else if (sub === "fxproperties") {
      e.effects = field(f, SYSFX_OFF) !== "1";
      e.voiceClarity = /VocaEffectPack/i.test(field(f, EFFECT_PACK) ?? "");
    }
  }
  return [...byId.values()].filter((e) => e.name);
}

/**
 * Accès au micro et à la caméra (Paramètres › Confidentialité). « Deny » sur
 * l'ordinateur, pour l'utilisateur, ou pour les applications de bureau
 * (NonPackaged : Discord, Teams, Zoom, les jeux…).
 * @param {string} raw
 * @returns {Array<{what:"microphone"|"webcam", scope:"machine"|"user"|"desktop", allowed:boolean}>}
 */
export function parsePrivacy(raw) {
  const out = [];
  for (const f of parseBlocks(raw)) {
    const m = (field(f, "PSPath") ?? "").match(
      /(HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER)\\.*ConsentStore\\(microphone|webcam)(\\NonPackaged)?$/i,
    );
    const value = field(f, "Value");
    if (!m || !value) continue;
    out.push({
      what: m[2].toLowerCase(),
      scope: m[3]
        ? "desktop"
        : /LOCAL_MACHINE/i.test(m[1])
          ? "machine"
          : "user",
      allowed: !/deny/i.test(value),
    });
  }
  return out;
}

/**
 * Services Windows (Get-Service … | Format-List Name,Status,StartType).
 * @param {string} raw
 */
export function parseServices(raw) {
  return parseBlocks(raw)
    .filter((f) => "StartType" in f && field(f, "Name"))
    .map((f) => ({
      name: field(f, "Name"),
      running: /running/i.test(field(f, "Status") ?? ""),
      disabled: /disabled/i.test(field(f, "StartType") ?? ""),
    }));
}

// Services surveillés : ce qu'ils font marcher, et s'ils doivent tourner en
// permanence. Le Bluetooth et l'impression démarrent à la demande : arrêtés,
// ils ne sont pas en panne tant qu'ils ne sont pas désactivés.
export const SERVICES = {
  Audiosrv: { group: "audio", always: true, label: "Audio Windows" },
  AudioEndpointBuilder: {
    group: "audio",
    always: true,
    label: "Générateur de points de terminaison audio Windows",
  },
  bthserv: {
    group: "bluetooth",
    always: false,
    label: "Service de prise en charge Bluetooth",
  },
  Spooler: { group: "printer", always: false, label: "Spouleur d'impression" },
};

/** Constats tirés de l'audio, de la confidentialité et des services. */
function systemFindings(d) {
  const out = [];
  const present = (group) => d.devices.some((x) => x.group === group);

  for (const s of d.services ?? []) {
    const def = SERVICES[s.name];
    if (!def) continue;
    const down = def.always ? !s.running || s.disabled : s.disabled;
    if (!down) continue;
    // Pas de Bluetooth ni d'imprimante : le service désactivé ne gêne rien.
    if (!def.always && !present(def.group)) continue;
    out.push({
      level: "problem",
      id: `service-${s.name}`,
      key: "service-down",
      vars: { service: s.name, group: def.group, disabled: s.disabled },
      title: `Service Windows ${s.disabled ? "désactivé" : "arrêté"} : ${def.label}`,
      detail: {
        audio:
          "Sans ce service, aucun son ne sort et aucun micro ne fonctionne, même si les appareils sont reconnus",
        bluetooth:
          "Sans ce service, les appareils Bluetooth ne se connectent plus",
        printer: "Sans ce service, plus rien ne s'imprime",
      }[def.group],
      fix: `Touche Windows + R, taper services.msc, puis double-clic sur « ${def.label} » › Type de démarrage : Automatique › Démarrer`,
    });
  }

  // Accès bloqué : l'appareil marche, mais les applications ne le reçoivent pas.
  for (const what of ["microphone", "webcam"]) {
    const denied = (d.privacy ?? []).filter(
      (p) => p.what === what && !p.allowed,
    );
    if (denied.length === 0) continue;
    // Le blocage le plus large l'emporte.
    const scope = ["machine", "user", "desktop"].find((s) =>
      denied.some((p) => p.scope === s),
    );
    const mic = what === "microphone";
    const it = mic ? "le micro" : "la caméra";
    const looks = mic ? "il paraît muet" : "elle reste noire";
    out.push({
      level: "problem",
      id: `privacy-${what}`,
      key: "privacy-denied",
      vars: { what, scope },
      title: mic
        ? "Accès au micro bloqué par Windows"
        : "Accès à la caméra bloqué par Windows",
      detail:
        scope === "desktop"
          ? `Les applications de bureau (Discord, Teams, Zoom, les jeux…) n'ont pas le droit d'utiliser ${it} : ${looks} dans ces applications`
          : `Aucune application n'a le droit d'utiliser ${it} : ${looks} partout, alors que l'appareil fonctionne`,
      fix: `Paramètres › Confidentialité et sécurité › ${mic ? "Microphone" : "Caméra"} : activer « Accès ${mic ? "au microphone" : "à la caméra"} »${scope === "desktop" ? ", puis « Autoriser les applications de bureau à accéder »" : ""}`,
    });
  }

  // Aucune entrée (ou sortie) active alors que certaines sont désactivées :
  // c'est sans doute celle qui manque.
  const audio = d.audio ?? [];
  for (const flow of ["capture", "render"]) {
    const mine = audio.filter((e) => e.flow === flow);
    if (mine.length === 0 || mine.some((e) => e.state === "active")) continue;
    const off = mine.filter((e) => e.state === "disabled");
    if (off.length === 0) continue;
    const names = off.map((e) => e.name).join(", ");
    const mic = flow === "capture";
    out.push({
      level: "problem",
      id: `audio-none-${flow}`,
      key: "audio-none-active",
      vars: { flow, names },
      title: mic ? "Aucun micro actif" : "Aucune sortie audio active",
      detail: `Windows n'a ${mic ? "aucun micro" : "aucun haut-parleur ni casque"} en service. Désactivé : ${names}`,
      fix: `Paramètres › Système › Son › Plus de paramètres de son › onglet ${mic ? "Enregistrement" : "Lecture"} › clic droit sur l'appareil › Activer`,
    });
  }
  return out;
}

// Voice Clarity n'est pas signalé ici : il est activé d'office sur beaucoup
// de micros et les aide le plus souvent. Il n'apparaît que lorsque
// l'utilisateur désigne le micro qui ne marche pas (troubleshoot.js).

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

  for (const f of systemFindings(d)) {
    bump(f.level);
    findings.push(f);
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

  // Ce qui fonctionne, par catégorie : « Audio : Casque (HyperX…), … ».
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
    return diagnoseDevices({
      platform: "windows",
      devices,
      audio: parseAudioEndpoints(raw),
      privacy: parsePrivacy(raw),
      services: parseServices(raw),
    });
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
