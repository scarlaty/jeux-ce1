// Calcul mental (CE1, programmes 2024) : additions et soustractions jusqu'à 20, 100 puis 1000.
// Chaque type de calcul vient avec SA stratégie : après une erreur, l'explication montre
// le chemin (« 38 + 7 : 38 + 2 = 40, puis 40 + 5 = 45. ») et pas seulement le résultat.
//
// Une partie suit un « paquet » de types de calculs (DECKS) : chaque notion du niveau revient
// au moins une fois sur 10 questions, et les calculs avec passage de la dizaine arrivent en
// fin de partie, quand l'enfant est échauffé.

const MINUS = '−';   // vrai signe « − » (pas le trait d'union)
const SIGN = { '+': '+', '-': MINUS };
const WORD = { '+': 'plus', '-': 'moins' };
const PROMPT_RESULT = 'Calcule dans ta tête, puis tape le résultat.';
const PROMPT_HOLE = 'Trouve le nombre qui manque.';

const tens = (n) => Math.floor(n / 10) * 10;
const units = (n) => n % 10;
const hundreds = (n) => Math.floor(n / 100) * 100;

/**
 * Question « a op b = c » dont l'inconnue est `hole` ('c' : le résultat, 'a' ou 'b' : calcul
 * à trou). `explain` : la stratégie, affichée après une erreur.
 */
function calc({ a, op, b, hole = 'c', skill, explain, prompt, speak }) {
  const c = op === '+' ? a + b : a - b;
  const terms = { a, b, c };
  const shown = (k) => (k === hole ? '?' : String(terms[k]));
  const text = `${shown('a')} ${SIGN[op]} ${shown('b')} = ${shown('c')}`;
  return {
    key: `calcul-mental:${text}`,
    type: 'keypad',
    prompt: prompt || (hole === 'c' ? PROMPT_RESULT : PROMPT_HOLE),
    speak: speak || speakCalc(terms, op, hole),
    display: { show: { text, math: true }, maxLength: 4 },
    answer: terms[hole],
    explain,
    skill,
  };
}

/** Le calcul lu à voix haute, avec des mots (la synthèse lit les nombres en chiffres). */
function speakCalc({ a, b, c }, op, hole) {
  if (hole === 'a') return `Combien ${WORD[op]} ${b} égale ${c} ?`;
  if (hole === 'b') return `${a} ${WORD[op]} combien égale ${c} ?`;
  return `Combien font ${a} ${WORD[op]} ${b} ?`;
}

const plus = (x, y) => `${x} + ${y} = ${x + y}`;
const minus = (x, y) => `${x} ${MINUS} ${y} = ${x - y}`;

// --- Stratégies (explications) -----------------------------------------------------------------

/** Ajouter un nombre à 1 chiffre en passant par la dizaine : 38 + 7 → 38 + 2 = 40, puis 40 + 5. */
function viaTenUp(a, b) {
  return `${a} + ${b} : ${tenUpSteps(a, b)}.`;
}

function tenUpSteps(a, b) {
  const toTen = 10 - units(a);
  return `${plus(a, toTen)}, puis ${plus(a + toTen, b - toTen)}`;
}

/** Retirer un nombre à 1 chiffre en passant par la dizaine : 52 − 7 → 52 − 2 = 50, puis 50 − 5. */
function viaTenDown(a, b) {
  const u = units(a);
  return `${a} ${MINUS} ${b} : ${minus(a, u)}, puis ${minus(a - u, b - u)}.`;
}

/** Calcul sur les unités seules : 43 + 5 → 3 + 5 = 8, donc 48. */
function onUnits(a, op, b) {
  const u = units(a);
  const step = op === '+' ? plus(u, b) : minus(u, b);
  const result = op === '+' ? a + b : a - b;
  return `${a} ${SIGN[op]} ${b} : ${step}, donc ${result}.`;
}

const opFn = (op) => (op === '+' ? plus : minus);
const apply = (a, op, b) => (op === '+' ? a + b : a - b);

/** Jusqu'à 100 : 34 + 20 → 30 + 20 = 50, puis 50 + 4 = 54 ; 30 + 20 → 3 + 2 = 5, donc 30 + 20 = 50. */
function onTens(a, op, b) {
  const t = tens(a);
  const u = units(a);
  const step = opFn(op);
  if (u === 0) return `${step(a / 10, b / 10)}, donc ${step(a, b)}.`;
  return `${a} ${SIGN[op]} ${b} : ${step(t, b)}, puis ${plus(apply(t, op, b), u)}.`;
}

/** Jusqu'à 1000, seul le chiffre des dizaines change : 560 − 30 → 60 − 30 = 30, donc 530. */
function onTensDigit(a, op, b) {
  return `${a} ${SIGN[op]} ${b} : ${opFn(op)(tens(a) % 100, b)}, donc ${apply(a, op, b)}.`;
}

/** Seul le chiffre des centaines change : 340 + 200 → 300 + 200 = 500, donc 540. */
function onHundreds(a, op, b) {
  return `${a} ${SIGN[op]} ${b} : ${opFn(op)(hundreds(a), b)}, donc ${apply(a, op, b)}.`;
}

// --- Types de calculs ------------------------------------------------------------------------
// Chaque fabrique reçoit `rng` et renvoie une question. Les bornes de chaque niveau
// (20, 100, 1000) sont vérifiées par les tests sur tous les nombres affichés.

const SKILL = {
  complement10: 'compléments à 10',
  doubles: 'doubles',
  nearDoubles: 'presque-doubles',
  oneMore: 'ajouter ou retirer 1',
  tenMore: 'ajouter ou retirer 10',
  noCarry: 'calculer sans passer la dizaine',
  carryAdd: 'additions avec passage de la dizaine',
  carrySub: 'soustractions avec passage de la dizaine',
  tens: 'ajouter ou retirer des dizaines',
  hundreds: 'ajouter ou retirer des centaines',
  nextTen: 'compléments à la dizaine supérieure',
  halves: 'moitiés',
  add2: 'additionner deux nombres à 2 chiffres',
  sub2: 'soustraire deux nombres à 2 chiffres',
  complement100: 'compléments à 100',
  missing: 'calculs à trou',
};

// Niveau 1 : nombres jusqu'à 20 ----------------------------------------------------------------

function complement10(rng) {
  const a = rng.int(1, 9);
  const b = 10 - a;
  const s = (n) => (n > 1 ? 's' : '');
  const tip = `${plus(a, b)} : sur tes 10 doigts, ${a} levé${s(a)} et ${b} baissé${s(b)}.`;
  if (rng.chance(0.7)) {
    return calc({ a, op: '+', b, hole: 'b', skill: SKILL.complement10, explain: tip });
  }
  return calc({ a: 10, op: '-', b: a, skill: SKILL.complement10, explain: `${minus(10, a)}, car ${tip}` });
}

function double1(rng) {
  const n = rng.int(2, 10);
  return calc({ a: n, op: '+', b: n, skill: SKILL.doubles, explain: explainDouble(n) });
}

function explainDouble(n) {
  if (n <= 5) return `${plus(n, n)} : ${n} doigts sur chaque main, ça fait ${2 * n}.`;
  if (n % 10 === 0) return `${n} + ${n} : ${plus(n / 10, n / 10)}, donc ${plus(n, n)}.`;
  if (n < 10) return `${n} + ${n} : ${plus(5, 5)}, ${plus(n - 5, n - 5)}, puis ${plus(10, 2 * (n - 5))}.`;
  const t = tens(n);
  const u = units(n);
  return `${n} + ${n} : ${plus(t, t)}, ${plus(u, u)}, puis ${plus(2 * t, 2 * u)}.`;
}

function nearDouble(rng) {
  const n = rng.int(2, 9);
  const [a, b] = rng.chance() ? [n, n + 1] : [n + 1, n];
  return calc({
    a, op: '+', b, skill: SKILL.nearDoubles,
    explain: `${a} + ${b} : ${plus(n, n)}, puis ${plus(2 * n, 1)}.`,
  });
}

function oneMore(rng) {
  if (rng.chance()) {
    const a = rng.int(1, 19);
    return calc({ a, op: '+', b: 1, skill: SKILL.oneMore, explain: `Juste après ${a}, il y a ${a + 1} : ${plus(a, 1)}.` });
  }
  const a = rng.int(2, 20);
  return calc({ a, op: '-', b: 1, skill: SKILL.oneMore, explain: `Juste avant ${a}, il y a ${a - 1} : ${minus(a, 1)}.` });
}

function tenMore(rng) {
  if (rng.chance()) {
    const a = rng.int(1, 10);
    const [x, y] = rng.chance() ? [a, 10] : [10, a];
    return calc({
      a: x, op: '+', b: y, skill: SKILL.tenMore,
      explain: (a === 10 ? `${plus(10, 10)} : 1 dizaine et encore 1 dizaine, ça fait 2 dizaines.`
        : `${plus(x, y)} : 1 dizaine et ${a} unités.`),
    });
  }
  const a = rng.int(11, 20);
  return calc({
    a, op: '-', b: 10, skill: SKILL.tenMore,
    explain: `${minus(a, 10)} : j'enlève la dizaine, il reste ${a - 10}.`,
  });
}

/**
 * 13 + 4, 47 − 5 : on calcule sur les unités, sans franchir la dizaine. `a` a de 1 à 8 unités.
 * On ajoute ou retire au moins 2 (« + 1 » et « − 1 » ont leur propre type).
 */
function noCarry(rng, a) {
  const u = units(a);
  const op = u === 1 || (u < 8 && rng.chance()) ? '+' : '-';
  const b = op === '+' ? rng.int(2, 9 - u) : rng.int(2, u);
  return calc({ a, op, b, skill: SKILL.noCarry, explain: onUnits(a, op, b) });
}

const noCarry20 = (rng) => noCarry(rng, rng.int(11, 18));

/** 9 + 6, 7 + 5… On complète le plus grand nombre à 10. `easy` : un des nombres est 8 ou 9. */
function carryAdd20(rng, { easy = false } = {}) {
  let big;
  let small;
  do {
    big = easy ? rng.int(8, 9) : rng.int(3, 9);
    small = rng.int(2, 9);
    // Doubles (6 + 6) et presque-doubles (6 + 7) ont leur propre type et leur propre stratégie.
  } while (big + small <= 10 || big - small < 2);
  const [a, b] = rng.chance() ? [big, small] : [small, big];
  return calc({
    a, op: '+', b, skill: SKILL.carryAdd,
    explain: (a === big ? viaTenUp(a, b)
      : `${a} + ${b}, c'est comme ${big} + ${small} : ${tenUpSteps(big, small)}.`),
  });
}

/** 15 − 8 : 15 − 5 = 10, puis 10 − 3 = 7. */
function carrySub20(rng) {
  const a = rng.int(11, 18);
  const b = rng.int(units(a) + 1, 9);
  return calc({ a, op: '-', b, skill: SKILL.carrySub, explain: viaTenDown(a, b) });
}

// Niveau 2 : nombres jusqu'à 100 ---------------------------------------------------------------

function addTens(rng) {
  const a = rng.int(11, 89);
  const b = 10 * rng.int(1, Math.floor((99 - a) / 10));
  return calc({ a, op: '+', b, skill: SKILL.tens, explain: onTens(a, '+', b) });
}

function subTens(rng) {
  const a = rng.int(21, 99);
  const b = 10 * rng.int(1, Math.floor(a / 10) - 1);
  return calc({ a, op: '-', b, skill: SKILL.tens, explain: onTens(a, '-', b) });
}

/** Nombre de 21 à 98 dont le chiffre des unités va de 1 à 8. */
function twoDigits(rng) {
  return 10 * rng.int(2, 9) + rng.int(1, 8);
}

const noCarry100 = (rng) => noCarry(rng, twoDigits(rng));

function carryAdd100(rng) {
  let a;
  let b;
  do {
    a = rng.int(12, 89);
    b = rng.int(2, 9);
  } while (units(a) + b <= 10 || a + b > 99);
  return calc({ a, op: '+', b, skill: SKILL.carryAdd, explain: viaTenUp(a, b) });
}

function carrySub100(rng) {
  const a = twoDigits(rng);
  const b = rng.int(units(a) + 1, 9);
  return calc({ a, op: '-', b, skill: SKILL.carrySub, explain: viaTenDown(a, b) });
}

function nextTen(rng) {
  let a;
  do { a = rng.int(11, 99); } while (units(a) === 0);
  const u = units(a);
  const target = tens(a) + 10;
  return calc({
    a, op: '+', b: 10 - u, hole: 'b', skill: SKILL.nextTen,
    explain: `Pour aller de ${a} à ${target} : ${plus(u, 10 - u)}, donc ${plus(a, 10 - u)}.`,
  });
}

const DOUBLES_2 = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 30, 31, 32, 33, 34, 35, 40, 41, 42, 43, 44, 45, 50];

function double2(rng) {
  const n = rng.pick(DOUBLES_2);
  return calc({
    a: n, op: '+', b: n, skill: SKILL.doubles,
    prompt: `Calcule le double de ${n}.`,
    speak: `Quel est le double de ${n} ?`,
    explain: explainDouble(n),
  });
}

// Moitiés « simples » : jusqu'à 20, dizaines entières, et nombres aux deux chiffres pairs.
const HALVES = [
  4, 6, 8, 10, 12, 14, 16, 18, 20, 30, 40, 50, 60, 70, 80, 90, 100,
  22, 24, 26, 28, 42, 44, 46, 48, 62, 64, 66, 68, 82, 84, 86, 88,
];

function half(rng) {
  const n = rng.pick(HALVES);
  const h = n / 2;
  // « ? + ? = 46 » : la moitié, c'est le nombre qui, ajouté à lui-même, donne 46.
  return {
    key: `calcul-mental:moitié:${n}`,
    type: 'keypad',
    prompt: `Trouve la moitié de ${n}.`,
    speak: `Quelle est la moitié de ${n} ?`,
    display: { show: { text: `? + ? = ${n}`, math: true }, maxLength: 4 },
    answer: h,
    explain: explainHalf(n),
    skill: SKILL.halves,
  };
}

function explainHalf(n) {
  const h = n / 2;
  const check = `${plus(h, h)}, donc la moitié de ${n} est ${h}.`;
  if (n <= 20 || units(n) === 0 && (n / 10) % 2 === 0) return check;
  if (units(n) === 0) {
    // 30, 50, 70, 90 : on coupe en deux une dizaine de moins, puis 10.
    return `${n}, c'est ${n - 10} et 10. La moitié de ${n - 10} est ${(n - 10) / 2}, la moitié de 10 est 5 : ${plus((n - 10) / 2, 5)}.`;
  }
  const t = tens(n);
  const u = units(n);
  return `La moitié de ${t} est ${t / 2}, la moitié de ${u} est ${u / 2} : ${plus(t / 2, u / 2)}.`;
}

// Niveau 3 : nombres jusqu'à 1000 --------------------------------------------------------------

/** 347 + 30, 560 − 30 : le chiffre des dizaines change, sans changer de centaine. */
function tens3(rng, op) {
  const h = 100 * rng.int(1, 9);
  const u = rng.chance() ? 0 : rng.int(1, 9);
  // Ajout : le chiffre des dizaines reste ≤ 9 ; retrait : il reste ≥ 0.
  const t = op === '+' ? rng.int(1, 8) : rng.int(2, 9);
  const b = 10 * (op === '+' ? rng.int(1, 9 - t) : rng.int(1, t));
  const a = h + 10 * t + u;
  return calc({ a, op, b, skill: SKILL.tens, explain: onTensDigit(a, op, b) });
}

/** 340 + 200, 785 − 300 : seul le chiffre des centaines change (résultat < 1000). */
function hundreds3(rng, op) {
  const rest = rng.chance() ? 10 * rng.int(0, 9) : rng.int(1, 99);
  const h = op === '+' ? rng.int(1, 8) : rng.int(2, 9);
  const b = 100 * (op === '+' ? rng.int(1, 9 - h) : rng.int(1, h - 1));
  const a = 100 * h + rest;
  return calc({ a, op, b, skill: SKILL.hundreds, explain: onHundreds(a, op, b) });
}

/** 45 + 27 : 45 + 20 = 65, puis 65 + 7 = 72 (on ajoute d'abord les dizaines). */
function add2digits(rng) {
  let a;
  let b;
  do {
    a = rng.int(11, 79);
    b = rng.int(11, 79);
  } while (units(b) === 0 || units(a) === 0 || a + b > 100);
  return calc({
    a, op: '+', b, skill: SKILL.add2,
    explain: `${a} + ${b} : ${plus(a, tens(b))}, puis ${plus(a + tens(b), units(b))}.`,
  });
}

/** 72 − 27 : 72 − 20 = 52, puis 52 − 7 = 45. */
function sub2digits(rng) {
  let a;
  let b;
  do {
    a = rng.int(31, 99);
    b = rng.int(11, 89);
  } while (units(b) === 0 || a - b < 10);
  return calc({
    a, op: '-', b, skill: SKILL.sub2,
    explain: `${a} ${MINUS} ${b} : ${minus(a, tens(b))}, puis ${minus(a - tens(b), units(b))}.`,
  });
}

/** 65 + ? = 100 : 65 + 5 = 70, puis 70 + 30 = 100. */
function complement100(rng) {
  const a = rng.chance(0.3) ? 10 * rng.int(1, 9) : rng.int(11, 99);
  const b = 100 - a;
  let explain;
  if (units(a) === 0) {
    explain = `${plus(a / 10, b / 10)}, donc ${plus(a, b)}.`;
  } else {
    const toTen = 10 - units(a);
    const next = a + toTen;
    explain = next === 100
      ? `${plus(a, toTen)} : il manque ${toTen}.`
      : `${plus(a, toTen)}, puis ${plus(next, 100 - next)}. J'ai ajouté ${plus(toTen, 100 - next)}.`;
  }
  return calc({ a, op: '+', b, hole: 'b', skill: SKILL.complement100, explain });
}

/** Deux nombres « amis » pour les calculs à trou : 7 et 8, 35 et 20, 46 et 30… */
function missingPair(rng) {
  if (rng.chance(0.4)) {
    let x;
    let y;
    do { x = rng.int(2, 9); y = rng.int(2, 9); } while (x + y <= 10);
    return [x, y];
  }
  const x = rng.int(11, 69);
  const y = 10 * rng.int(1, Math.floor((99 - x) / 10));
  return rng.chance() ? [x, y] : [y, x];
}

/** Calculs à trou : 7 + ? = 15, ? + 8 = 23, 42 − ? = 30, ? − 20 = 35. */
function missing(rng, variant) {
  const [x, y] = missingPair(rng);
  const s = x + y;
  const v = variant ?? rng.int(0, 3);
  const skill = SKILL.missing;
  if (v === 0) {
    return calc({ a: x, op: '+', b: y, hole: 'b', skill, explain: `Je calcule ${minus(s, x)}. Je vérifie : ${plus(x, y)}.` });
  }
  if (v === 1) {
    return calc({ a: x, op: '+', b: y, hole: 'a', skill, explain: `Je calcule ${minus(s, y)}. Je vérifie : ${plus(x, y)}.` });
  }
  if (v === 2) {
    // s − ? = x : le nombre qui manque est y.
    return calc({ a: s, op: '-', b: y, hole: 'b', skill, explain: `Je calcule ${minus(s, x)}. Je vérifie : ${minus(s, y)}.` });
  }
  // ? − y = x : le nombre qui manque est s.
  return calc({ a: s, op: '-', b: y, hole: 'a', skill, explain: `Je calcule ${plus(x, y)}. Je vérifie : ${minus(s, y)}.` });
}

// --- Déroulé d'une partie ----------------------------------------------------------------------

const pickOp = (rng) => (rng.chance() ? '+' : '-');

/** Pour chaque niveau : [types d'échauffement (mélangés)], puis [types plus durs (dans l'ordre)]. */
const DECKS = {
  1: [
    [complement10, double1, nearDouble, oneMore, tenMore, noCarry20],
    [(rng) => carryAdd20(rng, { easy: true }), carryAdd20, carrySub20, carrySub20],
  ],
  2: [
    [addTens, subTens, noCarry100, nextTen, double2, half],
    [carryAdd100, carrySub100, carryAdd100, carrySub100],
  ],
  3: [
    [(rng) => tens3(rng, '+'), (rng) => tens3(rng, '-'), (rng) => hundreds3(rng, '+'), (rng) => hundreds3(rng, '-')],
    [add2digits, sub2digits, complement100, complement100, (rng) => missing(rng), (rng) => missing(rng)],
  ],
};

// Le paquet d'une partie est tiré au premier appel et retrouvé grâce à `seen` (un Set propre
// à chaque partie) : les nouveaux essais pour éviter un doublon gardent le même type de calcul.
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
  id: 'calcul-mental',
  title: 'Calcul mental',
  island: 'nombres',
  subject: 'maths',
  issue: 52,
  skills: [
    'Mémoriser les faits numériques : compléments à 10, doubles et moitiés',
    'Calculer mentalement des sommes et des différences jusqu\'à 1000',
    'Utiliser une stratégie : passer par la dizaine, décomposer, s\'appuyer sur un double',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'Jusqu\'à 20 : doubles, compléments à 10, passer la dizaine' },
    { label: 'Niveau 2', hint: 'Jusqu\'à 100 : dizaines, doubles et moitiés' },
    { label: 'Niveau 3', hint: 'Jusqu\'à 1000 : centaines, compléments à 100, nombres qui manquent' },
  ],
  makeQuestion(level, rng, seen) {
    if (!seen) return rng.pick(DECKS[level].flat())(rng);
    const deck = deckFor(level, rng, seen);
    return deck[seen.size % deck.length](rng);
  },
};
