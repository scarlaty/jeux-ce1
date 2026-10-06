// Écrire les nombres (CE1, programmes 2024) : passer de l'écriture en chiffres à l'écriture
// en lettres, et inversement. L'orthographe des nombres vient de js/data/nombres-en-lettres.js,
// banque partagée vérifiée nombre par nombre.
//
// Quatre formes de questions se relaient dans une partie, pour travailler les deux sens :
//   chiffres → lettres (QCM), lettres → chiffres (QCM), lettres → chiffres (pavé numérique),
//   et « remets les morceaux dans l'ordre » pour construire le mot.
//
// Les mauvaises réponses d'un QCM sont toujours d'AUTRES nombres, correctement orthographiés :
// on ne montre jamais « quatre-vingts-deux » à une enfant qui apprend à écrire les nombres.
import { enLettres, morceaux } from '../data/nombres-en-lettres.js';

/** Borne de chaque niveau : jusqu'à 69, jusqu'à 100 (avec les pièges), jusqu'à 1000. */
const LEVEL_MAX = { 1: 69, 2: 100, 3: 1000 };

const SKILL = {
  simple: 'les nombres jusqu\'à 69',
  et: 'les nombres avec « et »',
  seventy: 'soixante-dix et au-delà',
  eighty: 'quatre-vingts et quatre-vingt-dix',
  hundreds: 'les centaines',
  thousand: 'mille',
};

/** La notion travaillée par un nombre : ce qui remonte aux parents en « à retravailler ». */
function skillOf(n) {
  if (n === 1000) return SKILL.thousand;
  if (n >= 100) return SKILL.hundreds;
  if (n >= 80) return SKILL.eighty;
  if (n >= 70) return SKILL.seventy;
  if (n >= 21 && n % 10 === 1) return SKILL.et;
  return SKILL.simple;
}

/**
 * Le nombre d'une question. Chaque niveau vise ses pièges : les dizaines régulières,
 * puis 70-99, puis les centaines et les accords de « cent ».
 */
function pickNumber(level, rng) {
  if (level === 1) return rng.int(11, 69);
  if (level === 2) {
    if (rng.chance(0.1)) return 100;
    if (rng.chance(0.75)) return rng.int(70, 99);
    return rng.int(20, 69);
  }
  if (rng.chance(0.08)) return 1000;
  if (rng.chance(0.25)) return 100 * rng.int(1, 9);                      // cent, deux-cents…
  if (rng.chance(0.4)) return 100 * rng.int(1, 9) + rng.int(70, 99);     // les pièges, dans les centaines
  return rng.int(101, 999);
}

// --- Mauvaises réponses plausibles -------------------------------------------------------------

/** Chiffres des dizaines et des unités échangés : 97 → 79, 345 → 354. */
function swapTensUnits(n) {
  if (n < 10 || n > 999) return n;
  return Math.floor(n / 100) * 100 + (n % 10) * 10 + Math.floor((n % 100) / 10);
}

/**
 * `count` autres nombres du niveau, proches de `n` : des nombres VRAIS, jamais des fautes
 * d'orthographe. Un seul voisin immédiat (196 et 197), les autres changent de dizaine ou de
 * centaine (196 et 186, 196 et 169) : il faut lire le nombre en entier, pas seulement sa fin.
 */
function confusions(n, max, rng, count = 3) {
  const keep = (list) => [...new Set(list)].filter((x) => x >= 1 && x <= max && x !== n);
  const close = keep([n + 1, n - 1, n + 2, n - 2]);
  const structural = keep([n + 10, n - 10, n + 20, n - 20, n + 100, n - 100, swapTensUnits(n)])
    .filter((x) => !close.includes(x));
  const take = (list, howMany) => rng.sample(list, Math.min(Math.max(howMany, 0), list.length));
  const picked = [...take(close, 1), ...take(structural, count - 1)];
  // Au bord de la plage, une famille peut être trop pauvre : on complète avec l'autre.
  const rest = [...close, ...structural].filter((x) => !picked.includes(x));
  return [...picked, ...take(rest, count - picked.length)];
}

// --- Corrections -------------------------------------------------------------------------------

/** L'astuce d'orthographe du nombre, s'il en a une. */
function trap(n) {
  const rest = n % 100;
  if (n === 1000) return 'Mille ne prend jamais de s.';
  if (n === 100) return 'Cent ne prend pas de s : il n\'y a qu\'une centaine.';
  if (n >= 200 && rest === 0) return 'Une centaine entière prend un s : deux-cents, trois-cents.';
  if (rest === 80) return 'Quatre-vingts, c\'est 4 fois 20 : avec un s à la fin.';
  if (rest > 80) return `${rest}, c'est 80 + ${rest - 80} : ici, quatre-vingt perd son s.`;
  if (rest === 71) return '71, c\'est 60 + 11 : soixante-et-onze.';
  if (rest >= 70) return `${rest}, c'est 60 + ${rest - 60} : on compte à partir de soixante.`;
  if (n >= 200) return 'Devant un autre nombre, cent n\'a pas de s : deux-cent-trente.';
  if (rest >= 21 && rest % 10 === 1) return 'De 21 à 61, on met « et » : vingt-et-un, trente-et-un…';
  return null;
}

/** La bonne réponse, puis l'astuce : jamais un simple « non ». */
function explainOf(n, toWords) {
  const mots = enLettres(n);
  const base = toWords ? `${n} s'écrit « ${mots} ».` : `« ${mots} », c'est ${n}.`;
  const tip = trap(n);
  return tip ? `${base} ${tip}` : base;
}

// --- Formes de questions -----------------------------------------------------------------------
// Où s'affiche le nombre ? En chiffres, il tient en gros caractères dans l'illustration
// (`display.show`). En lettres, il est bien trop long pour cette place, qui ne sait pas revenir
// à la ligne : il va alors dans la consigne, qui s'adapte à toutes les largeurs d'écran.
// Dans les deux cas, le bouton « écouter » le lit à voix haute — un soutien assumé : une enfant
// qui bloque sur la lecture doit pouvoir entendre le nombre, comme la maîtresse le lirait.

/** Chiffres → lettres : « 97 » puis quatre écritures, toutes justes mais une seule bonne. */
function digitsToWords(level, rng) {
  const n = pickNumber(level, rng);
  const others = confusions(n, LEVEL_MAX[level], rng);
  return {
    key: `ecrire-nombres:lettres:${n}`,
    type: 'choice',
    prompt: 'Touche ce nombre écrit en lettres.',
    display: {
      show: { text: String(n), speak: String(n) },
      choices: rng.shuffle([n, ...others]).map(enLettres),
    },
    answer: enLettres(n),
    explain: explainOf(n, true),
    skill: skillOf(n),
  };
}

/** Lettres → chiffres, en touchant : « quatre-vingt-dix-sept » puis quatre nombres. */
function wordsToDigits(level, rng) {
  const n = pickNumber(level, rng);
  const others = confusions(n, LEVEL_MAX[level], rng);
  return {
    key: `ecrire-nombres:chiffres:${n}`,
    type: 'choice',
    prompt: `Touche ce nombre écrit en chiffres : ${enLettres(n)}.`,
    display: { choices: rng.shuffle([n, ...others]) },
    answer: n,
    explain: explainOf(n, false),
    skill: skillOf(n),
  };
}

/** Lettres → chiffres, en écrivant : le pavé numérique, sans choix proposé. */
function writeDigits(level, rng) {
  const n = pickNumber(level, rng);
  return {
    key: `ecrire-nombres:pavé:${n}`,
    type: 'keypad',
    prompt: `Écris ce nombre en chiffres : ${enLettres(n)}.`,
    display: { maxLength: String(LEVEL_MAX[level]).length },
    answer: n,
    explain: explainOf(n, false),
    skill: skillOf(n),
  };
}

/** Liste mélangée qui n'est pas déjà dans l'ordre attendu. */
function shuffledNotSorted(rng, sorted) {
  let items;
  do { items = rng.shuffle(sorted); } while (items.every((x, i) => x === sorted[i]));
  return items;
}

/** Les morceaux du nombre à remettre dans l'ordre : quatre + vingt + dix + sept = 97. */
function assemble(level, rng) {
  let n;
  let pieces;
  do {
    n = pickNumber(level, rng);
    pieces = morceaux(n);
  } while (pieces.length < 2);   // « trente » ou « seize » n'ont rien à ranger
  return {
    key: `ecrire-nombres:ordre:${n}`,
    type: 'order',
    prompt: 'Range les morceaux dans l\'ordre pour écrire ce nombre en lettres.',
    display: { show: { text: String(n), speak: String(n) }, items: shuffledNotSorted(rng, pieces) },
    answer: pieces,
    explain: explainOf(n, true),
    skill: skillOf(n),
  };
}

// --- Déroulé d'une partie ----------------------------------------------------------------------

const FORMS = [digitsToWords, wordsToDigits, writeDigits, assemble];

// L'ordre des formes est tiré au premier appel et retrouvé grâce à `seen` (un Set propre à
// chaque partie) : les nouveaux essais pour éviter un doublon gardent la même forme.
const decks = new WeakMap();

function deckFor(level, rng, seen) {
  const saved = decks.get(seen);
  if (saved && saved.level === level) return saved.deck;
  const deck = rng.shuffle(FORMS);
  decks.set(seen, { level, deck });
  return deck;
}

export default {
  id: 'ecrire-nombres',
  title: 'Écrire les nombres',
  island: 'nombres',
  subject: 'maths',
  issue: 50,
  skills: [
    'Lire et écrire les nombres entiers jusqu\'à 1000, en chiffres et en lettres',
    'Connaître les pièges : soixante-dix, quatre-vingts, quatre-vingt-dix',
    'Accorder « cent » et laisser « mille » invariable',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'Jusqu\'à 69 : vingt-et-un, trente-deux, soixante-neuf' },
    { label: 'Niveau 2', hint: 'Jusqu\'à 100 : soixante-dix, quatre-vingts, quatre-vingt-dix' },
    { label: 'Niveau 3', hint: 'Jusqu\'à 1000 : cent, deux-cents, trois-cent-quarante' },
  ],
  makeQuestion(level, rng, seen) {
    if (!seen) return rng.pick(FORMS)(level, rng);
    const deck = deckFor(level, rng, seen);
    return deck[seen.size % deck.length](level, rng);
  },
};
