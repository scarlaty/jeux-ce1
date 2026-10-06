// Confettis de fin de partie (#21). Pas de bibliothèque : quelques éléments animés en CSS,
// posés dans une couche fixe sans interaction, retirés dès la fin de l'animation.
// `prefers-reduced-motion: reduce` → rien du tout (le tampon et le texte, eux, restent).
import { h } from './dom.js';

const PIECES = 32;
const DURATION_MS = 2400;
const COLORS = 5;   // .confetti__bit--1 … --5, définies dans css/rewards.css

/** Vrai si l'enfant (ou le système) demande moins d'animations. */
export function prefersReducedMotion() {
  return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

/**
 * Lance les confettis et renvoie une fonction d'arrêt (à appeler en quittant l'écran).
 * L'animation s'arrête toute seule : elle ne tourne jamais en boucle et ne bloque rien.
 */
export function confetti({ pieces = PIECES, duration = DURATION_MS } = {}) {
  if (prefersReducedMotion()) return () => {};
  const layer = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < pieces; i++) {
    layer.append(h('span', {
      class: `confetti__bit confetti__bit--${(i % COLORS) + 1}${i % 3 === 0 ? ' confetti__bit--round' : ''}`,
      style: `--x: ${((i + 0.5) / pieces * 100).toFixed(1)}%;`
        + ` --delay: ${(i % 7) * 90}ms;`
        + ` --spin: ${(i % 2 ? 1 : -1) * (360 + (i % 5) * 180)}deg;`
        + ` --drift: ${((i % 9) - 4) * 14}px;`
        + ` --fall: ${duration}ms;`,
    }));
  }
  document.body.append(layer);
  const timer = setTimeout(() => layer.remove(), duration + 700);
  return () => { clearTimeout(timer); layer.remove(); };
}
