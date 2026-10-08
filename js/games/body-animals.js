// Body and animals (CE1, programmes 2024, langues vivantes, niveau A1) : comprendre à l'oral les animaux
// courants et les parties du corps en anglais, puis des phrases simples (« It's a dog », « Touch your
// nose », « I've got two ears ») et les pluriels (feet, teeth, mice, sheep).
//
// Comme « Colors and numbers » (#92) : le mot ou la phrase entendus sont TOUJOURS aussi écrits à l'écran
// (display.show), pour rester jouable sans voix anglaise et sans le son.
//
// Formes de questions (banque : js/data/corps-animaux.js) :
//   ecoute      : on entend/lit un animal ou une partie du corps, on touche l'image ;
//   lu          : le mot est écrit (avec bouton « écouter »), on touche l'image ;
//   phrase      : « It's a dog. », on touche l'animal ;
//   mot-image   : une image, on touche le bon mot anglais (parmi des mots de longueur voisine) ;
//   pluriel     : « feet » / « foot » : l'image montre UN ou DEUX exemplaires (👣 pas d'émoji de pluriel) ;
//   pluriel-nombre : « two sheep » / « one fish » : le nombre tranche quand le pluriel ne change pas ;
//   touche      : « Touch your nose. » ;  j-ai : « I've got two ears. » ;  deux-animaux : « I've got a cat and a fish. »
//
// Jamais deux images proches parmi les choix (CONFLICTS : oiseau / canard) ; jamais de choix en double ;
// les mots « transparents » (lion, elephant, giraffe) existent mais sont rares (mesuré par les tests).
import {
  ANIMALS, PARTS, ITEMS, FIRST_ANIMALS, getItem, conflict, capital, indefiniteEn, definiteFr,
  indefiniteFr, pluralFr, yourFr, countFr, wordEn,
} from '../data/corps-animaux.js';

const ID = 'body-animals';
const LISTEN = { lang: 'en-GB', listenLabel: 'Écouter en anglais' };

const ANIMAL_IDS = ANIMALS.map((a) => a.id);
const ALL_IDS = ITEMS.map((i) => i.id);
/** Ce qu'on sait montrer en un ou deux exemplaires sans image étrange (pas « deux nez »). */
const PAIRED_PARTS = ['ear', 'eye', 'hand', 'foot'];
const PLURALABLE = [...PAIRED_PARTS, 'tooth', ...ANIMAL_IDS];
/** Parties du corps qu'on touche (« Touch your tooth » serait étrange). */
const TOUCHABLE = ['nose', 'mouth', 'ear', 'eye', 'hand', 'foot'];

const POOLS = { 1: FIRST_ANIMALS, 2: ALL_IDS, 3: ALL_IDS };
const NUMBER_WORD = { 1: 'one', 2: 'two' };

// --- Outils ---------------------------------------------------------------------------------------

/** `count` éléments de `ids` que l'enfant ne confond pas entre eux ni avec `right` (déjà choisi). */
function compatible(ids, rng, count, chosen = []) {
  const picked = [...chosen];
  for (const id of rng.shuffle(ids)) {
    if (picked.length >= chosen.length + count) break;
    if (picked.includes(id) || picked.some((p) => conflict(p, id))) continue;
    picked.push(id);
  }
  return picked.slice(chosen.length);
}

const sameKind = (id) => (getItem(id).kind === 'animal' ? ANIMAL_IDS : PARTS.map((p) => p.id));

/** L'image d'un objet : un émoji, ou un dessin quand l'émoji se lit mal (le pied). */
const look = (item, n = 1) => (item.art ? { art: { kind: 'body', shape: item.art, ...(n > 1 ? { count: n } : {}) } } : { emoji: item.emoji.repeat(n) });
const picture = (item) => ({ value: item.id, ...look(item), label: item.fr });
/** n exemplaires de la même image : « 2 pieds ». */
const pictures = (item, n) => ({
  value: `${item.id}-${n}`, ...look(item, n), label: `${n} ${n > 1 ? item.frPlural : item.fr}`,
});

const skillOf = (item) => (item.kind === 'animal' ? 'animaux en anglais' : 'parties du corps en anglais');
const meaning = (item) => `${capital(item.en)}, c'est ${definiteFr(item)}.`;

// --- Niveaux 1 et 2 : un mot, une image ----------------------------------------------------------

function pickRight(level, rng) {
  const id = rng.pick(POOLS[level]);
  return getItem(id);
}

function wordChoices(level, rng, right) {
  const pool = POOLS[level].filter((id) => sameKind(right.id).includes(id));
  return rng.shuffle([right.id, ...compatible(pool.filter((id) => id !== right.id), rng, 3, [right.id])]).map((id) => picture(getItem(id)));
}

/** On entend le mot (déjà écrit à l'écran) : on touche l'image. */
function listenQuestion(level, rng) {
  const right = pickRight(level, rng);
  return {
    key: `${ID}:ecoute:${right.id}`,
    type: 'choice',
    prompt: right.kind === 'animal' ? 'Écoute, puis touche le bon animal.' : 'Écoute, puis touche la bonne partie du corps.',
    speak: right.en,
    ...LISTEN,
    display: { show: { text: right.en, lang: 'en-GB' }, choices: wordChoices(level, rng, right) },
    answer: right.id,
    explain: meaning(right),
    skill: skillOf(right),
  };
}

/** Le mot est écrit, avec son bouton « écouter » : on touche l'image. */
function readQuestion(level, rng) {
  const right = pickRight(level, rng);
  return {
    key: `${ID}:lu:${right.id}`,
    type: 'choice',
    prompt: right.kind === 'animal' ? 'Lis le mot, puis touche le bon animal.' : 'Lis le mot, puis touche la bonne partie du corps.',
    display: { show: { text: right.en, lang: 'en-GB', speak: right.en }, choices: wordChoices(level, rng, right) },
    answer: right.id,
    explain: meaning(right),
    skill: skillOf(right),
  };
}

/** « It's a dog. » (entendue et écrite) : on touche l'animal. */
function itsQuestion(level, rng) {
  const right = getItem(rng.pick(POOLS[level].filter((id) => ANIMAL_IDS.includes(id))));
  const sentence = `It's ${indefiniteEn(right)}.`;
  return {
    key: `${ID}:phrase:${right.id}`,
    type: 'choice',
    prompt: 'Écoute la phrase, puis touche le bon animal.',
    speak: sentence,
    ...LISTEN,
    display: { show: { text: sentence, lang: 'en-GB' }, choices: wordChoices(level, rng, right) },
    answer: right.id,
    explain: `« ${sentence.slice(0, -1)} » veut dire « c'est ${indefiniteFr(right)} ». ${meaning(right)}`,
    skill: 'phrase « It\'s a… »',
  };
}

/** Mots de longueur voisine : la longueur du mot ne trahit pas la bonne réponse. */
function nearLength(right, ids, rng, count) {
  const others = ids.filter((id) => id !== right.id);
  const close = others.filter((id) => Math.abs(getItem(id).en.length - right.en.length) <= 2);
  const first = compatible(rng.shuffle(close), rng, count, [right.id]);
  if (first.length === count) return first;
  const filled = [...first];
  const rest = rng.shuffle(others).sort((a, b) => Math.abs(getItem(a).en.length - right.en.length) - Math.abs(getItem(b).en.length - right.en.length));
  for (const id of rest) {
    if (filled.length >= count) break;
    if (filled.includes(id) || conflict(id, right.id) || filled.some((f) => conflict(f, id))) continue;
    filled.push(id);
  }
  return filled;
}

/** Une image : on touche le bon mot anglais. */
function wordQuestion(level, rng) {
  const right = pickRight(level, rng);
  const pool = POOLS[level].filter((id) => sameKind(right.id).includes(id));
  const words = [right.id, ...nearLength(right, pool, rng, 3)];
  return {
    key: `${ID}:mot-image:${right.id}`,
    type: 'choice',
    prompt: 'Regarde l\'image, puis touche le bon mot.',
    display: {
      show: { ...look(right), label: right.fr },
      choices: rng.shuffle(words).map((id) => ({ value: id, text: getItem(id).en, lang: 'en-GB' })),
    },
    answer: right.id,
    explain: meaning(right),
    skill: skillOf(right),
  };
}

// --- Niveau 3 : pluriels et petites phrases ------------------------------------------------------

/** Quatre images : le bon objet en un ou deux exemplaires, puis un autre objet en un ou deux. */
function countChoices(item, n, others, rng) {
  const [other] = others;
  return rng.shuffle([pictures(item, n), pictures(item, 3 - n), pictures(other, n), pictures(other, 3 - n)]);
}

function pluralScene(rng, ids) {
  const item = getItem(rng.pick(ids));
  const n = rng.pick([1, 2]);
  const others = compatible(PLURALABLE.filter((id) => id !== item.id), rng, 1, [item.id]);
  return { item, n, others: others.map(getItem) };
}

function pluralExplain(item, n) {
  if (n === 1) return `${capital(item.en)}, c'est ${indefiniteFr(item)}, un seul. Plusieurs se disent « ${item.enPlural} ».`;
  const base = `${capital(item.enPlural)}, ça veut dire « ${pluralFr(item)} » : plusieurs. Un seul se dit « ${item.en} ».`;
  return item.plural === 'irregular' ? `${base} Attention : « ${item.en} » devient « ${item.enPlural} », sans « s ».` : base;
}

/** « feet » ou « foot », sans nombre : le mot seul dit s'il y en a un ou plusieurs. */
function pluralQuestion(level, rng) {
  const { item, n, others } = pluralScene(rng, PLURALABLE.filter((id) => getItem(id).plural !== 'invariant'));
  const heard = wordEn(item, n);
  return {
    key: `${ID}:pluriel:${item.id}:${n}`,
    type: 'choice',
    prompt: 'Écoute, puis touche l\'image qui correspond.',
    speak: heard,
    ...LISTEN,
    display: { show: { text: heard, lang: 'en-GB' }, choices: countChoices(item, n, others, rng) },
    answer: `${item.id}-${n}`,
    explain: pluralExplain(item, n),
    skill: 'pluriels en anglais',
  };
}

/** « two sheep », « one fish » : le pluriel ne change pas, c'est le nombre qui décide. */
function numberedQuestion(level, rng) {
  const { item, n, others } = pluralScene(rng, ['sheep', 'fish', 'sheep', 'fish', 'mouse', 'foot', 'tooth']);
  const heard = `${NUMBER_WORD[n]} ${wordEn(item, n)}`;
  const same = item.plural === 'invariant';
  return {
    key: `${ID}:pluriel-nombre:${item.id}:${n}`,
    type: 'choice',
    prompt: 'Écoute, puis touche l\'image qui correspond.',
    speak: heard,
    ...LISTEN,
    display: { show: { text: heard, lang: 'en-GB' }, choices: countChoices(item, n, others, rng) },
    answer: `${item.id}-${n}`,
    explain: same
      ? `« ${capital(heard)} » : ${countFr(item, n)}. ${capital(item.en)} ne change pas au pluriel : on compte avec « one » ou « two ».`
      : `« ${capital(heard)} » : ${countFr(item, n)}. ${pluralExplain(item, n)}`,
    skill: 'pluriels en anglais',
  };
}

/** « Touch your nose. » : on touche la bonne partie du corps. */
function touchQuestion(level, rng) {
  const right = getItem(rng.pick(TOUCHABLE));
  const sentence = `Touch your ${right.en}.`;
  return {
    key: `${ID}:touche:${right.id}`,
    type: 'choice',
    prompt: 'Écoute la consigne, puis touche la bonne partie du corps.',
    speak: sentence,
    ...LISTEN,
    display: { show: { text: sentence, lang: 'en-GB' }, choices: wordChoices(3, rng, right) },
    answer: right.id,
    explain: `« ${sentence.slice(0, -1)} » veut dire « touche ${yourFr(right)} ». ${meaning(right)}`,
    skill: 'consigne « Touch your… »',
  };
}

/** « I've got two ears. » / « I've got a dog. » : une ou deux images, le bon nombre ET le bon objet. */
function haveQuestion(level, rng) {
  const item = getItem(rng.pick([...PAIRED_PARTS, ...ANIMAL_IDS]));
  const n = item.kind === 'part' ? 2 : rng.pick([1, 2]);
  const pool = item.kind === 'part' ? PAIRED_PARTS : ANIMAL_IDS;
  const others = compatible(pool.filter((id) => id !== item.id), rng, 1, [item.id]).map(getItem);
  const sentence = n === 1 ? `I've got ${indefiniteEn(item)}.` : `I've got two ${item.enPlural}.`;
  return {
    key: `${ID}:j-ai:${item.id}:${n}`,
    type: 'choice',
    prompt: 'Écoute la phrase, puis touche l\'image qui correspond.',
    speak: sentence,
    ...LISTEN,
    display: { show: { text: sentence, lang: 'en-GB' }, choices: countChoices(item, n, others, rng) },
    answer: `${item.id}-${n}`,
    explain: `« ${sentence.slice(0, -1)} » veut dire « j'ai ${countFr(item, n)} ». `
      + (n === 2 ? `Deux, ça s'entend : « two ${item.enPlural} ».` : `Un seul : « ${indefiniteEn(item)} ».`),
    skill: 'phrase « I\'ve got… »',
  };
}

/** « I've got a cat and a fish. » : deux animaux, jamais deux images qui diffèrent seulement par l'ordre. */
function twoAnimalsQuestion(level, rng) {
  const [a, b, c, d, e] = compatible(ANIMAL_IDS, rng, 5).map(getItem);
  const sentence = `I've got ${indefiniteEn(a)} and ${indefiniteEn(b)}.`;
  const pair = (x, y) => ({ value: `${x.id}+${y.id}`, emoji: `${x.emoji}${y.emoji}`, label: `${x.fr} et ${y.fr}` });
  return {
    key: `${ID}:deux-animaux:${a.id}:${b.id}`,
    type: 'choice',
    prompt: 'Écoute la phrase, puis touche l\'image qui correspond.',
    speak: sentence,
    ...LISTEN,
    display: { show: { text: sentence, lang: 'en-GB' }, choices: rng.shuffle([pair(a, b), pair(a, c), pair(d, b), pair(c, e)]) },
    answer: `${a.id}+${b.id}`,
    explain: `« ${sentence.slice(0, -1)} » veut dire « j'ai ${indefiniteFr(a)} et ${indefiniteFr(b)} ». ${capital(a.en)}, c'est ${definiteFr(a)} ; ${b.en}, c'est ${definiteFr(b)}.`,
    skill: 'phrase « I\'ve got… »',
  };
}

// --- Le jeu --------------------------------------------------------------------------------------

// Une forme par entrée ; une forme répétée tombe plus souvent.
const FORMS = {
  1: [listenQuestion, listenQuestion, readQuestion, itsQuestion],
  2: [listenQuestion, listenQuestion, readQuestion, wordQuestion, wordQuestion, wordQuestion],
  3: [pluralQuestion, pluralQuestion, numberedQuestion, touchQuestion, haveQuestion, haveQuestion, twoAnimalsQuestion],
};

export default {
  id: ID,
  title: 'Body and animals',
  island: 'ailleurs',
  subject: 'anglais',
  issue: 77,
  skills: [
    'Comprendre à l\'oral les animaux courants en anglais',
    'Comprendre à l\'oral les parties du corps en anglais',
    'Comprendre une phrase simple (« Touch your nose », « I\'ve got two ears ») et les pluriels (feet, teeth, mice, sheep)',
  ],
  levels: [
    { label: 'Niveau 1', hint: '12 animaux, « It\'s a… »' },
    { label: 'Niveau 2', hint: '+ le corps, lire les mots' },
    { label: 'Niveau 3', hint: 'pluriels, « I\'ve got… », « Touch your… »' },
  ],
  makeQuestion(level, rng) {
    return rng.pick(FORMS[level])(level, rng);
  },
};
