// Le compagnon qui grandit (#90) : LOGIQUE PURE (aucun DOM). Le dessin des stades appartient au kit
// kawaii (art/kawaii.js, `companion()`) ; ici, les seuils, les noms et les calculs.
//
// Données dans le profil : `companion = { animal, name, hatched, games, stars }`
//   games : parties terminées (défi du jour compris) — elles font éclore l'œuf ;
//   stars : étoiles gagnées, partie après partie (rejouer compte) — elles le font grandir.
// Aucun compteur de « jours sans jouer » : le compagnon ne dépend jamais de la régularité de l'enfant.
//
// Stades (ceux du kit) : 0 œuf · 1 œuf fêlé · 2 bébé · 3 petit · 4 grand.
// Seuils choisis pour qu'une enfant qui joue 4 ou 5 parties par semaine (≈ 2 étoiles chacune,
// soit ≈ 10 étoiles par semaine) voie un changement de forme toutes les 1 à 4 semaines :
//   - l'œuf se fêle après 2 parties et est prêt à éclore après 3 (la première semaine) ;
//   - stade 3 « petit » à 20 étoiles (≈ 2 semaines), stade 4 « grand » à 60 étoiles (≈ 6 semaines).

export const GAMES_TO_CRACK = 2;
export const GAMES_TO_HATCH = 3;
/** Étoiles cumulées pour atteindre chaque stade après l'éclosion. */
export const STAGE_STARS = { 2: 0, 3: 20, 4: 60 };
export const MAX_STAGE = 4;
export const MAX_NAME = 12;

/** Les trois animaux au choix (identifiants du kit) avec leur nom, leur couleur et un nom proposé. */
export const COMPANION_ANIMALS = [
  { id: 'cat', label: 'Chat', color: 'peche', defaultName: 'Minou' },
  { id: 'bunny', label: 'Lapin', color: 'rose', defaultName: 'Pompon' },
  { id: 'bear', label: 'Ourson', color: 'citron', defaultName: 'Nougat' },
];

export const STAGE_LABELS = ['Un œuf', 'Un œuf fêlé', 'Bébé', 'Petit', 'Grand'];

const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const count = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function animalInfo(id) {
  return COMPANION_ANIMALS.find((a) => a.id === id) || COMPANION_ANIMALS[0];
}

/** Nom filtré : lettres, chiffres, espace, tiret, apostrophe ; espaces réduits ; 12 caractères au plus. Pure. */
export function cleanCompanionName(raw) {
  const text = String(raw ?? '')
    .replace(/[^\p{L}\p{M}\p{N} '’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [...text].slice(0, MAX_NAME).join('').trim();
}

/** Nom accepté tel quel, ou le nom proposé pour l'animal si rien d'exploitable n'a été saisi. */
export function nameOrDefault(raw, animal) {
  return cleanCompanionName(raw) || animalInfo(animal).defaultName;
}

/** Œuf tout neuf : celui que reçoit tout profil, nouveau ou ancien. */
export function defaultCompanion() {
  return { animal: 'cat', name: '', hatched: false, games: 0, stars: 0 };
}

/** Rend utilisable un champ `companion` absent, partiel ou abîmé (jamais une exception). */
export function normalizeCompanion(raw) {
  const src = isObject(raw) ? raw : {};
  const animal = COMPANION_ANIMALS.some((a) => a.id === src.animal) ? src.animal : 'cat';
  const hatched = src.hatched === true;
  return {
    animal,
    name: hatched ? nameOrDefault(src.name, animal) : '',
    hatched,
    games: count(src.games),
    stars: count(src.stars),
  };
}

export function readCompanion(profile) {
  return normalizeCompanion(profile?.companion);
}

/** Stade de croissance (0 à 4). Pure. */
export function stageOf(companion) {
  const c = normalizeCompanion(companion);
  if (!c.hatched) return c.games >= GAMES_TO_CRACK ? 1 : 0;
  if (c.stars >= STAGE_STARS[4]) return 4;
  if (c.stars >= STAGE_STARS[3]) return 3;
  return 2;
}

/** L'œuf peut éclore (assez de parties, pas encore éclos). */
export function readyToHatch(companion) {
  const c = normalizeCompanion(companion);
  return !c.hatched && c.games >= GAMES_TO_HATCH;
}

/**
 * Ce qu'il reste avant le prochain changement : `{ stage, next, unit, left, ratio }`.
 * `next` = null au dernier stade ; avant l'éclosion, `unit` vaut 'games' (parties) au lieu de 'stars'.
 */
export function progressOf(companion) {
  const c = normalizeCompanion(companion);
  const stage = stageOf(c);
  if (!c.hatched) {
    return { stage, next: 2, unit: 'games', left: Math.max(0, GAMES_TO_HATCH - c.games), ratio: Math.min(1, c.games / GAMES_TO_HATCH) };
  }
  if (stage >= MAX_STAGE) return { stage, next: null, unit: 'stars', left: 0, ratio: 1 };
  const next = stage + 1;
  const from = STAGE_STARS[stage];
  const to = STAGE_STARS[next];
  return { stage, next, unit: 'stars', left: to - c.stars, ratio: (c.stars - from) / (to - from) };
}

/** Phrase de la barre de progression : jamais de reproche, seulement ce qui vient. Pure. */
export function progressText(companion) {
  const c = normalizeCompanion(companion);
  const p = progressOf(c);
  if (!c.hatched) {
    if (p.left === 0) return 'Ton œuf est prêt à éclore !';
    return `Encore ${p.left} ${p.left > 1 ? 'parties' : 'partie'} avant que l'œuf éclose.`;
  }
  if (p.next === null) return 'Il est tout grand !';
  return `Encore ${p.left} ${p.left > 1 ? 'étoiles' : 'étoile'} avant de grandir.`;
}

/**
 * Une partie terminée avec `stars` étoiles (0 à 3). Renvoie le nouveau compagnon et ce qui a changé :
 * `{ companion, stage, cracked, ready, grew }` (`ready` : l'œuf vient de devenir prêt à éclore).
 */
export function addRun(companion, { stars = 0 } = {}) {
  const before = normalizeCompanion(companion);
  const after = {
    ...before,
    games: before.games + 1,
    stars: before.stars + Math.min(3, count(stars)),
  };
  const was = stageOf(before);
  const now = stageOf(after);
  return {
    companion: after,
    stage: now,
    cracked: !before.hatched && was === 0 && now === 1,
    ready: !before.hatched && !readyToHatch(before) && readyToHatch(after),
    grew: before.hatched && now > was,
  };
}

/** L'éclosion : l'enfant a choisi l'animal et le nom. Sans effet si l'œuf n'est pas prêt. Pure. */
export function hatch(companion, { animal, name } = {}) {
  const c = normalizeCompanion(companion);
  if (c.hatched || !readyToHatch(c)) return c;
  const chosen = animalInfo(animal).id;
  return { ...c, animal: chosen, name: nameOrDefault(name, chosen), hatched: true };
}

/** Change l'animal et/ou le nom d'un compagnon éclos (écran « Mon compagnon »). Pure. */
export function customize(companion, { animal, name } = {}) {
  const c = normalizeCompanion(companion);
  if (!c.hatched) return c;
  const chosen = animal === undefined ? c.animal : animalInfo(animal).id;
  return { ...c, animal: chosen, name: name === undefined ? c.name : nameOrDefault(name, chosen) };
}

/** Écrit un compagnon dans le profil `profileId` du store. Renvoie le compagnon enregistré. */
export function saveCompanion(store, profileId, update) {
  let saved = null;
  store.updateProfile(profileId, (profile) => {
    saved = update(readCompanion(profile));
    return { ...profile, companion: saved };
  });
  return saved;
}
