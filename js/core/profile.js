// Profils : création, prénom et avatar, choix du profil actif, remise à zéro, suppression.
// `meta.profiles` garde un résumé { id, name, avatar } de chaque profil (pour les listes) :
// toute modification du prénom ou de l'avatar passe par ici pour rester synchronisée.
import { defaultProfile } from './storage.js';

export const NAME_MAX = 20;

/** Avatars proposés : des animaux (émojis = images de contenu, avec un nom accessible). */
export const AVATARS = [
  { emoji: '🦊', label: 'renard' },
  { emoji: '🐱', label: 'chat' },
  { emoji: '🐶', label: 'chien' },
  { emoji: '🐰', label: 'lapin' },
  { emoji: '🐼', label: 'panda' },
  { emoji: '🐨', label: 'koala' },
  { emoji: '🦁', label: 'lion' },
  { emoji: '🐯', label: 'tigre' },
  { emoji: '🐻', label: 'ours' },
  { emoji: '🐵', label: 'singe' },
  { emoji: '🐸', label: 'grenouille' },
  { emoji: '🐢', label: 'tortue' },
  { emoji: '🐧', label: 'manchot' },
  { emoji: '🦉', label: 'chouette' },
  { emoji: '🦔', label: 'hérisson' },
  { emoji: '🐬', label: 'dauphin' },
  { emoji: '🐙', label: 'pieuvre' },
  { emoji: '🦋', label: 'papillon' },
  { emoji: '🐞', label: 'coccinelle' },
  { emoji: '🦄', label: 'licorne' },
];

/** Nom accessible d'un avatar (« renard »), ou « animal » s'il est inconnu. */
export function avatarLabel(emoji) {
  return AVATARS.find((a) => a.emoji === emoji)?.label || 'animal';
}

/** Une lettre d'abord, puis des lettres (avec accents), espaces, tirets ou apostrophes. */
const NAME_PATTERN = /^\p{L}[\p{L}\p{M} '’-]*$/u;

/**
 * Valide un prénom saisi. Renvoie { ok: true, value } (prénom nettoyé : espaces en trop retirés,
 * forme Unicode NFC) ou { ok: false, error } avec un message bienveillant pour l'enfant.
 */
export function validateName(raw) {
  const value = String(raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!value) return { ok: false, error: 'Écris ton prénom.' };
  if ([...value].length > NAME_MAX) return { ok: false, error: `C'est un peu long\u00a0: ${NAME_MAX} lettres au maximum.` };
  if (!NAME_PATTERN.test(value)) return { ok: false, error: 'Écris seulement des lettres, sans chiffres ni signes.' };
  return { ok: true, value };
}

/** Un profil est complet quand il a un prénom valide et un avatar. */
export function isProfileComplete(profile) {
  return Boolean(profile && validateName(profile.name).ok && profile.avatar);
}

/** Identifiant court et unique parmi les profils existants. */
export function newProfileId(existingIds = [], now = Date.now()) {
  let id = `p${now.toString(36)}`;
  while (existingIds.includes(id)) id += 'x';
  return id;
}

const summaryOf = (profile) => ({ id: profile.id, name: profile.name || '', avatar: profile.avatar ?? null });

/** Résumés { id, name, avatar } de tous les profils, dans l'ordre de création. */
export function listProfiles(store) {
  return store.getMeta().profiles.map(summaryOf);
}

/** Crée un profil, l'ajoute à la liste et le rend actif. */
export function createProfile(store, { name = '', avatar = null } = {}) {
  const meta = store.getMeta();
  const id = newProfileId(meta.profiles.map((p) => p.id));
  store.setProfile(defaultProfile({ id, name, avatar }));
  store.setMeta({ ...meta, profiles: [...meta.profiles, { id, name, avatar }], activeProfileId: id });
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

/** Recopie le résumé d'un profil dans `meta.profiles` (l'ajoute s'il manque). */
function syncSummary(store, profile) {
  store.updateMeta((meta) => {
    const exists = meta.profiles.some((p) => p.id === profile.id);
    const profiles = exists
      ? meta.profiles.map((p) => (p.id === profile.id ? summaryOf(profile) : p))
      : [...meta.profiles, summaryOf(profile)];
    return { ...meta, profiles };
  });
}

/** Change le prénom et/ou l'avatar d'un profil (le prénom doit être déjà validé). */
export function updateIdentity(store, id, { name, avatar } = {}) {
  const profile = store.updateProfile(id, (p) => ({
    ...p,
    ...(name !== undefined ? { name } : {}),
    ...(avatar !== undefined ? { avatar } : {}),
  }));
  syncSummary(store, profile);
  return profile;
}

/**
 * Efface toute la progression d'un profil (parties, progression, récompenses…) en gardant
 * son identité : identifiant, prénom, avatar, date de création.
 */
export function resetProfile(store, id) {
  const current = store.getProfile(id);
  if (!current) return null;
  const fresh = defaultProfile({ id, name: current.name, avatar: current.avatar, createdAt: current.createdAt });
  store.setProfile(fresh);
  return fresh;
}

/**
 * Supprime un profil. Si c'était le profil actif, le premier profil restant devient actif
 * (aucun : `activeProfileId` vaut null et ensureActiveProfile recréera un profil anonyme).
 * Renvoie l'identifiant du profil actif après suppression (ou null).
 */
export function deleteProfile(store, id) {
  store.removeProfile(id);
  const meta = store.updateMeta((m) => {
    const profiles = m.profiles.filter((p) => p.id !== id);
    const activeProfileId = m.activeProfileId === id ? (profiles[0]?.id ?? null) : m.activeProfileId;
    return { ...m, profiles, activeProfileId };
  });
  return meta.activeProfileId;
}

/** Enregistre un profil complet (import) : remplace un profil existant ou en ajoute un nouveau. */
export function saveImportedProfile(store, profile, { mode = 'add', targetId = null } = {}) {
  const ids = store.getMeta().profiles.map((p) => p.id);
  const id = mode === 'replace' && targetId ? targetId : newProfileId(ids);
  const saved = { ...profile, id };
  store.setProfile(saved);
  syncSummary(store, saved);
  return id;
}

/** Chemins accessibles même sans profil choisi (un adulte peut y restaurer une sauvegarde). */
export const GATE_FREE_PATHS = ['/parents'];

/**
 * Écran à imposer avant d'aller sur `path` (ou null) :
 *  - '/profils' à l'ouverture quand plusieurs profils existent et qu'aucun n'a été choisi ;
 *  - '/bienvenue' tant que le profil actif n'a pas de prénom ou d'avatar.
 */
export function profileGate({ path, profile, profileCount, chosen }) {
  if (GATE_FREE_PATHS.includes(path)) return null;
  if (profileCount > 1 && !chosen) return path === '/profils' ? null : '/profils';
  if (!isProfileComplete(profile)) return path === '/bienvenue' ? null : '/bienvenue';
  return null;
}
