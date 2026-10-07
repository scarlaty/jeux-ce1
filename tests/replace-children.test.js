import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// `replaceChildren` est natif : contrairement à `h()`, il écrit « null », « false » ou « undefined » en
// texte au lieu de les ignorer (« null » affiché sous l'œuf de « Mon compagnon », 07/10).
// Un appel qui reçoit une partie facultative (`x || null`, `cond && h(…)`, `a ? b : null`) doit filtrer :
// `el.replaceChildren(...[…].filter(Boolean))`.

const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : p.endsWith('.js') ? [p] : [];
});

/** Arguments d'un appel, du `(` ouvrant au `)` correspondant. */
function argsAt(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')' && --depth === 0) return src.slice(open + 1, i);
  }
  return '';
}

test('replaceChildren ne reçoit jamais une partie facultative non filtrée', () => {
  const bad = [];
  for (const file of files('js')) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\.replaceChildren\(/g)) {
      const args = argsAt(src, m.index + m[0].length - 1);
      if (/\.filter\(Boolean\)\s*$/.test(args.trim())) continue;
      // Seules les parties facultatives au premier niveau comptent : on retire les appels imbriqués.
      let top = '', depth = 0;
      for (const c of args) { if (c === '(') depth++; if (depth === 0) top += c; if (c === ')') depth--; }
      if (/\|\|\s*null|:\s*null|&&\s*h$|&&\s*h\b/.test(top)) bad.push(`${file}:${src.slice(0, m.index).split('\n').length}`);
    }
  }
  assert.deepEqual(bad, []);
});
