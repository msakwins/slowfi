// ─────────────────────────────────────────────────────────────────────────────
// Lecture des sorties Linux. Chaque moteur (Wi-Fi, stockage, composants,
// système, activité, périphériques, Ethernet) appelle la fonction qui le
// concerne quand le texte collé ne vient ni de Windows ni de macOS.
//
// Les commandes proposées commencent par « export LC_ALL=C » : les outils
// répondent alors en anglais, quelle que soit la langue du système, et les
// motifs ci-dessous restent valables. Aucune ne demande les droits root.
// ─────────────────────────────────────────────────────────────────────────────
import { yearOf } from "./powershell.js";

/** Le texte vient-il d'un Linux ? (os-release, lscpu, free, /sys…) */
export function isLinux(raw) {
  return /PRETTY_NAME=|^Mem:\s+\d|\/sys\/class\/|^Model name:|%Cpu\(s\)|^Bus \d+ Device \d+: ID/m.test(
    raw,
  );
}

// ── Wi-Fi : nmcli -t -f TYPE,STATE dev ; nmcli -t -f IN-USE,SSID,CHAN,RATE,SIGNAL dev wifi ──

/** Réseau Wi-Fi utilisé (ligne marquée « * » de nmcli), ou null. */
export function parseNmcli(raw) {
  // En mode terse, les deux-points internes sont échappés : « \: ».
  const line = raw.split(/\r?\n/).find((l) => /^\*:/.test(l));
  if (!line) return null;
  const parts = line.split(/(?<!\\):/).map((p) => p.replace(/\\:/g, ":"));
  const [, ssid, chan, rate, signal] = parts;
  const channel = parseInt(chan, 10) || null;
  return {
    radio: null,
    channel,
    band:
      channel == null
        ? null
        : channel <= 14
          ? "2.4 GHz"
          : channel <= 177
            ? "5 GHz"
            : "6 GHz",
    signal: parseInt(signal, 10) || null,
    rx: parseFloat(rate) || null,
    tx: null,
    ssid: ssid || null,
  };
}

/** Connecté en Ethernet sans Wi-Fi actif (nmcli -t -f TYPE,STATE dev). */
export function linuxWired(raw) {
  return (
    /^ethernet:connected/m.test(raw) &&
    !/^wifi:connected/m.test(raw) &&
    !/^\*:/m.test(raw)
  );
}

// ── Ethernet : grep -sH . /sys/class/net/e*/{speed,duplex,operstate} ──

export function parseSysNet(raw) {
  const byName = new Map();
  for (const m of raw.matchAll(
    /\/sys\/class\/net\/([^/\s]+)\/(speed|duplex|operstate):\s*(\S+)/g,
  )) {
    const [, name, key, value] = m;
    const cur = byName.get(name) ?? {
      name,
      description: null,
      up: false,
      speed: null,
      fullDuplex: null,
    };
    if (key === "speed") cur.speed = Number(value) > 0 ? Number(value) : null;
    if (key === "duplex")
      cur.fullDuplex =
        value === "full" ? true : value === "half" ? false : null;
    if (key === "operstate") cur.up = value === "up";
    byName.set(name, cur);
  }
  return [...byName.values()];
}

// ── Stockage : df -B1 --output=target,size,avail / /home ──

export function parseDf(raw) {
  const out = [];
  for (const m of raw.matchAll(/^(\/\S*)\s+(\d{6,})\s+(\d+)\s*$/gm)) {
    const [, target, size, avail] = m;
    if (
      out.some(
        (v) =>
          v.name === target ||
          (v.size === Number(size) && v.free === Number(avail)),
      )
    )
      continue;
    out.push({
      name: target,
      driveLetter: null,
      label: null,
      size: Number(size),
      free: Number(avail),
      health: null,
      operational: null,
    });
  }
  return out;
}

// ── Système ──

/** Disque qui porte « / » : findmnt donne la partition, lsblk dit s'il tourne. */
function systemDisk(raw) {
  const src = raw.match(
    /^\/dev\/(nvme\d+n\d+|mmcblk\d+|[a-z]+)(?:p?\d+)?\s*$/m,
  )?.[1];
  if (!src) return null;
  const row = raw.match(new RegExp(`^${src}\\s+([01])\\s*(.*)$`, "m"));
  if (!row) return null;
  return {
    name: row[2].trim() || src,
    mediaType: row[1] === "1" ? "HDD" : "SSD",
    busType: src.startsWith("nvme") ? "NVMe" : null,
  };
}

export function parseLinuxSystem(raw) {
  const pretty = raw.match(/^PRETTY_NAME="?([^"\n]+)"?/m)?.[1] ?? null;
  const uptime = raw.match(/^(\d+(?:\.\d+)?)\s+\d+(?:\.\d+)?\s*$/m);
  const profile =
    raw.match(/^(power-saver|balanced|performance)\s*$/m)?.[1] ?? null;
  const full = sumSys(raw, /(?:energy|charge)_full:\s*(\d+)/g);
  const design = sumSys(raw, /(?:energy|charge)_full_design:\s*(\d+)/g);
  const disk = systemDisk(raw);
  if (!pretty && !uptime && !disk && !design) return null;
  return {
    platform: "linux",
    disks: [],
    systemDisk: disk,
    uptimeDays: uptime ? Math.floor(Number(uptime[1]) / 86400) : null,
    powerSaver: profile ? profile === "power-saver" : null,
    env: {
      os: pretty ? { kind: "linux", label: pretty } : null,
      battery:
        design > 0 && full > 0
          ? {
              pct: Math.min(100, Math.round((full / design) * 100)),
              cycles: null,
              condition: null,
            }
          : null,
      startup: null,
    },
  };
}

function sumSys(raw, re) {
  let total = 0;
  for (const m of raw.matchAll(re)) total += Number(m[1]);
  return total;
}

// ── Composants ──

function dmi(raw, key) {
  return (
    raw.match(new RegExp(`/sys/class/dmi/id/${key}:(.*)`))?.[1]?.trim() || null
  );
}

export function parseLinuxComponents(raw) {
  const memTotal = Number(raw.match(/^Mem:\s+(\d+)/m)?.[1]) || null;
  const modelName = raw.match(/^Model name:\s*(.+)$/m)?.[1]?.trim();
  const cpu = modelName
    ? {
        name: modelName,
        cores:
          (Number(raw.match(/^Core\(s\) per socket:\s*(\d+)/m)?.[1]) || 0) *
            (Number(raw.match(/^Socket\(s\):\s*(\d+)/m)?.[1]) || 1) || null,
        threads: Number(raw.match(/^CPU\(s\):\s*(\d+)/m)?.[1]) || null,
        maxMHz: null,
        boostMHz:
          Math.round(Number(raw.match(/^CPU max MHz:\s*([\d.]+)/m)?.[1])) ||
          null,
        limit: null,
      }
    : null;

  // lspci : « VGA compatible controller: NVIDIA Corporation TU116 [GeForce GTX 1660 Ti] (rev a1) ».
  const gpus = [];
  for (const m of raw.matchAll(
    /(?:VGA compatible controller|3D controller|Display controller):\s*(.+)$/gm,
  )) {
    const text = m[1].replace(/\s*\(rev [^)]+\)\s*$/, "");
    const bracket = text.match(/\[([^\]]+)\]\s*$/)?.[1];
    const maker = text.match(
      /^(NVIDIA|Advanced Micro Devices|AMD|Intel)/i,
    )?.[1];
    const short = maker
      ? /advanced micro/i.test(maker)
        ? "AMD"
        : maker.replace(/^nvidia$/i, "NVIDIA")
      : null;
    gpus.push({
      name: bracket && short ? `${short} ${bracket}` : text,
      driverVersion: null,
      driverYear: null,
      driverMonth: null,
      status: null,
      errorCode: null,
    });
  }

  const biosDate = dmi(raw, "bios_date");
  const bios = biosDate
    ? {
        vendor: dmi(raw, "bios_vendor"),
        version: dmi(raw, "bios_version"),
        year: yearOf(biosDate),
      }
    : null;
  const version = dmi(raw, "product_version");
  const computer = {
    maker: dmi(raw, "sys_vendor"),
    model:
      /lenovo/i.test(dmi(raw, "sys_vendor") || "") &&
      version &&
      !/^none|^\d/i.test(version)
        ? version
        : dmi(raw, "product_name"),
  };
  const board = {
    maker: dmi(raw, "board_vendor"),
    model: dmi(raw, "board_name"),
  };

  if (!memTotal && !cpu && gpus.length === 0 && !bios) return null;
  return {
    // free ne dit rien des barrettes : un seul bloc, sans règle de simple canal.
    memory: memTotal
      ? [
          {
            slot: null,
            capacity: memTotal,
            rated: null,
            configured: null,
            unified: true,
          },
        ]
      : [],
    gpus,
    bios,
    cpu,
    computer,
    board,
    network: [],
    platform: "linux",
  };
}

// ── Activité : top -bn1 | head -5 ; free -b ; ps -eo comm,rss --sort=-rss ──

export function parseLinuxActivity(raw) {
  const idle = raw.match(/%Cpu\(s\):.*?([\d.]+)\s*id/)?.[1];
  const mem = raw.match(/^Mem:\s+(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/m);
  const header = raw.match(/^\s*COMMAND\s+RSS\s*$/m);
  if (idle == null && !mem && !header) return null;

  const byName = new Map();
  if (header) {
    for (const line of raw
      .slice(header.index + header[0].length)
      .split(/\r?\n/)) {
      if (!line.trim()) continue;
      const m = line.match(/^\s*(\S.*?)\s+(\d+)\s*$/);
      if (!m) break;
      const cur = byName.get(m[1]) ?? { name: m[1], bytes: 0, count: 0 };
      cur.bytes += Number(m[2]) * 1024;
      cur.count += 1;
      byName.set(m[1], cur);
    }
  }
  return {
    platform: "linux",
    cpuLoad: idle != null ? Math.round(100 - Number(idle)) : null,
    memoryPct: mem
      ? Math.round(((Number(mem[1]) - Number(mem[2])) / Number(mem[1])) * 100)
      : null,
    top: [...byName.values()].sort((a, b) => b.bytes - a.bytes).slice(0, 5),
  };
}

// ── Périphériques : lsusb ; cat /proc/asound/cards ──

const USB_GROUPS = [
  [/keyboard|clavier/i, "keyboard"],
  [/mouse|souris|trackball/i, "mouse"],
  [/webcam|camera|\bcam\b|streamcam|facetime/i, "camera"],
  [/headset|headphone|audio|speaker|sound|micro/i, "audio"],
  [/bluetooth/i, "bluetooth"],
  [/printer|imprimante/i, "printer"],
];

export function parseLinuxDevices(raw) {
  const out = [];
  for (const m of raw.matchAll(
    /^Bus \d+ Device \d+: ID [0-9a-f]{4}:[0-9a-f]{4}\s*(.*)$/gim,
  )) {
    const name = m[1].trim();
    if (!name || /linux foundation|root hub/i.test(name)) continue;
    const group = USB_GROUPS.find(([re]) => re.test(name))?.[1] ?? "usb";
    out.push({ name, group, code: null, status: null });
  }
  for (const m of raw.matchAll(/^\s*\d+\s+\[[^\]]*\]:\s*.+? - (.+)$/gm)) {
    out.push({ name: m[1].trim(), group: "audio", code: null, status: null });
  }
  return out;
}
