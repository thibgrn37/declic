import type { EvidenceLevel } from './evidence';

export type SkillKey = 'stress' | 'confiance' | 'concentration' | 'dialogue' | 'objectifs';
export type SportType = 'precision' | 'endurance' | 'force' | 'collectif';
export type PersonalField = 'gesture' | 'place' | 'cueInstr' | 'cueMotiv' | 'negative' | 'reframe' | 'strength' | 'trigger';

export type Step =
  | { kind: 'timed'; text: string; sec: number }
  | { kind: 'breath'; text: string; pattern: [string, number][]; cycles: number }
  | { kind: 'input'; text: string; field: PersonalField; placeholder: string }
  | { kind: 'routineEdit'; text: string }
  | { kind: 'routineRun'; text: string; reps: number; pressure?: boolean }
  | { kind: 'goalsEdit'; text: string }
  | { kind: 'goalsReview'; text: string };

export interface StepContext {
  sportType: SportType;
}

export interface Level {
  n: number;
  name: string;
  goal: string; // ce que ce niveau entraîne
  min: number;
  /** Niveau de mise en place, fait une fois : on passe au suivant dès qu'il est terminé. */
  oneOff?: boolean;
  steps: (ctx: StepContext) => Step[];
}

export interface Technique {
  id: string;
  name: string;
  skills: SkillKey[];
  evidence: EvidenceLevel;
  refs: string[];
  why: string; // pourquoi ça marche, en clair
  rating: string; // ce que l'utilisateur note après la séance (1 à 5)
  levels: Level[];
}

export const SKILLS: Record<SkillKey, string> = {
  stress: 'Gestion du stress',
  confiance: 'Confiance',
  concentration: 'Concentration',
  dialogue: 'Dialogue interne',
  objectifs: 'Objectifs et motivation',
};

export const SPORT_TYPES: Record<SportType, { label: string; hint: string }> = {
  precision: { label: 'Gestes de précision', hint: 'tir, golf, tennis, gym, escalade…' },
  endurance: { label: 'Endurance', hint: 'course, trail, vélo, natation, aviron…' },
  force: { label: 'Force et explosivité', hint: 'sprint, haltéro, lancers, combat…' },
  collectif: { label: 'Sport collectif', hint: 'foot, hand, basket, rugby, volley…' },
};

const breath55: [string, number][] = [['Inspire', 5], ['Expire', 5]];
const breath46: [string, number][] = [['Inspire', 4], ['Expire', 6]];

export const TECHNIQUES: Technique[] = [
  {
    id: 'respiration',
    name: 'Respiration lente',
    skills: ['stress', 'concentration'],
    evidence: 'prometteur',
    refs: ['lehrer2020', 'pagaduan2020'],
    why: 'Respirer autour de 6 cycles par minute synchronise le rythme cardiaque et la respiration. Cela calme le système nerveux et aide à garder la tête claire sous pression.',
    rating: 'Calme ressenti à la fin',
    levels: [
      {
        n: 1, name: 'Trouver le rythme', goal: 'Apprendre la respiration à 6 cycles par minute.', min: 5,
        steps: () => [
          { kind: 'timed', text: 'Assieds-toi, dos droit, une main sur le ventre. Respire par le nez si tu peux.', sec: 20 },
          { kind: 'breath', text: 'Suis la bulle : 5 secondes pour inspirer en gonflant le ventre, 5 secondes pour expirer.', pattern: breath55, cycles: 24 },
          { kind: 'timed', text: 'Reprends une respiration normale. Remarque ton état : plus calme, plus lourd, plus clair ?', sec: 20 },
        ],
      },
      {
        n: 2, name: 'Expiration longue', goal: 'Allonger l’expiration pour faire baisser l’activation plus vite.', min: 5,
        steps: () => [
          { kind: 'timed', text: 'Debout, comme avant un départ. Relâche les épaules.', sec: 15 },
          { kind: 'breath', text: '4 secondes pour inspirer, 6 secondes pour expirer, lèvres légèrement pincées.', pattern: breath46, cycles: 27 },
          { kind: 'timed', text: 'Note ce qui t’a aidé : compter, la main sur le ventre, les yeux fermés ? Tu l’utiliseras en compétition.', sec: 20 },
        ],
      },
      {
        n: 3, name: 'Version terrain', goal: 'Retrouver le calme en une minute, les yeux ouverts, en situation.', min: 3,
        steps: () => [
          { kind: 'timed', text: 'Imagine un moment de tension : attente avant ton passage, score serré, temps mort.', sec: 25 },
          { kind: 'breath', text: 'Six respirations 4-6, yeux ouverts, regard posé sur un point fixe.', pattern: breath46, cycles: 6 },
          { kind: 'timed', text: 'Recommence la scène et refais les six respirations, plus discrètement, comme sur le terrain.', sec: 15 },
          { kind: 'breath', text: 'Six respirations, discrètes.', pattern: breath46, cycles: 6 },
        ],
      },
    ],
  },
  {
    id: 'imagerie',
    name: 'Imagerie mentale',
    skills: ['confiance', 'concentration', 'objectifs'],
    evidence: 'solide',
    refs: ['liu2025', 'holmes2001', 'simonsmeier2018', 'williams2010'],
    why: 'Imaginer un geste active en partie les mêmes circuits que l’exécuter. Les méta-analyses montrent un effet moyen sur la performance, surtout avec environ 10 minutes, 3 fois par semaine, et une imagerie proche du réel (méthode PETTLEP).',
    rating: 'Netteté des images et des sensations',
    levels: [
      {
        n: 1, name: 'Éveil des sens', goal: 'Rendre les images nettes avant de travailler le geste.', min: 6,
        steps: () => [
          { kind: 'timed', text: 'Ferme les yeux. Trois respirations lentes.', sec: 20 },
          { kind: 'timed', text: 'Imagine ton équipement posé devant toi : sa couleur, sa matière, son odeur.', sec: 40 },
          { kind: 'timed', text: 'Prends-le en main dans ta tête : son poids, sa texture, la température.', sec: 40 },
          { kind: 'timed', text: 'Imagine le lieu où tu t’entraînes : la lumière, les bruits, le sol sous tes pieds.', sec: 45 },
          { kind: 'input', text: 'Décris ce lieu en quelques mots. Il servira dans tes prochaines séances.', field: 'place', placeholder: 'Ex. piste du stade, couloir 4, vent de face' },
          { kind: 'timed', text: 'Ouvre les yeux. Les sens s’entraînent comme un muscle : la netteté progresse de séance en séance.', sec: 15 },
        ],
      },
      {
        n: 2, name: 'Le geste clé', goal: 'Répéter un geste précis, au ralenti puis en temps réel (PETTLEP).', min: 10,
        steps: () => [
          { kind: 'input', text: 'Quel geste veux-tu renforcer ? Choisis un geste précis de ton sport.', field: 'gesture', placeholder: 'Ex. mon service, mon départ, mon tir à 9 m' },
          { kind: 'timed', text: 'Mets-toi dans la position du geste, debout si possible, avec ta tenue ou ton matériel si tu l’as. C’est le P de PETTLEP : le corps aide l’image.', sec: 25 },
          { kind: 'timed', text: 'Yeux fermés, tu es à {place}. Vois {gesture} de l’extérieur, au ralenti, parfaitement exécuté.', sec: 45 },
          { kind: 'timed', text: 'Passe à l’intérieur de ton corps. Fais {gesture} au ralenti : appuis, tension juste, trajectoire.', sec: 50 },
          { kind: 'timed', text: 'Maintenant en temps réel, à la vitesse du match. Répète {gesture} cinq fois, chaque fois propre.', sec: 70 },
          { kind: 'timed', text: 'Ajoute l’émotion juste : décidé, relâché. Une dernière répétition, en temps réel.', sec: 30 },
        ],
      },
      {
        n: 3, name: 'Séquence de compétition', goal: 'Enchaîner plusieurs actions dans le contexte de la compétition.', min: 10,
        steps: () => [
          { kind: 'timed', text: 'Debout, en tenue si possible. Trois respirations lentes.', sec: 20 },
          { kind: 'timed', text: 'Tu arrives sur le lieu de {comp}. Regarde autour de toi : le public, les adversaires, la lumière.', sec: 45 },
          { kind: 'timed', text: 'L’échauffement : sens ton corps se réveiller, ton rythme cardiaque monter juste ce qu’il faut.', sec: 45 },
          { kind: 'timed', text: 'Le début : tes trois premières actions, en temps réel, décidées et précises.', sec: 70 },
          { kind: 'timed', text: 'Un moment clé arrive. Dis {cueInstr} et exécute {gesture}.', sec: 45 },
          { kind: 'timed', text: 'Termine la séquence. Ressens la satisfaction d’avoir appliqué ton plan.', sec: 30 },
        ],
      },
      {
        n: 4, name: 'Gérer l’imprévu', goal: 'S’entraîner mentalement à surmonter un problème (imagerie d’adaptation).', min: 10,
        steps: () => [
          { kind: 'timed', text: 'Yeux fermés, tu es en pleine compétition, à {place}. Tout se passe bien.', sec: 35 },
          { kind: 'timed', text: 'Un problème arrive : une erreur, un mauvais départ, une décision injuste. Laisse l’émotion monter un peu.', sec: 40 },
          { kind: 'timed', text: 'Tu appliques ta réponse : une expiration longue, ton mot-clé {cueMotiv}, le regard sur un point.', sec: 40 },
          { kind: 'timed', text: 'Tu reviens dans l’action. La suivante est propre. Vois-la en temps réel.', sec: 50 },
          { kind: 'timed', text: 'Recommence avec un autre imprévu, celui qui te fait le plus peur. Même réponse, même retour dans l’action.', sec: 80 },
          { kind: 'timed', text: 'Ouvre les yeux. Ton cerveau connaît maintenant le chemin du retour.', sec: 15 },
        ],
      },
    ],
  },
  {
    id: 'dialogue',
    name: 'Dialogue interne',
    skills: ['dialogue', 'confiance', 'concentration'],
    evidence: 'solide',
    refs: ['hatzi2011'],
    why: 'Ce que tu te dis guide ton attention et ton effort. Une méta-analyse de 32 études montre un effet modéré sur la performance, plus fort quand on s’entraîne à utiliser des mots-clés choisis à l’avance.',
    rating: 'Facilité à utiliser tes mots-clés',
    levels: [
      {
        n: 1, name: 'Repérer ta petite voix', oneOff: true, goal: 'Prendre conscience de ce que tu te dis dans les moments difficiles.', min: 5,
        steps: () => [
          { kind: 'timed', text: 'Repense à ton dernier entraînement ou match difficile. Revois le moment où ça a basculé.', sec: 45 },
          { kind: 'timed', text: 'Qu’est-ce que tu t’es dit à ce moment-là ? Mot pour mot, même si c’est dur.', sec: 35 },
          { kind: 'input', text: 'Écris la phrase qui revient le plus souvent quand ça va mal.', field: 'negative', placeholder: 'Ex. « Je suis nul, encore raté »' },
          { kind: 'timed', text: 'Cette phrase t’aide-t-elle à faire le geste suivant ? Si non, on va la remplacer dans les prochaines séances.', sec: 25 },
        ],
      },
      {
        n: 2, name: 'Tes mots-clés', oneOff: true, goal: 'Construire un mot technique et un mot de motivation.', min: 5,
        steps: ({ sportType }) => [
          {
            kind: 'timed', sec: 35,
            text: sportType === 'precision' || sportType === 'collectif'
              ? 'Pour les gestes précis, les études montrent que les consignes techniques marchent le mieux. Ton mot principal sera technique.'
              : 'Pour la force et l’endurance, les phrases de motivation marchent le mieux. Ton mot principal sera motivant.',
          },
          { kind: 'input', text: 'Ton mot technique : une consigne courte sur le geste (2-3 mots).', field: 'cueInstr', placeholder: 'Ex. « appuis actifs », « coude haut », « regard loin »' },
          { kind: 'input', text: 'Ton mot de motivation : court, au présent, qui te pousse.', field: 'cueMotiv', placeholder: 'Ex. « je tiens », « j’attaque », « allez, encore »' },
          { kind: 'timed', text: 'Répète {cueInstr} trois fois à voix basse en imaginant {gesture}.', sec: 30 },
          { kind: 'timed', text: 'Répète {cueMotiv} trois fois en imaginant le moment le plus dur de l’effort.', sec: 30 },
        ],
      },
      {
        n: 3, name: 'Mots-clés en situation', goal: 'Associer tes mots-clés aux moments précis où ils servent.', min: 7,
        steps: () => [
          { kind: 'timed', text: 'Yeux fermés. Tu es à {place}, juste avant {gesture}.', sec: 30 },
          { kind: 'timed', text: 'Dis {cueInstr} au moment exact où tu lances le geste. Répète la scène cinq fois.', sec: 70 },
          { kind: 'timed', text: 'Passe à un moment de fatigue ou de doute. Dis {cueMotiv} et sens l’effort repartir.', sec: 60 },
          { kind: 'timed', text: 'À ton prochain entraînement, utilise ces deux mots au moins trois fois. Note-le dans ton carnet.', sec: 20 },
        ],
      },
      {
        n: 4, name: 'Retourner une pensée', goal: 'Transformer ta phrase négative en consigne utile.', min: 6,
        steps: () => [
          { kind: 'timed', text: 'Ta phrase habituelle quand ça va mal : {negative}. Lis-la sans la juger.', sec: 20 },
          { kind: 'timed', text: 'Que dirais-tu à un coéquipier qui pense ça ? Que doit-il faire juste après ?', sec: 40 },
          { kind: 'input', text: 'Écris la version utile : au présent, tournée vers l’action suivante.', field: 'reframe', placeholder: 'Ex. « Erreur oubliée, prochain point : appuis actifs »' },
          { kind: 'timed', text: 'Imagine l’erreur, entends l’ancienne phrase, puis remplace-la par : {reframe}. Trois fois.', sec: 60 },
        ],
      },
    ],
  },
  {
    id: 'routine',
    name: 'Routine pré-performance',
    skills: ['concentration', 'stress'],
    evidence: 'solide',
    refs: ['rupprecht2021'],
    why: 'Une routine courte et toujours identique avant un geste (service, tir, départ) protège ta concentration et réduit l’effet de la pression. L’effet est démontré à tous niveaux, et une routine simple marche aussi bien qu’une complexe.',
    rating: 'Ta routine te semble naturelle',
    levels: [
      {
        n: 1, name: 'Construire ta routine', oneOff: true, goal: 'Choisir 3 à 5 étapes qui tiennent en quelques secondes.', min: 5,
        steps: () => [
          { kind: 'timed', text: 'Une bonne routine enchaîne : un signal pour se recentrer, une respiration, une image du geste, un mot-clé, puis on lance.', sec: 30 },
          { kind: 'input', text: 'Quel moment de ton sport te laisse quelques secondes avant d’agir ?', field: 'trigger', placeholder: 'Ex. avant mon service, au départ, avant un lancer franc' },
          { kind: 'routineEdit', text: 'Compose ta routine. Garde-la courte : 3 à 5 étapes.' },
        ],
      },
      {
        n: 2, name: 'Répéter à blanc', goal: 'Automatiser la routine par la répétition.', min: 5,
        steps: () => [
          { kind: 'timed', text: 'Mets-toi en position, comme {trigger}.', sec: 15 },
          { kind: 'routineRun', text: 'Déroule ta routine, étape par étape, puis imagine le geste.', reps: 4 },
          { kind: 'timed', text: 'Même ordre, même rythme à chaque fois : c’est la régularité qui la rend efficace.', sec: 15 },
        ],
      },
      {
        n: 3, name: 'Sous pression', goal: 'Garder la routine intacte quand l’enjeu monte.', min: 6,
        steps: () => [
          { kind: 'timed', text: 'Imagine un moment décisif : balle de match, dernier essai, score serré. Sens la pression monter.', sec: 30 },
          { kind: 'routineRun', text: 'Malgré la pression, déroule ta routine sans en sauter une étape.', reps: 3, pressure: true },
          { kind: 'timed', text: 'À l’entraînement, applique-la sur au moins 10 gestes, en particulier quand tu es fatigué.', sec: 15 },
        ],
      },
    ],
  },
  {
    id: 'objectifs',
    name: 'Objectifs de la semaine',
    skills: ['objectifs'],
    evidence: 'solide',
    refs: ['williamson2022'],
    why: 'Des objectifs précis font mieux que « faire de son mieux ». Déclic combine un objectif de résultat, un objectif de performance mesurable, et des objectifs de processus que tu contrôles à chaque séance.',
    rating: 'Clarté de tes objectifs',
    levels: [
      {
        n: 1, name: 'Fixer tes objectifs', oneOff: true, goal: 'Définir résultat, performance et processus.', min: 5,
        steps: () => [
          { kind: 'timed', text: 'Le résultat motive, mais tu ne le contrôles pas entièrement. Les objectifs de processus, eux, dépendent de toi à chaque séance.', sec: 25 },
          { kind: 'goalsEdit', text: 'Écris tes objectifs pour les prochaines semaines.' },
        ],
      },
      {
        n: 2, name: 'Bilan de semaine', goal: 'Mesurer, ajuster, repartir.', min: 4,
        steps: () => [
          { kind: 'goalsReview', text: 'Pour chaque objectif de processus, estime à quel point tu l’as appliqué cette semaine.' },
          { kind: 'timed', text: 'Moins de 50 % ? Rends l’objectif plus simple. Plus de 80 % deux semaines de suite ? Passe au suivant.', sec: 25 },
        ],
      },
    ],
  },
  {
    id: 'presence',
    name: 'Attention au présent',
    skills: ['concentration', 'stress'],
    evidence: 'prometteur',
    refs: ['buhlmayer2017', 'wang2023'],
    why: 'La pleine conscience entraîne à remarquer quand l’attention part et à la ramener, sans lutter. Elle améliore le flow et la performance en sports de précision, mais les études sont encore peu nombreuses.',
    rating: 'Facilité à revenir au présent',
    levels: [
      {
        n: 1, name: 'Revenir au souffle', goal: 'Remarquer que l’esprit part, et le ramener.', min: 5,
        steps: () => [
          { kind: 'timed', text: 'Assieds-toi. Porte ton attention sur l’air qui entre et sort par le nez.', sec: 30 },
          { kind: 'timed', text: 'Ton esprit va partir. C’est normal. Quand tu le remarques, dis « pensée » et reviens au souffle.', sec: 120 },
          { kind: 'timed', text: 'Chaque retour est une répétition, comme en musculation. Continue.', sec: 100 },
          { kind: 'timed', text: 'Combien de fois es-tu revenu ? Ce n’est pas un score : c’est l’exercice lui-même.', sec: 15 },
        ],
      },
      {
        n: 2, name: 'Scan du corps', goal: 'Repérer les tensions inutiles et les relâcher.', min: 6,
        steps: () => [
          { kind: 'timed', text: 'Allongé ou assis. Porte ton attention sur tes pieds, sans rien changer.', sec: 40 },
          { kind: 'timed', text: 'Remonte vers les jambes, le bassin, le ventre. Observe simplement.', sec: 60 },
          { kind: 'timed', text: 'Le dos, les épaules, les bras, les mains. Là où c’est tendu, laisse l’expiration relâcher.', sec: 70 },
          { kind: 'timed', text: 'La nuque, la mâchoire, le front. Puis le corps entier, d’un coup.', sec: 60 },
        ],
      },
      {
        n: 3, name: 'Accueillir l’inconfort', goal: 'Rester efficace malgré la fatigue ou le stress, sans lutter contre.', min: 6,
        steps: () => [
          { kind: 'timed', text: 'Imagine le moment le plus inconfortable de ton effort : jambes lourdes, souffle court, peur de rater.', sec: 40 },
          { kind: 'timed', text: 'Observe la sensation comme un scientifique : où est-elle, quelle taille, quelle couleur ?', sec: 50 },
          { kind: 'timed', text: 'Laisse-la exister sans chercher à la chasser. Respire autour.', sec: 50 },
          { kind: 'timed', text: 'Avec elle, reporte ton attention sur la seule action utile maintenant. Dis {cueMotiv}.', sec: 50 },
        ],
      },
    ],
  },
];

export const TECH_BY_ID: Record<string, Technique> = Object.fromEntries(TECHNIQUES.map((t) => [t.id, t]));

/** Respiration d'urgence : une minute, accessible à tout moment depuis l'onglet Jour J. */
export const URGENCE_STEPS: Step[] = [
  { kind: 'breath', text: 'Inspire 4 secondes, expire 6 secondes. Regard sur un point fixe.', pattern: breath46, cycles: 6 },
];
