// ─────────────────────────────────────────────────────────────────────────────
// Lissage d'une valeur qui change trop vite pour être lue.
//
// Le moteur de speed test rapporte sa progression à chaque morceau reçu, soit
// des dizaines de fois par seconde : les chiffres deviennent illisibles. Plutôt
// que de ralentir la mesure, on ralentit l'affichage — la valeur affichée court
// après la vraie, d'un cran à chaque image.
//
// Approche exponentielle plutôt que durée fixe : la valeur rattrape vite un
// grand écart (début de mesure) et se pose doucement sur les petits (plateau),
// sans avoir à connaître la distance à parcourir à l'avance.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";

/**
 * @param {number|null} target valeur réelle
 * @param {{factor?: number, snap?: number}} [opts]
 *   factor : part de l'écart rattrapée par image (0–1)
 *   snap   : écart en dessous duquel on colle à la cible
 */
export function useSmoothed(target, { factor = 0.14, snap = 0.05 } = {}) {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  const raf = useRef(0);

  useEffect(() => {
    // Remise à zéro (nouveau test) : pas d'animation, on coupe net.
    if (target == null) {
      cancelAnimationFrame(raf.current);
      current.current = null;
      setShown(null);
      return undefined;
    }

    // Première valeur après un reset : on part de 0 pour que le compteur monte.
    if (current.current == null) current.current = 0;

    const tick = () => {
      const gap = target - current.current;
      current.current = Math.abs(gap) < snap ? target : current.current + gap * factor;
      setShown(current.current);
      if (current.current !== target) raf.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, factor, snap]);

  return shown;
}
