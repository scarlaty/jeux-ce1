// Lecture éclair (E3-T5) : fluence de lecture de mots fréquents.
//  Niveau 1 : un mot court (script) -> toucher la bonne image parmi 3 images aux mots voisins.
//  Niveau 2 : un mot (cursive ou script) -> image parmi 4 ; ou « Touche le mot que tu entends » (3 mots proches).
//  Niveau 3 : mots-outils : la voix lit, on touche le mot écrit parmi 4 mots proches.
// Sécurité : jamais deux bonnes réponses (pas d'homophones quand la voix lit, pas deux images
// pour un même mot, pas deux mêmes émojis). Aucun chrono : la voix peut être réécoutée à volonté.
import { SYLLABLE_WORDS, isTransparent } from '../data/syllabes.js';
import { MOTS_FREQUENTS, sameSound } from '../data/mots-frequents.js';

/** Images qu'une enfant pourrait confondre : jamais côte à côte. */
const CONFUSABLE = [['main', 'doigt'], ['jambe', 'main'], ['poule', 'poussin'], ['coq', 'poule'], ['canard', 'oiseau'],
  ['moto', 'vélo'], ['arbre', 'plante'], ['chapeau', 'écharpe'], ['pastèque', 'melon'], ['cactus', 'plante'],
  ['coq', 'poussin'], ['dent', 'bouche'], ['soleil', 'feu']];
const confusable = (a, b) => CONFUSABLE.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

const WITH_IMAGE = SYLLABLE_WORDS.filter((w) => w.emoji);
const SHORT = WITH_IMAGE.filter((w) => w.word.length <= 6 && isTransparent(w) && !w.word.includes('œ'));

/** Ressemblance visuelle de deux mots (plus grand = plus proche). */
export function closeness(a, b) {
  const pairs = (w) => new Set([...w].slice(0, -1).map((c, i) => c + w[i + 1]));
  const pa = pairs(a);
  const shared = [...pairs(b)].filter((p) => pa.has(p)).length;
  return (a[0] === b[0] ? 3 : 0) + (a.at(-1) === b.at(-1) ? 2 : 0) + shared * 2 - Math.abs(a.length - b.length);
}

/** Les mots les plus proches de `word` dans `pool`, hors homophones. Déterministe. */
export function lookalikes(word, pool, { size = 6, ok = () => true } = {}) {
  return pool
    .filter((w) => w.word !== word && !sameSound(w.word, word) && ok(w))
    .map((w) => [closeness(word, w.word), w])
    .filter(([score]) => score >= 2)
    .sort((x, y) => y[0] - x[0] || x[1].word.localeCompare(y[1].word, 'fr'))
    .slice(0, size)
    .map(([, w]) => w);
}

const prepare = (targets, pool, need, ok) => targets
  .map((t) => ({ entry: t, others: lookalikes(t.word, pool, { ok: (w) => ok(t, w) }) }))
  .filter((c) => c.others.length >= need);

const noClash = (t, w) => w.emoji !== t.emoji && !confusable(t.word, w.word);
const OUTILS = MOTS_FREQUENTS.map((m) => ({ word: m.word, text: m.text }));

export const POOLS = {
  1: prepare(SHORT, SHORT, 2, noClash),
  2: prepare(WITH_IMAGE, WITH_IMAGE, 3, noClash),
  hear2: prepare(WITH_IMAGE, WITH_IMAGE, 2, () => true),
  3: prepare(OUTILS, [...OUTILS, ...WITH_IMAGE.map((w) => ({ word: w.word, text: w.word }))], 3, (t, w) => w.text !== t.text),
};

const quote = (w) => `« ${w} »`;
const spell = (w) => [...w].filter((c) => c !== ' ').join('-');

function pictureQuestion({ entry, others }, level, rng) {
  const wrong = rng.sample(others, level === 1 ? 2 : 3);
  const cursive = level === 2 && rng.chance();
  const choices = rng.shuffle([entry, ...wrong]).map((w) => ({ value: w.word, emoji: w.emoji, label: w.word }));
  return {
    key: `lecture-eclair:image:${entry.word}`,
    type: 'choice',
    prompt: 'Lis le mot, puis touche la bonne image.',
    speak: 'Lis le mot, puis touche la bonne image.',
    display: { show: { text: entry.word, cursive }, choices },
    answer: entry.word,
    explain: `Le mot ${quote(entry.word)} s'écrit ${spell(entry.word)} : c'est l'image ${entry.emoji}.`,
    skill: 'lire des mots fréquents',
  };
}

function hearQuestion({ entry, others }, level, rng) {
  const wrong = [];
  for (const w of rng.shuffle(others)) {
    if (wrong.length < (level === 2 ? 2 : 3) && !wrong.some((x) => sameSound(x.word, w.word))) wrong.push(w);
  }
  if (wrong.length < (level === 2 ? 2 : 3)) return hearQuestion(rng.pick(POOLS[level === 2 ? 'hear2' : 3]), level, rng);
  const text = (w) => w.text || w.word;
  const choices = rng.shuffle([entry, ...wrong]).map((w) => ({ value: w.word, text: text(w) }));
  return {
    key: `lecture-eclair:ecoute${level}:${entry.word}`,
    type: 'choice',
    prompt: 'Écoute, et touche le mot que tu entends.',
    speak: 'Écoute, et touche le mot que tu entends.',
    display: { show: { emoji: '🔊', label: 'Écoute', speak: text(entry) }, choices, cursive: level === 2 },
    answer: entry.word,
    explain: `Tu as entendu ${quote(text(entry))} : ${spell(text(entry))}. Regarde bien toutes les lettres du mot.`,
    skill: level === 3 ? 'mots-outils fréquents' : 'lire des mots fréquents',
  };
}

const PICK = {
  1: (rng) => pictureQuestion(rng.pick(POOLS[1]), 1, rng),
  2: (rng) => (rng.chance()
    ? pictureQuestion(rng.pick(POOLS[2]), 2, rng)
    : hearQuestion(rng.pick(POOLS.hear2), 2, rng)),
  3: (rng) => hearQuestion(rng.pick(POOLS[3]), 3, rng),
};

export default {
  id: 'lecture-eclair',
  title: 'Lecture éclair',
  island: 'mots',
  subject: 'français',
  issue: 26,
  skills: ['Lire des mots fréquents avec aisance', 'Reconnaître des mots-outils', 'Associer un mot écrit à une image ou à sa voix'],
  levels: [
    { label: 'Niveau 1', hint: 'Un mot court, trois images' },
    { label: 'Niveau 2', hint: 'Mots en cursive, mots à écouter' },
    { label: 'Niveau 3', hint: 'Petits mots du quotidien' },
  ],
  makeQuestion(level, rng, seen) {
    for (let i = 0; i < 12; i++) {
      const q = PICK[level](rng);
      if (!seen || !seen.has(q.key)) return q;
    }
    return PICK[level](rng);
  },
};
