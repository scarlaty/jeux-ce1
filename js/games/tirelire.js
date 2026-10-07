// La tirelire (CE1, programmes 2024) : pièces et billets en euros.
//  - niveau 1 : reconnaître les pièces et billets, compter une somme jusqu'à 50 €, comparer deux sommes ;
//  - niveau 2 : composer une somme jusqu'à 100 € (toute composition juste est acceptée), compter, comparer ;
//  - niveau 3 : rendre la monnaie, et les centimes (50 c, 20 c, 10 c) avec des sommes simples.
//
// Tout est calculé en centimes (entiers) : pas de nombre à virgule au CE1, on écrit « 2 € et 50 c ».
// Les pièces et billets sont dessinés par le socle (`art: { kind: 'money', pieces: [500, 200] }`) ;
// la composition utilise le type `amount` (`js/core/ui/amount.js`) dont la réponse est le TOTAL posé.
import { money, moneySpoken } from '../core/ui/art/money.js';
import { fewestPieces } from '../core/amount.js';

const E = (euros) => euros * 100;
const sum = (list) => list.reduce((t, v) => t + v, 0);
const desc = (list) => [...list].sort((a, b) => b - a);
const tray = (pieces) => ({ kind: 'money', pieces: desc(pieces) });
const euros = (cents) => cents / 100;

const SKILL = {
  recognize: 'reconnaître les pièces et les billets',
  count: 'compter une somme en euros',
  compare: 'comparer des sommes d\'argent',
  compose: 'composer une somme avec des pièces et des billets',
  change: 'rendre la monnaie',
  cents: 'compter avec les centimes',
};

// --- Tirage de pièces ---------------------------------------------------------------------------

/** `count` pièces tirées dans `denoms` dont le total est dans [min, max] (en centimes). */
function randomPieces(rng, denoms, [nMin, nMax], [min, max]) {
  for (let i = 0; i < 300; i += 1) {
    const pieces = Array.from({ length: rng.int(nMin, nMax) }, () => rng.pick(denoms));
    const total = sum(pieces);
    if (total >= min && total <= max) return desc(pieces);
  }
  return desc([denoms[denoms.length - 1], denoms[0]]);
}

// --- Compter, comparer, reconnaître -------------------------------------------------------------

const COUNT = {
  1: { denoms: [E(1), E(2), E(5), E(10), E(20)], n: [3, 6], total: [E(8), E(50)] },
  2: { denoms: [E(1), E(2), E(5), E(10), E(20), E(50)], n: [4, 7], total: [E(30), E(100)] },
};

function countSum(rng, level) {
  const { denoms, n, total } = COUNT[level];
  const pieces = randomPieces(rng, denoms, n, total);
  const t = euros(sum(pieces));
  return {
    key: `tirelire:compter:${pieces.join('-')}`,
    type: 'keypad',
    prompt: 'Combien d\'argent y a-t-il ?',
    speak: 'Combien d\'argent y a-t-il ?',
    display: { show: { art: tray(pieces) }, maxLength: 3, suffix: ' €' },
    answer: t,
    explain: `On additionne tout : ${pieces.map(euros).join(' + ')} = ${t}. Il y a ${t} €.`,
    skill: SKILL.count,
  };
}

const COMPARE = {
  1: { denoms: COUNT[1].denoms, n: [2, 5], total: [E(5), E(45)], gap: E(3) },
  2: { denoms: COUNT[2].denoms, n: [2, 7], total: [E(15), E(100)], gap: E(5) },
};

function compareSums(rng, level) {
  const { denoms, n, total, gap } = COMPARE[level];
  const wantSmall = rng.chance(0.5);
  const trap = rng.chance(0.6);   // la somme la plus grande a moins de pièces : on ne compte pas les pièces !
  let a = null;
  let b = null;
  for (let i = 0; i < 300; i += 1) {
    a = randomPieces(rng, denoms, n, total);
    b = randomPieces(rng, denoms, n, total);
    const [big, small] = sum(a) > sum(b) ? [a, b] : [b, a];
    if (Math.abs(sum(a) - sum(b)) < gap) continue;
    if (!trap || big.length < small.length) break;
  }
  const [tA, tB] = [euros(sum(a)), euros(sum(b))];
  const answerIsA = wantSmall ? tA < tB : tA > tB;
  const [big, small] = tA > tB ? [tA, tB] : [tB, tA];
  const name = wantSmall ? 'petite' : 'grande';
  const verb = wantSmall ? `${small} est plus petit que ${big}` : `${big} est plus grand que ${small}`;
  return {
    key: `tirelire:comparer:${a.join('-')}|${b.join('-')}:${name}`,
    type: 'choice',
    prompt: `Quelle somme est la plus ${name}, A ou B ?`,
    display: {
      choices: [
        { value: 'A', text: 'A', art: tray(a) },
        { value: 'B', text: 'B', art: tray(b) },
      ],
    },
    answer: answerIsA ? 'A' : 'B',
    explain: `La somme A fait ${tA} €, la somme B fait ${tB} €. ${verb} : c'est ${answerIsA ? 'A' : 'B'}.`,
    skill: SKILL.compare,
  };
}

const NOTE_COLOR = { [E(5)]: 'gris', [E(10)]: 'rouge', [E(20)]: 'bleu' };

function recognize(rng) {
  const notes = [E(5), E(10), E(20)];
  const coins = [E(1), E(2)];
  const wantNote = rng.chance(0.5);
  const target = rng.pick(wantNote ? notes : coins);
  const others = wantNote ? notes.filter((v) => v !== target) : [...coins.filter((v) => v !== target), rng.pick(notes.slice(0, 2))];
  const values = rng.shuffle([target, ...others]);
  const kind = wantNote ? 'le billet' : 'la pièce';
  const wording = `${euros(target)} €`;
  return {
    key: `tirelire:reconnaitre:${target}`,
    type: 'choice',
    prompt: `Touche ${kind} de ${euros(target)}${' '}€.`,
    speak: `Touche ${kind} de ${moneySpoken(target)}.`,
    display: { choices: values.map((v) => ({ value: v, art: tray([v]) })) },
    answer: target,
    explain: wantNote
      ? `Sur un billet, le nombre est écrit en gros. Le billet de ${wording} est ${NOTE_COLOR[target]}.`
      : `Sur une pièce, le nombre est écrit au milieu : ici, ${wording}. Un billet n'est pas une pièce.`,
    skill: SKILL.recognize,
  };
}

// --- Composer une somme -------------------------------------------------------------------------

// Ce que l'enfant peut poser : toutes les pièces et tous les billets, ou seulement quelques-uns.
const PALETTES = [
  { id: 'tout', values: [1, 2, 5, 10, 20, 50], targets: rangeOf(11, 99).filter((t) => ![20, 50].includes(t)), with: 'avec des pièces et des billets' },
  { id: 'tout', values: [1, 2, 5, 10, 20, 50], targets: rangeOf(11, 99).filter((t) => ![20, 50].includes(t)), with: 'avec des pièces et des billets' },
  { id: 'tout', values: [1, 2, 5, 10, 20, 50], targets: rangeOf(11, 99).filter((t) => ![20, 50].includes(t)), with: 'avec des pièces et des billets' },
  { id: 'billets', values: [5, 10, 20], targets: rangeOf(3, 19).map((n) => n * 5), with: 'avec des billets' },
  { id: 'pieces', values: [1, 2], targets: rangeOf(4, 15), with: 'avec des pièces de 1 € et de 2 €' },
  { id: 'gros', values: [10, 20, 50], targets: rangeOf(3, 10).map((n) => n * 10), with: 'avec des billets de 10 €, 20 € et 50 €' },
];

function rangeOf(from, to) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function compose(rng) {
  const palette = rng.pick(PALETTES);
  const target = rng.pick(palette.targets);
  const options = palette.values.map((v) => ({ value: v, label: money(E(v)), art: tray([E(v)]) }));
  const example = fewestPieces(target, palette.values);
  return {
    key: `tirelire:composer:${target}:${palette.id}`,
    type: 'amount',
    prompt: `Compose ${target}${' '}€ ${palette.with}.`,
    speak: `Compose ${moneySpoken(E(target))} ${palette.with.replace(/(\d+) €/g, (_, n) => moneySpoken(E(Number(n))))}.`,
    display: { show: { text: `${target}${' '}€` }, options, suffix: ' €', maxPieces: 30 },
    answer: target,
    explain: `Il fallait faire ${target} €. Par exemple : ${example.map((v) => `${v}${' '}€`).join(' + ')}. Il y a plusieurs façons d'y arriver !`,
    skill: SKILL.compose,
  };
}

// --- Rendre la monnaie --------------------------------------------------------------------------

// Objets à acheter : prix possibles en euros (lo à hi) ou en centimes (multiples de 10).
const EURO_ITEMS = [
  { emoji: '🍎', name: 'une pomme', lo: 1, hi: 3 },
  { emoji: '🍦', name: 'une glace', lo: 2, hi: 5 },
  { emoji: '🍰', name: 'un gâteau', lo: 2, hi: 8 },
  { emoji: '📓', name: 'un cahier', lo: 2, hi: 9 },
  { emoji: '📖', name: 'un livre', lo: 4, hi: 19 },
  { emoji: '🧸', name: 'un nounours', lo: 5, hi: 19 },
  { emoji: '⚽', name: 'un ballon de foot', lo: 6, hi: 19 },
  { emoji: '🎒', name: 'un cartable', lo: 15, hi: 49 },
];
const CENT_ITEMS = [
  { emoji: '🍬', name: 'un bonbon', lo: 10, hi: 50 },
  { emoji: '🍪', name: 'un biscuit', lo: 20, hi: 60 },
  { emoji: '🍭', name: 'une sucette', lo: 20, hi: 70 },
  { emoji: '✏️', name: 'un crayon', lo: 30, hi: 90 },
  { emoji: '🎈', name: 'un ballon', lo: 30, hi: 90 },
];

const NB = ' ';

function changeEuros(rng) {
  const item = rng.pick(EURO_ITEMS);
  const price = rng.int(item.lo, item.hi);
  const paid = rng.pick([5, 10, 20, 50].filter((note) => note > price && note - price <= 30));
  const change = paid - price;
  return {
    key: `tirelire:monnaie:${item.name}:${price}:${paid}`,
    type: 'keypad',
    prompt: `Tu achètes ${item.name} à ${price}${NB}€. Tu paies avec un billet de ${paid}${NB}€. Combien te rend-on ?`,
    speak: `Tu achètes ${item.name} à ${moneySpoken(E(price))}. Tu paies avec un billet de ${moneySpoken(E(paid))}. Combien te rend-on ?`,
    display: { show: { art: tray([E(paid)]), emoji: item.emoji, label: item.name }, maxLength: 2, suffix: ' €' },
    answer: change,
    explain: `On rend ce qui reste : ${paid} − ${price} = ${change}. Pour aller de ${price} jusqu'à ${paid}, il manque ${change}. On te rend ${change} €.`,
    skill: SKILL.change,
  };
}

function changeCents(rng) {
  const item = rng.pick(CENT_ITEMS);
  const price = rng.int(item.lo / 10, item.hi / 10) * 10;
  const change = 100 - price;
  return {
    key: `tirelire:monnaie-c:${item.name}:${price}`,
    type: 'keypad',
    prompt: `Tu achètes ${item.name} à ${price}${NB}c. Tu paies avec une pièce de 1${NB}€. Combien te rend-on ?`,
    speak: `Tu achètes ${item.name} à ${moneySpoken(price)}. Tu paies avec une pièce de un euro. Combien te rend-on, en centimes ?`,
    display: { show: { art: tray([E(1)]), emoji: item.emoji, label: item.name }, maxLength: 2, suffix: ' c' },
    answer: change,
    explain: `1 € vaut 100 c. On rend ce qui reste : 100 − ${price} = ${change}. On te rend ${change} c.`,
    skill: SKILL.change,
  };
}

/** Quatre propositions : la bonne et trois fausses, de la plus petite à la plus grande somme. */
function amountChoices(rng, right, wrong) {
  const fakes = [...new Set(wrong)].filter((v) => v > 0 && v !== right);
  const picked = rng.shuffle(fakes).slice(0, 3);
  return [...picked, right].sort((a, b) => a - b).map((v) => ({ value: money(v), text: money(v) }));
}

function changeMixed(rng) {
  const item = rng.pick(EURO_ITEMS.filter((it) => it.lo <= 9));
  const e = rng.int(item.lo, Math.min(item.hi, 9));
  const price = E(e) + rng.pick([10, 20, 50]);
  const paid = rng.pick([E(2), E(5), E(10)].filter((p) => p > price && p - price <= E(7)));
  const change = paid - price;
  const choices = amountChoices(rng, change, [change + 10, change - 10, change + 100, change - 100, paid - E(e), paid - E(e) - 100]);
  return {
    key: `tirelire:monnaie-mixte:${item.name}:${price}:${paid}`,
    type: 'choice',
    prompt: `Tu achètes ${item.name} à ${money(price)}. Tu paies avec ${paid === E(2) ? 'une pièce' : 'un billet'} de ${money(paid)}. Combien te rend-on ?`,
    speak: `Tu achètes ${item.name} à ${moneySpoken(price)}. Tu paies avec ${paid === E(2) ? 'une pièce' : 'un billet'} de ${moneySpoken(paid)}. Combien te rend-on ?`,
    display: { choices, show: { art: tray([paid]), emoji: item.emoji, label: item.name } },
    answer: money(change),
    explain: `Pour aller de ${money(price)} jusqu'à ${money(paid)}, il manque ${money(change)}. On te rend ${money(change)}.`,
    skill: SKILL.change,
  };
}

// --- Les centimes -------------------------------------------------------------------------------

function coinsWithCents(rng) {
  let pieces = [];
  let total = 0;
  for (let i = 0; i < 300; i += 1) {
    const big = Array.from({ length: rng.int(0, 2) }, () => rng.pick([E(1), E(2)]));
    const small = Array.from({ length: rng.int(2, 4) }, () => rng.pick([10, 20, 50]));
    pieces = desc([...big, ...small]);
    total = sum(pieces);
    if (total % 100 !== 0 && total >= 30 && total <= 700) break;
  }
  const choices = amountChoices(rng, total, [total + 10, total - 10, total + 20, total - 20, total + 100, total - 100, total + 50, total - 50]);
  const terms = pieces.map((v) => money(v)).join(' + ');
  return {
    key: `tirelire:centimes:${pieces.join('-')}`,
    type: 'choice',
    prompt: 'Combien d\'argent y a-t-il ?',
    speak: 'Combien d\'argent y a-t-il ?',
    display: { show: { art: tray(pieces) }, choices },
    answer: money(total),
    explain: `On additionne : ${terms} = ${money(total)}. Rappel : 100 c font 1 €.`,
    skill: SKILL.cents,
  };
}

// --- Déroulé d'une partie -----------------------------------------------------------------------

const MAKERS = { count: countSum, compare: compareSums, recognize, compose, changeEuros, changeCents, changeMixed, coinsWithCents };

// Dix questions par partie, dans un ordre varié ; `seen.size` désigne la place de la question.
const SLOTS = {
  1: ['count', 'recognize', 'count', 'compare', 'count', 'count', 'compare', 'count', 'recognize', 'compare'],
  2: ['count', 'compose', 'compose', 'compare', 'compose', 'count', 'compose', 'compare', 'compose', 'compose'],
  3: ['coinsWithCents', 'changeEuros', 'changeEuros', 'changeCents', 'changeMixed', 'coinsWithCents', 'changeEuros', 'changeMixed', 'changeCents', 'changeEuros'],
};

export default {
  id: 'tirelire',
  title: 'La tirelire',
  island: 'mesures',
  subject: 'maths',
  issue: 60,
  skills: [
    'Connaître les pièces et les billets en euros, compter et comparer des sommes',
    'Composer une somme avec des pièces et des billets',
    'Rendre la monnaie, les centimes (sommes simples)',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'Compter jusqu\'à 50 €' },
    { label: 'Niveau 2', hint: 'Composer jusqu\'à 100 €' },
    { label: 'Niveau 3', hint: 'Rendre la monnaie' },
  ],
  makeQuestion(level, rng, seen) {
    const slots = SLOTS[level];
    const slot = seen ? slots[seen.size % slots.length] : rng.pick(slots);
    return MAKERS[slot](rng, level);
  },
};
