// Contrastes mesurés sur les tokens, dans les deux thèmes (#113). Trois couples étaient sous AA
// et aucun test ne les regardait : un chiffre de niveau verrouillé à 2,16:1, la pastille
// « C'est toi » à 2,85:1 sur l'ardoise seulement, et le contour du décor perdu dans la mer de nuit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'css/tokens.css'), 'utf8');

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `bloc introuvable : ${selector}`);
  let depth = 0;
  let end = start;
  for (let i = css.indexOf('{', start); i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') { depth -= 1; if (depth === 0) { end = i; break; } }
  }
  const vars = {};
  for (const [, name, value] of css.slice(start, end).matchAll(/(--[\w-]+):\s*([^;]+);/g)) vars[name] = value.trim();
  return vars;
}

const light = block(':root');
const darkAuto = block(':root:not([data-theme="light"])');
const darkForced = block(':root[data-theme="dark"]');
const dark = { ...light, ...darkForced };

function luminance(hex) {
  // Un `#fff` ou un `rgb(...)` donnerait NaN et passerait inaperçu : on le refuse ici.
  assert.match(String(hex), /^#[0-9a-fA-F]{6}$/, `couleur attendue en #rrggbb : ${hex}`);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* Chaque famille de couleur doit exposer le même contrat que les îles : une encre faite pour son
   fond. C'est le trou de --primary qui a fait recycler --primary-edge, un token de bordure. */
test('l\'encre de la famille primary est lisible sur son fond, dans les deux thèmes', () => {
  for (const [theme, vars] of [['clair', light], ['sombre', dark]]) {
    const ratio = contrast(vars['--primary-ink'], vars['--primary-soft']);
    assert.ok(ratio >= 4.5, `${theme} : --primary-ink sur --primary-soft = ${ratio.toFixed(2)}`);
  }
});

test('le chiffre d\'un niveau verrouillé reste lisible dans les deux thèmes', () => {
  for (const [theme, vars] of [['clair', light], ['sombre', dark]]) {
    // 1,6rem en graisse 600 : gros texte, seuil AA de 3:1.
    const ratio = contrast(vars['--ink-soft'], vars['--surface']);
    assert.ok(ratio >= 3, `${theme} : --ink-soft sur --surface = ${ratio.toFixed(2)}`);
  }
});

test('la règle du niveau verrouillé emploie bien ce couple', () => {
  const components = readFileSync(join(ROOT, 'css/components.css'), 'utf8');
  const rule = components.match(/\.level-card\.is-locked \.level-card__number \{[^}]*\}/);
  assert.ok(rule, 'règle introuvable');
  assert.match(rule[0], /background: var\(--surface\)/);
  assert.match(rule[0], /color: var\(--ink-soft\)/);
});

/* Le thème sombre est déclaré deux fois — au média et au bouton. Les deux copies sont tenues à la
   main : un oubli ne se verrait que dans l'un des deux chemins, donc jamais en développement. */
test('le thème sombre est identique qu\'il vienne du système ou du bouton', () => {
  assert.deepEqual(darkAuto, darkForced);
  assert.ok(Object.keys(darkForced).length > 100);
});

/* `.confirm__list li` (0,1,1) l'emportait sur `.confirm__row` (0,1,0) : l'avatar restait centre
   en face d'un corps de trois lignes, et deux declarations etaient mortes sans bruit (#114). */
test('la ligne de profil de la carte d’import gagne sur la regle generique', () => {
  const css = readFileSync(join(ROOT, 'css/profile.css'), 'utf8');
  const rule = css.match(/\.confirm__list li\.confirm__row \{[^}]*\}/);
  assert.ok(rule, 'la regle doit porter les deux selecteurs pour l’emporter');
  assert.match(rule[0], /align-items:\s*flex-start/);
});
