import type { SkillKey } from './techniques';

// Auto-évaluation indicative, écrite pour Déclic. Elle s'inspire des dimensions
// mesurées par les questionnaires de compétences mentales en sport, sans en reprendre
// les items : ce n'est pas un test validé ni un outil de diagnostic.

export interface Item {
  id: string;
  skill: SkillKey | 'imagery';
  text: string;
  reversed?: boolean;
}

export const SCALE = ['Pas du tout', 'Plutôt non', 'Moyennement', 'Plutôt oui', 'Tout à fait'];

export const ITEMS: Item[] = [
  { id: 's1', skill: 'stress', text: 'Avant une compétition, je sais faire redescendre ma tension quand elle monte trop.' },
  { id: 's2', skill: 'stress', text: 'La pression me fait perdre mes moyens (gestes crispés, souffle court).', reversed: true },
  { id: 's3', skill: 'stress', text: 'Après une erreur, je retrouve mon calme en quelques secondes.' },
  { id: 'c1', skill: 'confiance', text: 'Je crois en ma capacité à réaliser ma meilleure performance le jour J.' },
  { id: 'c2', skill: 'confiance', text: 'Je doute de moi quand l’adversaire ou l’enjeu est important.', reversed: true },
  { id: 'c3', skill: 'confiance', text: 'Je peux dire précisément ce qui fait ma force dans mon sport.' },
  { id: 'a1', skill: 'concentration', text: 'Pendant l’effort, mon attention reste sur ce que je dois faire maintenant.' },
  { id: 'a2', skill: 'concentration', text: 'Je suis facilement distrait par le public, le score ou mes pensées.', reversed: true },
  { id: 'a3', skill: 'concentration', text: 'J’ai un moyen concret de me recentrer quand je décroche.' },
  { id: 'd1', skill: 'dialogue', text: 'Ce que je me dis pendant l’effort m’aide plutôt qu’il ne me freine.' },
  { id: 'd2', skill: 'dialogue', text: 'Après une erreur, je me critique durement.', reversed: true },
  { id: 'd3', skill: 'dialogue', text: 'J’utilise des mots-clés précis pour guider mes gestes.' },
  { id: 'o1', skill: 'objectifs', text: 'J’ai des objectifs précis pour les prochaines semaines, pas seulement un résultat final.' },
  { id: 'o2', skill: 'objectifs', text: 'Je sais ce que je dois travailler à chaque entraînement.' },
  { id: 'o3', skill: 'objectifs', text: 'Ma motivation baisse vite quand les résultats ne suivent pas.', reversed: true },
  { id: 'i1', skill: 'imagery', text: 'Quand j’imagine mon geste, les images et les sensations sont nettes.' },
];
