import test from 'node:test';
import assert from 'node:assert/strict';
import game, { orderStrategy } from '../../js/games/phrase.js';
import {
  SIMPLE, PONCT_SHORT, CONTEXTS, ORDER_2, ORDER_3, signOf, words, withoutSign,
} from '../../js/data/phrases.js';
import {
  checkGameShape, checkGenerator, checkNoSurfaceShortcut, checkCueCoverage,
  checkEpicene, textsOfQuestion,
} from '../helpers/game-checks.js';
import { createRng } from '../../js/core/random.js';
import { buildQuestions } from '../../js/core/engine.js';

test('contrat', () => checkGameShape(game));
test('500 tirages par niveau, 30 questions distinctes', () => checkGenerator(game, { draws: 500, minDistinct: 30 }));

const DET = ['le', 'la', 'les', 'un', 'une', 'des', 'mon', 'ma', 'mes', 'ton', 'ta', 'son', 'sa'];
// Mots qui se déplacent dans la phrase ou lient deux groupes échangeables : interdits dans les phrases à ranger.
const MOBILE = /^(hier|demain|aujourd'hui|souvent|toujours|encore|maintenant|ensuite|puis|parfois|et|ou|mais|car|donc|aussi|tout|tous|matin|soir)$/;

// Niveau 2 : au moins 5 mots (3 mots du milieu ou plus → au moins 6 arrangements possibles, #107).
for (const [name, pool, min, max] of [['ORDER_2', ORDER_2, 5, 6], ['ORDER_3', ORDER_3, 6, 7]]) {
  test(`${name} : forme des phrases à ranger`, () => {
    assert.ok(pool.length >= 30);
    assert.equal(new Set(pool).size, pool.length, 'phrases en double');
    for (const s of pool) {
      const w = words(s);
      assert.ok(w.length >= min && w.length <= max, `${s} : ${w.length} mots`);
      assert.match(w[0], /^[A-ZÀ-ÖÉ]/, `${s} : majuscule au début`);
      assert.match(w.at(-1), /[.?!]$/, `${s} : signe final`);
      w.slice(1).forEach((x) => {
        assert.doesNotMatch(x, /^[A-ZÀ-ÖÉ]/, `${s} : majuscule au milieu (« ${x} »)`);
        assert.doesNotMatch(x, MOBILE, `${s} : mot déplaçable « ${x} »`);
      });
      // Deux groupes de même déterminant seraient échangeables (« Le chat griffe le canapé »).
      const first = w[0].toLowerCase();
      if (DET.includes(first)) assert.ok(!w.slice(1).some((x) => x.toLowerCase() === first), `${s} : déterminant répété`);
      // La phrase ne doit pas avoir de signe au milieu, ni d'espace en trop.
      assert.equal(s, s.trim());
      assert.ok(!/[.?!]./.test(withoutSign(s)));
    }
  });

  test(`${name} : deux phrases ne sont jamais faites des mêmes mots`, () => {
    const sig = (s) => words(s).map((x) => x.toLowerCase()).sort().join(' ');
    assert.equal(new Set(pool.map(sig)).size, pool.length);
  });
}

test('les phrases à ranger de 5 à 7 mots ne se retrouvent pas d\'un niveau à l\'autre', () => {
  assert.equal(ORDER_2.filter((s) => ORDER_3.includes(s)).length, 0);
});

test('ORDER_3 : le gabarit « Le/La nom de/du nom est adjectif » reste minoritaire (< 30 %, #107)', () => {
  const open = ORDER_3.filter((s) => {
    const w = words(s);
    return (w[0] === 'Le' || w[0] === 'La') && w[2] && /^(de|du|d'|des)$/.test(w[2].toLowerCase());
  });
  const share = open.length / ORDER_3.length;
  assert.ok(share < 0.3, `gabarit « Le/La N de/du... » : ${(100 * share).toFixed(1)} % (>= 30 %)`);
});

test('ponctuation niveau 1 (PONCT_SHORT) : phrases franches, la forme donne le signe', () => {
  for (const sign of ['.', '?', '!']) assert.ok(PONCT_SHORT.filter((p) => p.sign === sign).length >= 8, sign);
  for (const { text, sign } of PONCT_SHORT) {
    assert.match(text, /^[A-ZÀ-ÖÉ]/, text);
    assert.equal(signOf(text), '', text);
    if (sign === '?') assert.match(text, /^(Où|Qui|Quand|Comment|Pourquoi|Combien|Est-ce|\S+-(tu|il|elle|nous|vous|ils)\b)/, text);
    if (sign === '!') assert.match(text, /^(Quel|Quelle|Comme|Que)\b/, text);
    if (sign === '.') assert.doesNotMatch(text, /^(Quel|Quelle|Comme|Que|Où|Qui|Quand|Comment|Pourquoi|Combien|Est-ce)\b|-(tu|il|elle)\b/, text);
  }
});

test('contextes : forme de la banque, signes équilibrés, aide présente', () => {
  for (const sign of ['.', '?', '!']) assert.ok(CONTEXTS.filter((c) => c.sign === sign).length >= 12, sign);
  assert.equal(new Set(CONTEXTS.map((c) => c.context)).size, CONTEXTS.length, 'contexte en double');
  assert.equal(new Set(CONTEXTS.map((c) => c.text)).size, CONTEXTS.length, 'phrase en double');
  for (const c of CONTEXTS) {
    assert.match(c.context, /^[A-ZÀ-ÖÉ].*[.!?]$/, `contexte mal ponctué : ${c.context}`);
    assert.match(c.text, /^[A-ZÀ-ÖÉ]/, c.text);
    assert.equal(signOf(c.text), '', c.text);
    assert.ok(c.why && c.why.length > 20, `aide manquante : ${c.text}`);
  }
  const all = [...PONCT_SHORT, ...CONTEXTS].map((p) => p.text);
  assert.equal(new Set(all).size, all.length, 'phrase en double entre les banques');
});

// --- Le cœur de #107 : les solveurs de surface, sur les questions RÉELLEMENT tirées -------------------
// Chaque solveur reçoit la vue rendue (consigne + phrase affichée), jamais une projection choisie ici :
// c'était la faille de la première correction (le solveur ne voyait que le contexte → 42,7 % mesurés
// contre 89,4 % réels).

/** Solveur A : TYPOGRAPHIE de la phrase affichée (virgule, trait d'union, premier mot). */
function typographySolver({ text }) {
  const first = text.split(' ')[0] || '';
  if (/,$/.test(first)) return '!';                                   // « Bravo, … »
  if (/^Comme$/.test(first) && /,/.test(text)) return '.';            // « Comme il pleut, … »
  if (/\S+-(tu|il|elle|nous|vous|ils)\b/.test(text)) return '?';      // inversion du verbe
  if (/^(Où|Qui|Quand|Comment|Pourquoi|Combien|Que|Quelle|Est-ce)$/.test(first)) return '?';
  if (/^(Quel|Comme)$/.test(first)) return '!';
  return '.';
}

/** Solveur B : CLASSE SÉMANTIQUE du verbe de la situation (la consigne). */
const ASK = /demande|interroge|questionne|savoir|curieu|intrigu|perplex|dubitatif|hésite|question/i;
const EXCL = /écrie|crie|exclame|bondit|applaudit|saute|sursaute|rayonne|joie|excité|ravi|content|heureu|émerveill/i;
const TELL = /raconte|explique|annonce|\bdit\b|décrit|précise|indique|commente|énumère|montre|note|présente|répond/i;
function intentionMarker({ prompt }) {
  if (ASK.test(prompt)) return '?';
  if (EXCL.test(prompt)) return '!';
  if (TELL.test(prompt)) return '.';
  return null;
}
const semanticSolver = (v) => intentionMarker(v) || '.';

function questions(level, n = 1500) {
  const rng = createRng(77 + level);
  const out = [];
  while (out.length < n) out.push(...buildQuestions(game, level, rng, 10));
  return out;
}

const signQuestions = (level, n) => questions(level, n).filter((q) => q.key.startsWith('phrase:signe'));

test('niveau 3 : la TYPOGRAPHIE seule ne résout pas la moitié de la ponctuation (#107)', () => {
  const share = checkNoSurfaceShortcut(signQuestions(3, 6000), typographySolver,
    { label: 'ponctuation niveau 3, typographie' });
  assert.ok(share > 0.2, `solveur suspect : ${share} — il devrait tomber juste parfois`);
});

test('niveau 3 : la CLASSE SÉMANTIQUE du verbe ne résout pas la moitié de la ponctuation (#107)', () => {
  checkNoSurfaceShortcut(signQuestions(3, 6000), semanticSolver,
    { label: 'ponctuation niveau 3, verbe de la situation' });
});

test('niveau 3 : les situations qui NOMMENT l\'intention restent minoritaires (#107)', () => {
  // Défaut d'origine : 44 contextes sur 45 portaient un verbe d'intention, juste 43 fois sur 44.
  // Aucun mot ne dépassait 30 % — c'est la CLASSE qui couvrait tout, d'où une mesure de couverture.
  checkCueCoverage(signQuestions(3, 6000), intentionMarker,
    { maxCoverage: 0.5, label: 'ponctuation niveau 3' });
});

test('niveau 3 : répondre toujours le même signe ne mène nulle part', () => {
  const qs = signQuestions(3, 6000);
  for (const sign of ['.', '?', '!']) {
    const share = qs.filter((q) => q.answer === sign).length / qs.length;
    assert.ok(share <= 0.5, `le signe « ${sign} » est la réponse de ${(100 * share).toFixed(1)} % des questions`);
  }
});

test('contextes : une exclamation porte sa force dans la phrase, pas seulement dans la situation (#107)', () => {
  // Défaut relevé : « Tom applaudit en voyant la neige. » + « Il neige » — un point se défend très bien.
  // Une exclamation doit donc être exclamative par sa FORME (Quel/Comme/Que) ou par un mot d'intensité.
  const INTENSITY = /énorme|immense|gigantesque|magnifique|splendide|délicieu|formidable|extraordinaire|superbe|incroyable|plus beau/i;
  for (const c of CONTEXTS.filter((c) => c.sign === '!')) {
    const exclamativeForm = /^(Quel|Quelle|Comme|Que)\b/.test(c.text);
    assert.ok(exclamativeForm || INTENSITY.test(c.text),
      `exclamation sans marque dans la phrase : « ${c.text} » (${c.context})`);
  }
  // Et une déclarative ne doit pas porter ces mots-là : elle deviendrait défendable en exclamation.
  for (const c of CONTEXTS.filter((c) => c.sign === '.')) {
    assert.doesNotMatch(c.text, INTENSITY, `déclarative avec un mot d'intensité : « ${c.text} »`);
  }
});

// --- Mixité ------------------------------------------------------------------------------------------

test('mixité : aucun accord genré adressé à l\'enfant, dans les banques (#107)', () => {
  checkEpicene([
    ...SIMPLE.flat(),
    ...PONCT_SHORT.map((p) => p.text),
    ...CONTEXTS.flatMap((c) => [c.context, c.text, c.why]),
    ...ORDER_2, ...ORDER_3,
  ], { label: 'banques de « La phrase »' });
});

test('mixité : aucun accord genré dans les questions tirées, tous niveaux (#107)', () => {
  for (let level = 1; level <= 3; level++) {
    checkEpicene(questions(level, 600).flatMap(textsOfQuestion), { label: `« La phrase » niveau ${level}` });
  }
});

// --- Le reste de la grille ---------------------------------------------------------------------------

test('« Est-ce une phrase ? » : les mélanges ne sont pas des phrases (début en majuscule, point final)', () => {
  assert.ok(SIMPLE.length >= 30);
  for (const [ok, jumble] of SIMPLE) {
    assert.match(ok, /^[A-ZÀ-ÖÉ].*\.$/);
    assert.match(jumble, /^[A-ZÀ-ÖÉŒ].*\.$/, jumble);
    const sig = (s) => withoutSign(s).toLowerCase().split(' ').sort().join(' ');
    assert.equal(sig(ok), sig(jumble), `${ok} : mêmes mots`);
    assert.notEqual(ok, jumble);
  }
});

test('niveau 1 : mélange de « phrase ? » et de signes, réponses exactes', () => {
  const qs = questions(1);
  const isS = qs.filter((q) => q.key.startsWith('phrase:vraie'));
  const sig = qs.filter((q) => q.key.startsWith('phrase:signe'));
  assert.ok(isS.length > 400 && sig.length > 400);
  for (const q of isS) {
    const text = q.display.show.text.replace(/ /g, ' ');
    const good = /^[A-ZÀ-ÖÉŒ]/.test(text) && /[.?!]$/.test(text) && !q.key.endsWith('|ordre');
    assert.equal(q.answer, good ? 'oui' : 'non', q.key);
  }
  assert.ok(isS.some((q) => q.answer === 'oui') && isS.some((q) => q.answer === 'non'));
  for (const q of sig) assert.deepEqual(q.display.choices.map((c) => c.value), ['.', '?', '!']);
});

test('niveau 2 : ordre et recherche d\'erreur', () => {
  for (const q of questions(2)) {
    if (q.type === 'order') {
      assert.deepEqual([...q.display.items].sort(), [...q.answer].sort());
      assert.ok(q.answer.length >= 5 && q.answer.length <= 6);
    } else {
      const t = q.display.show.text.replace(/ /g, ' ');
      const maj = /^[A-ZÀ-ÖÉ]/.test(t);
      const sign = /[.?!]$/.test(t);
      assert.equal(q.answer, maj && sign ? 'rien' : !maj && !sign ? 'les-deux' : !maj ? 'maj' : 'signe', q.key);
    }
  }
});

test('niveau 3 : 6 ou 7 mots à ranger, ponctuation toujours en situation', () => {
  const qs = questions(3);
  assert.ok(qs.some((q) => q.type === 'order'));
  for (const q of qs.filter((x) => x.type === 'order')) assert.ok(q.answer.length >= 6 && q.answer.length <= 7);
  // Plus aucune phrase longue sans contexte : elle ne demandait rien de plus que le niveau 1 (#107).
  assert.equal(qs.filter((q) => q.key.startsWith('phrase:signe') && !q.key.endsWith(':ctx')).length, 0);
});

test('une même phrase ne revient jamais dans une partie', () => {
  for (let level = 1; level <= 3; level++) {
    const rng = createRng(5 + level);
    for (let i = 0; i < 200; i++) {
      const bases = buildQuestions(game, level, rng, 10).map((q) => q.key.split('|')[1]);
      assert.equal(new Set(bases).size, bases.length, `niveau ${level}`);
    }
  }
});

test('explications : jamais négatives, jamais vides, citent la phrase juste', () => {
  for (let level = 1; level <= 3; level++) {
    for (const q of questions(level, 300)) {
      assert.ok(q.explain.length > 25, q.key);
      assert.doesNotMatch(q.explain, /\bfaux\b|\bnul\b|\bmauvais/i, q.key);
    }
  }
});

test('explication de l\'ordre : une stratégie adaptée à la phrase, pas une formule unique (#107)', () => {
  // Défaut relevé : « cherche qui fait l'action » sur « Le gâteau de ma tante est bon. » (aucune action),
  // soit 60,4 % de ORDER_3. Quatre familles, et « l'action » n'est proposée que s'il y en a une.
  const seenStrategies = new Set();
  for (const s of [...ORDER_2, ...ORDER_3]) {
    const hint = orderStrategy(s);
    seenStrategies.add(hint);
    const body = withoutSign(s);
    const isAction = /\b(a|ai|as|avons|avez|ont)\s+\S*(é|ée|és|ées|i|is|it|u|us|ue)\b/.test(body)
      || !/\b(est|sont|es|suis|sommes|êtes|a|ai|as|avons|avez|ont)\b/.test(body);
    if (/qui fait l'action/.test(hint)) {
      assert.ok(signOf(s) === '.' && isAction, `« ${s} » : on propose de chercher l'action alors qu'il n'y en a pas`);
    }
  }
  assert.ok(seenStrategies.size >= 4, `une seule formule pour tout : ${seenStrategies.size} variante(s)`);
  // Chaque question « ordre » tirée porte bien l'une des stratégies, et la bonne pour SA phrase.
  const byLevel = { 2: ORDER_2, 3: ORDER_3 };
  for (let level = 2; level <= 3; level++) {
    const qs = questions(level, 300).filter((q) => q.type === 'order');
    assert.ok(qs.length > 0, `niveau ${level} : aucune question « ordre »`);
    for (const q of qs) {
      const sentence = byLevel[level].find((s) => withoutSign(s).toLowerCase() === q.key.split('|')[1]);
      assert.ok(sentence, q.key);
      assert.ok(q.explain.includes(orderStrategy(sentence)),
        `la stratégie ne correspond pas à la phrase : ${q.key}`);
    }
  }
  // Et aucune des quatre n'écrase les autres : la répartition sur ORDER_3 reste contrastée.
  const counts = {};
  for (const s of ORDER_3) counts[orderStrategy(s)] = (counts[orderStrategy(s)] || 0) + 1;
  const top = Math.max(...Object.values(counts)) / ORDER_3.length;
  assert.ok(top <= 0.6, `une stratégie couvre ${(100 * top).toFixed(1)} % de ORDER_3`);
});

test('explication en situation : elle cite ce qui tranche, jamais la règle seule (#107)', () => {
  // Défaut relevé : `pickSign` n'ajoutait AUCUN indice aux questions en contexte — la famille la plus
  // fréquente du niveau 3 n'avait droit qu'à « la règle, puis la réponse ».
  const qs = signQuestions(3, 2000);
  assert.ok(qs.length > 0);
  for (const q of qs) {
    const why = CONTEXTS.find((c) => q.key.includes(withoutSign(c.text).toLowerCase()));
    assert.ok(why, q.key);
    assert.ok(q.explain.includes(why.why), `l'aide de la situation manque : ${q.key}`);
  }
});

test('contextes : un seul signe défendable (juge pédagogie, #35)', () => {
  // « Mia demande où est son sac » + « Il est dans ta chambre » : le texte RÉPOND à la question, un « . » se défend.
  // « C'est déjà l'heure » : « déjà » marque la surprise, un « ! » se défend.
  for (const c of CONTEXTS.filter((c) => c.sign === '?')) {
    assert.doesNotMatch(c.text, /^(Il|Elle) est (dans|sur|sous|à)\b|\bdéjà\b/, c.text);
  }
  for (const c of CONTEXTS.filter((c) => c.sign === '!')) {
    assert.doesNotMatch(c.context, /étonn|surpri/, c.context);
  }
});
