// Raccourcis de surface dans une banque de QCM texte (grille du juge pédagogie, critère 2 bis).
// Une banque = liste d'items { id, prompt, right, wrong: [...] }.
import assert from 'node:assert/strict';

/**
 * La bonne réponse ne doit pas se deviner à sa longueur : part des items où elle est STRICTEMENT
 * la plus longue (devant toutes ses mauvaises réponses) ≤ `max`.
 */
export function checkNoLengthShortcut(items, { max = 0.5, label = 'banque' } = {}) {
  const longest = items.filter((i) => i.wrong.every((w) => i.right.length > w.length));
  const share = longest.length / items.length;
  assert.ok(share <= max, `${label} : la bonne réponse est la plus longue dans ${(100 * share).toFixed(1)} % des items (> ${100 * max} %)`);
  return share;
}

const words = (text) => new Set(
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter((w) => w.length >= 5),
);

/**
 * La bonne réponse ne doit pas être la SEULE à recopier un mot de la consigne (5 lettres ou plus) :
 * l'enfant la repérerait sans comprendre. Part des items concernés ≤ `max`.
 */
export function checkNoPromptEcho(items, { max = 0.1, label = 'banque' } = {}) {
  const echoes = (text, prompt) => [...words(text)].some((w) => prompt.has(w));
  const bad = items.filter((i) => {
    const p = words(i.prompt);
    return echoes(i.right, p) && i.wrong.every((w) => !echoes(w, p));
  });
  const share = bad.length / items.length;
  assert.ok(share <= max, `${label} : ${(100 * share).toFixed(1)} % des bonnes réponses recopient seules la consigne (${bad.map((b) => b.id).join(', ')})`);
  return share;
}

const NBSP = ' ';

/**
 * Tout ce que l'enfant VOIT d'une question, remis à plat pour un solveur de surface.
 * C'est le point dur de la mesure : si l'implémenteur choisit ce que le solveur a le droit de regarder,
 * le chiffre ne vaut rien. Sur #107, un premier test passait le seul `context` au solveur alors que
 * l'écran montre aussi la phrase — il mesurait 42,7 % là où la réalité était 89,4 %.
 * `visibleOfQuestion` lit donc la question RENDUE par `makeQuestion`, jamais une projection écrite à la main.
 */
export function visibleOfQuestion(q) {
  const flat = (s) => String(s || '').split(NBSP).join(' ');
  const d = q.display || {};
  const show = d.show || {};
  return {
    prompt: flat(q.prompt),
    // « … » est le marqueur de la place du signe à trouver : il ne porte aucune information.
    text: flat(show.text).replace(/\s*…\s*$/, ''),
    choices: (d.choices || []).map((c) => flat(c.text)),
    items: (d.items || []).map((i) => flat(typeof i === 'string' ? i : i && i.text)),
    answer: q.answer,
    key: q.key,
  };
}

/**
 * Un « solveur de surface » devine la réponse sans comprendre l'énoncé : typographie, premier mot,
 * classe sémantique d'un mot-clé, position, longueur… `solver` reçoit la vue rendue
 * (`visibleOfQuestion`) et renvoie une réponse ; on mesure la part de questions qu'il tombe juste.
 *
 * `questions` sont les questions RÉELLEMENT tirées par le générateur (`buildQuestions`), pas une banque
 * reconstruite : c'est ce que l'enfant a sous les yeux, pondéré par la fréquence réelle de chaque famille.
 * Seuil de la grille du juge pédagogie (§2 bis) : ≤ 50 %.
 *
 * Deux gardes protègent la MESURE elle-même (#109) : le solveur doit renvoyer `null` quand son
 * indice est absent, et il doit couvrir au moins `minCoverage` des questions ; il ne doit pas non
 * plus répondre toujours la même chose. Sans elles, un solveur devenu aveugle passe au vert et
 * certifie une banque qu'il n'a pas regardée — c'est arrivé sur #107, couverture 0 sur 4 202.
 */
export function checkNoSurfaceShortcut(questions, solver, {
  max = 0.5, label = 'questions', minCoverage = 0.3, constant = false,
} = {}) {
  const views = questions.map(visibleOfQuestion);
  const guesses = views.map((v) => solver(v));

  // Garde 1 : un solveur qui ne reconnaît plus rien ne mesure plus rien. Il doit renvoyer `null`
  // quand son indice est absent — c'est à cela que sert la couverture.
  const carried = guesses.filter((g) => g !== null && g !== undefined && g !== '');
  const coverage = carried.length / views.length;
  assert.ok(coverage >= minCoverage,
    `${label} : ce solveur ne répond que sur ${carried.length}/${views.length} = `
    + `${(100 * coverage).toFixed(1)} % des questions — il ne mesure plus la banque, `
    + `son score est un faux négatif (< ${100 * minCoverage} % de couverture)`);

  // Garde 2 : un solveur qui répond toujours la même chose a dégénéré en « parier sur la classe
  // majoritaire ». Il passe alors sous le seuil sans rien démontrer. C'est exactement ce qui est
  // arrivé au solveur « verbe de la situation » de #107 : couverture tombée à 0, repli sur « . »,
  // 32,9 % — vert, et aveugle. Un solveur volontairement constant le déclare.
  if (!constant && carried.length) {
    const tally = new Map();
    for (const g of carried) tally.set(g, (tally.get(g) || 0) + 1);
    const top = Math.max(...tally.values()) / carried.length;
    assert.ok(top < 0.9,
      `${label} : ce solveur répond ${(100 * top).toFixed(1)} % du temps la même chose — `
      + 'il a dégénéré en pari sur la classe majoritaire et ne mesure aucun raccourci');
  }

  const hits = views.filter((v, i) => guesses[i] === v.answer);
  const share = hits.length / views.length;
  assert.ok(share <= max,
    `${label} : un solveur de surface résout ${hits.length}/${views.length} = `
    + `${(100 * share).toFixed(1)} % des questions (> ${100 * max} %)`);
  return share;
}

/**
 * Part des questions dont un indice de surface donné est PRÉSENT (`detect` renvoie une réponse) — la
 * « couverture » du raccourci — et sa justesse quand il est présent. Un indice rare peut être toujours
 * juste sans nuire ; un indice présent partout et toujours juste rend la question inutile, même si
 * aucun mot ne domine pris isolément (défaut relevé sur #107 : 44 contextes sur 45 portaient un verbe
 * d'intention, juste 43 fois sur 44 — chaque mot restait sous 30 %, mais la CLASSE couvrait tout).
 */
export function checkCueCoverage(questions, detect, { maxCoverage = 0.5, label = 'questions' } = {}) {
  const views = questions.map(visibleOfQuestion);
  const carried = views.filter((v) => detect(v) !== null && detect(v) !== undefined);
  const right = carried.filter((v) => detect(v) === v.answer);
  const coverage = carried.length / views.length;
  assert.ok(coverage <= maxCoverage,
    `${label} : ${carried.length}/${views.length} = ${(100 * coverage).toFixed(1)} % des questions portent `
    + `l'indice de surface (> ${100 * maxCoverage} %), juste ${right.length}/${carried.length}`);
  return { coverage, precision: carried.length ? right.length / carried.length : 0 };
}
