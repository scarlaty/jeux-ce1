// Syllabes en folie (CE1, programmes 2024) : compter les syllabes d'un mot, reconstituer un mot
// à partir de ses syllabes, trouver la première ou la dernière syllabe.
// Les mots et leur découpage viennent de js/data/syllabes.js, qui explique la CONVENTION suivie :
// celle des manuels de CE1, en syllabes écrites (« tomate » = to-ma-te). On ne fait compter
// à l'oreille, ou chercher la dernière syllabe, que des mots où l'on entend exactement les
// syllabes écrites ; les mots à « e » muet ne servent qu'à remettre des syllabes dans l'ordre.
//
// Cinq formes de questions :
//   compter : « Combien de syllabes dans « lapin » ? » (1, 2, 3…) ;
//   image   : quatre images avec leur mot, une seule a le nombre de syllabes demandé ;
//   ordre   : remettre les syllabes dans l'ordre pour écrire le mot de l'image ;
//   debut   : la première syllabe du mot ;
//   fin     : la dernière syllabe du mot.
import { SYLLABLE_WORDS, isTransparent, endsWithQuietE, onsetSound, cutOf } from '../data/syllabes.js';

const quote = (word) => `« ${word} »`;
const count = (w) => w.syllables.length;
const plural = (n) => `${n} syllabe${n > 1 ? 's' : ''}`;
const hasRepeat = (w) => new Set(w.syllables).size !== w.syllables.length;

const CLEAR = SYLLABLE_WORDS.filter(isTransparent);

/** Ce que chaque niveau demande : nombres de syllabes et réponses proposées au comptage. */
const LEVELS = {
  1: { count: [1, 2, 3], answers: [1, 2, 3], order: [2], start: [2], end: [2], picture: [1, 2, 3] },
  2: { count: [1, 2, 3], answers: [1, 2, 3, 4], order: [3], start: [2, 3], end: [2, 3], picture: [1, 2, 3] },
  3: { count: [2, 3, 4], answers: [1, 2, 3, 4, 5], order: [3, 4, 5], start: [3, 4], end: [3, 4], picture: [2, 3, 4] },
};

const sized = (list, sizes) => list.filter((w) => sizes.includes(count(w)));

/**
 * Un mot de la liste, en tirant d'abord sa longueur : sinon les mots de 2 syllabes, bien plus
 * nombreux, écraseraient les longs mots, qui sont l'enjeu des niveaux 2 et 3.
 */
function pickWord(list, rng) {
  const size = rng.pick([...new Set(list.map(count))]);
  return rng.pick(list.filter((w) => count(w) === size));
}

/** Rappel de la convention, quand le mot finit par un « e » qu'on n'entend presque pas. */
const silentNote = (w) => (endsWithQuietE(w.syllables.at(-1))
  ? ' Le e de la fin s\'entend à peine, mais à l\'écrit il forme une syllabe.'
  : '');

// Les mots de chaque forme, niveau par niveau.
const POOLS = Object.fromEntries(Object.entries(LEVELS).map(([level, rule]) => [level, {
  count: sized(CLEAR, rule.count),
  picture: sized(CLEAR.filter((w) => w.emoji), rule.picture),
  // Niveau 1 : seulement des mots sans « e » muet ; ensuite, la convention écrite entre en jeu.
  order: sized((level === '1' ? CLEAR : SYLLABLE_WORDS).filter((w) => w.emoji && !hasRepeat(w)), rule.order),
  // La première syllabe doit s'entendre telle qu'elle s'écrit : pas « che » de « cheval ».
  start: sized((level === '1' ? CLEAR : SYLLABLE_WORDS).filter((w) => !endsWithQuietE(w.syllables[0])), rule.start),
  // La dernière syllabe n'est demandée que si elle s'entend telle qu'elle s'écrit.
  end: sized(SYLLABLE_WORDS.filter((w) => !endsWithQuietE(w.syllables.at(-1))), rule.end),
}]));

/** Les syllabes qui peuvent servir de mauvaise réponse : toutes celles qui s'entendent. */
const DECOYS = [...new Set(SYLLABLE_WORDS.flatMap((w) => w.syllables))]
  .filter((s) => !endsWithQuietE(s));

/**
 * Trois syllabes qui commencent par un autre son que `right` : impossible de les confondre
 * à l'oreille avec la bonne (« ca » et « ko » commencent par le même son : jamais ensemble).
 */
function decoysFor(right, rng) {
  const onset = onsetSound(right);
  const pool = DECOYS.filter((s) => onsetSound(s) !== onset);
  const picked = [];
  for (const s of rng.shuffle(pool)) {
    if (picked.every((p) => onsetSound(p) !== onsetSound(s))) picked.push(s);
    if (picked.length === 3) break;
  }
  return picked;
}

/** L'illustration commune : l'image (s'il y en a une), le mot écrit et le bouton « écouter ». */
const showWord = (w) => ({ emoji: w.emoji || undefined, text: w.word, cursive: true, speak: w.word });

// --- Les cinq formes de questions --------------------------------------------------------------

function countQuestion(level, rng) {
  const w = pickWord(POOLS[level].count, rng);
  return {
    key: `syllabes:compter:${w.word}`,
    type: 'choice',
    prompt: `Combien de syllabes entends-tu dans ${quote(w.word)} ?`,
    speak: `Combien de syllabes entends-tu dans le mot ${w.word} ?`,
    display: { show: showWord(w), choices: LEVELS[level].answers },
    answer: count(w),
    explain: `${quote(w.word)} : ${cutOf(w)}. Il y a ${plural(count(w))}.`,
    skill: 'compter les syllabes',
  };
}

function pictureQuestion(level, rng) {
  const pool = POOLS[level].picture;
  const target = rng.pick(LEVELS[level].picture);
  const right = rng.pick(pool.filter((w) => count(w) === target));
  const others = rng.sample(pool.filter((w) => count(w) !== target), 3);
  const choices = rng.shuffle([right, ...others])
    .map((w) => ({ value: w.word, emoji: w.emoji, text: w.word, label: w.word }));
  return {
    key: `syllabes:image:${target}:${right.word}`,
    type: 'choice',
    prompt: `Touche le mot qui a ${plural(target)}.`,
    speak: `Touche le mot qui a ${plural(target)}.`,
    display: { choices, cursive: true },
    answer: right.word,
    explain: `${quote(right.word)} : ${cutOf(right)}, ${plural(target)}. `
      + others.map((w) => `${cutOf(w)} : ${count(w)}`).join(' ; ') + '.',
    skill: 'compter les syllabes',
  };
}

function orderQuestion(level, rng) {
  const w = pickWord(POOLS[level].order, rng);
  let items;
  do { items = rng.shuffle(w.syllables); } while (items.every((s, i) => s === w.syllables[i]));
  return {
    key: `syllabes:ordre:${w.word}`,
    type: 'order',
    prompt: 'Range les syllabes dans l\'ordre pour écrire le mot de l\'image.',
    speak: `Range les syllabes dans l'ordre pour écrire le mot ${w.word}.`,
    display: { show: { emoji: w.emoji, speak: w.word }, items, cursive: true },
    answer: [...w.syllables],
    explain: `${quote(w.word)} s'écrit en ${plural(count(w))} : ${cutOf(w)}.${silentNote(w)}`,
    skill: 'reconstituer un mot avec ses syllabes',
  };
}

function edgeQuestion(level, rng, which) {
  const first = which === 'debut';
  const w = pickWord(POOLS[level][first ? 'start' : 'end'], rng);
  const right = first ? w.syllables[0] : w.syllables.at(-1);
  const where = first ? 'la première' : 'la dernière';
  return {
    key: `syllabes:${which}:${w.word}`,
    type: 'choice',
    prompt: `Touche ${where} syllabe du mot ${quote(w.word)}.`,
    speak: `Touche ${where} syllabe du mot ${w.word}.`,
    display: { show: showWord(w), choices: rng.shuffle([right, ...decoysFor(right, rng)]), cursive: true },
    answer: right,
    explain: `${quote(w.word)} : ${cutOf(w)}. Le mot ${first ? 'commence' : 'finit'} par ${quote(right)}.${silentNote(w)}`,
    skill: first ? 'trouver la première syllabe' : 'trouver la dernière syllabe',
  };
}

// --- Déroulé d'une partie ----------------------------------------------------------------------

const MAKERS = {
  compter: countQuestion,
  image: pictureQuestion,
  ordre: orderQuestion,
  debut: (level, rng) => edgeQuestion(level, rng, 'debut'),
  fin: (level, rng) => edgeQuestion(level, rng, 'fin'),
};

/** Dix questions par partie : le niveau 1 compte et assemble, les suivants cherchent la fin. */
const FORMS = {
  1: ['compter', 'compter', 'compter', 'image', 'ordre', 'ordre', 'ordre', 'debut', 'debut', 'debut'],
  2: ['compter', 'compter', 'image', 'image', 'ordre', 'ordre', 'ordre', 'debut', 'fin', 'fin'],
  3: ['compter', 'compter', 'image', 'image', 'ordre', 'ordre', 'ordre', 'debut', 'fin', 'fin'],
};

// Comme dans « Les sons » : le paquet d'une partie est retrouvé grâce à `seen`, propre à la
// partie, pour que les nouveaux essais (doublon) gardent la même forme.
const decks = new WeakMap();

function deckFor(level, rng, seen) {
  const saved = decks.get(seen);
  if (saved && saved.level === level) return saved.deck;
  const deck = rng.shuffle(FORMS[level]);
  decks.set(seen, { level, deck });
  return deck;
}

export default {
  id: 'syllabes',
  title: 'Syllabes en folie',
  island: 'mots',
  subject: 'français',
  issue: 23,
  skills: [
    'Segmenter un mot en syllabes',
    'Reconstituer un mot à partir de ses syllabes',
    'Repérer la première et la dernière syllabe d\'un mot',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'Mots de 1 à 3 syllabes' },
    { label: 'Niveau 2', hint: 'Mots de 3 syllabes, dernière syllabe' },
    { label: 'Niveau 3', hint: 'Mots de 3 à 5 syllabes' },
  ],
  makeQuestion(level, rng, seen) {
    if (!seen) return MAKERS[rng.pick(FORMS[level])](level, rng);
    const deck = deckFor(level, rng, seen);
    return MAKERS[deck[seen.size % deck.length]](level, rng);
  },
};
