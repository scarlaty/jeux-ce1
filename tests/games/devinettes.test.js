import test from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/devinettes.js';
import {
  THINGS, TAGS, NEGATIONS, findThing, confusable, render, clueText, negationText, whyNot, definite, indefinite,
  holds, fails, couldHold, never,
} from '../../js/data/devinettes.js';
import {
  checkGameShape, checkGenerator, checkEmojis, checkCluesNeeded, measureClues, EMOJIS_ECARTES, AFFIRMATIONS_FAUSSES,
} from '../helpers/game-checks.js';

let cached;
const draws = () => (cached ||= checkGenerator(game, { draws: 3000, minDistinct: 30 }));
const CATEGORIES = ['animal', 'fruit', 'legume', 'vetement', 'vehicule'];

// Les indices d'une question tirée, sous forme de contraintes { tag, neg? }.
const constraintsOf = (q) => [
  ...q.riddle.clues.map((tag) => ({ tag })),
  ...q.riddle.not.map((tag) => ({ tag, neg: true })),
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
    assert.deepEqual(q.riddle.not, []);
    assert.equal(q.display.choices.length, 3);
    assert.ok(q.display.choices.every((c) => c.emoji));
  }
  for (const q of byLevel[2]) {
    // Trois indices : trois affirmations, ou deux plus un indice dit à l'envers (#108).
    assert.equal(q.riddle.clues.length + q.riddle.not.length, 3, q.key);
    assert.ok(q.riddle.clues.length >= 2, q.key);
    assert.equal(q.display.choices.length, 4);
    assert.ok(q.display.choices.every((c) => c.emoji));
  }
  for (const q of byLevel[3]) {
    // Quatre indices dont DEUX à l'envers : la forme propre du niveau 3, celle qu'aucun autre n'a.
    assert.equal(q.riddle.clues.length, 2, q.key);
    assert.equal(q.riddle.not.length, 2, q.key);
    assert.equal(q.display.choices.length, 5);
    assert.ok(q.display.choices.every((c) => !c.emoji && c.text), 'niveau 3 : mots seulement');
    for (const tag of q.riddle.not) {
      assert.ok(q.prompt.includes(negationText(tag, findThing(q.answer))), q.key);
    }
  }
});

// #108, relecture du juge : le niveau 2 était devenu le niveau 3 (80,8 % de ses questions avaient sa forme,
// et 97,05 % des énoncés du niveau 3 reparaissaient au niveau 2). Les trois mesures qui l'interdisent.
test('les trois niveaux restent trois exercices différents (#108)', () => {
  const byLevel = draws();
  // 1. Le niveau 2 garde ses deux formes, aucune réduite à la figuration.
  const trois = byLevel[2].filter((q) => !q.riddle.not.length).length / byLevel[2].length;
  assert.ok(trois >= 0.30 && trois <= 0.70, `niveau 2 : ${(100 * trois).toFixed(1)} % de trois affirmations`);
  // 2. Un énoncé du niveau 3 ne se repose pas au niveau 2 (même réponse, mêmes indices, mêmes négations).
  const sign = (q) => `${q.answer}|${[...q.riddle.clues].sort()}|${[...q.riddle.not].sort()}`;
  const deux = new Set(byLevel[2].map(sign));
  const trois3 = new Set(byLevel[3].map(sign));
  const commun = [...trois3].filter((s) => deux.has(s)).length / trois3.size;
  assert.ok(commun < 0.50, `${(100 * commun).toFixed(1)} % des énoncés du niveau 3 reparaissent au niveau 2`);
});

// #108, relecture du juge : « les devinettes ne parlent plus que de couleur, de catégorie et de taille ».
test('chaque niveau parle d\'autre chose que de couleur, de catégorie et de taille (#108)', () => {
  const byLevel = draws();
  const tags = (q) => [...q.riddle.clues, ...q.riddle.not];
  const substantiel = (t) => TAGS[t].kind !== 'cat' && TAGS[t].kind !== 'colour' && t !== 'main' && t !== 'grand';
  for (const level of [1, 2, 3]) {
    const qs = byLevel[level];
    const fond = qs.filter((q) => tags(q).some(substantiel)).length / qs.length;
    const taille = qs.filter((q) => tags(q).some((t) => t === 'main' || t === 'grand')).length / qs.length;
    assert.ok(fond >= 0.70, `niveau ${level} : ${(100 * fond).toFixed(1)} % d'indices de fond`);
    assert.ok(taille <= 0.40, `niveau ${level} : ${(100 * taille).toFixed(1)} % de « main » ou « grand »`);
  }
  // Les indices de signature vivent surtout au niveau 1 : une question qui porte un indice dit à l'envers
  // ne peut presque jamais en porter un (l'intrus de la négation devrait lui aussi pouvoir vérifier la
  // signature — voir le commentaire de tête de js/data/devinettes.js). Mesuré : 26,7 % / 2,0 % / 0,5 %.
  const signature = (level) => byLevel[level].filter((q) => tags(q).some((t) => TAGS[t].kind === 'sign')).length
    / byLevel[level].length;
  assert.ok(signature(1) >= 0.10, `niveau 1 : ${(100 * signature(1)).toFixed(2)} % d'indices de signature`);
  assert.ok(signature(2) >= 0.01, `niveau 2 : ${(100 * signature(2)).toFixed(2)} % d'indices de signature`);
  assert.ok(signature(3) > 0, `niveau 3 : ${(100 * signature(3)).toFixed(2)} % d'indices de signature`);
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
    assert.equal(m.total, 3000);
  });
}

test('le mesureur détecte une devinette dont un indice est décoratif', () => {
  const chien = findThing('chien');
  const q = {
    answer: 'chien',
    riddle: { clues: ['animal', 'pattes4'], wrong: ['poisson', 'château'], not: [] },
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
    // Les indices dits à l'envers portent sur une propriété, jamais sur un mot affiché.
    for (const tag of q.riddle.not) {
      assert.ok(NEGATIONS[tag], q.key);
      assert.ok(holds(a, { tag, neg: true }), `la négation est fausse pour la réponse : ${q.key}`);
    }
    // Le mot de la réponse n'est écrit nulle part dans l'énoncé.
    for (const c of q.display.choices) assert.ok(!q.prompt.toLowerCase().includes(c.value), q.key);
    // CHAQUE négation écarte son propre intrus : sans elle, il conviendrait. Deux négations, deux intrus.
    for (const tag of q.riddle.not) {
      const lure = q.riddle.wrong.map(findThing).find((w) => fails(w, { tag, neg: true }));
      assert.ok(lure, `aucun intrus écarté par « ${tag} » : ${q.key}`);
      assert.ok(q.riddle.clues.every((t) => couldHold(lure, { tag: t })), q.key);
    }
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

test('h muet et h aspiré : « l\'hélicoptère », « le hibou » (juge, B1)', () => {
  assert.equal(definite(findThing('hélicoptère')), "l'hélicoptère");
  assert.equal(definite(findThing('hibou')), 'le hibou');
  for (const q of all(draws())) {
    assert.ok(!/\b[Ll]e h(?!ibou)[éeiouèê]/.test(q.explain), q.explain);
    assert.ok(!/\b[Ll]a h[aeiouéè]/.test(q.explain), q.explain);
  }
});

test('on ne nie que ce qui est certain : jamais une affirmation fausse du monde réel (juge, B2 B3)', () => {
  const bad = new Set(AFFIRMATIONS_FAUSSES.map(([w, t]) => `${w}|${t}`));
  let phrases = 0;
  for (const q of all(draws())) {
    const answer = findThing(q.answer);
    for (const tag of q.riddle.not) {
      assert.ok(!bad.has(`${answer.word}|${tag}`), `négation fausse : ${q.key}`);
      assert.ok(never(answer, tag), `négation non certaine : ${q.key}`);
    }
    for (const w of q.riddle.wrong) {
      const t = findThing(w);
      for (const c of constraintsOf(q)) {
        if (!fails(t, c)) continue;
        assert.ok(!bad.has(`${w}|${c.tag}`), `intrus défendable « ${w} » sur ${c.tag} : ${q.key}`);
        if (!c.neg) assert.ok(never(t, c.tag), `contradiction non certaine : ${q.key}`);
        phrases++;
      }
    }
    for (const [w, tag] of AFFIRMATIONS_FAUSSES) {
      if (TAGS[tag]) assert.ok(!q.explain.includes(whyNot(tag, findThing(w))), q.explain);
    }
  }
  assert.ok(phrases > 5000);
});

test('banque : une propriété « jamais » n\'est jamais possible', () => {
  for (const t of THINGS) {
    for (const tag of Object.keys(TAGS)) {
      if (never(t, tag)) assert.ok(!t.fits.has(tag), `${t.word} : ${tag} à la fois jamais et possible`);
    }
  }
});

test('participes accordés dans les phrases de correction (juge, C3)', () => {
  assert.equal(whyNot('pond', findThing('banane')), "La banane n'est pas pondue par une poule.");
  assert.equal(whyNot('pond', findThing('chocolat')), "Le chocolat n'est pas pondu par une poule.");
  // Mixité (CLAUDE.md) : les reines portent couronne et habitent les châteaux autant que les rois.
  assert.equal(whyNot('roi', findThing('couronne')), "La couronne n'est pas portée par un roi ou une reine.");
  assert.equal(whyNot('rois', findThing('maison')), "La maison n'a pas été habitée par des rois et des reines.");
});

test('questions distinctes : au moins 30 par niveau avec la banque seule', () => {
  const byLevel = draws();
  for (const level of [1, 2, 3]) {
    assert.ok(new Set(byLevel[level].map((q) => q.key)).size >= 60, `niveau ${level}`);
  }
});

// #108 : les corrections de #97/#106 avaient rendu le jeu juste mais répétitif. Mesures de l'orchestrateur
// avant correction (6 000 tirages) : niveau 1, 55 réponses ; niveau 2, 12 réponses dont « baleine » 29,8 % ;
// niveau 3, 51 réponses ; et 27 indices sur 124 seulement (21,8 %) sortaient un jour.
test('variété : au moins 30 réponses par niveau, aucune au-dessus de 10 % (#108)', () => {
  const byLevel = draws();
  for (const level of [1, 2, 3]) {
    const n = byLevel[level].length;
    const counts = new Map();
    for (const q of byLevel[level]) counts.set(q.answer, (counts.get(q.answer) || 0) + 1);
    assert.ok(counts.size >= 30, `niveau ${level} : ${counts.size} réponses distinctes`);
    const [top, c] = [...counts].sort((a, b) => b[1] - a[1])[0];
    assert.ok(c / n <= 0.10, `niveau ${level} : « ${top} » dans ${(100 * c / n).toFixed(1)} % des questions`);
  }
});

test('variété : au moins la moitié des indices de la banque sont atteignables (#108)', () => {
  const used = new Set();
  for (const q of all(draws())) {
    q.riddle.clues.forEach((t) => used.add(t));
    q.riddle.not.forEach((t) => used.add(t));
  }
  const total = Object.keys(TAGS).length;
  assert.ok(used.size / total >= 0.5, `${used.size} / ${total} indices atteignables`);
  // Un indice de signature (ce qui ne désigne presque qu'une chose) sort vraiment : sans eux, les
  // devinettes ne parlaient plus que de couleur, de catégorie et de taille.
  const signatures = ['trompe', 'laine', 'grappe', 'queue', 'coquille', 'rugit', 'desert', 'boulangerie',
    'criniere', 'carapace', 'oreilles', 'plumes', 'bec', 'cornes', 'cheminee', 'noisette'];
  assert.deepEqual(signatures.filter((t) => !used.has(t)), [], 'indices de signature jamais tirés');
});

/**
 * Indices que la banque porte mais ne peut PAS poser, et pourquoi (relecture du juge, #108). Un indice T
 * n'est tirable que s'il existe une chose qui POURRAIT vérifier T (`is` ou `maybe`) tout en contredisant à
 * coup sûr un autre indice de la même réponse. D'où des indices morts malgré plusieurs porteurs :
 * `lait` (vache + chèvre) et `noyau` (pêche + cerise) parce que leurs porteurs partagent tous leurs autres
 * indices ; `route`, `pedales`, `transporte` parce que tout ce qui roule est un véhicule à roues.
 * La plupart sont des signatures à porteur unique : « je miaule » désignerait à lui seul la réponse, ce que
 * la règle d'or de #97 interdit. Les laisser ici, nommés, vaut mieux que de les croire vivants.
 */
const INDICES_MORTS = [
  'arbre', 'bele', 'pedales', 'route', 'sonne', 'ciel', 'brule', 'singes', 'bananes', 'lapins',
  'fromage', 'miel_fait', 'bambou', 'hurle', 'coasse', 'poche', 'bosse', 'toile', 'huit', 'aileron',
  'miaule', 'aboie', 'lait', 'metamorphose', 'devenir', 'colonie', 'grains', 'noyau', 'pieds', 'mains',
  'jambes', 'pond', 'tartine', 'papier', 'lune', 'lacets', 'manches', 'rails', 'transporte', 'heure',
  'matin', 'foot', 'soupe', 'chauffe', 'brille_nuit', 'rois', 'camping', 'noel', 'petales', 'baguettes',
  'boum',
];

test('tout indice est tirable, ou nommé mort et expliqué (#108)', () => {
  const used = new Set();
  for (const q of all(draws())) [...q.riddle.clues, ...q.riddle.not].forEach((t) => used.add(t));
  const open = Object.values(TAGS).filter((t) => t.open && t.id !== 'main' && t.id !== 'grand').map((t) => t.id);
  const attendus = Object.keys(TAGS).filter((t) => !open.includes(t) && !INDICES_MORTS.includes(t));
  // Un indice vivant qui meurt : la banque a perdu le porteur qui le rendait tirable.
  assert.deepEqual(attendus.filter((t) => !used.has(t)), [], 'indices devenus morts sans être déclarés');
  // Un indice mort qui ressuscite : tant mieux, mais il doit sortir de la liste.
  assert.deepEqual(INDICES_MORTS.filter((t) => used.has(t)), [], 'indices morts à retirer de INDICES_MORTS');
  assert.deepEqual(open.filter((t) => used.has(t)), [], 'un indice ouvert ne peut pas être posé');
});

test('un indice « ouvert » n\'est jamais nié ni posé comme indice (#108)', () => {
  // On ne nie que ce qui est certain : « ne sent pas bon », « n'est pas rond », « ne flotte pas »
  // seraient faux pour trop de choses — ces indices ne servent donc jamais.
  const open = Object.values(TAGS).filter((t) => t.open).map((t) => t.id);
  assert.deepEqual(open.sort(),
    ['ferme', 'flotte', 'foret', 'grand', 'main', 'minuscule', 'nuit', 'parfum', 'rond', 'toit']);
  // « minuscule » est graduel comme « rond » : l'écureuil, la cerise et le chien ne sont pas minuscules,
  // mais le dire est faux pour une enfant (relecture du juge, #108).
  assert.ok(TAGS.minuscule.open);
  for (const t of THINGS) for (const tag of open) {
    if (tag === 'main' || tag === 'grand') continue;   // la taille se nie par son contraire
    assert.ok(!never(t, tag), `${t.word} : ${tag} ne devrait jamais être nié`);
  }
  for (const q of all(draws())) {
    for (const c of constraintsOf(q)) {
      assert.ok(!TAGS[c.tag].open || c.tag === 'main' || c.tag === 'grand', `indice ouvert : ${q.key}`);
    }
  }
});
