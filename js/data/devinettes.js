// Banque des devinettes (jeu « Devinettes »). Aucune dépendance, aucun DOM.
//
// Principe : chaque chose illustrée porte deux listes d'indices (« tags ») :
//   - `is`    : ce qui est CERTAINEMENT vrai (seuls ces tags servent d'indices) ;
//   - `maybe` : ce qui est discutable ou vrai « à peu près » (jamais utilisé comme indice, mais
//               empêche la chose de servir d'intrus : on ne propose pas un indice qu'elle pourrait vérifier).
// Un intrus n'est donc accepté que s'il contredit au moins un indice sans aucune hésitation possible.
// Pour ajouter une chose : une ligne dans RAW. Pour ajouter un indice : une ligne dans TAG_ROWS.
// Genre : `{vert|verte}` = forme au masculin | au féminin (voir `render`).

/** [id, genre d'indice, phrase de la devinette, phrase qui dit pourquoi une autre chose ne convient pas] */
const TAG_ROWS = [
  // Ce qu'on est
  ['animal', 'cat', 'Je suis un animal.', "n'est pas un animal."],
  ['fruit', 'cat', 'Je suis un fruit.', "n'est pas un fruit."],
  ['legume', 'cat', 'Je suis un légume.', "n'est pas un légume."],
  ['vetement', 'cat', 'Je suis un vêtement.', "n'est pas un vêtement."],
  ['vehicule', 'cat', 'Je suis un véhicule.', "n'est pas un véhicule."],
  ['insecte', 'cat', 'Je suis un insecte.', "n'est pas un insecte."],
  ['oiseau', 'cat', 'Je suis un oiseau.', "n'est pas un oiseau."],
  ['arbre', 'cat', 'Je suis un arbre.', "n'est pas un arbre."],
  // Couleurs
  ['jaune', 'colour', 'Je suis jaune.', "n'est pas jaune."],
  ['rouge', 'colour', 'Je suis rouge.', "n'est pas rouge."],
  ['orange', 'colour', 'Je suis orange.', "n'est pas orange."],
  ['vert', 'colour', 'Je suis {vert|verte}.', "n'est pas {vert|verte}."],
  ['rose', 'colour', 'Je suis rose.', "n'est pas rose."],
  ['marron', 'colour', 'Je suis marron.', "n'est pas marron."],
  ['gris', 'colour', 'Je suis {gris|grise}.', "n'est pas {gris|grise}."],
  ['blanc', 'colour', 'Je suis {blanc|blanche}.', "n'est pas {blanc|blanche}."],
  ['noir', 'colour', 'Je suis {noir|noire}.', "n'est pas {noir|noire}."],
  ['bleu', 'colour', 'Je suis {bleu|bleue}.', "n'est pas {bleu|bleue}."],
  ['violet', 'colour', 'Je suis {violet|violette}.', "n'est pas {violet|violette}."],
  // Ce qu'on peut faire ou avoir
  ['aliment', 'trait', 'On me mange.', 'ne se mange pas.'],
  ['vole', 'trait', 'Je peux voler.', 'ne peut pas voler.'],
  ['nage', 'trait', "Je vis dans l'eau.", "ne vit pas dans l'eau."],
  ['pattes4', 'trait', 'Je marche sur quatre pattes.', 'ne marche pas sur quatre pattes.'],
  ['ailes', 'trait', "J'ai des ailes.", "n'a pas d'ailes."],
  ['roues', 'trait', "J'ai des roues.", "n'a pas de roues."],
  ['plumes', 'trait', "J'ai des plumes.", "n'a pas de plumes."],
  ['bec', 'trait', "J'ai un bec.", "n'a pas de bec."],
  ['cornes', 'trait', "J'ai des cornes.", "n'a pas de cornes."],
  ['oreilles', 'trait', "J'ai de très longues oreilles.", "n'a pas de très longues oreilles."],
  ['ecailles', 'trait', "J'ai des écailles.", "n'a pas d'écailles."],
  ['nuit', 'trait', 'Je suis {réveillé|réveillée} la nuit.', "n'est pas {réveillé|réveillée} la nuit."],
  ['rampe', 'trait', 'Je rampe sur le sol.', 'ne rampe pas sur le sol.'],
  ['siffle', 'trait', 'Je siffle.', 'ne siffle pas.'],
  ['galope', 'trait', 'Je peux galoper.', 'ne galope pas.'],
  ['grogne', 'trait', 'Je grogne.', 'ne grogne pas.'],
  ['bele', 'trait', 'Je fais « bêê ».', 'ne fait pas « bêê ».'],
  ['pique', 'trait', 'Je peux piquer.', 'ne pique pas.'],
  ['minuscule', 'trait', 'Je suis minuscule.', "n'est pas minuscule."],
  ['epluche', 'trait', "On m'épluche avant de me manger.", "ne s'épluche pas."],
  ['pepins', 'trait', "J'ai des pépins.", "n'a pas de pépins."],
  ['sucre', 'trait', 'Je suis {sucré|sucrée}.', "n'est pas {sucré|sucrée}."],
  ['acide', 'trait', 'Je suis très acide.', "n'est pas acide."],
  ['terre', 'trait', 'Je pousse sous la terre.', 'ne pousse pas sous la terre.'],
  ['route', 'trait', 'Je roule sur la route.', 'ne roule pas sur la route.'],
  ['sonne', 'trait', 'Je sonne.', 'ne sonne pas.'],
  ['ciel', 'trait', 'Je brille dans le ciel.', 'ne brille pas dans le ciel.'],
  ['brule', 'trait', 'Je brûle.', 'ne brûle pas.'],
  ['habiter', 'trait', 'On peut habiter chez moi.', "n'est pas un endroit où habiter."],
  ['toit', 'trait', "J'ai un toit.", "n'a pas de toit."],
  // Indices qui désignent presque une seule chose
  ['singes', 'sign', "Les singes m'adorent.", 'ne plaît pas particulièrement aux singes.'],
  ['bananes', 'sign', "J'adore les bananes.", "n'adore pas les bananes."],
  ['lapins', 'sign', "Les lapins m'adorent.", 'ne plaît pas particulièrement aux lapins.'],
  ['carottes', 'sign', "J'adore les carottes.", "n'adore pas les carottes."],
  ['fromage', 'sign', "J'adore le fromage.", "n'adore pas le fromage."],
  ['miel_aime', 'sign', "J'adore le miel.", "n'adore pas le miel."],
  ['miel_fait', 'sign', 'Je fabrique du miel.', 'ne fabrique pas de miel.'],
  ['bambou', 'sign', 'Je mange du bambou.', 'ne mange pas de bambou.'],
  ['hurle', 'sign', 'Je hurle à la lune.', 'ne hurle pas à la lune.'],
  ['coasse', 'sign', 'Je coasse.', 'ne coasse pas.'],
  ['poche', 'sign', "J'ai une poche sur le ventre.", "n'a pas de poche sur le ventre."],
  ['bonds', 'sign', 'Je fais de grands bonds.', 'ne fait pas de grands bonds.'],
  ['rugit', 'sign', 'Je rugis.', 'ne rugit pas.'],
  ['criniere', 'sign', "J'ai une grande crinière.", "n'a pas de grande crinière."],
  ['bosse', 'sign', "J'ai des bosses sur le dos.", "n'a pas de bosses sur le dos."],
  ['desert', 'sign', 'Je vis dans le désert.', 'ne vit pas dans le désert.'],
  ['noisette', 'sign', "J'adore les noisettes.", "n'adore pas les noisettes."],
  ['queue', 'sign', "J'ai une grande queue touffue.", "n'a pas de grande queue touffue."],
  ['toile', 'sign', 'Je fabrique une toile.', 'ne fabrique pas de toile.'],
  ['huit', 'sign', "J'ai huit pattes.", "n'a pas huit pattes."],
  ['aileron', 'sign', "J'ai un grand aileron sur le dos.", "n'a pas de grand aileron sur le dos."],
  ['miaule', 'sign', 'Je miaule.', 'ne miaule pas.'],
  ['aboie', 'sign', "J'aboie.", "n'aboie pas."],
  ['lait', 'sign', 'Je donne du lait.', 'ne donne pas de lait.'],
  ['laine', 'sign', "J'ai de la laine.", "n'a pas de laine."],
  ['trompe', 'sign', "J'ai une très longue trompe.", "n'a pas de trompe."],
  ['metamorphose', 'sign', "Avant, j'étais une chenille.", "n'était pas une chenille avant."],
  ['devenir', 'sign', 'Je vais devenir un papillon.', 'ne deviendra pas un papillon.'],
  ['colonie', 'sign', 'Je vis avec des milliers de copines sous la terre.', 'ne vit pas avec des milliers de copines.'],
  ['grains', 'sign', "J'ai des petits grains sur la peau.", "n'a pas de petits grains sur la peau."],
  ['noyau', 'sign', "J'ai un gros noyau.", "n'a pas de gros noyau."],
  ['grappe', 'sign', 'Je pousse en grappe.', 'ne pousse pas en grappe.'],
  ['foret', 'sign', 'On me trouve dans la forêt.', 'ne se trouve pas dans la forêt.'],
  ['tete', 'sign', 'On me met sur la tête.', 'ne se met pas sur la tête.'],
  ['pieds', 'sign', 'On me met aux pieds.', 'ne se met pas aux pieds.'],
  ['mains', 'sign', 'On me met aux mains.', 'ne se met pas aux mains.'],
  ['jambes', 'sign', 'On me met sur les jambes.', 'ne se met pas sur les jambes.'],
  ['froid', 'sign', 'Je protège du froid.', 'ne protège pas du froid.'],
  ['roi', 'sign', 'Un roi me porte.', "n'est pas porté par un roi."],
  ['boulangerie', 'sign', "On m'achète à la boulangerie.", "ne s'achète pas à la boulangerie."],
  ['coquille', 'sign', "J'ai une coquille.", "n'a pas de coquille."],
  ['pond', 'sign', 'Une poule me pond.', "n'est pas pondu par une poule."],
  ['tartine', 'sign', 'On me tartine sur du pain.', 'ne se tartine pas sur du pain.'],
  ['papier', 'sign', "On m'enlève un papier avant de me manger.", "n'a pas de papier à enlever."],
  ['lune', 'sign', 'Je ressemble à la lune quand elle est toute fine.', 'ne ressemble pas à la lune toute fine.'],
  ['lacets', 'sign', "J'ai des lacets.", "n'a pas de lacets."],
  ['manches', 'sign', "J'ai des manches.", "n'a pas de manches."],
  ['rails', 'sign', 'Je roule sur des rails.', 'ne roule pas sur des rails.'],
  ['champs', 'sign', 'Je travaille dans les champs.', 'ne travaille pas dans les champs.'],
  ['transporte', 'sign', 'Je transporte des marchandises.', 'ne transporte pas de marchandises.'],
  ['heure', 'sign', "Je donne l'heure.", "ne donne pas l'heure."],
  ['matin', 'sign', 'Je te dis de te lever le matin.', 'ne dit pas de se lever le matin.'],
  ['foot', 'sign', 'On joue au foot avec moi.', 'ne sert pas à jouer au foot.'],
  ['soupe', 'sign', 'On me prend pour manger la soupe.', 'ne sert pas à manger la soupe.'],
  ['chauffe', 'sign', 'Je chauffe la Terre.', 'ne chauffe pas la Terre.'],
  ['brille_nuit', 'sign', 'Je brille la nuit.', 'ne brille pas la nuit.'],
  ['cheminee', 'sign', "J'ai une cheminée.", "n'a pas de cheminée."],
  ['rois', 'sign', 'Des rois ont habité chez moi.', "n'a pas été habité par des rois."],
  ['camping', 'sign', 'On dort dedans en camping.', 'ne sert pas à dormir en camping.'],
  ['noel', 'sign', 'On me décore à Noël.', 'ne se décore pas à Noël.'],
  ['petales', 'sign', "J'ai des pétales.", "n'a pas de pétales."],
  ['parfum', 'sign', 'Je sens bon.', 'ne sent pas particulièrement bon.'],
  ['baguettes', 'sign', 'On me frappe avec des baguettes.', 'ne se frappe pas avec des baguettes.'],
  ['boum', 'sign', 'Je fais « boum ».', 'ne fait pas « boum ».'],
];

export const TAGS = Object.freeze(Object.fromEntries(TAG_ROWS.map(([id, kind, me, not]) =>
  [id, Object.freeze({ id, kind, me, not })])));

/** Ordre de lecture d'une devinette : le plus général d'abord, le plus précis à la fin. */
export const KIND_RANK = { cat: 0, colour: 1, trait: 2, sign: 3 };

// [mot, déterminant, émoji, indices certains, indices discutables]
// Le déterminant donne le genre : « un » = masculin, « une » = féminin.
const RAW = [
  // Animaux
  ['chat', 'un', '🐱', 'animal pattes4 miaule', 'gris marron jaune orange noir blanc nuit'],
  ['chien', 'un', '🐶', 'animal pattes4 aboie', 'marron jaune blanc noir gris hurle'],
  ['cheval', 'un', '🐴', 'animal pattes4 galope', 'marron noir blanc gris criniere carottes'],
  ['vache', 'une', '🐮', 'animal pattes4 lait cornes', 'blanc noir marron aliment'],
  ['cochon', 'un', '🐷', 'animal pattes4 rose grogne', 'aliment'],
  ['mouton', 'un', '🐑', 'animal pattes4 laine bele', 'blanc gris cornes aliment lait'],
  ['chèvre', 'une', '🐐', 'animal pattes4 cornes lait bele', 'blanc gris marron'],
  ['lapin', 'un', '🐰', 'animal pattes4 oreilles carottes', 'blanc gris marron aliment bonds'],
  ['souris', 'une', '🐭', 'animal pattes4 fromage', 'gris blanc marron noisette'],
  ['singe', 'un', '🐵', 'animal bananes marron', 'pattes4 noir gris'],
  ['lion', 'un', '🦁', 'animal pattes4 rugit criniere', 'jaune marron orange'],
  ['éléphant', 'un', '🐘', 'animal pattes4 trompe gris', 'oreilles'],
  ['ours', 'un', '🐻', 'animal pattes4 marron miel_aime', 'rugit foret noir bananes'],
  ['panda', 'un', '🐼', 'animal pattes4 bambou blanc noir', ''],
  ['loup', 'un', '🐺', 'animal pattes4 hurle gris', 'blanc noir marron nuit foret'],
  ['grenouille', 'une', '🐸', 'animal vert coasse', 'nage pattes4 bonds'],
  ['serpent', 'un', '🐍', 'animal rampe siffle', 'vert marron jaune noir ecailles'],
  ['poisson', 'un', '🐟', 'animal nage ecailles bleu', 'gris jaune orange aliment aileron'],
  ['requin', 'un', '🦈', 'animal nage aileron gris', 'bleu ecailles'],
  ['abeille', 'une', '🐝', 'animal insecte vole ailes pique miel_fait jaune noir', 'minuscule'],
  ['papillon', 'un', '🦋', 'animal insecte vole ailes metamorphose', 'bleu orange rose rouge jaune blanc noir vert minuscule'],
  ['fourmi', 'une', '🐜', 'animal insecte minuscule colonie', 'noir rouge marron pique'],
  ['araignée', 'une', '🕷️', 'animal huit toile noir', 'insecte pique minuscule rampe'],
  ['kangourou', 'un', '🦘', 'animal poche bonds', 'marron gris pattes4'],
  ['chameau', 'un', '🐫', 'animal pattes4 bosse desert', 'marron jaune'],
  ['écureuil', 'un', '🐿️', 'animal pattes4 noisette queue', 'marron orange foret'],
  ['oiseau', 'un', '🐦', 'animal vole ailes plumes bec', 'oiseau bleu noir marron'],
  ['hibou', 'un', '🦉', 'animal oiseau vole ailes plumes bec nuit', 'marron gris'],
  ['chenille', 'une', '🐛', 'animal vert rampe devenir', 'insecte minuscule'],
  ['mouche', 'une', '🪰', 'animal insecte vole ailes', 'noir gris minuscule'],
  ['moustique', 'un', '🦟', 'animal insecte vole ailes pique', 'noir gris minuscule'],
  // Fruits et légumes
  ['banane', 'une', '🍌', 'fruit aliment jaune singes sucre epluche', ''],
  ['pomme', 'une', '🍎', 'fruit aliment rouge pepins', 'sucre vert epluche'],
  ['poire', 'une', '🍐', 'fruit aliment vert pepins', 'jaune sucre epluche'],
  ['fraise', 'une', '🍓', 'fruit aliment rouge grains', 'sucre pepins'],
  ['citron', 'un', '🍋', 'fruit aliment jaune acide pepins', 'epluche vert'],
  ['orange', 'une', '🍊', 'fruit aliment epluche pepins', 'orange sucre acide jaune'],
  ['pêche', 'une', '🍑', 'fruit aliment noyau', 'rose orange jaune sucre epluche'],
  ['melon', 'un', '🍈', 'fruit aliment pepins', 'vert jaune sucre epluche'],
  ['raisin', 'un', '🍇', 'fruit aliment grappe violet', 'sucre pepins vert'],
  ['carotte', 'une', '🥕', 'legume aliment orange terre lapins', 'epluche'],
  ['pomme de terre', 'une', '🥔', 'legume aliment marron terre epluche', ''],
  ['concombre', 'un', '🥒', 'legume aliment vert', 'epluche pepins'],
  ['poivron', 'un', '🫑', 'legume aliment vert', 'rouge jaune orange pepins'],
  ['ail', 'un', '🧄', 'legume aliment blanc terre', 'epluche'],
  // Aliments
  ['pain', 'un', '🍞', 'aliment boulangerie marron', 'jaune'],
  ['croissant', 'un', '🥐', 'aliment boulangerie lune', 'marron jaune sucre orange'],
  ['chocolat', 'un', '🍫', 'aliment marron sucre', 'tartine papier'],
  ['œuf', 'un', '🥚', 'aliment blanc coquille pond', 'marron'],
  ['bonbon', 'un', '🍬', 'aliment sucre papier', 'rose bleu rouge'],
  ['beurre', 'du', '🧈', 'aliment jaune tartine', 'blanc'],
  // Vêtements
  ['chapeau', 'un', '🎩', 'vetement tete noir', 'froid marron'],
  ['chaussure', 'une', '👟', 'vetement pieds lacets', 'blanc bleu marron noir rouge'],
  ['chaussette', 'une', '🧦', 'vetement pieds', 'froid jambes blanc rouge bleu'],
  ['gant', 'un', '🧤', 'vetement mains froid', 'blanc rouge bleu noir marron'],
  ['manteau', 'un', '🧥', 'vetement froid manches', 'marron bleu rouge noir gris vert'],
  ['pantalon', 'un', '👖', 'vetement jambes bleu', 'froid noir gris marron'],
  ['couronne', 'une', '👑', 'tete roi jaune', 'vetement'],
  // Véhicules
  ['voiture', 'une', '🚗', 'vehicule roues route rouge', 'transporte bleu'],
  ['camion', 'un', '🚚', 'vehicule roues route transporte', 'orange blanc'],
  ['tracteur', 'un', '🚜', 'vehicule roues champs', 'route rouge vert transporte jaune orange'],
  ['train', 'un', '🚂', 'vehicule roues rails', 'transporte noir gris rouge bleu'],
  ['avion', 'un', '✈️', 'vehicule vole ailes', 'transporte blanc bleu gris'],
  // Objets, maisons, nature
  ['cloche', 'une', '🔔', 'sonne jaune', 'orange'],
  ['réveil', 'un', '⏰', 'sonne heure matin', 'rouge'],
  ['ballon', 'un', '⚽', 'foot blanc noir', 'rouge'],
  ['cuillère', 'une', '🥄', 'soupe gris', ''],
  ['soleil', 'un', '☀️', 'ciel jaune chauffe', 'orange brule'],
  ['étoile', 'une', '⭐', 'ciel jaune brille_nuit', ''],
  ['feu', 'un', '🔥', 'brule rouge orange', 'jaune chauffe'],
  ['maison', 'une', '🏠', 'habiter toit cheminee', 'rouge marron blanc'],
  ['château', 'un', '🏰', 'habiter toit rois', 'cheminee gris marron blanc'],
  ['tente', 'une', '⛺', 'habiter camping', 'toit blanc orange vert rouge'],
  ['sapin', 'un', '🎄', 'arbre vert noel foret', ''],
  ['fleur', 'une', '🌼', 'petales jaune parfum', 'blanc'],
  ['tambour', 'un', '🥁', 'baguettes boum', 'rouge marron jaune'],
];

const list = (s) => (s ? s.split(' ') : []);

/** Une chose illustrée : { word, det, gender, emoji, is: Set, maybe: Set, fits: Set (is + maybe) }. */
export const THINGS = Object.freeze(RAW.map(([word, det, emoji, is, maybe]) => {
  const isSet = new Set(list(is));
  const maybeSet = new Set(list(maybe));
  return Object.freeze({
    word, det, emoji,
    gender: det === 'une' ? 'f' : 'm',
    is: isSet,
    maybe: maybeSet,
    fits: new Set([...isSet, ...maybeSet]),
  });
}));

const BY_WORD = new Map(THINGS.map((t) => [t.word, t]));
export const findThing = (word) => BY_WORD.get(word) || null;

/** Images qu'une enfant pourrait confondre : jamais côte à côte à l'écran. */
export const CONFUSABLE = [
  ['chien', 'loup'], ['chat', 'lion'], ['mouton', 'chèvre'], ['ours', 'panda'], ['lapin', 'souris'],
  ['abeille', 'mouche'], ['mouche', 'moustique'], ['abeille', 'moustique'], ['fourmi', 'araignée'],
  ['serpent', 'chenille'], ['poisson', 'requin'], ['oiseau', 'hibou'], ['cheval', 'chameau'],
  ['orange', 'pêche'], ['orange', 'carotte'], ['melon', 'concombre'], ['poire', 'citron'], ['pomme', 'fraise'],
  ['poivron', 'concombre'], ['pomme de terre', 'ail'], ['pain', 'croissant'], ['chocolat', 'bonbon'],
  ['chaussure', 'chaussette'], ['maison', 'château'], ['maison', 'tente'], ['soleil', 'étoile'],
  ['soleil', 'feu'], ['cloche', 'réveil'], ['voiture', 'camion'], ['camion', 'tracteur'],
  ['banane', 'citron'], ['fleur', 'soleil'], ['poire', 'melon'],
];
const CONFUSE = new Set(CONFUSABLE.map(([a, b]) => [a, b].sort().join('|')));
export const confusable = (a, b) => CONFUSE.has([a, b].sort().join('|'));

/** « un chat » / « une pomme ». */
export const indefinite = (t) => `${t.det} ${t.word}`;  // « du beurre » pour un aliment qu'on ne compte pas
/** « le chat » / « la pomme » / « l'ail ». */
export function definite(t) {
  const aspirated = ['hibou'];
  if (/^[aeiouyéèêœ]/i.test(t.word) && !aspirated.includes(t.word)) return `l'${t.word}`;
  return (t.gender === 'f' ? 'la ' : 'le ') + t.word;
}

/** Accorde « {vert|verte} » selon le genre de la chose qui parle. */
export function render(text, gender) {
  return text.replace(/\{([^|}]*)\|([^}]*)\}/g, (_, m, f) => (gender === 'f' ? f : m));
}
/** L'indice tel que la chose le dit (« Je suis verte. »). */
export const clueText = (tag, thing) => render(TAGS[tag].me, thing.gender);
/** Pourquoi une autre chose ne convient pas (« La pomme n'est pas jaune. »). */
export function whyNot(tag, thing) {
  const s = `${definite(thing)} ${render(TAGS[tag].not, thing.gender)}`;
  return s[0].toUpperCase() + s.slice(1);
}

/** La chose vérifie-t-elle (ou pourrait-elle vérifier) tous ces indices ? */
export const fitsAll = (thing, tags) => tags.every((t) => thing.fits.has(t));
/** Les indices qu'une chose contredit sans hésitation. */
export const contradicted = (thing, tags) => tags.filter((t) => !thing.fits.has(t));
