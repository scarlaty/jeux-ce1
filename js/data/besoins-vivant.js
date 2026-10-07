// Banque du jeu « Besoins des animaux et des plantes » (E11-T1, #68).
// Contenu volontairement prudent : seuls des cas SANS AMBIGUÏTÉ au niveau CE1.
// Exclus exprès : graine, feu, nuage, soleil, rivière, fruit ou légume cueilli, champignon, virus,
// et toute plante « à part » (carnivore, sans terre). Pour une plante on reste à « eau et lumière ».

/** Êtres vivants : animaux et plantes que l'enfant nomme sans hésiter. */
export const LIVING = [
  { word: 'chat', det: 'un', emoji: '🐱', kind: 'animal' },
  { word: 'chien', det: 'un', emoji: '🐶', kind: 'animal' },
  { word: 'poisson', det: 'un', emoji: '🐟', kind: 'animal' },
  { word: 'oiseau', det: 'un', emoji: '🐦', kind: 'animal' },
  { word: 'grenouille', det: 'une', emoji: '🐸', kind: 'animal' },
  { word: 'tortue', det: 'une', emoji: '🐢', kind: 'animal' },
  { word: 'abeille', det: 'une', emoji: '🐝', kind: 'animal' },
  { word: 'coccinelle', det: 'une', emoji: '🐞', kind: 'animal' },
  { word: 'escargot', det: 'un', emoji: '🐌', kind: 'animal' },
  { word: 'éléphant', det: 'un', emoji: '🐘', kind: 'animal' },
  { word: 'cheval', det: 'un', emoji: '🐴', kind: 'animal' },
  { word: 'lapin', det: 'un', emoji: '🐰', kind: 'animal' },
  { word: 'papillon', det: 'un', emoji: '🦋', kind: 'animal' },
  { word: 'canard', det: 'un', emoji: '🦆', kind: 'animal' },
  { word: 'vache', det: 'une', emoji: '🐮', kind: 'animal' },
  { word: 'arbre', det: 'un', emoji: '🌳', kind: 'plante' },
  { word: 'tulipe', det: 'une', emoji: '🌷', kind: 'plante' },
  { word: 'tournesol', det: 'un', emoji: '🌻', kind: 'plante' },
  { word: 'cactus', det: 'un', emoji: '🌵', kind: 'plante' },
  { word: 'palmier', det: 'un', emoji: '🌴', kind: 'plante' },
  { word: 'sapin', det: 'un', emoji: '🌲', kind: 'plante' },
];

/** Objets fabriqués : jamais vivants, jamais de matière « naturelle » qui prêterait à discussion. */
export const OBJECTS = [
  { word: 'ballon de foot', det: 'un', emoji: '⚽' },
  { word: 'voiture', det: 'une', emoji: '🚗' },
  { word: 'peluche', det: 'une', emoji: '🧸' },
  { word: 'clé', det: 'une', emoji: '🔑' },
  { word: 'cuillère', det: 'une', emoji: '🥄' },
  { word: 'chaussure', det: 'une', emoji: '👟' },
  { word: 'chaussette', det: 'une', emoji: '🧦' },
  { word: 'vélo', det: 'un', emoji: '🚲' },
  { word: 'marteau', det: 'un', emoji: '🔨' },
  { word: 'maison', det: 'une', emoji: '🏠' },
  { word: 'réveil', det: 'un', emoji: '⏰' },
  { word: 'parapluie', det: 'un', emoji: '☂️' },
  { word: 'ballon de baudruche', det: 'un', emoji: '🎈' },
  { word: 'téléphone', det: 'un', emoji: '📱' },
  { word: 'train', det: 'un', emoji: '🚂' },
  { word: 'lit', det: 'un', emoji: '🛏️' },
];

/** Objets sans rapport avec le vivant : intrus évidents quand on demande ce dont un être vivant a besoin. */
export const SILLY = [
  { value: 'ballon', emoji: '⚽', label: 'd\'un ballon' },
  { value: 'peluche', emoji: '🧸', label: 'd\'une peluche' },
  { value: 'television', emoji: '📺', label: 'd\'une télévision' },
  { value: 'velo', emoji: '🚲', label: 'd\'un vélo' },
  { value: 'chaussures', emoji: '👟', label: 'de chaussures' },
  { value: 'telephone', emoji: '📱', label: 'd\'un téléphone' },
  { value: 'ciseaux', emoji: '✂️', label: 'de ciseaux' },
  { value: 'cle', emoji: '🔑', label: 'd\'une clé' },
];

export const PLANT_NEEDS = [
  { value: 'eau', emoji: '💧', label: 'de l\'eau' },
  { value: 'lumiere', emoji: '☀️', label: 'de lumière' },
];

export const ANIMAL_NEEDS = [
  { value: 'eau', emoji: '💧', label: 'd\'eau à boire' },
  { value: 'nourriture', emoji: '🍽️', label: 'de nourriture' },
];

/** Expériences et situations sur les plantes (niveau 2). Les 3 réponses sont des phrases. */
export const PLANT_EXPERIMENTS = [
  {
    id: 'placard',
    prompt: 'On met une plante dans un placard fermé, sans lumière. On l\'arrose bien. Après quelques semaines, que va-t-il se passer ?',
    right: 'Ses feuilles vont jaunir et la plante va s\'affaiblir.',
    wrong: ['Elle va rester verte et en pleine forme.', 'Elle va faire plein de fleurs.'],
    explain: 'Sans lumière, une plante s\'affaiblit, même arrosée. Elle a besoin de lumière.',
    skill: 'besoin de lumière',
  },
  {
    id: 'sans-eau',
    prompt: 'On met une plante près d\'une fenêtre. On ne l\'arrose jamais. Que va-t-il se passer ?',
    right: 'Elle va se faner : ses feuilles vont devenir molles et sèches.',
    wrong: ['Elle va rester en pleine forme.', 'Elle va faire des fruits.'],
    explain: 'Sans eau, une plante se fane. Elle a besoin d\'eau.',
    skill: 'besoin d\'eau',
  },
  {
    id: 'deux-eau-a',
    prompt: 'Deux plantes pareilles sont près d\'une fenêtre. On arrose la plante A tous les jours, mais jamais la plante B. Laquelle va rester en pleine forme ?',
    right: 'La plante A',
    wrong: ['La plante B', 'Les deux plantes'],
    explain: 'La plante A est arrosée : elle a de l\'eau. La plante B n\'en a pas, elle va se faner.',
    skill: 'besoin d\'eau',
  },
  {
    id: 'deux-eau-b',
    prompt: 'Deux plantes pareilles sont près d\'une fenêtre. On arrose la plante B tous les jours, mais jamais la plante A. Laquelle va rester en pleine forme ?',
    right: 'La plante B',
    wrong: ['La plante A', 'Les deux plantes'],
    explain: 'La plante B est arrosée : elle a de l\'eau. La plante A n\'en a pas, elle va se faner.',
    skill: 'besoin d\'eau',
  },
  {
    id: 'deux-lumiere-a',
    prompt: 'Deux plantes pareilles sont arrosées tous les jours. La plante A est près d\'une fenêtre. La plante B est dans un placard sans lumière. Laquelle va rester en pleine forme ?',
    right: 'La plante A',
    wrong: ['La plante B', 'Les deux plantes'],
    explain: 'La plante A a de la lumière. La plante B n\'en a pas, elle va s\'affaiblir.',
    skill: 'besoin de lumière',
  },
  {
    id: 'deux-lumiere-b',
    prompt: 'Deux plantes pareilles sont arrosées tous les jours. La plante B est près d\'une fenêtre. La plante A est dans un placard sans lumière. Laquelle va rester en pleine forme ?',
    right: 'La plante B',
    wrong: ['La plante A', 'Les deux plantes'],
    explain: 'La plante B a de la lumière. La plante A n\'en a pas, elle va s\'affaiblir.',
    skill: 'besoin de lumière',
  },
  {
    id: 'soin',
    prompt: 'Tu veux que ta plante reste en bonne santé. Que dois-tu faire ?',
    right: 'L\'arroser et la mettre près d\'une fenêtre.',
    wrong: ['La laisser dans le noir, sans eau.', 'La mettre dans un placard fermé et l\'arroser.'],
    explain: 'Une plante a besoin d\'eau et de lumière.',
    skill: 'besoins d\'une plante',
  },
  {
    id: 'pourquoi-arroser',
    prompt: 'Pourquoi arrose-t-on une plante ?',
    right: 'Parce qu\'elle a besoin d\'eau pour vivre.',
    wrong: ['Parce qu\'elle s\'ennuie.', 'Parce qu\'elle a besoin de dormir.'],
    explain: 'Une plante a besoin d\'eau pour vivre.',
    skill: 'besoin d\'eau',
  },
  {
    id: 'pourquoi-fenetre',
    prompt: 'Pourquoi met-on souvent une plante près d\'une fenêtre ?',
    right: 'Parce qu\'elle a besoin de lumière.',
    wrong: ['Parce qu\'elle veut regarder dehors.', 'Parce qu\'elle a besoin d\'entendre du bruit.'],
    explain: 'Près de la fenêtre, la plante reçoit de la lumière. Elle en a besoin pour vivre.',
    skill: 'besoin de lumière',
  },
  ...['haricot', 'lentille', 'blé'].map((graine) => ({
    id: `coton-${graine}`,
    prompt: `On met des graines de ${graine} dans deux assiettes, au même endroit. On mouille le coton de l'assiette 1, mais pas celui de l'assiette 2. Dans quelle assiette les graines vont-elles pousser ?`,
    right: 'Dans l\'assiette 1',
    wrong: ['Dans l\'assiette 2', 'Dans les deux assiettes'],
    explain: 'Pour pousser, il faut de l\'eau. L\'assiette 1 est mouillée.',
    skill: 'besoin d\'eau',
  })),
];

/** Régimes sans équivoque : `eats` = vrais, `not` = ce que l'animal ne mange jamais. */
export const DIETS = [
  { word: 'lapin', def: 'le lapin', emoji: '🐰', eats: ['de l\'herbe', 'des carottes', 'du foin'], not: ['de la viande', 'du poisson', 'des os'] },
  { word: 'vache', def: 'la vache', emoji: '🐮', eats: ['de l\'herbe', 'du foin'], not: ['de la viande', 'du poisson', 'des os'] },
  { word: 'cheval', def: 'le cheval', emoji: '🐴', eats: ['de l\'herbe', 'du foin'], not: ['de la viande', 'du poisson', 'des os'] },
  { word: 'mouton', def: 'le mouton', emoji: '🐑', eats: ['de l\'herbe', 'du foin'], not: ['de la viande', 'du poisson', 'des os'] },
  { word: 'girafe', def: 'la girafe', emoji: '🦒', eats: ['des feuilles d\'arbres'], not: ['de la viande', 'du poisson', 'des os'] },
  { word: 'éléphant', def: 'l\'éléphant', emoji: '🐘', eats: ['de l\'herbe', 'des feuilles d\'arbres'], not: ['de la viande', 'du poisson', 'des os'] },
  { word: 'lion', def: 'le lion', emoji: '🦁', eats: ['de la viande'], not: ['des carottes', 'du foin', 'des feuilles d\'arbres'] },
  { word: 'chat', def: 'le chat', emoji: '🐱', eats: ['de la viande', 'du poisson'], not: ['du foin', 'des carottes', 'des feuilles d\'arbres'] },
  { word: 'écureuil', def: 'l\'écureuil', emoji: '🐿️', eats: ['des noisettes', 'des graines'], not: ['du poisson', 'de la viande', 'des os'] },
  { word: 'singe', def: 'le singe', emoji: '🐒', eats: ['des bananes', 'des fruits'], not: ['des os', 'du foin', 'des cailloux'] },
  { word: 'oiseau', def: 'l\'oiseau', emoji: '🐦', eats: ['des graines', 'des insectes'], not: ['des os', 'du foin', 'des carottes'] },
  { word: 'grenouille', def: 'la grenouille', emoji: '🐸', eats: ['des insectes', 'de petits vers'], not: ['de l\'herbe', 'des carottes', 'des os'] },
  { word: 'escargot', def: 'l\'escargot', emoji: '🐌', eats: ['des feuilles', 'de la salade'], not: ['de la viande', 'des os', 'du poisson'] },
];

/** Qui mange de l'herbe / de la viande (niveau 2) : animaux sans équivoque. */
export const GRASS_EATERS = ['lapin', 'vache', 'cheval', 'mouton'];
export const NON_GRASS = [
  { word: 'lion', emoji: '🦁' }, { word: 'grenouille', emoji: '🐸' }, { word: 'requin', emoji: '🦈' },
];
export const GRASS_EATER_EMOJI = { lapin: '🐰', vache: '🐮', cheval: '🐴', mouton: '🐑' };

/** Abris et milieux de vie (niveau 2). */
export const HABITATS = [
  { word: 'lapin sauvage', emoji: '🐰', ask: 'Où le lapin sauvage s\'abrite-t-il ?', right: 'dans un terrier', wrong: ['dans un nid', 'dans une ruche', 'dans une niche'], explain: 'Le lapin sauvage creuse un terrier : c\'est son abri.' },
  { word: 'oiseau', emoji: '🐦', ask: 'Où l\'oiseau installe-t-il ses œufs ?', right: 'dans un nid', wrong: ['dans une ruche', 'dans une niche', 'dans une étable'], explain: 'L\'oiseau construit un nid pour ses œufs et ses petits.' },
  { word: 'abeille', emoji: '🐝', ask: 'Où vivent les abeilles ?', right: 'dans une ruche', wrong: ['dans une niche', 'dans une étable', 'dans une mare'], explain: 'Les abeilles vivent ensemble dans une ruche.' },
  { word: 'chien', emoji: '🐶', ask: 'Quel petit abri est fait pour le chien, au jardin ?', right: 'une niche', wrong: ['une ruche', 'une mare', 'une étable'], explain: 'La niche est l\'abri du chien.' },
  { word: 'vache', emoji: '🐮', ask: 'Où la vache s\'abrite-t-elle, à la ferme ?', right: 'dans une étable', wrong: ['dans une ruche', 'dans une niche', 'dans un nid'], explain: 'À la ferme, la vache s\'abrite dans l\'étable.' },
  { word: 'cheval', emoji: '🐴', ask: 'Où le cheval s\'abrite-t-il, à la ferme ?', right: 'dans une écurie', wrong: ['dans une ruche', 'dans une niche', 'dans une mare'], explain: 'À la ferme, le cheval s\'abrite dans l\'écurie.' },
  { word: 'mouton', emoji: '🐑', ask: 'Où le mouton s\'abrite-t-il, à la ferme ?', right: 'dans une bergerie', wrong: ['dans une ruche', 'dans une niche', 'dans une mare'], explain: 'À la ferme, le mouton s\'abrite dans la bergerie.' },
  { word: 'poule', emoji: '🐔', ask: 'Où la poule s\'abrite-t-elle, à la ferme ?', right: 'dans un poulailler', wrong: ['dans une ruche', 'dans une niche', 'dans un terrier'], explain: 'À la ferme, la poule s\'abrite dans le poulailler.' },
  { word: 'grenouille', emoji: '🐸', ask: 'Où la grenouille vit-elle ?', right: 'près d\'une mare', wrong: ['dans une ruche', 'dans une niche', 'dans une étable'], explain: 'La grenouille a besoin d\'eau : elle vit près d\'une mare.' },
  { word: 'escargot', emoji: '🐌', ask: 'Où l\'escargot se cache-t-il quand il a peur ?', right: 'dans sa coquille', wrong: ['dans un nid', 'dans une niche', 'dans une ruche'], explain: 'La coquille est l\'abri de l\'escargot, il la porte partout.' },
  { word: 'fourmi', emoji: '🐜', ask: 'Où vivent les fourmis ?', right: 'dans une fourmilière', wrong: ['dans une niche', 'dans une étable', 'dans une ruche'], explain: 'Les fourmis vivent ensemble dans une fourmilière.' },
  { word: 'poisson', emoji: '🐟', ask: 'Où vit le poisson ?', right: 'dans l\'eau', wrong: ['dans un nid', 'dans un terrier', 'sur une branche'], explain: 'Le poisson vit dans l\'eau.' },
  { word: 'poisson-respire', emoji: '🐟', ask: 'Où le poisson respire-t-il ?', right: 'dans l\'eau', wrong: ['dans un nid', 'dans un terrier', 'sur une branche'], explain: 'Le poisson respire dans l\'eau, là où il vit.' },
];

/** Situations « il manque quelque chose » (niveau 3). `lack` = le besoin non satisfait ; les autres sont dits satisfaits. */
export const DEDUCTIONS = [
  // Plantes : besoin = eau ou lumière
  { id: 'p-eau-fenetre', who: 'plante', emoji: '🌱', lack: 'eau', text: 'Une plante est près d\'une grande fenêtre ensoleillée. Sa terre est toute sèche et dure. Ses feuilles jaunissent et tombent.', explain: 'La terre est sèche : la plante manque d\'eau. Il faut l\'arroser.' },
  { id: 'p-eau-etagere', who: 'plante', emoji: '🌱', lack: 'eau', text: 'Une plante verte est sur une étagère très lumineuse. On ne l\'a pas arrosée depuis deux mois. Elle est toute molle et ses feuilles pendent.', explain: 'Elle n\'a pas été arrosée : la plante manque d\'eau.' },
  { id: 'p-eau-jardin', who: 'plante', emoji: '🌱', lack: 'eau', text: 'Au jardin, il n\'a pas plu depuis longtemps. Une plante est en plein soleil. Sa terre est toute craquelée et ses feuilles tombent.', explain: 'La terre est craquelée et sèche : la plante manque d\'eau.' },
  { id: 'p-lum-cave', who: 'plante', emoji: '🌱', lack: 'lumiere', text: 'Une plante est dans une cave sans fenêtre. On l\'arrose bien : sa terre est humide. Ses feuilles sont pâles et jaunissent.', explain: 'Elle est arrosée, mais dans le noir : la plante manque de lumière.' },
  { id: 'p-lum-placard', who: 'plante', emoji: '🌱', lack: 'lumiere', text: 'Une plante est restée trois semaines dans un placard fermé. Sa terre est humide car on l\'arrose. Ses feuilles deviennent pâles.', explain: 'Elle est arrosée, mais dans le noir : la plante manque de lumière.' },
  { id: 'p-lum-couloir', who: 'plante', emoji: '🌱', lack: 'lumiere', text: 'Une plante est au fond d\'une pièce sans fenêtre, toujours dans le noir. Sa terre est bien mouillée. Elle s\'affaiblit.', explain: 'Elle a de l\'eau, mais pas de lumière : la plante manque de lumière.' },
  // Animaux : besoin = eau, nourriture, abri ou air
  { id: 'a-eau-hamster', who: 'animal', emoji: '🐹', lack: 'eau', text: 'Un hamster vit dans sa cage. Il a des graines et un petit abri. Sa bouteille d\'eau est vide depuis deux jours. Il bouge très peu.', explain: 'Il a à manger et un abri, mais plus d\'eau : il manque d\'eau à boire.' },
  { id: 'a-nourriture-chat', who: 'animal', emoji: '🐱', lack: 'nourriture', text: 'Un chat vit dans une maison. Il a un panier et une gamelle d\'eau pleine. Il n\'a rien mangé depuis deux jours et il maigrit.', explain: 'Il a de l\'eau et un abri, mais rien à manger : il manque de nourriture.' },
  { id: 'a-abri-chien', who: 'animal', emoji: '🐶', lack: 'abri', text: 'Un chien est dehors sous une pluie froide. Il a de l\'eau et de quoi manger, mais il n\'a aucun endroit pour se mettre à l\'abri. Il tremble.', explain: 'Il a de l\'eau et à manger, mais pas d\'abri : il manque d\'un abri.' },
  { id: 'a-air-escargot', who: 'animal', emoji: '🐌', lack: 'air', text: 'Un escargot est enfermé depuis plusieurs jours dans un bocal fermé, sans aucun trou. Il a de la salade et de l\'eau. Il reste dans sa coquille et ne bouge plus.', explain: 'Dans un bocal sans trou, il n\'y a plus d\'air : il manque d\'air pour respirer.' },
  { id: 'a-nourriture-lapin', who: 'animal', emoji: '🐰', lack: 'nourriture', text: 'Un lapin nain a de l\'eau fraîche et un petit abri. Depuis trois jours, il n\'a plus ni foin ni légumes. Il maigrit.', explain: 'Il a de l\'eau et un abri, mais plus rien à manger : il manque de nourriture.' },
  { id: 'a-eau-oiseau', who: 'animal', emoji: '🐦', lack: 'eau', text: 'Un oiseau vit dans une cage avec des graines et un nid bien au chaud. Sa petite coupelle d\'eau est vide depuis deux jours. Il reste tout mou.', explain: 'Il a à manger et un abri, mais plus d\'eau : il manque d\'eau à boire.' },
];

/** Ce qui peut manquer, écrit comme réponse (« Que lui manque-t-il ? »). */
export const NEED_NOUN = {
  eau: "De l'eau",
  lumiere: 'De la lumière',
  nourriture: 'De la nourriture',
  abri: 'Un abri',
  air: "De l'air",
};
export const SILLY_NOUN = ['Un ballon', 'Une peluche', 'Une télévision', 'Un vélo', 'Des chaussures', 'Un téléphone', 'Une clé', 'Des ciseaux'];

/** Phrases vraies / fausses (niveau 3). Aucune phrase ne dépend d'un cas limite. */
export const TRUE_STATEMENTS = [
  { text: 'Une plante a besoin d\'eau et de lumière.', skill: 'besoins d\'une plante' },
  { text: 'Un animal a besoin de manger et de boire.', skill: 'besoins d\'un animal' },
  { text: 'Un poisson vit et respire dans l\'eau.', skill: 'besoins d\'un animal' },
  { text: 'Un arbre est un être vivant.', skill: 'vivant ou pas vivant' },
  { text: 'Une chaise n\'est pas un être vivant.', skill: 'vivant ou pas vivant' },
  { text: 'Un lapin a besoin d\'un abri pour se protéger.', skill: 'besoins d\'un animal' },
  { text: 'Une plante sans lumière s\'affaiblit.', skill: 'besoins d\'une plante' },
  { text: 'Une plante sans eau se fane.', skill: 'besoins d\'une plante' },
  { text: 'Un chat a besoin de manger.', skill: 'besoins d\'un animal' },
  { text: 'Un être vivant naît et grandit.', skill: 'vivant ou pas vivant' },
];
export const FALSE_STATEMENTS = [
  { text: 'Une plante n\'a pas besoin d\'eau.', fix: 'Une plante a besoin d\'eau pour vivre.', skill: 'besoins d\'une plante' },
  { text: 'Une plante grandit très bien dans un placard fermé.', fix: 'Une plante a besoin de lumière : dans un placard fermé, elle s\'affaiblit.', skill: 'besoins d\'une plante' },
  { text: 'Un lapin n\'a pas besoin de boire.', fix: 'Un lapin, comme tout animal, a besoin de boire.', skill: 'besoins d\'un animal' },
  { text: 'Une pierre a besoin d\'eau et de nourriture.', fix: 'Une pierre n\'est pas vivante : elle n\'a besoin de rien.', skill: 'vivant ou pas vivant' },
  { text: 'Un poisson vit dans un nid.', fix: 'Un poisson vit dans l\'eau.', skill: 'besoins d\'un animal' },
  { text: 'Une voiture est un être vivant.', fix: 'Une voiture est un objet : elle ne naît pas et ne grandit pas.', skill: 'vivant ou pas vivant' },
  { text: 'Un arbre n\'est pas vivant.', fix: 'Un arbre est une plante : c\'est un être vivant.', skill: 'vivant ou pas vivant' },
  { text: 'Un chat peut vivre sans jamais manger.', fix: 'Un chat, comme tout animal, a besoin de manger.', skill: 'besoins d\'un animal' },
  { text: 'Les animaux n\'ont pas besoin d\'eau.', fix: 'Tous les animaux ont besoin d\'eau.', skill: 'besoins d\'un animal' },
  { text: 'Un ballon est un être vivant.', fix: 'Un ballon est un objet : il ne naît pas et ne grandit pas.', skill: 'vivant ou pas vivant' },
];

/** Besoin commun à un animal et à une plante : seulement l'eau. */
export const COMMON_ANIMALS = [
  { word: 'chat', def: 'un chat', emoji: '🐱' },
  { word: 'lapin', def: 'un lapin', emoji: '🐰' },
  { word: 'vache', def: 'une vache', emoji: '🐮' },
  { word: 'cheval', def: 'un cheval', emoji: '🐴' },
  { word: 'poisson', def: 'un poisson', emoji: '🐟' },
];
export const COMMON_PLANTS = [
  { word: 'tulipe', def: 'une tulipe', emoji: '🌷' },
  { word: 'tournesol', def: 'un tournesol', emoji: '🌻' },
  { word: 'arbre', def: 'un arbre', emoji: '🌳' },
  { word: 'cactus', def: 'un cactus', emoji: '🌵' },
];
export const NOT_COMMON = ['d\'un nid', 'd\'un terrier', 'd\'une niche', 'd\'une ruche', 'de croquettes'];
