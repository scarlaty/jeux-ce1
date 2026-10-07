// Devinettes (E3-T6) : lire une devinette courte et choisir la bonne réponse.
//  Niveau 1 : 2 indices très simples, 3 images.
//  Niveau 2 : 3 indices, 4 images ; les intrus sont plausibles (ils vérifient au moins un indice).
//  Niveau 3 : réponses en mots seulement ; 2 ou 3 indices + un indice de déduction « Je ne suis pas… ».
// Aucune ambiguïté (voir js/data/devinettes.js) : chaque indice est vrai de la réponse, et chaque
// intrus contredit au moins un indice sans hésitation possible. Au niveau 3, un seul intrus vérifie
// tous les indices positifs : c'est « Je ne suis pas… » qui l'écarte.
import {
  THINGS, KIND_RANK, TAGS, confusable, clueText, whyNot, definite, indefinite, contradicted, fitsAll,
} from '../data/devinettes.js';

const kind = (tag) => TAGS[tag].kind;
const byRank = (a, b) => KIND_RANK[kind(a)] - KIND_RANK[kind(b)];

/** `count` indices tirés parmi `tags` : au plus une catégorie et une couleur (sinon l'indice est redondant). */
function pickClues(tags, count, rng) {
  const picked = [];
  for (const tag of rng.shuffle([...tags])) {
    if (picked.length === count) break;
    if (['cat', 'colour'].includes(kind(tag)) && picked.some((p) => kind(p) === kind(tag))) continue;
    picked.push(tag);
  }
  return picked.length === count ? picked.sort(byRank) : null;
}

/** Des images qui ne se ressemblent pas et qu'on ne confond pas avec les images déjà choisies. */
const compatible = (t, chosen) => chosen.every((c) => c.emoji !== t.emoji && !confusable(c.word, t.word));

function pickWrong(candidates, count, chosen, rng, preferred = () => false) {
  const out = [];
  const pool = rng.shuffle([...candidates]);
  const sorted = [...pool.filter(preferred), ...pool.filter((t) => !preferred(t))];
  for (const t of sorted) {
    if (out.length === count) break;
    if (compatible(t, [...chosen, ...out])) out.push(t);
  }
  return out.length === count ? out : null;
}

/** Le premier indice sert d'explication : celui que le plus d'intrus contredisent (le plus évident d'abord). */
function decisiveClue(clues, wrong) {
  const score = (c) => wrong.filter((w) => contradicted(w, [c]).length).length * 10 - KIND_RANK[kind(c)];
  return [...clues].sort((a, b) => score(b) - score(a))[0];
}

const END = { picture: 'Qui suis-je ? Touche la bonne image.' };

function pictureQuestion(level, rng) {
  const need = level === 1 ? 2 : 3;
  const answer = rng.pick(THINGS.filter((t) => t.is.size >= need));
  const clues = pickClues(answer.is, need, rng);
  if (!clues) return null;
  const others = THINGS.filter((t) => t !== answer && !fitsAll(t, clues));
  const shares = (t) => clues.some((c) => t.fits.has(c));
  // Niveau 2 : intrus plausibles (au moins un indice vérifié) ; niveau 1 : n'importe quelle image différente.
  const wrong = pickWrong(others, need === 2 ? 2 : 3, [answer], rng, level === 2 ? shares : () => false);
  if (!wrong) return null;
  const key = decisiveClue(clues, wrong);
  const why = wrong.filter((w) => contradicted(w, [key]).length).slice(0, 2).map((w) => whyNot(key, w));
  const text = `${clues.map((c) => clueText(c, answer)).join(' ')} ${END.picture}`;
  const choices = rng.shuffle([answer, ...wrong]).map((t) => ({ value: t.word, emoji: t.emoji, label: t.word }));
  return {
    key: `devinettes:${level}:${answer.word}:${clues.join('+')}`,
    type: 'choice',
    prompt: text,
    speak: text,
    display: { choices },
    answer: answer.word,
    explain: `C'est ${indefinite(answer)} ! L'indice qui aide : « ${clueText(key, answer)} » ${why.join(' ')}`.trim(),
    skill: 'comprendre une devinette',
    riddle: { answer: answer.word, clues, wrong: wrong.map((w) => w.word) },
  };
}

function deductionQuestion(rng) {
  const answer = rng.pick(THINGS);
  const twins = rng.shuffle(THINGS.filter((t) => t !== answer && compatible(t, [answer])
    && [...answer.is].filter((tag) => t.is.has(tag)).length >= 2));
  for (const twin of twins) {
    const shared = [...answer.is].filter((tag) => twin.is.has(tag));
    const clues = pickClues(shared, Math.min(3, shared.length) === 3 && rng.chance(0.6) ? 3 : 2, rng);
    if (!clues) continue;
    const others = THINGS.filter((t) => t !== answer && t !== twin && !fitsAll(t, clues));
    const wrong = pickWrong(others, 2, [answer, twin], rng, (t) => clues.some((c) => t.fits.has(c)));
    if (!wrong) continue;
    const text = `${clues.map((c) => clueText(c, answer)).join(' ')} Je ne suis pas ${indefinite(twin)}. Qui suis-je ?`;
    const choices = rng.shuffle([answer, twin, ...wrong]).map((t) => ({ value: t.word, text: t.word }));
    const reason = clues.map((c) => clueText(c, answer)).join(' ');
    return {
      key: `devinettes:3:${answer.word}:${twin.word}:${clues.join('+')}`,
      type: 'choice',
      prompt: `${text} Touche le bon mot.`,
      speak: `${text} Touche le bon mot.`,
      display: { choices, cursive: true },
      answer: answer.word,
      explain: `« ${reason} » : ça pourrait être ${definite(twin)} ou ${definite(answer)}. `
        + `Mais « Je ne suis pas ${indefinite(twin)} », donc c'est ${indefinite(answer)} !`,
      skill: 'comprendre une devinette',
      riddle: { answer: answer.word, clues, twin: twin.word, wrong: wrong.map((w) => w.word) },
    };
  }
  return null;
}

const MAKE = {
  1: (rng) => pictureQuestion(1, rng),
  2: (rng) => pictureQuestion(2, rng),
  3: (rng) => deductionQuestion(rng),
};

function draw(level, rng) {
  for (let i = 0; i < 200; i++) {
    const q = MAKE[level](rng);
    if (q) return q;
  }
  throw new Error(`devinettes : aucune question possible au niveau ${level}`);
}

export default {
  id: 'devinettes',
  title: 'Devinettes',
  island: 'mots',
  subject: 'français',
  issue: 27,
  skills: ['Comprendre un texte court', 'Relier des indices pour trouver une réponse', 'Raisonner par déduction'],
  levels: [
    { label: 'Niveau 1', hint: '2 indices, 3 images' },
    { label: 'Niveau 2', hint: '3 indices, 4 images' },
    { label: 'Niveau 3', hint: 'Des mots et un indice de déduction' },
  ],
  makeQuestion(level, rng, seen) {
    for (let i = 0; i < 12; i++) {
      const q = draw(level, rng);
      if (!seen || !seen.has(q.key)) return q;
    }
    return draw(level, rng);
  },
};
