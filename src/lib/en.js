// ─────────────────────────────────────────────────────────────────────────────
// Version anglaise des constats.
//
// Les moteurs restent écrits en français, qui fait référence. Chaque constat
// porte un `id` (ou une `key` quand l'id varie, comme pour une carte
// graphique nommée) et ses valeurs dans `vars` ; cette table en tire le texte
// anglais. Un test vérifie que chaque constat a sa traduction.
//
// Même ton qu'en français : impersonnel, verbes à l'impératif, pas de point
// final.
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS_LONG_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** « 2025-10-14 » → « 14 October 2025 ». */
function dateEn(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_LONG_EN[m - 1]} ${y}`;
}

function supportPageEn(machine) {
  if (!machine) return "the motherboard support page";
  const name = [machine.maker, machine.model].filter(Boolean).join(" ");
  return machine.kind === "board"
    ? `the motherboard support page (${name})`
    : `the computer maker's support page (${name})`;
}

function formatBytesEn(bytes) {
  const gb = bytes / 1024 ** 3;
  return gb >= 1
    ? `${Math.round(gb * 10) / 10} GB`
    : `${Math.round(bytes / 1024 ** 2)} MB`;
}

export const EN = {
  connection: {
    "down-very-low": ({ v }) => ({
      title: `Very low download speed (${v} Mb/s)`,
      detail:
        "Below 10 Mb/s, HD streaming and video calls are unstable. Possible causes: the line, the Wi-Fi or a device saturating the network",
      fix: "Test over a wired (Ethernet) connection to rule out the Wi-Fi, stop ongoing downloads, then run the test again",
    }),
    "down-low": ({ v }) => ({
      title: `Modest download speed (${v} Mb/s)`,
      detail:
        "Enough for browsing, limited when several devices share the line",
      fix: "Check the plan subscribed with the ISP, and prefer 5 GHz or Ethernet for heavy use",
    }),
    "high-latency": ({ v }) => ({
      title: `High latency (${v} ms)`,
      detail:
        "Above 100 ms, delays become noticeable in online games and video calls, whatever the speed. Common causes: Wi-Fi, an overloaded router or a throttled line",
      fix: "Switch to Ethernet, move closer to the router, and make sure no device is saturating the line (updates, torrents)",
    }),
    "high-jitter": ({ v }) => ({
      title: `Unstable connection (${v} ms variation)`,
      detail:
        "Irregular latency, typical of Wi-Fi interference or a congested network",
      fix: "Change the Wi-Fi channel, move away from sources of interference (microwaves, neighbouring routers), or use a wired connection",
    }),
    "healthy-excellent": () => ({
      title: "Excellent connection",
      detail:
        "An in-depth analysis of the Wi-Fi, router and cabling can help improve it",
    }),
    "healthy-good": () => ({
      title: "Good connection",
      detail:
        "Enough for everyday use. An in-depth analysis of the Wi-Fi, router and cabling can help improve it",
    }),
  },

  wifi: {
    "wifi-limits-line": ({ measured, capacity }) => ({
      title: `The Wi-Fi caps the speed (${measured} Mb/s measured for ~${capacity} Mb/s possible)`,
      detail:
        "The test almost reaches the maximum of the Wi-Fi link: the line can probably go faster, but the Wi-Fi carries no more",
      fix: "To get the full speed of the line, switch to 5 GHz, move closer to the router, or connect the device with an Ethernet cable",
    }),
    "measured-above-wifi": ({ measured, capacity }) => ({
      title: `Measured speed above this Wi-Fi's capacity (${measured} Mb/s for ~${capacity} Mb/s)`,
      detail:
        "The test was probably run over another connection (Ethernet cable, another device) than this Wi-Fi. The comparison does not apply",
      fix: "To compare, run the connection test again from this device, connected over Wi-Fi",
    }),
    "line-limits": ({ measured, capacity }) => ({
      title: `The Wi-Fi is not the limiting factor (~${capacity} Mb/s possible, ${measured} Mb/s measured)`,
      detail:
        "The Wi-Fi has headroom: the measured speed is limited by the line, the subscribed plan or the router",
      fix: "Compare the measured speed with the subscribed plan. A large gap is worth reporting to the internet provider",
    }),
    "band-2ghz": () => ({
      title: "Connected on the 2.4 GHz band",
      detail:
        "The slowest and most crowded band. Most recent Wi-Fi cards support 5 GHz",
      fix: "Split the 2.4 and 5 GHz SSIDs in the router settings, then connect explicitly to the 5 GHz network",
    }),
    "weak-signal": ({ v }) => ({
      title: `Weak signal (${v} %)`,
      detail:
        "Distance or obstacles between the device and the router. Speed drops with the signal",
      fix: "Move closer to the router, take it out of closed furniture, or add a repeater or access point",
    }),
    "low-link-5ghz": () => ({
      title: "Low link rate despite a good 5 GHz signal",
      detail:
        "Possible causes: narrow channel width (20 MHz), a crowded channel or an outdated Wi-Fi driver",
      fix: "Update the Wi-Fi card driver, and check the channel width (80 MHz) in the router settings",
    }),
    healthy: () => ({
      title: "Healthy Wi-Fi setup",
      detail: "Band, signal and link rate without issue",
      fix: "For maximum speed, use a wired (Ethernet) connection",
    }),
  },

  components: {
    "cpu-limited": ({ pct }) => ({
      title: `Processor held back to ${pct} % of its speed`,
      detail:
        "The processor cannot reach its full speed: a limit imposed by power, heat or the battery",
      fix: "Plug the laptop in, choose “Balanced” or “Best performance” in Settings › System › Power, and dust the vents if the throttling persists",
    }),
    "cpu-limited-mac": ({ pct }) => ({
      title: `Processor held back to ${pct} % of its speed`,
      detail:
        "The processor cannot reach its full speed: a limit imposed by power, heat or the battery",
      fix: "Plug the Mac in, place it on a hard, clear surface, and quit demanding applications",
    }),
    "net-driver-old": ({ year, name }) => ({
      title: `Network driver from ${year} (${name})`,
      detail:
        "An old network driver can cause drops and limit the speed, especially over Wi-Fi",
      fix: "Install the latest version from the network card, motherboard or computer maker's website, or via Settings › Windows Update › Advanced options › Optional updates",
    }),
    "gpu-no-driver": () => ({
      title: "Graphics card without a driver",
      detail:
        "Windows is using its basic display driver: no graphics acceleration, choppy videos and games, sometimes a limited resolution",
      fix: "Install the driver from the graphics card maker's website (or the computer maker's, for a laptop)",
    }),
    "gpu-disabled": ({ name }) => ({
      title: `Graphics card disabled${name ? ` (${name})` : ""}`,
      detail:
        "The device is disabled in Windows (code 22): the card is not used",
      fix: "Right-click the Start menu › Device Manager › Display adapters › right-click the card › Enable device",
    }),
    "gpu-error": ({ code, name }) => ({
      title: `Graphics card error (code ${code})${name ? ` (${name})` : ""}`,
      detail:
        code === 43
          ? "Windows stopped the card after it reported a problem (code 43): most often a corrupted driver, sometimes a hardware failure"
          : `Windows reports error ${code} on this device: the card is not working normally`,
      fix: "Uninstall the driver, then install the latest version from the maker's website. If the error persists, have the card tested",
    }),
    "gpu-status": ({ status, name }) => ({
      title: `Abnormal graphics card status${name ? ` (${name})` : ""}`,
      detail: `Status reported by Windows: “${status}”`,
      fix: "Open Device Manager › Display adapters, then reinstall the driver from the maker's website",
    }),
    "gpu-driver-old": ({ year, month }) => ({
      title: `Graphics driver from ${monthEn(year, month)}, over a year old`,
      detail:
        "NVIDIA, AMD and Intel release a new driver about once a month: a dozen versions have come out since, with fixes and optimisations",
      fix: "Update the driver from the maker's app (NVIDIA App, AMD Adrenalin, Intel Arc Control) or its download page",
    }),
    "ram-low": ({ total }) => ({
      title: `Limited memory (${total} GB)`,
      detail:
        "With less than 8 GB, the system and an open browser fill the memory: the computer then falls back on the drive and slows down sharply",
      fix: "Add a memory stick if a slot is free (see the computer manual), otherwise limit the open tabs and applications",
    }),
    "ram-low-unified": ({ total }) => ({
      title: `Limited memory (${total} GB)`,
      detail:
        "With less than 8 GB, the system and an open browser fill the memory: the computer then falls back on the drive and slows down sharply",
      fix: "This Mac's memory cannot be expanded: limit the open tabs and applications, and quit those left running in the background",
    }),
    "healthy-mac": () => ({
      title: "Memory without issues",
      detail: "On a Mac, drivers and firmware are updated along with macOS",
      fix: "Keep macOS up to date (System Settings › General › Software Update)",
    }),
    "ram-underclocked": ({ configured, rated, loss }) => ({
      title: `Memory held back (${configured} MHz instead of ${rated} MHz)`,
      detail: `Memory running below its rated frequency, about ${loss} % less bandwidth. Without an XMP or EXPO profile enabled, the motherboard applies the base frequency`,
      fix: "Enable the XMP (Intel) or EXPO/DOCP (AMD) profile in the BIOS, then run the analysis again to check the frequency. Free and reversible",
    }),
    "ram-single-channel": () => ({
      title: "Single memory stick",
      detail:
        "In single channel, memory bandwidth is halved. Noticeable in games and with integrated graphics",
      fix: "Add a second identical stick in the slot given by the motherboard manual, to run in dual channel",
    }),
    "gpu-driver-stale": ({ year, name }) => ({
      title: `Graphics driver from ${year}${name ? ` (${name})` : ""}`,
      detail:
        "Optimisations and fixes released since are not applied. Graphics performance may be reduced",
      fix: "Update the driver from the manufacturer's app (NVIDIA App, AMD Adrenalin, Intel Arc Control). Windows Update often lags behind on graphics drivers",
    }),
    "bios-ancient": ({ year, age, machine }) => ({
      title: `BIOS from ${year}, ${age} years old`,
      detail:
        "Processor microcode updates and stability fixes released since are not applied. Possible impact on performance",
      fix: `Download the latest BIOS from ${supportPageEn(machine)}, and flash it from the utility built into the BIOS, with the file on a FAT32 USB stick. Never from a Windows tool`,
    }),
    "bios-stale": ({ year, age, machine }) => ({
      title: `BIOS from ${year}, ${age} years old`,
      detail:
        "Firmware updates, including processor microcode, have probably been released since",
      fix: `Check ${supportPageEn(machine)} for a newer version. Not an urgent update`,
    }),
    healthy: () => ({
      title: "No issue found",
    }),
  },

  ethernet: {
    "ethernet-slow-link": ({ speed }) => ({
      title: `Ethernet link limited to ${speed}`,
      detail:
        "The network card and the router talk at 100 Mb/s instead of 1,000: the speed stays below about 95 Mb/s, whatever the plan",
      fix: "Try another cable (Cat 5e or Cat 6), pushed in until it clicks at both ends, then another router port",
    }),
    "ethernet-half-duplex": () => ({
      title: "Half-duplex link",
      detail:
        "The card cannot send and receive at the same time: reduced speed and irregular latency. Often a sign of a bad cable or a forced setting",
      fix: "In the network card properties (Device Manager › Advanced), set “Speed & Duplex” to “Auto Negotiation”, then change the cable if nothing changes",
    }),
    "ethernet-limits-line": ({ speed, measured }) => ({
      title: `The measured speed reaches the link speed (${measured} Mb/s on ${speed})`,
      detail:
        "The line can probably go faster than the Ethernet link: the link is the cap",
      fix: "To go beyond this speed, a faster network card and router port are needed (2.5 Gb/s or more)",
    }),
    healthy: ({ speed }) => ({
      title: `Ethernet link at ${speed}`,
      detail: "The cable and network card do not limit the speed",
    }),
  },

  system: {
    "system-hdd-other": () => ({
      title: "System installed on a mechanical hard drive",
      detail:
        "A hard drive is much slower than an SSD to start up, open applications or install updates. It is the most common cause of slowness on a computer more than five years old",
      fix: "Replace the system drive with an SSD, by cloning the current drive or reinstalling the system. It is the most visible improvement on an older computer",
    }),
    "uptime-long-linux": ({ days }) => ({
      title: `No restart for ${days} days`,
      detail:
        "Pending kernel updates and cluttered memory pile up as long as the computer is not restarted",
      fix: "Restart the computer at least once a week, and after every kernel update",
    }),
    "power-saver-linux": () => ({
      title: "Power saving mode on",
      detail:
        "The processor is deliberately held back to save energy: applications respond more slowly",
      fix: "Choose the “Balanced” profile in the power settings, or run powerprofilesctl set balanced",
    }),
    "windows10-unsupported": ({ label, end }) => ({
      title: `${label}: no more security updates`,
      detail: `Support ended on ${dateEn(end)}: no more security or reliability fixes`,
      fix: "Upgrade to Windows 11, free if the PC is compatible (Settings › Windows Update). Otherwise, plan for a supported system or a new PC",
    }),
    "windows-unsupported": ({ label, end }) => ({
      title: `${label}: no more security updates`,
      detail: `Support ended on ${dateEn(end)}: no more security or reliability fixes`,
      fix: "Install the latest version of Windows 11 from Settings › Windows Update",
    }),
    "windows-ending": ({ label, end }) => ({
      title: `Support for ${label} ends on ${dateEn(end)}`,
      detail: "After this date, no more security fixes",
      fix: "Install the latest version of Windows 11 from Settings › Windows Update before this date",
    }),
    "macos-unsupported": ({ label }) => ({
      title: `${label}: no more security updates`,
      detail: "Apple only patches the last three versions of macOS",
      fix: "Update from System Settings › General › Software Update. If the Mac is no longer compatible, it no longer receives security fixes",
    }),
    "battery-worn": ({ pct }) => ({
      title: `Worn battery: ${pct} % of its original capacity`,
      detail:
        "A worn battery drains faster and, on some laptops, makes the system throttle the processor to avoid a shutdown",
      fix: "Have the battery replaced by the maker or a repair shop. In the meantime, work plugged in",
    }),
    "startup-many": ({ n, names }) => ({
      title: `${n} programs launched at startup`,
      detail: `Each one slows down sign-in and permanently takes up memory${names ? `: ${names}` : ""}`,
      fix: "Disable those not used every day: Task Manager › Startup apps, right-click › Disable",
    }),
    "system-hdd": () => ({
      title: "Windows installed on a mechanical hard drive",
      detail:
        "A hard drive is much slower than an SSD to start up, open applications or install updates. It is the most common cause of slowness on a PC more than five years old",
      fix: "Replace the system drive with an SSD, by cloning the current drive or reinstalling Windows. It is the most visible improvement on an older PC",
    }),
    "disk-unhealthy": ({ name, state }) => ({
      title: `Drive in poor condition (${name})`,
      detail: `Status reported by Windows: “${state}”. The drive itself anticipates a failure`,
      fix: "Back up immediately, then replace the drive",
    }),
    "disk-unreadable": ({ name, count }) => ({
      title: `Unreadable sectors on drive ${name}`,
      detail: `${count} read error${count > 1 ? "s" : ""} the drive could not correct: some data is already lost or damaged`,
      fix: "Back up important files now, then replace the drive",
    }),
    "uptime-long": ({ days }) => ({
      title: `No restart for ${days} days`,
      detail:
        "With Windows Fast Startup, “Shut down” does not reset the system: only “Restart” does. Cluttered memory and pending updates pile up",
      fix: "Use “Restart”, not “Shut down”, at least once a week",
    }),
    "uptime-long-mac": ({ days }) => ({
      title: `No restart for ${days} days`,
      detail:
        "Cluttered memory and pending updates pile up as long as the Mac is not restarted",
      fix: "Restart the Mac (Apple menu › Restart) at least once a week",
    }),
    "power-saver": () => ({
      title: "Power saving mode on",
      detail:
        "The processor is deliberately held back to save energy: applications respond more slowly",
      fix: "Choose “Balanced” in Settings › System › Power › Power mode, or in the Control Panel power options",
    }),
    "power-saver-mac": () => ({
      title: "Low Power Mode on",
      detail:
        "The processor is deliberately held back to save energy: applications respond more slowly",
      fix: "Set “Low Power Mode” to “Never” or “Only on Battery” in System Settings › Battery",
    }),
    healthy: () => ({
      title: "No issue found",
    }),
  },

  devices: {
    "device-no-driver": ({ name }) => ({
      title: `Missing driver: ${name}`,
      detail:
        "No driver is installed for this device (code 28): Windows sees it but cannot use it",
      fix: "Install the driver from the device maker's website. If the device is no longer used, uninstall it in Device Manager",
    }),
    "device-disabled": ({ name }) => ({
      title: `Device disabled: ${name}`,
      detail: "The device is disabled in Windows (code 22): it is not used",
      fix: "Right-click the Start menu › Device Manager › right-click the device › Enable device",
    }),
    "device-stopped": ({ name }) => ({
      title: `Device stopped by Windows: ${name}`,
      detail:
        "Windows stopped the device after it reported a problem (code 43): faulty driver, cable or USB port, sometimes a failing device",
      fix: "Unplug the device, plug it into another port, then reinstall its driver from the maker's website",
    }),
    "device-error": ({ name, code }) => ({
      title: `Device error: ${name}`,
      detail: code
        ? `Windows reports error ${code} on this device: it is not working normally`
        : "The device is reported in error and is not working normally",
      fix: "Right-click the Start menu › Device Manager › right-click the device › Uninstall, then restart so Windows reinstalls it",
    }),
    "device-missing-mac": ({ name }) => ({
      title: `Device not working: ${name}`,
      detail: "Device reported missing or faulty in the system settings",
      fix: "Unplug and plug the device back in (for Bluetooth: forget it, then pair it again), then restart the computer",
    }),
    healthy: () => ({ title: "No device in error" }),
    "healthy-mac": () => ({
      title: "No device in error",
      detail:
        "This system does not report device errors: only recognised devices are listed",
    }),
  },

  events: {
    "gpu-crashes": ({ count, last }) => ({
      title:
        count === 1
          ? "Graphics driver crashed once in 90 days"
          : `Graphics driver crashed ${count} times in 90 days`,
      detail: `Last crash on ${dayEn(last)}. A driver that keeps crashing often comes from a card running too hot, a damaged driver, or a card wearing out`,
      fix: "Track the card temperature during a game (one-minute tracking in the app). Above 85 °C, dust off the card and its fans. Below that, reinstall the driver from the maker's website",
    }),
    "hardware-errors": ({ count, last }) => ({
      title:
        count === 1
          ? "One hardware error reported by Windows in 90 days"
          : `${count} hardware errors reported by Windows in 90 days`,
      detail: `Last one on ${dayEn(last)}. The processor, memory or a card reported an error: a component running hot, wearing out or poorly powered`,
      fix: "Run Windows Memory Diagnostic (Start menu) and track temperatures. If errors continue, have the computer checked",
    }),
    "memory-test-failed": ({ date }) => ({
      title: "Windows memory test found errors",
      detail: `Test from ${dayEn(date)}. A faulty memory stick causes crashes, blue screens and corrupted files`,
      fix: "Run the test again with one stick at a time (Windows Memory Diagnostic) to find the faulty one, then replace it",
    }),
    "hard-shutdowns": ({ count, afterGpu, last }) => ({
      title:
        count === 1
          ? "One hard shutdown in 90 days"
          : `${count} hard shutdowns in 90 days`,
      detail: `The computer turned off without a normal shutdown, the last one on ${dayEn(last)}${
        afterGpu
          ? afterGpu === count
            ? ", right after a graphics driver crash"
            : `, ${afterGpu} of them right after a graphics driver crash`
          : ""
      }. Possible causes: power cut, button held down, or a protective shutdown from overheating`,
      fix: "If it was not a power cut, track temperatures and check that the fans spin",
    }),
  },
  activity: {
    "memory-full": ({ pct, top }) => ({
      title: `Memory almost full (${pct} % used)`,
      detail: `The system starts writing to the drive instead of memory: everything slows down.${
        top?.length
          ? ` Biggest users: ${top.map((p) => `${p.name} (${formatBytesEn(p.bytes)})`).join(", ")}`
          : ""
      }`,
      fix: "Close unused programs, starting with the heaviest. If memory stays full day to day, add more",
    }),
    "cpu-busy": ({ pct }) => ({
      title: `Processor very busy (${pct} %)`,
      detail:
        "When the command ran, the processor was almost at full load: other programs wait their turn",
      fix: "Open Task Manager (Ctrl + Shift + Esc), sort by “CPU” and close the top program if it is not needed",
    }),
    healthy: () => ({ title: "No overload when the command ran" }),
  },

  storage: {
    "smart-failing": ({ where }) => ({
      title: `Drive reported as failing (${where})`,
      detail:
        "The drive itself announces an upcoming failure (SMART status “Failing”). Slowdowns and data loss will get worse",
      fix: "Back up immediately (Time Machine or a copy to an external drive), then have the drive replaced",
    }),
    "disk-critical": ({ where, freeGB, pct }) => ({
      title: `${where} full (${freeGB} GB free, ${pct} %)`,
      detail:
        "Not enough space for Windows to run: failed updates, blocked page file, risk of file system corruption",
      fix: "Move large folders (games, downloads, documents) to another drive, then empty the recycle bin",
    }),
    "disk-low": ({ where, freeGB, pct }) => ({
      title: `${where} almost full (${freeGB} GB free, ${pct} %)`,
      detail:
        "Below 15 % free space, an SSD loses write speed and wears out faster",
      fix: "Aim for 20 % free space. Move game libraries and application caches first",
    }),
    "no-update-headroom": ({ freeGB }) => ({
      title: `Not enough room for updates (${freeGB} GB)`,
      detail:
        "Windows feature updates need about 20 GB of temporary space. Below that, they can fail without a clear message",
      fix: "Keep 20 GB free at all times on the system drive",
    }),
    "fs-damaged": ({ where, state }) => ({
      title: `Damaged file system on ${where}`,
      detail: `Status reported by Windows: “${state}”. An error in the file table (MFT) does not fix itself and can go unnoticed for months`,
      fix: `Back up first. The repair runs with chkdsk ${where} /f; if the command refuses to start, it goes through the recovery environment (Settings › Recovery › Advanced startup › Command Prompt)`,
    }),
    healthy: ({ where, freeGB, pct }) => ({
      title: `${where} in good health`,
      detail: `${freeGB} GB free (${pct} %), integrity checked`,
    }),
  },
};

// Contrôles passés sans anomalie (liste « Vérifié »), par identifiant.
const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** « July 2026 », or the year alone when the month is unknown. */
/** « 2026-11-17 » → « 17 November ». */
function dayEn(isoDate) {
  const [y, m, d] = String(isoDate).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
}

export function monthEn(year, month) {
  return month ? `${MONTHS_EN[month - 1]} ${year}` : String(year);
}

const GROUPS_EN = {
  audio: "Audio",
  camera: "Camera",
  keyboard: "Keyboard",
  mouse: "Mouse",
  bluetooth: "Bluetooth",
  monitor: "Display",
  printer: "Printer",
  usb: "USB",
};

export const PASSED_EN = {
  "no-gpu-crash": ({ days }) => `No graphics driver crash in ${days} days`,
  "no-hardware-error": () => "No hardware error reported by Windows",
  "no-hard-shutdown": ({ days }) => `No hard shutdown in ${days} days`,
  "memory-test-ok": ({ date }) =>
    `Windows memory test passed on ${dayEn(date)}`,
  "windows-supported": ({ label, end }) =>
    end
      ? `${label}, supported until ${dateEn(end)}`
      : `${label}, supported version`,
  "macos-supported": ({ label }) => `${label}, still supported by Apple`,
  "battery-ok": ({ pct, cycles }) =>
    `Battery at ${pct} % of its original capacity${cycles ? ` (${cycles} cycles)` : ""}`,
  "startup-ok": ({ n, names }) =>
    `${n} program${n > 1 ? "s" : ""} at startup${names ? `: ${names}` : ""}`,
  "cpu-full-speed": ({ name }) =>
    `Processor not throttled${name ? ` (${name})` : ""}`,
  "net-driver-ok": ({ year, month, name }) =>
    `Network driver from ${monthEn(year, month)} (${name})`,
  "memory-ok": ({ pct }) => `Memory ${pct} % used`,
  "cpu-ok": ({ pct }) => `Processor ${pct} % busy`,
  "device-group": ({ group, names }) => `${GROUPS_EN[group]}: ${names}`,
  "ram-speed": ({ mhz }) => `Memory at its rated frequency (${mhz} MHz)`,
  "ram-dual": ({ n }) => `Dual channel (${n} sticks)`,
  "ram-amount": ({ total }) => `${total} GB of memory`,
  "gpu-driver": ({ year, month, name, recent }) =>
    `${recent ? "Recent graphics driver, from" : "Graphics driver from"} ${monthEn(year, month)}${name ? ` (${name})` : ""}`,
  "gpu-ok": ({ name }) =>
    `Graphics card working, no error reported by Windows${name ? ` (${name})` : ""}`,
  "bios-recent": ({ year }) => `BIOS from ${year}`,
  "system-ssd": ({ kind, windows = true }) =>
    `${windows ? "Windows" : "System"} on an${kind === "NVMe" ? " NVMe" : ""} SSD`,
  "disks-healthy": ({ n, names }) =>
    `${n > 1 ? `${n} physical drives in good condition` : "Physical drive in good condition"}: ${names}`,
  "uptime-ok": ({ days }) =>
    days === 0
      ? "Restarted less than a day ago"
      : `Restarted ${days} day${days > 1 ? "s" : ""} ago`,
  "power-ok": () => "Normal power mode",
  "space-ok": ({ freeGB, pct }) => `${freeGB} GB free (${pct} %)`,
  "fs-ok": () => "Healthy file system",
};

/** Libellé d'un contrôle passé dans la langue demandée. */
export function passedLabel(p, lang) {
  if (lang !== "en") return p.label;
  return PASSED_EN[p.id]?.(p.vars ?? {}) ?? p.label;
}

/**
 * Texte d'un constat dans la langue demandée. Le français est déjà dans le
 * constat ; l'anglais vient de la table, et retombe sur le français si une
 * entrée manque plutôt que de laisser un trou.
 * @param {{id:string, key?:string, vars?:object, title:string, detail:string, fix?:string}} f
 * @param {"fr"|"en"} lang
 * @param {keyof typeof EN} engine
 */
export function localize(f, lang, engine) {
  if (lang !== "en") return f;
  const t = EN[engine]?.[f.key ?? f.id];
  return t ? { ...f, fix: undefined, ...t(f.vars ?? {}) } : f;
}
