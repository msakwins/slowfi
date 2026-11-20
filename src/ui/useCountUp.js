// ─────────────────────────────────────────────────────────────────────────────
// Un compteur qui court après sa cible.
//
// Deux mécanismes complémentaires, et c'est voulu : le composant n'échantillonne
// la mesure que quelques fois par seconde (sinon React re-rend en continu), et
// ce hook comble les intervalles à 60 images par seconde. Résultat, le nombre
// grimpe vite sans jamais sauter d'un palier à l'autre.
//
// Le rattrapage est exponentiel : grand écart au démarrage, donc montée rapide ;
// petit écart sur le plateau, donc chiffre qui se pose. C'est ce qui donne
// l'impression de vitesse au début sans agiter l'affichage à la fin.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";

/**
 * @param {number|null} target valeur visée
 * @param {number} factor part de l'écart rattrapée à chaque image (0–1)
 */
export function useCountUp(target, factor = 0.22) {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  const raf = useRef(0);

  useEffect(() => {
    if (target == null) {
      cancelAnimationFrame(raf.current);
      current.current = null;
      setShown(null);
      return undefined;
    }

    // Première valeur après une remise à zéro : on part de 0, le compteur monte.
    if (current.current == null) current.current = 0;

    const tick = () => {
      const gap = target - current.current;
      // Sous un demi-point l'écart ne se voit plus une fois arrondi.
      current.current =
        Math.abs(gap) < 0.5 ? target : current.current + gap * factor;
      setShown(current.current);
      if (current.current !== target) raf.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, factor]);

  return shown;
}
