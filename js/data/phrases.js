// Banque de phrases du jeu « La phrase » (E5-T1, #35). TOUT est écrit à la main et relu phrase par phrase :
// aucune phrase n'est générée. Vocabulaire d'un enfant de 7 ans.
//
// Règles de rédaction (vérifiées par tests/games/phrase.test.js) :
//  - Remettre dans l'ordre : UNE SEULE phrase correcte avec ces mots. Le premier mot garde sa majuscule et
//    le dernier son signe (. ? !) : ce sont des indices voulus. Donc : pas de complément déplaçable
//    (« hier », « ce soir »…), pas de « et / ou / mais », pas de prénom au milieu (une 2e majuscule trompe),
//    et jamais deux groupes de mots échangeables (« Le chat griffe le canapé » → « Le canapé griffe le chat »).
//    Pour cela : le 2e groupe nominal a un autre genre ou un autre nombre que le 1er, ou il n'y en a qu'un.
//  - Ponctuation : phrases franches (« Quel beau gâteau ! », « Où est mon sac ? »). Une déclarative est un fait
//    simple, où « ! » serait étrange. En contexte (niveau 3), c'est la situation qui décide.

/** Dernier signe d'une phrase ('.', '?' ou '!'), sinon ''. */
export const signOf = (sentence) => (/[.?!]$/.test(sentence) ? sentence.slice(-1) : '');

/** Les signes sont collés au dernier mot par une espace insécable : on ne les sépare jamais. */
export const typo = (sentence) => sentence.replace(/ ([?!])/g, ' $1');

/** Mots d'une phrase écrite « Où est mon sac ? » → ['Où', 'est', 'mon', 'sac ?']. */
export function words(sentence) {
  return typo(sentence).split(' ');
}

/** « Le chat dort. » → « Le chat dort » (le signe est enlevé, l'espace insécable aussi). */
export const withoutSign = (sentence) => sentence.replace(/[\s ]*[.?!]$/, '');

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
export const PONCT_LONG = [
  ...rows('.', [
    'Les enfants rangent leurs affaires avant la sortie', 'Ma grand-mère habite dans une petite maison',
    'Le facteur passe tous les jours dans notre rue', 'Nous mangeons de la soupe chaude ce soir',
    'Mon frère apprend à nager à la piscine', 'La maîtresse corrige les cahiers de la classe',
    'Les oiseaux construisent leur nid dans l\'arbre', 'Papa répare le vélo de ma sœur',
  ]),
  ...rows('?', [
    'Pourquoi le ciel est-il bleu', 'Où as-tu rangé ton cartable bleu', 'Est-ce que tu viens manger avec nous',
    'Quand vas-tu chez ta grand-mère', 'Qui a laissé la porte ouverte', 'Comment fais-tu ce beau dessin',
    'Veux-tu venir jouer chez moi', 'Combien de pommes y a-t-il dans le panier',
  ]),
  ...rows('!', [
    'Quel beau dessin tu as fait', 'Comme ce chat est doux', 'Que cette glace est bonne',
    'Comme tu cours vite', 'Quelle grande maison tu as', 'Comme ce petit chien est mignon',
    'Quelle belle surprise', 'Que ce gâteau sent bon',
  ]),
];

// --- Niveau 3 : ponctuation en contexte. La phrase est neutre ; la situation décide du signe. ----------
const ctx = (sign, list) => list.map(([context, text]) => ({ context, text, sign }));

export const CONTEXTS = [
  ...ctx('.', [
    ['Léa raconte sa journée à sa maman.', 'Je suis allée à la piscine'],
    ['Papa dit simplement ce qu\'il prépare.', 'Je fais des crêpes'],
    ['La maîtresse explique la leçon.', 'Nous apprenons les tables'],
    ['Tom dit son âge à un nouvel ami.', 'J\'ai sept ans'],
    ['Mia dit simplement ce qu\'elle voit par la fenêtre.', 'Il y a un oiseau sur le toit'],
    ['Un enfant dit le temps qu\'il fait.', 'Il pleut ce matin'],
    ['Mamie raconte son voyage.', 'Nous avons vu la mer'],
    ['Lucas dit où habite son ami.', 'Mon ami habite près de l\'école'],
    ['Léa dit simplement ce qu\'elle mange.', 'Je mange une pomme'],
    ['Papa dit l\'heure du départ.', 'Nous partons à huit heures'],
    ['Emma explique son jeu à sa cousine.', 'On joue avec des cartes'],
    ['Un enfant se présente.', 'Je m\'appelle Tom'],
    ['Le maître dit ce qu\'il voit.', 'Les enfants sont dans la cour'],
  ]),
  ...ctx('?', [
    ['Léa demande à sa maman si elle peut jouer.', 'Je peux jouer dehors'],
    ['Tom veut savoir si son ami vient.', 'Tu viens avec nous'],
    ['Mia demande à son frère où est son sac.', 'Il est dans ta chambre'],
    ['Papa veut savoir si Léa a faim.', 'Tu as faim'],
    ['Emma demande à la maîtresse si elle peut sortir.', 'Je peux aller aux toilettes'],
    ['Lucas demande à un ami s\'il a fini.', 'Tu as terminé ton dessin'],
    ['Un enfant demande si c\'est l\'heure de partir.', 'C\'est déjà l\'heure'],
    ['Mamie veut savoir si le gâteau est bon.', 'Le gâteau est bon'],
    ['Léa demande à Tom s\'il a un chat.', 'Tu as un chat'],
    ['Maman veut savoir si les enfants ont lavé leurs mains.', 'Vous avez lavé vos mains'],
    ['Tom demande si la piscine est ouverte.', 'La piscine est ouverte'],
    ['Papa veut savoir si Léa a rangé sa chambre.', 'Tu as rangé ta chambre'],
  ]),
  ...ctx('!', [
    ['Léa voit un énorme gâteau et s\'écrie.', 'C\'est un énorme gâteau'],
    ['Tom est très content : il a gagné et crie de joie.', 'J\'ai gagné'],
    ['Mia est très surprise de voir un gros chien.', 'Il est énorme'],
    ['Léa frissonne et s\'écrie.', 'Il fait froid'],
    ['Emma voit un arc-en-ciel et s\'écrie.', 'C\'est magnifique'],
    ['Papa goûte le gâteau et dit sa joie.', 'Il est délicieux'],
    ['Tom est très étonné de voir de la neige.', 'Il neige'],
    ['Mamie est très heureuse de voir ses petits-enfants.', 'Vous êtes là'],
    ['Tom a très peur d\'une grosse araignée et crie.', 'Elle est énorme'],
    ['Emma est très contente de son cadeau.', 'Il est magnifique'],
    ['Lucas est très étonné de voir un énorme poisson.', 'Il est gigantesque'],
  ]),
];

// --- Remettre dans l'ordre : 4 ou 5 mots (niveau 2) ----------------------------------------------------
export const ORDER_2 = [
  'Papa lit le journal.', 'Léa mange une pomme.', 'Le chat boit du lait.', 'Maman prépare le dîner.',
  'Nous jouons dans la cour.', 'Tom range ses jouets.', 'Mon frère a une trottinette.',
  'Le lapin mange une carotte.', 'Ma sœur dessine un cheval.', 'Le facteur apporte une lettre.',
  'La poule pond un œuf.', 'L\'enfant ouvre la porte.', 'Le chat attrape une souris.',
  'Papa conduit la voiture.', 'Nous mangeons des fraises.', 'Ils lisent un livre.',
  'Je prends mon cartable.', 'Elle porte une robe rouge.', 'Les fleurs sont belles.',
  'La glace est froide.', 'Mon chien est gentil.', 'Mathis ouvre son cahier.', 'La vache donne du lait.',
  'Le petit chat dort.', 'Un gros camion passe.', 'Elle cueille des fleurs jaunes.', 'Le chien ronge un os.',
  'Nous avons un chat.', 'Tu as une belle robe.', 'Le boulanger vend du pain.', 'Lola range sa chambre.',
  'Le singe mange une banane.', 'Les enfants dessinent un soleil.', 'Mamie tricote une écharpe.',
  'Tom lance le ballon.', 'Papa lave la voiture.',
  'Où est mon cartable ?', 'Où est ma trousse ?', 'Qui a pris mon crayon ?', 'Aimes-tu les fraises ?',
  'Veux-tu jouer avec moi ?', 'As-tu un crayon rouge ?', 'Est-ce que tu as faim ?', 'Vas-tu à l\'école ?',
  'Comme il fait froid !', 'Comme ce bébé est mignon !', 'Que ce chien est gros !', 'Comme tu es grand !',
  'Comme ta robe est jolie !', 'Comme ce gâteau est bon !', 'Quelle belle glace tu manges !',
];

// --- Remettre dans l'ordre : 6 ou 7 mots (niveau 3) ----------------------------------------------------
export const ORDER_3 = [
  'Le cartable de ma sœur est rouge.', 'Le chat de ma sœur dort.', 'Le gâteau de ma tante est bon.',
  'Le sac de ma maîtresse est lourd.', 'Le jardin de mamie est grand.', 'Le ballon de ma cousine est rond.',
  'La poupée de mon frère est jolie.', 'La voiture de mon père est bleue.', 'La maison de mon ami est grande.',
  'La chambre de mon frère est petite.', 'Le stylo de ma maîtresse est vert.', 'Le tableau de la classe est noir.',
  'Le bus de l\'école est jaune.', 'Le toit de la maison est rouge.', 'Le cahier de ma sœur est bleu.',
  'La queue du chat est longue.', 'La porte de l\'école est ouverte.', 'La couverture du livre est jaune.',
  'La cour de l\'école est grande.', 'Le vélo de ma cousine est rouge.', 'La fenêtre du salon est ouverte.',
  'Le gilet de mamie est rose.', 'Le chien de la voisine aboie.', 'Le bébé de ma voisine dort.',
  'Le livre de ma sœur est drôle.', 'Le manteau de ma maman est chaud.', 'Le goûter de ma sœur est prêt.',
  'Nous avons mangé une tarte aux pommes.', 'Mon frère a lu une histoire rigolote.',
  'Mon petit frère joue avec sa balle.', 'La petite souris mange un gros fromage.',
  'Le chat dort sur une chaise.', 'Nous allons à la grande piscine.', 'Le facteur apporte une lettre bleue.',
  'Papa ne mange pas de fromage.', 'Léa a mis sa robe rouge.', 'Je vais manger une pomme verte.',
  'Tu vas jouer avec ta sœur.', 'Nous ne jouons pas dans la cour.', 'Mon chien ne mange pas ses croquettes.',
  'Léa dessine un gros soleil jaune.',
  'Est-ce que tu as un crayon rouge ?', 'Veux-tu venir jouer avec moi ?', 'Est-ce que tu veux une pomme ?',
  'Est-ce que ta sœur aime les pommes ?', 'As-tu mangé une pomme verte ?',
  'Comme ton petit chat est mignon !', 'Comme ma petite sœur est gentille !', 'Quel beau gâteau tu as fait !',
  'Quel gros poisson tu as pêché !', 'Comme ce petit chien est drôle !', 'Que ma petite sœur est drôle !',
];
