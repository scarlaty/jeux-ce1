// Branchement des récompenses sur le moteur (core/rewards-live.js) : on joue de vraies parties
// avec un bus d'événements à part, et on vérifie ce qui finit dans le profil.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createEmitter, createSession } from '../js/core/engine.js';
import { createMemoryBackend, createStorage, createStore, defaultProfile } from '../js/core/storage.js';
import {
  installRewards, rewardEvents, rewardSummary, liveTotal, resetRewardsForTests,
} from '../js/core/rewards-live.js';
import {
  COMPLETION_POINTS, DAILY_BONUS_POINTS, POINTS_PER_CORRECT, STICKERS, readRewards, runPoints,
} from '../js/core/rewards.js';

/** Jeu minimal : la bonne réponse est toujours `attendu`, ce qui rend les parties scriptables. */
function fakeGame(extra = {}) {
  return {
    id: 'faux',
    title: 'Faux jeu',
    island: 'mots',
    levels: [{ label: 'Niveau 1' }],
    makeQuestion(level, rng, seen) {
      const n = seen.size;
      return { key: `faux:${n}`, type: 'choice', prompt: 'Réponds.', answer: 'oui', display: {} };
    },
    ...extra,
  };
}

function setup() {
  const store = createStore(createStorage({ backend: createMemoryBackend() }));
  store.setProfile(defaultProfile({ id: 'p1' }));
  const events = createEmitter();
  resetRewardsForTests();
  installRewards({ store, profileId: 'p1' }, { events });
  return { store, events };
}

/** Joue une partie complète ; `outcomes` : true = bonne réponse. */
function play(game, events, outcomes, options = {}) {
  const session = createSession(game, 1, { events, count: outcomes.length, record: null, ...options });
  for (const ok of outcomes) {
    session.answer(ok ? 'oui' : 'non');
    session.next();
  }
  return session;
}

beforeEach(() => resetRewardsForTests());

test('les points d\'une partie sont écrits dans le profil', () => {
  const { store, events } = setup();
  const session = play(fakeGame(), events, [true, true, true, false, true]);
  const rewards = readRewards(store.getProfile('p1'));
  assert.equal(rewards.points, runPoints([true, true, true, false, true]));
  assert.equal(rewardSummary(session).points, rewards.points);
  // La progression existante n'est pas touchée.
  assert.deepEqual(store.getProfile('p1').history, []);
});

test('le compteur monte en direct, et annonce les bonus de série', () => {
  const { events } = setup();
  const game = fakeGame();
  const seen = [];
  const off = rewardEvents.on('points', (p) => seen.push(p));
  const session = play(game, events, [true, true, true]);
  off();
  // Un événement au démarrage (total initial) puis un par réponse.
  assert.equal(seen.length, 4);
  assert.deepEqual(seen.map((p) => p.total), [0, 10, 20, 35]);
  assert.equal(seen[3].bonus, 5, 'bonus au 3e d\'affilée');
  assert.ok(seen[3].label.includes('3'));
  assert.equal(seen[1].label, '');
  assert.ok(seen.every((p) => p.session === session));
});

test('liveTotal additionne les points déjà acquis et ceux de la partie en cours', () => {
  const { store, events } = setup();
  const game = fakeGame();
  play(game, events, [true, true]);                       // 25 points (2 × 10 + 5 de fin)
  const before = readRewards(store.getProfile('p1')).points;
  assert.equal(liveTotal(null), before);
  const session = createSession(game, 1, { events, count: 3, record: null });
  assert.equal(liveTotal(session), before);
  session.answer('oui');
  assert.equal(liveTotal(session), before + POINTS_PER_CORRECT);
});

test('une partie réussie remplit l\'album de son île ; une partie ratée rapporte quand même', () => {
  const { store, events } = setup();
  const game = fakeGame();
  play(game, events, [true, true, true, true]);           // 4 / 4 → 3 étoiles → 2 gommettes
  let rewards = readRewards(store.getProfile('p1'));
  assert.deepEqual(rewards.stickers.mots, STICKERS.mots.slice(0, 2).map((s) => s.id));

  const points = rewards.points;
  play(game, events, [false, false, false, false]);       // 0 / 4 → aucune étoile
  rewards = readRewards(store.getProfile('p1'));
  assert.equal(rewards.stickers.mots.length, 2, 'pas de gommette sans étoile');
  assert.equal(rewards.points, points + COMPLETION_POINTS, 'mais jamais zéro point');
});

test('le défi du jour vise son île et ne donne son bonus qu\'une fois', () => {
  const { store, events } = setup();
  const game = fakeGame({ id: 'defi', island: 'defi', rewardIsland: 'monde', daily: { key: '2026-10-06' } });
  play(game, events, [true, true]);
  let rewards = readRewards(store.getProfile('p1'));
  assert.deepEqual(rewards.stickers.monde, STICKERS.monde.slice(0, 2).map((s) => s.id));
  assert.deepEqual(rewards.stickers.mots, []);
  assert.equal(rewards.points, runPoints([true, true]) + DAILY_BONUS_POINTS);
  assert.equal(rewards.daily.key, '2026-10-06');

  const points = rewards.points;
  play(game, events, [true, true]);
  rewards = readRewards(store.getProfile('p1'));
  assert.equal(rewards.points, points + runPoints([true, true]), 'plus de bonus le même jour');
  assert.equal(rewards.stickers.monde.length, 2, 'pas de gommette supplémentaire le même jour');
});

test('le passage de grade est signalé une seule fois', () => {
  const { store, events } = setup();
  store.updateProfile('p1', (p) => ({ ...p, rewards: { points: 245, stickers: {}, daily: null } }));
  const game = fakeGame();
  const session = play(game, events, [true]);
  assert.equal(rewardSummary(session).grade.id, 'crayon-couleur');
  const next = play(game, events, [true]);
  assert.equal(rewardSummary(next).grade, null);
});

test('les lignes de fin de partie restent positives et lisibles', () => {
  const { events } = setup();
  const session = play(fakeGame(), events, [true, true, true]);
  const texts = session.result.extras.map((x) => x.text);
  assert.ok(texts.some((t) => /^\+ \d+ points$/.test(t)), texts.join(' | '));
  assert.ok(texts.some((t) => t.startsWith('Nouvelle gommette :')));
  assert.ok(texts.every((t) => !/0 point\b/.test(t)));
  assert.equal(session.result.extras.find((x) => x.icon)?.icon, STICKERS.mots[0].emoji);
});

test('un stockage indisponible ne casse pas la partie', () => {
  const store = createStore(createStorage({ backend: null }));
  const events = createEmitter();
  resetRewardsForTests();
  installRewards({ store, profileId: 'p1' }, { events });
  const session = play(fakeGame(), events, [true, false, true]);
  assert.equal(session.result.score, 2);
  assert.ok(session.result.extras.length > 0);
});
