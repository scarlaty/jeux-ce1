// Les homophones (E6-T1, #42) : a/à, et/est, son/sont, on/ont, avec l'astuce du remplacement.
//  Niveau 1 : a/à et et/est, phrases courtes, un trou, 2 choix.
//  Niveau 2 : + son/sont et on/ont (les quatre paires), phrases un peu plus longues, 2 choix.
//  Niveau 3 : les quatre paires, phrases longues ; une question sur trois a DEUX trous (4 choix : on
//             choisit la paire de mots), ce qui coupe l'indice « le mot d'à côté » et force à raisonner.
// Toutes les phrases sont écrites à la main (js/data/homophones.js) : jamais de phrase générée.
// Après une erreur, `explain` applique l'astuce à LA phrase de l'enfant : on remplace le mot par
// « avait », « était », « mon », « étaient », « il » ou « avaient » et on écoute si ça se dit.
import {
  PAIRS, REPLACE, NO_REPLACE, pairOf, LEVEL_1, LEVEL_2, LEVEL_3_SINGLE, LEVEL_3_DOUBLE,
  answersOf, completed, withWord, gapped,
} from '../data/homophones.js';

const NBSP = ' ';
const shownText = (s) => s.replace(/ ([:?!])/g, `${NBSP}$1`);
const quote = (s) => `« ${shownText(s)} »`;
const slug = (template) => completed(template).toLowerCase();

const NOTE = { a: ' sans accent', 'à': ' avec un accent' };

/** L'astuce, appliquée au trou numéro `index` de la phrase (les autres trous sont justes). */
export function hintFor(template, index) {
  const word = answersOf(template)[index];
  if (REPLACE[word]) {
    const test = withWord(template, index, REPLACE[word]).replace(/\.$/, '');
    return `Remplace par « ${REPLACE[word]} » : ${quote(test)}, ça se dit. C'est donc « ${word} »${NOTE[word] || ''}.`;
  }
  const other = NO_REPLACE[word];
  const test = withWord(template, index, REPLACE[other]).replace(/\.$/, '');
  const why = word === 'et' ? ', qui relie deux mots' : NOTE[word];
  return `Remplace par « ${REPLACE[other]} » : ${quote(test)}, ça ne se dit pas. C'est donc « ${word} »${why}.`;
}

/** Mot dit à la place du trou : il ne figure dans aucune phrase de la banque (testé). */
export const SPOKEN_GAP = 'bip';

/** Astuce courte pour une phrase à deux trous : la phrase juste est rappelée une seule fois (≤ 200 signes). */
function shortHint(template, index) {
  const word = answersOf(template)[index];
  const n = `[${index + 1}]`;
  if (REPLACE[word]) return `${n} On peut dire « ${REPLACE[word]} » : c'est « ${word} »${NOTE[word] || ''}.`;
  const why = word === 'et' ? ', qui relie deux mots' : NOTE[word];
  return `${n} On ne peut pas dire « ${REPLACE[NO_REPLACE[word]]} » : c'est « ${word} »${why}.`;
}

export function explanationOf(template) {
  const answers = answersOf(template);
  if (answers.length > 1) {
    return `${answers.map((_, i) => shortHint(template, i)).join(' ')} La phrase juste : ${quote(completed(template))}`;
  }
  const hints = answers.map((_, i) => hintFor(template, i));
  return `${hints.join(' ')} La phrase juste : ${quote(completed(template))}`;
}

const single = (template, rng) => {
  const [answer] = answersOf(template);
  const pair = pairOf(answer);
  return {
    key: `homophones:${slug(template)}`,
    type: 'choice',
    prompt: 'Quel mot va dans la phrase ?',
    speak: `Quel mot va dans la phrase ? Écoute : ${gapped(template).replace('____', SPOKEN_GAP)}`,
    display: {
      show: { text: shownText(gapped(template)), cursive: true, wrap: true },
      choices: rng.shuffle(PAIRS[pair]).map((w) => ({ value: w, text: w })),
    },
    answer,
    explain: explanationOf(template),
    skill: pair.replace('/', ' / '),
  };
};

const double = (template, rng) => {
  const answers = answersOf(template);
  const [p1, p2] = answers.map(pairOf);
  const combos = [];
  for (const a of PAIRS[p1]) for (const b of PAIRS[p2]) combos.push([a, b]);
  return {
    key: `homophones:${slug(template)}`,
    type: 'choice',
    prompt: 'Quels mots vont dans la phrase ? Il y a deux trous.',
    speak: `Quels mots vont dans la phrase ? Il y a deux trous. Écoute : ${gapped(template).replace('[1]', `${SPOKEN_GAP} un`).replace('[2]', `${SPOKEN_GAP} deux`)}`,
    display: {
      show: { text: shownText(gapped(template)), cursive: true, wrap: true },
      choices: rng.shuffle(combos).map(([a, b]) => ({ value: `${a}|${b}`, text: `[1] ${a}   [2] ${b}` })),
    },
    answer: answers.join('|'),
    explain: explanationOf(template),
    skill: [...new Set(answers.map((w) => pairOf(w).replace('/', ' / ')))].join(' et '),
  };
};

const BANK = {
  1: (rng) => single(rng.pick(LEVEL_1), rng),
  2: (rng) => single(rng.pick(LEVEL_2), rng),
  3: (rng) => (rng.chance(0.4) ? double(rng.pick(LEVEL_3_DOUBLE), rng) : single(rng.pick(LEVEL_3_SINGLE), rng)),
};

function draw(level, rng, seen) {
  for (let i = 0; i < 300; i++) {
    const q = BANK[level](rng);
    if (!seen || !seen.has(q.key)) return q;
  }
  throw new Error(`homophones : aucune question possible au niveau ${level}`);
}

export default {
  id: 'homophones',
  title: 'Les homophones',
  island: 'mots',
  subject: 'français',
  issue: 42,
  skills: [
    'Distinguer a / à, et / est',
    'Distinguer son / sont, on / ont',
    'Utiliser l\'astuce du remplacement (avait, était, mon, étaient, il, avaient)',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'a / à et et / est, phrases courtes' },
    { label: 'Niveau 2', hint: '+ son / sont et on / ont' },
    { label: 'Niveau 3', hint: 'Phrases longues, parfois deux trous' },
  ],
  makeQuestion(level, rng, seen) {
    return draw(level, rng, seen);
  },
};
