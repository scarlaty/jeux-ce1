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

/**
 * Qui parle. Le locuteur est tiré au hasard à chaque question, séparément de la situation : tant
 * qu'une situation n'existait qu'avec UN prénom, la relation prénom → signe restait une fonction,
 * et un solveur qui ne lisait QUE le prénom tranchait à 86 % (mesuré ; le hasard donne 33 %). Onze
 * locuteurs sur seize prédisaient le signe à 100 %, et les douze situations portées par un adulte
 * étaient toutes des points : le jeu enseignait au passage que les adultes constatent et que les
 * enfants s'émerveillent. C'est la même cause arithmétique que pour les phrases (voir plus haut),
 * et le même remède : on croise (#109).
 *
 * Conséquence sur l'écriture : AUCUN texte ne s'accorde avec le locuteur. Pas de « il », pas de
 * « elle », pas de « content » ni de « sûre » : n'importe quel prénom doit pouvoir s'y mettre.
 * `tests/games/phrase.test.js` le vérifie.
 */
export const SPEAKERS = [
  'Zoé', 'Tom', 'Léa', 'Emma', 'Nino', 'Sacha', 'Inès', 'Hugo', 'Mia',
  'Lucas', 'Jade', 'Adam', 'Lina', 'Noé', 'Papa', 'Maman', 'Mamie', 'Papy',
];

/** Remplace {qui} par le locuteur tiré. */
export const withSpeaker = (text, who) => text.split('{qui}').join(who);

export const CONTEXTS = [
  ...ctx('Il neige', [
    ['raconte', '{qui} écrit la météo du jour dans le cahier.',
      '{qui} note un fait, sans émotion : on met un point.'],
    ['demande', '{qui} vient de se réveiller et n\'a pas encore ouvert les volets.',
      '{qui} attend une réponse avant de se lever : on met un point d\'interrogation.'],
    ['semerveille', '{qui} ouvre les volets et découvre le jardin tout blanc.',
      'Le jardin blanc est une belle surprise pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Le gâteau est bon', [
    ['raconte', '{qui} goûte une part et donne un avis tranquille.',
      '{qui} dit calmement ce qui est bon : on met un point.'],
    ['demande', '{qui} n\'a pas encore goûté et se tourne vers la place d\'à côté.',
      '{qui} attend une réponse avant de goûter : on met un point d\'interrogation.'],
    ['semerveille', '{qui} croque une première bouchée et ouvre grand les yeux.',
      'Ce goût est une vraie surprise pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('C\'est l\'heure de partir', [
    ['raconte', '{qui} regarde l\'horloge et prévient tout le monde.',
      '{qui} informe, sans émotion : on met un point.'],
    ['demande', '{qui} a son manteau sur le bras et cherche l\'horloge des yeux.',
      '{qui} attend une réponse pour savoir : on met un point d\'interrogation.'],
    ['semerveille', '{qui} attend ce voyage depuis des semaines et prend son sac.',
      'Partir enfin, c\'est une grande joie pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Tu as fini ton dessin', [
    ['raconte', '{qui} passe entre les tables et coche la liste.',
      '{qui} constate, sans émotion : on met un point.'],
    ['demande', '{qui} veut ranger les crayons et ne sait pas où en est le dessin.',
      '{qui} attend une réponse pour ranger : on met un point d\'interrogation.'],
    ['semerveille', '{qui} voit le dessin terminé après des jours d\'essais.',
      '{qui} félicite cette réussite : on met un point d\'exclamation.'],
  ]),
  ...ctx('Il y a un oiseau sur le toit', [
    ['raconte', '{qui} observe le jardin et parle à voix basse.',
      '{qui} dit ce qui se passe, tranquillement : on met un point.'],
    ['demande', '{qui} entend un bruit au-dessus de sa tête sans rien voir.',
      '{qui} attend une réponse pour comprendre : on met un point d\'interrogation.'],
    ['semerveille', '{qui} cherche cet oiseau rare depuis des jours.',
      'Le trouver enfin, c\'est une grande joie pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Nous partons à huit heures', [
    ['raconte', '{qui} range les sacs et annonce le programme.',
      '{qui} informe, sans émotion : on met un point.'],
    ['demande', '{qui} n\'a pas entendu l\'heure du départ.',
      '{qui} attend qu\'on confirme l\'heure : on met un point d\'interrogation.'],
    ['semerveille', '{qui} se lève d\'habitude bien plus tard que cela.',
      'Une heure pareille étonne {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Tu viens avec nous', [
    ['raconte', '{qui} a déjà tout prévu et annonce le programme calmement.',
      '{qui} informe et ne pose pas de question : on met un point.'],
    ['demande', '{qui} aimerait bien aller au parc à deux.',
      '{qui} attend une réponse pour partir : on met un point d\'interrogation.'],
    ['semerveille', '{qui} croyait passer toute la journée à la maison.',
      'C\'est une très bonne nouvelle pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('C\'est ton anniversaire', [
    ['raconte', '{qui} relit le calendrier à voix haute.',
      '{qui} rappelle un fait, tranquillement : on met un point.'],
    ['demande', '{qui} a oublié la date et cherche à vérifier.',
      '{qui} attend une réponse pour vérifier la date : on met un point d\'interrogation.'],
    ['semerveille', '{qui} avait complètement oublié ce jour-là.',
      'C\'est une joyeuse surprise pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('La piscine est ouverte', [
    ['raconte', '{qui} lit les horaires affichés à l\'entrée.',
      '{qui} informe, sans émotion : on met un point.'],
    ['demande', '{qui} veut nager mais a vu un panneau hier.',
      '{qui} attend une réponse avant d\'y aller : on met un point d\'interrogation.'],
    ['semerveille', '{qui} croyait la piscine fermée pour tout l\'été.',
      'Se tromper ainsi, c\'est une bonne surprise pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Le chat est sur le lit', [
    ['raconte', '{qui} range la chambre et parle de l\'animal.',
      '{qui} dit où se trouve le chat : on met un point.'],
    ['demande', '{qui} cherche le chat partout dans la maison.',
      '{qui} attend une réponse pour le retrouver : on met un point d\'interrogation.'],
    ['semerveille', '{qui} avait interdit cette chambre au chat.',
      'Le trouver là étonne beaucoup {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Tu as rangé ta chambre', [
    ['raconte', '{qui} fait le tour des chambres et coche la liste.',
      '{qui} constate, sans émotion : on met un point.'],
    ['demande', '{qui} voit la porte fermée et ne sait pas si c\'est fait.',
      '{qui} attend une réponse pour savoir : on met un point d\'interrogation.'],
    ['semerveille', '{qui} découvre la chambre rangée pour la première fois.',
      '{qui} félicite cette première fois : on met un point d\'exclamation.'],
  ]),
  ...ctx('Il reste du gâteau', [
    ['raconte', '{qui} compte les parts sur le plat.',
      '{qui} dit ce qui reste : on met un point.'],
    ['demande', '{qui} arrive à table après tout le monde.',
      '{qui} attend une réponse avant de s\'asseoir : on met un point d\'interrogation.'],
    ['semerveille', '{qui} pensait que tout avait été mangé.',
      'C\'est une bonne surprise pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Le dessin est fini', [
    ['raconte', '{qui} ramasse les feuilles une par une.',
      '{qui} constate, sans émotion : on met un point.'],
    ['demande', '{qui} ne voit pas le dessin de la table voisine et veut savoir.',
      '{qui} attend une réponse avant de continuer : on met un point d\'interrogation.'],
    ['semerveille', '{qui} y a travaillé pendant trois jours entiers.',
      'Terminer enfin, c\'est une grande joie pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Vous avez gagné', [
    ['raconte', '{qui} lit les résultats à voix haute.',
      '{qui} informe les équipes : on met un point.'],
    ['demande', '{qui} arrive quand le match est déjà terminé.',
      '{qui} attend une réponse pour savoir : on met un point d\'interrogation.'],
    ['semerveille', '{qui} perdait depuis le début du match.',
      'C\'est une très grande joie pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Le train arrive', [
    ['raconte', '{qui} regarde le panneau et annonce l\'horaire.',
      '{qui} informe, sans émotion : on met un point.'],
    ['demande', '{qui} entend un bruit au bout du quai sans rien voir.',
      '{qui} attend une réponse pour comprendre : on met un point d\'interrogation.'],
    ['semerveille', '{qui} attend ce train depuis deux heures.',
      'Le voir enfin, c\'est un grand soulagement pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Tu as trouvé la clé', [
    ['raconte', '{qui} note dans le carnet que la clé est retrouvée.',
      '{qui} constate, sans émotion : on met un point.'],
    ['demande', '{qui} cherche encore sous les coussins du canapé.',
      '{qui} attend une réponse pour arrêter de chercher : on met un point d\'interrogation.'],
    ['semerveille', '{qui} cherchait cette clé depuis le matin.',
      'C\'est une très grande joie pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Il y a du vent', [
    ['raconte', '{qui} écrit la météo sur le tableau.',
      '{qui} note un fait, sans émotion : on met un point.'],
    ['demande', '{qui} veut sortir le cerf-volant et regarde les arbres.',
      '{qui} attend une réponse avant de sortir : on met un point d\'interrogation.'],
    ['semerveille', '{qui} espérait ce vent depuis le début des vacances.',
      'C\'est une excellente nouvelle pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Le chien a soif', [
    ['raconte', '{qui} remplit la gamelle et explique pourquoi.',
      '{qui} dit un fait, sans émotion : on met un point.'],
    ['demande', '{qui} voit la gamelle vide et hésite à la remplir.',
      '{qui} attend une réponse avant d\'agir : on met un point d\'interrogation.'],
    ['semerveille', '{qui} vient tout juste de remplir la gamelle.',
      'Avoir encore soif étonne beaucoup {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Nous mangeons dehors', [
    ['raconte', '{qui} met la table sous le grand arbre.',
      '{qui} annonce le programme : on met un point.'],
    ['demande', '{qui} tient les assiettes et hésite devant la porte.',
      '{qui} attend une réponse pour savoir où aller : on met un point d\'interrogation.'],
    ['semerveille', '{qui} croyait que la pluie durerait toute la journée.',
      'C\'est une belle surprise pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('La porte est ouverte', [
    ['raconte', '{qui} vérifie les salles une par une.',
      '{qui} constate, sans émotion : on met un point.'],
    ['demande', '{qui} arrive les bras chargés et ne voit pas bien devant.',
      '{qui} attend une réponse pour entrer : on met un point d\'interrogation.'],
    ['semerveille', '{qui} avait fermé cette porte à clé la veille.',
      'La trouver ouverte étonne beaucoup {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Tu sais nager', [
    ['raconte', '{qui} remplit la fiche de la piscine.',
      '{qui} note un fait, sans émotion : on met un point.'],
    ['demande', '{qui} prépare les groupes et ne connaît pas encore tout le monde.',
      '{qui} attend une réponse pour faire les groupes : on met un point d\'interrogation.'],
    ['semerveille', '{qui} voit le grand bassin traversé du premier coup.',
      '{qui} félicite cette réussite : on met un point d\'exclamation.'],
  ]),
  ...ctx('Il reste une place', [
    ['raconte', '{qui} compte les chaises autour de la table.',
      '{qui} dit ce qui reste : on met un point.'],
    ['demande', '{qui} arrive quand le car est presque plein.',
      '{qui} attend une réponse pour monter : on met un point d\'interrogation.'],
    ['semerveille', '{qui} croyait le spectacle complet depuis longtemps.',
      'C\'est une excellente surprise pour {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Le ballon est dans l\'arbre', [
    ['raconte', '{qui} explique où le ballon a atterri.',
      '{qui} dit où se trouve le ballon : on met un point.'],
    ['demande', '{qui} cherche le ballon dans toute la cour.',
      '{qui} attend une réponse pour le retrouver : on met un point d\'interrogation.'],
    ['semerveille', '{qui} voit le ballon monter tout en haut des branches.',
      'Une telle hauteur étonne beaucoup {qui} : on met un point d\'exclamation.'],
  ]),
  ...ctx('Vous avez fini le puzzle', [
    ['raconte', '{qui} range la boîte et note la date.',
      '{qui} constate, sans émotion : on met un point.'],
    ['demande', '{qui} revient dans la pièce et voit la table dégagée.',
      '{qui} attend une réponse pour comprendre : on met un point d\'interrogation.'],
    ['semerveille', '{qui} avait laissé le puzzle à moitié fait la veille.',
      'C\'est une belle surprise pour {qui} : on met un point d\'exclamation.'],
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
