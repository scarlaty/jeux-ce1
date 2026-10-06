// Agrégats de l'historique (espace parents, courbes) et mise en forme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  totals, statsByGame, statsBySubject, weeklySeries, mostMissed, historyPage, appendHistory, percent, WEEK,
} from '../js/core/history.js';
import { defaultProfile } from '../js/core/storage.js';
import { formatDuration, formatWeek, plural, subjectLabel } from '../js/core/format.js';
import { makeChallenge, checkChallenge } from '../js/core/parent-gate.js';
import { createRng } from '../js/core/random.js';

const MONDAY = Date.UTC(2026, 9, 5);   // lundi 5 octobre 2026
const HOUR = 3600000;
const entry = (t, game, score, missed = [], durationMs = 60000) => ({ t, game, level: 1, score, total: 10, durationMs, missed });
const SUBJECTS = { sons: 'français', calcul: 'maths', tables: 'maths' };
const subjectOf = (id) => SUBJECTS[id] || 'autre';

function sample() {
  const p = defaultProfile({ id: 'p' });
  return {
    ...p,
    history: [
      entry(MONDAY - WEEK + HOUR, 'sons', 6, ['son [ou]', 'son [on]']),
      entry(MONDAY + HOUR, 'sons', 8, ['son [ou]']),
      entry(MONDAY + 2 * HOUR, 'calcul', 10),
      entry(MONDAY + 3 * HOUR, 'tables', 7, ['table de 3', 'son [ou]', 'table de 3'], 120000),
    ],
    weekly: [{ week: MONDAY - 3 * WEEK, game: 'sons', level: 1, games: 2, score: 10, total: 20, durationMs: 300000 }],
  };
}

test('percent arrondit et renvoie null sans question', () => {
  assert.equal(percent(2, 3), 67);
  assert.equal(percent(0, 0), null);
});

test('totaux : historique + agrégats hebdomadaires, avec filtre de date', () => {
  const p = sample();
  assert.deepEqual(totals(p), { plays: 6, score: 41, total: 60, durationMs: 300000 + 3 * 60000 + 120000, pct: 68 });
  const week = totals(p, { since: MONDAY });
  assert.equal(week.plays, 3);
  assert.equal(week.pct, 83);   // 25 / 30
  assert.equal(totals(defaultProfile({ id: 'x' })).pct, null);
});

test('par jeu et par matière', () => {
  const p = sample();
  const byGame = statsByGame(p);
  assert.deepEqual(Object.keys(byGame).sort(), ['calcul', 'sons', 'tables']);
  assert.equal(byGame.sons.plays, 4);
  assert.equal(byGame.sons.pct, 60);   // (10 + 6 + 8) / 40
  assert.equal(byGame.sons.lastT, MONDAY + HOUR);
  const bySubject = statsBySubject(p, subjectOf);
  assert.deepEqual(Object.keys(bySubject).sort(), ['français', 'maths']);
  assert.equal(bySubject.maths.plays, 2);
  assert.equal(bySubject.maths.pct, 85);
});

test('série hebdomadaire continue, semaines vides comprises', () => {
  const p = sample();
  const series = weeklySeries(p, { weeks: 4, now: MONDAY + 2 * 86400000 });
  assert.deepEqual(series.map((s) => s.week), [MONDAY - 3 * WEEK, MONDAY - 2 * WEEK, MONDAY - WEEK, MONDAY]);
  assert.deepEqual(series.map((s) => s.plays), [2, 0, 1, 3]);
  assert.deepEqual(series.map((s) => s.pct), [50, null, 60, 83]);
  const onlySons = weeklySeries(p, { weeks: 2, now: MONDAY, filter: (r) => r.game === 'sons' });
  assert.deepEqual(onlySons.map((s) => s.plays), [1, 1]);
});

test('série « depuis le début » : de la première partie à aujourd\'hui', () => {
  const p = sample();
  const series = weeklySeries(p, { weeks: 'all', now: MONDAY + WEEK });
  assert.equal(series.length, 5);
  assert.equal(series[0].week, MONDAY - 3 * WEEK);
  assert.equal(weeklySeries(defaultProfile({ id: 'x' }), { weeks: 'all', now: MONDAY }).length, 1);
});

test('notions les plus ratées : tri par fréquence puis ordre alphabétique, depuis une date', () => {
  const p = sample();
  assert.deepEqual(mostMissed(p), [
    { skill: 'son [ou]', count: 3 },
    { skill: 'table de 3', count: 2 },
    { skill: 'son [on]', count: 1 },
  ]);
  assert.deepEqual(mostMissed(p, { since: MONDAY, limit: 1 }), [{ skill: 'son [ou]', count: 2 }]);
  assert.deepEqual(mostMissed(defaultProfile({ id: 'x' })), []);
});

test('historique paginé, du plus récent au plus ancien', () => {
  let p = defaultProfile({ id: 'p' });
  for (let i = 0; i < 23; i++) p = appendHistory(p, entry(MONDAY + i * HOUR, 'sons', 5));
  const first = historyPage(p, { page: 1, perPage: 10 });
  assert.equal(first.pages, 3);
  assert.equal(first.count, 23);
  assert.equal(first.items[0].t, MONDAY + 22 * HOUR);
  assert.equal(historyPage(p, { page: 3 }).items.length, 3);
  assert.equal(historyPage(p, { page: 99 }).page, 3);   // borné
  assert.equal(historyPage(p, { page: -1 }).page, 1);
  assert.deepEqual(historyPage(defaultProfile({ id: 'x' })), { items: [], page: 1, pages: 1, count: 0 });
});

test('mise en forme : durées, pluriels, semaines, matières', () => {
  assert.equal(formatDuration(0), '0 min');
  assert.equal(formatDuration(45000), '45 s');
  assert.equal(formatDuration(12 * 60000 + 20000), '12 min');
  assert.equal(formatDuration(65 * 60000), '1 h 05');
  assert.equal(plural(0, 'partie'), '0 partie');
  assert.equal(plural(1, 'partie'), '1 partie');
  assert.equal(plural(2, 'partie'), '2 parties');
  assert.equal(formatWeek(MONDAY), '5 oct.');
  assert.equal(subjectLabel('maths'), 'Mathématiques');
  assert.equal(subjectLabel('inconnue'), 'inconnue');
});

test('opération de l\'espace parents : tables de 6 à 9', () => {
  const rng = createRng(42);
  for (let i = 0; i < 200; i++) {
    const c = makeChallenge(rng);
    assert.ok(c.a >= 6 && c.a <= 9 && c.b >= 6 && c.b <= 9);
    assert.equal(c.answer, c.a * c.b);
    assert.equal(c.text, `${c.a} × ${c.b}`);
    assert.equal(checkChallenge(c, ` ${c.answer} `), true);
    assert.equal(checkChallenge(c, String(c.answer + 1)), false);
  }
  assert.equal(checkChallenge({ answer: 56 }, '56abc'), false);
  assert.equal(checkChallenge({ answer: 56 }, ''), false);
});
