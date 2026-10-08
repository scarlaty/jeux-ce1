import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/etats-eau.js';
import * as bank from '../../js/data/etats-eau.js';
import {
  checkGameShape, checkGenerator, checkEmojis, checkNoSurfaceShortcut, checkEpicene, textsOfQuestion,
  visibleOfQuestion,
} from '../helpers/game-checks.js';

const {
  NAMES, THINGS, PICTURES, STATEMENTS_1, STATEMENTS_3, SCENE_CHOICES, OUTCOMES, DRYING, CHANGES, CHANGE_CHOICES,
  EXPERIMENTS, VOCAB, VOCAB_CHOICES, SORT_ITEMS,
} = bank;

const byLevel = checkGenerator(game, { draws: 2000, minDistinct: 30 });
const all = () => Object.entries(byLevel).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));
const family = (level, prefix) => byLevel[level].filter((q) => q.key.startsWith(`etats-eau:${prefix}:`));
const SORT = (a, b) => a.localeCompare(b);

test('contrat du jeu', () => {
  checkGameShape(game);
  assert.equal(game.id, 'etats-eau');
  assert.equal(game.island, 'monde');
  assert.equal(game.subject, 'monde');
  assert.equal(game.issue, 72);
  assert.ok(game.skills.length >= 3);
});

test('au moins 30 questions distinctes par niveau, mesurées', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    const distinct = new Set(qs.map((q) => q.key)).size;
    assert.ok(distinct >= 30, `niveau ${level} : ${distinct}`);
  }
});

// --- Exactitude scientifique ----------------------------------------------------------------------

test('jamais un nuage, une buée ou une fumée : ce sont des gouttes de liquide, pas un gaz', () => {
  const banned = /nuage|buée|fumée|brouillard|neige fondue|sorbet|givre|rosée|vanille|bouilloire|casserole|bouillir|bouillante|bouillon|ébullition/i;
  const texts = [
    ...Object.values(bank).flatMap((v) => JSON.stringify(v)),
    ...all().flatMap(([, q]) => textsOfQuestion(q)),
  ];
  for (const t of texts) assert.ok(!banned.test(t), t.slice(0, 120));
  // et aucun émoji de nuage / de brouillard / de fumée
  for (const [, q] of all()) assert.ok(!/[☁⛅🌫💨♨]/u.test(JSON.stringify(q)), q.key);
});

test('aucun gaz n\'est dessiné par un émoji ; les émojis restent lisibles sans hésiter', () => {
  for (const t of THINGS.filter((x) => x.state === 'gaz')) assert.equal(t.emoji, undefined, t.id);
  const emojis = [...THINGS.filter((t) => t.emoji).map((t) => t.emoji), ...Object.values(PICTURES).flat().map((p) => p.emoji)];
  assert.ok(emojis.every((e) => ['🧊', '❄️', '⛄', '💧', '🌧️', '🌊'].includes(e)), emojis.join(' '));
  checkEmojis(all().map(([, q]) => q));
  // chaque émoji désigne un seul état
  const stateOf = new Map();
  for (const t of THINGS.filter((x) => x.emoji)) stateOf.set(t.emoji, t.state);
  for (const [s, list] of Object.entries(PICTURES)) for (const p of list) assert.equal(stateOf.get(p.emoji), s, p.value);
});

test('l\'état annoncé de chaque chose est exact (relecture par mot-clé de la banque)', () => {
  const solid = /glaçon|neige|grêlon/;
  const liquid = /goutte|pluie|mer|robinet|flaque|bain/;
  const gas = /vapeur|invisible|dans l.air/;
  for (const t of THINGS) {
    const found = [solid.test(t.text) && 'solide', liquid.test(t.text) && 'liquide', gas.test(t.text) && 'gaz'].filter(Boolean);
    assert.deepEqual(found, [t.state], t.id);
  }
});

test('toute phrase vraie sur la vapeur d\'eau dit « gaz », « invisible » ou « dans l\'air » ; aucune ne la rend visible', () => {
  for (const s of [...STATEMENTS_1.true, ...STATEMENTS_3.true]) {
    if (/vapeur/.test(s.text)) assert.ok(/gaz|invisible/.test(s.text), s.text);
    assert.ok(!/(on|peut) (la )?voi(t|r)/.test(s.text.replace('ne la voit pas', '')) || !/vapeur/.test(s.text), s.text);
  }
  for (const s of [...STATEMENTS_1.false, ...STATEMENTS_3.false]) {
    if (/on voit la vapeur/i.test(s.text)) assert.match(s.fix, /invisible/);
  }
});

test('situations : le modèle physique redonne la réponse de chaque objet × lieu de la banque', () => {
  const cold = /congélateur|grand froid|glaciale/;
  const model = (obj, place) => {
    const ice = /glaçon|glace/.test(obj);
    if (ice) return cold.test(place) ? 'Rien ne change.' : 'La glace fond.';
    if (cold.test(place)) return 'L\'eau gèle.';
    assert.match(obj, /fermé/, `eau ouverte au chaud (elle s'évaporerait) : ${obj} ${place}`);
    return 'Rien ne change.';
  };
  let n = 0;
  for (const o of OUTCOMES) {
    assert.ok(o.objects.length >= 3 && o.places.length >= 3, o.id);
    for (const obj of o.objects) for (const place of o.places) { assert.equal(model(obj, place), o.out, `${obj} ${place}`); n++; }
  }
  assert.ok(n >= 36, `${n} situations`);
  for (const o of OUTCOMES) assert.ok(SCENE_CHOICES.includes(o.out), o.id);
  // les trois réponses ne sont jamais « s'évapore » ici : l'évaporation a ses propres questions
  assert.ok(SCENE_CHOICES.every((c) => !/évapor/.test(c)));
});

test('situations tirées : réponse conforme au modèle, couverture 100 %', () => {
  const cold = /congélateur|grand froid|glaciale/;
  const qs = [...family(2, 'scene'), ...family(3, 'scene')];
  const scenes = family(2, 'scene');
  assert.ok(scenes.length >= 300, `${scenes.length} situations tirées`);
  let covered = 0;
  for (const q of scenes) {
    const ice = /glaçon|glace/.test(q.prompt.split('laisse')[1]);
    const want = ice ? (cold.test(q.prompt) ? 'Rien ne change.' : 'La glace fond.') : (cold.test(q.prompt) ? 'L\'eau gèle.' : 'Rien ne change.');
    assert.equal(q.answer, want, q.prompt);
    covered++;
  }
  assert.equal(covered, scenes.length);
  assert.equal(qs.length, scenes.length);
});

test('évaporation : seules des surfaces mouillées qui sèchent, l\'eau est « dans l\'air, invisible »', () => {
  for (const d of DRYING) assert.match(d.text, /mouillé|plu|averse/, d.id);
  for (const d of DRYING) assert.match(d.text, /sec|sèche|disparu/, d.id);
  assert.ok(!/glace|froid/.test(JSON.stringify(DRYING)));
  assert.ok(bank.DRYING_RIGHT.length >= 4 && bank.DRYING_WRONG.length >= 4);
  for (const r of bank.DRYING_RIGHT) assert.match(r, /air|vapeur|évapor/, r);
  for (const w of bank.DRYING_WRONG) assert.ok(!/air|vapeur|évapor|gaz/.test(w) && !bank.DRYING_RIGHT.includes(w), w);
});

test('noms du changement : le modèle (départ → arrivée) redonne la réponse ; classes équilibrées', () => {
  const model = (what) => {
    if (/vapeur|gaz|part dans l.air/.test(what)) return 'evapore';
    if (/devien(t|nent) de la glace/.test(what)) return 'gele';
    if (/devien(t|nent) de l.eau/.test(what)) return 'fond';
    return null;
  };
  const count = {};
  for (const c of CHANGES) {
    assert.equal(model(c.what), c.change, c.id);
    count[c.change] = (count[c.change] || 0) + 1;
  }
  assert.deepEqual(Object.values(count).sort(), [4, 4, 4]);
  assert.deepEqual(CHANGE_CHOICES.map((c) => c.value).sort(SORT), ['evapore', 'fond', 'gele']);
  const vocabModel = model;
  const map = { fond: 'fusion', gele: 'solidification', evapore: 'evaporation' };
  const vc = {};
  for (const v of VOCAB) {
    const m = vocabModel(v.what);
    assert.equal(map[m], v.word, v.id);
    vc[v.word] = (vc[v.word] || 0) + 1;
  }
  assert.deepEqual(Object.values(vc), [4, 4, 4]);
  assert.deepEqual(VOCAB_CHOICES.map((c) => c.value).sort(SORT), ['evaporation', 'fusion', 'solidification']);
});

test('expériences : une bonne réponse, des mauvaises différentes, conservation = « le même nombre »', () => {
  assert.equal(new Set(EXPERIMENTS.map((e) => e.id)).size, EXPERIMENTS.length);
  for (const e of EXPERIMENTS) {
    assert.equal(e.wrong.length, 2, e.id);
    assert.equal(new Set([e.right, ...e.wrong]).size, 3, e.id);
    assert.ok(e.explain.length > 20 && e.skill, e.id);
    if (/pese/.test(e.id)) {
      assert.equal(e.right, 'Le même nombre qu\'avant');
      assert.match(e.prompt, /fermé/, `récipient fermé (sinon l'eau s'évapore) : ${e.id}`);
    }
  }
  assert.ok(EXPERIMENTS.filter((e) => /pese/.test(e.id)).length >= 2);
});

test('phrases : sans recoupement entre vraies et fausses, corrections complètes', () => {
  for (const b of [STATEMENTS_1, STATEMENTS_3]) {
    const trues = new Set(b.true.map((s) => s.text));
    assert.equal(trues.size, b.true.length);
    for (const f of b.false) {
      assert.ok(!trues.has(f.text), f.text);
      assert.ok(f.fix && f.fix !== f.text && f.skill, f.text);
    }
  }
});

test('rangements : chaque boîte sert, au plus deux gaz, la vapeur est toujours dans « Gaz »', () => {
  for (const [level, q] of all().filter(([, x]) => x.type === 'drag')) {
    const boxes = Object.values(q.answer);
    const wanted = level === 1 ? ['liquide', 'solide'] : ['gaz', 'liquide', 'solide'];
    assert.deepEqual([...new Set(boxes)].sort(SORT), wanted, q.key);
    assert.equal(boxes.length, level === 1 ? 4 : 5);
    if (level === 3) assert.ok(boxes.filter((b) => b === 'gaz').length <= 2);
    for (const it of q.display.items) {
      if (/vapeur|invisible/.test(it.text || '')) assert.equal(q.answer[it.id], 'gaz', q.key);
      if (it.emoji) assert.notEqual(q.answer[it.id], 'gaz', q.key);
    }
  }
  assert.ok(SORT_ITEMS.filter((t) => t.state === 'gaz').length >= 2);
});

test('niveaux : formes de questions et progression', () => {
  for (const q of byLevel[1]) assert.ok(['choice', 'drag'].includes(q.type));
  for (const prefix of ['etat', 'image', 'phrase', 'ranger2']) assert.ok(family(1, prefix).length > 0, prefix);
  for (const prefix of ['scene', 'seche', 'nom']) assert.ok(family(2, prefix).length > 0, prefix);
  for (const prefix of ['experience', 'vocabulaire', 'phrase3', 'ranger3']) assert.ok(family(3, prefix).length > 0, prefix);
  // la vapeur invisible apparaît dès le niveau 1
  assert.ok(family(1, 'etat').some((q) => q.answer === 'gaz'));
});

// --- Raccourcis de surface : chaque solveur doit PROUVER sa couverture ------------------------------

const textChoiceViews = (qs) => qs.map(visibleOfQuestion).filter((v) => v.choices.length >= 2 && v.choices.every(Boolean));
const FIVE = (t) => new Set(t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter((w) => w.length >= 5));

const SOLVERS = {
  'la plus longue': (v) => [...v.choices].sort((a, b) => b.length - a.length)[0],
  'la plus courte': (v) => [...v.choices].sort((a, b) => a.length - b.length)[0],
  'la première': (v) => v.choices[0],
  'la dernière': (v) => v.choices[v.choices.length - 1],
  'celle du milieu': (v) => v.choices[1],
  'celle qui recopie la consigne': (v) => {
    const p = FIVE(`${v.prompt} ${v.text}`);
    const score = (c) => [...FIVE(c)].filter((w) => p.has(w)).length;
    return [...v.choices].sort((a, b) => score(b) - score(a))[0];
  },
};

test('aucun solveur de forme (longueur, position, mot recopié) ne dépasse 50 %, couverture prouvée', () => {
  for (const level of [1, 2, 3]) {
    const qs = byLevel[level].filter((q) => q.type === 'choice');
    const views = textChoiceViews(qs);
    assert.ok(views.length >= 0.6 * qs.length && views.length >= 400, `niveau ${level} : couverture ${views.length}/${qs.length}`);
    // la valeur de réponse n'est pas toujours le texte : on compare via la table valeur → texte
    for (const [name, solve] of Object.entries(SOLVERS)) {
      const hits = qs.filter((q) => {
        const v = visibleOfQuestion(q);
        if (!(v.choices.length >= 2 && v.choices.every(Boolean))) return false;
        const picked = solve(v);
        const right = q.display.choices.find((c) => c.value === q.answer);
        return picked === right.text;
      }).length;
      const share = hits / views.length;
      assert.ok(share <= 0.5, `niveau ${level}, solveur « ${name} » : ${(100 * share).toFixed(1)} % (${hits}/${views.length})`);
    }
  }
});

test('la réponse la plus fréquente de chaque famille ne dépasse pas 50 %', () => {
  for (const level of [1, 2, 3]) {
    const groups = {};
    for (const q of byLevel[level].filter((x) => x.type === 'choice')) {
      const prefix = q.key.split(':')[1];
      (groups[prefix] ||= []).push(q);
    }
    for (const [prefix, qs] of Object.entries(groups)) {
      if (qs.length < 150) continue;
      const count = {};
      for (const q of qs) count[JSON.stringify(q.answer)] = (count[JSON.stringify(q.answer)] || 0) + 1;
      const [top, n] = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
      assert.ok(n / qs.length <= 0.5, `niveau ${level}, ${prefix} : ${top} ×${n}/${qs.length}`);
    }
  }
});

test('situations : le seul mot « chaud / froid » ne suffit pas (≤ 50 %), et il couvre l\'essentiel des situations', () => {
  const HOT = /chaud|soleil|radiateur/;
  const COLD = /congélateur|grand froid/;
  const lexicon = (v) => (COLD.test(v.prompt) ? 'L\'eau gèle.' : HOT.test(v.prompt) ? 'La glace fond.' : 'Rien ne change.');
  const qs = family(2, 'scene');
  const views = qs.map(visibleOfQuestion);
  const applicable = views.filter((v) => COLD.test(v.prompt) || HOT.test(v.prompt)).length;
  assert.ok(applicable / views.length >= 0.4, `couverture du lexique : ${applicable}/${views.length}`);
  const share = checkNoSurfaceShortcut(qs, lexicon, { max: 0.5, label: 'niveau 2, lexique chaud/froid' });
  assert.ok(share > 0.2, `le solveur doit mesurer quelque chose (${share})`);
});

test('situations : « rien ne change » n\'est pas un mot-clé (présent parmi les choix, juste ≤ 50 %)', () => {
  const qs = family(2, 'scene');
  const share = checkNoSurfaceShortcut(qs, () => 'Rien ne change.', { max: 0.5, label: 'niveau 2, toujours « rien »' });
  assert.ok(share > 0.2);
});

test('vocabulaire et noms : le mot « glace » ou « eau » dans l\'énoncé ne donne pas la réponse', () => {
  for (const [level, prefix] of [[2, 'nom'], [3, 'vocabulaire']]) {
    const qs = family(level, prefix);
    assert.ok(qs.length >= 300);
    const byWord = (v) => {
      if (/vapeur|gaz|air/.test(v.prompt)) return level === 2 ? 'evapore' : 'evaporation';
      if (/glace|glaçon|grêlon|neige/.test(v.prompt.split(/devient|deviennent/)[0])) return level === 2 ? 'fond' : 'fusion';
      return level === 2 ? 'gele' : 'solidification';
    };
    // ce solveur lit le SENS (départ → arrivée) : il résout tout, c'est la notion elle-même, donc bornée à 100 %
    const sense = checkNoSurfaceShortcut(qs, byWord, { max: 1, label: `niveau ${level}, sens` });
    assert.ok(sense > 0.8, `le solveur de sens doit couvrir la banque (${sense})`);
    // en revanche un seul mot pris au hasard dans l'énoncé ne suffit pas
    const oneWord = (v) => (/glace/.test(v.prompt) ? (level === 2 ? 'fond' : 'fusion') : (level === 2 ? 'evapore' : 'evaporation'));
    checkNoSurfaceShortcut(qs, oneWord, { max: 0.6, label: `niveau ${level}, mot « glace » seul` });
  }
});

test('expériences : la bonne lettre (A ou B) est équilibrée', () => {
  const qs = byLevel[3].filter((q) => q.key.startsWith('etats-eau:experience:linge-soleil'));
  assert.ok(qs.length > 20);
  const a = qs.filter((q) => q.answer.endsWith('A')).length;
  assert.ok(a / qs.length > 0.35 && a / qs.length < 0.65, `${a}/${qs.length}`);
});

// --- Langue, mixité, explications ------------------------------------------------------------------

test('mixité : prénoms de filles et de garçons en nombre égal, textes épicènes', () => {
  const girls = ['Léa', 'Inès', 'Camille', 'Maëlys', 'Zoé', 'Jade', 'Nina', 'Emma'];
  const boys = ['Noé', 'Tom', 'Yanis', 'Ali', 'Lucas', 'Hugo', 'Kenzo'];
  assert.equal(NAMES.length, new Set(NAMES).size);
  assert.equal(NAMES.filter((n) => girls.includes(n)).length, 8);
  assert.equal(NAMES.filter((n) => boys.includes(n)).length, 7);
  assert.ok(NAMES.includes('Sacha'));
  for (const level of [1, 2, 3]) {
    checkEpicene(byLevel[level].flatMap(textsOfQuestion), { label: `« Les états de l'eau » niveau ${level}`, firstPerson: true });
  }
  checkEpicene(Object.values(bank).map((v) => JSON.stringify(v)), { label: 'banque', firstPerson: true });
  // aucun accord genré sur un prénom : le jeu n'emploie ni « il » ni « elle » pour désigner un personnage
  for (const [, q] of all()) assert.ok(!new RegExp(`(${NAMES.join('|')}).{0,40}\\b(il|elle) `).test(q.prompt), q.prompt);
});

test('explications : bienveillantes, utiles, jamais une simple répétition de la réponse', () => {
  for (const [, q] of all()) {
    assert.ok(q.explain.length > 25, q.key);
    assert.ok(!/faux|raté|perdu|nul|bête|erreur|mauvais/i.test(q.explain), q.key);
    assert.ok(q.skill, q.key);
    if (q.type === 'choice') assert.match(q.speak, /[.?]$/, q.key);
    if (typeof q.answer === 'string') assert.notEqual(q.explain.replace(/[.\s]/g, ''), q.answer.replace(/[.\s]/g, ''), q.key);
  }
});

test('échantillon d\'explications (pour relecture)', () => {
  const seen = new Set();
  for (const [, q] of all()) seen.add(q.explain);
  assert.ok(seen.size >= 40, `${seen.size} explications distinctes`);
});
