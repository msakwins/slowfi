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
      detail: "No bottleneck on the Wi-Fi side",
      fix: "For maximum speed, use a wired (Ethernet) connection",
    }),
  },

  components: {
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
    "bios-ancient": ({ year, age }) => ({
      title: `BIOS from ${year}, ${age} years old`,
      detail:
        "Processor microcode updates and stability fixes released since are not applied. Possible impact on performance",
      fix: "Download the latest BIOS from the motherboard support page, and flash it from the utility built into the BIOS, with the file on a FAT32 USB stick. Never from a Windows tool",
    }),
    "bios-stale": ({ year, age }) => ({
      title: `BIOS from ${year}, ${age} years old`,
      detail:
        "Firmware updates, including processor microcode, have probably been released since",
      fix: "Check the motherboard support page for a newer version. Not an urgent update",
    }),
    healthy: () => ({
      title: "Components well tuned",
      detail:
        "Memory at its rated frequency, recent drivers, up-to-date firmware",
      fix: "Nothing to fix here",
    }),
  },

  storage: {
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
      fix: "Nothing to fix here",
    }),
  },
};

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
