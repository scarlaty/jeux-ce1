// Le verbe et son sujet (E5-T2, #37) : banque écrite à la main. Jamais de phrase générée.
// Une phrase est notée avec des marques, lues par `parseItem` :
//   [le sujet]  {le verbe conjugué}  le reste ; « | » sépare deux compléments (un complément = un groupe).
//   '[Zoé] {donne} un crayon | à Adam.'  →  groupes : Zoé · donne · un crayon · à Adam
// Invariants (vérifiés par tests/games/verbe-sujet.test.js) :
//   - une seule bonne réponse : un seul verbe conjugué par phrase, un seul sujet, aucun mot en double
//     dans une phrase (on touche les mots) ;
//   - l'infinitif de chaque forme est contrôlé contre une table écrite à part dans le test ;
//   - le sujet s'accorde avec le verbe (nombre) : contrôlé contre cette même table ;
//   - homographes évités (joue, danse, porte, ferme, marche, lit, livre… ne servent jamais de verbe
//     nommé, ni de mot dans une phrase où ils seraient ambigus) ;
//   - phrases épicènes, prénoms de filles et de garçons, rôles variés.

/**
 * Chaque verbe : `nous` (présent), `part` (participe passé), et pour les verbes en -er réguliers `vous` et
 * `imp` (imparfait, 3e pers.). `proches` : de vrais infinitifs d'AUTRES verbes, qui ressemblent (lettres ou
 * sens) et ne sont jamais l'infinitif de la forme interrogée.
 */
export const VERBES = {
  // -er réguliers
  chanter: { nous: 'chantons', part: 'chanté', vous: 'chantez', imp: 'chantait', proches: ['changer', 'chercher', 'danser'] },
  manger: { nous: 'mangeons', part: 'mangé', vous: 'mangez', imp: 'mangeait', proches: ['ranger', 'nager', 'boire'] },
  jouer: { nous: 'jouons', part: 'joué', vous: 'jouez', imp: 'jouait', proches: ['écouter', 'sauter', 'porter'] },
  dessiner: { nous: 'dessinons', part: 'dessiné', vous: 'dessinez', imp: 'dessinait', proches: ['danser', 'colorier', 'copier'] },
  danser: { nous: 'dansons', part: 'dansé', vous: 'dansez', imp: 'dansait', proches: ['chanter', 'dessiner', 'sauter'] },
  sauter: { nous: 'sautons', part: 'sauté', vous: 'sautez', imp: 'sautait', proches: ['tomber', 'monter', 'jouer'] },
  regarder: { nous: 'regardons', part: 'regardé', vous: 'regardez', imp: 'regardait', proches: ['garder', 'écouter', 'ranger'] },
  aimer: { nous: 'aimons', part: 'aimé', vous: 'aimez', imp: 'aimait', proches: ['aider', 'arriver', 'parler'] },
  parler: { nous: 'parlons', part: 'parlé', vous: 'parlez', imp: 'parlait', proches: ['partir', 'porter', 'pleurer'] },
  donner: { nous: 'donnons', part: 'donné', vous: 'donnez', imp: 'donnait', proches: ['dormir', 'danser', 'monter'] },
  trouver: { nous: 'trouvons', part: 'trouvé', vous: 'trouvez', imp: 'trouvait', proches: ['tourner', 'rouler', 'chercher'] },
  chercher: { nous: 'cherchons', part: 'cherché', vous: 'cherchez', imp: 'cherchait', proches: ['chanter', 'cacher', 'changer'] },
  laver: { nous: 'lavons', part: 'lavé', vous: 'lavez', imp: 'lavait', proches: ['lever', 'aller', 'ranger'] },
  travailler: { nous: 'travaillons', part: 'travaillé', vous: 'travaillez', imp: 'travaillait', proches: ['trouver', 'tomber', 'tourner'] },
  colorier: { nous: 'colorions', part: 'colorié', vous: 'coloriez', imp: 'coloriait', proches: ['copier', 'crier', 'plier'] },
  arriver: { nous: 'arrivons', part: 'arrivé', vous: 'arrivez', imp: 'arrivait', proches: ['rester', 'rouler', 'rentrer'] },
  nager: { nous: 'nageons', part: 'nagé', vous: 'nagez', imp: 'nageait', proches: ['manger', 'ranger', 'jouer'] },
  ramasser: { nous: 'ramassons', part: 'ramassé', vous: 'ramassez', imp: 'ramassait', proches: ['ranger', 'casser', 'passer'] },
  attraper: { nous: 'attrapons', part: 'attrapé', vous: 'attrapez', imp: 'attrapait', proches: ['attendre', 'acheter', 'tomber'] },
  préparer: { nous: 'préparons', part: 'préparé', vous: 'préparez', imp: 'préparait', proches: ['réparer', 'parler', 'partir'] },
  ranger: { nous: 'rangeons', part: 'rangé', vous: 'rangez', imp: 'rangeait', proches: ['manger', 'changer', 'nager'] },
  oublier: { nous: 'oublions', part: 'oublié', vous: 'oubliez', imp: 'oubliait', proches: ['plier', 'ouvrir', 'copier'] },
  écouter: { nous: 'écoutons', part: 'écouté', vous: 'écoutez', imp: 'écoutait', proches: ['acheter', 'jouer', 'regarder'] },
  tomber: { nous: 'tombons', part: 'tombé', vous: 'tombez', imp: 'tombait', proches: ['monter', 'tourner', 'sauter'] },
  marcher: { nous: 'marchons', part: 'marché', vous: 'marchez', imp: 'marchait', proches: ['chercher', 'courir', 'ranger'] },
  rester: { nous: 'restons', part: 'resté', vous: 'restez', imp: 'restait', proches: ['rentrer', 'arriver', 'rouler'] },
  entrer: { nous: 'entrons', part: 'entré', vous: 'entrez', imp: 'entrait', proches: ['rentrer', 'arriver', 'entendre'] },
  réparer: { nous: 'réparons', part: 'réparé', vous: 'réparez', imp: 'réparait', proches: ['préparer', 'ranger', 'laver'] },
  adorer: { nous: 'adorons', part: 'adoré', vous: 'adorez', imp: 'adorait', proches: ['aimer', 'aider', 'arriver'] },
  préférer: { nous: 'préférons', part: 'préféré', proches: ['préparer', 'réparer', 'parler'] },
  commencer: { nous: 'commençons', part: 'commencé', proches: ['compter', 'comprendre', 'changer'] },
  réveiller: { nous: 'réveillons', part: 'réveillé', proches: ['lever', 'laver', 'rentrer'] },
  amuser: { nous: 'amusons', part: 'amusé', proches: ['aimer', 'aider', 'arriver'] },
  décorer: { nous: 'décorons', part: 'décoré', proches: ['dessiner', 'colorier', 'copier'] },
  // irréguliers et en -ir / -re
  être: { nous: 'sommes', part: 'été', proches: ['avoir', 'aller', 'voir'] },
  avoir: { nous: 'avons', part: 'eu', proches: ['être', 'aller', 'savoir'] },
  aller: { nous: 'allons', part: 'allé', proches: ['avoir', 'venir', 'voir'] },
  faire: { nous: 'faisons', part: 'fait', proches: ['dire', 'lire', 'avoir'] },
  dire: { nous: 'disons', part: 'dit', proches: ['faire', 'lire', 'rire'] },
  venir: { nous: 'venons', part: 'venu', proches: ['vouloir', 'voir', 'aller'] },
  prendre: { nous: 'prenons', part: 'pris', proches: ['rendre', 'apprendre', 'attendre'] },
  voir: { nous: 'voyons', part: 'vu', proches: ['vouloir', 'venir', 'avoir'] },
  vouloir: { nous: 'voulons', part: 'voulu', proches: ['voir', 'pouvoir', 'savoir'] },
  mettre: { nous: 'mettons', part: 'mis', proches: ['prendre', 'faire', 'perdre'] },
  écrire: { nous: 'écrivons', part: 'écrit', proches: ['lire', 'dire', 'dessiner'] },
  lire: { nous: 'lisons', part: 'lu', proches: ['dire', 'rire', 'écrire'] },
  finir: { nous: 'finissons', part: 'fini', proches: ['partir', 'choisir', 'sortir'] },
  choisir: { nous: 'choisissons', part: 'choisi', proches: ['finir', 'partir', 'grandir'] },
  partir: { nous: 'partons', part: 'parti', proches: ['sortir', 'finir', 'venir'] },
  sortir: { nous: 'sortons', part: 'sorti', proches: ['partir', 'finir', 'entrer'] },
  grandir: { nous: 'grandissons', part: 'grandi', proches: ['finir', 'choisir', 'partir'] },
  dormir: { nous: 'dormons', part: 'dormi', proches: ['donner', 'partir', 'sortir'] },
  attendre: { nous: 'attendons', part: 'attendu', proches: ['entendre', 'prendre', 'vendre'] },
  savoir: { nous: 'savons', part: 'su', proches: ['avoir', 'voir', 'vouloir'] },
  devoir: { nous: 'devons', part: 'dû', proches: ['avoir', 'voir', 'venir'] },
  surprendre: { nous: 'surprenons', part: 'surpris', proches: ['apprendre', 'comprendre', 'entendre'] },
  rendre: { nous: 'rendons', part: 'rendu', proches: ['prendre', 'vendre', 'attendre'] },
};

/**
 * Vocabulaire d'un enfant de 7 ans : TOUT infinitif proposé au joueur (réponse, proche, piège) y figure.
 * Écrit à la main, en deuxième exemplaire : une coquille ou un verbe rare dans `proches` fait échouer le test.
 */
export const VOCABULAIRE_CE1 = [
  'être', 'avoir', 'aller', 'faire', 'dire', 'venir', 'prendre', 'voir', 'vouloir', 'mettre', 'écrire', 'lire', 'finir',
  'choisir', 'partir', 'sortir', 'grandir', 'dormir', 'attendre', 'savoir', 'devoir', 'pouvoir', 'rendre', 'apprendre',
  'comprendre', 'entendre', 'vendre', 'perdre', 'boire', 'rire',
  'chanter', 'manger', 'jouer', 'dessiner', 'danser', 'sauter', 'regarder', 'aimer', 'parler', 'donner', 'trouver',
  'chercher', 'laver', 'travailler', 'colorier', 'arriver', 'nager', 'ramasser', 'attraper', 'préparer', 'ranger',
  'oublier', 'écouter', 'tomber', 'marcher', 'rester', 'entrer', 'réparer', 'adorer', 'préférer', 'commencer',
  'réveiller', 'amuser', 'décorer', 'surprendre', 'changer', 'aider', 'porter', 'cacher', 'monter', 'tourner', 'rouler',
  'lever', 'copier', 'crier', 'plier', 'ouvrir', 'casser', 'passer', 'acheter', 'compter', 'courir', 'rentrer',
  'garder', 'pleurer', 'cuisiner', 'dîner',
];

export const INFINITIFS = new Set(VOCABULAIRE_CE1);

const it = (src, inf, extra = {}) => ({ src, inf, ...extra });

// ---- Niveau 1 : phrases courtes, verbes en -er réguliers au présent ------------------------------------
export const N1 = [
  it('[Jade] {chante} une chanson.', 'chanter'),
  it('[Les oiseaux] {chantent} dans l\'arbre.', 'chanter'),
  it('[Mia] {mange} une pomme rouge.', 'manger'),
  it('[Maman] {mange} une crêpe.', 'manger'),
  it('[Les enfants] {jouent} au ballon.', 'jouer'),
  it('[Noah] {dessine} un grand bateau.', 'dessiner'),
  it('[Les élèves] {dessinent} un arbre.', 'dessiner'),
  it('[Lina et Hugo] {dansent} sur la musique.', 'danser'),
  it('[Le chat] {saute} sur la chaise.', 'sauter'),
  it('[Les lapins] {sautent} dans l\'herbe.', 'sauter'),
  it('[Inès] {regarde} un album.', 'regarder'),
  it('[Mamie] {regarde} un film.', 'regarder'),
  it('[Maman] {aime} les fraises.', 'aimer'),
  it('[Adam] {aime} le chocolat.', 'aimer'),
  it('[Nina] {parle} à sa voisine.', 'parler'),
  it('[Zoé] {donne} un crayon | à Adam.', 'donner'),
  it('[Yanis] {trouve} une clé dans l\'herbe.', 'trouver'),
  it('[Sofia] {cherche} son chapeau.', 'chercher'),
  it('[Les enfants] {cherchent} un trésor.', 'chercher'),
  it('[Papa] {lave} la voiture.', 'laver'),
  it('[Tom] {lave} ses mains.', 'laver'),
  it('[Maël] {travaille} dans le jardin.', 'travailler'),
  it('[Jade] {colorie} un dessin.', 'colorier'),
  it('[Le bus] {arrive} devant l\'école.', 'arriver'),
  it('[Les canards] {nagent} sur le lac.', 'nager'),
  it('[Emma] {ramasse} des coquillages.', 'ramasser'),
  it('[Hugo] {attrape} le ballon.', 'attraper'),
  it('[Papi] {prépare} un gâteau.', 'préparer'),
  it('[Lucas] {range} ses jouets.', 'ranger'),
  it('[Léa] {oublie} son sac.', 'oublier'),
  it('[Les élèves] {écoutent} une histoire.', 'écouter'),
  it('[Des feuilles] {tombent} de l\'arbre.', 'tomber'),
  it('[Les enfants] {marchent} dans la rue.', 'marcher'),
  it('[Tom et Emma] {restent} à la maison.', 'rester'),
  it('[Les chiens] {entrent} dans le jardin.', 'entrer'),
  it('[Nous] {chantons} dans la cour.', 'chanter'),
  it('[Nous] {mangeons} à midi.', 'manger'),
  it('[Nous] {dessinons} sur le tableau.', 'dessiner'),
  it('[Maman] {répare} le vélo.', 'réparer'),
];

// ---- Niveau 2 : trouver le sujet ; verbes irréguliers, futur, passé composé ---------------------------
export const N2 = [
  it('[Le ciel] {est} bleu.', 'être'),
  it('[Mia et Léo] {sont} dans la cour.', 'être'),
  it('[Mamie] {est} au jardin.', 'être'),
  it('[Les fleurs] {sont} jolies.', 'être'),
  it('[Lina] {a} un chat noir.', 'avoir'),
  it('[Les enfants] {ont} faim.', 'avoir'),
  it('[Noah] {a} sept ans.', 'avoir'),
  it('[Léa] {va} à l\'école.', 'aller'),
  it('[Les élèves] {vont} au musée.', 'aller'),
  it('[Maman] {va} au magasin.', 'aller'),
  it('[Hugo] {fait} un gâteau.', 'faire'),
  it('[Les enfants] {font} un puzzle.', 'faire'),
  it('[Zoé] {fait} du vélo.', 'faire'),
  it('[Maman] {dit} bonjour | au voisin.', 'dire'),
  it('[Les élèves] {disent} merci.', 'dire'),
  it('[Mamie] {vient} dimanche.', 'venir'),
  it('[Mes amis] {viennent} à la plage.', 'venir'),
  it('[Adam] {prend} son sac.', 'prendre'),
  it('[Inès] {voit} un oiseau.', 'voir'),
  it('[Yanis] {veut} un jus d\'orange.', 'vouloir'),
  it('[Nina] {met} son manteau.', 'mettre'),
  it('[Tom et Jade] {mettent} la table.', 'mettre'),
  it('[Maël] {écrit} une lettre.', 'écrire'),
  it('[Nous] {sommes} à la maison.', 'être'),
  it('[Nous] {avons} un chien.', 'avoir'),
  it('[Nous] {allons} à la plage.', 'aller'),
  it('[Nous] {voyons} un oiseau.', 'voir'),
  it('[Nous] {disons} merci.', 'dire'),
  it('[Nous] {faisons} un gâteau.', 'faire'),
  it('[Les chats] {sont} sur le toit.', 'être'),
  it('[Léa et Tom] {ont} un ballon.', 'avoir'),
  it('[Elle] {est} en retard.', 'être'),
  // futur
  it('[Les enfants] {seront} là demain.', 'être'),
  it('[Mia et Léo] {auront} un chien.', 'avoir'),
  it('[Nous] {irons} au parc.', 'aller'),
  it('[Les élèves] {iront} au zoo.', 'aller'),
  it('[Léo] {chantera} demain.', 'chanter'),
  it('[Mia] {ira} à la piscine.', 'aller'),
  it('Demain, [Noah] {fera} un gâteau.', 'faire', { nous: 'ferons' }),
  it('[Maman] {sera} là ce soir.', 'être'),
  it('[Lina] {aura} huit ans en mai.', 'avoir'),
  it('[Les élèves] {verront} un film.', 'voir'),
  // passé composé
  it('[Zoé] {a mangé} une pomme.', 'manger'),
  it('[Les enfants] {ont chanté} une chanson.', 'chanter'),
  it('[Noah] {a vu} un renard.', 'voir'),
  it('[Nina] {a pris} son sac.', 'prendre'),
];

// ---- Niveau 3 : phrases plus longues et pièges -------------------------------------------------------
// `pieges` : infinitifs proposés en plus. S'il figure dans la phrase, c'est « l'infinitif déjà là » ;
// sinon `nom` est le nom de la même famille qui s'y trouve (« le chant » n'est pas un verbe).
export const N3 = [
  it('[Léo] {aime} chanter.', 'aimer', { pieges: ['chanter'] }),
  it('[Mia] {veut} manger une pomme.', 'vouloir', { pieges: ['manger'] }),
  it('[Noah] {va} nager à la piscine.', 'aller', { pieges: ['nager'] }),
  it('[Lina] {adore} danser.', 'adorer', { pieges: ['danser'] }),
  it('[Hugo] {sait} lire.', 'savoir', { pieges: ['lire'] }),
  it('[Nina] {doit} ranger son bureau.', 'devoir', { pieges: ['ranger'] }),
  it('[Les enfants] {veulent} jouer dehors.', 'vouloir', { pieges: ['jouer'] }),
  it('[Léa] {préfère} dessiner.', 'préférer', { pieges: ['dessiner'] }),
  it('[Adam] {commence} à écrire.', 'commencer', { pieges: ['écrire'] }),
  it('[Les élèves] {vont} écouter une histoire.', 'aller', { pieges: ['écouter'] }),
  it('[Zoé] {aime} regarder les étoiles.', 'aimer', { pieges: ['regarder'] }),
  it('[Yanis] {veut} prendre le bus.', 'vouloir', { pieges: ['prendre'] }),
  it('[Maël] {va} faire un gâteau.', 'aller', { pieges: ['faire'] }),
  it('[Tom] {doit} finir son dessin.', 'devoir', { pieges: ['finir'] }),
  it('[Jade] {sait} compter jusqu\'à cent.', 'savoir', { pieges: ['compter'] }),
  it('[Papa] {adore} jouer aux cartes.', 'adorer', { pieges: ['jouer'] }),
  it('[Maman] {préfère} marcher.', 'préférer', { pieges: ['marcher'] }),
  it('[Emma] {veut} venir à la plage.', 'vouloir', { pieges: ['venir'] }),
  it('[Lucas] {va} mettre la table.', 'aller', { pieges: ['mettre'] }),
  it('[Le chant des oiseaux] {réveille} Léa.', 'réveiller', { pieges: ['chanter'], nom: 'chant' }),
  it('[Le jeu de Noah] {amuse} Mia.', 'amuser', { pieges: ['jouer'], nom: 'jeu' }),
  it('[Le saut de Hugo] {surprend} Lina.', 'surprendre', { pieges: ['sauter'], nom: 'saut' }),
  it('[Le cri de Zoé] {fait} peur | au chat.', 'faire', { pieges: ['crier'], nom: 'cri' }),
  it('[Le rire de Nina] {amuse} Adam.', 'amuser', { pieges: ['rire'], nom: 'rire' }),
  it('[Le dessin de Maël] {décore} un mur.', 'décorer', { pieges: ['dessiner'], nom: 'dessin' }),
  it('[Le chant de Jade] {rend} Papa heureux.', 'rendre', { pieges: ['chanter'], nom: 'chant' }),
  it('[Le saut de Léa] {fait} rire Adam.', 'faire', { pieges: ['sauter', 'rire'], nom: 'saut' }),
  it('[Le cri du bébé] {réveille} Papa.', 'réveiller', { pieges: ['crier'], nom: 'cri' }),
  it('[Le travail de Papa] {finit} à six heures.', 'finir', { pieges: ['travailler'], nom: 'travail' }),
  it('Ce soir, [Papa et Lina] {iront} au cinéma.', 'aller', { nous: 'irons' }),
  it('Demain, [Noah] {fera} un gâteau.', 'faire', { nous: 'ferons' }),
  it('[Le chat] {est} sur un toit.', 'être'),
  it('[Les enfants] {ont} un nouveau jeu.', 'avoir', { pieges: ['jouer'], nom: 'jeu' }),
  it('[Mia] {dit} bonjour | à ses amis.', 'dire'),
  it('[Tom] {prend} un album sur l\'étagère.', 'prendre'),
  it('[Maman] {met} un pull.', 'mettre'),
  it('[Nina] {voit} un cerf dans la forêt.', 'voir'),
  it('[Zoé et Adam] {viennent} jouer chez Léa.', 'venir', { pieges: ['jouer'] }),
  it('[Maël] {écrit} un mot pour Papi.', 'écrire'),
  it('[Inès] {choisit} un album sur les animaux.', 'choisir'),
  it('[Léa et Jade] {font} du vélo.', 'faire'),
  it('Après la sieste, [Mia et sa sœur] {vont} chanter.', 'aller', { pieges: ['chanter'] }),
  it('[Le petit chien de Noah] {dort} dans un panier.', 'dormir'),
  it('[Le frère de Lina] les {regarde} manger.', 'regarder', { pieges: ['manger'] }),
  it('[La directrice de l\'école] {écrit} aux parents.', 'écrire'),
  it('[Les amis de Mia] {veulent} venir à la plage.', 'vouloir', { pieges: ['venir'] }),
  it('Le dimanche, [Papi et Jade] {font} un gâteau.', 'faire'),
  it('[La factrice] {met} une lettre dans cette boîte.', 'mettre'),
  it('[Les voisins de Hugo] {viennent} dîner.', 'venir', { pieges: ['dîner'] }),
  it('[Mon grand frère] {adore} cuisiner.', 'adorer', { pieges: ['cuisiner'] }),
];

// ---- Banques propres à chaque sorte de question ----------------------------------------------------
// Toucher le verbe et toucher le sujet ont leur banque : la STRUCTURE des phrases y est choisie pour qu'aucune
// règle de position ne suffise (verbe toujours après le groupe sujet, sujet toujours en tête ou collé au verbe).

/** Niveau 1, toucher le verbe : il n'est ni toujours le 2e mot, ni toujours juste après le sujet. */
export const N1_VERBE = [
  it('Le matin, [Mia] {mange} une pomme.', 'manger'),
  it('[Jade] {chante} une chanson.', 'chanter'),
  it('Dans la cour, [les enfants] {jouent}.', 'jouer'),
  it('[Le chat] {dort} sur la chaise.', 'dormir'),
  it('[Les oiseaux] {chantent} dans l\'arbre.', 'chanter'),
  it('[Maman] les {regarde} de la fenêtre.', 'regarder'),
  it('Ce soir, [Noah] {dessine} un bateau.', 'dessiner'),
  it('[Lina et Hugo] {dansent} sur la musique.', 'danser'),
  it('[Maman] {répare} le vélo.', 'réparer'),
  it('[Zoé] lui {donne} un crayon.', 'donner'),
  it('À midi, [nous] {mangeons} du pain.', 'manger'),
  it('[Les canards] {nagent} sur le lac.', 'nager'),
  it('[Jade] {colorie} un dessin.', 'colorier'),
  it('Après l\'école, [Tom] {range} ses jouets.', 'ranger'),
  it('[Mes amis] {jouent} au ballon.', 'jouer'),
  it('[Le bus] {arrive} devant l\'école.', 'arriver'),
  it('[Inès] y {va} en vélo.', 'aller'),
  it('Le dimanche, [Papi] {prépare} un gâteau.', 'préparer'),
  it('[Emma] {ramasse} des coquillages.', 'ramasser'),
  it('[Tom et Emma] {restent} à la maison.', 'rester'),
  it('[Les chiens] {entrent} dans le jardin.', 'entrer'),
  it('[Nina] {parle} à sa voisine.', 'parler'),
  it('Dans le jardin, [Maël] {travaille}.', 'travailler'),
  it('[Sofia] {cherche} son chapeau.', 'chercher'),
  it('[Des feuilles] {tombent} de l\'arbre.', 'tomber'),
  it('[Adam] {aime} le chocolat.', 'aimer'),
  it('[Les élèves] {écoutent} une histoire.', 'écouter'),
  it('Le soir, [Yanis] {lave} ses mains.', 'laver'),
  it('Le soir, [les enfants] {sautent} à la corde.', 'sauter'),
  it('[Lucas] le {trouve} dans l\'herbe.', 'trouver'),
  it('Le matin, [les lapins] {sautent} dans l\'herbe.', 'sauter'),
  it('[Inès] {regarde} un album.', 'regarder'),
  it('[Maman] {aime} les fraises.', 'aimer'),
  it('Demain, [Léa] {oublie} son sac.', 'oublier'),
];

/** Niveau 2, toucher le sujet : en tête, après un complément, séparé du verbe par un pronom, après le verbe. */
export const N2_SUJET = [
  it('[Le ciel] {est} bleu.', 'être'),
  it('[Mia et Léo] {sont} dans la cour.', 'être'),
  it('[Lina] {a} un chat noir.', 'avoir'),
  it('[Mes amis] {viennent} à la plage.', 'venir'),
  it('[Elle] {chante} une chanson.', 'chanter'),
  it('[Ils] {jouent} au ballon.', 'jouer'),
  it('Le matin, [Lina] {mange} une pomme.', 'manger'),
  it('Dans la cour, [les enfants] {jouent}.', 'jouer'),
  it('Ce soir, [Papa] {prépare} le repas.', 'préparer'),
  it('Le dimanche, [Mamie] {vient} chez nous.', 'venir'),
  it('Après l\'école, [Hugo et Inès] {vont} au parc.', 'aller'),
  it('À midi, [le chat] {dort} sur un canapé.', 'dormir'),
  it('Demain, [Noah] {fera} un gâteau.', 'faire'),
  it('Le samedi, [Noah et Lina] {font} du vélo.', 'faire'),
  it('Le matin, [Léo] les {regarde} | de la fenêtre.', 'regarder'),
  it('Ce soir, [Mia] lui {parle} doucement.', 'parler'),
  it('[Maman] les {attend} devant la maison.', 'attendre'),
  it('[Inès] y {va} en vélo.', 'aller'),
  it('[Mamie] nous {attend} au jardin.', 'attendre'),
  it('Chaque jour, [Nina] le {prend} dans ses mains.', 'prendre'),
  it('Le lundi, [Tom] la {trouve} sous un arbre.', 'trouver'),
  it('[Elle] les {regarde} depuis la fenêtre.', 'regarder'),
  it('[Il] nous {voit} de loin.', 'voir'),
  it('[Léa] leur {donne} un gâteau.', 'donner'),
  it('[Nous] {partons} en vacances.', 'partir'),
  it('[Elles] {dansent} sur la musique.', 'danser'),
  it('[Léo] {regarde} Mia | de la fenêtre.', 'regarder'),
  it('[Noah] {attend} Lina | au jardin.', 'attendre'),
  it('[Maman] {cherche} Léa | partout.', 'chercher'),
  it('[Inès] {trouve} Maël | sous un arbre.', 'trouver'),
  it('[Papa] {regarde} Nina | dessiner.', 'regarder'),
  it('[Le chien] {suit} Lina | dans notre jardin.', 'suivre'),
  it('[Le chat] {regarde} Noah | jouer.', 'regarder'),
  it('[Les enfants] {attendent} Mamie | devant la maison.', 'attendre'),
  it('[Les élèves] {écoutent} Maël | chanter.', 'écouter'),
  it('Ce matin, [Zoé] {voit} un oiseau.', 'voir'),
  it('Le lundi, [les élèves] {écrivent} une lettre.', 'écrire'),
  it('Demain, [Mia et Léo] {iront} au zoo.', 'aller'),
  it('Ce soir, [nous] {mangeons} des crêpes.', 'manger'),
  it('Ce matin, [Hugo] {prend} son sac | dans la cour.', 'prendre'),
  it('Le soir, [Léa] {lave} ses mains | dans la maison.', 'laver'),
  it('Ce soir, [Mia et Léo] {regardent} un film | avec Papa.', 'regarder'),
  it('[Lina] {donne} un crayon | à Adam.', 'donner'),
];

/** Niveau 3, toucher le verbe : sujets longs, infinitifs et noms de la même famille dans la phrase. */
export const N3_VERBE = [
  it('[Léo] {aime} chanter.', 'aimer', { pieges: ['chanter'] }),
  it('[Le chant des oiseaux] {réveille} Léa.', 'réveiller', { pieges: ['chanter'], nom: 'chant' }),
  it('Après la sieste, [Mia et sa sœur] {vont} chanter.', 'aller', { pieges: ['chanter'] }),
  it('[Le frère de Lina] les {regarde} manger.', 'regarder', { pieges: ['manger'] }),
  it('[Mon grand frère] {adore} cuisiner.', 'adorer', { pieges: ['cuisiner'] }),
  it('[Noah] {va} nager à la piscine.', 'aller', { pieges: ['nager'] }),
  it('[Le cri de Zoé] {fait} peur | au chat.', 'faire', { pieges: ['crier'], nom: 'cri' }),
  it('[Le saut de Léa] {fait} rire Adam.', 'faire', { pieges: ['sauter', 'rire'], nom: 'saut' }),
  it('Demain, [Noah] {fera} un gâteau.', 'faire', { nous: 'ferons' }),
  it('[Les voisins de Hugo] {viennent} dîner.', 'venir', { pieges: ['dîner'] }),
  it('[Hugo] {sait} lire.', 'savoir', { pieges: ['lire'] }),
  it('[La directrice de l\'école] {écrit} aux parents.', 'écrire'),
  it('[Le rire de Nina] {amuse} Adam.', 'amuser', { pieges: ['rire'], nom: 'rire' }),
  it('Le dimanche, [Papi et Jade] {font} un gâteau.', 'faire'),
  it('[Yanis] {veut} prendre le bus.', 'vouloir', { pieges: ['prendre'] }),
  it('[Les amis de Mia] {veulent} venir à la plage.', 'vouloir', { pieges: ['venir'] }),
  it('[Le petit chien de Noah] {dort} dans un panier.', 'dormir'),
  it('[Papa] {adore} jouer aux cartes.', 'adorer', { pieges: ['jouer'] }),
  it('[Zoé et Adam] {viennent} jouer chez Léa.', 'venir', { pieges: ['jouer'] }),
  it('[Le travail de Papa] {finit} à six heures.', 'finir', { pieges: ['travailler'], nom: 'travail' }),
  it('[Maman] {préfère} marcher.', 'préférer', { pieges: ['marcher'] }),
  it('[Le dessin de Maël] {décore} un mur.', 'décorer', { pieges: ['dessiner'], nom: 'dessin' }),
  it('Ce soir, [Papa et Lina] {iront} au cinéma.', 'aller', { nous: 'irons' }),
  it('[La factrice] {met} une lettre dans cette boîte.', 'mettre'),
  it('[Les enfants] {veulent} jouer dehors.', 'vouloir', { pieges: ['jouer'] }),
  it('[Le cri du bébé] {réveille} Papa.', 'réveiller', { pieges: ['crier'], nom: 'cri' }),
  it('[Jade] {sait} compter jusqu\'à cent.', 'savoir', { pieges: ['compter'] }),
  it('[Le jeu de Noah] {amuse} Mia.', 'amuser', { pieges: ['jouer'], nom: 'jeu' }),
  it('À midi, [le chat] {est} sur un toit.', 'être'),
  it('[Nina] {doit} ranger son bureau.', 'devoir', { pieges: ['ranger'] }),
  it('[Tom] {prend} un album sur l\'étagère.', 'prendre'),
  it('[Le chant de Jade] {rend} Papa heureux.', 'rendre', { pieges: ['chanter'], nom: 'chant' }),
  it('[Lucas] {va} mettre la table.', 'aller', { pieges: ['mettre'] }),
  it('[Les élèves] {vont} écouter une histoire.', 'aller', { pieges: ['écouter'] }),
];

/** Niveau 3, toucher le sujet : sujets longs, pronoms entre le sujet et le verbe, sujet après le verbe. */
export const N3_SUJET = [
  it('[Le chant des oiseaux] {réveille} Léa.', 'réveiller'),
  it('[Les amis de Mia] {veulent} venir à la plage.', 'vouloir'),
  it('[La directrice de l\'école] {écrit} aux parents.', 'écrire'),
  it('[Le saut de Léa] {fait} rire Adam.', 'faire'),
  it('Après la sieste, [Mia et sa sœur] {vont} chanter.', 'aller'),
  it('Ce soir, [Papa et Lina] {iront} au cinéma.', 'aller'),
  it('Le dimanche, [Papi et Jade] {font} un gâteau.', 'faire'),
  it('Dans le jardin, [les voisins de Hugo] {cueillent} des fleurs.', 'cueillir'),
  it('Pendant les vacances, [mon cousin] {dessine} la mer.', 'dessiner'),
  it('[Le frère de Lina] les {regarde} manger.', 'regarder'),
  it('Ce soir, [Mia] leur {donne} un ballon.', 'donner'),
  it('Le lundi, [Maman] nous {attend} devant la maison.', 'attendre'),
  it('Chaque jour, [la factrice] lui {dit} bonjour.', 'dire'),
  it('[Le chien de Zoé] la {suit} partout.', 'suivre'),
  it('Ce matin, [Nina] en {mange} deux.', 'manger'),
  it('[Les élèves] le {regardent} jouer.', 'regarder'),
  it('Chaque soir, [Maman] les {cherche} partout.', 'chercher'),
  it('[Le chat de Mamie] y {dort} souvent.', 'dormir'),
  it('[Le facteur] leur {dit} bonjour.', 'dire'),
  it('Dans la nuit, [le cri du bébé] {réveille} Papa.', 'réveiller'),
  it('Le soir, [les voisins de Hugo] {viennent} dîner.', 'venir'),
  it('Chaque été, [mes cousins] {habitent} près de la mer.', 'habiter'),
  it('[Nina] {cherche} Hugo | derrière un arbre.', 'chercher'),
  it('[Le frère de Zoé] {attend} Maël | devant l\'école.', 'attendre'),
  it('Après la sieste, [Papa] {regarde} Lina | jouer.', 'regarder'),
  it('[Tom] {trouve} Inès | dans le jardin.', 'trouver'),
  it('Ce soir, [Nina et Hugo] {regardent} un film | dans le salon.', 'regarder'),
  it('Chaque lundi, [mon voisin] {répare} le vélo | de Tom.', 'réparer'),
  it('Chaque jour, [Mamie] {donne} du pain | aux oiseaux.', 'donner'),
  it('[Le frère de Zoé] {prépare} un gâteau | pour Papi.', 'préparer'),
  // un complément s'est glissé entre le sujet et le verbe : le groupe collé au verbe n'est pas le sujet
  it('[Le chat de Zoé], ce soir, {dort} dans un panier.', 'dormir'),
  it('[Mia et son frère], le dimanche, {jouent} au ballon.', 'jouer'),
  it('[Mes cousins], chaque été, {habitent} près de la mer.', 'habiter'),
  it('[Les enfants de l\'école], avec Papa, {chantent} dans la cour.', 'chanter'),
  it('[Le facteur], tous les jours, {passe} devant chez nous.', 'passer'),
  it('[Papi et Jade], après la sieste, {font} un puzzle.', 'faire'),
];

// ---- Lecture d'une phrase notée -----------------------------------------------------------------------

const PLURIEL_DET = new Set(['les', 'des', 'mes', 'tes', 'ses', 'nos', 'vos', 'leurs', 'ces']);
/** Premiers mots d'un sujet qui s'écrivent en minuscule quand le sujet n'ouvre pas la phrase. */
const MINUSCULE = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa',
  'ses', 'ce', 'cette', 'ces', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs', 'nous', 'il', 'elle', 'ils', 'elles']);

const strip = (s) => s.replace(/^[\s,.;!?]+|[\s,.;!?]+$/g, '');

/** Le sujet est-il pluriel ? (« Les enfants », « Mia et Léo », « Nous », « Ils ») */
export function pluriel(sujet) {
  const first = sujet.split(' ')[0].toLowerCase();
  return PLURIEL_DET.has(first) || /\bet\b/.test(sujet) || ['nous', 'ils', 'elles'].includes(first);
}

/** Le sujet écrit au milieu d'une phrase (« Le chat » → « le chat », « Léo » reste « Léo »). */
export function inline(sujet) {
  const first = sujet.split(' ')[0];
  return MINUSCULE.has(first.toLowerCase()) ? first.toLowerCase() + sujet.slice(first.length) : sujet;
}

export const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Lit une phrase notée : texte, groupes (sujet, verbe, compléments dans l'ordre), mots. */
export function parseItem(item) {
  const chunks = [];
  for (const m of item.src.matchAll(/\[([^\]]+)\]|\{([^}]+)\}|([^[\]{}]+)/g)) {
    if (m[1]) chunks.push({ role: 'S', text: m[1] });
    else if (m[2]) chunks.push({ role: 'V', text: m[2] });
    else {
      for (const part of m[3].split('|')) {
        const t = strip(part);
        if (t) chunks.push({ role: 'C', text: t });
      }
    }
  }
  const text = item.src.replace(/[[\]{}]/g, '').replace(/ \| /g, ' ').replace(/\s+/g, ' ')
    .replace(/ \?/g, ' ?').trim();
  const sujet = chunks.find((c) => c.role === 'S').text;
  const verbe = chunks.find((c) => c.role === 'V').text;
  return {
    ...item, text, chunks, sujet, verbe, pluriel: pluriel(sujet),
    words: text.replace(/[.,;!?]/g, '').trim().split(/\s+/),
    pieges: item.pieges || [],
  };
}

const parse = (list) => list.map(parseItem);
/** Par niveau, puis par sorte de question. */
export const BANKS = {
  1: { verbe: parse(N1_VERBE), inf: parse(N1) },
  2: { sujet: parse(N2_SUJET), inf: parse(N2) },
  3: { verbe: parse(N3_VERBE), sujet: parse(N3_SUJET), inf: parse(N3) },
};
