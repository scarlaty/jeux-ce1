// Sauvegarde d'un profil : fichier .json ou « code » texte (base64 du même JSON).
// Fonctions pures (aucun DOM) : fabrication, encodage, et validation stricte avant import.
//
// Format : { format: 'jeux-ce1/profil', version: 1, exportedAt, profile }
// `profile` est le document du profil TEL QUEL (avec son schemaVersion) : les données ajoutées
// par d'autres modules (`rewards`…) voyagent donc avec lui. À l'import, il est migré par
// profileMigrations (storage.js) puis vérifié champ par champ.
import { SCHEMA_VERSION, migrate, profileMigrations } from './storage.js';
import { validateName } from './profile.js';

export const BACKUP_FORMAT = 'jeux-ce1/profil';
export const BACKUP_VERSION = 1;
/** Taille maximale acceptée (texte du fichier ou du code). */
export const BACKUP_MAX_CHARS = 8_000_000;

export const BACKUP_ERRORS = {
  empty: 'Le fichier ou le code est vide.',
  tooBig: 'Cette sauvegarde est trop grosse pour être une sauvegarde de Jeux CE1.',
  unreadable: 'Ce n\'est pas une sauvegarde de Jeux CE1 lisible. Vérifie que le code est complet.',
  notBackup: 'Ce fichier n\'est pas une sauvegarde de Jeux CE1.',
  future: 'Cette sauvegarde vient d\'une version plus récente de Jeux CE1. Recharge la page pour mettre le jeu à jour, puis réessaie.',
  corrupted: 'Cette sauvegarde est abîmée\u00a0: certaines données sont incorrectes. Rien n\'a été modifié.',
};

/** Enveloppe de sauvegarde d'un profil. */
export function makeBackup(profile, { now = Date.now() } = {}) {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now, profile: structuredClone(profile) };
}

/** Texte du fichier .json. */
export const backupToJson = (backup) => JSON.stringify(backup);

/** Code texte : base64 du JSON encodé en UTF-8. */
export function backupToCode(backup) {
  const bytes = new TextEncoder().encode(backupToJson(backup));
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binary);
}

/** Décode un code base64 (espaces et retours à la ligne ignorés) ; lève une erreur si invalide. */
export function codeToJson(code) {
  const clean = String(code).replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) throw new Error('base64');
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/** Nom de fichier : jeux-ce1-lea-2026-10-06.json (prénom sans accents). */
export function backupFileName(profile, now = Date.now()) {
  const slug = String(profile?.name || 'profil').normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'profil';
  return `jeux-ce1-${slug}-${new Date(now).toISOString().slice(0, 10)}.json`;
}

// --- Validation --------------------------------------------------------------------------------

const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const isCount = (x) => Number.isInteger(x) && x >= 0;
const isTime = (x) => Number.isFinite(x) && x >= 0;
const isLevel = (x) => Number.isInteger(x) && x >= 1 && x <= 99;
const isText = (x) => typeof x === 'string' && x.length > 0 && x.length <= 200;

function isHistoryEntry(e) {
  return isObject(e) && isTime(e.t) && isText(e.game) && isLevel(e.level)
    && isCount(e.score) && isCount(e.total) && e.score <= e.total
    && (e.durationMs === undefined || isTime(e.durationMs))
    && Array.isArray(e.missed) && e.missed.every(isText);
}

function isWeeklyRow(w) {
  return isObject(w) && isTime(w.week) && isText(w.game) && isLevel(w.level)
    && isCount(w.games) && isCount(w.score) && isCount(w.total) && w.score <= w.total && isTime(w.durationMs);
}

function isProgress(p) {
  return isObject(p) && (p.unlocked === undefined || isLevel(p.unlocked))
    && (p.plays === undefined || isCount(p.plays))
    && (p.best === undefined || (isObject(p.best) && Object.values(p.best).every((b) => isObject(b)
      && isCount(b.score) && isCount(b.total) && (b.stars === undefined || (isCount(b.stars) && b.stars <= 3)))));
}

/** Vérifie un profil déjà migré au schéma courant. Renvoie true s'il est utilisable. */
export function isValidProfile(p) {
  return isObject(p)
    && p.schemaVersion === SCHEMA_VERSION
    && isText(p.id)
    && typeof p.name === 'string' && (p.name === '' || validateName(p.name).value === p.name)
    && (p.avatar === null || (typeof p.avatar === 'string' && p.avatar.length <= 16))
    && isTime(p.createdAt)
    && isObject(p.progress) && Object.values(p.progress).every(isProgress)
    && Array.isArray(p.history) && p.history.every(isHistoryEntry)
    && Array.isArray(p.weekly) && p.weekly.every(isWeeklyRow);
}

/** Texte collé ou lu dans un fichier → objet JSON (le texte peut être le JSON ou le code base64). */
function parseText(text) {
  const trimmed = text.trim();
  if (/^[[{]/.test(trimmed)) return JSON.parse(trimmed);
  return JSON.parse(codeToJson(trimmed));
}

/**
 * Lit et valide une sauvegarde (texte du fichier, code collé, ou objet déjà lu).
 * Renvoie { ok: true, profile, summary: { name, avatar, plays, exportedAt } } — profil migré au schéma courant —
 * ou { ok: false, error } avec un message à afficher. Ne modifie jamais rien.
 */
export function readBackup(input) {
  let data = input;
  if (typeof input === 'string') {
    if (!input.trim()) return { ok: false, error: BACKUP_ERRORS.empty };
    if (input.length > BACKUP_MAX_CHARS) return { ok: false, error: BACKUP_ERRORS.tooBig };
    try { data = parseText(input); } catch { return { ok: false, error: BACKUP_ERRORS.unreadable }; }
  }
  if (!isObject(data) || data.format !== BACKUP_FORMAT || !Number.isInteger(data.version) || data.version < 1) {
    return { ok: false, error: BACKUP_ERRORS.notBackup };
  }
  if (data.version > BACKUP_VERSION) return { ok: false, error: BACKUP_ERRORS.future };
  const raw = data.profile;
  if (!isObject(raw)) return { ok: false, error: BACKUP_ERRORS.corrupted };
  if (Number.isInteger(raw.schemaVersion) && raw.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: BACKUP_ERRORS.future };
  }
  let profile;
  try {
    profile = migrate(structuredClone(raw), profileMigrations, SCHEMA_VERSION);
  } catch {
    return { ok: false, error: BACKUP_ERRORS.corrupted };
  }
  if (!isValidProfile(profile)) return { ok: false, error: BACKUP_ERRORS.corrupted };
  const plays = profile.history.length + profile.weekly.reduce((n, w) => n + w.games, 0);
  const exportedAt = isTime(data.exportedAt) ? data.exportedAt : null;
  return { ok: true, profile, summary: { name: profile.name, avatar: profile.avatar, plays, exportedAt } };
}
