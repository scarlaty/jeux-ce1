import test from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/devinettes.js';
import {
  THINGS, TAGS, findThing, confusable, render, clueText, whyNot, definite, indefinite, fitsAll,
} from '../../js/data/devinettes.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';

const draws = () => checkGenerator(game, { draws: 500, minDistinct: 30 });
const CATEGORIES = ['animal', 'fruit', 'legume', 'vetement', 'vehicule'];

test('contrat', () => checkGameShape(game));
test('500 tirages par niveau, 30 questions distinctes', draws);

test('banque : tags connus, certain et discutable séparés, émojis et mots uniques', () => {
  const words = THINGS.map((t) => t.word);
  assert.equal(new Set(words).size, words.length);
  assert.equal(new Set(THINGS.map((t) => t.emoji)).size, THINGS.length, 'émojis en double');
  for (const t of THINGS) {
    assert.ok(['un', 'une', 'du'].includes(t.det), t.word);
    assert.ok(t.is.size >= 2, `${t.word} : au moins 2 indices certains`);
    for (const tag of [...t.is, ...t.maybe]) assert.ok(TAGS[tag], `${t.word} : tag inconnu ${tag}`);
    for (const tag of t.maybe) assert.ok(!t.is.has(tag), `${t.word} : ${tag} à la fois certain et discutable`);
  }
  assert.ok(THINGS.length >= 60);
});

test('banque : catégories exclusives, insecte/oiseau ⊂ animal, un seul fruit OU légume', () => {
  for (const t of THINGS) {
    const cats = CATEGORIES.filter((c) => t.fits.has(c));
    assert.ok(cats.length <= 1, `${t.word} : ${cats}`);
    if (t.fits.has('insecte') || t.fits.has('oiseau')) assert.ok(t.fits.has('animal'), t.word);
    if (t.is.has('insecte')) assert.ok(t.is.has('animal'), t.word);
    // Une chose ne peut pas avoir deux couleurs « certaines » contradictoires de façon absurde : max 2.
    assert.ok([...t.is].filter((x) => TAGS[x].kind === 'colour').length <= 2, t.word);
  }
});

test('banque : faits connus (l\'exemple du cahier des charges)', () => {
  const banane = findThing('banane');
  assert.ok(['jaune', 'fruit', 'singes'].every((x) => banane.is.has(x)));
  // Un citron est jaune et c'est un fruit : il ne peut jamais accompagner la banane sur « jaune + fruit ».
  assert.ok(fitsAll(findThing('citron'), ['jaune', 'fruit']));
  assert.ok(!fitsAll(findThing('citron'), ['jaune', 'fruit', 'singes']));
  assert.ok(!fitsAll(findThing('carotte'), ['jaune']));
  assert.ok(findThing('lapin').is.has('carottes') && findThing('carotte').is.has('lapins'));
  assert.ok(!findThing('chat').fits.has('vole') && findThing('hibou').is.has('vole'));
  assert.ok(findThing('serpent').fits.has('ecailles') && !findThing('serpent').fits.has('pattes4'));
});

test('accords et articles', () => {
  assert.equal(render('Je suis {vert|verte}.', 'f'), 'Je suis verte.');
  assert.equal(render('Je suis {vert|verte}.', 'm'), 'Je suis vert.');
  assert.equal(clueText('vert', findThing('poire')), 'Je suis verte.');
  assert.equal(clueText('vert', findThing('concombre')), 'Je suis vert.');
  assert.equal(whyNot('jaune', findThing('carotte')), "La carotte n'est pas jaune.");
  assert.equal(whyNot('vert', findThing('pomme')), "La pomme n'est pas verte.");
  assert.equal(definite(findThing('ail')), "l'ail");
  assert.equal(definite(findThing('hibou')), 'le hibou');
  assert.equal(definite(findThing('pomme')), 'la pomme');
  assert.equal(indefinite(findThing('beurre')), 'du beurre');
  assert.equal(indefinite(findThing('chaussette')), 'une chaussette');
});

test('aucune ambiguïté : la réponse vérifie tous les indices, chaque intrus en contredit au moins un', () => {
  const byLevel = draws();
  for (const q of Object.values(byLevel).flat()) {
    const { answer, clues, wrong, twin } = q.riddle;
    const a = findThing(answer);
    assert.equal(q.answer, answer);
    assert.ok(clues.every((c) => a.is.has(c)), `indice faux pour la réponse : ${q.key}`);
    const shown = q.display.choices.map((c) => c.value);
    assert.deepEqual([...shown].sort(), [answer, ...(twin ? [twin] : []), ...wrong].sort(), q.key);
    for (const w of wrong) {
      const t = findThing(w);
      assert.ok(!fitsAll(t, clues), `l'intrus « ${w} » vérifie tous les indices : ${q.key}`);
    }
    // Deux choix, jamais confondus à l'image ni identiques.
    const items = shown.map(findThing);
    for (const x of items) for (const y of items) if (x !== y) assert.ok(!confusable(x.word, y.word), `${x.word}/${y.word}`);
    // Parmi les choix, seule la réponse (et le jumeau, au niveau 3) vérifie tous les indices positifs.
    const fitting = items.filter((t) => fitsAll(t, clues)).map((t) => t.word).sort();
    assert.deepEqual(fitting, [answer, ...(twin ? [twin] : [])].sort(), q.key);
    // L'indice de déduction écarte le jumeau, jamais la réponse.
    if (twin) {
      assert.notEqual(twin, answer);
      assert.ok(q.prompt.includes(`Je ne suis pas ${indefinite(findThing(twin))}.`), q.key);
    } else {
      assert.ok(!q.prompt.includes('Je ne suis pas'), q.key);
    }
    // La devinette ne cite jamais sa réponse.
    const said = q.prompt.toLowerCase().replace(new RegExp(twin || '$^', 'g'), '');
    assert.ok(!said.includes(answer), `la devinette donne la réponse : ${q.key}`);
  }
});

test('niveaux : nombre d\'indices et de choix, images puis mots', () => {
  const byLevel = draws();
  for (const q of byLevel[1]) {
    assert.equal(q.riddle.clues.length, 2);
    assert.equal(q.display.choices.length, 3);
    assert.ok(q.display.choices.every((c) => c.emoji));
  }
  for (const q of byLevel[2]) {
    assert.equal(q.riddle.clues.length, 3);
    assert.equal(q.display.choices.length, 4);
    assert.ok(q.display.choices.every((c) => c.emoji));
  }
  for (const q of byLevel[3]) {
    assert.equal(q.display.choices.length, 4);
    assert.ok(q.display.choices.every((c) => !c.emoji && c.text), 'niveau 3 : mots seulement');
    assert.ok(q.riddle.clues.length >= 2 && q.riddle.twin);
  }
});

test('niveau 2 : les intrus sont plausibles (ils vérifient au moins un indice quand c\'est possible)', () => {
  const qs = draws()[2];
  const plausible = qs.filter((q) => q.riddle.wrong.every((w) => q.riddle.clues.some((c) => findThing(w).fits.has(c))));
  assert.ok(plausible.length / qs.length > 0.7, `${plausible.length}/${qs.length}`);
});

test('voix, indice décisif et explication bienveillante', () => {
  for (const q of Object.values(draws()).flat()) {
    assert.equal(q.speak, q.prompt);
    assert.ok(/Qui suis-je \?/.test(q.prompt), q.key);
    assert.ok(/Touche (la bonne image|le bon mot)\.$/.test(q.prompt), q.key);
    assert.ok(q.explain.includes(q.display.choices.find((c) => c.value === q.answer).value), q.key);
    assert.ok(!/faux|raté|perdu|nul/i.test(q.explain), q.key);
    assert.ok(q.explain.includes('«'), q.key);
    assert.ok(q.skill);
  }
});

test('niveau 3 : l\'explication rappelle la déduction', () => {
  for (const q of draws()[3]) {
    assert.ok(q.explain.includes(`Je ne suis pas ${indefinite(findThing(q.riddle.twin))}`), q.key);
  }
});

test('questions distinctes : au moins 30 par niveau avec la banque seule', () => {
  const byLevel = draws();
  for (const level of [1, 2, 3]) {
    assert.ok(new Set(byLevel[level].map((q) => q.key)).size >= 100, `niveau ${level}`);
  }
});
