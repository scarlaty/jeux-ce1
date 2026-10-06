// Centaines, dizaines, unités (CE1, programmes 2024) : comprendre la valeur de chaque chiffre,
// décomposer et recomposer un nombre jusqu'à 1000.
//
// Le fil rouge est le matériel de numération (plaques de cent, barres de dix, cubes) : l'enfant
// passe sans cesse du matériel au nombre écrit, et du nombre écrit à ses chiffres.
//
// Deux notions se ressemblent et ne doivent JAMAIS être confondues ; chaque consigne le dit avec
// ses propres mots :
//   - « le chiffre des dizaines » de 234, c'est 3 (le chiffre écrit à cette place) ;
//   - « combien de dizaines en tout » dans 234, c'est 23 (23 barres de dix et 4 cubes).
import { pieceWords } from '../core/ui/art/base-ten.js';

// Les trois places, de la plus grande à la plus petite.
const PLACE = [
  { id: 'hundreds', one: 'centaine', many: 'centaines', box: 'Centaines', unit: 100 },
  { id: 'tens', one: 'dizaine', many: 'dizaines', box: 'Dizaines', unit: 10 },
  { id: 'units', one: 'unité', many: 'unités', box: 'Unités', unit: 1 },
];
const BY_ID = Object.fromEntries(PLACE.map((p) => [p.id, p]));
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const SKILL = {
  read: 'lire le matériel de numération',
  show: 'reconnaître le matériel d\'un nombre',
  digit: 'chiffre des unités, des dizaines, des centaines',
  value: 'valeur d\'un chiffre selon sa place',
  howMany: 'nombre de dizaines dans un nombre',
  build: 'écrire un nombre à partir de ses chiffres',
  decompose: 'décomposer un nombre',
  recompose: 'recomposer un nombre',
  sort: 'unités, dizaines et centaines',
};

// --- Mots et nombres ---------------------------------------------------------------------------

const digits = (n) => ({ hundreds: Math.floor(n / 100), tens: Math.floor(n / 10) % 10, units: n % 10 });

/** Les places réellement écrites : pas de colonne des centaines pour un nombre à 2 chiffres. */
const placesOf = (n) => (n >= 100 ? PLACE : PLACE.slice(1));

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

/** « 300, 40 et 6 » — la liste française, avec « et » devant le dernier morceau. */
function joinAnd(parts) {
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
}

/** « 2 centaines, 3 dizaines et 4 unités » — les zéros sont dits (« 0 dizaine »). */
function placeWords(n) {
  const d = digits(n);
  return joinAnd(placesOf(n).map((p) => plural(d[p.id], p.one, p.many)));
}

/** Les morceaux non nuls d'un nombre : 346 → [300, 40, 6] ; 405 → [400, 5]. */
function partsOf(n) {
  const d = digits(n);
  return PLACE.filter((p) => d[p.id] > 0).map((p) => d[p.id] * p.unit);
}

/** La description du dessin : 234 → { kind: 'base-ten', hundreds: 2, tens: 3, units: 4 }. */
const material = (n) => ({ kind: 'base-ten', ...digits(n) });

const materialWords = (n) => pieceWords(digits(n));

/** « 2 plaques de cent, 3 barres de dix et 4 cubes : 200, 30 et 4, ça fait 234. » */
function explainMaterial(n) {
  const parts = partsOf(n);
  const text = parts.length < 2
    ? `${materialWords(n)} : ça fait ${n}.`
    : `${materialWords(n)} : ${joinAnd(parts.map(String))}, ça fait ${n}.`;
  if (n >= 100 && digits(n).tens === 0) return `${text} Pas de barre de dix : on écrit 0 aux dizaines.`;
  return text;
}

// Tirages de nombres. `until` relance jusqu'à ce que la condition soit remplie : les conditions
// sont larges, le nombre de tours reste minuscule.
function until(rng, make, ok) {
  let n;
  do { n = make(rng); } while (!ok(n));
  return n;
}

const allDigitsDiffer = (n) => new Set(String(n)).size === String(n).length;

const two = (rng) => 10 * rng.int(1, 9) + rng.int(0, 9);
const twoFull = (rng) => 10 * rng.int(1, 9) + rng.int(1, 9);
const three = (rng) => 100 * rng.int(1, 9) + 10 * rng.int(1, 9) + rng.int(1, 9);

/** Nombre à 3 chiffres avec un zéro : 405 (zéro intercalé), 450, parfois 400. */
function threeZero(rng) {
  const h = 100 * rng.int(1, 9);
  if (rng.chance(0.5)) return h + rng.int(1, 9);
  if (rng.chance(0.7)) return h + 10 * rng.int(1, 9);
  return h;
}

/**
 * Nombres faux mais plausibles : chiffres échangés (la confusion la plus fréquente),
 * ou une dizaine / une centaine de plus ou de moins. Toujours au moins trois.
 */
function numberDistractors(n) {
  const d = digits(n);
  const [low, high] = n >= 100 ? [100, 999] : [10, 99];
  const list = n >= 100
    ? [100 * d.tens + 10 * d.hundreds + d.units,
      100 * d.units + 10 * d.tens + d.hundreds,
      100 * d.hundreds + 10 * d.units + d.tens,
      n + 100, n - 100, n + 10, n - 10, n + 1, n - 1]
    : [10 * d.units + d.tens, n + 10, n - 10, n + 1, n - 1, n + 11, n - 11];
  return [...new Set(list)].filter((x) => x !== n && x >= low && x <= high);
}

// --- Les formes de questions -------------------------------------------------------------------

/** Compter le matériel et écrire le nombre (pavé numérique). */
function countMaterial(rng, n) {
  return {
    key: `cdu:écrire:${n}`,
    type: 'keypad',
    prompt: 'Compte le matériel, puis écris le nombre.',
    speak: 'Combien y a-t-il en tout ?',
    display: { show: { art: material(n) }, maxLength: 3 },
    answer: n,
    explain: explainMaterial(n),
    skill: SKILL.read,
  };
}

/** Compter le matériel et choisir le nombre parmi quatre (QCM). */
function materialToNumber(rng, n) {
  return {
    key: `cdu:compter:${n}`,
    type: 'choice',
    prompt: 'Compte le matériel, puis touche le bon nombre.',
    speak: 'Combien y a-t-il en tout ?',
    display: { show: { art: material(n) }, choices: rng.shuffle([n, ...rng.sample(numberDistractors(n), 3)]) },
    answer: n,
    explain: explainMaterial(n),
    skill: SKILL.read,
  };
}

/** Le chemin inverse : le nombre est écrit, l'enfant touche le matériel qui lui correspond. */
function numberToMaterial(rng, n) {
  const values = rng.shuffle([n, ...rng.sample(numberDistractors(n), 2)]);
  return {
    key: `cdu:matériel:${n}`,
    type: 'choice',
    prompt: 'Touche le matériel qui montre ce nombre.',
    speak: `Quel matériel montre ${n} ?`,
    display: { show: { text: String(n) }, choices: values.map((v) => ({ value: v, art: material(v) })) },
    answer: n,
    explain: `${n}, c'est ${materialWords(n)}.`,
    skill: SKILL.show,
  };
}

/**
 * « Dans 234, quel est le chiffre des dizaines ? » — on parle bien du CHIFFRE écrit à cette place.
 * Distracteurs : les autres chiffres du nombre, et la valeur (30) au lieu du chiffre (3).
 * `n` doit avoir trois chiffres différents, sinon deux choix seraient identiques.
 */
function digitQuestion(rng, n, place) {
  const d = digits(n);
  const answer = d[place.id];
  const choices = [...new Set(placesOf(n).map((p) => d[p.id]))];
  const asValue = place.unit > 1 ? answer * place.unit : d.tens * 10;
  if (asValue > 9 && !choices.includes(asValue)) choices.push(asValue);
  return {
    key: `cdu:chiffre:${place.id}:${n}`,
    type: 'choice',
    prompt: `Dans ${n}, quel est le chiffre des ${place.many} ?`,
    speak: `Dans ${n}, quel est le chiffre des ${place.many} ?`,
    display: { show: { text: String(n) }, choices: rng.shuffle(choices) },
    answer,
    explain: `${n}, c'est ${placeWords(n)}. Le chiffre des ${place.many} est ${answer}.`,
    skill: SKILL.digit,
  };
}

/** « Dans 458, que vaut le chiffre 4 ? » → 400 : la place donne sa valeur au chiffre. */
function digitValue(rng, n, place) {
  const digit = digits(n)[place.id];
  return {
    key: `cdu:valeur:${place.id}:${n}`,
    type: 'choice',
    prompt: `Dans ${n}, que vaut le chiffre ${digit} ?`,
    speak: `Dans ${n}, que vaut le chiffre ${digit} ?`,
    display: { show: { text: String(n) }, choices: rng.shuffle([digit, digit * 10, digit * 100]) },
    answer: digit * place.unit,
    explain: `Dans ${n}, le ${digit} est à la place des ${place.many} : il vaut ${digit * place.unit}.`,
    skill: SKILL.value,
  };
}

/** « Dans 234, combien y a-t-il de dizaines en tout ? » → 23, et surtout pas 3. */
function tensInAll(rng, n) {
  const whole = Math.floor(n / 10);
  return {
    key: `cdu:dizaines-en-tout:${n}`,
    type: 'keypad',
    prompt: `Dans ${n}, combien y a-t-il de dizaines en tout ?`,
    speak: `Dans ${n}, combien y a-t-il de dizaines en tout ?`,
    display: { show: { text: String(n) }, maxLength: 3 },
    answer: whole,
    explain: `${n}, c'est ${whole} dizaines et ${plural(n % 10, 'unité', 'unités')}. Le chiffre des dizaines, lui, est ${digits(n).tens}.`,
    skill: SKILL.howMany,
  };
}

/** « Écris le nombre qui a 4 centaines, 0 dizaine et 5 unités. » → 405. */
function fromPlaces(rng, n) {
  return {
    key: `cdu:assembler:${n}`,
    type: 'keypad',
    prompt: `Écris le nombre qui a ${placeWords(n)}.`,
    speak: `Quel nombre a ${placeWords(n)} ?`,
    display: { maxLength: 3 },
    answer: n,
    explain: `${placeWords(n)}, ça s'écrit ${n}.`,
    skill: SKILL.build,
  };
}

/** Décompositions fausses : un morceau change de taille (300 → 30), la somme ne fait plus `n`. */
function wrongDecompositions(n, parts) {
  const out = new Set();
  parts.forEach((value, i) => {
    for (const other of [value * 10, value / 10]) {
      if (!Number.isInteger(other) || other < 1 || other > 900) continue;
      const alt = parts.map((p, j) => (j === i ? other : p));
      if (alt.reduce((a, b) => a + b, 0) !== n) out.add(alt.join(' + '));
    }
  });
  return [...out];
}

/** « Touche la bonne décomposition de 346. » → « 300 + 40 + 6 ». */
function decompose(rng, n) {
  const parts = partsOf(n);
  const right = parts.join(' + ');
  const wrong = wrongDecompositions(n, parts);
  return {
    key: `cdu:décomposition:${n}`,
    type: 'choice',
    prompt: `Touche la bonne décomposition de ${n}.`,
    speak: `Quelle est la décomposition de ${n} ?`,
    display: { show: { text: String(n) }, choices: rng.shuffle([right, ...rng.sample(wrong, Math.min(3, wrong.length))]) },
    answer: right,
    explain: `${n} = ${right} : ${placeWords(n)}.`,
    skill: SKILL.decompose,
  };
}

/** Le chemin inverse : « 300 + 40 + 6 = ? » → 346. */
function recompose(rng, n) {
  const parts = partsOf(n);
  return {
    key: `cdu:recomposer:${n}`,
    type: 'keypad',
    prompt: 'Assemble les morceaux, puis écris le nombre.',
    speak: `Combien font ${parts.join(' plus ')} ?`,
    display: { show: { text: `${parts.join(' + ')} = ?`, math: true }, maxLength: 3 },
    answer: n,
    explain: `${parts.join(' + ')} = ${n} : ${placeWords(n)}.`,
    skill: SKILL.recompose,
  };
}

/** Ranger 7, 70 et 700 dans les colonnes du tableau de numération (glisser-déposer). */
function classify(rng, level) {
  const places = level === 1 ? PLACE.slice(1) : PLACE;
  const perBox = level === 1 ? 3 : 2;
  const entries = rng.shuffle(places.flatMap((p) => rng.sample(DIGITS, perBox).map((d) => [p, d * p.unit])));
  const values = entries.map(([, v]) => v);
  return {
    key: `cdu:ranger:${[...values].sort((a, b) => a - b).join('-')}`,
    type: 'drag',
    prompt: level === 1
      ? 'Range chaque nombre dans sa boîte : unités ou dizaines.'
      : 'Range chaque nombre dans sa boîte : unités, dizaines ou centaines.',
    display: {
      items: entries.map(([, v], i) => ({ id: `i${i}`, text: String(v) })),
      targets: places.map((p) => ({ id: p.id, label: p.box })),
    },
    answer: Object.fromEntries(entries.map(([p], i) => [`i${i}`, p.id])),
    explain: level === 1
      ? '7, c\'est 7 unités. 70, c\'est 7 dizaines.'
      : '7, c\'est 7 unités. 70, c\'est 7 dizaines. 700, c\'est 7 centaines.',
    skill: SKILL.sort,
  };
}

// --- Déroulé d'une partie ------------------------------------------------------------------------
// Chaque niveau a son paquet : 6 types d'échauffement (mélangés), puis 4 types plus exigeants
// (dans l'ordre), pour que la partie monte doucement en difficulté.

const distinctTwo = (rng) => until(rng, two, allDigitsDiffer);
const distinctThree = (rng) => until(rng, three, allDigitsDiffer);
const distinctThreeZero = (rng) => until(rng, threeZero, allDigitsDiffer);
const threeZeroParts = (rng) => until(rng, threeZero, (n) => partsOf(n).length >= 2);

const DECKS = {
  1: [
    [
      (rng) => countMaterial(rng, two(rng)),
      (rng) => materialToNumber(rng, two(rng)),
      (rng) => numberToMaterial(rng, two(rng)),
      (rng) => digitQuestion(rng, distinctTwo(rng), BY_ID.tens),
      (rng) => fromPlaces(rng, two(rng)),
      (rng) => decompose(rng, twoFull(rng)),
    ],
    [
      (rng) => recompose(rng, twoFull(rng)),
      (rng) => classify(rng, 1),
      (rng) => digitQuestion(rng, distinctTwo(rng), BY_ID.units),
      (rng) => countMaterial(rng, two(rng)),
    ],
  ],
  2: [
    [
      (rng) => countMaterial(rng, three(rng)),
      (rng) => materialToNumber(rng, three(rng)),
      (rng) => digitQuestion(rng, distinctThree(rng), rng.pick(PLACE)),
      (rng) => fromPlaces(rng, three(rng)),
      (rng) => decompose(rng, three(rng)),
      (rng) => recompose(rng, three(rng)),
    ],
    [
      (rng) => classify(rng, 2),
      (rng) => countMaterial(rng, three(rng)),
      (rng) => materialToNumber(rng, three(rng)),
      (rng) => digitQuestion(rng, distinctThree(rng), rng.pick(PLACE)),
    ],
  ],
  3: [
    [
      (rng) => countMaterial(rng, threeZero(rng)),
      (rng) => digitQuestion(rng, distinctThreeZero(rng), rng.pick(PLACE)),
      (rng) => digitValue(rng, distinctThree(rng), rng.pick(PLACE)),
      (rng) => fromPlaces(rng, threeZero(rng)),
      (rng) => decompose(rng, threeZeroParts(rng)),
      (rng) => recompose(rng, threeZeroParts(rng)),
    ],
    [
      (rng) => tensInAll(rng, rng.chance() ? three(rng) : threeZero(rng)),
      (rng) => classify(rng, 3),
      (rng) => digitValue(rng, distinctThree(rng), rng.pick(PLACE)),
      (rng) => countMaterial(rng, threeZero(rng)),
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
  id: 'cdu',
  title: 'Centaines, dizaines, unités',
  island: 'nombres',
  subject: 'maths',
  issue: 47,
  skills: [
    'Comprendre la valeur des chiffres selon leur place : centaines, dizaines, unités',
    'Décomposer et recomposer un nombre jusqu\'à 1000',
    'Associer un nombre à sa représentation avec le matériel de numération',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'Dizaines et unités jusqu\'à 99' },
    { label: 'Niveau 2', hint: 'Centaines jusqu\'à 999, décomposer et recomposer' },
    { label: 'Niveau 3', hint: 'Valeur d\'un chiffre, nombres avec un zéro' },
  ],
  makeQuestion(level, rng, seen) {
    if (!seen) return rng.pick(DECKS[level].flat())(rng);
    const deck = deckFor(level, rng, seen);
    return deck[seen.size % deck.length](rng);
  },
};
