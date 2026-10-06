// Statistiques de l'espace parents (#12, #13, #15) : agrégats et mise en forme.
// Tout est pur : aucune lecture du stockage, aucun DOM. Les écrans passent un profil
// (tel qu'il est enregistré) et reçoivent des données prêtes à afficher.
//
// Deux sources se complètent : `profile.history` (une entrée par partie, plafonnée) et
// `profile.weekly` (agrégats des parties les plus anciennes, voir history.js). Les fonctions
// ci-dessous lisent les deux pour ne jamais perdre une semaine ancienne.
import { weekStart, getGameProgress } from './history.js';

export const WEEK = 7 * 24 * 60 * 60 * 1000;

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const pad2 = (n) => String(n).padStart(2, '0');

/** « 5 oct. » — les semaines sont calées sur le lundi UTC, comme weekStart. */
export function weekLabel(week) {
  const d = new Date(week);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** « lundi 5 oct à 17:32 » (heure locale : c'est ce que le parent a vu). */
export function dateTimeLabel(t) {
  const d = new Date(t);
  const day = d.getDate() === 1 ? '1er' : String(d.getDate());
  return `${DAYS[d.getDay()]} ${day} ${MONTHS[d.getMonth()].replace('.', '')} à ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** « 1 min 20 s », « 45 s », « 1 h 05 ». */
export function durationLabel(ms) {
  const seconds = Math.max(0, Math.round((ms || 0) / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const rest = seconds % 60;
    return rest ? `${minutes} min ${pad2(rest)} s` : `${minutes} min`;
  }
  return `${Math.floor(minutes / 60)} h ${pad2(minutes % 60)}`;
}

/** Taux de réussite en pourcentage entier, ou null quand il n'y a rien à mesurer. */
export function rateOf(score, total) {
  return total > 0 ? Math.round((score / total) * 100) : null;
}

/** Parties enregistrées, de la plus récente à la plus ancienne. */
export function playedGames(profile, { limit = Infinity, match = () => true } = {}) {
  return (profile?.history || [])
    .filter(match)
    .sort((a, b) => b.t - a.t)
    .slice(0, limit);
}

/** Totaux de tout ce qui est connu (historique détaillé + semaines agrégées). */
export function totals(profile, { match = () => true } = {}) {
  let plays = 0; let score = 0; let total = 0; let durationMs = 0;
  for (const e of profile?.history || []) {
    if (!match(e)) continue;
    plays += 1; score += e.score; total += e.total; durationMs += e.durationMs || 0;
  }
  for (const w of profile?.weekly || []) {
    if (!match(w)) continue;
    plays += w.games; score += w.score; total += w.total; durationMs += w.durationMs || 0;
  }
  return { plays, score, total, durationMs, rate: rateOf(score, total) };
}

/**
 * Taux de réussite semaine par semaine, sur les `weeks` dernières semaines (la plus ancienne
 * d'abord). Les semaines sans partie sont présentes avec `games: 0` et `rate: null` :
 * la courbe montre les trous au lieu de les combler.
 */
export function weeklySeries(profile, { weeks = 8, now = Date.now(), match = () => true } = {}) {
  const buckets = new Map();
  const add = (week, games, score, total, durationMs) => {
    const row = buckets.get(week) || { games: 0, score: 0, total: 0, durationMs: 0 };
    row.games += games; row.score += score; row.total += total; row.durationMs += durationMs;
    buckets.set(week, row);
  };
  for (const e of profile?.history || []) {
    if (match(e)) add(weekStart(e.t), 1, e.score, e.total, e.durationMs || 0);
  }
  for (const w of profile?.weekly || []) {
    if (match(w)) add(w.week, w.games, w.score, w.total, w.durationMs || 0);
  }
  const last = weekStart(now);
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const week = last - i * WEEK;
    const row = buckets.get(week) || { games: 0, score: 0, total: 0, durationMs: 0 };
    out.push({ week, label: weekLabel(week), ...row, rate: rateOf(row.score, row.total) });
  }
  return out;
}

/** Notions les plus souvent ratées : `[{ skill, count }]`, de la plus fréquente à la moins. */
export function topMissed(profile, { limit = 6, match = () => true } = {}) {
  const counts = new Map();
  for (const e of profile?.history || []) {
    if (!match(e)) continue;
    for (const skill of e.missed || []) counts.set(skill, (counts.get(skill) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill, 'fr'))
    .slice(0, limit);
}

/**
 * Pour chaque jeu du registre : niveaux ouverts, meilleur score par niveau, étoiles, parties.
 * `games` : entrées du registre (`{ id, title, island, subject, demo? }`).
 */
export function gameSummaries(profile, games, { levels = 3 } = {}) {
  return games.map((game) => {
    const progress = getGameProgress(profile, game.id);
    const rows = Array.from({ length: levels }, (_, i) => {
      const level = i + 1;
      return { level, open: level <= progress.unlocked, best: progress.best[level] || null };
    });
    return {
      id: game.id,
      title: game.title,
      island: game.island,
      subject: game.subject,
      plays: progress.plays,
      unlocked: progress.unlocked,
      levels: rows,
      stars: rows.reduce((sum, r) => sum + (r.best?.stars || 0), 0),
      maxStars: levels * 3,
    };
  });
}

/** Filtres de l'espace parents : `{ id, label, match }`, prêts pour une liste déroulante. */
export function seriesFilters(games) {
  const subjects = [...new Set(games.map((g) => g.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
  const bySubject = new Map(games.map((g) => [g.id, g.subject]));
  return [
    { id: 'tout', label: 'Tous les jeux', match: () => true },
    ...subjects.map((subject) => ({
      id: `matiere:${subject}`,
      label: `Matière : ${subject}`,
      match: (e) => bySubject.get(e.game) === subject,
    })),
    ...games.map((game) => ({
      id: `jeu:${game.id}`,
      label: `Jeu : ${game.title}`,
      match: (e) => e.game === game.id,
    })),
  ];
}

// --- Géométrie de la courbe (pure : l'écran n'a plus qu'à poser les coordonnées) -------------

const DEFAULT_BOX = { width: 640, height: 260, top: 18, right: 16, bottom: 46, left: 44 };

/**
 * Transforme une série en coordonnées SVG.
 * Renvoie `{ box, plot, points, segments, gridlines }` :
 *  - `points`    : un par semaine, avec `x`, `y` (null si pas de partie), `label`, `rate`, `games` ;
 *  - `segments`  : suites de points consécutifs mesurés — la ligne est coupée sur les trous,
 *                  elle n'invente pas de progression là où l'enfant n'a pas joué ;
 *  - `gridlines` : 0, 25, 50, 75, 100 % avec leur ordonnée.
 */
export function chartGeometry(series, box = {}) {
  const b = { ...DEFAULT_BOX, ...box };
  const plot = {
    x: b.left,
    y: b.top,
    width: Math.max(1, b.width - b.left - b.right),
    height: Math.max(1, b.height - b.top - b.bottom),
  };
  const count = series.length;
  const step = count > 1 ? plot.width / (count - 1) : 0;
  const yFor = (rate) => plot.y + plot.height * (1 - rate / 100);
  const points = series.map((row, i) => ({
    ...row,
    x: count > 1 ? plot.x + i * step : plot.x + plot.width / 2,
    y: row.rate === null ? null : yFor(row.rate),
  }));

  const segments = [];
  let run = [];
  for (const p of points) {
    if (p.y === null) { if (run.length) segments.push(run); run = []; } else run.push(p);
  }
  if (run.length) segments.push(run);

  return {
    box: b,
    plot,
    points,
    segments,
    gridlines: [0, 25, 50, 75, 100].map((rate) => ({ rate, y: yFor(rate) })),
  };
}
