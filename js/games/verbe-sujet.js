// Le verbe et son sujet (E5-T2, #37, élargi à l'infinitif) : trouver le verbe conjugué d'une phrase, son sujet
// et son infinitif. Trois sortes de questions, toutes en QCM (type « choice »), sur une banque écrite à la main
// (js/data/verbes.js) :
//   verbe  : toucher le verbe conjugué parmi les mots de la phrase (astuce : la négation « ne … pas ») ;
//   sujet  : toucher le groupe de mots qui est le sujet d'un verbe nommé (astuce : « C'est … qui ») ;
//   inf    : choisir l'infinitif d'un verbe (astuce : « Il faut … »).
//  Niveau 1 : phrases courtes, verbes en -er réguliers : toucher le verbe, puis son infinitif (3 choix).
//  Niveau 2 : le sujet (en tête de phrase ou non, parfois séparé du verbe par un pronom) ; infinitifs des verbes
//             irréguliers courants, au présent, au futur et au passé composé (4 choix, jamais un seul infinitif).
//  Niveau 3 : phrases plus longues, verbe NON nommé, sujets longs, et les pièges : un nom de la même famille
//             (« le chant » n'est pas un verbe) ; un infinitif déjà dans la phrase (« Léo aime chanter » : le verbe
//             conjugué est « aime »).
import { BANKS, VERBES, inline, capital } from '../data/verbes.js';

const quote = (s) => `« ${s} »`;
const noFinal = (text) => text.replace(/[.!?]+$/, '');
const slug = (item) => item.text.toLowerCase();

/** Une même forme verbale (même infinitif) ne revient pas dans une partie. */
const used = (seen, inf) => Boolean(seen) && [...seen].some((k) => k.includes(`|${inf}|`));

const PRONOMS = { il: 'lui', elle: 'elle', ils: 'eux', elles: 'elles', nous: 'nous' };

/** « C'est Léo qui chante », « Ce sont les enfants qui jouent », « C'est nous qui chantons ». */
export function cestQui(item) {
  const sujet = inline(item.sujet);
  const first = sujet.toLowerCase();
  const who = PRONOMS[first] ?? sujet;
  return `${item.pluriel && first !== 'nous' ? 'Ce sont' : 'C\'est'} ${who} qui ${item.verbe}`;
}

/** Infinitifs déjà présents dans la phrase (« Léo aime chanter ») : ce ne sont pas des verbes conjugués. */
export const infinitifsPresents = (item) => item.pieges.filter((p) => item.words.includes(p) && p !== item.nom);

/**
 * « Léo ne chante pas », « Léo n'aime pas chanter » : sert à montrer que « ne … pas » entoure le verbe conjugué
 * (et que l'infinitif de la phrase reste après « pas »).
 */
export function negation(item) {
  const ne = /^[aeiouyàâéèêëîïôûœ]/i.test(item.verbe) ? `n'${item.verbe}` : `ne ${item.verbe}`;
  return [`${capital(inline(item.sujet))} ${ne} pas`, ...infinitifsPresents(item)].join(' ');
}

/** Notes sur les pièges d'une phrase du niveau 3. */
export function piegesNote(item) {
  const present = infinitifsPresents(item);
  return item.pieges.map((p) => (present.includes(p)
    ? `« ${p} » est déjà à l'infinitif : il ne change pas, ce n'est pas le verbe conjugué.`
    : `« ${item.nom} » est un nom, pas un verbe.`)).join(' ');
}

export function explainVerbe(item) {
  const notes = piegesNote(item);
  return `Mets la phrase à la négation : ${quote(`${negation(item)}.`)} « ne » et « pas » entourent le verbe conjugué : `
    + `c'est ${quote(item.verbe)}.${notes ? ` ${notes}` : ''}`;
}

export function explainSujet(item) {
  return `Pour trouver le sujet, dis « C'est … qui ${item.verbe} » : ${quote(`${cestQui(item)}.`)} `
    + `Le sujet est donc ${quote(item.sujet)}.`;
}

export function explainInf(item, level) {
  const il = `On dit « il faut ${item.inf} », pas « il faut ${item.verbe} » : l'infinitif de ${quote(item.verbe)} est ${quote(item.inf)}.`;
  if (level < 3) return il;
  const nous = item.nous || VERBES[item.inf].nous;
  const notes = piegesNote(item);
  return `Le verbe conjugué est celui qui change avec le sujet : ${quote(`nous ${nous}`)} est le même verbe que ${quote(item.verbe)}. ${il}`
    + (notes ? ` ${notes}` : '');
}

/** Les choix d'une question de sujet : jamais le verbe, jamais un mot interrogatif ; dans l'ordre de la phrase. */
export const INTERROGATIFS = ['où', 'que', "qu'", 'quand', 'comment', 'pourquoi', 'qui', 'combien'];
export function sujetChoices(item) {
  return item.chunks.filter((c) => c.role !== 'V' && !INTERROGATIFS.includes(c.text.toLowerCase())).map((c) => c.text);
}

// --- Les trois sortes de questions ---------------------------------------------------------------------

const choice = (texts, rng, ordered) => (ordered ? texts : rng.shuffle(texts)).map((t) => ({ value: t, text: t }));

function verbeQuestion(item, level, rng) {
  const help = level === 1 ? ' C\'est le mot qui change avec le sujet. Pense à « ne … pas ».' : '';
  return {
    key: `verbe-sujet:${level}|${item.inf}|${slug(item)}|verbe`,
    type: 'choice',
    prompt: `Touche le verbe conjugué de la phrase.${help}`,
    speak: `Touche le verbe conjugué de la phrase. Écoute : ${noFinal(item.text)}`,
    // La consigne parle de « la phrase » : il faut donc la montrer, comme les deux autres formes
    // de ce jeu. Sans `show`, elle n'existait qu'éparpillée dans les boutons (#113).
    display: { show: { text: item.text, cursive: true, wrap: true }, choices: choice(item.words, rng, true) },
    answer: item.verbe,
    explain: explainVerbe(item),
    skill: 'trouver le verbe conjugué',
  };
}

function sujetQuestion(item, level, rng) {
  const help = level === 2 ? ` Pense à « C'est … qui ${item.verbe} ».` : '';
  return {
    key: `verbe-sujet:${level}|${item.inf}|${slug(item)}|sujet`,
    type: 'choice',
    prompt: `Quel groupe de mots est le sujet de ${quote(item.verbe)} ?${help}`,
    speak: `Quel groupe de mots est le sujet de ${item.verbe} ? Écoute la phrase : ${noFinal(item.text)}`,
    // La phrase entière est montrée (les groupes, seuls, ne se lisent pas comme une phrase) ; les choix restent
    // dans l'ordre de la phrase.
    display: { show: { text: item.text, cursive: true, wrap: true }, choices: choice(sujetChoices(item), rng, true) },
    answer: item.sujet,
    explain: explainSujet(item),
    skill: 'trouver le sujet du verbe',
  };
}

/** Formes du même verbe qui ne sont pas des infinitifs (-é, -ez, -ait…), absentes de la phrase. */
function formes(item) {
  const v = VERBES[item.inf];
  const here = new Set([...item.words.map((w) => w.toLowerCase()), item.verbe]);
  return [v.part, v.vous, v.imp].filter((f) => f && !here.has(f));
}

const proches = (item) => VERBES[item.inf].proches.filter((p) => !item.pieges.includes(p));

function infChoices(item, level, rng) {
  const right = item.inf;
  if (level === 1) return [right, rng.pick(formes(item)), rng.pick(proches(item))];
  if (level === 2) {
    const [a, b, c] = rng.shuffle(proches(item));
    const spare = [c, ...formes(item).slice(0, 1)].filter(Boolean);
    return [right, a, b, rng.pick(spare)];
  }
  return [right, ...item.pieges, ...rng.shuffle(proches(item))].slice(0, 4);
}

function infQuestion(item, level, rng) {
  const named = level < 3;
  return {
    key: `verbe-sujet:${level}|${item.inf}|${slug(item)}|inf`,
    type: 'choice',
    prompt: named
      ? `Quel est l'infinitif du verbe ${quote(item.verbe)} ?${level === 1 ? ' Pense à « Il faut… ».' : ''}`
      : 'Trouve le verbe conjugué, celui qui change avec le sujet. Quel est son infinitif ?',
    speak: named
      ? `Quel est l'infinitif du verbe ${item.verbe} ? Écoute la phrase : ${noFinal(item.text)}`
      : `Trouve le verbe conjugué, celui qui change avec le sujet. Quel est son infinitif ? Écoute : ${noFinal(item.text)}`,
    display: { show: { text: item.text, cursive: true, wrap: true }, choices: choice(infChoices(item, level, rng), rng) },
    answer: item.inf,
    explain: explainInf(item, level),
    skill: 'trouver l\'infinitif d\'un verbe',
  };
}

const MAKE = { verbe: verbeQuestion, sujet: sujetQuestion, inf: infQuestion };

// Chaque sorte de question a sa banque (js/data/verbes.js) : la structure des phrases y est choisie pour que
// ni la position ni la forme ne suffisent. Les verbes à deux mots (« a mangé ») ne se touchent jamais.
function draw(level, rng, seen) {
  const kinds = Object.keys(BANKS[level]);
  for (let i = 0; i < 300; i++) {
    const kind = rng.pick(kinds);
    const item = rng.pick(BANKS[level][kind]);
    if (used(seen, item.inf)) continue;
    // Une question de sujet propose au moins trois groupes plausibles (sans le verbe).
    if (kind === 'sujet' && sujetChoices(item).length < 3) continue;
    return MAKE[kind](item, level, rng);
  }
  throw new Error(`verbe-sujet : aucune question possible au niveau ${level}`);
}

export default {
  id: 'verbe-sujet',
  title: 'Le verbe et son sujet',
  island: 'mots',
  subject: 'français',
  issue: 37,
  skills: [
    'Identifier le verbe conjugué d\'une phrase',
    'Identifier le sujet du verbe',
    'Trouver l\'infinitif d\'un verbe conjugué (astuce « Il faut… »)',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'Le verbe d\'une phrase courte, son infinitif' },
    { label: 'Niveau 2', hint: 'Le sujet, verbes irréguliers' },
    { label: 'Niveau 3', hint: 'Phrases longues, pièges' },
  ],
  makeQuestion(level, rng, seen) {
    return draw(level, rng, seen);
  },
};
