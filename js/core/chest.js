// Le coffre surprise (#91) : LOGIQUE PURE (aucun DOM, aucun stockage). Le dessin et l'animation sont
// dans core/ui/chest.js ; l'écriture dans le profil dans core/chest-live.js.
//
// Une partie réussie (au moins 1 étoile) donne un coffre dont la beauté suit les étoiles :
// bois (1), argent (2), doré (3). Il récompense la RÉUSSITE, jamais le temps passé, et ne coûte rien.
// Trois sortes de contenu, de la plus courante à la plus rare :
//   - une gommette de l'île du jeu (commune) ;
//   - un accessoire pour le compagnon (peu commun) ;
//   - un accessoire doré (rare).
// Pas de doublon tant qu'une collection n'est pas complète : une sorte épuisée cède la place à une
// autre, et seul un enfant qui a TOUT reçu retrouve parfois une gommette déjà collée (sans rien stocker).
//
// Données dans le profil : `chest = { accessories: [id], equipped: id | null, opened }`
//   accessories : accessoires possédés (ordre du catalogue, sans doublon) ;
//   equipped    : celui que porte le compagnon (un seul à la fois, ou aucun) ;
//   opened      : nombre de coffres ouverts.
import { islandStickers, nextStickers } from './rewards.js';

export const TIERS = ['bois', 'argent', 'dore'];
export const TIER_LABELS = { bois: 'Coffre en bois', argent: 'Coffre d\'argent', dore: 'Coffre doré' };

/** Chances (en %) de chaque rareté, par coffre. Chaque ligne fait 100. */
export const ODDS = {
  bois: { common: 75, uncommon: 22, rare: 3 },
  argent: { common: 55, uncommon: 35, rare: 10 },
  dore: { common: 35, uncommon: 45, rare: 20 },
};

/** Ordre de rareté, de la plus courante à la plus rare. */
export const RARITIES = ['common', 'uncommon', 'rare'];
export const RARITY_LABELS = { common: 'Gommette', uncommon: 'Accessoire', rare: 'Objet doré rare' };

/** Accessoires du compagnon : ceux du kit kawaii (art/kawaii-parts.js), regroupés par rareté. */
export const ACCESSORIES = [
  { id: 'bow', name: 'Le nœud', rarity: 'uncommon' },
  { id: 'flower', name: 'La fleur', rarity: 'uncommon' },
  { id: 'sprout', name: 'La pousse', rarity: 'uncommon' },
  { id: 'hat', name: 'Le chapeau de fête', rarity: 'uncommon' },
  { id: 'glasses', name: 'Les lunettes rondes', rarity: 'uncommon' },
  { id: 'crown', name: 'La couronne dorée', rarity: 'rare' },
  { id: 'star', name: 'La barrette étoile', rarity: 'rare' },
];

const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

export function accessoryInfo(id) {
  return ACCESSORIES.find((a) => a.id === id) || null;
}

/** Coffre gagné avec ce nombre d'étoiles : null sous 1 étoile. */
export function tierFor(stars = 0) {
  if (stars >= 3) return 'dore';
  if (stars >= 2) return 'argent';
  return stars >= 1 ? 'bois' : null;
}

// --- État dans le profil -----------------------------------------------------------------------

export function defaultChest() {
  return { accessories: [], equipped: null, opened: 0 };
}

/** Rend utilisable un champ `chest` absent, partiel ou abîmé (jamais une exception). */
export function normalizeChest(raw) {
  const src = isObject(raw) ? raw : {};
  const list = Array.isArray(src.accessories) ? src.accessories : [];
  const accessories = ACCESSORIES.map((a) => a.id).filter((id) => list.includes(id));
  return {
    accessories,
    equipped: accessories.includes(src.equipped) ? src.equipped : null,
    opened: Number.isFinite(src.opened) && src.opened > 0 ? Math.floor(src.opened) : 0,
  };
}

export function readChest(profile) {
  return normalizeChest(profile?.chest);
}

/** Le compagnon avec l'accessoire qu'il porte (un œuf n'en porte pas). Pure. */
export function withAccessory(companion, profile) {
  const equipped = companion?.hatched ? readChest(profile).equipped : null;
  return equipped ? { ...companion, accessory: equipped } : { ...companion };
}

/** Porte `id` (ou rien si `id` est null) ; un accessoire non possédé est ignoré. Pure. */
export function equip(chest, id) {
  const c = normalizeChest(chest);
  if (id === null || id === undefined) return { ...c, equipped: null };
  return c.accessories.includes(id) ? { ...c, equipped: id } : c;
}

/** Écrit le coffre `update(chest)` dans le profil `profileId`. Renvoie ce qui a été enregistré. */
export function saveChest(store, profileId, update) {
  let saved = null;
  store.updateProfile(profileId, (profile) => {
    saved = update(readChest(profile));
    return { ...profile, chest: saved };
  });
  return saved;
}

// --- Tirage ------------------------------------------------------------------------------------

/** Rareté tirée avec `roll` ∈ [0, 1[ pour ce coffre. Pure. */
export function rarityFor(tier, roll) {
  const odds = ODDS[tier] || ODDS.bois;
  let edge = 0;
  for (const rarity of RARITIES) {
    edge += odds[rarity];
    if (roll * 100 < edge) return rarity;
  }
  return RARITIES[RARITIES.length - 1];
}

/** Ce qu'il reste à gagner pour une rareté : gommettes de l'île ou accessoires non possédés. */
function remaining(rarity, { island, ownedStickers, ownedAccessories }) {
  if (rarity === 'common') return nextStickers(ownedStickers, island, 1);
  return ACCESSORIES.filter((a) => a.rarity === rarity && !ownedAccessories.includes(a.id));
}

/** Raretés à essayer : celle tirée, puis les moins rares (plus faciles à compléter), puis les plus rares. */
function fallbackOrder(rarity) {
  const i = RARITIES.indexOf(rarity);
  return [rarity, ...RARITIES.slice(0, i).reverse(), ...RARITIES.slice(i + 1)];
}

/**
 * Tire le contenu d'un coffre.
 *   { stars, island, ownedStickers: [id], ownedAccessories: [id], rng }  (rng : createRng de core/random.js)
 * Renvoie `{ tier, rarity, prize }` (ou null sans étoile) où `prize` vaut :
 *   { kind: 'sticker', island, sticker, duplicate: false }  une gommette neuve (la prochaine de l'album)
 *   { kind: 'accessory', accessory }                         un accessoire neuf
 *   { kind: 'sticker', island, sticker, duplicate: true }   TOUT est déjà gagné : souvenir, rien n'est stocké
 *   { kind: 'stars' }                                        île sans collection (cas d'un jeu mal déclaré)
 * `rarity` est celle du contenu réellement donné (elle peut être plus basse que celle tirée si la
 * collection correspondante est complète). Aucune exception, quel que soit l'état. Pure.
 */
export function drawChest({ stars = 0, island, ownedStickers = [], ownedAccessories = [], rng } = {}) {
  const tier = tierFor(stars);
  if (!tier) return null;
  const state = { island, ownedStickers, ownedAccessories };
  const drawn = rarityFor(tier, rng.next());
  for (const rarity of fallbackOrder(drawn)) {
    const pool = remaining(rarity, state);
    if (!pool.length) continue;
    const item = pool[Math.floor(rng.next() * pool.length)];
    return rarity === 'common'
      ? { tier, rarity, prize: { kind: 'sticker', island, sticker: item, duplicate: false } }
      : { tier, rarity, prize: { kind: 'accessory', accessory: item, duplicate: false } };
  }
  const catalog = islandStickers(island);
  if (!catalog.length) return { tier, rarity: 'common', prize: { kind: 'stars' } };
  return { tier, rarity: 'common', prize: { kind: 'sticker', island, sticker: rng.pick(catalog), duplicate: true } };
}

/** Compte le coffre ouvert et range l'accessoire gagné (une gommette est rangée par rewards.js). Pure. */
export function collect(chest, prize) {
  const c = normalizeChest(chest);
  const opened = c.opened + 1;
  if (prize?.kind !== 'accessory') return { ...c, opened };
  return normalizeChest({ ...c, accessories: [...c.accessories, prize.accessory.id], opened });
}
