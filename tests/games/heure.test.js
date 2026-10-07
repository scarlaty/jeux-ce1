import { test } from 'node:test';
import assert from 'node:assert/strict';
import game, { timeText, timeSpoken } from '../../js/games/heure.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
import { buildQuestions } from '../../js/core/engine.js';
import { createRng } from '../../js/core/random.js';
import { handAngles } from '../../js/core/ui/art/clock.js';
import { artLabel } from '../../js/core/ui/art/index.js';

const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const all = () => Object.entries(byLevel).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));

/** « 7 h 05 » → { h: 7, m: 5 } (espaces insécables ou non). */
function parse(text) {
  const [, h, m] = /^(\d+)\s*h(?:\s*(\d+))?$/.exec(text);
  return { h: Number(h), m: Number(m || 0) };
}

/** Position des deux aiguilles : deux heures qui se ressemblent sur un cadran de 12 h ont la même. */
const handsOf = ({ h, m }) => { const a = handAngles({ hours: h, minutes: m }); return `${a.hour}/${a.minute}`; };
const clockOf = (art) => handsOf({ h: art.hours, m: art.minutes });

const shownArt = (q) => q.display.show?.art || null;
const afternoon = (q) => q.key.startsWith('heure:après-midi');
const valueOf = (c) => (typeof c === 'string' ? c : c.value);

test('le jeu respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.id, 'heure');
  assert.equal(game.island, 'mesures');
  assert.equal(game.subject, 'maths');
  assert.equal(game.issue, 58);
});

test('plus de 30 questions distinctes par niveau', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    assert.ok(new Set(qs.map((q) => q.key)).size >= 30, `niveau ${level}`);
  }
});

test('écriture à la française et lecture à voix haute', () => {
  assert.equal(timeText(3, 0), '3 h');
  assert.equal(timeText(3, 30), '3 h 30');
  assert.equal(timeText(7, 5), '7 h 05');
  assert.equal(timeText(15, 20), '15 h 20');
  assert.equal(timeSpoken(1, 0), 'une heure');
  assert.equal(timeSpoken(3, 0), 'trois heures');
  assert.equal(timeSpoken(3, 15), 'trois heures et quart');
  assert.equal(timeSpoken(3, 30), 'trois heures et demie');
  assert.equal(timeSpoken(7, 5), 'sept heures cinq');
  assert.equal(timeSpoken(3, 45), 'trois heures quarante-cinq');
  assert.equal(timeSpoken(17, 0), 'dix-sept heures');
});

test('la petite aiguille est proportionnelle aux minutes (à 3 h 45, presque sur le 4)', () => {
  assert.equal(handAngles({ hours: 3, minutes: 45 }).hour, 112.5);
  assert.equal(handAngles({ hours: 3, minutes: 0 }).hour, 90);
  assert.equal(handAngles({ hours: 3, minutes: 30 }).hour, 105);
});

test('le nom accessible du cadran ne donne jamais l\'heure', () => {
  for (const [, q] of all()) {
    const arts = [shownArt(q), ...(q.display.choices || []).map((c) => c.art)].filter(Boolean);
    for (const art of arts) assert.ok(!/\d+\s*h\b/.test(artLabel(art)), artLabel(art));
  }
});

test('cadran → heure écrite : une seule bonne réponse, jamais une autre écriture de la bonne heure', () => {
  let count = 0;
  for (const [, q] of all()) {
    if (!/^heure:(lire|après-midi):/.test(q.key)) continue;
    count += 1;
    const art = shownArt(q);
    const good = q.display.choices.filter((c) => {
      const t = parse(c);
      return clockOf(art) === handsOf(t) && (!afternoon(q) || t.h >= 13);
    });
    assert.deepEqual(good, [q.answer], q.key);
  }
  assert.ok(count > 500);
});

test('heure écrite → cadran : un seul cadran correspond, parmi 3', () => {
  let count = 0;
  for (const [, q] of all()) {
    if (!/^heure:(cadran|après-midi-cadran):/.test(q.key)) continue;
    count += 1;
    assert.equal(q.display.choices.length, 3);
    const shown = parse(q.display.show.text);
    const good = q.display.choices.filter((c) => clockOf(c.art) === handsOf(shown));
    assert.equal(good.length, 1, q.key);
    assert.equal(good[0].value, q.answer);
    assert.equal(q.answer, q.display.show.text);
  }
  assert.ok(count > 300);
});

test('le pavé numérique : la réponse se lit sur le cadran ou se calcule', () => {
  let count = 0;
  for (const [, q] of all()) {
    if (q.type !== 'keypad') continue;
    count += 1;
    const art = shownArt(q);
    if (q.key.startsWith('heure:minutes:')) assert.equal(q.answer, art.minutes);
    else if (q.key.startsWith('heure:heures:')) assert.equal(q.answer, art.hours === 0 ? 12 : art.hours);
    else if (q.key.startsWith('heure:après-midi-écrire:')) {
      assert.equal(q.answer, (art.hours === 0 ? 12 : art.hours) + 12);
      assert.equal(art.minutes, 0);
    } else if (q.key.startsWith('heure:après-midi-aiguille:')) {
      assert.equal(q.answer + 12, parse(q.display.show.text).h);
    } else assert.fail(q.key);
    assert.ok(q.answer >= 1);
  }
  assert.ok(count > 100);
});

test('niveau 1 : seulement des heures pile et des demies, en choix, sans après-midi', () => {
  for (const q of byLevel[1]) {
    for (const art of [shownArt(q), ...q.display.choices.map((c) => c.art)].filter(Boolean)) {
      assert.ok([0, 30].includes(art.minutes), q.key);
    }
    for (const c of q.display.choices) assert.ok([0, 30].includes(parse(valueOf(c)).m), q.key);
    assert.ok(!afternoon(q) && q.type === 'choice', q.key);
  }
  assert.ok(byLevel[1].some((q) => shownArt(q)?.minutes === 30));
  assert.ok(byLevel[1].some((q) => !shownArt(q)));
});

test('niveau 2 : quarts d\'heure puis minutes de 5 en 5, avec du pavé numérique', () => {
  const minutes = new Set();
  for (const q of byLevel[2]) {
    const art = shownArt(q);
    if (art) minutes.add(art.minutes);
    assert.ok(!afternoon(q));
    assert.ok(!art || art.minutes % 5 === 0);
  }
  for (const m of [0, 15, 30, 45, 5, 10, 20]) assert.ok(minutes.has(m), `minute ${m}`);
  assert.ok(byLevel[2].some((q) => q.type === 'keypad'));
});

test('niveau 2 : l\'échauffement ne propose que des quarts', () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const qs = buildQuestions(game, 2, createRng(seed), 10);
    for (const q of qs.slice(0, 6)) {
      const art = shownArt(q) || q.display.choices[0].art;
      assert.ok([0, 15, 30, 45].includes(art.minutes), q.key);
    }
  }
});

test('niveau 3 : l\'après-midi est toujours dit dans la consigne, et les heures vont jusqu\'à 23 h', () => {
  const pm = byLevel[3].filter(afternoon);
  assert.ok(pm.length > 100);
  for (const q of pm) {
    assert.match(q.prompt, /après-midi/, q.key);
    assert.match(q.speak, /après-midi/, q.key);
    for (const c of q.display.choices || []) assert.ok(parse(valueOf(c)).h <= 23, q.key);
  }
  for (const q of [...byLevel[1], ...byLevel[2]]) assert.ok(!afternoon(q));
});

test('aux niveaux 1 et 2, jamais d\'heure de l\'après-midi (13 h à 24 h) écrite', () => {
  for (const q of [...byLevel[1], ...byLevel[2]]) {
    assert.ok(!/\b(1[3-9]|2[0-4])\s*h/.test(`${q.prompt} ${q.explain} ${q.display.show?.text || ''}`), q.key);
  }
});

test('l\'explication dit comment lire les deux aiguilles', () => {
  for (const [, q] of all()) {
    assert.match(q.explain, /petite aiguille/, q.key);
    if (!q.key.startsWith('heure:après-midi-aiguille')) assert.match(q.explain, /grande aiguille/, q.key);
  }
  const forty5 = byLevel[2].find((q) => shownArt(q)?.minutes === 45 && q.key.startsWith('heure:lire'));
  assert.ok(forty5);
  assert.match(forty5.explain, /pas encore sur le/);
});

test('toute question a une consigne, une phrase à dire, une notion et une explication', () => {
  for (const [, q] of all()) assert.ok(q.prompt && q.speak && q.skill && q.explain, q.key);
});
