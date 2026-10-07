// Le compagnon qui grandit (#90) : LOGIQUE PURE (aucun DOM). Le dessin des stades appartient au kit
// kawaii (art/kawaii.js, `companion()`) ; ici, les seuils, les noms et les calculs.
//
// Données dans le profil : `companion = { animal, name, hatched, games, stars }`
//   games : parties terminées (défi du jour compris) — elles font éclore l'œuf ;
//   stars : PLANCHER d'étoiles (#105). Le compagnon grandit avec les étoiles de la carte des îles,
//           `totalStars(progress)` de rewards.js : le MEILLEUR résultat de chaque niveau, jamais la somme des
//           parties. Il n'y a qu'un seul compte d'étoiles ; `stars` n'en est que la mémoire, pour qu'un
//           compagnon ne rapetisse jamais : étoiles lues = max(stars, totalStars). Rejouer un niveau déjà réussi
//           n'ajoute donc rien, et améliorer un niveau n'ajoute que l'étoile qui manquait.
//           (Migration v2 → v3 : les anciens profils avaient une somme gonflée par les parties rejouées ;
//           voir `companionFloor`.)
// Aucun compteur de « jours sans jouer » : le compagnon ne dépend jamais de la régularité de l'enfant.
//
// Stades (ceux du kit) : 0 œuf · 1 œuf fêlé · 2 bébé · 3 petit · 4 grand.
// Seuils choisis pour qu'une enfant qui joue 4 ou 5 parties par semaine (≈ 2 étoiles chacune,
// soit ≈ 10 étoiles par semaine) voie un changement de forme toutes les 1 à 4 semaines :
//   - l'œuf se fêle après 2 parties et est prêt à éclore après 3 (la première semaine) ;
//   - stade 3 « petit » à 20 étoiles (≈ 2 semaines), stade 4 « grand » à 60 étoiles (≈ 6 semaines).

import { totalStars } from './rewards.js';

export const GAMES_TO_CRACK = 2;
export const GAMES_TO_HATCH = 3;
/** Étoiles cumulées pour atteindre chaque stade après l'éclosion. */
export const STAGE_STARS = { 2: 0, 3: 20, 4: 60 };
export const MAX_STAGE = 4;
export const MAX_NAME = 12;

/**
 * Les animaux (identifiants du kit) avec leur nom, leur couleur et un nom proposé.
 * `unlock` : étoiles au total pour le débloquer (#105). Chat et lapin sont là dès l'éclosion : l'enfant en
 * choisit un, UNE fois. L'ourson est une récompense : il se débloque en jouant et peut alors être adopté
 * (`adopt`), explicitement. On ne change jamais de compagnon à volonté.
 */
export const COMPANION_ANIMALS = [
  { id: 'cat', label: 'Chat', color: 'peche', defaultName: 'Minou', unlock: 0 },
  { id: 'bunny', label: 'Lapin', color: 'rose', defaultName: 'Pompon', unlock: 0 },
  { id: 'bear', label: 'Ourson', color: 'citron', defaultName: 'Nougat', unlock: 30 },
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

/** Étoiles du compagnon : celles de la carte des îles, sans jamais descendre sous son plancher. */
export function companionStars(companion, progress) {
  return Math.max(count(companion?.stars), totalStars(progress));
}

/** Compagnon du profil, avec ses étoiles à jour (le même compte que la carte des îles). */
export function readCompanion(profile) {
  const c = normalizeCompanion(profile?.companion);
  return { ...c, stars: companionStars(c, profile?.progress) };
}

/** L'animal est-il débloqué avec `stars` étoiles au total ? */
export function animalUnlocked(id, stars = 0) {
  const a = COMPANION_ANIMALS.find((x) => x.id === id);
  return Boolean(a) && count(stars) >= a.unlock;
}

/** Animaux qu'on peut choisir à l'éclosion : ceux qui sont débloqués d'emblée (chat, lapin). */
export const STARTER_ANIMALS = COMPANION_ANIMALS.filter((a) => a.unlock === 0);

/** Animaux-récompenses déjà débloqués que l'enfant peut adopter à la place du sien. */
export function adoptable(companion) {
  const c = normalizeCompanion(companion);
  if (!c.hatched) return [];
  return COMPANION_ANIMALS.filter((a) => a.unlock > 0 && a.id !== c.animal && c.stars >= a.unlock);
}

/**
 * Plancher d'un compagnon d'avant #105 : sa somme d'étoiles par partie était gonflée par les parties rejouées.
 * On repart des étoiles réelles de la carte ; si elles sont moins nombreuses, le compagnon GARDE le stade
 * atteint (plancher = seuil de ce stade) : il ne rapetisse jamais et la barre ne recule pas. Il reprendra sa
 * croissance dès que les étoiles réelles dépasseront ce plancher. Un œuf non éclos n'a pas de stade : 0.
 */
export function companionFloor(companion, progress) {
  const c = normalizeCompanion(companion);
  if (!c.hatched) return 0;
  return Math.max(STAGE_STARS[stageOf(c)] ?? 0, totalStars(progress));
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
 * Une partie terminée ; `totalStars` : étoiles de la carte APRÈS cette partie (meilleurs résultats). Renvoie le nouveau compagnon et ce qui a changé :
 * `{ companion, stage, cracked, ready, grew }` (`ready` : l'œuf vient de devenir prêt à éclore).
 */
export function addRun(companion, { totalStars: total = 0 } = {}) {
  const before = normalizeCompanion(companion);
  const after = {
    ...before,
    games: before.games + 1,
    stars: Math.max(before.stars, count(total)),
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
  // À l'éclosion, seuls les animaux débloqués se choisissent ; sinon le chat.
  const wanted = animalInfo(animal);
  const chosen = c.stars >= wanted.unlock ? wanted.id : 'cat';
  return { ...c, animal: chosen, name: nameOrDefault(name, chosen), hatched: true };
}

/**
 * Adopte un animal-récompense débloqué (#105) : choix explicite et rare. Les étoiles suivent (elles ne
 * dépendent pas de l'animal) ; le nom aussi, sauf s'il était encore le nom proposé de l'ancien animal.
 * Sans effet si l'animal n'est pas débloqué, est déjà le sien, ou si l'œuf n'a pas éclos. Pure.
 */
export function adopt(companion, { animal } = {}) {
  const c = normalizeCompanion(companion);
  const target = adoptable(c).find((a) => a.id === animal);
  if (!target) return c;
  const keepsName = c.name !== animalInfo(c.animal).defaultName;
  return { ...c, animal: target.id, name: keepsName ? c.name : target.defaultName };
}

/** Change le NOM d'un compagnon éclos (écran « Mon compagnon »). L'animal ne change plus ici : voir `adopt`. Pure. */
export function customize(companion, { name } = {}) {
  const c = normalizeCompanion(companion);
  if (!c.hatched || name === undefined) return c;
  return { ...c, name: nameOrDefault(name, c.animal) };
}

/** Écrit un compagnon dans le profil `profileId` du store. Renvoie le compagnon enregistré. */
export function saveCompanion(store, profileId, update, { stored = false } = {}) {
  let saved = null;
  store.updateProfile(profileId, (profile) => {
    // `stored` : le compagnon tel qu'écrit (avant mise à jour des étoiles), pour mesurer ce que la partie change.
    saved = update(stored ? normalizeCompanion(profile?.companion) : readCompanion(profile));
    return { ...profile, companion: saved };
  });
  return saved;
}
