// Moteur de partie : 10 questions, vérification, score, étoiles, déblocage du niveau suivant.
// Aucun DOM ici : l'écran de jeu pilote une « session » et réagit à ses retours.
//
// Les modules extérieurs (récompenses, défi du jour…) se branchent sur `gameEvents` sans
// modifier le moteur :
//   gameEvents.on('start',  ({ session }) => …)
//   gameEvents.on('answer', ({ session, question, given, correct, streak, index }) => …)
//   gameEvents.on('end',    ({ session, result, extras }) => extras.push({ icon: '⭐', text: '+30 points' }))
// Les `extras` ajoutés pendant 'end' sont affichés sur l'écran de fin de partie.
import { createRng } from './random.js';

export const QUESTIONS_PER_GAME = 10;
const MAX_TRIES = 60;   // essais pour obtenir une question pas encore posée

/** 3 étoiles si ≥ 90 %, 2 si ≥ 70 %, 1 si ≥ 50 % (soit 9, 7 et 5 sur 10). */
export function starsFor(score, total) {
  if (total <= 0) return 0;
  if (score * 10 >= total * 9) return 3;
  if (score * 10 >= total * 7) return 2;
  if (score * 10 >= total * 5) return 1;
  return 0;
}

/** Texte comparable : forme Unicode unique, espaces et apostrophes uniformisés. */
function normalizeText(s) {
  return String(s).normalize('NFC').replace(/[’ʼ]/g, "'").replace(/\s+/g, ' ').trim();
}

/** Compare une réponse donnée à la réponse attendue (nombres, textes, listes, associations). */
export function sameAnswer(expected, given) {
  if (typeof expected === 'number') {
    if (given === null || given === undefined || String(given).trim() === '') return false;
    return Number(String(given).trim().replace(',', '.')) === expected;
  }
  if (typeof expected === 'string') {
    return given !== null && given !== undefined && normalizeText(expected) === normalizeText(given);
  }
  if (Array.isArray(expected)) {
    return Array.isArray(given) && given.length === expected.length
      && expected.every((v, i) => sameAnswer(v, given[i]));
  }
  if (expected && typeof expected === 'object') {
    if (!given || typeof given !== 'object') return false;
    const keys = Object.keys(expected);
    return keys.length === Object.keys(given).length && keys.every((k) => sameAnswer(expected[k], given[k]));
  }
  return expected === given;
}

export function checkAnswer(question, given) {
  return sameAnswer(question.answer, given);
}

/** Petit bus d'événements. Un auditeur qui plante ne doit jamais casser la partie. */
export function createEmitter() {
  const listeners = new Map();
  return {
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
      return () => listeners.get(type).delete(fn);
    },
    emit(type, payload) {
      for (const fn of listeners.get(type) || []) {
        try { fn(payload); } catch (err) { console.error(`[gameEvents:${type}]`, err); }
      }
    },
  };
}

/** Bus partagé par toute l'appli (récompenses, statistiques…). */
export const gameEvents = createEmitter();

/** Tire `count` questions en évitant les doublons (clé `key`) autant que possible. */
export function buildQuestions(game, level, rng, count = QUESTIONS_PER_GAME) {
  const seen = new Set();
  const questions = [];
  while (questions.length < count) {
    let q = null;
    for (let i = 0; i < MAX_TRIES; i++) {
      q = game.makeQuestion(level, rng, seen);
      if (!seen.has(q.key)) break;
    }
    seen.add(q.key);
    questions.push(q);
  }
  return questions;
}

/**
 * Démarre une partie.
 * options :
 *  - seed   : graine (par défaut aléatoire) — une même graine redonne les mêmes questions ;
 *  - count  : nombre de questions (10) ;
 *  - now    : horloge (injectable pour les tests) ;
 *  - record : (result) => infos de progression, appelé une fois à la fin (voir history.recordResult) ;
 *  - events : bus d'événements (gameEvents par défaut).
 */
export function createSession(game, level, options = {}) {
  const {
    seed, count = QUESTIONS_PER_GAME, now = Date.now, record = null, events = gameEvents,
  } = options;
  const rng = createRng(seed);
  const questions = buildQuestions(game, level, rng, count);
  const startedAt = now();
  const levelCount = game.levels.length;
  const missed = [];
  let index = 0;
  let answered = false;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let result = null;

  const session = {
    game,
    level,
    seed: rng.seed,
    questions,
    get index() { return index; },
    get total() { return questions.length; },
    get current() { return index < questions.length ? questions[index] : null; },
    get answered() { return answered; },
    get score() { return score; },
    get streak() { return streak; },
    get bestStreak() { return bestStreak; },
    get done() { return result !== null; },
    get result() { return result; },

    /** Une seule réponse par question. Renvoie le retour à afficher. */
    answer(given) {
      const question = session.current;
      if (!question) throw new Error('Partie terminée');
      if (answered) throw new Error('Question déjà répondue');
      answered = true;
      const correct = checkAnswer(question, given);
      if (correct) {
        score += 1;
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
      } else {
        streak = 0;
        missed.push(question.skill || question.key);
      }
      events.emit('answer', { session, question, given, correct, streak, index });
      return { correct, answer: question.answer, explain: question.explain || '' };
    },

    /** Passe à la question suivante ; renvoie null (et termine la partie) après la dernière. */
    next() {
      if (!answered) throw new Error('Répondre avant de passer à la suite');
      index += 1;
      answered = false;
      if (index < questions.length) {
        events.emit('question', { session, question: questions[index], index });
        return questions[index];
      }
      finish();
      return null;
    },
  };

  function finish() {
    const total = questions.length;
    const stars = starsFor(score, total);
    result = {
      t: startedAt,
      game: game.id,
      level,
      score,
      total,
      stars,
      durationMs: Math.max(0, now() - startedAt),
      missed: [...missed],
      bestStreak,
      unlocksNext: stars === 3 && level < levelCount,
      progress: null,
      extras: [],
    };
    if (record) {
      try { result.progress = record(result); } catch (err) { console.error('[engine] record', err); }
    }
    events.emit('end', { session, result, extras: result.extras });
  }

  events.emit('start', { session });
  events.emit('question', { session, question: questions[0], index: 0 });
  return session;
}
