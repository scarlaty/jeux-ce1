import { test } from 'node:test';
import assert from 'node:assert/strict';
import game, { explainCompare, explainExtreme } from '../../js/games/comparer.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
import { createRng } from '../../js/core/random.js';
import { enChiffres } from '../../js/data/nombres-en-lettres.js';
import { speakableText } from '../../js/core/audio.js';

const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const kind = (level, prefix) => byLevel[level].filter((q) => q.key.startsWith(`comparer:${prefix}:`));
const SIGNS = ['<', '=', '>'];
const signOf = (a, b) => (a < b ? '<' : a > b ? '>' : '=');
const isSignQuestion = (q) => SIGNS.includes(q.answer);
const share = (list, pred) => (list.length ? list.filter(pred).length / list.length : 0);
const nums = (text) => (String(text).match(/\d+/g) || []).map(Number);
const isExtreme = (q) => /^comparer:(max|min):/.test(q.key);

// Plus de tirages que checkGenerator, pour des mesures stables (400 parties de 10 questions par niveau).
function draw(level, games = 400) {
  const rng = createRng(77 + level);
  const out = [];
  for (let g = 0; g < games; g++) {
    const seen = new Set();
    for (let i = 0; i < 10; i++) {
      const q = game.makeQuestion(level, rng, seen);
      seen.add(q.key);
      out.push(q);
    }
  }
  return out;
}
const big = { 1: draw(1), 2: draw(2), 3: draw(3) };
const every = () => Object.entries(big).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));

test('le jeu respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.id, 'comparer');
  assert.equal(game.island, 'nombres');
  assert.equal(game.subject, 'maths');
  assert.equal(game.issue, 48);
});

test('bien plus de 30 questions distinctes par niveau (mesuré)', () => {
  for (const [level, qs] of Object.entries(big)) {
    const distinct = new Set(qs.map((q) => q.key)).size;
    assert.ok(distinct >= 150, `niveau ${level} : ${distinct}`);
  }
});

test('les nombres restent dans les bornes (niveau 1 jusqu\'à 100, jamais au-delà de 1000)', () => {
  for (const [level, q] of every()) {
    const shown = [q.prompt, q.display.show?.text, q.explain, ...(q.display.choices || []).map((c) => c.text ?? c), ...(q.display.items || [])];
    for (const n of nums(shown.join(' '))) assert.ok(n <= 1000, `${q.key} : ${n}`);
    if (level === 1) {
      const onScreen = [q.display.show?.text, ...(q.display.choices || []), ...(q.display.items || [])];
      for (const n of nums(onScreen.join(' '))) assert.ok(n <= 100, `${q.key} : ${n} au niveau 1`);
    }
  }
});

// --- Exactitude : la réponse est recalculée d'après ce que l'enfant VOIT ---------------------------

function recomputed(q) {
  const t = q.display.show?.text;
  if (q.key.startsWith('comparer:signe:')) { const [a, b] = nums(t); return signOf(a, b); }
  if (q.key.startsWith('comparer:somme:')) {
    const [left, right] = t.split(' ? ');
    const val = (side) => side.split(' + ').reduce((s, x) => s + Number(x), 0);
    return signOf(val(left), val(right));
  }
  if (q.key.startsWith('comparer:lettres:')) return signOf(enChiffres(t), nums(q.prompt)[0]);
  if (isExtreme(q)) {
    return q.key.startsWith('comparer:max:') ? Math.max(...q.display.choices) : Math.min(...q.display.choices);
  }
  if (q.key.startsWith('comparer:ranger:')) {
    const asc = [...q.display.items].sort((x, y) => x - y);
    return q.key.includes(':croissant:') ? asc : asc.reverse();
  }
  return undefined;
}

test('la réponse de chaque question se retrouve en la recalculant autrement', () => {
  let checked = 0;
  for (const [, q] of every()) {
    const expected = recomputed(q);
    if (expected === undefined) continue;
    assert.deepEqual(q.answer, expected, q.key);
    checked++;
  }
  assert.ok(checked > 3000, `${checked} réponses recalculées`);
});

test('matériel : la relation annoncée correspond au dessin et au nombre écrit', () => {
  const qs = big[3].filter((q) => q.key.startsWith('comparer:matériel:'));
  assert.ok(qs.length >= 100);
  for (const q of qs) {
    const a = q.display.show.art;
    const material = 100 * a.hundreds + 10 * a.tens + a.units;
    const written = nums(q.prompt)[0];
    assert.equal(q.answer, signOf(material, written), q.key);
    assert.equal(q.display.choices.length, 3);
    assert.ok(q.display.choices.every((c) => c.text.endsWith(String(written))));
  }
});

test('intercaler : un seul nombre convient, une borne sert de piège', () => {
  const qs = every().filter(([, q]) => q.key.startsWith('comparer:entre'));
  for (const [level, q] of qs) {
    const [lo, hi] = nums(q.display.show.text);
    if (q.type === 'keypad') {
      assert.equal(hi - lo, 2, q.key);
      assert.equal(q.answer, lo + 1, q.key);
    } else {
      const inside = q.display.choices.filter((c) => c > lo && c < hi);
      assert.deepEqual(inside, [q.answer], `${q.key} niveau ${level}`);
    }
  }
  assert.ok(share(big[3].filter((q) => q.key.startsWith('comparer:entre-choix')),
    (q) => { const [lo, hi] = nums(q.display.show.text); return q.display.choices.includes(lo) || q.display.choices.includes(hi); }) > 0.9);
  assert.ok(big[1].some((q) => q.key.startsWith('comparer:entre')));
  assert.ok(big[3].some((q) => q.key.startsWith('comparer:entre-choix')));
  assert.ok(big[2].some((q) => q.key.startsWith('comparer:entre') && Math.floor(nums(q.display.show.text)[0] / 100) !== Math.floor(nums(q.display.show.text)[1] / 100)), 'franchit une centaine');
});

test('encadrer : un seul encadrement contient le nombre, jamais une dizaine ou une centaine exacte', () => {
  const qs = every().filter(([, q]) => q.key.startsWith('comparer:encadrer:'));
  assert.ok(qs.length > 500);
  for (const [, q] of qs) {
    const n = nums(q.prompt)[0];
    const step = q.prompt.includes('dizaines') ? 10 : 100;
    assert.notEqual(n % step, 0, q.key);
    const containing = q.display.choices.filter((c) => { const [lo, hi] = nums(c); return n > lo && n < hi; });
    assert.deepEqual(containing, [q.answer], q.key);
    for (const c of q.display.choices) {
      const [lo, hi] = nums(c);
      assert.equal(hi - lo, step, `${q.key} : ${c}`);
      assert.equal(lo % step, 0, `${q.key} : ${c}`);
    }
    assert.equal(q.display.choices.length >= 3, true);
  }
  assert.ok(qs.some(([, q]) => q.prompt.includes('centaines')) && qs.some(([, q]) => q.prompt.includes('dizaines')));
});

test('voisin : la dizaine ou la centaine juste avant ou après, jamais le nombre lui-même', () => {
  const qs = big[3].filter((q) => q.key.startsWith('comparer:voisin:'));
  assert.ok(qs.length >= 100);
  for (const q of qs) {
    const n = nums(q.prompt)[0];
    const step = q.prompt.includes('centaine') ? 100 : 10;
    const after = q.prompt.includes('après');
    assert.equal(q.answer, after ? (Math.floor(n / step) + 1) * step : Math.floor(n / step) * step, q.key);
    assert.notEqual(n % step, 0);
    assert.ok(q.answer <= 999);
  }
  assert.ok(qs.some((q) => q.prompt.includes('avant')) && qs.some((q) => q.prompt.includes('après')));
});

test('ranger : jamais déjà dans l\'ordre, nombres tous différents, 3 puis 4 puis 5 nombres', () => {
  for (const [, q] of every().filter(([, x]) => x.type === 'order')) {
    assert.equal(new Set(q.display.items).size, q.display.items.length, q.key);
    assert.notDeepEqual(q.display.items, q.answer);
    assert.notDeepEqual(q.display.items, [...q.answer].reverse());
  }
  assert.deepEqual([1, 2, 3].map((l) => big[l].find((q) => q.type === 'order').display.items.length), [3, 4, 5]);
  for (const level of [1, 2, 3]) {
    const orders = big[level].filter((q) => q.type === 'order');
    assert.ok(share(orders, (q) => q.key.includes(':croissant:')) > 0.4 && share(orders, (q) => q.key.includes(':croissant:')) < 0.6);
  }
});

test('le plus grand, le plus petit : un seul candidat, aucune égalité', () => {
  for (const [, q] of every().filter(([, x]) => isExtreme(x))) {
    const c = q.display.choices;
    assert.equal(new Set(c).size, c.length);
    assert.equal(c.filter((x) => x === q.answer).length, 1);
  }
});

// --- Les maths écrites dans les explications ------------------------------------------------------

test('chaque égalité écrite dans une explication est exacte', () => {
  let verified = 0;
  for (const [, q] of every()) {
    for (const m of q.explain.matchAll(/(\d+(?: \+ \d+)+) = (\d+)/g)) {
      assert.equal(m[1].split(' + ').reduce((s, x) => s + Number(x), 0), Number(m[2]), `${q.key} : ${m[0]}`);
      verified++;
    }
  }
  assert.ok(verified > 300, `${verified} égalités vérifiées`);
});

test('chaque comparaison en mots dans une explication est vraie', () => {
  let verified = 0;
  for (const [, q] of every()) {
    for (const m of q.explain.matchAll(/(\d+) est (plus petit que|plus grand que|égal à) (\d+)/g)) {
      const sign = { 'plus petit que': '<', 'plus grand que': '>', 'égal à': '=' }[m[2]];
      assert.equal(signOf(Number(m[1]), Number(m[3])), sign, `${q.key} : ${m[0]}`);
      verified++;
    }
  }
  assert.ok(verified > 1000, `${verified} comparaisons vérifiées`);
});

test('l\'explication enseigne la méthode, appliquée au cas', () => {
  assert.match(explainCompare(409, 490), /centaines sont pareilles.*dizaines : 0 et 9.*409 est plus petit que 490/);
  assert.match(explainCompare(199, 201), /d'abord les centaines : 1 et 2/);
  assert.match(explainCompare(347, 342), /centaines et dizaines sont pareilles.*unités : 7 et 2/);
  assert.match(explainCompare(95, 102), /2 chiffres.*3/);
  assert.match(explainCompare(47, 74), /d'abord les dizaines : 4 et 7/);
  assert.match(explainExtreme([409, 490, 940, 904], 'max'), /centaines : 4, 4, 9, 9.*on garde 940 et 904.*dizaines : 4, 0.*c'est 940/);
  for (const [, q] of every()) {
    assert.ok(q.explain.length > 30, q.key);
    assert.ok(!/[<>]/.test(q.explain), `${q.key} : signe brut dans l'explication (la voix le lirait mal)`);
  }
});

test('speak se lit sans que la voix réécrive un signe', () => {
  for (const [, q] of every()) {
    assert.ok(q.speak && q.speak.length > 10, q.key);
    assert.equal(speakableText(q.speak), q.speak, `${q.key} : un signe serait réécrit`);
    assert.ok(!/[<>=?]\s*\?|\s\?\s/.test(q.speak), q.key);
  }
});

test('mixité : aucun accord genré adressé à l\'enfant', () => {
  const genre = /\b(content|contente|prêt|prête|sûr|sûre|mêlé|mêlée|fier|fière)\b/i;
  for (const [, q] of every()) assert.ok(!genre.test(`${q.prompt} ${q.explain} ${q.speak}`), q.key);
});

// --- Pas de raccourci de surface -----------------------------------------------------------------
// Les solveurs ne lisent QUE ce que l'enfant voit (texte de la question, choix), jamais le générateur.
// Ils doivent prouver leur couverture : un solveur qui ne comprend plus aucune question ferait passer
// le test en mesurant le vide (leçon des cinq relectures de « La phrase »).

const cmp = (x, y) => (x === y ? null : x < y ? '<' : '>');
const SOLVERS = {
  longueur: (a, b) => cmp(a.length, b.length),
  premierChiffre: (a, b) => cmp(a[0], b[0]),
  longueurPuisPremier: (a, b) => SOLVERS.longueur(a, b) ?? SOLVERS.premierChiffre(a, b),
  dernierChiffre: (a, b) => cmp(a.at(-1), b.at(-1)),
  sommeDesChiffres: (a, b) => {
    const s = (t) => [...t].reduce((n, c) => n + Number(c), 0);
    return cmp(s(a), s(b));
  },
};

/** Les comparaisons « a ? b » en chiffres seulement (ce qu'un solveur de surface sait lire). */
function plainSigns(qs) {
  return qs.filter((q) => q.key.startsWith('comparer:signe:')).map((q) => {
    const [a, b] = q.display.show.text.split(' ? ');
    return { a, b, answer: q.answer };
  });
}

/** Part de bonnes réponses du solveur, en lui offrant la meilleure réponse constante quand il ne sait pas. */
function solverScore(solver, items) {
  let decided = 0;
  let right = 0;
  const undecided = { '<': 0, '=': 0, '>': 0 };
  for (const { a, b, answer } of items) {
    const guess = solver(a, b);
    if (guess === null) undecided[answer]++;
    else { decided++; if (guess === answer) right++; }
  }
  const generous = right + Math.max(...Object.values(undecided));
  return { decided: decided / items.length, accuracy: generous / items.length, strictRight: right / items.length };
}

test('le solveur de surface comprend les questions (couverture prouvée)', () => {
  for (const level of [1, 2, 3]) {
    assert.ok(plainSigns(big[level]).length >= 400, `niveau ${level} : comparaisons lues`);
  }
  // Témoin : sur des nombres tirés au hasard, « longueur puis premier chiffre » tranche presque toujours, et juste.
  const rng = createRng(5);
  const control = Array.from({ length: 2000 }, () => {
    const a = rng.int(10, 999);
    const b = rng.int(10, 999);
    return { a: String(a), b: String(b), answer: signOf(a, b) };
  }).filter((x) => x.a !== x.b);
  const s = solverScore(SOLVERS.longueurPuisPremier, control);
  assert.ok(s.decided > 0.85, `témoin : ${s.decided}`);
  assert.ok(s.strictRight > 0.85, `témoin : ${s.strictRight}`);
});

test('aucun raccourci de surface ne suffit aux niveaux 2 et 3', () => {
  const LIMIT = {
    longueurPuisPremier: { 2: 0.75, 3: 0.7 },
    longueur: { 2: 0.65, 3: 0.65 },
    premierChiffre: { 2: 0.65, 3: 0.65 },
    dernierChiffre: { 2: 0.65, 3: 0.73 },
    sommeDesChiffres: { 2: 0.65, 3: 0.73 },
  };
  for (const level of [2, 3]) {
    const items = plainSigns(big[level]);
    for (const [name, solver] of Object.entries(SOLVERS)) {
      const { accuracy, decided } = solverScore(solver, items);
      assert.ok(accuracy <= LIMIT[name][level],
        `niveau ${level}, « ${name} » : ${(100 * accuracy).toFixed(0)} % (limite ${100 * LIMIT[name][level]})`);
      if (name === 'longueurPuisPremier') assert.ok(decided > 0.15 && decided < 0.9, `couverture ${decided}`);
    }
  }
});

/** Solveur de « le plus grand / le plus petit » : longueur puis premier chiffre, puis hasard (espérance). */
function extremeScore(qs) {
  let sum = 0;
  for (const q of qs) {
    const c = q.display.choices.map(String);
    const wantMax = q.key.startsWith('comparer:max:');
    const best = (list, f) => {
      const v = wantMax ? Math.max(...list.map(f)) : Math.min(...list.map(f));
      return list.filter((x) => f(x) === v);
    };
    let cand = best(c, (x) => x.length);
    cand = best(cand, (x) => Number(x[0]));
    if (cand.includes(String(q.answer))) sum += 1 / cand.length;
  }
  return sum / qs.length;
}

test('le plus grand, le plus petit : pas résoluble par longueur et premier chiffre aux niveaux 2 et 3', () => {
  for (const level of [1, 2, 3]) {
    const qs = big[level].filter(isExtreme);
    assert.ok(qs.length >= 200, `${qs.length} questions`);
    const score = extremeScore(qs);
    if (level === 1) assert.ok(score > 0.4, `témoin niveau 1 : ${score}`);   // le solveur fonctionne
    else assert.ok(score <= (level === 2 ? 0.5 : 0.4), `niveau ${level} : ${(100 * score).toFixed(0)} %`);
  }
});

test('la position et la longueur ne trahissent pas le plus grand ni le plus petit', () => {
  for (const level of [1, 2, 3]) {
    const qs = big[level].filter(isExtreme);
    const k = qs[0].display.choices.length;
    for (let pos = 0; pos < k; pos++) {
      const s = share(qs, (q) => q.display.choices.indexOf(q.answer) === pos);
      assert.ok(Math.abs(s - 1 / k) < 0.1, `niveau ${level}, place ${pos} : ${s.toFixed(2)}`);
    }
    // La réponse n'est pas, à elle seule, la plus longue (ou la plus courte) à l'écran.
    const byLength = share(qs, (q) => {
      const others = q.display.choices.filter((c) => c !== q.answer).map((c) => String(c).length);
      const L = String(q.answer).length;
      return q.key.includes(':max:') ? L > Math.max(...others) : L < Math.min(...others);
    });
    if (level > 1) assert.ok(byLength < 0.2, `niveau ${level} : la longueur désigne ${byLength.toFixed(2)}`);
    assert.ok(Math.abs(share(qs, (q) => q.key.includes(':max:')) - 0.5) < 0.1, 'plus grand / plus petit équilibrés');
  }
});

test('les signes : < et > équilibrés, = présent mais pas trop, dans chaque forme de question', () => {
  for (const level of [1, 2, 3]) {
    const signs = big[level].filter(isSignQuestion);
    const eq = share(signs, (q) => q.answer === '=');
    const lt = signs.filter((q) => q.answer === '<').length;
    const gt = signs.filter((q) => q.answer === '>').length;
    assert.ok(eq >= 0.1 && eq <= 0.3, `niveau ${level} : = dans ${(100 * eq).toFixed(0)} %`);
    assert.ok(Math.abs(lt - gt) / (lt + gt) < 0.1, `niveau ${level} : < ${lt}, > ${gt}`);
    // Un marqueur ne doit jamais désigner une classe de réponse : chaque forme donne les trois signes.
    const forms = new Map();
    for (const q of signs) {
      const f = q.key.split(':')[1];
      forms.set(f, [...(forms.get(f) || []), q.answer]);
    }
    for (const [form, answers] of forms) {
      if (answers.length < 100) continue;
      assert.equal(new Set(answers).size, 3, `niveau ${level}, forme « ${form} » : ${[...new Set(answers)]}`);
    }
  }
});

test('les formes de questions annoncées par les niveaux sont bien présentes', () => {
  for (const level of [1, 2, 3]) {
    for (const prefix of ['signe', 'somme', 'max', 'min', 'ranger', 'entre', 'encadrer']) {
      assert.ok(big[level].some((q) => q.key.startsWith(`comparer:${prefix}`)), `niveau ${level} : ${prefix}`);
    }
  }
  assert.ok(big[3].some((q) => q.key.startsWith('comparer:lettres:')));
  assert.ok(big[3].some((q) => q.key.startsWith('comparer:matériel:')));
  assert.ok(big[3].some((q) => q.key.startsWith('comparer:voisin:')));
  assert.ok(!big[1].some((q) => q.key.startsWith('comparer:lettres:')));
});

test('les pièges annoncés existent : 409 et 490, 199 et 201, 95 et 102', () => {
  const p2 = plainSigns(big[2]).map(({ a, b }) => [Number(a), Number(b)]);
  const perm = (a, b) => [...String(a)].sort().join('') === [...String(b)].sort().join('') && a !== b;
  assert.ok(share(p2, ([a, b]) => perm(a, b)) > 0.12, 'chiffres échangés');
  assert.ok(share(p2, ([a, b]) => Math.floor(a / 100) === Math.floor(b / 100)) > 0.5, 'mêmes centaines');
  assert.ok(share(p2, ([a, b]) => Math.abs(a - b) <= 20 && Math.floor(a / 100) !== Math.floor(b / 100)) > 0.03, 'de part et d\'autre d\'une centaine');
  assert.ok(share(p2, ([a, b]) => String(a).length !== String(b).length) > 0.03, '2 chiffres contre 3');
  // Le plus petit des deux a souvent le plus grand chiffre des unités (piège du dernier chiffre).
  assert.ok(share(p2, ([a, b]) => a !== b && (a < b) === (a % 10 > b % 10)) > 0.2);
});

// --- Corrections après relecture du juge pédagogie ------------------------------------------------

test('accords : jamais « 1 dizaines » ni « 0 unités » dans une explication', () => {
  for (const [, q] of every()) {
    assert.ok(!/\b[01] (dizaines|centaines|unités)\b/.test(q.explain), `${q.key} : ${q.explain}`);
  }
  assert.ok(every().some(([, q]) => /\b[01] (dizaine|centaine|unité)\b/.test(q.explain)), 'le singulier est bien produit');
});

test('encadrer en dizaines : on lit les chiffres de position, jamais « 81 dizaines »', () => {
  const qs = every().filter(([, q]) => q.key.startsWith('comparer:encadrer:dizaines:'));
  let three = 0;
  for (const [, q] of qs) {
    const n = nums(q.prompt)[0];
    if (n < 100) continue;
    three++;
    assert.ok(!new RegExp(`\\b${Math.floor(n / 10)} dizaines`).test(q.explain), q.explain);
    assert.ok(q.explain.includes(`le chiffre des dizaines : ${Math.floor(n / 10) % 10}`), q.explain);
  }
  assert.ok(three > 300, `${three} encadrements à trois chiffres`);
});

/** Rang numérique (0 = le plus petit) de la bonne réponse parmi les choix. */
function rankShares(qs, valueOf) {
  const counts = [0, 0, 0, 0];
  for (const q of qs) counts[[...q.display.choices].sort((a, b) => valueOf(a) - valueOf(b)).findIndex((c) => c === q.answer)]++;
  return counts.map((c) => c / qs.length);
}

test('encadrer : toujours 4 choix, et la bonne paire occupe tous les rangs', () => {
  const qs = every().filter(([, q]) => q.key.startsWith('comparer:encadrer:')).map(([, q]) => q);
  assert.ok(qs.every((q) => q.display.choices.length === 4));
  const shares = rankShares(qs, (c) => nums(c)[0]);
  for (const s of shares) assert.ok(s > 0.05 && s <= 0.4, `rangs : ${shares.map((x) => x.toFixed(2))}`);
});

test('intercaler en QCM : la bonne réponse occupe tous les rangs, une borne en piège', () => {
  const qs = big[3].filter((q) => q.key.startsWith('comparer:entre-choix:'));
  assert.ok(qs.every((q) => q.display.choices.length === 4));
  const shares = rankShares(qs, (c) => c);
  for (const s of shares) assert.ok(s > 0.05 && s <= 0.4, `rangs : ${shares.map((x) => x.toFixed(2))}`);
});

test('le niveau 3 se distingue du niveau 2 sur les paires simples', () => {
  const pairs = (level) => plainSigns(big[level]).filter(({ a, b }) => a !== b);
  const same10 = (level) => share(pairs(level), ({ a, b }) => Math.floor(a / 10) === Math.floor(b / 10));
  const firstFails = (level) => share(pairs(level), ({ a, b, answer }) => SOLVERS.premierChiffre(a, b) !== answer);
  assert.ok(same10(2) <= 0.25, `niveau 2 : mêmes centaines et dizaines ${same10(2).toFixed(2)}`);
  assert.ok(same10(3) >= 0.4, `niveau 3 : mêmes centaines et dizaines ${same10(3).toFixed(2)}`);
  assert.ok(firstFails(2) >= 0.3 && firstFails(3) >= 0.3, `premier chiffre seul : ${firstFails(2)} / ${firstFails(3)}`);
});

test('niveau 2 : « juste après / juste avant » avec passage de dizaine, en plus de l\'intercalage', () => {
  const next = big[2].filter((q) => q.key.startsWith('comparer:suivant:'));
  assert.ok(next.length >= 100);
  for (const q of next) {
    const n = nums(q.prompt)[0];
    assert.equal(q.answer, q.prompt.includes('après') ? n + 1 : n - 1, q.key);
  }
  assert.ok(share(next, (q) => q.answer % 10 === 0 || (q.answer + 1) % 10 === 0) > 0.4, 'passages de dizaine');
  assert.ok(next.some((q) => q.prompt.includes('avant')) && next.some((q) => q.prompt.includes('après')));
  const between = big[2].filter((q) => q.key.startsWith('comparer:entre:'));
  assert.ok(between.length >= 100);
  assert.ok(next.length / (next.length + between.length) > 0.3, 'la réponse n\'est pas toujours a + 1 d\'un intercalage');
});

test('formes à égalité fréquente (somme, lettres, matériel) : chaque signe entre 25 et 42 %', () => {
  for (const level of [1, 2, 3]) {
    for (const form of ['somme', 'lettres', 'matériel']) {
      const qs = big[level].filter((q) => q.key.startsWith(`comparer:${form}:`));
      if (!qs.length) continue;
      for (const sign of SIGNS) {
        const s = share(qs, (q) => q.answer === sign);
        assert.ok(s >= 0.25 && s <= 0.42, `niveau ${level}, ${form} : « ${sign} » ${(100 * s).toFixed(0)} %`);
      }
    }
  }
});

test('ranger : l\'explication départage deux nombres qui ont le même chiffre, sur un cas du rangement', () => {
  const withTie = every().filter(([, q]) => q.type === 'order' && q.explain.includes('ont le même chiffre'));
  assert.ok(withTie.length > 100);
  for (const [, q] of withTie) {
    assert.match(q.explain, /on regarde les (dizaines|unités), \d et \d\. Donc \d+ est plus petit que \d+\./, q.key);
    const [x, y] = q.explain.match(/(\d+) et (\d+) ont le même chiffre/).slice(1).map(Number);
    assert.ok(q.display.items.includes(x) && q.display.items.includes(y), q.key);
  }
});
