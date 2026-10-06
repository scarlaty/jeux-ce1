import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/demo.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
import { QUESTION_TYPES } from '../../js/core/validate.js';

test('le jeu démo respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.demo, true);
});

test('500 tirages par niveau : questions valides', () => {
  const byLevel = checkGenerator(game, { draws: 500 });
  for (const questions of Object.values(byLevel)) {
    // Chaque type de question est présent à chaque niveau.
    assert.deepEqual([...new Set(questions.map((q) => q.type))].sort(), [...QUESTION_TYPES].sort());
  }
});

test('une partie de 10 questions montre chaque type deux fois', () => {
  const [questions] = Object.values(checkGenerator(game, { draws: 10, minDistinct: 1 }));
  const counts = {};
  for (const q of questions.slice(0, 10)) counts[q.type] = (counts[q.type] || 0) + 1;
  assert.deepEqual(Object.values(counts), [2, 2, 2, 2, 2]);
});

test('les calculs et les rangements sont justes', () => {
  const byLevel = checkGenerator(game, { draws: 500 });
  for (const questions of Object.values(byLevel)) {
    for (const q of questions) {
      if (q.type === 'keypad') {
        const [, a, op, b] = q.display.show.text.match(/^(\d+) ([+−×]) (\d+) = \?$/);
        const expected = { '+': +a + +b, '−': a - b, '×': a * b }[op];
        assert.equal(q.answer, expected, q.key);
        assert.ok(q.answer >= 0);
      }
      if (q.type === 'order' && typeof q.answer[0] === 'number') {
        const asc = [...q.answer].sort((x, y) => x - y);
        assert.ok(q.answer.join() === asc.join() || q.answer.join() === asc.reverse().join(), q.key);
      }
      if (q.type === 'drag') {
        const targets = Object.values(q.answer);
        for (const t of q.display.targets) assert.ok(targets.filter((x) => x === t.id).length >= 2, q.key);
      }
    }
  }
});
