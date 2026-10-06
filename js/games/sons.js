// Jeu « Les sons » : entendre un son dans un mot et l'associer à ses écritures.
// Quatre formats alternent dans une partie : trouver l'image, nommer le son, compléter le mot,
// compter le son (niveau 3). Les mots viennent de la banque partagée js/data/mots-illustres.js.
//
// Règle d'or contre l'ambiguïté : un mot n'est proposé comme MAUVAISE réponse pour un son que
// s'il ne contient ni ce son à l'oral, ni l'une de ses écritures à l'écrit (« banane » n'est
// jamais un distracteur pour [an], ni « chien » pour [ill]).
import { WORDS, soundPositions } from '../data/mots-illustres.js';

/**
 * Sons travaillés.
 *  seq       : suite de phonèmes entendue (voir PHONEMES dans la banque) ;
 *  graphemes : écritures du son, de la plus longue à la plus courte ; un mot n'est une bonne
 *              réponse que si l'une d'elles apparaît (le son est « visible » à l'écrit) ;
 *  near      : sons trop proches pour servir de distracteur ([eu] et le « e » de « cheval ») ;
 *  notAfter  : le son ne compte pas comme bonne réponse juste après ce phonème ([in] de « poing ») ;
 *  say       : formulation lisible par la synthèse vocale (jamais de crochets) ;
 *  fillers   : mauvaises écritures pour « Complète le mot » quand ce n'est pas une voyelle
 *              (null : pas de « Complète le mot » pour ce son, écritures trop variables).
 */
export const SOUNDS = {
  ou: { seq: ['ou'], graphemes: ['ou'], say: 'ou, comme dans hibou' },
  on: { seq: ['on'], graphemes: ['on', 'om'], say: 'on, comme dans pont' },
  an: { seq: ['an'], graphemes: ['an', 'am', 'en', 'em'], say: 'an, comme dans maman' },
  oi: { seq: ['w', 'a'], graphemes: ['oi'], say: 'oua, comme dans roi' },
  ch: {
    seq: ['ch'], graphemes: ['ch'], say: 'che, comme dans chou',
    fillers: [{ text: 'j', seqs: [['j']] }, { text: 's', seqs: [['s'], ['z']] }],
  },
  in: {
    seq: ['in'], graphemes: ['ain', 'aim', 'ein', 'in', 'im', 'un', 'um', 'yn', 'ym'], notAfter: 'w',
    say: 'hein, comme dans matin',
  },
  eu: { seq: ['eu'], graphemes: ['œu', 'eu'], near: [['e']], say: 'eux, comme dans jeu' },
  o: { seq: ['o'], graphemes: ['eau', 'au', 'ô', 'o'], say: 'eau, comme dans stylo' },
  gn: {
    seq: ['gn'], graphemes: ['gn'], say: 'gne, comme dans peigne',
    fillers: [{ text: 'n', seqs: [['n']] }, { text: 'g', seqs: [['g'], ['j']] }],
  },
  ill: { seq: ['ill'], graphemes: ['ille', 'ill', 'il', 'y'], say: 'ye, comme dans bille', fillers: null },
  ail: { seq: ['a', 'ill'], graphemes: ['aille', 'ail'], say: 'aïe, comme dans travail', family: true },
  eil: { seq: ['è', 'ill'], graphemes: ['eille', 'eil'], say: 'eille, comme dans sommeil', family: true },
  oin: { seq: ['w', 'in'], graphemes: ['ouin', 'oin'], say: 'ouin, comme dans coin' },
};

// Famille ail / eil / ouil : les mauvaises écritures gardent la même forme (« eille » → « aille »).
const FAMILY = [
  { seq: ['a', 'ill'], long: 'aille', short: 'ail' },
  { seq: ['è', 'ill'], long: 'eille', short: 'eil' },
  { seq: ['ou', 'ill'], long: 'ouille', short: 'ouil' },
];

// Écriture principale des sons-voyelles, pour les mauvaises réponses de « Complète le mot ».
const VOWELS = { ou: 'ou', on: 'on', an: 'an', oi: 'oi', in: 'in', eu: 'eu', o: 'o', oin: 'oin' };

const LEVEL_SOUNDS = {
  1: ['ou', 'on', 'an', 'oi', 'ch'],
  2: ['ou', 'on', 'an', 'oi', 'ch', 'in', 'eu', 'o'],
  3: ['ou', 'on', 'an', 'oi', 'ch', 'in', 'eu', 'o', 'gn', 'ill', 'ail', 'eil', 'oin'],
};
// Sons nouveaux du niveau : tirés plus souvent.
const NEW_SOUNDS = { 1: LEVEL_SOUNDS[1], 2: ['in', 'eu', 'o'], 3: ['gn', 'ill', 'ail', 'eil', 'oin'] };
// Enchaînement des formats dans une partie (cycle).
const FORMATS = {
  1: ['image', 'sound', 'image', 'complete', 'sound'],
  2: ['image', 'sound', 'complete', 'image', 'sound'],
  3: ['image', 'sound', 'complete', 'count', 'image', 'sound', 'complete'],
};
const IMAGE_CHOICES = { 1: 3, 2: 4, 3: 4 };
const SOUND_CHOICES = { 1: 3, 2: 4, 3: 4 };

export const label = (id) => `[${id}]`;

// --- Analyse d'un mot (fonctions pures, exportées pour les tests) ----------------------------

/** Le mot contient-il le son à l'oral (n'importe où) ? */
export function hearsSound(entry, id) {
  return soundPositions(entry.sounds, SOUNDS[id].seq).length > 0;
}

/** Positions des occurrences du son qui comptent comme « le son » (pas le [in] de « oin »). */
function usablePositions(entry, id) {
  const { seq, notAfter } = SOUNDS[id];
  return soundPositions(entry.sounds, seq).filter((i) => !notAfter || entry.sounds[i - 1] !== notAfter);
}

/** Bonne réponse possible : on entend le son ET l'une de ses écritures figure dans le mot. */
export function hasSound(entry, id) {
  return usablePositions(entry, id).length > 0 && SOUNDS[id].graphemes.some((g) => entry.word.includes(g));
}

/** Distracteur possible : ni le son (ni un son trop proche) à l'oral, ni une de ses écritures. */
export function lacksSound(entry, id) {
  const { seq, near = [], graphemes } = SOUNDS[id];
  return [seq, ...near].every((s) => soundPositions(entry.sounds, s).length === 0)
    && !graphemes.some((g) => entry.word.includes(g));
}

/** Écritures du son repérées dans le mot (lecture de gauche à droite, plus longue d'abord). */
export function findGraphemes(word, id) {
  const { graphemes } = SOUNDS[id];
  const found = [];
  for (let i = 0; i < word.length;) {
    const g = graphemes.find((x) => word.startsWith(x, i));
    if (g) {
      found.push({ index: i, text: g });
      i += g.length;
    } else {
      i += 1;
    }
  }
  return found;
}

/**
 * Nombre de fois où l'on entend le son, si l'oral et l'écrit concordent sans piège
 * (sinon null : « cochon » a deux « o » écrits mais un seul [o] entendu).
 */
export function soundCount(entry, id) {
  const heard = soundPositions(entry.sounds, SOUNDS[id].seq);
  const usable = usablePositions(entry, id);
  if (!usable.length || usable.length !== heard.length) return null;
  return findGraphemes(entry.word, id).length === heard.length ? heard.length : null;
}

/** Où se trouve le son dans le mot, pour l'explication : la syllabe, sinon le début ou la fin. */
function where(entry, id) {
  const usable = usablePositions(entry, id);
  if (usable.length !== 1) return '';
  const { syllables } = entry;
  if (syllables?.length > 1 && soundCount(entry, id) === 1) {
    const at = findGraphemes(entry.word, id)[0].index;
    let end = 0;
    const syllable = syllables.find((s) => (end += s.length) > at);
    return ` dans la syllabe « ${syllable} »`;
  }
  const [first] = usable;
  const { length } = SOUNDS[id].seq;
  if (first === 0 && length < entry.sounds.length) return ' au début';
  if (first > 0 && first + length === entry.sounds.length) return ' à la fin';
  return '';
}

/** « Ici, [an] s'écrit « en ». » quand l'écriture n'est pas la plus courante. */
function spellingOf(entry, id) {
  if (soundCount(entry, id) !== 1) return '';
  const { text } = findGraphemes(entry.word, id)[0];
  return text.startsWith(id) ? '' : ` Ici, ${label(id)} s'écrit « ${text} ».`;
}

function explainSound(entry, id) {
  return `Dans « ${entry.word} », on entend ${label(id)}${where(entry, id)}${syllablesOf(entry)}.${spellingOf(entry, id)}`;
}

const spoken = (id) => SOUNDS[id].say.split(',')[0];
const syllablesOf = (entry) => (entry.syllables?.length > 1 ? ` : ${entry.syllables.join('-')}` : '');
const wordChoice = (entry) => ({ value: entry.word, emoji: entry.emoji, text: entry.word });
const usedWords = (seen) => new Set([...seen].map((key) => key.split(':').pop()));

/** Choisit de préférence un mot pas encore vu dans la partie. */
function pickFresh(rng, list, seen) {
  const used = usedWords(seen);
  const fresh = list.filter((e) => !used.has(e.word));
  return rng.pick(fresh.length ? fresh : list);
}

/** Relance `attempt` jusqu'à obtenir une question (les tests garantissent qu'elle existe). */
function retry(attempt) {
  for (let i = 0; i < 200; i++) {
    const question = attempt();
    if (question) return question;
  }
  throw new Error('sons : aucune question possible');
}

function pickSound(level, rng, usable) {
  const fresh = NEW_SOUNDS[level].filter((id) => usable.includes(id));
  return level > 1 && fresh.length && rng.chance(0.6) ? rng.pick(fresh) : rng.pick(usable);
}

// --- Formats de questions -------------------------------------------------------------------

/** « Touche l'image où tu entends [ou]. » */
function imageQuestion(level, rng, seen) {
  const id = pickSound(level, rng, LEVEL_SOUNDS[level]);
  const target = pickFresh(rng, WORDS.filter((e) => hasSound(e, id)), seen);
  const others = rng.sample(WORDS.filter((e) => lacksSound(e, id)), IMAGE_CHOICES[level] - 1);
  const entries = rng.shuffle([target, ...others]);
  return {
    key: `sons:image:${id}:${target.word}`,
    type: 'choice',
    prompt: `Touche l'image où tu entends ${label(id)}.`,
    speak: `Touche l'image où tu entends ${SOUNDS[id].say}. ${entries.map((e) => e.word).join(' ; ')}.`,
    display: { choices: entries.map(wordChoice), cursive: true },
    answer: target.word,
    explain: explainSound(target, id),
    skill: `son ${label(id)}`,
  };
}

/** « Quel son entends-tu dans ce mot ? » : le mot contient un seul des sons proposés. */
function soundQuestion(level, rng, seen) {
  const ids = LEVEL_SOUNDS[level];
  const count = SOUND_CHOICES[level];
  return retry(() => {
    const id = pickSound(level, rng, ids);
    const entry = pickFresh(rng, WORDS.filter((e) => hasSound(e, id)), seen);
    const others = ids.filter((x) => x !== id && lacksSound(entry, x));
    if (others.length < count - 1) return null;
    const choices = rng.shuffle([id, ...rng.sample(others, count - 1)]);
    return {
      key: `sons:son:${id}:${entry.word}`,
      type: 'choice',
      prompt: 'Quel son entends-tu dans ce mot ?',
      speak: `Quel son entends-tu dans le mot ${entry.word} ?`,
      display: {
        show: { emoji: entry.emoji, text: entry.word, cursive: true, speak: entry.word },
        choices: choices.map((x) => ({ value: x, text: label(x) })),
      },
      answer: id,
      explain: explainSound(entry, id),
      skill: `son ${label(id)}`,
    };
  });
}

/** Mauvaises écritures proposées pour combler le trou (sons absents du mot). */
function fillersFor(entry, id, gap, level) {
  const sound = SOUNDS[id];
  const absent = (seqs) => seqs.every((s) => soundPositions(entry.sounds, s).length === 0);
  if (sound.family) {
    const form = gap.endsWith('e') ? 'long' : 'short';
    return FAMILY.filter((f) => f[form] !== gap && absent([f.seq])).map((f) => f[form]);
  }
  if (sound.fillers) return sound.fillers.filter((f) => absent(f.seqs)).map((f) => f.text);
  return LEVEL_SOUNDS[level]
    .filter((x) => x !== id && VOWELS[x] && absent([SOUNDS[x].seq, ...(SOUNDS[x].near || [])]))
    .map((x) => VOWELS[x]);
}

/** Le mot peut-il servir à « Complète le mot » pour ce son ? Renvoie l'écriture à trouver. */
export function gapFor(entry, id) {
  if (SOUNDS[id].fillers === null || !hasSound(entry, id) || soundCount(entry, id) !== 1) return null;
  const [found] = findGraphemes(entry.word, id);
  return found.text.length < entry.word.length ? found : null;
}

const BLANK = '___';

/** « Complète le mot » : un trou à la place du son, trois écritures au choix. */
function completeQuestion(level, rng, seen) {
  const ids = LEVEL_SOUNDS[level].filter((id) => SOUNDS[id].fillers !== null);
  return retry(() => {
    const id = pickSound(level, rng, ids);
    const candidates = WORDS.filter((e) => gapFor(e, id) && fillersFor(e, id, gapFor(e, id).text, level).length >= 2);
    if (!candidates.length) return null;
    const entry = pickFresh(rng, candidates, seen);
    const gap = gapFor(entry, id);
    const wrong = rng.sample(fillersFor(entry, id, gap.text, level), 2);
    const shown = entry.word.slice(0, gap.index) + BLANK + entry.word.slice(gap.index + gap.text.length);
    return {
      key: `sons:trou:${id}:${entry.word}`,
      type: 'choice',
      prompt: 'Écoute le mot, puis complète-le.',
      speak: `Écoute le mot ${entry.word}, puis complète-le.`,
      display: {
        show: { emoji: entry.emoji, text: shown, cursive: true, speak: entry.word },
        choices: rng.shuffle([gap.text, ...wrong]),
        cursive: true,
      },
      answer: gap.text,
      explain: `Dans « ${entry.word} », on entend ${label(id)}.${spellingOf(entry, id)}`,
      skill: `son ${label(id)}`,
    };
  });
}

const TIMES = { 1: 'une fois', 2: 'deux fois', 3: 'trois fois' };

/** « Combien de fois entends-tu [o] dans ce mot ? » (niveau 3). */
function countQuestion(level, rng, seen) {
  return retry(() => {
    const id = rng.pick(LEVEL_SOUNDS[level]);
    const candidates = WORDS.filter((e) => soundCount(e, id));
    const twice = candidates.filter((e) => soundCount(e, id) > 1);
    // Seulement les sons qui reviennent dans certains mots (sinon la réponse serait toujours 1),
    // et un mot sur deux où le son revient.
    if (!twice.length) return null;
    const pool = rng.chance() ? twice : candidates;
    const entry = pickFresh(rng, pool, seen);
    const n = soundCount(entry, id);
    return {
      key: `sons:compte:${id}:${entry.word}`,
      type: 'choice',
      prompt: `Combien de fois entends-tu ${label(id)} dans ce mot ?`,
      speak: `Combien de fois entends-tu ${spoken(id)} dans le mot ${entry.word} ?`,
      display: {
        show: { emoji: entry.emoji, text: entry.word, cursive: true, speak: entry.word },
        choices: [1, 2, 3],
      },
      answer: n,
      explain: `Dans « ${entry.word} », on entend ${label(id)} ${TIMES[n]}${syllablesOf(entry)}.`,
      skill: `son ${label(id)}`,
    };
  });
}

const MAKERS = { image: imageQuestion, sound: soundQuestion, complete: completeQuestion, count: countQuestion };

export default {
  id: 'sons',
  title: 'Les sons',
  island: 'mots',
  subject: 'français',
  issue: 22,
  skills: [
    'Discriminer les sons complexes',
    'Associer un son à ses différentes écritures',
  ],
  levels: [
    { label: 'Niveau 1', hint: '[ou], [on], [an], [oi], [ch]' },
    { label: 'Niveau 2', hint: '+ [in], [eu], [o]' },
    { label: 'Niveau 3', hint: '+ [gn], [ill], [ail], [eil], [oin]' },
  ],
  makeQuestion(level, rng, seen) {
    const cycle = FORMATS[level];
    return MAKERS[cycle[seen.size % cycle.length]](level, rng, seen);
  },
};
