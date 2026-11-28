import type { Step } from './techniques';
import type { Profile, State, TurningKey } from '../state/types';

// Scénarios d'imagerie propres au squash : des moments de match difficiles, répétés à l'avance.
// Principe : imagerie d'adaptation (« coping imagery »). On vit la situation stressante, l'émotion
// qui monte, puis on se voit appliquer ses outils et rejouer le point suivant proprement.
// Une situation imaginée avec ses ressources pour y faire face est vécue comme un défi plutôt
// qu'une menace (Williams et al., 2010). Contenu proche du réel : court, timing, émotions (PETTLEP).

export interface SquashScenario {
  id: string;
  name: string;
  /** La situation, en une phrase. */
  situation: string;
  /** Ce que le scénario entraîne. */
  goal: string;
  /** Moment clé du débrief de match qui appelle ce scénario. */
  turning: TurningKey;
  min: number;
  steps: Step[];
}

export const SQUASH_SCENARIOS: SquashScenario[] = [
  {
    id: 'remontee',
    name: 'Revenir de 0-2',
    situation: 'Tu as perdu les deux premiers jeux. Il te reste 90 secondes avant le troisième.',
    goal: 'Transformer la pause entre les jeux en remise à zéro : un seul changement de plan, puis point par point.',
    turning: 'mene',
    min: 10,
    steps: [
      { kind: 'timed', text: 'Debout, raquette en main si tu l’as. Trois respirations lentes, puis ferme les yeux.', sec: 20 },
      { kind: 'timed', text: 'Tu viens de perdre le deuxième jeu. Tu sors du court. Sens la sueur, le souffle court, la pensée « c’est fini ». Laisse-la monter, sans la chasser.', sec: 40 },
      { kind: 'timed', text: 'Tu prends ta serviette et ta gourde. Expiration longue, puis une deuxième. Ton cœur commence à ralentir.', sec: 30 },
      { kind: 'timed', text: 'Tu choisis un seul changement de plan. Par exemple : plus de longueurs le long du mur, ou monter moins vite à l’avant. Vois-le clairement, en une phrase.', sec: 45 },
      { kind: 'timed', text: 'Ta pensée change d’échelle : pas « gagner trois jeux », juste « gagner le premier point ». Dis-toi {cueMotiv}.', sec: 30 },
      { kind: 'timed', text: 'Le troisième jeu commence. Tu rentres sur le court, tu poses tes appuis sur le T. Joue les trois premiers points en temps réel, avec ton nouveau plan.', sec: 75 },
      { kind: 'timed', text: 'Tu perds un point bête. Pas de panique : retour au T, expiration, {cueInstr}. Le point suivant est propre.', sec: 45 },
      { kind: 'timed', text: 'Avance jusqu’à 6-6 dans ce jeu. Ressens que tu es à nouveau dans le match. Le score ne te pèse plus, tu joues chaque échange.', sec: 50 },
      { kind: 'timed', text: 'Ouvre les yeux. La prochaine fois que tu seras mené, ton cerveau connaîtra déjà ces 90 secondes.', sec: 15 },
    ],
  },
  {
    id: 'balle-de-match',
    name: 'Servir sur balle de match',
    situation: 'Tu mènes 10-8 au dernier jeu. Tu as le service.',
    goal: 'Garder ta routine de service intacte quand l’enjeu est maximal, et jouer l’échange, pas le score.',
    turning: 'fin_jeu',
    min: 9,
    steps: [
      { kind: 'timed', text: 'Debout, dans ta position de service si tu peux. Trois respirations lentes, puis ferme les yeux.', sec: 20 },
      { kind: 'timed', text: 'Le score est 10-8 pour toi au dernier jeu. Le silence autour du court. Sens tes jambes, ta main serrée sur le grip, l’envie d’en finir vite.', sec: 40 },
      { kind: 'timed', text: 'Tu remarques la pensée « surtout ne pas rater ». Remplace-la par ce que tu vas faire : ton service, ta cible.', sec: 30 },
      { kind: 'timed', text: 'Tu poses un pied dans le carré de service. Tu fais ta routine, exactement comme d’habitude : la balle qui rebondit, l’expiration, le regard sur ta cible sur le mur avant.', sec: 45 },
      { kind: 'timed', text: 'Tu relâches le grip. Tu sers, au rythme normal, sans accélérer. Vois la balle partir haut, mourir dans le coin arrière, loin de ton adversaire.', sec: 35 },
      { kind: 'timed', text: 'Retour au T. L’échange s’installe. Joue-le en temps réel, coup après coup. Tu ne penses plus au score, seulement à la prochaine balle.', sec: 60 },
      { kind: 'timed', text: 'Ton adversaire sauve la balle de match : 10-9. Expiration longue, {cueMotiv}. Tu reprends ta routine, à l’identique, et tu sers à nouveau.', sec: 50 },
      { kind: 'timed', text: 'Cette fois, tu gagnes l’échange. Ressens le calme d’avoir appliqué ton plan jusqu’au bout, quelle que soit la pression.', sec: 30 },
      { kind: 'timed', text: 'Ouvre les yeux. Ta routine de service est ton refuge : la même à 2-2 et à 10-8.', sec: 15 },
    ],
  },
  {
    id: 'let-refuse',
    name: 'Encaisser un let refusé',
    situation: 'Tu demandes un let, l’arbitre répond « pas de let ». Tu es sûr d’avoir été gêné.',
    goal: 'Accepter une décision injuste en quelques secondes et rejouer le point suivant sans colère.',
    turning: 'arbitre',
    min: 9,
    steps: [
      { kind: 'timed', text: 'Debout, raquette en main si tu l’as. Trois respirations lentes, puis ferme les yeux.', sec: 20 },
      { kind: 'timed', text: 'Échange serré à 7-7. Ton adversaire ne dégage pas, tu retiens ton coup et tu demandes « let, s’il vous plaît ». L’arbitre : « pas de let ». Point perdu.', sec: 40 },
      { kind: 'timed', text: 'Sens la colère monter : la chaleur, la mâchoire qui se serre, l’envie de discuter. Laisse-la exister quelques secondes, sans la juger.', sec: 30 },
      { kind: 'timed', text: 'Tu tournes le dos à l’arbitre. Expiration longue, épaules qui tombent. Dis-toi : « décision prise, point suivant ». La décision ne changera pas, ton prochain point si.', sec: 40 },
      { kind: 'timed', text: 'Si tu veux comprendre, tu demandes une seule fois, calmement : « qu’est-ce que vous avez vu ? ». Tu écoutes la réponse et tu passes à autre chose.', sec: 30 },
      { kind: 'timed', text: 'Retour au carré de service. Ta routine habituelle, {cueMotiv}. Le regard sur ta cible.', sec: 30 },
      { kind: 'timed', text: 'Joue le point suivant en temps réel, propre et décidé. Puis encore un. Sens que la colère est retombée et que ton jeu est intact.', sec: 60 },
      { kind: 'timed', text: 'Rejoue la scène une deuxième fois, avec la décision qui te ferait le plus enrager. Même réponse : dos tourné, expiration, « point suivant ».', sec: 60 },
      { kind: 'timed', text: 'Ouvre les yeux. Une décision d’arbitre coûte un point. Ta réaction décide si elle en coûte cinq.', sec: 15 },
    ],
  },
];

export const SCENARIO_BY_ID: Record<string, SquashScenario> = Object.fromEntries(SQUASH_SCENARIOS.map((x) => [x.id, x]));

export const scenarioForTurning = (t?: TurningKey) => (t ? SQUASH_SCENARIOS.find((x) => x.turning === t) : undefined);

/** Niveau d'imagerie à partir duquel les scénarios s'ouvrent (images assez nettes, après l'éveil des sens). */
export const SCENARIO_MIN_LEVEL = 2;

/** Les scénarios s'affichent pour les joueurs de squash : sport déclaré, séances ou matchs Squashnet. */
export function playsSquash(s: State, p: Profile | null = s.profile): boolean {
  if (p && /squash/i.test(p.sport)) return true;
  if (s.squashnet?.matches.length) return true;
  return (s.workouts || []).some((w) => /squash/i.test(w.sport));
}
