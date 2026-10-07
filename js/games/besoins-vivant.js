// Besoins des animaux et des plantes (E11-T1, #68) — « Questionner le monde : le vivant ».
//  Niveau 1 : vivant ou pas vivant (images) ; ce dont a besoin une plante (eau, lumière) ou un animal.
//  Niveau 2 : petites expériences sur les plantes ; ce que mange un animal ; abri et milieu de vie ; ranger.
//  Niveau 3 : trouver ce qui manque dans une situation ; phrases vraies ; besoin commun ; ranger.
// Contenu prudent (voir js/data/besoins-vivant.js) : pour une plante on reste à « eau et lumière », et
// aucun cas limite (graine non semée, feu, nuage, champignon, fruit cueilli…) n'est posé.
import {
  LIVING, OBJECTS, SILLY, PLANT_NEEDS, ANIMAL_NEEDS, PLANT_EXPERIMENTS, DIETS, GRASS_EATERS, NON_GRASS,
  GRASS_EATER_EMOJI, HABITATS, DEDUCTIONS, NEED_NOUN, SILLY_NOUN, TRUE_STATEMENTS, FALSE_STATEMENTS,
  COMMON_ANIMALS, COMMON_PLANTS, NOT_COMMON,
} from '../data/besoins-vivant.js';

const SKILL = {
  alive: 'vivant ou pas vivant',
  plant: 'besoins d\'une plante',
  animal: 'besoins d\'un animal',
  deduce: 'trouver le besoin qui manque',
};

const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const name = (t) => `${t.det} ${t.word}`;
const pronoun = (t) => (t.det === 'une' ? 'Elle' : 'Il');
const sortedKey = (list) => [...list].sort().join('+');
/** « une voiture et un vélo » / « un chat, une voiture et un arbre » */
const enumerate = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`);

const textChoices = (items) => items.map((text) => ({ value: text, text }));

// --- Vivant ou pas vivant ----------------------------------------------------------------------

function whyAlive(t) {
  if (t.kind === 'animal') return `${cap(name(t))} est un animal : c'est un être vivant. ${pronoun(t)} naît, grandit et a besoin de manger et de boire.`;
  return `${cap(name(t))} est une plante : c'est un être vivant. ${pronoun(t)} naît, grandit et a besoin d'eau et de lumière.`;
}

const whyObject = (o) => `${cap(name(o))} est un objet : ${pronoun(o).toLowerCase()} ne naît pas et ne grandit pas. Ce n'est pas un être vivant.`;

function aliveOrNot(rng) {
  const thing = rng.pick([...LIVING, ...OBJECTS]);
  const alive = LIVING.includes(thing);
  return {
    key: `besoins-vivant:vivant:${thing.word}`,
    type: 'choice',
    prompt: 'Vivant ou pas vivant ?',
    speak: `${cap(name(thing))}, vivant ou pas vivant ?`,
    display: {
      show: { emoji: thing.emoji, text: name(thing) },
      choices: [{ value: 'vivant', text: 'Vivant' }, { value: 'non', text: 'Pas vivant' }],
    },
    answer: alive ? 'vivant' : 'non',
    explain: alive ? whyAlive(thing) : whyObject(thing),
    skill: SKILL.alive,
  };
}

const picture = (t) => ({ value: t.word, emoji: t.emoji, label: t.word });

function pickAlive(rng) {
  const wantAlive = rng.chance(0.5);
  const right = rng.pick(wantAlive ? LIVING : OBJECTS);
  const wrong = rng.sample(wantAlive ? OBJECTS : LIVING, 2);
  const choices = rng.shuffle([right, ...wrong]).map(picture);
  const others = enumerate(wrong.map((t) => `${t.det} ${t.word}`));
  return {
    key: `besoins-vivant:image:${wantAlive ? 'vivant' : 'non'}:${right.word}:${sortedKey(wrong.map((t) => t.word))}`,
    type: 'choice',
    prompt: wantAlive ? 'Touche ce qui est vivant.' : 'Touche ce qui n\'est pas vivant.',
    speak: wantAlive ? 'Touche ce qui est vivant.' : 'Touche ce qui n\'est pas vivant.',
    display: { choices },
    answer: right.word,
    explain: wantAlive
      ? `${cap(name(right))} est un être vivant : ${pronoun(right).toLowerCase()} naît et grandit. ${cap(others)} ${wrong.length > 1 ? 'sont des objets' : 'est un objet'}.`
      : `${cap(name(right))} est un objet : ${pronoun(right).toLowerCase()} ne naît pas et ne grandit pas. ${cap(others)} ${wrong.length > 1 ? 'sont des êtres vivants' : 'est un être vivant'}.`,
    skill: SKILL.alive,
  };
}

// --- Besoins d'une plante / d'un animal, en images (niveau 1) -----------------------------------

function needsPicture(rng, who) {
  const needs = who === 'plante' ? PLANT_NEEDS : ANIMAL_NEEDS;
  const right = rng.pick(needs);
  const wrong = rng.sample(SILLY, 2);
  const choices = rng.shuffle([right, ...wrong]);
  const prompt = who === 'plante'
    ? 'De quoi une plante a-t-elle besoin pour vivre ? Touche la bonne image.'
    : 'De quoi un animal a-t-il besoin pour vivre ? Touche la bonne image.';
  return {
    key: `besoins-vivant:besoin-${who}:${right.value}:${sortedKey(wrong.map((w) => w.value))}`,
    type: 'choice',
    prompt,
    speak: prompt,
    display: { choices },
    answer: right.value,
    explain: who === 'plante'
      ? 'Une plante a besoin d\'eau et de lumière pour vivre.'
      : 'Un animal a besoin de manger et de boire pour vivre.',
    skill: who === 'plante' ? SKILL.plant : SKILL.animal,
  };
}

// --- Expériences sur les plantes (niveau 2) ------------------------------------------------------

function experiment(rng) {
  const e = rng.pick(PLANT_EXPERIMENTS);
  return {
    key: `besoins-vivant:experience:${e.id}`,
    type: 'choice',
    prompt: e.prompt,
    speak: e.prompt,
    display: { choices: rng.shuffle(textChoices([e.right, ...e.wrong])) },
    answer: e.right,
    explain: e.explain,
    skill: e.skill,
  };
}

// --- Que mange un animal ? / qui mange de l'herbe ? -----------------------------------------------

function diet(rng) {
  const d = rng.pick(DIETS);
  const right = rng.pick(d.eats);
  const wrong = rng.sample(d.not, 2);
  const prompt = `Que mange ${d.def} ?`;
  return {
    key: `besoins-vivant:regime:${d.word}:${right}:${sortedKey(wrong)}`,
    type: 'choice',
    prompt,
    speak: prompt,
    display: { show: { emoji: d.emoji, text: d.word }, choices: rng.shuffle(textChoices([right, ...wrong])) },
    answer: right,
    explain: `${cap(d.def)} mange ${enumerate(d.eats)}. Tout animal a besoin de manger.`,
    skill: SKILL.animal,
  };
}

function grassOrMeat(rng) {
  const grass = rng.chance(0.5);
  const rightWord = grass ? rng.pick(GRASS_EATERS) : 'lion';
  const wrongs = grass
    ? rng.sample(NON_GRASS, 2)
    : rng.sample(GRASS_EATERS, 2).map((w) => ({ word: w, emoji: GRASS_EATER_EMOJI[w] }));
  const right = { word: rightWord, emoji: grass ? GRASS_EATER_EMOJI[rightWord] : '🦁' };
  const prompt = grass ? 'Quel animal mange de l\'herbe ?' : 'Quel animal mange de la viande ?';
  return {
    key: `besoins-vivant:${grass ? 'herbe' : 'viande'}:${right.word}:${sortedKey(wrongs.map((w) => w.word))}`,
    type: 'choice',
    prompt: `${prompt} Touche la bonne image.`,
    speak: `${prompt} Touche la bonne image.`,
    display: { choices: rng.shuffle([right, ...wrongs]).map(picture) },
    answer: right.word,
    explain: grass
      ? `${cap(DIETS.find((d) => d.word === right.word).def)} mange de l'herbe.`
      : 'Le lion mange de la viande.',
    skill: SKILL.animal,
  };
}

// --- Abri et milieu de vie ------------------------------------------------------------------------

function habitat(rng) {
  const h = rng.pick(HABITATS);
  const wrong = rng.sample(h.wrong, 2);
  return {
    key: `besoins-vivant:abri:${h.word}:${sortedKey(wrong)}`,
    type: 'choice',
    prompt: h.ask,
    speak: h.ask,
    display: { show: { emoji: h.emoji }, choices: rng.shuffle(textChoices([h.right, ...wrong])) },
    answer: h.right,
    explain: h.explain,
    skill: SKILL.animal,
  };
}

// --- Ranger : vivant / pas vivant ------------------------------------------------------------------

function sortThings(rng, count) {
  const nAlive = rng.int(1, count - 1);
  const alive = rng.sample(LIVING, nAlive);
  const objects = rng.sample(OBJECTS, count - nAlive);
  const things = rng.shuffle([...alive.map((t) => ({ t, box: 'vivant' })), ...objects.map((t) => ({ t, box: 'non' }))]);
  const living = alive.map((t) => `${t.det} ${t.word}`);
  const inert = objects.map((t) => `${t.det} ${t.word}`);
  return {
    key: `besoins-vivant:ranger:${sortedKey(things.map(({ t }) => t.word))}`,
    type: 'drag',
    prompt: 'Range chaque image dans sa boîte : vivant ou pas vivant.',
    display: {
      items: things.map(({ t }, i) => ({ id: `i${i}`, emoji: t.emoji, label: t.word })),
      targets: [{ id: 'vivant', label: 'Vivant' }, { id: 'non', label: 'Pas vivant' }],
    },
    answer: Object.fromEntries(things.map(({ box }, i) => [`i${i}`, box])),
    explain: `Vivant : ${enumerate(living)}. Pas vivant : ${enumerate(inert)}. Les êtres vivants naissent et grandissent ; les objets, non.`,
    skill: SKILL.alive,
  };
}

// --- Trouver ce qui manque ---------------------------------------------------------------------------

function deduce(rng) {
  const d = rng.pick(DEDUCTIONS);
  const plant = d.who === 'plante';
  const pool = plant ? ['eau', 'lumiere'] : ['eau', 'nourriture', 'abri', 'air'];
  const others = pool.filter((n) => n !== d.lack).map((n) => NEED_NOUN[n]);
  const wrong = plant
    ? [...rng.sample(others, 1), ...rng.sample(SILLY_NOUN, 1)]
    : rng.sample(others, 2);
  const prompt = `${d.text} ${plant ? 'De quoi cette plante manque-t-elle ?' : 'De quoi cet animal manque-t-il ?'}`;
  return {
    key: `besoins-vivant:manque:${d.id}:${sortedKey(wrong)}`,
    type: 'choice',
    prompt,
    speak: prompt,
    display: { show: { emoji: d.emoji }, choices: rng.shuffle(textChoices([NEED_NOUN[d.lack], ...wrong])) },
    answer: NEED_NOUN[d.lack],
    explain: d.explain,
    skill: SKILL.deduce,
  };
}

// --- Phrases vraies ---------------------------------------------------------------------------------

function statements(rng) {
  const wantTrue = rng.chance(0.6);
  if (wantTrue) {
    const right = rng.pick(TRUE_STATEMENTS);
    const wrong = rng.sample(FALSE_STATEMENTS, 2);
    return {
      key: `besoins-vivant:phrase:vraie:${right.text}:${sortedKey(wrong.map((w) => w.text))}`,
      type: 'choice',
      prompt: 'Quelle phrase est vraie ?',
      speak: 'Quelle phrase est vraie ?',
      display: { choices: rng.shuffle(textChoices([right.text, ...wrong.map((w) => w.text)])) },
      answer: right.text,
      explain: `${right.text} ${wrong.map((w) => `${w.fix}`).join(' ')}`,
      skill: right.skill,
    };
  }
  const off = rng.pick(FALSE_STATEMENTS);
  const goods = rng.sample(TRUE_STATEMENTS, 2);
  return {
    key: `besoins-vivant:phrase:pas-vraie:${off.text}:${sortedKey(goods.map((g) => g.text))}`,
    type: 'choice',
    prompt: 'Quelle phrase n\'est pas vraie ?',
    speak: 'Quelle phrase n\'est pas vraie ?',
    display: { choices: rng.shuffle(textChoices([off.text, ...goods.map((g) => g.text)])) },
    answer: off.text,
    explain: `Ce n'est pas vrai. ${off.fix}`,
    skill: off.skill,
  };
}

// --- Besoin commun à un animal et à une plante ------------------------------------------------------

function common(rng) {
  const a = rng.pick(COMMON_ANIMALS);
  const p = rng.pick(COMMON_PLANTS);
  const wrong = rng.sample(NOT_COMMON, 2);
  const prompt = `${cap(a.def)} et ${p.def} ont tous les deux besoin… De quoi ?`;
  const right = 'd\'eau';
  return {
    key: `besoins-vivant:commun:${a.word}:${p.word}:${sortedKey(wrong)}`,
    type: 'choice',
    prompt,
    speak: prompt,
    display: { show: { emoji: `${a.emoji} ${p.emoji}` }, choices: rng.shuffle(textChoices([right, ...wrong])) },
    answer: right,
    explain: 'Les animaux et les plantes ont tous besoin d\'eau pour vivre.',
    skill: SKILL.deduce,
  };
}

// --- Déroulé d'une partie ------------------------------------------------------------------------------

/** Familles de questions de chaque niveau, avec leur poids. */
const FAMILIES = {
  1: [
    [3, aliveOrNot],
    [2, pickAlive],
    [2, (rng) => needsPicture(rng, 'plante')],
    [1.5, (rng) => needsPicture(rng, 'animal')],
  ],
  2: [
    [3, experiment],
    [3, diet],
    [1.5, grassOrMeat],
    [2.5, habitat],
    [1.5, (rng) => sortThings(rng, 3)],
  ],
  3: [
    [4, deduce],
    [3, statements],
    [1.5, common],
    [1.5, (rng) => sortThings(rng, 4)],
  ],
};

function pickFamily(level, rng) {
  const list = FAMILIES[level];
  const total = list.reduce((sum, [w]) => sum + w, 0);
  let roll = rng.next() * total;
  for (const [weight, make] of list) {
    roll -= weight;
    if (roll < 0) return make;
  }
  return list[list.length - 1][1];
}

export default {
  id: 'besoins-vivant',
  title: 'Besoins du vivant',
  island: 'monde',
  subject: 'monde',
  issue: 68,
  skills: [
    'Distinguer le vivant du non vivant',
    'Identifier les besoins des plantes (eau, lumière)',
    'Identifier les besoins des animaux (manger, boire, respirer, s\'abriter)',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'Vivant ou pas ? Eau et lumière' },
    { label: 'Niveau 2', hint: 'Expériences, repas et abris' },
    { label: 'Niveau 3', hint: 'Que manque-t-il ?' },
  ],
  makeQuestion(level, rng, seen) {
    let q = pickFamily(level, rng)(rng);
    for (let i = 0; i < 12 && seen && seen.has(q.key); i++) q = pickFamily(level, rng)(rng);
    return q;
  },
};
