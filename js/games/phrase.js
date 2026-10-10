// La phrase (E5-T1, #35 ; raccourcis corrigés #107) : majuscule, signe final, types de phrases,
// remettre des mots dans l'ordre.
//  Niveau 1 : « Est-ce une phrase ? » (majuscule, signe, sens) et choisir le signe de phrases très franches,
//             où la FORME donne le signe (mot interrogatif, inversion du verbe, « Quel/Comme »).
//  Niveau 2 : remettre 5 ou 6 mots dans l'ordre (au moins 3 mots du milieu, jamais un 50/50) ; trouver
//             ce qui manque (majuscule, signe, rien).
//  Niveau 3 : remettre 6 ou 7 mots dans l'ordre ; choisir . ? ! EN SITUATION. La banque de phrases longues
//             sans contexte a été retirée (#107) : mesurée, elle se résolvait à 96,5 % par la seule
//             typographie (virgule, trait d'union, premier mot), c'est-à-dire la compétence du niveau 1
//             déguisée en niveau 3.
// Toutes les phrases sont écrites à la main (js/data/phrases.js) : jamais de phrase générée.
import {
  SIMPLE, PONCT_SHORT, CONTEXTS, SPEAKERS, withSpeaker, ORDER_2, ORDER_3,
  signOf, withoutSign, lowerFirst, shown, words, SIGN_NAMES,
} from '../data/phrases.js';

const quote = (s) => `« ${shown(s)} »`;

/** Une même phrase ne revient pas dans une partie, même sous une autre forme (clé : type|phrase|détail). */
const used = (seen, base) => Boolean(seen) && [...seen].some((k) => k.includes(`|${base}|`));
const baseOf = (sentence) => withoutSign(sentence).toLowerCase();

/**
 * Indice sur le type de phrase. « Que » et « Quel » n'annoncent une exclamation QUE sans verbe inversé
 * juste après : avec « Que fais-tu » ou « Quel gâteau préfères-tu », c'est une question (#107) — on ne
 * classe donc plus un premier mot tout seul, on regarde s'il y a un verbe collé à « tu/il/elle/nous/
 * vous/ils » n'importe où dans la phrase.
 */
function cue(text, sign) {
  const first = text.split(' ')[0].toLowerCase();
  const hasInversion = /\S+-(tu|il|elle|nous|vous|ils)\b/i.test(text);
  if (sign === '?') {
    if (['où', 'qui', 'quand', 'comment', 'pourquoi', 'combien'].includes(first)) return ` Le mot « ${first} » annonce une question.`;
    if (first === 'est-ce') return ' « Est-ce que » annonce une question.';
    if (hasInversion) {
      return first === 'que' || first === 'quel' || first === 'quelle'
        ? ` Il y a un verbe collé à « tu » (ou « il »…) juste après « ${text.split(' ')[0]} » : c\'est quand même une question.`
        : ' Le verbe est collé à « tu » (veux-tu, as-tu) : c\'est une question.';
    }
  }
  if (sign === '!' && ['quel', 'quelle', 'comme', 'que'].includes(first) && !hasInversion) {
    return ` Le mot « ${first} » annonce souvent une exclamation.`;
  }
  return '';
}

/**
 * Stratégie à redire de tête pour ranger les mots. Une seule phrase pour tous les cas ne valait rien :
 * « cherche qui fait l'action » ne mène nulle part sur « Le gâteau de ma tante est bon. » (aucune action),
 * soit 60 % de la banque du niveau 3 (#107). On distingue donc quatre familles, reconnaissables au signe
 * final et au verbe de la phrase. `checkOrderStrategy` (tests) vérifie qu'aucune phrase ne reçoit la
 * consigne « qui fait l'action » sans action.
 */
export function orderStrategy(sentence) {
  const sign = signOf(sentence);
  const body = withoutSign(sentence);
  if (sign === '?') {
    // Toutes les questions ne commencent pas par un mot interrogatif : « As-tu un joli crayon rouge ? »
    // n'en a aucun. Envoyer l'enfant chercher un mot qui n'existe pas, c'est le même défaut que
    // « cherche qui fait l'action » sur une phrase sans action (#107).
    // Comparaison mot à mot : `\b` ne marche pas après une lettre accentuée (« Où » n'était pas reconnu).
    const INTERRO = ['où', 'qui', 'quand', 'comment', 'pourquoi', 'combien', 'est-ce', 'quel', 'quelle'];
    const mots = body.toLowerCase().split(/[^a-zà-ÿ'-]+/).filter(Boolean);
    return mots.some((m) => INTERRO.includes(m))
      ? 'Dans une question, le mot qui interroge (où, qui, est-ce que, comment…) se met en premier.'
      : 'Dans une question, le verbe collé à « tu » (as-tu, veux-tu, vas-tu) se met en premier.';
  }
  if (sign === '!') {
    return 'Dans une exclamation, le mot qui s\'étonne (quel, comme, que) se met en premier.';
  }
  // `\b` se fonde sur [A-Za-z0-9_] : dans « Léa », il voit une limite avant le « a », et `\ba\b`
  // reconnaissait donc le prénom. On découpe en mots, comme pour les mots interrogatifs ci-dessus.
  const mots = body.toLowerCase().split(/[^a-zà-ÿ'-]+/).filter(Boolean);
  const ACTION = 'Ici, quelqu\'un fait quelque chose : cherche qui fait l\'action, puis l\'action, puis le reste.';
  // La négation encadre le verbe : c'est la difficulté de ces étiquettes-là, et la règle est refaisable.
  if (mots.includes('pas') && mots.some((m) => m === 'ne' || m.startsWith('n\''))) {
    return 'Ici, la phrase dit ce qu\'on ne fait pas : « ne » et « pas » entourent le verbe.';
  }
  // Passé composé : « a mangé », « avons lu » — il y a bien une action, malgré l'auxiliaire « avoir ».
  const AVOIR = ['a', 'ai', 'as', 'avons', 'avez', 'ont'];
  const avoir = mots.find((m) => AVOIR.includes(m));
  if (avoir && /(é|ée|és|ées|i|is|it|u|us|ue)$/.test(mots[mots.indexOf(avoir) + 1] || '')) return ACTION;
  // On cite le verbe tel qu'il est écrit sur l'étiquette : « sont », pas « est » (#107).
  const etre = mots.find((m) => ['est', 'sont', 'es', 'suis', 'sommes', 'êtes'].includes(m));
  if (etre) {
    return `Ici, la phrase dit comment est quelque chose : d'abord de quoi on parle, puis « ${etre} », puis le mot qui dit comment.`;
  }
  if (avoir) {
    return `Ici, la phrase dit ce que quelqu'un a : d'abord qui, puis « ${avoir} », puis ce qu'il a.`;
  }
  return ACTION;
}

const SIGN_RULE = {
  '.': 'On raconte ou on explique : on met un point.',
  '?': 'On pose une question : on met un point d\'interrogation.',
  '!': 'On est surpris ou très content : on met un point d\'exclamation.',
};

const SIGN_CHOICES = [
  { value: '.', text: 'Un point ( . )' },
  { value: '?', text: 'Une question ( ? )' },
  { value: '!', text: 'Une exclamation ( ! )' },
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

function pickSign(item, { context = '', why = item.why }) {
  const intro = context ? `${context} ` : '';
  return {
    key: `phrase:signe|${baseOf(item.text)}|${item.sign}${context ? ':ctx' : ''}`,
    type: 'choice',
    prompt: `${intro}Quel signe faut-il à la fin de la phrase ?`,
    // La phrase est lue EN DERNIER et sans point final : sinon la synthèse pose une intonation de point
    // sur la phrase dont on demande justement le signe, et donne la réponse à l'oreille (#107).
    speak: `${intro}Quel signe faut-il à la fin de la phrase ? Écoute : ${item.text}`,
    display: { show: { text: `${shown(item.text)} …`, cursive: true }, choices: SIGN_CHOICES },
    answer: item.sign,
    // En situation, l'aide CITE ce qui tranche (le `why` de la banque : le verbe de la scène ou le mot
    // fort de la phrase). Sans situation, c'est l'indice de forme. Jamais « la règle puis la réponse » (#107).
    explain: `${SIGN_RULE[item.sign]} ${quote(`${item.text}${item.sign === '.' ? '.' : ` ${item.sign}`}`)}`
      + (context ? ` ${why}` : cue(item.text, item.sign)),
    skill: 'choisir le bon signe de ponctuation',
  };
}

function punctuation(pool, rng, seen) {
  const item = rng.pick(pool);
  return used(seen, baseOf(item.text)) ? null : pickSign(item, {});
}

function inContext(rng, seen) {
  const item = rng.pick(CONTEXTS);
  if (used(seen, baseOf(item.text))) return null;
  // Le locuteur est tiré à part : tant qu'une situation n'existait qu'avec UN prénom, lire le
  // seul prénom suffisait à trancher dans 86 % des cas. En le croisant, la relation
  // prénom → signe cesse d'être une fonction et redevient du hasard (#109).
  const who = rng.pick(SPEAKERS);
  return pickSign(item, {
    context: withSpeaker(item.context, who),
    why: withSpeaker(item.why, who),
  });
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
      + `${orderStrategy(sentence)} `
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
    // Même raison que pour `pickSign` : pas de point final sur la phrase à corriger (#107).
    speak: `Regarde le début et la fin de la phrase. Que faut-il corriger ? Écoute : ${withoutSign(sentence)}`,
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
  // Au niveau 3, la ponctuation est TOUJOURS en situation : une phrase longue sans contexte se résolvait
  // à la seule typographie, donc ne demandait rien de plus que le niveau 1 (#107).
  3: (rng, seen) => (rng.chance(0.5) ? order(ORDER_3, rng, seen, 3) : inContext(rng, seen)),
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
    { label: 'Niveau 2', hint: '5 ou 6 mots à ranger, trouver ce qui manque' },
    { label: 'Niveau 3', hint: '6 ou 7 mots à ranger, . ? ! en contexte' },
  ],
  makeQuestion(level, rng, seen) {
    return draw(level, rng, seen);
  },
};
