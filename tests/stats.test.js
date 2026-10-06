import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEEK, weekLabel, dateTimeLabel, durationLabel, rateOf, playedGames, totals, weeklySeries,
  topMissed, gameSummaries, seriesFilters, chartGeometry,
} from '../js/core/stats.js';

const MONDAY = Date.UTC(2026, 9, 5);   // lundi 5 octobre 2026
const entry = (over = {}) => ({
  t: MONDAY, game: 'calcul-mental', level: 1, score: 8, total: 10, durationMs: 60000, missed: [], ...over,
});

test('étiquettes lisibles : semaine, date, durée', () => {
  assert.equal(weekLabel(MONDAY), '5 oct.');
  assert.equal(weekLabel(Date.UTC(2026, 1, 2)), '2 févr.');
  // Date construite en heure locale : le libellé ne dépend pas du fuseau de la machine.
  assert.equal(dateTimeLabel(new Date(2026, 9, 5, 17, 32).getTime()), 'lundi 5 oct à 17:32');
  assert.equal(dateTimeLabel(new Date(2026, 8, 1, 9, 5).getTime()), 'mardi 1er sept à 09:05');
  assert.equal(durationLabel(0), '0 s');
  assert.equal(durationLabel(45000), '45 s');
  assert.equal(durationLabel(60000), '1 min');
  assert.equal(durationLabel(80000), '1 min 20 s');
  assert.equal(durationLabel(3900000), '1 h 05');
});

test('rateOf arrondit et refuse de diviser par zéro', () => {
  assert.equal(rateOf(8, 10), 80);
  assert.equal(rateOf(2, 3), 67);
  assert.equal(rateOf(0, 0), null);
});

test('playedGames : les plus récentes d\'abord, filtrables', () => {
  const profile = { history: [entry({ t: 1 }), entry({ t: 3, game: 'autre' }), entry({ t: 2 })] };
  assert.deepEqual(playedGames(profile).map((e) => e.t), [3, 2, 1]);
  assert.deepEqual(playedGames(profile, { limit: 2 }).map((e) => e.t), [3, 2]);
  assert.deepEqual(playedGames(profile, { match: (e) => e.game === 'autre' }).map((e) => e.t), [3]);
  assert.deepEqual(playedGames(null), []);
  // L'historique d'origine n'est pas réordonné.
  assert.deepEqual(profile.history.map((e) => e.t), [1, 3, 2]);
});

test('totals additionne l\'historique détaillé ET les semaines agrégées', () => {
  const profile = {
    history: [entry({ score: 8 }), entry({ score: 6 })],
    weekly: [{ week: MONDAY - WEEK, game: 'calcul-mental', level: 1, games: 3, score: 15, total: 30, durationMs: 90000 }],
  };
  assert.deepEqual(totals(profile), { plays: 5, score: 29, total: 50, durationMs: 210000, rate: 58 });
  assert.deepEqual(totals({}), { plays: 0, score: 0, total: 0, durationMs: 0, rate: null });
});

test('weeklySeries couvre toute la période, trous compris', () => {
  const profile = {
    history: [entry({ t: MONDAY + 3600000, score: 9 }), entry({ t: MONDAY + 2 * 3600000, score: 7 })],
    weekly: [{ week: MONDAY - 2 * WEEK, game: 'calcul-mental', level: 1, games: 2, score: 10, total: 20, durationMs: 0 }],
  };
  const series = weeklySeries(profile, { weeks: 4, now: MONDAY + 3 * 3600000 });
  assert.equal(series.length, 4);
  assert.deepEqual(series.map((r) => r.games), [0, 2, 0, 2]);
  assert.deepEqual(series.map((r) => r.rate), [null, 50, null, 80]);
  assert.equal(series[3].label, '5 oct.');
  // Le filtre s'applique aux deux sources.
  const filtered = weeklySeries(profile, { weeks: 4, now: MONDAY, match: (e) => e.game === 'autre' });
  assert.deepEqual(filtered.map((r) => r.rate), [null, null, null, null]);
});

test('topMissed classe les notions les plus ratées', () => {
  const profile = {
    history: [
      entry({ missed: ['table de 3', 'doubles'] }),
      entry({ missed: ['table de 3'] }),
      entry({ missed: ['doubles', 'compléments à 10'] }),
    ],
  };
  assert.deepEqual(topMissed(profile, { limit: 2 }), [
    { skill: 'doubles', count: 2 },
    { skill: 'table de 3', count: 2 },
  ]);
  assert.equal(topMissed(profile).length, 3);
  assert.deepEqual(topMissed({ history: [] }), []);
});

test('gameSummaries décrit chaque jeu du registre', () => {
  const profile = {
    progress: { a: { unlocked: 2, best: { 1: { score: 9, total: 10, stars: 3 }, 2: { score: 6, total: 10, stars: 1 } }, plays: 4 } },
  };
  const games = [{ id: 'a', title: 'Jeu A', island: 'nombres', subject: 'maths' }, { id: 'b', title: 'Jeu B', island: 'mots', subject: 'français' }];
  const [a, b] = gameSummaries(profile, games);
  assert.equal(a.stars, 4);
  assert.equal(a.maxStars, 9);
  assert.equal(a.plays, 4);
  assert.deepEqual(a.levels.map((l) => l.open), [true, true, false]);
  assert.equal(b.stars, 0);
  assert.equal(b.plays, 0);
  assert.deepEqual(b.levels.map((l) => l.best), [null, null, null]);
});

test('seriesFilters propose tout, chaque matière et chaque jeu', () => {
  const games = [
    { id: 'a', title: 'Jeu A', subject: 'maths' },
    { id: 'b', title: 'Jeu B', subject: 'français' },
    { id: 'c', title: 'Jeu C', subject: 'maths' },
  ];
  const filters = seriesFilters(games);
  assert.deepEqual(filters.map((f) => f.id), ['tout', 'matiere:français', 'matiere:maths', 'jeu:a', 'jeu:b', 'jeu:c']);
  const maths = filters.find((f) => f.id === 'matiere:maths');
  assert.equal(maths.match({ game: 'c' }), true);
  assert.equal(maths.match({ game: 'b' }), false);
  assert.equal(filters.find((f) => f.id === 'jeu:b').match({ game: 'b' }), true);
});

test('chartGeometry place les points et coupe la ligne sur les trous', () => {
  const series = [
    { week: 1, label: 'a', games: 1, score: 5, total: 10, rate: 50 },
    { week: 2, label: 'b', games: 0, score: 0, total: 0, rate: null },
    { week: 3, label: 'c', games: 1, score: 10, total: 10, rate: 100 },
    { week: 4, label: 'd', games: 1, score: 0, total: 10, rate: 0 },
  ];
  const geo = chartGeometry(series, { width: 400, height: 200, top: 0, right: 0, bottom: 0, left: 0 });
  assert.deepEqual(geo.points.map((p) => p.x), [0, 400 / 3, 800 / 3, 400]);
  assert.equal(geo.points[0].y, 100);
  assert.equal(geo.points[1].y, null);
  assert.equal(geo.points[2].y, 0);
  assert.equal(geo.points[3].y, 200);
  // Deux tracés distincts : aucune ligne n'est inventée au-dessus de la semaine sans partie.
  assert.deepEqual(geo.segments.map((seg) => seg.length), [1, 2]);
  assert.deepEqual(geo.gridlines.map((g) => g.rate), [0, 25, 50, 75, 100]);
  // Une seule semaine : le point est centré plutôt que collé au bord.
  assert.equal(chartGeometry([series[0]], { width: 400, left: 0, right: 0 }).points[0].x, 200);
});
