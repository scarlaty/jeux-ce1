import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeBackup, backupToJson, backupToCode, codeToJson, backupFileName, readBackup,
  BACKUP_FORMAT, BACKUP_VERSION, BACKUP_ERRORS,
} from '../js/core/backup.js';
import { SCHEMA_VERSION, defaultProfile } from '../js/core/storage.js';
import { applyResult, appendHistory, makeEntry } from '../js/core/history.js';

const NOW = Date.UTC(2026, 9, 6, 10);

function richProfile() {
  let p = defaultProfile({ id: 'p1', name: 'Léa', avatar: '🦊', createdAt: NOW - 1e9 });
  for (let i = 0; i < 42; i++) {
    const result = { t: NOW - i * 3600000, game: 'demo', level: 1 + (i % 3), score: i % 11, total: 10, stars: 1, durationMs: 61000, missed: ['son [ou]', 'l\'accord'], unlocksNext: i % 5 === 0 };
    p = applyResult(appendHistory(p, makeEntry(result)), result).profile;
  }
  // Données d'un autre module (récompenses) : doivent voyager telles quelles.
  return { ...p, rewards: { points: 120, stickers: ['🦄', '⭐'], streak: { best: 4 } } };
}

test('aller-retour par fichier JSON : profil identique, récompenses comprises', () => {
  const profile = richProfile();
  const json = backupToJson(makeBackup(profile, { now: NOW }));
  const result = readBackup(json);
  assert.equal(result.ok, true);
  assert.deepEqual(result.profile, profile);
  assert.deepEqual(result.summary, { name: 'Léa', avatar: '🦊', plays: 42, exportedAt: NOW });
});

test('aller-retour par code texte (base64, accents et émojis compris)', () => {
  const profile = richProfile();
  const code = backupToCode(makeBackup(profile, { now: NOW }));
  assert.match(code, /^[A-Za-z0-9+/]+=*$/);
  assert.deepEqual(readBackup(code).profile, profile);
  // Code recopié avec des retours à la ligne et des espaces.
  const messy = `  ${code.match(/.{1,60}/g).join('\n ')}\n`;
  assert.deepEqual(readBackup(messy).profile, profile);
  assert.equal(JSON.parse(codeToJson(code)).format, BACKUP_FORMAT);
});

test('le décompte des parties inclut les parties agrégées par semaine', () => {
  const profile = { ...richProfile(), weekly: [{ week: 0, game: 'demo', level: 1, games: 8, score: 40, total: 80, durationMs: 1000 }] };
  assert.equal(readBackup(makeBackup(profile)).summary.plays, 50);
});

test('nom de fichier sans accents ni espaces', () => {
  assert.equal(backupFileName({ name: 'Anne-Sophie Léa' }, NOW), 'jeux-ce1-anne-sophie-lea-2026-10-06.json');
  assert.equal(backupFileName({ name: '' }, NOW), 'jeux-ce1-profil-2026-10-06.json');
});

test('fichier invalide : vide, pas du JSON, pas une sauvegarde', () => {
  assert.deepEqual(readBackup(''), { ok: false, error: BACKUP_ERRORS.empty });
  assert.deepEqual(readBackup('   '), { ok: false, error: BACKUP_ERRORS.empty });
  assert.equal(readBackup('{pas du json').error, BACKUP_ERRORS.unreadable);
  assert.equal(readBackup('ceci n\'est pas un code !').error, BACKUP_ERRORS.unreadable);
  assert.equal(readBackup(btoa('\xff\xfe')).error, BACKUP_ERRORS.unreadable);   // UTF-8 invalide
  assert.equal(readBackup(JSON.stringify({ hello: 1 })).error, BACKUP_ERRORS.notBackup);
  assert.equal(readBackup(JSON.stringify([1, 2])).error, BACKUP_ERRORS.notBackup);
  assert.equal(readBackup(JSON.stringify({ format: BACKUP_FORMAT, version: '1', profile: {} })).error, BACKUP_ERRORS.notBackup);
  assert.equal(readBackup('x'.repeat(8_000_001)).error, BACKUP_ERRORS.tooBig);
});

test('version future : format ou schéma plus récent que l\'appli', () => {
  const backup = makeBackup(richProfile());
  assert.equal(readBackup({ ...backup, version: BACKUP_VERSION + 1 }).error, BACKUP_ERRORS.future);
  const futureProfile = { ...backup, profile: { ...backup.profile, schemaVersion: SCHEMA_VERSION + 1 } };
  assert.equal(readBackup(futureProfile).error, BACKUP_ERRORS.future);
});

test('ancien profil sans schemaVersion : migré par les migrations du socle', () => {
  const { schemaVersion, progress, weekly, ...old } = richProfile();
  const result = readBackup(makeBackup(old));
  assert.equal(result.ok, true);
  assert.equal(result.profile.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(result.profile.progress, {});
  assert.deepEqual(result.profile.weekly, []);
  assert.equal(result.profile.history.length, 42);
});

test('données corrompues : refusées sans rien modifier', () => {
  const base = makeBackup(richProfile());
  const corrupt = (patch) => readBackup({ ...base, profile: { ...base.profile, ...patch } }).error;
  const badEntry = (patch) => corrupt({ history: [{ ...base.profile.history[0], ...patch }] });
  assert.equal(readBackup({ ...base, profile: null }).error, BACKUP_ERRORS.corrupted);
  assert.equal(readBackup({ ...base, profile: [] }).error, BACKUP_ERRORS.corrupted);
  assert.equal(corrupt({ id: '' }), BACKUP_ERRORS.corrupted);
  assert.equal(corrupt({ name: '<script>' }), BACKUP_ERRORS.corrupted);
  assert.equal(corrupt({ name: 42 }), BACKUP_ERRORS.corrupted);
  assert.equal(corrupt({ avatar: 'x'.repeat(50) }), BACKUP_ERRORS.corrupted);
  assert.equal(corrupt({ createdAt: 'hier' }), BACKUP_ERRORS.corrupted);
  assert.equal(corrupt({ history: 'beaucoup' }), BACKUP_ERRORS.corrupted);
  assert.equal(corrupt({ progress: { demo: { unlocked: 0 } } }), BACKUP_ERRORS.corrupted);
  assert.equal(corrupt({ progress: { demo: { best: { 1: { score: -1, total: 10 } } } } }), BACKUP_ERRORS.corrupted);
  assert.equal(corrupt({ weekly: [{ week: 0 }] }), BACKUP_ERRORS.corrupted);
  assert.equal(badEntry({ score: 11 }), BACKUP_ERRORS.corrupted);   // plus que le total
  assert.equal(badEntry({ score: 2.5 }), BACKUP_ERRORS.corrupted);
  assert.equal(badEntry({ t: -5 }), BACKUP_ERRORS.corrupted);
  assert.equal(badEntry({ game: '' }), BACKUP_ERRORS.corrupted);
  assert.equal(badEntry({ missed: [3] }), BACKUP_ERRORS.corrupted);
  assert.equal(badEntry({ level: 0 }), BACKUP_ERRORS.corrupted);
  // Code tronqué (copie incomplète).
  const code = backupToCode(base);
  assert.equal(readBackup(code.slice(0, code.length - 37)).ok, false);
});

test('un profil sans prénom (jamais nommé) reste importable', () => {
  const result = readBackup(makeBackup(defaultProfile({ id: 'p', createdAt: NOW })));
  assert.equal(result.ok, true);
  assert.equal(result.summary.name, '');
  assert.equal(result.summary.plays, 0);
});
