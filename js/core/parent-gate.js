// Petite opération qui protège l'espace parents (#15) : une multiplication des tables de 6 à 9,
// facile pour un adulte, pas encore au programme de CE1.
import { createRng } from './random.js';

/** { a, b, text: '7 × 8', answer: 56 } tiré au hasard (graine facultative pour les tests). */
export function makeChallenge(rng = createRng()) {
  const a = rng.int(6, 9);
  const b = rng.int(6, 9);
  return { a, b, text: `${a} × ${b}`, answer: a * b };
}

/** Vérifie la réponse saisie (espaces tolérés). */
export function checkChallenge(challenge, given) {
  const value = String(given ?? '').trim();
  return /^\d{1,3}$/.test(value) && Number(value) === challenge.answer;
}
