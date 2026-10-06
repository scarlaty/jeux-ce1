import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/ecrire-nombres.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
import { enLettres, enChiffres, morceaux } from '../../js/data/nombres-en-lettres.js';
import { createRng } from '../../js/core/random.js';
import { buildQuestions } from '../../js/core/engine.js';

const MAX = { 1: 69, 2: 100, 3: 1000 };
const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const all = () => Object.entries(byLevel).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));

/** Le nombre travaillé par la question, lu dans sa clé (« ecrire-nombres:pavé:97 »). */
function numberOf(q) {
  const m = q.key.match(/^ecrire-nombres:(lettres|chiffres|pavé|ordre):(\d+)$/);
  assert.ok(m, `clé inattendue : ${q.key}`);
  return Number(m[2]);
}

test('le jeu respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.id, 'ecrire-nombres');
  assert.equal(game.island, 'nombres');
  assert.equal(game.subject, 'maths');
  assert.equal(game.issue, 50);
});

test('bien plus de 30 questions distinctes par niveau', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    const distinct = new Set(qs.map((q) => q.key)).size;
    assert.ok(distinct >= 60, `niveau ${level} : ${distinct}`);
  }
});

test('les bornes de chaque niveau sont respectées', () => {
  for (const [level, q] of all()) {
    const n = numberOf(q);
    assert.ok(n >= 1 && n <= MAX[level], `niveau ${level} : ${q.key}`);
  }
  // Chaque niveau travaille bien sa plage.
  assert.ok(byLevel[2].some((q) => numberOf(q) >= 70 && numberOf(q) <= 99), 'niveau 2 : les pièges 70-99');
  assert.ok(byLevel[2].some((q) => numberOf(q) === 100), 'niveau 2 : cent');
  assert.ok(byLevel[3].every((q) => numberOf(q) >= 100), 'niveau 3 : à partir de cent');
  assert.ok(byLevel[3].some((q) => numberOf(q) % 100 === 0 && numberOf(q) >= 200), 'niveau 3 : deux-cents…');
  assert.ok(byLevel[3].some((q) => numberOf(q) === 1000), 'niveau 3 : mille');
  assert.ok(byLevel[1].some((q) => numberOf(q) % 10 === 1 && numberOf(q) >= 21), 'niveau 1 : vingt-et-un…');
});

test('la réponse attendue est toujours celle du convertisseur', () => {
  for (const [, q] of all()) {
    const n = numberOf(q);
    if (q.type === 'keypad') assert.equal(q.answer, n, q.key);
    else if (q.type === 'order') assert.deepEqual(q.answer, morceaux(n), q.key);
    else if (q.key.includes(':lettres:')) assert.equal(q.answer, enLettres(n), q.key);
    else assert.equal(q.answer, n, q.key);
  }
});

// Le test le plus important du jeu : une enfant qui apprend l'orthographe des nombres ne doit
// JAMAIS voir une écriture fautive, même comme mauvaise réponse.
test('aucune orthographe fautive n\'est montrée, nulle part', () => {
  for (const [level, q] of all()) {
    const written = [
      // Chaque nombre lu par l'enfant : les choix d'un QCM, le mot à reconstituer,
      // le nombre de la consigne et celui donné par la correction.
      ...(q.type === 'choice' ? q.display.choices : []),
      ...(q.type === 'order' ? [q.answer.join('-')] : []),
      ...(q.prompt.match(/[a-zéèà]+(?:-[a-zéèà]+)+/gi) || []),
      ...(q.explain.match(/« ([^»]+) »/) || []).slice(1),
    ].filter((c) => typeof c === 'string' && /[a-zéè]/i.test(c));
    assert.ok(written.length >= 1, q.key);
    for (const mots of written) {
      assert.ok(enChiffres(mots) !== null, `orthographe inconnue : « ${mots} » (${q.key})`);
    }
    // Les nombres proposés restent dans la plage du niveau.
    for (const c of q.type === 'choice' ? q.display.choices : []) {
      const n = typeof c === 'number' ? c : enChiffres(c);
      assert.ok(n >= 1 && n <= MAX[level], `choix hors plage : ${c} (${q.key})`);
    }
  }
});

test('un QCM propose quatre nombres différents, dont la bonne réponse', () => {
  const qcm = all().filter(([, q]) => q.type === 'choice');
  assert.ok(qcm.length > 100, `${qcm.length} QCM`);
  for (const [, q] of qcm) {
    assert.equal(q.display.choices.length, 4, q.key);
    const numbers = q.display.choices.map((c) => (typeof c === 'number' ? c : enChiffres(c)));
    assert.equal(new Set(numbers).size, 4, `choix en double : ${q.key}`);
    assert.ok(numbers.includes(numberOf(q)), q.key);
    // Il faut lire le nombre en entier : au moins deux leurres changent de dizaine ou de centaine.
    const far = numbers.filter((x) => Math.abs(x - numberOf(q)) >= 9);
    assert.ok(far.length >= 2, `leurres trop proches : ${numbers.join(', ')} (${q.key})`);
  }
});

test('les morceaux à ranger sont ceux du nombre, mélangés', () => {
  const ordered = all().filter(([, q]) => q.type === 'order');
  assert.ok(ordered.length > 100, `${ordered.length} questions « ordre »`);
  for (const [, q] of ordered) {
    const n = numberOf(q);
    assert.equal(q.answer.join('-'), enLettres(n), q.key);
    assert.ok(q.display.items.length >= 2, q.key);
    assert.deepEqual([...q.display.items].sort(), [...q.answer].sort(), q.key);
    assert.notDeepEqual(q.display.items, q.answer, `déjà rangé : ${q.key}`);
  }
});

// Le nombre en chiffres va dans l'illustration (gros caractères, une seule ligne) ; le nombre
// en lettres est trop long pour cette place et va dans la consigne, qui revient à la ligne.
test('le nombre est montré en chiffres dans l\'illustration, en lettres dans la consigne', () => {
  for (const [, q] of all()) {
    const n = numberOf(q);
    const show = q.display.show;
    if (show) {
      assert.equal(show.text, String(n), q.key);
      assert.equal(show.speak, String(n), q.key);
      assert.doesNotMatch(q.prompt, /[a-zéè]-[a-zéè]/, `nombre en lettres dans la consigne : ${q.prompt}`);
    } else {
      assert.ok(q.prompt.includes(enLettres(n)), `${q.key} : ${q.prompt}`);
    }
    assert.ok(q.prompt.length <= 75, `consigne trop longue : ${q.prompt}`);
  }
  // Les deux sens sont travaillés.
  assert.ok(all().some(([, q]) => q.display.show), 'des questions en chiffres');
  assert.ok(all().some(([, q]) => !q.display.show), 'des questions en lettres');
});

test('la correction donne la bonne écriture et une astuce', () => {
  for (const [, q] of all()) {
    const n = numberOf(q);
    assert.ok(q.explain.includes(`« ${enLettres(n)} »`), `écriture absente : ${q.key} → ${q.explain}`);
    assert.ok(q.explain.includes(String(n)), `nombre absent : ${q.key} → ${q.explain}`);
    assert.ok(q.explain.length <= 120, `explication trop longue : ${q.explain}`);
  }
});

/** Cherche une question portant sur un nombre précis, dans beaucoup de parties. */
function find(level, n) {
  for (let seed = 1; seed < 3000; seed++) {
    const q = buildQuestions(game, level, createRng(seed), 10).find((x) => numberOf(x) === n);
    if (q) return q;
  }
  throw new Error(`aucune question sur ${n} au niveau ${level}`);
}

test('les pièges ont leur astuce', () => {
  assert.match(find(1, 21).explain, /De 21 à 61, on met « et » : vingt-et-un, trente-et-un…$/);
  assert.match(find(2, 70).explain, /70, c'est 60 \+ 10 : on compte à partir de soixante\./);
  assert.match(find(2, 71).explain, /71, c'est 60 \+ 11 : soixante-et-onze\./);
  assert.match(find(2, 80).explain, /Quatre-vingts, c'est 4 fois 20 : avec un s à la fin\./);
  assert.match(find(2, 97).explain, /97, c'est 80 \+ 17 : ici, quatre-vingt perd son s\./);
  assert.match(find(2, 100).explain, /Cent ne prend pas de s : il n'y a qu'une centaine\./);
  assert.match(find(3, 200).explain, /Une centaine entière prend un s : deux-cents, trois-cents\./);
  assert.match(find(3, 1000).explain, /Mille ne prend jamais de s\./);
});

test('la notion travaillée est nommée, et chaque niveau a les siennes', () => {
  const skills = (level) => [...new Set(byLevel[level].map((q) => q.skill))].sort();
  assert.deepEqual(skills(1), ['les nombres avec « et »', 'les nombres jusqu\'à 69']);
  assert.ok(skills(2).includes('quatre-vingts et quatre-vingt-dix'));
  assert.ok(skills(2).includes('soixante-dix et au-delà'));
  assert.deepEqual(skills(3), ['les centaines', 'mille']);
});

test('une partie enchaîne les quatre formes, sans doublon', () => {
  for (const level of [1, 2, 3]) {
    for (let seed = 1; seed <= 50; seed++) {
      const qs = buildQuestions(game, level, createRng(seed), 10);
      assert.equal(new Set(qs.map((q) => q.key)).size, 10, `niveau ${level}, graine ${seed}`);
      const types = new Set(qs.map((q) => q.key.split(':')[1]));
      assert.equal(types.size, 4, `niveau ${level}, graine ${seed} : ${[...types].join()}`);
    }
  }
});

test('une même graine redonne la même partie', () => {
  const keys = (seed) => buildQuestions(game, 2, createRng(seed), 10).map((q) => q.key);
  assert.deepEqual(keys(7), keys(7));
});

test('sans `seen`, makeQuestion renvoie quand même une question valide', () => {
  const q = game.makeQuestion(3, createRng(5));
  assert.ok(q.key.startsWith('ecrire-nombres:'));
  assert.ok(q.answer !== undefined);
});
