// Le compagnon qui grandit (#90) : stades, seuils, noms, branchement sur le moteur, profil.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAMES_TO_CRACK, GAMES_TO_HATCH, STAGE_STARS, MAX_NAME, COMPANION_ANIMALS, STAGE_LABELS,
  defaultCompanion, normalizeCompanion, readCompanion, stageOf, readyToHatch, progressOf, progressText,
  addRun, hatch, customize, cleanCompanionName, nameOrDefault, saveCompanion,
} from '../js/core/companion.js';
import { companionSpec, companionReaction, companionEndFace } from '../js/core/ui/companion.js';
import { kawaiiErrors, ANIMALS, FACES, ONE_SHOTS } from '../js/core/ui/art/kawaii.js';
import { createEmitter, createSession } from '../js/core/engine.js';
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
  c = addRun(c, { stars: 1 }).companion;
  assert.equal(stageOf(c), 0);
  const second = addRun(c, { stars: 2 });
  assert.equal(second.cracked, true);
  assert.equal(second.ready, false);
  assert.equal(stageOf(second.companion), 1);
  const third = addRun(second.companion, { stars: 0 });
  assert.equal(third.ready, true);
  assert.equal(third.cracked, false);
  assert.equal(readyToHatch(third.companion), true);
  assert.equal(GAMES_TO_CRACK < GAMES_TO_HATCH, true);
  // Une quatrième partie sans éclosion ne refait pas d'annonce.
  const fourth = addRun(third.companion, { stars: 3 });
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
  assert.equal(hatch(egg, { animal: 'bear', name: '   ' }).name, 'Nougat');
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

test('addRun : les étoiles s\'ajoutent (3 au plus par partie) et le compagnon grandit', () => {
  const near = hatched({ stars: 18 });
  const r = addRun(near, { stars: 2 });
  assert.equal(r.companion.stars, 20);
  assert.equal(r.grew, true);
  assert.equal(r.stage, 3);
  assert.equal(addRun(near, { stars: 99 }).companion.stars, 21);
  assert.equal(addRun(near, { stars: -4 }).companion.stars, 18);
  assert.equal(addRun(hatched({ stars: 3 }), { stars: 1 }).grew, false);
});

test('addRun est pure : l\'entrée n\'est pas modifiée', () => {
  const c = Object.freeze(hatched({ stars: 5 }));
  addRun(c, { stars: 2 });
  assert.equal(c.stars, 5);
});

test('une partie à 0 étoile compte quand même pour l\'éclosion (jamais de partie « perdue »)', () => {
  let c = defaultCompanion();
  for (let i = 0; i < GAMES_TO_HATCH; i++) c = addRun(c, { stars: 0 }).companion;
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

test('customize : change l\'animal et le nom d\'un compagnon éclos, sans toucher au reste', () => {
  const c = hatched({ stars: 25, games: 9 });
  const bunny = customize(c, { animal: 'bunny' });
  assert.equal(bunny.animal, 'bunny');
  assert.equal(bunny.name, 'Minou');
  assert.equal(bunny.stars, 25);
  assert.equal(stageOf(bunny), 3);
  assert.equal(customize(c, { name: 'Zouzou' }).name, 'Zouzou');
  assert.equal(customize(c, { animal: 'bear', name: '' }).name, 'Nougat');
  assert.deepEqual(customize(defaultCompanion(), { animal: 'bear', name: 'X' }), defaultCompanion());
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
    id: 'faux', title: 'Faux jeu', island: 'mots', levels: [{ label: 'Niveau 1' }],
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
  const session = playGame(events, 10);
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
  saveCompanion(store, 'p1', () => hatched({ name: 'Lulu', stars: 18 }));
  const s = playGame(events, 10);
  assert.equal(companionSummary(s).grew, true);
  assert.ok(s.result.extras.some((x) => x.text === 'Lulu a grandi !'));
  assert.equal(stageOf(readCompanion(store.getProfile('p1'))), 3);
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
