// Générateur pseudo-aléatoire à graine : une même graine redonne la même partie,
// ce qui rend les générateurs de questions testables et les bugs reproductibles.

/** mulberry32 : rapide, 32 bits, largement suffisant pour des jeux. Renvoie un réel dans [0, 1[. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Graine imprévisible pour une partie normale. */
export function randomSeed() {
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    return c.getRandomValues(new Uint32Array(1))[0];
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

/** Entier dans [min, max] (bornes incluses). */
export function int(next, min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RangeError(`int(): bornes invalides ${min}..${max}`);
  }
  return min + Math.floor(next() * (max - min + 1));
}

/** Un élément au hasard. */
export function pick(next, list) {
  if (!list.length) throw new RangeError('pick(): liste vide');
  return list[Math.floor(next() * list.length)];
}

/** Copie mélangée (Fisher-Yates) ; la liste d'origine n'est pas modifiée. */
export function shuffle(next, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** `count` éléments distincts (sans remise), dans un ordre aléatoire. */
export function sample(next, list, count) {
  if (count > list.length) throw new RangeError(`sample(): ${count} > ${list.length}`);
  return shuffle(next, list).slice(0, count);
}

/**
 * Objet « rng » passé aux jeux : `rng.int(1, 10)`, `rng.pick(liste)`, `rng.shuffle(liste)`,
 * `rng.sample(liste, 3)`, `rng.chance(0.5)`, `rng.next()`.
 */
export function createRng(seed = randomSeed()) {
  const next = mulberry32(seed);
  return {
    seed: seed >>> 0,
    next,
    int: (min, max) => int(next, min, max),
    pick: (list) => pick(next, list),
    shuffle: (list) => shuffle(next, list),
    sample: (list, count) => sample(next, list, count),
    chance: (p = 0.5) => next() < p,
  };
}
