// Mixité : aucun texte adressé à l'enfant qui joue ne doit porter un accord genré (#107).
// On ne sait pas qui joue. « Comme tu es grand ! » exclut la moitié des enfants ; « Comme tu es
// rapide ! » n'exclut personne. Règle du projet (CLAUDE.md) : 0 toléré.
//
// Ce helper est lui-même testé (tests/epicene.test.js) avec des sondes positives ET négatives : une
// première version promettait plus qu'elle ne tenait (15 contournements sur 20 sondes — « Tu es le
// premier », « Tu sembles content », « Tu es rapide et fort »…). Un helper trop permissif est pire
// que pas de helper : chaque jeu qui « passe » donne une fausse assurance.
import assert from 'node:assert/strict';

/** Adjectifs, participes et noms d'attribut à forme genrée, au masculin ET au féminin. */
export const GENDERED = [
  'grand', 'grande', 'petit', 'petite', 'content', 'contente', 'prêt', 'prête',
  'beau', 'belle', 'joli', 'jolie', 'gentil', 'gentille', 'fort', 'forte',
  'heureux', 'heureuse', 'mignon', 'mignonne', 'sûr', 'sûre', 'fatigué', 'fatiguée',
  'assis', 'assise', 'seul', 'seule', 'premier', 'première', 'dernier', 'dernière',
  'mêlé', 'mêlée', 'allé', 'allée', 'venu', 'venue', 'parti', 'partie', 'né', 'née',
  'doué', 'douée', 'poli', 'polie', 'sérieux', 'sérieuse', 'curieux', 'curieuse',
  'malin', 'maligne', 'bavard', 'bavarde', 'savant', 'savante', 'nouveau', 'nouvelle',
  // Manqués par la première version, relevés par le juge :
  'meilleur', 'meilleure', 'fier', 'fière', 'courageux', 'courageuse',
  'champion', 'championne', 'attentif', 'attentive', 'calme', 'rapide',
  'adroit', 'adroite', 'maladroit', 'maladroite', 'patient', 'patiente',
  'gourmand', 'gourmande', 'généreux', 'généreuse', 'créatif', 'créative',
  'appliqué', 'appliquée', 'distrait', 'distraite', 'rêveur', 'rêveuse',
  'inquiet', 'inquiète', 'triste', 'surpris', 'surprise', 'étonné', 'étonnée',
  'grandi', 'grandie', 'arrivé', 'arrivée', 'resté', 'restée', 'tombé', 'tombée',
].filter((w) => !['calme', 'rapide', 'triste'].includes(w)); // épicènes : ne jamais les signaler

const SET = new Set(GENDERED);

/**
 * Formules qui attribuent une qualité à l'enfant. Le « tu » le désigne toujours ; l'impératif aussi
 * (« Sois attentif »). Il en faut beaucoup : limiter la détection à « tu es » laissait passer
 * « Tu sembles content », « Tu parais fatigué », « Tu as été très courageuse ».
 */
const ADDRESS = new RegExp([
  'tu\\s+es', 'es-tu', "t'es", 'tu\\s+étais', 'tu\\s+seras', 'tu\\s+serais',
  'tu\\s+as\\s+été', 'tu\\s+avais\\s+été', 'tu\\s+as\\s+l\'air', 'tu\\s+te\\s+sens',
  'tu\\s+sembles', 'tu\\s+parais', 'tu\\s+deviens', 'tu\\s+restes', 'tu\\s+resteras',
  'te\\s+voilà', 'sois', 'soyez', 'tu\\s+me\\s+parais', 'tu\\s+as\\s+l\'air\\s+d\'être',
].join('|'), 'gi');

/** Le « je » de l'enfant — mais dans une devinette c'est l'objet qui parle, d'où l'option. */
const FIRST_PERSON = /\b(je\s+suis|je\s+serai|j'étais|j'ai\s+été|je\s+me\s+sens|je\s+deviens)\b/gi;

// Mots qu'on traverse sans décider : intensifs, articles, coordinations.
const SKIP = /^(très|si|trop|bien|vraiment|tout|toute|plus|moins|assez|le|la|les|un|une|et|ou|aussi|déjà|encore|toujours|vite)$/i;
// Mots qui ferment l'attribution : ce qui suit parle d'autre chose (« Tu es dans la belle maison »).
const STOP = /^(dans|sur|sous|avec|chez|pour|par|en|vers|depuis|pendant|comme|que|qui|quand|car|mais|à|au|aux|de|du|des)$/i;

/**
 * Accords genrés trouvés dans un texte adressé à l'enfant. Renvoie la liste des formulations fautives.
 * On lit plusieurs mots après la formule (et pas seulement le premier : « Tu es rapide et fort » cache
 * l'accord en deuxième position), en s'arrêtant à une préposition ou à la fin de la proposition.
 */
export function genderedAgreements(text, { firstPerson = false } = {}) {
  const s = String(text || '');
  const found = [];
  const patterns = firstPerson ? [ADDRESS, FIRST_PERSON] : [ADDRESS];
  for (const re of patterns) {
    re.lastIndex = 0;
    for (const m of [...s.matchAll(re)]) {
      const after = s.slice(m.index + m[0].length);
      const clause = after.split(/[.!?;:«»]/)[0];
      const next = clause.split(/[^A-Za-zÀ-ÿ'-]+/).filter(Boolean);
      for (const w of next.slice(0, 8)) {
        if (SKIP.test(w)) continue;
        if (STOP.test(w)) break;
        if (SET.has(w.toLowerCase())) { found.push(`${m[0].trim()} … ${w}`); break; }
      }
    }
  }
  return found;
}

/**
 * Aucun des textes ne porte d'accord genré adressé à l'enfant. 0 toléré.
 * `texts` : toutes les chaînes vues ou entendues par l'enfant (banques, consignes, explications).
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
