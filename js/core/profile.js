// Profils : version minimale du socle. L'écran de bienvenue (prénom, avatar) et le choix entre
// plusieurs profils (issues #9 et #10) s'appuieront sur ces fonctions.
import { defaultProfile } from './storage.js';

/** Identifiant court et unique parmi les profils existants. */
export function newProfileId(existingIds = [], now = Date.now()) {
  let id = `p${now.toString(36)}`;
  while (existingIds.includes(id)) id += 'x';
  return id;
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
