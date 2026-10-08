import test from 'node:test';
import assert from 'node:assert/strict';
import game, { explanationOf, hintFor } from '../../js/games/homophones.js';
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
// Chaque solveur ne voit que ce que l'enfant voit (visibleOfQuestion). Chaque test PROUVE d'abord que le
// raccourci s'applique (couverture), sinon une banque qui change ferait mesurer le vide.

/** Mot avant et mot après le trou, en minuscules, sans ponctuation finale. « qu'____ » donne « qu' ». */
function around(text) {
  const m = text.match(/(\S*?)\s*____\s*(\S*)/);
  const clean = (s) => s.toLowerCase().replace(/[.,:;!?]+$/, '').replace(/^[.,:;!?]+/, '');
  const before = text.slice(0, text.indexOf('____')).trim().split(/\s+/);
  const prevTok = text.slice(0, text.indexOf('____')).endsWith("'") ? before.at(-1).replace(/^.*?(qu'|l'|d')$/i, '$1') : before.at(-1);
  return { prev: clean(prevTok || ''), prevComma: /,$/.test(before.at(-1) || ''), next: clean(m ? m[2] : '') };
}

const singleViews = (level, n, seed) => questions(level, n, seed)
  .filter((q) => q.display.choices.length === 2)
  .map((q) => ({ ...visibleOfQuestion(q), pair: pairOf(q.answer) }));

/** Table « voisin → réponses » bâtie sur TOUTES les phrases à un trou, en laissant de côté la phrase interrogée. */
const TABLE = SINGLES.map((t) => {
  const { prev, next } = around(gapped(t));
  return { slug: completed(t).toLowerCase(), pair: pairOf(answersOf(t)[0]), answer: answersOf(t)[0], prev, next };
});

/** Solveur qui a appris la banque (hors la phrase interrogée) : renvoie null s'il n'a aucune opinion. */
function learned(feature) {
  return (v) => {
    const { prev, next } = around(v.text);
    const ctx = { prev, next }[feature];
    const slug = v.key.replace('homophones:', '');
    const votes = TABLE.filter((r) => r.slug !== slug && r.pair === v.pair && r[feature] === ctx);
    if (!votes.length) return null;
    const count = {};
    for (const r of votes) count[r.answer] = (count[r.answer] || 0) + 1;
    const [best, second] = Object.entries(count).sort((a, b) => b[1] - a[1]);
    if (second && second[1] === best[1]) return null;
    return best[0];
  };
}
const guess = (v) => [...v.choices].sort()[0];

/** Les cinq solveurs de surface. Chacun renvoie une réponse ou null (pas d'opinion). */
const SOLVERS = {
  'mot suivant (appris)': learned('next'),
  'mot précédent (appris)': learned('prev'),
  'pronom sujet / article (règles classiques)': (v) => {
    const { prev, next } = around(v.text);
    if (v.pair === 'a/à') {
      if (['il', 'elle', 'y'].includes(prev)) return 'a';
      if (['la', 'le', "l'", 'les'].includes(next)) return 'à';
    }
    if (v.pair === 'et/est') {
      if (/^[A-ZÀ-ÖÉ]/.test(v.text.split('____')[1].trim())) return 'et';
      if (['noir', 'contente', 'bleu', 'chaude', 'très', 'neuf', 'dans', 'en', 'sur', 'déjà', 'chargé'].includes(next)) return 'est';
    }
    if (v.pair === 'son/sont') {
      const before = wordsOf(v.text.split('____')[0]);
      if (before.some((w) => ['les', 'mes', 'ces', 'tous'].includes(w))) return 'sont';
      return 'son';
    }
    if (v.pair === 'on/ont') {
      if (['ils', 'elles'].includes(prev)) return 'ont';
      if (v.prevComma || ["qu'", 'et', 'comment', 'quand'].includes(prev)) return 'on';
    }
    return null;
  },
  'virgule avant le trou': (v) => (around(v.text).prevComma ? (v.pair === 'on/ont' ? 'on' : null) : null),
};

const MIN_COVERAGE = { 'mot suivant (appris)': 0.03, 'mot précédent (appris)': 0.03, 'pronom sujet / article (règles classiques)': 0.15, 'virgule avant le trou': 0.02 };
const MAX_OVERALL = 0.62;
const MAX_PRECISION = 0.85;

/** Couverture, précision là où il s'applique, réussite globale (là où il n'a pas d'avis, il devine). */
function measure(solver, views) {
  const opinions = views.filter((v) => solver(v) !== null);
  const hits = opinions.filter((v) => solver(v) === v.answer).length;
  const overall = views.filter((v) => (solver(v) ?? guess(v)) === v.answer).length / views.length;
  return {
    coverage: opinions.length / views.length,
    precision: opinions.length ? hits / opinions.length : 0,
    overall,
  };
}

for (const level of [1, 2, 3]) {
  test(`niveau ${level} : aucun solveur de surface ne dépasse beaucoup le hasard (couverture prouvée)`, () => {
    for (const seed of [11, 22, 33]) {
      const views = singleViews(level, 6000, seed);
      for (const [name, solver] of Object.entries(SOLVERS)) {
        const m = measure(solver, views);
        if (seed === 11) {
          console.log(`niveau ${level} | ${name} : couverture ${(100 * m.coverage).toFixed(0)} %, `
            + `juste ${(100 * m.precision).toFixed(0)} % où il s'applique, réussite ${(100 * m.overall).toFixed(0)} %`);
        }
        // Un solveur sans avis sur rien mesurerait le vide : il doit s'appliquer à une part réelle des questions.
        assert.ok(m.coverage >= (name.startsWith('virgule') && level === 1 ? 0 : MIN_COVERAGE[name]), `${name}, niveau ${level} : couverture ${(100 * m.coverage).toFixed(1)} % (solveur inopérant ?)`);
        assert.ok(m.overall <= MAX_OVERALL, `${name}, niveau ${level} : ${(100 * m.overall).toFixed(1)} % de réussite (hasard 50 %)`);
        // Là où le solveur a un avis, il ne doit pas avoir presque toujours raison (sinon l'enfant l'apprend).
        assert.ok(m.coverage < 0.3 || m.precision <= MAX_PRECISION, `${name}, niveau ${level} : juste ${(100 * m.precision).toFixed(1)} % là où il s'applique`);
      }
    }
  });
}

test('toujours répondre la même forme, ou toujours la première, ne mène nulle part', () => {
  for (let level = 1; level <= 3; level++) {
    const views = singleViews(level, 4000, 5);
    for (const w of ['a', 'à', 'et', 'est', 'son', 'sont', 'on', 'ont']) {
      const concerned = views.filter((v) => v.choices.includes(w));
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
  for (const e of picked) assert.ok(e.includes('Remplace par'));
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
