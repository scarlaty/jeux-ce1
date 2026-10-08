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

test('l\'état annoncé de chaque chose est exact (table écrite à la main)', () => {
  const expected = {
    glacon: 'solide', neige: 'solide', bonhomme: 'solide', grelon: 'solide', 'grelon-air': 'solide',
    goutte: 'liquide', pluie: 'liquide', mer: 'liquide', robinet: 'liquide', flaque: 'liquide', bain: 'liquide', 'goutte-air': 'liquide',
    vapeur: 'gaz', 'vapeur-air': 'gaz', 'vapeur-linge': 'gaz', 'vapeur-flaque': 'gaz',
  };
  assert.deepEqual(THINGS.map((t) => t.id).sort(), Object.keys(expected).sort());
  for (const t of THINGS) assert.equal(t.state, expected[t.id], t.id);
});

test('« état d\'une chose » : le gaz ne se reconnaît pas au mot (vapeur / invisible / air), solveur lexical ≤ 60 %', () => {
  const WORD = /vapeur|invisible|air/i;
  const gas = THINGS.filter((t) => t.state === 'gaz');
  const others = THINGS.filter((t) => t.state !== 'gaz');
  assert.ok(gas.some((t) => !WORD.test(t.text)), 'un gaz décrit sans ces mots');
  assert.ok(others.some((t) => WORD.test(t.text)), 'un solide ou un liquide dont le texte contient « air »');
  const qs = family(1, 'etat');
  assert.ok(qs.length >= 500);
  const solver = (v) => (WORD.test(v.text) ? 'gaz' : 'liquide');
  const marked = qs.filter((q) => WORD.test(q.display.show.text)).length;
  assert.ok(marked / qs.length > 0.2, 'couverture : le mot est présent dans une part notable des questions');
  const share = checkNoSurfaceShortcut(qs, solver, { max: 0.6, label: 'niveau 1, mot vapeur/invisible/air' });
  assert.ok(share > 0.3, `le solveur doit mesurer quelque chose (${share})`);
  // et le mot ne désigne pas une seule classe
  const withWord = new Set(qs.filter((q) => WORD.test(q.display.show.text)).map((q) => q.answer));
  assert.ok(withWord.size >= 2, [...withWord].join());
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
    if (ice) return cold.test(place) ? 'L\'état ne change pas.' : 'La glace fond.';
    if (cold.test(place)) return 'L\'eau gèle.';
    assert.ok(/fermé/.test(obj) || /quelques minutes/.test(place), `eau ouverte longtemps (elle s'évaporerait) : ${obj} ${place}`);
    return 'L\'état ne change pas.';
  };
  let n = 0;
  for (const o of OUTCOMES) {
    assert.ok(o.objects.length >= 3 && o.places.length >= 2, o.id);
    for (const obj of o.objects) for (const place of o.places) { assert.equal(model(obj, place), o.out, `${obj} ${place}`); n++; }
  }
  assert.ok(n >= 60, `${n} situations`);
  // jamais « Rien ne change » : une bouteille sur un radiateur chauffe, c'est seulement son ÉTAT qui ne change pas
  assert.ok(SCENE_CHOICES.every((c) => !/^Rien ne change/.test(c)));
  for (const o of OUTCOMES.filter((x) => x.out === 'L\'état ne change pas.')) assert.match(o.explain, /reste|ne fond pas/, o.id);
  assert.ok(!/ferm/.test(OUTCOMES.find((o) => o.id === 'reste-liquide').explain), 'fermer n\'empêche pas de geler');
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
    const want = ice ? (cold.test(q.prompt) ? 'L\'état ne change pas.' : 'La glace fond.') : (cold.test(q.prompt) ? 'L\'eau gèle.' : 'L\'état ne change pas.');
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
  for (const w of bank.DRYING_WRONG) assert.ok(!bank.DRYING_RIGHT.includes(w), w);
  for (const d of DRYING) assert.match(d.soak, /^Elle est rentrée dans/, d.id);
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
      const known = THINGS.find((t) => it.text && t.text.endsWith(it.text));
      if (known) assert.equal(q.answer[it.id], known.state, q.key);
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
  const lexicon = (v) => (COLD.test(v.prompt) ? 'L\'eau gèle.' : HOT.test(v.prompt) ? 'La glace fond.' : 'L\'état ne change pas.');
  const qs = family(2, 'scene');
  const views = qs.map(visibleOfQuestion);
  const applicable = views.filter((v) => COLD.test(v.prompt) || HOT.test(v.prompt)).length;
  assert.ok(applicable / views.length >= 0.4, `couverture du lexique : ${applicable}/${views.length}`);
  const share = checkNoSurfaceShortcut(qs, lexicon, { max: 0.5, label: 'niveau 2, lexique chaud/froid' });
  assert.ok(share > 0.2, `le solveur doit mesurer quelque chose (${share})`);
});

test('situations : « rien ne change » n\'est pas un mot-clé (présent parmi les choix, juste ≤ 50 %)', () => {
  const qs = family(2, 'scene');
  const share = checkNoSurfaceShortcut(qs, () => 'L\'état ne change pas.', { max: 0.5, label: 'niveau 2, toujours « état inchangé »' });
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

// Les marqueurs de surface ne désignent jamais une seule classe de réponse (point 2 du juge).
test('situations : « fermé », « glace », « chaud », « froid » apparaissent dans au moins 2 classes de réponse', () => {
  const cold = /congélateur|grand froid|glaciale/;
  const markers = {
    fermé: (o, p) => /fermé/.test(o),
    glace: (o, p) => /glaçon|glace/.test(o),
    chaud: (o, p) => /chaud|soleil|radiateur|four|cheminée|main/.test(p),
    froid: (o, p) => cold.test(p) || /réfrigérateur/.test(p),
  };
  for (const [name, test] of Object.entries(markers)) {
    const classes = new Set();
    for (const o of OUTCOMES) for (const obj of o.objects) for (const place of o.places) if (test(obj, place)) classes.add(o.out);
    assert.ok(classes.size >= 2, `marqueur « ${name} » : ${[...classes].join(' | ')}`);
  }
  // et la bonne classe d'un marqueur n'est jamais portée à 100 % : « fermé » donne « gèle » et « état inchangé »
  const closed = family(2, 'scene').filter((q) => /fermé/.test(q.prompt));
  assert.ok(new Set(closed.map((q) => q.answer)).size >= 2);
});

test('situations : trois classes équilibrées, et un solveur à 3 règles (fermé / glace / sinon) ≤ 70 %', () => {
  const qs = family(2, 'scene');
  const cls = {};
  for (const q of qs) cls[q.answer] = (cls[q.answer] || 0) + 1;
  for (const [a, n] of Object.entries(cls)) assert.ok(n / qs.length >= 0.25 && n / qs.length <= 0.42, `${a} : ${(100 * n / qs.length).toFixed(1)} %`);
  const COLD = /congélateur|grand froid|glaciale/;
  const rules = (v) => {
    if (/fermé/.test(v.prompt)) return 'L\'état ne change pas.';
    if (/glaçon|glace/.test(v.prompt)) return COLD.test(v.prompt) ? 'L\'état ne change pas.' : 'La glace fond.';
    return 'L\'eau gèle.';
  };
  const share = checkNoSurfaceShortcut(qs, rules, { max: 0.7, label: 'niveau 2, solveur 3 règles' });
  assert.ok(share > 0.3, `le solveur doit mesurer quelque chose (${share})`);
});

test('évaporation : un mot « air / gaz / vapeur » ne désigne pas la bonne réponse (au moins un faux choix sur trois en porte un)', () => {
  const WORD = /air|gaz|vapeur|évapor/;
  const qs = family(2, 'seche');
  assert.ok(qs.length >= 300, `${qs.length} questions`);
  const shown = qs.map((q) => q.display.choices.map((c) => c.text));
  const withWrongWord = qs.filter((q) => q.display.choices.some((c) => c.value !== q.answer && WORD.test(c.text)));
  assert.ok(withWrongWord.length / qs.length >= 1 / 3, `${withWrongWord.length}/${qs.length}`);
  // solveur lexical : « le premier choix qui contient air|gaz|vapeur »
  const lexical = (v) => v.choices.find((c) => WORD.test(c)) || v.choices[0];
  const hits = qs.filter((q) => { const v = visibleOfQuestion(q); return lexical(v) === q.answer; }).length;
  const covered = shown.filter((c) => c.some((t) => WORD.test(t))).length;
  assert.equal(covered, qs.length, 'couverture : le solveur s\'applique à toutes les questions');
  assert.ok(hits / qs.length <= 0.5, `solveur lexical : ${(100 * hits / qs.length).toFixed(1)} %`);
  // les faux choix liés à la situation (« rentrée dans le … ») sont bien tirés
  assert.ok(qs.some((q) => q.display.choices.some((c) => /rentrée dans/.test(c.text))));
});

test('mots lus par la voix et par l\'enfant : aucune flèche, et fusion / solidification / évaporation sont introduits au niveau 2', () => {
  for (const [, q] of all()) for (const t of textsOfQuestion(q)) assert.ok(!/[→←↔]/.test(t), t);
  for (const v of Object.values(bank.VOCAB_EXPLAIN)) assert.ok(!/[→←↔]/.test(v), v);
  const lvl2 = byLevel[2].map((q) => q.explain).join(' ');
  for (const w of ['la fusion', 'la solidification', 'l\'évaporation']) assert.ok(lvl2.includes(w), w);
  // conservation : « pèse pareil » (pas « même quantité »)
  assert.ok(!/même quantité/.test(JSON.stringify([bank.EXPERIMENTS, bank.STATEMENTS_3])));
});
