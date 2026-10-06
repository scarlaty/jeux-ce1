// Registre des composants de question. Chaque composant (un fichier par type) exporte :
//
//   create(question, ctx) → { el, showResult({ correct, given, answer }), destroy?() }
//       ctx.submit(value) : à appeler UNE fois avec la réponse de l'enfant ;
//       ctx.tap()         : petit son de touche (facultatif).
//       showResult        : verrouille le composant et montre la correction (✓ / ✗).
//   describe(question) → { text?, emoji?, cursive?, lang? } | null
//       la bonne réponse, affichée dans la bulle après une erreur (null : la correction
//       est déjà visible dans le composant).
//
// Un jeu qui a besoin d'un type nouveau l'ajoute ici via registerQuestionUI (et documente
// son `display` en tête de fichier, comme les composants ci-dessous).
//
// Commun à tous les types : `display.show` = illustration au-dessus des réponses
//   { emoji?, text?, cursive?, speak?, lang?, math? } — `speak` ajoute un bouton « écouter » propre,
//   `math: true` affiche `text` comme un calcul (« 7 + ? = 15 », voir mathText dans dom.js).
import * as choice from './choice.js';
import * as keypad from './keypad.js';
import * as order from './order.js';
import * as drag from './drag.js';
import * as letters from './letters.js';

const registry = new Map(Object.entries({ choice, keypad, order, drag, letters }));

export function registerQuestionUI(type, module) {
  registry.set(type, module);
}

export function getQuestionUI(type) {
  const ui = registry.get(type);
  if (!ui) throw new Error(`Aucun composant pour le type « ${type} »`);
  return ui;
}
