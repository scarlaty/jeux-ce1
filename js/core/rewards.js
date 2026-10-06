// Récompenses : points, séries, grades, gommettes. Logique pure (testée) + `installRewards`,
// qui branche le tout sur les événements du moteur (gameEvents) sans le modifier.
//
// Données dans le profil (schéma v2) :
//   profile.rewards = {
//     points,                         // total cumulé
//     stickers: [{ id, t }],          // gommettes gagnées, dans l'ordre
//     unseen: [id],                   // gagnées mais pas encore vues dans l'album (effet de collage)
//     daily: { last, count },         // dernier défi du jour récompensé ('AAAA-MM-JJ'), nombre total
//   }
import { gameEvents } from './engine.js';
import { createRng } from './random.js';
import { defaultRewards } from './storage.js';
import { STICKER_BOOKS, getBook, findSticker } from '../data/stickers.js';

export const POINTS = Object.freeze({
  correct: 10,              // par bonne réponse
  streakFrom: 3,            // la série compte à partir de 3 bonnes réponses d'affilée…
  streakBonus: 5,           // … et rapporte +5 par bonne réponse tant qu'elle dure
  stars: [0, 10, 25, 50],   // bonus de fin selon les étoiles
  daily: 50,                // défi du jour (une fois par jour)
});

/** Points d'une réponse ; `streak` = longueur de la série en comptant cette réponse. */
export function answerPoints(correct, streak) {
  if (!correct) return 0;
  return POINTS.correct + (streak >= POINTS.streakFrom ? POINTS.streakBonus : 0);
}

export function starBonus(stars) {
  return POINTS.stars[Math.max(0, Math.min(3, stars | 0))];
}

/** Points d'une suite de réponses (booléens) : { base, streak, total }. */
export function scoreAnswers(answers) {
  let run = 0;
  let base = 0;
  let streak = 0;
  for (const correct of answers) {
    run = correct ? run + 1 : 0;
    if (!correct) continue;
    base += POINTS.correct;
    streak += answerPoints(true, run) - POINTS.correct;
  }
  return { base, streak, total: base + streak };
}

// --- Grades ----------------------------------------------------------------------------------
// Une partie rapporte ~100 à 190 points. À raison de 2 ou 3 parties par jour :
// Crayon de couleur dès la 2e partie, Feutre en quelques jours, Stylo plume en 2 à 3 semaines,
// Cartable d'or vers la fin du premier trimestre, Diplôme au fil de l'année.
export const GRADES = [
  { id: 'crayon-bois', name: 'Crayon de bois', emoji: '✏️', min: 0 },
  { id: 'crayon-couleur', name: 'Crayon de couleur', emoji: '🖍️', min: 200 },
  { id: 'feutre', name: 'Feutre', emoji: '🖊️', min: 1500 },
  { id: 'stylo-plume', name: 'Stylo plume', emoji: '🖋️', min: 6000 },
  { id: 'cartable-or', name: 'Cartable d\'or', emoji: '🎒', min: 16000 },
  { id: 'diplome', name: 'Diplôme', emoji: '🎓', min: 32000 },
];

export function gradeIndex(points) {
  let index = 0;
  GRADES.forEach((g, i) => { if (points >= g.min) index = i; });
  return index;
}

/** Grade atteint et chemin vers le suivant (`ratio` de 0 à 1 ; `next` null au dernier grade). */
export function gradeInfo(points) {
  const index = gradeIndex(points);
  const grade = GRADES[index];
  const next = GRADES[index + 1] || null;
  return {
    index,
    grade,
    next,
    toNext: next ? next.min - points : 0,
    ratio: next ? (points - grade.min) / (next.min - grade.min) : 1,
  };
}

// --- Profil ----------------------------------------------------------------------------------

export { defaultRewards };

/** Récompenses d'un profil, complétées par les valeurs par défaut. */
export function getRewards(profile) {
  const r = profile?.rewards || {};
  const base = defaultRewards();
  return {
    points: Number.isFinite(r.points) ? r.points : 0,
    stickers: Array.isArray(r.stickers) ? r.stickers : base.stickers,
    unseen: Array.isArray(r.unseen) ? r.unseen : base.unseen,
    daily: { ...base.daily, ...(r.daily || {}) },
  };
}

// --- Gommettes -------------------------------------------------------------------------------

/** Nombre de gommettes gagnées selon les étoiles : 1 dès qu'une partie est réussie, 2 avec 3 étoiles. */
export function stickerCount(stars) {
  if (stars >= 3) return 2;
  return stars >= 1 ? 1 : 0;
}

export function ownedIds(rewards) {
  return new Set(rewards.stickers.map((x) => x.id));
}

/** Avancement d'un album : { owned, total, complete }. */
export function bookProgress(rewards, bookId) {
  const book = getBook(bookId);
  if (!book) return { owned: 0, total: 0, complete: false };
  const owned = ownedIds(rewards);
  const count = book.stickers.filter((st) => owned.has(st.id)).length;
  return { owned: count, total: book.stickers.length, complete: count === book.stickers.length };
}

/** Avancement de tous les albums réunis. */
export function totalProgress(rewards) {
  return STICKER_BOOKS.reduce((acc, b) => {
    const p = bookProgress(rewards, b.id);
    return { owned: acc.owned + p.owned, total: acc.total + p.total };
  }, { owned: 0, total: 0 });
}

const RARE_WEIGHT = 1;
const COMMON_WEIGHT = 4;

/**
 * Tire `count` gommettes de l'album, jamais une déjà possédée ni deux fois la même :
 * moins s'il n'en reste pas assez (album complet = rien). Les rares sortent 4 fois moins souvent.
 */
export function pickStickers(book, owned, count, rng) {
  const pool = book.stickers.filter((st) => !owned.has(st.id));
  const out = [];
  while (out.length < count && pool.length) {
    const weights = pool.map((st) => (st.rare ? RARE_WEIGHT : COMMON_WEIGHT));
    let roll = rng.next() * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < pool.length - 1 && roll >= weights[i]) { roll -= weights[i]; i++; }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

// --- Fin de partie ---------------------------------------------------------------------------

/**
 * Applique une partie terminée aux récompenses (fonction pure).
 *  - answers : booléens (juste/faux) dans l'ordre ;
 *  - stars   : étoiles de la partie ;
 *  - island  : île du jeu (album où piocher les gommettes) ;
 *  - daily   : clé du jour ('AAAA-MM-JJ') si c'est le défi du jour, sinon null ;
 * Renvoie { rewards, gained } ; `gained` décrit ce qui a été gagné (pour l'écran de fin).
 */
export function applyGame(rewards, { answers, stars, island = null, daily = null, rng = createRng(), t = Date.now() }) {
  const score = scoreAnswers(answers);
  const bonus = starBonus(stars);
  const dailyReward = Boolean(daily) && rewards.daily.last !== daily;
  const dailyBonus = dailyReward ? POINTS.daily : 0;
  const points = score.total + bonus + dailyBonus;

  let bookId = null;
  let count = 0;
  if (daily) {
    if (dailyReward) { bookId = 'defi'; count = 1; }
  } else if (island) {
    bookId = island;
    count = stickerCount(stars);
  }
  const book = bookId ? getBook(bookId) : null;
  const owned = ownedIds(rewards);
  const stickers = book ? pickStickers(book, owned, count, rng) : [];
  const ids = stickers.map((st) => st.id);

  const next = {
    ...rewards,
    points: rewards.points + points,
    stickers: [...rewards.stickers, ...ids.map((id) => ({ id, t }))],
    unseen: [...rewards.unseen, ...ids],
    daily: dailyReward ? { last: daily, count: rewards.daily.count + 1 } : rewards.daily,
  };
  const before = gradeIndex(rewards.points);
  const after = gradeInfo(next.points);
  const bookDone = book && count > 0 ? bookProgress(next, book.id) : null;
  return {
    rewards: next,
    gained: {
      points,
      total: next.points,
      base: score.base,
      streak: score.streak,
      stars: bonus,
      daily: dailyBonus,
      dailyReward,
      grade: after,
      promoted: after.index > before,
      stickers: stickers.map((st) => ({ ...st, book: book.id })),
      bookId,
      bookComplete: Boolean(bookDone?.complete),
      // Album déjà complet avant la partie : aucune gommette à gagner.
      bookWasComplete: Boolean(book) && count > 0 && stickers.length === 0,
    },
  };
}

/** Lignes à afficher sur l'écran de fin (`extras` du moteur). */
export function extrasFor(gained) {
  const out = [{
    kind: 'points',
    text: `+${gained.points} points`,
    points: gained.points,
    streak: gained.streak,
    stars: gained.stars,
    daily: gained.daily,
  }];
  for (const st of gained.stickers) {
    out.push({ kind: 'sticker', icon: st.emoji, text: `Nouvelle gommette : ${st.name}`, sticker: st });
  }
  if (gained.bookComplete) {
    const book = getBook(gained.bookId);
    out.push({ kind: 'book', text: `Bravo, ton album « ${book.name} » est complet !` });
  } else if (gained.bookWasComplete) {
    out.push({ kind: 'book', text: 'Toutes les gommettes de cette île sont déjà dans ton album !' });
  }
  const { grade, next, toNext, ratio, index } = gained.grade;
  out.push({
    kind: 'grade',
    icon: grade.emoji,
    text: gained.promoted ? `Nouveau grade : ${grade.name} !` : `Grade : ${grade.name}`,
    promoted: gained.promoted,
    grade: { ...grade, index, ratio, toNext, next, points: gained.total },
  });
  return out;
}

/** Retire des gommettes de la liste « pas encore vues » (l'album vient de les montrer). */
export function markSeen(rewards, ids = rewards.unseen) {
  const seen = new Set(ids);
  return { ...rewards, unseen: rewards.unseen.filter((id) => !seen.has(id)) };
}

/** Gommettes « pas encore vues », avec leurs données. */
export function unseenStickers(rewards) {
  return rewards.unseen.map(findSticker).filter(Boolean);
}

// --- Branchement sur le moteur ---------------------------------------------------------------

/**
 * Écoute les parties (gameEvents) et enregistre les récompenses dans le profil actif.
 * Une session dont `game.daily` vaut 'AAAA-MM-JJ' est le défi du jour.
 * Renvoie une fonction qui débranche les écouteurs.
 */
export function installRewards({ store, getProfileId, events = gameEvents, rng = createRng, now = Date.now }) {
  const answers = new WeakMap();
  const offs = [
    events.on('start', ({ session }) => answers.set(session, [])),
    events.on('answer', ({ session, correct }) => {
      if (!answers.has(session)) answers.set(session, []);
      answers.get(session).push(Boolean(correct));
    }),
    events.on('end', ({ session, result, extras }) => {
      let gained = null;
      store.updateProfile(getProfileId(), (profile) => {
        const out = applyGame(getRewards(profile), {
          answers: answers.get(session) || [],
          stars: result.stars,
          island: session.game.island || null,
          daily: session.game.daily || null,
          rng: rng(),
          t: now(),
        });
        gained = out.gained;
        return { ...profile, rewards: out.rewards };
      });
      answers.delete(session);
      extras.push(...extrasFor(gained));
    }),
  ];
  return () => offs.forEach((off) => off());
}
