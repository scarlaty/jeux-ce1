// Devinettes (E3-T6) : croiser des indices pour trouver la bonne réponse.
//  Niveau 1 : 2 indices, 3 images.
//  Niveau 2 : 3 indices, 4 images — trois affirmations, ou deux plus un indice dit à l'envers.
//  Niveau 3 : réponses en mots seulement ; 2 indices + un indice dit à l'envers (« Je ne suis pas jaune. »).
// Règle d'or (#97) : CHAQUE INDICE EST NÉCESSAIRE. À chaque indice correspond un intrus qui vérifie tous les
// autres indices et ne contredit que celui-là : en retirer un seul rend la devinette ambiguë. Aucun intrus ne
// vient d'une autre catégorie « pour faire nombre » ; aucun indice ne nomme un choix affiché.
// Aucune ambiguïté : la réponse vérifie tout avec certitude, chaque intrus contredit un indice sans hésitation
// (voir js/data/devinettes.js : `is` / `maybe`).
import {
  THINGS, KIND_RANK, TAGS, NEGATIONS, confusable, clueText, negationText, whyNot, definite, indefinite,
  holds, fails, couldHold, colourClosed, canDeny,
} from '../data/devinettes.js';

const kind = (tag) => TAGS[tag].kind;
const byRank = (a, b) => KIND_RANK[kind(a)] - KIND_RANK[kind(b)];

/**
 * `count` indices tirés parmi `tags` : au plus une catégorie et une couleur (sinon l'indice est redondant).
 * On écarte d'emblée les indices « ouverts » (#108) : on ne sait pas les nier, donc aucun intrus ne peut
 * les vérifier — les tirer ne ferait que gâcher des tentatives et appauvrir les réponses possibles.
 */
function pickClues(tags, count, rng) {
  const picked = [];
  for (const tag of rng.shuffle([...tags].filter(canDeny))) {
    if (picked.length === count) break;
    if (['cat', 'colour'].includes(kind(tag)) && picked.some((p) => kind(p) === kind(tag))) continue;
    picked.push(tag);
  }
  return picked.length === count ? picked.sort(byRank) : null;
}

/** Des images qui ne se ressemblent pas et qu'on ne confond pas avec les images déjà choisies. */
const compatible = (t, chosen) => chosen.every((c) => c.emoji !== t.emoji && !confusable(c.word, t.word));

/**
 * Un intrus par contrainte : il vérifie TOUTES les autres avec certitude et contredit celle-là avec certitude.
 * `said` est l'énoncé déjà écrit : aucun choix ne peut y être nommé (« Je ne suis pas orange. » à côté de
 * l'image d'une orange — il suffirait de barrer le mot recopié, voir la grille du juge, § 2 bis).
 * Renvoie [{ thing, missed }] ou null si la banque n'offre pas un tel intrus.
 */
function pickLures(answer, constraints, said, rng) {
  const chosen = [answer];
  const lures = [];
  for (const missed of rng.shuffle([...constraints])) {
    const others = constraints.filter((c) => c !== missed);
    const base = THINGS.filter((t) => compatible(t, chosen) && fails(t, missed) && !said.includes(t.word)
      && !(missed.neg && TAGS[missed.tag].kind === 'colour' && !colourClosed(t)));
    // De préférence un intrus qui vérifie les autres indices avec certitude ; sinon, qui pourrait les vérifier.
    const sure = base.filter((t) => others.every((c) => holds(t, c)));
    const candidates = sure.length ? sure : base.filter((t) => others.every((c) => couldHold(t, c)));
    if (!candidates.length) return null;
    const thing = rng.pick(candidates);
    chosen.push(thing);
    lures.push({ thing, missed });
  }
  return lures;
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);

/** Dit pourquoi cet intrus ne convient pas, par l'indice qui le trahit (toujours vrai de l'intrus). */
function lureReason(answer, { thing, missed }) {
  if (!missed.neg) return whyNot(missed.tag, thing);
  return `${cap(definite(thing))} dit : « ${clueText(missed.tag, thing)} » Ce n'est pas moi.`;
}

const clueSentence = (c, answer) => (c.neg ? negationText(c.tag, answer) : clueText(c.tag, answer));

function buildQuestion(level, answer, constraints, lures, rng) {
  const ordered = [...constraints.filter((c) => !c.neg), ...constraints.filter((c) => c.neg)];
  const words = level === 3;
  const end = words ? 'Qui suis-je ? Touche le bon mot.' : 'Qui suis-je ? Touche la bonne image.';
  const text = `${ordered.map((c) => clueSentence(c, answer)).join(' ')} ${end}`;
  const choices = rng.shuffle([answer, ...lures.map((l) => l.thing)]).map((t) => (words
    ? { value: t.word, text: t.word }
    : { value: t.word, emoji: t.emoji, label: t.word }));
  const reasons = lures.sort((a, b) => ordered.indexOf(a.missed) - ordered.indexOf(b.missed))
    .map((l) => lureReason(answer, l));
  return {
    key: `devinettes:${level}:${answer.word}:${ordered.map((c) => (c.neg ? '!' : '') + c.tag).join('+')}:${lures.map((l) => l.thing.word).sort().join('+')}`,
    type: 'choice',
    prompt: text,
    speak: text,
    display: words ? { choices, cursive: true } : { choices },
    answer: answer.word,
    explain: `C'est ${indefinite(answer)} ! Il faut lire tous les indices. ${reasons.join(' ')}`,
    skill: 'comprendre une devinette',
    riddle: {
      answer: answer.word,
      clues: constraints.filter((c) => !c.neg).map((c) => c.tag),
      not: (constraints.find((c) => c.neg) || {}).tag || null,
      wrong: lures.map((l) => l.thing.word),
    },
  };
}

/**
 * Formes d'énoncé d'un niveau : combien d'indices affirmatifs, et un indice dit à l'envers ou non.
 * Le niveau 2 en a deux (#108) : trois affirmations exigent trois intrus qui vérifient chacun les deux
 * autres indices, ce que la banque ne permet que pour 16 réponses — d'où « baleine » dans 29,7 % des
 * questions. Un indice dit à l'envers est bien plus facile à contredire : il ouvre le reste de la banque.
 */
const SHAPES = { 1: [[2, false]], 2: [[3, false], [2, true]], 3: [[2, true]] };

/**
 * Plusieurs jeux d'indices sont essayés pour la MÊME réponse (#108). Avant, un seul échec rejetait la
 * réponse entière : le tirage se concentrait sur les rares choses faciles à entourer d'intrus et la
 * plupart des indices ne sortaient jamais.
 */
function question(level, rng) {
  const answer = rng.pick(THINGS);
  const negatable = Object.keys(NEGATIONS).filter((tag) => holds(answer, { tag, neg: true }));
  for (const [positives, deny] of rng.shuffle(SHAPES[level])) {
    if (answer.is.size < positives || (deny && !negatable.length)) continue;
    for (let i = 0; i < 6; i++) {
      const clues = pickClues(answer.is, positives, rng);
      if (!clues) break;
      const constraints = clues.map((tag) => ({ tag }));
      if (deny) constraints.push({ tag: rng.pick(negatable), neg: true });
      const said = constraints.map((c) => clueSentence(c, answer)).join(' ').toLowerCase();
      if (said.includes(answer.word)) continue;
      const lures = pickLures(answer, constraints, said, rng);
      if (lures) return buildQuestion(level, answer, constraints, lures, rng);
    }
  }
  return null;
}

function draw(level, rng) {
  for (let i = 0; i < 3000; i++) {
    const q = question(level, rng);
    if (q) return q;
  }
  throw new Error(`devinettes : aucune question possible au niveau ${level}`);
}

export default {
  id: 'devinettes',
  title: 'Devinettes',
  island: 'mots',
  subject: 'français',
  issue: 27,
  skills: ['Comprendre un texte court', 'Relier des indices pour trouver une réponse', 'Raisonner par déduction'],
  levels: [
    { label: 'Niveau 1', hint: '2 indices à croiser, 3 images' },
    { label: 'Niveau 2', hint: '3 indices à croiser, 4 images' },
    { label: 'Niveau 3', hint: 'Des mots et un indice « Je ne suis pas… »' },
  ],
  makeQuestion(level, rng, seen) {
    for (let i = 0; i < 12; i++) {
      const q = draw(level, rng);
      if (!seen || !seen.has(q.key)) return q;
    }
    return draw(level, rng);
  },
};
