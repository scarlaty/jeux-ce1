// Colors and numbers (CE1, programmes 2024, langues vivantes, niveau A1) : comprendre à l'oral les
// couleurs et les nombres en anglais. L'ÉCOUTE est centrale : l'enfant de 7 ans lit peu l'anglais.
//
// Formes de questions (voir la banque js/data/anglais.js) :
//   color    : on entend une couleur, on touche la bonne pastille ;
//   number   : on entend un nombre, on touche le bon chiffre ;
//   count    : on entend « three apples » (niveau 2 : « three red apples »), on touche la bonne image ;
//   colorWord: on lit un mot (avec bouton « écouter »), on touche la bonne pastille ;
//   wordNumber / numberWord : on associe un nombre écrit en anglais et son chiffre, dans les deux sens ;
//   sentence : « I have two blue balloons », entendue ou lue, et l'image qui correspond.
//
// Les questions à l'écoute portent `lang: 'en-GB'` et `listenOnly` : sans voix anglaise sur
// l'appareil, l'écran écrit le texte à lire (voir noVoiceNote dans screens/play.js).
// Les pièges sont voulus mais jamais ambigus : treize / trente, quatorze / quarante… se
// distinguent à l'oreille (« -teen » / « -ty ») ET par des chiffres bien lisibles.
import {
  COLORS, THINGS, getColor, colorsOf, colorFr, thingsFr, thingsEn, numberEn,
  confusableNumber, capital,
} from '../data/anglais.js';

const ID = 'colors-numbers';
const LISTEN = { lang: 'en-GB', listenOnly: true, listenLabel: 'Écouter en anglais' };

/** Couleurs du niveau 1 : les plus vives ; les neuf autres arrivent au niveau 2. */
const FIRST_COLORS = ['red', 'blue', 'yellow', 'green', 'orange', 'pink'];
const ALL_COLORS = COLORS.map((c) => c.id);

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TENS = [20, 30, 40, 50, 60, 70, 80, 90, 100];
/** Les nombres que l'on peut entendre, par niveau (1 à 10, 1 à 20, puis 1 à 20 et les dizaines). */
const NUMBERS = { 1: range(1, 10), 2: range(1, 20), 3: [...range(1, 20), ...TENS.slice(1)] };
/** Nombre maximal d'objets à compter, par niveau. */
const MAX_COUNT = { 1: 5, 2: 6, 3: 8 };

// --- Nombres -------------------------------------------------------------------------------------

function pickNumber(level, rng) {
  if (level === 1) return rng.int(1, 10);
  if (level === 2) return rng.chance(0.55) ? rng.int(11, 20) : rng.int(1, 10);
  if (rng.chance(0.4)) return rng.int(13, 19);
  if (rng.chance(0.75)) return rng.pick(TENS);
  return rng.int(1, 12);
}

function numberSkill(n) {
  if (n <= 10) return 'nombres de 1 à 10 en anglais';
  if (n <= 20) return 'nombres de 11 à 20 en anglais';
  return 'dizaines en anglais';
}

/** Trois autres nombres : d'abord celui que l'oreille confond (13 / 30), puis les voisins. */
function otherNumbers(n, pool, rng, count = 3) {
  const confusable = confusableNumber(n);
  const picked = confusable !== null && pool.includes(confusable) ? [confusable] : [];
  const near = [n - 1, n + 1, n - 10, n + 10].filter((d) => pool.includes(d) && !picked.includes(d));
  for (const d of rng.shuffle(near)) if (picked.length < 2) picked.push(d);
  const rest = rng.shuffle(pool.filter((d) => d !== n && !picked.includes(d)));
  return [...picked, ...rest].slice(0, count);
}

/** « Thirteen, c'est 13. » + le piège entre -teen et -ty quand il est proposé. */
function numberExplain(n, others) {
  const word = numberEn(n);
  const base = `${capital(word)}, c'est ${n}.`;
  const confusable = confusableNumber(n);
  if (confusable === null || !others.includes(confusable)) return base;
  const ending = n >= 13 && n <= 19 ? '« teen »' : '« ty »';
  return `${base} On entend ${ending} à la fin de ${word}. ${capital(numberEn(confusable))}, c'est ${confusable}.`;
}

function numberQuestion(level, rng) {
  const n = pickNumber(level, rng);
  const others = otherNumbers(n, NUMBERS[level], rng);
  return {
    key: `${ID}:nombre:${n}`,
    type: 'choice',
    prompt: 'Écoute, puis touche le bon nombre.',
    speak: numberEn(n),
    ...LISTEN,
    display: { choices: rng.shuffle([n, ...others]), large: true },
    answer: n,
    explain: numberExplain(n, others),
    skill: numberSkill(n),
  };
}

/** Un nombre écrit en anglais (avec bouton « écouter ») : on touche le chiffre. */
function wordToNumberQuestion(level, rng) {
  const n = pickNumber(level, rng);
  const others = otherNumbers(n, NUMBERS[level], rng);
  const word = numberEn(n);
  return {
    key: `${ID}:mot-chiffre:${n}`,
    type: 'choice',
    prompt: 'Lis le mot, puis touche le bon nombre.',
    display: {
      show: { text: word, lang: 'en-GB', speak: word },
      choices: rng.shuffle([n, ...others]),
      large: true,
    },
    answer: n,
    explain: numberExplain(n, others),
    skill: 'lire les nombres en anglais',
  };
}

/** Un chiffre : on touche son écriture en anglais. */
function numberToWordQuestion(level, rng) {
  const n = pickNumber(level, rng);
  const others = otherNumbers(n, NUMBERS[level], rng);
  const word = numberEn(n);
  return {
    key: `${ID}:chiffre-mot:${n}`,
    type: 'choice',
    prompt: 'Touche le mot qui correspond à ce nombre.',
    display: {
      show: { text: String(n) },
      choices: rng.shuffle([n, ...others]).map((d) => ({ value: numberEn(d), text: numberEn(d), lang: 'en-GB' })),
    },
    answer: word,
    explain: numberExplain(n, others),
    skill: 'lire les nombres en anglais',
  };
}

// --- Couleurs ------------------------------------------------------------------------------------

const swatch = (id) => ({ value: id, art: { kind: 'colored', shape: 'swatch', color: id }, label: colorFr(id) });
const colorExplain = (id) => `${capital(getColor(id).en)}, c'est ${colorFr(id)}.`;

/** On entend la couleur : on touche la bonne pastille. */
function colorQuestion(level, rng) {
  const ids = level === 1 ? FIRST_COLORS : ALL_COLORS;
  const right = rng.pick(ids);
  const others = rng.sample(ids.filter((id) => id !== right), 3);
  return {
    key: `${ID}:couleur:${right}`,
    type: 'choice',
    prompt: 'Écoute, puis touche la bonne couleur.',
    speak: right,
    ...LISTEN,
    display: { choices: rng.shuffle([right, ...others]).map(swatch) },
    answer: right,
    explain: colorExplain(right),
    skill: 'couleurs en anglais',
  };
}

/** Le mot est écrit (avec bouton « écouter ») : on touche la bonne pastille. */
function colorWordQuestion(level, rng) {
  const right = rng.pick(ALL_COLORS);
  const others = rng.sample(ALL_COLORS.filter((id) => id !== right), 3);
  return {
    key: `${ID}:mot-couleur:${right}`,
    type: 'choice',
    prompt: 'Lis le mot, puis touche la bonne couleur.',
    display: {
      show: { text: right, lang: 'en-GB', speak: right },
      choices: rng.shuffle([right, ...others]).map(swatch),
    },
    answer: right,
    explain: colorExplain(right),
    skill: 'couleurs en anglais',
  };
}

// --- Compter des objets ------------------------------------------------------------------------

const piles = (thing, color, count) => ({ kind: 'colored', shape: thing, color, count });
const pileChoice = (thing, color, count) => ({
  value: `${count}-${color}`,
  art: piles(thing, color, count),
  label: thingsFr({ thing, color, count }),
});

/** Deux autres quantités, proches de la bonne (un enfant qui compte vite se trompe de 1 ou 2). */
function otherCounts(n, max, rng) {
  const near = [n - 2, n - 1, n + 1, n + 2].filter((c) => c >= 1 && c <= max);
  const others = rng.shuffle(near).slice(0, 2);
  if (others.length < 2) others.push(...rng.shuffle(range(1, max).filter((c) => c !== n && !others.includes(c))).slice(0, 2 - others.length));
  return others;
}

/** Niveau 1 : seul le nombre compte, les quatre images ont la même couleur. */
function countQuestion(rng) {
  const thing = rng.pick(THINGS);
  const color = rng.pick(colorsOf(thing.id).filter((id) => FIRST_COLORS.includes(id)));
  const n = rng.int(1, MAX_COUNT[1]);
  const counts = [n, ...rng.sample(range(1, MAX_COUNT[1]).filter((c) => c !== n), 3)];
  return {
    key: `${ID}:compte:${thing.id}:${n}`,
    type: 'choice',
    prompt: 'Écoute, puis touche l\'image qui correspond.',
    speak: `${numberEn(n)} ${n > 1 ? thing.enPlural : thing.en}`,
    ...LISTEN,
    display: { choices: rng.shuffle(counts).map((c) => pileChoice(thing.id, color, c)) },
    answer: `${n}-${color}`,
    explain: `${capital(numberEn(n))} ${n > 1 ? thing.enPlural : thing.en} : ${n} ${n > 1 ? thing.frPlural : thing.fr}.`,
    skill: 'écoute et compte',
  };
}

/**
 * Niveaux 2 et 3 : le nombre ET la couleur comptent. Les trois mauvaises images se trompent chacune
 * d'une seule chose (la couleur, le nombre) ou des deux : jamais deux images identiques.
 */
function colorCountScene(level, rng) {
  const thing = rng.pick(THINGS);
  const colors = colorsOf(thing.id);
  const color = rng.pick(colors);
  const otherColors = rng.sample(colors.filter((c) => c !== color), 2);
  const n = rng.int(1, MAX_COUNT[level]);
  const [m1, m2] = otherCounts(n, MAX_COUNT[level], rng);
  const choices = rng.shuffle([
    pileChoice(thing.id, color, n),
    pileChoice(thing.id, otherColors[0], n),
    pileChoice(thing.id, color, m1),
    pileChoice(thing.id, otherColors[1], m2),
  ]);
  return { thing, color, n, choices, spec: { thing: thing.id, color, count: n } };
}

function countColorQuestion(level, rng) {
  const { thing, color, n, choices, spec } = colorCountScene(level, rng);
  return {
    key: `${ID}:compte-couleur:${thing.id}:${color}:${n}`,
    type: 'choice',
    prompt: 'Écoute, puis touche l\'image qui correspond.',
    speak: thingsEn(spec),
    ...LISTEN,
    display: { choices },
    answer: `${n}-${color}`,
    explain: `« ${capital(thingsEn(spec))} », c'est ${thingsFr(spec)}.`,
    skill: 'écoute et compte',
  };
}

/** « I have two blue balloons. », entendue (niveau 3) ou lue avec bouton « écouter ». */
function sentenceQuestion(level, rng, { written }) {
  const { thing, color, n, choices, spec } = colorCountScene(level, rng);
  const sentence = `I have ${thingsEn(spec)}.`;
  return {
    key: `${ID}:phrase${written ? '-lue' : ''}:${thing.id}:${color}:${n}`,
    type: 'choice',
    prompt: written ? 'Lis la phrase, puis touche l\'image qui correspond.' : 'Écoute la phrase, puis touche l\'image qui correspond.',
    ...(written ? {} : { speak: sentence, ...LISTEN }),
    display: {
      ...(written ? { show: { text: sentence, lang: 'en-GB', speak: sentence } } : {}),
      choices,
    },
    answer: `${n}-${color}`,
    explain: `« ${sentence.slice(0, -1)} » veut dire « j'ai ${thingsFr(spec)} ».`,
    skill: 'phrases « I have… »',
  };
}

// --- Le jeu --------------------------------------------------------------------------------------

// Une forme par entrée ; une forme répétée tombe plus souvent.
const FORMS = {
  1: [colorQuestion, colorQuestion, numberQuestion, numberQuestion, (l, rng) => countQuestion(rng)],
  2: [numberQuestion, numberQuestion, colorQuestion, colorWordQuestion, colorWordQuestion, countColorQuestion, countColorQuestion],
  3: [
    numberQuestion, numberQuestion, wordToNumberQuestion, wordToNumberQuestion, numberToWordQuestion, numberToWordQuestion,
    (l, rng) => sentenceQuestion(l, rng, { written: false }),
    (l, rng) => sentenceQuestion(l, rng, { written: false }),
    (l, rng) => sentenceQuestion(l, rng, { written: true }),
  ],
};

export default {
  id: ID,
  title: 'Colors and numbers',
  island: 'ailleurs',
  subject: 'anglais',
  issue: 76,
  skills: [
    'Comprendre à l\'oral les couleurs en anglais',
    'Comprendre à l\'oral les nombres de 1 à 20, puis les dizaines, en anglais',
    'Comprendre une phrase simple en anglais (« I have two blue balloons »)',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'couleurs, nombres de 1 à 10' },
    { label: 'Niveau 2', hint: 'jusqu\'à 20, mots écrits, écoute et compte' },
    { label: 'Niveau 3', hint: 'dizaines, phrases « I have… »' },
  ],
  makeQuestion(level, rng) {
    return rng.pick(FORMS[level])(level, rng);
  },
};
