// Le compagnon qui grandit (#90) : stades, seuils, noms, branchement sur le moteur, profil.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAMES_TO_CRACK, GAMES_TO_HATCH, STAGE_STARS, MAX_NAME, COMPANION_ANIMALS, STAGE_LABELS,
  defaultCompanion, normalizeCompanion, readCompanion, stageOf, readyToHatch, progressOf, progressText,
  addRun, hatch, customize, companionFloor, companionStars, adopt, adoptable, animalUnlocked, STARTER_ANIMALS, cleanCompanionName, nameOrDefault, saveCompanion,
} from '../js/core/companion.js';
import { companionSpec, companionReaction, companionEndFace } from '../js/core/ui/companion.js';
import { kawaiiErrors, ANIMALS, FACES, ONE_SHOTS } from '../js/core/ui/art/kawaii.js';
import { createEmitter, createSession } from '../js/core/engine.js';
import { recordResult } from '../js/core/history.js';
import { totalStars } from '../js/core/rewards.js';
import { createMemoryBackend, createStorage, createStore, defaultProfile } from '../js/core/storage.js';
import { installCompanion, companionSummary, currentCompanion, resetCompanionForTests } from '../js/core/companion-live.js';

const hatched = (extra = {}) => ({ animal: 'cat', name: 'Minou', hatched: true, games: 5, stars: 0, ...extra });

test('un œuf tout neuf : stade 0, pas prêt, aucun nom', () => {
  const c = defaultCompanion();
  assert.deepEqual(c, { animal: 'cat', name: '', hatched: false, games: 0, stars: 0 });
  assert.equal(stageOf(c), 0);
  assert.equal(readyToHatch(c), false);
});

test('l\'œuf se fête après 2 parties et est prêt à éclore après 3', () => {
  let c = defaultCompanion();
  c = addRun(c, {}).companion;
  assert.equal(stageOf(c), 0);
  const second = addRun(c, {});
  assert.equal(second.cracked, true);
  assert.equal(second.ready, false);
  assert.equal(stageOf(second.companion), 1);
  const third = addRun(second.companion, {});
  assert.equal(third.ready, true);
  assert.equal(third.cracked, false);
  assert.equal(readyToHatch(third.companion), true);
  assert.equal(GAMES_TO_CRACK < GAMES_TO_HATCH, true);
  // Une quatrième partie sans éclosion ne refait pas d'annonce.
  const fourth = addRun(third.companion, {});
  assert.equal(fourth.ready, false);
  assert.equal(fourth.cracked, false);
});

test('l\'éclosion garde l\'œuf tant que l\'enfant n\'a pas choisi, même avec beaucoup d\'étoiles', () => {
  const c = { ...defaultCompanion(), games: 40, stars: 100 };
  assert.equal(stageOf(c), 1);
  assert.equal(readyToHatch(c), true);
});

test('hatch : l\'animal et le nom sont pris en compte, le nom est filtré', () => {
  const egg = { ...defaultCompanion(), games: GAMES_TO_HATCH, stars: 5 };
  const c = hatch(egg, { animal: 'bunny', name: '  <b>Pom</b>  pon  ' });
  assert.equal(c.hatched, true);
  assert.equal(c.animal, 'bunny');
  assert.equal(c.name, 'bPomb pon');
  assert.equal(c.games, GAMES_TO_HATCH);
  assert.equal(c.stars, 5);
  assert.equal(stageOf(c), 2);
});

test('hatch : sans nom, le nom proposé de l\'animal est utilisé ; animal inconnu → chat', () => {
  const egg = { ...defaultCompanion(), games: GAMES_TO_HATCH };
  // L'ourson n'est pas encore débloqué : l'éclosion donne le chat.
  assert.equal(hatch(egg, { animal: 'bear', name: '   ' }).name, 'Minou');
  assert.equal(hatch({ ...egg, stars: 30 }, { animal: 'bear', name: '   ' }).name, 'Nougat');
  assert.equal(hatch(egg, { animal: 'bunny', name: '' }).name, 'Pompon');
  const odd = hatch(egg, { animal: 'dragon', name: '' });
  assert.equal(odd.animal, 'cat');
  assert.equal(odd.name, 'Minou');
});

test('hatch est sans effet si l\'œuf n\'est pas prêt ou déjà éclos', () => {
  const young = { ...defaultCompanion(), games: GAMES_TO_HATCH - 1 };
  assert.deepEqual(hatch(young, { animal: 'bear', name: 'Zou' }), young);
  const done = hatched();
  assert.deepEqual(hatch(done, { animal: 'bear', name: 'Zou' }), done);
});

test('seuils des stades après l\'éclosion : 2 → 3 à 20 étoiles → 4 à 60', () => {
  assert.equal(stageOf(hatched({ stars: 0 })), 2);
  assert.equal(stageOf(hatched({ stars: STAGE_STARS[3] - 1 })), 2);
  assert.equal(stageOf(hatched({ stars: STAGE_STARS[3] })), 3);
  assert.equal(stageOf(hatched({ stars: STAGE_STARS[4] - 1 })), 3);
  assert.equal(stageOf(hatched({ stars: STAGE_STARS[4] })), 4);
  assert.equal(stageOf(hatched({ stars: 9999 })), 4);
  assert.deepEqual(STAGE_STARS, { 2: 0, 3: 20, 4: 60 });
});

test('un rythme régulier (≈ 10 étoiles par semaine) fait grandir en quelques semaines', () => {
  assert.ok(STAGE_STARS[3] / 10 <= 3, 'stade 3 en 3 semaines au plus');
  assert.ok(STAGE_STARS[4] / 10 <= 8, 'stade 4 en 8 semaines au plus');
});

test('addRun : le compagnon suit les étoiles de la carte (#105), il ne les additionne pas', () => {
  const near = hatched({ stars: 18 });
  const r = addRun(near, { totalStars: 20 });
  assert.equal(r.companion.stars, 20);
  assert.equal(r.grew, true);
  assert.equal(r.stage, 3);
  // Rejouer sans rien gagner de plus : aucune étoile en plus.
  assert.equal(addRun(r.companion, { totalStars: 20 }).companion.stars, 20);
  assert.equal(addRun(r.companion, { totalStars: 20 }).grew, false);
  // Jamais de recul, même si le total lu est plus petit.
  assert.equal(addRun(near, { totalStars: 3 }).companion.stars, 18);
  assert.equal(addRun(near, { totalStars: -4 }).companion.stars, 18);
  assert.equal(addRun(near, {}).companion.stars, 18);
  assert.equal(addRun(hatched({ stars: 3 }), { totalStars: 4 }).grew, false);
});

test('addRun est pure : l\'entrée n\'est pas modifiée', () => {
  const c = Object.freeze(hatched({ stars: 5 }));
  addRun(c, { totalStars: 9 });
  assert.equal(c.stars, 5);
});

test('une partie à 0 étoile compte quand même pour l\'éclosion (jamais de partie « perdue »)', () => {
  let c = defaultCompanion();
  for (let i = 0; i < GAMES_TO_HATCH; i++) c = addRun(c, {}).companion;
  assert.equal(readyToHatch(c), true);
});

test('progression : avant l\'éclosion en parties, ensuite en étoiles, plein au dernier stade', () => {
  assert.deepEqual(progressOf(defaultCompanion()), { stage: 0, next: 2, unit: 'games', left: 3, ratio: 0 });
  const mid = progressOf({ ...defaultCompanion(), games: 2 });
  assert.equal(mid.left, 1);
  assert.equal(progressOf(hatched({ stars: 10 })).left, 10);
  assert.equal(progressOf(hatched({ stars: 10 })).ratio, 0.5);
  assert.equal(progressOf(hatched({ stars: 20 })).left, 40);
  assert.equal(progressOf(hatched({ stars: 20 })).ratio, 0);
  assert.deepEqual(progressOf(hatched({ stars: 60 })), { stage: 4, next: null, unit: 'stars', left: 0, ratio: 1 });
  for (const stars of [0, 1, 19, 20, 59, 60, 500]) {
    const p = progressOf(hatched({ stars }));
    assert.ok(p.ratio >= 0 && p.ratio <= 1, `ratio ${stars}`);
  }
});

test('textes de progression : bienveillants, avec le bon accord', () => {
  assert.equal(progressText(defaultCompanion()), 'Encore 3 parties avant que l\'œuf éclose.');
  assert.equal(progressText({ ...defaultCompanion(), games: 2 }), 'Encore 1 partie avant que l\'œuf éclose.');
  assert.equal(progressText({ ...defaultCompanion(), games: 3 }), 'Ton œuf est prêt à éclore !');
  assert.equal(progressText(hatched({ stars: 19 })), 'Encore 1 étoile avant de grandir.');
  assert.equal(progressText(hatched({ stars: 18 })), 'Encore 2 étoiles avant de grandir.');
  assert.equal(progressText(hatched({ stars: 60 })), 'Il est tout grand !');
  const all = [defaultCompanion(), hatched(), hatched({ stars: 60 })].map(progressText).join(' ');
  assert.doesNotMatch(all, /triste|perdu|manqu|oubli|absent|mort|fâch|dommage/i);
});

test('le compagnon ne dépend pas du temps : aucune date, aucune perte avec l\'absence', () => {
  const c = hatched({ stars: 30 });
  assert.deepEqual(Object.keys(c).sort(), ['animal', 'games', 'hatched', 'name', 'stars']);
  assert.equal(stageOf(c), 3);   // identique le lendemain ou dans trois mois : rien ne décroît
});

test('customize : change le nom seulement ; l\'animal ne se change plus à volonté (#105)', () => {
  const c = hatched({ stars: 25, games: 9 });
  assert.equal(customize(c, { name: 'Zouzou' }).name, 'Zouzou');
  assert.equal(customize(c, { name: '' }).name, 'Minou');
  assert.deepEqual(customize(c, { animal: 'bunny' }), c);
  assert.equal(customize(c, { animal: 'bear', name: 'Zou' }).animal, 'cat');
  assert.deepEqual(customize(defaultCompanion(), { name: 'X' }), defaultCompanion());
});

test('animaux : chat et lapin d\'emblée, l\'ourson se débloque à 30 étoiles', () => {
  assert.deepEqual(STARTER_ANIMALS.map((a) => a.id), ['cat', 'bunny']);
  assert.equal(animalUnlocked('cat', 0), true);
  assert.equal(animalUnlocked('bear', 29), false);
  assert.equal(animalUnlocked('bear', 30), true);
  assert.equal(animalUnlocked('dragon', 999), false);
});

test('adopt : un animal-récompense débloqué, explicitement ; sinon rien ne change', () => {
  const locked = hatched({ stars: 29 });
  assert.deepEqual(adoptable(locked), []);
  assert.deepEqual(adopt(locked, { animal: 'bear' }), locked);
  const ready = hatched({ stars: 30, games: 12 });
  assert.deepEqual(adoptable(ready).map((a) => a.id), ['bear']);
  const bear = adopt(ready, { animal: 'bear' });
  assert.equal(bear.animal, 'bear');
  assert.equal(bear.name, 'Nougat');   // il portait encore le nom proposé : il prend celui du nouvel animal
  assert.equal(bear.stars, 30);        // les étoiles le suivent
  assert.equal(bear.games, 12);
  assert.equal(stageOf(bear), stageOf(ready));
  assert.equal(adopt(hatched({ name: 'Lulu', stars: 40 }), { animal: 'bear' }).name, 'Lulu');   // un nom choisi est gardé
  // Ni vers un animal de départ, ni vers le sien, ni avant l'éclosion.
  assert.deepEqual(adopt(ready, { animal: 'bunny' }), ready);
  assert.deepEqual(adopt(bear, { animal: 'bear' }), bear);
  assert.deepEqual(adoptable(bear), []);
  const egg = { ...defaultCompanion(), games: 3, stars: 99 };
  assert.deepEqual(adopt(egg, { animal: 'bear' }), egg);
});

test('noms : filtrés, 12 caractères au plus, lettres accentuées conservées', () => {
  assert.equal(cleanCompanionName('  Câlin   doux '), 'Câlin doux');
  assert.equal(cleanCompanionName('Zoé-Léa'), 'Zoé-Léa');
  assert.equal(cleanCompanionName('L\'ours'), 'L\'ours');
  assert.equal(cleanCompanionName('<script>alert(1)</script>'), 'scriptalert1');
  assert.equal(cleanCompanionName('a'.repeat(40)).length, MAX_NAME);
  assert.equal(cleanCompanionName('😀😀'), '');
  assert.equal(cleanCompanionName('\u0000\n\t'), '');
  assert.equal(cleanCompanionName(null), '');
  assert.equal(cleanCompanionName(42), '42');
  assert.equal(nameOrDefault('', 'bunny'), 'Pompon');
  assert.equal(nameOrDefault('Lulu', 'bunny'), 'Lulu');
  for (const a of COMPANION_ANIMALS) assert.equal(cleanCompanionName(a.defaultName), a.defaultName);
});

test('normalizeCompanion : absent, abîmé ou piégé → un œuf propre', () => {
  for (const raw of [undefined, null, 0, 'x', [], {}, { hatched: 'oui' }]) {
    assert.deepEqual(normalizeCompanion(raw), defaultCompanion(), JSON.stringify(raw));
  }
  const odd = normalizeCompanion({ animal: '__proto__', hatched: true, name: '<i>', games: -3, stars: NaN });
  assert.deepEqual(odd, { animal: 'cat', name: 'i', hatched: true, games: 0, stars: 0 });
  assert.equal(normalizeCompanion({ animal: 'bear', hatched: true, name: '', games: 3.9, stars: 7.2 }).name, 'Nougat');
  assert.equal(normalizeCompanion({ animal: 'bear', hatched: true, games: 3.9 }).games, 3);
  // Un œuf n'a pas de nom, même si le fichier en contient un.
  assert.equal(normalizeCompanion({ hatched: false, name: 'Intrus' }).name, '');
  assert.equal(readCompanion(undefined).hatched, false);
  assert.equal(readCompanion({ companion: { hatched: true, animal: 'bunny' } }).animal, 'bunny');
});

test('chaque stade de chaque animal est un dessin valide du kit', () => {
  for (const a of COMPANION_ANIMALS) {
    assert.ok(ANIMALS.includes(a.id), a.id);
    for (let stage = 0; stage <= 4; stage++) {
      const spec = companionSpec({ animal: a.id, name: a.defaultName, hatched: stage >= 2, games: 3, stars: 0 }, { stage });
      assert.deepEqual(kawaiiErrors(spec), [], `${a.id} stade ${stage}`);
    }
  }
  assert.equal(STAGE_LABELS.length, 5);
});

test('companionSpec : l\'œuf n\'a pas de nom, le compagnon éclos oui ; décoratif sur demande', () => {
  const egg = companionSpec(defaultCompanion());
  assert.equal(egg.body, 'egg');
  assert.equal(egg.name, undefined);
  const cat = companionSpec(hatched({ stars: 25 }));
  assert.equal(cat.body, 'cat');
  assert.equal(cat.name, 'Minou');
  assert.equal(cat.decorative, undefined);
  assert.equal(companionSpec(hatched(), { decorative: true }).decorative, true);
});

test('réactions : jamais triste ; l\'œuf frémit aux bonnes réponses seulement', () => {
  assert.deepEqual(companionReaction(true, hatched()), { face: 'joyful', motion: 'jump' });
  assert.deepEqual(companionReaction(false, hatched()), { face: 'cheering', motion: 'wiggle' });
  assert.deepEqual(companionReaction(true, defaultCompanion()), { face: 'happy', motion: 'wiggle' });
  assert.equal(companionReaction(false, defaultCompanion()), null);
  for (const c of [defaultCompanion(), hatched()]) {
    for (const ok of [true, false]) {
      const r = companionReaction(ok, c);
      if (r) { assert.ok(FACES.includes(r.face)); assert.ok(ONE_SHOTS.includes(r.motion)); }
    }
  }
  assert.equal(companionEndFace(3, hatched()), 'joyful');
  assert.equal(companionEndFace(0, hatched()), 'cheering');
  assert.equal(companionEndFace(3, defaultCompanion()), undefined);
});

// --- Branchement sur le moteur ------------------------------------------------------------------

function fakeGame() {
  return {
    id: 'faux', title: 'Faux jeu', island: 'mots', levels: [{ label: 'Niveau 1' }, { label: 'Niveau 2' }, { label: 'Niveau 3' }],
    makeQuestion(level, rng, seen) {
      return { key: `faux:${seen.size}`, type: 'choice', prompt: 'Réponds.', answer: 'oui', display: {} };
    },
  };
}

/** Questions toutes identiques à l'écran (seule la clé change) : l'avis de doublon est attendu ici. */
function createSessionQuiet(...args) {
  const origWarn = console.warn;
  console.warn = () => {};
  try { return createSession(...args); } finally { console.warn = origWarn; }
}

function setup() {
  const store = createStore(createStorage({ backend: createMemoryBackend() }));
  store.setProfile(defaultProfile({ id: 'p1' }));
  const events = createEmitter();
  resetCompanionForTests();
  installCompanion({ store, profileId: 'p1' }, { events });
  return { store, events };
}

/** Partie jouée comme dans l'appli : `record` écrit dans `progress` AVANT l'événement « end ». */
function playRecorded(store, events, goods, { level = 1, total = 10 } = {}) {
  const record = (result) => recordResult(store, 'p1', result);
  const session = createSessionQuiet(fakeGame(), level, { events, count: total, record });
  for (let i = 0; i < total; i++) {
    session.answer(i < goods ? 'oui' : 'non');
    session.next();
  }
  return session;
}

function playGame(events, goods, total = 10) {
  const session = createSessionQuiet(fakeGame(), 1, { events, count: total, record: null });
  for (let i = 0; i < total; i++) {
    session.answer(i < goods ? 'oui' : 'non');
    session.next();
  }
  return session;
}

beforeEach(() => resetCompanionForTests());

test('un profil neuf a un œuf', () => {
  assert.deepEqual(defaultProfile({ id: 'x' }).companion, defaultCompanion());
});

test('une partie terminée fait avancer l\'œuf et l\'écrit dans le profil', () => {
  const { store, events } = setup();
  const session = playRecorded(store, events, 10);
  const c = readCompanion(store.getProfile('p1'));
  assert.equal(c.games, 1);
  assert.equal(c.stars, 3);
  assert.equal(companionSummary(session).companion.games, 1);
  assert.deepEqual(currentCompanion(), c);
});

test('la 3e partie annonce l\'éclosion dans l\'écran de fin, sans point ni reproche', () => {
  const { events } = setup();
  playGame(events, 0);
  playGame(events, 0);
  const s = createSessionQuiet(fakeGame(), 1, { events, count: 1, record: null });
  s.answer('oui');
  s.next();
  assert.equal(companionSummary(s).ready, true);
  assert.ok(s.result.extras.some((x) => /éclore/.test(x.text)));
  assert.ok(s.result.extras.every((x) => !/triste|perdu/i.test(x.text)));
});

test('un compagnon éclos qui grandit le dit à la fin de la partie, avec son nom', () => {
  const { store, events } = setup();
  // 18 étoiles déjà sur la carte (autres jeux) ; le plancher du compagnon est à 18.
  store.updateProfile('p1', (p) => ({ ...p, progress: { autre: { best: { 1: { stars: 3 }, 2: { stars: 3 }, 3: { stars: 3 } }, plays: 3 }, encore: { best: { 1: { stars: 3 }, 2: { stars: 3 }, 3: { stars: 3 } }, plays: 3 } } }));
  saveCompanion(store, 'p1', () => hatched({ name: 'Lulu', stars: 18 }));
  const s = playRecorded(store, events, 10, { level: 1 });   // +3 étoiles sur la carte : 21
  assert.equal(companionSummary(s).grew, true);
  assert.ok(s.result.extras.some((x) => x.text === 'Lulu a grandi !'));
  assert.equal(stageOf(readCompanion(store.getProfile('p1'))), 3);
});

test('#105 : rejouer un niveau déjà à 3 étoiles ne rapporte aucune étoile au compagnon', () => {
  const { store, events } = setup();
  saveCompanion(store, 'p1', () => hatched({ name: 'Lulu', stars: 0 }));
  playRecorded(store, events, 10);
  assert.equal(readCompanion(store.getProfile('p1')).stars, 3);
  for (let i = 0; i < 10; i++) playRecorded(store, events, 10);
  const c = readCompanion(store.getProfile('p1'));
  assert.equal(c.stars, 3, 'dix parties de plus : toujours 3 étoiles, pas 33');
  assert.equal(c.stars, totalStars(store.getProfile('p1').progress), 'un seul compte, celui de la carte');
  assert.equal(c.games, 16);   // 5 déjà jouées + 11 : les parties comptent toujours pour l'œuf
});

test('#105 : un niveau à 2 étoiles qui passe à 3 rapporte exactement 1 étoile', () => {
  const { store, events } = setup();
  saveCompanion(store, 'p1', () => hatched({ name: 'Lulu', stars: 0 }));
  playRecorded(store, events, 8);    // 80 % : 2 étoiles
  assert.equal(readCompanion(store.getProfile('p1')).stars, 2);
  playRecorded(store, events, 7);    // moins bien : rien
  assert.equal(readCompanion(store.getProfile('p1')).stars, 2);
  playRecorded(store, events, 10);   // mieux : 3 étoiles, donc +1
  assert.equal(readCompanion(store.getProfile('p1')).stars, 3);
  assert.equal(totalStars(store.getProfile('p1').progress), 3);
});

test('#105 : un compagnon d’avant (somme gonflée) ne rapetisse pas, puis repart des vraies étoiles', () => {
  const { store, events } = setup();
  // Avant #105 : 45 « étoiles » cumulées (stade 3) alors que la carte n'en compte que 3.
  store.updateProfile('p1', (p) => ({
    ...p, schemaVersion: 2, progress: { faux: { best: { 1: { stars: 3 } }, plays: 15 } },
    companion: hatched({ stars: 45, games: 15 }),
  }));
  const migrated = store.getProfile('p1');
  assert.equal(migrated.schemaVersion, 3);
  assert.equal(stageOf(readCompanion(migrated)), 3, 'le stade atteint est gardé');
  assert.equal(migrated.companion.stars, STAGE_STARS[3]);
  assert.equal(progressOf(readCompanion(migrated)).ratio, 0, 'la barre repart du début du stade, sans reculer de stade');
  // Il ne grandit plus en rejouant, et ne régresse jamais.
  for (let i = 0; i < 5; i++) playRecorded(store, events, 10);
  assert.equal(stageOf(readCompanion(store.getProfile('p1'))), 3);
  assert.equal(readCompanion(store.getProfile('p1')).stars, STAGE_STARS[3]);
});

test('#105 migration : œuf, compagnon sans excès, et étoiles de la carte déjà supérieures', () => {
  const store = createStore(createStorage({ backend: createMemoryBackend() }));
  const old = (extra) => ({ ...defaultProfile({ id: 'q' }), schemaVersion: 2, ...extra });
  // Un œuf : le plancher reste à 0.
  store.setProfile(old({ companion: { ...defaultCompanion(), games: 2, stars: 40 } }));
  assert.equal(store.getProfile('q').companion.stars, 0);
  // Une carte plus riche que le stade : on prend les étoiles de la carte.
  store.setProfile(old({
    progress: { a: { best: { 1: { stars: 3 }, 2: { stars: 3 }, 3: { stars: 3 } } }, b: { best: { 1: { stars: 3 }, 2: { stars: 3 }, 3: { stars: 3 } } }, c: { best: { 1: { stars: 3 } } } },
    companion: hatched({ stars: 5 }),
  }));
  assert.equal(store.getProfile('q').companion.stars, 21);
  assert.equal(companionFloor(hatched({ stars: 9999 }), {}), STAGE_STARS[4]);
  assert.equal(companionFloor(hatched({ stars: 7 }), {}), 0);
  assert.equal(companionStars(hatched({ stars: 7 }), undefined), 7);
  // Rejouer la migration ne change plus rien.
  const once = store.getProfile('q');
  store.setProfile(once);
  assert.deepEqual(store.getProfile('q').companion, once.companion);
});

test('un profil existant sans champ companion reçoit un œuf puis avance', () => {
  const { store, events } = setup();
  store.updateProfile('p1', (p) => { const { companion, ...old } = p; return old; });
  assert.equal(store.getProfile('p1').companion, undefined);
  assert.deepEqual(readCompanion(store.getProfile('p1')), defaultCompanion());
  playGame(events, 7);
  assert.equal(readCompanion(store.getProfile('p1')).games, 1);
});

test('sans contexte, le compagnon n\'écrit rien et ne plante pas', () => {
  resetCompanionForTests();
  assert.equal(currentCompanion().hatched, false);
  const events = createEmitter();
  installCompanion(null, { events });
  assert.doesNotThrow(() => playGame(events, 5));
});
