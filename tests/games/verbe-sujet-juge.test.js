// Relecture du juge pédagogie sur « Le verbe et son sujet » (#37) : chaque défaut relevé devient un test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sujetChoices } from '../../js/games/verbe-sujet.js';
import { BANKS } from '../../js/data/verbes.js';

const ALL = Object.values(BANKS).flatMap((b) => Object.values(b).flat());

test('sujet inversé : aucune phrase de la banque « sujet » ne commence par un mot interrogatif (hors programme CE1)', () => {
  for (const level of [2, 3]) {
    assert.ok(BANKS[level].sujet.length >= 30);
    for (const i of BANKS[level].sujet) {
      assert.doesNotMatch(i.text, /^(Où|Que|Qu'|Quand|Comment|Pourquoi|Qui|Combien)(\s|')/, i.text);
      assert.doesNotMatch(i.text, /\?$/, i.text);
    }
  }
});

test('aucune phrase à verbe pronominal (non enseigné au CE1)', () => {
  const pronominal = ALL.filter((i) => /(^|\s)(se|s'|me|te)(\s|$)/.test(i.text));
  assert.deepEqual(pronominal.map((i) => i.text), []);
});

test('sujet : au moins 30 phrases par niveau offrent trois groupes plausibles sans le verbe', () => {
  for (const level of [2, 3]) {
    const ok = BANKS[level].sujet.filter((i) => sujetChoices(i).length >= 3);
    assert.ok(ok.length >= 30, `niveau ${level} : ${ok.length}`);
    for (const i of ok) assert.ok(!sujetChoices(i).includes(i.verbe));
  }
});

test('sujet : un complément s\'intercale entre le sujet et le verbe dans au moins 20 % des phrases', () => {
  for (const level of [2, 3]) {
    const between = BANKS[level].sujet.filter((i) => /S[^SV]+V/.test(i.chunks.map((c) => c.role).join('')));
    console.log(`niveau ${level} : ${between.length}/${BANKS[level].sujet.length} phrases avec complément entre sujet et verbe`);
    assert.ok(between.length / BANKS[level].sujet.length >= 0.2, `niveau ${level} : ${between.length}`);
  }
});

test('mixité : pour chaque thème (sport, cuisine, danse), au moins 40 % de chaque genre', () => {
  const FILLES = /\b(Mia|Lina|Inès|Zoé|Sofia|Nina|Jade|Léa|Emma|Maman|Mamie|sœur|factrice|directrice)\b/;
  const GARCONS = /\b(Léo|Noah|Hugo|Adam|Yanis|Maël|Tom|Lucas|Papa|Papi|frère|cousin|voisin)\b/;
  const THEMES = {
    sport: /\b(nag\w*|saut\w*|vélo|ballon|corde)\b/i,
    cuisine: /\b(prépar\w*|cuisin\w*|gâteau|crêpes?|repas|pain|mange\w*)\b/i,
    danse: /\b(dans\w*|chant\w*|musique)\b/i,
  };
  const texts = [...new Set(ALL.map((i) => i.text))];
  for (const [theme, re] of Object.entries(THEMES)) {
    const hits = texts.filter((t) => re.test(t));
    const f = hits.filter((t) => FILLES.test(t) && !GARCONS.test(t)).length;
    const g = hits.filter((t) => GARCONS.test(t) && !FILLES.test(t)).length;
    console.log(`thème ${theme} : filles ${f} / garçons ${g} (${hits.length} phrases)`);
    assert.ok(f / (f + g) >= 0.4 && g / (f + g) >= 0.4, `${theme} : filles ${f} / garçons ${g}`);
  }
});
