// Les nombres en lettres servent à plusieurs jeux et s'affichent tels quels à l'enfant :
// une seule faute d'orthographe est une faute de trop. On convertit donc TOUS les entiers de
// la plage, on vérifie à la main une longue liste de cas de référence, et on contrôle les
// accords (« quatre-vingts », « deux-cents », « mille ») sur l'ensemble des nombres.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX, enLettres, enChiffres, morceaux } from '../../js/data/nombres-en-lettres.js';

/** Cas relus un par un : chaque piège du programme CE1 est représenté. */
const REFERENCE = [
  [0, 'zéro'], [1, 'un'], [2, 'deux'], [5, 'cinq'], [9, 'neuf'], [10, 'dix'],
  [11, 'onze'], [15, 'quinze'], [16, 'seize'], [17, 'dix-sept'], [18, 'dix-huit'], [19, 'dix-neuf'],
  // Les dizaines régulières et le « et » de 21 à 61.
  [20, 'vingt'], [21, 'vingt-et-un'], [22, 'vingt-deux'], [29, 'vingt-neuf'],
  [30, 'trente'], [31, 'trente-et-un'], [40, 'quarante'], [41, 'quarante-et-un'],
  [50, 'cinquante'], [51, 'cinquante-et-un'], [60, 'soixante'], [61, 'soixante-et-un'],
  [62, 'soixante-deux'], [69, 'soixante-neuf'],
  // 70 à 79 : on continue à compter à partir de soixante.
  [70, 'soixante-dix'], [71, 'soixante-et-onze'], [72, 'soixante-douze'], [76, 'soixante-seize'],
  [77, 'soixante-dix-sept'], [78, 'soixante-dix-huit'], [79, 'soixante-dix-neuf'],
  // 80 prend un s, 81 à 99 non — et jamais de « et » à 81.
  [80, 'quatre-vingts'], [81, 'quatre-vingt-un'], [82, 'quatre-vingt-deux'], [89, 'quatre-vingt-neuf'],
  [90, 'quatre-vingt-dix'], [91, 'quatre-vingt-onze'], [92, 'quatre-vingt-douze'],
  [96, 'quatre-vingt-seize'], [97, 'quatre-vingt-dix-sept'], [99, 'quatre-vingt-dix-neuf'],
  // Les centaines : « cent » ne prend un s que s'il est multiplié et final.
  [100, 'cent'], [101, 'cent-un'], [110, 'cent-dix'], [120, 'cent-vingt'], [121, 'cent-vingt-et-un'],
  [171, 'cent-soixante-et-onze'], [180, 'cent-quatre-vingts'], [181, 'cent-quatre-vingt-un'],
  [199, 'cent-quatre-vingt-dix-neuf'],
  [200, 'deux-cents'], [201, 'deux-cent-un'], [230, 'deux-cent-trente'], [280, 'deux-cent-quatre-vingts'],
  [300, 'trois-cents'], [400, 'quatre-cents'], [500, 'cinq-cents'], [555, 'cinq-cent-cinquante-cinq'],
  [600, 'six-cents'], [700, 'sept-cents'], [800, 'huit-cents'], [900, 'neuf-cents'],
  [999, 'neuf-cent-quatre-vingt-dix-neuf'],
  // Mille est invariable.
  [1000, 'mille'], [1001, 'mille-un'], [1080, 'mille-quatre-vingts'], [1100, 'mille-cent'],
  [2000, 'deux-mille'], [2345, 'deux-mille-trois-cent-quarante-cinq'],
  [9999, 'neuf-mille-neuf-cent-quatre-vingt-dix-neuf'],
];

const all = () => Array.from({ length: MAX + 1 }, (_, n) => [n, enLettres(n)]);

test('les cas de référence, relus un par un', () => {
  assert.ok(REFERENCE.length >= 40, `${REFERENCE.length} cas de référence`);
  for (const [n, expected] of REFERENCE) assert.equal(enLettres(n), expected, `${n}`);
});

test('tous les entiers de 0 à 1000 se convertissent (programme CE1)', () => {
  for (let n = 0; n <= 1000; n++) {
    const mots = enLettres(n);
    assert.equal(typeof mots, 'string');
    assert.ok(mots.length > 0, `${n}`);
  }
});

test('orthographe rectifiée : traits d\'union partout, jamais d\'espace', () => {
  for (const [n, mots] of all()) {
    assert.match(mots, /^[a-zéèà]+(-[a-zéèà]+)*$/, `${n} → ${mots}`);
    assert.doesNotMatch(mots, /\s/, `${n} → ${mots}`);
    assert.doesNotMatch(mots, /--/, `${n} → ${mots}`);
  }
});

test('deux nombres ne s\'écrivent jamais pareil', () => {
  const words = all().map(([, mots]) => mots);
  assert.equal(new Set(words).size, words.length);
});

test('« quatre-vingts » prend un s seulement à 80, 180, 280… et jamais au-delà', () => {
  for (const [n, mots] of all()) {
    assert.equal(mots.includes('quatre-vingts'), n % 100 === 80, `${n} → ${mots}`);
    // Un s suivi d'autre chose serait une faute : « quatre-vingts-deux ».
    assert.doesNotMatch(mots, /quatre-vingts-/, `${n} → ${mots}`);
    if (n % 100 > 80 || (n % 100 >= 90 && n % 100 <= 99)) {
      assert.doesNotMatch(mots, /vingts/, `${n} → ${mots}`);
    }
  }
});

test('« cent » prend un s seulement s\'il est multiplié et final', () => {
  for (const [n, mots] of all()) {
    const plural = n % 1000 >= 200 && n % 100 === 0;
    assert.equal(/cents/.test(mots), plural, `${n} → ${mots}`);
    assert.doesNotMatch(mots, /cents-/, `${n} → ${mots}`);
    // 100 ne s'écrit jamais « un-cent ».
    assert.doesNotMatch(mots, /un-cent/, `${n} → ${mots}`);
  }
});

test('« mille » est invariable et ne se multiplie pas par un', () => {
  for (const [n, mots] of all()) {
    assert.doesNotMatch(mots, /milles/, `${n} → ${mots}`);
    assert.doesNotMatch(mots, /un-mille/, `${n} → ${mots}`);
    assert.equal(mots.includes('mille'), n >= 1000, `${n} → ${mots}`);
  }
});

test('« et » seulement à 21, 31, 41, 51, 61 et 71 — jamais à 81 ni à 91', () => {
  const withEt = new Set([21, 31, 41, 51, 61, 71]);
  for (const [n, mots] of all()) {
    assert.equal(mots.includes('-et-'), withEt.has(n % 100), `${n} → ${mots}`);
  }
  assert.equal(enLettres(81), 'quatre-vingt-un');
  assert.equal(enLettres(91), 'quatre-vingt-onze');
});

test('de 70 à 79 et de 90 à 99, on compte à partir de 60 et de 80', () => {
  for (let n = 70; n <= 79; n++) assert.ok(enLettres(n).startsWith('soixante-'), enLettres(n));
  for (let n = 90; n <= 99; n++) assert.ok(enLettres(n).startsWith('quatre-vingt-'), enLettres(n));
  // On n'invente ni « septante » ni « nonante ».
  for (const [, mots] of all()) assert.doesNotMatch(mots, /septante|huitante|octante|nonante/);
});

test('la fonction inverse retrouve tous les nombres', () => {
  for (const [n, mots] of all()) assert.equal(enChiffres(mots), n, mots);
  assert.equal(enChiffres('  Deux-Cent-Trente '), 230, 'majuscules et espaces autour');
  // Une orthographe fautive n'est pas un nombre : null, jamais une valeur approchée.
  for (const faux of ['quatre-vingts-deux', 'deux-cent-trentes', 'vingt et un', 'soixante-dix-sept-sept', '']) {
    assert.equal(enChiffres(faux), null, faux);
  }
});

test('morceaux() découpe le nombre mot à mot', () => {
  assert.deepEqual(morceaux(97), ['quatre', 'vingt', 'dix', 'sept']);
  assert.deepEqual(morceaux(71), ['soixante', 'et', 'onze']);
  assert.deepEqual(morceaux(230), ['deux', 'cent', 'trente']);
  assert.deepEqual(morceaux(60), ['soixante']);
  for (const [n, mots] of all()) assert.equal(morceaux(n).join('-'), mots);
});

test('hors de la plage, enLettres refuse plutôt que d\'inventer', () => {
  for (const bad of [-1, 1.5, MAX + 1, NaN, '12', null, undefined]) {
    assert.throws(() => enLettres(bad), RangeError, String(bad));
  }
});
