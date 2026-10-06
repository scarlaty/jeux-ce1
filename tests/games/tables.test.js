import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/tables.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
import { createRng } from '../../js/core/random.js';
import { buildQuestions } from '../../js/core/engine.js';
import { toChoice } from '../../js/core/validate.js';
import { speakableText } from '../../js/core/audio.js';

const TABLES = { 1: [2, 5, 10], 2: [2, 3, 4, 5, 10], 3: [2, 3, 4, 5, 10] };
const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const all = () => Object.entries(byLevel).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));

/** Le type de question et ses deux nombres, lus dans la clé : « tables:produit:7x5 ». */
function parseKey(key) {
  const [, kind, ...rest] = key.split(':');
  const m = /^(\d+)x(\d+)$/.exec(rest[rest.length - 1]);
  return { kind, n: m && Number(m[1]), t: m && Number(m[2]) };
}

/** Toutes les suites de calculs « a op b [op c…] = r » d'un texte (un seul signe par suite). */
function chains(text) {
  return (text.match(/\d+(?: [+×] \d+)+ = \d+/g) || []).map((chain) => {
    const [left, right] = chain.split(' = ');
    const parts = left.split(' ');
    const signs = [...new Set(parts.filter((_, i) => i % 2 === 1))];
    const numbers = parts.filter((_, i) => i % 2 === 0).map(Number);
    return { chain, signs, numbers, result: Number(right) };
  });
}

/** Les listes « de 5 en 5 : 5, 10, 15. » d'un texte. */
function countings(text) {
  return [...text.matchAll(/de (\d+) en (\d+) : ((?:\d+, )*\d+)\./g)]
    .map((m) => ({ step: Number(m[1]), echo: Number(m[2]), list: m[3].split(', ').map(Number) }));
}

test('le jeu respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.id, 'tables');
  assert.equal(game.island, 'nombres');
  assert.equal(game.subject, 'maths');
  assert.equal(game.issue, 54);
});

test('bien plus de 30 questions distinctes par niveau', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    const distinct = new Set(qs.map((q) => q.key)).size;
    assert.ok(distinct >= 100, `niveau ${level} : ${distinct}`);
  }
});

// Le défaut le plus grave possible dans un jeu de maths : un produit faux.
test('tous les produits proposés sont corrects (recalculés)', () => {
  for (const [, q] of all()) {
    const { kind, n, t } = parseKey(q.key);
    if (kind === 'ranger') continue;
    assert.ok(Number.isInteger(n) && Number.isInteger(t), `clé illisible : ${q.key}`);
    const expected = {
      produit: n * t, choix: n * t, paquets: n * t, sens: `${n} × ${t}`, trou: t, fois: n, partage: t,
    }[kind];
    assert.notEqual(expected, undefined, `type inconnu : ${q.key}`);
    assert.deepEqual(q.answer, expected, q.key);
  }
});

test('le calcul affiché est juste, avec de vrais signes et une seule inconnue', () => {
  for (const [, q] of all()) {
    const text = q.display.show?.text;
    if (!text) continue;
    assert.equal(q.display.show.math, true, q.key);
    assert.doesNotMatch(text, /[-*x]/, `signe mal écrit : ${q.key}`);
    const m = /^(\d+|\?) × (\d+|\?) = (\d+|\?)$/.exec(text);
    if (!m) {
      // L'autre forme affichée : l'addition répétée du « sens de la multiplication ».
      assert.match(text, /^\d+(?: \+ \d+)+$/, `calcul mal écrit : ${q.key} → ${text}`);
      continue;
    }
    const holes = m.slice(1).filter((x) => x === '?');
    assert.equal(holes.length, 1, `une seule inconnue attendue : ${text}`);
    const [a, b, c] = m.slice(1).map((v) => (v === '?' ? q.answer : Number(v)));
    assert.equal(a * b, c, `${q.key} : ${text}`);
  }
});

test('les explications ne contiennent que des calculs justes', () => {
  for (const [, q] of all()) {
    const found = chains(q.explain);
    for (const { chain, signs, numbers, result } of found) {
      assert.equal(signs.length, 1, `signes mélangés dans « ${chain} » (${q.key})`);
      const value = signs[0] === '+'
        ? numbers.reduce((a, b) => a + b, 0)
        : numbers.reduce((a, b) => a * b, 1);
      assert.equal(value, result, `${q.key} : « ${chain} »`);
    }
    const counts = countings(q.explain);
    for (const { step, echo, list } of counts) {
      assert.equal(step, echo, `« de ${step} en ${echo} » (${q.key})`);
      assert.deepEqual(list, list.map((_, i) => (i + 1) * step), `${q.key} : ${q.explain}`);
    }
    assert.ok(found.length + counts.length > 0, `explication sans calcul : ${q.key} → ${q.explain}`);
    assert.ok(q.explain.length <= 115, `explication trop longue (${q.explain.length}) : ${q.explain}`);
  }
});

test('une explication montre une stratégie, elle ne répète pas la réponse', () => {
  const find = (level, key) => {
    for (let seed = 1; seed < 5000; seed++) {
      const q = buildQuestions(game, level, createRng(seed), 10).find((x) => x.key === key);
      if (q) return q;
    }
    throw new Error(`« ${key} » introuvable`);
  };
  assert.equal(find(1, 'tables:produit:7x2').explain, '7 × 2, c\'est le double de 7 : 7 + 7 = 14.');
  assert.equal(find(2, 'tables:produit:7x4').explain,
    '7 × 4, c\'est le double du double : 7 + 7 = 14, puis 14 + 14 = 28.');
  assert.equal(find(2, 'tables:produit:6x3').explain,
    '6 × 3, c\'est 6 × 2 et encore 6 : 6 + 6 = 12, puis 12 + 6 = 18.');
  assert.equal(find(1, 'tables:produit:4x5').explain,
    'Je compte de 5 en 5 : 5, 10, 15, 20. Ça finit par 5 ou 0 : 4 × 5 = 20.');
  assert.equal(find(1, 'tables:produit:7x10').explain,
    'Multiplier par 10, c\'est compter des dizaines : 7 dizaines, donc 7 × 10 = 70.');
  assert.equal(find(3, 'tables:fois:7x5').explain,
    'Je compte de 5 en 5 : 5, 10, 15, 20, 25, 30, 35. J\'ai compté 7 fois : 7 × 5 = 35.');
  assert.equal(find(2, 'tables:sens:4x3').explain, '3 + 3 + 3 + 3, c\'est 4 fois 3 : 4 × 3 = 12.');
  assert.equal(find(2, 'tables:sens:4x3').display.show.text, '3 + 3 + 3 + 3');
  assert.equal(find(3, 'tables:trou:4x5').display.show.text, '4 × ? = 20');
  assert.equal(find(3, 'tables:fois:7x5').prompt, 'Combien de fois 5 dans 35 ?');
});

test('les distracteurs sont des erreurs typiques, jamais des nombres au hasard', () => {
  for (const [, q] of all()) {
    const { kind, n, t } = parseKey(q.key);
    if (kind !== 'choix') continue;
    const p = n * t;
    const plausible = new Set([p - n, p + n, p - t, p + t, n + t, p - 1, p + 1, p - 2, p + 2]);
    const wrong = q.display.choices.map(toChoice).map((c) => c.value).filter((v) => v !== p);
    assert.equal(wrong.length, 3, q.key);
    for (const v of wrong) {
      assert.ok(v > 0, `${q.key} : ${v}`);
      assert.ok(plausible.has(v), `distracteur au hasard : ${v} pour ${p} (${q.key})`);
    }
    // Au moins un produit voisin : l'erreur la plus fréquente sur les tables.
    assert.ok(wrong.some((v) => [p - n, p + n, p - t, p + t].includes(v)), q.key);
  }
});

test('le « sens de la multiplication » n\'offre jamais deux calculs de même valeur', () => {
  const value = (text) => {
    const [a, sign, b] = text.split(' ');
    return sign === '×' ? Number(a) * Number(b) : Number(a) + Number(b);
  };
  for (const [, q] of all()) {
    if (parseKey(q.key).kind !== 'sens') continue;
    const values = q.display.choices.map((c) => value(c.text));
    assert.equal(new Set(values).size, values.length, `${q.key} : ${values.join()}`);
    assert.equal(value(q.answer), q.display.show.text.split(' + ').reduce((a, b) => a + Number(b), 0), q.key);
  }
});

test('ranger : chaque nombre appartient à une seule des deux tables', () => {
  for (const [, q] of all()) {
    if (parseKey(q.key).kind !== 'ranger') continue;
    const tables = q.display.targets.map((t) => Number(t.id.slice(1)));
    assert.equal(tables.length, 2);
    for (const item of q.display.items) {
      const value = Number(item.text);
      const inTable = tables.filter((t) => value % t === 0);
      assert.deepEqual(inTable, [Number(q.answer[item.id].slice(1))], `${q.key} : ${value}`);
      assert.ok(value <= 10 * inTable[0], `${q.key} : ${value} hors de la table`);
    }
    assert.equal(new Set(q.display.items.map((i) => i.text)).size, q.display.items.length, q.key);
  }
});

test('chaque niveau reste dans ses tables, le niveau 2 apporte 3 et 4', () => {
  const used = {};
  for (const [level, q] of all()) {
    const { kind, t } = parseKey(q.key);
    const tables = kind === 'ranger' ? q.display.targets.map((x) => Number(x.id.slice(1))) : [t];
    used[level] = used[level] || new Set();
    for (const x of tables) {
      assert.ok(TABLES[level].includes(x), `table de ${x} au niveau ${level} (${q.key})`);
      used[level].add(x);
    }
  }
  assert.deepEqual([...used[1]].sort((a, b) => a - b), [2, 5, 10]);
  assert.deepEqual([...used[2]].sort((a, b) => a - b), [2, 3, 4, 5, 10]);
  assert.deepEqual([...used[3]].sort((a, b) => a - b), [2, 3, 4, 5, 10]);
});

test('une partie est variée : plusieurs formes de questions, aucune en double', () => {
  const expected = {
    1: ['sens', 'produit', 'choix', 'paquets', 'ranger'],
    2: ['sens', 'produit', 'choix', 'paquets', 'ranger'],
    3: ['produit', 'choix', 'trou', 'fois', 'ranger', 'partage'],
  };
  for (const level of [1, 2, 3]) {
    for (let seed = 1; seed <= 50; seed++) {
      const qs = buildQuestions(game, level, createRng(seed), 10);
      assert.equal(new Set(qs.map((q) => q.key)).size, 10, `doublon au niveau ${level}, graine ${seed}`);
      const kinds = qs.map((q) => parseKey(q.key).kind);
      assert.deepEqual([...new Set(kinds)].sort(), [...expected[level]].sort(), `niveau ${level}`);
      assert.ok(new Set(qs.map((q) => q.type)).size >= 3, `niveau ${level} : ${new Set(qs.map((q) => q.type)).size} types`);
      // La leçon commence par le sens de la multiplication (niveaux 1 et 2).
      if (level < 3) assert.equal(qs[0].skill, 'sens de la multiplication');
    }
  }
});

test('chaque notion a son nom, utile aux statistiques « à retravailler »', () => {
  const expected = {
    1: ['sens de la multiplication', 'reconnaître les multiples', 'table de 2', 'table de 5', 'table de 10'],
    2: ['sens de la multiplication', 'reconnaître les multiples',
      'table de 2', 'table de 3', 'table de 4', 'table de 5', 'table de 10'],
    3: ['groupement et partage', 'reconnaître les multiples',
      'table de 2', 'table de 3', 'table de 4', 'table de 5', 'table de 10'],
  };
  for (const [level, qs] of Object.entries(byLevel)) {
    assert.deepEqual([...new Set(qs.map((q) => q.skill))].sort(), [...expected[level]].sort(), `niveau ${level}`);
  }
});

test('la voix lit les calculs avec des mots', () => {
  for (const [, q] of all()) {
    const spoken = speakableText(q.speak || q.prompt);
    assert.doesNotMatch(spoken, /[+×=]/, `${q.key} : ${spoken}`);
  }
  const find = (level, key) => {
    for (let seed = 1; seed < 5000; seed++) {
      const q = buildQuestions(game, level, createRng(seed), 10).find((x) => x.key === key);
      if (q) return q;
    }
    throw new Error(`« ${key} » introuvable`);
  };
  assert.equal(find(1, 'tables:produit:7x5').speak, 'Combien font 7 fois 5 ?');
  assert.equal(find(3, 'tables:trou:4x5').speak, '4 fois combien égale 20 ?');
  assert.equal(speakableText(find(1, 'tables:produit:7x2').explain),
    '7 fois 2, c\'est le double de 7 : 7 plus 7 égale 14.');
});

test('une même graine redonne la même partie', () => {
  const keys = (seed) => buildQuestions(game, 3, createRng(seed), 10).map((q) => q.key);
  assert.deepEqual(keys(42), keys(42));
});

test('sans `seen`, makeQuestion renvoie quand même une question valide', () => {
  for (const level of [1, 2, 3]) {
    const q = game.makeQuestion(level, createRng(7));
    assert.ok(q.key.startsWith('tables:'), q.key);
    assert.ok(q.answer !== undefined);
  }
});
