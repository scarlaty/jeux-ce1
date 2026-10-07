// La phrase (E5-T1, #35) : majuscule, signe final, types de phrases, remettre des mots dans l'ordre.
//  Niveau 1 : « Est-ce une phrase ? » (majuscule, signe, sens) et choisir le signe de phrases très franches.
//  Niveau 2 : remettre 4 ou 5 mots dans l'ordre ; trouver ce qui manque (majuscule, signe, rien).
//  Niveau 3 : remettre 6 ou 7 mots dans l'ordre ; choisir . ? ! sur des phrases plus longues et en contexte.
// Toutes les phrases sont écrites à la main (js/data/phrases.js) : jamais de phrase générée.
import {
  SIMPLE, PONCT_SHORT, PONCT_LONG, CONTEXTS, ORDER_2, ORDER_3,
  signOf, withoutSign, lowerFirst, shown, words, SIGN_NAMES,
} from '../data/phrases.js';

const quote = (s) => `« ${shown(s)} »`;

/** Une même phrase ne revient pas dans une partie, même sous une autre forme (clé : type|phrase|détail). */
const used = (seen, base) => Boolean(seen) && [...seen].some((k) => k.includes(`|${base}|`));
const baseOf = (sentence) => withoutSign(sentence).toLowerCase();

/** Indice sur le type de phrase, tiré du premier mot ou de la forme du verbe. */
function cue(text, sign) {
  const first = text.split(' ')[0].toLowerCase();
  if (sign === '?') {
    if (['où', 'qui', 'quand', 'comment', 'pourquoi', 'combien'].includes(first)) return ` Le mot « ${first} » annonce une question.`;
    if (first === 'est-ce') return ' « Est-ce que » annonce une question.';
    if (/^\S+-(tu|il|elle|nous|vous|ils)$/.test(first)) return ' Le verbe est collé à « tu » (veux-tu, as-tu) : c\'est une question.';
  }
  if (sign === '!' && ['quel', 'quelle', 'comme', 'que'].includes(first)) {
    return ` Le mot « ${first} » annonce souvent une exclamation.`;
  }
  return '';
}

const SIGN_RULE = {
  '.': 'On raconte ou on explique : on met un point.',
  '?': 'On pose une question : on met un point d\'interrogation.',
  '!': 'On est surpris ou très content : on met un point d\'exclamation.',
};

const SIGN_CHOICES = [
  { value: '.', text: 'Un point ( . )' },
  { value: '?', text: 'Un point d\'interrogation ( ? )' },
  { value: '!', text: 'Un point d\'exclamation ( ! )' },
];

// --- « Est-ce une phrase ? » ---------------------------------------------------------------------------

const GOOD_POOL = [
  ...SIMPLE.map(([ok, jumble]) => ({ ok, jumble })),
  ...PONCT_SHORT.map(({ text, sign }) => ({ ok: `${text}${sign === '.' ? '.' : ` ${sign}`}` })),
];

const isSentenceChoices = [
  { value: 'oui', text: 'Oui, c\'est une phrase' },
  { value: 'non', text: 'Non, ce n\'est pas une phrase' },
];

function isSentence(rng, seen) {
  const entry = rng.pick(GOOD_POOL);
  if (used(seen, baseOf(entry.ok))) return null;
  const kinds = entry.jumble ? ['bon', 'bon', 'maj', 'signe', 'ordre'] : ['bon', 'bon', 'maj', 'signe'];
  const kind = rng.pick(kinds);
  const sign = signOf(entry.ok);
  const text = { bon: entry.ok, maj: lowerFirst(entry.ok), signe: withoutSign(entry.ok), ordre: entry.jumble }[kind];
  const why = {
    bon: `Oui ! Elle commence par une majuscule, elle finit par ${SIGN_NAMES[sign]} et elle veut dire quelque chose.`,
    maj: `Il manque la majuscule au début. Une phrase commence toujours par une majuscule : ${quote(entry.ok)}`,
    signe: `Il manque le signe à la fin (. ? !). Une phrase finit toujours par un signe : ${quote(entry.ok)}`,
    ordre: `Les mots ne sont pas dans le bon ordre, alors la phrase ne veut rien dire. Il fallait : ${quote(entry.ok)}`,
  }[kind];
  return {
    key: `phrase:vraie|${baseOf(entry.ok)}|${kind}`,
    type: 'choice',
    prompt: 'Est-ce une phrase ? Regarde la majuscule, le signe à la fin et le sens.',
    speak: 'Est-ce une phrase ? Regarde la majuscule, le signe à la fin et le sens.',
    display: { show: { text: shown(text), cursive: true }, choices: isSentenceChoices },
    answer: kind === 'bon' ? 'oui' : 'non',
    explain: why,
    skill: 'reconnaître une phrase',
  };
}

// --- Choisir le signe -----------------------------------------------------------------------------------

function pickSign(item, { context = '' }) {
  const intro = context ? `${context} ` : '';
  return {
    key: `phrase:signe|${baseOf(item.text)}|${item.sign}${context ? ':ctx' : ''}`,
    type: 'choice',
    prompt: `${intro}Quel signe faut-il à la fin de la phrase ?`,
    speak: `${intro}${item.text}. Quel signe faut-il à la fin de la phrase ?`,
    display: { show: { text: `${shown(item.text)} …`, cursive: true }, choices: SIGN_CHOICES },
    answer: item.sign,
    explain: `${SIGN_RULE[item.sign]} ${quote(`${item.text}${item.sign === '.' ? '.' : ` ${item.sign}`}`)}`
      + (context ? '' : cue(item.text, item.sign)),
    skill: 'choisir le bon signe de ponctuation',
  };
}

function punctuation(pool, rng, seen) {
  const item = rng.pick(pool);
  return used(seen, baseOf(item.text)) ? null : pickSign(item, {});
}

function inContext(rng, seen) {
  const item = rng.pick(CONTEXTS);
  return used(seen, baseOf(item.text)) ? null : pickSign(item, { context: item.context });
}

// --- Remettre dans l'ordre --------------------------------------------------------------------------------

function order(pool, rng, seen, level) {
  const sentence = rng.pick(pool);
  if (used(seen, baseOf(sentence))) return null;
  const right = words(sentence);
  let items;
  do { items = rng.shuffle(right); } while (items.every((w, i) => w === right[i]));
  const sign = signOf(sentence);
  const help = level === 2 ? ' Aide-toi de la majuscule et du signe.' : '';
  return {
    key: `phrase:ordre|${baseOf(sentence)}|${level}`,
    type: 'order',
    prompt: `Remets les mots dans l'ordre pour faire une phrase.${help}`,
    speak: 'Remets les mots dans l\'ordre pour faire une phrase.',
    display: { items, cursive: true },
    answer: right,
    explain: `La phrase commence par le mot qui a une majuscule et finit par le mot qui a ${SIGN_NAMES[sign]}. `
      + `Voilà la phrase : ${quote(sentence)}`,
    skill: 'remettre les mots dans l\'ordre',
  };
}

// --- Trouver ce qui manque -------------------------------------------------------------------------------

const ERROR_CHOICES = [
  { value: 'maj', text: 'Il manque la majuscule au début.' },
  { value: 'signe', text: 'Il manque le signe à la fin.' },
  { value: 'les-deux', text: 'Il manque la majuscule et le signe.' },
  { value: 'rien', text: 'Il ne manque rien.' },
];

function findError(rng, seen) {
  const sentence = rng.pick(ORDER_2);
  if (used(seen, baseOf(sentence))) return null;
  const kind = rng.pick(['maj', 'signe', 'les-deux', 'rien']);
  const text = {
    maj: lowerFirst(sentence),
    signe: withoutSign(sentence),
    'les-deux': lowerFirst(withoutSign(sentence)),
    rien: sentence,
  }[kind];
  const sign = signOf(sentence);
  const rule = `Une phrase commence par une majuscule et finit par un signe (. ? !). Ici : ${quote(sentence)}`;
  const why = {
    maj: `Le premier mot n'a pas de majuscule. ${rule}`,
    signe: `Il n'y a pas de signe à la fin : il faut ${SIGN_NAMES[sign]}. ${rule}`,
    'les-deux': `Il n'y a ni majuscule au début ni signe à la fin. ${rule}`,
    rien: `Cette phrase est juste : majuscule au début, ${SIGN_NAMES[sign]} à la fin. ${quote(sentence)}`,
  }[kind];
  return {
    key: `phrase:erreur|${baseOf(sentence)}|${kind}`,
    type: 'choice',
    prompt: 'Regarde le début et la fin de la phrase. Que faut-il corriger ?',
    speak: `${withoutSign(sentence)}. Regarde le début et la fin de la phrase. Que faut-il corriger ?`,
    display: { show: { text: shown(text), cursive: true }, choices: ERROR_CHOICES },
    answer: kind,
    explain: why,
    skill: kind === 'rien' ? 'reconnaître une phrase juste' : 'trouver ce qui manque dans une phrase',
  };
}

// --- Déroulé d'une partie ---------------------------------------------------------------------------------

const MAKE = {
  1: (rng, seen) => (rng.chance(0.5) ? isSentence(rng, seen) : punctuation(PONCT_SHORT, rng, seen)),
  2: (rng, seen) => (rng.chance(0.5) ? order(ORDER_2, rng, seen, 2) : findError(rng, seen)),
  3: (rng, seen) => {
    const r = rng.next();
    if (r < 0.5) return order(ORDER_3, rng, seen, 3);
    return r < 0.8 ? inContext(rng, seen) : punctuation(PONCT_LONG, rng, seen);
  },
};

function draw(level, rng, seen) {
  for (let i = 0; i < 200; i++) {
    const q = MAKE[level](rng, seen);
    if (q) return q;
  }
  throw new Error(`phrase : aucune question possible au niveau ${level}`);
}

export default {
  id: 'phrase',
  title: 'La phrase',
  island: 'mots',
  subject: 'français',
  issue: 35,
  skills: [
    'Reconnaître une phrase : majuscule, signe final, sens',
    'Distinguer phrase déclarative, interrogative et exclamative',
    'Remettre des mots dans l\'ordre pour former une phrase',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'Est-ce une phrase ? Le bon signe' },
    { label: 'Niveau 2', hint: '4 ou 5 mots à ranger, trouver ce qui manque' },
    { label: 'Niveau 3', hint: '6 ou 7 mots à ranger, . ? ! en contexte' },
  ],
  makeQuestion(level, rng, seen) {
    return draw(level, rng, seen);
  },
};
