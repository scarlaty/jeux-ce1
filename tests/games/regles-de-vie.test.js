import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/regles-de-vie.js';
import {
  LEVEL1, LEVEL2, EMOTIONS, STORIES, FACES, GESTURES, RULES, PREFERENCES, RIGHTS,
} from '../../js/data/regles-de-vie.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';

const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const all = () => Object.entries(byLevel).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));

test('contrat du jeu', () => {
  checkGameShape(game);
  assert.equal(game.id, 'regles-de-vie');
  assert.equal(game.island, 'ailleurs');
  assert.equal(game.subject, 'emc');
  assert.equal(game.issue, 80);
});

test('au moins 30 questions distinctes par niveau', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    assert.ok(new Set(qs.map((q) => q.key)).size >= 30, `niveau ${level}`);
  }
  assert.ok(LEVEL1.length >= 30 && LEVEL2.length >= 30);
  assert.ok(STORIES.length + FACES.length + GESTURES.length + RIGHTS.length + RULES.length + PREFERENCES.length >= 30);
});

test('banque : identifiants uniques, mauvaises réponses jamais égales à la bonne', () => {
  for (const bank of [LEVEL1, LEVEL2, GESTURES, RIGHTS]) {
    assert.equal(new Set(bank.map((i) => i.id)).size, bank.length);
    for (const i of bank) {
      assert.ok(i.wrong.length >= 2, i.id);
      assert.ok(!i.wrong.includes(i.right), i.id);
      assert.equal(new Set([i.right, ...i.wrong]).size, i.wrong.length + 1, i.id);
      assert.ok(i.explain && i.explain.length > 15, i.id);
    }
  }
});

test('banque : règles et préférences sans recoupement, formes reconnaissables', () => {
  assert.equal(new Set([...RULES, ...PREFERENCES]).size, RULES.length + PREFERENCES.length);
  for (const r of RULES) assert.match(r, /^(On |À la |Dans la )/, r);
  for (const p of PREFERENCES) assert.match(p, /(J'aime|préféré|préférée|Je préfère)/, p);
});

test('banque : histoires — émotion connue, au moins 3 histoires par émotion', () => {
  const ids = EMOTIONS.map((e) => e.id);
  for (const s of [...STORIES, ...FACES]) assert.ok(ids.includes(s.feel), s.id);
  for (const e of ids) assert.ok(STORIES.filter((s) => s.feel === e).length >= 3, e);
  assert.equal(new Set(STORIES.map((s) => s.id)).size, STORIES.length);
});

test('émotions : trois choix, la bonne émotion présente, accord selon le personnage', () => {
  const qs = byLevel[3].filter((q) => /:(histoire|visage):/.test(q.key));
  assert.ok(qs.length > 0);
  for (const q of qs) {
    assert.equal(q.display.choices.length, 3, q.key);
    assert.ok(EMOTIONS.some((e) => e.id === q.answer), q.key);
    const fem = q.key.endsWith(':doudou') || q.key.endsWith(':course');
    if (fem) assert.ok(q.display.choices.every((c) => c.text !== 'Content'), q.key);
  }
});

test('règle ou préférence : une seule bonne phrase', () => {
  for (const q of byLevel[3].filter((x) => /:(regle|gout):/.test(x.key))) {
    const shown = q.display.choices.map((c) => c.value);
    const nRules = shown.filter((t) => RULES.includes(t)).length;
    const wantRule = q.key.includes(':regle:');
    assert.equal(nRules, wantRule ? 1 : 2, q.key);
    assert.equal(RULES.includes(q.answer), wantRule, q.key);
  }
});

test('ton bienveillant, voix et compétence renseignées', () => {
  for (const [, q] of all()) {
    assert.ok(q.skill && q.explain && q.speak, q.key);
    assert.ok(!/faux|raté|nul|bête|erreur|méchant|punition/i.test(q.explain), q.key);
    assert.ok(!/(tu dois|tu devrais)/i.test(q.explain), q.key);
  }
});
