// ─────────────────────────────────────────────────────────────────────────────
// Interprétation d'un résultat de speed test.
//
// Fonction pure : { download, upload, latency, jitter } → verdict.
// Même philosophie que `diagnose()` pour le Wi-Fi : des règles
// symptôme → coupable → correctif, une par cas, faciles à tester et à enrichir.
// ─────────────────────────────────────────────────────────────────────────────

// Seuils du palier « excellente » : débit confortable dans les deux sens,
// latence et variation basses.
/** Nombre écrit à la française (virgule décimale). */
const fr = (n) => String(n).replace(".", ",");

const EXCELLENT = { download: 100, upload: 20, latency: 40, jitter: 30 };

/**
 * Note une connexion à partir des mesures du speed test.
 * @param {{download:number, upload:number, latency:number, jitter:number}} m
 * @returns {{severity:"ok"|"warning"|"problem", grade:"excellent"|"good"|"fair"|"poor", findings:Array}}
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
        level: "problem",
        id: "down-very-low",
        vars: { v: m.download },
        title: `Débit descendant très faible (${fr(m.download)} Mb/s)`,
        detail:
          "Sous 10 Mb/s, le streaming HD et les visioconférences sont instables. Causes possibles : la ligne, le Wi-Fi ou un appareil qui sature le réseau",
        fix: "Tester en filaire (Ethernet) pour isoler le Wi-Fi, fermer les téléchargements en cours, puis relancer le test",
      });
    } else if (m.download < 25) {
      bump("warning");
      findings.push({
        level: "warning",
        id: "down-low",
        vars: { v: m.download },
        title: `Débit descendant modeste (${fr(m.download)} Mb/s)`,
        detail:
          "Suffisant pour la navigation, limité lorsque plusieurs appareils partagent la ligne",
        fix: "Vérifier l'offre souscrite auprès du FAI, et privilégier le 5 GHz ou l'Ethernet pour les gros usages",
      });
    }
  }

  // Latence : le nerf de la guerre pour le jeu en ligne et les visios.
  // >100 ms se sent, >200 ms est un vrai handicap.
  if (m.latency != null && m.latency > 100) {
    bump(m.latency > 200 ? "problem" : "warning");
    findings.push({
      level: m.latency > 200 ? "problem" : "warning",
      id: "high-latency",
      vars: { v: m.latency },
      title: `Latence élevée (${m.latency} ms)`,
      detail:
        "Au-delà de 100 ms, les délais deviennent perceptibles en jeu en ligne et en visioconférence, quel que soit le débit. Causes fréquentes : Wi-Fi, routeur saturé ou ligne bridée",
      fix: "Passer en Ethernet, réduire la distance à la box, et vérifier qu'aucun appareil ne sature la ligne (mises à jour, torrents)",
    });
  }

  // Gigue : instabilité de la latence. Tue la visio et le jeu même si la
  // latence moyenne est correcte.
  if (m.jitter != null && m.jitter > 50) {
    bump("warning");
    findings.push({
      level: "warning",
      id: "high-jitter",
      vars: { v: m.jitter },
      title: `Connexion instable (variation ${m.jitter} ms)`,
      detail:
        "Latence irrégulière, caractéristique d'interférences Wi-Fi ou d'un réseau encombré",
      fix: "Changer de canal Wi-Fi, s'écarter des sources d'interférence (micro-ondes, box voisines), ou passer en filaire",
    });
  }

  // Une ligne sans défaut n'est pas forcément excellente : 30 Mb/s et 90 ms
  // passent tous les seuils d'alerte, mais n'ont rien d'exceptionnel. Le palier
  // « excellente » demande donc de la marge sur tous les chiffres à la fois.
  const excellent =
    severity === "ok" &&
    m.download != null &&
    m.download >= EXCELLENT.download &&
    (m.upload == null || m.upload >= EXCELLENT.upload) &&
    (m.latency == null || m.latency <= EXCELLENT.latency) &&
    (m.jitter == null || m.jitter <= EXCELLENT.jitter);

  if (findings.length === 0) {
    findings.push(
      excellent
        ? {
            id: "healthy",
            key: "healthy-excellent",
            title: "Connexion excellente",
            detail:
              "Une analyse approfondie du Wi-Fi, de la box et du câblage peut aider à l'améliorer",
          }
        : {
            id: "healthy",
            key: "healthy-good",
            title: "Bonne connexion",
            detail:
              "Suffisante pour les usages courants. Une analyse approfondie du Wi-Fi, de la box et du câblage peut aider à l'améliorer",
          },
    );
  }

  const grade = {
    ok: excellent ? "excellent" : "good",
    warning: "fair",
    problem: "poor",
  }[severity];

  return { ...m, severity, grade, findings };
}
