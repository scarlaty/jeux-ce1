// Mode essai (#111) : un adulte joue sans rien changer à la progression de l'enfant.
// Aucun navigateur : on rejoue une vraie partie avec TOUS les abonnés installés comme dans js/app.js.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEmitter, createSession } from '../js/core/engine.js';
import { createMemoryBackend, createStorage, createStore, defaultProfile } from '../js/core/storage.js';
import { recordResult } from '../js/core/history.js';
import { installRewards, rewardSummary, resetRewardsForTests } from '../js/core/rewards-live.js';
import { installChest, chestSummary, resetChestForTests } from '../js/core/chest-live.js';
import { installCompanion, companionSummary, resetCompanionForTests } from '../js/core/companion-live.js';
import { islandUnlocked, dailyKey } from '../js/core/rewards.js';
import { createRng } from '../js/core/random.js';
import { isTrial, enterTrial, exitTrial, onTrialChange, openOrTrial } from '../js/core/trial.js';

/** Jeu minimal scriptable : la bonne réponse est toujours « oui ». */
function fakeGame(extra = {}) {
  return {
    id: 'faux',
    title: 'Faux jeu',
    island: 'mots',
    levels: [{ label: 'Niveau 1' }, { label: 'Niveau 2' }, { label: 'Niveau 3' }],
    makeQuestion(level, rng, seen) {
      return { key: `faux:${seen.size}`, type: 'choice', prompt: `Question ${seen.size}.`, answer: 'oui', display: {} };
    },
    ...extra,
  };
}

const clone = (x) => JSON.parse(JSON.stringify(x));

/** Un profil bien rempli : tout ce que la partie pourrait modifier existe déjà. */
function richProfile() {
  const p = defaultProfile({ id: 'p1', name: 'Léa', avatar: 'fox', createdAt: 1000 });
  return {
    ...p,
    progress: { faux: { unlocked: 2, best: { 1: { score: 8, total: 10, stars: 2 } }, plays: 3 } },
    history: [{ t: 5, game: 'faux', level: 1, score: 8, total: 10, durationMs: 4000, missed: ['x'] }],
    weekly: [{ week: 0, game: 'faux', level: 1, games: 2, score: 15, total: 20, durationMs: 9000 }],
    rewards: { ...p.rewards, points: 120, stickers: { mots: ['a'] }, daily: { key: '2020-01-01', stars: 3, points: 80 } },
    companion: { animal: 'cat', name: 'Minou', hatched: true, games: 5, stars: 4 },
  };
}

let store; let events;
function setup() {
  store = createStore(createStorage({ backend: createMemoryBackend() }));
  store.setProfile(richProfile());
  store.setMeta({
    schemaVersion: 3,
    profiles: [{ id: 'p1', name: 'Léa', avatar: 'fox' }],
    activeProfileId: 'p1',
    settings: { muted: false, theme: 'auto' },
  });
  events = createEmitter();
  resetRewardsForTests(); resetChestForTests(); resetCompanionForTests();
  const app = { store, profileId: 'p1' };
  installRewards(app, { events });
  installChest(app, { events, rng: () => createRng(7) });
  installCompanion(app, { events });
}

/** Joue une partie complète comme l'écran (record = app.record, c'est-à-dire recordResult). */
function playGame(game, level, outcomes) {
  const session = createSession(game, level, {
    events, count: outcomes.length, record: (result) => recordResult(store, 'p1', result),
  });
  for (const ok of outcomes) { session.answer(ok ? 'oui' : 'non'); session.next(); }
  return session;
}

beforeEach(setup);
afterEach(() => exitTrial());

test('une partie jouée en mode essai laisse profil ET méta strictement identiques', () => {
  const profileBefore = clone(store.getProfile('p1'));
  const metaBefore = clone(store.getMeta());
  const rawBefore = Object.fromEntries(store.storage.keys().map((k) => [k, store.storage.read(k)]));
  enterTrial();
  const games = [
    playGame(fakeGame(), 3, Array(10).fill(true)),                                  // 3 étoiles, niveau 3 verrouillé hors essai
    playGame(fakeGame(), 1, [true, true, true, false, false, true, true, true, true, true]),
    playGame(fakeGame({ id: 'defi', daily: { key: dailyKey() }, rewardIsland: 'nombres' }), 1, Array(10).fill(true)),
    playGame(fakeGame(), 2, Array(10).fill(false)),                                 // 0 étoile
  ];
  assert.deepEqual(store.getProfile('p1'), profileBefore);
  assert.deepEqual(store.getMeta(), metaBefore);
  assert.deepEqual(Object.fromEntries(store.storage.keys().map((k) => [k, store.storage.read(k)])), rawBefore);
  // Et rien n'est annoncé à l'écran de fin : ni points, ni coffre, ni compagnon, ni niveau débloqué.
  for (const s of games) {
    assert.equal(rewardSummary(s), null);
    assert.equal(chestSummary(s), null);
    assert.equal(companionSummary(s), null);
    assert.deepEqual(s.result.extras, []);
    assert.equal(s.result.progress?.newlyUnlocked ?? null, null);
  }
  assert.equal(games[0].result.stars, 3);   // le score et les étoiles de la partie existent bel et bien
});

test('contrôle : hors mode essai, la même partie modifie bien le profil', () => {
  const before = clone(store.getProfile('p1'));
  const s = playGame(fakeGame(), 2, Array(10).fill(true));
  const after = store.getProfile('p1');
  assert.notDeepEqual(after, before);
  assert.equal(after.history.length, before.history.length + 1);
  assert.ok(after.rewards.points > before.rewards.points);
  assert.ok(chestSummary(s));
});

test('le garde du magasin refuse seul toute écriture de profil (même sans les abonnés)', () => {
  const before = clone(store.getProfile('p1'));
  enterTrial();
  store.updateProfile('p1', (p) => ({ ...p, rewards: { ...p.rewards, points: 99999 } }));
  store.setProfile({ ...before, name: 'Autre' });
  store.removeProfile('p1');
  assert.deepEqual(store.getProfile('p1'), before);
  exitTrial();
  store.updateProfile('p1', (p) => ({ ...p, name: 'Hors essai' }));
  assert.equal(store.getProfile('p1').name, 'Hors essai');   // le garde se lève avec le mode
});

test('une migration à la lecture n\'écrit rien en mode essai', () => {
  const old = { ...clone(store.getProfile('p1')), schemaVersion: 1 };
  store.storage.write('profile:p1', old);
  enterTrial();
  store.getProfile('p1');
  assert.equal(store.storage.read('profile:p1').schemaVersion, 1);
});

test('les réglages de l\'appareil restent modifiables pendant l\'essai', () => {
  enterTrial();
  store.setSetting('theme', 'dark');
  assert.equal(store.getSettings().theme, 'dark');
});

test('toutes les îles et tous les niveaux sont ouverts en essai, refermés à la sortie', () => {
  const closedIslands = ['mesures', 'monde', 'ailleurs'].map((id) => islandUnlocked(id, 0));
  assert.deepEqual(closedIslands, [false, false, false]);
  const profileBefore = clone(store.getProfile('p1'));
  const levelOpen = (level, progress) => openOrTrial(level <= progress.unlocked);
  const progress = store.getProfile('p1').progress.faux;   // niveaux 1 et 2 ouverts, 3 fermé

  assert.equal(levelOpen(3, progress), false);
  assert.equal(openOrTrial(islandUnlocked('ailleurs', 0)), false);

  enterTrial();
  for (const id of ['mots', 'nombres', 'mesures', 'monde', 'ailleurs']) assert.equal(openOrTrial(islandUnlocked(id, 0)), true, id);
  for (const level of [1, 2, 3]) assert.equal(levelOpen(level, progress), true, `niveau ${level}`);
  assert.deepEqual(store.getProfile('p1'), profileBefore);   // l'ouverture ne passe jamais par le profil

  exitTrial();
  assert.equal(levelOpen(3, progress), false);
  assert.equal(openOrTrial(islandUnlocked('ailleurs', 0)), false);
  assert.equal(levelOpen(2, progress), true);
  assert.deepEqual(store.getProfile('p1'), profileBefore);
});

test('l\'événement de changement prévient une fois par vrai changement', () => {
  const seen = [];
  const off = onTrialChange((v) => seen.push(v));
  enterTrial(); enterTrial(); exitTrial(); exitTrial();
  off();
  enterTrial();
  assert.deepEqual(seen, [true, false]);
  assert.equal(isTrial(), true);
});

test('le mode n\'est jamais lu ni écrit dans un stockage persistant', () => {
  const calls = [];
  const spy = (name) => new Proxy({}, {
    get: (_t, prop) => (...args) => { calls.push(`${name}.${String(prop)}(${args.join(',')})`); return null; },
  });
  const saved = { l: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), s: Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage') };
  Object.defineProperty(globalThis, 'localStorage', { value: spy('localStorage'), configurable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: spy('sessionStorage'), configurable: true });
  try {
    enterTrial(); isTrial(); openOrTrial(false); exitTrial();
  } finally {
    for (const [name, d] of [['localStorage', saved.l], ['sessionStorage', saved.s]]) {
      if (d) Object.defineProperty(globalThis, name, d); else delete globalThis[name];
    }
  }
  assert.deepEqual(calls, []);
  const source = readFileSync(new URL('../js/core/trial.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie/);
});
