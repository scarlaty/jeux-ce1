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
  ['main', 'trait', 'Je tiens dans la main.', 'ne tient pas dans la main.'],
  ['grand', 'trait', 'Je suis très {grand|grande}.', "n'est pas très {grand|grande}."],
  ['ferme', 'trait', 'On me trouve à la ferme.', 'ne se trouve pas à la ferme.'],
  ['poils', 'trait', "J'ai des poils.", "n'a pas de poils."],
  ['rond', 'trait', 'Je suis {rond|ronde}.', "n'est pas {rond|ronde}."],
  ['passagers', 'trait', 'Je transporte des gens.', 'ne transporte pas de gens.'],
  ['flotte', 'trait', 'Je flotte sur l\'eau.', 'ne flotte pas sur l\'eau.'],
  ['cou', 'sign', "J'ai un très long cou.", "n'a pas de très long cou."],
  ['carapace', 'sign', "J'ai une carapace.", "n'a pas de carapace."],
  ['rayures', 'sign', "J'ai des rayures.", "n'a pas de rayures."],
  ['pedales', 'sign', "J'ai des pédales.", "n'a pas de pédales."],
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
  ['roi', 'sign', 'Un roi me porte.', "n'est pas {porté|portée} par un roi."],
  ['boulangerie', 'sign', "On m'achète à la boulangerie.", "ne s'achète pas à la boulangerie."],
  ['coquille', 'sign', "J'ai une coquille.", "n'a pas de coquille."],
  ['pond', 'sign', 'Une poule me pond.', "n'est pas {pondu|pondue} par une poule."],
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
  ['rois', 'sign', 'Des rois ont habité chez moi.', "n'a pas été {habité|habitée} par des rois."],
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

// [mot, déterminant, genre, émoji, indices certains, indices discutables]
// Le déterminant (« un », « une », « du », « de l' ») et le genre (m | f) sont indépendants : « du raisin »,
// « de l'ail » sont masculins sans être « un ». Le genre sert aux accords (`render`), le déterminant à la phrase.
const RAW = [
  // Animaux
  ['chat', 'un', 'm', '🐱', 'animal pattes4 miaule poils', 'gris marron jaune orange noir blanc nuit ferme rayures bonds'],
  ['chien', 'un', 'm', '🐶', 'animal pattes4 aboie poils', 'marron jaune blanc noir gris hurle grand ferme'],
  ['cheval', 'un', 'm', '🐴', 'animal pattes4 galope grand ferme poils', 'marron noir blanc gris criniere carottes aliment bonds'],
  ['vache', 'une', 'f', '🐮', 'animal pattes4 lait cornes grand ferme poils', 'blanc noir marron aliment carottes'],
  ['cochon', 'un', 'm', '🐷', 'animal pattes4 rose grogne ferme', 'aliment grand poils carottes'],
  ['mouton', 'un', 'm', '🐑', 'animal pattes4 laine bele ferme', 'blanc gris cornes aliment lait grand poils carottes'],
  ['chèvre', 'une', 'f', '🐐', 'animal pattes4 cornes lait bele ferme poils', 'blanc gris marron aliment grand bonds carottes'],
  ['lapin', 'un', 'm', '🐰', 'animal pattes4 oreilles carottes poils', 'blanc gris marron aliment bonds grand ferme'],
  ['souris', 'une', 'f', '🐭', 'animal pattes4 fromage main poils', 'gris blanc marron noisette minuscule ferme'],
  ['singe', 'un', 'm', '🐵', 'animal bananes marron poils', 'pattes4 noir gris grand bonds'],
  ['lion', 'un', 'm', '🦁', 'animal pattes4 rugit criniere poils', 'jaune marron orange grand bonds'],
  ['éléphant', 'un', 'm', '🐘', 'animal pattes4 trompe gris grand', 'oreilles poils carottes foret ferme'],
  ['ours', 'un', 'm', '🐻', 'animal pattes4 marron miel_aime grand poils', 'rugit foret noir bananes'],
  ['panda', 'un', 'm', '🐼', 'animal pattes4 bambou blanc noir poils', 'grand'],
  ['loup', 'un', 'm', '🐺', 'animal pattes4 hurle gris poils', 'blanc noir marron nuit foret grand bonds'],
  ['grenouille', 'une', 'f', '🐸', 'animal vert coasse', 'nage pattes4 bonds main aliment foret'],
  ['serpent', 'un', 'm', '🐍', 'animal rampe siffle', 'vert marron jaune noir ecailles grand'],
  ['poisson', 'un', 'm', '🐟', 'animal nage ecailles bleu', 'gris jaune orange aliment aileron main flotte rayures'],
  ['requin', 'un', 'm', '🦈', 'animal nage aileron gris grand', 'bleu ecailles flotte aliment'],
  ['abeille', 'une', 'f', '🐝', 'animal insecte vole ailes pique miel_fait jaune noir main', 'minuscule ferme poils rayures foret'],
  ['papillon', 'un', 'm', '🦋', 'animal insecte vole ailes metamorphose main', 'bleu orange rose rouge jaune blanc noir vert minuscule foret'],
  ['fourmi', 'une', 'f', '🐜', 'animal insecte minuscule colonie main', 'noir rouge marron pique ferme foret'],
  ['araignée', 'une', 'f', '🕷️', 'animal huit toile noir main', 'insecte pique minuscule rampe poils ferme foret'],
  ['kangourou', 'un', 'm', '🦘', 'animal poche bonds poils', 'marron gris pattes4 grand aliment'],
  ['chameau', 'un', 'm', '🐫', 'animal pattes4 bosse desert grand poils', 'marron jaune cou'],
  ['écureuil', 'un', 'm', '🐿️', 'animal pattes4 noisette queue poils', 'marron orange foret main rayures rouge'],
  ['oiseau', 'un', 'm', '🐦', 'animal vole ailes plumes bec', 'oiseau bleu noir marron main ferme cou blanc vert minuscule'],
  ['hibou', 'un', 'm', '🦉', 'animal oiseau vole ailes plumes bec nuit', 'marron gris cou ferme'],
  ['chenille', 'une', 'f', '🐛', 'animal vert rampe devenir main', 'insecte minuscule poils ferme foret'],
  ['mouche', 'une', 'f', '🪰', 'animal insecte vole ailes main', 'noir gris minuscule ferme foret'],
  ['moustique', 'un', 'm', '🦟', 'animal insecte vole ailes pique main', 'noir gris minuscule ferme foret'],
  // Fruits et légumes
  ['banane', 'une', 'f', '🍌', 'fruit aliment jaune singes sucre epluche main', 'blanc vert'],
  ['pomme', 'une', 'f', '🍎', 'fruit aliment rouge pepins main rond', 'sucre vert epluche jaune acide blanc'],
  ['poire', 'une', 'f', '🍐', 'fruit aliment vert pepins main', 'jaune sucre epluche'],
  ['fraise', 'une', 'f', '🍓', 'fruit aliment rouge grains main', 'sucre pepins rond minuscule'],
  ['citron', 'un', 'm', '🍋', 'fruit aliment jaune acide pepins main', 'epluche vert rond'],
  ['orange', 'une', 'f', '🍊', 'fruit aliment epluche pepins main rond', 'orange sucre acide jaune vert'],
  ['pêche', 'une', 'f', '🍑', 'fruit aliment noyau main rond', 'rose orange jaune sucre epluche rouge'],
  ['raisin', 'du', 'm', '🍇', 'fruit aliment grappe violet', 'sucre pepins vert main rond jaune rouge'],
  ['carotte', 'une', 'f', '🥕', 'legume aliment orange terre lapins main', 'epluche ferme sucre'],
  ['pomme de terre', 'une', 'f', '🥔', 'legume aliment marron terre epluche main', 'rond jaune'],
  ['concombre', 'un', 'm', '🥒', 'legume aliment vert', 'epluche pepins main fruit'],
  ['poivron', 'un', 'm', '🫑', 'legume aliment vert main', 'rouge jaune orange pepins fruit'],
  // Aliments
  ['pain', 'un', 'm', '🍞', 'aliment boulangerie marron', 'jaune main rond blanc'],
  ['croissant', 'un', 'm', '🥐', 'aliment boulangerie lune main', 'marron jaune sucre orange rond'],
  ['chocolat', 'un', 'm', '🍫', 'aliment marron sucre main', 'tartine papier'],
  ['œuf', 'un', 'm', '🥚', 'aliment blanc coquille pond main', 'marron rond jaune'],
  ['bonbon', 'un', 'm', '🍬', 'aliment sucre papier main', 'rose bleu rouge rond'],
  // Vêtements
  ['chapeau', 'un', 'm', '🎩', 'vetement tete noir', 'froid marron main rond jaune rouge orange vert rose gris blanc bleu violet'],
  ['chaussure', 'une', 'f', '👟', 'vetement pieds lacets', 'blanc bleu marron noir rouge main jaune orange vert rose gris violet'],
  ['chaussette', 'une', 'f', '🧦', 'vetement pieds main', 'froid jambes blanc rouge bleu rayures jaune orange vert rose marron gris noir violet'],
  ['gant', 'un', 'm', '🧤', 'vetement mains froid main', 'blanc rouge bleu noir marron jaune orange vert rose gris violet'],
  ['manteau', 'un', 'm', '🧥', 'vetement froid manches', 'marron bleu rouge noir gris vert grand main jaune orange rose blanc violet'],
  ['pantalon', 'un', 'm', '👖', 'vetement jambes bleu', 'froid noir gris marron grand main jaune rouge orange vert rose blanc violet'],
  ['couronne', 'une', 'f', '👑', 'tete roi jaune', 'vetement rond main'],
  // Véhicules
  ['voiture', 'une', 'f', '🚗', 'vehicule roues route passagers', 'transporte bleu grand jaune rouge orange vert rose marron gris blanc noir violet'],
  ['camion', 'un', 'm', '🚚', 'vehicule roues route transporte grand', 'orange blanc passagers jaune rouge vert rose marron gris noir bleu violet'],
  ['tracteur', 'un', 'm', '🚜', 'vehicule roues champs grand ferme', 'route rouge vert transporte jaune orange passagers rose marron gris blanc noir bleu violet'],
  ['train', 'un', 'm', '🚂', 'vehicule roues rails grand passagers', 'transporte noir gris rouge bleu jaune orange vert rose marron blanc violet'],
  ['avion', 'un', 'm', '✈️', 'vehicule vole ailes grand passagers', 'transporte roues blanc bleu gris jaune rouge orange vert rose marron noir violet'],
  // Objets, maisons, nature
  ['cloche', 'une', 'f', '🔔', 'sonne jaune', 'orange main rond rouge vert rose marron gris blanc noir bleu violet'],
  ['réveil', 'un', 'm', '⏰', 'sonne heure matin main', 'rouge rond blanc noir jaune orange vert rose marron gris bleu violet'],
  ['ballon', 'un', 'm', '⚽', 'foot blanc noir rond', 'rouge main grand flotte jaune orange vert rose marron gris bleu violet'],
  ['cuillère', 'une', 'f', '🥄', 'soupe gris main', 'rond'],
  ['soleil', 'un', 'm', '☀️', 'ciel jaune chauffe grand rond', 'orange brule rouge blanc'],
  ['étoile', 'une', 'f', '⭐', 'ciel jaune brille_nuit', 'main'],
  ['feu', 'un', 'm', '🔥', 'brule rouge orange', 'jaune chauffe grand'],
  ['maison', 'une', 'f', '🏠', 'habiter toit cheminee grand', 'rouge marron blanc jaune orange vert rose gris noir bleu violet'],
  ['château', 'un', 'm', '🏰', 'habiter toit rois grand', 'cheminee gris marron blanc jaune rouge orange vert rose noir bleu violet'],
  ['tente', 'une', 'f', '⛺', 'habiter camping', 'toit blanc orange vert rouge grand jaune rose marron gris noir bleu violet'],
  ['sapin', 'un', 'm', '🎄', 'arbre vert noel foret grand', 'marron'],
  ['fleur', 'une', 'f', '🌼', 'petales jaune parfum', 'blanc main rouge orange vert rose marron gris noir bleu violet'],
  ['girafe', 'une', 'f', '🦒', 'animal pattes4 cou grand', 'jaune marron poils cornes'],
  ['tortue', 'une', 'f', '🐢', 'animal pattes4 carapace', 'vert marron rampe nage rond ecailles'],
  ['escargot', 'un', 'm', '🐌', 'animal rampe coquille main', 'marron jaune gris minuscule aliment'],
  ['coccinelle', 'une', 'f', '🐞', 'animal insecte vole ailes rouge noir main minuscule', ''],
  ['canard', 'un', 'm', '🦆', 'animal oiseau vole ailes plumes bec', 'nage flotte jaune blanc marron vert noir ferme aliment'],
  ['dauphin', 'un', 'm', '🐬', 'animal nage gris', 'bleu aileron grand flotte'],
  ['baleine', 'une', 'f', '🐳', 'animal nage grand bleu', 'gris flotte blanc'],
  ['crocodile', 'un', 'm', '🐊', 'animal vert ecailles pattes4', 'nage grand rampe flotte'],
  ['zèbre', 'un', 'm', '🦓', 'animal pattes4 galope rayures poils', 'noir blanc grand'],
  ['cerise', 'une', 'f', '🍒', 'fruit aliment rouge noyau main rond', 'sucre'],
  ['ananas', 'un', 'm', '🍍', 'fruit aliment epluche', 'jaune marron vert sucre acide grand'],
  ['kiwi', 'un', 'm', '🥝', 'fruit aliment vert epluche main', 'marron pepins sucre acide rond'],
  ['pastèque', 'une', 'f', '🍉', 'fruit aliment rouge', 'vert pepins sucre epluche grand rond'],
  ['brocoli', 'un', 'm', '🥦', 'legume aliment vert', 'epluche main'],
  ['vélo', 'un', 'm', '🚲', 'vehicule roues pedales', 'route rouge bleu noir passagers jaune orange vert rose marron gris blanc violet'],
  ['bus', 'un', 'm', '🚌', 'vehicule roues route passagers grand', 'jaune rouge bleu blanc orange vert rose marron gris noir violet'],
  ['bateau', 'un', 'm', '⛵', 'vehicule flotte passagers', 'nage blanc bleu grand transporte jaune rouge orange vert rose marron gris noir violet'],
  ['hélicoptère', 'un', 'm', '🚁', 'vehicule vole passagers', 'rouge blanc jaune bleu gris grand ailes roues orange vert rose marron noir violet'],
  ['moto', 'une', 'f', '🏍️', 'vehicule roues route', 'rouge noir bleu passagers jaune orange vert rose marron gris blanc violet'],
  ['casquette', 'une', 'f', '🧢', 'vetement tete', 'bleu rouge noir blanc main jaune orange vert rose marron gris violet'],
  ['t-shirt', 'un', 'm', '👕', 'vetement manches', 'blanc bleu rouge jaune vert main orange rose marron gris noir violet'],
  ['écharpe', 'une', 'f', '🧣', 'vetement froid', 'rouge bleu blanc gris marron rose main jaune orange vert noir violet'],
  ['tambour', 'un', 'm', '🥁', 'baguettes boum rond', 'rouge marron jaune main grand orange vert rose gris blanc noir bleu violet'],
];

const list = (s) => (s ? s.split(' ') : []);

/** Une chose illustrée : { word, det, gender, emoji, is: Set, maybe: Set, fits: Set (is + maybe) }. */
export const THINGS = Object.freeze(RAW.map(([word, det, gender, emoji, is, maybe]) => {
  const isSet = new Set(list(is));
  const maybeSet = new Set(list(maybe));
  return Object.freeze({
    word, det, gender, emoji,
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
  ['orange', 'pêche'], ['orange', 'carotte'], ['poire', 'citron'], ['pomme', 'fraise'],
  ['poivron', 'concombre'], ['pain', 'croissant'], ['chocolat', 'bonbon'],
  ['chaussure', 'chaussette'], ['maison', 'château'], ['maison', 'tente'], ['soleil', 'étoile'],
  ['soleil', 'feu'], ['cloche', 'réveil'], ['voiture', 'camion'], ['camion', 'tracteur'],
  ['banane', 'citron'], ['fleur', 'soleil'],
  ['cheval', 'zèbre'], ['girafe', 'chameau'], ['dauphin', 'requin'], ['dauphin', 'baleine'], ['baleine', 'poisson'],
  ['crocodile', 'serpent'], ['tortue', 'escargot'], ['coccinelle', 'fourmi'], ['coccinelle', 'abeille'], ['canard', 'oiseau'],
  ['cerise', 'fraise'], ['cerise', 'pomme'], ['kiwi', 'concombre'], ['brocoli', 'sapin'], ['bus', 'camion'], ['bus', 'voiture'],
  ['moto', 'vélo'], ['hélicoptère', 'avion'], ['casquette', 'chapeau'], ['t-shirt', 'manteau'], ['pastèque', 'fraise'],
  ['bateau', 'poisson'], ['ananas', 'banane'], ['crocodile', 'requin'],
];
const CONFUSE = new Set(CONFUSABLE.map(([a, b]) => [a, b].sort().join('|')));
export const confusable = (a, b) => CONFUSE.has([a, b].sort().join('|'));

/** « un chat » / « une pomme » / « du raisin » / « de l'ail ». */
export const indefinite = (t) => (t.det.endsWith("'") ? `${t.det}${t.word}` : `${t.det} ${t.word}`);
/** « le chat » / « la pomme » / « l'ail ». */
export function definite(t) {
  // h muet (l'hélicoptère) ou voyelle : élision ; h aspiré (le hibou) : liste explicite.
  const aspirated = ['hibou', 'hérisson', 'homard', 'hamster', 'hippopotame'];
  if (/^([aeiouyéèêœ]|h)/i.test(t.word) && !aspirated.includes(t.word)) return `l'${t.word}`;
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
/** Indices dits à l'envers (niveau 3) : la phrase « Je ne suis pas… » de quelques tags bien tranchés. */
export const NEGATIONS = Object.freeze({
  animal: 'Je ne suis pas un animal.',
  fruit: 'Je ne suis pas un fruit.',
  legume: 'Je ne suis pas un légume.',
  vetement: 'Je ne suis pas un vêtement.',
  vehicule: 'Je ne suis pas un véhicule.',
  jaune: 'Je ne suis pas jaune.',
  rouge: 'Je ne suis pas rouge.',
  orange: 'Je ne suis pas orange.',
  vert: 'Je ne suis pas {vert|verte}.',
  blanc: 'Je ne suis pas {blanc|blanche}.',
  noir: 'Je ne suis pas {noir|noire}.',
  bleu: 'Je ne suis pas {bleu|bleue}.',
  marron: 'Je ne suis pas marron.',
  gris: 'Je ne suis pas {gris|grise}.',
  aliment: 'On ne me mange pas.',
  vole: 'Je ne peux pas voler.',
  nage: "Je ne vis pas dans l'eau.",
  pattes4: 'Je ne marche pas sur quatre pattes.',
  roues: "Je n'ai pas de roues.",
  ailes: "Je n'ai pas d'ailes.",
  habiter: 'On ne peut pas habiter chez moi.',
});
export const negationText = (tag, thing) => render(NEGATIONS[tag], thing.gender);

// Une contrainte d'énoncé : { tag } (« Je suis… ») ou { tag, neg: true } (« Je ne suis pas… »).
// « N'est JAMAIS X » (#97/#106) : « X n'est pas dans fits » ne suffit pas, la banque n'est pas exhaustive
// (un ours peut être blanc ou gris, un oiseau jaune). On n'affirme « n'est pas X » que si X est dans `never` :
//  - une catégorie (animal, fruit, véhicule…) absente de `fits` ;
//  - un trait « ferme » (vole, ailes, roues…) absent de `fits` ;
//  - la taille opposée (ce qui est très grand ne tient pas dans la main, et réciproquement) ;
//  - une couleur listée explicitement pour cette chose. Les choses multicolores (bonbon, cuillère, chapeau,
//    poisson, oiseau, serpent, couronne, chien…) n'y figurent pas : jamais de négation ni d'intrus de couleur.
const FIRM = new Set(['vole', 'nage', 'pattes4', 'ailes', 'roues', 'plumes', 'bec', 'cornes', 'ecailles', 'aliment', 'habiter']);
const NEVER_COLOURS = {
  banane: 'rouge bleu rose violet orange gris noir', citron: 'rouge bleu rose violet noir gris marron',
  carotte: 'bleu rose violet noir gris', pomme: 'bleu rose violet noir gris orange marron',
  poire: 'bleu rose violet noir gris orange', fraise: 'bleu violet noir gris marron orange',
  cerise: 'bleu rose violet gris orange vert marron', orange: 'bleu rose violet noir gris blanc rouge',
  pêche: 'bleu violet noir gris', kiwi: 'bleu rose violet noir gris rouge orange',
  pastèque: 'bleu violet gris orange marron noir', raisin: 'bleu rose gris orange marron',
  brocoli: 'bleu rose violet noir gris orange rouge jaune blanc marron',
  concombre: 'bleu rose violet noir gris orange rouge jaune blanc marron',
  pomme_de_terre: 'bleu rose violet gris noir orange', poivron: 'bleu rose violet noir gris marron blanc',
  ananas: 'bleu rose violet noir gris blanc rouge',
  éléphant: 'bleu rose violet rouge orange jaune vert', girafe: 'bleu rose violet rouge gris vert noir',
  crocodile: 'bleu rose violet rouge orange jaune blanc', abeille: 'bleu rose violet rouge vert blanc gris',
  coccinelle: 'bleu rose violet vert gris', fourmi: 'bleu rose violet vert', panda: 'bleu rose violet rouge orange jaune vert marron gris',
  baleine: 'rouge rose violet orange jaune vert marron', dauphin: 'rouge rose violet orange jaune vert marron noir',
  requin: 'rose violet rouge orange jaune vert marron', loup: 'bleu rose violet rouge orange jaune vert',
  lion: 'bleu rose violet rouge vert noir blanc gris', cochon: 'bleu violet rouge orange jaune vert gris',
  mouton: 'bleu rose violet rouge orange vert jaune', lapin: 'bleu rose violet rouge orange vert jaune',
  chèvre: 'bleu rose violet rouge orange vert jaune', hibou: 'bleu rose violet rouge orange jaune vert',
  ours: 'bleu rose violet rouge orange jaune vert', chat: 'bleu rose violet rouge vert',
  cheval: 'bleu rose violet rouge vert orange', vache: 'bleu rose violet rouge orange jaune vert',
  singe: 'bleu rose violet rouge vert orange jaune', souris: 'bleu rose violet rouge vert orange jaune',
  kangourou: 'bleu rose violet rouge vert', chameau: 'bleu rose violet rouge vert orange',
  zèbre: 'bleu rose violet rouge vert orange jaune', araignée: 'bleu rose violet',
  feu: 'rose violet', chocolat: 'bleu rose violet rouge orange vert gris jaune',
  pain: 'bleu rose violet rouge vert gris noir', croissant: 'bleu rose violet rouge vert gris noir',
  œuf: 'bleu rose violet rouge vert gris noir orange', sapin: 'bleu rose violet rouge orange gris',
};
const NEVER = new Map(Object.entries(NEVER_COLOURS).map(([w, s]) => [w.replace(/_/g, ' '), new Set(s.split(' '))]));
/** Sa couleur est connue sans doute possible (pas un bonbon, un poisson ou un oiseau multicolores). */
export const colourClosed = (t) => NEVER.has(t.word);
/** La chose n'est-elle JAMAIS (sans aucun doute possible) cette propriété ? */
export function never(t, tag) {
  const kind = TAGS[tag].kind;
  if (kind === 'cat' || FIRM.has(tag)) return !t.fits.has(tag);
  if (tag === 'main') return t.is.has('grand');
  if (tag === 'grand') return t.is.has('main');
  if (kind === 'colour') return Boolean(NEVER.get(t.word) && NEVER.get(t.word).has(tag));
  return false;
}
/** Propriétés dont on peut dire « X n'est pas … » (indice dit à l'envers ou phrase de correction). */
export const canDeny = (tag) => TAGS[tag].kind === 'colour' || TAGS[tag].kind === 'cat' || FIRM.has(tag) || tag === 'main' || tag === 'grand';

/** Vérifiée avec certitude par la chose (un `maybe` ne compte pas ; « pas X » exige que X soit `never`). */
export const holds = (t, c) => (c.neg ? never(t, c.tag) : t.is.has(c.tag));
/** Contredite avec certitude par la chose (un `maybe` laisse un doute : ni vérifiée, ni contredite). */
export const fails = (t, c) => (c.neg ? t.is.has(c.tag) : never(t, c.tag));
/** La chose pourrait-elle, avec un peu de bonne volonté, vérifier la contrainte ? (sert à mesurer l'ambiguïté) */
export const couldHold = (t, c) => !fails(t, c);

/** Les indices qu'une chose contredit sans hésitation. */
export const contradicted = (thing, tags) => tags.filter((t) => !thing.fits.has(t));
