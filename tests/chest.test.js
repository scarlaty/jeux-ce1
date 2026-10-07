// Le coffre surprise (#91) : tirage pur et déterministe, rareté selon les étoiles, aucun doublon tant
// qu'une collection n'est pas complète, données du profil, branchement sur le moteur, mots affichés.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  TIERS, ODDS, RARITIES, ACCESSORIES, tierFor, rarityFor, drawChest, collect,
  defaultChest, normalizeChest, readChest, equip, withAccessory, saveChest, accessoryInfo,
} from '../js/core/chest.js';
import { STICKERS, islandStickers } from '../js/core/rewards.js';
import { createRng } from '../js/core/random.js';
import { ACCESSORIES as KIT_ACCESSORIES, kawaiiErrors } from '../js/core/ui/art/kawaii.js';
import { companionSpec } from '../js/core/ui/companion.js';
import { prizeText } from '../js/core/ui/chest.js';
import { createEmitter, createSession } from '../js/core/engine.js';
import { createMemoryBackend, createStorage, createStore, defaultProfile } from '../js/core/storage.js';
import { installRewards, resetRewardsForTests } from '../js/core/rewards-live.js';
import { installChest, chestSummary, resetChestForTests } from '../js/core/chest-live.js';
import { readRewards } from '../js/core/rewards.js';

const stickerIds = (island) => islandStickers(island).map((s) => s.id);

// --- Catalogue et paliers ------------------------------------------------------------------------

test('les accessoires sont ceux du kit kawaii, avec un nom et une rareté', () => {
  const ids = ACCESSORIES.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants uniques');
  for (const a of ACCESSORIES) {
    assert.ok(KIT_ACCESSORIES.includes(a.id), `${a.id} n'existe pas dans le kit`);
    assert.ok(a.name.length > 3);
    assert.ok(['uncommon', 'rare'].includes(a.rarity));
    assert.deepEqual(kawaiiErrors({ kind: 'kawaii', body: 'cat', stage: 3, accessory: a.id }), []);
  }
  assert.ok(ACCESSORIES.some((a) => a.rarity === 'rare'), 'il y a de l\'or à gagner');
  assert.equal(accessoryInfo('couronne-inconnue'), null);
});

test('le coffre suit les étoiles : rien, bois, argent, doré', () => {
  assert.equal(tierFor(0), null);
  assert.equal(tierFor(1), 'bois');
  assert.equal(tierFor(2), 'argent');
  assert.equal(tierFor(3), 'dore');
  assert.equal(drawChest({ stars: 0, island: 'mots', rng: createRng(1) }), null, 'pas de coffre sans étoile');
});

test('chaque coffre a des chances qui font 100, et un coffre plus beau est meilleur', () => {
  for (const tier of TIERS) {
    const sum = RARITIES.reduce((n, r) => n + ODDS[tier][r], 0);
    assert.equal(sum, 100, tier);
  }
  assert.ok(ODDS.argent.rare > ODDS.bois.rare && ODDS.dore.rare > ODDS.argent.rare, 'plus de rare');
  assert.ok(ODDS.argent.common < ODDS.bois.common && ODDS.dore.common < ODDS.argent.common, 'moins de commun');
  assert.ok(ODDS.bois.common > ODDS.bois.uncommon, 'le bois donne surtout des gommettes');
});

test('rarityFor coupe exactement aux seuils', () => {
  assert.equal(rarityFor('bois', 0), 'common');
  assert.equal(rarityFor('bois', 0.7499), 'common');
  assert.equal(rarityFor('bois', 0.75), 'uncommon');
  assert.equal(rarityFor('bois', 0.9699), 'uncommon');
  assert.equal(rarityFor('bois', 0.97), 'rare');
  assert.equal(rarityFor('bois', 0.999999), 'rare');
  assert.equal(rarityFor('dore', 0.34), 'common');
  assert.equal(rarityFor('dore', 0.35), 'uncommon');
  assert.equal(rarityFor('dore', 0.8), 'rare');
});

// --- Tirage : déterminisme et probabilités ------------------------------------------------------

test('une même graine redonne le même coffre', () => {
  for (const stars of [1, 2, 3]) {
    for (const seed of [1, 42, 123456789]) {
      const a = drawChest({ stars, island: 'nombres', rng: createRng(seed) });
      const b = drawChest({ stars, island: 'nombres', rng: createRng(seed) });
      assert.deepEqual(a, b);
    }
  }
  const results = new Set();
  for (let seed = 0; seed < 60; seed++) results.add(JSON.stringify(drawChest({ stars: 3, island: 'nombres', rng: createRng(seed) })));
  assert.ok(results.size > 5, 'des graines différentes donnent des coffres différents');
});

test('le tirage ne modifie pas les listes reçues', () => {
  const owned = ['livre'];
  const accessories = ['bow'];
  drawChest({ stars: 3, island: 'mots', ownedStickers: owned, ownedAccessories: accessories, rng: createRng(5) });
  assert.deepEqual(owned, ['livre']);
  assert.deepEqual(accessories, ['bow']);
});

test('les fréquences observées suivent les chances de chaque coffre (graine fixe, 20 000 tirages)', () => {
  const N = 20000;
  for (const [stars, tier] of [[1, 'bois'], [2, 'argent'], [3, 'dore']]) {
    const rng = createRng(2026);
    const seen = { common: 0, uncommon: 0, rare: 0 };
    for (let i = 0; i < N; i++) seen[drawChest({ stars, island: 'mots', rng }).rarity] += 1;
    for (const rarity of RARITIES) {
      const rate = (seen[rarity] / N) * 100;
      assert.ok(Math.abs(rate - ODDS[tier][rarity]) < 1.5, `${tier} ${rarity} : ${rate.toFixed(1)} % au lieu de ${ODDS[tier][rarity]} %`);
    }
  }
});

test('le contenu est du bon genre pour chaque rareté', () => {
  const rng = createRng(7);
  for (let i = 0; i < 400; i++) {
    const { rarity, prize } = drawChest({ stars: 3, island: 'monde', rng });
    if (rarity === 'common') {
      assert.equal(prize.kind, 'sticker');
      assert.ok(stickerIds('monde').includes(prize.sticker.id));
    } else {
      assert.equal(prize.kind, 'accessory');
      assert.equal(prize.accessory.rarity, rarity);
    }
  }
});

// --- Aucun doublon tant qu'une collection n'est pas complète ------------------------------------

test('aucun doublon : tout ce qui existe est gagné avant qu\'une chose revienne', () => {
  const total = islandStickers('mots').length + ACCESSORIES.length;
  for (const stars of [1, 2, 3]) {
    for (const seed of [1, 99, 31337]) {
      const rng = createRng(seed);
      let stickers = [];
      let chest = defaultChest();
      const got = new Set();
      for (let i = 0; i < total; i++) {
        const draw = drawChest({ stars, island: 'mots', ownedStickers: stickers, ownedAccessories: chest.accessories, rng });
        assert.equal(draw.prize.duplicate, false, `doublon au coffre ${i + 1} (graine ${seed}, ${stars} étoiles)`);
        const id = draw.prize.kind === 'sticker' ? `s:${draw.prize.sticker.id}` : `a:${draw.prize.accessory.id}`;
        assert.ok(!got.has(id), `${id} gagné deux fois`);
        got.add(id);
        if (draw.prize.kind === 'sticker') stickers = [...stickers, draw.prize.sticker.id];
        chest = collect(chest, draw.prize);
      }
      assert.equal(got.size, total);
      assert.equal(chest.accessories.length, ACCESSORIES.length);
      // Tout est gagné : seulement alors, une gommette déjà collée, signalée comme telle.
      const extra = drawChest({ stars, island: 'mots', ownedStickers: stickers, ownedAccessories: chest.accessories, rng });
      assert.equal(extra.prize.kind, 'sticker');
      assert.equal(extra.prize.duplicate, true);
    }
  }
});

test('une sorte épuisée laisse la place aux autres : accessoires finis → gommettes', () => {
  const all = ACCESSORIES.map((a) => a.id);
  const rng = createRng(3);
  for (let i = 0; i < 300; i++) {
    const draw = drawChest({ stars: 3, island: 'mots', ownedStickers: [], ownedAccessories: all, rng });
    assert.equal(draw.prize.kind, 'sticker');
    assert.equal(draw.prize.sticker.id, STICKERS.mots[0].id, 'la prochaine gommette de l\'album');
  }
  const noStickers = islandStickers('mots').map((s) => s.id);
  for (let i = 0; i < 300; i++) {
    const draw = drawChest({ stars: 1, island: 'mots', ownedStickers: noStickers, ownedAccessories: [], rng });
    assert.equal(draw.prize.kind, 'accessory', 'gommettes finies → un accessoire, même dans un coffre en bois');
  }
});

test('une île inconnue ne fait jamais d\'exception', () => {
  const draw = drawChest({ stars: 2, island: 'nulle-part', ownedAccessories: ACCESSORIES.map((a) => a.id), rng: createRng(1) });
  assert.deepEqual(draw.prize, { kind: 'stars' });
});

// --- Données du profil --------------------------------------------------------------------------

test('un coffre absent, partiel ou abîmé redevient utilisable', () => {
  assert.deepEqual(normalizeChest(undefined), defaultChest());
  assert.deepEqual(normalizeChest('oui'), defaultChest());
  assert.deepEqual(normalizeChest({ accessories: 'bow', equipped: 'bow', opened: 'beaucoup' }), defaultChest());
  assert.deepEqual(
    normalizeChest({ accessories: ['star', 'bow', 'bow', 'inconnu', 7], equipped: 'crown', opened: 3.9, extra: 1 }),
    { accessories: ['bow', 'star'], equipped: null, opened: 3 },
    'ordre du catalogue, sans doublon ni inconnu ; on ne porte pas ce qu\'on n\'a pas',
  );
  assert.deepEqual(normalizeChest({ accessories: ['bow', 'hat'], equipped: 'hat', opened: -2 }), { accessories: ['bow', 'hat'], equipped: 'hat', opened: 0 });
  assert.deepEqual(readChest(null), defaultChest());
  assert.deepEqual(defaultProfile({ id: 'x' }).chest, defaultChest());
});

test('on ne porte qu\'un accessoire à la fois, ou aucun, et seulement ceux qu\'on possède', () => {
  let chest = normalizeChest({ accessories: ['bow', 'crown'] });
  chest = equip(chest, 'bow');
  assert.equal(chest.equipped, 'bow');
  chest = equip(chest, 'crown');
  assert.equal(chest.equipped, 'crown', 'le nouveau remplace l\'ancien');
  assert.equal(equip(chest, 'hat').equipped, 'crown', 'non possédé : sans effet');
  assert.equal(equip(chest, null).equipped, null);
  assert.equal(equip(chest, undefined).equipped, null);
});

test('collect range un accessoire neuf et compte les coffres, une gommette seulement le compte', () => {
  const base = defaultChest();
  const withBow = collect(base, { kind: 'accessory', accessory: accessoryInfo('bow') });
  assert.deepEqual(withBow, { accessories: ['bow'], equipped: null, opened: 1 });
  assert.deepEqual(collect(withBow, { kind: 'sticker', island: 'mots', sticker: STICKERS.mots[0], duplicate: false }), { accessories: ['bow'], equipped: null, opened: 2 });
  assert.deepEqual(base, defaultChest(), 'pure');
});

test('le compagnon éclos porte son accessoire partout où on le dessine ; l\'œuf n\'en porte pas', () => {
  const profile = { chest: { accessories: ['crown'], equipped: 'crown' } };
  const egg = withAccessory({ animal: 'cat', name: '', hatched: false, games: 0, stars: 0 }, profile);
  assert.equal(egg.accessory, undefined);
  const pet = withAccessory({ animal: 'bunny', name: 'Pompon', hatched: true, games: 4, stars: 25 }, profile);
  assert.equal(pet.accessory, 'crown');
  assert.equal(companionSpec(pet).accessory, 'crown');
  assert.equal(companionSpec(pet, { stage: 4 }).accessory, 'crown');
  assert.equal(companionSpec({ ...pet, accessory: undefined }).accessory, undefined);
  assert.equal(companionSpec({ ...egg, accessory: 'crown' }).accessory, undefined, 'même mal donné, l\'œuf reste nu');
  assert.deepEqual(kawaiiErrors(companionSpec(pet)), []);
});

// --- Mots affichés ---------------------------------------------------------------------------------

test('les mots du contenu : clairs, positifs, et mènent au bon écran', () => {
  const sticker = prizeText({ rarity: 'common', prize: { kind: 'sticker', island: 'mots', sticker: STICKERS.mots[0], duplicate: false } }, {});
  assert.equal(sticker.title, 'Une gommette !');
  assert.equal(sticker.name, 'Livre ouvert');
  assert.equal(sticker.link.href, '#/album');
  const gold = prizeText({ rarity: 'rare', prize: { kind: 'accessory', accessory: accessoryInfo('crown') } }, { hatched: true });
  assert.equal(gold.title, 'Un objet doré rare !');
  assert.equal(gold.name, 'La couronne dorée');
  assert.equal(gold.link.href, '#/compagnon');
  assert.match(gold.hint, /compagnon/);
  const egg = prizeText({ rarity: 'uncommon', prize: { kind: 'accessory', accessory: accessoryInfo('bow') } }, { hatched: false });
  assert.match(egg.hint, /œuf/);
  const dup = prizeText({ rarity: 'common', prize: { kind: 'sticker', island: 'mots', sticker: STICKERS.mots[1], duplicate: true } }, {});
  assert.match(dup.title, /Bravo/);
});

// --- Branchement sur le moteur ------------------------------------------------------------------

function fakeGame(extra = {}) {
  return {
    id: 'faux', title: 'Faux jeu', island: 'mots', levels: [{ label: 'Niveau 1' }],
    makeQuestion(level, rng, seen) {
      return { key: `faux:${seen.size}`, type: 'choice', prompt: 'Réponds.', answer: 'oui', display: {} };
    },
    ...extra,
  };
}

function setup(seed = 11) {
  const store = createStore(createStorage({ backend: createMemoryBackend() }));
  store.setProfile(defaultProfile({ id: 'p1' }));
  const events = createEmitter();
  resetRewardsForTests();
  resetChestForTests();
  installRewards({ store, profileId: 'p1' }, { events });
  let n = seed;
  installChest({ store, profileId: 'p1' }, { events, rng: () => createRng(n++) });
  return { store, events };
}

function play(game, events, outcomes) {
  const session = createSession(game, 1, { events, count: outcomes.length, record: null });
  for (const ok of outcomes) { session.answer(ok ? 'oui' : 'non'); session.next(); }
  return session;
}

beforeEach(() => { resetRewardsForTests(); resetChestForTests(); });

test('une partie réussie donne un coffre rangé dans le profil, la gommette vient de lui', () => {
  const { store, events } = setup();
  const session = play(fakeGame(), events, [true, true, true, true]);
  const draw = chestSummary(session);
  assert.equal(draw.tier, 'dore');
  const profile = store.getProfile('p1');
  assert.equal(readChest(profile).opened, 1);
  if (draw.prize.kind === 'sticker') {
    assert.deepEqual(readRewards(profile).stickers.mots, [draw.prize.sticker.id]);
    assert.deepEqual(readChest(profile).accessories, []);
  } else {
    assert.deepEqual(readChest(profile).accessories, [draw.prize.accessory.id]);
    assert.deepEqual(readRewards(profile).stickers.mots, []);
  }
});

test('sans étoile : pas de coffre, mais les points restent', () => {
  const { store, events } = setup();
  const session = play(fakeGame(), events, [false, false, false, false]);
  assert.equal(chestSummary(session), null);
  assert.equal(readChest(store.getProfile('p1')).opened, 0);
  assert.ok(readRewards(store.getProfile('p1')).points > 0);
});

test('au fil des parties : jamais de doublon, puis la collection se complète', () => {
  const { store, events } = setup(5);
  const seen = new Set();
  const total = islandStickers('mots').length + ACCESSORIES.length;
  for (let i = 0; i < total; i++) {
    const draw = chestSummary(play(fakeGame(), events, [true, true, true, true]));
    assert.equal(draw.prize.duplicate, false);
    const id = draw.prize.kind === 'sticker' ? `s:${draw.prize.sticker.id}` : `a:${draw.prize.accessory.id}`;
    assert.ok(!seen.has(id), id);
    seen.add(id);
  }
  const profile = store.getProfile('p1');
  assert.equal(readRewards(profile).stickers.mots.length, islandStickers('mots').length);
  assert.equal(readChest(profile).accessories.length, ACCESSORIES.length);
  assert.equal(readChest(profile).opened, total);
  const extra = chestSummary(play(fakeGame(), events, [true, true, true, true]));
  assert.equal(extra.prize.duplicate, true);
  assert.equal(readRewards(store.getProfile('p1')).stickers.mots.length, islandStickers('mots').length, 'rien de plus rangé');
});

test('le défi du jour : un seul coffre par jour, dans l\'île désignée', () => {
  const { store, events } = setup();
  const game = fakeGame({ id: 'defi', island: 'defi', rewardIsland: 'monde', daily: { key: '2026-10-07' } });
  const first = chestSummary(play(game, events, [true, true]));
  assert.ok(first);
  if (first.prize.kind === 'sticker') assert.deepEqual(readRewards(store.getProfile('p1')).stickers.monde, [first.prize.sticker.id]);
  const again = chestSummary(play(game, events, [true, true]));
  assert.equal(again, null, 'le défi n\'est récompensé qu\'une fois par jour');
});

test('un stockage indisponible ne casse pas la partie', () => {
  const store = createStore(createStorage({ backend: null }));
  const events = createEmitter();
  resetRewardsForTests();
  resetChestForTests();
  installRewards({ store, profileId: 'p1' }, { events });
  installChest({ store, profileId: 'p1' }, { events });
  const session = play(fakeGame(), events, [true, true, true]);
  assert.equal(session.result.score, 3);
});

test('saveChest écrit dans le profil et renvoie ce qui est enregistré', () => {
  const store = createStore(createStorage({ backend: createMemoryBackend() }));
  store.setProfile(defaultProfile({ id: 'p1' }));
  const saved = saveChest(store, 'p1', (c) => collect(c, { kind: 'accessory', accessory: accessoryInfo('hat') }));
  assert.deepEqual(saved, { accessories: ['hat'], equipped: null, opened: 1 });
  assert.deepEqual(readChest(store.getProfile('p1')), saved);
});
