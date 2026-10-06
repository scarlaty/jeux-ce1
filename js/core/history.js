// Historique des parties et progression par jeu. Fonctions pures sur un profil,
// plus `recordResult` qui fait la lecture/écriture via le store.

export const HISTORY_CAP = 5000;
const DAY = 24 * 60 * 60 * 1000;

/** Entrée d'historique telle que décrite dans CLAUDE.md. */
export function makeEntry(result) {
  return {
    t: result.t,
    game: result.game,
    level: result.level,
    score: result.score,
    total: result.total,
    durationMs: result.durationMs,
    missed: [...(result.missed || [])],
  };
}

/** Lundi 00:00 (UTC) de la semaine contenant `t` : clé stable des agrégats hebdomadaires. */
export function weekStart(t) {
  const day = Math.floor(t / DAY);
  const weekday = (day + 3) % 7;   // le 1er janvier 1970 était un jeudi → lundi = 0
  return (day - weekday) * DAY;
}

/** Ajoute des entrées à des agrégats hebdomadaires (par semaine, jeu et niveau). */
export function aggregateWeekly(weekly, entries) {
  const out = weekly.map((w) => ({ ...w }));
  for (const e of entries) {
    const week = weekStart(e.t);
    let row = out.find((w) => w.week === week && w.game === e.game && w.level === e.level);
    if (!row) {
      row = { week, game: e.game, level: e.level, games: 0, score: 0, total: 0, durationMs: 0 };
      out.push(row);
    }
    row.games += 1;
    row.score += e.score;
    row.total += e.total;
    row.durationMs += e.durationMs || 0;
  }
  return out.sort((a, b) => a.week - b.week);
}

/** Ajoute une partie ; au-delà de `cap` entrées, les plus anciennes sont agrégées par semaine. */
export function appendHistory(profile, entry, cap = HISTORY_CAP) {
  const history = [...(profile.history || []), entry];
  if (history.length <= cap) return { ...profile, history };
  const overflow = history.splice(0, history.length - cap);
  return { ...profile, history, weekly: aggregateWeekly(profile.weekly || [], overflow) };
}

/** Progression d'un jeu, avec valeurs par défaut (niveau 1 ouvert). */
export function getGameProgress(profile, gameId) {
  const p = profile?.progress?.[gameId];
  return { unlocked: 1, best: {}, plays: 0, ...(p || {}) };
}

/**
 * Met à jour la progression après une partie. Renvoie le nouveau profil et ce qui a changé
 * (`newBest` : meilleur score battu pour ce niveau ; `newlyUnlocked` : niveau qui vient de s'ouvrir).
 */
export function applyResult(profile, result) {
  const before = getGameProgress(profile, result.game);
  const prevBest = before.best[result.level];
  const newBest = !prevBest || result.score > prevBest.score;
  const best = newBest
    ? { ...before.best, [result.level]: { score: result.score, total: result.total, stars: result.stars } }
    : before.best;
  const unlocked = result.unlocksNext ? Math.max(before.unlocked, result.level + 1) : before.unlocked;
  const progress = { ...before, best, unlocked, plays: before.plays + 1 };
  return {
    profile: { ...profile, progress: { ...(profile.progress || {}), [result.game]: progress } },
    progress,
    newBest,
    newlyUnlocked: unlocked > before.unlocked ? unlocked : null,
  };
}

/** Enregistre une partie terminée dans le profil (historique + progression). */
export function recordResult(store, profileId, result) {
  let summary = null;
  store.updateProfile(profileId, (profile) => {
    summary = applyResult(appendHistory(profile, makeEntry(result)), result);
    return summary.profile;
  });
  const { progress, newBest, newlyUnlocked } = summary;
  return { progress, newBest, newlyUnlocked };
}
