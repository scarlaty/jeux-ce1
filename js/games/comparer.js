// Plus grand, plus petit (CE1, programmes 2024) : comparer, ranger, encadrer et intercaler
// des nombres jusqu'à 1000.
//
// La méthode enseignée par chaque explication est toujours la même : on compare les chiffres
// de la plus grande place vers la plus petite (centaines, puis dizaines, puis unités), et on
// s'arrête au premier endroit où ils diffèrent.
//
// Pour que cette méthode soit la seule qui marche, les tirages évitent les raccourcis de surface
// (voir tests/games/comparer.test.js, qui les mesure) :
//   - « le plus long est le plus grand » : on mêle des paires de même longueur et, de temps en
//     temps, 95 contre 102 ;
//   - « le premier chiffre décide » : beaucoup de paires ont les mêmes centaines (409 et 490),
//     ou des chiffres échangés (394, 349, 934) ;
//   - « le dernier chiffre décide » : le nombre qui a le plus grand chiffre des unités est
//     souvent le plus petit (358 et 371).
// Le signe = existe dans toutes les formes de questions : nombres écrits pareil, somme et nombre,
// nombre en lettres et en chiffres, matériel et nombre.
import { enLettres } from '../data/nombres-en-lettres.js';
import { pieceWords } from '../core/ui/art/base-ten.js';

const SKILL = {
  compare: 'comparer deux nombres',
  equal: 'comparer des écritures différentes d\'un même nombre',
  extreme: 'trouver le plus grand ou le plus petit nombre',
  order: 'ranger des nombres dans l\'ordre',
  frame: 'encadrer un nombre',
  between: 'intercaler un nombre',
  neighbour: 'trouver la dizaine ou la centaine voisine',
};

const SIGNS = ['<', '=', '>'];
const PLACES = ['centaines', 'dizaines', 'unités'];

// --- Petits outils -------------------------------------------------------------------------------

/** [centaines, dizaines, unités] d'un nombre. */
const d3 = (n) => [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10];
const len = (n) => String(n).length;
const signOf = (a, b) => (a < b ? '<' : a > b ? '>' : '=');
const REL = { '<': 'plus petit que', '=': 'égal à', '>': 'plus grand que' };

/** Tirage pondéré : table = [[valeur, poids], …]. */
function weighted(rng, table) {
  let r = rng.next() * table.reduce((s, [, w]) => s + w, 0);
  for (const [value, w] of table) {
    r -= w;
    if (r < 0) return value;
  }
  return table[table.length - 1][0];
}

/** « 1 dizaine », « 5 unités », « 0 unité » : singulier pour 0 et 1. */
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

/**
 * 3 leurres répartis des deux côtés de la bonne réponse : son rang numérique (0 à 3) est tiré au hasard
 * parmi les rangs possibles, pour que « choisir celle du milieu » ne marche pas. Chaque réserve est
 * rangée du plus proche au plus loin ; le plus proche (une borne, une voisine) est toujours pris.
 */
function spreadDecoys(rng, belowPool, abovePool) {
  const ranks = [0, 1, 2, 3].filter((r) => belowPool.length >= r && abovePool.length >= 3 - r);
  const r = rng.pick(ranks);
  const take = (pool, k) => (k === 0 ? [] : [pool[0], ...rng.sample(pool.slice(1), k - 1)]);
  return [...take(belowPool, r), ...take(abovePool, 3 - r)];
}

/** « 4, 4 et 9 ». */
function joinAnd(parts) {
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
}

/** Le nombre `n` dont deux chiffres sont échangés (jamais de zéro devant, jamais n lui-même). */
function swapped(rng, n) {
  const d = d3(n);
  const options = [[0, 1], [0, 2], [1, 2]].filter(([i, j]) => d[i] !== d[j]);
  const candidates = options.map(([i, j]) => {
    const e = [...d];
    [e[i], e[j]] = [e[j], e[i]];
    return 100 * e[0] + 10 * e[1] + e[2];
  }).filter((m) => m >= 100);
  return candidates.length ? rng.pick(candidates) : null;
}

// --- Les paires à comparer -----------------------------------------------------------------------

/** Deux nombres de 10 à 99, de dizaines différentes ; le plus petit a souvent plus d'unités. */
function pairTens(rng) {
  const [t1, t2] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 2).sort((x, y) => x - y);
  const reverse = rng.chance(0.7);
  const uHigh = rng.int(1, 9);
  const u1 = reverse ? uHigh : rng.int(0, 9);
  const u2 = reverse ? rng.int(0, uHigh - 1) : rng.int(0, 9);
  return [10 * t1 + u1, 10 * t2 + u2];
}

/** Même chiffre des dizaines, unités différentes : 47 et 43. */
function pairUnits(rng) {
  const t = rng.int(1, 9);
  const [u1, u2] = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 2);
  return [10 * t + u1, 10 * t + u2];
}

/** Chiffres échangés : 47 et 74. */
function pairSwap2(rng) {
  const [t, u] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 2);
  return [10 * t + u, 10 * u + t];
}

/** 100 contre un nombre à deux chiffres proche : 100 et 98. */
function pairHundred(rng) {
  return [100, rng.int(85, 99)];
}

/** Mêmes centaines, dizaines différentes ; le nombre aux dizaines plus petites a souvent plus d'unités. */
function pairSameH(rng) {
  const h = rng.int(1, 9);
  const [t1, t2] = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 2).sort((x, y) => x - y);
  const reverse = rng.chance(0.7);
  const uHigh = rng.int(1, 9);
  const u1 = reverse ? uHigh : rng.int(0, 9);
  const u2 = reverse ? rng.int(0, uHigh - 1) : rng.int(0, 9);
  return [100 * h + 10 * t1 + u1, 100 * h + 10 * t2 + u2];
}

/** Mêmes centaines et mêmes dizaines, unités différentes : 347 et 342. */
function pairSameHT(rng) {
  const h = rng.int(1, 9);
  const t = rng.int(0, 9);
  const [u1, u2] = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 2);
  return [100 * h + 10 * t + u1, 100 * h + 10 * t + u2];
}

/** Chiffres échangés : 409 et 490, 394 et 934. */
function pairPerm(rng) {
  for (;;) {
    const n = 100 * rng.int(1, 9) + 10 * rng.int(0, 9) + rng.int(0, 9);
    const m = swapped(rng, n);
    if (m !== null) return [n, m];
  }
}

/** De part et d'autre d'une centaine : 199 et 201 ; ou 95 et 102. */
function pairCross(rng) {
  if (rng.chance(0.35)) return [rng.int(85, 99), 100 + rng.int(0, 15)];
  const h = rng.int(1, 8);
  return [100 * h + rng.int(85, 99), 100 * (h + 1) + rng.int(0, 15)];
}

/** Deux nombres de centaines différentes, sans piège particulier. */
function pairFar(rng) {
  const [h1, h2] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 2);
  return [100 * h1 + rng.int(0, 99), 100 * h2 + rng.int(0, 99)];
}

const PAIRS = {
  1: [[pairTens, 0.4], [pairUnits, 0.4], [pairSwap2, 0.12], [pairHundred, 0.08]],
  2: [[pairSameH, 0.3], [pairSameHT, 0.2], [pairPerm, 0.22], [pairCross, 0.15], [pairFar, 0.13]],
  3: [[pairSameHT, 0.42], [pairSameH, 0.25], [pairPerm, 0.18], [pairCross, 0.1], [pairFar, 0.05]],
};

/** Une paire de nombres à comparer, dans un ordre aléatoire. Rarement deux nombres écrits pareil. */
function pickPair(rng, level) {
  if (rng.chance(0.06)) {
    const n = level === 1 ? rng.int(10, 99) : rng.int(100, 999);
    return [n, n];
  }
  const pair = weighted(rng, PAIRS[level])(rng);
  return rng.chance(0.5) ? pair : [pair[1], pair[0]];
}

// --- Explications --------------------------------------------------------------------------------

/**
 * La méthode appliquée à deux nombres : « Les centaines sont pareilles. On compare les dizaines : 0 et 9. »
 * Fonction pure ; `a` et `b` sont des entiers de 10 à 999.
 */
export function explainCompare(a, b) {
  if (a === b) return `${a} et ${b} s'écrivent pareil : ils sont égaux.`;
  const rel = `${a} est ${REL[signOf(a, b)]} ${b}`;
  if (len(a) !== len(b)) {
    const [la, lb] = [len(a), len(b)];
    return `${a} a ${la} chiffres et ${b} en a ${lb}. Plus un nombre a de chiffres, plus il est grand : ${rel}.`;
  }
  const da = d3(a);
  const db = d3(b);
  const start = len(a) === 3 ? 0 : 1;
  let p = start;
  while (da[p] === db[p]) p++;
  const same = PLACES.slice(start, p);
  const lead = same.length
    ? `Les ${joinAnd(same)} sont pareilles. On compare les ${PLACES[p]} : ${da[p]} et ${db[p]}.`
    : `On compare d'abord les ${PLACES[p]} : ${da[p]} et ${db[p]}.`;
  return `${lead} ${da[p]} est ${REL[signOf(da[p], db[p])]} ${db[p]}, donc ${rel}.`;
}

/** Le même raisonnement pour une liste : on garde les nombres qui ont le chiffre extrême, place après place. */
export function explainExtreme(nums, kind) {
  const big = kind === 'max';
  const word = big ? 'grand' : 'petit';
  const start = nums.some((n) => n >= 100) ? 0 : 1;
  let cand = nums;
  const out = [];
  for (let p = start; p < 3 && cand.length > 1; p++) {
    const ds = cand.map((n) => d3(n)[p]);
    if (ds.every((x) => x === ds[0])) {
      out.push(`Les ${PLACES[p]} sont pareilles (${ds[0]}).`);
      continue;
    }
    const e = big ? Math.max(...ds) : Math.min(...ds);
    const keep = cand.filter((n) => d3(n)[p] === e);
    const first = p === start && cand === nums;
    const look = first ? `On compare d'abord les ${PLACES[p]}` : `On compare les ${PLACES[p]}`;
    out.push(`${look} : ${ds.join(', ')}. Le plus ${word} chiffre est ${e}`
      + (keep.length === 1 ? ` : c'est ${keep[0]}.` : ` : on garde ${joinAnd(keep)}.`));
    cand = keep;
  }
  return out.join(' ');
}

/** Les chiffres de la place qui décide, lus dans l'ordre demandé : ils montent (ou descendent) d'un cran à l'autre. */
function explainOrder(sorted, ascending) {
  const start = sorted.some((n) => n >= 100) ? 0 : 1;
  let p = start;
  while (p < 2 && sorted.every((n) => d3(n)[p] === d3(sorted[0])[p])) p++;
  const inOrder = ascending ? sorted : [...sorted].reverse();
  const ds = inOrder.map((n) => d3(n)[p]);
  const tie = new Set(ds).size < ds.length;
  const same = p > start ? `Les ${joinAnd(PLACES.slice(start, p))} sont pareilles. ` : '';
  const way = ascending ? 'du plus petit au plus grand' : 'du plus grand au plus petit';
  const head = `${same}On regarde les ${PLACES[p]} : dans l'ordre ${way}, ce sont ${ds.join(', ')}.`;
  if (!tie) return head;
  // Un cas de départage pris dans la liste : deux voisins qui ont le même chiffre à cette place.
  const i = ds.findIndex((x, k) => k > 0 && x === ds[k - 1]);
  const [x, y] = [inOrder[i - 1], inOrder[i]];
  const [dx, dy] = [d3(x)[p + 1], d3(y)[p + 1]];
  return `${head} ${x} et ${y} ont le même chiffre des ${PLACES[p]} (${ds[i]}) : on regarde les ${PLACES[p + 1]}, `
    + `${dx} et ${dy}. Donc ${Math.min(x, y)} est plus petit que ${Math.max(x, y)}.`;
}

const ASTUCE = 'Astuce : le signe s\'ouvre toujours vers le plus grand nombre.';

// --- Les formes de questions ---------------------------------------------------------------------

/** « 409 ? 490 » : le bon signe. */
function signPlain(rng, level) {
  const [a, b] = pickPair(rng, level);
  const answer = signOf(a, b);
  return {
    key: `comparer:signe:${a}:${b}`,
    type: 'choice',
    prompt: 'Compare les deux nombres. Touche le bon signe.',
    speak: `Compare ${a} et ${b}. Quel signe faut-il mettre ?`,
    display: { show: { text: `${a} ? ${b}`, math: true }, choices: SIGNS, large: true, row: true },
    answer,
    explain: level === 1 && answer !== '=' ? `${explainCompare(a, b)} ${ASTUCE}` : explainCompare(a, b),
    skill: SKILL.compare,
  };
}

/** Les morceaux d'un nombre : 346 → « 300 + 40 + 6 » (chaque morceau non nul). */
function partsOf(n) {
  return d3(n).map((x, i) => x * [100, 10, 1][i]).filter((x) => x > 0);
}

/** « 300 + 40 + 6 ? 346 » : une somme contre un nombre. Égalité une fois sur deux. */
function signSum(rng, level) {
  const make = level === 1 ? () => rng.int(11, 99) : () => 100 * rng.int(1, 9) + rng.int(0, 99);
  let n;
  let parts;
  do {
    n = make();
    parts = partsOf(n);
  } while (parts.length < 2 || (level > 1 && n % 10 === 0 && n % 100 === 0));
  const sumLeft = rng.chance(0.5);
  // Le signe visé est tiré d'abord (= une fois sur trois, < et > à égalité), puis on choisit l'autre côté.
  let want = rng.chance(0.32) ? '=' : rng.pick(['<', '>']);
  const low = level === 1 ? 10 : 100;
  const high = level === 1 ? 99 : 999;
  const options = [swapped(rng, n) ?? 0, level === 1 ? 10 * (n % 10) + Math.floor(n / 10) : 0, n + 10, n - 10, n + 1, n - 1, n + 100, n - 100]
    .filter((m) => m !== n && m >= low && m <= high);
  const greater = (m) => (sumLeft ? m > n : m < n);   // « m fait répondre < »
  let pool = want === '=' ? [n] : options.filter((m) => (want === '<' ? greater(m) : !greater(m)));
  if (!pool.length) { want = '='; pool = [n]; }
  const other = rng.pick(pool);
  const sum = parts.join(' + ');
  const text = sumLeft ? `${sum} ? ${other}` : `${other} ? ${sum}`;
  const answer = sumLeft ? signOf(n, other) : signOf(other, n);
  const lead = `${sum} = ${n}.`;
  const tail = n === other
    ? `C'est le même nombre : ${n} est égal à ${other}.`
    : explainCompare(sumLeft ? n : other, sumLeft ? other : n);
  return {
    key: `comparer:somme:${text}`,
    type: 'choice',
    prompt: 'Calcule la somme, puis touche le bon signe.',
    speak: `Compare ${sumLeft ? parts.join(' plus ') : String(other)} et ${sumLeft ? String(other) : parts.join(' plus ')}. Quel signe faut-il mettre ?`,
    display: { show: { text, math: true }, choices: SIGNS, large: true, row: true },
    answer,
    explain: `${lead} ${tail}`,
    skill: SKILL.equal,
  };
}

/** Un nombre en lettres contre un nombre en chiffres (niveau 3). Égalité une fois sur quatre. */
function signWords(rng) {
  const [n, far] = rng.shuffle(weighted(rng, PAIRS[3])(rng));
  const written = rng.chance(0.3) ? n : far;
  const words = enLettres(n);
  return {
    key: `comparer:lettres:${n}:${written}`,
    type: 'choice',
    prompt: `Lis ce nombre écrit en lettres. Compare-le à ${written}.`,
    speak: `Lis ce nombre écrit en lettres, puis compare-le à ${written}.`,
    display: {
      show: { text: words, wrap: true },
      choices: SIGNS.map((s) => ({ value: s, text: `${REL[s]} ${written}` })),
    },
    answer: signOf(n, written),
    explain: `${words}, c'est ${n}. ${explainCompare(n, written)}`,
    skill: SKILL.equal,
  };
}

/** Du matériel de numération contre un nombre écrit (niveau 3). Égalité une fois sur quatre. */
function signMaterial(rng) {
  const [a, b] = rng.shuffle(weighted(rng, [[pairSameH, 0.35], [pairSameHT, 0.25], [pairPerm, 0.3], [pairCross, 0.1]])(rng));
  const material = rng.chance(0.3) ? b : a;
  const written = b;
  const [h, t, u] = d3(material);
  const answer = signOf(material, written);
  return {
    key: `comparer:matériel:${material}:${written}`,
    type: 'choice',
    prompt: `Compte le matériel. Il montre un nombre : compare-le à ${written}.`,
    speak: `Compte le matériel, puis compare-le à ${written}.`,
    display: {
      show: { art: { kind: 'base-ten', hundreds: h, tens: t, units: u } },
      choices: SIGNS.map((s) => ({ value: s, text: `${REL[s]} ${written}` })),
    },
    answer,
    explain: `Le matériel montre ${pieceWords({ hundreds: h, tens: t, units: u })} : ${material}. `
      + `${explainCompare(material, written)}`,
    skill: SKILL.equal,
  };
}

// --- Listes : le plus grand, le plus petit, ranger -----------------------------------------------

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** k nombres de 10 à 99, la moitié du temps avec les mêmes dizaines. */
function listTwo(rng, k) {
  if (rng.chance(0.5)) {
    const t = rng.int(1, 9);
    return rng.sample(range(0, 9), k).map((u) => 10 * t + u);
  }
  return rng.sample(range(10, 99), k);
}

/** k nombres écrits avec les mêmes chiffres : 394, 349, 934, 439. */
function listPerm(rng, k) {
  for (;;) {
    const ds = rng.sample(range(0, 9), 3);
    const perms = new Set();
    for (const [i, j, l] of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
      const n = 100 * ds[i] + 10 * ds[j] + ds[l];
      if (n >= 100) perms.add(n);
    }
    if (perms.size >= k) return rng.sample([...perms], k);
  }
}

/** k nombres de mêmes centaines. */
function listSameH(rng, k) {
  const h = rng.int(1, 9);
  return rng.sample(range(0, 99), k).map((x) => 100 * h + x);
}

/** k nombres de mêmes centaines et dizaines : seules les unités les séparent. */
function listSameHT(rng, k) {
  const base = 100 * rng.int(1, 9) + 10 * rng.int(0, 9);
  return rng.sample(range(0, 9), k).map((u) => base + u);
}

/** k nombres autour d'une centaine : 198, 199, 201, 202. */
function listAround(rng, k) {
  const c = 100 * rng.int(2, 9);
  return rng.sample([...range(c - 4, c - 1), ...range(c + 1, c + 4)], k);
}

const LISTS = {
  1: [[listTwo, 1]],
  2: [[listPerm, 0.2], [listSameH, 0.45], [listSameHT, 0.25], [listAround, 0.1]],
  3: [[listPerm, 0.2], [listSameH, 0.45], [listSameHT, 0.25], [listAround, 0.1]],
};
const LIST_SIZE = { extreme: { 1: 3, 2: 3, 3: 4 }, order: { 1: 3, 2: 4, 3: 5 } };

/** « Touche le plus grand nombre. » ou « le plus petit ». */
function extreme(rng, level, kind) {
  const nums = weighted(rng, LISTS[level])(rng, LIST_SIZE.extreme[level]);
  const answer = kind === 'max' ? Math.max(...nums) : Math.min(...nums);
  const word = kind === 'max' ? 'grand' : 'petit';
  return {
    key: `comparer:${kind}:${[...nums].sort((x, y) => x - y).join('-')}`,
    type: 'choice',
    prompt: `Touche le plus ${word} nombre.`,
    speak: `Quel est le plus ${word} nombre ?`,
    display: { choices: rng.shuffle(nums) },
    answer,
    explain: explainExtreme(nums, kind),
    skill: SKILL.extreme,
  };
}

/** « Range du plus petit au plus grand » (ou l'inverse). */
function order(rng, level) {
  const nums = weighted(rng, LISTS[level])(rng, LIST_SIZE.order[level]);
  const ascending = rng.chance(0.5);
  const sorted = [...nums].sort((x, y) => x - y);
  const answer = ascending ? sorted : [...sorted].reverse();
  let items;
  do { items = rng.shuffle(nums); } while (items.every((x, i) => x === answer[i]) || items.every((x, i) => x === answer[answer.length - 1 - i]));
  return {
    key: `comparer:ranger:${ascending ? 'croissant' : 'décroissant'}:${sorted.join('-')}`,
    type: 'order',
    prompt: ascending ? 'Range les nombres du plus petit au plus grand.' : 'Range les nombres du plus grand au plus petit.',
    speak: ascending ? 'Range les nombres du plus petit au plus grand.' : 'Range les nombres du plus grand au plus petit.',
    display: { items },
    answer,
    explain: explainOrder(sorted, ascending),
    skill: SKILL.order,
  };
}

// --- Intercaler, encadrer ------------------------------------------------------------------------

/** « Quel nombre vient juste après 199 ? » : le passage d'une dizaine ou d'une centaine (niveau 2). */
function nextTo(rng) {
  const after = rng.chance(0.5);
  const n = after
    ? (rng.chance(0.6) ? 10 * rng.int(11, 99) - 1 : rng.int(100, 998))
    : (rng.chance(0.6) ? 10 * rng.int(11, 99) : rng.int(101, 999));
  const answer = after ? n + 1 : n - 1;
  return {
    key: `comparer:suivant:${after ? 'après' : 'avant'}:${n}`,
    type: 'keypad',
    prompt: `Quel nombre vient juste ${after ? 'après' : 'avant'} ${n} ?`,
    speak: `Quel nombre vient juste ${after ? 'après' : 'avant'} ${n} ?`,
    display: { maxLength: 3 },
    answer,
    explain: `On compte : ${after ? `${n}, ${answer}` : `${answer}, ${n}`}. `
      + `Juste ${after ? 'après' : 'avant'} ${n}, c'est ${answer}.`
      + `${(after ? answer : n) % 10 === 0 ? " On passe d'une dizaine à l'autre." : ''}`,
    skill: SKILL.between,
  };
}

/** « 47 < ? < 49 » : un seul nombre convient. */
function betweenKeypad(rng, level) {
  let a;
  if (level === 1) a = rng.int(10, 98);
  else a = rng.chance(0.4) ? 100 * rng.int(1, 8) + rng.int(97, 99) : rng.int(100, 997);
  const answer = a + 1;
  const crosses = Math.floor(a / 100) !== Math.floor((a + 2) / 100);
  return {
    key: `comparer:entre:${a}`,
    type: 'keypad',
    prompt: 'Quel nombre va dans la case ? Il est entre les deux.',
    speak: `Quel nombre est plus grand que ${a} et plus petit que ${a + 2} ?`,
    display: { show: { text: `${a} < ? < ${a + 2}`, math: true }, maxLength: 3 },
    answer,
    explain: crosses
      ? `On compte : ${a}, ${answer}, ${a + 2}. Après ${a} vient ${answer}, même quand la centaine change.`
      : `On compte : ${a}, ${answer}, ${a + 2}. Le nombre entre les deux est ${answer}.`,
    skill: SKILL.between,
  };
}

/** « 340 < ? < 360 » : parmi quatre nombres, un seul est strictement entre les deux. */
function betweenChoice(rng) {
  const width = rng.pick([10, 10, 20, 50, 100]);
  const lo = rng.int(10, 999 - width);
  const b = lo + width;
  const answer = rng.int(lo + 1, b - 1);
  // Leurres des deux côtés, une borne toujours parmi eux : « entre » ne compte ni 340 ni 360.
  const ok = (x) => x >= 10 && x <= 999;
  const below = [lo, lo - 1, lo - 10, lo - 2, lo - 11].filter(ok);
  const above = [b, b + 1, b + 10, b + 2, b + 11].filter(ok);
  const picks = spreadDecoys(rng, below, above);
  return {
    key: `comparer:entre-choix:${lo}:${b}:${answer}`,
    type: 'choice',
    prompt: 'Quel nombre va dans la case ? Il est entre les deux.',
    speak: `Quel nombre est plus grand que ${lo} et plus petit que ${b} ?`,
    display: { show: { text: `${lo} < ? < ${b}`, math: true }, choices: rng.shuffle([answer, ...picks]) },
    answer,
    explain: `Il faut un nombre plus grand que ${lo} et plus petit que ${b} : ${answer} convient. `
      + `${lo} et ${b} eux-mêmes ne comptent pas.`,
    skill: SKILL.between,
  };
}

const pairText = (s, step) => `${s} et ${s + step}`;

/** « Entre quelles dizaines (ou centaines) se trouve 468 ? » */
function frame(rng, level) {
  const units = level === 1 ? 'dizaines' : rng.chance(0.5) ? 'dizaines' : 'centaines';
  const step = units === 'dizaines' ? 10 : 100;
  let n;
  do {
    n = level === 1 ? rng.int(11, 99) : rng.int(101, 999);
    if (level === 3 && rng.chance(0.4)) n = step * Math.floor(n / step) + rng.pick(step === 10 ? [1, 9] : [1, 9, 11, 91, 99]);
  } while (n % step === 0 || n > 999);
  const start = step * Math.floor(n / step);
  const max = level === 1 ? 100 : 1000;
  const startsBelow = range(0, start / step - 1).map((k) => start - (k + 1) * step).filter((x) => x >= 0);
  const startsAbove = [];
  for (let x = start + step; x + step <= max; x += step) startsAbove.push(x);
  const wrong = spreadDecoys(rng, startsBelow, startsAbove);
  const right = pairText(start, step);
  const [h, t, u] = d3(n);
  const about = units === 'dizaines'
    ? (n < 100
      ? `${n}, c'est ${plural(t, 'dizaine')} et ${plural(u, 'unité')} : il est après ${start} et avant ${start + step}.`
      : `${n}, c'est ${plural(h, 'centaine')}, ${plural(t, 'dizaine')} et ${plural(u, 'unité')}. On regarde le chiffre des dizaines : ${t}. `
        + `Donc ${n} est après ${start} et avant ${start + step}.`)
    : `${n} commence par ${plural(h, 'centaine')} : il est après ${start} et avant ${start + step}.`;
  return {
    key: `comparer:encadrer:${units}:${n}`,
    type: 'choice',
    prompt: `Entre quelles ${units} se trouve ${n} ?`,
    speak: `Entre quelles ${units} se trouve ${n} ?`,
    display: { show: { text: String(n) }, choices: rng.shuffle([right, ...wrong.map((s) => pairText(s, step))]) },
    answer: right,
    explain: about,
    skill: SKILL.frame,
  };
}

/** « Écris la dizaine juste après 468 » : 470. */
function neighbour(rng) {
  const unitName = rng.chance(0.5) ? 'dizaine' : 'centaine';
  const step = unitName === 'dizaine' ? 10 : 100;
  const after = rng.chance(0.5);
  let n;
  do {
    n = rng.int(101, 999);
  } while (n % step === 0 || (after && step * (Math.floor(n / step) + 1) > 999));
  const start = step * Math.floor(n / step);
  const answer = after ? start + step : start;
  const ends = unitName === 'dizaine' ? 'un nombre qui finit par 0' : 'un nombre qui finit par 00';
  return {
    key: `comparer:voisin:${unitName}:${after ? 'après' : 'avant'}:${n}`,
    type: 'keypad',
    prompt: `Écris la ${unitName} juste ${after ? 'après' : 'avant'} ${n}, ${ends}.`,
    speak: `Quelle est la ${unitName} juste ${after ? 'après' : 'avant'} ${n} ?`,
    display: { maxLength: 3 },
    answer,
    explain: `${n} est entre ${start} et ${start + step}. `
      + `La ${unitName} juste ${after ? 'après' : 'avant'} ${n}, c'est ${answer}.`,
    skill: SKILL.neighbour,
  };
}

// --- Déroulé d'une partie ------------------------------------------------------------------------
// Chaque niveau a son paquet : 6 types d'échauffement (mélangés), puis 4 types plus exigeants
// (dans l'ordre), pour que la partie monte doucement en difficulté.

const DECKS = {
  1: [
    [
      (rng) => signPlain(rng, 1),
      (rng) => signPlain(rng, 1),
      (rng) => signSum(rng, 1),
      (rng) => extreme(rng, 1, 'max'),
      (rng) => extreme(rng, 1, 'min'),
      (rng) => signPlain(rng, 1),
    ],
    [
      (rng) => order(rng, 1),
      (rng) => betweenKeypad(rng, 1),
      (rng) => frame(rng, 1),
      (rng) => signSum(rng, 1),
    ],
  ],
  2: [
    [
      (rng) => signPlain(rng, 2),
      (rng) => signPlain(rng, 2),
      (rng) => signSum(rng, 2),
      (rng) => extreme(rng, 2, 'max'),
      (rng) => extreme(rng, 2, 'min'),
      (rng) => signPlain(rng, 2),
    ],
    [
      (rng) => order(rng, 2),
      (rng) => (rng.chance(0.5) ? betweenKeypad(rng, 2) : nextTo(rng)),
      (rng) => frame(rng, 2),
      (rng) => signSum(rng, 2),
    ],
  ],
  3: [
    [
      (rng) => signPlain(rng, 3),
      (rng) => signWords(rng),
      (rng) => signMaterial(rng),
      (rng) => extreme(rng, 3, 'max'),
      (rng) => extreme(rng, 3, 'min'),
      (rng) => signSum(rng, 3),
    ],
    [
      (rng) => order(rng, 3),
      (rng) => betweenChoice(rng),
      (rng) => frame(rng, 3),
      (rng) => neighbour(rng),
    ],
  ],
};

// Le paquet d'une partie est tiré au premier appel et retrouvé grâce à `seen` (un Set propre à
// chaque partie) : les nouveaux essais pour éviter un doublon gardent le même type de question.
const decks = new WeakMap();

function deckFor(level, rng, seen) {
  const saved = decks.get(seen);
  if (saved && saved.level === level) return saved.deck;
  const [warmup, harder] = DECKS[level];
  const deck = [...rng.shuffle(warmup), ...harder];
  decks.set(seen, { level, deck });
  return deck;
}

export default {
  id: 'comparer',
  title: 'Plus grand, plus petit',
  island: 'nombres',
  subject: 'maths',
  issue: 48,
  skills: [
    'Comparer des nombres avec les signes <, > et =',
    'Ranger des nombres dans l\'ordre croissant et décroissant',
    'Encadrer et intercaler des nombres jusqu\'à 1000',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'Comparer, ranger, encadrer jusqu\'à 100' },
    { label: 'Niveau 2', hint: 'Jusqu\'à 1000, avec les pièges (409 et 490)' },
    { label: 'Niveau 3', hint: 'Ranger 5 nombres, intercaler, nombres en lettres et matériel' },
  ],
  makeQuestion(level, rng, seen) {
    if (!seen) return rng.pick(DECKS[level].flat())(rng);
    const deck = deckFor(level, rng, seen);
    return deck[seen.size % deck.length](rng);
  },
};
