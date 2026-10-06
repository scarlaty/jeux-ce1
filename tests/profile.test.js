import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryBackend, createStorage, createStore } from '../js/core/storage.js';
import {
  AVATARS, MAX_NAME, avatarOf, cleanName, isValidName, createProfile, ensureActiveProfile,
  newProfileId, updateIdentity, listProfiles, setActiveProfile, removeProfile, resetProgress,
  needsWelcome,
} from '../js/core/profile.js';
import { recordResult } from '../js/core/history.js';

const newStore = () => createStore(createStorage({ backend: createMemoryBackend() }));
const result = (game, score) => ({ t: 1, game, level: 1, score, total: 10, durationMs: 1000, missed: [], stars: 3, unlocksNext: false });

test('cleanName nettoie et borne le prénom', () => {
  assert.equal(cleanName('  Léa   Marie '), 'Léa Marie');
  assert.equal(cleanName(null), '');
  assert.equal(cleanName('\n\tTom\n'), 'Tom');
  assert.equal([...cleanName('a'.repeat(50))].length, MAX_NAME);
  // Découpe par caractère affiché : un émoji n'est jamais coupé en deux.
  assert.equal(cleanName('🦄'.repeat(30)), '🦄'.repeat(MAX_NAME));
  assert.equal(isValidName('   '), false);
  assert.equal(isValidName('Zoé'), true);
});

test('avatarOf retombe sur le premier avatar si l\'identifiant est inconnu', () => {
  assert.equal(avatarOf('licorne').emoji, '🦄');
  assert.equal(avatarOf('inconnu'), AVATARS[0]);
  assert.equal(avatarOf(null), AVATARS[0]);
  assert.equal(new Set(AVATARS.map((a) => a.id)).size, AVATARS.length);
  for (const a of AVATARS) assert.ok(a.emoji && a.label, 'un avatar sans émoji ou sans nom');
});

test('les identifiants restent distincts, même à la même milliseconde', () => {
  // Deux appareils créent un profil au même instant : sans part aléatoire, un import
  // écraserait le profil de l'autre enfant.
  const ids = new Set(Array.from({ length: 200 }, () => newProfileId([], 1000)));
  assert.ok(ids.size > 190, `trop de collisions : ${200 - ids.size}`);
  assert.equal(newProfileId(['pzzz'], 1000, () => 0).startsWith('p'), true);
  const id = newProfileId([], 1000, () => 0);
  assert.equal(newProfileId([id], 1000, () => 0), `${id}x`);
});

test('le premier lancement demande le prénom, une fois seulement', () => {
  const store = newStore();
  assert.equal(needsWelcome(store), true);
  const id = ensureActiveProfile(store);
  updateIdentity(store, id, { name: ' Léa ', avatar: 'licorne' });
  assert.equal(needsWelcome(store), false);
  assert.equal(store.getProfile(id).name, 'Léa');
  // La liste du méta est tenue à jour en même temps que le document du profil.
  assert.deepEqual(store.getMeta().profiles, [{ id, name: 'Léa', avatar: 'licorne' }]);
});

test('plusieurs profils : progressions séparées, changement de profil actif', () => {
  const store = newStore();
  const lea = ensureActiveProfile(store);
  updateIdentity(store, lea, { name: 'Léa', avatar: 'chat' });
  const tom = createProfile(store, { name: 'Tom', avatar: 'renard' });
  assert.equal(store.getMeta().activeProfileId, tom);

  recordResult(store, lea, result('calcul-mental', 9));
  recordResult(store, tom, result('calcul-mental', 4));
  assert.equal(store.getProfile(lea).progress['calcul-mental'].best[1].score, 9);
  assert.equal(store.getProfile(tom).progress['calcul-mental'].best[1].score, 4);
  assert.equal(store.getProfile(lea).history.length, 1);

  assert.equal(setActiveProfile(store, lea), true);
  assert.equal(setActiveProfile(store, 'inconnu'), false);
  assert.deepEqual(listProfiles(store).map((p) => [p.name, p.active]), [['Léa', true], ['Tom', false]]);
});

test('supprimer un profil : jamais le dernier, et un autre devient actif', () => {
  const store = newStore();
  const lea = ensureActiveProfile(store);
  updateIdentity(store, lea, { name: 'Léa' });
  const tom = createProfile(store, { name: 'Tom' });
  assert.equal(removeProfile(store, tom), true);
  assert.equal(store.getProfile(tom), null);
  assert.equal(store.getMeta().activeProfileId, lea);
  assert.equal(removeProfile(store, lea), false, 'le dernier profil reste');
  assert.equal(removeProfile(store, 'inconnu'), false);
});

test('la remise à zéro efface la progression mais garde le prénom', () => {
  const store = newStore();
  const id = ensureActiveProfile(store);
  updateIdentity(store, id, { name: 'Léa', avatar: 'panda' });
  recordResult(store, id, result('calcul-mental', 8));
  resetProgress(store, id);
  const profile = store.getProfile(id);
  assert.deepEqual(profile.progress, {});
  assert.deepEqual(profile.history, []);
  assert.deepEqual(profile.weekly, []);
  assert.equal(profile.name, 'Léa');
  assert.equal(profile.avatar, 'panda');
});
