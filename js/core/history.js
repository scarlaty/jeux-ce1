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

// --- Agrégats (espace parents, courbes) -------------------------------------------------------
// Fonctions pures. Les entrées sont celles de `profile.history` ; les parties les plus anciennes,
// agrégées dans `profile.weekly`, comptent aussi dans les séries, les totaux et le temps de jeu.

export const WEEK = 7 * DAY;

/** Pourcentage arrondi (0–100), ou null si rien n'a été compté. */
export const percent = (score, total) => (total > 0 ? Math.round((score / total) * 100) : null);

const emptyStats = () => ({ plays: 0, score: 0, total: 0, durationMs: 0 });

function addTo(acc, row) {
  acc.plays += row.plays;
  acc.score += row.score;
  acc.total += row.total;
  acc.durationMs += row.durationMs || 0;
  return acc;
}

/** Lignes uniformes { t, week, game, level, plays, score, total, durationMs } (agrégats + historique). */
export function playRows(profile) {
  const fromWeekly = (profile?.weekly || []).map((w) => ({
    t: w.week, week: w.week, game: w.game, level: w.level,
    plays: w.games, score: w.score, total: w.total, durationMs: w.durationMs,
  }));
  const fromHistory = (profile?.history || []).map((e) => ({
    t: e.t, week: weekStart(e.t), game: e.game, level: e.level,
    plays: 1, score: e.score, total: e.total, durationMs: e.durationMs,
  }));
  return [...fromWeekly, ...fromHistory];
}

/** Totaux : { plays, score, total, durationMs, pct }. Options : `since` (horodatage), `filter(ligne)`. */
export function totals(profile, { since = -Infinity, filter = () => true } = {}) {
  const acc = emptyStats();
  for (const r of playRows(profile)) if (r.t >= since && filter(r)) addTo(acc, r);
  return { ...acc, pct: percent(acc.score, acc.total) };
}

/** Regroupe selon `keyOf(ligne)` → { [clé]: { plays, score, total, durationMs, pct, lastT } }. */
export function groupStats(profile, keyOf) {
  const out = {};
  for (const r of playRows(profile)) {
    const key = keyOf(r);
    if (key === null || key === undefined) continue;
    const acc = out[key] || (out[key] = { ...emptyStats(), lastT: -Infinity });
    addTo(acc, r);
    acc.lastT = Math.max(acc.lastT, r.t);
  }
  for (const acc of Object.values(out)) acc.pct = percent(acc.score, acc.total);
  return out;
}

/** Statistiques par jeu. */
export const statsByGame = (profile) => groupStats(profile, (r) => r.game);

/** Statistiques par matière ; `subjectOf(gameId)` vient du registre des jeux. */
export const statsBySubject = (profile, subjectOf) => groupStats(profile, (r) => subjectOf(r.game));

/**
 * Série hebdomadaire continue de `weeks` semaines finissant à la semaine de `now`
 * (`weeks: 'all'` : depuis la semaine de la première partie). Un point par semaine :
 * { week, plays, score, total, pct } ; `pct` vaut null pour une semaine sans partie.
 * `filter(ligne)` restreint à un jeu ou à une matière.
 */
export function weeklySeries(profile, { weeks = 8, now = Date.now(), filter = () => true } = {}) {
  const selected = playRows(profile).filter(filter);
  const last = weekStart(now);
  const first = weeks === 'all'
    ? Math.min(last, ...selected.map((r) => r.week))
    : last - (Math.max(1, weeks) - 1) * WEEK;
  const byWeek = new Map();
  for (let w = first; w <= last; w += WEEK) byWeek.set(w, emptyStats());
  for (const r of selected) {
    const acc = byWeek.get(r.week);
    if (acc) addTo(acc, r);
  }
  return [...byWeek].map(([week, acc]) => ({
    week, plays: acc.plays, score: acc.score, total: acc.total, pct: percent(acc.score, acc.total),
  }));
}

/**
 * Notions les plus ratées : [{ skill, count }] de la plus fréquente à la moins fréquente (à égalité :
 * ordre alphabétique), sur les parties depuis `since`, au plus `limit` notions.
 */
export function mostMissed(profile, { since = -Infinity, limit = 8 } = {}) {
  const counts = new Map();
  for (const e of profile?.history || []) {
    if (e.t < since) continue;
    for (const skill of e.missed || []) counts.set(skill, (counts.get(skill) || 0) + 1);
  }
  return [...counts]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill, 'fr'))
    .slice(0, limit);
}

/** Page `page` (à partir de 1) de l'historique, de la partie la plus récente à la plus ancienne. */
export function historyPage(profile, { page = 1, perPage = 10 } = {}) {
  const all = [...(profile?.history || [])].sort((a, b) => b.t - a.t);
  const pages = Math.max(1, Math.ceil(all.length / perPage));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { items: all.slice((current - 1) * perPage, current * perPage), page: current, pages, count: all.length };
}
