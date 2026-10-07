// Carte au trésor (#96) : la géométrie est le vrai contrat de cet écran. Ce qui casse en silence,
// c'est le chevauchement — deux plaques l'une sur l'autre, un nom illisible, une zone touchable
// trop petite sur un téléphone. Tout cela se vérifie ici, sans navigateur.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENE, SAFE, PLACE_HEIGHT, STARS_PER_GAME, MAX_SHORT_TITLE, BADGE, ISLAND_BADGE,
  placeLayout, placeKind, shortTitle, islandPlaces, waterline,
  archipelago, islandLabel, islandMeta, ISLAND_GEOMETRY, SHORT_TITLES,
} from '../js/core/map.js';
import { GAMES, ISLANDS } from '../js/games/registry.js';
import { PROPS } from '../js/core/ui/art/scenery.js';
import {
  ISLAND_TRIM, PROP_TOP, islandExtent, tipPlacement, estimateText,
} from '../js/core/ui/map-scene.js';

const boxesOverlap = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const inside = (box, area = SAFE) =>
  box.x >= area.x && box.y >= area.y
  && box.x + box.width <= area.x + area.width && box.y + box.height <= area.y + area.height;

const badgeBox = ({ x, y }, { width, height }) => ({ x: x - width / 2, y, width, height });

// --- Noms courts ---------------------------------------------------------------------------------
//
// Le panneau de survol tient sur UNE ligne : un nom trop long le ferait déborder de la zone sûre.

test('tout jeu du registre a un nom court qui tient sur une ligne du panneau', () => {
  for (const game of GAMES.filter((g) => !g.demo)) {
    const name = shortTitle(game);
    assert.ok(name.length <= MAX_SHORT_TITLE, `${game.id} : nom trop long « ${name} »`);
    assert.ok(!/\s{2,}/.test(name), `${game.id} : le nom court tient sur une ligne`);
  }
});

test('chaque jeu a un nom court, et il n\'est jamais vide', () => {
  for (const game of GAMES.filter((g) => !g.demo)) {
    assert.ok(SHORT_TITLES[game.id], `nom court manquant : ${game.id}`);
    assert.equal(shortTitle(game), SHORT_TITLES[game.id]);
  }
});

// --- Emplacements des lieux ----------------------------------------------------------------------
//
// Depuis le second lot, un lieu N'EST QUE son décor : plus de plaque de nom posée sur l'île. Ce
// qui doit tenir, c'est donc la zone touchable — assez grande pour un doigt, jamais à cheval sur
// celle du voisin, et entièrement dans la partie de la scène visible aux deux cadrages.

test('les zones touchables ne se chevauchent pas et restent confortables au doigt', () => {
  // 360 px d'écran, cadrage portrait : la scène montre ~170 unités de large sur 328 px, soit
  // 1,9 px par unité. Une zone de 30 unités fait donc au moins 56 px, la taille tactile minimale.
  const MIN_UNITS = 30;
  for (let count = 1; count <= 9; count += 1) {
    const layout = placeLayout(count);
    assert.equal(layout.slots.length, count);
    const hits = layout.slots.map((slot) => slot.hit);
    for (let i = 0; i < hits.length; i += 1) {
      assert.ok(hits[i].width >= MIN_UNITS && hits[i].height >= MIN_UNITS,
        `${count} lieux : zone ${i} trop petite (${hits[i].width} × ${hits[i].height})`);
      assert.ok(inside(hits[i]), `${count} lieux : zone ${i} hors de la zone sûre`);
      for (let j = i + 1; j < hits.length; j += 1) {
        assert.ok(!boxesOverlap(hits[i], hits[j]), `${count} lieux : zones ${i} et ${j} superposées`);
      }
    }
  }
});

test('le décor d\'un lieu tient dans sa zone touchable, le repère d\'étoiles aussi', () => {
  for (let count = 1; count <= 9; count += 1) {
    const layout = placeLayout(count);
    for (const slot of layout.slots) {
      const art = {
        x: slot.x - 20, y: slot.y - PLACE_HEIGHT * slot.scale, width: 40, height: PLACE_HEIGHT * slot.scale,
      };
      assert.ok(art.y >= slot.hit.y - 0.01, 'le décor dépasse du haut de sa zone');
      assert.ok(slot.y <= slot.hit.y + slot.hit.height, 'le pied du décor sort de sa zone');
      const badge = {
        x: slot.badge.x - BADGE.width / 2, y: slot.badge.y, width: BADGE.width, height: BADGE.height,
      };
      assert.ok(inside(badge, slot.hit), 'le repère d\'étoiles sort de la zone de son lieu');
      // Et surtout : il est planté SOUS la ligne de sol, donc jamais devant le bâtiment.
      assert.ok(badge.y > slot.y, 'le repère recouvre le décor qu\'il désigne');
    }
  }
});

test('un lieu n\'est plus une plaque : l\'emplacement ne donne que le décor et son repère', () => {
  const layout = placeLayout(6);
  assert.equal(layout.plaque, undefined, 'les plaques de lieu doivent avoir disparu');
  for (const slot of layout.slots) {
    assert.ok(slot.scale > 0, 'chaque décor a sa propre taille');
    assert.ok(Math.abs(slot.badge.x - slot.x) >= 8, 'le repère doit être décalé à côté du décor');
  }
});

test('une île de sept jeux passe au palier serré sans rien casser', () => {
  const four = placeLayout(4);
  const six = placeLayout(6);
  const seven = placeLayout(7);
  assert.ok(four.scale > six.scale, 'moins de lieux, des décors plus grands');
  assert.ok(seven.scale < six.scale, 'le palier serré réduit la taille des décors');
  assert.ok(seven.slots.length === 7 && six.slots.length === 6);
});

test('au-delà de neuf jeux, la composition ne plante pas (elle se remplit jusqu\'au dernier)', () => {
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

// Troisième lot (#96) : plus aucune pancarte de nom sur l'archipel. Ce qui doit tenir, c'est donc
// la même chose qu'à l'intérieur d'une île — une zone cliquable par île, assez grande pour un
// doigt, jamais à cheval sur celle de la voisine, et un repère qui ne couvre pas l'île.

test('aucune pancarte de nom ne reste sur l\'archipel', () => {
  for (const [id, g] of Object.entries(ISLAND_GEOMETRY)) {
    assert.equal(g.plaque, undefined, `${id} porte encore une plaque de nom`);
  }
});

test('chaque île est une zone cliquable confortable, et deux îles ne se recouvrent jamais', () => {
  // Même calcul que pour les lieux : 30 unités = 56 px sur un téléphone de 360 px.
  const MIN_UNITS = 30;
  const entries = archipelago(ISLANDS, fakeRead());
  const hits = entries.map((e) => e.hit);
  for (let i = 0; i < hits.length; i += 1) {
    assert.ok(hits[i], `${entries[i].id} : pas de zone cliquable`);
    assert.ok(hits[i].width >= MIN_UNITS && hits[i].height >= MIN_UNITS,
      `${entries[i].id} : zone trop petite (${hits[i].width} × ${hits[i].height})`);
    assert.ok(inside(hits[i]), `${entries[i].id} : zone cliquable hors de la zone sûre`);
    for (let j = i + 1; j < hits.length; j += 1) {
      assert.ok(!boxesOverlap(hits[i], hits[j]),
        `zones cliquables superposées : ${entries[i].id} et ${entries[j].id}`);
    }
  }
});

test('le corps de chaque île tient dans sa propre zone cliquable', () => {
  for (const [id, g] of Object.entries(ISLAND_GEOMETRY)) {
    const body = {
      x: g.cx - g.rx, y: g.cy - g.ry, width: g.rx * 2, height: waterline(g) - (g.cy - g.ry),
    };
    assert.ok(inside(body, g.hit), `${id} : l'île déborde de sa zone cliquable`);
  }
});

test('le repère d\'une île est posé SOUS la ligne de flottaison, jamais devant l\'île', () => {
  for (const [id, g] of Object.entries(ISLAND_GEOMETRY)) {
    const badge = badgeBox(g.badge, ISLAND_BADGE);
    assert.ok(badge.y > waterline(g), `${id} : le repère est posé sur l'île, pas sous elle`);
    assert.ok(Math.abs(g.badge.x - g.cx) >= 8, `${id} : le repère doit être décalé sur le côté`);
    assert.ok(inside(badge, g.hit), `${id} : le repère sort de la zone cliquable de son île`);
    assert.ok(inside(badge), `${id} : le repère sort de la zone sûre`);
  }
});

test('chaque île de l\'archipel a sa silhouette et son semis (elles étaient identiques)', () => {
  const shapes = Object.entries(ISLAND_GEOMETRY).map(([id, g]) => {
    assert.ok(g.squareness >= 2 && g.squareness <= 3.6, `${id} : galbe hors limites`);
    assert.ok(g.wave && g.wave.amp > 0 && g.wave.amp <= 0.25, `${id} : ondulation hors limites`);
    assert.ok(Number.isInteger(g.wave.k) && g.wave.k >= 2, `${id} : l'ondulation doit se refermer`);
    return `${g.squareness}|${g.wave.amp}|${g.wave.k}|${g.wave.phase}`;
  });
  assert.equal(new Set(shapes).size, shapes.length, 'deux îles ont exactement la même côte');

  const trims = ISLANDS.map((island) => {
    const trim = ISLAND_TRIM[island.id];
    assert.ok(Array.isArray(trim) && trim.length >= 8, `semis trop pauvre : ${island.id}`);
    for (const [prop, u, v] of trim) {
      assert.ok(PROPS[prop], `${island.id} : objet de décor inconnu « ${prop} »`);
      assert.ok(Math.hypot(u, v) <= 1.05, `${island.id} : « ${prop} » posé hors de l'île`);
    }
    return trim.map(([prop, u, v]) => `${prop}${u}${v}`).join(',');
  });
  assert.equal(new Set(trims).size, trims.length, 'deux îles portent le même décor');
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

  assert.match(label, /Île ouverte/);

  const empty = { unlocked: true, starsLeft: 0, earned: 0, possible: 0, stickers: 0, total: 10, games: 0 };
  assert.match(islandLabel(ISLANDS[2], empty), /pas encore de jeu/);
  assert.equal(islandMeta(empty), 'bientôt');
});

test('la zone sûre est bien dans la scène', () => {
  assert.ok(SAFE.x > 0 && SAFE.y > 0);
  assert.ok(SAFE.x + SAFE.width <= SCENE.width);
  assert.ok(SAFE.y + SAFE.height <= SCENE.height);
  assert.ok(PLACE_HEIGHT > 0);
});

// --- Le panneau de nom ne recouvre jamais l'île qu'il nomme (#103) -------------------------------
//
// Il était ancré sur le haut de l'ellipse d'herbe ; les palmiers de l'île aux Mots montent bien
// au-dessus (haut réel 90,6 contre 117) et le panneau retombait dedans à 30,5 %.

const openIsland = { unlocked: true, starsLeft: 0, earned: 54, possible: 54, stickers: 10, total: 10, games: 6 };
const lockedIsland = { unlocked: false, starsLeft: 15, earned: 0, possible: 9, stickers: 0, total: 10, games: 1 };

test('chaque objet du semis a une hauteur connue (sinon l\'extension d\'une île est sous-estimée)', () => {
  for (const [id, trim] of Object.entries(ISLAND_TRIM)) {
    for (const [prop] of trim) assert.ok(PROP_TOP[prop] > 0, `${id} : hauteur de « ${prop} » inconnue`);
  }
});

test('l\'extension réelle d\'une île dépasse le haut de son herbe quand le semis monte plus haut', () => {
  const [mots] = archipelago(ISLANDS.filter((i) => i.id === 'mots'), () => openIsland);
  const { top } = islandExtent(mots);
  assert.ok(top < mots.cy - mots.ry - 15, `les palmes de l'île aux Mots montent à ${top}`);
  for (const entry of archipelago(ISLANDS, () => openIsland)) {
    assert.ok(islandExtent(entry).top <= entry.cy - entry.ry, `${entry.id} : l'extension rétrécit`);
    assert.ok(islandExtent(entry).bottom > entry.cy, `${entry.id} : la flottaison est sous l'île`);
  }
});

test('le panneau de nom ne recouvre aucune île, ouverte ou fermée, au-dessus comme replié dessous', () => {
  for (const data of [openIsland, lockedIsland]) {
    for (const entry of archipelago(ISLANDS, () => data)) {
      const extent = islandExtent(entry);
      const anchor = {
        x: entry.cx, top: extent.top, under: waterline(entry) + ISLAND_BADGE.height + 6,
        point: entry.cy - entry.ry * 0.3,
      };
      const box = tipPlacement(anchor, estimateText(entry.name, 7), estimateText(entry.meta, 5.4));
      const body = { x: entry.hit.x, y: extent.top, width: entry.hit.width, height: extent.bottom - extent.top };
      assert.ok(!boxesOverlap(box, body),
        `${entry.id} : le panneau (${box.y}→${box.y + box.height}) recouvre l'île (${extent.top}→${extent.bottom})`);
      if (!box.under) assert.ok(box.y + box.height <= extent.top, `${entry.id} : le panneau doit finir avant le haut de l'île`);
    }
  }
});
