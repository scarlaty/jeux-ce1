// Banque de phrases du jeu « La phrase » (E5-T1, #35 ; raccourcis corrigés #107). TOUT est écrit
// à la main et relu phrase par phrase : aucune phrase n'est générée. Vocabulaire d'un enfant de 7 ans.
//
// Règles de rédaction (vérifiées par tests/games/phrase.test.js) :
//  - Remettre dans l'ordre : UNE SEULE phrase correcte avec ces mots. Le premier mot garde sa majuscule et
//    le dernier son signe (. ? !) : ce sont des indices voulus. Donc : pas de complément déplaçable
//    (« hier », « jamais », « ce soir »…), pas de « et / ou / mais », pas de prénom au milieu (une 2e
//    majuscule trompe), et jamais deux groupes de mots échangeables (« Le chat griffe le canapé »).
//    Niveau 2 : au moins 5 mots. Niveau 3 : le gabarit « Le/La nom de/du nom est adjectif » reste sous 30 %.
//  - Tout texte adressé à l'enfant qui joue (« tu es… ») est ÉPICÈNE, et les objets qu'on lui prête sont
//    variés : le jeu est pour les filles et les garçons, et on ne sait pas qui joue. `checkEpicene`
//    (tests/helpers/epicene.js) vérifie les accords, 0 toléré.
//
// ====================================================================================================
// POURQUOI LE NIVEAU 3 EST CONSTRUIT EN « M × N » (#107, 3e itération)
// ====================================================================================================
// Deux corrections successives ont échoué de la même façon, et il faut comprendre pourquoi avant de
// toucher à CONTEXTS :
//   1re tentative : on a varié le vocabulaire des situations. Un solveur qui lisait la typographie de la
//     phrase résolvait encore 96,5 % des phrases longues.
//   2e tentative : on a exigé qu'une exclamation porte un mot de forte intensité (énorme, magnifique…).
//     Ce test RENDAIT le lexique d'intensité exclusif aux exclamations : un solveur qui ne lisait QUE la
//     phrase, sans jamais regarder la situation, montait à 93 %. Le niveau 3 était alors PLUS facile que
//     le niveau 1 (93 % contre 65 %). Un test fabriquait le raccourci qu'un autre prétendait mesurer.
//
// La cause est arithmétique, pas lexicale : tant qu'une phrase n'existe qu'avec UNE situation, la
// relation phrase → signe est une fonction, et un solveur peut l'apprendre. Aucun enrichissement de
// vocabulaire n'y change rien.
//
// D'où la construction actuelle : **14 phrases, chacune servie avec TROIS situations et TROIS signes
// différents**. « Il neige » est tour à tour un constat (.), une question (?) et un émerveillement (!).
// La phrase seule devient structurellement incapable de décider : au mieux une chance sur trois. C'est
// la situation, et elle seule, qui tranche — ce qui est exactement la compétence visée au niveau 3,
// quand le niveau 1 travaille la forme de la phrase.
//
// Trois invariants à ne pas casser :
//   - aucune phrase de CONTEXTS n'est de forme interrogative ou exclamative (pas de « Où… », pas de
//     « Quel… », pas de verbe inversé) : toutes sont des déclaratives ordinaires ;
//   - aucun mot de ces phrases n'est réservé à un signe (plus de lexique d'intensité réservé au « ! ») ;
//   - `intention` est portée par la DONNÉE, séparée du texte de la situation : on peut ainsi écrire une
//     situation qui tranche sans la trahir par son vocabulaire, et mesurer ce que la situation apporte.

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

/** Intentions possibles d'une situation, séparées du texte qui la raconte. */
export const INTENTIONS = { raconte: '.', demande: '?', semerveille: '!' };

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
  ['Maman conduit la voiture.', 'Voiture conduit la maman.'],
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
// Ici le premier mot ou l'inversion du verbe DOIT donner le signe : c'est la compétence du niveau 1,
// et c'est la raison pour laquelle un solveur « phrase seule » y réussit légitimement.
const rows = (sign, list) => list.map((text) => ({ text, sign }));

export const PONCT_SHORT = [
  ...rows('.', [
    'Nous mangeons à la cantine', 'Mon frère a six ans', 'La maîtresse écrit au tableau', 'Papa lit le journal',
    'Léa a un chien noir', 'Les poules pondent des œufs', 'Il y a trois pommes dans le panier',
    'Papa prépare le dîner', 'Je range mes affaires', 'Le bus arrive devant l\'école',
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
    'Que ton dessin est joli', 'Comme j\'ai faim', 'Quelle jolie fleur', 'Comme ce gâteau est bon',
    'Que ce film est drôle',
  ]),
];

// --- Niveau 3 : M × N. Chaque phrase est servie avec trois situations et trois signes ------------------
// `intention` est la donnée (raconte / demande / semerveille) ; `context` la raconte sans la nommer ;
// `why` est l'aide donnée après une erreur, et cite ce qui, dans la situation, décide.
const ctx = (text, list) => list.map(([intention, context, why]) => ({
  text, context, why, intention, sign: INTENTIONS[intention],
}));

export const CONTEXTS = [
  ...ctx('Il neige', [
    ['raconte', 'Zoé écrit la météo du jour dans son cahier.',
      'Zoé écrit un fait, sans émotion : on met un point.'],
    ['demande', 'Tom vient de se réveiller et appelle son frère depuis son lit.',
      'Tom n\'a pas encore regardé dehors : il attend une réponse.'],
    ['semerveille', 'Mia ouvre les volets et découvre le jardin tout blanc.',
      'Mia ne s\'y attendait pas du tout : c\'est une belle surprise.'],
  ]),
  ...ctx('Le gâteau est bon', [
    ['raconte', 'Papa goûte le gâteau et donne son avis à la maîtresse.',
      'Papa dit calmement ce qu\'il pense : on met un point.'],
    ['demande', 'Léa n\'a pas encore goûté et se tourne vers son frère.',
      'Léa veut savoir avant de goûter : elle attend une réponse.'],
    ['semerveille', 'Hugo croque une première bouchée et ouvre grand les yeux.',
      'Hugo est surpris par ce qu\'il goûte : c\'est une exclamation.'],
  ]),
  ...ctx('C\'est l\'heure de partir', [
    ['raconte', 'Le maître regarde l\'horloge et prévient la classe.',
      'Le maître informe la classe : on met un point.'],
    ['demande', 'Inès a son manteau sur le bras et cherche l\'horloge des yeux.',
      'Inès n\'est pas sûre de l\'heure : elle attend une réponse.'],
    ['semerveille', 'Lucas attend ce voyage depuis des semaines et saisit sa valise.',
      'Lucas est très content de partir enfin : c\'est une exclamation.'],
  ]),
  ...ctx('Tu as fini ton dessin', [
    ['raconte', 'La maîtresse passe dans les rangs et coche son cahier.',
      'La maîtresse constate, sans émotion : on met un point.'],
    ['demande', 'Emma veut ranger les crayons mais ne sait pas où en est Nino.',
      'Emma attend la réponse de Nino : on met un point d\'interrogation.'],
    ['semerveille', 'Sacha n\'arrivait plus à terminer, et voilà le dessin achevé.',
      'On félicite Sacha pour cette réussite : c\'est une exclamation.'],
  ]),
  ...ctx('Il y a un oiseau sur le toit', [
    ['raconte', 'Mia observe le jardin et parle à voix basse.',
      'Mia dit ce qu\'elle voit, tranquillement : on met un point.'],
    ['demande', 'Tom entend un bruit au-dessus de sa tête.',
      'Tom n\'est pas sûr de ce qu\'il entend : il attend une réponse.'],
    ['semerveille', 'Zoé cherche cet oiseau rare depuis des jours.',
      'Zoé est émerveillée de le trouver enfin : c\'est une exclamation.'],
  ]),
  ...ctx('Nous partons à huit heures', [
    ['raconte', 'Maman charge les sacs dans la voiture et parle du programme.',
      'Maman informe la famille : on met un point.'],
    ['demande', 'Hugo n\'a pas entendu l\'heure du départ.',
      'Hugo veut qu\'on lui confirme l\'heure : il attend une réponse.'],
    ['semerveille', 'Lucas trouve que c\'est bien trop tôt pour se lever.',
      'Lucas proteste, surpris par cette heure : c\'est une exclamation.'],
  ]),
  ...ctx('Tu viens avec nous', [
    ['raconte', 'Papa a déjà tout prévu pour la journée.',
      'Papa informe, il ne pose pas de question : on met un point.'],
    ['demande', 'Léa aimerait que son frère les accompagne au parc.',
      'Léa attend la réponse de son frère : on met un point d\'interrogation.'],
    ['semerveille', 'Nino croyait rester seul à la maison toute la journée.',
      'Nino est très content de la nouvelle : c\'est une exclamation.'],
  ]),
  ...ctx('C\'est ton anniversaire', [
    ['raconte', 'Mamie relit le calendrier avec Emma.',
      'Mamie rappelle un fait, tranquillement : on met un point.'],
    ['demande', 'Inès a oublié la date et regarde son amie.',
      'Inès veut vérifier : elle attend une réponse.'],
    ['semerveille', 'Hugo avait complètement oublié ce jour-là.',
      'C\'est une joyeuse surprise pour Hugo : c\'est une exclamation.'],
  ]),
  ...ctx('La piscine est ouverte', [
    ['raconte', 'Le maître lit les horaires affichés à l\'entrée.',
      'Le maître informe : on met un point.'],
    ['demande', 'Tom veut nager, mais il a vu un panneau hier.',
      'Tom attend une réponse avant d\'y aller : un point d\'interrogation.'],
    ['semerveille', 'Mia croyait la piscine fermée pour tout l\'été.',
      'Mia est très contente de se tromper : c\'est une exclamation.'],
  ]),
  ...ctx('Le chat est sur le lit', [
    ['raconte', 'Lucas range sa chambre et parle de son animal.',
      'Lucas dit où est son chat : on met un point.'],
    ['demande', 'Emma cherche son chat partout dans la maison.',
      'Emma attend une réponse pour le retrouver : un point d\'interrogation.'],
    ['semerveille', 'Nino avait interdit sa chambre au chat.',
      'Nino est surpris de l\'y trouver : c\'est une exclamation.'],
  ]),
  ...ctx('Tu as rangé ta chambre', [
    ['raconte', 'Maman fait le tour des chambres et coche sa liste.',
      'Maman constate, sans émotion : on met un point.'],
    ['demande', 'Papa voit la porte fermée et ne sait pas où en est Léa.',
      'Papa attend la réponse de Léa : on met un point d\'interrogation.'],
    ['semerveille', 'Sacha n\'avait jamais rangé sa chambre sans aide.',
      'On félicite Sacha pour cette première fois : c\'est une exclamation.'],
  ]),
  ...ctx('Il reste du gâteau', [
    ['raconte', 'Mamie compte les parts sur le plat.',
      'Mamie dit ce qu\'elle voit : on met un point.'],
    ['demande', 'Zoé arrive la dernière à table.',
      'Zoé attend une réponse avant de s\'asseoir : un point d\'interrogation.'],
    ['semerveille', 'Hugo pensait que tout avait été mangé.',
      'Hugo est très content de sa découverte : c\'est une exclamation.'],
  ]),
  ...ctx('Le dessin est fini', [
    ['raconte', 'La maîtresse ramasse les feuilles de la classe.',
      'La maîtresse constate : on met un point.'],
    ['demande', 'Emma se tourne vers sa voisine, le crayon en l\'air.',
      'Emma attend une réponse avant de continuer : un point d\'interrogation.'],
    ['semerveille', 'Nino y a travaillé pendant trois jours entiers.',
      'Nino est fier d\'avoir terminé : c\'est une exclamation.'],
  ]),
  ...ctx('Vous avez gagné', [
    ['raconte', 'L\'arbitre lit les résultats à voix haute.',
      'L\'arbitre informe les équipes : on met un point.'],
    ['demande', 'Léa arrive en retard, le match est déjà terminé.',
      'Léa veut savoir ce qui s\'est passé : elle attend une réponse.'],
    ['semerveille', 'L\'équipe de Tom perdait depuis le début du match.',
      'C\'est une grande joie pour l\'équipe : c\'est une exclamation.'],
  ]),
];

// --- Remettre dans l'ordre : 5 ou 6 mots (niveau 2) ----------------------------------------------------
// Au moins 5 mots : une fois le premier (majuscule) et le dernier (signe) repérés, il reste encore au
// moins 3 mots du milieu à placer, donc au moins 6 arrangements possibles — plus moyen de trouver la
// bonne réponse une fois sur deux par hasard (#107).
export const ORDER_2 = [
  'Papa lit le grand journal.', 'Léa mange une pomme verte.', 'Le chat boit du lait chaud.',
  'Papa prépare un bon dîner.', 'Nous jouons dans la grande cour.', 'Tom range ses jouets rouges.',
  'Mon frère a une jolie trottinette.', 'Le lapin mange une grosse carotte.', 'Ma sœur dessine un beau cheval.',
  'Le facteur apporte une longue lettre.', 'La poule pond un petit œuf.', 'L\'enfant ouvre la lourde porte.',
  'Le chat attrape une petite souris.', 'Maman conduit la vieille voiture.', 'Nous mangeons des fraises sucrées.',
  'Ils lisent un livre très drôle.', 'Je prends mon gros cartable.', 'Elle porte une robe rouge.',
  'Les fleurs sont très belles.', 'La glace est très froide.', 'Mon chien est très gentil.',
  'Mathis ouvre son cahier bleu.', 'La vache donne du lait frais.', 'Le petit chat gris dort.',
  'Un gros camion rouge passe.', 'Elle cueille des fleurs jaunes.', 'Le chien ronge un gros os.',
  'Nous avons un petit chat.', 'Tu as un beau cartable.', 'Le boulanger vend du pain chaud.',
  'Lola range sa petite chambre.', 'Le singe mange une grosse banane.', 'Les enfants dessinent un beau soleil.',
  'Mamie répare le vieux vélo.', 'Tom lance le gros ballon.', 'Maman lave la petite voiture.',
  'Où est mon gros cartable ?', 'Où est ma petite trousse ?', 'Qui a pris mon crayon ?',
  'Aimes-tu manger des fraises rouges ?', 'Veux-tu venir jouer avec moi ?', 'As-tu un joli crayon rouge ?',
  'Est-ce que tu as faim ?', 'Vas-tu à la grande piscine ?',
  'Comme il fait très froid !', 'Comme ce bébé est mignon !', 'Que ce chien est gros !',
  'Comme tu es très rapide !', 'Comme ton pull est joli !', 'Comme ce gâteau est bon !',
  'Quelle belle glace tu manges !',
];

// --- Remettre dans l'ordre : 6 ou 7 mots (niveau 3) ----------------------------------------------------
// Le gabarit « Le/La nom de/du nom est adjectif » ne dépasse plus 30 % de la banque (#107).
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
  'Zoé n\'aime pas le poisson froid.', 'Hugo ne range pas ses billes.',
  'Mia a perdu son gant rouge.', 'Nino a caché son dessin préféré.',
  'Est-ce que tu as un crayon rouge ?', 'Est-ce que tu as mangé une pomme ?',
  'Est-ce que tu veux une pomme ?', 'Est-ce que ta sœur aime les pommes ?',
  'Pourquoi ton cartable est-il si lourd ?', 'Comment fais-tu ce très beau château ?',
  'Comme ton petit chat est mignon !', 'Comme ma petite sœur est gentille !',
  'Quel beau gâteau tu as fait !', 'Quel gros poisson tu as pêché !',
  'Comme ce petit chien est drôle !', 'Que ma petite sœur est drôle !',
];
