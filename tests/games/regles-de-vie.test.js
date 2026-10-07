import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/regles-de-vie.js';
import {
  LEVEL1, LEVEL2, EMOTIONS, STORIES, FACES, GESTURES, SENTENCES, RIGHTS,
} from '../../js/data/regles-de-vie.js';
import { createRng } from '../../js/core/random.js';
import { buildQuestions } from '../../js/core/engine.js';
import { checkGameShape, checkGenerator, checkNoLengthShortcut, checkNoPromptEcho } from '../helpers/game-checks.js';

const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const all = () => Object.entries(byLevel).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));
const BANKS = { LEVEL1, LEVEL2, GESTURES, RIGHTS };
const everyItem = () => Object.values(BANKS).flat();

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
});

test('banques : identifiants uniques, mauvaises réponses toutes différentes de la bonne', () => {
  for (const bank of Object.values(BANKS)) {
    assert.equal(new Set(bank.map((i) => i.id)).size, bank.length);
    for (const i of bank) {
      assert.ok(i.wrong.length >= 2, i.id);
      assert.equal(new Set([i.right, ...i.wrong]).size, i.wrong.length + 1, i.id);
      assert.ok(i.explain.length > 15 && i.skill, i.id);
    }
  }
});

// B1 : règle ou goût ne se devine jamais par la forme de la phrase.
const pronoun = (t) => {
  if (/\bon\b/i.test(t)) return 'on';
  return /^(je|j')/i.test(t) ? 'je' : 'autre';
};
const firstWord = (t) => t.split(/[\s']/)[0].toLowerCase().replace(/^j$/, 'je');

test('règle / goût : ni le pronom (on, je) ni le premier mot ne séparent les deux catégories', () => {
  const rules = SENTENCES.filter((s) => s.kind === 'regle');
  const tastes = SENTENCES.filter((s) => s.kind === 'gout');
  assert.ok(rules.length >= 10 && tastes.length >= 10);
  assert.equal(new Set(SENTENCES.map((s) => s.id)).size, SENTENCES.length);
  for (const form of ['on', 'je']) {
    for (const group of [rules, tastes]) {
      const n = group.filter((s) => pronoun(s.text) === form).length;
      assert.ok(n / group.length >= 1 / 3, `forme « ${form} » : ${n}/${group.length}`);
    }
  }
  const starts = {};
  for (const s of SENTENCES) (starts[firstWord(s.text)] ||= []).push(s.kind);
  for (const [w, kinds] of Object.entries(starts)) {
    if (kinds.length < 4) continue;
    const share = kinds.filter((k) => k === 'regle').length / kinds.length;
    assert.ok(share >= 0.25 && share <= 0.75, `le premier mot « ${w} » sépare règles et goûts`);
  }
});

test('règle ou goût : une seule bonne phrase, selon le genre demandé', () => {
  const kindOf = new Map(SENTENCES.map((s) => [s.text, s.kind]));
  const qs = byLevel[3].filter((x) => /:(regle|gout):/.test(x.key));
  assert.ok(qs.length > 0);
  for (const q of qs) {
    const want = q.key.includes(':regle:') ? 'regle' : 'gout';
    const kinds = q.display.choices.map((c) => kindOf.get(c.value));
    assert.equal(kinds.filter((k) => k === want).length, 1, q.key);
    assert.equal(kindOf.get(q.answer), want, q.key);
  }
});

// B2 : aucune fuite entre une histoire et un geste de la même partie.
test('niveau 3 : un geste ne reprend jamais un prénom d\'histoire ou de visage', () => {
  const names = [...STORIES, ...FACES].map((s) => s.who);
  for (const g of GESTURES) for (const n of names) assert.ok(!g.prompt.includes(n), `${g.id} reprend ${n}`);
  const rng = createRng(77);
  for (let i = 0; i < 500; i++) {
    const partie = buildQuestions(game, 3, rng, 10);
    const told = partie.filter((q) => /:(histoire|visage):/.test(q.key)).map((q) => q.prompt);
    for (const g of partie.filter((q) => q.key.includes(':g-'))) {
      const name = g.prompt.match(/^[A-ZÉ][a-zéèëï]+/)?.[0];
      for (const p of told) assert.ok(!name || !p.includes(name), `${g.key} / ${p}`);
    }
  }
});

// C1, C2, C8 : raccourcis de surface.
test('la bonne réponse n\'est pas la plus longue plus d\'une fois sur deux', () => {
  for (const [name, bank] of Object.entries(BANKS)) checkNoLengthShortcut(bank, { max: 0.5, label: name });
});

test('la bonne réponse ne recopie pas seule les mots de la consigne (≤ 10 %)', () => {
  for (const [name, bank] of Object.entries(BANKS)) checkNoPromptEcho(bank, { max: 0.1, label: name });
});

test('une même bonne réponse revient au plus 4 fois par banque', () => {
  for (const [name, bank] of Object.entries(BANKS)) {
    const count = {};
    for (const i of bank) count[i.right] = (count[i.right] || 0) + 1;
    for (const [r, n] of Object.entries(count)) assert.ok(n <= 4, `${name} : « ${r} » ×${n}`);
  }
});

test('l\'explication ne recopie pas la bonne réponse', () => {
  for (const i of [...LEVEL1, ...LEVEL2]) {
    assert.ok(!i.explain.toLowerCase().includes(i.right.toLowerCase().replace(/[ !?.]+$/, '')), i.id);
  }
});

// C3 : émotions variées, histoires sans verbe-indice.
test('émotions : au moins 6, chacune avec une histoire sans verbe-indice', () => {
  assert.ok(EMOTIONS.length >= 6);
  for (const e of EMOTIONS) assert.ok(STORIES.some((s) => s.feel === e.id && s.cue === false), e.id);
  for (const s of STORIES.filter((x) => x.cue === false)) {
    assert.ok(!/pleure|crie|sourit|tremble|saute|soupire|sourire/i.test(s.story), s.id);
  }
  assert.equal(new Set(STORIES.map((s) => s.id)).size, STORIES.length);
});

test('émotions : trois choix, bonne émotion présente, jamais deux émotions proches', () => {
  const qs = byLevel[3].filter((q) => /:(histoire|visage):/.test(q.key));
  assert.ok(qs.length > 0);
  for (const q of qs) {
    assert.equal(q.display.choices.length, 3, q.key);
    const right = EMOTIONS.find((e) => e.id === q.answer);
    for (const c of q.display.choices) assert.ok(!right.near.includes(c.value), q.key);
    assert.ok(q.display.choices.every((c) => !c.emoji), `${q.key} : pas d'émoji dans les choix`);
  }
});

test('visages : l\'explication change d\'un visage à l\'autre', () => {
  assert.equal(new Set(FACES.map((f) => f.explain)).size, FACES.length);
});

// C4, C5, C7 : formulations.
test('« Un adulte te parle » n\'apparaît pas sans rôle', () => {
  for (const i of everyItem()) for (const t of [i.prompt, i.right, ...i.wrong]) assert.ok(!/Un adulte te parle/.test(t), t);
});

test('aucune réponse n\'impose un accord au masculin à la joueuse', () => {
  for (const i of everyItem()) {
    for (const r of [i.right, ...i.wrong]) assert.ok(!/\bje (suis|me sens|reste) (content|prêt|seul|ravi|heureux|fier|fâché|désolé|gêné|surpris)e?\b|être (mêlé|gêné|puni)e?\b/i.test(r), r);
  }
});

test('aucune violence, même dans les mauvaises réponses', () => {
  const wrongs = everyItem().flatMap((i) => i.wrong);
  for (const w of wrongs) assert.ok(!/caillou|venger|bagarre|\bmord|griffe/i.test(w), w);
  const physical = wrongs.filter((w) => /frappe|\btape\b|taper|pousse|lance|arrache|casse\b|déchire/i.test(w));
  assert.ok(physical.length / wrongs.length <= 0.05, `${physical.length}/${wrongs.length} : ${physical.join(' | ')}`);
});

test('ton bienveillant, voix et compétence renseignées', () => {
  for (const [, q] of all()) {
    assert.ok(q.skill && q.explain && q.speak, q.key);
    assert.ok(!/faux|raté|nul|bête|erreur|méchant|punition/i.test(q.explain), q.key);
    assert.ok(!/(tu dois|tu devrais)/i.test(q.explain), q.key);
  }
});

test('étiquette : le rangement à la maison n\'est pas une règle de la classe', () => {
  assert.equal(LEVEL2.find((i) => i.id === 'range').skill, 'règles de la maison');
});
