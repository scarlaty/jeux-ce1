// Profils : prénom, avatar, liste des profils, profil actif (#9, #10).
// Fonctions pures ou simples lectures/écritures du store — aucun DOM ici.
//
// Le prénom est saisi par l'enfant : il est nettoyé par `cleanName` et toujours affiché avec
// `textContent`. Il n'est jamais mis dans une URL, un nom de fichier ni du HTML.
import { defaultProfile } from './storage.js';

/** Longueur maximale d'un prénom (en caractères affichés, émojis compris). */
export const MAX_NAME = 16;

/** Avatars proposés. L'émoji est une image de contenu : il porte toujours son nom (`label`). */
export const AVATARS = [
  { id: 'chat', emoji: '🐱', label: 'Chat' },
  { id: 'renard', emoji: '🦊', label: 'Renard' },
  { id: 'lapin', emoji: '🐰', label: 'Lapin' },
  { id: 'panda', emoji: '🐼', label: 'Panda' },
  { id: 'licorne', emoji: '🦄', label: 'Licorne' },
  { id: 'grenouille', emoji: '🐸', label: 'Grenouille' },
  { id: 'hibou', emoji: '🦉', label: 'Hibou' },
  { id: 'poussin', emoji: '🐥', label: 'Poussin' },
  { id: 'abeille', emoji: '🐝', label: 'Abeille' },
  { id: 'dauphin', emoji: '🐬', label: 'Dauphin' },
  { id: 'dragon', emoji: '🐲', label: 'Dragon' },
  { id: 'fusee', emoji: '🚀', label: 'Fusée' },
];

export const DEFAULT_AVATAR = AVATARS[0].id;

/** Avatar connu, ou le premier de la liste si l'identifiant est inconnu. */
export function avatarOf(id) {
  return AVATARS.find((a) => a.id === id) || AVATARS[0];
}

/** Prénom nettoyé : espaces réduits, longueur bornée (découpe sûre des émojis). */
export function cleanName(raw) {
  const text = String(raw ?? '').replace(/\s+/g, ' ').trim();
  return [...text].slice(0, MAX_NAME).join('');
}

/** Un prénom est acceptable dès qu'il reste au moins un caractère après nettoyage. */
export function isValidName(raw) {
  return cleanName(raw).length > 0;
}

/**
 * Identifiant court et unique parmi les profils existants.
 * La part aléatoire compte : deux appareils différents créent souvent un profil la même
 * milliseconde, et l'import d'une sauvegarde (#14) écraserait alors le mauvais profil.
 */
export function newProfileId(existingIds = [], now = Date.now(), rand = Math.random) {
  const suffix = Math.floor(rand() * 36 ** 4).toString(36).padStart(4, '0');
  let id = `p${now.toString(36)}${suffix}`;
  while (existingIds.includes(id)) id += 'x';
  return id;
}

/** Crée un profil, l'ajoute à la liste et le rend actif. */
export function createProfile(store, { name = '', avatar = null } = {}) {
  const meta = store.getMeta();
  const id = newProfileId(meta.profiles.map((p) => p.id));
  const clean = cleanName(name);
  store.setProfile(defaultProfile({ id, name: clean, avatar }));
  store.setMeta({ ...meta, profiles: [...meta.profiles, { id, name: clean, avatar }], activeProfileId: id });
  return id;
}

/** Garantit qu'un profil actif existe (anonyme au premier lancement) et renvoie son identifiant. */
export function ensureActiveProfile(store) {
  const meta = store.getMeta();
  const active = meta.profiles.find((p) => p.id === meta.activeProfileId);
  if (active) return active.id;
  if (meta.profiles.length) {
    store.setMeta({ ...meta, activeProfileId: meta.profiles[0].id });
    return meta.profiles[0].id;
  }
  return createProfile(store);
}

/**
 * Change le prénom et/ou l'avatar, dans le document du profil ET dans la liste du méta
 * (les deux portent ces champs : l'accueil lit le profil, la barre du haut lit la liste).
 */
export function updateIdentity(store, id, { name, avatar } = {}) {
  const patch = {};
  if (name !== undefined) patch.name = cleanName(name);
  if (avatar !== undefined) patch.avatar = avatar;
  if (Object.keys(patch).length === 0) return patch;
  store.updateProfile(id, (profile) => ({ ...profile, ...patch }));
  store.updateMeta((meta) => ({
    ...meta,
    profiles: meta.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  }));
  return patch;
}

/** Liste des profils pour l'affichage : `{ id, name, avatar, active }`. */
export function listProfiles(store) {
  const meta = store.getMeta();
  return meta.profiles.map((row) => {
    const doc = store.getProfile(row.id);
    return {
      id: row.id,
      name: cleanName(doc?.name ?? row.name ?? ''),
      avatar: doc?.avatar ?? row.avatar ?? null,
      active: row.id === meta.activeProfileId,
    };
  });
}

/** Rend un profil actif. Renvoie false si l'identifiant est inconnu. */
export function setActiveProfile(store, id) {
  const meta = store.getMeta();
  if (!meta.profiles.some((p) => p.id === id)) return false;
  store.setMeta({ ...meta, activeProfileId: id });
  return true;
}

/** Supprime un profil (jamais le dernier) ; un autre devient actif si besoin. */
export function removeProfile(store, id) {
  const meta = store.getMeta();
  if (meta.profiles.length <= 1 || !meta.profiles.some((p) => p.id === id)) return false;
  store.removeProfile(id);
  const profiles = meta.profiles.filter((p) => p.id !== id);
  const activeProfileId = meta.activeProfileId === id ? profiles[0].id : meta.activeProfileId;
  store.setMeta({ ...meta, profiles, activeProfileId });
  return true;
}

/** Efface la progression et l'historique d'un profil, mais garde son prénom et son avatar. */
export function resetProgress(store, id) {
  return store.updateProfile(id, (profile) => ({ ...profile, progress: {}, history: [], weekly: [] }));
}

/** Vrai au tout premier lancement : le profil actif n'a pas encore de prénom. */
export function needsWelcome(store) {
  const id = ensureActiveProfile(store);
  return !cleanName(store.getProfile(id)?.name);
}
