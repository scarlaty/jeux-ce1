// Jeu de démonstration : passe en revue les 5 types de questions du socle
// (QCM, pavé numérique, remettre dans l'ordre, glisser-déposer, clavier de lettres).
// Sert de page de démonstration des composants : #/jeu/demo.

// Mots illustrés : un émoji sans ambiguïté pour chaque mot.
const PICTURES = [
  ['chat', '🐱'], ['chien', '🐶'], ['lapin', '🐰'], ['cochon', '🐷'], ['vache', '🐮'],
  ['poule', '🐔'], ['cheval', '🐴'], ['souris', '🐭'], ['lion', '🦁'], ['ours', '🐻'],
  ['singe', '🐵'], ['grenouille', '🐸'], ['poisson', '🐟'], ['tortue', '🐢'], ['escargot', '🐌'],
  ['abeille', '🐝'], ['renard', '🦊'], ['girafe', '🦒'], ['mouton', '🐑'], ['canard', '🦆'],
  ['maison', '🏠'], ['voiture', '🚗'], ['vélo', '🚲'], ['bateau', '⛵'], ['avion', '✈️'],
  ['étoile', '⭐'], ['soleil', '☀️'], ['lune', '🌙'], ['arbre', '🌳'], ['livre', '📕'],
  ['clé', '🔑'], ['cadeau', '🎁'], ['ballon', '⚽'], ['carotte', '🥕'], ['gâteau', '🎂'],
];
const ANIMALS = PICTURES.slice(0, 20);
const FRUITS = [
  ['pomme', '🍎'], ['banane', '🍌'], ['fraise', '🍓'], ['citron', '🍋'], ['cerise', '🍒'],
  ['poire', '🍐'], ['raisin', '🍇'], ['pastèque', '🍉'], ['ananas', '🍍'], ['kiwi', '🥝'],
];
// Mots à écrire : courts et sans accent (niveau 1), avec accents (niveau 2).
const EASY_WORDS = [
  ['chat', '🐱'], ['lion', '🦁'], ['ours', '🐻'], ['vache', '🐮'], ['poule', '🐔'], ['singe', '🐵'],
  ['lapin', '🐰'], ['pomme', '🍎'], ['lune', '🌙'], ['arbre', '🌳'], ['livre', '📕'], ['canard', '🦆'],
];
const ACCENT_WORDS = [
  ['bébé', '👶'], ['clé', '🔑'], ['étoile', '⭐'], ['fusée', '🚀'], ['zèbre', '🦓'], ['pêche', '🍑'],
  ['château', '🏰'], ['hérisson', '🦔'], ['éléphant', '🐘'], ['fée', '🧚'], ['dé', '🎲'], ['vélo', '🚲'],
];
// [anglais, français, émoji]
const ENGLISH_WORDS = [
  ['cat', 'chat', '🐱'], ['dog', 'chien', '🐶'], ['fish', 'poisson', '🐟'], ['bird', 'oiseau', '🐦'],
  ['sun', 'soleil', '☀️'], ['car', 'voiture', '🚗'], ['book', 'livre', '📕'], ['apple', 'pomme', '🍎'],
  ['tree', 'arbre', '🌳'], ['hat', 'chapeau', '🎩'], ['cake', 'gâteau', '🎂'], ['egg', 'œuf', '🥚'],
  ['pig', 'cochon', '🐷'], ['cow', 'vache', '🐮'], ['duck', 'canard', '🦆'], ['frog', 'grenouille', '🐸'],
];
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const TYPES = ['choice', 'keypad', 'order', 'drag', 'letters'];

/** Liste mélangée qui n'est pas déjà dans l'ordre attendu. */
function shuffledNotSorted(rng, sorted) {
  let items;
  do { items = rng.shuffle(sorted); } while (items.every((x, i) => x === sorted[i]));
  return items;
}

/** `count` entiers distincts de [min, max]. */
function distinctInts(rng, min, max, count) {
  const set = new Set();
  while (set.size < count) set.add(rng.int(min, max));
  return [...set];
}

const choice = {
  1(rng) {
    const [word, emoji] = rng.pick(PICTURES);
    const others = rng.sample(PICTURES.filter(([w]) => w !== word), 2).map(([w]) => w);
    return {
      key: `demo:choice:1:${word}`,
      prompt: 'Touche le mot qui va avec l\'image.',
      display: { show: { emoji }, choices: rng.shuffle([word, ...others]), cursive: true },
      answer: word,
      explain: `Cette image, c'est « ${word} ».`,
      skill: 'lire un mot',
    };
  },
  2(rng) {
    const [word, emoji] = rng.pick(PICTURES);
    const others = rng.sample(PICTURES.filter(([w]) => w !== word), 3);
    const choices = rng.shuffle([[word, emoji], ...others]).map(([w, e]) => ({ value: w, emoji: e, label: w }));
    return {
      key: `demo:choice:2:${word}`,
      prompt: 'Lis le mot, puis touche la bonne image.',
      speak: 'Lis le mot, puis touche la bonne image.',
      display: { show: { text: word, cursive: true }, choices },
      answer: word,
      explain: `« ${word} », c'est ${emoji}.`,
      skill: 'lire un mot',
    };
  },
  3(rng) {
    const after = rng.chance();
    const n = rng.int(12, 989);
    const answer = after ? n + 1 : n - 1;
    const choices = after ? [n + 1, n - 1, n + 10, n + 2] : [n - 1, n + 1, n - 10, n - 2];
    return {
      key: `demo:choice:3:${after ? 'après' : 'avant'}:${n}`,
      prompt: `Touche le nombre qui vient juste ${after ? 'après' : 'avant'} ${n}.`,
      display: { choices: rng.shuffle(choices) },
      answer,
      explain: after ? `Juste après ${n}, il y a ${n + 1}.` : `Juste avant ${n}, il y a ${n - 1}.`,
      skill: 'suite des nombres',
    };
  },
};

const keypad = {
  1(rng) {
    const a = rng.int(1, 9);
    const b = rng.int(1, 10 - a);
    return addition(a, b, 'additions jusqu\'à 10');
  },
  2(rng) {
    if (rng.chance()) {
      return addition(rng.int(10, 89), rng.int(2, 9), 'additions jusqu\'à 100');
    }
    const a = rng.int(12, 99);
    const b = rng.int(2, 9);
    return {
      key: `demo:keypad:${a}-${b}`,
      prompt: 'Calcule, puis tape le résultat.',
      speak: `Combien font ${a} moins ${b} ?`,
      display: { show: { text: `${a} − ${b} = ?` }, maxLength: 3 },
      answer: a - b,
      explain: `${a} − ${b} = ${a - b}.`,
      skill: 'soustractions jusqu\'à 100',
    };
  },
  3(rng) {
    const a = rng.int(2, 5);
    const b = rng.int(1, 10);
    return {
      key: `demo:keypad:${a}x${b}`,
      prompt: 'Calcule, puis tape le résultat.',
      speak: `Combien font ${a} fois ${b} ?`,
      display: { show: { text: `${a} × ${b} = ?` }, maxLength: 3 },
      answer: a * b,
      explain: `${a} × ${b} = ${a * b}.`,
      skill: `table de ${a}`,
    };
  },
};

function addition(a, b, skill) {
  return {
    key: `demo:keypad:${a}+${b}`,
    prompt: 'Calcule, puis tape le résultat.',
    speak: `Combien font ${a} plus ${b} ?`,
    display: { show: { text: `${a} + ${b} = ?` }, maxLength: 3 },
    answer: a + b,
    explain: `${a} + ${b} = ${a + b}.`,
    skill,
  };
}

function orderNumbers(rng, max, count, decreasing) {
  const sorted = distinctInts(rng, 0, max, count).sort((x, y) => (decreasing ? y - x : x - y));
  const way = decreasing ? 'du plus grand au plus petit' : 'du plus petit au plus grand';
  return {
    key: `demo:order:${sorted.join('-')}`,
    prompt: `Range les nombres ${way}.`,
    display: { items: shuffledNotSorted(rng, sorted) },
    answer: sorted,
    explain: decreasing
      ? 'Commence par le plus grand : compare d’abord les centaines.'
      : 'Commence par le plus petit : compare d’abord les dizaines.',
    skill: 'ranger des nombres',
  };
}

const order = {
  1: (rng) => orderNumbers(rng, 20, 4, false),
  2: (rng) => orderNumbers(rng, 99, 5, false),
  3(rng) {
    if (rng.chance(0.7)) return orderNumbers(rng, 999, 4, true);
    const start = rng.int(0, 3);
    const days = DAYS.slice(start, start + 4);
    return {
      key: `demo:order:jours:${start}`,
      prompt: 'Remets les jours de la semaine dans l\'ordre.',
      display: { items: shuffledNotSorted(rng, days), cursive: true },
      answer: days,
      explain: `La semaine : ${DAYS.join(', ')}.`,
      skill: 'jours de la semaine',
    };
  },
};

/** Glisser-déposer : `groups` = [[idCible, étiquette, valeurs], …]. */
function sortInto(rng, prompt, groups, toItem, explain, skill) {
  const entries = rng.shuffle(groups.flatMap(([target, , values]) => values.map((v) => [target, v])));
  const items = entries.map(([, v], i) => ({ id: `i${i}`, ...toItem(v) }));
  const answer = Object.fromEntries(entries.map(([target], i) => [`i${i}`, target]));
  const content = entries.map(([, v]) => (Array.isArray(v) ? v[0] : v)).sort().join(',');
  return {
    key: `demo:drag:${content}`,
    prompt,
    display: { items, targets: groups.map(([id, label]) => ({ id, label })) },
    answer,
    explain,
    skill,
  };
}

/** Nombres du niveau 2 ou 3 : au moins deux dans chaque boîte. */
function splitNumbers(rng, pool, test, count) {
  let nums;
  do { nums = rng.sample(pool, count); } while (nums.filter(test).length < 2 || nums.filter((n) => !test(n)).length < 2);
  return [nums.filter(test), nums.filter((n) => !test(n))];
}

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const drag = {
  1(rng) {
    const animals = rng.sample(ANIMALS, 2);
    const fruits = rng.sample(FRUITS, 2);
    return sortInto(
      rng,
      'Range chaque image dans la bonne boîte.',
      [['animaux', 'Animaux', animals], ['fruits', 'Fruits', fruits]],
      ([word, emoji]) => ({ emoji, label: word }),
      `Animaux : ${animals.map(([w]) => w).join(', ')}. Fruits : ${fruits.map(([w]) => w).join(', ')}.`,
      'classer',
    );
  },
  2(rng) {
    const [even, odd] = splitNumbers(rng, range(1, 30), (n) => n % 2 === 0, 6);
    return sortInto(
      rng,
      'Range chaque nombre : pair ou impair ?',
      [['pair', 'Pairs', even], ['impair', 'Impairs', odd]],
      (n) => ({ text: String(n) }),
      'Un nombre pair se termine par 0, 2, 4, 6 ou 8.',
      'pair et impair',
    );
  },
  3(rng) {
    const pool = range(1, 99).filter((n) => n !== 50);
    const [small, big] = splitNumbers(rng, pool, (n) => n < 50, 6);
    return sortInto(
      rng,
      'Range chaque nombre : plus petit ou plus grand que 50 ?',
      [['petit', 'Plus petit que 50', small], ['grand', 'Plus grand que 50', big]],
      (n) => ({ text: String(n) }),
      'Compare d\'abord le chiffre des dizaines avec 5.',
      'comparer à 50',
    );
  },
};

const letters = {
  1(rng) {
    const [word, emoji] = rng.pick(EASY_WORDS);
    return writeWord(word, emoji, 'écrire un mot simple');
  },
  2(rng) {
    const [word, emoji] = rng.pick(ACCENT_WORDS);
    return writeWord(word, emoji, 'écrire un mot avec accent');
  },
  3(rng) {
    const [en, fr, emoji] = rng.pick(ENGLISH_WORDS);
    return {
      key: `demo:letters:en:${en}`,
      prompt: 'Écoute, puis écris le mot en anglais.',
      display: { show: { emoji, speak: en, lang: 'en-GB' }, length: en.length, accents: false },
      answer: en,
      explain: `En anglais, « ${fr} » se dit « ${en} ».`,
      skill: 'mots anglais',
    };
  },
};

function writeWord(word, emoji, skill) {
  return {
    key: `demo:letters:${word}`,
    prompt: 'Écoute, puis écris le mot.',
    display: { show: { emoji, speak: word }, length: [...word].length },
    answer: word,
    explain: `On écrit « ${word} ».`,
    skill,
  };
}

const makers = { choice, keypad, order, drag, letters };

export default {
  id: 'demo',
  title: 'Démonstration',
  island: 'ailleurs',
  subject: 'démo',
  issue: 6,
  demo: true,
  skills: ['Essayer chaque type de question'],
  levels: [
    { label: 'Niveau 1', hint: 'Images, additions, nombres jusqu\'à 20' },
    { label: 'Niveau 2', hint: 'Mots avec accents, nombres jusqu\'à 100' },
    { label: 'Niveau 3', hint: 'Tables, nombres jusqu\'à 999, anglais' },
  ],
  // Les types s'enchaînent dans l'ordre (choice, keypad, order, drag, letters) :
  // une partie de 10 questions montre chaque type deux fois.
  makeQuestion(level, rng, seen) {
    const type = TYPES[seen.size % TYPES.length];
    return { type, ...makers[type][level](rng) };
  },
};
