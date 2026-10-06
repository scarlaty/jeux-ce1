// Exporter / importer une sauvegarde (#14). Logique pure (sauf `buildBackup` et `applyBackup`
// qui lisent/écrivent le store) : aucun DOM, aucun réseau. Le fichier produit ne quitte jamais
// l'appareil — c'est l'enfant ou le parent qui le déplace.
//
// Format : JSON versionné DEUX fois.
//  - `format`        : version de l'enveloppe (ce fichier) ;
//  - `schemaVersion` : version des documents de profil (storage.js), rejouée à l'import par les
//                      migrations normales — une vieille sauvegarde reste donc importable.
// Les réglages de l'appareil (thème, son) ne sont PAS exportés : ils appartiennent à la tablette,
// pas à l'enfant.
import { SCHEMA_VERSION, defaultProfile, migrate, profileMigrations } from './storage.js';
import { cleanName } from './profile.js';

export const BACKUP_APP = 'jeux-ce1';
export const BACKUP_FORMAT = 1;

const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const num = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);
const fail = (error) => ({ ok: false, error });

/** Sauvegarde complète : tous les profils connus du méta. */
export function buildBackup(store, { now = Date.now() } = {}) {
  const meta = store.getMeta();
  const profiles = meta.profiles
    .map((row) => store.getProfile(row.id))
    .filter(Boolean);
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now,
    activeProfileId: profiles.some((p) => p.id === meta.activeProfileId) ? meta.activeProfileId : (profiles[0]?.id ?? null),
    profiles,
  };
}

/** Texte à coller dans un fichier ou dans la zone de texte (indenté : relisible à l'œil). */
export function serializeBackup(backup) {
  return JSON.stringify(backup, null, 2);
}

/** Nom du fichier proposé au téléchargement. Jamais le prénom de l'enfant : c'est une donnée privée. */
export function backupFilename(backup) {
  const d = new Date(backup?.exportedAt ?? Date.now());
  return `jeux-ce1-sauvegarde-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
}

// --- Validation ------------------------------------------------------------------------------

// Le fichier importé vient de l'extérieur : une clé « __proto__ » recopiée telle quelle
// redéfinirait le prototype de l'objet construit au lieu d'y ajouter une entrée.
const safeKey = (key) => key !== '__proto__' && key !== 'constructor' && key !== 'prototype';

function sanitizeProgress(raw) {
  if (!isObject(raw)) return {};
  const out = {};
  for (const [gameId, value] of Object.entries(raw)) {
    if (!isObject(value) || !safeKey(gameId)) continue;
    const best = {};
    if (isObject(value.best)) {
      for (const [level, b] of Object.entries(value.best)) {
        if (!isObject(b) || !safeKey(level)) continue;
        best[level] = { score: num(b.score), total: num(b.total), stars: num(b.stars) };
      }
    }
    out[gameId] = {
      unlocked: Math.max(1, Math.trunc(num(value.unlocked, 1))),
      best,
      plays: Math.max(0, Math.trunc(num(value.plays))),
    };
  }
  return out;
}

function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => isObject(e) && typeof e.game === 'string' && Number.isFinite(e.t))
    .map((e) => ({
      t: e.t,
      game: e.game,
      level: Math.max(1, Math.trunc(num(e.level, 1))),
      score: num(e.score),
      total: num(e.total),
      durationMs: Math.max(0, num(e.durationMs)),
      missed: Array.isArray(e.missed) ? e.missed.filter((s) => typeof s === 'string') : [],
    }));
}

function sanitizeWeekly(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((w) => isObject(w) && Number.isFinite(w.week) && typeof w.game === 'string')
    .map((w) => ({
      week: w.week,
      game: w.game,
      level: Math.max(1, Math.trunc(num(w.level, 1))),
      games: Math.max(0, Math.trunc(num(w.games))),
      score: num(w.score),
      total: num(w.total),
      durationMs: Math.max(0, num(w.durationMs)),
    }));
}

/**
 * Document de profil propre, quel que soit ce qu'il y avait dans le fichier : migré vers le
 * schéma courant, puis réduit aux champs connus et typés. Rien du fichier n'est recopié tel quel.
 */
export function normalizeProfile(raw, { now = Date.now() } = {}) {
  const doc = migrate(raw, profileMigrations, SCHEMA_VERSION);
  const base = defaultProfile({
    id: String(doc.id),
    name: cleanName(doc.name),
    avatar: typeof doc.avatar === 'string' ? doc.avatar : null,
    createdAt: num(doc.createdAt, now),
  });
  return {
    ...base,
    progress: sanitizeProgress(doc.progress),
    history: sanitizeHistory(doc.history),
    weekly: sanitizeWeekly(doc.weekly),
  };
}

/**
 * Vérifie l'enveloppe et nettoie les profils. Renvoie `{ ok: true, backup }` ou
 * `{ ok: false, error }` avec un message compréhensible par un adulte pressé.
 */
export function validateBackup(data, { now = Date.now() } = {}) {
  if (!isObject(data)) return fail('Ce fichier ne contient pas une sauvegarde.');
  if (data.app !== BACKUP_APP) return fail('Cette sauvegarde ne vient pas des Jeux CE1.');
  if (!Number.isInteger(data.format)) return fail('Cette sauvegarde n\'indique pas sa version : elle est inutilisable.');
  if (data.format > BACKUP_FORMAT) {
    return fail('Cette sauvegarde vient d\'une version plus récente des jeux. Mettez l\'application à jour, puis réessayez.');
  }
  if (!Array.isArray(data.profiles) || data.profiles.length === 0) {
    return fail('Cette sauvegarde ne contient aucun profil.');
  }
  const seen = new Set();
  const profiles = [];
  for (const raw of data.profiles) {
    if (!isObject(raw) || typeof raw.id !== 'string' || raw.id === '') {
      return fail('Un profil de cette sauvegarde est incomplet : rien n\'a été importé.');
    }
    if (seen.has(raw.id)) return fail('Cette sauvegarde contient deux fois le même profil.');
    seen.add(raw.id);
    let profile;
    try {
      profile = normalizeProfile(raw, { now });
    } catch {
      return fail('Un profil de cette sauvegarde n\'a pas pu être lu : rien n\'a été importé.');
    }
    profiles.push(profile);
  }
  const activeProfileId = seen.has(data.activeProfileId) ? data.activeProfileId : profiles[0].id;
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      format: BACKUP_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: num(data.exportedAt, now),
      activeProfileId,
      profiles,
    },
  };
}

/** Lit un texte collé ou le contenu d'un fichier. Même retour que `validateBackup`. */
export function parseBackup(text, options = {}) {
  let data;
  try {
    data = JSON.parse(String(text ?? ''));
  } catch {
    return fail('Le texte collé n\'est pas une sauvegarde lisible. Copiez-le en entier, puis réessayez.');
  }
  return validateBackup(data, options);
}

/** Résumé affiché AVANT d'écrire quoi que ce soit : on ne remplace jamais sans confirmation. */
export function describeBackup(backup) {
  return {
    exportedAt: backup.exportedAt,
    profiles: backup.profiles.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      plays: p.history.length + p.weekly.reduce((sum, w) => sum + w.games, 0),
    })),
  };
}

/**
 * Écrit la sauvegarde dans le store.
 *  - `mode: 'merge'`   : ajoute les profils ; un profil déjà présent (même identifiant) est
 *                        remplacé par celui de la sauvegarde ;
 *  - `mode: 'replace'` : efface d'abord tous les profils de l'appareil.
 * Les réglages de l'appareil (thème, son) ne sont jamais touchés.
 */
export function applyBackup(store, backup, { mode = 'merge' } = {}) {
  const meta = store.getMeta();
  if (mode === 'replace') {
    for (const row of meta.profiles) store.removeProfile(row.id);
  }
  const rows = mode === 'replace' ? [] : meta.profiles.map((p) => ({ ...p }));
  for (const profile of backup.profiles) {
    store.setProfile(profile);
    const row = { id: profile.id, name: profile.name, avatar: profile.avatar };
    const i = rows.findIndex((p) => p.id === profile.id);
    if (i >= 0) rows[i] = row; else rows.push(row);
  }
  const activeProfileId = rows.some((p) => p.id === backup.activeProfileId) ? backup.activeProfileId : rows[0].id;
  store.setMeta({ ...meta, profiles: rows, activeProfileId });
  return { imported: backup.profiles.length, profiles: rows, activeProfileId };
}
