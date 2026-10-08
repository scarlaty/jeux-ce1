// Les états de l'eau (E11-T5, #72) — « Questionner le monde : la matière ».
//  Niveau 1 : solide, liquide ou gaz ? (glaçon, pluie, vapeur d'eau invisible) ; classer.
//  Niveau 2 : que se passe-t-il ? glaçon au soleil, eau au congélateur, flaque qui sèche ; nommer le
//             changement (la glace fond, l'eau gèle, l'eau s'évapore).
//  Niveau 3 : petites expériences et déductions (pourquoi le linge sèche, la quantité d'eau se conserve,
//             chaud ou froid nécessaire) ; vocabulaire fusion / solidification / évaporation.
// Exactitude : la vapeur d'eau est invisible, aucun gaz n'est montré par un émoji (voir js/data/etats-eau.js).
import {
  NAMES, STATES, THINGS, PICTURES, STATEMENTS_1, STATEMENTS_3, SCENE_CHOICES, OUTCOMES, DRYING, DRYING_RIGHT,
  DRYING_WRONG_WORD, DRYING_WRONG_PLAIN, CHANGES, CHANGE_CHOICES, CHANGE_EXPLAIN, EXPERIMENTS, VOCAB, VOCAB_CHOICES, VOCAB_EXPLAIN,
  SORT_ITEMS,
} from '../data/etats-eau.js';

const SKILL = {
  states: 'états de l\'eau',
  melt: 'la glace fond',
  freeze: 'l\'eau gèle',
  evap: 'l\'eau s\'évapore',
  vapor: 'la vapeur d\'eau',
  vocab: 'fusion et solidification',
};

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const sortedKey = (list) => [...list].sort().join('+');
const textChoices = (items) => items.map((text) => ({ value: text, text }));
const who = (rng) => rng.pick(NAMES);
const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => vars[k]);

const STATE_WHY = {
  solide: 'c\'est de l\'eau solide : elle garde sa forme.',
  liquide: 'c\'est de l\'eau liquide : elle coule.',
  gaz: 'c\'est un gaz : la vapeur d\'eau est invisible, on ne la voit pas.',
};

// --- Niveau 1 ---------------------------------------------------------------------------------------

function thingState(rng) {
  const t = rng.pick(THINGS);
  const prompt = 'Solide, liquide ou gaz ?';
  return {
    key: `etats-eau:etat:${t.id}`,
    type: 'choice',
    prompt,
    speak: `${cap(t.text)}, solide, liquide ou gaz ?`,
    display: { show: { ...(t.emoji ? { emoji: t.emoji } : {}), text: cap(t.text) }, choices: STATES.map((s) => ({ ...s })), row: true },
    answer: t.state,
    explain: `${cap(t.text)}, ${STATE_WHY[t.state]}`,
    skill: SKILL.states,
  };
}

function pickByState(rng) {
  const want = rng.pick(['solide', 'liquide']);
  const other = want === 'solide' ? 'liquide' : 'solide';
  const right = rng.pick(PICTURES[want]);
  const wrong = rng.sample(PICTURES[other], 2);
  const prompt = `Touche ce qui est ${want}.`;
  return {
    key: `etats-eau:image:${want}:${right.value}:${sortedKey(wrong.map((w) => w.value))}`,
    type: 'choice',
    prompt,
    speak: prompt,
    display: { choices: rng.shuffle([right, ...wrong]) },
    answer: right.value,
    explain: want === 'solide'
      ? `La glace et la neige sont de l'eau solide. ${cap(wrong.map((w) => w.label).join(' et '))} : de l'eau liquide, qui coule.`
      : `La goutte, la pluie et la mer sont de l'eau liquide : elle coule. ${cap(wrong.map((w) => w.label).join(' et '))} : de l'eau solide.`,
    skill: SKILL.states,
  };
}

function statements(rng, bank, prompts = { yes: 'Quelle phrase est vraie ?', no: 'Quelle phrase n\'est pas vraie ?' }, tag = 'phrase') {
  if (rng.chance(0.55)) {
    const right = rng.pick(bank.true);
    const wrong = rng.sample(bank.false, 2);
    return {
      key: `etats-eau:${tag}:vraie:${right.text}:${sortedKey(wrong.map((w) => w.text))}`,
      type: 'choice',
      prompt: prompts.yes,
      speak: prompts.yes,
      display: { choices: rng.shuffle(textChoices([right.text, ...wrong.map((w) => w.text)])) },
      answer: right.text,
      explain: `${right.text} ${(wrong.find((w) => w.fix !== right.text) || wrong[0]).fix}`,
      skill: right.skill,
    };
  }
  const off = rng.pick(bank.false);
  const goods = rng.sample(bank.true, 2);
  return {
    key: `etats-eau:${tag}:fausse:${off.text}:${sortedKey(goods.map((g) => g.text))}`,
    type: 'choice',
    prompt: prompts.no,
    speak: prompts.no,
    display: { choices: rng.shuffle(textChoices([off.text, ...goods.map((g) => g.text)])) },
    answer: off.text,
    explain: `Ce n'est pas vrai. ${off.fix}`,
    skill: off.skill,
  };
}

function sortPictures(rng) {
  const n = rng.int(1, 3);
  const solids = rng.sample(PICTURES.solide, n);
  const liquids = rng.sample(PICTURES.liquide, 4 - n);
  const things = rng.shuffle([...solids.map((p) => ({ p, box: 'solide' })), ...liquids.map((p) => ({ p, box: 'liquide' }))]);
  const list = (ps) => ps.map((p) => p.label).join(', ');
  return {
    key: `etats-eau:ranger2:${sortedKey(things.map(({ p }) => p.value))}`,
    type: 'drag',
    prompt: 'Range chaque image dans sa boîte : eau solide ou eau liquide.',
    display: {
      items: things.map(({ p }, i) => ({ id: `i${i}`, emoji: p.emoji, label: p.label })),
      targets: [{ id: 'solide', label: 'Solide' }, { id: 'liquide', label: 'Liquide' }],
    },
    answer: Object.fromEntries(things.map(({ box }, i) => [`i${i}`, box])),
    explain: `Solide : ${list(solids)}. Liquide : ${list(liquids)}. L'eau solide garde sa forme ; l'eau liquide coule.`,
    skill: SKILL.states,
  };
}

// --- Niveau 2 ---------------------------------------------------------------------------------------

function outcome(rng) {
  let roll = rng.next() * OUTCOMES.reduce((sum, x) => sum + x.weight, 0);
  const o = OUTCOMES.find((x) => (roll -= x.weight) < 0) || OUTCOMES[0];
  const obj = rng.pick(o.objects);
  const place = rng.pick(o.places);
  const prompt = `${who(rng)} laisse ${obj} ${place}. Que se passe-t-il ?`;
  return {
    key: `etats-eau:scene:${o.id}:${obj}:${place}`,
    type: 'choice',
    prompt,
    speak: prompt,
    display: { choices: rng.shuffle(textChoices(SCENE_CHOICES)) },
    answer: o.out,
    explain: o.explain,
    skill: o.skill,
  };
}

function drying(rng) {
  const d = rng.pick(DRYING);
  const prompt = `${fill(d.text, { who: who(rng) })} Où est passée l'eau ?`;
  const right = rng.pick(DRYING_RIGHT);
  const first = rng.pick(DRYING_WRONG_WORD);
  const rest = [...DRYING_WRONG_WORD.filter((w) => w !== first), ...DRYING_WRONG_PLAIN, d.soak];
  const wrong = [first, rng.pick(rest)];
  return {
    key: `etats-eau:seche:${d.id}`,
    type: 'choice',
    prompt,
    speak: prompt,
    display: { choices: rng.shuffle(textChoices([right, ...wrong])) },
    answer: right,
    explain: 'L\'eau s\'est évaporée : elle est devenue de la vapeur d\'eau, un gaz que l\'on ne voit pas. Elle n\'a pas disparu.',
    skill: SKILL.evap,
  };
}

function nameChange(rng) {
  const c = rng.pick(CHANGES);
  const prompt = `${c.what} Quel est ce changement ?`;
  return {
    key: `etats-eau:nom:${c.id}`,
    type: 'choice',
    prompt,
    speak: prompt,
    display: { choices: CHANGE_CHOICES.map((x) => ({ ...x })) },
    answer: c.change,
    explain: CHANGE_EXPLAIN[c.change],
    skill: c.change === 'fond' ? SKILL.melt : c.change === 'gele' ? SKILL.freeze : SKILL.evap,
  };
}

// --- Niveau 3 ---------------------------------------------------------------------------------------

function experiment(rng) {
  const e = rng.pick(EXPERIMENTS);
  const letters = e.swap && rng.chance(0.5) ? { A: 'B', B: 'A' } : { A: 'A', B: 'B' };
  const vars = { who: who(rng), ...letters };
  const right = fill(e.right, vars);
  const wrong = e.wrong.map((w) => fill(w, vars));
  const prompt = fill(e.prompt, vars);
  return {
    key: `etats-eau:experience:${e.id}${e.swap ? `:${letters.A}` : ''}`,
    type: 'choice',
    prompt,
    speak: prompt,
    display: { choices: rng.shuffle(textChoices([right, ...wrong])) },
    answer: right,
    explain: fill(e.explain, vars),
    skill: e.skill,
  };
}

function vocabulary(rng) {
  const v = rng.pick(VOCAB);
  const prompt = `${v.what} Comment s'appelle ce changement ?`;
  return {
    key: `etats-eau:vocabulaire:${v.id}`,
    type: 'choice',
    prompt,
    speak: prompt,
    display: { choices: VOCAB_CHOICES.map((x) => ({ ...x })) },
    answer: v.word,
    explain: VOCAB_EXPLAIN[v.word],
    skill: SKILL.vocab,
  };
}

function sortStates(rng) {
  const byState = (s) => SORT_ITEMS.filter((t) => t.state === s);
  const gas = rng.sample(byState('gaz'), rng.int(1, 2));
  const solid = rng.sample(byState('solide'), rng.int(1, 2));
  const liquid = rng.sample(byState('liquide'), 5 - gas.length - solid.length);
  const things = rng.shuffle([
    ...gas.map((t) => ({ t, box: 'gaz' })), ...solid.map((t) => ({ t, box: 'solide' })), ...liquid.map((t) => ({ t, box: 'liquide' })),
  ]);
  const list = (ts) => ts.map((t) => t.text).join(', ');
  return {
    key: `etats-eau:ranger3:${sortedKey(things.map(({ t }) => t.id))}`,
    type: 'drag',
    prompt: 'Range chaque chose dans sa boîte : solide, liquide ou gaz.',
    display: {
      items: things.map(({ t }, i) => ({ id: `i${i}`, text: t.text.replace(/^(un |une |le |la |l')/, ''), ...(t.emoji ? { emoji: t.emoji } : {}) })),
      targets: [{ id: 'solide', label: 'Solide' }, { id: 'liquide', label: 'Liquide' }, { id: 'gaz', label: 'Gaz' }],
    },
    answer: Object.fromEntries(things.map(({ box }, i) => [`i${i}`, box])),
    explain: `Solide : ${list(solid)}. Liquide : ${list(liquid)}. Gaz : ${list(gas)}, que l'on ne voit pas.`,
    skill: SKILL.states,
  };
}

// --- Déroulé ----------------------------------------------------------------------------------------

const FAMILIES = {
  1: [[4, thingState], [3, pickByState], [2, (rng) => statements(rng, STATEMENTS_1)], [2, sortPictures]],
  2: [[4, outcome], [3, drying], [3, nameChange]],
  3: [
    [4.5, experiment], [3, vocabulary],
    [2.5, (rng) => statements(rng, STATEMENTS_3, undefined, 'phrase3')], [1.5, sortStates],
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
  id: 'etats-eau',
  title: 'Les états de l\'eau',
  island: 'monde',
  subject: 'monde',
  issue: 72,
  skills: [
    'Reconnaître les états de l\'eau : solide, liquide, gaz',
    'Connaître la fusion, la solidification et l\'évaporation',
    'Savoir que la quantité d\'eau se conserve',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'Solide, liquide ou gaz ?' },
    { label: 'Niveau 2', hint: 'Fond, gèle, s\'évapore' },
    { label: 'Niveau 3', hint: 'Expériences et vocabulaire' },
  ],
  makeQuestion(level, rng, seen) {
    let q = pickFamily(level, rng)(rng);
    for (let i = 0; i < 12 && seen && seen.has(q.key); i++) q = pickFamily(level, rng)(rng);
    return q;
  },
};
