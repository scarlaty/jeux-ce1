import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/body-animals.js';
import { checkGameShape, checkGenerator, EMOJIS_ECARTES } from '../helpers/game-checks.js';
import { toChoice } from '../../js/core/validate.js';

const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const all = () => Object.entries(byLevel).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));

// Vocabulaire attendu, écrit ici indépendamment de la banque : mot → [émoji, français, pluriel anglais].
const WORDS = {
  cat: ['🐱', 'chat', 'cats'], dog: ['🐶', 'chien', 'dogs'], bird: ['🐦', 'oiseau', 'birds'], fish: ['🐟', 'poisson', 'fish'],
  horse: ['🐴', 'cheval', 'horses'], cow: ['🐮', 'vache', 'cows'], pig: ['🐷', 'cochon', 'pigs'], rabbit: ['🐰', 'lapin', 'rabbits'],
  duck: ['🦆', 'canard', 'ducks'], lion: ['🦁', 'lion', 'lions'], elephant: ['🐘', 'éléphant', 'elephants'],
  monkey: ['🐵', 'singe', 'monkeys'], sheep: ['🐑', 'mouton', 'sheep'], mouse: ['🐭', 'souris', 'mice'],
  frog: ['🐸', 'grenouille', 'frogs'], bear: ['🐻', 'ours', 'bears'], giraffe: ['🦒', 'girafe', 'giraffes'],
  snake: ['🐍', 'serpent', 'snakes'],
  ear: ['👂', 'oreille', 'ears'], eye: ['👁️', 'œil', 'eyes'], nose: ['👃', 'nez', 'noses'], mouth: ['👄', 'bouche', 'mouths'],
  hand: ['✋', 'main', 'hands'], foot: ['🦶', 'pied', 'feet'], tooth: ['🦷', 'dent', 'teeth'],
};
const PARTS = ['ear', 'eye', 'nose', 'mouth', 'hand', 'foot', 'tooth'];
const ANIMALS = Object.keys(WORDS).filter((w) => !PARTS.includes(w));
const FIRST_ANIMALS = ['cat', 'dog', 'bird', 'fish', 'horse', 'cow', 'pig', 'rabbit', 'duck', 'lion', 'elephant', 'monkey'];
const TRANSPARENT = ['lion', 'elephant', 'giraffe'];
const EMOJI_TO_WORD = Object.fromEntries(Object.entries(WORDS).map(([w, [e]]) => [e, w]));

const form = (q) => q.key.split(':')[1];
const choices = (q) => q.display.choices.map(toChoice);
/** Décode une image de choix : « 🦶🦶 » → { word: 'foot', n: 2 } ; « 🐱🐟 » → deux animaux. */
function decode(emoji) {
  const unit = [...emoji.matchAll(/\p{Extended_Pictographic}️?|✋/gu)].map((m) => m[0]);
  return unit.map((e) => EMOJI_TO_WORD[e]);
}

test('le jeu respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.id, 'body-animals');
  assert.equal(game.title, 'Body and animals');
  assert.equal(game.island, 'ailleurs');
  assert.equal(game.subject, 'anglais');
  assert.equal(game.issue, 77);
  for (const l of game.levels) assert.ok(l.hint);
});

test('au moins 35 questions distinctes par niveau', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    const distinct = new Set(qs.map((q) => q.key)).size;
    assert.ok(distinct >= 35, `niveau ${level} : ${distinct}`);
  }
});

test('consigne en français, explication bienveillante, notion renseignée', () => {
  for (const [, q] of all()) {
    assert.match(q.prompt, /^(Écoute|Lis|Regarde|Touche)/, q.prompt);
    assert.ok(q.explain && q.explain.length > 8, q.key);
    assert.ok(q.skill, q.key);
    assert.doesNotMatch(q.explain, /\b(faux|raté|erreur|mauvais)\b/i, q.key);
    // Mixité : aucun accord genré adressé à l'enfant.
    assert.doesNotMatch(`${q.prompt} ${q.explain}`, /\b(prêt|content|contente|sûr|sûre)\b/i, q.key);
  }
});

test('questions à écouter : voix anglaise, le texte écrit est exactement ce qui est dit (#92)', () => {
  let listened = 0;
  for (const [, q] of all()) {
    assert.ok(q.display.show?.text || q.display.show?.emoji, q.key);
    if (!q.speak) continue;
    listened += 1;
    assert.equal(q.lang, 'en-GB', q.key);
    assert.match(q.speak, /^[a-zA-Z .']+$/, q.key);
    assert.ok(q.listenLabel, q.key);
    assert.equal(q.display.show.text, q.speak, q.key);
    assert.equal(q.display.show.lang, 'en-GB', q.key);
  }
  assert.ok(listened > 1000);
});

test('banque : émojis non écartés, uniques, pas de lien confus', () => {
  const bare = (e) => e.replace(/️/g, '');
  const ecartes = EMOJIS_ECARTES.map(bare);
  const emojis = Object.values(WORDS).map(([e]) => e);
  assert.equal(new Set(emojis).size, emojis.length);
  for (const e of emojis) assert.ok(!ecartes.includes(bare(e)), `émoji écarté : ${e}`);
  for (const bad of ['🐀', '🐇', '🐔', '🦵', '👅', '👀']) for (const [, q] of all()) {
    assert.ok(!JSON.stringify(q.display).includes(bad), `${q.key} : ${bad}`);
  }
});

/** Ce que l'enfant doit toucher, calculé ici sans le générateur : { words, n } pour l'énoncé entendu/lu. */
function expected(q) {
  const f = form(q);
  const text = q.display.show.text;
  if (['ecoute', 'lu'].includes(f)) return { words: [text], n: 1 };
  if (f === 'phrase') return { words: [text.match(/^It's an? (\w+)\.$/)[1]], n: 1 };
  if (f === 'touche') return { words: [text.match(/^Touch your (\w+)\.$/)[1]], n: 1 };
  if (f === 'deux-animaux') {
    const m = text.match(/^I've got an? (\w+) and an? (\w+)\.$/);
    return { words: [m[1], m[2]], n: 1 };
  }
  // pluriels : on retrouve le mot et le nombre depuis le texte entendu.
  const t = text.replace(/^I've got /, '').replace(/\.$/, '');
  const num = t.match(/^(one|two|an?) /);
  const rest = t.replace(/^(one|two|an?) /, '');
  const word = Object.keys(WORDS).find((w) => w === rest || WORDS[w][2] === rest);
  const n = num ? (num[1] === 'two' ? 2 : 1) : (rest === word ? 1 : 2);
  return { words: [word], n, ambiguous: WORDS[word][2] === word && !num };
}

test('une seule image correspond à ce qui est dit, et c\'est la bonne', () => {
  let multi = 0;
  for (const [, q] of all()) {
    if (form(q) === 'mot-image') continue;
    const exp = expected(q);
    assert.ok(!exp.ambiguous, `${q.key} : mot entendu sans nombre mais pluriel identique`);
    const target = exp.words.length === 2
      ? `${exp.words[0]}+${exp.words[1]}`
      : (form(q) === 'pluriel' || form(q) === 'pluriel-nombre' || form(q) === 'j-ai' ? `${exp.words[0]}-${exp.n}` : exp.words[0]);
    const matching = choices(q).filter((c) => {
      const pic = decode(c.emoji);
      if (exp.words.length === 2) return pic.length === 2 && pic[0] === exp.words[0] && pic[1] === exp.words[1];
      if (['pluriel', 'pluriel-nombre', 'j-ai'].includes(form(q))) return new Set(pic).size === 1 && pic[0] === exp.words[0] && pic.length === exp.n;
      return pic.length === 1 && pic[0] === exp.words[0];
    });
    if (matching.length !== 1) multi += 1;
    assert.equal(matching.length, 1, `${q.key} : ${matching.length} images correspondent`);
    assert.equal(q.answer, target, q.key);
    assert.equal(matching[0].value, q.answer, q.key);
    assert.equal(choices(q).length, 4, q.key);
  }
  assert.equal(multi, 0);
});

test('image → mot : un seul mot juste, jamais deux mots confondables', () => {
  const qs = all().filter(([, q]) => form(q) === 'mot-image');
  assert.ok(qs.length > 150);
  for (const [, q] of qs) {
    const word = EMOJI_TO_WORD[q.display.show.emoji];
    assert.equal(q.answer, word, q.key);
    const texts = choices(q).map((c) => c.text);
    assert.equal(new Set(texts).size, 4, q.key);
    assert.ok(texts.includes(word), q.key);
    // Mots du même genre que l'image (animaux ou corps), pour qu'on ne trie pas par catégorie.
    const kinds = new Set(texts.map((t) => PARTS.includes(t)));
    assert.equal(kinds.size, 1, q.key);
  }
});

test('oiseau et canard ne sont jamais ensemble dans une même question', () => {
  for (const [, q] of all()) {
    const shown = new Set(choices(q).flatMap((c) => (c.emoji ? decode(c.emoji) : [c.text])));
    assert.ok(!(shown.has('bird') && shown.has('duck')), q.key);
    assert.ok(!(shown.has('bird') && q.display.show.text?.includes('duck')), q.key);
  }
});

test('niveaux : animaux d\'abord, corps ensuite, pluriels et phrases à la fin', () => {
  const words = (level) => new Set(byLevel[level].flatMap((q) => choices(q).flatMap((c) => (c.emoji ? decode(c.emoji) : [c.text]))));
  assert.deepEqual([...words(1)].sort(), [...FIRST_ANIMALS].sort());
  for (const w of [...ANIMALS, ...PARTS]) assert.ok(words(2).has(w), `niveau 2 : ${w}`);
  assert.ok(!byLevel[1].some((q) => form(q) === 'mot-image'));
  assert.ok(byLevel[2].every((q) => ['ecoute', 'lu', 'mot-image'].includes(form(q))));
  assert.deepEqual([...new Set(byLevel[3].map(form))].sort(), ['deux-animaux', 'j-ai', 'pluriel', 'pluriel-nombre', 'touche']);
});

test('pluriels : feet, teeth, mice, sheep sont posés ; un ou deux exemplaires', () => {
  const posed = new Set(byLevel[3].filter((q) => form(q).startsWith('pluriel')).map((q) => q.key.split(':').slice(2).join(':')));
  for (const k of ['foot:1', 'foot:2', 'tooth:2', 'mouse:2', 'sheep:1', 'sheep:2', 'fish:2']) assert.ok(posed.has(k), k);
  for (const q of byLevel[3].filter((x) => form(x) === 'pluriel')) {
    const [, , id, n] = q.key.split(':');
    assert.equal(q.speak, Number(n) === 1 ? id : WORDS[id][2], q.key);
    assert.notEqual(WORDS[id][2], id, `${id} : pluriel identique, il faut un nombre`);
  }
  // « sheep » et « fish » ne sont jamais posés sans nombre.
  for (const q of byLevel[3].filter((x) => form(x) === 'pluriel')) assert.ok(!/^(sheep|fish)$/.test(q.speak), q.key);
  for (const q of byLevel[3].filter((x) => form(x) === 'pluriel-nombre')) assert.match(q.speak, /^(one|two) /, q.key);
  const feet = byLevel[3].find((q) => form(q) === 'pluriel' && q.key.endsWith(':foot:2'));
  assert.match(feet.explain, /« foot » devient « feet »/);
});

test('français des corrections', () => {
  const q = byLevel[2].find((x) => form(x) === 'ecoute' && x.answer === 'nose');
  assert.equal(q.explain, 'Nose, c\'est le nez.');
  const e = byLevel[2].find((x) => form(x) === 'ecoute' && x.answer === 'ear');
  assert.equal(e.explain, 'Ear, c\'est l\'oreille.');
  const t = byLevel[3].find((x) => form(x) === 'touche' && x.answer === 'mouth');
  assert.match(t.explain, /« Touch your mouth » veut dire « touche ta bouche »/);
  const s = byLevel[1].find((x) => form(x) === 'phrase' && x.answer === 'elephant');
  assert.match(s.explain, /« It's an elephant » veut dire « c'est un éléphant »/);
  const h = byLevel[3].find((x) => form(x) === 'j-ai' && x.key.endsWith(':ear:2'));
  assert.match(h.explain, /« I've got two ears » veut dire « j'ai deux oreilles »/);
});

// --- Raccourcis de surface (juge pédagogie, critère 2 bis) ---------------------------------------

test('mots transparents (lion, elephant, giraffe) : présents mais loin de dominer', () => {
  for (const level of [1, 2]) {
    const qs = byLevel[level].filter((q) => ['ecoute', 'lu', 'phrase', 'mot-image'].includes(form(q)));
    const t = qs.filter((q) => TRANSPARENT.includes(q.answer)).length;
    const share = t / qs.length;
    assert.ok(t > 0, `niveau ${level} : aucun mot transparent`);
    assert.ok(share <= 0.2, `niveau ${level} : ${(share * 100).toFixed(1)} % de réponses transparentes`);
  }
});

test('image → mot : la longueur du mot ne trahit pas la réponse', () => {
  const qs = byLevel[2].filter((q) => form(q) === 'mot-image');
  let longest = 0;
  let shortest = 0;
  let uniqueTransparent = 0;
  for (const q of qs) {
    const lens = choices(q).map((c) => c.text.length);
    const right = q.answer.length;
    if (right === Math.max(...lens) && lens.filter((l) => l === right).length === 1) longest += 1;
    if (right === Math.min(...lens) && lens.filter((l) => l === right).length === 1) shortest += 1;
    const tr = choices(q).filter((c) => TRANSPARENT.includes(c.text));
    if (TRANSPARENT.includes(q.answer) && tr.length === 1) uniqueTransparent += 1;
  }
  // Au hasard : une réponse sur quatre est la plus longue (ou la plus courte). On tolère 40 %.
  assert.ok(longest / qs.length <= 0.4, `la plus longue : ${longest}/${qs.length}`);
  assert.ok(shortest / qs.length <= 0.4, `la plus courte : ${shortest}/${qs.length}`);
  assert.ok(uniqueTransparent / qs.length <= 0.15, `seul mot transparent : ${uniqueTransparent}/${qs.length}`);
});

test('les images à deux exemplaires sont répétées, jamais plus', () => {
  for (const [, q] of all()) {
    for (const c of choices(q)) {
      const pic = decode(c.emoji ?? '');
      if (c.text) continue;
      assert.ok(pic.length >= 1 && pic.length <= 2, `${q.key} : ${c.emoji}`);
    }
  }
});
