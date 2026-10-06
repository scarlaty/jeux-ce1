// Les lettres qui changent de son (CE1, programmes 2024) : c/ç, g/gu/ge, s/ss, m devant m, b, p.
//
// Trois formes de questions :
//   same : « Le c de « citron » fait le même son que dans… » (deux mots-repères illustrés) ;
//   find : « Touche le mot où le c chante comme dans « serpent » » (trois mots illustrés) ;
//   gap  : « Complète le mot : c ou ç ? » (« gar_on »), et son pendant `ecrit` (« garçon / garcon »).
//
// Pour ne jamais avoir deux bonnes réponses :
//   - un mot ne sert à une question de son que s'il ne contient QU'UNE seule fois la lettre
//     demandée (ou plusieurs fois avec le même son), et pas dans « ch », « gn » ;
//   - dans un trou, l'autre graphie ne fait JAMAIS un vrai mot (« poison/poisson », « cousin/coussin »,
//     « croisant/croissant », « rose/rosse » sont donc écartés) : les tests le vérifient ;
//   - un mot sans image porte une courte devinette (`clue`), pour que l'enfant sache de quel mot il s'agit.
// On nomme un son par un mot-repère (« comme dans serpent »), jamais par un symbole phonétique.
import { findSyllableWord } from '../data/syllabes.js';
import { findWord } from '../data/mots-illustres.js';

// --- Les règles (utilisées pour fabriquer les corrections et vérifiées par les tests) ---------------

const strip = (ch) => ch.normalize('NFD')[0].toLowerCase();
const isVowel = (ch) => 'aeiouy'.includes(strip(ch));
const isSoft = (ch) => 'eiy'.includes(strip(ch));

/** Le son d'un c ou d'un g selon la lettre qui le suit : k, s (pour c), g, j (pour g). */
export function soundOf(letter, next) {
  if (letter === 'c') return isSoft(next) ? 's' : 'k';
  return isSoft(next) ? 'j' : 'g';
}

/** Le son d'un s : au début du mot [s], entre deux voyelles [z], sinon [s]. `ss` : toujours [s]. */
export function soundOfS(before, after) {
  return before && isVowel(before) && isVowel(after) ? 'z' : 's';
}

/** Mot-repère de chaque son : image + mot, reconnaissables par une enfant de 7 ans. */
export const REFS = {
  k: { word: 'kiwi', emoji: '🥝' },
  s: { word: 'serpent', emoji: '🐍' },
  g: { word: 'gâteau', emoji: '🎂' },
  j: { word: 'girafe', emoji: '🦒' },
  z: { word: 'zèbre', emoji: '🦓' },
};

// Les deux sons possibles de chaque lettre (le premier est le plus fréquent).
const SOUNDS_OF = { c: ['k', 's'], g: ['g', 'j'], s: ['s', 'z'] };

// --- La banque des questions de son -----------------------------------------------------------------
// Chaque mot est dans la banque illustrée (image), contient la lettre une seule fois, hors ch/gn.
// Sont écartés : cactus, crocodile, concombre (deux c), cochon, cloche, chocolat (ch), souris (s final muet).

const SOUND_GROUPS = [
  { letter: 'c', sound: 'k', words: 'avocat brocoli tracteur écureuil licorne escargot couteau cadeau canard camion coq cuillère couronne coquillage' },
  { letter: 'c', sound: 's', words: 'citron cygne pinceau ciseaux cerise glace citrouille' },
  { letter: 'g', sound: 'g', words: 'gant gorille escargot dragon kangourou grenouille glace tigre' },
  { letter: 'g', sound: 'j', words: 'singe orange fromage coquillage' },
  { letter: 's', sound: 's', words: 'soleil savon sapin singe' },
  { letter: 's', sound: 'z', words: 'maison oiseau raisin fraise valise rose chaise' },
  { letter: 'ss', sound: 's', words: 'croissant poisson poussin chaussette chaussure' },
];

const imageOf = (word) => findSyllableWord(word)?.emoji ?? findWord(word)?.emoji ?? null;

/** Position de la lettre (ou du « ss ») dans le mot. */
const positionOf = (letter, word) => word.indexOf(letter);

export const SOUND_ENTRIES = SOUND_GROUPS.flatMap(({ letter, sound, words }) => (
  words.split(/\s+/).map((word) => Object.freeze({ letter, sound, word, emoji: imageOf(word), at: positionOf(letter, word) }))
));

const soundEntries = (letters) => SOUND_ENTRIES.filter((e) => letters.includes(e.letter));

// --- La banque des trous (graphies) ------------------------------------------------------------------
// « gar[ç]on » : la graphie juste entre crochets ; `wrong` : l'autre graphie du même couple.
// `clue` : devinette pour les mots sans image.

const KINDS = {
  cedille: { pair: ['ç', 'c'], label: 'c ou ç ?', skill: 'c ou ç' },
  gu: { pair: ['gu', 'g'], label: 'g ou gu ?', skill: 'g ou gu' },
  ge: { pair: ['ge', 'g'], label: 'g ou ge ?', skill: 'g ou ge' },
  m: { pair: ['m', 'n'], label: 'm ou n ?', skill: 'm devant m, b, p' },
  s: { pair: ['s', 'ss'], label: 's ou ss ?', skill: 's ou ss' },
};

const GAP_RAW = [
  ['cedille', 'gar[ç]on', 'Le contraire d\'une fille.'],
  ['cedille', 'le[ç]on', 'Ce que la maîtresse t\'apprend en classe.'],
  ['cedille', 'ma[ç]on', 'Il construit les murs des maisons.'],
  ['cedille', 'gla[ç]on'],
  ['cedille', 'hame[ç]on', 'Le petit crochet de la ligne du pêcheur.'],
  ['cedille', 'balan[ç]oire', 'Au jardin, on s\'assoit dessus pour se balancer.'],
  ['gu', '[gu]itare'],
  ['gu', 'ba[gu]e'],
  ['gu', '[gu]êpe', 'Un insecte jaune et noir qui pique.'],
  ['gu', '[gu]irlande', 'On l\'accroche au sapin de Noël.'],
  ['gu', 'ba[gu]ette', 'Un long pain croustillant.'],
  ['ge', 'pi[ge]on', 'Un oiseau gris qui vit en ville.'],
  ['ge', 'na[ge]oire', 'Le poisson en a pour nager.'],
  ['ge', 'plon[ge]on', 'Sauter dans l\'eau la tête la première.'],
  ['ge', 'man[ge]oire', 'On y met des graines pour les oiseaux.'],
  ['m', 'ja[m]be'],
  ['m', 'ta[m]bour'],
  ['m', 'cha[m]pignon'],
  ['m', 'conco[m]bre'],
  ['m', 'a[m]poule'],
  ['m', 'a[m]bulance'],
  ['m', 'po[m]pier', 'Il éteint les incendies.'],
  ['m', 'cha[m]bre', 'La pièce où l\'on dort.'],
  ['m', 'ti[m]bre', 'On le colle sur une lettre pour la poster.'],
  ['m', 'tro[m]pette', 'Un instrument de musique en cuivre, qu\'on souffle.'],
  ['m', 'po[m]me', 'Un fruit rond, rouge ou vert.'],
  ['s', 'mai[s]on'],
  ['s', 'rai[s]in'],
  ['s', 'frai[s]e'],
  ['s', 'vali[s]e'],
  ['s', 'chai[s]e'],
  ['s', 'oi[s]eau'],
  ['s', 'ceri[s]e'],
  ['s', 'pou[ss]in'],
  ['s', 'chau[ss]ette'],
  ['s', 'chau[ss]ure'],
];

function parseGap([kind, token, clue]) {
  const m = /^(.*)\[(.+)\](.*)$/.exec(token);
  const [, before, right, after] = m;
  const [a, b] = KINDS[kind].pair;
  // Pour s/ss : la bonne graphie peut être l'une ou l'autre, la fausse est l'autre.
  const wrong = right === a ? b : a;
  const word = before + right + after;
  return Object.freeze({
    kind,
    word,
    before,
    right,
    wrong,
    after,
    gap: `${before}_${after}`,
    wrongWord: before + wrong + after,
    emoji: imageOf(word),
    clue: clue || null,
  });
}

export const GAP_ENTRIES = GAP_RAW.map(parseGap);

const gapEntries = (kinds) => GAP_ENTRIES.filter((e) => kinds.includes(e.kind));

// --- Les questions -----------------------------------------------------------------------------------

const quote = (word) => `« ${word} »`;
const label = (entry) => (entry.letter === 'ss' ? 'ss' : entry.letter);

/** « devant i » ou « devant r, une consonne » : la lettre qui suit (ou précède et suit, pour le s). */
function neighbour(entry) {
  const { word, at, letter } = entry;
  const after = word[at + letter.length];
  if (letter === 's') {
    return at === 0 ? 'au début du mot' : `entre deux voyelles (${word[at - 1]} et ${after})`;
  }
  if (letter === 'ss') return `entre deux voyelles (${word[at - 1]} et ${word[at + 2]})`;
  return isVowel(after) ? `devant ${after}` : `devant ${after}, une consonne`;
}

// La règle utile à la correction : seulement celle qui explique la bonne réponse.
const RULES = {
  k: 'Devant a, o, u ou une consonne, le c chante comme dans kiwi.',
  s: 'Devant e, i, y, le c chante comme dans serpent.',
  g: 'Devant a, o, u ou une consonne, le g chante comme dans gâteau.',
  j: 'Devant e, i, y, le g chante comme dans girafe.',
  start: 'Au début d\'un mot, le s chante comme dans serpent.',
  z: 'Entre deux voyelles, un seul s chante comme dans zèbre.',
  ss: 'Entre deux voyelles, il faut deux s pour chanter comme dans serpent.',
};

function ruleOf(entry) {
  if (entry.letter === 'ss') return RULES.ss;
  if (entry.letter === 's') return entry.sound === 'z' ? RULES.z : RULES.start;
  return RULES[entry.sound];
}

function explainSound(entry) {
  const subject = entry.letter === 'ss' ? 'les deux s sont' : `le ${entry.letter} est`;
  return `Dans ${quote(entry.word)}, ${subject} ${neighbour(entry)}. ${ruleOf(entry)}`;
}

const skillOf = (entry) => ({
  c: 'son du c',
  g: 'son du g',
  s: 'son du s',
  ss: 'son du s',
})[entry.letter];

const refChoice = (sound) => ({ value: sound, emoji: REFS[sound].emoji, text: REFS[sound].word });

const theLetter = (entry) => (entry.letter === 'ss' ? 'Les deux s' : `Le ${entry.letter}`);
const ofWord = (entry) => (entry.letter === 'ss' ? 'font' : 'fait');

function sameQuestion(letters, rng, seen) {
  const entry = rng.pick(unseen(soundEntries(letters), seen));
  const sounds = SOUNDS_OF[entry.letter === 'ss' ? 's' : entry.letter];
  return {
    key: `lettres-qui-changent:same:${entry.letter}:${entry.word}`,
    type: 'choice',
    prompt: `${theLetter(entry)} de ${quote(entry.word)} ${ofWord(entry)} le même son que dans…`,
    speak: `${theLetter(entry)} du mot ${entry.word} ${ofWord(entry)} le même son que dans quel mot ?`,
    display: {
      show: { emoji: entry.emoji, text: entry.word, speak: entry.word },
      choices: rng.shuffle(sounds.map(refChoice)),
    },
    answer: entry.sound,
    explain: explainSound(entry),
    skill: skillOf(entry),
  };
}

function findQuestion(letters, rng, seen) {
  const entry = rng.pick(unseen(soundEntries(letters), seen));
  const others = SOUND_ENTRIES.filter((e) => e.letter === entry.letter && e.sound !== entry.sound && e.word !== entry.word);
  // Un seul mot juste ; deux intrus au son différent. Un même mot n'est jamais proposé deux fois.
  const wrong = rng.sample(others.filter((e, i, all) => all.findIndex((x) => x.word === e.word) === i), 2);
  const ref = REFS[entry.sound];
  return {
    key: `lettres-qui-changent:find:${entry.letter}:${entry.word}`,
    type: 'choice',
    prompt: `Touche le mot où ${theLetter(entry).toLowerCase()} chante comme dans ${quote(ref.word)}.`,
    speak: `Touche le mot où ${theLetter(entry).toLowerCase()} chante comme dans ${ref.word}.`,
    display: {
      show: { emoji: ref.emoji, text: ref.word, speak: ref.word },
      choices: rng.shuffle([entry, ...wrong].map((e) => ({ value: e.word, emoji: e.emoji, text: e.word }))),
    },
    answer: entry.word,
    explain: explainSound(entry),
    skill: skillOf(entry),
  };
}

// Phrases courtes de la correction d'un trou : la règle, puis l'exemple.
const GAP_RULES = {
  cedille: () => `Devant a, o, u, un c chante comme dans kiwi. Pour chanter comme dans serpent, on met une cédille : ç.`,
  gu: () => 'Devant e ou i, un g chante comme dans girafe. Pour chanter comme dans gâteau, on ajoute un u : gue, gui.',
  ge: () => 'Devant a ou o, un g chante comme dans gâteau. Pour chanter comme dans girafe, on ajoute un e : gea, geo.',
  m: () => 'Devant m, b, p, on écrit m, jamais n.',
  s: (e) => (e.right === 'ss'
    ? 'Entre deux voyelles, pour chanter comme dans serpent, on écrit deux s : ss.'
    : 'Entre deux voyelles, un seul s chante comme dans zèbre.'),
};

function gapExplain(entry) {
  return `${quote(entry.word)} s'écrit avec ${entry.right}. ${GAP_RULES[entry.kind](entry)}`;
}

/** La consigne : l'énoncé, puis la devinette quand le mot n'a pas d'image. */
const withClue = (text, entry) => (entry.clue ? `${text} ${entry.clue}` : text);

function gapQuestion(kinds, rng, seen) {
  const entry = rng.pick(unseen(gapEntries(kinds), seen));
  const cursive = rng.chance(0.5);
  return {
    key: `lettres-qui-changent:gap:${entry.kind}:${entry.word}`,
    type: 'choice',
    prompt: withClue(`Complète le mot : ${KINDS[entry.kind].label}`, entry),
    speak: withClue(`Complète le mot ${entry.word}.`, entry),
    display: {
      show: { emoji: entry.emoji, text: entry.gap, cursive, speak: entry.word },
      choices: rng.shuffle([entry.right, entry.wrong]),
      cursive,
      large: true,
    },
    answer: entry.right,
    explain: gapExplain(entry),
    skill: KINDS[entry.kind].skill,
  };
}

// Sans image, rien ne dit de quel mot il s'agit : on ne propose cette forme qu'aux mots illustrés.
function writtenQuestion(kinds, rng, seen) {
  const entry = rng.pick(unseen(gapEntries(kinds).filter((e) => e.emoji), seen));
  return {
    key: `lettres-qui-changent:ecrit:${entry.kind}:${entry.word}`,
    type: 'choice',
    prompt: 'Touche le mot bien écrit.',
    speak: `Touche le mot ${entry.word}, bien écrit.`,
    display: {
      show: { emoji: entry.emoji, speak: entry.word },
      choices: rng.shuffle([entry.word, entry.wrongWord]),
      cursive: rng.chance(0.5),
    },
    answer: entry.word,
    explain: `${quote(entry.word)} s'écrit ainsi. ${GAP_RULES[entry.kind](entry)}`,
    skill: KINDS[entry.kind].skill,
  };
}

/** Les entrées dont le mot n'a pas encore été posé dans la partie (s'il en reste). */
function unseen(entries, seen) {
  const asked = new Set([...(seen || [])].map((key) => key.split(':').at(-1)));
  const fresh = entries.filter((e) => !asked.has(e.word));
  return fresh.length ? fresh : entries;
}

// --- Niveaux -----------------------------------------------------------------------------------------
// Chaque niveau : la liste des formes de questions, tirées au hasard (répétées = plus fréquentes).

const LEVELS = {
  1: [
    (rng, seen) => sameQuestion(['c', 'g'], rng, seen),
    (rng, seen) => sameQuestion(['c', 'g'], rng, seen),
    (rng, seen) => findQuestion(['c', 'g'], rng, seen),
  ],
  2: [
    (rng, seen) => sameQuestion(['c', 'g'], rng, seen),
    (rng, seen) => findQuestion(['c', 'g'], rng, seen),
    (rng, seen) => gapQuestion(['cedille', 'gu', 'ge', 'm'], rng, seen),
    (rng, seen) => gapQuestion(['cedille', 'gu', 'ge', 'm'], rng, seen),
    (rng, seen) => gapQuestion(['cedille', 'gu', 'ge', 'm'], rng, seen),
  ],
  3: [
    (rng, seen) => sameQuestion(['c', 'g', 's', 'ss'], rng, seen),
    (rng, seen) => findQuestion(['c', 'g', 's'], rng, seen),
    (rng, seen) => gapQuestion(['cedille', 'gu', 'ge', 'm', 's'], rng, seen),
    (rng, seen) => gapQuestion(['cedille', 'gu', 'ge', 'm', 's'], rng, seen),
    (rng, seen) => writtenQuestion(['cedille', 'gu', 'ge', 'm', 's'], rng, seen),
    (rng, seen) => writtenQuestion(['cedille', 'gu', 'ge', 'm', 's'], rng, seen),
  ],
};

export default {
  id: 'lettres-qui-changent',
  title: 'Les lettres qui changent de son',
  island: 'mots',
  subject: 'français',
  issue: 25,
  skills: [
    'Connaître les sons du c, du g et du s',
    'Écrire ç, gu, ge, ss et m devant m, b, p',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'le son de c et de g' },
    { label: 'Niveau 2', hint: '+ ç, gu, ge, m devant m, b, p' },
    { label: 'Niveau 3', hint: '+ s et ss, mélanges' },
  ],
  makeQuestion(level, rng, seen) {
    return rng.pick(LEVELS[level])(rng, seen);
  },
};
