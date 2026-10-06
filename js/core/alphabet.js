// Touches du clavier de lettres (ui/letters.js). Partagé avec la validation des questions
// pour garantir qu'une réponse « letters » peut toujours être tapée.

export const LETTERS = [...'abcdefghijklmnopqrstuvwxyz'];
/** Lettres accentuées utiles au CE1. */
export const ACCENTED = [...'éèêëàâçîïôùû'];
/** Apostrophe droite et trait d'union. */
export const SYMBOLS = ["'", '-'];

export function keyboardKeys({ accents = true } = {}) {
  return [...LETTERS, ...(accents ? ACCENTED : []), ...SYMBOLS];
}
