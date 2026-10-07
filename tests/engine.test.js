import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  starsFor, sameAnswer, createSession, createEmitter, buildQuestions, renderFingerprint, QUESTIONS_PER_GAME,
} from '../js/core/engine.js';
import { createMemoryBackend, createStorage, createStore } from '../js/core/storage.js';
import { recordResult, getGameProgress } from '../js/core/history.js';
import { ensureActiveProfile } from '../js/core/profile.js';

/** Jeu factice : « combien font n + 1 ? » avec n de 0 à 49. */
const fakeGame = {
  id: 'faux',
  levels: [{ label: 'N1' }, { label: 'N2' }, { label: 'N3' }],
  makeQuestion(level, rng) {
    const n = rng.int(0, 49);
    return { key: `faux:${level}:${n}`, type: 'keypad', prompt: `${n} + 1`, answer: n + 1, skill: `+1 (${level})` };
  },
};

/** Joue une partie complète en répondant juste `good` fois. */
function play(session, good) {
  let i = 0;
  while (!session.done) {
    const q = session.current;
    session.answer(i < good ? q.answer : -1);
    session.next();
    i++;
  }
  return session.result;
}

const clock = (...times) => { let i = 0; return () => times[Math.min(i++, times.length - 1)]; };

test('étoiles : 3 si ≥ 9/10, 2 si ≥ 7, 1 si ≥ 5, sinon 0', () => {
  const expected = [0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3];
  expected.forEach((stars, score) => assert.equal(starsFor(score, 10), stars, `${score}/10`));
  assert.equal(starsFor(0, 0), 0);
});

test('comparaison des réponses', () => {
  assert.ok(sameAnswer(12, '12'));
  assert.ok(sameAnswer(12, ' 12 '));
  assert.ok(!sameAnswer(12, ''));
  assert.ok(!sameAnswer(0, null));
  assert.ok(sameAnswer('l\'arbre', 'l’arbre'));
  assert.ok(sameAnswer('été', 'été'));   // é décomposé
  assert.ok(!sameAnswer('été', 'ete'));                // les accents comptent
  assert.ok(sameAnswer([1, 2, 3], [1, 2, 3]));
  assert.ok(!sameAnswer([1, 2, 3], [1, 3, 2]));
  assert.ok(sameAnswer({ a: 'x', b: 'y' }, { b: 'y', a: 'x' }));
  assert.ok(!sameAnswer({ a: 'x', b: 'y' }, { a: 'x' }));
  assert.ok(!sameAnswer({ a: 'x' }, { a: 'x', b: 'y' }));
});

test('renderFingerprint : ce que l\'enfant voit, rien de plus', () => {
  const base = { prompt: 'Touche la couleur.', display: { choices: [{ value: 'a', art: { kind: 'colored', shape: 'swatch', color: 'blue' } }] } };
  // `speak` et `lang` ne se voient pas : deux questions qui ne diffèrent que par eux sont le même rendu.
  assert.equal(
    renderFingerprint({ ...base, speak: 'blue', lang: 'en-GB' }),
    renderFingerprint({ ...base, speak: 'yellow', lang: 'en-GB' }),
  );
  // Un texte, un émoji ou un dessin différent change bien le rendu.
  assert.notEqual(
    renderFingerprint({ prompt: 'A', display: {} }),
    renderFingerprint({ prompt: 'B', display: {} }),
  );
  assert.notEqual(
    renderFingerprint({ prompt: 'A', display: { show: { text: 'chat' } } }),
    renderFingerprint({ prompt: 'A', display: { show: { text: 'chien' } } }),
  );
  assert.notEqual(
    renderFingerprint({ prompt: 'A', display: { choices: [{ value: 1, art: { kind: 'colored', shape: 'swatch', color: 'blue' } }] } }),
    renderFingerprint({ prompt: 'A', display: { choices: [{ value: 1, art: { kind: 'colored', shape: 'swatch', color: 'red' } }] } }),
  );
  // L'ordre des choix fait partie du rendu : un mélange différent n'est pas « le même écran ».
  assert.notEqual(
    renderFingerprint({ prompt: 'A', display: { choices: [1, 2] } }),
    renderFingerprint({ prompt: 'A', display: { choices: [2, 1] } }),
  );
  // Une question sans `display` (jeu factice des tests) ne plante pas.
  assert.equal(renderFingerprint({ prompt: 'A' }), renderFingerprint({ prompt: 'A', display: {} }));
});

test('buildQuestions évite les doublons de rendu quand une autre question est possible', () => {
  // Reproduit l'issue #92 : deux clés différentes peuvent produire le même écran. Le générateur
  // rejoue le même rendu (« A ») une seconde fois avant de proposer un rendu différent (« B ») :
  // le garde-fou doit sauter ce doublon et garder « B », pas le reproposer tel quel.
  const sequence = ['A', 'A', 'B'];
  let i = 0;
  const sameRenderTwice = {
    id: 'sequence',
    levels: [{ label: 'N1' }],
    makeQuestion() {
      const render = sequence[Math.min(i, sequence.length - 1)];
      i += 1;
      return { key: `sequence:${i}`, type: 'keypad', prompt: `Rendu ${render}`, answer: 1 };
    },
  };
  const questions = buildQuestions(sameRenderTwice, 1, {}, 2);
  assert.deepEqual(questions.map((q) => q.prompt), ['Rendu A', 'Rendu B']);
});

test('buildQuestions avertit (sans planter) quand il doit accepter un rendu déjà vu', () => {
  // Un seul rendu possible, quel que soit le nombre d'essais : les questions 2 à 4 sont forcément
  // des doublons d'écran (même si leur clé diffère) ; le moteur les accepte mais prévient.
  let i = 0;
  const poorRender = {
    id: 'pauvre-rendu',
    levels: [{ label: 'N1' }],
    makeQuestion() {
      i += 1;
      return { key: `pauvre-rendu:${i}`, type: 'keypad', prompt: 'Toujours pareil', answer: 1 };
    },
  };
  const calls = [];
  const origWarn = console.warn;
  console.warn = (...args) => calls.push(args.join(' '));
  const questions = buildQuestions(poorRender, 1, {}, 4);
  console.warn = origWarn;
  assert.equal(questions.length, 4);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((c) => c.includes('pauvre-rendu')));
});

test('une partie compte 10 questions sans doublon', () => {
  const s = createSession(fakeGame, 1, { seed: 5 });
  assert.equal(s.total, QUESTIONS_PER_GAME);
  assert.equal(new Set(s.questions.map((q) => q.key)).size, QUESTIONS_PER_GAME);
});

test('même graine, mêmes questions', () => {
  const a = createSession(fakeGame, 2, { seed: 77 }).questions.map((q) => q.key);
  const b = createSession(fakeGame, 2, { seed: 77 }).questions.map((q) => q.key);
  assert.deepEqual(a, b);
});

test('un générateur trop pauvre ne bloque pas le moteur', () => {
  const tiny = { ...fakeGame, makeQuestion: () => ({ key: 'seule', type: 'keypad', prompt: '1', answer: 1 }) };
  // Une seule question possible : chaque répétition déclenche l'avis de doublon, attendu ici.
  const origWarn = console.warn;
  console.warn = () => {};
  const questions = buildQuestions(tiny, 1, { next: Math.random }, 10);
  console.warn = origWarn;
  assert.equal(questions.length, 10);
});

test('score, série, questions ratées et étoiles', () => {
  const s = createSession(fakeGame, 1, { seed: 1, now: clock(1000, 61000) });
  const r = play(s, 7);
  assert.equal(r.score, 7);
  assert.equal(r.total, 10);
  assert.equal(r.stars, 2);
  assert.equal(r.unlocksNext, false);
  assert.equal(r.durationMs, 60000);
  assert.equal(r.missed.length, 3);
  assert.equal(r.bestStreak, 7);
  assert.equal(r.game, 'faux');
});

test('on ne répond qu\'une fois et on ne saute pas une question', () => {
  const s = createSession(fakeGame, 1, { seed: 1 });
  assert.throws(() => s.next());
  const fb = s.answer(-1);
  assert.equal(fb.correct, false);
  assert.equal(fb.answer, s.current.answer);
  assert.throws(() => s.answer(s.current.answer));
});

test('3 étoiles débloquent le niveau suivant, sauf au dernier niveau', () => {
  assert.equal(play(createSession(fakeGame, 1, { seed: 2 }), 9).unlocksNext, true);
  assert.equal(play(createSession(fakeGame, 2, { seed: 2 }), 10).unlocksNext, true);
  assert.equal(play(createSession(fakeGame, 3, { seed: 2 }), 10).unlocksNext, false);
  assert.equal(play(createSession(fakeGame, 1, { seed: 2 }), 8).unlocksNext, false);
});

test('événements : start, answer, end — les extras ajoutés remontent dans le résultat', () => {
  const events = createEmitter();
  const log = [];
  events.on('start', () => log.push('start'));
  events.on('answer', ({ correct, streak }) => log.push(`${correct}:${streak}`));
  events.on('end', ({ result, extras }) => { log.push(`end:${result.score}`); extras.push({ text: '+10 points' }); });
  events.on('end', () => { throw new Error('module en panne'); });   // ne doit rien casser
  const origError = console.error;
  console.error = () => {};
  const r = play(createSession(fakeGame, 1, { seed: 3, events }), 2);
  console.error = origError;
  assert.deepEqual(log.slice(0, 4), ['start', 'true:1', 'true:2', 'false:0']);
  assert.equal(log.at(-1), 'end:2');
  assert.deepEqual(r.extras, [{ text: '+10 points' }]);
});

test('fin de partie : historique et progression enregistrés, niveau débloqué', () => {
  const backend = createMemoryBackend();
  const store = createStore(createStorage({ backend }));
  const pid = ensureActiveProfile(store);
  const record = (result) => recordResult(store, pid, result);

  const r1 = play(createSession(fakeGame, 1, { seed: 4, record, events: createEmitter() }), 6);
  assert.equal(r1.progress.newlyUnlocked, null);
  assert.equal(r1.progress.newBest, true);
  const r2 = play(createSession(fakeGame, 1, { seed: 4, record, events: createEmitter() }), 10);
  assert.equal(r2.progress.newlyUnlocked, 2);
  const r3 = play(createSession(fakeGame, 1, { seed: 4, record, events: createEmitter() }), 3);
  assert.equal(r3.progress.newBest, false);

  // Relu depuis un nouveau store : la progression survit à la fermeture du navigateur.
  const profile = createStore(createStorage({ backend })).getProfile(pid);
  const progress = getGameProgress(profile, 'faux');
  assert.equal(progress.unlocked, 2);
  assert.equal(progress.plays, 3);
  assert.deepEqual(progress.best[1], { score: 10, total: 10, stars: 3 });
  assert.equal(profile.history.length, 3);
  assert.deepEqual(Object.keys(profile.history[0]).sort(),
    ['durationMs', 'game', 'level', 'missed', 'score', 't', 'total']);
});

test('un enregistrement qui échoue n\'empêche pas la fin de partie', () => {
  const origError = console.error;
  console.error = () => {};
  const r = play(createSession(fakeGame, 1, { seed: 4, events: createEmitter(), record: () => { throw new Error('x'); } }), 5);
  console.error = origError;
  assert.equal(r.stars, 1);
  assert.equal(r.progress, null);
});
