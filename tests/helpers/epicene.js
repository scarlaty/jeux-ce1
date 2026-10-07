// Mixité : aucun texte adressé à l'enfant qui joue ne doit porter un accord genré (#107).
// On ne sait pas qui joue. « Comme tu es grand ! » exclut la moitié des enfants ; « Comme tu es rapide ! »
// n'exclut personne. Règle du projet (CLAUDE.md) : 0 toléré, sur les banques ET sur les questions tirées.
//
// Ne concerne QUE le « tu » (l'enfant) et le « je » mis dans sa bouche. Un personnage nommé garde son
// genre : « Léa raconte : Je suis allée à la piscine. » est juste, et doit le rester.
import assert from 'node:assert/strict';

/** Adjectifs et participes à forme genrée audible/visible, au masculin ET au féminin. */
export const GENDERED = [
  'grand', 'grande', 'petit', 'petite', 'content', 'contente', 'prêt', 'prête',
  'beau', 'belle', 'joli', 'jolie', 'gentil', 'gentille', 'fort', 'forte',
  'heureux', 'heureuse', 'mignon', 'mignonne', 'sûr', 'sûre', 'fatigué', 'fatiguée',
  'assis', 'assise', 'seul', 'seule', 'premier', 'première', 'dernier', 'dernière',
  'mêlé', 'mêlée', 'allé', 'allée', 'venu', 'venue', 'parti', 'partie', 'né', 'née',
  'doué', 'douée', 'poli', 'polie', 'sérieux', 'sérieuse', 'curieux', 'curieuse',
  'malin', 'maligne', 'bavard', 'bavarde', 'savant', 'savante', 'nouveau', 'nouvelle',
];

const SET = new Set(GENDERED);

// Le « tu » désigne toujours l'enfant qui joue : c'est lui qu'on ne doit pas genrer.
const ADDRESS = /\b(tu\s+es|es-tu|t'es|tu\s+étais|tu\s+seras|tu\s+as\s+l'air)\b/gi;
// Le « je » est plus délicat : dans une devinette, c'est l'OBJET qui parle (« Je suis grande » = la
// girafe), et l'accord y est juste. On ne le vérifie donc que sur demande, pour un jeu où le « je »
// est bien celui de l'enfant.
const FIRST_PERSON = /\b(je\s+suis|je\s+serai|j'étais)\b/gi;
const FILLER = /^(très|si|trop|bien|vraiment|tout|toute|plus|moins|assez)$/i;

/**
 * Accords genrés trouvés dans un texte adressé à l'enfant. Renvoie la liste des mots fautifs.
 * `firstPerson` : vérifier aussi le « je » (seulement si le « je » du jeu est celui de l'enfant).
 */
export function genderedAgreements(text, { firstPerson = false } = {}) {
  const s = String(text || '');
  const found = [];
  const patterns = firstPerson ? [ADDRESS, FIRST_PERSON] : [ADDRESS];
  for (const m of [...patterns].flatMap((re) => [...s.matchAll(re)])) {
    const after = s.slice(m.index + m[0].length);
    // On saute les intensifs (« tu es TRÈS grand ») pour atteindre l'adjectif.
    const next = after.split(/[^A-Za-zÀ-ÿ'-]+/).filter(Boolean);
    for (const w of next.slice(0, 3)) {
      if (FILLER.test(w)) continue;
      if (SET.has(w.toLowerCase())) found.push(`${m[0].trim()} ${w}`);
      break;
    }
  }
  return found;
}

/**
 * Aucun des textes ne porte d'accord genré adressé à l'enfant. 0 toléré.
 * `texts` : toutes les chaînes vues ou entendues par l'enfant (banques, consignes, explications).
 * `firstPerson` : vérifier aussi le « je » (voir `genderedAgreements`).
 */
export function checkEpicene(texts, { label = 'textes', firstPerson = false } = {}) {
  const bad = [];
  for (const t of texts) {
    for (const hit of genderedAgreements(t, { firstPerson })) bad.push(`« ${hit} » dans « ${t} »`);
  }
  assert.deepEqual(bad, [], `${label} : accord genré adressé à l'enfant (le jeu est pour les filles ET les garçons)`);
  return bad.length;
}

/** Toutes les chaînes qu'une question montre ou fait lire à l'enfant. */
export function textsOfQuestion(q) {
  const d = q.display || {};
  const show = d.show || {};
  return [
    q.prompt, q.speak, q.explain, show.text, show.speak,
    ...(d.choices || []).map((c) => c && c.text),
    ...(d.items || []).map((i) => (typeof i === 'string' ? i : i && i.text)),
  ].filter(Boolean);
}
