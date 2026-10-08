import test from 'node:test';
import assert from 'node:assert/strict';
import game, { explanationOf, hintFor, SPOKEN_GAP } from '../../js/games/homophones.js';
import {
  PAIRS, REPLACE, pairOf, LEVEL_1, LEVEL_2, LEVEL_3_SINGLE, LEVEL_3_DOUBLE,
  answersOf, completed, withWord, gapped,
} from '../../js/data/homophones.js';
import {
  checkGameShape, checkGenerator, checkNoSurfaceShortcut, checkCueCoverage, visibleOfQuestion,
  checkEpicene, textsOfQuestion,
} from '../helpers/game-checks.js';
import { createRng } from '../../js/core/random.js';
import { buildQuestions } from '../../js/core/engine.js';

test('contrat', () => checkGameShape(game));
test('500 tirages par niveau, 30 questions distinctes', () => checkGenerator(game, { draws: 500, minDistinct: 30 }));

const BANKS = { 1: LEVEL_1, 2: LEVEL_2, 3: [...LEVEL_3_SINGLE, ...LEVEL_3_DOUBLE] };
const ALL = [...LEVEL_1, ...LEVEL_2, ...LEVEL_3_SINGLE, ...LEVEL_3_DOUBLE];
const SINGLES = [...LEVEL_1, ...LEVEL_2, ...LEVEL_3_SINGLE];

/** Mots d'une phrase (sans trous), en minuscules. */
const wordsOf = (text) => text.toLowerCase().split(/[^a-zà-ÿœ]+/).filter(Boolean);

function questions(level, n = 1500, seed = 42) {
  const rng = createRng(seed + level);
  const out = [];
  while (out.length < n) out.push(...buildQuestions(game, level, rng, 10));
  return out;
}

// ===== Forme de la banque ===============================================================================

test('banque : au moins 30 phrases distinctes par niveau, sans doublon', () => {
  for (const [level, bank] of Object.entries(BANKS)) {
    assert.ok(new Set(bank.map(completed)).size >= 30, `niveau ${level}`);
  }
  const done = ALL.map((t) => completed(t).toLowerCase());
  assert.equal(new Set(done).size, done.length, 'phrase en double');
});

test('banque : chaque trou est une forme des quatre paires, un ou deux trous, phrase ponctuée', () => {
  for (const t of ALL) {
    const answers = answersOf(t);
    assert.ok(answers.length >= 1 && answers.length <= 2, t);
    for (const a of answers) assert.ok(pairOf(a), `${t} : « ${a} » n'est dans aucune paire`);
    assert.match(t, /^[A-ZÀ-ÖÉ].*[.]$/, t);
    assert.doesNotMatch(t, /\{\}|\}\{|\s{2}/, t);
    assert.equal(t, t.trim());
  }
  assert.ok(LEVEL_3_SINGLE.every((t) => answersOf(t).length === 1));
  assert.ok(LEVEL_3_DOUBLE.every((t) => answersOf(t).length === 2));
});

test('banque : la phrase ne montre jamais un mot de la paire du trou (aucun indice visible)', () => {
  for (const t of ALL) {
    const visible = wordsOf(t.replace(/\{[^}]+\}/g, ' '));
    for (const a of answersOf(t)) {
      for (const w of PAIRS[pairOf(a)]) {
        assert.ok(!visible.includes(w), `${t} : « ${w} » est déjà écrit dans la phrase`);
      }
    }
  }
});

test('banque : les niveaux n\'emploient que les paires prévues', () => {
  for (const t of LEVEL_1) assert.ok(['a/à', 'et/est'].includes(pairOf(answersOf(t)[0])), t);
  const l2 = new Set(LEVEL_2.map((t) => pairOf(answersOf(t)[0])));
  assert.deepEqual([...l2].sort(), Object.keys(PAIRS).sort());
  const l3 = new Set([...LEVEL_3_SINGLE, ...LEVEL_3_DOUBLE].flatMap((t) => answersOf(t).map(pairOf)));
  assert.deepEqual([...l3].sort(), Object.keys(PAIRS).sort());
  // La difficulté vient aussi de la longueur : les phrases s'allongent d'un niveau à l'autre.
  const mean = (bank) => bank.reduce((s, t) => s + wordsOf(completed(t)).length, 0) / bank.length;
  assert.ok(mean(LEVEL_1) + 0.5 <= mean(LEVEL_2), `${mean(LEVEL_1)} / ${mean(LEVEL_2)}`);
  assert.ok(mean(LEVEL_2) + 2 <= mean(LEVEL_3_SINGLE), `${mean(LEVEL_2)} / ${mean(LEVEL_3_SINGLE)}`);
});

test('banque : chaque forme est la bonne réponse dans 35 à 65 % des phrases de sa paire, à chaque niveau', () => {
  for (const [level, bank] of [['1', LEVEL_1], ['2', LEVEL_2], ['3', LEVEL_3_SINGLE]]) {
    const byPair = {};
    for (const t of bank) {
      const a = answersOf(t)[0];
      (byPair[pairOf(a)] ||= []).push(a);
    }
    for (const [pair, list] of Object.entries(byPair)) {
      assert.ok(list.length >= 3, `niveau ${level} ${pair} : ${list.length} phrases`);
      const first = list.filter((w) => w === PAIRS[pair][0]).length / list.length;
      assert.ok(first >= 0.35 && first <= 0.65, `niveau ${level} ${pair} : « ${PAIRS[pair][0]} » vaut ${(100 * first).toFixed(0)} %`);
    }
  }
});

// ===== Les questions tirées ===============================================================================

test('questions : une seule bonne réponse, présente, les deux formes de la paire (ou les 4 combinaisons)', () => {
  for (let level = 1; level <= 3; level++) {
    for (const q of questions(level, 600)) {
      const values = q.display.choices.map((c) => c.value);
      assert.equal(values.filter((v) => v === q.answer).length, 1, q.key);
      const template = ALL.find((t) => `homophones:${completed(t).toLowerCase()}` === q.key);
      assert.ok(template, q.key);
      assert.equal(q.answer, answersOf(template).join('|'));
      const n = answersOf(template).length;
      assert.equal(values.length, n === 1 ? 2 : 4, q.key);
      if (n === 1) assert.deepEqual([...values].sort(), [...PAIRS[pairOf(q.answer)]].sort(), q.key);
      assert.ok(q.display.show.text.includes('____') || q.display.show.text.includes('[1]'), q.key);
      assert.ok(!completed(template).includes('{'), q.key);
    }
  }
});

test('niveaux : les deux formes sont proposées dans les deux ordres (la position ne dit rien)', () => {
  for (let level = 1; level <= 3; level++) {
    const qs = questions(level, 1200).filter((q) => q.display.choices.length === 2);
    const first = qs.filter((q) => q.display.choices[0].value === q.answer).length / qs.length;
    assert.ok(first > 0.4 && first < 0.6, `niveau ${level} : bonne réponse en premier ${(100 * first).toFixed(1)} %`);
  }
});

test('niveau 3 : environ deux questions sur cinq ont deux trous, toutes les phrases à deux trous sortent', () => {
  const qs = questions(3, 4000);
  const doubles = qs.filter((q) => q.display.choices.length === 4);
  assert.ok(doubles.length / qs.length > 0.3 && doubles.length / qs.length < 0.5);
  assert.equal(new Set(doubles.map((q) => q.key)).size, LEVEL_3_DOUBLE.length);
  assert.ok(qs.some((q) => q.display.choices.length === 2));
});

test('une même phrase ne revient jamais dans une partie', () => {
  for (let level = 1; level <= 3; level++) {
    const rng = createRng(9 + level);
    for (let i = 0; i < 200; i++) {
      const keys = buildQuestions(game, level, rng, 10).map((q) => q.key);
      assert.equal(new Set(keys).size, keys.length, `niveau ${level}`);
    }
  }
});

// ===== Aucun raccourci de surface (leçon de « La phrase », #107) =========================================
// Chaque solveur ne voit que ce que l'enfant voit (texte à trou, choix). Chaque test PROUVE d'abord que le
// raccourci s'applique (couverture), sinon une banque qui change ferait mesurer le vide. Les phrases à
// deux trous sont mesurées TROU PAR TROU (l'autre trou étant rempli juste) : on les résout ainsi.

/** Les vues « un trou » d'une phrase de la banque : un trou à compléter, les autres déjà justes. */
function gapViews(template) {
  const answers = answersOf(template);
  return answers.map((answer, i) => {
    let k = -1;
    const text = template.replace(/\{([^}]+)\}/g, (_, w) => { k += 1; return k === i ? '____' : w; });
    return { slug: `${completed(template).toLowerCase()}#${i}`, text, pair: pairOf(answer), choices: PAIRS[pairOf(answer)], answer };
  });
}

const DET = new Set(['le', 'la', 'les', "l'", 'un', 'une', 'des', 'mon', 'ma', 'mes', 'son', 'sa', 'ses', 'ce', 'cette',
  'ces', 'du', 'au', 'aux', 'quelques', 'notre', 'leur', 'leurs']);

/** Ce qu'un solveur de surface peut lire autour du trou. */
function around(text) {
  const i = text.indexOf('____');
  const clean = (s) => s.toLowerCase().replace(/[.,:;!?]+$/, '').replace(/^[.,:;!?]+/, '');
  const before = text.slice(0, i).trim().split(/\s+/).filter(Boolean);
  const afterRaw = (text.slice(i + 4).trim().split(/\s+/)[0] || '').replace(/^[.,:;!?]+/, '');
  const last = before.at(-1) || '';
  const prevTok = text.slice(0, i).endsWith("'") ? last.replace(/^.*?(qu'|l'|d')$/i, '$1') : last;
  return {
    prev: clean(prevTok), prevComma: /,$/.test(last), next: clean(afterRaw), nextRaw: afterRaw,
    idx: before.length, // nombre de mots AVANT le trou : 1 = le trou suit le premier mot
  };
}

/** Table « voisin → réponse » bâtie sur TOUS les trous de la banque (phrases à deux trous comprises). */
const TABLE = ALL.flatMap(gapViews).map((g) => ({ ...g, ...around(g.text) }));

/** Toutes les vues d'un niveau, tirées par le vrai générateur (une phrase à deux trous donne deux vues). */
function views(level, n, seed) {
  const out = [];
  for (const q of questions(level, n, seed)) {
    const t = ALL.find((x) => `homophones:${completed(x).toLowerCase()}` === q.key);
    out.push(...gapViews(t));
  }
  return out;
}
const singleViews = (level, n, seed) => views(level, n, seed);

/** Solveur qui a appris la banque (hors la phrase interrogée) : renvoie null s'il n'a aucune opinion. */
function learned(feature) {
  return (v) => {
    const ctx = around(v.text)[feature];
    const base = v.slug.split('#')[0];
    const votes = TABLE.filter((r) => r.slug.split('#')[0] !== base && r.pair === v.pair && r[feature] === ctx);
    if (!votes.length) return null;
    const count = {};
    for (const r of votes) count[r.answer] = (count[r.answer] || 0) + 1;
    const [best, second] = Object.entries(count).sort((a, b) => b[1] - a[1]);
    if (second && second[1] === best[1]) return null;
    return best[0];
  };
}
const guess = (v) => [...v.choices].sort()[0];

// Les raccourcis écrits à la main. Chacun ne parle que de SA ou SES paires et renvoie null ailleurs.
const POSITION = (v) => { // a/à : « le trou suit le premier mot → a, sinon à » (relevé par le juge : 88 %)
  if (v.pair !== 'a/à') return null;
  return around(v.text).idx === 1 ? 'a' : 'à';
};
const MAJUSCULE_DET = (v) => { // et/est : « mot suivant en majuscule ou déterminant → et, sinon est »
  if (v.pair !== 'et/est') return null;
  const a = around(v.text);
  return /^[A-ZÀ-ÖÉ]/.test(a.nextRaw) || DET.has(a.next) ? 'et' : 'est';
};
const PARTICIPE = (v) => { // a/à et on/ont : « mot suivant en -é, -i, -u → a / ont, sinon à / on »
  const { next } = around(v.text);
  const part = /[éiu]$/.test(next);
  if (v.pair === 'a/à') return part ? 'a' : 'à';
  if (v.pair === 'on/ont') return part ? 'ont' : 'on';
  return null;
};
const PLURIEL_S = (v) => { // son/sont et on/ont : « mot précédent en -s → sont / ont, sinon son / on »
  const { prev } = around(v.text);
  if (v.pair === 'son/sont') return /s$/.test(prev) ? 'sont' : 'son';
  if (v.pair === 'on/ont') return /s$/.test(prev) ? 'ont' : 'on';
  return null;
};
const CLASSIQUES = (v) => { // pronoms et articles : il/elle/y → a ; la/le/les → à ; ils/elles → ont ; virgule → on
  const { prev, next, prevComma } = around(v.text);
  if (v.pair === 'a/à') {
    if (['il', 'elle', 'y'].includes(prev)) return 'a';
    if (['la', 'le', "l'", 'les'].includes(next)) return 'à';
  }
  if (v.pair === 'on/ont') {
    if (['ils', 'elles'].includes(prev)) return 'ont';
    if (prevComma || ["qu'", 'et', 'comment', 'quand'].includes(prev)) return 'on';
  }
  return null;
};
/** La cascade : pour chaque paire, le meilleur raccourci connu, puis les règles classiques, sinon on devine. */
const CASCADE = (v) => (v.pair === 'a/à' ? (POSITION(v) === 'a' ? 'a' : (CLASSIQUES(v) ?? PARTICIPE(v)))
  : v.pair === 'et/est' ? MAJUSCULE_DET(v)
    : v.pair === 'son/sont' ? PLURIEL_S(v)
      : (CLASSIQUES(v) ?? PLURIEL_S(v)));

// « sujet pluriel → sont / ont » est une VRAIE règle d'accord que l'enfant a le droit d'utiliser : PLURIEL_S
// n'a donc pas de plafond de précision, seulement un plafond de réussite globale pour la cascade. Les cas
// purement orthographiques sont, eux, cassés dans la banque (« Dans les rues, on joue », « sous son lit »,
// « Les chevaux ont »).
const SOLVERS = {
  'mot suivant (appris)': { solve: learned('next'), minCoverage: 0.03, maxPrecision: 1, maxOverall: 0.66 },
  'mot précédent (appris)': { solve: learned('prev'), minCoverage: 0.03, maxPrecision: 1, maxOverall: 0.66 },
  'position : trou après le 1er mot (a/à)': { solve: POSITION, minCoverage: 0.12, maxPrecision: 0.75 },
  'majuscule ou déterminant suivant (et/est)': { solve: MAJUSCULE_DET, minCoverage: 0.12, maxPrecision: 0.75 },
  'participe suivant -é/-i/-u (a/à, on/ont)': { solve: PARTICIPE, minCoverage: 0.2, maxPrecision: 0.75 },
  'mot précédent en -s (son/sont, on/ont)': { solve: PLURIEL_S, minCoverage: 0.2, maxPrecision: 1, from: 2, maxOverall: 0.7 },
  'pronoms, articles, virgule (règles classiques)': { solve: CLASSIQUES, minCoverage: 0.1, maxPrecision: 1 },
};
const MAX_OVERALL = 0.62;

/** Couverture, précision par paire là où il s'applique, réussite globale (ailleurs il devine). */
function measure(solver, vs) {
  const handled = vs.filter((v) => solver(v) !== null);
  const byPair = {};
  for (const v of handled) {
    const p = (byPair[v.pair] ||= { n: 0, ok: 0 });
    p.n += 1;
    if (solver(v) === v.answer) p.ok += 1;
  }
  return {
    coverage: handled.length / vs.length,
    byPair,
    overall: vs.filter((v) => (solver(v) ?? guess(v)) === v.answer).length / vs.length,
  };
}

const cascadeByLevel = {};
for (const level of [1, 2, 3]) {
  test(`niveau ${level} : aucun solveur de surface ne dépasse beaucoup le hasard (couverture prouvée)`, () => {
    for (const seed of [11, 22, 33]) {
      const vs = views(level, 6000, seed);
      for (const [name, { solve, minCoverage, maxPrecision, from = 1, maxOverall = MAX_OVERALL }] of Object.entries(SOLVERS)) {
        const m = measure(solve, vs);
        if (seed === 11) {
          console.log(`niveau ${level} | ${name} : couverture ${(100 * m.coverage).toFixed(0)} %, réussite ${(100 * m.overall).toFixed(0)} %, `
            + Object.entries(m.byPair).map(([p, x]) => `${p} ${(100 * x.ok / x.n).toFixed(0)} %`).join(', '));
        }
        // Couverture prouvée : un solveur qui n'a d'avis sur rien mesurerait le vide.
        if (level >= from) assert.ok(m.coverage >= minCoverage, `${name}, niveau ${level} : couverture ${(100 * m.coverage).toFixed(1)} % (solveur inopérant ?)`);
        assert.ok(m.overall <= maxOverall,
          `${name}, niveau ${level}, graine ${seed} : ${(100 * m.overall).toFixed(1)} % de réussite (hasard 50 %)`);
        for (const [pair, x] of Object.entries(m.byPair)) {
          if (x.n < 100) continue;
          assert.ok(x.ok / x.n <= maxPrecision, `${name}, niveau ${level}, ${pair} : juste ${(100 * x.ok / x.n).toFixed(1)} %`);
        }
      }
      const c = measure(CASCADE, vs);
      if (seed === 11) console.log('CASCADE niveau ' + level + ' ' + (100 * c.overall).toFixed(0) + ' % ' + Object.entries(c.byPair).map(([p, x]) => p + ' ' + (100 * x.ok / x.n).toFixed(0) + ' (n=' + x.n + ')').join(', '));
      assert.ok(c.overall <= 0.66, `cascade, niveau ${level} : ${(100 * c.overall).toFixed(1)} % de réussite`);
    }
  });
}

test('PROGRESSION : le solveur en cascade ne réussit pas mieux au niveau 2 qu\'au niveau 1 (+3 points tolérés)', () => {
  const rate = (level) => measure(CASCADE, views(level, 6000, 11)).overall;
  const [n1, n2, n3] = [1, 2, 3].map(rate);
  console.log(`cascade : niveau 1 ${(100 * n1).toFixed(0)} %, niveau 2 ${(100 * n2).toFixed(0)} %, niveau 3 ${(100 * n3).toFixed(0)} %`);
  assert.ok(n2 <= n1 + 0.03, `niveau 2 (${(100 * n2).toFixed(1)} %) plus facile que niveau 1 (${(100 * n1).toFixed(1)} %)`);
  assert.ok(n3 <= n1 + 0.03, `niveau 3 (${(100 * n3).toFixed(1)} %) plus facile que niveau 1 (${(100 * n1).toFixed(1)} %)`);
});

test('toujours répondre la même forme, ou toujours la première, ne mène nulle part', () => {
  for (let level = 1; level <= 3; level++) {
    const vs = views(level, 4000, 5);
    for (const w of ['a', 'à', 'et', 'est', 'son', 'sont', 'on', 'ont']) {
      const concerned = vs.filter((v) => v.choices.includes(w));
      if (!concerned.length) continue;
      const share = concerned.filter((v) => v.answer === w).length / concerned.length;
      assert.ok(share > 0.3 && share < 0.7, `niveau ${level} : « ${w} » est la réponse de ${(100 * share).toFixed(0)} % des questions de sa paire`);
    }
  }
});

test('niveaux 1 à 3 : aucun mot voisin du trou n\'est réservé à une forme (au moins 4 occurrences)', () => {
  // Généralisation du test de « La phrase » : on ne protège pas un mot en particulier, on vérifie la banque.
  const exclusive = [];
  for (const feature of ['prev', 'next']) {
    const byWord = new Map();
    for (const r of TABLE) {
      const key = `${r.pair}|${r[feature]}`;
      if (!byWord.has(key)) byWord.set(key, []);
      byWord.get(key).push(r.answer);
    }
    for (const [key, answers] of byWord) {
      if (answers.length < 4) continue;
      const top = Math.max(...Object.values(answers.reduce((c, a) => ({ ...c, [a]: (c[a] || 0) + 1 }), {})));
      if (top / answers.length > 0.75) exclusive.push(`${feature} ${key} (${top}/${answers.length})`);
    }
  }
  assert.deepEqual(exclusive, [], 'mots voisins réservés à une forme');
});

test('« ils » et « elles » ne sont devant « ont » que dans une phrase sur quatre ; « la / le / les » suivent a ET à', () => {
  const ont = TABLE.filter((r) => r.answer === 'ont');
  const pronoms = ont.filter((r) => ['ils', 'elles'].includes(r.prev)).length / ont.length;
  assert.ok(pronoms <= 0.25, `${(100 * pronoms).toFixed(0)} % des « ont » suivent ils / elles`);
  const dets = new Set(['la', 'le', "l'", 'les']);
  const a = TABLE.filter((r) => r.answer === 'a' && dets.has(r.next)).length;
  const grave = TABLE.filter((r) => r.answer === 'à' && dets.has(r.next)).length;
  assert.ok(a >= 3 && grave >= 3, `a devant la/le/les : ${a} ; à : ${grave}`);
  const commaOn = LEVEL_2.filter((t) => answersOf(t)[0] === 'on').filter((t) => /,\s*\{on\}/.test(t)).length;
  const on = LEVEL_2.filter((t) => answersOf(t)[0] === 'on').length;
  assert.ok(commaOn / on <= 0.5, 'la virgule annonce trop souvent « on »');
});

// ===== Explication ========================================================================================

test('explication : applique l\'astuce à la phrase, cite le mot de remplacement, ne répète pas la réponse seule', () => {
  for (const t of ALL) {
    const e = explanationOf(t);
    assert.ok(e.includes(completed(t).replace(/ ([:?!])/g, ' $1')), `la phrase juste manque : ${t}`);
    if (answersOf(t).length > 1) {
      // Deux trous : une astuce courte par trou, la phrase juste une seule fois (#42, relecture du juge).
      assert.ok(e.length <= 200, `explication à deux trous : ${e.length} signes > 200 : ${e}`);
      answersOf(t).forEach((word) => {
        const used = REPLACE[word] || REPLACE[{ 'à': 'a', et: 'est' }[word]];
        assert.ok(e.includes(`« ${used} »`) && e.includes(`c'est « ${word} »`), e);
      });
      continue;
    }
    answersOf(t).forEach((word, i) => {
      const h = hintFor(t, i);
      const used = REPLACE[word] || REPLACE[{ 'à': 'a', et: 'est' }[word]];
      assert.ok(h.includes(`« ${used} »`), h);
      assert.ok(h.includes(`C'est donc « ${word} »`), h);
      assert.ok(h.includes(withWord(t, i, used).replace(/\.$/, '').replace(/ ([:?!])/g, ' $1')), `phrase d'essai absente : ${h}`);
      assert.doesNotMatch(h, /\bfaux\b|\bnul\b|\bmauvais/i);
    });
    assert.ok(e.length > 60 && e.length < 420, `longueur ${e.length} : ${t}`);
  }
  // Formes qui se disent après remplacement vs formes qui ne se disent pas.
  assert.match(hintFor('Léo {a} un vélo rouge.', 0), /Léo avait un vélo rouge.* ça se dit\. C'est donc « a » sans accent/);
  assert.match(hintFor('Mia joue {à} la balle.', 0), /ça ne se dit pas\. C'est donc « à » avec un accent/);
});

test('explication : échantillon recopié (10 phrases tirées)', () => {
  const rng = createRng(2026);
  const sample = [];
  for (let level = 1; level <= 3; level++) sample.push(...questions(level, 60, 7).filter((q) => q.explain).slice(0, 4).map((q) => q.explain));
  const picked = rng.sample(sample, 10);
  assert.equal(picked.length, 10);
  console.log(picked.map((s) => `- ${s}`).join('\n'));
  for (const e of picked) assert.match(e, /Remplace par|On peut dire|On ne peut pas dire/);
});

test('explication : l\'astuce marche pour chaque mot (le remplacement se lit comme une phrase)', () => {
  // Le remplacement ne doit pas créer de faute visible : pas de « si il », « que il », « de le ».
  for (const t of ALL) {
    answersOf(t).forEach((w, i) => {
      if (REPLACE[w]) {
        const s = withWord(t, i, REPLACE[w]);
        assert.doesNotMatch(s, /\b(si|que) il\b|\bde le\b|\bà le\b/i, s);
      }
    });
  }
});

// ===== Mixité ==============================================================================================

test('mixité : aucun accord genré adressé à l\'enfant, dans la banque et les questions tirées', () => {
  checkEpicene(ALL.map(completed), { label: 'banque « Les homophones »' });
  for (let level = 1; level <= 3; level++) {
    checkEpicene(questions(level, 400).flatMap(textsOfQuestion), { label: `« Les homophones » niveau ${level}` });
  }
});

test('mixité : prénoms de filles et de garçons, Papa et Maman à égalité, aucun « tu » ni « je »', () => {
  const text = ALL.map(completed).join(' ');
  const filles = ['Mia', 'Lina', 'Inès', 'Zoé', 'Sofia', 'Nina', 'Jade'];
  const garcons = ['Léo', 'Noah', 'Hugo', 'Adam', 'Yanis', 'Maël'];
  const count = (names) => names.reduce((s, n) => s + (text.match(new RegExp(`\\b${n}\\b`, 'g')) || []).length, 0);
  const f = count(filles);
  const g = count(garcons);
  assert.ok(f >= 15 && g >= 15, `filles ${f} / garçons ${g}`);
  assert.ok(Math.max(f, g) / Math.min(f, g) <= 1.5, `déséquilibre filles ${f} / garçons ${g}`);
  const papa = (text.match(/\bPapa\b/g) || []).length;
  const maman = (text.match(/\bMaman\b/g) || []).length;
  assert.ok(papa >= 3 && maman >= 3 && Math.max(papa, maman) / Math.min(papa, maman) <= 2, `Papa ${papa} / Maman ${maman}`);
  assert.doesNotMatch(text, /\b(tu|je|j'|toi|ton|ta|tes)\b/i);
});

// ===== Relecture du juge (#42) ========================================================================

test('voix : le mot dit à la place du trou n\'est dans aucune phrase de la banque', () => {
  assert.ok(!ALL.some((t) => wordsOf(completed(t)).includes(SPOKEN_GAP)), `« ${SPOKEN_GAP} » figure dans la banque`);
  for (let level = 1; level <= 3; level++) {
    for (const q of questions(level, 200)) {
      assert.ok(q.speak.includes(SPOKEN_GAP), q.key);
      assert.ok(!/(^|\s)blanc\s+(un|deux)\b/.test(q.speak), q.key);
    }
  }
});

test('mixité : métiers au féminin et au masculin, verbes d\'action répartis entre filles et garçons', () => {
  const text = ALL.map(completed).join(' ');
  assert.match(text, /pompière/);
  assert.match(text, /factrice/);
  assert.match(text, /pompier\b/);
  const FILLES = /\b(Mia|Lina|Inès|Zoé|Sofia|Nina|Jade|Maman|Mamie|sœurs?|pompière|factrice)\b/;
  const GARCONS = /\b(Léo|Noah|Hugo|Adam|Yanis|Maël|Papa|Pépé|frère|pompier)\b/;
  for (const stem of [/chant/, /court|course/, /ballon/, /dessin/]) {
    const hits = ALL.map(completed).filter((s) => stem.test(s));
    assert.ok(hits.length >= 2, `${stem} : ${hits.length} phrase(s)`);
    assert.ok(hits.some((s) => FILLES.test(s)) && hits.some((s) => GARCONS.test(s)), `${stem} : filles ET garçons attendus dans ${hits.join(' | ')}`);
  }
});
