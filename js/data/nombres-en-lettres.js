// Nombres écrits en lettres, en orthographe rectifiée de 1990 : des traits d'union partout,
// entre tous les mots du nombre (« deux-cent-trente », « vingt-et-un », « soixante-et-onze »).
//
// Banque partagée, sans DOM et sans état : le jeu « Écrire les nombres » s'en sert, mais aussi
// (à venir) la tirelire, les mesures et la droite graduée. Tout est vérifié par
// tests/data/nombres-en-lettres.test.js, qui convertit TOUS les entiers de la plage.
//
// Les accords, en un coup d'œil :
//   80 → quatre-vingts (s)        81 → quatre-vingt-un (ni s ni « et »)
//   71 → soixante-et-onze         91 → quatre-vingt-onze
//   200 → deux-cents (s)          201 → deux-cent-un (pas de s devant un autre nombre)
//   100 → cent (jamais « un-cent ») ; 1000 → mille, invariable.

/** Plus grand nombre converti (le CE1 s'arrête à 1000 ; la marge sert aux autres jeux). */
export const MAX = 9999;

// 0 à 16 : des mots à part entière. Au-delà, tout se construit.
const SMALL = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
];

// Dizaines « régulières » (ni 70 ni 90, qui se comptent à partir de 60 et de 80).
const TENS = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante', 8: 'quatre-vingt' };

/** 0 à 99. */
function under100(n) {
  if (n < 17) return SMALL[n];
  if (n < 20) return `dix-${SMALL[n - 10]}`;
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  // 70 à 79 et 90 à 99 : « soixante » ou « quatre-vingt », puis 10 à 19.
  if (ten === 7 || ten === 9) {
    const base = ten === 7 ? 60 : 80;
    if (n === 71) return 'soixante-et-onze';
    return `${ten === 7 ? 'soixante' : 'quatre-vingt'}-${under100(n - base)}`;
  }
  if (unit === 0) return ten === 8 ? 'quatre-vingts' : TENS[ten];
  // « et » de 21 à 61, jamais à 81 (quatre-vingt-un).
  if (unit === 1 && ten !== 8) return `${TENS[ten]}-et-un`;
  return `${TENS[ten]}-${SMALL[unit]}`;
}

/** 0 à 999. « cent » prend un s seulement s'il est multiplié ET final : deux-cents, deux-cent-un. */
function under1000(n) {
  if (n < 100) return under100(n);
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (rest === 0) return hundred === 1 ? 'cent' : `${SMALL[hundred]}-cents`;
  const head = hundred === 1 ? 'cent' : `${SMALL[hundred]}-cent`;
  return `${head}-${under100(rest)}`;
}

/**
 * Un entier de 0 à MAX, écrit en lettres (orthographe rectifiée).
 * Lève une RangeError hors de la plage : une question fausse doit casser les tests, pas l'écran.
 */
export function enLettres(n) {
  if (!Number.isInteger(n) || n < 0 || n > MAX) {
    throw new RangeError(`enLettres(): ${n} n'est pas un entier de 0 à ${MAX}`);
  }
  if (n < 1000) return under1000(n);
  const thousand = Math.floor(n / 1000);
  const rest = n % 1000;
  const head = thousand === 1 ? 'mille' : `${SMALL[thousand]}-mille`;   // « mille » est invariable
  return rest === 0 ? head : `${head}-${under1000(rest)}`;
}

/**
 * Les mots d'un nombre, un par un : 97 → ['quatre', 'vingt', 'dix', 'sept'].
 * Sert aux questions « remets les morceaux dans l'ordre ».
 */
export function morceaux(n) {
  return enLettres(n).split('-');
}

// Table inverse, construite une seule fois et seulement si on en a besoin.
let index = null;

/** Texte comparable : minuscules, forme Unicode unique, apostrophes et espaces uniformisés. */
function normalize(text) {
  return String(text).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Fonction inverse : « deux-cent-trente » → 230. Renvoie null si le texte n'est pas
 * un nombre écrit correctement (c'est le cas d'une faute d'orthographe).
 */
export function enChiffres(mots) {
  if (!index) {
    index = new Map();
    for (let n = 0; n <= MAX; n++) index.set(enLettres(n), n);
  }
  const found = index.get(normalize(mots));
  return found === undefined ? null : found;
}
