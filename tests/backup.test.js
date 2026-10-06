import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryBackend, createStorage, createStore, SCHEMA_VERSION } from '../js/core/storage.js';
import { createProfile, ensureActiveProfile, updateIdentity, listProfiles } from '../js/core/profile.js';
import { recordResult } from '../js/core/history.js';
import {
  BACKUP_APP, BACKUP_FORMAT, buildBackup, serializeBackup, backupFilename, parseBackup,
  validateBackup, describeBackup, applyBackup, normalizeProfile,
} from '../js/core/backup.js';

const newStore = () => createStore(createStorage({ backend: createMemoryBackend() }));
const result = (over = {}) => ({
  t: Date.UTC(2026, 9, 5), game: 'calcul-mental', level: 1, score: 9, total: 10,
  durationMs: 60000, missed: ['doubles'], stars: 3, unlocksNext: true, ...over,
});

/** Un appareil avec deux profils et un peu d'historique. */
function seeded() {
  const store = newStore();
  const lea = ensureActiveProfile(store);
  updateIdentity(store, lea, { name: 'Léa', avatar: 'licorne' });
  recordResult(store, lea, result());
  recordResult(store, lea, result({ score: 6, stars: 1, unlocksNext: false }));
  const tom = createProfile(store, { name: 'Tom', avatar: 'renard' });
  recordResult(store, tom, result({ score: 4, stars: 0, unlocksNext: false }));
  return { store, lea, tom };
}

// Le fichier importé vient de l'extérieur de l'application : il est traité comme non fiable.
test('une clé piégée du fichier ne touche pas le prototype du profil importé', () => {
  const hostile = JSON.parse(`{
    "schemaVersion": ${SCHEMA_VERSION},
    "id": "p1", "name": "Léa", "avatar": "chat", "createdAt": 0,
    "progress": { "__proto__": { "pirate": true }, "sons": { "unlocked": 2, "best": { "__proto__": { "x": 1 } }, "plays": 3 } },
    "history": [], "weekly": []
  }`);
  const clean = normalizeProfile(hostile);
  assert.equal(Object.getPrototypeOf(clean.progress), Object.prototype);
  assert.equal(clean.progress.pirate, undefined);
  assert.equal(Object.getPrototypeOf(clean.progress.sons.best), Object.prototype);
  assert.equal({}.pirate, undefined, 'Object.prototype ne doit jamais être touché');
  // Les entrées légitimes passent quand même.
  assert.deepEqual(clean.progress.sons, { unlocked: 2, best: {}, plays: 3 });
});

test('la sauvegarde contient tous les profils et aucune donnée d\'appareil', () => {
  const { store, tom } = seeded();
  store.setSetting('theme', 'dark');
  const backup = buildBackup(store, { now: 1234 });
  assert.equal(backup.app, BACKUP_APP);
  assert.equal(backup.format, BACKUP_FORMAT);
  assert.equal(backup.schemaVersion, SCHEMA_VERSION);
  assert.equal(backup.exportedAt, 1234);
  assert.equal(backup.activeProfileId, tom);
  assert.deepEqual(backup.profiles.map((p) => p.name), ['Léa', 'Tom']);
  // Le thème et le son restent à la tablette.
  assert.equal(JSON.stringify(backup).includes('dark'), false);
});

test('le nom du fichier ne contient jamais le prénom de l\'enfant', () => {
  const name = backupFilename({ exportedAt: new Date(2026, 9, 5).getTime() });
  assert.equal(name, 'jeux-ce1-sauvegarde-2026-10-05.json');
  assert.equal(/l[ée]a/i.test(name), false);
});

test('aller-retour complet : exporter, tout effacer, réimporter', () => {
  const { store, lea, tom } = seeded();
  const text = serializeBackup(buildBackup(store, { now: 1 }));

  // « Nouvelle tablette » : un appareil vide.
  const fresh = newStore();
  ensureActiveProfile(fresh);
  const read = parseBackup(text);
  assert.equal(read.ok, true, read.error);
  applyBackup(fresh, read.backup, { mode: 'replace' });

  assert.deepEqual(listProfiles(fresh).map((p) => p.name).sort(), ['Léa', 'Tom']);
  assert.equal(fresh.getMeta().activeProfileId, tom);
  const restored = fresh.getProfile(lea);
  assert.equal(restored.avatar, 'licorne');
  assert.equal(restored.history.length, 2);
  assert.equal(restored.progress['calcul-mental'].best[1].score, 9);
  assert.equal(restored.progress['calcul-mental'].unlocked, 2);
  assert.deepEqual(restored.history[0].missed, ['doubles']);
});

test('import « ajouter » : les profils déjà là ne disparaissent pas', () => {
  const { store } = seeded();
  const backup = parseBackup(serializeBackup(buildBackup(store, { now: 1 }))).backup;

  const other = newStore();
  const zoe = ensureActiveProfile(other);
  updateIdentity(other, zoe, { name: 'Zoé' });
  const info = applyBackup(other, backup, { mode: 'merge' });

  assert.equal(info.imported, 2);
  assert.deepEqual(listProfiles(other).map((p) => p.name), ['Zoé', 'Léa', 'Tom']);
  assert.equal(other.getProfile(zoe).name, 'Zoé');
});

test('import « remplacer » : les anciens profils sont effacés du stockage', () => {
  const { store } = seeded();
  const backup = parseBackup(serializeBackup(buildBackup(store, { now: 1 }))).backup;

  const other = newStore();
  const zoe = ensureActiveProfile(other);
  updateIdentity(other, zoe, { name: 'Zoé' });
  other.setSetting('muted', true);
  applyBackup(other, backup, { mode: 'replace' });

  assert.equal(other.getProfile(zoe), null);
  assert.deepEqual(listProfiles(other).map((p) => p.name), ['Léa', 'Tom']);
  assert.equal(other.getSettings().muted, true, 'les réglages de l\'appareil survivent à un import');
});

test('une sauvegarde étrangère, cassée ou trop récente est refusée avec un message clair', () => {
  const cases = [
    [null, /pas une sauvegarde/],
    ['{pas du json', /pas une sauvegarde lisible/],
    [JSON.stringify({ app: 'autre-appli', format: 1, profiles: [] }), /ne vient pas des Jeux CE1/],
    [JSON.stringify({ app: BACKUP_APP, profiles: [{ id: 'a' }] }), /n'indique pas sa version/],
    [JSON.stringify({ app: BACKUP_APP, format: 99, profiles: [{ id: 'a' }] }), /version plus récente/],
    [JSON.stringify({ app: BACKUP_APP, format: 1, profiles: [] }), /aucun profil/],
    [JSON.stringify({ app: BACKUP_APP, format: 1, profiles: [{ name: 'Léa' }] }), /incomplet/],
    [JSON.stringify({ app: BACKUP_APP, format: 1, profiles: [{ id: 'a' }, { id: 'a' }] }), /deux fois le même profil/],
  ];
  for (const [text, pattern] of cases) {
    const out = parseBackup(text);
    assert.equal(out.ok, false, `aurait dû être refusé : ${text}`);
    assert.match(out.error, pattern);
  }
});

test('rien du fichier importé n\'est recopié tel quel', () => {
  const out = validateBackup({
    app: BACKUP_APP,
    format: 1,
    activeProfileId: 'absent',
    profiles: [{
      id: 'p1',
      name: '   Léa   ',
      avatar: 42,
      createdAt: 'hier',
      piege: '<script>',
      progress: { g: { unlocked: '7', best: { 1: { score: 9, total: 10, stars: 3 }, 2: 'non' }, plays: -3 }, autre: 'non' },
      history: [{ t: 1, game: 'g', level: 1, score: 2, total: 10, durationMs: -5, missed: ['a', 7] }, 'non', { game: 'g' }],
      weekly: 'non',
    }],
  }, { now: 7 });

  assert.equal(out.ok, true, out.error);
  const [p] = out.backup.profiles;
  assert.equal(p.name, 'Léa');
  assert.equal(p.avatar, null);
  assert.equal(p.createdAt, 7);
  assert.equal(p.piege, undefined, 'un champ inconnu ne doit pas entrer dans le profil');
  assert.equal(p.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(Object.keys(p.progress), ['g']);
  assert.equal(p.progress.g.unlocked, 1, 'une valeur du mauvais type retombe sur le défaut');
  assert.equal(p.progress.g.plays, 0);
  assert.deepEqual(Object.keys(p.progress.g.best), ['1']);
  assert.equal(p.history.length, 1);
  assert.equal(p.history[0].durationMs, 0);
  assert.deepEqual(p.history[0].missed, ['a']);
  assert.deepEqual(p.weekly, []);
  // Identifiant actif inconnu : on retombe sur le premier profil plutôt que sur rien.
  assert.equal(out.backup.activeProfileId, 'p1');
});

test('une sauvegarde d\'un ancien schéma passe par les migrations', () => {
  const old = { id: 'p1', name: 'Léa' };   // document sans schemaVersion (v0)
  const p = normalizeProfile(old, { now: 5 });
  assert.equal(p.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(p.history, []);
  assert.deepEqual(p.progress, {});
});

test('describeBackup résume ce qui sera importé, avant d\'écrire', () => {
  const { store } = seeded();
  const info = describeBackup(buildBackup(store, { now: 1 }));
  assert.equal(info.exportedAt, 1);
  assert.deepEqual(info.profiles.map((p) => [p.name, p.plays]), [['Léa', 2], ['Tom', 1]]);
});
