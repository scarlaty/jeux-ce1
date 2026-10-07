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
//  - Tout texte adressé à l'enfant qui joue (« tu es… ») est ÉPICÈNE : le jeu est pour les filles et les
//    garçons, et on ne sait pas qui joue. « Comme tu es grand ! » est donc interdit ; `checkEpicene`
//    (tests/helpers/epicene.js) le vérifie sur toutes les banques et sur les questions tirées, 0 toléré.
//
// Ponctuation — pourquoi les niveaux diffèrent vraiment (#107) :
//  - Niveau 1 (PONCT_SHORT) : la FORME de la phrase donne le signe (mot interrogatif, inversion du verbe,
//    « Quel/Comme » exclamatif). C'est la compétence visée à ce niveau, et elle est légitimement
//    résoluble « à la forme ».
//  - Niveau 3 (CONTEXTS) : la forme ne suffit plus. Il n'y a PLUS de banque de phrases longues sans
//    contexte : elle se résolvait à 96,5 % par la seule typographie (virgule, trait d'union, premier mot),
//    c'est-à-dire exactement la compétence du niveau 1 avec des phrases plus longues — une fausse
//    difficulté. Au niveau 3, l'enfant lit une situation ET une phrase, et doit croiser les deux.
//
// Comment CONTEXTS résiste aux raccourcis de surface (mesuré, pas supposé) :
//  - la moitié des questions de niveau 3 ne se laisse résoudre NI par la typographie de la phrase, NI par
//    le verbe de la situation ;
//  - les situations qui NOMMENT l'intention (« demande », « veut savoir »…) sont minoritaires : partout
//    ailleurs, la situation décrit la scène sans dire l'acte de parole, et c'est la PHRASE qui tranche ;
//  - les phrases exclamatives sans « Quel/Comme » portent leur force dans un mot à lire (énorme,
//    magnifique, incroyable…) : l'enfant doit lire la phrase, pas repérer un signe typographique ;
//  - les signes restent équilibrés : répondre toujours pareil ne mène nulle part.

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

// --- Niveau 1 : ponctuation « à la forme ». La phrase, sans son signe, et le signe attendu --------------
// Ici le premier mot ou l'inversion du verbe DOIT donner le signe : c'est la compétence du niveau 1.
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
    'Quel beau gâteau', 'Comme il fait froid', 'Que ce chien est gros', 'Comme tu es rapide',
    'Quelle belle journée', 'Comme ce bébé est mignon', 'Quel gros camion', 'Comme la mer est belle',
    'Que ta robe est jolie', 'Comme j\'ai faim', 'Quelle jolie fleur', 'Comme ce gâteau est bon',
    'Que ce film est drôle',
  ]),
];

// --- Niveau 3 : la situation ET la phrase. Aucune des deux ne suffit seule (#107) -----------------------
// `why` est l'aide donnée après une erreur : elle cite ce qui, dans la situation ou dans la phrase,
// décide du signe — jamais « la règle puis la réponse ».
//
// Trois familles, voulues dans ces proportions (c'est ce qui casse les solveurs de surface) :
//  (a) situation qui NOMME l'intention + phrase de forme ordinaire → c'est la situation qui tranche ;
//  (b) situation neutre + phrase de forme interrogative → c'est la forme de la phrase qui tranche ;
//  (c) situation neutre + phrase qui porte un mot de forte intensité → c'est le MOT qu'il faut lire.
// La famille (c) échappe aux deux solveurs : ni typographie, ni verbe de la situation.
const ctx = (sign, list) => list.map(([context, text, why]) => ({ context, text, why, sign }));

export const CONTEXTS = [
  // --- Déclaratives : situation neutre, phrase ordinaire, aucun mot d'intensité ---
  ...ctx('.', [
    ['C\'est l\'heure du goûter dans la cuisine.', 'Je mange une pomme',
      'Rien d\'extraordinaire ici : c\'est le goûter, tout simplement.'],
    ['Les élèves sont assis en classe.', 'Nous apprenons les tables',
      'La classe travaille calmement : la phrase donne une information.'],
    ['Tom est à côté d\'un nouvel ami dans la cour.', 'J\'ai sept ans',
      'Tom donne son âge, sans plus : c\'est une information.'],
    ['Mia est devant la fenêtre de sa chambre.', 'Il y a un oiseau sur le toit',
      'Mia parle de ce qu\'elle voit par la fenêtre, sans surprise.'],
    ['Zoé regarde le ciel gris par la vitre.', 'Il pleut ce matin',
      'Zoé parle du temps qu\'il fait : un point suffit.'],
    ['Mamie revient de vacances avec ses photos.', 'Nous avons vu la mer',
      'Mamie parle de son voyage tranquillement.'],
    ['Lucas marche avec sa classe dans le quartier.', 'Mon ami habite près de l\'école',
      'Lucas donne un renseignement sur son ami.'],
    ['La famille prépare les sacs dans l\'entrée.', 'Nous partons à huit heures',
      'C\'est l\'heure du départ : une information simple.'],
    ['Emma est assise par terre avec ses cartes.', 'On joue avec des cartes',
      'Emma parle de son jeu, calmement.'],
    ['Un nouvel élève arrive devant la classe.', 'Je m\'appelle Tom',
      'Il donne son prénom : c\'est une information.'],
    ['Le maître traverse la cour de l\'école.', 'Les enfants sont dans la cour',
      'Le maître parle de ce qu\'il voit, sans surprise.'],
    ['Hugo range son vélo dans le garage.', 'Nous avons fait du vélo',
      'Hugo parle de sa journée, tranquillement.'],
  ]),

  // --- (a) Questions : la SITUATION dit qu'on attend une réponse ; la phrase a une forme ordinaire ---
  ...ctx('?', [
    ['Léa demande à sa maman si elle peut sortir.', 'Je peux jouer dehors',
      'Léa demande quelque chose : elle attend une réponse.'],
    ['Tom se demande si son ami va venir.', 'Tu viens avec nous',
      'Tom veut une réponse de son ami.'],
    ['Mia interroge son frère au sujet de son sac.', 'Tu as vu mon sac',
      'Mia interroge son frère : c\'est une question.'],
    ['Papa veut savoir si Léa a faim.', 'Tu as faim',
      'Papa veut savoir : il attend la réponse de Léa.'],
    ['Emma chuchote sa question à la maîtresse.', 'Je peux aller aux toilettes',
      'Emma pose une question à la maîtresse.'],
    ['Lucas questionne son ami sur son dessin.', 'Tu as terminé ton dessin',
      'Lucas questionne son ami : il attend une réponse.'],
    ['Maman veut savoir si les enfants se sont lavé les mains.', 'Vous avez lavé vos mains',
      'Maman veut savoir : c\'est une question.'],
    ['Sacha n\'est pas sûr et questionne Inès.', 'Tu as fini tes devoirs',
      'Sacha questionne Inès pour en être sûr.'],
    // --- (b) Questions : la situation est neutre, c'est la FORME de la phrase qui interroge ---
    ['Mia cherche partout dans sa chambre.', 'Où est mon sac',
      'Le mot « Où » attend une réponse : c\'est une question.'],
    ['Nino regarde la table après le goûter.', 'Qui a mangé la dernière part',
      'Le mot « Qui » attend une réponse : c\'est une question.'],
    ['Inès est sur le pas de la porte, son manteau à la main.', 'Quand allons-nous partir',
      'Le mot « Quand » attend une réponse : c\'est une question.'],
    ['Zoé tient deux crayons dans sa main.', 'Lequel préfères-tu',
      'Le verbe collé à « tu » (préfères-tu) attend une réponse.'],
    ['Hugo est devant la carte du monde.', 'Comment s\'appelle ce pays',
      'Le mot « Comment » attend une réponse : c\'est une question.'],
    ['Léa compte les billes au fond du sac.', 'Combien y en a-t-il',
      'Le mot « Combien » attend une réponse : c\'est une question.'],
  ]),

  // --- (c) Exclamations : situation neutre, c'est un MOT de la phrase qui porte la force ---
  ...ctx('!', [
    ['Léa n\'a jamais vu un gâteau aussi gros.', 'Il est énorme',
      'Le mot « énorme » dit la surprise de Léa : on met un point d\'exclamation.'],
    ['Un chien plus grand que Mia passe devant elle.', 'Il est immense',
      'Le mot « immense » dit l\'étonnement de Mia.'],
    ['Emma lève les yeux vers l\'arc-en-ciel.', 'C\'est magnifique',
      'Le mot « magnifique » dit l\'admiration d\'Emma.'],
    ['Papa goûte enfin le gâteau sorti du four.', 'Il est délicieux',
      'Le mot « délicieux » dit le plaisir de Papa.'],
    ['Mamie retrouve ses petits-enfants après un long voyage.', 'C\'est formidable',
      'Le mot « formidable » dit la force du moment.'],
    ['Lucas sort de l\'eau un poisson plus long que son bras.', 'Il est gigantesque',
      'Le mot « gigantesque » dit la surprise de Lucas.'],
    ['Nino ouvre la boîte posée devant lui.', 'C\'est un cadeau extraordinaire',
      'Le mot « extraordinaire » dit la force du moment.'],
    ['Zoé regarde le feu d\'artifice depuis le balcon.', 'C\'est splendide',
      'Le mot « splendide » dit l\'admiration de Zoé.'],
    ['Hugo descend l\'escalier le matin de ses sept ans.', 'C\'est mon plus beau jour',
      'Les mots « plus beau » disent la force du moment.'],
    ['Inès découvre la table du goûter.', 'Le gâteau est superbe',
      'Le mot « superbe » dit l\'admiration d\'Inès.'],
    ['Sacha voit la neige tomber pour la première fois.', 'C\'est incroyable',
      'Le mot « incroyable » dit l\'étonnement de Sacha.'],
    ['Mia goûte sa glace au bord de la mer.', 'Cette glace est délicieuse',
      'Le mot « délicieuse » dit le plaisir de Mia.'],
    ['Tom arrive le premier au bout de la course.', 'C\'est une victoire extraordinaire',
      'Le mot « extraordinaire » dit la force du moment.'],
    ['Léa ouvre son livre sur une grande image.', 'Ce dessin est magnifique',
      'Le mot « magnifique » dit l\'admiration de Léa.'],
    ['Papa soulève une valise remplie à ras bord.', 'Elle est énorme',
      'Le mot « énorme » dit la surprise de Papa.'],
    ['Emma pose le pied sur la plus haute marche.', 'La vue est splendide',
      'Le mot « splendide » dit l\'admiration d\'Emma.'],
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
  'Comme tu es très rapide !', 'Comme ta robe est jolie !', 'Comme ce gâteau est bon !',
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
