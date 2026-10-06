// Petit contrôle à l'entrée de l'espace parents (#15).
// Ce n'est pas une sécurité : c'est une porte qu'un enfant de 7 ans ne franchit pas par hasard.
// Une multiplication de deux nombres de 6 à 9 est hors du programme de CE1 (les tables vues
// en CE1 vont jusqu'à 5), et le résultat ne se devine pas en tâtonnant.
//
// Logique pure : l'écran ne fait qu'afficher `text` et comparer avec `checkGate`.

export const GATE_FACTORS = [6, 7, 8, 9];
export const GATE_MAX_TRIES = 3;

/** Tire une multiplication. `rng` : fonction de [0, 1[ (Math.random par défaut). */
export function makeGateChallenge(rng = Math.random) {
  const a = GATE_FACTORS[Math.floor(rng() * GATE_FACTORS.length)];
  const b = GATE_FACTORS[Math.floor(rng() * GATE_FACTORS.length)];
  return { a, b, answer: a * b, text: `${a} × ${b}` };
}

/** Réponse juste ? Les espaces autour sont tolérés ; tout le reste est refusé. */
export function checkGate(challenge, given) {
  const text = String(given ?? '').trim();
  if (text === '' || !/^\d+$/.test(text)) return false;
  return Number(text) === challenge.answer;
}
