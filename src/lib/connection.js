// ─────────────────────────────────────────────────────────────────────────────
// Interprétation d'un résultat de speed test.
//
// Fonction pure : { download, upload, latency, jitter } → verdict.
// Même philosophie que `diagnose()` pour le Wi-Fi : des règles
// symptôme → coupable → correctif, une par cas, faciles à tester et à enrichir.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Note une connexion à partir des mesures du speed test.
 * @param {{download:number, upload:number, latency:number, jitter:number}} m
 * @returns {{severity:"ok"|"warning"|"problem", findings:Array}}
 */
export function gradeConnection(m) {
  const findings = [];
  let severity = "ok";
  const bump = (level) => {
    const rank = { ok: 0, warning: 1, problem: 2 };
    if (rank[level] > rank[severity]) severity = level;
  };

  // Débit descendant : c'est ce qui pèse sur le streaming, les téléchargements,
  // les pages web. En dessous de 10 Mb/s c'est douloureux, sous 25 c'est juste.
  if (m.download != null) {
    if (m.download < 10) {
      bump("problem");
      findings.push({
        id: "down-very-low",
        title: `Débit descendant très faible (${m.download} Mb/s)`,
        detail:
          "En dessous de 10 Mb/s, le streaming HD et les visios saccadent. Le problème vient de la ligne, du Wi-Fi, ou d'un appareil qui sature le réseau.",
        fix: "Teste en filaire (Ethernet) pour isoler le Wi-Fi, ferme les téléchargements en cours, puis relance le test.",
      });
    } else if (m.download < 25) {
      bump("warning");
      findings.push({
        id: "down-low",
        title: `Débit descendant modeste (${m.download} Mb/s)`,
        detail: "Suffisant pour naviguer, mais juste dès que plusieurs appareils partagent la ligne.",
        fix: "Vérifie l'offre souscrite auprès du FAI et privilégie le 5 GHz ou l'Ethernet pour les gros usages.",
      });
    }
  }

  // Latence : le nerf de la guerre pour le jeu en ligne et les visios.
  // >100 ms se sent, >200 ms est un vrai handicap.
  if (m.latency != null && m.latency > 100) {
    bump(m.latency > 200 ? "problem" : "warning");
    findings.push({
      id: "high-latency",
      title: `Latence élevée (${m.latency} ms)`,
      detail:
        "Une latence haute provoque du lag en jeu et des coupures en visio, même avec un bon débit. Souvent liée au Wi-Fi, à un routeur saturé ou à une ligne bridée.",
      fix: "Passe en Ethernet, rapproche-toi de la box, et vérifie qu'aucun appareil ne sature la connexion (mises à jour, torrents).",
    });
  }

  // Gigue : instabilité de la latence. Tue la visio et le jeu même si la
  // latence moyenne est correcte.
  if (m.jitter != null && m.jitter > 50) {
    bump("warning");
    findings.push({
      id: "high-jitter",
      title: `Connexion instable (gigue ${m.jitter} ms)`,
      detail: "La latence varie beaucoup : signe d'interférences Wi-Fi ou d'un réseau encombré.",
      fix: "Change de canal Wi-Fi, éloigne-toi des sources d'interférence (micro-ondes, autres box), ou passe en filaire.",
    });
  }

  if (findings.length === 0) {
    findings.push({
      id: "healthy",
      title: "Connexion en bonne santé",
      detail: "Débit et latence corrects. Si tu ressens quand même du lag, le coupable est probablement ailleurs (Wi-Fi local, câble, ou composant de la machine).",
      fix: "Lance le diagnostic pour explorer les autres pistes.",
    });
  }

  return { ...m, severity, findings };
}
