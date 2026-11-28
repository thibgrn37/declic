import type { SkillKey, SportType, PersonalField } from '../content/techniques';
import type { VoiceSettings } from '../audio/voice';
import type { AmbientKind } from '../audio/ambient';
import type { ReminderSettings } from '../components/Reminders';

export interface Profile {
  name: string;
  sport: string;
  sportType: SportType;
  level: 'loisir' | 'regional' | 'national';
  minutes: 5 | 10 | 15;
  perWeek: 3 | 4 | 5;
  experience: boolean;
  /** Compétition active (le prochain tournoi du calendrier), tenue à jour par syncComps. */
  compName: string;
  compDate: string;
  /** Calendrier : tous les tournois prévus. */
  comps?: Comp[];
}

export interface Comp {
  name: string;
  date: string; // AAAA-MM-JJ
}

export interface Assessment {
  date: string;
  answers: Record<string, number>;
  scores: Record<SkillKey, number>; // 0 à 100
  imagery: number; // 1 à 5
}

export interface Goals {
  result: string;
  perf: string;
  process: string[];
}

export type Personal = Record<PersonalField, string> & {
  routine: string[];
  goals: Goals;
  goalReviews: { date: string; values: number[] }[];
};

export interface SessionLog {
  date: string;
  techId: string;
  level: number;
  rating: number; // ressenti propre à la technique, 1 à 5
  useful: number; // utilité perçue, 1 à 5
  note: string;
  source: 'plan' | 'jourj' | 'allegee' | 'libre';
}

export interface Checkin {
  mood: number;
  energy: number;
  sleep: number;
  stress: number;
}

export type IssueKey = 'stress' | 'pensees' | 'attention' | 'motivation' | 'confiance';

/** Moment où un match a basculé (squash). */
export type TurningKey = 'mene' | 'avance' | 'fin_jeu' | 'arbitre' | 'physique' | 'adversaire';

/** Données de match : adversaire, score jeu par jeu, moment clé. */
export interface MatchInfo {
  opponent: string;
  /** Score de chaque jeu, [moi, adversaire]. */
  games: [number, number][];
  turning?: TurningKey;
  /** Match repris de Squashnet. */
  source?: 'squashnet';
}

/** Match officiel repris de Squashnet (Mon classement > Mes matchs). */
export interface SquashnetMatch {
  date: string; // AAAA-MM-JJ
  event: string;
  opponent: string;
  /** Classement de l'adversaire à ce moment (ex. 3B) et son rang. */
  oppClass: string;
  oppRank: number;
  /** Ton classement et ton rang à ce moment. */
  myClass: string;
  myRank: number;
  games: [number, number][];
  /** WO (forfait) ou Ab (abandon) : le score ne dit pas qui a gagné. */
  special?: 'WO' | 'Ab';
}

export interface Debrief {
  date: string;
  title: string;
  kind: 'competition' | 'entrainement';
  feel: number;
  good: string;
  bad: string;
  keep: string;
  issue: IssueKey | '';
  /** Performance perçue, 1 à 5. */
  perf?: number;
  /** Obstacles repérés automatiquement dans le texte. */
  detected?: IssueKey[];
  /** Séance importée d'où vient ce débrief. */
  workoutId?: string;
  /** Match (adversaire, score, moment clé). */
  match?: MatchInfo;
}

/** Séance d'entraînement sportif, saisie à la main ou importée (Garmin). */
export interface Workout {
  id: string;
  date: string; // AAAA-MM-JJ
  time: string; // HH:MM, ou ''
  sport: string;
  durationSec: number;
  hrAvg?: number;
  hrMax?: number;
  /** Effort perçu de la séance, échelle CR-10 (1 à 10). */
  rpe?: number;
  /** Concentration pendant la séance, 1 à 5. */
  focus?: number;
  /** Confiance pendant la séance, 1 à 5. */
  confidence?: number;
  note?: string;
  /** Ce qui a gêné mentalement pendant la séance (petit débrief). */
  issue?: IssueKey;
  source: 'manuel' | 'garmin' | 'intervals';
  /** Petit débrief fait (même si rien n'a gêné). */
  debriefed?: boolean;
  /** Séance de match (et non d'entraînement) : elle appelle un débrief de match. */
  match?: boolean;
}

export interface Slot {
  techId: string;
  reason: string;
  doneDate?: string;
}

export interface WeekPlan {
  wk: string; // lundi de la semaine
  programWeek: number;
  slots: Slot[];
}

export interface State {
  v: 2;
  createdAt: string;
  programStart: string; // lundi de la semaine 1
  profile: Profile | null;
  assessments: Assessment[];
  personal: Personal;
  levels: Record<string, number>;
  sessions: SessionLog[];
  checkins: Record<string, Checkin>;
  debriefs: Debrief[];
  plans: Record<string, WeekPlan>;
  days: Record<string, number>;
  badges: string[];
  voice?: VoiceSettings;
  ambient?: AmbientKind;
  reminders?: ReminderSettings;
  workouts?: Workout[];
  /** Historique de matchs importé de Squashnet. */
  squashnet?: { matches: SquashnetMatch[]; importedAt: string };
  /** Liaison intervals.icu : clé API personnelle, heure de la dernière synchro (ms). */
  /** `sports` : sports gardés à l'import (squash par défaut) ; `seen` : sports reçus d'intervals.icu, gardés ou non. */
  intervals?: { apiKey: string; lastSync: number; error?: string; sports?: string[]; seen?: string[] };
}
