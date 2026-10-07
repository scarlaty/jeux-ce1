import test from 'node:test';
import assert from 'node:assert/strict';
import game, { orderStrategy } from '../../js/games/phrase.js';
import {
  SIMPLE, PONCT_SHORT, CONTEXTS, ORDER_2, ORDER_3, INTENTIONS, signOf, words, withoutSign,
} from '../../js/data/phrases.js';
import {
  checkGameShape, checkGenerator, checkNoSurfaceShortcut, checkCueCoverage, visibleOfQuestion,
  checkEpicene, textsOfQuestion,
} from '../helpers/game-checks.js';
import { createRng } from '../../js/core/random.js';
import { buildQuestions } from '../../js/core/engine.js';

test('contrat', () => checkGameShape(game));
test('500 tirages par niveau, 30 questions distinctes', () => checkGenerator(game, { draws: 500, minDistinct: 30 }));

const DET = ['le', 'la', 'les', 'un', 'une', 'des', 'mon', 'ma', 'mes', 'ton', 'ta', 'son', 'sa'];
// Mots qui se déplacent dans la phrase ou lient deux groupes échangeables : interdits dans les phrases
// à ranger. « jamais » manquait alors que « toujours » y était (#107).
const MOBILE = /^(hier|demain|aujourd'hui|souvent|toujours|jamais|encore|maintenant|ensuite|puis|parfois|et|ou|mais|car|donc|aussi|tout|tous|matin|soir)$/;

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
      const first = w[0].toLowerCase();
      if (DET.includes(first)) assert.ok(!w.slice(1).some((x) => x.toLowerCase() === first), `${s} : déterminant répété`);
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

// ===== Le cœur de #107 : le niveau 3 est construit en M × N =========================================

test('CONTEXTS : chaque phrase est servie avec plusieurs situations et plusieurs signes (#107)', () => {
  const bySentence = new Map();
  for (const c of CONTEXTS) {
    if (!bySentence.has(c.text)) bySentence.set(c.text, new Set());
    bySentence.get(c.text).add(c.sign);
  }
  const appariees = [...bySentence.values()].filter((signs) => signs.size >= 2);
  const share = appariees.length / bySentence.size;
  assert.ok(share >= 0.5,
    `seulement ${(100 * share).toFixed(1)} % des phrases sont servies avec deux signes ou plus : `
    + 'un solveur « phrase seule » peut apprendre la banque');
  // Chaque item est unique par le COUPLE (situation, phrase) — la phrase seule se répète, c'est voulu.
  const couples = CONTEXTS.map((c) => `${c.context}||${c.text}`);
  assert.equal(new Set(couples).size, couples.length, 'couple situation/phrase en double');
  for (const [text, signs] of bySentence) {
    assert.ok(signs.size >= 2, `« ${text} » n'existe qu'avec un seul signe`);
  }
});

test('CONTEXTS : forme de la banque, intention portée par la donnée, aide présente', () => {
  for (const sign of ['.', '?', '!']) assert.ok(CONTEXTS.filter((c) => c.sign === sign).length >= 12, sign);
  for (const c of CONTEXTS) {
    assert.equal(INTENTIONS[c.intention], c.sign, `intention et signe incohérents : ${c.text}`);
    assert.match(c.context, /^[A-ZÀ-ÖÉ].*[.!?]$/, `situation mal ponctuée : ${c.context}`);
    assert.match(c.text, /^[A-ZÀ-ÖÉ]/, c.text);
    assert.equal(signOf(c.text), '', c.text);
    assert.ok(c.why && c.why.length > 20, `aide manquante : ${c.text}`);
    // Aucune phrase de forme interrogative ou exclamative : seule la situation doit trancher.
    assert.doesNotMatch(c.text, /^(Où|Qui|Quand|Comment|Pourquoi|Combien|Est-ce|Quel|Quelle|Comme|Que)\b/,
      `phrase de forme marquée : « ${c.text} »`);
    assert.doesNotMatch(c.text, /\S+-(tu|il|elle|nous|vous|ils)\b/, `verbe inversé : « ${c.text} »`);
  }
  const all = [...PONCT_SHORT.map((p) => p.text), ...new Set(CONTEXTS.map((c) => c.text))];
  assert.equal(new Set(all).size, all.length, 'phrase en double entre les banques');
});

/**
 * Le meilleur solveur « phrase seule » que l'on sache écrire. Il ne reçoit JAMAIS la situation.
 * Au niveau 1 il doit réussir (la forme donne le signe, c'est la compétence visée) ; au niveau 3 il
 * doit échouer, sinon la situation est décorative.
 */
const INTENSITY = /énorme|immense|gigantesque|magnifique|splendide|délicieu|formidable|extraordinaire|superbe|incroyable|plus beau/i;
function sentenceOnlySolver({ text }) {
  const first = text.split(' ')[0] || '';
  const inversion = /\S+-(tu|il|elle|nous|vous|ils|je|on)\b/.test(text);
  if (/^(Quel|Quelle|Comme|Que)$/.test(first) && !inversion) return '!';
  if (INTENSITY.test(text)) return '!';
  if (/^(Où|Qui|Quand|Comment|Pourquoi|Combien|Est-ce)$/.test(first)) return '?';
  if (inversion) return '?';
  if (/\b(tu|vous|ton|ta|tes)\b/i.test(text)) return '?';
  return '.';
}
/** Rend structurellement impossible de lire la situation : le solveur ne reçoit que la phrase. */
const blind = (solver) => (v) => solver({ text: v.text });

function questions(level, n = 1500, seed = 77) {
  const rng = createRng(seed + level);
  const out = [];
  while (out.length < n) out.push(...buildQuestions(game, level, rng, 10));
  return out;
}
const signQuestions = (level, n, seed) => questions(level, n, seed).filter((q) => q.key.startsWith('phrase:signe'));

/** Taux de réussite d'un solveur sur un niveau (0 à 1). */
function rate(level, solver, n = 6000, seed = 77) {
  const views = signQuestions(level, n, seed).map(visibleOfQuestion);
  return views.filter((v) => solver(v) === v.answer).length / views.length;
}

test('niveau 3 : un solveur « PHRASE SEULE » ne dépasse pas le hasard (#107)', () => {
  // Défaut de la 2e itération : 93 % — la situation était décorative dans 40 cas sur 42.
  for (const seed of [31337, 90210, 55555]) {
    checkNoSurfaceShortcut(signQuestions(3, 6000, seed), blind(sentenceOnlySolver),
      { label: `niveau 3, phrase seule (graine ${seed})` });
  }
});

test('PROGRESSION : le même solveur de surface perd au moins 25 points du niveau 1 au niveau 3 (#107)', () => {
  // Un test par niveau ne dit rien de la progression. C'est l'ÉCART qui dit que le niveau 3 est
  // vraiment plus dur — à la 2e itération, le niveau 3 était PLUS facile que le niveau 1 (93 % / 65 %).
  const n1 = rate(1, blind(sentenceOnlySolver));
  const n3 = rate(3, blind(sentenceOnlySolver));
  const ecart = 100 * (n1 - n3);
  assert.ok(ecart >= 25,
    `la forme de la phrase donne le signe à ${(100 * n1).toFixed(1)} % au niveau 1 et `
    + `${(100 * n3).toFixed(1)} % au niveau 3 : écart de ${ecart.toFixed(1)} points (< 25)`);
});

test('niveau 3 : aucun lexique n\'est réservé à une classe de réponse (#107)', () => {
  // La 2e itération exigeait qu'une exclamation porte un mot d'intensité : ce test FABRIQUAIT un
  // raccourci parfait (couverture 38 %, précision 100 %). Il est remplacé par son inverse.
  checkCueCoverage(signQuestions(3, 6000), (v) => (INTENSITY.test(v.text) ? '!' : null),
    { maxCoverage: 0.3, label: 'niveau 3, lexique d\'intensité' });
});

test('niveau 3 : aucun MOT de la banque n\'annonce un signe à lui seul (#107)', () => {
  // Généralisation du test précédent : on ne protège pas un lexique en particulier, on vérifie que
  // le vocabulaire des phrases est réparti sur les trois signes.
  const bySign = new Map();
  for (const c of CONTEXTS) {
    for (const w of withoutSign(c.text).toLowerCase().split(/[^a-zà-ÿ']+/).filter((x) => x.length >= 4)) {
      if (!bySign.has(w)) bySign.set(w, []);
      bySign.get(w).push(c.sign);
    }
  }
  const exclusifs = [];
  for (const [w, signs] of bySign) {
    if (signs.length < 3) continue;
    const top = Math.max(...['.', '?', '!'].map((s) => signs.filter((x) => x === s).length));
    if (top / signs.length > 0.6) exclusifs.push(`${w} (${top}/${signs.length})`);
  }
  assert.deepEqual(exclusifs, [], 'mots réservés à un signe');
});

test('niveau 3 : les deux solveurs de la 1re relecture restent sous le seuil', () => {
  const typographySolver = ({ text }) => {
    const first = text.split(' ')[0] || '';
    if (/,$/.test(first)) return '!';
    if (/^Comme$/.test(first) && /,/.test(text)) return '.';
    if (/\S+-(tu|il|elle|nous|vous|ils)\b/.test(text)) return '?';
    if (/^(Où|Qui|Quand|Comment|Pourquoi|Combien|Que|Quelle|Est-ce)$/.test(first)) return '?';
    if (/^(Quel|Comme)$/.test(first)) return '!';
    return '.';
  };
  const ASK = /demande|interroge|questionne|savoir|curieu|intrigu|perplex|dubitatif|hésite|question/i;
  const EXCL = /écrie|crie|exclame|bondit|applaudit|saute|sursaute|rayonne|joie|excité|ravi|content|heureu|émerveill/i;
  const TELL = /raconte|explique|annonce|\bdit\b|décrit|précise|indique|commente|énumère|montre|note|présente|répond/i;
  const marker = ({ prompt }) => (ASK.test(prompt) ? '?' : EXCL.test(prompt) ? '!' : TELL.test(prompt) ? '.' : null);
  const qs = signQuestions(3, 6000);
  checkNoSurfaceShortcut(qs, blind(typographySolver), { label: 'niveau 3, typographie' });
  checkNoSurfaceShortcut(qs, (v) => marker(v) || '.', { label: 'niveau 3, verbe de la situation' });
  checkCueCoverage(qs, marker, { maxCoverage: 0.5, label: 'niveau 3, situations qui nomment l\'intention' });
});

test('niveau 3 : répondre toujours le même signe ne mène nulle part', () => {
  const qs = signQuestions(3, 6000);
  for (const sign of ['.', '?', '!']) {
    const share = qs.filter((q) => q.answer === sign).length / qs.length;
    assert.ok(share <= 0.5, `le signe « ${sign} » est la réponse de ${(100 * share).toFixed(1)} % des questions`);
  }
});

// ===== Mixité ========================================================================================

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

test('mixité : les objets prêtés à l\'enfant sont variés (#107)', () => {
  // Le helper ne voit rien ici : ce sont des noms, pas des accords. Mais supposer quatre fois que
  // l'enfant porte une robe, c'est supposer qui elle est.
  const textes = [...PONCT_SHORT.map((p) => p.text), ...ORDER_2, ...ORDER_3];
  const objets = [];
  for (const t of textes) {
    for (const m of t.matchAll(/\b(?:ton|ta|tes)\s+([a-zà-ÿ']+)/gi)) objets.push(m[1].toLowerCase());
    for (const m of t.matchAll(/\btu\s+as\s+(?:un|une)\s+(?:[a-zà-ÿ']+\s+)?([a-zà-ÿ']+)/gi)) objets.push(m[1].toLowerCase());
  }
  assert.ok(new Set(objets).size >= 4, `objets prêtés à l'enfant trop peu variés : ${objets.join(', ')}`);
  const counts = {};
  for (const o of objets) counts[o] = (counts[o] || 0) + 1;
  const top = Math.max(...Object.values(counts));
  assert.ok(top / objets.length <= 0.4,
    `un même objet est prêté à l'enfant dans ${(100 * top / objets.length).toFixed(0)} % des cas : ${JSON.stringify(counts)}`);
});

test('mixité : Papa et Maman sont aussi présents l\'un que l\'autre, et leurs rôles se croisent (#107)', () => {
  const textes = [...SIMPLE.flat(), ...PONCT_SHORT.map((p) => p.text),
    ...CONTEXTS.flatMap((c) => [c.context, c.text]), ...ORDER_2, ...ORDER_3];
  const count = (who) => textes.filter((t) => new RegExp(`\\b${who}\\b`).test(t)).length;
  const papa = count('Papa');
  const maman = count('Maman');
  assert.ok(papa > 0 && maman > 0);
  const ratio = Math.max(papa, maman) / Math.min(papa, maman);
  assert.ok(ratio <= 2, `déséquilibre Papa ${papa} / Maman ${maman} (rapport ${ratio.toFixed(1)} > 2)`);
  // Les rôles ne sont pas assignés par genre : chacun conduit et chacun cuisine quelque part.
  const fait = (who, verbe) => textes.some((t) => new RegExp(`\\b${who}\\b.*\\b${verbe}`).test(t));
  assert.ok(fait('Maman', 'conduit') || fait('Maman', 'lave'), 'Maman n\'a aucun rôle hors du foyer');
  assert.ok(fait('Papa', 'prépare') || fait('Papa', 'cuisine'), 'Papa n\'a aucun rôle au foyer');
});

// ===== Le reste de la grille =========================================================================

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
    const text = q.display.show.text.replace(/ /g, ' ');
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
      const t = q.display.show.text.replace(/ /g, ' ');
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

test('la voix ne donne pas la réponse : pas de point final sur la phrase lue (#107)', () => {
  // La synthèse posait une intonation de point sur la phrase dont on demande justement le signe.
  for (const q of questions(3, 600).filter((x) => x.key.startsWith('phrase:signe'))) {
    assert.doesNotMatch(q.speak, /[.?!]\s*$/, `la phrase lue finit par un signe : ${q.speak}`);
  }
  for (const q of questions(2, 600).filter((x) => x.key.startsWith('phrase:erreur'))) {
    assert.doesNotMatch(q.speak, /[.?!]\s*$/, `la phrase lue finit par un signe : ${q.speak}`);
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
  const seenStrategies = new Set();
  for (const s of [...ORDER_2, ...ORDER_3]) {
    const hint = orderStrategy(s);
    seenStrategies.add(hint);
    const body = withoutSign(s);
    // « Cherche l'action » est interdit sur une phrase sans action (être, avoir possessif).
    if (/qui fait l'action/.test(hint)) {
      // Découpage en mots : `\b` voit une limite dans « Léa » et y reconnaissait le verbe « a ».
      const m = body.toLowerCase().split(/[^a-zà-ÿ'-]+/).filter(Boolean);
      const AVOIR = ['a', 'ai', 'as', 'avons', 'avez', 'ont'];
      const avoir = m.find((w) => AVOIR.includes(w));
      const passeCompose = avoir && /(é|ée|és|ées|i|is|it|u|us|ue)$/.test(m[m.indexOf(avoir) + 1] || '');
      const sansVerbeDEtat = !avoir && !m.some((w) => ['est', 'sont', 'es', 'suis', 'sommes', 'êtes'].includes(w));
      assert.ok(signOf(s) === '.' && (passeCompose || sansVerbeDEtat),
        `« ${s} » : on propose de chercher l'action alors qu'il n'y en a pas`);
    }
    // Et « cherche le mot qui interroge » est interdit s'il n'y en a aucun (#107, 2e relecture).
    // Comparaison mot à mot : `\b` ne reconnaît pas « Où » (la limite de mot échoue après « ù »).
    if (/mot qui interroge/.test(hint)) {
      const mots = body.toLowerCase().split(/[^a-zà-ÿ'-]+/).filter(Boolean);
      const INTERRO = ['où', 'qui', 'quand', 'comment', 'pourquoi', 'combien', 'est-ce', 'quel', 'quelle'];
      assert.ok(mots.some((m) => INTERRO.includes(m)),
        `« ${s} » : on fait chercher un mot interrogatif qui n'existe pas`);
    }
    if (/verbe collé à/.test(hint)) {
      assert.match(body, /\S+-(tu|il|elle|nous|vous|ils)\b/,
        `« ${s} » : on fait chercher un verbe inversé qui n'existe pas`);
    }
    // Règle générale : tout mot cité entre guillemets par la stratégie doit être sur une étiquette.
    // Sinon l'enfant cherche un mot qui n'existe pas — le défaut des interrogatives, revenu par
    // « est » cité sur « Les fleurs sont très belles. » et par le « a » de « Léa » (#107, 3e relecture).
    const mots = body.toLowerCase().split(/[^a-zà-ÿ'-]+/).filter(Boolean);
    for (const [, cite] of hint.matchAll(/« ([a-zà-ÿ']+) »/g)) {
      // « ne »/« pas » et « tu » sont cités comme explication, pas comme étiquette à retrouver :
      // les deux branches dédiées ci-dessus les vérifient déjà.
      if (['ne', 'pas', 'tu'].includes(cite)) continue;
      assert.ok(mots.includes(cite), `« ${s} » : la stratégie cite « ${cite} », absent des étiquettes`);
    }
    if (/« ne » et « pas »/.test(hint)) {
      assert.ok(mots.includes('pas') && mots.some((m) => m === 'ne' || m.startsWith('n\'')),
        `« ${s} » : on parle de la négation alors qu'il n'y en a pas`);
    }
  }
  assert.ok(seenStrategies.size >= 5, `trop peu de variantes : ${seenStrategies.size}`);
  const byLevel = { 2: ORDER_2, 3: ORDER_3 };
  for (let level = 2; level <= 3; level++) {
    const qs = questions(level, 300).filter((q) => q.type === 'order');
    assert.ok(qs.length > 0, `niveau ${level} : aucune question « ordre »`);
    for (const q of qs) {
      const sentence = byLevel[level].find((s) => withoutSign(s).toLowerCase() === q.key.split('|')[1]);
      assert.ok(sentence, q.key);
      assert.ok(q.explain.includes(orderStrategy(sentence)), `stratégie inadaptée : ${q.key}`);
    }
  }
  const counts = {};
  for (const s of ORDER_3) counts[orderStrategy(s)] = (counts[orderStrategy(s)] || 0) + 1;
  const top = Math.max(...Object.values(counts)) / ORDER_3.length;
  assert.ok(top <= 0.6, `une stratégie couvre ${(100 * top).toFixed(1)} % de ORDER_3`);
});

test('explication en situation : elle cite ce qui tranche, jamais la règle seule (#107)', () => {
  const qs = signQuestions(3, 2000);
  assert.ok(qs.length > 0);
  for (const q of qs) {
    const item = CONTEXTS.find((c) => q.prompt.startsWith(c.context)
      && q.key.includes(withoutSign(c.text).toLowerCase()));
    assert.ok(item, q.key);
    assert.ok(q.explain.includes(item.why), `l'aide de la situation manque : ${q.key}`);
  }
});
