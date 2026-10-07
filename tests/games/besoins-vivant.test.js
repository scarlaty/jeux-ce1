import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/besoins-vivant.js';
import {
  LIVING, OBJECTS, SILLY, PLANT_NEEDS, ANIMAL_NEEDS, PLANT_EXPERIMENTS, DIETS, GRASS_EATERS, NON_GRASS,
  HABITATS, DEDUCTIONS, TRUE_STATEMENTS, FALSE_STATEMENTS, NEED_NOUN, SILLY_NOUN, NOT_COMMON,
} from '../../js/data/besoins-vivant.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';

const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const all = () => Object.entries(byLevel).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));
const family = (level, prefix) => byLevel[level].filter((q) => q.key.startsWith(`besoins-vivant:${prefix}:`));
const textOf = (q) => [q.prompt, q.explain, ...(q.display.choices || []).map((c) => c.text || c.label || '')].join(' ');

test('contrat du jeu', () => {
  checkGameShape(game);
  assert.equal(game.id, 'besoins-vivant');
  assert.equal(game.island, 'monde');
  assert.equal(game.subject, 'monde');
  assert.equal(game.issue, 68);
  assert.ok(game.skills.length >= 1);
});

test('au moins 30 questions distinctes par niveau (en pratique bien plus)', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    const distinct = new Set(qs.map((q) => q.key)).size;
    assert.ok(distinct >= 60, `niveau ${level} : ${distinct}`);
  }
});

test('banque : émojis uniques, aucun être vivant parmi les objets, mots uniques', () => {
  const things = [...LIVING, ...OBJECTS];
  assert.equal(new Set(things.map((t) => t.emoji)).size, things.length, 'émoji en double');
  assert.equal(new Set(things.map((t) => t.word)).size, things.length, 'mot en double');
  for (const t of things) assert.ok(['un', 'une'].includes(t.det), t.word);
  for (const t of LIVING) assert.ok(['animal', 'plante'].includes(t.kind), t.word);
  assert.ok(LIVING.filter((t) => t.kind === 'animal').length >= 10);
  assert.ok(LIVING.filter((t) => t.kind === 'plante').length >= 5);
});

test('banque : aucun cas limite (graine, feu, nuage, soleil, champignon, fruit, légume, eau…)', () => {
  const banned = /graine|feu|nuage|soleil|champignon|virus|fruit|légume|pomme|carotte|rivière|eau|bois|pierre|caillou/i;
  for (const t of [...LIVING, ...OBJECTS]) assert.ok(!banned.test(t.word), t.word);
});

test('banque : intrus évidents jamais des besoins, besoins de plante sans « nourriture »', () => {
  const values = new Set([...PLANT_NEEDS, ...ANIMAL_NEEDS].map((n) => n.value));
  for (const s of SILLY) assert.ok(!values.has(s.value), s.value);
  assert.deepEqual(PLANT_NEEDS.map((n) => n.value).sort(), ['eau', 'lumiere']);
  assert.deepEqual(ANIMAL_NEEDS.map((n) => n.value).sort(), ['eau', 'nourriture']);
  assert.equal(SILLY.length, SILLY_NOUN.length);
});

test('banque : expériences — une bonne réponse, des mauvaises différentes', () => {
  for (const e of PLANT_EXPERIMENTS) {
    assert.equal(e.wrong.length, 2, e.id);
    assert.ok(!e.wrong.includes(e.right), e.id);
    assert.equal(new Set([e.right, ...e.wrong]).size, 3, e.id);
    assert.ok(e.explain && e.skill, e.id);
  }
  assert.equal(new Set(PLANT_EXPERIMENTS.map((e) => e.id)).size, PLANT_EXPERIMENTS.length);
});

test('banque : régimes — ce que l\'animal mange ne figure jamais parmi ce qu\'il ne mange pas', () => {
  for (const d of DIETS) {
    assert.ok(d.eats.length >= 1 && d.not.length >= 3, d.word);
    for (const f of d.eats) assert.ok(!d.not.includes(f), `${d.word} : ${f}`);
  }
  // Le chat mange parfois de l'herbe, le chien aussi : jamais proposée comme « il n'en mange pas ».
  for (const word of ['chat']) assert.ok(!DIETS.find((d) => d.word === word).not.some((f) => /herbe/.test(f)));
  for (const w of GRASS_EATERS) assert.ok(DIETS.some((d) => d.word === w && d.eats.includes('de l\'herbe')), w);
  for (const n of NON_GRASS) assert.ok(!GRASS_EATERS.includes(n.word), n.word);
});

test('banque : abris — la bonne réponse n\'est jamais parmi les mauvaises', () => {
  for (const h of HABITATS) {
    assert.ok(h.wrong.length >= 3 && !h.wrong.includes(h.right), h.word);
    assert.ok(h.ask.endsWith('?') && h.explain, h.word);
  }
});

test('banque : situations — un seul besoin manque, les autres choix sont différents', () => {
  for (const d of DEDUCTIONS) {
    assert.ok(NEED_NOUN[d.lack], d.id);
    if (d.who === 'plante') assert.ok(['eau', 'lumiere'].includes(d.lack), d.id);
    else assert.ok(['eau', 'nourriture', 'abri', 'air'].includes(d.lack), d.id);
    assert.ok(d.explain.length > 10, d.id);
  }
  assert.ok(DEDUCTIONS.filter((d) => d.who === 'plante').length >= 5);
  assert.ok(DEDUCTIONS.filter((d) => d.who === 'animal').length >= 5);
});

test('banque : phrases vraies et phrases à corriger sans recoupement', () => {
  const trues = new Set(TRUE_STATEMENTS.map((s) => s.text));
  assert.equal(trues.size, TRUE_STATEMENTS.length);
  for (const f of FALSE_STATEMENTS) {
    assert.ok(!trues.has(f.text), f.text);
    assert.ok(f.fix && f.skill, f.text);
  }
  assert.ok(NOT_COMMON.length >= 3);
});

test('niveau 1 : seulement des QCM d\'images ou vivant / pas vivant, 2 ou 3 réponses', () => {
  for (const q of byLevel[1]) {
    assert.equal(q.type, 'choice', q.key);
    const n = q.display.choices.length;
    assert.ok(n === 2 || n === 3, q.key);
  }
  assert.ok(family(1, 'vivant').length > 0 && family(1, 'image').length > 0);
  assert.ok(family(1, 'besoin-plante').length > 0 && family(1, 'besoin-animal').length > 0);
});

test('vivant ou pas vivant : la réponse suit la banque', () => {
  const living = new Set(LIVING.map((t) => t.word));
  for (const q of family(1, 'vivant')) {
    const word = q.key.split(':')[2];
    assert.equal(q.answer, living.has(word) ? 'vivant' : 'non', q.key);
    assert.ok(q.explain.includes('être vivant'), q.key);
  }
  for (const q of family(1, 'image')) {
    const [, , want, right, wrongs] = q.key.split(':');
    const rightSide = want === 'vivant' ? living : new Set(OBJECTS.map((t) => t.word));
    assert.ok(rightSide.has(right), q.key);
    assert.equal(q.answer, right);
    for (const w of wrongs.split('+')) assert.ok(!rightSide.has(w), `${q.key} : ${w}`);
  }
});

test('besoins d\'une plante : eau ou lumière, jamais « nourriture » ni « manger »', () => {
  for (const q of family(1, 'besoin-plante')) {
    assert.ok(['eau', 'lumiere'].includes(q.answer), q.key);
    assert.ok(!/nourriture|manger|mange/i.test(textOf(q)), q.key);
    assert.equal(q.display.choices.length, 3);
  }
});

test('besoins d\'un animal : eau ou nourriture', () => {
  for (const q of family(1, 'besoin-animal')) assert.ok(['eau', 'nourriture'].includes(q.answer), q.key);
});

test('niveau 2 : expériences, repas, abris et rangement', () => {
  for (const prefix of ['experience', 'regime', 'abri', 'ranger']) assert.ok(family(2, prefix).length > 0, prefix);
  for (const q of family(2, 'regime')) {
    const [, , word, right, wrongs] = q.key.split(':');
    const d = DIETS.find((x) => x.word === word);
    assert.ok(d.eats.includes(right), q.key);
    assert.equal(q.answer, right);
    for (const w of wrongs.split('+')) assert.ok(d.not.includes(w), q.key);
  }
  for (const q of family(2, 'abri')) {
    const h = HABITATS.find((x) => q.key.startsWith(`besoins-vivant:abri:${x.word}:`));
    assert.equal(q.answer, h.right);
    for (const c of q.display.choices) if (c.value !== h.right) assert.ok(h.wrong.includes(c.value), q.key);
  }
  for (const q of [...family(2, 'herbe'), ...family(2, 'viande')]) {
    const herbe = q.key.includes(':herbe:');
    const [, , right, wrongs] = q.key.split(':');
    assert.equal(q.answer, right);
    if (herbe) {
      assert.ok(GRASS_EATERS.includes(right), q.key);
      for (const w of wrongs.split('+')) assert.ok(NON_GRASS.some((n) => n.word === w), q.key);
    } else {
      assert.equal(right, 'lion');
      for (const w of wrongs.split('+')) assert.ok(GRASS_EATERS.includes(w), q.key);
    }
  }
});

test('niveau 3 : situations, phrases, besoin commun, rangement', () => {
  for (const prefix of ['manque', 'phrase', 'commun', 'ranger']) assert.ok(family(3, prefix).length > 0, prefix);
  for (const q of family(3, 'manque')) {
    const d = DEDUCTIONS.find((x) => q.key.startsWith(`besoins-vivant:manque:${x.id}:`));
    assert.equal(q.answer, NEED_NOUN[d.lack]);
    assert.equal(q.display.choices.length, 3);
    // Le besoin manquant est le seul parmi les choix qui est un vrai manque : les autres sont dits satisfaits.
    const allowed = d.who === 'plante'
      ? [NEED_NOUN.eau, NEED_NOUN.lumiere, ...SILLY_NOUN]
      : [NEED_NOUN.eau, NEED_NOUN.nourriture, NEED_NOUN.abri, NEED_NOUN.air];
    for (const c of q.display.choices) assert.ok(allowed.includes(c.value), q.key);
    assert.ok(q.prompt.includes(d.text));
  }
  for (const q of family(3, 'commun')) assert.equal(q.answer, 'd\'eau');
});

test('phrases : exactement une phrase vraie (ou une seule pas vraie) parmi les choix', () => {
  const trues = new Set(TRUE_STATEMENTS.map((s) => s.text));
  const falses = new Set(FALSE_STATEMENTS.map((s) => s.text));
  for (const q of family(3, 'phrase')) {
    const shown = q.display.choices.map((c) => c.value);
    assert.equal(shown.length, 3);
    const nTrue = shown.filter((t) => trues.has(t)).length;
    const nFalse = shown.filter((t) => falses.has(t)).length;
    assert.equal(nTrue + nFalse, 3, q.key);
    if (q.key.includes(':vraie:')) {
      assert.equal(nTrue, 1);
      assert.ok(trues.has(q.answer));
    } else {
      assert.equal(nFalse, 1);
      assert.ok(falses.has(q.answer));
    }
  }
});

test('rangement : chaque image a sa boîte, les deux boîtes servent', () => {
  for (const [level, q] of all().filter(([, x]) => x.type === 'drag')) {
    const items = q.display.items;
    assert.equal(items.length, level === 2 ? 3 : 4);
    const boxes = Object.values(q.answer);
    assert.ok(boxes.includes('vivant') && boxes.includes('non'), q.key);
    const living = new Set(LIVING.map((t) => t.emoji));
    for (const it of items) assert.equal(q.answer[it.id] === 'vivant', living.has(it.emoji), `${q.key} ${it.label}`);
  }
});

test('explications bienveillantes, voix, compétence, aucun cas limite dans les textes', () => {
  for (const [, q] of all()) {
    assert.ok(q.explain && q.explain.length > 15, q.key);
    assert.ok(!/faux|raté|perdu|nul|bête|erreur/i.test(q.explain), q.key);
    assert.ok(q.skill, q.key);
    if (q.type === 'choice') assert.match(q.speak, /[.?]$/, q.key);
    assert.ok(!/graine non|feu|nuage|virus|champignon/i.test(textOf(q)), q.key);
  }
});
