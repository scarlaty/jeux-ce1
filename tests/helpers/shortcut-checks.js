// Raccourcis de surface dans une banque de QCM texte (grille du juge pédagogie, critère 2 bis).
// Une banque = liste d'items { id, prompt, right, wrong: [...] }.
import assert from 'node:assert/strict';

/**
 * La bonne réponse ne doit pas se deviner à sa longueur : part des items où elle est STRICTEMENT
 * la plus longue (devant toutes ses mauvaises réponses) ≤ `max`.
 */
export function checkNoLengthShortcut(items, { max = 0.5, label = 'banque' } = {}) {
  const longest = items.filter((i) => i.wrong.every((w) => i.right.length > w.length));
  const share = longest.length / items.length;
  assert.ok(share <= max, `${label} : la bonne réponse est la plus longue dans ${(100 * share).toFixed(1)} % des items (> ${100 * max} %)`);
  return share;
}

const words = (text) => new Set(
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter((w) => w.length >= 5),
);

/**
 * La bonne réponse ne doit pas être la SEULE à recopier un mot de la consigne (5 lettres ou plus) :
 * l'enfant la repérerait sans comprendre. Part des items concernés ≤ `max`.
 */
export function checkNoPromptEcho(items, { max = 0.1, label = 'banque' } = {}) {
  const echoes = (text, prompt) => [...words(text)].some((w) => prompt.has(w));
  const bad = items.filter((i) => {
    const p = words(i.prompt);
    return echoes(i.right, p) && i.wrong.every((w) => !echoes(w, p));
  });
  const share = bad.length / items.length;
  assert.ok(share <= max, `${label} : ${(100 * share).toFixed(1)} % des bonnes réponses recopient seules la consigne (${bad.map((b) => b.id).join(', ')})`);
  return share;
}
