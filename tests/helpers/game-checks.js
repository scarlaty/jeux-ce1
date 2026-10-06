// Vérifications communes à tous les générateurs de jeux (voir CLAUDE.md, « Contrat d'un jeu »).
// Usage dans tests/games/<id>.test.js :
//   import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
//   checkGameShape(game);  checkGenerator(game, { draws: 500, minDistinct: 30 });
import assert from 'node:assert/strict';
import { createRng } from '../../js/core/random.js';
import { validateQuestion } from '../../js/core/validate.js';
import { buildQuestions } from '../../js/core/engine.js';

const ISLANDS = ['mots', 'nombres', 'mesures', 'monde', 'ailleurs'];

export function checkGameShape(game) {
  assert.match(game.id, /^[a-z0-9-]+$/);
  assert.ok(game.title, 'title');
  assert.ok(ISLANDS.includes(game.island), `île inconnue : ${game.island}`);
  assert.equal(game.levels.length, 3, 'exactement 3 niveaux');
  for (const l of game.levels) assert.ok(l.label, 'libellé de niveau');
  assert.equal(typeof game.makeQuestion, 'function');
}

/**
 * Tire `draws` questions par niveau (en simulant des parties, `seen` compris) et vérifie
 * chacune avec validateQuestion. Renvoie, par niveau, les questions tirées.
 */
export function checkGenerator(game, { draws = 500, minDistinct = 30, checks } = {}) {
  const byLevel = {};
  for (let level = 1; level <= game.levels.length; level++) {
    const rng = createRng(1000 + level);
    const questions = [];
    while (questions.length < draws) questions.push(...buildQuestions(game, level, rng, 10));
    for (const q of questions) {
      const errors = validateQuestion(q, { checks });
      assert.deepEqual(errors, [], `niveau ${level}, ${q.key} : ${errors.join(' ; ')}`);
    }
    const distinct = new Set(questions.map((q) => q.key)).size;
    assert.ok(distinct >= minDistinct, `niveau ${level} : ${distinct} questions distinctes < ${minDistinct}`);
    byLevel[level] = questions;
  }
  return byLevel;
}
