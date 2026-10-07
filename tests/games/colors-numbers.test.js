import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/colors-numbers.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
import { toChoice } from '../../js/core/validate.js';

const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const all = () => Object.entries(byLevel).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));

// Vocabulaire attendu, écrit ici indépendamment de la banque.
const NUMBER_WORDS = {
  1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
  11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen', 16: 'sixteen', 17: 'seventeen',
  18: 'eighteen', 19: 'nineteen', 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty',
  70: 'seventy', 80: 'eighty', 90: 'ninety', 100: 'one hundred',
};
const WORD_NUMBERS = Object.fromEntries(Object.entries(NUMBER_WORDS).map(([n, w]) => [w, Number(n)]));
const FIRST_COLORS = ['red', 'blue', 'yellow', 'green', 'orange', 'pink'];
const ALL_COLORS = [...FIRST_COLORS, 'purple', 'black', 'white', 'brown', 'grey'];
const FRENCH_COLORS = {
  red: 'rouge', blue: 'bleu', yellow: 'jaune', green: 'vert', orange: 'orange', pink: 'rose',
  purple: 'violet', black: 'noir', white: 'blanc', brown: 'marron', grey: 'gris',
};

const form = (q) => q.key.split(':')[1];
const choices = (q) => q.display.choices.map(toChoice);

test('le jeu respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.id, 'colors-numbers');
  assert.equal(game.title, 'Colors and numbers');
  assert.equal(game.island, 'ailleurs');
  assert.equal(game.subject, 'anglais');
  assert.equal(game.issue, 76);
  assert.ok(game.skills.length >= 1);
  for (const l of game.levels) assert.ok(l.hint);
});

test('au moins 35 questions distinctes par niveau', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    const distinct = new Set(qs.map((q) => q.key)).size;
    assert.ok(distinct >= 35, `niveau ${level} : ${distinct}`);
  }
});

test('toute question a une consigne en français, une explication et une notion', () => {
  for (const [, q] of all()) {
    assert.match(q.prompt, /^(Écoute|Lis|Touche)/, q.prompt);
    assert.ok(q.explain && q.explain.length > 8, q.key);
    assert.ok(q.skill, q.key);
    assert.doesNotMatch(q.explain, /\b(faux|raté|erreur|mauvais)\b/i, q.key);
  }
});

test('toute question montre un texte à l\'écran (#92 : jouable sans le son)', () => {
  for (const [, q] of all()) {
    assert.ok(q.display.show && q.display.show.text, `question sans texte affiché : ${q.key}`);
  }
});

test('questions à écouter : voix anglaise, et le texte écrit est exactement ce qui est dit', () => {
  let listened = 0;
  for (const [, q] of all()) {
    if (!q.speak) continue;   // formes lues seules (mot-chiffre, chiffre-mot, mot-couleur) : pas de haut-parleur du haut
    listened += 1;
    assert.equal(q.lang, 'en-GB', q.key);
    assert.ok(/^[a-zA-Z .]+$/.test(q.speak), q.key);
    assert.ok(q.listenLabel, q.key);
    // Le mot ou la phrase écrits sont identiques à ce qui est dit : pas un indice différent qui
    // trahirait la réponse autrement (voir aussi #92 : avant, rien n'était écrit du tout).
    assert.equal(q.display.show.text, q.speak, q.key);
    assert.equal(q.display.show.lang, 'en-GB', q.key);
  }
  assert.ok(listened > 1000);
});

test('les nombres : le bon chiffre, dans la plage du niveau', () => {
  const max = { 1: 10, 2: 20, 3: 100 };
  const seen = { 1: new Set(), 2: new Set(), 3: new Set() };
  for (const [level, q] of all()) {
    if (!['nombre', 'mot-chiffre', 'chiffre-mot'].includes(form(q))) continue;
    const key = Number(q.key.split(':')[2]);
    assert.ok(NUMBER_WORDS[key], q.key);
    if (form(q) === 'nombre') {
      assert.equal(q.speak, NUMBER_WORDS[key], q.key);
      assert.equal(q.answer, key);
    }
    if (form(q) === 'mot-chiffre') {
      assert.equal(q.display.show.text, NUMBER_WORDS[key]);
      assert.equal(q.answer, key);
    }
    if (form(q) === 'chiffre-mot') {
      assert.equal(q.display.show.text, String(key));
      assert.equal(q.answer, NUMBER_WORDS[key]);
    }
    const values = choices(q).map((c) => c.value);
    assert.ok(values.includes(q.answer), q.key);
    assert.equal(new Set(values).size, 4, q.key);
    for (const v of values) {
      const n = typeof v === 'number' ? v : WORD_NUMBERS[v];
      assert.ok(n >= 1 && n <= max[level], `niveau ${level}, ${q.key} : ${v}`);
    }
    seen[level].add(key);
  }
  assert.deepEqual([...seen[1]].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (let n = 1; n <= 20; n += 1) assert.ok(seen[2].has(n), `niveau 2 : ${n}`);
  for (const n of [13, 19, 20, 30, 50, 90, 100]) assert.ok(seen[3].has(n), `niveau 3 : ${n}`);
  assert.ok(![...seen[2]].some((n) => n > 20));
});

test('treize / trente, quatorze / quarante… : le piège est posé au niveau 3, clairement expliqué', () => {
  const pairs = new Map([[13, 30], [14, 40], [15, 50], [16, 60], [17, 70], [18, 80], [19, 90]]);
  for (const [teen, ty] of pairs) {
    const qs = byLevel[3].filter((q) => form(q) === 'nombre' && [teen, ty].includes(Number(q.key.split(':')[2])));
    assert.ok(qs.length > 0, `${teen} / ${ty} jamais posés`);
    for (const q of qs) {
      const n = Number(q.key.split(':')[2]);
      const other = n === teen ? ty : teen;
      assert.ok(choices(q).some((c) => c.value === other), `${q.key} : ${other} absent des choix`);
      assert.ok(q.explain.toLowerCase().includes(NUMBER_WORDS[other]), q.explain);
      assert.match(q.explain, n === teen ? /« teen »/ : /« ty »/);
    }
  }
});

test('niveau 1 : six couleurs ; niveau 2 : les onze', () => {
  const colorsOf = (level) => new Set(byLevel[level].filter((q) => form(q) === 'couleur').flatMap((q) => choices(q).map((c) => c.value)));
  assert.deepEqual([...colorsOf(1)].sort(), [...FIRST_COLORS].sort());
  assert.deepEqual([...colorsOf(2)].sort(), [...ALL_COLORS].sort());
});

test('les couleurs : on entend ou on lit la couleur, la bonne pastille est touchée', () => {
  for (const [, q] of all()) {
    if (form(q) !== 'couleur' && form(q) !== 'mot-couleur') continue;
    const heard = form(q) === 'couleur' ? q.speak : q.display.show.text;
    assert.ok(ALL_COLORS.includes(heard), q.key);
    assert.equal(q.answer, heard);
    const right = choices(q).find((c) => c.value === heard);
    assert.equal(right.art.color, heard);
    assert.equal(right.art.shape, 'swatch');
    assert.equal(right.label, FRENCH_COLORS[heard]);
    assert.equal(q.explain, `${heard[0].toUpperCase()}${heard.slice(1)}, c'est ${FRENCH_COLORS[heard]}.`);
    // Aucun mot écrit sur les pastilles : l'enfant ne se fie qu'à la couleur.
    for (const c of choices(q)) assert.equal(c.text, undefined);
  }
});

/** « three red apples » → { count: 3, color: 'red', thing: 'apple' } ; ignore « I have ». */
function parseHeard(text) {
  const m = text.replace(/^I have /, '').replace(/\.$/, '').match(/^(one|two|three|four|five|six|seven|eight|nine|ten) (?:([a-z]+) )?(apples?|balloons?|stars?|flowers?)$/);
  assert.ok(m, text);
  return { count: WORD_NUMBERS[m[1]], color: m[2] || null, thing: m[3].replace(/s$/, '') };
}

test('écoute et compte : une seule image correspond exactement à ce qui est dit', () => {
  const max = { 1: 5, 2: 6, 3: 8 };
  let checked = 0;
  for (const [level, q] of all()) {
    if (!['compte', 'compte-couleur', 'phrase', 'phrase-lue'].includes(form(q))) continue;
    checked += 1;
    const heard = parseHeard(form(q) === 'phrase-lue' ? q.display.show.text : q.speak);
    const specs = choices(q).map((c) => c.art);
    assert.equal(specs.length, 4, q.key);
    const matching = specs.filter((a) => a.shape === heard.thing && a.count === heard.count && (heard.color === null || a.color === heard.color));
    assert.equal(matching.length, 1, `${q.key} : ${matching.length} images correspondent`);
    assert.equal(q.answer, `${matching[0].count}-${matching[0].color}`);
    assert.ok(specs.every((a) => a.shape === heard.thing && a.count >= 1 && a.count <= max[level]));
    if (level === 1) assert.equal(new Set(specs.map((a) => a.color)).size, 1, 'niveau 1 : même couleur partout');
    if (heard.thing === 'apple') assert.ok(specs.every((a) => ['red', 'green', 'yellow'].includes(a.color)), q.key);
  }
  assert.ok(checked > 300);
});

test('phrases « I have … » : niveau 3 seulement, lues ou entendues', () => {
  for (const [level, q] of all()) {
    const sentence = form(q).startsWith('phrase');
    if (level < 3) assert.equal(sentence, false);
    if (!sentence) continue;
    const text = q.display.show?.text ?? q.speak;
    assert.match(text, /^I have (one|two|three|four|five|six|seven|eight) [a-z]+ (apples?|balloons?|stars?|flowers?)\.$/);
    assert.match(q.explain, /veut dire « j'ai \d/);
  }
  assert.ok(byLevel[3].some((q) => form(q) === 'phrase'));
  assert.ok(byLevel[3].some((q) => form(q) === 'phrase-lue'));
});

test('corrections des images en français accordé', () => {
  const apples = byLevel[2].filter((q) => q.key.includes(':apple:red:'));
  assert.ok(apples.length);
  for (const q of apples) assert.match(q.explain, /c'est \d pommes? rouges?\.$/);
  const one = byLevel[2].find((q) => q.key.endsWith(':apple:red:1'));
  if (one) assert.match(one.explain, /c'est 1 pomme rouge\.$/);
});
