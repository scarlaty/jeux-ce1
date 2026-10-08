// Stockage local versionné. Toutes les clés commencent par « jeux-ce1: » car toutes les pages
// de scarlaty.github.io partagent le même localStorage.
//
// Deux couches :
//  - createStorage() : clé → valeur JSON, sans jamais lever d'exception. Si localStorage est
//    indisponible (navigation privée, quota, stockage bloqué), on bascule en mémoire :
//    l'appli marche, mais rien n'est conservé (`status()` permet de l'indiquer discrètement).
//  - createStore() : documents typés (meta, profils) avec numéro de schéma et migrations.

import { defaultRewards, normalizeRewards } from './rewards.js';
import { defaultCompanion, normalizeCompanion, companionFloor } from './companion.js';
import { defaultChest } from './chest.js';
import { isTrial } from './trial.js';

export const PREFIX = 'jeux-ce1:';
export const SCHEMA_VERSION = 3;

/** Petit localStorage en mémoire (repli, et faux stockage pour les tests). */
export function createMemoryBackend(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
}

/** Renvoie le localStorage s'il est réellement utilisable, sinon null. */
export function detectBackend(candidate) {
  try {
    const backend = candidate === undefined ? globalThis.localStorage : candidate;
    if (!backend) return null;
    const probe = `${PREFIX}__probe__`;
    backend.setItem(probe, '1');
    backend.removeItem(probe);
    return backend;
  } catch {
    return null;
  }
}

/**
 * Accès clé/valeur JSON préfixé. Aucune méthode ne lève d'exception.
 * `status()` : 'ok' | 'unavailable' (pas de stockage) | 'error' (une écriture a échoué).
 */
export function createStorage({ backend } = {}) {
  const real = detectBackend(backend);
  const fallback = createMemoryBackend();
  // Valeurs dont l'écriture réelle a échoué : on les garde en mémoire pour rester cohérent.
  const overrides = new Map();
  let status = real ? 'ok' : 'unavailable';
  const store = real || fallback;

  return {
    get available() { return real !== null; },
    status: () => status,

    read(key, fallbackValue = null) {
      try {
        const raw = overrides.has(key) ? overrides.get(key) : store.getItem(PREFIX + key);
        return raw === null || raw === undefined ? fallbackValue : JSON.parse(raw);
      } catch {
        return fallbackValue;
      }
    },

    /** Renvoie true si la valeur est réellement enregistrée. */
    write(key, value) {
      let raw;
      try {
        raw = JSON.stringify(value);
      } catch {
        return false;
      }
      try {
        store.setItem(PREFIX + key, raw);
        overrides.delete(key);
        return real !== null;
      } catch {
        overrides.set(key, raw);
        status = 'error';
        return false;
      }
    },

    remove(key) {
      overrides.delete(key);
      try { store.removeItem(PREFIX + key); } catch { /* rien à faire */ }
    },

    /** Clés (sans le préfixe) appartenant à l'appli. */
    keys() {
      const out = new Set(overrides.keys());
      try {
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          if (k && k.startsWith(PREFIX)) out.add(k.slice(PREFIX.length));
        }
      } catch { /* liste partielle */ }
      return [...out];
    },
  };
}

/**
 * Fait passer un document de sa version à `target`, une étape à la fois.
 * `migrations[n]` transforme un document de version n en version n+1.
 * Un document sans `schemaVersion` est considéré en version 0.
 * Un document plus récent que le code (appli plus ancienne) est rendu tel quel.
 */
export function migrate(doc, migrations, target = SCHEMA_VERSION) {
  let version = Number.isInteger(doc?.schemaVersion) ? doc.schemaVersion : 0;
  if (version >= target) return doc;
  let current = doc;
  while (version < target) {
    const step = migrations[version];
    if (typeof step !== 'function') throw new Error(`Migration manquante : v${version} → v${version + 1}`);
    current = step(current);
    version += 1;
    current = { ...current, schemaVersion: version };
  }
  return current;
}

// --- Schéma v2 -------------------------------------------------------------

export function defaultSettings() {
  return { muted: false, theme: 'auto' };   // theme : 'auto' | 'light' | 'dark'
}

export function defaultMeta() {
  return { schemaVersion: SCHEMA_VERSION, profiles: [], activeProfileId: null, settings: defaultSettings() };
}

export function defaultProfile({ id, name = '', avatar = null, createdAt = Date.now() } = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    name,
    avatar,
    createdAt,
    progress: {},   // par jeu : { unlocked, best: { [niveau]: { score, total, stars } }, plays }
    history: [],    // une entrée par partie (voir history.js)
    weekly: [],     // agrégats hebdomadaires des parties les plus anciennes
    rewards: defaultRewards(),   // v2 : points, gommettes par île, défi du jour (voir rewards.js)
    companion: defaultCompanion(),   // #90 : l'œuf, puis le compagnon (voir companion.js)
    chest: defaultChest(),           // #91 : accessoires gagnés et accessoire porté (voir chest.js)
  };
}

const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

/** Pour ajouter une version : incrémenter SCHEMA_VERSION et ajouter l'étape `[ancienne]: doc => doc`. */
export const metaMigrations = {
  // v0 → v1 : document incomplet ou d'avant le versionnage → on complète avec les valeurs par défaut.
  0: (doc) => {
    const base = defaultMeta();
    const src = isObject(doc) ? doc : {};
    return {
      ...base,
      ...src,
      profiles: Array.isArray(src.profiles) ? src.profiles : [],
      settings: { ...base.settings, ...(isObject(src.settings) ? src.settings : {}) },
    };
  },
  // v1 → v2 : seuls les profils changent (champ `rewards`), le document meta est inchangé.
  1: (doc) => doc,
  // v2 → v3 : seuls les profils changent (compagnon), le document meta est inchangé.
  2: (doc) => doc,
};

export const profileMigrations = {
  0: (doc) => {
    const src = isObject(doc) ? doc : {};
    const base = defaultProfile({ id: src.id, createdAt: src.createdAt ?? Date.now() });
    return {
      ...base,
      ...src,
      progress: isObject(src.progress) ? src.progress : {},
      history: Array.isArray(src.history) ? src.history : [],
      weekly: Array.isArray(src.weekly) ? src.weekly : [],
    };
  },
  // v1 → v2 : ajout des récompenses (#16 → #21). La progression existante n'est pas touchée.
  1: (doc) => ({ ...doc, rewards: normalizeRewards(doc?.rewards) }),
  // v2 → v3 (#105) : le compagnon ne cumule plus les étoiles de chaque partie, il suit celles de la carte.
  // `companion.stars` devient un plancher (voir companionFloor) : jamais de recul pour l'enfant.
  2: (doc) => {
    const companion = normalizeCompanion(doc?.companion);
    return { ...doc, companion: { ...companion, stars: companionFloor(companion, doc?.progress) } };
  },
};

const META_KEY = 'meta';
const profileKey = (id) => `profile:${id}`;

/**
 * Accès aux documents de l'appli. Les lectures migrent à la volée et réécrivent le document migré.
 * Si une migration échoue, l'original est sauvegardé sous « backup:<clé> » et on repart d'un défaut,
 * plutôt que de bloquer l'appli.
 *
 * Garde du mode essai (#111) : tant que `readOnly()` est vrai (mode essai, core/trial.js), AUCUN profil
 * n'est écrit ni supprimé — filet de sécurité central, quel que soit l'abonné qui s'y essaie.
 * Les réglages de l'appareil (méta : thème, son) restent modifiables.
 */
export function createStore(storage = createStorage(), { migrations = {}, version = SCHEMA_VERSION, readOnly = isTrial } = {}) {
  const metaSteps = migrations.meta || metaMigrations;
  const profileSteps = migrations.profile || profileMigrations;

  function load(key, steps, makeDefault) {
    const raw = storage.read(key, null);
    if (raw === null) return makeDefault();
    try {
      const doc = migrate(raw, steps, version);
      if (doc !== raw && !readOnly()) storage.write(key, doc);
      return doc;
    } catch {
      storage.write(`backup:${key}`, raw);
      return makeDefault();
    }
  }

  const store = {
    storage,

    getMeta: () => load(META_KEY, metaSteps, defaultMeta),
    setMeta: (meta) => storage.write(META_KEY, { ...meta, schemaVersion: meta.schemaVersion ?? version }),
    updateMeta(fn) {
      const next = fn(store.getMeta());
      store.setMeta(next);
      return next;
    },

    getSettings: () => ({ ...defaultSettings(), ...store.getMeta().settings }),
    setSetting(name, value) {
      store.updateMeta((meta) => ({ ...meta, settings: { ...meta.settings, [name]: value } }));
    },

    /** Profil migré, ou null s'il n'existe pas. */
    getProfile: (id) => load(profileKey(id), profileSteps, () => null),
    setProfile: (profile) => {
      if (readOnly()) return false;
      return storage.write(profileKey(profile.id), { ...profile, schemaVersion: profile.schemaVersion ?? version });
    },
    updateProfile(id, fn) {
      const current = store.getProfile(id) || defaultProfile({ id });
      const next = fn(current);
      store.setProfile(next);
      return next;
    },
    removeProfile: (id) => { if (!readOnly()) storage.remove(profileKey(id)); },
  };
  return store;
}
