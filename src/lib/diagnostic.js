// ─────────────────────────────────────────────────────────────────────────────
// LE CŒUR DU PRODUIT : le moteur de diagnostic.
//
// Aucune dépendance, aucun accès réseau, aucun React. Que des fonctions pures :
// une entrée (texte brut) → une sortie (verdict). C'est ce qui rend le tout
// testable et réutilisable (web aujourd'hui, appli desktop demain).
//
// Ton expertise réseau vit dans `diagnose()`, sous forme de règles
// symptôme → coupable → correctif. Tu en ajoutes une par cas rencontré.
// ─────────────────────────────────────────────────────────────────────────────
import { parseNmcli, linuxWired } from "./linux.js";

/**
 * Extrait les champs utiles de la sortie de `netsh wlan show interfaces`.
 * Gère les libellés français et anglais.
 * @param {string} raw
 */
export function parseNetsh(raw) {
  // Espace insécable (ou caractère abîmé) avant les deux-points : toléré par
  // les motifs ci-dessous.
  const grab = (...patterns) => {
    for (const p of patterns) {
      const m = raw.match(p);
      if (m) return m[1].trim();
    }
    return null;
  };

  const radio = grab(
    /Type de radio[^\w:\n]*:\s*(.+)/i,
    /Radio type[^\w:\n]*:\s*(.+)/i,
  );
  const channelStr = grab(
    /Canal[^\w:\n]*:\s*(\d+)/i,
    /Channel[^\w:\n]*:\s*(\d+)/i,
  );
  const signalStr = grab(/Signal[^\w:\n]*:\s*(\d+)\s*%/i);
  const rxStr = grab(
    /R\S{0,2}ception\s*\(Mbits?\/s\)[^\w:\n]*:\s*([\d.]+)/i,
    /Receive rate\s*\(Mbps\)\s*:\s*([\d.]+)/i,
  );
  const txStr = grab(
    /Transmission\s*\(Mbits?\/s\)[^\w:\n]*:\s*([\d.]+)/i,
    /Transmit rate\s*\(Mbps\)\s*:\s*([\d.]+)/i,
  );
  const ssid = grab(/(?:^|\n)\s*SSID[^\w:\n]*:\s*(.+)/i);

  return {
    radio,
    channel: channelStr ? parseInt(channelStr, 10) : null,
    signal: signalStr ? parseInt(signalStr, 10) : null,
    rx: rxStr ? parseFloat(rxStr) : null,
    tx: txStr ? parseFloat(txStr) : null,
    ssid,
  };
}

/**
 * Déduit la bande radio à partir du numéro de canal.
 * @param {number|null} channel
 * @returns {"2.4 GHz"|"5 GHz"|"6 GHz"|null}
 */
export function bandFromChannel(channel) {
  if (channel == null) return null;
  if (channel >= 1 && channel <= 14) return "2.4 GHz";
  if (channel >= 32 && channel <= 177) return "5 GHz";
  return "6 GHz";
}

/**
 * En Wi-Fi, le débit utile vaut environ la moitié du débit de lien annoncé
 * (overhead du protocole). Utile pour donner un ordre de grandeur réaliste.
 * @param {number|null} linkRate
 */
export function estimateRealThroughput(linkRate) {
  return linkRate ? Math.round(linkRate * 0.5) : null;
}

/**
 * La règle métier. Prend les champs parsés et retourne un verdict complet.
 * @param {ReturnType<typeof parseNetsh>} d
 */
export function diagnose(d) {
  // La bande écrite en toutes lettres (macOS, Windows récents) prime : les
  // numéros de canal du 6 GHz recoupent ceux du 2,4 GHz.
  const band = d.band ?? bandFromChannel(d.channel);
  const linkRate = d.rx || d.tx || null;
  const estimatedReal = estimateRealThroughput(linkRate);
  const isOldStandard = d.radio ? /802\.11(b|g|n)\b/i.test(d.radio) : false;

  const findings = [];
  let severity = "ok"; // "ok" | "warning" | "problem"
  const bump = (level) => {
    const rank = { ok: 0, warning: 1, problem: 2 };
    if (rank[level] > rank[severity]) severity = level;
  };

  // Règle A — coincé en 2,4 GHz / vieille norme.
  if (band === "2.4 GHz" || (isOldStandard && band == null)) {
    bump("problem");
    findings.push({
      level: "problem",
      id: "band-2ghz",
      title: "Connexion en bande 2,4 GHz",
      detail:
        "Bande la plus lente et la plus encombrée. La plupart des cartes Wi-Fi récentes prennent en charge le 5 GHz",
      fix: "Séparer les SSID 2,4 et 5 GHz dans la box, puis se connecter explicitement au réseau 5 GHz",
    });
  }

  // Règle B — signal faible.
  if (d.signal != null && d.signal < 40) {
    bump("warning");
    findings.push({
      level: "warning",
      id: "weak-signal",
      vars: { v: d.signal },
      title: `Signal faible (${d.signal} %)`,
      detail:
        "Distance ou obstacles entre l'appareil et la box. Le débit diminue avec le signal",
      fix: "Réduire la distance à la box, la sortir d'un meuble fermé, ou ajouter un répéteur ou un point d'accès",
    });
  }

  // Règle C — bon contexte 5 GHz mais débit de lien bas.
  if (
    band === "5 GHz" &&
    d.signal != null &&
    d.signal >= 60 &&
    linkRate != null &&
    linkRate < 300
  ) {
    bump("warning");
    findings.push({
      level: "warning",
      id: "low-link-5ghz",
      title: "Débit de lien bas malgré un bon signal en 5 GHz",
      detail:
        "Causes possibles : largeur de canal réduite (20 MHz), canal encombré ou pilote Wi-Fi obsolète",
      fix: "Mettre à jour le pilote de la carte Wi-Fi, et vérifier la largeur de canal (80 MHz) dans la box",
    });
  }

  // Aucun problème détecté.
  if (findings.length === 0) {
    findings.push({
      id: "healthy",
      title: "Configuration Wi-Fi saine",
      detail: "Bande, signal et débit de lien sans anomalie",
      fix: "Pour le débit maximum, passer en filaire (Ethernet)",
    });
  }

  return { ...d, band, linkRate, estimatedReal, findings, severity };
}

// ─── macOS ───────────────────────────────────────────────────────────────────

/** « 5GHz », « 2,4 GHz », « 6 GHz » → libellé de bande normalisé. */
function normalizeBand(text) {
  if (!text) return null;
  const m = text.match(/(2[.,]4|5|6)\s*GHz/i);
  if (!m) return null;
  return { 2.4: "2.4 GHz", "2,4": "2.4 GHz", 5: "5 GHz", 6: "6 GHz" }[m[1]];
}

/**
 * Extrait les champs utiles de `system_profiler SPAirPortDataType` (macOS).
 * Seule la section « Current Network Information » compte : la suite liste
 * les réseaux voisins, avec les mêmes champs.
 *
 * Le signal y est en dBm ; il est converti dans l'échelle de Windows
 * (−100 dBm → 0 %, −50 dBm → 100 %) pour que les mêmes règles s'appliquent.
 * @param {string} raw
 */
export function parseAirport(raw) {
  const start = raw.search(/Current Network Information:/i);
  if (start < 0) return null;
  let section = raw.slice(start);
  const end = section.search(/Other Local Wi-?Fi Networks:/i);
  if (end > 0) section = section.slice(0, end);

  const grab = (re) => section.match(re)?.[1]?.trim() ?? null;
  const channelLine = grab(/Channel:\s*(.+)/i);
  const dbm = grab(/Signal\s*\/\s*Noise:\s*(-?\d+)\s*dBm/i);
  const rate = grab(/Transmit Rate:\s*([\d.]+)/i);

  return {
    radio: grab(/PHY Mode:\s*(.+)/i),
    channel: channelLine ? parseInt(channelLine, 10) : null,
    band: normalizeBand(channelLine),
    signal:
      dbm != null ? Math.max(0, Math.min(100, 2 * (Number(dbm) + 100))) : null,
    rx: rate ? parseFloat(rate) : null,
    tx: null,
    ssid: grab(/Current Network Information:\s*\n\s*(.+?):\s*\n/i),
  };
}

/**
 * Lit une sortie Wi-Fi, Windows (netsh) ou macOS (system_profiler), en
 * reconnaissant le format au contenu.
 * @param {string} raw
 */
export function parseWifi(raw) {
  // Linux : réseau utilisé, marqué « * » par nmcli.
  const nm = parseNmcli(raw);
  if (nm) return nm;
  if (/Current Network Information:|PHY Mode:/i.test(raw)) {
    const mac = parseAirport(raw);
    if (mac) return mac;
  }
  const d = parseNetsh(raw);
  return {
    ...d,
    band: normalizeBand(raw.match(/(?:Bande|Band)\s*:\s*(.+)/i)?.[1]),
  };
}

/**
 * La sortie dit qu'aucun Wi-Fi n'est actif : pas de carte, service arrêté,
 * carte déconnectée ou éteinte. C'est le cas d'une machine reliée par câble.
 * @param {string} raw
 */
export function isWired(raw) {
  return (
    linuxWired(raw) ||
    /aucune interface sans fil|no wireless interface|wlansvc|service de réseau local sans fil automatique|wireless autoconfig service/i.test(
      raw,
    ) ||
    /(?:^|\n)\s*(?:[ÉE]tat|State)\s*:\s*(?:d[ée]connect[ée]|disconnected)/i.test(
      raw,
    ) ||
    // macOS : interface Wi-Fi présente mais éteinte ou non connectée.
    (/Card Type:\s*Wi-?Fi/i.test(raw) &&
      !/Current Network Information:/i.test(raw))
  );
}

// ─── Comparaison avec le test de débit ───────────────────────────────────────

// Au-delà de 80 % du débit réel estimé du Wi-Fi, c'est lui qui plafonne : le
// test ne peut pas aller plus vite que le lien radio qui le transporte.
const WIFI_LIMIT_RATIO = 0.8;
// Nettement au-dessus du débit estimé, le test n'est pas passé par ce Wi-Fi
// (câble, autre appareil) : la comparaison n'a pas de sens.
const OTHER_LINK_RATIO = 1.25;

/**
 * Confronte le débit mesuré par le test à ce que le Wi-Fi peut porter, et
 * désigne le facteur limitant : le Wi-Fi, ou la ligne (et ce qui est derrière).
 * @param {ReturnType<typeof diagnose>} wifi
 * @param {number|null|undefined} download débit descendant mesuré, en Mb/s
 */
export function compareWithLine(wifi, download) {
  if (download == null || wifi.estimatedReal == null) return wifi;

  const measured = Math.round(download);
  const capacity = wifi.estimatedReal;
  const vars = { measured, capacity };
  let finding;
  let severity = wifi.severity;

  if (measured > capacity * OTHER_LINK_RATIO) {
    finding = {
      id: "measured-above-wifi",
      vars,
      title: `Débit mesuré supérieur à la capacité de ce Wi-Fi (${measured} Mb/s pour ~${capacity} Mb/s)`,
      detail:
        "Le test a sans doute été fait sur une autre connexion (câble Ethernet, autre appareil) que ce Wi-Fi. La comparaison ne s'applique pas",
      fix: "Pour comparer, relancer le test de connexion depuis cet appareil, connecté en Wi-Fi",
    };
  } else if (measured >= capacity * WIFI_LIMIT_RATIO) {
    if (severity === "ok") severity = "warning";
    finding = {
      level: "warning",
      id: "wifi-limits-line",
      vars,
      title: `Le Wi-Fi plafonne le débit (${measured} Mb/s mesurés pour ~${capacity} Mb/s possibles)`,
      detail:
        "Le test atteint presque le maximum du lien Wi-Fi : la ligne peut sans doute aller plus vite, mais le Wi-Fi ne transporte pas davantage",
      fix: "Pour profiter de tout le débit de la ligne, passer en 5 GHz, se rapprocher de la box, ou relier l'appareil par câble Ethernet",
    };
  } else {
    finding = {
      id: "line-limits",
      vars,
      title: `Le Wi-Fi n'est pas le facteur limitant (~${capacity} Mb/s possibles, ${measured} Mb/s mesurés)`,
      detail:
        "Le Wi-Fi a de la marge : le débit mesuré est limité par la ligne, l'offre souscrite ou la box",
      fix: "Comparer le débit mesuré à celui de l'offre souscrite. Un écart important se signale au fournisseur d'accès",
    };
  }

  return {
    ...wifi,
    measured,
    severity,
    // « Configuration saine » contredirait un Wi-Fi qui plafonne : seul ce
    // cas la retire.
    findings: [
      finding,
      ...wifi.findings.filter(
        (f) => !(finding.id === "wifi-limits-line" && f.id === "healthy"),
      ),
    ],
  };
}
