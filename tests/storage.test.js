import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PREFIX, SCHEMA_VERSION, createMemoryBackend, createStorage, createStore, migrate, defaultMeta,
} from '../js/core/storage.js';
import { ensureActiveProfile, createProfile } from '../js/core/profile.js';

/** Faux localStorage qui lève une exception à chaque accès (stockage bloqué). */
const throwingBackend = () => ({
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('SecurityError'); },
  removeItem() { throw new Error('SecurityError'); },
  key() { throw new Error('SecurityError'); },
  get length() { throw new Error('SecurityError'); },
});

test('lit et écrit du JSON sous le préfixe jeux-ce1:', () => {
  const backend = createMemoryBackend();
  const kv = createStorage({ backend });
  assert.equal(kv.available, true);
  assert.equal(kv.write('a', { x: 1 }), true);
  assert.equal(backend.getItem(`${PREFIX}a`), '{"x":1}');
  assert.deepEqual(kv.read('a'), { x: 1 });
  assert.equal(kv.read('absent', 'défaut'), 'défaut');
  backend.setItem('autre-site:cle', '1');
  assert.deepEqual(kv.keys(), ['a']);
  kv.remove('a');
  assert.equal(kv.read('a'), null);
});

test('une valeur illisible renvoie la valeur par défaut', () => {
  const backend = createMemoryBackend({ [`${PREFIX}cassé`]: '{pas du json' });
  const kv = createStorage({ backend });
  assert.equal(kv.read('cassé', 42), 42);
});

test('stockage indisponible : fonctionne en mémoire, sans exception', () => {
  for (const backend of [null, throwingBackend()]) {
    const kv = createStorage({ backend });
    assert.equal(kv.available, false);
    assert.equal(kv.status(), 'unavailable');
    assert.equal(kv.write('a', 1), false);
    assert.equal(kv.read('a'), 1);   // la session continue de fonctionner
    const store = createStore(kv);
    const id = ensureActiveProfile(store);
    assert.equal(store.getMeta().activeProfileId, id);
    assert.ok(store.getProfile(id));
  }
});

test('quota dépassé : la valeur reste disponible en mémoire et le statut le signale', () => {
  const backend = createMemoryBackend();
  const kv = createStorage({ backend });
  backend.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(kv.write('gros', { a: 1 }), false);
  assert.equal(kv.status(), 'error');
  assert.deepEqual(kv.read('gros'), { a: 1 });
});

test('migrate applique les étapes dans l\'ordre', () => {
  const steps = {
    0: (d) => ({ ...d, a: 1 }),
    1: (d) => ({ ...d, b: d.a + 1 }),
    2: (d) => ({ ...d, c: d.b + 1 }),
  };
  assert.deepEqual(migrate({}, steps, 3), { a: 1, b: 2, c: 3, schemaVersion: 3 });
  assert.deepEqual(migrate({ schemaVersion: 2, b: 10 }, steps, 3), { b: 10, c: 11, schemaVersion: 3 });
  const recent = { schemaVersion: 9 };
  assert.equal(migrate(recent, steps, 3), recent);   // plus récent que le code : intact
  assert.throws(() => migrate({ schemaVersion: 1 }, { 0: (d) => d }, 3), /Migration manquante/);
});

test('le store migre un ancien document à la lecture et le réécrit', () => {
  const backend = createMemoryBackend({
    [`${PREFIX}meta`]: JSON.stringify({ profiles: [{ id: 'p1' }], activeProfileId: 'p1' }),
    [`${PREFIX}profile:p1`]: JSON.stringify({ id: 'p1', name: 'Léa' }),
  });
  const store = createStore(createStorage({ backend }));
  const meta = store.getMeta();
  assert.equal(meta.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(meta.settings, defaultMeta().settings);
  assert.equal(JSON.parse(backend.getItem(`${PREFIX}meta`)).schemaVersion, SCHEMA_VERSION);
  const profile = store.getProfile('p1');
  assert.equal(profile.name, 'Léa');
  assert.deepEqual(profile.history, []);
  assert.deepEqual(profile.progress, {});
});

test('le store suit une future migration v1 → v2', () => {
  const backend = createMemoryBackend({
    [`${PREFIX}profile:p1`]: JSON.stringify({ schemaVersion: 1, id: 'p1', points: 5 }),
  });
  const store = createStore(createStorage({ backend }), {
    version: 2,
    migrations: { profile: { 1: ({ points, ...rest }) => ({ ...rest, rewards: { points } }) } },
  });
  assert.deepEqual(store.getProfile('p1'), { schemaVersion: 2, id: 'p1', rewards: { points: 5 } });
});

test('une migration qui échoue sauvegarde l\'original et repart d\'un défaut', () => {
  const backend = createMemoryBackend({ [`${PREFIX}meta`]: JSON.stringify({ schemaVersion: 1, x: 1 }) });
  const store = createStore(createStorage({ backend }), {
    version: 2,
    migrations: { meta: { 1: () => { throw new Error('bug'); } } },
  });
  assert.deepEqual(store.getMeta().profiles, []);
  assert.deepEqual(JSON.parse(backend.getItem(`${PREFIX}backup:meta`)), { schemaVersion: 1, x: 1 });
});

test('profils : un profil actif est créé au premier lancement, puis conservé', () => {
  const backend = createMemoryBackend();
  const store = createStore(createStorage({ backend }));
  const id = ensureActiveProfile(store);
  assert.equal(ensureActiveProfile(store), id);
  // « Fermer le navigateur » : un nouveau store sur le même stockage retrouve le profil.
  const again = createStore(createStorage({ backend }));
  assert.equal(ensureActiveProfile(again), id);
  const id2 = createProfile(again, { name: 'Tom' });
  assert.notEqual(id2, id);
  assert.equal(again.getMeta().profiles.length, 2);
  assert.equal(again.getProfile(id2).name, 'Tom');
});

test('réglages : valeurs par défaut puis mémorisation', () => {
  const backend = createMemoryBackend();
  const store = createStore(createStorage({ backend }));
  assert.equal(store.getSettings().muted, false);
  store.setSetting('muted', true);
  assert.equal(createStore(createStorage({ backend })).getSettings().muted, true);
});
