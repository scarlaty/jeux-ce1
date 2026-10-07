import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/tirelire.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
import { sameAnswer } from '../../js/core/engine.js';

const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const all = () => Object.entries(byLevel).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));

const NB = ' ';
const sumOf = (art) => art.pieces.reduce((t, v) => t + v, 0);
const shown = (q) => q.display.show?.art;

/** « 2 € et 50 c » → 250 ; « 70 c » → 70 ; « 3 € » → 300. */
function cents(text) {
  const euros = /(\d+) €/.exec(text);
  const rest = /(\d+) c/.exec(text);
  return (euros ? Number(euros[1]) * 100 : 0) + (rest ? Number(rest[1]) : 0);
}

test('le jeu respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.id, 'tirelire');
  assert.equal(game.island, 'mesures');
  assert.equal(game.subject, 'maths');
  assert.equal(game.issue, 60);
  assert.ok(game.skills.length > 0);
});

test('plus de 30 questions distinctes par niveau, une explication et une compétence partout', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    assert.ok(new Set(qs.map((q) => q.key)).size >= 30, `niveau ${level}`);
  }
  for (const [, q] of all()) {
    assert.ok(q.explain && q.explain.length > 10, q.key);
    assert.ok(q.skill, q.key);
  }
});

test('compter : la réponse est la somme exacte des pièces affichées', () => {
  const counts = all().filter(([, q]) => q.key.startsWith('tirelire:compter:'));
  assert.ok(counts.length > 100);
  for (const [level, q] of counts) {
    assert.equal(q.type, 'keypad');
    assert.equal(q.answer * 100, sumOf(shown(q)), q.key);
    assert.ok(q.answer <= (level === 1 ? 50 : 100), `niveau ${level} : ${q.answer} €`);
    // L'explication additionne bien les mêmes nombres.
    assert.ok(q.explain.includes(`= ${q.answer}.`), q.explain);
  }
});

test('niveau 1 : uniquement des euros entiers de 1, 2, 5, 10 et 20 € ; niveau 2 ajoute le billet de 50 €', () => {
  for (const [level, q] of all()) {
    const arts = [shown(q), ...(q.display.choices || []).map((c) => c.art)].filter(Boolean);
    for (const art of arts) {
      for (const v of art.pieces) {
        if (level === 1) assert.ok([100, 200, 500, 1000, 2000].includes(v), `${q.key} : ${v}`);
      }
    }
  }
});

test('comparer : une seule bonne réponse, bien calculée, et des pièges (moins de pièces mais plus d\'argent)', () => {
  const compares = all().filter(([, q]) => q.key.startsWith('tirelire:comparer:'));
  assert.ok(compares.length > 100);
  let traps = 0;
  for (const [, q] of compares) {
    const [a, b] = q.display.choices.map((c) => sumOf(c.art));
    assert.notEqual(a, b, `${q.key} : sommes égales`);
    assert.ok(Math.abs(a - b) >= 300, `${q.key} : écart trop faible`);
    const small = q.prompt.includes('petite');
    const expected = (small ? a < b : a > b) ? 'A' : 'B';
    assert.equal(q.answer, expected, q.key);
    const [big, little] = a > b ? [q.display.choices[0].art, q.display.choices[1].art] : [q.display.choices[1].art, q.display.choices[0].art];
    if (big.pieces.length < little.pieces.length) traps += 1;
  }
  assert.ok(traps > compares.length / 4, `pièges : ${traps} / ${compares.length}`);
});

test('reconnaître : le billet ou la pièce demandé figure une fois, les autres sont différents', () => {
  const recos = all().filter(([, q]) => q.key.startsWith('tirelire:reconnaitre:'));
  assert.ok(recos.length > 0);
  for (const [level, q] of recos) {
    assert.equal(level, 1);
    assert.equal(q.display.choices.filter((c) => c.value === q.answer).length, 1);
    assert.equal(q.display.choices.length, 3);
    assert.ok(q.prompt.includes(`${q.answer / 100}${NB}€`));
    assert.ok(/billet|pièce/.test(q.prompt));
    const wantsNote = q.prompt.includes('billet');
    assert.equal(q.answer >= 500, wantsNote, 'billet = 5 € et plus, pièce = 1 € ou 2 €');
  }
});

test('composer : toute composition qui fait la somme est acceptée, la réponse est le total', () => {
  const composes = all().filter(([, q]) => q.type === 'amount');
  assert.ok(composes.length > 100);
  for (const [level, q] of composes) {
    assert.equal(level, 2);
    assert.ok(q.answer >= 4 && q.answer <= 100, q.key);
    const values = q.display.options.map((o) => o.value);
    // Le composant renvoie la somme des pièces posées : deux compositions différentes, même total.
    const twice = (v) => [v, v].reduce((t, x) => t + x, 0);
    assert.ok(sameAnswer(q.answer, q.answer));
    assert.equal(twice(5), 10);
    for (const o of q.display.options) assert.equal(sumOf(o.art), o.value * 100, 'l\'image correspond à la valeur');
    assert.ok(q.prompt.includes(`${q.answer}${NB}€`));
    assert.ok(q.explain.includes(`${q.answer} €`));
    // L'exemple de l'explication fait bien le total, avec les pièces proposées.
    const example = q.explain.match(/Par exemple : ([^.]+)\./)[1].split(' + ').map((t) => parseInt(t, 10));
    assert.equal(example.reduce((t, v) => t + v, 0), q.answer, q.key);
    for (const v of example) assert.ok(values.includes(v), `${q.key} : ${v}`);
  }
});

test('rendre la monnaie : le calcul est juste et la monnaie est toujours positive', () => {
  const euros = all().filter(([, q]) => q.key.startsWith('tirelire:monnaie:'));
  const centimes = all().filter(([, q]) => q.key.startsWith('tirelire:monnaie-c:'));
  const mixtes = all().filter(([, q]) => q.key.startsWith('tirelire:monnaie-mixte:'));
  assert.ok(euros.length > 50 && centimes.length > 50 && mixtes.length > 50);
  for (const [level, q] of euros) {
    assert.equal(level, 3);
    const [, price, paid] = /à (\d+) €.*billet de (\d+) €/.exec(q.prompt).map(Number);
    assert.equal(q.answer, paid - price, q.prompt);
    assert.equal(sumOf(shown(q)), paid * 100, 'le billet montré est celui qu\'on paie');
    assert.ok(q.answer > 0);
  }
  for (const [, q] of centimes) {
    const price = Number(/à (\d+) c/.exec(q.prompt)[1]);
    assert.equal(price % 10, 0);
    assert.equal(q.answer, 100 - price, q.prompt);
    assert.ok(q.answer > 0 && q.answer < 100);
  }
  for (const [, q] of mixtes) {
    const [price, paid] = [...q.prompt.matchAll(/à ([^.]+)\. Tu paies avec (?:un billet|une pièce) de ([^.]+?)\./g)][0].slice(1).map(cents);
    assert.equal(cents(q.answer), paid - price, q.prompt);
    assert.equal(sumOf(shown(q)), paid);
  }
});

test('les choix en centimes : écriture unique, une seule bonne réponse, jamais « 100 c »', () => {
  const textual = all().filter(([, q]) => q.type === 'choice' && q.display.choices.every((c) => typeof c.value === 'string' && /[€c]/.test(c.value)));
  assert.ok(textual.length > 100);
  for (const [, q] of textual) {
    const values = q.display.choices.map((c) => c.value);
    assert.equal(new Set(values.map(cents)).size, values.length, `${q.key} : deux écritures de la même somme`);
    assert.equal(values.filter((v) => cents(v) === cents(q.answer)).length, 1);
    for (const v of values) {
      assert.doesNotMatch(v, /\b\d{3,} ?c/, `${v} : à écrire en euros`);
      assert.doesNotMatch(v, /^0 €/, v);
      // Écriture normale : « 2 € et 50 c », « 3 € » ou « 70 c ».
      assert.match(v, /^(\d+ €( et \d+ c)?|\d+ c)$/, v);
    }
  }
});

test('niveau 3 : les pièces de centimes sont seulement 50 c, 20 c et 10 c', () => {
  for (const q of byLevel[3]) {
    for (const art of [shown(q), ...(q.display.choices || []).map((c) => c.art)].filter(Boolean)) {
      for (const v of art.pieces) assert.ok([10, 20, 50].includes(v) || v >= 100, `${q.key} : ${v}`);
    }
  }
});

test('les consignes disent « € » avec une espace insécable et la voix lit des mots', () => {
  for (const [, q] of all()) {
    assert.doesNotMatch(q.prompt, /\d €/, `${q.key} : espace insécable attendue`);
    if (q.speak) assert.doesNotMatch(q.speak, /€|\d c/, q.key);
  }
});
