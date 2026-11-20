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

/**
 * Extrait les champs utiles de la sortie de `netsh wlan show interfaces`.
 * Gère les libellés français et anglais.
 * @param {string} raw
 */
export function parseNetsh(raw) {
  const grab = (...patterns) => {
    for (const p of patterns) {
      const m = raw.match(p);
      if (m) return m[1].trim();
    }
    return null;
  };

  const radio = grab(/Type de radio\s*:\s*(.+)/i, /Radio type\s*:\s*(.+)/i);
  const channelStr = grab(/Canal\s*:\s*(\d+)/i, /Channel\s*:\s*(\d+)/i);
  const signalStr = grab(/Signal\s*:\s*(\d+)\s*%/i);
  const rxStr = grab(
    /R[ée]ception\s*\(Mbits?\/s\)\s*:\s*([\d.]+)/i,
    /Receive rate\s*\(Mbps\)\s*:\s*([\d.]+)/i,
  );
  const txStr = grab(
    /Transmission\s*\(Mbits?\/s\)\s*:\s*([\d.]+)/i,
    /Transmit rate\s*\(Mbps\)\s*:\s*([\d.]+)/i,
  );
  const ssid = grab(/(?:^|\n)\s*SSID\s*:\s*(.+)/i);

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
  const band = bandFromChannel(d.channel);
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
      id: "weak-signal",
      title: `Signal faible (${d.signal} %)`,
      detail: "Distance ou obstacles entre l'appareil et la box. Le débit diminue avec le signal",
      fix: "Réduire la distance à la box, la sortir d'un meuble fermé, ou ajouter un répéteur ou un point d'accès",
    });
  }

  // Règle C — bon contexte 5 GHz mais débit de lien bas.
  if (band === "5 GHz" && d.signal != null && d.signal >= 60 && linkRate != null && linkRate < 300) {
    bump("warning");
    findings.push({
      id: "low-link-5ghz",
      title: "Débit de lien bas malgré un bon signal en 5 GHz",
      detail: "Causes possibles : largeur de canal réduite (20 MHz), canal encombré ou pilote Wi-Fi obsolète",
      fix: "Mettre à jour le pilote de la carte Wi-Fi, et vérifier la largeur de canal (80 MHz) dans la box",
    });
  }

  // Aucun problème détecté.
  if (findings.length === 0) {
    findings.push({
      id: "healthy",
      title: "Configuration Wi-Fi saine",
      detail: "Aucun goulot d'étranglement côté Wi-Fi",
      fix: "Pour le débit maximum, passer en filaire (Ethernet)",
    });
  }

  return { ...d, band, linkRate, estimatedReal, findings, severity };
}
