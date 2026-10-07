// Bibliothèque de décor de la carte (#96). Ce qui casse en silence dans un dessin SVG, c'est une
// classe mal écrite : la forme reste là, en noir, et personne ne le voit avant la tablette. On
// vérifie donc que CHAQUE classe utilisée par un objet existe vraiment dans css/map.css, et que
// chaque objet respecte la direction artistique (contour, trois tons, nom accessible).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { n, walk, toMarkup } from '../js/core/ui/art/kawaii-parts.js';
import {
  PROPS, PROP_IDS, TINTS, propLabel, propHeight, tintVars, defId, propDefs, use, scatter, idsOf,
} from '../js/core/ui/art/scenery.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'css/map.css'), 'utf8');

/** Toutes les classes définies par la feuille de style de la carte. */
const declared = new Set([...css.matchAll(/\.([a-z][\w-]*)/g)].map((m) => m[1]));

/** Toutes les classes posées par un objet du catalogue. */
function classesOf(parts) {
  const found = new Set();
  for (const node of parts) {
    walk(node, (el) => {
      for (const cls of String(el.attrs.class || '').split(/\s+/)) if (cls) found.add(cls);
    });
  }
  return found;
}

test('le catalogue contient les objets attendus par la carte', () => {
  for (const id of ['palm', 'bush', 'flower', 'pebble', 'shell', 'starfish', 'cloud', 'sun',
    'lantern', 'bunting', 'barrel', 'chest', 'cave', 'mill', 'lighthouse', 'hut']) {
    assert.ok(PROPS[id], `objet manquant : ${id}`);
  }
  assert.equal(new Set(PROP_IDS).size, PROP_IDS.length, 'identifiant en double');
});

test('chaque objet a un nom accessible', () => {
  for (const id of PROP_IDS) {
    assert.ok(propLabel(id).trim(), `objet sans nom : ${id}`);
  }
  assert.equal(propLabel('inconnu'), '');
});

test('chaque classe de dessin existe dans css/map.css', () => {
  for (const id of PROP_IDS) {
    for (const cls of classesOf(PROPS[id].parts())) {
      assert.ok(declared.has(cls), `classe absente de css/map.css : .${cls} (objet ${id})`);
    }
  }
});

test('chaque objet porte un contour : c\'est le marqueur n°1 du style', () => {
  for (const id of PROP_IDS) {
    const classes = classesOf(PROPS[id].parts());
    const outlined = ['sc-ln', 'sc-dt', 'sc-bird', 'sc-smile', 'sc-arm', 'sc-post', 'sc-rope', 'sc-stem', 'sc-ray']
      .some((cls) => classes.has(cls));
    assert.ok(outlined, `objet sans aucun trait : ${id}`);
  }
});

test('les objets volumineux ont trois tons de la même matière', () => {
  const families = [['sc-leaf', 'sc-leaf-lt', 'sc-leaf-dk'], ['sc-wood', 'sc-wood-lt', 'sc-wood-dk'],
    ['sc-stone', 'sc-stone-lt', 'sc-stone-dk'], ['sc-tint', 'sc-tint-lt', 'sc-tint-dk'],
    ['sc-wall', 'sc-wall-lt', 'sc-wall-dk'], ['sc-cloud', 'sc-cloud-lt', 'sc-cloud-dk']];
  for (const id of ['tree', 'bush', 'cloud', 'rock', 'barrel', 'hut', 'mill', 'rainbow-tree']) {
    const classes = classesOf(PROPS[id].parts());
    const shaded = families.some((f) => f.every((cls) => classes.has(cls)));
    assert.ok(shaded, `objet sans ses trois tons : ${id}`);
  }
});

test('les lieux déclarent leur hauteur : la scène s\'en sert pour les cadrer', () => {
  for (const id of ['cave', 'mill', 'twin-rocks', 'rainbow-tree', 'lighthouse', 'hut', 'tent', 'well']) {
    assert.ok(propHeight(id) > 10, `hauteur manquante ou absurde : ${id}`);
  }
  assert.equal(propHeight('tree'), 0, 'seuls les lieux déclarent une hauteur');
});

test('aucune couleur n\'est écrite en dur dans un dessin', () => {
  for (const id of PROP_IDS) {
    const markup = PROPS[id].parts().map(toMarkup).join('');
    assert.doesNotMatch(markup, /#[0-9a-fA-F]{3,8}\b/, `couleur en dur dans ${id}`);
    assert.doesNotMatch(markup, /fill="(?!none)/, `remplissage en dur dans ${id}`);
  }
});

// --- Pose des objets -------------------------------------------------------------------------------

test('le <defs> d\'une scène ne déclare chaque objet qu\'une fois', () => {
  const defs = propDefs('isle', ['tree', 'tree', 'bush', 'objet-inconnu']);
  assert.deepEqual(defs.map((d) => d.attrs.id), [defId('isle', 'tree'), defId('isle', 'bush')]);
});

test('un objet posé pointe vers sa déclaration et compense son échelle', () => {
  const small = use('tree', { scene: 'isle', x: 10, y: 20, scale: 0.5 });
  assert.equal(small.attrs.href, '#sc-isle-tree');
  assert.match(small.attrs.transform, /translate\(10 20\) scale\(0\.5 0\.5\)/);
  // Contour borné : un objet minuscule n'est pas qu'un trait, un grand n'a pas un trait de fil.
  const stroke = (node) => Number(node.attrs.style.match(/--sc-stroke: ([\d.]+)/)[1]);
  assert.ok(stroke(small) < 1.9 && stroke(small) > 1.5);
  assert.ok(stroke(use('tree', { scale: 1 })) > stroke(use('tree', { scale: 1.4 })));
  assert.equal(stroke(use('tree', { scale: 3 })), stroke(use('tree', { scale: 1.4 })));
  assert.match(use('tree', { flip: true }).attrs.transform, /scale\(-1 1\)/);
});

test('la teinte d\'un objet passe par des variables, jamais par une couleur', () => {
  for (const tint of TINTS) {
    assert.match(tintVars(tint), new RegExp(`--sc-tint: var\\(--kawaii-${tint}\\)`));
    assert.match(tintVars(tint), new RegExp(`--sc-tint-lt: var\\(--kawaii-${tint}-light\\)`));
  }
  assert.equal(tintVars('mauve-imaginaire'), '');
  assert.match(use('flower', { tint: 'citron' }).attrs.style, /--sc-tint: var\(--kawaii-citron\)/);
});

test('scatter pose chaque objet de la liste et idsOf en donne le catalogue exact', () => {
  const items = [{ id: 'tree', x: 1, y: 2 }, { id: 'bush', x: 3, y: 4 }, { id: 'tree', x: 5, y: 6 }];
  assert.equal(scatter('isle', items).length, 3);
  assert.deepEqual(idsOf(items), ['tree', 'bush']);
});

test('un objet est bien un arbre SVG utilisable (aucun DOM nécessaire)', () => {
  const markup = toMarkup(n('g', {}, PROPS.palm.parts()));
  assert.match(markup, /^<g>/);
  assert.ok(markup.length > 200, 'le palmier devrait être un vrai dessin');
});
