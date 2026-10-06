import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_COUNT, dateKey, seedFromString, dailyCandidates, planDaily, buildDailyQuestions,
  createDailyGame, dailyLevel,
} from '../js/core/daily.js';
import { createSession, createEmitter } from '../js/core/engine.js';
import demo from '../js/games/demo.js';
import { validateQuestion } from '../js/core/validate.js';

test('clé du jour en heure locale', () => {
  assert.equal(dateKey(new Date(2026, 9, 6, 23, 59)), '2026-10-06');
  assert.equal(dateKey(new Date(2026, 0, 2, 0, 0)), '2026-01-02');
});

test('graine stable et différente selon le texte', () => {
  assert.equal(seedFromString('defi:2026-10-06'), seedFromString('defi:2026-10-06'));
  assert.notEqual(seedFromString('defi:2026-10-06'), seedFromString('defi:2026-10-07'));
});

const games = [
  { id: 'sons', island: 'mots' }, { id: 'calcul', island: 'nombres' }, { id: 'heure', island: 'mesures' },
  { id: 'demo', island: 'ailleurs', demo: true },
];

test('candidats : jeux déjà joués, sinon tous les vrais jeux, sinon la démonstration', () => {
  const played = { progress: { calcul: { plays: 3 }, heure: { plays: 0 }, demo: { plays: 9 } } };
  assert.deepEqual(dailyCandidates(games, played).map((g) => g.id), ['calcul']);
  assert.deepEqual(dailyCandidates(games, {}).map((g) => g.id), ['sons', 'calcul', 'heure']);
  assert.deepEqual(dailyCandidates([games[3]], {}).map((g) => g.id), ['demo']);
});

test('plan du jour : déterministe selon la date, indépendant de l\'ordre des jeux', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const plan = planDaily('2026-10-06', ids);
  assert.equal(plan.length, DAILY_COUNT);
  assert.equal(new Set(plan).size, DAILY_COUNT, 'assez de jeux : 5 jeux différents');
  assert.deepEqual(planDaily('2026-10-06', [...ids].reverse()), plan);
  // Sur un mois, le défi change chaque jour.
  const days = Array.from({ length: 30 }, (_, i) => planDaily(`2026-11-${String(i + 1).padStart(2, '0')}`, ids).join());
  assert.ok(new Set(days).size >= 28);
});

test('plan du jour avec peu de jeux : chacun au moins une fois', () => {
  const plan = planDaily('2026-10-06', ['x', 'y']);
  assert.equal(plan.length, DAILY_COUNT);
  assert.ok(plan.includes('x') && plan.includes('y'));
  assert.deepEqual(planDaily('2026-10-06', ['solo']), Array(DAILY_COUNT).fill('solo'));
  assert.deepEqual(planDaily('2026-10-06', []), []);
});

test('questions du jour : mêmes questions toute la journée, valides et à clés uniques', () => {
  const entries = planDaily('2026-10-06', ['demo']).map(() => ({ game: demo, level: 2 }));
  const a = buildDailyQuestions('2026-10-06', entries);
  const b = buildDailyQuestions('2026-10-06', entries);
  assert.deepEqual(a, b);
  assert.notDeepEqual(buildDailyQuestions('2026-10-07', entries), a);
  assert.equal(new Set(a.map((q) => q.key)).size, DAILY_COUNT);
  for (const q of a) {
    assert.deepEqual(validateQuestion(q), [], q.key);
    assert.equal(q.island, 'ailleurs');
    assert.equal(q.from, 'demo');
  }
});

test('le défi se joue avec le moteur, dans l\'ordre prévu', () => {
  const entries = Array.from({ length: DAILY_COUNT }, () => ({ game: demo, level: 1 }));
  const questions = buildDailyQuestions('2026-10-06', entries);
  const game = createDailyGame('2026-10-06', questions);
  const session = createSession(game, 1, { count: questions.length, events: createEmitter() });
  assert.deepEqual(session.questions, questions);
  while (!session.done) { session.answer(session.current.answer); session.next(); }
  assert.equal(session.result.score, DAILY_COUNT);
  assert.equal(session.result.stars, 3);
  assert.equal(game.daily, '2026-10-06');
});

test('niveau du défi : le plus haut niveau ouvert', () => {
  assert.equal(dailyLevel(demo, {}), 1);
  assert.equal(dailyLevel(demo, { progress: { demo: { unlocked: 3 } } }), 3);
  assert.equal(dailyLevel(demo, { progress: { demo: { unlocked: 9 } } }), 3);
});
