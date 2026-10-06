// Vérification de la forme d'une question. Sert aux tests de chaque générateur
// (500 tirages par niveau) : une question invalide doit être repérée avant d'arriver à l'enfant.
import { keyboardKeys } from './alphabet.js';
import { sameAnswer } from './engine.js';
import { artErrors, artLabel } from './ui/art/index.js';

export const QUESTION_TYPES = ['choice', 'keypad', 'order', 'drag', 'letters'];

const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

/** Un contenu (choix, élément, illustration) montre-t-il quelque chose ? */
const shows = (c) => nonEmpty(c.text) || nonEmpty(c.emoji) || Boolean(c.art);

/** Ce que l'enfant voit : sert à repérer deux choix impossibles à distinguer. */
const seenAs = (c) => `${c.emoji || ''}|${c.text || ''}|${c.art ? artLabel(c.art) : ''}`;

/** Les dessins de tous les contenus d'une question doivent être valides. */
function checkArt(contents, errors) {
  for (const c of contents) {
    if (c && c.art) errors.push(...artErrors(c.art));
  }
}

/** Normalise un choix de QCM : une chaîne ou un nombre devient { value, text }. */
export function toChoice(c) {
  return typeof c === 'object' && c !== null ? c : { value: c, text: String(c) };
}

const checks = {
  choice(q, errors) {
    const choices = (q.display?.choices || []).map(toChoice);
    if (choices.length < 2) errors.push('au moins 2 choix');
    if (choices.some((c) => !shows(c))) errors.push('choix sans texte ni image');
    const keys = choices.map((c) => JSON.stringify(c.value));
    if (new Set(keys).size !== keys.length) errors.push('choix en double');
    const matching = choices.filter((c) => sameAnswer(q.answer, c.value));
    if (matching.length !== 1) errors.push(`la réponse doit figurer une fois parmi les choix (${matching.length})`);
    const labels = choices.map(seenAs);
    if (new Set(labels).size !== labels.length) errors.push('deux choix s\'affichent pareil');
    checkArt(choices, errors);
  },

  keypad(q, errors) {
    if (!Number.isInteger(q.answer) || q.answer < 0) errors.push('réponse : entier positif attendu');
    const max = q.display?.maxLength ?? 4;
    if (String(q.answer).length > max) errors.push('réponse plus longue que maxLength');
  },

  order(q, errors) {
    const items = q.display?.items || [];
    if (items.length < 2) errors.push('au moins 2 éléments à ranger');
    if (!Array.isArray(q.answer) || q.answer.length !== items.length) {
      errors.push('la réponse doit contenir tous les éléments');
      return;
    }
    const sorted = (list) => list.map(String).sort().join('\u0000');
    if (sorted(items) !== sorted(q.answer)) errors.push('la réponse n\'est pas une permutation des éléments');
    if (sameAnswer(q.answer, items)) errors.push('les éléments sont déjà dans l\'ordre');
  },

  drag(q, errors) {
    const items = q.display?.items || [];
    const targets = q.display?.targets || [];
    if (items.length < 2 || targets.length < 2) errors.push('au moins 2 éléments et 2 cibles');
    const itemIds = items.map((i) => i.id);
    const targetIds = targets.map((t) => t.id);
    if (new Set(itemIds).size !== itemIds.length) errors.push('identifiants d\'éléments en double');
    if (new Set(targetIds).size !== targetIds.length) errors.push('identifiants de cibles en double');
    if (targetIds.includes('pool')) errors.push('« pool » est réservé');
    if (items.some((i) => !shows(i))) errors.push('élément sans texte ni image');
    if (targets.some((t) => !nonEmpty(t.label))) errors.push('cible sans étiquette');
    checkArt(items, errors);
    const answer = q.answer || {};
    if (Object.keys(answer).sort().join() !== [...itemIds].sort().join()) errors.push('chaque élément doit avoir une cible');
    if (Object.values(answer).some((t) => !targetIds.includes(t))) errors.push('cible inconnue dans la réponse');
  },

  letters(q, errors) {
    if (!nonEmpty(q.answer)) { errors.push('réponse vide'); return; }
    const keys = new Set(keyboardKeys({ accents: q.display?.accents !== false }));
    const missing = [...q.answer].filter((ch) => !keys.has(ch));
    if (missing.length) errors.push(`lettres absentes du clavier : ${missing.join(' ')}`);
  },
};

/**
 * Renvoie la liste des problèmes (vide si la question est valide).
 * Un jeu qui définit un type personnalisé passe sa propre vérification :
 * `validateQuestion(q, { checks: { monType: (q, errors) => … } })`.
 */
export function validateQuestion(q, { checks: extra = {} } = {}) {
  const all = { ...checks, ...extra };
  const errors = [];
  if (!q || typeof q !== 'object') return ['pas une question'];
  if (!nonEmpty(q.key)) errors.push('clé manquante');
  if (!nonEmpty(q.prompt)) errors.push('consigne manquante');
  if (typeof all[q.type] !== 'function') errors.push(`type inconnu : ${q.type}`);
  else all[q.type](q, errors);
  if (q.answer === undefined || q.answer === null) errors.push('réponse manquante');
  if (q.explain !== undefined && typeof q.explain !== 'string') errors.push('explain doit être un texte');
  const show = q.display?.show;
  if (show && !shows(show)) errors.push('display.show vide');
  if (show) checkArt([show], errors);
  return errors;
}
