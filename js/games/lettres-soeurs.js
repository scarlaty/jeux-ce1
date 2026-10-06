// Lettres sœurs (CE1, programmes 2024) : ne pas confondre les lettres qui se ressemblent
// (b/d, p/q, m/n, f/v) ni les sons proches (ch/j, t/d).
//
// Chaque mot de la banque illustrée est écrit avec la lettre à retrouver entre crochets :
// « ba[t]eau ». Le mot « sœur » est ce même mot où la lettre est remplacée par sa sœur :
// « badeau ». Pour qu'aucune question n'ait deux bonnes réponses, TOUS ces faux mots ont été
// relus un à un : aucun n'est un mot français (« bouche » est écarté : « douche » existe ;
// « bois », « balle », « train » aussi). Un test relit le calcul des faux mots et refuse les
// mots de la banque. Les mots viennent de js/data/syllabes.js (mots illustrés).
//
// Deux formes de questions :
//   trou  : « Quelle lettre manque ? » — le mot illustré avec un trou (« _ateau »), deux lettres ;
//   ecrit : « Touche le mot bien écrit » — le mot illustré, deux ou trois écritures dont
//           une seule est juste (« bateau / dateau »), en script ou en cursive.
import { findSyllableWord } from '../data/syllabes.js';

/** Les couples de lettres, dans l'ordre où le jeu les introduit. */
export const PAIRS = {
  bd: ['b', 'd'],
  pq: ['p', 'q'],
  mn: ['m', 'n'],
  fv: ['f', 'v'],
  chj: ['ch', 'j'],
  td: ['t', 'd'],
};

/** Les couples travaillés à chaque niveau (cumulatif). */
export const LEVEL_PAIRS = {
  1: ['bd', 'pq'],
  2: ['bd', 'pq', 'mn', 'fv'],
  3: ['bd', 'pq', 'mn', 'fv', 'chj', 'td'],
};

// Astuces de mémorisation, une par lettre : courtes, positives, et jamais « tu t'es trompé ».
const TIPS = {
  b: 'b : le ventre est devant, comme bébé qui a un gros ventre.',
  d: 'd : le dos est derrière, comme dans « dos ».',
  p: 'p : le bâton descend et le rond est devant, comme dans « pomme ».',
  q: 'q : le rond est derrière, et q est toujours avec u : « qu ».',
  m: 'm : trois jambes et deux ponts, comme dans « maman ».',
  n: 'n : deux jambes et un seul pont.',
  f: 'f : un grand bâton avec un petit crochet, comme un fanion.',
  v: 'v : la pointe est en bas, comme un verre.',
  ch: 'ch : comme dans « chut ! », on souffle.',
  j: 'j : comme dans « je », la queue descend sous la ligne.',
  t: 't : il ressemble à une petite croix.',
};
const SKILLS = {
  bd: 'distinguer b et d',
  pq: 'distinguer p et q',
  mn: 'distinguer m et n',
  fv: 'distinguer f et v',
  chj: 'distinguer ch et j',
  td: 'distinguer t et d',
};

// Le mot, la lettre cherchée entre crochets. Les mots sont tous dans la banque illustrée.
const RAW = {
  bd: `[b]ateau [b]anane [b]iberon [b]onbon [b]aignoire tam[b]our ar[b]re croco[d]ile [b]rocoli
    ca[d]eau canar[d] [d]auphin [d]ent [d]inde [d]oigt [d]ragon hi[b]ou jam[b]e or[d]inateur
    pan[d]a renar[d] ro[b]ot zè[b]re concom[b]re`,
  pq: `cham[p]ignon cha[p]eau échar[p]e hélico[p]tère la[p]in lou[p] [p]ain [p]anda [p]antalon
    para[p]luie [p]êche [p]inceau [p]lante [p]oire [p]oivron [p]oule [p]ont sa[p]in ser[p]ent
    mousti[q]ue re[q]uin co[q] pastè[q]ue`,
  mn: `ana[n]as ba[n]ane cha[m]eau citro[n] cocho[n] co[n]combre di[n]de drago[n] ga[n]t ja[m]be
    ka[n]gourou lapi[n] licor[n]e lu[n]e [m]aison [m]anteau [m]arteau [m]elon [m]icro [m]iroir
    [m]outon ora[n]ge pa[n]da pa[n]talon si[n]ge ta[m]bour te[n]te to[m]ate trai[n] raisi[n]
    rhi[n]océros savo[n] serpe[n]t re[n]ard [m]oto [m]ouche`,
  fv: `a[v]ocat che[v]al chè[v]re [f]ée [f]leur [f]ourmi [f]raise [f]usée gira[f]e ré[v]eil
    sa[v]on [v]alise [v]élo [v]oiture poi[v]ron`,
  chj: `[ch]ameau [ch]ampignon [ch]apeau [ch]at [ch]eval [ch]èvre [ch]ien [ch]ocolat clo[ch]e
    co[ch]on é[ch]arpe ha[ch]e [j]ambe [j]ournal mou[ch]e pê[ch]e va[ch]e`,
  td: `avoca[t] ba[t]eau cac[t]us chocola[t] ci[t]ron cou[t]eau croco[d]ile [d]auphin [d]inde
    [d]oigt [d]ragon escargo[t] é[t]oile gâ[t]eau gui[t]are man[t]eau mar[t]eau mous[t]ique
    mou[t]on or[d]inateur pan[d]a pan[t]alon plan[t]e robo[t] serpen[t] [t]ambour [t]ente
    [t]igre [t]omate [t]ortue [t]racteur voi[t]ure`,
};

/** « ba[t]eau » → { pair, word, before, right, wrong, after, gap, wrongWord }. */
function parse(pair, text) {
  const [a, b] = PAIRS[pair];
  const m = /^(.*)\[(.+)\](.*)$/.exec(text);
  const [, before, right, after] = m;
  const wrong = right === a ? b : a;
  return Object.freeze({
    pair,
    word: before + right + after,
    before,
    right,
    wrong,
    after,
    gap: `${before}_${after}`,
    wrongWord: before + wrong + after,
  });
}

function build() {
  const entries = [];
  for (const [pair, list] of Object.entries(RAW)) {
    for (const token of list.trim().split(/\s+/)) {
      entries.push(parse(pair, token));
    }
  }
  return entries;
}

/** Toutes les entrées, tous couples confondus (sans doublon couple + mot). */
export const ENTRIES = (() => {
  const seen = new Set();
  return build().filter((e) => {
    const key = `${e.pair}:${e.word}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
})();

const imageOf = (word) => findSyllableWord(word)?.emoji ?? null;

const byPair = (pairs) => ENTRIES.filter((e) => pairs.includes(e.pair) && imageOf(e.word));

// --- Les deux formes de questions ----------------------------------------------------------------

const quote = (word) => `« ${word} »`;

/** Astuce de la bonne lettre (et, en contraste, de sa sœur quand on n'a qu'un couple). */
const tipsFor = (entries, { contrast = false } = {}) => entries.flatMap((e) => (
  contrast ? [TIPS[e.right], TIPS[e.wrong]] : [TIPS[e.right]]
)).join(' ');

function gapQuestion(level, rng) {
  const pair = rng.pick(LEVEL_PAIRS[level]);
  const e = rng.pick(byPair([pair]));
  const cursive = level > 1 && rng.chance(0.5);
  return {
    key: `lettres-soeurs:trou:${pair}:${e.word}`,
    type: 'choice',
    prompt: 'Quelle lettre manque dans ce mot ?',
    speak: `Quelle lettre manque dans le mot ${e.word} ?`,
    display: {
      show: { emoji: imageOf(e.word), text: e.gap, cursive, speak: e.word },
      choices: rng.shuffle([e.right, e.wrong]),
      cursive,
    },
    answer: e.right,
    explain: `${quote(e.word)} s'écrit avec ${e.right}. ${tipsFor([e], { contrast: true })}`,
    skill: SKILLS[pair],
  };
}

/** Les entrées dont on montre le faux mot : la principale, et parfois une autre du même mot. */
function spellingChoices(e, level, rng) {
  const same = byPair(LEVEL_PAIRS[level]).filter((x) => x.word === e.word && x !== e);
  const wanted = rng.chance(0.5) ? 1 : 0;
  const others = rng.sample(same, Math.min(wanted, same.length));
  return [e, ...others];
}

function spellingQuestion(level, rng) {
  const pair = rng.pick(LEVEL_PAIRS[level]);
  const e = rng.pick(byPair([pair]));
  const used = spellingChoices(e, level, rng);
  const cursive = rng.chance(0.5);
  const spoken = level === 3;
  return {
    key: `lettres-soeurs:ecrit:${pair}:${e.word}`,
    type: 'choice',
    prompt: spoken ? 'Écoute le mot, puis touche-le bien écrit.' : 'Touche le mot bien écrit.',
    speak: spoken ? `Touche le mot ${e.word}, bien écrit.` : 'Touche le mot bien écrit.',
    display: {
      show: { emoji: imageOf(e.word), speak: e.word },
      choices: rng.shuffle([e.word, ...used.slice(1).map((x) => x.wrongWord), e.wrongWord]),
      cursive,
    },
    answer: e.word,
    explain: `${quote(e.word)} s'écrit ainsi. ${tipsFor(used)}`,
    skill: SKILLS[pair],
  };
}

// --- Déroulé d'une partie ---------------------------------------------------------------------

const FORMS = {
  1: ['trou', 'trou', 'trou', 'trou', 'trou', 'trou', 'trou', 'trou', 'trou', 'trou'],
  2: ['trou', 'trou', 'trou', 'trou', 'trou', 'ecrit', 'ecrit', 'ecrit', 'ecrit', 'ecrit'],
  3: ['trou', 'trou', 'trou', 'ecrit', 'ecrit', 'ecrit', 'ecrit', 'ecrit', 'ecrit', 'ecrit'],
};
const MAKERS = { trou: gapQuestion, ecrit: spellingQuestion };

// Le paquet d'une partie est retrouvé grâce à `seen` (propre à la partie), pour que les
// nouveaux essais (doublon) gardent la même forme de question.
const decks = new WeakMap();

function deckFor(level, rng, seen) {
  const saved = decks.get(seen);
  if (saved && saved.level === level) return saved.deck;
  const deck = rng.shuffle(FORMS[level]);
  decks.set(seen, { level, deck });
  return deck;
}

export default {
  id: 'lettres-soeurs',
  title: 'Lettres sœurs',
  island: 'mots',
  subject: 'français',
  issue: 24,
  skills: [
    'Ne pas confondre les lettres b/d, p/q, m/n, f/v',
    'Distinguer les sons ch/j et t/d',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'b ou d, p ou q' },
    { label: 'Niveau 2', hint: '+ m ou n, f ou v' },
    { label: 'Niveau 3', hint: '+ ch ou j, t ou d' },
  ],
  makeQuestion(level, rng, seen) {
    if (!seen) return MAKERS[rng.pick(FORMS[level])](level, rng);
    const deck = deckFor(level, rng, seen);
    return MAKERS[deck[seen.size % deck.length]](level, rng);
  },
};
