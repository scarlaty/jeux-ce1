// Vérifications communes à tous les générateurs de jeux (voir CLAUDE.md, « Contrat d'un jeu »).
// Usage dans tests/games/<id>.test.js :
//   import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
//   checkGameShape(game);  checkGenerator(game, { draws: 500, minDistinct: 30 });
import assert from 'node:assert/strict';
import { createRng } from '../../js/core/random.js';
import { validateQuestion } from '../../js/core/validate.js';
import { buildQuestions, renderFingerprint, QUESTIONS_PER_GAME } from '../../js/core/engine.js';

const ISLANDS = ['mots', 'nombres', 'mesures', 'monde', 'ailleurs'];

export function checkGameShape(game) {
  assert.match(game.id, /^[a-z0-9-]+$/);
  assert.ok(game.title, 'title');
  assert.ok(ISLANDS.includes(game.island), `île inconnue : ${game.island}`);
  assert.equal(game.levels.length, 3, 'exactement 3 niveaux');
  for (const l of game.levels) assert.ok(l.label, 'libellé de niveau');
  assert.equal(typeof game.makeQuestion, 'function');
}

// Nombre de parties simulées (graines déterministes) pour traquer un doublon d'écran rare :
// le bug de l'issue #92 (deux pastilles entendues différentes, écran strictement identique)
// n'apparaissait que dans ~1,7 % des parties. Avec 200 parties par niveau, il est débusqué dès
// la partie 62 pour la graine utilisée ici : une régression ne peut pas se glisser en silence.
const RENDER_PARTIES = 200;

/**
 * Tire `draws` questions par niveau (en simulant des parties, `seen` compris) et vérifie
 * chacune avec validateQuestion. Vérifie aussi, sur `RENDER_PARTIES` parties, que deux questions
 * d'UNE MÊME partie ne se ressemblent jamais à l'écran (voir `renderFingerprint`, issue #92) :
 * un générateur trop pauvre pour varier le rendu sur une partie entière doit être corrigé, pas
 * contourné. Renvoie, par niveau, les questions tirées (les `draws` premières).
 */
export function checkGenerator(game, { draws = 500, minDistinct = 30, checks } = {}) {
  const byLevel = {};
  const renderTarget = Math.max(draws, RENDER_PARTIES * QUESTIONS_PER_GAME);
  for (let level = 1; level <= game.levels.length; level++) {
    const rng = createRng(1000 + level);
    const questions = [];
    let checked = 0;
    while (checked < renderTarget) {
      const partie = buildQuestions(game, level, rng, QUESTIONS_PER_GAME);
      const renders = partie.map(renderFingerprint);
      assert.equal(new Set(renders).size, renders.length,
        `niveau ${level} : deux questions d'une même partie se ressemblent à l'écran parmi `
        + `${partie.map((q) => q.key).join(', ')}`);
      checked += partie.length;
      if (questions.length < draws) questions.push(...partie);
    }
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
