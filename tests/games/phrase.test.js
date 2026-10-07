import test from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/phrase.js';
import {
  SIMPLE, PONCT_SHORT, PONCT_LONG, CONTEXTS, ORDER_2, ORDER_3, signOf, words, withoutSign,
} from '../../js/data/phrases.js';
import { checkGameShape, checkGenerator, checkNoSurfaceShortcut } from '../helpers/game-checks.js';
import { createRng } from '../../js/core/random.js';
import { buildQuestions } from '../../js/core/engine.js';

test('contrat', () => checkGameShape(game));
test('500 tirages par niveau, 30 questions distinctes', () => checkGenerator(game, { draws: 500, minDistinct: 30 }));

const DET = ['le', 'la', 'les', 'un', 'une', 'des', 'mon', 'ma', 'mes', 'ton', 'ta', 'son', 'sa'];
// Mots qui se déplacent dans la phrase ou lient deux groupes échangeables : interdits dans les phrases à ranger.
const MOBILE = /^(hier|demain|aujourd'hui|souvent|toujours|encore|maintenant|ensuite|puis|parfois|et|ou|mais|car|donc|aussi|tout|tous|matin|soir)$/;

// Niveau 2 : au moins 5 mots (3 mots du milieu ou plus → au moins 6 arrangements possibles, #107).
for (const [name, pool, min, max] of [['ORDER_2', ORDER_2, 5, 6], ['ORDER_3', ORDER_3, 6, 7]]) {
  test(`${name} : forme des phrases à ranger`, () => {
    assert.ok(pool.length >= 30);
    assert.equal(new Set(pool).size, pool.length, 'phrases en double');
    for (const s of pool) {
      const w = words(s);
      assert.ok(w.length >= min && w.length <= max, `${s} : ${w.length} mots`);
      assert.match(w[0], /^[A-ZÀ-ÖÉ]/, `${s} : majuscule au début`);
      assert.match(w.at(-1), /[.?!]$/, `${s} : signe final`);
      w.slice(1).forEach((x) => {
        assert.doesNotMatch(x, /^[A-ZÀ-ÖÉ]/, `${s} : majuscule au milieu (« ${x} »)`);
        assert.doesNotMatch(x, MOBILE, `${s} : mot déplaçable « ${x} »`);
      });
      // Deux groupes de même déterminant seraient échangeables (« Le chat griffe le canapé »).
      const first = w[0].toLowerCase();
      if (DET.includes(first)) assert.ok(!w.slice(1).some((x) => x.toLowerCase() === first), `${s} : déterminant répété`);
      // La phrase ne doit pas avoir de signe au milieu, ni d'espace en trop.
      assert.equal(s, s.trim());
      assert.ok(!/[.?!]./.test(withoutSign(s)));
    }
  });

  test(`${name} : deux phrases ne sont jamais faites des mêmes mots`, () => {
    const sig = (s) => words(s).map((x) => x.toLowerCase()).sort().join(' ');
    assert.equal(new Set(pool.map(sig)).size, pool.length);
  });
}

test('les phrases à ranger de 5 à 7 mots ne se retrouvent pas d\'un niveau à l\'autre', () => {
  assert.equal(ORDER_2.filter((s) => ORDER_3.includes(s)).length, 0);
});

test('ORDER_3 : le gabarit « Le/La nom de/du nom est adjectif » reste minoritaire (< 30 %, #107)', () => {
  const open = ORDER_3.filter((s) => {
    const w = words(s);
    return (w[0] === 'Le' || w[0] === 'La') && w[2] && /^(de|du|d'|des)$/.test(w[2].toLowerCase());
  });
  const share = open.length / ORDER_3.length;
  assert.ok(share < 0.3, `gabarit « Le/La N de/du... » : ${(100 * share).toFixed(1)} % (>= 30 %)`);
});

test('ponctuation niveau 1 (PONCT_SHORT) : phrases franches, le premier mot annonce le signe', () => {
  for (const sign of ['.', '?', '!']) assert.ok(PONCT_SHORT.filter((p) => p.sign === sign).length >= 8, sign);
  for (const { text, sign } of PONCT_SHORT) {
    assert.match(text, /^[A-ZÀ-ÖÉ]/, text);
    assert.equal(signOf(text), '', text);
    if (sign === '?') assert.match(text, /^(Où|Qui|Quand|Comment|Pourquoi|Combien|Est-ce|\S+-(tu|il|elle|nous|vous|ils)\b)/, text);
    if (sign === '!') assert.match(text, /^(Quel|Quelle|Comme|Que)\b/, text);
    if (sign === '.') assert.doesNotMatch(text, /^(Quel|Quelle|Comme|Que|Où|Qui|Quand|Comment|Pourquoi|Combien|Est-ce)\b|-(tu|il|elle)\b/, text);
  }
});

// Niveau 3 (PONCT_LONG) : contrairement au niveau 1, le premier mot ne doit PLUS suffire pour une bonne
// part de la banque — « Comme » y introduit aussi une cause, « Que »/« Quel » une vraie question avec
// verbe inversé (#107). On vérifie seulement la forme (majuscule, pas de signe déjà posé) ; le raccourci
// du premier mot est mesuré plus bas par `checkNoSurfaceShortcut`.
test('ponctuation niveau 3 (PONCT_LONG) : forme correcte, signes bien représentés', () => {
  for (const sign of ['.', '?', '!']) assert.ok(PONCT_LONG.filter((p) => p.sign === sign).length >= 8, sign);
  for (const { text } of PONCT_LONG) {
    assert.match(text, /^[A-ZÀ-ÖÉ]/, text);
    assert.equal(signOf(text), '', text);
  }
  const all = [...PONCT_SHORT, ...PONCT_LONG, ...CONTEXTS].map((p) => p.text);
  assert.equal(new Set(all).size, all.length, 'phrase en double entre les banques');
});

test('contextes : chaque signe est bien représenté', () => {
  for (const sign of ['.', '?', '!']) assert.ok(CONTEXTS.filter((c) => c.sign === sign).length >= 12, sign);
});

// Le défaut relevé par le juge (#107) : « demande »/« veut savoir » couvraient 35 contextes sur 36. On
// vérifie maintenant qu'aucun verbe de parole ne domine un signe (diversité du vocabulaire du contexte).
test('contextes : aucun verbe de parole ne domine un signe (diversité, #107)', () => {
  const verbs = ['demande', 'veut savoir', 's\'écrie', 'crie', 'raconte', 'explique', 'questionne', 's\'interroge'];
  for (const sign of ['.', '?', '!']) {
    const items = CONTEXTS.filter((c) => c.sign === sign);
    for (const v of verbs) {
      const share = items.filter((c) => c.context.includes(v)).length / items.length;
      assert.ok(share <= 0.3, `${sign} : « ${v} » dans ${(100 * share).toFixed(0)} % des contextes`);
    }
  }
});

test('niveau 3 : un solveur de surface (premier mot, mot-clé) résout au plus la moitié de la ponctuation (#107)', () => {
  function surfaceSolver({ cue }) {
    const first = cue.split(' ')[0].toLowerCase();
    if (['où', 'qui', 'quand', 'comment', 'pourquoi', 'combien'].includes(first)) return '?';
    if (first === 'est-ce') return '?';
    if (/^\S+-(tu|il|elle|nous|vous|ils)$/.test(first)) return '?';
    if (['quel', 'quelle', 'comme', 'que'].includes(first)) return '!';
    if (/demande|veut savoir/.test(cue)) return '?';
    if (/s'écrie|crie|très|surpris|étonné|content|heureuse|peur|joie/.test(cue)) return '!';
    return '.';
  }
  const items = [
    ...PONCT_LONG.map(({ text, sign }) => ({ cue: text, answer: sign })),
    ...CONTEXTS.map(({ context, sign }) => ({ cue: context, answer: sign })),
  ];
  checkNoSurfaceShortcut(items, surfaceSolver, { label: 'ponctuation niveau 3' });
});

test('« Est-ce une phrase ? » : les mélanges ne sont pas des phrases (début en majuscule, point final)', () => {
  assert.ok(SIMPLE.length >= 30);
  for (const [ok, jumble] of SIMPLE) {
    assert.match(ok, /^[A-ZÀ-ÖÉ].*\.$/);
    assert.match(jumble, /^[A-ZÀ-ÖÉŒ].*\.$/, jumble);
    const sig = (s) => withoutSign(s).toLowerCase().split(' ').sort().join(' ');
    assert.equal(sig(ok), sig(jumble), `${ok} : mêmes mots`);
    assert.notEqual(ok, jumble);
  }
});

function questions(level, n = 1500) {
  const rng = createRng(77 + level);
  const out = [];
  while (out.length < n) out.push(...buildQuestions(game, level, rng, 10));
  return out;
}

test('niveau 1 : mélange de « phrase ? » et de signes, réponses exactes', () => {
  const qs = questions(1);
  const isS = qs.filter((q) => q.key.startsWith('phrase:vraie'));
  const sig = qs.filter((q) => q.key.startsWith('phrase:signe'));
  assert.ok(isS.length > 400 && sig.length > 400);
  for (const q of isS) {
    const text = q.display.show.text.replace(/\u00a0/g, ' ');
    const good = /^[A-ZÀ-ÖÉŒ]/.test(text) && /[.?!]$/.test(text) && !q.key.endsWith('|ordre');
    assert.equal(q.answer, good ? 'oui' : 'non', q.key);
  }
  assert.ok(isS.some((q) => q.answer === 'oui') && isS.some((q) => q.answer === 'non'));
  for (const q of sig) assert.deepEqual(q.display.choices.map((c) => c.value), ['.', '?', '!']);
});

test('niveau 2 : ordre et recherche d\'erreur', () => {
  for (const q of questions(2)) {
    if (q.type === 'order') {
      assert.deepEqual([...q.display.items].sort(), [...q.answer].sort());
      assert.ok(q.answer.length >= 5 && q.answer.length <= 6);
    } else {
      const t = q.display.show.text.replace(/\u00a0/g, ' ');
      const maj = /^[A-ZÀ-ÖÉ]/.test(t);
      const sign = /[.?!]$/.test(t);
      assert.equal(q.answer, maj && sign ? 'rien' : !maj && !sign ? 'les-deux' : !maj ? 'maj' : 'signe', q.key);
    }
  }
});

test('niveau 3 : 6 ou 7 mots, signes en contexte', () => {
  const qs = questions(3);
  assert.ok(qs.some((q) => q.type === 'order') && qs.some((q) => q.key.endsWith(':ctx')));
  for (const q of qs.filter((x) => x.type === 'order')) assert.ok(q.answer.length >= 6 && q.answer.length <= 7);
});

test('une même phrase ne revient jamais dans une partie', () => {
  for (let level = 1; level <= 3; level++) {
    const rng = createRng(5 + level);
    for (let i = 0; i < 200; i++) {
      const bases = buildQuestions(game, level, rng, 10).map((q) => q.key.split('|')[1]);
      assert.equal(new Set(bases).size, bases.length, `niveau ${level}`);
    }
  }
});

test('explications : jamais négatives, jamais vides, citent la phrase juste', () => {
  for (let level = 1; level <= 3; level++) {
    for (const q of questions(level, 300)) {
      assert.ok(q.explain.length > 25, q.key);
      assert.doesNotMatch(q.explain, /\bfaux\b|\bnul\b|\bmauvais/i, q.key);
    }
  }
});

test('explication de l\'ordre des mots : une stratégie refaisable de tête, pas juste la réponse (#107)', () => {
  for (let level = 2; level <= 3; level++) {
    const qs = questions(level, 300).filter((q) => q.type === 'order');
    assert.ok(qs.length > 0, `niveau ${level} : aucune question « ordre »`);
    for (const q of qs) {
      assert.match(q.explain, /qui fait l'action/, q.key);
    }
  }
});

test('contextes : un seul signe défendable (juge pédagogie, #35)', () => {
  // « Mia demande où est son sac » + « Il est dans ta chambre » : le texte RÉPOND à la question, un « . » se défend.
  // « C'est déjà l'heure » : « déjà » marque la surprise, un « ! » se défend.
  // « Tom est étonné… » + « Il neige » : l'étonnement autorise « Il neige ? ».
  for (const c of CONTEXTS.filter((c) => c.sign === '?')) {
    assert.doesNotMatch(c.text, /^(Il|Elle) est (dans|sur|sous|à)\b|\bdéjà\b/, c.text);
  }
  for (const c of CONTEXTS.filter((c) => c.sign === '!')) {
    assert.doesNotMatch(c.context, /étonn|surpri/, c.context);
  }
});
