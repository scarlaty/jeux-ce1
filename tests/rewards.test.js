// Récompenses (#16 → #21) : barème des points, grades, gommettes, défi du jour, îles.
// Tout est pur : aucun DOM, aucun stockage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  POINTS_PER_CORRECT, COMPLETION_POINTS, DAILY_BONUS_POINTS, STREAK_BONUSES,
  streakBonus, answerPoints, runPoints,
  GRADES, gradeRank, gradeFor, gradeProgress, gradeGained,
  STICKERS, STICKER_ISLANDS, islandStickers, findSticker, stickersWon, nextStickers,
  defaultRewards, normalizeRewards, readRewards, stickerCount, stickerTotal, applyGameRewards,
  DAILY_QUESTIONS, dailyKey, dailySeed, hashString, isDailyDone,
  gameStars, totalStars, ISLAND_UNLOCK_STARS, islandUnlocked, islandStarsLeft, islandUnlockStars,
} from '../js/core/rewards.js';
import { ISLANDS } from '../js/games/registry.js';

// --- Points ------------------------------------------------------------------------------------

test('une bonne réponse rapporte des points, une erreur n\'en enlève jamais', () => {
  assert.deepEqual(answerPoints({ correct: true, streak: 1 }), {
    base: POINTS_PER_CORRECT, bonus: 0, points: POINTS_PER_CORRECT, label: '',
  });
  assert.deepEqual(answerPoints({ correct: false, streak: 0 }), { base: 0, bonus: 0, points: 0, label: '' });
  assert.equal(answerPoints({}).points, 0);
  // Une erreur après une longue série ne déclenche aucun bonus.
  assert.equal(answerPoints({ correct: false, streak: 5 }).points, 0);
});

test('les bonus de série tombent aux paliers, une seule fois chacun', () => {
  assert.equal(streakBonus(2), null);
  for (const b of STREAK_BONUSES) {
    assert.equal(streakBonus(b.streak).points, b.points);
    assert.equal(answerPoints({ correct: true, streak: b.streak }).points, POINTS_PER_CORRECT + b.points);
    assert.ok(answerPoints({ correct: true, streak: b.streak }).label.length > 0);
  }
  // Juste après un palier, on revient au tarif normal.
  assert.equal(answerPoints({ correct: true, streak: 4 }).points, POINTS_PER_CORRECT);
  assert.ok(STREAK_BONUSES.every((b, i, all) => i === 0 || b.streak > all[i - 1].streak), 'paliers croissants');
});

test('une partie rapporte toujours quelque chose, même sans bonne réponse', () => {
  assert.equal(runPoints([]), COMPLETION_POINTS);
  assert.equal(runPoints([false, false, false]), COMPLETION_POINTS);
  assert.equal(runPoints([true]), COMPLETION_POINTS + POINTS_PER_CORRECT);
  // Sans faute sur 10 questions : les quatre bonus tombent.
  const perfect = runPoints(Array(10).fill(true));
  const bonuses = STREAK_BONUSES.reduce((s, b) => s + b.points, 0);
  assert.equal(perfect, COMPLETION_POINTS + 10 * POINTS_PER_CORRECT + bonuses);
  // Une erreur au milieu casse la série : moins de points, mais jamais moins que le minimum.
  const broken = runPoints([true, true, false, true, true, true, true, true, true, true]);
  assert.ok(broken < perfect && broken > COMPLETION_POINTS);
});

// --- Grades ------------------------------------------------------------------------------------

test('les six grades vont du crayon de bois au diplôme, par seuils croissants', () => {
  assert.deepEqual(GRADES.map((g) => g.name), [
    'Crayon de bois', 'Crayon de couleur', 'Feutre', 'Stylo plume', 'Cartable d\'or', 'Diplôme',
  ]);
  assert.equal(GRADES[0].points, 0);
  assert.ok(GRADES.every((g, i, all) => i === 0 || g.points > all[i - 1].points));
  assert.equal(new Set(GRADES.map((g) => g.id)).size, GRADES.length);
});

test('le grade suit les points', () => {
  assert.equal(gradeFor(0).id, 'crayon-bois');
  assert.equal(gradeFor(GRADES[1].points - 1).id, 'crayon-bois');
  assert.equal(gradeFor(GRADES[1].points).id, GRADES[1].id);
  assert.equal(gradeRank(999999), GRADES.length - 1);
  assert.equal(gradeFor(-10).id, 'crayon-bois');
});

test('avancement vers le grade suivant', () => {
  const start = gradeProgress(0);
  assert.equal(start.next.id, GRADES[1].id);
  assert.equal(start.remaining, GRADES[1].points);
  assert.equal(start.ratio, 0);
  const half = gradeProgress(Math.round(GRADES[1].points / 2));
  assert.ok(half.ratio > 0.4 && half.ratio < 0.6);
  const top = gradeProgress(GRADES[GRADES.length - 1].points + 100);
  assert.equal(top.next, null);
  assert.equal(top.ratio, 1);
});

test('gradeGained ne signale un grade que lorsqu\'il vient d\'être franchi', () => {
  assert.equal(gradeGained(0, 10), null);
  assert.equal(gradeGained(GRADES[1].points - 1, GRADES[1].points).id, GRADES[1].id);
  assert.equal(gradeGained(GRADES[1].points, GRADES[1].points + 10), null);
  // Un saut de plusieurs grades annonce le plus haut atteint.
  assert.equal(gradeGained(0, GRADES[3].points).id, GRADES[3].id);
});

// --- Gommettes ---------------------------------------------------------------------------------

test('le catalogue de gommettes couvre les cinq îles, sans doublon', () => {
  assert.deepEqual([...STICKER_ISLANDS].sort(), ISLANDS.map((i) => i.id).sort());
  const all = [];
  for (const island of STICKER_ISLANDS) {
    const list = STICKERS[island];
    assert.ok(list.length >= 10, `${island} : ${list.length} gommettes`);
    assert.equal(new Set(list.map((s) => s.id)).size, list.length, `ids en double dans ${island}`);
    assert.equal(new Set(list.map((s) => s.emoji)).size, list.length, `émojis en double dans ${island}`);
    for (const s of list) {
      assert.match(s.id, /^[a-z0-9-]+$/);
      assert.ok(s.name.length >= 2 && s.emoji.length > 0, `nom ou émoji manquant : ${s.id}`);
      all.push(s.emoji);
    }
  }
  assert.equal(new Set(all).size, all.length, 'un même émoji sur deux îles');
  assert.equal(stickerTotal(), all.length);
  assert.equal(findSticker('mots', 'livre').emoji, '📖');
  assert.equal(findSticker('mots', 'inconnue'), null);
  assert.deepEqual(islandStickers('nulle-part'), []);
});

test('une partie réussie donne au moins une gommette, trois étoiles en donnent deux', () => {
  assert.equal(stickersWon(0), 0);
  assert.equal(stickersWon(1), 1);
  assert.equal(stickersWon(2), 1);
  assert.equal(stickersWon(3), 2);
  assert.deepEqual(nextStickers([], 'mots', 1).map((s) => s.id), [STICKERS.mots[0].id]);
  assert.deepEqual(nextStickers([STICKERS.mots[0].id], 'mots', 2).map((s) => s.id),
    [STICKERS.mots[1].id, STICKERS.mots[2].id]);
  // Collection complète : plus rien à gagner, mais aucune erreur.
  assert.deepEqual(nextStickers(STICKERS.mots.map((s) => s.id), 'mots', 2), []);
  assert.deepEqual(nextStickers([], 'mots', 0), []);
});

// --- État des récompenses ----------------------------------------------------------------------

test('un état absent ou abîmé redevient utilisable', () => {
  const empty = normalizeRewards(undefined);
  assert.deepEqual(empty, { ...defaultRewards(), stickers: Object.fromEntries(STICKER_ISLANDS.map((i) => [i, []])) });
  assert.equal(normalizeRewards({ points: -5 }).points, 0);
  assert.equal(normalizeRewards({ points: 12.7 }).points, 12);
  assert.equal(normalizeRewards({ points: 'beaucoup' }).points, 0);
  assert.deepEqual(normalizeRewards({ stickers: { mots: 'oui' } }).stickers.mots, []);
  // Gommettes inconnues écartées, doublons supprimés, ordre du catalogue rétabli.
  const ids = [STICKERS.mots[2].id, STICKERS.mots[0].id, STICKERS.mots[0].id, 'fantome'];
  assert.deepEqual(normalizeRewards({ stickers: { mots: ids } }).stickers.mots,
    [STICKERS.mots[0].id, STICKERS.mots[2].id]);
  assert.equal(normalizeRewards({ daily: { pas: 'de clé' } }).daily, null);
  assert.equal(readRewards({ rewards: { points: 7 } }).points, 7);
  assert.equal(readRewards(null).points, 0);
  assert.equal(stickerCount({ stickers: { mots: [STICKERS.mots[0].id], monde: [STICKERS.monde[0].id] } }), 2);
});

test('applyGameRewards cumule les points et remplit l\'album', () => {
  const start = defaultRewards();
  const first = applyGameRewards(start, { island: 'nombres', stars: 3, points: 150 });
  assert.equal(first.rewards.points, 150);
  assert.equal(first.gained.points, 150);
  assert.deepEqual(first.gained.chest, { island: 'nombres', stars: 3 }, 'un coffre, pas de gommette directe');
  assert.equal(stickerCount(first.rewards), 0);
  assert.equal(first.gained.grade, null);
  // L'état d'origine n'est pas modifié (fonction pure).
  assert.equal(start.points, 0);
  assert.deepEqual(start.stickers, {});

  const second = applyGameRewards(first.rewards, { island: 'nombres', stars: 1, points: 110 });
  assert.equal(second.rewards.points, 260);
  assert.equal(second.gained.grade.id, GRADES[1].id, 'le passage de grade est signalé');

  // Partie ratée : des points quand même, mais pas de gommette.
  const third = applyGameRewards(second.rewards, { island: 'nombres', stars: 0, points: COMPLETION_POINTS });
  assert.equal(third.gained.points, COMPLETION_POINTS);
  assert.equal(third.gained.chest, null, 'pas de coffre sans étoile');

  // Île sans collection (cas d'un jeu mal déclaré) : jamais d'exception.
  const odd = applyGameRewards(third.rewards, { island: 'nulle-part', stars: 3, points: 10 });
  assert.equal(odd.rewards.points, third.rewards.points + 10);
});

test('le défi du jour n\'est récompensé qu\'une fois par jour', () => {
  const day = '2026-10-06';
  const first = applyGameRewards(defaultRewards(), { island: 'monde', stars: 3, points: 60, daily: { key: day } });
  assert.equal(first.gained.dailyBonus, DAILY_BONUS_POINTS);
  assert.equal(first.rewards.points, 60 + DAILY_BONUS_POINTS);
  assert.equal(first.rewards.daily.key, day);
  assert.deepEqual(first.gained.chest, { island: 'monde', stars: 3 });

  const again = applyGameRewards(first.rewards, { island: 'monde', stars: 3, points: 60, daily: { key: day } });
  assert.equal(again.gained.dailyBonus, 0);
  assert.equal(again.gained.chest, null, 'pas de second coffre le même jour');
  assert.equal(again.rewards.points, first.rewards.points + 60, 'les points des réponses comptent toujours');

  const tomorrow = applyGameRewards(again.rewards, { island: 'monde', stars: 2, points: 60, daily: { key: '2026-10-07' } });
  assert.equal(tomorrow.gained.dailyBonus, DAILY_BONUS_POINTS);
  assert.deepEqual(tomorrow.gained.chest, { island: 'monde', stars: 2 });
});

// --- Défi du jour : la date LOCALE, jamais UTC --------------------------------------------------

test('la clé du jour suit la date locale, du premier au dernier instant de la journée', () => {
  assert.equal(dailyKey(new Date(2026, 9, 6, 0, 0, 0)), '2026-10-06');
  assert.equal(dailyKey(new Date(2026, 9, 6, 23, 59, 59, 999)), '2026-10-06');
  assert.equal(dailyKey(new Date(2026, 9, 7, 0, 0, 0)), '2026-10-07');
  assert.equal(dailyKey(new Date(2026, 0, 2)), '2026-01-02', 'mois et jour sur deux chiffres');
  // Toutes les heures d'une même journée locale donnent la même clé (un calcul en UTC échouerait
  // ici dès que le fuseau de la machine n'est pas UTC).
  const keys = new Set();
  for (let hour = 0; hour < 24; hour++) keys.add(dailyKey(new Date(2026, 6, 15, hour, 30)));
  assert.deepEqual([...keys], ['2026-07-15']);
});

test('le défi change à minuit, et une seule fois par jour y compris au changement d\'heure', () => {
  const justBefore = new Date(2026, 2, 28, 23, 59, 59);
  const justAfter = new Date(2026, 2, 29, 0, 0, 0);
  assert.notEqual(dailyKey(justBefore), dailyKey(justAfter));
  assert.notEqual(dailySeed(justBefore), dailySeed(justAfter));

  // Un an de dates locales (dont les deux changements d'heure) : une clé par jour, dans l'ordre,
  // sans trou ni doublon.
  const seen = [];
  for (let i = 0; i < 400; i++) {
    const day = new Date(2026, 0, 1 + i, 12, 0, 0);
    seen.push(dailyKey(day));
    // Le midi et le petit matin du même jour local donnent la même clé.
    assert.equal(dailyKey(new Date(2026, 0, 1 + i, 2, 30)), seen[i]);
  }
  assert.equal(new Set(seen).size, seen.length, 'deux jours partagent une clé');
  assert.deepEqual([...seen].sort(), seen, 'les clés ne sont pas dans l\'ordre');
});

test('la graine du jour est stable, et différente d\'un jour à l\'autre', () => {
  const day = new Date(2026, 9, 6, 8, 0);
  assert.equal(dailySeed(day), dailySeed(new Date(2026, 9, 6, 21, 0)));
  const seeds = new Set();
  for (let i = 0; i < 365; i++) seeds.add(dailySeed(new Date(2026, 0, 1 + i)));
  assert.ok(seeds.size > 360, `graines trop peu variées : ${seeds.size}`);
  for (const seed of seeds) assert.ok(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff);
  assert.equal(hashString(''), 0x811c9dc5);
  assert.notEqual(hashString('a'), hashString('b'));
  assert.equal(DAILY_QUESTIONS, 5);
});

test('isDailyDone compare au jour local en cours', () => {
  const today = new Date(2026, 9, 6, 15, 0);
  assert.equal(isDailyDone(defaultRewards(), today), false);
  assert.equal(isDailyDone({ daily: { key: '2026-10-06' } }, today), true);
  assert.equal(isDailyDone({ daily: { key: '2026-10-05' } }, today), false);
});

// --- Étoiles et ouverture des îles ---------------------------------------------------------------

test('comptage des étoiles par jeu et au total', () => {
  assert.equal(gameStars(undefined), 0);
  assert.equal(gameStars({ best: { 1: { stars: 3 }, 2: { stars: 2 }, 3: {} } }), 5);
  assert.equal(totalStars(undefined), 0);
  assert.equal(totalStars({ a: { best: { 1: { stars: 3 } } }, b: { best: { 1: { stars: 1 }, 2: { stars: 2 } } } }), 6);
});

test('les îles s\'ouvrent au fil des étoiles, dans l\'ordre de la carte', () => {
  const ids = ISLANDS.map((i) => i.id);
  assert.deepEqual(Object.keys(ISLAND_UNLOCK_STARS).sort(), [...ids].sort(), 'une règle par île du registre');
  // Les deux premières îles sont ouvertes dès le premier jour.
  assert.equal(islandUnlocked(ids[0], 0), true);
  assert.equal(islandUnlocked(ids[1], 0), true);
  const seuils = ids.map((id) => islandUnlockStars(id));
  assert.deepEqual([...seuils].sort((a, b) => a - b), seuils, 'seuils croissants le long de la carte');
  const last = ids[ids.length - 1];
  assert.equal(islandUnlocked(last, 0), false);
  assert.equal(islandStarsLeft(last, 0), ISLAND_UNLOCK_STARS[last]);
  assert.equal(islandUnlocked(last, ISLAND_UNLOCK_STARS[last]), true);
  assert.equal(islandStarsLeft(last, 1000), 0);
  // Une île inconnue n'est jamais bloquante.
  assert.equal(islandUnlocked('nulle-part', 0), true);
});
