// ─────────────────────────────────────────────────────────────────────────────
// Moteur de speed test — 100% côté navigateur, via les endpoints publics de
// Cloudflare (speed.cloudflare.com). CORS ouvert, aucune infra à héberger.
//
//   __down?bytes=N  → renvoie N octets  (mesure du débit descendant)
//   __up            → avale le POST      (mesure du débit montant)
//   __down?bytes=0  → réponse quasi vide (mesure de la latence / ping)
//
// Tout est asynchrone et reporte sa progression via un callback `onProgress`,
// pour que l'UI puisse afficher une jauge qui bouge plutôt qu'un long freeze.
// ─────────────────────────────────────────────────────────────────────────────

const DOWN = "https://speed.cloudflare.com/__down";
const UP = "https://speed.cloudflare.com/__up";

// Convertit des octets sur une durée (ms) en mégabits par seconde.
export function toMbps(bytes, ms) {
  if (!ms) return 0;
  return (bytes * 8) / (ms / 1000) / 1e6;
}

/**
 * Mesure la latence : plusieurs allers-retours sur une réponse vide.
 *
 * Deux précautions pour ne pas mesurer n'importe quoi :
 *  - on ÉCHAUFFE d'abord la connexion (une requête jetée) pour que le handshake
 *    TCP/TLS ne soit pas compté dans les mesures ;
 *  - on retient le MINIMUM des allers-retours, pas la médiane : le minimum est
 *    le plancher réseau réel, débarrassé du bruit applicatif (GC, ordonnancement,
 *    overhead HTTP ponctuel). C'est ce que rapportent les vrais speed tests.
 */
export async function measureLatency(samples = 12, { signal } = {}) {
  // Échauffement : établit TCP/TLS et le cache DNS, non mesuré.
  await fetch(`${DOWN}?bytes=0&warmup=1`, { cache: "no-store", signal });

  const times = [];
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    await fetch(`${DOWN}?bytes=0&_=${i}`, { cache: "no-store", signal });
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const latency = times[0]; // minimum = plancher réseau
  const median = times[Math.floor(times.length / 2)];
  // Gigue = dispersion autour de la médiane (écart absolu moyen), plus stable
  // que max-min qui sur-réagit à une seule valeur aberrante.
  const jitter =
    times.reduce((sum, t) => sum + Math.abs(t - median), 0) / times.length;
  return { latency: Math.round(latency), jitter: Math.round(jitter) };
}

// Pourquoi c'est plus compliqué qu'un seul fetch : un unique flux TCP ne
// sature pas une ligne rapide (fenêtre de congestion × latence limite le
// débit). Les vrais speed tests ouvrent DONC plusieurs connexions en parallèle,
// mesurent sur une DURÉE fixe, et ignorent le démarrage lent (slow-start) qui
// tirerait la moyenne vers le bas. On reproduit ça ici.

const DL_STREAMS = 6; // connexions descendantes parallèles
const UL_STREAMS = 5; // connexions montantes parallèles
const DURATION = 8000; // durée de mesure par sens (ms)
const WARMUP = 1500; // phase de démarrage ignorée (ms)
const DL_CHUNK = 25e6; // taille demandée par requête descendante
const UL_CHUNK = 3e6; // taille envoyée par requête montante (petit = jalons fréquents)

/**
 * Crée un signal d'abandon qui se déclenche automatiquement au bout de `ms`,
 * OU quand le signal externe (bouton « Arrêter ») se déclenche. Indispensable :
 * sans échéance ferme, un flux qui se fige (connexion qui ne renvoie plus rien
 * mais ne se ferme pas) bloquerait `reader.read()` pour toujours et gèlerait
 * toute la mesure. On expose `timedOut()` pour distinguer la fin normale (temps
 * écoulé) d'une vraie annulation utilisateur.
 */
export function deadline(ms, external) {
  const ctrl = new AbortController();
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    ctrl.abort();
  }, ms);
  const onExternal = () => ctrl.abort();
  if (external) {
    if (external.aborted) ctrl.abort();
    else external.addEventListener("abort", onExternal, { once: true });
  }
  return {
    signal: ctrl.signal,
    timedOut: () => expired,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onExternal);
    },
  };
}

/**
 * Débit descendant : `DL_STREAMS` flux parallèles bouclent des téléchargements
 * jusqu'à l'échéance. On additionne les octets de tous les flux et on calcule le
 * débit agrégé sur la fenêtre de mesure (après warmup), pas sur toute la durée.
 */
export async function measureDownload({ signal: external, onProgress } = {}) {
  const { signal, timedOut, cleanup } = deadline(DURATION, external);
  const t0 = performance.now();
  let measuring = false;
  let mStart = 0;
  let mBytes = 0;

  const worker = async () => {
    while (!signal.aborted) {
      try {
        const res = await fetch(`${DOWN}?bytes=${DL_CHUNK}`, {
          cache: "no-store",
          signal,
        });
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const now = performance.now();
          if (!measuring && now - t0 >= WARMUP) {
            measuring = true;
            mStart = now;
            mBytes = 0;
          }
          if (measuring) {
            mBytes += value.length;
            onProgress?.(toMbps(mBytes, now - mStart));
          }
        }
      } catch {
        // Flux coupé ou échéance atteinte : la boucle `while` tranchera.
      }
    }
  };

  try {
    await Promise.all(Array.from({ length: DL_STREAMS }, worker));
  } finally {
    cleanup();
  }
  // Échéance externe (Stop) et non le minuteur → l'appelant doit s'arrêter.
  if (external?.aborted && !timedOut())
    throw new DOMException("aborted", "AbortError");
  return measuring ? toMbps(mBytes, performance.now() - mStart) : 0;
}

/**
 * Débit montant : `UL_STREAMS` flux parallèles envoient des POST en boucle.
 * fetch ne donne pas la progression fine d'un upload (et XHR.upload.onprogress
 * ne se déclenche pas de façon fiable en cross-origin), donc chaque POST terminé
 * compte comme un jalon d'octets. Chunks volontairement petits → jalons fréquents
 * → la jauge bouge et la moyenne se lisse sur la fenêtre de mesure (après warmup).
 */
export async function measureUpload({ signal: external, onProgress } = {}) {
  const { signal, timedOut, cleanup } = deadline(DURATION, external);
  const payload = new Uint8Array(UL_CHUNK); // zéros : le contenu n'importe pas
  const t0 = performance.now();
  let measuring = false;
  let mStart = 0;
  let mBytes = 0;

  const worker = async () => {
    while (!signal.aborted) {
      try {
        await fetch(UP, {
          method: "POST",
          body: payload,
          cache: "no-store",
          signal,
        });
      } catch {
        continue; // POST raté / échéance : la boucle `while` tranchera.
      }
      const now = performance.now();
      if (!measuring && now - t0 >= WARMUP) {
        measuring = true;
        mStart = now;
        mBytes = 0;
      }
      if (measuring) {
        mBytes += UL_CHUNK;
        onProgress?.(toMbps(mBytes, now - mStart));
      }
    }
  };

  try {
    await Promise.all(Array.from({ length: UL_STREAMS }, worker));
  } finally {
    cleanup();
  }
  if (external?.aborted && !timedOut())
    throw new DOMException("aborted", "AbortError");
  return measuring ? toMbps(mBytes, performance.now() - mStart) : 0;
}

/**
 * Enchaîne latence → download → upload et notifie l'UI à chaque étape via
 * onProgress({ phase, ... }). Renvoie l'objet de résultat complet.
 */
export async function runSpeedTest({ signal, onProgress } = {}) {
  // Le débit descendant passe en premier : c'est le chiffre que l'utilisateur
  // attend, et le voir monter tout de suite rend l'attente lisible. La latence
  // ferme la marche, une fois la ligne redevenue calme — la mesurer pendant ou
  // juste après une saturation donnerait une valeur gonflée.
  onProgress?.({ phase: "download", download: 0 });
  const download = await measureDownload({
    signal,
    onProgress: (mbps) => onProgress?.({ phase: "download", download: mbps }),
  });

  onProgress?.({ phase: "upload", upload: 0 });
  const upload = await measureUpload({
    signal,
    onProgress: (mbps) => onProgress?.({ phase: "upload", upload: mbps }),
  });

  onProgress?.({ phase: "latency" });
  const { latency, jitter } = await measureLatency(12, { signal });
  onProgress?.({ phase: "latency", latency, jitter });

  onProgress?.({ phase: "done" });
  return {
    latency,
    jitter,
    download: Math.round(download * 10) / 10,
    upload: Math.round(upload * 10) / 10,
  };
}
