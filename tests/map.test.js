// Carte au trésor (#96) : la géométrie est le vrai contrat de cet écran. Ce qui casse en silence,
// c'est le chevauchement — deux plaques l'une sur l'autre, un nom illisible, une zone touchable
// trop petite sur un téléphone. Tout cela se vérifie ici, sans navigateur.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENE, SAFE, PLACE_HEIGHT, STARS_PER_GAME, MAX_LINE, MAX_LINES,
  placeLayout, placeKind, wrapLabel, shortTitle, islandPlaces,
  archipelago, islandLabel, islandMeta, ISLAND_GEOMETRY, SHORT_TITLES,
} from '../js/core/map.js';
import { GAMES, ISLANDS } from '../js/games/registry.js';
import { PROPS } from '../js/core/ui/art/scenery.js';

const boxesOverlap = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const inside = (box, area = SAFE) =>
  box.x >= area.x && box.y >= area.y
  && box.x + box.width <= area.x + area.width && box.y + box.height <= area.y + area.height;

const plaqueBox = ({ x, y }, { width, height }) =>
  ({ x: x - width / 2, y: y - height / 2, width, height });

// --- Découpe des noms ---------------------------------------------------------------------------

test('un nom se coupe en au plus deux lignes courtes', () => {
  assert.deepEqual(wrapLabel('Les sons'), ['Les sons']);
  assert.deepEqual(wrapLabel('Lettres sœurs'), ['Lettres', 'sœurs']);
  assert.deepEqual(wrapLabel('Lettres qui changent'), ['Lettres qui', 'changent']);
  assert.deepEqual(wrapLabel(''), ['']);
});

test('tout jeu du registre tient sur la plaque (deux lignes, lignes courtes)', () => {
  for (const game of GAMES.filter((g) => !g.demo)) {
    const lines = wrapLabel(shortTitle(game));
    assert.ok(lines.length <= MAX_LINES, `${game.id} : ${lines.length} lignes`);
    for (const line of lines) {
      assert.ok(line.length <= MAX_LINE + 1, `${game.id} : ligne trop longue « ${line} »`);
    }
  }
});

test('chaque jeu a un nom court, et il n\'est jamais vide', () => {
  for (const game of GAMES.filter((g) => !g.demo)) {
    assert.ok(SHORT_TITLES[game.id], `nom court manquant : ${game.id}`);
    assert.equal(shortTitle(game), SHORT_TITLES[game.id]);
  }
});

// --- Emplacements des lieux ----------------------------------------------------------------------

test('les plaques de lieu ne se chevauchent jamais, quel que soit le nombre de jeux', () => {
  for (let count = 1; count <= 9; count += 1) {
    const layout = placeLayout(count);
    assert.equal(layout.slots.length, count);
    const boxes = layout.slots.map((slot) => plaqueBox(slot, layout.plaque));
    for (let i = 0; i < boxes.length; i += 1) {
      assert.ok(inside(boxes[i]), `${count} lieux : plaque ${i} hors de la zone sûre`);
      for (let j = i + 1; j < boxes.length; j += 1) {
        assert.ok(!boxesOverlap(boxes[i], boxes[j]), `${count} lieux : plaques ${i} et ${j} superposées`);
      }
    }
  }
});

test('les zones touchables ne se chevauchent pas et restent confortables au doigt', () => {
  // 360 px d'écran, cadrage portrait : la scène montre ~172 unités de large sur 328 px, soit
  // 1,9 px par unité. Une zone de 30 unités fait donc au moins 56 px, la taille tactile minimale.
  const MIN_UNITS = 30;
  for (let count = 1; count <= 9; count += 1) {
    const layout = placeLayout(count);
    const hits = layout.slots.map((slot) => slot.hit);
    for (let i = 0; i < hits.length; i += 1) {
      assert.ok(hits[i].width >= MIN_UNITS && hits[i].height >= MIN_UNITS,
        `${count} lieux : zone ${i} trop petite (${hits[i].width} × ${hits[i].height})`);
      for (let j = i + 1; j < hits.length; j += 1) {
        assert.ok(!boxesOverlap(hits[i], hits[j]), `${count} lieux : zones ${i} et ${j} superposées`);
      }
    }
  }
});

test('le décor d\'un lieu est posé au-dessus de sa plaque, dans la scène', () => {
  for (let count = 1; count <= 9; count += 1) {
    const layout = placeLayout(count);
    for (const slot of layout.slots) {
      assert.ok(slot.ay < slot.y, 'le décor doit être au-dessus de sa plaque');
      assert.ok(slot.ay - layout.height >= 0, 'le décor sort du haut de la scène');
      assert.ok(Math.abs(slot.ax - slot.x) <= 6, 'le décor doit rester près de sa plaque');
    }
  }
});

test('une île de sept jeux passe à la grille serrée sans rien casser', () => {
  const six = placeLayout(6);
  const seven = placeLayout(7);
  assert.equal(six.rows.length, 2);
  assert.equal(seven.rows.length, 3);
  assert.ok(seven.decor < six.decor, 'la grille serrée réduit la taille des décors');
  assert.ok(seven.plaque.height < six.plaque.height);
});

test('au-delà de neuf jeux, la grille ne plante pas (elle se remplit jusqu\'au dernier emplacement)', () => {
  const layout = placeLayout(20);
  assert.equal(layout.slots.length, 9);
});

// --- Les lieux de l'île --------------------------------------------------------------------------

test('chaque jeu de l\'île aux Mots a son lieu, et deux jeux n\'ont pas le même', () => {
  const games = GAMES.filter((g) => !g.demo && g.island === 'mots');
  const { places } = islandPlaces(games);
  assert.equal(places.length, games.length);
  assert.equal(new Set(places.map((p) => p.kind)).size, places.length, 'deux jeux au même endroit');
  for (const place of places) {
    assert.ok(PROPS[place.kind], `décor inconnu : ${place.kind}`);
    assert.ok(place.where.length > 3, `le lieu de ${place.id} n'a pas de nom`);
  }
});

test('un jeu sans lieu attitré prend un emplacement de réserve connu', () => {
  const { kind, where } = placeKind('jeu-qui-n-existe-pas-encore', 0);
  assert.ok(PROPS[kind], `décor de réserve inconnu : ${kind}`);
  assert.ok(where);
});

test('les étoiles et le nom accessible viennent de la progression réelle', () => {
  const games = GAMES.filter((g) => !g.demo && g.island === 'mots');
  const progress = { sons: { plays: 4, best: { 1: { stars: 3 }, 2: { stars: 3 } } } };
  const { places } = islandPlaces(games, (id) => progress[id] || null);
  const sons = places.find((p) => p.id === 'sons');
  assert.equal(sons.stars, 6);
  assert.equal(sons.max, STARS_PER_GAME);
  assert.equal(sons.played, true);
  assert.match(sons.label, /Les sons.*6 étoiles sur 9/);
  const autre = places.find((p) => p.id !== 'sons');
  assert.equal(autre.stars, 0);
  assert.equal(autre.played, false);
  assert.match(autre.label, /à découvrir/);
  assert.equal(autre.href, `#/jeu/${autre.id}`);
});

// --- L'archipel ------------------------------------------------------------------------------------

const fakeRead = (unlocked = true) => () => ({
  unlocked, starsLeft: unlocked ? 0 : 7, earned: 4, possible: 54, stickers: 2, total: 10, games: 6,
});

test('les cinq îles ont une place sur la carte, de la plus lointaine à la plus proche', () => {
  const entries = archipelago(ISLANDS, fakeRead());
  assert.equal(entries.length, ISLANDS.length);
  for (let i = 1; i < entries.length; i += 1) {
    assert.ok(entries[i - 1].depth <= entries[i].depth, 'les îles doivent être triées par profondeur');
  }
  for (const island of ISLANDS) {
    assert.ok(ISLAND_GEOMETRY[island.id], `île sans géométrie : ${island.id}`);
  }
});

test('les plaques des îles ne se chevauchent pas et tiennent dans la zone sûre', () => {
  const entries = archipelago(ISLANDS, fakeRead());
  const boxes = entries.map((e) => plaqueBox(e.plaque, { width: 46, height: 22 }));
  for (let i = 0; i < boxes.length; i += 1) {
    assert.ok(inside(boxes[i]), `plaque de ${entries[i].id} hors de la zone sûre`);
    for (let j = i + 1; j < boxes.length; j += 1) {
      assert.ok(!boxesOverlap(boxes[i], boxes[j]),
        `plaques superposées : ${entries[i].id} et ${entries[j].id}`);
    }
  }
});

test('le corps de chaque île tient dans la scène', () => {
  for (const [id, g] of Object.entries(ISLAND_GEOMETRY)) {
    assert.ok(g.cx - g.rx >= 0 && g.cx + g.rx <= SCENE.width, `${id} déborde en largeur`);
    assert.ok(g.cy - g.ry >= 0 && g.cy + g.ry * 2.2 <= SCENE.height, `${id} déborde en hauteur`);
  }
});

test('le nom accessible d\'une île dit tout ce que le dessin montre', () => {
  const open = { unlocked: true, starsLeft: 0, earned: 12, possible: 54, stickers: 3, total: 10, games: 6 };
  const label = islandLabel(ISLANDS[0], open);
  assert.match(label, /L'île aux Mots/);
  assert.match(label, /12 étoiles sur 54/);
  assert.match(label, /3 gommettes sur 10/);
  assert.equal(islandMeta(open), '12 / 54 ⭐');

  const locked = { unlocked: false, starsLeft: 9, earned: 0, possible: 9, stickers: 0, total: 10, games: 1 };
  assert.match(islandLabel(ISLANDS[3], locked), /encore 9 étoiles/);
  assert.equal(islandMeta(locked), 'encore 9 ⭐');

  const empty = { unlocked: true, starsLeft: 0, earned: 0, possible: 0, stickers: 0, total: 10, games: 0 };
  assert.match(islandLabel(ISLANDS[2], empty), /Pas encore de jeu/);
  assert.equal(islandMeta(empty), 'bientôt');
});

test('la zone sûre est bien dans la scène', () => {
  assert.ok(SAFE.x > 0 && SAFE.y > 0);
  assert.ok(SAFE.x + SAFE.width <= SCENE.width);
  assert.ok(SAFE.y + SAFE.height <= SCENE.height);
  assert.ok(PLACE_HEIGHT > 0);
});
