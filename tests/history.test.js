import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendHistory, applyResult, weekStart, getGameProgress, makeEntry } from '../js/core/history.js';
import { defaultProfile } from '../js/core/storage.js';

const DAY = 86400000;
const entry = (t, score = 5) => ({ t, game: 'g', level: 1, score, total: 10, durationMs: 1000, missed: [] });

test('weekStart renvoie le lundi 00:00 UTC', () => {
  const monday = Date.UTC(2026, 9, 5);   // lundi 5 octobre 2026
  assert.equal(weekStart(monday), monday);
  assert.equal(weekStart(Date.UTC(2026, 9, 11, 23, 59)), monday);   // dimanche soir
  assert.equal(weekStart(Date.UTC(2026, 9, 12)), monday + 7 * DAY);
});

test('l\'historique est plafonné : les plus anciennes parties sont agrégées par semaine', () => {
  let p = defaultProfile({ id: 'p' });
  const t0 = Date.UTC(2026, 0, 5);
  for (let i = 0; i < 8; i++) p = appendHistory(p, entry(t0 + i * DAY, i), 5);
  assert.equal(p.history.length, 5);
  assert.equal(p.history[0].t, t0 + 3 * DAY);
  assert.deepEqual(p.weekly, [{ week: t0, game: 'g', level: 1, games: 3, score: 0 + 1 + 2, total: 30, durationMs: 3000 }]);
});

test('makeEntry ne garde que les champs de l\'historique', () => {
  const e = makeEntry({ ...entry(1), stars: 2, extras: [], progress: {} });
  assert.deepEqual(Object.keys(e).sort(), ['durationMs', 'game', 'level', 'missed', 'score', 't', 'total']);
});

test('progression : meilleur score et déblocage', () => {
  const p0 = defaultProfile({ id: 'p' });
  assert.deepEqual(getGameProgress(p0, 'g'), { unlocked: 1, best: {}, plays: 0 });
  const a = applyResult(p0, { game: 'g', level: 1, score: 9, total: 10, stars: 3, unlocksNext: true });
  assert.equal(a.newlyUnlocked, 2);
  const b = applyResult(a.profile, { game: 'g', level: 1, score: 6, total: 10, stars: 1, unlocksNext: false });
  assert.equal(b.newBest, false);
  assert.equal(b.newlyUnlocked, null);
  assert.equal(b.progress.unlocked, 2);
  assert.equal(b.progress.best[1].score, 9);
  assert.equal(b.progress.plays, 2);
});
