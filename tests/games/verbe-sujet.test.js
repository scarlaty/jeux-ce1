import test from 'node:test';
import assert from 'node:assert/strict';
import game, {
  cestQui, negation, explainVerbe, explainSujet, explainInf, piegesNote, sujetChoices, infinitifsPresents,
} from '../../js/games/verbe-sujet.js';
import {
  VERBES, VOCABULAIRE_CE1, INFINITIFS, N1, N2, N3, BANKS, pluriel, inline,
} from '../../js/data/verbes.js';
import {
  checkGameShape, checkGenerator, checkCueCoverage, visibleOfQuestion, checkEpicene, textsOfQuestion,
} from '../helpers/game-checks.js';
import { createRng } from '../../js/core/random.js';
import { buildQuestions } from '../../js/core/engine.js';

test('contrat (#37)', () => checkGameShape(game));
test('500 tirages par niveau, 30 questions distinctes (#37)', () => checkGenerator(game, { draws: 500, minDistinct: 30 }));

const ALL = Object.values(BANKS).flatMap((b) => Object.values(b).flat());
const kindOf = (q) => q.key.split('|').at(-1);
const wordsOf = (t) => t.toLowerCase().split(/[^a-zà-ÿœ]+/).filter(Boolean);

function questions(level, n = 3000, seed = 42) {
  const rng = createRng(seed + level);
  const out = [];
  while (out.length < n) out.push(...buildQuestions(game, level, rng, 10));
  return out;
}
const ofKind = (qs, kind) => qs.filter((q) => kindOf(q) === kind);

// ===== Exactitude grammaticale : une table écrite À PART de la banque ===================================
// forme → [infinitif, nombre]. Tout verbe de la banque doit y figurer, avec le bon infinitif ET un sujet
// du bon nombre (contrôle de l'accord sujet-verbe).
const GROUND = {
  chante: ['chanter', 's'], chantent: ['chanter', 'p'], chantons: ['chanter', 'p'], chantera: ['chanter', 's'],
  'ont chanté': ['chanter', 'p'],
  mange: ['manger', 's'], mangeons: ['manger', 'p'], mangeront: ['manger', 'p'], 'a mangé': ['manger', 's'],
  jouent: ['jouer', 'p'], jouera: ['jouer', 's'], 'ont joué': ['jouer', 'p'],
  dessine: ['dessiner', 's'], dessinent: ['dessiner', 'p'], dessinons: ['dessiner', 'p'], dessinera: ['dessiner', 's'],
  dansent: ['danser', 'p'], saute: ['sauter', 's'], sautent: ['sauter', 'p'],
  regarde: ['regarder', 's'], aime: ['aimer', 's'], parle: ['parler', 's'], donne: ['donner', 's'],
  trouve: ['trouver', 's'], 'a trouvé': ['trouver', 's'], cherche: ['chercher', 's'], cherchent: ['chercher', 'p'],
  lave: ['laver', 's'], 'a lavé': ['laver', 's'], travaille: ['travailler', 's'], colorie: ['colorier', 's'],
  arrive: ['arriver', 's'], nagent: ['nager', 'p'], ramasse: ['ramasser', ''], attrape: ['attraper', 's'],
  prépare: ['préparer', 's'], range: ['ranger', 's'], oublie: ['oublier', 's'], écoutent: ['écouter', 'p'],
  tombent: ['tomber', 'p'], marchent: ['marcher', 'p'], restent: ['rester', 'p'], entrent: ['entrer', 'p'],
  répare: ['réparer', 's'],
  est: ['être', 's'], sont: ['être', 'p'], sera: ['être', 's'],
  a: ['avoir', 's'], ont: ['avoir', 'p'], aura: ['avoir', 's'],
  va: ['aller', 's'], vont: ['aller', 'p'], ira: ['aller', 's'], iront: ['aller', 'p'],
  fait: ['faire', 's'], font: ['faire', 'p'], fera: ['faire', 's'],
  dit: ['dire', 's'], disent: ['dire', 'p'],
  vient: ['venir', 's'], viennent: ['venir', 'p'], viendra: ['venir', 's'],
  prend: ['prendre', 's'], prennent: ['prendre', 'p'], prendra: ['prendre', 's'], 'a pris': ['prendre', 's'],
  voit: ['voir', 's'], voient: ['voir', 'p'], verront: ['voir', 'p'], 'a vu': ['voir', 's'],
  veut: ['vouloir', 's'], veulent: ['vouloir', 'p'],
  met: ['mettre', 's'], mettent: ['mettre', 'p'],
  écrit: ['écrire', 's'], écrivent: ['écrire', 'p'], lisent: ['lire', 'p'],
  finit: ['finir', 's'], 'a fini': ['finir', 's'], choisit: ['choisir', 's'],
  partons: ['partir', 'p'], partent: ['partir', 'p'], sortent: ['sortir', 'p'],
  grandit: ['grandir', 's'], grandissent: ['grandir', 'p'],
  attend: ['attendre', 's'], dort: ['dormir', 's'],
  adore: ['adorer', 's'], sait: ['savoir', 's'], doit: ['devoir', 's'], préfère: ['préférer', 's'],
  commence: ['commencer', 's'], réveille: ['réveiller', 's'], amuse: ['amuser', 's'],
  surprend: ['surprendre', 's'], décore: ['décorer', 's'], rend: ['rendre', 's'],
};
GROUND.ramasse = ['ramasser', 's'];
Object.assign(GROUND, {
  cueillent: ['cueillir', 'p'], suit: ['suivre', 's'], habitent: ['habiter', 'p'], regardent: ['regarder', 'p'],
  cherche: ['chercher', 's'], sommes: ['être', 'p'], avons: ['avoir', 'p'], allons: ['aller', 'p'],
  voyons: ['voir', 'p'], disons: ['dire', 'p'], faisons: ['faire', 'p'], seront: ['être', 'p'], auront: ['avoir', 'p'],
  irons: ['aller', 'p'], passe: ['passer', 's'], attendent: ['attendre', 'p'],
});
const INF_ITEMS = Object.values(BANKS).flatMap((b) => b.inf);

/** Homographes qu'on ne montre jamais comme mot d'une phrase (verbe nommé ou simple mot). */
const HOMOGRAPHES = ['joue', 'danse', 'porte', 'ferme', 'marche', 'lit', 'livre', 'cuisine', 'tombe', 'reste', 'entre',
  'écoute', 'demande', 'nage', 'classe', 'fête', 'plante', 'conte', 'voyage', 'chambre', 'invités', 'marché', 'goûter',
  'rêve', 'vole', 'pousse', 'coupe', 'tire', 'sort', 'part', 'compte', 'garde', 'repose', 'tourne', 'monte'];

test('banque : chaque verbe a le bon infinitif (table indépendante) et son sujet le bon nombre', () => {
  for (const item of ALL) {
    const g = GROUND[item.verbe];
    assert.ok(g, `forme absente de la table : ${item.verbe} (${item.text})`);
    assert.equal(item.inf, g[0], `${item.verbe} → ${g[0]}, pas ${item.inf} (${item.text})`);
    assert.equal(item.pluriel, g[1] === 'p', `accord sujet-verbe : ${item.text}`);
  }
});

test('banque : conjugaison régulière des verbes en -er recoupée par la règle', () => {
  for (const [inf, v] of Object.entries(VERBES)) {
    if (!v.vous) continue;
    const stem = inf.slice(0, -2);
    assert.ok(inf.endsWith('er'), inf);
    assert.equal(v.part, `${stem}é`, inf);
    assert.equal(v.vous, `${stem}ez`, inf);
    assert.equal(v.imp, `${stem}${/g$/.test(stem) ? 'e' : ''}ait`, inf);
    if (!/[cg]$/.test(stem)) assert.equal(v.nous, `${stem}ons`, inf);
  }
  assert.equal(VERBES.commencer.nous, 'commençons');
  assert.equal(VERBES.manger.nous, 'mangeons');
});

/** Verbes rares ou hors du vocabulaire d'un enfant de 7 ans, écartés par le juge pédagogie (#37). */
const HORS_VOCABULAIRE = ['tendre', 'mentir', 'battre', 'décrire', 'manquer', 'ramer', 'veiller', 'désigner', 'adopter',
  'admirer', 'retarder', 'arrêter', 'saisir', 'agrandir', 'relever', 'accuser', 'arroser', 'découper', 'déchirer',
  'prouver', 'tailler', 'avaler', 'souffler', 'lancer', 'continuer', 'refuser', 'trembler', 'marquer', 'éviter',
  'devenir', 'chasser', 'louer', 'jeter', 'penser', 'sentir', 'tenir', 'rêver'];

test('banque : tout infinitif proposé est du vocabulaire CE1, écrit sans doublon et finit en -er, -ir, -re ou -oir', () => {
  const vocab = new Set(VOCABULAIRE_CE1);
  assert.equal(vocab.size, VOCABULAIRE_CE1.length, 'doublon dans le vocabulaire');
  for (const bad of HORS_VOCABULAIRE) assert.ok(!vocab.has(bad), `« ${bad} » est hors vocabulaire CE1`);
  for (const k of Object.keys(VERBES)) assert.ok(vocab.has(k), `verbe hors vocabulaire : ${k}`);
  for (const v of Object.values(VERBES)) for (const p of v.proches) assert.ok(vocab.has(p), `proche hors vocabulaire : ${p}`);
  for (const item of ALL) for (const p of item.pieges) assert.ok(vocab.has(p), `piège hors vocabulaire : ${p}`);
  for (const inf of INFINITIFS) assert.match(inf, /(er|ir|re|oir)$/, inf);
  for (const level of [1, 2, 3]) {
    for (const q of ofKind(questions(level, 600), 'inf')) {
      for (const c of q.display.choices) {
        assert.ok(vocab.has(c.value) || [VERBES[q.answer].part, VERBES[q.answer].vous, VERBES[q.answer].imp].includes(c.value), `${q.key} : « ${c.value} »`);
      }
    }
  }
  for (const [inf, v] of Object.entries(VERBES)) {
    assert.equal(new Set(v.proches).size, v.proches.length, inf);
    assert.ok(!v.proches.includes(inf), `${inf} est son propre proche`);
    assert.ok(v.nous && v.part, inf);
  }
});

test('banque : une phrase = un seul verbe conjugué, un seul sujet, aucun mot en double, homographes écartés', () => {
  const formes = new Set(Object.keys(GROUND).filter((f) => !f.includes(' ')));
  for (const item of ALL) {
    assert.equal(item.chunks.filter((c) => c.role === 'S').length, 1, item.text);
    assert.equal(item.chunks.filter((c) => c.role === 'V').length, 1, item.text);
    assert.match(item.text, /^[A-ZÀ-ÖÉ].*[.?]$/, item.text);
    const lw = item.words.map((w) => w.toLowerCase());
    assert.equal(new Set(lw).size, lw.length, `mot en double : ${item.text}`);
    const chunks = item.chunks.map((c) => c.text);
    assert.equal(new Set(chunks).size, chunks.length, `groupe en double : ${item.text}`);
    assert.ok(chunks.length >= 3, `moins de 3 groupes : ${item.text}`);
    // Aucun AUTRE mot de la phrase n'est une forme conjuguée de la table.
    const verbWords = item.verbe.split(' ');
    for (const w of lw) {
      if (verbWords.includes(w)) continue;
      assert.ok(!formes.has(w), `deuxième verbe conjugué possible : « ${w} » dans ${item.text}`);
    }
    for (const w of lw) assert.ok(!HOMOGRAPHES.includes(w), `homographe « ${w} » dans ${item.text}`);
    if (item.nom) assert.ok(lw.includes(item.nom), `nom absent : ${item.text}`);
    for (const p of item.pieges) {
      assert.ok(INFINITIFS.has(p) && p !== item.inf, p);
      assert.ok(lw.includes(p) || item.nom, `piège sans nom ni infinitif présent : ${item.text}`);
    }
  }
});

test('banque : ≥ 30 phrases par niveau, niveaux 2 et 3 sans doublon, niveau 3 plus long que le niveau 1', () => {
  for (const [level, banks] of Object.entries(BANKS)) {
    for (const [kind, bank] of Object.entries(banks)) {
      assert.ok(new Set(bank.map((i) => i.text)).size >= 30, `niveau ${level} ${kind} : ${bank.length} phrases`);
      assert.equal(new Set(bank.map((i) => i.text)).size, bank.length, `doublon niveau ${level} ${kind}`);
      assert.ok(new Set(bank.map((i) => i.inf)).size >= 12, `infinitifs distincts niveau ${level} ${kind}`);
    }
  }
  const mean = (b) => b.reduce((s, i) => s + i.words.length, 0) / b.length;
  assert.ok(mean(BANKS[1].inf) + 1 <= mean(BANKS[3].inf), `${mean(BANKS[1].inf)} / ${mean(BANKS[3].inf)}`);
  assert.ok(N1.length && N2.length && N3.length);
});

test('niveau 1 : verbes en -er réguliers au présent ; niveau 2 : irréguliers, futur et passé composé ; niveau 3 : pièges', () => {
  for (const i of BANKS[1].inf) assert.ok(VERBES[i.inf].vous, `${i.text} : pas un -er régulier`);
  const irreg = BANKS[2].inf.filter((i) => !VERBES[i.inf].vous);
  assert.ok(irreg.length / BANKS[2].inf.length >= 0.6, 'au moins 60 % de verbes non réguliers au niveau 2');
  assert.ok(BANKS[2].inf.some((i) => i.verbe.includes(' ')), 'passé composé');
  assert.ok(BANKS[2].inf.some((i) => /(era|ira|aura|sera|iront|ront|dra)$/.test(i.verbe)), 'futur');
  const traps = BANKS[3].inf.filter((i) => i.pieges.length);
  assert.ok(traps.filter((i) => i.nom).length >= 8, 'noms de la même famille');
  assert.ok(traps.filter((i) => i.words.includes(i.pieges[0])).length >= 15, 'infinitif déjà dans la phrase');
});

// ===== Les questions tirées ===============================================================================

test('questions : une seule bonne réponse, les autres choix sont faux (table indépendante)', () => {
  for (let level = 1; level <= 3; level++) {
    for (const q of questions(level, 1500)) {
      const values = q.display.choices.map((c) => c.value);
      assert.equal(values.filter((v) => v === q.answer).length, 1, q.key);
      assert.equal(new Set(values).size, values.length, q.key);
      const item = ALL.find((i) => q.key.includes(`|${i.inf}|${i.text.toLowerCase()}|`));
      assert.ok(item, q.key);
      const kind = kindOf(q);
      if (kind === 'inf') {
        assert.equal(q.answer, GROUND[item.verbe][0]);
        assert.equal(values.length, level === 1 ? 3 : 4, q.key);
        for (const v of values.filter((x) => x !== q.answer)) {
          assert.notEqual(v, GROUND[item.verbe][0]);
          // Aucun autre choix n'est un infinitif du verbe interrogé : il n'existe qu'un infinitif par forme.
          if (INFINITIFS.has(v)) assert.ok(!VERBES[v] || !Object.values(GROUND).some(([i]) => i === v && item.verbe === v), q.key);
          else assert.doesNotMatch(v, /(er|ir|re|oir)$/, `${q.key} : « ${v} » ressemble à un infinitif`);
        }
        if (level >= 2) assert.ok(values.filter((v) => INFINITIFS.has(v)).length >= 3, `trois infinitifs au moins : ${q.key}`);
        if (level === 1) assert.ok(values.filter((v) => INFINITIFS.has(v)).length === 2 && values.some((v) => !INFINITIFS.has(v)), q.key);
        if (level === 3) for (const p of item.pieges) assert.ok(values.includes(p), q.key);
      } else if (kind === 'verbe') {
        assert.equal(q.answer, item.verbe);
        assert.ok(!item.verbe.includes(' '));
        assert.deepEqual(values, item.words, 'les mots restent dans l\'ordre de la phrase');
      } else {
        assert.equal(kind, 'sujet');
        assert.equal(q.answer, item.sujet);
        assert.deepEqual(values, sujetChoices(item));
        assert.ok(values.length >= 3, `moins de 3 choix : ${q.key}`);
        assert.ok(!values.includes(item.verbe), `le verbe est un choix : ${q.key}`);
        assert.ok(!values.some((v) => /^(où|que|quand|comment|pourquoi|qui|combien)$/i.test(v)), q.key);
        assert.ok(q.prompt.includes(`« ${item.verbe} »`), q.key);
      }
    }
  }
});

test('niveaux : sortes de questions attendues', () => {
  const kinds = (level) => new Set(questions(level, 600).map(kindOf));
  assert.deepEqual([...kinds(1)].sort(), ['inf', 'verbe']);
  assert.deepEqual([...kinds(2)].sort(), ['inf', 'sujet']);
  assert.deepEqual([...kinds(3)].sort(), ['inf', 'sujet', 'verbe']);
});

test('une même forme verbale ne revient jamais dans une partie', () => {
  for (let level = 1; level <= 3; level++) {
    const rng = createRng(9 + level);
    for (let i = 0; i < 200; i++) {
      const infs = buildQuestions(game, level, rng, 10).map((q) => q.key.split('|')[1]);
      assert.equal(new Set(infs).size, infs.length, `niveau ${level}`);
    }
  }
});

test('la bonne réponse est répartie sur toutes les positions (QCM d\'infinitifs)', () => {
  for (let level = 1; level <= 3; level++) {
    const qs = ofKind(questions(level, 3000), 'inf');
    const n = qs[0].display.choices.length;
    for (let pos = 0; pos < n; pos++) {
      const share = qs.filter((q) => q.display.choices[pos].value === q.answer).length / qs.length;
      assert.ok(Math.abs(share - 1 / n) < 0.07, `niveau ${level}, position ${pos} : ${(100 * share).toFixed(1)} %`);
    }
  }
});

// ===== Aucun raccourci de surface (couverture prouvée) ====================================================

const DET = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'mon', 'ma', 'mes', 'ses', 'son', 'sa', 'ces', 'ce', 'cette', 'l\'']);
const PREP = new Set(['à', 'au', 'aux', 'dans', 'sur', 'sous', 'en', 'de', 'du', 'chez', 'devant', 'après', 'pour', 'avec', 'par', 'pendant', 'près', 'derrière']);
const ENDING = /(er|ir|re|oir)$/;
const namedVerb = (v) => (v.prompt.match(/« ([^»]+) »/) || [])[1];

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

/** Part de réussite d'un solveur (réponse = valeur choisie) ; coverage = part des questions où il a un avis. */
function measure(qs, solver) {
  const views = qs.map(visibleOfQuestion);
  const handled = views.filter((v) => solver(v) != null);
  const ok = views.filter((v) => (solver(v) ?? v.choices[0]) === v.answer).length;
  return { coverage: handled.length / views.length, success: ok / views.length, n: views.length };
}
function expectSolver(label, qs, solver, { minCoverage, maxSuccess }) {
  const m = measure(qs, solver);
  console.log(`${label} : couverture ${(100 * m.coverage).toFixed(0)} %, réussite ${(100 * m.success).toFixed(0)} % (n=${m.n})`);
  assert.ok(m.n >= 300, `${label} : trop peu de questions (${m.n})`);
  assert.ok(m.coverage >= minCoverage, `${label} : couverture ${(100 * m.coverage).toFixed(1)} % < ${100 * minCoverage} % (solveur inopérant ?)`);
  assert.ok(m.success <= maxSuccess, `${label} : réussite ${(100 * m.success).toFixed(1)} % > ${100 * maxSuccess} %`);
  return m;
}

// --- toucher le verbe -------------------------------------------------------------------------------
const VERBE_SOLVERS = {
  'verbe : toujours le k-ième mot (meilleur k)': (qs) => {
    const views = qs.map(visibleOfQuestion);
    const best = Math.max(...[0, 1, 2, 3, 4, 5].map((k) => views.filter((v) => v.choices[k] === v.answer).length / views.length));
    return best;
  },
  'verbe : mot après le groupe nominal sujet': (v) => {
    const w = v.choices;
    const first = w[0].toLowerCase();
    return DET.has(first) || first.startsWith('l\'') ? w[2] : w[1];
  },
  'verbe : premier mot à terminaison verbale': (v) => v.choices.find((w) => /(e|es|ent|ons|ez|a|as|ont|it|ra|ront|s|t|d)$/.test(w)
    && !DET.has(w.toLowerCase())),
};

test('toucher le verbe : aucun raccourci de position ni de terminaison', () => {
  for (const level of [1, 3]) {
    const qs = ofKind(questions(level, 6000), 'verbe');
    const max = LIMITS.verbe[level];
    const k = VERBE_SOLVERS['verbe : toujours le k-ième mot (meilleur k)'](qs);
    console.log(`niveau ${level} : meilleur k fixe ${(100 * k).toFixed(0)} %`);
    assert.ok(k <= max.position, `niveau ${level} : un rang fixe donne ${(100 * k).toFixed(1)} %`);
    expectSolver(`niveau ${level} verbe : mot après le sujet`, qs, VERBE_SOLVERS['verbe : mot après le groupe nominal sujet'],
      { minCoverage: 0.95, maxSuccess: max.afterSubject });
    expectSolver(`niveau ${level} verbe : terminaison verbale`, qs, VERBE_SOLVERS['verbe : premier mot à terminaison verbale'],
      { minCoverage: 0.9, maxSuccess: max.suffix });
  }
});

// --- toucher le sujet -------------------------------------------------------------------------------
const SUJET_SOLVERS = {
  'sujet : premier groupe': (v) => v.choices[0],
  'sujet : groupe collé avant le verbe': (v) => {
    // Le verbe n'est plus un choix : on le cherche dans la phrase montrée, puis on prend le choix qui la précède.
    const at = (` ${v.text.replace(/,/g, ' ')} `).indexOf(` ${namedVerb(v)} `) - 1;
    const before = v.text.slice(0, Math.max(at, 0)).replace(/[,\s]+$/, '');
    return [...v.choices].filter((c) => before.endsWith(c)).sort((a, b) => b.length - a.length)[0] ?? null;
  },
  'sujet : premier groupe sans préposition': (v) => v.choices.find((c) => c !== namedVerb(v) && !PREP.has(c.split(' ')[0].toLowerCase())),
  'sujet : groupe le plus court': (v) => [...v.choices].filter((c) => c !== namedVerb(v)).sort((a, b) => a.length - b.length)[0],
  'sujet : groupe à majuscule (prénom) ou pronom': (v) => v.choices.find((c) => /^(\p{Lu}|nous\b)/u.test(c) && c !== namedVerb(v) && !/^(Dans|Le |La |Les |Un |Une |À |Après|Ce )/.test(c)),
};

test('toucher le sujet : aucun raccourci de position, de forme ni de longueur', () => {
  for (const level of [2, 3]) {
    const qs = ofKind(questions(level, 6000), 'sujet');
    const max = LIMITS.sujet[level];
    for (const [name, solver] of Object.entries(SUJET_SOLVERS)) {
      expectSolver(`niveau ${level} ${name}`, qs, solver, { minCoverage: /collé/.test(name) ? 0.9 : 0.2, maxSuccess: max[name] });
    }
  }
});

// --- infinitif -----------------------------------------------------------------------------------------
const closest = (v, pool) => {
  const target = namedVerb(v);
  const words = target ? [target.split(' ').at(-1), target.split(' ')[0]] : wordsOf(v.text);
  return [...pool].sort((a, b) => Math.min(...words.map((w) => lev(a, w))) - Math.min(...words.map((w) => lev(b, w))))[0];
};
const INF_SOLVERS = {
  'inf : le seul choix en -er/-ir/-re/-oir': (v) => {
    const f = v.choices.filter((c) => ENDING.test(c));
    return f.length === 1 ? f[0] : null;
  },
  'inf : le choix le plus long': (v) => {
    const s = [...v.choices].sort((a, b) => b.length - a.length);
    return s[0].length > s[1].length ? s[0] : null;
  },
  'inf : le choix le plus proche du verbe (toutes formes)': (v) => closest(v, v.choices),
  'inf : l\'infinitif le plus proche du verbe': (v) => closest(v, v.choices.filter((c) => ENDING.test(c))),
  'inf : écarte ce qui est déjà dans la phrase, puis le plus proche': (v) => {
    const text = wordsOf(v.text);
    const rest = v.choices.filter((c) => ENDING.test(c) && !text.includes(c));
    return rest.length ? closest(v, rest) : null;
  },
  'inf : écarte ce qui ressemble à un nom de la phrase, puis le plus proche': (v) => {
    const text = wordsOf(v.text);
    const rest = v.choices.filter((c) => ENDING.test(c) && !text.some((w) => w.length >= 4 && c.startsWith(w.slice(0, 4)) && !closest(v, [c, ...v.choices]).startsWith(w.slice(0, 3))));
    return rest.length ? closest(v, rest) : null;
  },
};

test('infinitif : aucun raccourci de terminaison, de longueur ou de lettres communes', () => {
  for (const level of [1, 2, 3]) {
    const qs = ofKind(questions(level, 6000), 'inf');
    const max = LIMITS.inf[level];
    for (const [name, solver] of Object.entries(INF_SOLVERS)) {
      const m = measure(qs, solver);
      console.log(`niveau ${level} ${name} : couverture ${(100 * m.coverage).toFixed(0)} %, réussite ${(100 * m.success).toFixed(0)} %`);
      const lim = max[name];
      if (!lim) continue;
      assert.ok(m.coverage >= lim.minCoverage, `niveau ${level} ${name} : couverture ${(100 * m.coverage).toFixed(1)} % (solveur inopérant ?)`);
      assert.ok(m.success <= lim.maxSuccess, `niveau ${level} ${name} : réussite ${(100 * m.success).toFixed(1)} % > ${100 * lim.maxSuccess} %`);
    }
  }
});

test('infinitif : « le seul infinitif » ne sert plus aux niveaux 2 et 3 (toujours trois infinitifs ou plus)', () => {
  for (const level of [2, 3]) {
    const qs = ofKind(questions(level, 3000), 'inf');
    const { coverage } = checkCueCoverage(qs, INF_SOLVERS['inf : le seul choix en -er/-ir/-re/-oir'], { maxCoverage: 0, label: `niveau ${level}` });
    assert.equal(coverage, 0);
  }
});

test('infinitif, niveau 2 : au plus la moitié des formes se devinent aux lettres communes avec leur infinitif', () => {
  // « prend → prendre » est transparent ; « est → être », « va → aller », « ont → avoir » ne le sont pas.
  const transparent = BANKS[2].inf.filter((i) => {
    const w = i.verbe.split(' ').at(-1);
    const d = (x) => lev(x, w);
    return VERBES[i.inf].proches.every((p) => d(i.inf) < d(p));
  });
  const share = transparent.length / BANKS[2].inf.length;
  console.log(`niveau 2 : ${transparent.length}/${BANKS[2].inf.length} formes transparentes (${(100 * share).toFixed(0)} %)`);
  assert.ok(share <= 0.5, `${(100 * share).toFixed(1)} %`);
});

// ===== Seuils mesurés (voir le rapport de la branche) ======================================================
// Chaque seuil est la valeur mesurée arrondie vers le haut, jamais un plafond théorique : une régression
// de la banque les dépasse. Les raccourcis qui reviennent à « appliquer la règle » du niveau 1 (le verbe
// est le mot qui suit le sujet ; l'infinitif d'un verbe en -er garde sa racine) sont signalés comme tels.
const inf = (long, near, nearInf, notInSentence, notNoun) => ({
  'inf : le choix le plus long': { minCoverage: 0.3, maxSuccess: long },
  'inf : le choix le plus proche du verbe (toutes formes)': { minCoverage: 0.9, maxSuccess: near },
  'inf : l\'infinitif le plus proche du verbe': { minCoverage: 0.9, maxSuccess: nearInf },
  'inf : écarte ce qui est déjà dans la phrase, puis le plus proche': { minCoverage: 0.9, maxSuccess: notInSentence },
  'inf : écarte ce qui ressemble à un nom de la phrase, puis le plus proche': { minCoverage: 0.9, maxSuccess: notNoun },
});
const LIMITS = {
  verbe: {
    1: { position: 0.43, afterSubject: 0.53, suffix: 0.28 },
    3: { position: 0.45, afterSubject: 0.42, suffix: 0.26 },
  },
  sujet: {
    2: {
      'sujet : premier groupe': 0.56, 'sujet : groupe collé avant le verbe': 0.75,
      'sujet : premier groupe sans préposition': 0.63, 'sujet : groupe le plus court': 0.54,
      'sujet : groupe à majuscule (prénom) ou pronom': 0.75,
    },
    3: {
      'sujet : premier groupe': 0.55, 'sujet : groupe collé avant le verbe': 0.7,
      'sujet : premier groupe sans préposition': 0.65, 'sujet : groupe le plus court': 0.25,
      'sujet : groupe à majuscule (prénom) ou pronom': 0.7,
    },
  },
  // Niveau 1 : « garder la racine et ajouter -er » EST la compétence visée, donc 100 % assumé ; il baisse ensuite.
  inf: { 1: inf(0.32, 0.71, 1, 1, 1), 2: inf(0.18, 0.6, 0.7, 0.7, 0.7), 3: inf(0.3, 0.37, 0.37, 0.65, 0.37) },
};

// ===== Explications ========================================================================================

test('explications : appliquent l\'astuce à LA phrase de l\'enfant', () => {
  for (const i of ALL) {
    if (!i.verbe.includes(' ')) {
      const v = explainVerbe(i);
      assert.ok(v.includes('« ne » et « pas »') && v.includes(`« ${i.verbe} »`), v);
      assert.match(negation(i), /^\p{Lu}.* (ne|n') ?\S+ pas( \S+)*$/u, negation(i));
      assert.ok(v.includes('verbe conjugué'), v);
      // Un infinitif présent dans la phrase est dit « déjà à l'infinitif » et reste après « pas ».
      for (const p of infinitifsPresents(i)) {
        assert.ok(v.includes(`« ${p} » est déjà à l'infinitif`) && v.includes(`pas ${p}`), v);
      }
    }
    const s = explainSujet(i);
    assert.ok(s.includes('« C\'est … qui') && s.includes(cestQui(i)) && s.includes(`« ${i.sujet} »`), s);
    assert.match(cestQui(i), /^(C'est|Ce sont) .+ qui /);
  }
  for (const i of INF_ITEMS) {
    for (const level of [1, 3]) {
      const e = explainInf(i, level);
      // L'astuce montre le contre-exemple : « il faut regarder », pas « il faut regarde ».
      assert.ok(e.includes(`« il faut ${i.inf} », pas « il faut ${i.verbe} »`) && e.includes(`« ${i.verbe} »`), e);
      if (level === 3) assert.ok(e.includes('est le même verbe que'), e);
      assert.doesNotMatch(e, /c'est « \S+ »\. Il faut|, c'est/, e);
      assert.ok(e.length < 420, `${e.length} signes : ${e}`);
      assert.doesNotMatch(e, /\bfaux\b|\bnul\b|\bmauvais/i);
    }
    assert.ok(explainInf(i, 3).includes('nous '));
    assert.ok(!i.pieges.length || piegesNote(i).split('«').length - 1 >= i.pieges.length);
  }
  const chat = BANKS[2].sujet.find((i) => i.text === 'À midi, le chat dort sur un canapé.');
  assert.equal(cestQui(chat), 'C\'est le chat qui dort');
  const enf = BANKS[1].inf.find((i) => i.text === 'Les enfants jouent au ballon.');
  assert.equal(cestQui(enf), 'Ce sont les enfants qui jouent');
  assert.equal(cestQui(BANKS[1].inf.find((i) => i.verbe === 'chantons')), 'C\'est nous qui chantons');
  assert.equal(negation(BANKS[1].inf.find((i) => i.verbe === 'aime' && i.sujet === 'Maman')), 'Maman n\'aime pas');
  assert.equal(inline('Le chat'), 'le chat');
  assert.equal(inline('Léo'), 'Léo');
  assert.equal(pluriel('Mia et Léo'), true);
});

test('explications : les pièges sont dits (nom de la même famille, infinitif déjà là)', () => {
  const aime = BANKS[3].inf.find((i) => i.text === 'Léo aime chanter.');
  assert.match(explainInf(aime, 3), /« chanter » est déjà à l'infinitif/);
  const chant = BANKS[3].inf.find((i) => i.text === 'Le chant des oiseaux réveille Léa.');
  assert.match(explainInf(chant, 3), /« chant » est un nom, pas un verbe/);
  const saut = BANKS[3].inf.find((i) => i.text === 'Le saut de Léa fait rire Adam.');
  assert.match(explainInf(saut, 3), /« saut » est un nom.*« rire » est déjà à l'infinitif/);
});

test('explications : échantillon recopié (10 tirées au hasard)', () => {
  const sample = [];
  for (let level = 1; level <= 3; level++) sample.push(...questions(level, 60, 7).slice(0, 12));
  const picked = createRng(2026).sample(sample, 10);
  console.log(picked.map((q) => `- [${q.key.split('|').at(-1)}] ${q.explain}`).join('\n'));
  for (const q of picked) assert.ok(q.explain.length > 60 && q.explain.length < 420, q.explain);
});

// ===== Voix et consignes ===================================================================================

test('voix : ne donne jamais l\'infinitif ; consignes à l\'impératif, sans « tu » ni « je »', () => {
  for (let level = 1; level <= 3; level++) {
    for (const q of questions(level, 600)) {
      assert.ok(q.speak && !/[«»…]/.test(q.speak), q.speak);
      if (kindOf(q) === 'inf') assert.ok(!wordsOf(q.speak).includes(q.answer), `${q.key} : la voix dit « ${q.answer} »`);
      assert.doesNotMatch(`${q.prompt} ${q.explain}`, /\b(tu|toi|ton|ta|tes|je|j')\b/i, q.key);
    }
  }
});

// ===== Mixité ============================================================================================

test('mixité : aucun accord genré adressé à l\'enfant', () => {
  checkEpicene(ALL.map((i) => i.text), { label: 'banque « Le verbe et son sujet »' });
  for (let level = 1; level <= 3; level++) {
    checkEpicene(questions(level, 400).flatMap(textsOfQuestion), { label: `« Le verbe et son sujet » niveau ${level}` });
  }
});

test('mixité : prénoms de filles et de garçons à parts égales, Papa et Maman, rôles non stéréotypés', () => {
  const text = ALL.map((i) => i.text).join(' ');
  const filles = ['Mia', 'Lina', 'Inès', 'Zoé', 'Sofia', 'Nina', 'Jade', 'Léa', 'Emma'];
  const garcons = ['Léo', 'Noah', 'Hugo', 'Adam', 'Yanis', 'Maël', 'Tom', 'Lucas'];
  const count = (names) => names.reduce((s, n) => s + (text.match(new RegExp(`\\b${n}\\b`, 'g')) || []).length, 0);
  const f = count(filles);
  const g = count(garcons);
  assert.ok(f >= 20 && g >= 20, `filles ${f} / garçons ${g}`);
  assert.ok(Math.max(f, g) / Math.min(f, g) <= 1.4, `déséquilibre filles ${f} / garçons ${g}`);
  const papa = (text.match(/\bPap(a|i)\b/g) || []).length;
  const maman = (text.match(/\b(Maman|Mamie)\b/g) || []).length;
  assert.ok(papa >= 8 && maman >= 8 && Math.max(papa, maman) / Math.min(papa, maman) <= 1.6, `papas ${papa} / mamans ${maman}`);
  const FILLES = /\b(Mia|Lina|Inès|Zoé|Sofia|Nina|Jade|Léa|Emma|Maman|Mamie|sœur|factrice|directrice)\b/;
  const GARCONS = /\b(Léo|Noah|Hugo|Adam|Yanis|Maël|Tom|Lucas|Papa|Papi|frère)\b/;
  for (const stem of [/prépar|cuisin|lave|range|répare/, /chant|danse|dessin|colorie/, /nag|saut|vélo|ballon/]) {
    const hits = ALL.map((i) => i.text).filter((s) => stem.test(s));
    assert.ok(hits.length >= 2, `${stem} : ${hits.length}`);
    assert.ok(hits.some((s) => FILLES.test(s)) && hits.some((s) => GARCONS.test(s)), `${stem} : filles ET garçons attendus`);
  }
  assert.doesNotMatch(text, /\b(tu|je|j'|toi|ton|ta|tes)\b/i);
});
