// Banque du jeu « Les états de l'eau » (E11-T5, #72) — Questionner le monde : la matière.
// Contenu volontairement prudent, écrit à la main. Exactitude avant tout :
//  - la VAPEUR D'EAU est un gaz INVISIBLE. Jamais d'exemple visible (nuage, buée, « fumée » d'une
//    casserole ou d'une bouilloire : ce sont de minuscules gouttes d'eau liquide) : ces mots sont exclus
//    par test, et aucun gaz n'est dessiné par un émoji ;
//  - cas limites ambigus à 7 ans exclus : neige fondue, sorbet, glace à la crème, givre, rosée, eau salée
//    qui gèle, glace qui s'évapore, bouteille d'eau ouverte qui « ne change pas » ;
//  - une eau « qui reste liquide » est toujours dans un récipient FERMÉ (sinon elle s'évapore, lentement) ;
//  - la glace « qui reste de la glace » est au congélateur ou dehors par grand froid.

export const NAMES = [
  'Léa', 'Noé', 'Inès', 'Tom', 'Camille', 'Yanis', 'Maëlys', 'Ali', 'Zoé', 'Lucas', 'Jade', 'Hugo',
  'Nina', 'Kenzo', 'Emma', 'Sacha',
];

export const STATES = [
  { value: 'solide', text: 'Solide' },
  { value: 'liquide', text: 'Liquide' },
  { value: 'gaz', text: 'Gaz' },
];

/** Niveau 1 : l'eau, sous ses trois états. `emoji` seulement s'il est lu sans hésiter. */
export const THINGS = [
  { id: 'glacon', emoji: '🧊', text: 'un glaçon', state: 'solide' },
  { id: 'neige', emoji: '❄️', text: 'un flocon de neige', state: 'solide' },
  { id: 'bonhomme', emoji: '⛄', text: 'un bonhomme de neige', state: 'solide' },
  { id: 'grelon', text: 'un grêlon', state: 'solide' },
  { id: 'goutte', emoji: '💧', text: 'une goutte d\'eau', state: 'liquide' },
  { id: 'pluie', emoji: '🌧️', text: 'la pluie', state: 'liquide' },
  { id: 'mer', emoji: '🌊', text: 'l\'eau de la mer', state: 'liquide' },
  { id: 'robinet', text: 'l\'eau du robinet', state: 'liquide' },
  { id: 'flaque', text: 'une flaque d\'eau', state: 'liquide' },
  { id: 'bain', text: 'l\'eau du bain', state: 'liquide' },
  { id: 'vapeur', text: 'la vapeur d\'eau', state: 'gaz' },
  { id: 'vapeur-air', text: 'l\'eau invisible qui flotte dans l\'air', state: 'gaz' },
  { id: 'vapeur-linge', text: 'l\'eau qui a quitté le linge en séchant', state: 'gaz' },
  { id: 'vapeur-flaque', text: 'l\'eau qui a quitté la flaque en séchant', state: 'gaz' },
  { id: 'grelon-air', text: 'un grêlon qui tombe dans l\'air', state: 'solide' },
  { id: 'goutte-air', text: 'une goutte de pluie dans l\'air', state: 'liquide' },
];

/** Dessins pour « Touche ce qui est solide / liquide » (jamais de gaz : aucun émoji ne le montre). */
export const PICTURES = {
  solide: [
    { value: 'glaçon', emoji: '🧊', label: 'glaçon' },
    { value: 'flocon', emoji: '❄️', label: 'flocon de neige' },
    { value: 'bonhomme', emoji: '⛄', label: 'bonhomme de neige' },
  ],
  liquide: [
    { value: 'goutte', emoji: '💧', label: 'goutte d\'eau' },
    { value: 'pluie', emoji: '🌧️', label: 'pluie' },
    { value: 'vagues', emoji: '🌊', label: 'vagues de la mer' },
  ],
};

/** Phrases de niveau 1 (vraies / fausses, avec la correction de chaque fausse). */
export const STATEMENTS_1 = {
  true: [
    { text: 'La glace est de l\'eau solide.', skill: 'états de l\'eau' },
    { text: 'La pluie est de l\'eau liquide.', skill: 'états de l\'eau' },
    { text: 'La neige est de l\'eau solide.', skill: 'états de l\'eau' },
    { text: 'La vapeur d\'eau est un gaz.', skill: 'la vapeur d\'eau' },
    { text: 'La vapeur d\'eau est invisible.', skill: 'la vapeur d\'eau' },
    { text: 'L\'eau du robinet est liquide : elle coule.', skill: 'états de l\'eau' },
    { text: 'L\'eau peut être solide, liquide ou gaz.', skill: 'états de l\'eau' },
    { text: 'L\'eau liquide coule entre les doigts.', skill: 'états de l\'eau' },
  ],
  false: [
    { text: 'La glace est de l\'eau liquide.', fix: 'La glace est de l\'eau solide.', skill: 'états de l\'eau' },
    { text: 'La pluie est de l\'eau solide.', fix: 'La pluie est de l\'eau liquide : elle coule.', skill: 'états de l\'eau' },
    { text: 'La neige est de l\'eau liquide.', fix: 'La neige est de l\'eau solide.', skill: 'états de l\'eau' },
    { text: 'La vapeur d\'eau est un liquide.', fix: 'La vapeur d\'eau est un gaz.', skill: 'la vapeur d\'eau' },
    { text: 'On voit la vapeur d\'eau.', fix: 'La vapeur d\'eau est invisible : on ne la voit pas.', skill: 'la vapeur d\'eau' },
    { text: 'L\'eau du robinet est solide.', fix: 'L\'eau du robinet est liquide : elle coule.', skill: 'états de l\'eau' },
    { text: 'L\'eau est toujours liquide.', fix: 'L\'eau peut être solide, liquide ou gaz.', skill: 'états de l\'eau' },
    { text: 'L\'eau liquide ne coule pas.', fix: 'L\'eau liquide coule.', skill: 'états de l\'eau' },
  ],
};

// --- Niveau 2 : que se passe-t-il ? ---------------------------------------------------------------

export const SCENE_CHOICES = ['La glace fond.', 'L\'eau gèle.', 'L\'état ne change pas.'];

/**
 * Situations « que se passe-t-il ? ». Le changement dépend de l'état de départ ET de la température :
 * glace au chaud → fond ; eau liquide très froide → gèle ; glace très froide, ou eau qu'il ne fait pas assez froid
 * pour geler → l'état ne change pas (l'eau d'un radiateur chauffe, mais reste liquide). `weight` : fréquence.
 * « fermé » n'est PAS un indice : il y a de l'eau fermée qui gèle, et de l'eau ouverte qui reste liquide
 * (pendant quelques minutes seulement, sinon elle s'évapore). Pas d'eau ouverte au chaud longtemps.
 */
export const OUTCOMES = [
  {
    id: 'fond', out: 'La glace fond.', weight: 2,
    objects: ['un glaçon', 'un cube de glace', 'un morceau de glace'],
    places: ['sur une assiette, en plein soleil', 'sur un radiateur chaud', 'sur une assiette, dans une cuisine très chaude', 'sur une assiette, au-dessus du four allumé', 'dans la main', 'près d\'une cheminée où brûle un feu'],
    explain: 'La glace est au chaud, donc elle fond : elle devient de l\'eau liquide. On dit aussi : c\'est la fusion.',
    skill: 'la glace fond',
  },
  {
    id: 'gele', out: 'L\'eau gèle.', weight: 2,
    objects: ['un bac rempli d\'eau', 'un verre d\'eau', 'une carafe d\'eau fermée', 'une bouteille d\'eau fermée', 'un pot d\'eau fermé'],
    places: ['au congélateur, pour la nuit', 'dehors, pendant une nuit de grand froid', 'sur le balcon, par une nuit d\'hiver glaciale', 'dans le jardin, par une nuit d\'hiver glaciale', 'sur le rebord de la fenêtre, par une nuit d\'hiver glaciale'],
    explain: 'Il fait très froid, donc l\'eau gèle : elle devient de la glace. On dit aussi : c\'est la solidification.',
    skill: 'l\'eau gèle',
  },
  {
    id: 'reste-glace', out: 'L\'état ne change pas.', weight: 0.8,
    objects: ['un glaçon', 'un bac de glaçons', 'un morceau de glace'],
    places: ['au congélateur, pour la nuit', 'au fond du congélateur, pour la nuit', 'dehors, pendant une nuit de grand froid', 'sur le balcon, par une nuit d\'hiver glaciale', 'dans le jardin, par une nuit d\'hiver glaciale'],
    explain: 'Il fait si froid que la glace ne fond pas : elle reste de la glace.',
    skill: 'la glace fond',
  },
  {
    id: 'reste-liquide', out: 'L\'état ne change pas.', weight: 0.7,
    objects: ['une bouteille d\'eau fermée', 'une carafe d\'eau fermée', 'un pot d\'eau fermé'],
    places: ['sur un radiateur chaud, pour la nuit', 'au soleil, sur le rebord de la fenêtre, pour la journée', 'dans une cuisine très chaude, pour la nuit', 'dans le placard de la chambre, pour la nuit'],
    explain: 'L\'eau chauffe un peu, mais elle reste liquide : l\'eau ne gèle que s\'il fait très froid.',
    skill: 'l\'eau gèle',
  },
  {
    id: 'reste-ouvert', out: 'L\'état ne change pas.', weight: 1,
    objects: ['un verre d\'eau', 'un bol d\'eau', 'un bac rempli d\'eau'],
    places: ['dans le réfrigérateur, pendant quelques minutes', 'sur la table, en plein soleil, pendant quelques minutes'],
    explain: 'Il ne fait pas assez froid pour que l\'eau gèle : elle reste de l\'eau liquide.',
    skill: 'l\'eau gèle',
  },
];

/** « Où est passée l'eau ? » (évaporation). Chaque situation est suivie d'un séchage complet. */
export const DRYING = [
  { id: 'linge', text: '{who} étend du linge mouillé sur un fil, au soleil. Deux heures plus tard, il est sec.', soak: 'Elle est rentrée dans le fil.' },
  { id: 'flaque', text: 'Après la pluie, {who} voit une flaque dans la cour goudronnée. Le soleil brille. Le soir, la flaque a disparu.', soak: 'Elle est rentrée dans le sol.' },
  { id: 'tableau', text: '{who} passe une éponge mouillée sur le tableau. Quelques minutes plus tard, le tableau est sec.', soak: 'Elle est rentrée dans le tableau.' },
  { id: 'serviette', text: '{who} pose une serviette mouillée sur un radiateur chaud. Le lendemain, elle est sèche.', soak: 'Elle est rentrée dans le radiateur.' },
  { id: 'trottoir', text: 'Il a plu sur le trottoir. Le soleil brille. Un peu plus tard, le trottoir est sec.', soak: 'Elle est rentrée dans le trottoir.' },
  { id: 'maillot', text: '{who} étend son maillot de bain mouillé au soleil. Au bout d\'un moment, il est sec.', soak: 'Elle est rentrée dans le maillot.' },
  { id: 'sol', text: '{who} lave le sol carrelé du couloir avec un balai mouillé. Le sol devient sec.', soak: 'Elle est rentrée dans le carrelage.' },
  { id: 'vitre', text: 'La vitre de la cuisine est mouillée par une averse. Le soleil brille. Peu après, la vitre est sèche.', soak: 'Elle est rentrée dans la vitre.' },
];
export const DRYING_RIGHT = [
  'Elle est dans l\'air, invisible.',
  'Elle est devenue de la vapeur d\'eau.',
  'Elle est partie dans l\'air, en gaz.',
  'Elle s\'est évaporée, dans l\'air.',
  'Elle est partie dans l\'air sous forme de vapeur d\'eau.',
  'Elle est dans l\'air, en gaz.',
];
/** Fausses réponses qui reprennent les mots « air » et « gaz » : le mot ne désigne pas la bonne réponse. */
export const DRYING_WRONG_WORD = [
  'Elle est devenue de la glace dans l\'air.',
  'Elle est devenue un gaz qui n\'existe plus.',
  'Elle est devenue de la neige dans l\'air.',
];
export const DRYING_WRONG_PLAIN = [
  'Elle est devenue de la glace.',
  'Elle a disparu pour toujours.',
  'Elle n\'existe plus.',
];
export const DRYING_WRONG = [...DRYING_WRONG_WORD, ...DRYING_WRONG_PLAIN];

/** Nommer le changement (niveau 2 : fond / gèle / s'évapore). `what` = le texte montré. */
export const CHANGES = [
  { id: 'fond-glacon', change: 'fond', what: 'Un glaçon devient de l\'eau liquide.' },
  { id: 'fond-lac', change: 'fond', what: 'La glace d\'un lac devient de l\'eau liquide, au printemps.' },
  { id: 'fond-grelon', change: 'fond', what: 'Un grêlon devient de l\'eau dans la main.' },
  { id: 'fond-bonhomme', change: 'fond', what: 'Un bonhomme de neige devient de l\'eau, au soleil.' },
  { id: 'gele-bac', change: 'gele', what: 'L\'eau d\'un bac devient de la glace, au congélateur.' },
  { id: 'gele-flaque', change: 'gele', what: 'Une flaque devient de la glace, pendant la nuit d\'hiver.' },
  { id: 'gele-lac', change: 'gele', what: 'L\'eau d\'un lac devient de la glace, en hiver.' },
  { id: 'gele-goutte', change: 'gele', what: 'Une goutte d\'eau devient de la glace au congélateur.' },
  { id: 'evapore-flaque', change: 'evapore', what: 'L\'eau d\'une flaque part dans l\'air et on ne la voit plus.' },
  { id: 'evapore-linge', change: 'evapore', what: 'L\'eau du linge mouillé devient de la vapeur d\'eau.' },
  { id: 'evapore-tableau', change: 'evapore', what: 'L\'eau du tableau mouillé devient un gaz invisible.' },
  { id: 'evapore-serviette', change: 'evapore', what: 'L\'eau d\'une serviette sur un radiateur chaud devient de la vapeur d\'eau.' },
];
export const CHANGE_CHOICES = [
  { value: 'fond', text: 'La glace fond.' },
  { value: 'gele', text: 'L\'eau gèle.' },
  { value: 'evapore', text: 'L\'eau s\'évapore.' },
];
export const CHANGE_EXPLAIN = {
  fond: 'La glace devient de l\'eau liquide : elle fond. Il faut qu\'il fasse chaud.',
  gele: 'L\'eau liquide devient de la glace : elle gèle. Il faut qu\'il fasse très froid.',
  evapore: 'L\'eau liquide devient un gaz, la vapeur d\'eau, que l\'on ne voit pas : elle s\'évapore.',
};

// --- Niveau 3 : expériences, déductions, vocabulaire ----------------------------------------------

/** `{who}` est remplacé par un prénom. `{A}`/`{B}` sont permutés dans les variantes « swap ». */
export const EXPERIMENTS = [
  {
    id: 'linge-soleil', swap: true,
    prompt: '{who} étend deux tee-shirts mouillés identiques. Le tee-shirt {A} est au soleil. Le tee-shirt {B} est dans une cave froide. Lequel sèche le plus vite ?',
    right: 'Le tee-shirt {A}', wrong: ['Le tee-shirt {B}', 'Les deux en même temps'],
    explain: 'Plus il fait chaud, plus l\'eau s\'évapore vite. Le tee-shirt du soleil sèche en premier.',
    skill: 'l\'eau s\'évapore',
  },
  {
    id: 'flaque-soleil',
    prompt: 'Après la pluie, {who} voit une flaque dans la cour. Le soleil brille. Le lendemain, elle a disparu. Que s\'est-il passé ?',
    right: 'L\'eau est partie dans l\'air en vapeur d\'eau.',
    wrong: ['L\'eau est devenue de la glace.', 'L\'eau n\'existe plus.'],
    explain: 'L\'eau de la flaque s\'est évaporée : elle est devenue de la vapeur d\'eau, un gaz invisible. L\'eau ne disparaît pas.',
    skill: 'l\'eau s\'évapore',
  },
  {
    id: 'pese-fusion',
    prompt: '{who} pose sur une balance un verre fermé qui contient un glaçon. Puis le glaçon fond dans le verre, toujours fermé. Que lit {who} sur la balance ?',
    right: 'Le même nombre qu\'avant', wrong: ['Un nombre plus petit', 'Un nombre un peu plus grand'],
    explain: 'Quand la glace fond, il y a la même quantité d\'eau : elle est seulement liquide. La balance ne change pas.',
    skill: 'l\'eau se conserve',
  },
  {
    id: 'pese-gel',
    prompt: '{who} pose sur une balance une boîte fermée à moitié remplie d\'eau, puis la met au congélateur. L\'eau gèle. {who} remet la boîte, toujours fermée, sur la balance. Que lit-on ?',
    right: 'Le même nombre qu\'avant', wrong: ['Un nombre plus petit', 'Un nombre plus grand'],
    explain: 'Quand l\'eau gèle, il y a la même quantité d\'eau : elle est seulement solide. La balance ne change pas.',
    skill: 'l\'eau se conserve',
  },
  {
    id: 'vite-fondre',
    prompt: '{who} veut faire fondre un glaçon le plus vite possible. Que fait-on ?',
    right: 'On le met sur un radiateur chaud.', wrong: ['On le met au congélateur.', 'On le laisse dehors, une nuit de grand froid.'],
    explain: 'La glace fond quand il fait chaud. Au grand froid, elle reste de la glace.',
    skill: 'la glace fond',
  },
  {
    id: 'faire-glace',
    prompt: '{who} veut transformer de l\'eau en glace. Que fait-on ?',
    right: 'On met l\'eau au congélateur.', wrong: ['On met l\'eau sur un radiateur.', 'On met l\'eau au soleil.'],
    explain: 'L\'eau gèle quand il fait très froid, comme au congélateur.',
    skill: 'l\'eau gèle',
  },
  {
    id: 'flaque-gele',
    prompt: 'Pour qu\'une flaque gèle dehors, comment doit être la nuit ?',
    right: 'Très froide', wrong: ['Très chaude', 'Très pluvieuse'],
    explain: 'L\'eau gèle quand il fait très froid. La pluie ne change rien.',
    skill: 'l\'eau gèle',
  },
  {
    id: 'lac',
    prompt: 'En hiver, l\'eau d\'un lac a gelé. Au printemps, il fait plus chaud. Que va-t-il se passer ?',
    right: 'La glace va fondre et redevenir de l\'eau liquide.', wrong: ['La glace va rester de la glace toute l\'année.', 'La glace va devenir de la neige, qui tombe du ciel.'],
    explain: 'La glace fond quand il fait chaud : elle redevient de l\'eau liquide.',
    skill: 'la glace fond',
  },
  {
    id: 'deux-congelateur',
    prompt: '{who} met un glaçon et un verre d\'eau au congélateur, pour la nuit. Le lendemain, que se passe-t-il ?',
    right: 'Le glaçon reste de la glace, l\'eau gèle.',
    wrong: ['Le glaçon fond, l\'eau devient de la glace.', 'Le glaçon reste de la glace, l\'eau reste liquide.'],
    explain: 'Il fait très froid : le glaçon ne fond pas et l\'eau gèle.',
    skill: 'la glace fond',
  },
  {
    id: 'deux-chaud',
    prompt: '{who} laisse un glaçon et une bouteille d\'eau fermée dans une pièce chaude. Que se passe-t-il ?',
    right: 'Le glaçon fond, l\'eau reste liquide.',
    wrong: ['Le glaçon reste de la glace, l\'eau gèle.', 'Le glaçon fond, l\'eau devient de la glace.'],
    explain: 'La chaleur fait fondre la glace. L\'eau liquide, elle, ne gèle pas quand il fait chaud.',
    skill: 'la glace fond',
  },
  {
    id: 'main',
    prompt: 'Pourquoi un glaçon fond-il dans la main ?',
    right: 'Parce que la main est plus chaude que la glace.', wrong: ['Parce que la main est mouillée.', 'Parce que la main appuie dessus.'],
    explain: 'La glace fond quand elle est au chaud, comme dans une main.',
    skill: 'la glace fond',
  },
  {
    id: 'refaire-glace',
    prompt: '{who} fait fondre un glaçon, puis met l\'eau obtenue au congélateur pour la nuit. Que trouve-t-on le lendemain ?',
    right: 'De la glace, comme au début.', wrong: ['De la vapeur d\'eau.', 'De l\'eau liquide.'],
    explain: 'L\'eau gèle quand il fait très froid : elle redevient de la glace.',
    skill: 'l\'eau gèle',
  },
  {
    id: 'voir-vapeur',
    prompt: '{who} dit : « Il y a de la vapeur d\'eau dans l\'air de la classe. » Peut-on la voir ?',
    right: 'Non, la vapeur d\'eau est invisible.', wrong: ['Oui, on la voit comme un petit point blanc.', 'Oui, mais seulement le soir.'],
    explain: 'La vapeur d\'eau est un gaz. Un gaz comme elle est invisible.',
    skill: 'la vapeur d\'eau',
  },
  {
    id: 'sec-radiateur',
    prompt: '{who} pose une serviette mouillée sur un radiateur chaud. Elle devient sèche. Que devient l\'eau ?',
    right: 'Elle devient de la vapeur d\'eau, dans l\'air.', wrong: ['Elle devient de la glace, sur le radiateur.', 'Elle devient de la neige.'],
    explain: 'L\'eau de la serviette s\'est évaporée : elle est partie dans l\'air, invisible.',
    skill: 'l\'eau s\'évapore',
  },
];

/** Vocabulaire du niveau 3 : fusion, solidification, évaporation. */
export const VOCAB = [
  { id: 'fusion-glacon', word: 'fusion', what: 'Un glaçon devient de l\'eau liquide.' },
  { id: 'fusion-lac', word: 'fusion', what: 'Au printemps, la glace d\'un lac devient de l\'eau liquide.' },
  { id: 'fusion-neige', word: 'fusion', what: 'Un bonhomme de neige devient de l\'eau liquide, au soleil.' },
  { id: 'fusion-grelon', word: 'fusion', what: 'Dans la main, un grêlon devient de l\'eau liquide.' },
  { id: 'solid-bac', word: 'solidification', what: 'L\'eau d\'un bac à glaçons devient de la glace.' },
  { id: 'solid-flaque', word: 'solidification', what: 'Une flaque devient de la glace, une nuit de grand froid.' },
  { id: 'solid-lac', word: 'solidification', what: 'L\'eau d\'un lac devient de la glace, en hiver.' },
  { id: 'solid-goutte', word: 'solidification', what: 'Des gouttes d\'eau deviennent de la glace au congélateur.' },
  { id: 'evap-flaque', word: 'evaporation', what: 'L\'eau d\'une flaque devient de la vapeur d\'eau.' },
  { id: 'evap-linge', word: 'evaporation', what: 'L\'eau du linge mouillé devient de la vapeur d\'eau.' },
  { id: 'evap-tableau', word: 'evaporation', what: 'L\'eau du tableau mouillé devient un gaz invisible.' },
  { id: 'evap-serviette', word: 'evaporation', what: 'L\'eau d\'une serviette sur le radiateur devient un gaz.' },
];
export const VOCAB_CHOICES = [
  { value: 'fusion', text: 'La fusion' },
  { value: 'solidification', text: 'La solidification' },
  { value: 'evaporation', text: 'L\'évaporation' },
];
export const VOCAB_EXPLAIN = {
  fusion: 'Solide → liquide : c\'est la fusion. La glace devient de l\'eau liquide, quand il fait chaud.',
  solidification: 'Liquide → solide : c\'est la solidification. L\'eau devient de la glace, quand il fait très froid.',
  evaporation: 'Liquide → gaz : c\'est l\'évaporation. L\'eau devient de la vapeur d\'eau, invisible.',
};

/** Rangement à trois boîtes (niveau 3). */
export const SORT_ITEMS = THINGS.filter((t) => !['bonhomme', 'bain'].includes(t.id));

/** Phrases de niveau 3. */
export const STATEMENTS_3 = {
  true: [
    { text: 'Quand un glaçon fond, il y a la même quantité d\'eau qu\'avant.', skill: 'l\'eau se conserve' },
    { text: 'L\'eau gèle quand il fait très froid.', skill: 'l\'eau gèle' },
    { text: 'La glace fond quand il fait chaud.', skill: 'la glace fond' },
    { text: 'Le linge sèche parce que son eau part dans l\'air.', skill: 'l\'eau s\'évapore' },
    { text: 'La vapeur d\'eau est un gaz invisible.', skill: 'la vapeur d\'eau' },
    { text: 'L\'eau d\'une flaque qui sèche ne disparaît pas : elle part dans l\'air.', skill: 'l\'eau s\'évapore' },
    { text: 'Un glaçon laissé au congélateur reste de la glace.', skill: 'la glace fond' },
    { text: 'La fusion est le passage du solide au liquide.', skill: 'fusion et solidification' },
    { text: 'La solidification est le passage du liquide au solide.', skill: 'fusion et solidification' },
    { text: 'L\'évaporation est le passage du liquide au gaz.', skill: 'l\'eau s\'évapore' },
  ],
  false: [
    { text: 'Quand un glaçon fond, il y a moins d\'eau qu\'avant.', fix: 'Quand un glaçon fond, il y a la même quantité d\'eau, mais elle est liquide.', skill: 'l\'eau se conserve' },
    { text: 'L\'eau gèle quand il fait chaud.', fix: 'L\'eau gèle quand il fait très froid.', skill: 'l\'eau gèle' },
    { text: 'La glace fond quand il fait très froid.', fix: 'La glace fond quand il fait chaud.', skill: 'la glace fond' },
    { text: 'Le linge sèche parce que son eau devient de la glace.', fix: 'L\'eau du linge part dans l\'air, en vapeur d\'eau.', skill: 'l\'eau s\'évapore' },
    { text: 'On voit la vapeur d\'eau dans l\'air.', fix: 'La vapeur d\'eau est invisible : on ne la voit pas.', skill: 'la vapeur d\'eau' },
    { text: 'Quand une flaque sèche, son eau n\'existe plus.', fix: 'L\'eau de la flaque est partie dans l\'air, en vapeur d\'eau.', skill: 'l\'eau s\'évapore' },
    { text: 'Un glaçon laissé au congélateur devient de l\'eau liquide.', fix: 'Au congélateur, il fait trop froid pour qu\'il fonde : il reste de la glace.', skill: 'la glace fond' },
    { text: 'La fusion est le passage du liquide au solide.', fix: 'La fusion, c\'est le passage du solide au liquide.', skill: 'fusion et solidification' },
    { text: 'La solidification est le passage du solide au liquide.', fix: 'La solidification, c\'est le passage du liquide au solide.', skill: 'fusion et solidification' },
    { text: 'L\'évaporation est le passage du solide au liquide.', fix: 'L\'évaporation, c\'est le passage du liquide au gaz.', skill: 'l\'eau s\'évapore' },
  ],
};
