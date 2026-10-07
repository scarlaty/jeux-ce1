import test from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/devinettes.js';
import {
  THINGS, TAGS, NEGATIONS, findThing, confusable, render, clueText, negationText, whyNot, definite, indefinite,
  holds, fails, couldHold,
} from '../../js/data/devinettes.js';
import {
  checkGameShape, checkGenerator, checkEmojis, checkCluesNeeded, measureClues, EMOJIS_ECARTES,
} from '../helpers/game-checks.js';

let cached;
const draws = () => (cached ||= checkGenerator(game, { draws: 2000, minDistinct: 30 }));
const CATEGORIES = ['animal', 'fruit', 'legume', 'vetement', 'vehicule'];

// Les indices d'une question tirée, sous forme de contraintes { tag, neg? }.
const constraintsOf = (q) => [
  ...q.riddle.clues.map((tag) => ({ tag })),
  ...(q.riddle.not ? [{ tag: q.riddle.not, neg: true }] : []),
];
const accessors = {
  constraintsOf,
  choicesOf: (q) => q.display.choices.map((c) => findThing(c.value)),
  couldHold,
  isAnswer: (t, q) => t.word === q.answer,
};
const all = (byLevel) => Object.values(byLevel).flat();

test('contrat', () => checkGameShape(game));
test('500 tirages par niveau, 30 questions distinctes', draws);

test('banque : tags connus, certain et discutable séparés, émojis et mots uniques', () => {
  const words = THINGS.map((t) => t.word);
  assert.equal(new Set(words).size, words.length);
  assert.equal(new Set(THINGS.map((t) => t.emoji)).size, THINGS.length, 'émojis en double');
  for (const t of THINGS) {
    assert.ok(['un', 'une', 'du', "de l'"].includes(t.det), t.word);
    assert.ok(['m', 'f'].includes(t.gender), `${t.word} : genre`);
    assert.ok(t.is.size >= 2, `${t.word} : au moins 2 indices certains`);
    for (const tag of [...t.is, ...t.maybe]) assert.ok(TAGS[tag], `${t.word} : tag inconnu ${tag}`);
    for (const tag of t.maybe) assert.ok(!t.is.has(tag), `${t.word} : ${tag} à la fois certain et discutable`);
  }
  for (const tag of Object.keys(NEGATIONS)) assert.ok(TAGS[tag], `négation d'un tag inconnu : ${tag}`);
  assert.ok(THINGS.length >= 60);
});

test('banque : catégories exclusives, insecte/oiseau ⊂ animal, un seul fruit OU légume', () => {
  for (const t of THINGS) {
    const cats = CATEGORIES.filter((c) => t.is.has(c) || (t.maybe.has(c) && !(c === 'fruit' && t.is.has('legume'))));
    assert.ok(cats.length <= 1, `${t.word} : ${cats}`);
    if (t.fits.has('insecte') || t.fits.has('oiseau')) assert.ok(t.fits.has('animal'), t.word);
    if (t.is.has('insecte')) assert.ok(t.is.has('animal'), t.word);
    // Une chose ne peut pas avoir deux couleurs « certaines » contradictoires de façon absurde : max 2.
    assert.ok([...t.is].filter((x) => TAGS[x].kind === 'colour').length <= 2, t.word);
  }
});

test('banque : faits connus', () => {
  const banane = findThing('banane');
  assert.ok(['jaune', 'fruit', 'singes'].every((x) => banane.is.has(x)));
  // Un citron est jaune et c'est un fruit : il ne peut jamais accompagner la banane sur « jaune + fruit ».
  assert.ok(findThing('citron').fits.has('jaune') && findThing('citron').fits.has('fruit'));
  assert.ok(!findThing('citron').fits.has('singes'));
  assert.ok(!findThing('carotte').fits.has('jaune'));
  assert.ok(findThing('lapin').is.has('carottes') && findThing('carotte').is.has('lapins'));
  assert.ok(!findThing('chat').fits.has('vole') && findThing('hibou').is.has('vole'));
  assert.ok(findThing('serpent').fits.has('ecailles') && !findThing('serpent').fits.has('pattes4'));
  // Dette de modélisation (#106) : la chèvre se mange comme la vache et le mouton.
  for (const w of ['vache', 'mouton', 'chèvre']) assert.ok(findThing(w).fits.has('aliment'), w);
});

test('genre et déterminant sont indépendants : « du raisin », « de l\'ail », accords justes (#106)', () => {
  const raisin = findThing('raisin');
  assert.equal(raisin.det, 'du');
  assert.equal(raisin.gender, 'm');
  assert.equal(indefinite(raisin), 'du raisin');
  assert.equal(definite(raisin), 'le raisin');
  // Une chose à partitif ou à « de l' », masculine ou féminine : les accords suivent le genre, pas l'article.
  const ail = { word: 'ail', det: "de l'", gender: 'm' };
  assert.equal(indefinite(ail), "de l'ail");
  assert.equal(definite(ail), "l'ail");
  assert.equal(clueText('vert', ail), 'Je suis vert.');
  assert.equal(clueText('vert', { word: 'sauce', det: 'de la', gender: 'f' }), 'Je suis verte.');
  assert.equal(clueText('vert', { ...raisin, gender: 'f' }), 'Je suis verte.');
});

test('accords et articles', () => {
  assert.equal(render('Je suis {vert|verte}.', 'f'), 'Je suis verte.');
  assert.equal(render('Je suis {vert|verte}.', 'm'), 'Je suis vert.');
  assert.equal(clueText('vert', findThing('poire')), 'Je suis verte.');
  assert.equal(clueText('vert', findThing('concombre')), 'Je suis vert.');
  assert.equal(whyNot('jaune', findThing('carotte')), "La carotte n'est pas jaune.");
  assert.equal(whyNot('vert', findThing('pomme')), "La pomme n'est pas verte.");
  assert.equal(negationText('vert', findThing('poire')), 'Je ne suis pas verte.');
  assert.equal(definite(findThing('hibou')), 'le hibou');
  assert.equal(definite(findThing('pomme')), 'la pomme');
  assert.equal(definite(findThing('éléphant')), "l'éléphant");
  assert.equal(indefinite(findThing('chaussette')), 'une chaussette');
});

test('aucune faute affichée : jamais « un ail », « un raisin » (#106)', () => {
  const texts = all(draws()).flatMap((q) => [q.prompt, q.explain, ...q.display.choices.map((c) => c.text || c.label)]);
  const bad = texts.filter((t) => /\bun (ail|raisin)\b/i.test(t));
  assert.deepEqual(bad, []);
  assert.ok(texts.some((t) => /\bdu raisin\b/.test(t)), 'le raisin doit apparaître avec son partitif');
});

test('émojis illisibles écartés (#106) : jamais dans la banque, jamais à l\'écran', () => {
  checkEmojis(all(draws()));
  const bare = (e) => e.replace(/️/g, '');
  const banned = new Set(EMOJIS_ECARTES.map(bare));
  for (const t of THINGS) assert.ok(!banned.has(bare(t.emoji)), `${t.word} : émoji écarté ${t.emoji}`);
  // Le cliquet lui-même : un émoji écarté est bien détecté.
  assert.throws(() => checkEmojis([{ key: 'x', display: { choices: [{ value: 'ail', emoji: '🧄' }] } }]));
  assert.throws(() => checkEmojis([{ key: 'x', display: { show: { emoji: '🌬️' }, choices: [] } }]));
});

test('aucune ambiguïté : la réponse vérifie tout, chaque intrus contredit un indice sans hésitation', () => {
  for (const q of all(draws())) {
    const { answer, wrong } = q.riddle;
    const a = findThing(answer);
    const cons = constraintsOf(q);
    assert.equal(q.answer, answer);
    assert.ok(cons.every((c) => holds(a, c)), `indice faux pour la réponse : ${q.key}`);
    const shown = q.display.choices.map((c) => c.value);
    assert.deepEqual([...shown].sort(), [answer, ...wrong].sort(), q.key);
    const items = shown.map(findThing);
    for (const w of wrong) {
      assert.ok(cons.some((c) => fails(findThing(w), c)), `l'intrus « ${w} » vérifie tous les indices : ${q.key}`);
    }
    // Parmi les choix, seule la réponse peut vérifier tous les indices.
    const fitting = items.filter((t) => cons.every((c) => couldHold(t, c))).map((t) => t.word);
    assert.deepEqual(fitting, [answer], q.key);
    // Deux choix ne se confondent jamais à l'image.
    for (const x of items) for (const y of items) if (x !== y) assert.ok(!confusable(x.word, y.word), `${x.word}/${y.word}`);
    // La devinette ne cite jamais sa réponse ni un choix : rien à barrer ni à recopier (#97).
    const said = q.prompt.toLowerCase();
    for (const t of items) assert.ok(!said.includes(t.word), `la devinette nomme « ${t.word} » : ${q.key}`);
  }
});

test('niveaux : nombre d\'indices et de choix, images puis mots', () => {
  const byLevel = draws();
  for (const q of byLevel[1]) {
    assert.equal(q.riddle.clues.length, 2);
    assert.equal(q.riddle.not, null);
    assert.equal(q.display.choices.length, 3);
    assert.ok(q.display.choices.every((c) => c.emoji));
  }
  for (const q of byLevel[2]) {
    assert.equal(q.riddle.clues.length, 3);
    assert.equal(q.display.choices.length, 4);
    assert.ok(q.display.choices.every((c) => c.emoji));
  }
  for (const q of byLevel[3]) {
    assert.equal(q.riddle.clues.length, 2);
    assert.ok(q.riddle.not, 'niveau 3 : un indice dit à l\'envers');
    assert.equal(q.display.choices.length, 4);
    assert.ok(q.display.choices.every((c) => !c.emoji && c.text), 'niveau 3 : mots seulement');
    assert.ok(q.prompt.includes(negationText(q.riddle.not, findThing(q.answer))), q.key);
  }
});

// #97 : CHAQUE INDICE EST NÉCESSAIRE. Mesures du juge avant correction (4 000 tirages) : un seul indice suffisait
// dans 99,2 % (niveau 1), 92,6 % (niveau 2) et 89,6 % (niveau 3) des questions ; 78,3 % des intrus du niveau 1
// ne partageaient aucun indice. Seuils ici : zéro indice superflu, zéro intrus sans indice commun.
for (const level of [1, 2, 3]) {
  test(`niveau ${level} : tous les indices sont nécessaires, les intrus ne diffèrent que d'un indice (#97)`, () => {
    const rng = draws();
    const m = checkCluesNeeded(rng[level], accessors, {
      maxSingle: 0, maxEachSuffices: 0, maxLureNoShare: 0, maxDispensable: 0, minLureMissesOne: 1,
    });
    assert.equal(m.total, 2000);
  });
}

test('le mesureur détecte une devinette dont un indice est décoratif', () => {
  const chien = findThing('chien');
  const q = {
    answer: 'chien',
    riddle: { clues: ['animal', 'aboie'], wrong: ['poisson', 'château'], not: null },
    display: { choices: ['chien', 'poisson', 'château'].map((value) => ({ value })) },
  };
  const m = measureClues([q], accessors);
  assert.equal(m.single, 1, 'un seul indice (« aboie ») suffit');
  assert.equal(m.dispensable, 1);
  assert.equal(m.lureNoShare, 0.5, 'le château ne partage aucun indice');
  assert.ok(chien);
  assert.throws(() => checkCluesNeeded([q], accessors));
});

test('niveau 3 : une vraie déduction, pas de mot à barrer', () => {
  for (const q of draws()[3]) {
    const a = findThing(q.answer);
    // L'indice dit à l'envers porte sur une propriété, jamais sur un mot affiché.
    assert.ok(NEGATIONS[q.riddle.not], q.key);
    assert.ok(holds(a, { tag: q.riddle.not, neg: true }), `la négation est fausse pour la réponse : ${q.key}`);
    // Le mot de la réponse n'est écrit nulle part dans l'énoncé.
    for (const c of q.display.choices) assert.ok(!q.prompt.toLowerCase().includes(c.value), q.key);
    // Un intrus au moins ne se trahit que par la négation : sans elle, il conviendrait.
    const lure = q.riddle.wrong.map(findThing).find((w) => fails(w, { tag: q.riddle.not, neg: true }));
    assert.ok(lure, `aucun intrus écarté par « ${q.riddle.not} » : ${q.key}`);
    assert.ok(q.riddle.clues.every((t) => couldHold(lure, { tag: t })), q.key);
  }
});

test('phrases de correction : vraies de l\'intrus, aucune connue pour être fausse (#106)', () => {
  // Phrases relevées fausses ou discutables par le juge pédagogie (grille, § 1) ; elles ne doivent jamais sortir.
  const FAUSSES = [
    "La souris n'est pas minuscule.", "La chèvre ne se mange pas.", "Le chat ne protège pas du froid.",
    "Le feu ne brille pas la nuit.", "L'escargot ne se mange pas.", "La pomme n'est pas jaune.",
    "Le poivron n'est pas un fruit.", "Le concombre n'est pas un fruit.", "Le réveil n'est pas rond.",
  ];
  for (const q of all(draws())) {
    for (const f of FAUSSES) assert.ok(!q.explain.includes(f), `${f} dans ${q.key}`);
    const cons = constraintsOf(q);
    // Chaque phrase « X n'est pas … » / « X dit » désigne un intrus qui contredit réellement l'indice.
    for (const w of q.riddle.wrong) {
      const t = findThing(w);
      const missed = cons.filter((c) => fails(t, c));
      assert.equal(missed.length, 1, `${w} doit ne contredire qu'un seul indice : ${q.key}`);
      const c = missed[0];
      const said = c.neg ? `${definite(t)} dit`.replace(/^./, (x) => x.toUpperCase()) : whyNot(c.tag, t);
      assert.ok(q.explain.includes(said), `${q.key} : « ${said} » absent de « ${q.explain} »`);
    }
  }
});

test('voix, énoncé et explication bienveillante', () => {
  for (const q of all(draws())) {
    assert.equal(q.speak, q.prompt);
    assert.ok(/Qui suis-je \?/.test(q.prompt), q.key);
    assert.ok(/Touche (la bonne image|le bon mot)\.$/.test(q.prompt), q.key);
    assert.ok(q.explain.includes(`C'est ${indefinite(findThing(q.answer))} !`), q.key);
    assert.ok(!/faux|raté|perdu|nul/i.test(q.explain), q.key);
    assert.ok(q.explain.includes('tous les indices'), q.key);
    assert.ok(q.skill);
  }
});

test('mixité : aucun accord genré adressé ou prêté à l\'enfant', () => {
  const text = all(draws()).map((q) => `${q.prompt} ${q.explain}`).join(' ');
  assert.ok(!/\btu es (prêt|content|fier)|je suis (content|fier|prêt|mêlé)|\bbravo, (il|elle)\b/i.test(text));
});

test('questions distinctes : au moins 30 par niveau avec la banque seule', () => {
  const byLevel = draws();
  for (const level of [1, 2, 3]) {
    assert.ok(new Set(byLevel[level].map((q) => q.key)).size >= 60, `niveau ${level}`);
  }
});
