// Palette kawaii (#88) : les teintes pastel sont des fonds d'autocollant. On vérifie, en clair
// comme sur l'ardoise, que le texte et les visages posés dessus restent lisibles (AA).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLORS } from '../js/core/ui/art/kawaii-parts.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'css/tokens.css'), 'utf8');

/** Variables déclarées dans le bloc qui suit `selector { … }` (premier bloc trouvé). */
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
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('chaque couleur du kit a sa teinte, son contour et son encre', () => {
  for (const color of COLORS) {
    for (const suffix of ['', '-deep', '-ink']) {
      assert.match(light[`--kawaii-${color}${suffix}`] || '', /^#[0-9a-f]{6}$/, `--kawaii-${color}${suffix}`);
    }
  }
});

test('le texte et les visages restent lisibles sur chaque teinte (AA), en clair et en sombre', () => {
  for (const [theme, vars] of [['clair', light], ['sombre', dark]]) {
    for (const color of COLORS) {
      const fill = vars[`--kawaii-${color}`];
      const ink = contrast(vars[`--kawaii-${color}-ink`], fill);
      assert.ok(ink >= 4.5, `${theme} : --kawaii-${color}-ink sur la teinte = ${ink.toFixed(2)}`);
      const face = contrast(vars['--kawaii-ink'], fill);
      assert.ok(face >= 4.5, `${theme} : visage sur --kawaii-${color} = ${face.toFixed(2)}`);
    }
  }
});

test('le thème sombre est identique qu\'il vienne du système ou du bouton', () => {
  const pick = (vars) => Object.fromEntries(Object.entries(vars).filter(([k]) => k.startsWith('--kawaii')));
  assert.deepEqual(pick(darkAuto), pick(darkForced));
  assert.ok(Object.keys(pick(darkForced)).length > 0);
});
