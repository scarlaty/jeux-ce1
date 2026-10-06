// Kit kawaii (#88) : les dessins sont décrits par des fonctions pures, testables sans navigateur.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  character, label, kawaiiErrors, normalize, mascot, companion, toMarkup,
  MASCOTS, COMPANION_STAGES, COLORS, FACES, ACCESSORIES, SHAPES, ANIMALS, BODIES, ANIMAL_STAGES,
} from '../js/core/ui/art/kawaii.js';
import { decoration, DECORATIONS, label as decoLabel } from '../js/core/ui/art/kawaii-deco.js';
import { walk, roundedStar } from '../js/core/ui/art/kawaii-parts.js';
import { artErrors, artLabel, artKinds } from '../js/core/ui/art/index.js';
import { ISLANDS } from '../js/games/registry.js';

/** Identifiants déclarés et références url(#…) / href="#…" d'un arbre. */
function idsOf(tree) {
  const ids = [];
  const refs = [];
  walk(tree, (node) => {
    if (node.attrs.id) ids.push(node.attrs.id);
    for (const value of Object.values(node.attrs)) {
      for (const [, ref] of String(value).matchAll(/url\(#([^)]+)\)/g)) refs.push(ref);
    }
  });
  return { ids, refs };
}

const classesOf = (tree) => {
  const found = new Set();
  walk(tree, (node) => String(node.attrs.class || '').split(/\s+/).forEach((c) => c && found.add(c)));
  return found;
};

test('une description complète est valide, les valeurs inconnues sont refusées', () => {
  assert.deepEqual(kawaiiErrors({}), []);
  assert.deepEqual(kawaiiErrors({ body: 'drop', color: 'ciel', face: 'joyful', accessory: 'bow', accent: 'citron' }), []);
  assert.deepEqual(kawaiiErrors({ body: 'cat', stage: 3 }), []);
  assert.deepEqual(kawaiiErrors({ body: 'egg', crack: true }), []);
  assert.match(kawaiiErrors({ body: 'triangle' })[0], /kawaii\.body/);
  assert.match(kawaiiErrors({ color: 'noir' })[0], /kawaii\.color/);
  assert.match(kawaiiErrors({ face: 'angry' })[0], /kawaii\.face/);
  assert.match(kawaiiErrors({ accessory: 'épée' })[0], /kawaii\.accessory/);
  assert.match(kawaiiErrors({ accent: 'or' })[0], /kawaii\.accent/);
  assert.match(kawaiiErrors({ body: 'cat', stage: 4 })[0], /kawaii\.stage/);
  assert.match(kawaiiErrors({ body: 'round', stage: 2 })[0], /seulement pour un animal/);
  assert.match(kawaiiErrors({ body: 'round', crack: true })[0], /seulement pour un œuf/);
  assert.match(kawaiiErrors({ name: '  ' })[0], /kawaii\.name/);
  assert.deepEqual(kawaiiErrors(null), ['kawaii : la description doit être un objet']);
});

test('chaque expression est dessinée, et toutes sont différentes', () => {
  const drawn = FACES.map((face) => {
    const tree = character({ face }, { uid: 't' });
    assert.ok(classesOf(tree).has(`kw__face--${face}`), face);
    return toMarkup(tree);
  });
  assert.equal(new Set(drawn).size, FACES.length);
  // Les yeux ouverts (ceux qui clignent) ont deux reflets chacun ; « très content » et « endormi » ont les yeux fermés.
  const eyes = (face) => { let k = 0; walk(character({ face }, { uid: 't' }), (node) => { if (node.attrs.class === 'kw__eye') k += 1; }); return k; };
  assert.deepEqual(FACES.map(eyes), [2, 0, 2, 1, 0]);
  assert.ok(classesOf(character({ face: 'sleepy' }, { uid: 't' })).has('kw__zz'), 'les « z » du sommeil');
});

test('toutes les combinaisons de forme, couleur, expression et accessoire se dessinent', () => {
  let count = 0;
  for (const body of BODIES) {
    for (const color of COLORS) {
      for (const face of FACES) {
        for (const accessory of ACCESSORIES) {
          const markup = toMarkup(character({ body, color, face, accessory }, { uid: 'x' }));
          assert.ok(markup.startsWith('<svg') && markup.endsWith('</svg>'));
          assert.ok(!markup.includes('undefined') && !markup.includes('NaN'), `${body}/${color}/${face}/${accessory}`);
          count += 1;
        }
      }
    }
  }
  assert.equal(count, BODIES.length * COLORS.length * FACES.length * ACCESSORIES.length);
});

test('plusieurs personnages sur la page : aucun identifiant SVG en collision', () => {
  const trees = [
    character({ body: 'cat' }), character({ body: 'drop' }), character({ body: 'egg', crack: true }),
    decoration({ shape: 'heart' }), decoration({ shape: 'star', face: 'happy' }),
  ];
  const all = trees.flatMap((tree) => idsOf(tree).ids);
  assert.equal(new Set(all).size, all.length, `doublons : ${all}`);
  // Chaque dessin ne référence que ses propres définitions (rien ne dépend d'un voisin).
  for (const tree of trees) {
    const { ids, refs } = idsOf(tree);
    assert.ok(refs.length >= 2, 'découpe + filtre autocollant');
    for (const ref of refs) assert.ok(ids.includes(ref), `référence orpheline : ${ref}`);
  }
});

test('sans liseré, le dessin n\'a pas de filtre', () => {
  const { ids, refs } = idsOf(character({ sticker: false }, { uid: 'n' }));
  assert.deepEqual(ids, ['n-clip']);
  assert.deepEqual(refs, ['n-clip']);
});

test('le texte fourni est échappé dans le SVG', () => {
  assert.match(toMarkup(character({ name: 'Lou <3 & "moi"' }, { uid: 'e' })), /Lou &lt;3 &amp; &quot;moi&quot;/);
});

test('l\'accessoire ne prend jamais la couleur du corps', () => {
  for (const color of COLORS) {
    for (const accessory of ACCESSORIES) {
      assert.notEqual(normalize({ color, accessory }).accent, color);
      assert.notEqual(normalize({ color, accessory, accent: color }).accent, color);
    }
  }
  assert.equal(normalize({ color: 'ciel', accessory: 'bow', accent: 'menthe' }).accent, 'menthe');
});

test('le nom accessible décrit le personnage en français', () => {
  assert.equal(label({}), 'Boule rose, l\'air content.');
  assert.equal(label({ body: 'drop', color: 'ciel', face: 'joyful', accessory: 'bow' }),
    'Goutte bleu ciel, l\'air très content, avec un nœud.');
  assert.equal(label({ body: 'bunny', stage: 1, color: 'lavande', face: 'sleepy' }), 'Bébé lapin lavande, l\'air endormi.');
  assert.equal(label({ body: 'bear', stage: 3, color: 'citron' }), 'Grand ourson jaune citron, l\'air content.');
  assert.equal(label({ body: 'egg', crack: true, color: 'creme', face: 'surprised' }), 'Œuf qui éclot crème, l\'air surpris.');
  assert.equal(label(mascot('mots')), 'Perle : goutte rose, l\'air content, avec un nœud.');
  // Toutes les descriptions distinctes ont des noms distincts (les choix de QCM restent différents).
  const names = new Set();
  for (const body of SHAPES) for (const color of COLORS) for (const face of FACES) names.add(label({ body, color, face }));
  assert.equal(names.size, SHAPES.length * COLORS.length * FACES.length);
});

test('une mascotte par île, toutes différentes et valides', () => {
  assert.deepEqual(Object.keys(MASCOTS).sort(), ISLANDS.map((i) => i.id).sort());
  const bodies = new Set();
  const colors = new Set();
  for (const island of ISLANDS) {
    const spec = mascot(island.id);
    assert.deepEqual(kawaiiErrors(spec), [], island.id);
    assert.deepEqual(artErrors(spec), [], island.id);
    bodies.add(spec.body);
    colors.add(spec.color);
  }
  assert.equal(bodies.size, ISLANDS.length, 'une forme par mascotte');
  assert.equal(colors.size, ISLANDS.length, 'une teinte par mascotte');
  assert.equal(mascot('nombres', { face: 'joyful' }).face, 'joyful');
  assert.throws(() => mascot('lune'), /île inconnue/);
});

test('le compagnon : un œuf qui éclot, puis un bébé animal qui grandit', () => {
  assert.deepEqual(COMPANION_STAGES.map((s) => s.stage), [0, 1, 2, 3, 4]);
  for (const animal of ANIMALS) {
    const specs = COMPANION_STAGES.map(({ stage }) => companion({ animal, stage, color: 'menthe' }));
    specs.forEach((spec) => assert.deepEqual(kawaiiErrors(spec), [], JSON.stringify(spec)));
    assert.equal(specs[0].body, 'egg');
    assert.equal(specs[0].crack, false);
    assert.equal(specs[1].crack, true);
    assert.equal(specs[0].accent, 'menthe', 'l\'œuf porte les taches de la couleur du futur compagnon');
    assert.deepEqual(specs.slice(2).map((s) => [s.body, s.stage]), ANIMAL_STAGES.map((st) => [animal, st]));
    // Chaque stade change la forme : cinq dessins différents.
    assert.equal(new Set(specs.map((spec) => toMarkup(character(spec, { uid: 'c' })))).size, 5);
  }
  assert.equal(companion({ stage: 0 }).face, 'sleepy');
  assert.equal(companion({ stage: 3, face: 'joyful', name: 'Caramel' }).name, 'Caramel');
  assert.throws(() => companion({ animal: 'dragon' }), /animal inconnu/);
  assert.throws(() => companion({ stage: 5 }), /stade inconnu/);
});

test('les stades d\'un animal ajoutent coquille, pattes, queue puis bras', () => {
  const has = (stage, cls) => classesOf(character({ body: 'cat', stage }, { uid: 's' })).has(cls);
  assert.ok(has(1, 'kw__shell') && !has(1, 'kw__tail'));
  assert.ok(!has(2, 'kw__shell') && has(2, 'kw__tail'));
  const parts = (stage) => { let k = 0; walk(character({ body: 'cat', stage }, { uid: 's' }), (node) => { if (node.attrs.class === 'kw__part') k += 1; }); return k; };
  assert.ok(parts(3) > parts(2) && parts(2) > parts(1));
});

test('les décorations : étoile, cœur, nuage, étincelle', () => {
  assert.deepEqual(DECORATIONS, ['star', 'heart', 'cloud', 'sparkle']);
  for (const shape of DECORATIONS) {
    assert.deepEqual(artErrors({ kind: 'kawaii-deco', shape }), []);
    const tree = decoration({ shape }, { uid: 'd' });
    assert.equal(tree.attrs['aria-hidden'], 'true', 'décorative par défaut');
  }
  assert.equal(decoLabel({ shape: 'heart' }), 'Cœur rose');
  assert.equal(decoration({ shape: 'star', label: 'Bravo' }, { uid: 'd' }).attrs['aria-label'], 'Bravo');
  assert.ok(classesOf(decoration({ shape: 'heart', face: 'joyful' }, { uid: 'd' })).has('kw__face--joyful'));
  assert.ok(artErrors({ kind: 'kawaii-deco', shape: 'lune' }).some((e) => /kawaii-deco.shape/.test(e)));
  assert.match(artErrors({ kind: 'kawaii-deco', shape: 'sparkle', face: 'happy' })[0], /étincelle/);
});

test('les personnages sont des dessins du socle, utilisables dans une question', () => {
  assert.ok(artKinds().includes('kawaii') && artKinds().includes('kawaii-deco'));
  assert.equal(artLabel({ kind: 'kawaii', body: 'star', color: 'citron' }), 'Étoile jaune citron, l\'air content.');
  assert.match(artErrors({ kind: 'kawaii', face: 'grumpy' })[0], /face/);
});

test('l\'étoile arrondie est un tracé fermé de 10 sommets', () => {
  const d = roundedStar(60, 60, 50, 25);
  assert.equal((d.match(/Q/g) || []).length, 10);
  assert.ok(d.startsWith('M') && d.endsWith('Z'));
});
