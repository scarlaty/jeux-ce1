// Banque d'anglais (CE1, niveau A1) : couleurs, nombres et objets à compter.
// Fonctions pures, sans DOM : partagée par le jeu « Colors and numbers » et par le dessin
// `colored` (js/core/ui/art/colored.js), qui s'en sert pour son nom accessible.

/**
 * Les onze couleurs du programme. `fr` = [masculin, féminin] au singulier ; `invariable` :
 * « orange » et « marron » ne s'accordent pas (« des ballons orange »).
 */
export const COLORS = [
  { id: 'red', en: 'red', fr: ['rouge', 'rouge'] },
  { id: 'blue', en: 'blue', fr: ['bleu', 'bleue'] },
  { id: 'yellow', en: 'yellow', fr: ['jaune', 'jaune'] },
  { id: 'green', en: 'green', fr: ['vert', 'verte'] },
  { id: 'orange', en: 'orange', fr: ['orange', 'orange'], invariable: true },
  { id: 'pink', en: 'pink', fr: ['rose', 'rose'] },
  { id: 'purple', en: 'purple', fr: ['violet', 'violette'] },
  { id: 'black', en: 'black', fr: ['noir', 'noire'] },
  { id: 'white', en: 'white', fr: ['blanc', 'blanche'] },
  { id: 'brown', en: 'brown', fr: ['marron', 'marron'], invariable: true },
  { id: 'grey', en: 'grey', fr: ['gris', 'grise'] },
];

export const getColor = (id) => COLORS.find((c) => c.id === id) || null;

/** « bleue », « bleus », « violettes »… : la couleur accordée. */
export function colorFr(id, { feminine = false, plural = false } = {}) {
  const color = getColor(id);
  if (!color) throw new RangeError(`couleur inconnue : ${id}`);
  const base = color.fr[feminine ? 1 : 0];
  return plural && !color.invariable && !/[sx]$/.test(base) ? `${base}s` : base;
}

/** Objets que l'on sait dessiner et compter. `colors` : couleurs vraisemblables (toutes si absent). */
export const THINGS = [
  { id: 'apple', en: 'apple', enPlural: 'apples', fr: 'pomme', frPlural: 'pommes', feminine: true, colors: ['red', 'green', 'yellow'] },
  { id: 'balloon', en: 'balloon', enPlural: 'balloons', fr: 'ballon', frPlural: 'ballons', feminine: false },
  { id: 'star', en: 'star', enPlural: 'stars', fr: 'étoile', frPlural: 'étoiles', feminine: true },
  { id: 'flower', en: 'flower', enPlural: 'flowers', fr: 'fleur', frPlural: 'fleurs', feminine: true },
];

export const getThing = (id) => THINGS.find((t) => t.id === id) || null;

/** Les couleurs possibles pour un objet. */
export function colorsOf(thingId) {
  const thing = getThing(thingId);
  return thing?.colors || COLORS.map((c) => c.id);
}

/** « 3 pommes rouges », « 1 ballon bleu » (français, pour les noms accessibles et les corrections). */
export function thingsFr({ thing, color, count }) {
  const t = getThing(thing);
  const plural = count > 1;
  return `${count} ${plural ? t.frPlural : t.fr} ${colorFr(color, { feminine: t.feminine, plural })}`;
}

/** « three red apples » (anglais, lu par la voix). */
export function thingsEn({ thing, color, count }) {
  const t = getThing(thing);
  return `${numberEn(count)} ${getColor(color).en} ${count > 1 ? t.enPlural : t.en}`;
}

// --- Nombres --------------------------------------------------------------------------------

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];
const TENS = {
  30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety', 100: 'one hundred',
};

/** Nombres que le jeu sait dire : 1 à 20, puis les dizaines jusqu'à 100. */
export function isKnownNumber(n) {
  return Number.isInteger(n) && ((n >= 1 && n <= 20) || Object.hasOwn(TENS, n));
}

/** 13 → « thirteen », 30 → « thirty », 100 → « one hundred ». */
export function numberEn(n) {
  if (!isKnownNumber(n)) throw new RangeError(`nombre non géré : ${n}`);
  return n <= 20 ? ONES[n] : TENS[n];
}

/**
 * Le nombre que l'oreille confond avec n : treize (13) / trente (30), quatorze / quarante…
 * Renvoie null s'il n'y en a pas.
 */
export function confusableNumber(n) {
  if (n >= 13 && n <= 19) return (n - 10) * 10;
  if (n >= 30 && n <= 90) return n / 10 + 10;
  return null;
}

export const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);
