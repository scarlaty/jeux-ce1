// Mode hors ligne (#8). On ne teste pas les API du navigateur (Cache, fetch…) mais ce qui peut
// silencieusement se casser : la liste de pré-cache de sw.js, qui doit rester exactement celle
// des fichiers servis — y compris les écrans et les jeux chargés paresseusement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { GAMES } from '../js/games/registry.js';
import { SCREENS } from '../js/screens/index.js';
import { importSpecifier, lazyModulePaths } from '../tools/precache.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Fichiers réellement servis au navigateur (sw.js exclu : il ne se met pas en cache lui-même). */
const ASSET_DIRS = ['css', 'fonts', 'icons', 'js'];
const ASSET_EXTS = ['.css', '.js', '.woff2', '.svg', '.png'];
const ROOT_ASSETS = ['index.html', 'manifest.webmanifest'];

function walk(dir) {
  const files = [];
  for (const name of readdirSync(join(ROOT, dir)).sort()) {
    const relative = posix.join(dir, name);
    if (statSync(join(ROOT, relative)).isDirectory()) files.push(...walk(relative));
    else if (ASSET_EXTS.some((ext) => name.endsWith(ext))) files.push(relative);
  }
  return files;
}

function siteAssets() {
  return [...ROOT_ASSETS, ...ASSET_DIRS.flatMap(walk)].sort();
}

/**
 * sw.js est un script classique destiné au navigateur : on l'exécute dans un bac à sable qui
 * fournit juste de quoi survivre au chargement, puis on lit ses constantes.
 */
function loadServiceWorker() {
  const code = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const sandbox = {
    self: { addEventListener() {}, location: { origin: 'https://example.test' }, clients: {} },
    caches: {}, fetch() {}, Response: {}, URL,
  };
  return vm.runInNewContext(`${code}\n;({ VERSION, CACHE, INDEX, PRECACHE });`, sandbox, { filename: 'sw.js' });
}

const sw = loadServiceWorker();

test('le cache porte un numéro de version explicite', () => {
  assert.match(sw.VERSION, /^v\d+$/);
  assert.equal(sw.CACHE, `jeux-ce1-${sw.VERSION}`);
});

test('la liste de pré-cache ne contient ni doublon ni chemin absolu', () => {
  assert.equal(new Set(sw.PRECACHE).size, sw.PRECACHE.length, 'doublon dans PRECACHE');
  for (const path of sw.PRECACHE) {
    assert.ok(!path.startsWith('/') && !path.includes('://'), `chemin non relatif : ${path}`);
  }
});

test('chaque fichier pré-caché existe sur le disque', () => {
  for (const path of sw.PRECACHE) {
    assert.ok(statSync(join(ROOT, path)).isFile(), `introuvable : ${path}`);
  }
});

// Le filet principal : ajouter un fichier (jeu, écran, module du socle, police, icône) sans
// l'ajouter au pré-cache fait échouer ce test au lieu de casser silencieusement le hors ligne.
test('la liste de pré-cache est exactement celle des fichiers servis', () => {
  assert.deepEqual([...sw.PRECACHE].sort(), siteAssets());
});

test('tous les jeux du registre sont pré-cachés, même ceux jamais ouverts', () => {
  for (const path of lazyModulePaths(GAMES, 'js/games')) {
    assert.ok(sw.PRECACHE.includes(path), `jeu absent du pré-cache : ${path}`);
  }
});

test('tous les écrans sont pré-cachés', () => {
  for (const path of lazyModulePaths(SCREENS, 'js/screens')) {
    assert.ok(sw.PRECACHE.includes(path), `écran absent du pré-cache : ${path}`);
  }
});

test('lazyModulePaths lit le chemin de chaque import paresseux', () => {
  assert.equal(importSpecifier(() => import('./demo.js')), './demo.js');
  assert.deepEqual(
    lazyModulePaths([{ load: () => import('./b.js') }, { load: () => import('./a.js') }, { load: () => import('./a.js') }], 'js/x'),
    ['js/x/a.js', 'js/x/b.js'],
  );
  assert.throws(() => importSpecifier(() => null), /introuvable/);
});

test('le manifeste est valide, relatif, et ses icônes existent', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'fr');
  // Jouable en portrait comme en paysage.
  assert.equal(manifest.orientation, 'any');
  const tokens = readFileSync(join(ROOT, 'css/tokens.css'), 'utf8');
  assert.ok(tokens.includes(`--paper: ${manifest.background_color};`), 'background_color hors de tokens.css');
  assert.equal(manifest.theme_color, manifest.background_color);
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
  for (const icon of manifest.icons) {
    assert.ok(!icon.src.startsWith('/'), `icône non relative : ${icon.src}`);
    assert.ok(statSync(join(ROOT, icon.src)).isFile(), `icône introuvable : ${icon.src}`);
  }
});

test('index.html déclare le manifeste et la couleur de thème', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  // Une couleur par thème : la barre système de la tablette suit le clair et l'ardoise.
  assert.match(html, /<meta name="theme-color" media="\(prefers-color-scheme: light\)" content="#fbf8f1">/);
  assert.match(html, /<meta name="theme-color" media="\(prefers-color-scheme: dark\)" content="#27322f">/);
  assert.match(html, /<link rel="stylesheet" href="css\/fonts\.css">/);
  assert.match(html, /<link rel="preload" href="fonts\/andika-400-latin\.woff2"/);
});

// Vie privée : rien ne doit partir vers un tiers (ni CDN de polices, ni analytics).
test('aucune adresse externe dans les fichiers servis', () => {
  const allowed = 'http://www.w3.org/2000/svg';   // espace de noms SVG : aucune requête
  for (const path of ['index.html', 'sw.js', 'manifest.webmanifest', ...ASSET_DIRS.filter((d) => d !== 'fonts').flatMap(walk)]) {
    if (path.endsWith('.woff2') || path.endsWith('.png')) continue;
    const urls = (readFileSync(join(ROOT, path), 'utf8').match(/https?:\/\/[^\s"'()]*/g) || [])
      .filter((url) => url !== allowed);
    assert.deepEqual(urls, [], `adresse externe dans ${path}`);
  }
});
