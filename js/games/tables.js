// Les tables (CE1, programmes 2024) : mémoriser les tables de 2, 5 et 10, puis de 3 et 4.
//
// Complémentaire du jeu « Calcul mental », qui ne traite que l'addition et la soustraction :
// ici, uniquement la multiplication — son sens (une addition répétée), la mémorisation des
// tables, les produits à trous et les problèmes de groupement et de partage.
//
// Trois règles de contenu :
//  - la multiplication se lit « n fois t » : « 4 × 3 », c'est 3 répété 4 fois (3 + 3 + 3 + 3).
//    Les questions sur le sens s'y tiennent, et ne proposent jamais « 3 × 4 » en distracteur ;
//  - les astuces des tables s'appuient sur la commutativité, au programme du CE1 :
//    « 7 × 2, c'est le double de 7 ». C'est la formulation d'usage, et elle reste juste ;
//  - une explication ne répète jamais la réponse : elle montre une stratégie additive
//    (le double, le double du double, « et encore une fois ») ou une astuce mémorisable
//    (compter de 5 en 5, multiplier par 10 c'est compter des dizaines).
//
// Une partie est une petite leçon de 10 questions, toujours dans le même ordre pédagogique
// (sens de la multiplication d'abord, mémorisation ensuite) : seuls les nombres changent.

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** Les `n` premiers multiples de `t` : « 5, 10, 15 ». */
const skipCount = (t, n) => range(1, n).map((i) => i * t).join(', ');

/** `t` répété `n` fois : « 3 + 3 + 3 + 3 ». */
const repeatedSum = (n, t) => Array.from({ length: n }, () => t).join(' + ');

const times = (n, t) => `${n} × ${t}`;

/** « de bonbons » / « d'œufs » : élision devant une voyelle. */
const de = (word) => (/^[aeiouyâàéèêîïôöûœh]/i.test(word) ? `d'${word}` : `de ${word}`);

const SKILL = {
  sense: 'sens de la multiplication',
  multiples: 'reconnaître les multiples',
  share: 'groupement et partage',
};
const tableSkill = (t) => `table de ${t}`;

/**
 * La stratégie de chaque table, pour `n × t`. Toujours un chemin que l'enfant peut refaire
 * de tête, jamais la seule égalité.
 */
function tableTip(n, t) {
  const p = n * t;
  const d = 2 * n;
  if (t === 2) return `${times(n, 2)}, c'est le double de ${n} : ${n} + ${n} = ${p}.`;
  if (t === 3) return `${times(n, 3)}, c'est ${times(n, 2)} et encore ${n} : ${n} + ${n} = ${d}, puis ${d} + ${n} = ${p}.`;
  if (t === 4) return `${times(n, 4)}, c'est le double du double : ${n} + ${n} = ${d}, puis ${d} + ${d} = ${p}.`;
  if (t === 5) return `Je compte de 5 en 5 : ${skipCount(5, n)}. Ça finit par 5 ou 0 : ${times(n, 5)} = ${p}.`;
  return `Multiplier par 10, c'est compter des dizaines : ${n} dizaines, donc ${times(n, 10)} = ${p}.`;
}

// --- Tables de chaque niveau --------------------------------------------------------------------

const MAIN = { 1: [2, 5, 10], 2: [3, 4], 3: [2, 3, 4, 5, 10] };
const REVIEW = [2, 5, 10];

/** Au niveau 2, une question sur quatre révise les tables déjà connues. */
function pickTable(rng, level) {
  if (level === 2 && rng.chance(0.25)) return rng.pick(REVIEW);
  return rng.pick(MAIN[level]);
}

// Objets vendus par paquets : support des problèmes (sens de la multiplication, partage).
const PACKS = [
  { emoji: '🍬', item: 'bonbons', one: 'un sachet', many: 'sachets' },
  { emoji: '🥚', item: 'œufs', one: 'une boîte', many: 'boîtes' },
  { emoji: '🍪', item: 'gâteaux', one: 'un paquet', many: 'paquets' },
  { emoji: '🖍️', item: 'crayons', one: 'une trousse', many: 'trousses' },
  { emoji: '🐟', item: 'poissons', one: 'un bocal', many: 'bocaux' },
  { emoji: '⚽', item: 'ballons', one: 'un filet', many: 'filets' },
  { emoji: '📕', item: 'livres', one: 'un carton', many: 'cartons' },
  { emoji: '🍎', item: 'pommes', one: 'un cageot', many: 'cageots', fem: true },
  { emoji: '🌸', item: 'fleurs', one: 'un bouquet', many: 'bouquets', fem: true },
  { emoji: '🍓', item: 'fraises', one: 'une barquette', many: 'barquettes', fem: true },
];

// --- Types de questions --------------------------------------------------------------------------

/** « 7 × 5 = ? » au pavé numérique : le cœur de la mémorisation. */
function product(rng, level) {
  const t = pickTable(rng, level);
  const n = rng.int(2, 10);
  return {
    key: `tables:produit:${n}x${t}`,
    type: 'keypad',
    prompt: 'Calcule, puis tape le résultat.',
    speak: `Combien font ${n} fois ${t} ?`,
    display: { show: { text: `${times(n, t)} = ?`, math: true }, maxLength: 3 },
    answer: n * t,
    explain: tableTip(n, t),
    skill: tableSkill(t),
  };
}

/**
 * Distracteurs d'un produit : les erreurs typiques, pas des nombres au hasard — les produits
 * voisins (4 × 7 → 24 ou 32) et la confusion avec l'addition (4 × 7 → 11).
 * Ils restent clairement faux : un seul choix vaut `n × t`.
 */
function wrongProducts(rng, n, t) {
  const p = n * t;
  const keep = (list) => [...new Set(list)].filter((v) => v > 0 && v !== p);
  const near = keep(rng.shuffle([p - n, p + n, p - t, p + t, n + t]));
  const spare = keep([p + 1, p - 1, p + 2, p - 2]);
  return [...new Set([...near, ...spare])].slice(0, 3);
}

/** Le même produit en QCM : l'enfant reconnaît le bon résultat parmi ses erreurs probables. */
function chooseProduct(rng, level) {
  const t = pickTable(rng, level);
  const n = rng.int(2, 10);
  const p = n * t;
  return {
    key: `tables:choix:${n}x${t}`,
    type: 'choice',
    prompt: 'Touche le bon résultat.',
    speak: `Combien font ${n} fois ${t} ?`,
    display: {
      show: { text: `${times(n, t)} = ?`, math: true },
      choices: rng.shuffle([p, ...wrongProducts(rng, n, t)]),
    },
    answer: p,
    explain: tableTip(n, t),
    skill: tableSkill(t),
  };
}

/**
 * Trois calculs faux pour « n fois t » : un paquet de trop ou de moins, et la confusion
 * avec l'addition. Deux calculs n'ont jamais la même valeur — sinon deux réponses se
 * vaudraient, et l'enfant ne saurait pas laquelle est « la » bonne.
 */
function wrongCalcs(rng, n, t) {
  const candidates = [
    ...rng.shuffle([[`${n} + ${t}`, n + t], [times(n - 1, t), (n - 1) * t], [times(n + 1, t), (n + 1) * t]]),
    [times(n + 2, t), (n + 2) * t], [times(n + 3, t), (n + 3) * t],
  ];
  const seen = new Set([n * t]);
  const out = [];
  for (const [text, value] of candidates) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(text);
    if (out.length === 3) break;
  }
  return out;
}

/** « 3 + 3 + 3 + 3 », quelle multiplication ? Le lien entre addition répétée et produit. */
function senseOfTimes(rng, level) {
  const t = pickTable(rng, level);
  const n = rng.int(3, 5);
  const sum = repeatedSum(n, t);
  const right = times(n, t);
  const choices = rng.shuffle([right, ...wrongCalcs(rng, n, t)])
    .map((text) => ({ value: text, text, math: true }));
  return {
    key: `tables:sens:${n}x${t}`,
    type: 'choice',
    prompt: 'Touche le calcul qui donne le même résultat.',
    speak: `Quel calcul donne le même résultat que ${sum} ?`,
    display: { show: { text: sum, math: true }, choices },
    answer: right,
    explain: `${sum}, c'est ${n} fois ${t} : ${right} = ${n * t}.`,
    skill: SKILL.sense,
  };
}

/** Un problème de paquets : « 4 sachets de 5 bonbons ». La multiplication a un sens concret. */
function packProblem(rng, level) {
  const t = pickTable(rng, level);
  // Deux nombres différents dans l'énoncé : « 2 fraises dans 2 barquettes » se lit mal.
  const n = rng.pick(range(2, 5).filter((v) => v !== t));
  const pack = rng.pick(PACKS);
  return {
    key: `tables:paquets:${pack.many}:${n}x${t}`,
    type: 'keypad',
    prompt: `Dans ${pack.one}, il y a ${t} ${pack.item}. Combien y a-t-il ${de(pack.item)} dans ${n} ${pack.many} ?`,
    display: { show: { emoji: pack.emoji, label: pack.item }, maxLength: 3 },
    answer: n * t,
    explain: `${n} ${pack.many} de ${t} ${pack.item} : ${repeatedSum(n, t)} = ${n * t}, c'est ${times(n, t)}.`,
    skill: SKILL.sense,
  };
}

/** « 7 × ? = 35 » : dans quelle table ? */
function missingTable(rng, level) {
  const t = pickTable(rng, level);
  const n = rng.int(2, 10);
  return {
    key: `tables:trou:${n}x${t}`,
    type: 'keypad',
    prompt: 'Trouve le nombre qui manque.',
    speak: `${n} fois combien égale ${n * t} ?`,
    display: { show: { text: `${n} × ? = ${n * t}`, math: true }, maxLength: 2 },
    answer: t,
    explain: tableTip(n, t),
    skill: tableSkill(t),
  };
}

/** « Combien de fois 5 dans 35 ? » : le groupement, première approche de la division. */
function howManyTimes(rng, level) {
  const t = pickTable(rng, level);
  const n = rng.int(2, 10);
  const p = n * t;
  return {
    key: `tables:fois:${n}x${t}`,
    type: 'keypad',
    prompt: `Combien de fois ${t} dans ${p} ?`,
    speak: `Combien de fois ${t} dans ${p} ?`,
    display: { show: { text: `? × ${t} = ${p}`, math: true }, maxLength: 2 },
    answer: n,
    explain: `Je compte de ${t} en ${t} : ${skipCount(t, n)}. J'ai compté ${n} fois : ${times(n, t)} = ${p}.`,
    skill: SKILL.share,
  };
}

/** « 20 bonbons partagés entre 4 enfants » : le partage équitable. */
function sharing(rng, level) {
  const t = pickTable(rng, level);
  const n = rng.int(2, 5);
  const p = n * t;
  const pack = rng.pick(PACKS);
  return {
    key: `tables:partage:${pack.many}:${n}x${t}`,
    type: 'keypad',
    prompt: `${p} ${pack.item} sont partagé${pack.fem ? 'es' : 's'} entre ${n} enfants.`
      + ` Combien ${de(pack.item)} pour chacun ?`,
    display: { show: { emoji: pack.emoji, label: pack.item }, maxLength: 2 },
    answer: t,
    explain: `Je partage ${p} en ${n} parts. ${tableTip(n, t)}`,
    skill: SKILL.share,
  };
}

// --- Ranger des nombres sous leur table ----------------------------------------------------------

// Paires de tables dont aucune ne contient l'autre : chaque nombre proposé appartient
// à une seule des deux (2 et 4, 2 et 10, 5 et 10 seraient ambigus).
const PAIRS = [[2, 3], [2, 5], [3, 4], [3, 5], [3, 10], [4, 5], [4, 10]];

/** Les multiples de `t` (1 à 10 fois) qui ne sont PAS dans la table de `other`. */
const onlyIn = (t, other) => range(1, 10).map((i) => i * t).filter((v) => v % other !== 0);

/** Les paires jouables à ce niveau : seulement des tables déjà rencontrées, et les nouvelles. */
function pairsFor(level) {
  if (level === 1) return PAIRS.filter((pair) => pair.every((t) => REVIEW.includes(t)));
  if (level === 2) return PAIRS.filter((pair) => pair.some((t) => MAIN[2].includes(t)));
  return PAIRS;
}

function sortIntoTables(rng, level) {
  const [t1, t2] = rng.pick(pairsFor(level));
  const groups = [[t1, rng.sample(onlyIn(t1, t2), 3)], [t2, rng.sample(onlyIn(t2, t1), 3)]];
  const entries = rng.shuffle(groups.flatMap(([t, values]) => values.map((v) => [t, v])));
  const items = entries.map(([, v], i) => ({ id: `i${i}`, text: String(v) }));
  const answer = Object.fromEntries(entries.map(([t], i) => [`i${i}`, `t${t}`]));
  const numbers = entries.map(([, v]) => v).sort((a, b) => a - b);
  return {
    key: `tables:ranger:${t1}-${t2}:${numbers.join('-')}`,
    type: 'drag',
    prompt: 'Range chaque nombre dans la bonne table.',
    display: {
      items,
      targets: [{ id: `t${t1}`, label: `Table de ${t1}` }, { id: `t${t2}`, label: `Table de ${t2}` }],
    },
    answer,
    explain: `Je compte de ${t1} en ${t1} : ${skipCount(t1, 10)}. Les autres nombres sont dans la table de ${t2}.`,
    skill: SKILL.multiples,
  };
}

// --- Déroulé d'une partie ------------------------------------------------------------------------

// Une leçon de 10 questions. L'ordre est fixe et pensé pour la progression : on part du sens
// de la multiplication, on installe la mémorisation, puis on cherche ce qui manque.
const LESSONS = {
  1: [senseOfTimes, product, chooseProduct, packProblem, product,
    sortIntoTables, chooseProduct, senseOfTimes, product, packProblem],
  2: [senseOfTimes, product, chooseProduct, packProblem, product,
    sortIntoTables, product, chooseProduct, senseOfTimes, product],
  3: [product, chooseProduct, missingTable, howManyTimes, sortIntoTables,
    product, missingTable, sharing, chooseProduct, howManyTimes],
};

export default {
  id: 'tables',
  title: 'Les tables',
  island: 'nombres',
  subject: 'maths',
  issue: 54,
  skills: [
    'Comprendre le sens de la multiplication : des additions répétées',
    'Mémoriser les tables de multiplication de 2, 3, 4, 5 et 10',
    'Résoudre des problèmes de groupement et de partage',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'Tables de 2, 5 et 10' },
    { label: 'Niveau 2', hint: '+ tables de 3 et 4' },
    { label: 'Niveau 3', hint: 'Les cinq tables, nombres qui manquent, partages' },
  ],
  makeQuestion(level, rng, seen) {
    const lesson = LESSONS[level];
    const make = seen ? lesson[seen.size % lesson.length] : rng.pick(lesson);
    return make(rng, level);
  },
};
