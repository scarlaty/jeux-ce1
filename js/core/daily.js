// Défi du jour : 5 questions mélangées, tirées des jeux déjà joués (ou de tous les jeux au début).
// La graine est la date du jour : le même défi toute la journée, un nouveau le lendemain.
// Fonctions pures ; l'écran js/screens/daily.js charge les jeux et lance la partie.
import { createRng } from './random.js';
import { getGameProgress } from './history.js';

export const DAILY_COUNT = 5;

/** Date locale au format 'AAAA-MM-JJ' (le défi change à minuit, heure de l'appareil). */
export function dateKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Graine 32 bits stable à partir d'un texte (FNV-1a). */
export function seedFromString(text) {
  let hash = 0x811c9dc5;
  for (const ch of String(text)) {
    hash ^= ch.codePointAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Jeux candidats (entrées du registre) : ceux déjà joués ; sinon tous les vrais jeux ;
 * sinon (aucun vrai jeu encore) le jeu de démonstration.
 */
export function dailyCandidates(games, profile) {
  const real = games.filter((g) => !g.demo);
  const played = real.filter((g) => getGameProgress(profile, g.id).plays > 0);
  if (played.length) return played;
  return real.length ? real : games;
}

/**
 * Identifiants des jeux des `count` questions du jour, dans l'ordre. Ne dépend que de la date
 * et de la liste des jeux : chaque jeu sert au moins une fois s'il y en a assez peu.
 */
export function planDaily(key, gameIds, count = DAILY_COUNT) {
  if (!gameIds.length) return [];
  const rng = createRng(seedFromString(`defi:${key}`));
  const ids = [...gameIds].sort();
  const plan = ids.length >= count
    ? rng.sample(ids, count)
    : [...ids, ...Array.from({ length: count - ids.length }, () => rng.pick(ids))];
  return rng.shuffle(plan);
}

/**
 * Questions du défi. `entries` : [{ game, level }] dans l'ordre du plan.
 * Chaque question garde la couleur de son île et reçoit une clé unique dans le défi.
 */
export function buildDailyQuestions(key, entries) {
  const rng = createRng(seedFromString(`defi:${key}:questions`));
  const seen = new Set();
  return entries.map(({ game, level }, i) => {
    let q = null;
    for (let tries = 0; tries < 60; tries++) {
      q = game.makeQuestion(level, rng, seen);
      if (!seen.has(q.key)) break;
    }
    seen.add(q.key);
    return { ...q, key: `defi:${i}:${q.key}`, island: game.island, from: game.id };
  });
}

/** « Jeu » du défi, jouable par le moteur comme les autres (questions déjà tirées). */
export function createDailyGame(key, questions) {
  return {
    id: 'defi',
    title: 'Défi du jour',
    island: null,
    daily: key,
    levels: [{ label: 'Défi du jour' }],
    makeQuestion: (level, rng, seen) => questions[seen.size % questions.length],
  };
}

/** Niveau proposé pour un jeu : le plus haut niveau ouvert. */
export function dailyLevel(game, profile) {
  return Math.max(1, Math.min(getGameProgress(profile, game.id).unlocked, game.levels.length));
}
