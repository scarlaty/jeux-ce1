// Récompenses (#16 → #21) : points, bonus de série, grades, gommettes, défi du jour, ouverture
// des îles. TOUT EST PUR ICI : aucune référence au DOM, au stockage ni au moteur.
// Le branchement sur `gameEvents` et l'écriture dans le profil vivent dans core/rewards-live.js.
import { createRng } from './random.js';

// --- Points ----------------------------------------------------------------------------------
//
// Barème pensé pour une enfant de 7 ans : un nombre rond par bonne réponse, des bonus qui
// récompensent la régularité, et une partie qui ne rapporte JAMAIS zéro (on valorise le fait
// d'être allée au bout, même quand le score est bas).

export const POINTS_PER_CORRECT = 10;
export const COMPLETION_POINTS = 5;     // avoir terminé la partie, quel que soit le score
export const DAILY_BONUS_POINTS = 20;   // défi du jour, une seule fois par jour

/** Bonus accordés quand la série de bonnes réponses atteint exactement ce palier. */
export const STREAK_BONUSES = [
  { streak: 3, points: 5, label: '3 bonnes réponses d\'affilée !' },
  { streak: 5, points: 10, label: '5 bonnes réponses d\'affilée !' },
  { streak: 7, points: 15, label: '7 bonnes réponses d\'affilée !' },
  { streak: 10, points: 25, label: '10 bonnes réponses d\'affilée !' },
];

/** Bonus déclenché par une série de cette longueur, ou null. */
export function streakBonus(streak) {
  return STREAK_BONUSES.find((b) => b.streak === streak) || null;
}

/**
 * Points d'une réponse : rien pour une erreur (jamais de points négatifs),
 * `POINTS_PER_CORRECT` sinon, plus le bonus du palier de série éventuellement atteint.
 */
export function answerPoints({ correct, streak = 0 } = {}) {
  if (!correct) return { base: 0, bonus: 0, points: 0, label: '' };
  const bonus = streakBonus(streak);
  return {
    base: POINTS_PER_CORRECT,
    bonus: bonus ? bonus.points : 0,
    points: POINTS_PER_CORRECT + (bonus ? bonus.points : 0),
    label: bonus ? bonus.label : '',
  };
}

/** Points d'une partie entière à partir de la suite des réponses (true = bonne réponse). */
export function runPoints(outcomes = []) {
  let streak = 0;
  let total = COMPLETION_POINTS;
  for (const correct of outcomes) {
    streak = correct ? streak + 1 : 0;
    total += answerPoints({ correct, streak }).points;
  }
  return total;
}

// --- Grades ----------------------------------------------------------------------------------
//
// Six grades, de l'outil du premier jour au diplôme. Les seuils sont calés sur le barème :
// une partie rapporte 80 à 160 points, donc ≈ 3, 8, 20, 40 et 65 parties.

export const GRADES = [
  { id: 'crayon-bois', name: 'Crayon de bois', icon: '✏️', points: 0 },
  { id: 'crayon-couleur', name: 'Crayon de couleur', icon: '🖍️', points: 250 },
  { id: 'feutre', name: 'Feutre', icon: '🖌️', points: 750 },
  { id: 'stylo-plume', name: 'Stylo plume', icon: '🖋️', points: 1800 },
  { id: 'cartable-or', name: 'Cartable d\'or', icon: '🎒', points: 3500 },
  { id: 'diplome', name: 'Diplôme', icon: '🎓', points: 6000 },
];

/** Rang (0 → GRADES.length - 1) correspondant à un total de points. */
export function gradeRank(points = 0) {
  let rank = 0;
  for (let i = 0; i < GRADES.length; i++) if (points >= GRADES[i].points) rank = i;
  return rank;
}

export function gradeFor(points = 0) {
  return GRADES[gradeRank(points)];
}

/** Avancement vers le grade suivant : `next` vaut null au dernier grade. */
export function gradeProgress(points = 0) {
  const rank = gradeRank(points);
  const grade = GRADES[rank];
  const next = GRADES[rank + 1] || null;
  if (!next) return { grade, next: null, into: 0, span: 0, remaining: 0, ratio: 1 };
  const span = next.points - grade.points;
  const into = Math.max(0, points - grade.points);
  return { grade, next, into, span, remaining: next.points - points, ratio: span ? into / span : 1 };
}

/** Grade atteint en passant de `before` à `after` points, sinon null. */
export function gradeGained(before = 0, after = 0) {
  const rank = gradeRank(after);
  return rank > gradeRank(before) ? GRADES[rank] : null;
}

// --- Gommettes -------------------------------------------------------------------------------
//
// Une collection par île. L'ordre du catalogue est l'ordre où les gommettes se gagnent :
// l'album se remplit case par case, et les cases vides montrent ce qu'il reste à gagner.

export const STICKERS = {
  mots: [
    { id: 'livre', emoji: '📖', name: 'Livre ouvert' },
    { id: 'plume', emoji: '✒️', name: 'Plume' },
    { id: 'cahier', emoji: '📝', name: 'Cahier' },
    { id: 'perroquet', emoji: '🦜', name: 'Perroquet bavard' },
    { id: 'puzzle', emoji: '🧩', name: 'Puzzle' },
    { id: 'theatre', emoji: '🎭', name: 'Masques de théâtre' },
    { id: 'boite-lettres', emoji: '📮', name: 'Boîte aux lettres' },
    { id: 'journal', emoji: '🗞️', name: 'Journal' },
    { id: 'chateau', emoji: '🏰', name: 'Château des contes' },
    { id: 'hibou', emoji: '🦉', name: 'Hibou savant' },
  ],
  nombres: [
    { id: 'de', emoji: '🎲', name: 'Dé' },
    { id: 'boulier', emoji: '🧮', name: 'Boulier' },
    { id: 'piece', emoji: '🪙', name: 'Pièce' },
    { id: 'bonbon', emoji: '🍬', name: 'Bonbon' },
    { id: 'gateau', emoji: '🧁', name: 'Petit gâteau' },
    { id: 'cent', emoji: '💯', name: 'Cent points' },
    { id: 'fusee', emoji: '🚀', name: 'Fusée' },
    { id: 'abeille', emoji: '🐝', name: 'Abeille compteuse' },
    { id: 'pizza', emoji: '🍕', name: 'Part de pizza' },
    { id: 'tresor', emoji: '💎', name: 'Diamant' },
  ],
  mesures: [
    { id: 'regle', emoji: '📏', name: 'Règle' },
    { id: 'equerre', emoji: '📐', name: 'Équerre' },
    { id: 'balance', emoji: '⚖️', name: 'Balance' },
    { id: 'reveil', emoji: '⏰', name: 'Réveil' },
    { id: 'calendrier', emoji: '🗓️', name: 'Calendrier' },
    { id: 'montre', emoji: '⌚', name: 'Montre' },
    { id: 'cube', emoji: '🧊', name: 'Cube' },
    { id: 'seau', emoji: '🪣', name: 'Seau' },
    { id: 'carton', emoji: '📦', name: 'Carton' },
    { id: 'sablier', emoji: '⏳', name: 'Sablier' },
  ],
  monde: [
    { id: 'terre', emoji: '🌍', name: 'Planète Terre' },
    { id: 'arbre', emoji: '🌳', name: 'Arbre' },
    { id: 'coccinelle', emoji: '🐞', name: 'Coccinelle' },
    { id: 'papillon', emoji: '🦋', name: 'Papillon' },
    { id: 'tournesol', emoji: '🌻', name: 'Tournesol' },
    { id: 'meteo', emoji: '🌦️', name: 'Soleil et pluie' },
    { id: 'volcan', emoji: '🌋', name: 'Volcan' },
    { id: 'tortue', emoji: '🐢', name: 'Tortue' },
    { id: 'boussole', emoji: '🧭', name: 'Boussole' },
    { id: 'champignon', emoji: '🍄', name: 'Champignon' },
  ],
  ailleurs: [
    { id: 'ourson', emoji: '🧸', name: 'Ours en peluche' },
    { id: 'mains', emoji: '🤝', name: 'Poignée de main' },
    { id: 'coeur', emoji: '❤️', name: 'Cœur' },
    { id: 'arc-en-ciel', emoji: '🌈', name: 'Arc-en-ciel' },
    { id: 'musique', emoji: '🎵', name: 'Note de musique' },
    { id: 'theiere', emoji: '🫖', name: 'Théière' },
    { id: 'colombe', emoji: '🕊️', name: 'Colombe' },
    { id: 'cadeau', emoji: '🎁', name: 'Cadeau' },
    { id: 'trefle', emoji: '🍀', name: 'Trèfle à quatre feuilles' },
    { id: 'etoile', emoji: '⭐', name: 'Étoile' },
  ],
};

export const STICKER_ISLANDS = Object.keys(STICKERS);

export function islandStickers(island) {
  return STICKERS[island] || [];
}

export function findSticker(island, id) {
  return islandStickers(island).find((s) => s.id === id) || null;
}

/** Les `count` prochaines gommettes de l'île qui ne sont pas déjà dans `owned`. */
export function nextStickers(owned = [], island, count = 1) {
  if (count <= 0) return [];
  const have = new Set(owned);
  return islandStickers(island).filter((s) => !have.has(s.id)).slice(0, count);
}

// --- État des récompenses dans le profil -------------------------------------------------------

export function defaultRewards() {
  return { points: 0, stickers: {}, daily: null };
}

const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

/** Rend utilisable un champ `rewards` absent, partiel ou abîmé. */
export function normalizeRewards(rewards) {
  const src = isObject(rewards) ? rewards : {};
  const stickers = {};
  for (const island of STICKER_ISLANDS) {
    const list = Array.isArray(src.stickers?.[island]) ? src.stickers[island] : [];
    const known = islandStickers(island).map((s) => s.id);
    stickers[island] = known.filter((id) => list.includes(id));   // ordre du catalogue, sans doublon
  }
  return {
    points: Number.isFinite(src.points) && src.points > 0 ? Math.floor(src.points) : 0,
    stickers,
    daily: isObject(src.daily) && typeof src.daily.key === 'string' ? { ...src.daily } : null,
  };
}

export function readRewards(profile) {
  return normalizeRewards(profile?.rewards);
}

export function stickerCount(rewards) {
  const r = normalizeRewards(rewards);
  return STICKER_ISLANDS.reduce((sum, island) => sum + r.stickers[island].length, 0);
}

export function stickerTotal() {
  return STICKER_ISLANDS.reduce((sum, island) => sum + islandStickers(island).length, 0);
}

/**
 * Phrase d'encouragement de l'album. Elle décrit le coffre (#91), seule source de gommettes :
 * la version précédente promettait deux gommettes pour trois étoiles, ce que le jeu n'a jamais
 * fait, et la promesse était même inversée (un coffre doré sort une gommette moins souvent
 * qu'un coffre de bois). Collection terminée : on le dit, comme pour les grades (#113).
 */
export function stickerHint(rewards) {
  if (stickerCount(rewards) >= stickerTotal()) return 'Tu as collé toutes les gommettes. Bravo !';
  return 'Réussis une partie pour gagner un coffre : il peut contenir une gommette ou un accessoire '
    + "pour ton compagnon. Plus tu as d'étoiles, plus le coffre est beau !";
}

/**
 * Applique le résultat d'une partie aux récompenses. Fonction pure : renvoie le nouvel état et
 * ce qui vient d'être gagné (pour l'écran de fin).
 * `daily` : { key } quand la partie est le défi du jour ; le bonus n'est donné qu'une fois par jour.
 * Ne remet plus de gommette : elle vient du coffre (core/chest.js).
 */
export function applyGameRewards(rewards, { island, stars = 0, points = 0, daily = null } = {}) {
  const before = normalizeRewards(rewards);
  const firstDailyToday = Boolean(daily?.key) && before.daily?.key !== daily.key;
  const bonus = firstDailyToday ? DAILY_BONUS_POINTS : 0;
  const gainedPoints = Math.max(0, Math.floor(points)) + bonus;
  const after = before.points + gainedPoints;

  // Depuis le coffre surprise (#91), la gommette ne se remet plus ici : une partie réussie (≥ 1 étoile)
  // donne un COFFRE (`gained.chest`, tiré et rangé par chest-live.js). Le défi du jour n'en donne qu'un
  // par jour ; un jeu normal, un à chaque partie réussie.
  const mayWin = daily ? firstDailyToday : true;
  const chest = mayWin && stars >= 1 ? { island, stars } : null;

  return {
    rewards: {
      points: after,
      stickers: before.stickers,
      daily: daily?.key ? { key: daily.key, stars, points: gainedPoints } : before.daily,
    },
    gained: {
      points: gainedPoints,
      dailyBonus: bonus,
      chest,
      grade: gradeGained(before.points, after),
      total: after,
    },
  };
}

// --- Défi du jour ----------------------------------------------------------------------------
//
// La graine suit la date LOCALE : le défi change à minuit pour l'enfant, pas à minuit UTC,
// et il reste le même toute la journée, y compris les jours de changement d'heure.

export const DAILY_QUESTIONS = 5;

/** Jour local au format AAAA-MM-JJ. */
export function dailyKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** FNV-1a 32 bits : petite fonction de hachage stable, sans dépendance. */
export function hashString(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Graine du défi : une par jour local, stable et imprévisible d'un jour à l'autre. */
export function dailySeed(date = new Date()) {
  return hashString(`defi:${dailyKey(date)}`);
}

export function isDailyDone(rewards, date = new Date()) {
  return normalizeRewards(rewards).daily?.key === dailyKey(date);
}

// --- Défi du jour : sélection variée (#94) ----------------------------------------------------
//
// Les jeux ne sont pas répartis également entre les matières (6 en français, 6 en maths, 1 en
// anglais, 1 en questionner le monde) : tirer un jeu au hasard à chaque question écrase presque
// totalement l'anglais et le monde. On tire donc par MATIÈRE d'abord, selon un POIDS choisi, puis
// par jeu dans la matière retenue — le nombre de jeux d'une matière n'influence plus rien.
// Une question est en plus réservée à un jeu peu ou pas joué, posée au niveau 1 : c'est elle qui
// fait découvrir une matière qu'on n'a jamais essayée.
//
// Fonction pure : `entries` + `seed` redonnent toujours le même plan (le défi est le même toute
// la journée, pour tout le monde). `entries` : [{ id, subject, maxLevel, plays }].

export const DISCOVERY_MAX_PLAYS = 2;   // « peu joué » : au plus 2 parties ; au-delà, rien à découvrir

/**
 * Poids de chaque matière dans le défi. Le français et les maths sont les dominantes du programme
 * de CE1 ; l'anglais et « questionner le monde » y sont des initiations — on les veut présents,
 * pas à parité. Seuls les rapports comptent, pas la somme.
 */
export const SUBJECT_WEIGHTS = { français: 35, maths: 35, anglais: 15, monde: 15, emc: 15 };
const DEFAULT_SUBJECT_WEIGHT = 15;

const weightOf = (subject) => SUBJECT_WEIGHTS[subject] ?? DEFAULT_SUBJECT_WEIGHT;

/** Tire une matière au hasard, proportionnellement à son poids. */
function pickWeightedSubject(subjects, rng) {
  const total = subjects.reduce((sum, s) => sum + weightOf(s), 0);
  let ticket = rng.next() * total;
  for (const subject of subjects) {
    ticket -= weightOf(subject);
    if (ticket < 0) return subject;
  }
  return subjects[subjects.length - 1];
}

/** Regroupe les entrées par matière, dans leur ordre d'apparition. */
function groupBySubject(entries) {
  const bySubject = new Map();
  for (const entry of entries) {
    if (!bySubject.has(entry.subject)) bySubject.set(entry.subject, []);
    bySubject.get(entry.subject).push(entry);
  }
  return bySubject;
}

/** Le jeu le moins joué de `entries`, ou null si tout a déjà beaucoup été joué. */
function pickDiscoveryEntry(entries, rng) {
  if (entries.length < 2) return null;
  const minPlays = Math.min(...entries.map((e) => e.plays || 0));
  if (minPlays > DISCOVERY_MAX_PLAYS) return null;
  const candidates = entries.filter((e) => (e.plays || 0) === minPlays);
  return rng.pick(candidates);
}

/**
 * Choisit `needed` entrées : à chaque question, une matière est tirée selon son poids, puis un jeu
 * (de préférence pas encore retenu) dans cette matière. Un défi reste donc varié en jeux, et les
 * matières se répartissent selon SUBJECT_WEIGHTS sur la durée, pas selon leur nombre de jeux.
 */
function pickBalancedEntries(entries, rng, needed) {
  const bySubject = groupBySubject(entries);
  const subjects = [...bySubject.keys()];
  const used = new Set();
  const picked = [];
  while (picked.length < needed) {
    const pool = bySubject.get(pickWeightedSubject(subjects, rng));
    const fresh = pool.filter((e) => !used.has(e.id));
    const entry = rng.pick(fresh.length ? fresh : pool);
    used.add(entry.id);
    picked.push(entry);
  }
  // Un tirage pondéré peut, un jour sur quelques-uns, tout faire tomber dans la même matière.
  // Le défi doit rester un mélange : on échange alors la dernière question contre une autre matière.
  if (subjects.length > 1 && picked.length > 1 && new Set(picked.map((e) => e.subject)).size === 1) {
    const others = subjects.filter((s) => s !== picked[0].subject);
    picked[picked.length - 1] = rng.pick(bySubject.get(pickWeightedSubject(others, rng)));
  }
  return picked;
}

/**
 * Plan du défi du jour : `count` couples `{ id, level, discovery }`, tirés par matière puis par
 * jeu (voir en tête de section), avec une question réservée à un jeu peu ou pas joué quand c'est
 * possible. Renvoie `[]` si `entries` est vide.
 */
export function buildDailyPlan(entries, seed, { count = DAILY_QUESTIONS } = {}) {
  if (!entries.length) return [];
  const rng = createRng(seed);
  const levelFor = (entry) => rng.int(1, Math.max(1, entry.maxLevel || 1));

  const discoveryEntry = pickDiscoveryEntry(entries, rng);
  const needed = discoveryEntry ? count - 1 : count;
  const chosen = pickBalancedEntries(entries, rng, Math.max(0, needed));
  const plan = chosen.map((entry) => ({ id: entry.id, level: levelFor(entry), discovery: false }));

  if (discoveryEntry) {
    const at = rng.int(0, plan.length);   // position mélangée dans le défi, pas toujours la même
    plan.splice(at, 0, { id: discoveryEntry.id, level: 1, discovery: true });
  }
  return plan;
}

/**
 * Noms des matières tels qu'ils s'écrivent à l'enfant (#110). Ici et pas dans l'écran : un jeu dont la
 * matière serait absente de cette table afficherait sa clé technique (« emc »), et aucun test ne
 * pourrait le voir depuis un module qui touche au DOM.
 */
export const SUBJECT_NAMES = {
  'français': 'Français', maths: 'Maths', monde: 'Le monde', anglais: 'Anglais', emc: 'Vivre ensemble',
};

/** Le nom à afficher, ou la clé brute en dernier recours (mieux que du vide). */
export function subjectName(subject) {
  return SUBJECT_NAMES[subject] || subject;
}

/**
 * La langue du TITRE du jeu. « Body and animals » et « Colors and numbers » sont en anglais : sans
 * cela, la synthèse vocale et les lecteurs d'écran les prononcent à la française, dans une page
 * `lang="fr"`. `null` pour tout le reste (#110).
 */
export function sourceLang(source) {
  return source && source.subject === 'anglais' ? 'en-GB' : null;
}

/**
 * Le « jeu » du défi du jour : il suit le plan déjà tiré, et marque chaque question de son origine.
 *
 * Pourquoi l'origine : cinq questions viennent de cinq jeux, et sur 120 jours simulés **76 % des
 * questions changent de matière** par rapport à la précédente. Dans un jeu, l'enfant sait ce qu'elle
 * joue — elle l'a choisi sur l'île, le titre est en haut de l'écran. Dans le défi, rien ne le disait :
 * elle lisait « cow » après une question de maths, sans savoir que c'était de l'anglais (#110).
 *
 * `source` n'entre pas dans `renderFingerprint` (qui ne lit que la consigne et l'affichage) : le
 * dédoublonnage de #92 est intact.
 *
 * Ici et pas dans l'écran, pour que ce soit testable : `js/screens/daily.js` touche au DOM.
 */
export function buildDailyGame(plan, byId, { key, island, title = 'Défi du jour' } = {}) {
  return {
    id: 'defi',
    title,
    island: 'defi',
    rewardIsland: island,     // l'île dont la gommette est à gagner aujourd'hui
    daily: { key },
    levels: [{ label: title }],
    makeQuestion(level, rng, seen) {
      const slot = plan[Math.min(seen.size, plan.length - 1)];
      const entry = byId.get(slot.id);
      const question = entry.game.makeQuestion(slot.level, rng, seen);
      return {
        ...question,
        source: { title: entry.game.title, subject: entry.game.subject, island: entry.game.island },
      };
    },
  };
}

// --- Étoiles et ouverture des îles -------------------------------------------------------------

/** Étoiles gagnées pour un jeu (meilleur résultat de chaque niveau). */
export function gameStars(progress) {
  return Object.values(progress?.best || {}).reduce((sum, b) => sum + (b.stars || 0), 0);
}

/** Étoiles gagnées sur tous les jeux (`profile.progress`). */
export function totalStars(progressMap) {
  return Object.values(progressMap || {}).reduce((sum, p) => sum + gameStars(p), 0);
}

/** Étoiles à gagner pour que chaque île s'ouvre sur la carte au trésor. */
export const ISLAND_UNLOCK_STARS = {
  mots: 0,
  nombres: 0,
  mesures: 3,
  monde: 9,
  ailleurs: 15,
};

export function islandUnlockStars(island) {
  return ISLAND_UNLOCK_STARS[island] ?? 0;
}

export function islandUnlocked(island, stars = 0) {
  return stars >= islandUnlockStars(island);
}

/** Étoiles qu'il reste à gagner pour ouvrir l'île (0 si elle est déjà ouverte). */
export function islandStarsLeft(island, stars = 0) {
  return Math.max(0, islandUnlockStars(island) - stars);
}
