// Lire l'heure (CE1, programmes 2024) : horloge à aiguilles, heures pile, demies, quarts,
// minutes de 5 en 5, puis les heures de l'après-midi (13 h … 23 h).
//
// Le cadran (`js/core/ui/art/clock.js`) pose la petite aiguille proportionnellement aux minutes :
// à 3 h 45 elle est presque sur le 4, et c'est bien « 3 h » qu'on lit. Les intrus classiques
// (lire la petite aiguille sur l'heure suivante, confondre h 15 et h 45, inverser les aiguilles)
// servent de distracteurs ; ils ne sont jamais une autre écriture de la bonne heure, car chaque
// intrus est une heure DIFFÉRENTE sur un cadran de 12 heures.
//
// Écriture à la française : « 7 h 05 », « 3 h », avec une espace insécable pour ne jamais couper.
import { enLettres } from '../data/nombres-en-lettres.js';

const NB = ' ';

const SKILL = {
  half: 'lire une heure pile ou une demie',
  quarter: 'lire les quarts d\'heure',
  five: 'lire les minutes, de 5 en 5',
  hourHand: 'lire l\'heure sur la petite aiguille',
  minutes: 'lire les minutes sur la grande aiguille',
  afternoon: 'heures du matin et de l\'après-midi (24 h)',
};

// --- Écriture et lecture à voix haute ---------------------------------------------------------

const two = (n) => String(n).padStart(2, '0');

/** « 3 h », « 3 h 30 », « 7 h 05 », « 15 h 20 ». */
export function timeText(h, m) {
  return m === 0 ? `${h}${NB}h` : `${h}${NB}h${NB}${two(m)}`;
}

const hourWords = (h) => (h === 1 ? 'une heure' : `${enLettres(h)} heures`);

/** « trois heures et quart », « sept heures cinq », « quinze heures ». */
export function timeSpoken(h, m) {
  if (m === 0) return hourWords(h);
  if (m === 15) return `${hourWords(h)} et quart`;
  if (m === 30) return `${hourWords(h)} et demie`;
  return `${hourWords(h)} ${enLettres(m)}`;
}

// --- Explication : comment lire les deux aiguilles --------------------------------------------

const wrap12 = (h) => ((h - 1 + 12) % 12) + 1;

/** Ce qu'on lit sur le cadran de h : m, du point de vue de l'enfant (h de 1 à 12). */
export function explainClock(h, m) {
  const next = wrap12(h + 1);
  const here = timeText(h, m);
  if (m === 0) {
    return `La grande aiguille est sur le 12 : c'est l'heure pile. La petite aiguille est sur le ${h} : il est ${here}.`;
  }
  const small = m < 30
    ? `La petite aiguille a passé le ${h} : l'heure est ${h}.`
    : `La petite aiguille est entre le ${h} et le ${next}, pas encore sur le ${next} : l'heure est ${h}.`;
  const place = m / 5;
  if (m === 15) return `${small} La grande aiguille est sur le 3 : un quart d'heure, 15 minutes. Il est ${here}.`;
  if (m === 30) return `${small} La grande aiguille est sur le 6 : la moitié du tour, 30 minutes. Il est ${here}, ${h} heures et demie.`;
  if (m === 45) return `${small} La grande aiguille est sur le 9 : trois quarts d'heure, 45 minutes. Il est ${here}.`;
  return `${small} La grande aiguille est sur le ${place} : ${place} × 5 = ${m} minutes. Il est ${here}.`;
}

/** Même explication, avec le passage à l'heure de l'après-midi : 3 + 12 = 15. */
const explainAfternoon = (h, m) => `${explainClock(h, m)} L'après-midi, on ajoute 12 : ${h} + 12 = ${h + 12}, donc ${timeText(h + 12, m)}.`;

// --- Tirages et intrus ---------------------------------------------------------------------------

const HALF = [0, 30];
const QUARTERS = [0, 15, 30, 45];
const FIVES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const draw = (rng, minutes, hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) => ({ h: rng.pick(hours), m: rng.pick(minutes) });
const sameTime = (a, b) => a.h === b.h && a.m === b.m;

/**
 * Heures fausses mais plausibles (sur 12 heures, donc toujours une autre position des aiguilles) :
 * la petite aiguille lue sur l'heure voisine, h 15 pris pour h 45, aiguilles inversées, minute voisine.
 */
function confusions({ h, m }, allowed, { skipTwelve = false } = {}) {
  const list = [];
  const add = (hh, mm) => list.push({ h: wrap12(hh), m: mm });
  if (allowed.length <= 4) {
    for (const mm of allowed) { add(h, mm); add(h + 1, mm); add(h - 1, mm); }
  } else {
    add(h + 1, m); add(h - 1, m); add(h + 1, 60 - m);
    add(h, 60 - m); add(h, m + 5); add(h, m - 5); add(h, m + 15); add(h, m - 15);
    add(m === 0 ? 12 : m / 5, 5 * (h % 12));   // aiguilles inversées
  }
  const seen = new Set();
  return list.filter((t) => {
    const id = `${t.h}:${t.m}`;
    const fine = !sameTime(t, { h, m }) && allowed.includes(((t.m % 60) + 60) % 60) && t.m >= 0 && t.m < 60
      && !seen.has(id) && !(skipTwelve && t.h === 12);
    if (fine) seen.add(id);
    return fine;
  });
}

const clockArt = (h, m) => ({ kind: 'clock', hours: h % 12, minutes: m });

// --- Les formes de questions -------------------------------------------------------------------

/** Cadran → heure écrite (4 choix). */
function clockToText(rng, t, allowed, skill) {
  const right = timeText(t.h, t.m);
  const wrong = rng.sample(confusions(t, allowed), 3).map((x) => timeText(x.h, x.m));
  return {
    key: `heure:lire:${t.h}:${t.m}`,
    type: 'choice',
    prompt: 'Regarde l\'horloge. Touche l\'heure qu\'elle indique.',
    speak: 'Quelle heure indique l\'horloge ?',
    display: { show: { art: clockArt(t.h, t.m) }, choices: rng.shuffle([right, ...wrong]) },
    answer: right,
    explain: explainClock(t.h, t.m),
    skill,
  };
}

/** Heure écrite → bon cadran parmi 3. */
function textToClock(rng, t, allowed, skill) {
  const right = timeText(t.h, t.m);
  const wrong = rng.sample(confusions(t, allowed), 2);
  const choices = rng.shuffle([t, ...wrong]).map((x) => ({ value: timeText(x.h, x.m), art: clockArt(x.h, x.m) }));
  return {
    key: `heure:cadran:${t.h}:${t.m}`,
    type: 'choice',
    prompt: 'Touche l\'horloge qui indique cette heure.',
    speak: `Touche l'horloge qui indique ${timeSpoken(t.h, t.m)}.`,
    display: { show: { text: right }, choices },
    answer: right,
    explain: `Pour ${right} : ${explainClock(t.h, t.m)}`,
    skill,
  };
}

/** Cadran → minutes au pavé : « Il est 3 h et … minutes ». */
function clockMinutes(rng, t) {
  return {
    key: `heure:minutes:${t.h}:${t.m}`,
    type: 'keypad',
    prompt: 'Regarde la grande aiguille et écris les minutes.',
    speak: `Il est ${hourWords(t.h)} et combien de minutes ?`,
    display: { show: { art: clockArt(t.h, t.m) }, prefix: `${t.h}${NB}h et`, suffix: 'minutes', maxLength: 2 },
    answer: t.m,
    explain: explainClock(t.h, t.m),
    skill: SKILL.minutes,
  };
}

/** Cadran → heures au pavé : « Il est … h et 45 minutes » (la petite aiguille ne ment pas). */
function clockHours(rng, t) {
  return {
    key: `heure:heures:${t.h}:${t.m}`,
    type: 'keypad',
    prompt: 'Regarde la petite aiguille et écris les heures.',
    speak: `Il est combien d'heures, et ${enLettres(t.m)} minutes ?`,
    display: { show: { art: clockArt(t.h, t.m) }, suffix: `h et ${t.m} minutes`, maxLength: 2 },
    answer: t.h,
    explain: explainClock(t.h, t.m),
    skill: SKILL.hourHand,
  };
}

const AFTERNOON_HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/** L'après-midi : cadran → heure de l'écran numérique (de 13 h à 23 h). Un intrus oublie d'ajouter 12. */
function afternoonDigital(rng, t) {
  const right = timeText(t.h + 12, t.m);
  const forgot = timeText(t.h, t.m);
  const others = rng.sample(confusions(t, FIVES, { skipTwelve: true }), 2).map((x) => timeText(x.h + 12, x.m));
  return {
    key: `heure:après-midi:${t.h}:${t.m}`,
    type: 'choice',
    prompt: 'C\'est l\'après-midi. Quelle heure l\'écran numérique affiche-t-il ?',
    speak: 'C\'est l\'après-midi. Quelle heure l\'écran numérique affiche-t-il ?',
    display: { show: { art: clockArt(t.h, t.m) }, choices: rng.shuffle([right, forgot, ...others]) },
    answer: right,
    explain: explainAfternoon(t.h, t.m),
    skill: SKILL.afternoon,
  };
}

/** L'après-midi : heure sur 24 h → bon cadran parmi 3. */
function afternoonRead(rng, t) {
  const right = timeText(t.h + 12, t.m);
  const wrong = rng.sample(confusions(t, FIVES, { skipTwelve: true }), 2);
  const choices = rng.shuffle([t, ...wrong]).map((x) => ({ value: timeText(x.h + 12, x.m), art: clockArt(x.h, x.m) }));
  return {
    key: `heure:après-midi-cadran:${t.h}:${t.m}`,
    type: 'choice',
    prompt: 'C\'est l\'après-midi. Touche l\'horloge qui indique cette heure.',
    speak: `C'est l'après-midi. Touche l'horloge qui indique ${timeSpoken(t.h + 12, t.m)}.`,
    display: { show: { text: right }, choices },
    answer: right,
    explain: `${right}, c'est ${timeText(t.h, t.m)} de l'après-midi (${t.h + 12} − 12 = ${t.h}). ${explainClock(t.h, t.m)}`,
    skill: SKILL.afternoon,
  };
}

/** « Il est 17 h. Sur le cadran, la petite aiguille est sur quel nombre ? » → 5. */
function afternoonHand(rng, t) {
  const text = timeText(t.h + 12, 0);
  return {
    key: `heure:après-midi-aiguille:${t.h}`,
    type: 'keypad',
    prompt: `Il est ${text}, c'est l'après-midi. Sur le cadran, la petite aiguille est sur quel nombre ?`,
    speak: `Il est ${timeSpoken(t.h + 12, 0)}, c'est l'après-midi. Sur le cadran, la petite aiguille est sur quel nombre ?`,
    display: { show: { text }, maxLength: 2 },
    answer: t.h,
    explain: `Le cadran ne va que jusqu'à 12. ${t.h + 12} − 12 = ${t.h} : la petite aiguille est sur le ${t.h}.`,
    skill: SKILL.afternoon,
  };
}

/** L'après-midi : cadran à l'heure pile → écrire l'heure de l'écran numérique : 4 h → 16 h. */
function afternoonWrite(rng, t) {
  return {
    key: `heure:après-midi-écrire:${t.h}`,
    type: 'keypad',
    prompt: 'C\'est l\'après-midi. Écris l\'heure que l\'écran numérique affiche.',
    speak: 'C\'est l\'après-midi. Quelle heure l\'écran numérique affiche-t-il ?',
    display: { show: { art: clockArt(t.h, 0) }, suffix: 'h', maxLength: 2 },
    answer: t.h + 12,
    explain: explainAfternoon(t.h, 0),
    skill: SKILL.afternoon,
  };
}

// --- Déroulé d'une partie ------------------------------------------------------------------------
// Chaque niveau a un échauffement (mélangé) puis des questions plus exigeantes (dans l'ordre).

const nonZero = (list) => list.filter((m) => m > 0);
const pile = (rng) => draw(rng, [0]);
const half = (rng) => draw(rng, [30]);
const halves = (rng) => draw(rng, HALF);
const quarters = (rng) => draw(rng, QUARTERS);
const quarterMinutes = (rng) => draw(rng, nonZero(QUARTERS));
const fives = (rng) => draw(rng, FIVES);
const fiveMinutes = (rng) => draw(rng, nonZero(FIVES));
const afternoon = (rng) => draw(rng, FIVES, AFTERNOON_HOURS);
const afternoonPile = (rng) => draw(rng, [0], AFTERNOON_HOURS);

const DECKS = {
  1: [
    [
      (rng) => clockToText(rng, pile(rng), HALF, SKILL.half),
      (rng) => clockToText(rng, half(rng), HALF, SKILL.half),
      (rng) => textToClock(rng, pile(rng), HALF, SKILL.half),
      (rng) => textToClock(rng, half(rng), HALF, SKILL.half),
      (rng) => clockToText(rng, halves(rng), HALF, SKILL.half),
      (rng) => textToClock(rng, halves(rng), HALF, SKILL.half),
    ],
    [
      (rng) => clockToText(rng, halves(rng), HALF, SKILL.half),
      (rng) => textToClock(rng, halves(rng), HALF, SKILL.half),
      (rng) => clockToText(rng, halves(rng), HALF, SKILL.half),
      (rng) => textToClock(rng, halves(rng), HALF, SKILL.half),
    ],
  ],
  2: [
    [
      (rng) => clockToText(rng, quarters(rng), QUARTERS, SKILL.quarter),
      (rng) => textToClock(rng, quarters(rng), QUARTERS, SKILL.quarter),
      (rng) => clockMinutes(rng, quarterMinutes(rng)),
      (rng) => clockHours(rng, quarterMinutes(rng)),
      (rng) => clockToText(rng, quarters(rng), QUARTERS, SKILL.quarter),
      (rng) => textToClock(rng, quarters(rng), QUARTERS, SKILL.quarter),
    ],
    [
      (rng) => clockToText(rng, fives(rng), FIVES, SKILL.five),
      (rng) => textToClock(rng, fives(rng), FIVES, SKILL.five),
      (rng) => clockMinutes(rng, fiveMinutes(rng)),
      (rng) => clockToText(rng, fives(rng), FIVES, SKILL.five),
    ],
  ],
  3: [
    [
      (rng) => clockToText(rng, fives(rng), FIVES, SKILL.five),
      (rng) => textToClock(rng, fives(rng), FIVES, SKILL.five),
      (rng) => clockMinutes(rng, fiveMinutes(rng)),
      (rng) => clockHours(rng, fiveMinutes(rng)),
      (rng) => afternoonDigital(rng, afternoon(rng)),
      (rng) => afternoonRead(rng, afternoon(rng)),
    ],
    [
      (rng) => afternoonHand(rng, afternoonPile(rng)),
      (rng) => afternoonDigital(rng, afternoon(rng)),
      (rng) => afternoonWrite(rng, afternoonPile(rng)),
      (rng) => afternoonRead(rng, afternoon(rng)),
    ],
  ],
};

// Le paquet d'une partie est tiré au premier appel puis retrouvé grâce à `seen` (un Set propre
// à chaque partie) : un nouvel essai pour éviter un doublon garde le même type de question.
const decks = new WeakMap();

function deckFor(level, rng, seen) {
  const saved = decks.get(seen);
  if (saved && saved.level === level) return saved.deck;
  const [warmup, harder] = DECKS[level];
  const deck = [...rng.shuffle(warmup), ...harder];
  decks.set(seen, { level, deck });
  return deck;
}

export default {
  id: 'heure',
  title: 'Lire l\'heure',
  island: 'mesures',
  subject: 'maths',
  issue: 58,
  skills: [
    'Lire l\'heure sur une horloge à aiguilles : heures pile, demies, quarts d\'heure, minutes',
    'Écrire l\'heure, du matin et de l\'après-midi',
  ],
  levels: [
    { label: 'Niveau 1', hint: 'Heures pile et demies' },
    { label: 'Niveau 2', hint: 'Quarts d\'heure et minutes de 5 en 5' },
    { label: 'Niveau 3', hint: 'Toutes les 5 minutes et l\'après-midi' },
  ],
  makeQuestion(level, rng, seen) {
    if (!seen) return rng.pick(DECKS[level].flat())(rng);
    const deck = deckFor(level, rng, seen);
    return deck[seen.size % deck.length](rng);
  },
};
