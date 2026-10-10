import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryBackend, createStorage, createStore, SCHEMA_VERSION } from '../js/core/storage.js';
import { createProfile, ensureActiveProfile, updateIdentity, listProfiles } from '../js/core/profile.js';
import { recordResult } from '../js/core/history.js';
import { normalizeRewards } from '../js/core/rewards.js';
import {
  BACKUP_APP, BACKUP_FORMAT, buildBackup, serializeBackup, backupFilename, parseBackup,
  validateBackup, describeBackup, applyBackup, normalizeProfile, importPlan,
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

// Garde-fou structurel : `normalizeProfile` repart de `defaultProfile` et doit reprendre
// explicitement CHAQUE champ. Un champ ajouté au profil sans être ajouté ici serait
// silencieusement remis à zéro à l'import — l'enfant perdrait ses points ou ses gommettes.
test('un aller-retour export/import conserve tous les champs du profil', () => {
  const store = newStore();
  const id = ensureActiveProfile(store);
  const rich = {
    name: 'Léa',
    avatar: 'licorne',
    progress: { sons: { unlocked: 3, best: { 1: { score: 9, total: 10, stars: 3 } }, plays: 4 } },
    history: [{ t: Date.UTC(2026, 9, 5), game: 'sons', level: 1, score: 9, total: 10, durationMs: 60000, missed: ['son [ou]'] }],
    weekly: [{ week: Date.UTC(2026, 8, 28), game: 'sons', level: 1, games: 3, score: 24, total: 30, durationMs: 180000 }],
    rewards: normalizeRewards({ points: 1234, stickers: { nombres: ['de'] } }),
    companion: { animal: 'bunny', name: 'Pompon', hatched: true, games: 12, stars: 31 },
    chest: { accessories: ['bow', 'crown'], equipped: 'crown', opened: 9 },
  };
  store.updateProfile(id, (p) => ({ ...p, ...rich }));
  const before = store.getProfile(id);

  const check = validateBackup(JSON.parse(serializeBackup(buildBackup(store))));
  assert.equal(check.ok, true, check.error);
  const other = newStore();
  applyBackup(other, check.backup, { mode: 'replace' });
  const after = other.getProfile(id);

  for (const field of Object.keys(before)) {
    assert.deepEqual(after[field], before[field], `champ « ${field} » perdu à l'import`);
  }
});

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
    [JSON.stringify({ app: BACKUP_APP, format: 1, schemaVersion: SCHEMA_VERSION, profiles: [] }), /aucun profil/],
    [JSON.stringify({ app: BACKUP_APP, format: 1, schemaVersion: SCHEMA_VERSION, profiles: [{ name: 'Léa' }] }), /incomplet/],
    [JSON.stringify({ app: BACKUP_APP, format: 1, schemaVersion: SCHEMA_VERSION, profiles: [{ id: 'a' }, { id: 'a' }] }), /deux fois le même profil/],
    // Le champ est écrit par `buildBackup` depuis la première version : son absence trahit un
    // fichier bricolé, pas une vieille sauvegarde (#114).
    [JSON.stringify({ app: BACKUP_APP, format: 1, profiles: [{ id: 'a' }] }), /version de ses profils/],
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
    schemaVersion: SCHEMA_VERSION,
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

test('un profil sans compagnon (ancienne sauvegarde) reçoit un œuf à l\'import', () => {
  const old = { schemaVersion: SCHEMA_VERSION, id: 'p1', name: 'Léa', avatar: 'chat', createdAt: 0, progress: {}, history: [], weekly: [] };
  const check = validateBackup({ app: 'jeux-ce1', format: 1, schemaVersion: SCHEMA_VERSION, exportedAt: 0, activeProfileId: 'p1', profiles: [old] });
  assert.equal(check.ok, true, check.error);
  assert.deepEqual(check.backup.profiles[0].companion, { animal: 'cat', name: '', hatched: false, games: 0, stars: 0 });
});

test('un compagnon abîmé dans le fichier est nettoyé champ par champ', () => {
  const hostile = { schemaVersion: SCHEMA_VERSION, id: 'p1', name: 'Léa', avatar: 'chat', createdAt: 0, progress: {}, history: [], weekly: [],
    companion: { animal: 'dragon', name: '<img src=x>', hatched: true, games: 'beaucoup', stars: -5, extra: 'x' } };
  const check = validateBackup({ app: 'jeux-ce1', format: 1, schemaVersion: SCHEMA_VERSION, exportedAt: 0, activeProfileId: 'p1', profiles: [hostile] });
  assert.equal(check.ok, true, check.error);
  assert.deepEqual(check.backup.profiles[0].companion, { animal: 'cat', name: 'img srcx', hatched: true, games: 0, stars: 0 });
});

test('un profil sans coffre (ancienne sauvegarde) reçoit les valeurs par défaut à l\'import', () => {
  const old = { schemaVersion: SCHEMA_VERSION, id: 'p1', name: 'Léa', avatar: 'chat', createdAt: 0, progress: {}, history: [], weekly: [] };
  const check = validateBackup({ app: 'jeux-ce1', format: 1, schemaVersion: SCHEMA_VERSION, exportedAt: 0, activeProfileId: 'p1', profiles: [old] });
  assert.equal(check.ok, true, check.error);
  assert.deepEqual(check.backup.profiles[0].chest, { accessories: [], equipped: null, opened: 0 });
});

test('un coffre abîmé dans le fichier est nettoyé champ par champ', () => {
  const hostile = { schemaVersion: SCHEMA_VERSION, id: 'p1', name: 'Léa', avatar: 'chat', createdAt: 0, progress: {}, history: [], weekly: [],
    chest: { accessories: ['star', 'dragon', 'bow', 'bow'], equipped: 'hat', opened: 'x', extra: '<img>' } };
  const check = validateBackup({ app: 'jeux-ce1', format: 1, schemaVersion: SCHEMA_VERSION, exportedAt: 0, activeProfileId: 'p1', profiles: [hostile] });
  assert.equal(check.ok, true, check.error);
  assert.deepEqual(check.backup.profiles[0].chest, { accessories: ['bow', 'star'], equipped: null, opened: 0 });
});

// #105 : une sauvegarde faite avant le changement (schéma 2) porte un compagnon gonflé par les parties rejouées.
// À l'import, la migration le ramène aux étoiles de la carte SANS lui faire perdre son stade ; puis l'aller-retour est stable.
test('un compagnon d’une sauvegarde v2 est recalculé sans rapetisser, et l’aller-retour est stable', () => {
  const v2 = {
    schemaVersion: 2, id: 'p1', name: 'Léa', avatar: 'chat', createdAt: 0,
    progress: { sons: { unlocked: 2, best: { 1: { score: 9, total: 10, stars: 3 } }, plays: 20 } },
    history: [], weekly: [],
    companion: { animal: 'cat', name: 'Minou', hatched: true, games: 20, stars: 61 },   // « grand » grâce à 20 parties rejouées
  };
  const check = validateBackup({ app: 'jeux-ce1', format: 1, schemaVersion: 2, exportedAt: 0, activeProfileId: 'p1', profiles: [v2] });
  assert.equal(check.ok, true, check.error);
  const companion = check.backup.profiles[0].companion;
  assert.equal(companion.stars, 60, 'le stade « grand » est gardé (plancher = son seuil)');
  assert.equal(check.backup.profiles[0].schemaVersion, SCHEMA_VERSION);
  // Aller-retour : réexporter puis réimporter ne change plus rien.
  const store = newStore();
  applyBackup(store, check.backup, { mode: 'replace' });
  const again = validateBackup(JSON.parse(serializeBackup(buildBackup(store))));
  assert.equal(again.ok, true, again.error);
  assert.deepEqual(again.backup.profiles[0].companion, companion);
  assert.deepEqual(normalizeProfile(again.backup.profiles[0]).companion, companion);
});

// --- Ce que l'import va vraiment faire (#114) ---------------------------------------------------

/* L'ancienne carte de confirmation ne décrivait que le contenu du FICHIER : elle ne disait jamais
   ce que la TABLETTE allait perdre. « Ajouter aux profils » écrasait donc une progression plus
   récente sans un mot, et « Tout remplacer » supprimait des profils qu'il ne nommait pas. */

const prof = (id, { name = id, plays = 0, points = 0, lastPlayed = 0 } = {}) => ({
  id,
  name,
  avatar: 'chat',
  progress: {},
  history: Array.from({ length: plays }, (_, i) => ({ t: i === plays - 1 ? lastPlayed : 1, game: 'sons', level: 1, score: 10, total: 10, durationMs: 1, missed: [] })),
  weekly: [],
  rewards: { points, stickers: {}, daily: null },
  companion: undefined,
  chest: undefined,
});

const asBackup = (profiles) => ({ app: BACKUP_APP, format: BACKUP_FORMAT, schemaVersion: SCHEMA_VERSION, exportedAt: 1, activeProfileId: profiles[0].id, profiles });

test("le plan d'import distingue ce qu'on ajoute de ce qu'on écrase", () => {
  const backup = asBackup([prof('a', { plays: 3, points: 100 }), prof('neuf', { plays: 1 })]);
  const plan = importPlan(backup, [prof('a', { plays: 5, points: 200 }), prof('autre', { plays: 2 })]);

  assert.deepEqual(plan.add.map((p) => p.id), ['neuf']);
  assert.deepEqual(plan.overwrite.map((p) => p.id), ['a']);
  assert.deepEqual(plan.kept.map((p) => p.id), ['autre'], 'un profil absent du fichier reste intact');
  assert.deepEqual(plan.remove, [], 'le mode « ajouter » ne supprime rien');

  const [ecrase] = plan.overwrite;
  assert.equal(ecrase.current.plays, 5);
  assert.equal(ecrase.incoming.plays, 3);
  assert.equal(ecrase.current.points, 200);
  assert.equal(ecrase.incoming.points, 100);
});

test("le plan signale quand la tablette est en avance sur le fichier", () => {
  const recent = [prof('a', { plays: 5, points: 200, lastPlayed: 2000 })];
  const vieux = asBackup([prof('a', { plays: 3, points: 100, lastPlayed: 1000 })]);
  assert.equal(importPlan(vieux, recent).overwrite[0].losesProgress, true);

  // ... et qu'il ne crie pas au loup quand le fichier est le plus récent.
  const neuf = asBackup([prof('a', { plays: 9, points: 400, lastPlayed: 3000 })]);
  assert.equal(importPlan(neuf, recent).overwrite[0].losesProgress, false);
});

test("« Tout remplacer » nomme les profils locaux qui vont disparaître", () => {
  const backup = asBackup([prof('a', { plays: 1 })]);
  const plan = importPlan(backup, [prof('a'), prof('b', { name: 'Lou', plays: 7 })], { mode: 'replace' });

  assert.deepEqual(plan.remove.map((p) => p.name), ['Lou']);
  assert.equal(plan.remove[0].current.plays, 7, 'on dit ce qui est perdu, pas seulement le nom');
  assert.deepEqual(plan.kept, [], 'en mode « remplacer », rien n’est conservé à côté');
});

test("une sauvegarde d'un schéma plus récent est refusée", () => {
  const trop = { ...asBackup([prof('a')]), schemaVersion: SCHEMA_VERSION + 1 };
  const read = validateBackup(trop);
  assert.equal(read.ok, false);
  assert.match(read.error, /plus récente/);

  // Une sauvegarde ancienne reste importable : les migrations la rejouent.
  const vieille = { ...asBackup([prof('a')]), schemaVersion: 1 };
  assert.equal(validateBackup(vieille).ok, true);

  // Un numéro abîmé n'est pas silencieusement ignoré.
  assert.equal(validateBackup({ ...asBackup([prof('a')]), schemaVersion: 'deux' }).ok, false);
});

/* Les trois critères de `losesProgress` étaient tous vrais dans le même cas de test : n'importe
   lequel suffisait à le faire passer. Une revue a montré qu'on pouvait en supprimer deux sans
   faire rougir un test. Un cas par critère, donc (#114). */
test('chaque critère d’alerte est gardé séparément', () => {
  const local = (over) => [prof('a', { plays: 4, points: 100, lastPlayed: 2000, ...over })];
  const fichier = (over) => asBackup([prof('a', { plays: 4, points: 100, lastPlayed: 2000, ...over })]);

  // Seules les parties diffèrent.
  assert.equal(importPlan(fichier({ plays: 2 }), local()).overwrite[0].losesProgress, true, 'parties');
  // Seuls les points diffèrent.
  assert.equal(importPlan(fichier({ points: 40 }), local()).overwrite[0].losesProgress, true, 'points');
  // Seule la date diffère.
  assert.equal(importPlan(fichier({ lastPlayed: 500 }), local()).overwrite[0].losesProgress, true, 'date');
  // Strictement identique : aucune alerte (c'est le cas le plus courant, un aller-retour).
  assert.equal(importPlan(fichier(), local()).overwrite[0].losesProgress, false, 'identique');
});

/* Au-delà du plafond de 5000, les parties les plus anciennes sont agrégées par semaine. Les
   compter est indispensable : sinon un profil ancien paraît moins avancé qu'il ne l'est, juste
   avant qu'on décide de l'écraser. Mutation `plays: history.length` : la suite restait verte. */
test('le compte des parties inclut les semaines agrégées', () => {
  const ancien = {
    ...prof('a', { plays: 3, points: 50 }),
    weekly: [{ week: '2026-W01', games: 12 }, { week: '2026-W02', games: 7 }],
  };
  const plan = importPlan(asBackup([prof('a', { plays: 1 })]), [ancien]);
  assert.equal(plan.overwrite[0].current.plays, 3 + 12 + 7);
  assert.equal(plan.overwrite[0].losesProgress, true, 'une tablette à 22 parties perd face à un fichier à 1');
});

test('un profil présent deux fois dans le méta n’est listé qu’une fois', () => {
  const plan = importPlan(asBackup([prof('z')]), [prof('a'), prof('a')]);
  assert.deepEqual(plan.kept.map((p) => p.id), ['a']);
});

test('importPlan reste total devant une sauvegarde absente', () => {
  assert.deepEqual(importPlan(null, [prof('a')]), { mode: 'merge', add: [], overwrite: [], remove: [], kept: [] });
  assert.deepEqual(importPlan({}, [prof('a')]).kept, []);
});

/* La carte promet que les profils locaux sont « laissés intacts » en mode « ajouter ». Basculer
   sur le profil actif du fichier démentait cette promesse en silence : l'écran continuait
   d'afficher un enfant pendant qu'un autre devenait actif (#114). */
test('« ajouter » ne change pas le profil actif de la tablette', () => {
  const store = createStore(createStorage({ backend: createMemoryBackend() }));
  const bob = ensureActiveProfile(store);
  updateIdentity(store, bob, { name: 'Bob', avatar: 'chat' });

  const backup = {
    app: BACKUP_APP, format: BACKUP_FORMAT, schemaVersion: SCHEMA_VERSION, exportedAt: 1,
    activeProfileId: 'ana',
    profiles: [normalizeProfile({ id: 'ana', name: 'Ana', avatar: 'renard' })],
  };
  const info = applyBackup(store, backup, { mode: 'merge' });

  assert.equal(info.activeProfileId, bob, 'le profil actif local doit être conservé');
  assert.equal(store.getMeta().activeProfileId, bob);
  assert.ok(store.getProfile('ana'), 'le profil du fichier est bien ajouté');

  // En mode « remplacer », le profil local n'existe plus : on prend celui du fichier.
  const apres = applyBackup(store, backup, { mode: 'replace' });
  assert.equal(apres.activeProfileId, 'ana');
});

test('le plan distingue le prénom de la tablette de celui du fichier', () => {
  const local = [{ ...prof('a', { plays: 2 }), name: 'Ana' }];
  const plan = importPlan(asBackup([{ ...prof('a', { plays: 9 }), name: 'Anaïs' }]), local);
  assert.equal(plan.overwrite[0].name, 'Ana', 'la carte nomme le profil tel qu’il est sur la tablette');
  assert.equal(plan.overwrite[0].incomingName, 'Anaïs', 'et annonce le prénom que l’import écrira');
});

/* Le juge visuel a mesuré qu'une ligne promise à la suppression définitive était rendue
   exactement comme une ligne qu'on ne touche pas : le signal était à l'inverse du risque.
   Le niveau vit donc dans le plan, où un test peut le lire (#114). */
test('le plan classe chaque profil par niveau de risque', () => {
  const backup = asBackup([prof('a', { plays: 1 }), prof('neuf')]);
  const locaux = [prof('a', { plays: 9, points: 500, lastPlayed: 9000 }), prof('autre', { plays: 3 })];

  const ajout = importPlan(backup, locaux);
  assert.equal(ajout.add[0].risk, 'none');
  assert.equal(ajout.overwrite[0].risk, 'regression', 'la tablette est en avance');
  assert.equal(ajout.kept[0].risk, 'none');

  const remplace = importPlan(backup, locaux, { mode: 'replace' });
  assert.equal(remplace.remove[0].risk, 'delete', 'supprimer est le risque le plus élevé');

  // Un écrasement sans perte reste un écrasement : il se distingue d'un profil intact.
  const aJour = importPlan(asBackup([prof('a', { plays: 20, points: 900, lastPlayed: 99999 })]), locaux);
  assert.equal(aJour.overwrite[0].risk, 'overwrite');
  assert.notEqual(aJour.overwrite[0].risk, aJour.kept[0].risk);
});
