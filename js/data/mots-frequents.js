// Mots fréquents du CE1 (mots-outils invariables, d'après les listes Eduscol de fréquence) et
// homophones à ne jamais proposer ensemble quand la voix lit un mot. Données pures, sans DOM.
// Réutilisable par « Lecture éclair » (E3-T5) et par les mots invariables (E6-T4).
// Écartés volontairement : « tous », « plus », « fois » (prononciation variable).

const RAW = `
avec dans pour sans sous sur chez vers entre depuis pendant avant après devant derrière contre
mais donc car parce-que quand comme aussi alors encore toujours jamais souvent beaucoup très trop
peu assez moins bien mal déjà maintenant ensuite puis enfin aujourd'hui demain hier ici là où
pourquoi comment oui non rien dedans dehors dessus dessous loin près partout bientôt longtemps
ensemble autour surtout vite
`;

/** Les mots-outils : [{ word, text }] ; `text` est l'écriture à l'écran (« parce que »). */
export const MOTS_FREQUENTS = Object.freeze(RAW.trim().split(/\s+/).map((w) => Object.freeze({
  word: w,
  text: w.replace('-', ' '),
})));

/** Familles de mots qui se prononcent pareil : deux mots d'une famille ne vont jamais ensemble. */
export const HOMOPHONES = Object.freeze([
  ['vers', 'vert', 'verre', 'ver'], ['dans', 'dent'], ['sans', 'sang', 'cent'], ['près', 'pré', 'prêt'],
  ['peu', 'peut', 'peux'], ['donc', 'don', 'dont'], ['non', 'nom'], ['où', 'ou'], ['là', 'la'],
  ['mal', 'malle'], ['mais', 'mes', 'mets', 'met', 'mai'], ['très', 'trait'], ['sur', 'sûr'],
  ['quand', 'camp', 'quant'], ['sous', 'sou'], ['puis', 'puits'], ['car', 'quart'], ['si', 'scie', 'ci'],
  ['et', 'est'], ['pain', 'pin', 'peint'], ['main', 'mein'], ['cœur', 'chœur'], ['pont', 'pond'],
  ['vent', 'van', 'vend'], ['tente', 'tante'], ['bois', 'boit'], ['doigt', 'dois', 'doit'],
  ['chat', 'chas'], ['loup', 'loue'], ['coq', 'coque'], ['tant', 'temps', 'tend'], ['mois', 'moi'],
  ['ail', 'aille'], ['poule', 'pool'], ['chant', 'champ'], ['chaîne', 'chêne'], ['sain', 'saint', 'sein'],
  ['cou', 'coup', 'coût'], ['fée', 'fait'], ['bon', 'bond'], ['lait', 'laid'], ['faim', 'fin'],
  ['seau', 'saut', 'sot'], ['mer', 'mère', 'maire'], ['cygne', 'signe'], ['rail', 'raille'],
]);

const GROUP_OF = new Map();
HOMOPHONES.forEach((group, i) => group.forEach((w) => GROUP_OF.set(w, [...(GROUP_OF.get(w) || []), i])));

/** Vrai si les deux mots se prononcent pareil d'après la liste (un mot et lui-même : vrai). */
export function sameSound(a, b) {
  if (a === b) return true;
  const ga = GROUP_OF.get(a);
  return Boolean(ga && (GROUP_OF.get(b) || []).some((i) => ga.includes(i)));
}
