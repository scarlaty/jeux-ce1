import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  POINTS, answerPoints, scoreAnswers, starBonus, GRADES, gradeIndex, gradeInfo, defaultRewards,
  getRewards, stickerCount, pickStickers, applyGame, extrasFor, bookProgress, totalProgress,
  markSeen, installRewards,
} from '../js/core/rewards.js';
import { STICKER_BOOKS, getBook, findSticker } from '../js/data/stickers.js';
import { ISLANDS } from '../js/games/registry.js';
import { createRng } from '../js/core/random.js';
import { createEmitter, createSession } from '../js/core/engine.js';
import { createMemoryBackend, createStorage, createStore, PREFIX, SCHEMA_VERSION } from '../js/core/storage.js';
import { ensureActiveProfile } from '../js/core/profile.js';

const T = true;
const F = false;

test('points : 10 par bonne réponse, +5 à partir de 3 d\'affilée', () => {
  assert.equal(answerPoints(false, 0), 0);
  assert.equal(answerPoints(true, 1), 10);
  assert.equal(answerPoints(true, 2), 10);
  assert.equal(answerPoints(true, 3), 15);
  assert.equal(answerPoints(true, 8), 15);
  assert.deepEqual(scoreAnswers([]), { base: 0, streak: 0, total: 0 });
  assert.deepEqual(scoreAnswers([T, T, T, T]), { base: 40, streak: 10, total: 50 });
  // Une erreur remet la série à zéro.
  assert.deepEqual(scoreAnswers([T, T, F, T, T, T]), { base: 50, streak: 5, total: 55 });
  assert.equal(scoreAnswers(Array(10).fill(T)).total, 100 + 8 * POINTS.streakBonus);
});

test('bonus de fin selon les étoiles', () => {
  assert.deepEqual([0, 1, 2, 3].map(starBonus), POINTS.stars);
  assert.ok(POINTS.stars.every((p, i) => i === 0 || p > POINTS.stars[i - 1]));
});

test('grades : six paliers croissants, de plus en plus espacés', () => {
  assert.deepEqual(GRADES.map((g) => g.name),
    ['Crayon de bois', 'Crayon de couleur', 'Feutre', 'Stylo plume', 'Cartable d\'or', 'Diplôme']);
  assert.equal(GRADES[0].min, 0);
  for (let i = 2; i < GRADES.length; i++) {
    assert.ok(GRADES[i].min - GRADES[i - 1].min > GRADES[i - 1].min - (GRADES[i - 2]?.min ?? 0));
  }
  // Le premier passage arrive vite : deux parties moyennes (7/10) suffisent.
  const average = scoreAnswers([T, T, F, T, T, T, F, T, F, T]).total + starBonus(2);
  assert.ok(2 * average >= GRADES[1].min, `2 parties à ${average} points`);
});

test('gradeInfo : grade atteint et chemin vers le suivant', () => {
  assert.equal(gradeIndex(0), 0);
  assert.equal(gradeIndex(GRADES[1].min - 1), 0);
  assert.equal(gradeIndex(GRADES[1].min), 1);
  assert.equal(gradeIndex(1e9), GRADES.length - 1);
  const info = gradeInfo(GRADES[1].min + 100);
  assert.equal(info.grade.id, GRADES[1].id);
  assert.equal(info.next.id, GRADES[2].id);
  assert.equal(info.toNext, GRADES[2].min - GRADES[1].min - 100);
  assert.ok(info.ratio > 0 && info.ratio < 1);
  const top = gradeInfo(GRADES.at(-1).min + 5);
  assert.equal(top.next, null);
  assert.equal(top.ratio, 1);
});

test('albums : un par île + défi, 16 à 24 gommettes, quelques rares, identifiants uniques', () => {
  assert.deepEqual(STICKER_BOOKS.filter((b) => b.island).map((b) => b.island), ISLANDS.map((i) => i.id));
  const ids = STICKER_BOOKS.flatMap((b) => b.stickers.map((st) => st.id));
  const emojis = STICKER_BOOKS.flatMap((b) => b.stickers.map((st) => st.emoji));
  assert.equal(new Set(ids).size, ids.length, 'identifiants uniques');
  assert.equal(new Set(emojis).size, emojis.length, 'émojis uniques');
  for (const book of STICKER_BOOKS) {
    assert.ok(book.stickers.length >= 16 && book.stickers.length <= 24, book.id);
    const rares = book.stickers.filter((st) => st.rare).length;
    if (!book.special) assert.ok(rares >= 2 && rares <= 4, `${book.id} : ${rares} rares`);
    for (const st of book.stickers) assert.ok(st.name.trim() && st.emoji, st.id);
  }
  assert.equal(findSticker('mots-chouette').book, 'mots');
  assert.equal(findSticker('inconnue'), null);
});

test('nombre de gommettes : aucune sans étoile, 1 si réussie, 2 avec 3 étoiles', () => {
  assert.deepEqual([0, 1, 2, 3].map(stickerCount), [0, 1, 1, 2]);
});

test('tirage des gommettes : jamais de doublon jusqu\'à l\'album complet', () => {
  const book = getBook('mots');
  const rng = createRng(42);
  const owned = new Set();
  let draws = 0;
  while (owned.size < book.stickers.length) {
    const got = pickStickers(book, owned, 2, rng);
    assert.ok(got.length >= 1);
    for (const st of got) {
      assert.ok(!owned.has(st.id), `doublon ${st.id}`);
      owned.add(st.id);
    }
    draws++;
  }
  assert.ok(draws <= Math.ceil(book.stickers.length / 2));
  assert.deepEqual(pickStickers(book, owned, 2, rng), []);   // complet : plus rien
});

test('les gommettes rares sortent moins souvent', () => {
  const book = getBook('nombres');
  const rng = createRng(7);
  let rare = 0;
  const n = 4000;
  for (let i = 0; i < n; i++) if (pickStickers(book, new Set(), 1, rng)[0].rare) rare++;
  const share = book.stickers.filter((st) => st.rare).length / book.stickers.length;
  assert.ok(rare / n < share * 0.6, `${rare / n} vs ${share}`);
  assert.ok(rare > 0);
});

test('applyGame : points, gommettes de l\'île, grade', () => {
  const start = { ...defaultRewards(), points: GRADES[1].min - 20 };
  const { rewards, gained } = applyGame(start, {
    answers: [T, T, T, F, T, T, T, T, T, T], stars: 3, island: 'nombres', rng: createRng(1), t: 99,
  });
  assert.equal(gained.base, 90);
  assert.equal(gained.streak, 5 + 4 * 5);   // 3e réponse, puis 7e à 10e (série relancée à la 5e)
  assert.equal(gained.stars, POINTS.stars[3]);
  assert.equal(gained.points, gained.base + gained.streak + gained.stars);
  assert.equal(rewards.points, start.points + gained.points);
  assert.equal(gained.stickers.length, 2);
  assert.ok(gained.stickers.every((st) => st.book === 'nombres'));
  assert.deepEqual(rewards.unseen, gained.stickers.map((st) => st.id));
  assert.deepEqual(rewards.stickers.map((x) => x.t), [99, 99]);
  assert.equal(gained.promoted, true);
  assert.equal(gained.grade.grade.id, GRADES[1].id);
  assert.deepEqual(start.stickers, [], 'l\'objet de départ n\'est pas modifié');
});

test('applyGame : partie ratée → des points mais pas de gommette', () => {
  const { rewards, gained } = applyGame(defaultRewards(), {
    answers: [T, F, F, T, F, F, F, T, F, F], stars: 0, island: 'mots', rng: createRng(1),
  });
  assert.equal(gained.points, 30);
  assert.deepEqual(gained.stickers, []);
  assert.deepEqual(rewards.stickers, []);
  assert.equal(gained.promoted, false);
});

test('applyGame : album complet → aucune gommette, et on le dit', () => {
  const all = getBook('monde').stickers.map((st) => ({ id: st.id, t: 1 }));
  const { gained } = applyGame({ ...defaultRewards(), stickers: all }, {
    answers: Array(10).fill(T), stars: 3, island: 'monde', rng: createRng(1),
  });
  assert.deepEqual(gained.stickers, []);
  assert.equal(gained.bookWasComplete, true);
  assert.ok(extrasFor(gained).some((x) => x.kind === 'book'));
});

test('applyGame : dernière gommette d\'un album → album complet', () => {
  const book = getBook('mesures');
  const all = book.stickers.slice(1).map((st) => ({ id: st.id, t: 1 }));
  const { gained } = applyGame({ ...defaultRewards(), stickers: all }, {
    answers: Array(10).fill(T), stars: 3, island: 'mesures', rng: createRng(1),
  });
  assert.deepEqual(gained.stickers.map((st) => st.id), [book.stickers[0].id]);
  assert.equal(gained.bookComplete, true);
});

test('défi du jour : bonus et gommette spéciale une seule fois par jour', () => {
  const first = applyGame(defaultRewards(), { answers: [T, T, T, T, T], stars: 3, daily: '2026-10-06', rng: createRng(3) });
  assert.equal(first.gained.dailyReward, true);
  assert.equal(first.gained.daily, POINTS.daily);
  assert.equal(first.gained.stickers.length, 1);
  assert.equal(first.gained.stickers[0].book, 'defi');
  assert.deepEqual(first.rewards.daily, { last: '2026-10-06', count: 1 });

  const again = applyGame(first.rewards, { answers: [T, T, T, T, T], stars: 3, daily: '2026-10-06', rng: createRng(3) });
  assert.equal(again.gained.dailyReward, false);
  assert.equal(again.gained.daily, 0);
  assert.deepEqual(again.gained.stickers, []);
  assert.ok(again.gained.points > 0, 'les bonnes réponses rapportent toujours des points');

  const tomorrow = applyGame(again.rewards, { answers: [F, F, F, F, F], stars: 0, daily: '2026-10-07', rng: createRng(3) });
  assert.equal(tomorrow.gained.dailyReward, true);
  assert.equal(tomorrow.rewards.daily.count, 2);
});

test('extras : points, gommettes, grade', () => {
  const { gained } = applyGame(defaultRewards(), { answers: Array(10).fill(T), stars: 3, island: 'mots', rng: createRng(5) });
  const extras = extrasFor(gained);
  assert.equal(extras[0].kind, 'points');
  assert.equal(extras[0].text, `+${gained.points} points`);
  assert.equal(extras.filter((x) => x.kind === 'sticker').length, 2);
  assert.ok(extras.every((x) => typeof x.text === 'string' && x.text));
  assert.equal(extras.at(-1).kind, 'grade');
});

test('avancement des albums et gommettes vues', () => {
  const r = { ...defaultRewards(), stickers: [{ id: 'mots-loup', t: 1 }, { id: 'defi-panda', t: 2 }], unseen: ['mots-loup', 'defi-panda'] };
  assert.deepEqual(bookProgress(r, 'mots'), { owned: 1, total: getBook('mots').stickers.length, complete: false });
  const total = totalProgress(r);
  assert.equal(total.owned, 2);
  assert.equal(total.total, STICKER_BOOKS.reduce((n, b) => n + b.stickers.length, 0));
  assert.deepEqual(markSeen(r, ['mots-loup']).unseen, ['defi-panda']);
  assert.deepEqual(markSeen(r).unseen, []);
});

test('getRewards complète un profil ancien ou incomplet', () => {
  assert.deepEqual(getRewards({}), defaultRewards());
  assert.deepEqual(getRewards({ rewards: { points: 12 } }).points, 12);
  assert.deepEqual(getRewards({ rewards: { daily: { last: 'x' } } }).daily, { last: 'x', count: 0 });
});

test('migration v1 → v2 : un profil existant reçoit des récompenses vides', () => {
  assert.equal(SCHEMA_VERSION, 2);
  const backend = createMemoryBackend({
    [`${PREFIX}meta`]: JSON.stringify({ schemaVersion: 1, profiles: [{ id: 'p1' }], activeProfileId: 'p1', settings: { muted: true, theme: 'dark' } }),
    [`${PREFIX}profile:p1`]: JSON.stringify({ schemaVersion: 1, id: 'p1', name: 'Léa', progress: { x: { plays: 2 } }, history: [], weekly: [] }),
  });
  const store = createStore(createStorage({ backend }));
  assert.equal(store.getMeta().settings.theme, 'dark');
  const profile = store.getProfile('p1');
  assert.equal(profile.schemaVersion, 2);
  assert.equal(profile.name, 'Léa');
  assert.deepEqual(profile.progress, { x: { plays: 2 } });
  assert.deepEqual(profile.rewards, defaultRewards());
});

/** Jeu factice : n + 1. */
const fakeGame = {
  id: 'faux',
  island: 'nombres',
  levels: [{ label: 'N1' }, { label: 'N2' }, { label: 'N3' }],
  makeQuestion(level, rng) {
    const n = rng.int(0, 49);
    return { key: `faux:${n}`, type: 'keypad', prompt: `${n} + 1`, answer: n + 1 };
  },
};

test('installRewards : une partie jouée enregistre les récompenses et remplit les extras', () => {
  const store = createStore(createStorage({ backend: createMemoryBackend() }));
  const id = ensureActiveProfile(store);
  const events = createEmitter();
  const off = installRewards({ store, getProfileId: () => id, events, rng: () => createRng(9), now: () => 1234 });
  const session = createSession(fakeGame, 1, { seed: 1, events });
  while (!session.done) {
    session.answer(session.current.answer);
    session.next();
  }
  const rewards = store.getProfile(id).rewards;
  assert.equal(rewards.points, 100 + 8 * 5 + POINTS.stars[3]);
  assert.equal(rewards.stickers.length, 2);
  assert.ok(rewards.stickers.every((x) => x.t === 1234 && findSticker(x.id).book === 'nombres'));
  assert.equal(session.result.extras[0].text, `+${rewards.points} points`);
  off();
  // Débranché : une nouvelle partie ne change plus rien.
  const other = createSession(fakeGame, 1, { seed: 2, events });
  while (!other.done) { other.answer(other.current.answer); other.next(); }
  assert.equal(store.getProfile(id).rewards.points, rewards.points);
});
