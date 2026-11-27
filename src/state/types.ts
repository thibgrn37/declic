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
  compName: string;
  compDate: string;
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
}
