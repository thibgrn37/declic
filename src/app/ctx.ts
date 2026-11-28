import { createContext, useContext } from 'react';
import type { State } from '../state/types';
import type { SaveStatus } from '../state/store';
import type { Voice } from '../audio/voice';

export type Tab = 'today' | 'programme' | 'jourj' | 'carnet' | 'progres';

export interface PlayRequest {
  techId: string; // 'urgence' pour la respiration d'urgence
  level: number;
  source: 'plan' | 'jourj' | 'allegee' | 'libre';
  slotIndex?: number;
  /** Scénario d'imagerie squash (avec techId 'imagerie'). */
  scenario?: string;
}

export interface AppCtx {
  s: State;
  update: (fn: (s: State) => void) => void;
  replace: (s: State) => void;
  play: (r: PlayRequest) => void;
  go: (t: Tab) => void;
  status: SaveStatus;
  speak: ((text: string) => void) | null;
  stopSpeak: () => void;
  voice: Voice;
  startReassess: () => void;
}

export const Ctx = createContext<AppCtx>(null as unknown as AppCtx);
export const useApp = () => useContext(Ctx);
