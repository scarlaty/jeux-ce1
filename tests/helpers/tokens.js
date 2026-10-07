// Lecture des tokens de css/tokens.css et rapport de contraste WCAG, sans aucune dépendance.
// Le thème sombre existe deux fois dans le fichier (automatique, puis forcé par [data-theme]) :
// `themes()` rend les trois blocs lus tels quels et les deux thèmes COMPLETS (clair, ardoise).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const css = readFileSync(join(ROOT, 'css/tokens.css'), 'utf8');

/** Variables du premier bloc `selector { … }`. */
export function block(selector) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`bloc introuvable : ${selector}`);
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

export function themes() {
  const light = block(':root');
  const darkAuto = block(':root:not([data-theme="light"])');
  const darkForced = block(':root[data-theme="dark"]');
  return { light, darkAuto, darkForced, dark: { ...light, ...darkForced } };
}

export function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
