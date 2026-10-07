// Banque du jeu « Les règles de vie » (E13-T2, #80) — EMC, cycle 2 : respect, politesse,
// règles de la classe et de la maison, gérer un conflit, reconnaître une émotion.
// Écrite à la main et relue item par item. Principes :
//  - ton bienveillant, jamais moralisateur ; aucune situation inquiétante ;
//  - UNE seule réponse acceptable : les autres sont manifestement inadaptées (pas de dilemme moral) ;
//  - une enfant de 7 ans comprend chaque phrase ; prénoms variés.
// Item de niveau 1 et 2 : { id, prompt, right, wrong: [≥ 2 mauvaises], explain, skill }.

export const SKILLS = {
  politesse: 'formules de politesse',
  phrase: 'parler poliment',
  respect: 'respecter les autres',
  classe: 'règles de la classe',
  pourquoi: 'pourquoi on a des règles',
  conflit: 'gérer un conflit',
  emotion: 'reconnaître une émotion',
  aider: 'aider un camarade',
  regle: 'règle ou préférence',
  droit: 'droits et devoirs',
};

// --- Niveau 1 : la formule ou la phrase qui convient ------------------------------------------

export const LEVEL1 = [
  { id: 'cadeau', prompt: 'Tu reçois un cadeau. Tu dis…', right: 'Merci', wrong: ['Pardon', 'Au revoir', 'Bon appétit'], explain: 'Quand on reçoit quelque chose, on dit « Merci ».', skill: SKILLS.politesse },
  { id: 'matin', prompt: 'Le matin, tu arrives à l\'école. Tu dis…', right: 'Bonjour', wrong: ['Merci', 'Au revoir', 'Bonne nuit'], explain: 'Quand on arrive, on dit « Bonjour ».', skill: SKILLS.politesse },
  { id: 'depart', prompt: 'Tu quittes la maison de ta grand-mère. Tu dis…', right: 'Au revoir', wrong: ['Bonjour', 'Bon appétit', 'Joyeux anniversaire'], explain: 'Quand on part, on dit « Au revoir ».', skill: SKILLS.politesse },
  { id: 'pied', prompt: 'Tu marches sur le pied de Lina sans le faire exprès. Tu dis…', right: 'Pardon', wrong: ['Bonjour', 'Bon appétit', 'Bonne nuit'], explain: 'Quand on gêne quelqu\'un sans le vouloir, on dit « Pardon ».', skill: SKILLS.politesse },
  { id: 'repas', prompt: 'Le repas est servi. Avant de manger, on dit…', right: 'Bon appétit', wrong: ['Bonne nuit', 'Au revoir', 'Pardon'], explain: 'Avant de manger, on dit « Bon appétit ».', skill: SKILLS.politesse },
  { id: 'dormir', prompt: 'Le soir, avant d\'aller dormir, tu dis…', right: 'Bonne nuit', wrong: ['Bon appétit', 'Bonjour', 'Merci beaucoup'], explain: 'Avant de dormir, on dit « Bonne nuit ».', skill: SKILLS.politesse },
  { id: 'crayon', prompt: 'Noah te prête son crayon. Tu dis…', right: 'Merci', wrong: ['Pardon', 'Bonne nuit', 'Au revoir'], explain: 'Quand quelqu\'un nous prête quelque chose, on dit « Merci ».', skill: SKILLS.politesse },
  { id: 'porte', prompt: 'Quelqu\'un te tient la porte. Tu dis…', right: 'Merci', wrong: ['Bon appétit', 'Bonne nuit', 'Joyeux anniversaire'], explain: 'On remercie la personne qui nous a rendu service : « Merci ».', skill: SKILLS.politesse },
  { id: 'verre', prompt: 'Tu renverses le verre d\'eau de Tom sans le faire exprès. Tu dis…', right: 'Pardon', wrong: ['Bonjour', 'Bon appétit', 'Joyeux anniversaire'], explain: 'On dit « Pardon » quand on a gêné quelqu\'un sans le vouloir.', skill: SKILLS.politesse },
  { id: 'anniversaire', prompt: 'C\'est l\'anniversaire de Chloé. Tu lui dis…', right: 'Joyeux anniversaire', wrong: ['Bonne nuit', 'Au revoir', 'Bon appétit'], explain: 'Le jour de son anniversaire, on dit « Joyeux anniversaire ».', skill: SKILLS.politesse },
  { id: 'soir', prompt: 'À la fin de la classe, tu salues la maîtresse. Tu dis…', right: 'Au revoir', wrong: ['Bonjour', 'Bonne nuit', 'Bon appétit'], explain: 'Quand on quitte quelqu\'un, on dit « Au revoir ».', skill: SKILLS.politesse },
  { id: 'pain', prompt: 'La boulangère te donne ton pain. Tu dis…', right: 'Merci', wrong: ['Pardon', 'Bonne nuit', 'Joyeux anniversaire'], explain: 'On remercie quand on nous donne quelque chose : « Merci ».', skill: SKILLS.politesse },
  { id: 'eternue', prompt: 'Samir éternue. Tu lui dis…', right: 'À tes souhaits', wrong: ['Bon appétit', 'Au revoir', 'Bonne nuit'], explain: 'Quand quelqu\'un éternue, on lui dit « À tes souhaits ».', skill: SKILLS.politesse },
  { id: 'magique', prompt: 'Tu veux un jeu. Quel mot magique ajoutes-tu pour demander gentiment ?', right: 'S\'il te plaît', wrong: ['Tout de suite', 'Vite', 'Maintenant'], explain: 'Pour demander gentiment, on dit « S\'il te plaît ».', skill: SKILLS.politesse },
  { id: 'magique2', prompt: 'On t\'a aidé à mettre ton manteau. Quel mot magique dis-tu ?', right: 'Merci', wrong: ['Vite', 'Encore', 'Non'], explain: 'Après une aide, le mot magique est « Merci ».', skill: SKILLS.politesse },
  { id: 'salue', prompt: 'Ton voisin te dit « Bonjour ». Que fais-tu ?', right: 'Je lui réponds « Bonjour »', wrong: ['Je tourne la tête', 'Je fais comme si je ne l\'avais pas vu', 'Je m\'en vais en courant'], explain: 'Quand on nous salue, on répond avec un sourire : « Bonjour ».', skill: SKILLS.politesse },
  { id: 'croise', prompt: 'Tu croises la directrice dans le couloir. Tu dis…', right: 'Bonjour Madame', wrong: ['Bonne nuit Madame', 'Bon appétit Madame', 'Joyeux anniversaire Madame'], explain: 'On salue les adultes qu\'on croise : « Bonjour Madame ».', skill: SKILLS.politesse },
  { id: 'phrase-livre', prompt: 'Tu veux le livre d\'Inès. Quelle phrase est polie ?', right: 'Inès, peux-tu me prêter ton livre, s\'il te plaît ?', wrong: ['Donne-moi ton livre !', 'Ton livre, je le veux, vite !', 'Passe-moi ça !'], explain: 'Pour demander, on parle doucement et on dit « s\'il te plaît ».', skill: SKILLS.phrase },
  { id: 'phrase-eau', prompt: 'Tu veux de l\'eau à table. Quelle phrase est polie ?', right: 'Peux-tu me passer l\'eau, s\'il te plaît ?', wrong: ['L\'eau, vite !', 'Donne-moi l\'eau !', 'Je veux de l\'eau, tout de suite !'], explain: 'Avec « s\'il te plaît », la demande est plus agréable à entendre.', skill: SKILLS.phrase },
  { id: 'phrase-aide', prompt: 'Tu as besoin d\'aide pour ton lacet. Quelle phrase est polie ?', right: 'Peux-tu m\'aider, s\'il te plaît ?', wrong: ['Fais-le pour moi !', 'Aide-moi, dépêche-toi !', 'Fais-le, toi !'], explain: 'On demande de l\'aide gentiment : « Peux-tu m\'aider, s\'il te plaît ? »', skill: SKILLS.phrase },
  { id: 'phrase-nonmerci', prompt: 'On te propose un bonbon, mais tu n\'en veux pas. Quelle phrase est polie ?', right: 'Non merci, ça va.', wrong: ['Beurk, je n\'en veux pas !', 'Jamais de la vie !', 'Pas ça, ça ne me plaît pas !'], explain: 'On peut refuser gentiment en disant « Non merci ».', skill: SKILLS.phrase },
  { id: 'phrase-cava', prompt: 'Mamadou te demande « Comment ça va ? ». Quelle réponse est polie ?', right: 'Ça va bien, merci. Et toi ?', wrong: ['Rien.', 'Ça ne te regarde pas.', 'Tu m\'embêtes.'], explain: 'On répond gentiment et on peut poser la question à l\'autre : « Et toi ? »', skill: SKILLS.phrase },
  { id: 'phrase-jouer', prompt: 'Tu veux jouer avec Jade. Quelle phrase est polie ?', right: 'Jade, tu veux bien jouer avec moi ?', wrong: ['Joue avec moi !', 'Tu joues avec moi, c\'est tout !', 'Pousse-toi, je joue là !'], explain: 'On propose avec douceur, et l\'autre peut répondre oui ou non.', skill: SKILLS.phrase },
  { id: 'phrase-passer', prompt: 'Tu dois passer devant Rose dans un couloir étroit. Quelle phrase est polie ?', right: 'Pardon Rose, je peux passer ?', wrong: ['Pousse-toi !', 'Tu me gênes, bouge !', 'Laisse-moi passer, vite !'], explain: 'Pour passer, on dit « Pardon, je peux passer ? ».', skill: SKILLS.phrase },
  { id: 'phrase-toilettes', prompt: 'Tu veux aller aux toilettes en classe. Quelle phrase est polie ?', right: 'Madame, puis-je aller aux toilettes, s\'il vous plaît ?', wrong: ['Je sors !', 'Je vais aux toilettes, c\'est tout !', 'Madame, ouvre la porte !'], explain: 'On demande la permission poliment, avec « s\'il vous plaît ».', skill: SKILLS.phrase },
  { id: 'phrase-ramasse', prompt: 'Ali t\'a aidé à ramasser tes crayons. Quelle phrase est polie ?', right: 'Merci Ali, c\'est gentil de m\'avoir aidé.', wrong: ['Ah, c\'est toi.', 'Je n\'avais pas besoin de toi.', 'Hmm.'], explain: 'On remercie la personne qui nous a aidé, avec un sourire.', skill: SKILLS.phrase },
  { id: 'tu-vous', prompt: 'Tu parles au directeur de l\'école. Quelle phrase est polie ?', right: 'Bonjour Monsieur, comment allez-vous ?', wrong: ['Salut mon vieux !', 'Hé, toi, là !', 'Alors, ça roule ?'], explain: 'Avec un adulte qu\'on ne connaît pas bien, on dit « Bonjour Monsieur ».', skill: SKILLS.phrase },
  { id: 'felicite', prompt: 'Zoé a réussi un beau dessin. Que lui dis-tu ?', right: 'Il est très beau, bravo !', wrong: ['Moi, je fais mieux.', 'Pfff.', 'Je ne le regarde même pas.'], explain: 'On aime que les autres soient contents de nous : « Bravo ! » fait plaisir.', skill: SKILLS.respect },
  { id: 'vacances', prompt: 'Ton ami Théo part en vacances. Tu lui dis…', right: 'Bonnes vacances !', wrong: ['Bon appétit !', 'Bonne nuit !', 'À tes souhaits !'], explain: 'Quand quelqu\'un part en vacances, on dit « Bonnes vacances ! ».', skill: SKILLS.politesse },
  { id: 'repas-invite', prompt: 'Tu as bien mangé chez Maëlys. À la fin du repas, tu dis…', right: 'Merci, c\'était très bon !', wrong: ['Bonne nuit !', 'Bonjour !', 'À tes souhaits !'], explain: 'On remercie la personne qui a préparé le repas.', skill: SKILLS.politesse },
  { id: 'sortir', prompt: 'Tu veux sortir de table à la fin du repas. Que dis-tu ?', right: 'Puis-je sortir de table, s\'il te plaît ?', wrong: ['Je pars !', 'J\'ai fini, salut !', 'Ouvre-moi la porte !'], explain: 'On demande gentiment avant de quitter la table.', skill: SKILLS.phrase },
  { id: 'voisine', prompt: 'Tu croises ta voisine dans l\'escalier, le matin. Tu dis…', right: 'Bonjour Madame !', wrong: ['Bonne nuit Madame !', 'Bon appétit Madame !', 'Joyeux anniversaire Madame !'], explain: 'On dit « Bonjour » aux personnes qu\'on croise.', skill: SKILLS.politesse },
  { id: 'telephone', prompt: 'Tu réponds au téléphone chez toi. Quelle phrase est polie ?', right: 'Allô, bonjour !', wrong: ['C\'est qui ?', 'Quoi ?', 'Allô, parle vite !'], explain: 'Au téléphone aussi, on commence par « Bonjour ».', skill: SKILLS.phrase },
  { id: 'cadeau-leo', prompt: 'Léo t\'offre un petit cadeau. Quelle phrase est polie ?', right: 'Merci Léo, ça me fait très plaisir !', wrong: ['Je n\'en voulais pas.', 'C\'est tout ?', 'Je l\'ai déjà.'], explain: 'On remercie toujours pour un cadeau : c\'est une attention.', skill: SKILLS.phrase },
  { id: 'retard', prompt: 'Tu arrives en retard en classe. Quelle phrase est polie ?', right: 'Bonjour Madame, excusez-moi d\'être en retard.', wrong: ['Je suis là !', 'C\'est pas ma faute.', 'Salut !'], explain: 'On salue et on s\'excuse poliment : « Excusez-moi d\'être en retard ».', skill: SKILLS.phrase },
];

// --- Niveau 2 : « Que fais-tu ? » et pourquoi on a des règles -------------------------------------

export const LEVEL2 = [
  { id: 'tombe', prompt: 'Que fais-tu ? Hugo tombe dans la cour et pleure.', right: 'Je vais voir s\'il va bien et je préviens un adulte.', wrong: ['Je continue à jouer sans le regarder.', 'Je rigole.', 'Je pars en courant.'], explain: 'Quand un camarade est blessé, on l\'aide et on appelle un adulte.', skill: SKILLS.aider },
  { id: 'bouscule', prompt: 'Que fais-tu ? Quelqu\'un te bouscule dans la file.', right: 'Je lui dis calmement : « Attention, s\'il te plaît. »', wrong: ['Je le pousse très fort.', 'Je crie le plus fort possible.', 'Je lui jette mon sac.'], explain: 'On peut le dire calmement. Si ça continue, on demande à un adulte.', skill: SKILLS.conflit },
  { id: 'jeu', prompt: 'Que fais-tu ? Tu veux un jeu, mais Aïcha est en train de jouer avec.', right: 'Je lui demande : « Je peux jouer après toi ? »', wrong: ['Je le lui arrache.', 'Je le prends quand elle ne regarde pas.', 'Je casse le jeu.'], explain: 'On demande gentiment et on attend son tour.', skill: SKILLS.respect },
  { id: 'dispute', prompt: 'Que fais-tu ? Tu n\'es pas d\'accord avec Yanis pendant un jeu.', right: 'J\'en parle avec lui, ou je demande de l\'aide à un adulte.', wrong: ['Je tape.', 'Je lui crie dessus.', 'Je lui lance mon ballon.'], explain: 'Quand on n\'est pas d\'accord, on en parle. Un adulte peut aider.', skill: SKILLS.conflit },
  { id: 'exercice', prompt: 'Que fais-tu ? Tu ne comprends pas l\'exercice.', right: 'Je lève le doigt pour demander de l\'aide.', wrong: ['Je déchire ma feuille.', 'Je fais le clown.', 'Je jette mon stylo.'], explain: 'On a le droit de ne pas comprendre. On demande de l\'aide en levant le doigt.', skill: SKILLS.classe },
  { id: 'ecoute', prompt: 'Que fais-tu ? La maîtresse explique quelque chose à toute la classe.', right: 'J\'écoute en silence.', wrong: ['Je parle plus fort qu\'elle.', 'Je chante.', 'Je me lève et je danse.'], explain: 'On écoute pour bien comprendre et pour respecter ceux qui écoutent aussi.', skill: SKILLS.classe },
  { id: 'trouve', prompt: 'Que fais-tu ? Tu trouves un stylo par terre. Il n\'est pas à toi.', right: 'Je le donne à la maîtresse.', wrong: ['Je le jette à la poubelle.', 'Je le casse.', 'Je le cache dans la poubelle.'], explain: 'On rend ce qu\'on trouve : son propriétaire sera content de le retrouver.', skill: SKILLS.respect },
  { id: 'seul', prompt: 'Que fais-tu ? Mei est toute seule dans la cour, personne ne joue avec elle.', right: 'Je lui propose de jouer avec nous.', wrong: ['Je lui dis de partir.', 'Je lui tourne le dos.', 'Je me moque d\'elle.'], explain: 'Inviter quelqu\'un à jouer lui fait très plaisir.', skill: SKILLS.respect },
  { id: 'casse', prompt: 'Que fais-tu ? Tu as cassé le stylo de Samir sans le faire exprès.', right: 'Je lui dis ce qui s\'est passé et je lui dis pardon.', wrong: ['Je cache le stylo cassé.', 'Je dis que c\'est quelqu\'un d\'autre.', 'Je pars sans rien dire.'], explain: 'On dit la vérité et on s\'excuse : tout le monde peut avoir un accident.', skill: SKILLS.respect },
  { id: 'nouveau', prompt: 'Que fais-tu ? Un nouvel élève, Ibrahim, arrive dans ta classe.', right: 'Je lui souris et je me présente.', wrong: ['Je ne le regarde pas.', 'Je me cache derrière mon sac.', 'Je me moque de son prénom.'], explain: 'Un sourire aide à se sentir bien accueilli.', skill: SKILLS.respect },
  { id: 'parole', prompt: 'Que fais-tu ? Tu veux répondre à une question de la maîtresse.', right: 'Je lève le doigt et j\'attends qu\'elle me donne la parole.', wrong: ['Je crie ma réponse.', 'Je me lève et je cours vers elle.', 'Je tape sur la table.'], explain: 'En levant le doigt, chacun parle à son tour et on s\'entend bien.', skill: SKILLS.classe },
  { id: 'file', prompt: 'Que fais-tu ? Il faut aller en rang, comme chaque jour.', right: 'Je prends ma place et j\'attends mon tour.', wrong: ['Je passe devant tout le monde.', 'Je pousse les autres.', 'Je cours dans tous les sens.'], explain: 'Dans le rang, on avance tranquillement pour que personne ne se fasse mal.', skill: SKILLS.classe },
  { id: 'fini', prompt: 'Que fais-tu ? Tu as fini ton travail avant les autres.', right: 'Je lis un livre en silence.', wrong: ['Je dérange ceux qui travaillent.', 'Je crie « J\'ai gagné ! »', 'Je me mets à danser.'], explain: 'On laisse les autres finir tranquillement. Un livre, c\'est parfait pour attendre.', skill: SKILLS.classe },
  { id: 'colere', prompt: 'Que fais-tu ? Tu sens que tu es en colère.', right: 'Je respire fort et je compte jusqu\'à dix.', wrong: ['Je jette mes affaires.', 'Je tape un camarade.', 'Je crie des mots méchants.'], explain: 'Respirer calme la colère. Ensuite, on peut en parler.', skill: SKILLS.conflit },
  { id: 'coup', prompt: 'Que fais-tu ? Un camarade te fait mal en jouant, et il continue.', right: 'Je le dis à un adulte.', wrong: ['Je tape plus fort pour me venger.', 'Je lui lance un caillou.', 'Je lui casse son jeu.'], explain: 'Quand ça ne s\'arrête pas, on demande de l\'aide : un adulte sait quoi faire.', skill: SKILLS.conflit },
  { id: 'range', prompt: 'Que fais-tu ? Tu as fini de jouer avec tes jouets à la maison.', right: 'Je range mes jouets.', wrong: ['Je les laisse partout par terre.', 'Je les cache sous le canapé.', 'Je les jette par la fenêtre.'], explain: 'Ranger permet de retrouver ses jouets et d\'avoir de la place pour marcher.', skill: SKILLS.classe },
  { id: 'coupe', prompt: 'Que fais-tu ? Chloé raconte quelque chose à la classe.', right: 'Je l\'écoute jusqu\'au bout.', wrong: ['Je lui coupe la parole.', 'Je parle en même temps qu\'elle.', 'Je lui tourne le dos.'], explain: 'Écouter jusqu\'au bout, c\'est respecter l\'autre.', skill: SKILLS.respect },
  { id: 'erreur', prompt: 'Que fais-tu ? Paul s\'est trompé au tableau.', right: 'Je l\'aide gentiment.', wrong: ['Je rigole de lui.', 'Je le montre du doigt.', 'Je crie « Tu es nul ! »'], explain: 'Tout le monde se trompe. On s\'aide pour apprendre ensemble.', skill: SKILLS.respect },
  { id: 'colle', prompt: 'Que fais-tu ? Nina n\'a plus de colle. Tu en as deux.', right: 'Je lui en prête une.', wrong: ['Je lui dis non et je rigole.', 'Je cache les deux.', 'Je lui jette la mienne.'], explain: 'Prêter, c\'est un beau geste, surtout quand on en a assez.', skill: SKILLS.respect },
  { id: 'gagne', prompt: 'Que fais-tu ? Tu as gagné au jeu contre Lucas.', right: 'Je dis « Bien joué ! » à Lucas.', wrong: ['Je me moque de lui.', 'Je lui tire la langue.', 'Je crie qu\'il est nul.'], explain: 'Gagner ou perdre, jouer ensemble est ce qui compte.', skill: SKILLS.respect },
  { id: 'perd', prompt: 'Que fais-tu ? Tu as perdu au jeu contre Amina.', right: 'Je dis « Bravo ! » à Amina.', wrong: ['Je jette les pions par terre.', 'Je pars en claquant la porte.', 'Je dis que le jeu est nul.'], explain: 'Perdre, c\'est normal ! On peut féliciter l\'autre et rejouer.', skill: SKILLS.respect },
  { id: 'gomme', prompt: 'Que fais-tu ? Tu veux emprunter la gomme d\'Ali.', right: 'Je lui demande et j\'attends sa réponse.', wrong: ['Je la prends dans sa trousse.', 'Je la prends quand il ne regarde pas.', 'Je la lui arrache.'], explain: 'On demande avant de prendre ce qui est à quelqu\'un.', skill: SKILLS.respect },
  { id: 'adulte', prompt: 'Que fais-tu ? Un adulte te parle.', right: 'Je le regarde et je l\'écoute.', wrong: ['Je me bouche les oreilles.', 'Je lui tourne le dos.', 'Je m\'enfuis en courant.'], explain: 'Regarder et écouter, c\'est montrer qu\'on respecte l\'autre.', skill: SKILLS.respect },
  { id: 'why-doigt', prompt: 'Pourquoi lève-t-on le doigt avant de parler en classe ?', right: 'Pour que chacun parle à son tour et qu\'on s\'entende bien.', wrong: ['Pour faire de la gymnastique.', 'Pour dire au revoir.', 'Pour compter jusqu\'à dix.'], explain: 'Quand on lève le doigt, on parle chacun son tour et tout le monde entend.', skill: SKILLS.pourquoi },
  { id: 'why-rang', prompt: 'Pourquoi se met-on en rang calmement ?', right: 'Pour avancer sans se bousculer ni se faire mal.', wrong: ['Pour faire le plus de bruit possible.', 'Pour jouer au loup.', 'Pour dormir debout.'], explain: 'En rang, on avance en sécurité, sans que personne ne soit bousculé.', skill: SKILLS.pourquoi },
  { id: 'why-couloir', prompt: 'Pourquoi ne court-on pas dans les couloirs de l\'école ?', right: 'Pour ne pas se faire mal ni bousculer les autres.', wrong: ['Pour que le couloir soit plus long.', 'Pour garder ses chaussures propres.', 'Pour que les murs restent en place.'], explain: 'Dans un couloir étroit, on peut se cogner. En marchant, tout le monde est en sécurité.', skill: SKILLS.pourquoi },
  { id: 'why-range', prompt: 'Pourquoi range-t-on le matériel de la classe ?', right: 'Pour le retrouver et que tout le monde puisse s\'en servir.', wrong: ['Pour qu\'il disparaisse.', 'Pour que personne ne l\'utilise.', 'Pour faire plaisir aux souris.'], explain: 'Quand tout est rangé, on trouve vite ce qu\'on cherche.', skill: SKILLS.pourquoi },
  { id: 'why-tour', prompt: 'Pourquoi attend-on son tour pour jouer ?', right: 'Pour que tout le monde ait sa chance de jouer.', wrong: ['Pour regarder les autres toute la journée.', 'Pour ne jamais jouer.', 'Pour que le jeu soit cassé.'], explain: 'Chacun son tour : tout le monde peut jouer et c\'est plus juste.', skill: SKILLS.pourquoi },
  { id: 'why-ecoute', prompt: 'Pourquoi ne parle-t-on pas quand quelqu\'un parle ?', right: 'Pour bien l\'entendre et lui montrer du respect.', wrong: ['Pour garder sa voix pour demain.', 'Pour économiser l\'air.', 'Pour ne plus jamais parler.'], explain: 'On écoute pour comprendre l\'autre, et il écoutera quand ce sera notre tour.', skill: SKILLS.pourquoi },
  { id: 'why-poubelle', prompt: 'Pourquoi jette-t-on les papiers à la poubelle ?', right: 'Pour garder la classe et la cour propres.', wrong: ['Pour nourrir la poubelle.', 'Pour que la cour soit pleine de papiers.', 'Pour faire du bruit.'], explain: 'Un endroit propre est plus agréable pour tout le monde.', skill: SKILLS.pourquoi },
  { id: 'why-regles', prompt: 'Pourquoi a-t-on des règles ?', right: 'Pour bien vivre ensemble et être en sécurité.', wrong: ['Pour qu\'il y ait plus de bruit.', 'Pour qu\'on ne puisse plus jouer.', 'Pour qu\'on ne parle à personne.'], explain: 'Les règles aident chacun à se sentir bien et en sécurité.', skill: SKILLS.pourquoi },
  { id: 'why-taper', prompt: 'Pourquoi ne tape-t-on pas les autres ?', right: 'Pour ne pas leur faire mal et pour rester amis.', wrong: ['Pour garder ses mains propres.', 'Pour que les mains restent dans les poches.', 'Parce que ça fait du bruit.'], explain: 'Chacun a le droit de ne pas avoir mal. On parle plutôt qu\'on tape.', skill: SKILLS.pourquoi },
  { id: 'why-bonjour', prompt: 'Pourquoi dit-on « Bonjour » en arrivant ?', right: 'Pour montrer qu\'on est content de voir les autres.', wrong: ['Pour dire qu\'on s\'en va.', 'Pour demander à manger.', 'Pour dire qu\'on veut dormir.'], explain: '« Bonjour » est un petit mot qui fait plaisir et qui montre du respect.', skill: SKILLS.pourquoi },
  { id: 'why-demande', prompt: 'Pourquoi demande-t-on avant de prendre le jeu d\'un autre ?', right: 'Parce que ce jeu est à lui, et qu\'il a le droit de dire oui ou non.', wrong: ['Parce que le jeu est trop lourd.', 'Parce que les jeux n\'aiment pas qu\'on les prenne.', 'Parce qu\'il y a trop de jeux.'], explain: 'Ce qui appartient à quelqu\'un, on le respecte : on demande d\'abord.', skill: SKILLS.pourquoi },
  { id: 'why-feu', prompt: 'Pourquoi s\'arrête-t-on au feu rouge pour traverser ?', right: 'Pour traverser en sécurité.', wrong: ['Parce que le rouge est joli.', 'Pour regarder les voitures passer sans fin.', 'Pour compter les nuages.'], explain: 'Le feu rouge arrête les voitures : on peut traverser sans danger.', skill: SKILLS.pourquoi },
  { id: 'why-biblio', prompt: 'Pourquoi parle-t-on doucement à la bibliothèque ?', right: 'Pour ne pas gêner ceux qui lisent.', wrong: ['Pour que les livres dorment.', 'Pour que personne ne lise.', 'Pour que les livres soient contents.'], explain: 'Dans le calme, chacun peut lire tranquillement.', skill: SKILLS.pourquoi },
  { id: 'why-vrai', prompt: 'Pourquoi dit-on la vérité, même quand on a fait une bêtise ?', right: 'Pour qu\'on puisse avoir confiance en nous.', wrong: ['Pour faire plus de bruit.', 'Pour être le premier de la classe.', 'Pour changer de place.'], explain: 'Dire la vérité, c\'est courageux, et ça aide à retrouver la confiance.', skill: SKILLS.pourquoi },
  { id: 'why-lit', prompt: 'Pourquoi se couche-t-on à peu près à la même heure chaque soir ?', right: 'Pour être en forme le lendemain.', wrong: ['Pour que la lune soit contente.', 'Pour ne pas voir la télé.', 'Pour que la nuit soit plus longue.'], explain: 'Bien dormir donne de l\'énergie pour jouer et apprendre.', skill: SKILLS.pourquoi },
];

// --- Niveau 3 : émotions, geste qui aide, règle ou préférence, droits et devoirs ---------------------

export const EMOTIONS = [
  { id: 'triste', emoji: '😢', m: 'Triste', f: 'Triste' },
  { id: 'colere', emoji: '😠', m: 'En colère', f: 'En colère' },
  { id: 'content', emoji: '😊', m: 'Content', f: 'Contente' },
  { id: 'peur', emoji: '😨', m: 'A peur', f: 'A peur' },
];

/** Histoires : `fem` vrai si le personnage est une fille. `feel` = la seule émotion qui convient. */
export const STORIES = [
  { id: 'doudou', story: 'Nina a perdu son doudou. Elle pleure.', who: 'Nina', fem: true, feel: 'triste', explain: 'Nina pleure parce qu\'elle a perdu son doudou : elle est triste.' },
  { id: 'velo', story: 'Karim a reçu le vélo dont il rêvait. Il saute de joie.', who: 'Karim', fem: false, feel: 'content', explain: 'Karim saute de joie : il est content.' },
  { id: 'dessin', story: 'Quelqu\'un a déchiré le dessin de Léo exprès. Il serre les poings et tape du pied.', who: 'Léo', fem: false, feel: 'colere', explain: 'Léo serre les poings et tape du pied : il est en colère.' },
  { id: 'chien', story: 'Un gros chien aboie fort. Tom recule et s\'accroche à la main de son papa.', who: 'Tom', fem: false, feel: 'peur', explain: 'Tom recule et cherche la main de son papa : il a peur.' },
  { id: 'course', story: 'Lola a gagné la course. Elle sourit en levant les bras.', who: 'Lola', fem: true, feel: 'content', explain: 'Lola sourit en levant les bras : elle est contente.' },
  { id: 'demenage', story: 'Le meilleur ami d\'Hugo déménage. Hugo a les larmes aux yeux.', who: 'Hugo', fem: false, feel: 'triste', explain: 'Hugo a les larmes aux yeux : il est triste.' },
  { id: 'chateau', story: 'Quelqu\'un a cassé le château de sable de Sofia exprès. Elle crie : « Ce n\'est pas juste ! »', who: 'Sofia', fem: true, feel: 'colere', explain: 'Sofia crie « Ce n\'est pas juste ! » : elle est en colère.' },
  { id: 'toboggan', story: 'Yanis est tout en haut du grand toboggan. Il regarde en bas et ses jambes tremblent.', who: 'Yanis', fem: false, feel: 'peur', explain: 'Les jambes de Yanis tremblent : il a peur.' },
  { id: 'gateau', story: 'Aïcha prépare un gâteau en chantant. Elle a un grand sourire.', who: 'Aïcha', fem: true, feel: 'content', explain: 'Aïcha chante avec un grand sourire : elle est contente.' },
  { id: 'seul', story: 'Paul est seul dans la cour. Il baisse la tête et soupire.', who: 'Paul', fem: false, feel: 'triste', explain: 'Paul baisse la tête et soupire : il est triste.' },
  { id: 'poupee', story: 'Le frère de Chloé lui a pris sa poupée sans demander. Elle fronce les sourcils et crie : « Rends-la-moi ! »', who: 'Chloé', fem: true, feel: 'colere', explain: 'Chloé fronce les sourcils et crie : elle est en colère.' },
  { id: 'felicite', story: 'La maîtresse félicite Adam pour son beau dessin. Il rougit et sourit.', who: 'Adam', fem: false, feel: 'content', explain: 'Adam sourit après les félicitations : il est content.' },
  { id: 'ballon', story: 'Camille a lâché son ballon. Il s\'envole dans le ciel. Elle pleure.', who: 'Camille', fem: true, feel: 'triste', explain: 'Camille pleure parce que son ballon s\'est envolé : elle est triste.' },
  { id: 'plongeoir', story: 'Mamadou est au bout du grand plongeoir. Il serre la rambarde très fort et n\'ose plus bouger.', who: 'Mamadou', fem: false, feel: 'peur', explain: 'Mamadou n\'ose plus bouger : il a peur.' },
];

/** Visages : on lit l'émotion sur le visage (choix en texte seulement). */
export const FACES = [
  { id: 'f-triste', who: 'Léna', fem: true, feel: 'triste' },
  { id: 'f-colere', who: 'Noah', fem: false, feel: 'colere' },
  { id: 'f-content', who: 'Jade', fem: true, feel: 'content' },
  { id: 'f-peur', who: 'Théo', fem: false, feel: 'peur' },
];

/** Le geste qui aide : une seule bonne réponse, les autres sont manifestement inadaptées. */
export const GESTURES = [
  { id: 'g-doudou', prompt: 'Nina est triste : elle a perdu son doudou. Que fais-tu ?', right: 'Je lui propose de le chercher avec elle.', wrong: ['Je rigole.', 'Je pars sans rien dire.', 'Je lui dis de se taire.'], explain: 'Aider à chercher, c\'est montrer à Nina qu\'on est avec elle.' },
  { id: 'g-chien', prompt: 'Tom a peur d\'un chien. Que fais-tu ?', right: 'Je reste près de lui et je le rassure.', wrong: ['Je crie « Regarde le chien ! »', 'Je cours en le laissant seul.', 'Je me moque de lui.'], explain: 'Rester près de quelqu\'un qui a peur l\'aide à se sentir mieux.' },
  { id: 'g-colere', prompt: 'Hugo est en colère. Que fais-tu ?', right: 'Je le laisse respirer, puis je lui propose d\'en parler.', wrong: ['Je lui crie plus fort que lui.', 'Je lui prends son jeu.', 'Je lui fais des grimaces.'], explain: 'Quand on est en colère, un moment calme aide, puis parler fait du bien.' },
  { id: 'g-seul', prompt: 'Paul est seul et il a l\'air triste. Que fais-tu ?', right: 'Je l\'invite à jouer avec moi.', wrong: ['Je passe sans le regarder.', 'Je lui dis de partir.', 'Je lui tire la langue.'], explain: 'Une invitation à jouer redonne le sourire.' },
  { id: 'g-gagne', prompt: 'Lola a gagné la course et elle est contente. Que fais-tu ?', right: 'Je lui dis « Bravo ! »', wrong: ['Je boude dans mon coin.', 'Je lui dis que c\'est nul.', 'Je lui tourne le dos.'], explain: 'Être content pour les autres fait plaisir à tout le monde.' },
  { id: 'g-tombe', prompt: 'Chloé est tombée et elle pleure. Que fais-tu ?', right: 'Je lui demande si ça va et j\'appelle un adulte.', wrong: ['Je continue de jouer sans la regarder.', 'Je lui dis d\'arrêter de pleurer.', 'Je rigole.'], explain: 'On demande si ça va, et un adulte peut la soigner.' },
  { id: 'g-expose', prompt: 'Samuel a peur de parler devant toute la classe. Que fais-tu ?', right: 'Je l\'encourage avec un sourire.', wrong: ['Je me moque de lui.', 'Je lui dis de se dépêcher.', 'Je rigole en le regardant.'], explain: 'Un sourire et un mot gentil donnent du courage.' },
  { id: 'g-ami-colere', prompt: 'Ton ami Ali est en colère contre toi. Que fais-tu ?', right: 'Je lui dis : « Veux-tu qu\'on en parle ? »', wrong: ['Je lui tire la langue.', 'Je lui lance mon sac.', 'Je lui dis « Tu m\'embêtes ! »'], explain: 'Parler calmement aide souvent à se comprendre.' },
  { id: 'g-soeur', prompt: 'Ta petite sœur pleure car elle a fait un mauvais rêve. Que fais-tu ?', right: 'Je lui fais un câlin et je préviens papa ou maman.', wrong: ['Je mets la musique à fond.', 'Je ferme la porte et je pars.', 'Je lui dis que c\'est bête.'], explain: 'Un câlin et un adulte rassurent beaucoup.' },
  { id: 'g-dessin', prompt: 'Le dessin d\'Inès s\'est déchiré. Elle est triste. Que fais-tu ?', right: 'Je lui propose de l\'aider à le recoller.', wrong: ['Je déchire le mien aussi.', 'Je dis « Tant pis ! » et je pars.', 'Je rigole.'], explain: 'On peut réparer ensemble, et c\'est plus facile à deux.' },
  { id: 'g-velo', prompt: 'Rose est très contente : elle sait faire du vélo sans roulettes. Que fais-tu ?', right: 'Je suis content pour elle et je le lui dis.', wrong: ['Je lui dis que ce n\'est pas difficile.', 'Je regarde ailleurs.', 'Je lui dis que je fais mieux.'], explain: 'Se réjouir pour quelqu\'un lui fait un très beau cadeau.' },
  { id: 'g-moi', prompt: 'Toi, tu te sens triste et tu ne sais pas pourquoi. Que fais-tu ?', right: 'J\'en parle à un adulte ou à un ami.', wrong: ['Je tape mon voisin.', 'Je jette mes affaires.', 'Je crie sur tout le monde.'], explain: 'Quand on parle de ce qu\'on ressent, on se sent souvent plus léger.' },
];

/** Règles (valables pour tous) et préférences (ce qu'on aime : chacun la sienne). */
export const RULES = [
  'On lève le doigt pour parler.',
  'On range sa place avant de partir.',
  'On ne court pas dans les couloirs.',
  'On ne tape pas les autres.',
  'On dit bonjour en entrant.',
  'On attend son tour.',
  'On écoute quand quelqu\'un parle.',
  'On jette les papiers à la poubelle.',
  'On demande avant de prendre.',
  'À la bibliothèque, on parle doucement.',
  'À la maison, on se lave les mains avant de manger.',
  'Dans la cour, on joue sans faire mal.',
];

export const PREFERENCES = [
  'J\'aime le bleu.',
  'Mon animal préféré est le chat.',
  'Je préfère la fraise à la vanille.',
  'J\'aime dessiner des fleurs.',
  'Mon jeu préféré est le ballon.',
  'J\'aime mieux l\'été que l\'hiver.',
  'Ma couleur préférée est le vert.',
  'Je préfère les histoires de dragons.',
  'J\'aime les pommes.',
  'Mon dessin animé préféré est drôle.',
  'J\'aime jouer à cache-cache.',
  'Je préfère le chocolat chaud.',
];

/** Droits et devoirs simples. */
export const RIGHTS = [
  { id: 'd-ecole', prompt: 'Quel est un droit de chaque enfant ?', right: 'Aller à l\'école pour apprendre.', wrong: ['Avoir tous les jouets du magasin.', 'Ne jamais ranger sa chambre.', 'Choisir pour tous les autres.'], explain: 'Tous les enfants ont le droit d\'aller à l\'école pour apprendre.' },
  { id: 'd-soin', prompt: 'Quel est un droit de chaque enfant ?', right: 'Être soigné quand on est malade.', wrong: ['Avoir des bonbons à chaque repas.', 'Dormir en classe tous les jours.', 'Ne jamais dire bonjour.'], explain: 'Chaque enfant a le droit d\'être soigné quand il est malade.' },
  { id: 'd-jeu', prompt: 'Quel est un droit de chaque enfant ?', right: 'Jouer et se reposer.', wrong: ['Gagner à tous les jeux.', 'Faire peur aux autres.', 'Prendre les affaires des autres.'], explain: 'Les enfants ont le droit de jouer et de se reposer.' },
  { id: 'd-nom', prompt: 'Quel est un droit de chaque enfant ?', right: 'Avoir un prénom et être protégé.', wrong: ['Avoir un château.', 'Ne jamais aller se laver.', 'Faire tout ce qu\'il veut.'], explain: 'Chaque enfant a un prénom et le droit d\'être protégé et aimé.' },
  { id: 'dev-respect', prompt: 'Quel est un devoir de chaque enfant ?', right: 'Respecter les autres.', wrong: ['Prendre le jeu des autres.', 'Parler plus fort que tout le monde.', 'Passer toujours en premier.'], explain: 'Chacun a le droit d\'être respecté, et le devoir de respecter les autres.' },
  { id: 'dev-ranger', prompt: 'Quel est un devoir de chaque enfant ?', right: 'Prendre soin du matériel de la classe.', wrong: ['Casser les crayons des autres.', 'Faire des dessins sur les tables.', 'Jeter les livres.'], explain: 'Le matériel sert à tout le monde : on en prend soin.' },
  { id: 'dev-ecoute', prompt: 'Quel est un devoir en classe ?', right: 'Écouter les autres quand ils parlent.', wrong: ['Parler tout le temps.', 'Couper la parole à tout le monde.', 'Crier ses réponses.'], explain: 'Chacun a le droit de parler : on a donc le devoir d\'écouter.' },
  { id: 'dev-vrai', prompt: 'Quel est un devoir de chaque enfant ?', right: 'Dire la vérité.', wrong: ['Cacher ses bêtises à tout le monde.', 'Inventer des histoires pour faire peur.', 'Accuser les autres.'], explain: 'Dire la vérité permet aux autres d\'avoir confiance en nous.' },
];
