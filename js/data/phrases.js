// Banque de phrases du jeu « La phrase » (E5-T1, #35 ; raccourcis corrigés #107). TOUT est écrit
// à la main et relu phrase par phrase : aucune phrase n'est générée. Vocabulaire d'un enfant de 7 ans.
//
// Règles de rédaction (vérifiées par tests/games/phrase.test.js) :
//  - Remettre dans l'ordre : UNE SEULE phrase correcte avec ces mots. Le premier mot garde sa majuscule et
//    le dernier son signe (. ? !) : ce sont des indices voulus. Donc : pas de complément déplaçable
//    (« hier », « ce soir »…), pas de « et / ou / mais », pas de prénom au milieu (une 2e majuscule trompe),
//    et jamais deux groupes de mots échangeables (« Le chat griffe le canapé » → « Le canapé griffe le chat »).
//    Pour cela : le 2e groupe nominal a un autre genre ou un autre nombre que le 1er, ou il n'y en a qu'un.
//    Niveau 2 : au moins 5 mots (3 mots « du milieu » ou plus → au moins 6 arrangements possibles, on ne
//    gagne plus une fois sur deux en tirant au hasard, #107). Niveau 3 : le gabarit d'ouverture
//    « Le/La nom de/du nom est adjectif » reste minoritaire (moins de 30 % de la banque, #107).
//  - Ponctuation : phrases franches (« Quel beau gâteau ! », « Où est mon sac ? »). Une déclarative est un fait
//    simple, où « ! » serait étrange. En contexte (niveau 3), c'est la situation qui décide.
//  - Niveau 3, ponctuation (#107) : un enfant qui devine le signe au premier mot ou à un mot-clé du contexte,
//    sans lire la phrase, doit réussir au plus une fois sur deux. PONCT_LONG mélange donc des phrases franches
//    (« Pourquoi… », « Quel… ») et des phrases où « Comme » (= parce que), « Que » ou « Quel » annoncent un
//    AUTRE signe que d'habitude — la phrase entière tranche, jamais son premier mot seul. CONTEXTS varie ses
//    verbes de parole (bien au-delà de « demande » et « s'écrie ») pour qu'aucun mot-clé isolé ne suffise.

/** Dernier signe d'une phrase ('.', '?' ou '!'), sinon ''. */
export const signOf = (sentence) => (/[.?!]$/.test(sentence) ? sentence.slice(-1) : '');

/** Les signes sont collés au dernier mot par une espace insécable : on ne les sépare jamais. */
export const typo = (sentence) => sentence.replace(/ ([?!])/g, ' $1');

/** Mots d'une phrase écrite « Où est mon sac ? » → ['Où', 'est', 'mon', 'sac ?']. */
export function words(sentence) {
  return typo(sentence).split(' ');
}

/** « Le chat dort. » → « Le chat dort » (le signe est enlevé, l'espace insécable aussi). */
export const withoutSign = (sentence) => sentence.replace(/[\s ]*[.?!]$/, '');

/** Met la phrase au format affiché (espace insécable avant ? et !). */
export const shown = typo;

/** Première lettre en minuscule (« Le chat » → « le chat », « L'enfant » → « l'enfant »). */
export const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

export const SIGN_NAMES = { '.': 'un point', '?': 'un point d\'interrogation', '!': 'un point d\'exclamation' };

// --- Niveau 1 : « Est-ce une phrase ? » — [phrase juste, mots mélangés qui ne veulent rien dire] ---------
// Le désordre garde la majuscule au début et le point à la fin : seul le sens manque.
export const SIMPLE = [
  ['Le chat dort.', 'Dort chat le.'],
  ['Papa lit un livre.', 'Livre lit un papa.'],
  ['Léa mange une pomme.', 'Pomme une mange Léa.'],
  ['Le chien aboie.', 'Chien aboie le.'],
  ['Nous jouons au ballon.', 'Ballon jouons au nous.'],
  ['Maman cuisine un gâteau.', 'Gâteau cuisine un maman.'],
  ['La poule pond un œuf.', 'Œuf pond la un poule.'],
  ['Je mange une pomme.', 'Pomme une je mange.'],
  ['Le soleil brille.', 'Brille soleil le.'],
  ['Tom range ses jouets.', 'Jouets range ses Tom.'],
  ['Les oiseaux chantent.', 'Chantent oiseaux les.'],
  ['Mon frère a un vélo.', 'Vélo frère un a mon.'],
  ['Ma sœur dessine un cheval.', 'Cheval dessine un sœur ma.'],
  ['Le bébé dort.', 'Bébé dort le.'],
  ['Nous allons à l\'école.', 'L\'école à allons nous.'],
  ['Elle porte une robe rouge.', 'Robe porte rouge une elle.'],
  ['Le train arrive.', 'Arrive train le.'],
  ['Papa conduit la voiture.', 'Voiture conduit la papa.'],
  ['Les enfants courent.', 'Courent enfants les.'],
  ['Le lapin mange une carotte.', 'Carotte mange lapin une le.'],
  ['La neige tombe.', 'Tombe neige la.'],
  ['Je lis un livre.', 'Livre lis un je.'],
  ['Ils mangent des fraises.', 'Fraises mangent des ils.'],
  ['Le facteur apporte une lettre.', 'Lettre apporte facteur une le.'],
  ['Mamie tricote une écharpe.', 'Écharpe tricote une mamie.'],
  ['Le gâteau est bon.', 'Bon est gâteau le.'],
  ['La glace est froide.', 'Froide est glace la.'],
  ['Lola range sa chambre.', 'Chambre range sa Lola.'],
  ['Il fait beau.', 'Beau fait il.'],
  ['Les fleurs sont belles.', 'Belles sont fleurs les.'],
  ['Mon chien est gentil.', 'Gentil est chien mon.'],
];

// --- Ponctuation franche (sans contexte) : la phrase, sans son signe, et le signe attendu -----------------
const rows = (sign, list) => list.map((text) => ({ text, sign }));

export const PONCT_SHORT = [
  ...rows('.', [
    'Nous mangeons à la cantine', 'Mon frère a six ans', 'La maîtresse écrit au tableau', 'Papa lit le journal',
    'Léa a un chien noir', 'Les poules pondent des œufs', 'Il y a trois pommes dans le panier',
    'Maman prépare le dîner', 'Je range mes affaires', 'Le bus arrive devant l\'école',
    'Nous allons à la piscine', 'Tom dessine une maison', 'La vache mange de l\'herbe', 'Ma sœur a un chat gris',
  ]),
  ...rows('?', [
    'Où est mon cartable', 'Veux-tu jouer avec moi', 'Pourquoi pleures-tu', 'Qui a pris mon crayon',
    'Quand partons-nous', 'Comment t\'appelles-tu', 'Combien coûte ce livre', 'Est-ce que tu as faim',
    'Aimes-tu les fraises', 'Où vas-tu', 'As-tu un frère', 'Qui veut un bonbon', 'Est-ce que tu viens',
  ]),
  ...rows('!', [
    'Quel beau gâteau', 'Comme il fait froid', 'Que ce chien est gros', 'Comme tu es grand',
    'Quelle belle journée', 'Comme ce bébé est mignon', 'Quel gros camion', 'Comme la mer est belle',
    'Que ta robe est jolie', 'Comme j\'ai faim', 'Quelle jolie fleur', 'Comme ce gâteau est bon',
    'Que ce film est drôle',
  ]),
];

// --- Niveau 3 : ponctuation, phrases plus longues, sans contexte -----------------------------------------
// Un solveur qui devine au premier mot (comme au niveau 1) ne doit plus suffire : « Comme » introduit ici
// une cause (« Comme il pleut, … ») et pas une exclamation ; « Que » et « Quel » annoncent une vraie
// question quand le verbe est inversé juste après (« Que fais-tu », « Quel gâteau préfères-tu »). La
// virgule qui suit « Comme » au début d'une déclarative est l'indice qui tranche : une deuxième phrase
// complète la suit, ce que ne fait jamais le « Comme » de l'exclamation.
export const PONCT_LONG = [
  ...rows('.', [
    'Comme prévu, le bus arrive à huit heures', 'Comme chaque matin, Tom prend son petit-déjeuner',
    'Comme il pleut, nous restons à la maison', 'Comme elle est fatiguée, Léa se couche tôt',
    'Comme il fait nuit, on allume la lampe', 'Comme c\'est samedi, papa ne travaille pas',
    'Comme il fait froid dehors, je mets un manteau', 'Comme la cloche sonne, les enfants sortent',
    'Les oiseaux construisent leur nid dans l\'arbre', 'Papa répare le vélo de ma sœur',
  ]),
  ...rows('?', [
    'Que fais-tu après l\'école', 'Quel gâteau préfères-tu pour ton anniversaire',
    'Que choisis-tu comme dessert', 'Quelle couleur préfères-tu pour ta chambre',
    'Pourquoi le ciel est-il bleu', 'Où as-tu rangé ton cartable bleu',
    'Quand vas-tu chez ta grand-mère', 'Qui a laissé la porte ouverte',
    'Comment fais-tu ce beau dessin', 'Combien de pommes y a-t-il dans le panier',
  ]),
  ...rows('!', [
    'Bravo, tu as gagné la course', 'Waouh, quel beau château de sable',
    'Ouah, ce gâteau est énorme', 'Chouette, il neige dehors',
    'Dis donc, quelle grande maison', 'Miam, ce gâteau sent bon',
    'Hourra, nous avons gagné le match', 'Génial, on part en vacances',
    'Quel beau dessin tu as fait', 'Comme tu cours vite',
  ]),
];

// --- Niveau 3 : ponctuation en contexte. La situation décide du signe, pas un mot-clé répété ------------
// Chaque signe est annoncé par une bonne quinzaine de verbes différents (chuchote, questionne, rayonne,
// sursaute, précise, énumère…) : un enfant qui n'a mémorisé que « demande » ou « s'écrie » doit lire la
// scène en entier pour choisir, comme au niveau 1 il devait lire la phrase entière pour le sens (#107).
const ctx = (sign, list) => list.map(([context, text]) => ({ context, text, sign }));

export const CONTEXTS = [
  ...ctx('?', [
    ['Léa demande à sa maman si elle peut jouer.', 'Je peux jouer dehors'],
    ['Tom se demande si son ami va venir.', 'Tu viens avec nous'],
    ['Mia hésite puis interroge son frère.', 'Tu as vu mon sac'],
    ['Papa veut savoir si Léa a faim.', 'Tu as faim'],
    ['Emma chuchote sa question à la maîtresse.', 'Je peux aller aux toilettes'],
    ['Lucas questionne son ami du regard.', 'Tu as terminé ton dessin'],
    ['Un enfant lève la main pour savoir.', 'C\'est l\'heure de partir'],
    ['Mamie penche la tête, curieuse du goûter.', 'Le gâteau est bon'],
    ['Léa fixe Tom, intriguée par son animal.', 'Tu as un chat'],
    ['Maman observe les mains des enfants et s\'interroge.', 'Vous avez lavé vos mains'],
    ['Tom aimerait bien savoir, pour aller nager.', 'La piscine est ouverte'],
    ['Papa regarde la chambre de Léa, dubitatif.', 'Tu as rangé ta chambre'],
    ['Sacha n\'est pas sûr et questionne Inès.', 'Tu as fini tes devoirs'],
    ['Nino se gratte la tête, perplexe.', 'Il reste du gâteau'],
    ['Inès attend une réponse de sa sœur.', 'Tu veux venir avec moi'],
  ]),
  ...ctx('.', [
    ['Léa raconte sa journée à sa maman.', 'Je suis allée à la piscine'],
    ['Papa dit simplement ce qu\'il prépare.', 'Je fais des crêpes'],
    ['La maîtresse explique la leçon.', 'Nous apprenons les tables'],
    ['Tom dit son âge à un nouvel ami.', 'J\'ai sept ans'],
    ['Mia regarde par la fenêtre et commente.', 'Il y a un oiseau sur le toit'],
    ['Un enfant annonce le temps qu\'il fait.', 'Il pleut ce matin'],
    ['Mamie raconte son voyage à la mer.', 'Nous avons vu la mer'],
    ['Lucas indique où habite son ami.', 'Mon ami habite près de l\'école'],
    ['Léa énumère ce qu\'elle a dans son assiette.', 'Je mange une pomme'],
    ['Papa précise l\'heure du départ.', 'Nous partons à huit heures'],
    ['Emma montre ses cartes et explique son jeu.', 'On joue avec des cartes'],
    ['Un enfant se présente à la classe.', 'Je m\'appelle Tom'],
    ['Le maître décrit ce qu\'il voit dans la cour.', 'Les enfants sont dans la cour'],
    ['Zoé raconte calmement sa matinée.', 'Nous avons fait du vélo'],
    ['Hugo note ce que dit la maîtresse.', 'Nous lisons un livre'],
  ]),
  ...ctx('!', [
    ['Léa voit un énorme gâteau et s\'écrie.', 'C\'est un énorme gâteau'],
    ['Tom a gagné et saute de joie.', 'J\'ai gagné'],
    ['Mia aperçoit un gros chien et sursaute.', 'Il est énorme'],
    ['Léa frissonne tout à coup.', 'Il fait froid'],
    ['Emma voit un arc-en-ciel et bondit.', 'C\'est magnifique'],
    ['Papa goûte le gâteau et rayonne.', 'Il est délicieux'],
    ['Tom applaudit en voyant la neige.', 'Il neige'],
    ['Mamie serre ses petits-enfants dans ses bras.', 'Vous êtes là'],
    ['Tom recule devant une grosse araignée.', 'Elle est énorme'],
    ['Emma serre son cadeau contre elle.', 'Il est magnifique'],
    ['Lucas écarquille les yeux devant le poisson.', 'Il est gigantesque'],
    ['Nino pousse un cri de joie en ouvrant la boîte.', 'Il y a un chiot'],
    ['Zoé tape des mains devant le feu d\'artifice.', 'C\'est splendide'],
    ['Hugo bondit de son lit, tout excité.', 'C\'est le jour de son anniversaire'],
    ['Inès pousse un cri de joie soudaine.', 'Le gâteau est énorme'],
  ]),
];

// --- Remettre dans l'ordre : 5 ou 6 mots (niveau 2) ----------------------------------------------------
// Au moins 5 mots : une fois le premier (majuscule) et le dernier (signe) repérés, il reste encore au
// moins 3 mots du milieu à placer, donc au moins 6 arrangements possibles — plus moyen de trouver la
// bonne réponse une fois sur deux par hasard (#107).
export const ORDER_2 = [
  'Papa lit le grand journal.', 'Léa mange une pomme verte.', 'Le chat boit du lait chaud.',
  'Maman prépare un bon dîner.', 'Nous jouons dans la grande cour.', 'Tom range ses jouets rouges.',
  'Mon frère a une jolie trottinette.', 'Le lapin mange une grosse carotte.', 'Ma sœur dessine un beau cheval.',
  'Le facteur apporte une longue lettre.', 'La poule pond un petit œuf.', 'L\'enfant ouvre la lourde porte.',
  'Le chat attrape une petite souris.', 'Papa conduit la vieille voiture.', 'Nous mangeons des fraises sucrées.',
  'Ils lisent un livre très drôle.', 'Je prends mon gros cartable.', 'Elle porte une robe rouge.',
  'Les fleurs sont très belles.', 'La glace est très froide.', 'Mon chien est très gentil.',
  'Mathis ouvre son cahier bleu.', 'La vache donne du lait frais.', 'Le petit chat gris dort.',
  'Un gros camion rouge passe.', 'Elle cueille des fleurs jaunes.', 'Le chien ronge un gros os.',
  'Nous avons un petit chat.', 'Tu as une belle robe.', 'Le boulanger vend du pain chaud.',
  'Lola range sa petite chambre.', 'Le singe mange une grosse banane.', 'Les enfants dessinent un beau soleil.',
  'Mamie tricote une longue écharpe.', 'Tom lance le gros ballon.', 'Papa lave la petite voiture.',
  'Où est mon gros cartable ?', 'Où est ma petite trousse ?', 'Qui a pris mon crayon ?',
  'Aimes-tu manger des fraises rouges ?', 'Veux-tu venir jouer avec moi ?', 'As-tu un joli crayon rouge ?',
  'Est-ce que tu as faim ?', 'Vas-tu à la grande piscine ?',
  'Comme il fait très froid !', 'Comme ce bébé est mignon !', 'Que ce chien est gros !',
  'Comme tu es très grand !', 'Comme ta robe est jolie !', 'Comme ce gâteau est bon !',
  'Quelle belle glace tu manges !',
];

// --- Remettre dans l'ordre : 6 ou 7 mots (niveau 3) ----------------------------------------------------
// Le gabarit « Le/La nom de/du nom est adjectif » (« Le cartable de ma sœur est rouge. ») ne dépasse plus
// 30 % de la banque : la plupart des phrases ont une autre ouverture (sujet + verbe, négation, question,
// exclamation…) pour qu'il ne suffise plus de reconnaître ce début pour ranger les mots sans réfléchir (#107).
export const ORDER_3 = [
  'Le cartable de ma sœur est rouge.', 'Le gâteau de ma tante est bon.',
  'Le jardin de mamie est grand.', 'La poupée de mon frère est jolie.',
  'La voiture de mon père est bleue.', 'La maison de mon ami est grande.',
  'Le tableau de la classe est noir.', 'Le bus de l\'école est jaune.',
  'La queue du chat est longue.', 'La couverture du livre est jaune.',
  'Le vélo de ma cousine est rouge.', 'Le gilet de mamie est rose.',
  'Le livre de ma sœur est drôle.',
  'Mon chat gris dort sur le lit.', 'Ma cousine a un gros ballon rond.',
  'Mon père conduit une voiture bleue.', 'Mon frère range sa petite chambre.',
  'La classe a un grand tableau noir.', 'Ma maîtresse a un beau stylo vert.',
  'La voisine a un chien qui aboie.', 'Ma voisine a un bébé qui dort.',
  'Notre école a une grande cour.', 'Le salon a une fenêtre ouverte.',
  'Nous avons mangé une tarte aux pommes.', 'Mon frère a lu une histoire rigolote.',
  'Mon petit frère joue avec sa balle.', 'La petite souris mange un gros fromage.',
  'Le chat dort sur une chaise.', 'Nous allons à la grande piscine.',
  'Le facteur apporte une lettre bleue.', 'Papa ne mange pas de fromage.',
  'Léa a mis sa robe rouge.', 'Je vais manger une pomme verte.',
  'Tu vas jouer avec ta sœur.', 'Nous ne jouons pas dans la cour.',
  'Mon chien ne mange pas ses croquettes.', 'Léa dessine un gros soleil jaune.',
  'Zoé n\'aime pas le poisson froid.', 'Hugo ne range jamais ses billes.',
  'Mia a perdu son gant rouge.', 'Nino a caché son dessin préféré.',
  'Est-ce que tu as un crayon rouge ?', 'Est-ce que tu as mangé une pomme ?',
  'Est-ce que tu veux une pomme ?', 'Est-ce que ta sœur aime les pommes ?',
  'Pourquoi ton cartable est-il si lourd ?', 'Comment fais-tu ce très beau collier ?',
  'Comme ton petit chat est mignon !', 'Comme ma petite sœur est gentille !',
  'Quel beau gâteau tu as fait !', 'Quel gros poisson tu as pêché !',
  'Comme ce petit chien est drôle !', 'Que ma petite sœur est drôle !',
];
