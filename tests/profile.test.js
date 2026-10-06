import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryBackend, createStorage, createStore } from '../js/core/storage.js';
import {
  validateName, isProfileComplete, AVATARS, avatarLabel, createProfile, ensureActiveProfile, listProfiles,
  updateIdentity, resetProfile, deleteProfile, saveImportedProfile, profileGate,
} from '../js/core/profile.js';
import { recordResult } from '../js/core/history.js';

const newStore = () => createStore(createStorage({ backend: createMemoryBackend() }));
const result = (t, score = 8) => ({ t, game: 'demo', level: 1, score, total: 10, stars: 2, durationMs: 60000, missed: ['x'], unlocksNext: false });

test('prénom : accepte lettres, accents, espaces, tirets et apostrophes', () => {
  for (const name of ['Léa', 'Anne-Sophie', 'Zoé Marie', 'N\'Golo', 'D’Artagnan', 'Ève', 'Çağla', 'Maëlys']) {
    assert.deepEqual(validateName(name), { ok: true, value: name }, name);
  }
});

test('prénom : nettoie les espaces et normalise en NFC', () => {
  assert.deepEqual(validateName('  Jean   Paul '), { ok: true, value: 'Jean Paul' });
  assert.equal(validateName('Léa').value, 'Léa');
});

test('prénom : refuse vide, trop long, chiffres, signes et premier caractère non lettre', () => {
  assert.equal(validateName('').ok, false);
  assert.equal(validateName('   ').ok, false);
  assert.equal(validateName(undefined).ok, false);
  assert.equal(validateName('A'.repeat(20)).ok, true);
  assert.match(validateName('A'.repeat(21)).error, /20 lettres/);
  for (const bad of ['Léa2', 'Léa!', '<b>Léa</b>', '-Léa', '\'Léa', 'Léa 😀', 'a_b']) {
    assert.equal(validateName(bad).ok, false, bad);
  }
});

test('avatars : 20 animaux distincts avec un nom', () => {
  assert.equal(new Set(AVATARS.map((a) => a.emoji)).size, AVATARS.length);
  assert.equal(avatarLabel('🦊'), 'renard');
  assert.equal(avatarLabel('?'), 'animal');
});

test('profil complet = prénom valide + avatar', () => {
  assert.equal(isProfileComplete(null), false);
  assert.equal(isProfileComplete({ name: '', avatar: '🦊' }), false);
  assert.equal(isProfileComplete({ name: 'Léa', avatar: null }), false);
  assert.equal(isProfileComplete({ name: 'Léa', avatar: '🦊' }), true);
});

test('updateIdentity met à jour le profil et le résumé de la liste', () => {
  const store = newStore();
  const id = ensureActiveProfile(store);
  updateIdentity(store, id, { name: 'Léa', avatar: '🦊' });
  assert.equal(store.getProfile(id).name, 'Léa');
  assert.deepEqual(listProfiles(store), [{ id, name: 'Léa', avatar: '🦊' }]);
  updateIdentity(store, id, { avatar: '🐼' });
  assert.deepEqual(listProfiles(store), [{ id, name: 'Léa', avatar: '🐼' }]);
});

test('les progressions des profils sont séparées', () => {
  const store = newStore();
  const a = createProfile(store, { name: 'Léa', avatar: '🦊' });
  const b = createProfile(store, { name: 'Tom', avatar: '🐼' });
  recordResult(store, a, result(1000));
  assert.equal(store.getProfile(a).history.length, 1);
  assert.equal(store.getProfile(b).history.length, 0);
  assert.equal(store.getMeta().activeProfileId, b);
});

test('remise à zéro : garde l\'identité, efface tout le reste (récompenses comprises)', () => {
  const store = newStore();
  const id = createProfile(store, { name: 'Léa', avatar: '🦊' });
  recordResult(store, id, result(1000));
  store.updateProfile(id, (p) => ({ ...p, rewards: { points: 30 } }));
  const before = store.getProfile(id);
  const after = resetProfile(store, id);
  assert.equal(after.name, 'Léa');
  assert.equal(after.avatar, '🦊');
  assert.equal(after.createdAt, before.createdAt);
  assert.deepEqual(after.history, []);
  assert.deepEqual(after.progress, {});
  assert.equal(after.rewards, undefined);
  assert.equal(resetProfile(store, 'absent'), null);
});

test('suppression : le profil disparaît, un autre devient actif', () => {
  const store = newStore();
  const a = createProfile(store, { name: 'Léa', avatar: '🦊' });
  const b = createProfile(store, { name: 'Tom', avatar: '🐼' });
  assert.equal(deleteProfile(store, b), a);
  assert.equal(store.getProfile(b), null);
  assert.deepEqual(listProfiles(store).map((p) => p.id), [a]);
  // Supprimer un profil non actif ne change pas le profil actif.
  const c = createProfile(store, { name: 'Zoé', avatar: '🐸' });
  assert.equal(deleteProfile(store, a), c);
  // Plus aucun profil : ensureActiveProfile en recrée un anonyme.
  assert.equal(deleteProfile(store, c), null);
  const fresh = ensureActiveProfile(store);
  assert.equal(store.getProfile(fresh).name, '');
});

test('import : remplace un profil (même identifiant) ou en ajoute un nouveau', () => {
  const store = newStore();
  const a = createProfile(store, { name: 'Léa', avatar: '🦊' });
  const imported = { ...store.getProfile(a), id: 'autre', name: 'Tom', avatar: '🐼', history: [] };
  assert.equal(saveImportedProfile(store, imported, { mode: 'replace', targetId: a }), a);
  assert.equal(store.getProfile(a).name, 'Tom');
  assert.equal(listProfiles(store).length, 1);
  const added = saveImportedProfile(store, imported, { mode: 'add' });
  assert.notEqual(added, a);
  assert.deepEqual(listProfiles(store).map((p) => p.name), ['Tom', 'Tom']);
});

test('porte d\'entrée : choix du profil, puis bienvenue, l\'espace parents restant ouvert', () => {
  const complete = { name: 'Léa', avatar: '🦊' };
  const anonymous = { name: '', avatar: null };
  assert.equal(profileGate({ path: '/', profile: anonymous, profileCount: 1, chosen: true }), '/bienvenue');
  assert.equal(profileGate({ path: '/bienvenue', profile: anonymous, profileCount: 1, chosen: true }), null);
  assert.equal(profileGate({ path: '/parents', profile: anonymous, profileCount: 1, chosen: true }), null);
  assert.equal(profileGate({ path: '/jeu/demo', profile: complete, profileCount: 2, chosen: false }), '/profils');
  assert.equal(profileGate({ path: '/profils', profile: complete, profileCount: 2, chosen: false }), null);
  assert.equal(profileGate({ path: '/', profile: complete, profileCount: 2, chosen: true }), null);
  assert.equal(profileGate({ path: '/', profile: complete, profileCount: 1, chosen: false }), null);
});
