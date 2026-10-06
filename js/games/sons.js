// Les sons (CE1, programmes 2024) : retrouver le son complexe que l'on entend dans un mot.
// Cinq formes de questions pour éviter la monotonie, toutes construites sur la même banque
// de mots (js/data/mots-illustres.js) :
//   image  : touche l'image où tu entends le son ;
//   mot    : touche le mot écrit où tu entends le son ;
//   quel   : on montre un mot, l'enfant choisit le son qu'il entend ;
//   intrus : trois mots avec le son, un sans — c'est lui qu'il faut toucher ;
//   tri    : ranger quatre images dans deux boîtes, un son par boîte.
//
// Règle de sécurité commune : aucun mauvais choix ne doit contenir le son visé ni un son qui
// s'entend pareil (voir `blockedSounds`), sinon la question aurait deux bonnes réponses.
import {
  EXTRA_SOUNDS, getSound, wordsWithSound, wordsWithout, wordsOnlyWith, blockedSounds,
} from '../data/mots-illustres.js';

/** Les sons découverts à chaque niveau ; un niveau rejoue aussi ceux des niveaux précédents. */
const NEW_SOUNDS = {
  1: ['ou', 'on', 'an', 'oi', 'ch'],
  2: ['in', 'eu'],
  3: ['gn', 'ill', 'ail', 'eil'],
};
const LEVEL_SOUNDS = {
  1: NEW_SOUNDS[1],
  2: [...NEW_SOUNDS[1], ...NEW_SOUNDS[2]],
  3: [...NEW_SOUNDS[1], ...NEW_SOUNDS[2], ...NEW_SOUNDS[3]],
};

// Un niveau ne montre que des mots dont tous les sons complexes ont déjà été rencontrés :
// à l'étape [ou]/[on]/[an]/[oi]/[ch], on ne demande pas de lire « corbeille » ni « champignon ».
const ALWAYS_ALLOWED = EXTRA_SOUNDS.map((s) => s.id);
const WORDS_OF = {
  1: wordsOnlyWith([...LEVEL_SOUNDS[1], ...ALWAYS_ALLOWED]),
  2: wordsOnlyWith([...LEVEL_SOUNDS[2], ...ALWAYS_ALLOWED]),
  3: wordsOnlyWith([...LEVEL_SOUNDS[3], ...ALWAYS_ALLOWED]),
};

/** Les mots du niveau où l'on entend `sound`. */
const bearers = (level, sound, emoji = false) => wordsWithSound(sound, { emoji, from: WORDS_OF[level] });

/** Les mots du niveau utilisables comme intrus pour `sounds`. */
const intruders = (level, sounds, emoji = false) => wordsWithout(blockedSounds(sounds), { emoji, from: WORDS_OF[level] });

const label = (sound) => getSound(sound).label;
const say = (sound) => getSound(sound).say;
const quote = (word) => `« ${word} »`;

/** « « loup », « hibou » et « poule » ». */
function listWords(words) {
  const quoted = words.map(quote);
  return `${quoted.slice(0, -1).join(', ')} et ${quoted[quoted.length - 1]}`;
}

/** Les sons nouveaux du niveau tombent plus souvent que ceux déjà vus. */
function pickSound(level, rng) {
  const fresh = NEW_SOUNDS[level];
  const seen = LEVEL_SOUNDS[level].filter((s) => !fresh.includes(s));
  return seen.length && rng.chance(0.35) ? rng.pick(seen) : rng.pick(fresh);
}

/** Les sons du niveau que l'on n'entend pas dans ce mot : des mauvaises réponses sûres. */
function otherSounds(level, entry) {
  const blocked = blockedSounds(entry.sounds);
  return LEVEL_SOUNDS[level].filter((s) => !blocked.has(s));
}

const imageChoice_ = (w) => ({ value: w.word, emoji: w.emoji, label: w.word });

/** Base commune aux questions « image », « mot » et « intrus ». */
function soundChoice({ sound, form, images, prompt, speak, words, answer, explain }) {
  return {
    key: `sons:${sound}:${form}:${answer}`,
    type: 'choice',
    prompt,
    speak,
    display: images
      ? { choices: words.map(imageChoice_) }
      : { choices: words.map((w) => w.word), cursive: true },
    answer,
    explain,
    skill: `son ${label(sound)}`,
  };
}

// --- Les cinq formes de questions --------------------------------------------------------------

/** Quatre images, une seule où l'on entend le son. */
function pictureQuestion(level, rng) {
  const sound = pickSound(level, rng);
  const right = rng.pick(bearers(level, sound, true));
  const others = rng.sample(intruders(level, [sound], true), 3);
  return soundChoice({
    sound,
    form: 'image',
    images: true,
    prompt: `Touche l'image où tu entends le son ${label(sound)}.`,
    speak: `Touche l'image où tu entends le son ${say(sound)}.`,
    words: rng.shuffle([right, ...others]),
    answer: right.word,
    explain: `Dans ${quote(right.word)}, on entend le son ${label(sound)}.`,
  });
}

/** Quatre mots écrits, un seul où l'on entend le son. */
function writtenQuestion(level, rng) {
  const sound = pickSound(level, rng);
  const right = rng.pick(bearers(level, sound));
  const others = rng.sample(intruders(level, [sound]), 3);
  return soundChoice({
    sound,
    form: 'mot',
    images: false,
    prompt: `Touche le mot où tu entends le son ${label(sound)}.`,
    speak: `Touche le mot où tu entends le son ${say(sound)}.`,
    words: rng.shuffle([right, ...others]),
    answer: right.word,
    explain: `Dans ${quote(right.word)}, on entend le son ${label(sound)}.`,
  });
}

/** Un mot à lire (et à écouter), trois sons proposés : lequel entend-on ? */
function whichSoundQuestion(level, rng) {
  const sound = pickSound(level, rng);
  const pool = bearers(level, sound).filter((w) => otherSounds(level, w).length >= 2);
  const entry = rng.pick(pool);
  const others = otherSounds(level, entry);
  const choices = rng.shuffle([sound, ...rng.sample(others, Math.min(3, others.length))])
    .map((s) => ({ value: s, text: label(s) }));
  return {
    key: `sons:${sound}:quel:${entry.word}`,
    type: 'choice',
    prompt: 'Lis le mot, puis touche le son que tu entends.',
    speak: 'Lis le mot, puis touche le son que tu entends.',
    display: { show: { text: entry.word, cursive: true, speak: entry.word }, choices },
    answer: sound,
    explain: `Dans ${quote(entry.word)}, on entend le son ${label(sound)}.`,
    skill: `son ${label(sound)}`,
  };
}

/** Trois mots avec le son, un sans : toucher celui qui n'a pas le son. */
function intruderQuestion(level, rng) {
  const sound = pickSound(level, rng);
  const pictures = bearers(level, sound, true);
  const images = pictures.length >= 4 && rng.chance();
  const family = rng.sample(images ? pictures : bearers(level, sound), 3);
  const odd = rng.pick(intruders(level, [sound], images));
  const what = images ? 'l\'image' : 'le mot';
  return soundChoice({
    sound,
    form: images ? 'intrus' : 'intrus-mot',
    images,
    prompt: `Touche ${what} où tu n'entends pas le son ${label(sound)}.`,
    speak: `Touche ${what} où tu n'entends pas le son ${say(sound)}.`,
    words: rng.shuffle([odd, ...family]),
    answer: odd.word,
    explain: `Dans ${quote(odd.word)}, on n'entend pas le son ${label(sound)}. `
      + `On l'entend dans ${listWords(family.map((w) => w.word))}.`,
  });
}

/** Les images d'un son, au niveau donné, qui ne contiennent pas l'autre son de la paire. */
function sortPool(level, sound, other) {
  const blocked = blockedSounds([other]);
  return bearers(level, sound, true).filter((w) => !w.sounds.some((s) => blocked.has(s)));
}

/** Les paires de sons d'un niveau qui ne s'entendent pas pareil et ont assez d'images. */
function pairsFor(level) {
  const sounds = LEVEL_SOUNDS[level];
  const pairs = [];
  for (let i = 0; i < sounds.length; i++) {
    for (let j = i + 1; j < sounds.length; j++) {
      const [a, b] = [sounds[i], sounds[j]];
      if (blockedSounds([a]).has(b)) continue;
      if (sortPool(level, a, b).length >= 2 && sortPool(level, b, a).length >= 2) pairs.push([a, b]);
    }
  }
  return pairs;
}

const PAIRS = { 1: pairsFor(1), 2: pairsFor(2), 3: pairsFor(3) };

/** Quatre images à ranger dans deux boîtes, une par son. */
function sortQuestion(level, rng) {
  const fresh = PAIRS[level].filter(([a, b]) => NEW_SOUNDS[level].includes(a) || NEW_SOUNDS[level].includes(b));
  const [a, b] = rng.pick(fresh.length && rng.chance(0.7) ? fresh : PAIRS[level]);
  const picked = { [a]: rng.sample(sortPool(level, a, b), 2), [b]: rng.sample(sortPool(level, b, a), 2) };
  const entries = rng.shuffle([a, a, b, b].map((s, i) => [s, picked[s][i % 2]]));
  const names = (s) => picked[s].map((w) => w.word).join(', ');
  return {
    key: `sons:${a}+${b}:tri:${entries.map(([, w]) => w.word).sort().join('-')}`,
    type: 'drag',
    prompt: 'Range chaque image dans la bonne boîte.',
    speak: `Range chaque image dans la bonne boîte : le son ${say(a)}, ou le son ${say(b)}.`,
    display: {
      items: entries.map(([, w], i) => ({ id: `i${i}`, emoji: w.emoji, label: w.word })),
      targets: [{ id: a, label: label(a) }, { id: b, label: label(b) }],
    },
    answer: Object.fromEntries(entries.map(([s], i) => [`i${i}`, s])),
    explain: `${label(a)} : ${names(a)}. ${label(b)} : ${names(b)}.`,
    skill: `sons ${label(a)} et ${label(b)}`,
  };
}

// --- Déroulé d'une partie ----------------------------------------------------------------------

const MAKERS = {
  image: pictureQuestion,
  mot: writtenQuestion,
  quel: whichSoundQuestion,
  intrus: intruderQuestion,
  tri: sortQuestion,
};

/** Dix questions, mélangées : chaque forme revient, les images restent majoritaires. */
const FORMS = {
  1: ['image', 'image', 'image', 'image', 'mot', 'mot', 'mot', 'quel', 'quel', 'tri'],
  2: ['image', 'image', 'image', 'mot', 'mot', 'mot', 'quel', 'quel', 'intrus', 'tri'],
  3: ['image', 'image', 'image', 'mot', 'mot', 'quel', 'quel', 'intrus', 'intrus', 'tri'],
};

// Le paquet d'une partie est tiré au premier appel et retrouvé grâce à `seen` (un Set propre
// à chaque partie) : les nouveaux essais pour éviter un doublon gardent la même forme.
const decks = new WeakMap();

function deckFor(level, rng, seen) {
  const saved = decks.get(seen);
  if (saved && saved.level === level) return saved.deck;
  const deck = rng.shuffle(FORMS[level]);
  decks.set(seen, { level, deck });
  return deck;
}

export default {
  id: 'sons',
  title: 'Les sons',
  island: 'mots',
  subject: 'français',
  issue: 22,
  skills: [
    'Discriminer les sons complexes de la langue',
    'Associer un son et les lettres qui l\'écrivent',
    'Trier des mots selon le son que l\'on entend',
  ],
  levels: [
    { label: 'Niveau 1', hint: '[ou], [on], [an], [oi], [ch]' },
    { label: 'Niveau 2', hint: '+ [in], [eu]' },
    { label: 'Niveau 3', hint: '+ [gn], [ill], [ail], [eil]' },
  ],
  makeQuestion(level, rng, seen) {
    if (!seen) return MAKERS[rng.pick(FORMS[level])](level, rng);
    const deck = deckFor(level, rng, seen);
    return MAKERS[deck[seen.size % deck.length]](level, rng);
  },
};
