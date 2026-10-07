// Les règles de vie (E13-T2, #80) — EMC, cycle 2 : politesse, respect, règles de la classe et de la maison,
// gérer un conflit, reconnaître une émotion, règle ou préférence, droits et devoirs simples.
//  Niveau 1 : la formule (ou la phrase) de politesse qui convient.
//  Niveau 2 : « Que fais-tu ? » en petites situations, et la raison d'une règle.
//  Niveau 3 : émotion d'un personnage et geste qui aide ; règle ou préférence ; droits et devoirs.
// Banque écrite à la main : js/data/regles-de-vie.js (une seule réponse acceptable, ton bienveillant).
// La clé d'une question ne dépend pas des mauvaises réponses tirées : un même item ne revient pas
// deux fois dans une partie, même avec d'autres choix.
import {
  SKILLS, LEVEL1, LEVEL2, EMOTIONS, STORIES, FACES, GESTURES, RULES, PREFERENCES, RIGHTS,
} from '../data/regles-de-vie.js';

const textChoices = (items) => items.map((text) => ({ value: text, text }));

/** Question à réponse texte : la bonne réponse parmi deux mauvaises tirées de la banque. */
function fromItem(rng, item) {
  const wrong = rng.sample(item.wrong, 2);
  return {
    key: `regles-de-vie:${item.id}`,
    type: 'choice',
    prompt: item.prompt,
    speak: item.prompt,
    display: { choices: rng.shuffle(textChoices([item.right, ...wrong])) },
    answer: item.right,
    explain: item.explain,
    skill: item.skill,
  };
}

const label = (emotion, fem) => (fem ? emotion.f : emotion.m);
const emotionChoice = (emotion, fem) => ({ value: emotion.id, emoji: emotion.emoji, text: label(emotion, fem) });

function story(rng) {
  const s = rng.pick(STORIES);
  const right = EMOTIONS.find((e) => e.id === s.feel);
  const wrong = rng.sample(EMOTIONS.filter((e) => e.id !== s.feel), 2);
  const prompt = `${s.story} Comment ${s.who} se sent-${s.fem ? 'elle' : 'il'} ?`;
  return {
    key: `regles-de-vie:histoire:${s.id}`,
    type: 'choice',
    prompt,
    speak: prompt,
    display: { choices: rng.shuffle([right, ...wrong].map((e) => emotionChoice(e, s.fem))) },
    answer: s.feel,
    explain: s.explain,
    skill: SKILLS.emotion,
  };
}

function face(rng) {
  const f = rng.pick(FACES);
  const right = EMOTIONS.find((e) => e.id === f.feel);
  const wrong = rng.sample(EMOTIONS.filter((e) => e.id !== f.feel), 2);
  const prompt = `${f.who} a ce visage. Comment se sent-${f.fem ? 'elle' : 'il'} ?`;
  return {
    key: `regles-de-vie:visage:${f.id}`,
    type: 'choice',
    prompt,
    speak: prompt,
    display: {
      show: { emoji: right.emoji },
      choices: rng.shuffle([right, ...wrong].map((e) => ({ value: e.id, text: label(e, f.fem) }))),
    },
    answer: f.feel,
    explain: `Ce visage montre : ${label(right, f.fem).toLowerCase()}. On le voit aux yeux et à la bouche.`,
    skill: SKILLS.emotion,
  };
}

const gesture = (rng) => fromItem(rng, { ...rng.pick(GESTURES), skill: SKILLS.aider });
const rights = (rng) => fromItem(rng, { ...rng.pick(RIGHTS), skill: SKILLS.droit });

/** Règle ou préférence : une règle vaut pour tout le monde, une préférence est ce qu'on aime. */
function ruleOrTaste(rng) {
  const wantRule = rng.chance(0.5);
  const good = rng.pick(wantRule ? RULES : PREFERENCES);
  const bad = rng.sample(wantRule ? PREFERENCES : RULES, 2);
  return {
    key: `regles-de-vie:${wantRule ? 'regle' : 'gout'}:${good}`,
    type: 'choice',
    prompt: wantRule
      ? 'Quelle phrase est une règle ? Une règle est la même pour tout le monde.'
      : 'Quelle phrase dit ce que j\'aime ? Chacun aime des choses différentes.',
    speak: wantRule ? 'Quelle phrase est une règle ?' : 'Quelle phrase dit ce que j\'aime ?',
    display: { choices: rng.shuffle(textChoices([good, ...bad])) },
    answer: good,
    explain: wantRule
      ? 'Une règle est la même pour tout le monde et aide à bien vivre ensemble. Ce qu\'on aime, c\'est pour chacun.'
      : 'Aimer une couleur ou un jeu, c\'est un goût : chacun a le sien. Une règle, elle, est pour tout le monde.',
    skill: SKILLS.regle,
  };
}

const FAMILIES = {
  1: [[1, (rng) => fromItem(rng, rng.pick(LEVEL1))]],
  2: [[1, (rng) => fromItem(rng, rng.pick(LEVEL2))]],
  3: [[4, story], [1.5, face], [3, gesture], [3, ruleOrTaste], [2, rights]],
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
  id: 'regles-de-vie',
  title: 'Les règles de vie',
  island: 'ailleurs',
  subject: 'emc',
  issue: 80,
  skills: [
    'Utiliser les formules de politesse',
    'Respecter les autres et les règles de la classe',
    'Comprendre pourquoi on a des règles',
    'Gérer un petit conflit : en parler, demander de l\'aide',
    'Reconnaître une émotion',
    'Distinguer une règle d\'une préférence ; droits et devoirs simples',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'Merci, pardon, bonjour…' },
    { label: 'Niveau 2', hint: 'Que fais-tu ? Pourquoi des règles ?' },
    { label: 'Niveau 3', hint: 'Émotions, règles et droits' },
  ],
  makeQuestion(level, rng, seen) {
    let q = pickFamily(level, rng)(rng);
    for (let i = 0; i < 20 && seen && seen.has(q.key); i++) q = pickFamily(level, rng)(rng);
    return q;
  },
};
