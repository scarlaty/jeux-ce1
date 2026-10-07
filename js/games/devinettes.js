// Devinettes (E3-T6) : croiser des indices pour trouver la bonne réponse.
//  Niveau 1 : 2 indices, 3 images.
//  Niveau 2 : 3 indices, 4 images — trois affirmations, ou deux plus un indice dit à l'envers.
//  Niveau 3 : réponses en mots seulement ; 2 indices + DEUX indices dits à l'envers, 5 mots.
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

/** Combien de choses portent cet indice à coup sûr : « je tiens dans la main » est partout, « j'ai une trompe » nulle part. */
const SPREAD = Object.fromEntries(Object.keys(TAGS).map((tag) =>
  [tag, THINGS.filter((t) => t.is.has(tag)).length]));

/**
 * Ordre de tirage des indices, pondéré en faveur des plus rares (Efraimidis–Spirakis : clé `u^poids`).
 * Sans cela, les indices passe-partout écrasent tout : le juge a relevé 54,6 % de questions bâties sur
 * « je tiens dans la main » ou « je suis très grand », contre 0,88 % portant un indice de signature.
 */
// La taille est l'indice le plus pauvre (« je tiens dans la main » allait jusqu'à 54,6 % des questions
// du niveau 2) : pénalité supplémentaire, sans l'interdire — sans elle, un tiers des réponses disparaît.
const penalty = (tag) => (tag === 'main' || tag === 'grand' ? 5 : 1);
const weightedOrder = (tags, rng) => [...tags]
  .map((tag) => ({ tag, key: rng.next() ** (Math.sqrt(SPREAD[tag] || 1) * penalty(tag)) }))
  .sort((a, b) => b.key - a.key)
  .map((o) => o.tag);

/**
 * `count` indices tirés parmi `tags` : au plus une catégorie et une couleur (sinon l'indice est redondant).
 * On écarte d'emblée les indices « ouverts » (#108) : on ne sait pas les nier, donc aucun intrus ne peut
 * les vérifier — les tirer ne ferait que gâcher des tentatives et appauvrir les réponses possibles.
 */
function pickClues(tags, count, rng) {
  const picked = [];
  for (const tag of weightedOrder([...tags].filter(canDeny), rng)) {
    if (picked.length === count) break;
    if (['cat', 'colour'].includes(kind(tag)) && picked.some((p) => kind(p) === kind(tag))) continue;
    picked.push(tag);
  }
  return picked.length === count ? picked.sort(byRank) : null;
}

/** Des images qui ne se ressemblent pas et qu'on ne confond pas avec les images déjà choisies. */
const compatible = (t, chosen) => chosen.every((c) => c.emoji !== t.emoji && !confusable(c.word, t.word));

/**
 * Mémo : les choses qui contredisent une contrainte à coup sûr. La banque ne bougeant pas, la liste ne
 * dépend que de la contrainte — sans ce mémo, chercher les intrus relisait les 97 choses à chaque essai.
 */
const FAILING = new Map();
function failing(c) {
  const key = (c.neg ? '!' : '') + c.tag;
  if (!FAILING.has(key)) FAILING.set(key, THINGS.filter((t) => fails(t, c)));
  return FAILING.get(key);
}

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
    const base = failing(missed).filter((t) => compatible(t, chosen) && !said.includes(t.word)
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
      not: constraints.filter((c) => c.neg).map((c) => c.tag),
      wrong: lures.map((l) => l.thing.word),
    },
  };
}

/**
 * Formes d'énoncé d'un niveau : [combien d'indices affirmatifs, combien d'indices dits à l'envers].
 * Le niveau 2 en a deux (#108) : trois affirmations exigent trois intrus qui vérifient chacun les deux
 * autres indices, ce que la banque ne permet que pour une vingtaine de réponses — d'où « baleine » dans
 * 29,7 % des questions. Un indice dit à l'envers est bien plus facile à contredire : il ouvre le reste
 * de la banque. Le niveau 3 en demande DEUX : sans cela, il posait exactement les mêmes énoncés que le
 * niveau 2 (97 % des énoncés communs, relevé du juge) et ne s'en distinguait plus que par les mots.
 */
const SHAPES = { 1: [[2, 0]], 2: [[3, 0], [2, 1]], 3: [[2, 2]] };

/**
 * Plusieurs jeux d'indices sont essayés pour la MÊME réponse (#108). Avant, un seul échec rejetait la
 * réponse entière : le tirage se concentrait sur les rares choses faciles à entourer d'intrus et la
 * plupart des indices ne sortaient jamais.
 */
function question(level, [positives, denials], rng) {
  const answer = rng.pick(THINGS);
  const negatable = Object.keys(NEGATIONS).filter((tag) => holds(answer, { tag, neg: true }));
  if (answer.is.size < positives || negatable.length < denials) return null;
  // 40 essais : il en faut autant pour que CHAQUE réponse jouable aboutisse presque toujours. En
  // dessous, le tirage retombe sur les réponses les plus faciles à entourer (« baleine » 12 % à 20 essais).
  for (let i = 0; i < 40; i++) {
    const clues = pickClues(answer.is, positives, rng);
    if (!clues) return null;
    const constraints = clues.map((tag) => ({ tag }));
    for (const tag of rng.sample(negatable, denials)) constraints.push({ tag, neg: true });
    const said = constraints.map((c) => clueSentence(c, answer)).join(' ').toLowerCase();
    if (said.includes(answer.word)) continue;
    const lures = pickLures(answer, constraints, said, rng);
    if (lures) return buildQuestion(level, answer, constraints, lures, rng);
  }
  return null;
}

/**
 * La FORME est tirée d'abord, la réponse ensuite (#108). L'inverse donnait à chaque forme un poids
 * proportionnel au nombre de réponses qui l'acceptent : au niveau 2, les trois affirmations ne sortaient
 * que dans 19,2 % des questions, et le niveau devenait de fait celui du dessous.
 */
function draw(level, rng) {
  for (let i = 0; i < 100; i++) {
    const shape = rng.pick(SHAPES[level]);
    for (let j = 0; j < 60; j++) {
      const q = question(level, shape, rng);
      if (q) return q;
    }
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
    { label: 'Niveau 3', hint: 'Des mots et deux indices « Je ne suis pas… »' },
  ],
  makeQuestion(level, rng, seen) {
    for (let i = 0; i < 12; i++) {
      const q = draw(level, rng);
      if (!seen || !seen.has(q.key)) return q;
    }
    return draw(level, rng);
  },
};
