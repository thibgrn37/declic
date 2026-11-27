// Séances d'entraînement : charge (méthode session-RPE) et liens avec l'état mental.
import { addDays, diffDays, mondayOf, todayKey } from '../state/dates';
import type { State, Workout } from '../state/types';

/** « 59:45 », « 1:02:03 », « 60 » (minutes) ou « 45 min » → secondes. */
export function parseDuration(text: string): number {
  const t = text.trim().replace(',', '.');
  if (!t) return 0;
  if (t.includes(':')) {
    const parts = t.split(':').map((x) => Number(x));
    if (parts.some((x) => !Number.isFinite(x) || x < 0)) return 0;
    const [a, b, c] = parts;
    return Math.round(parts.length === 3 ? a * 3600 + b * 60 + c : a * 60 + b);
  }
  const h = t.match(/^(\d+(?:\.\d+)?)\s*h\s*(\d+)?/i);
  if (h) return Math.round(Number(h[1]) * 3600 + Number(h[2] || 0) * 60);
  const m = parseFloat(t);
  return Number.isFinite(m) && m > 0 ? Math.round(m * 60) : 0;
}

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
}

/** Charge de séance (Foster, 2001) : effort perçu CR-10 × durée en minutes. Null sans effort noté. */
export const sessionLoad = (w: Workout) => (w.rpe ? Math.round(w.rpe * (w.durationSec / 60)) : null);

export const newId = () => Math.random().toString(36).slice(2, 10);

export function sortWorkouts(list: Workout[]) {
  return [...list].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

/** Minutes et charge par semaine, de la plus ancienne à la plus récente. */
export function weeklyTraining(list: Workout[], weeks = 8, day = todayKey()) {
  const wk = mondayOf(day);
  return Array.from({ length: weeks }, (_, i) => {
    const w = addDays(wk, (i - weeks + 1) * 7);
    const items = list.filter((x) => mondayOf(x.date) === w);
    const loads = items.map(sessionLoad).filter((x): x is number => x !== null);
    return {
      week: w,
      count: items.length,
      minutes: Math.round(items.reduce((n, x) => n + x.durationSec / 60, 0)),
      load: loads.length ? loads.reduce((a, b) => a + b, 0) : null,
    };
  });
}

/** Séances des 7 derniers jours pas encore débriefées, la plus récente d'abord. */
export function pendingDebriefs(s: State, day = todayKey()): Workout[] {
  return sortWorkouts((s.workouts || []).filter((w) => !w.debriefed && !w.focus && !w.confidence && !w.issue && diffDays(w.date, day) <= 7 && w.date <= day));
}

/** Séance très dure (effort ≥ 8/10) aujourd'hui ou la veille. */
export function hardTraining(s: State, day = todayKey()): Workout | undefined {
  return (s.workouts || []).find((w) => (w.date === day || w.date === addDays(day, -1)) && (w.rpe || 0) >= 8);
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const r1 = (x: number) => x.toFixed(1).replace('.', ',');

export interface Insight { text: string; tone: 'plus' | 'moins' | 'neutre' }

/**
 * Rapprochements simples entre entraînements et mental, sur les 90 derniers jours.
 * Affichés seulement avec au moins 3 séances de chaque côté : ce sont des tendances, pas des preuves.
 */
export function trainingInsights(s: State, day = todayKey()): Insight[] {
  const list = (s.workouts || []).filter((w) => diffDays(w.date, day) <= 90);
  const out: Insight[] = [];
  const mentalDays = new Set(s.sessions.map((x) => x.date));
  const withPrep = (w: Workout) => mentalDays.has(w.date) || mentalDays.has(addDays(w.date, -1));

  const compare = (
    field: 'focus' | 'confidence' | 'rpe', split: (w: Workout) => boolean | null, max: number,
    label: string, yes: string, no: string, higherIsBetter: boolean,
  ) => {
    const a: number[] = [], b: number[] = [];
    for (const w of list) {
      const v = w[field]; const g = split(w);
      if (!v || g === null) continue;
      (g ? a : b).push(v);
    }
    if (a.length < 3 || b.length < 3) return;
    const d = avg(a) - avg(b);
    if (Math.abs(d) < 0.4) return;
    out.push({
      text: `${label} : ${r1(avg(a))}/${max} ${yes}, ${r1(avg(b))}/${max} ${no}.`,
      tone: (d > 0) === higherIsBetter ? 'plus' : 'moins',
    });
  };

  compare('focus', withPrep, 5, 'Concentration à l’entraînement', 'quand tu as fait une séance Déclic la veille ou le jour même', 'sinon', true);
  compare('confidence', withPrep, 5, 'Confiance à l’entraînement', 'avec une séance Déclic la veille ou le jour même', 'sinon', true);
  const sleep = (w: Workout) => { const c = s.checkins[w.date]; return c ? (c.sleep <= 2 ? true : c.sleep >= 4 ? false : null) : null; };
  compare('rpe', sleep, 10, 'Effort ressenti', 'après une mauvaise nuit', 'après une bonne nuit', false);
  const stress = (w: Workout) => { const c = s.checkins[w.date]; return c ? (c.stress >= 4 ? true : c.stress <= 2 ? false : null) : null; };
  compare('focus', stress, 5, 'Concentration', 'les jours de stress élevé', 'les jours calmes', true);
  return out;
}

/* ---------------- Import Garmin (export CSV de Garmin Connect) ---------------- */

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const num = (t: string | undefined) => { const n = parseInt((t || '').replace(/[^\d]/g, ''), 10); return Number.isFinite(n) && n > 0 ? n : undefined; };

/** « 2026-11-27 12:30:00 », « 27/11/2026 12:30 » → [date, heure]. */
function parseDateTime(t: string): [string, string] | null {
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/);
  if (m) return [`${m[1]}-${m[2]}-${m[3]}`, `${m[4].padStart(2, '0')}:${m[5]}`];
  m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (m) return [`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`, `${m[4].padStart(2, '0')}:${m[5]}`];
  m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return [`${m[1]}-${m[2]}-${m[3]}`, ''];
  return null;
}

const SPORTS: Record<string, string> = {
  squash: 'Squash', tennis: 'Tennis', padel: 'Padel', running: 'Course à pied', 'course a pied': 'Course à pied', cycling: 'Vélo', velo: 'Vélo',
  swimming: 'Natation', natation: 'Natation', strength: 'Musculation', musculation: 'Musculation', 'strength training': 'Musculation',
  walking: 'Marche', marche: 'Marche', hiking: 'Randonnée', yoga: 'Yoga', cardio: 'Cardio',
};
const sportName = (t: string) => SPORTS[norm(t)] || (t ? t[0].toUpperCase() + t.slice(1) : 'Entraînement');

/**
 * Lit le fichier « Activities.csv » exporté depuis Garmin Connect (Activités > Toutes les activités > Exporter en CSV).
 * Les en-têtes sont reconnus en français et en anglais.
 */
export function parseGarminCsv(text: string): Workout[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const head = splitCsvLine(lines[0], sep).map(norm);
  const col = (...keys: string[]) => head.findIndex((h) => keys.some((k) => h === k)) >= 0
    ? head.findIndex((h) => keys.some((k) => h === k))
    : head.findIndex((h) => keys.some((k) => h.includes(k)));
  const iType = col('activity type', "type d'activite", 'type d’activite', 'type');
  const iDate = col('date');
  const iTime = col('time', 'duree', 'temps total', 'temps');
  const iAvg = col('avg hr', 'frequence cardiaque moyenne', 'fc moyenne', 'fc moy');
  const iMax = col('max hr', 'frequence cardiaque maximale', 'fc maximale', 'fc max');
  const iTitle = col('title', 'titre');
  if (iDate < 0 || iTime < 0) return [];
  const out: Workout[] = [];
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line, sep);
    const dt = parseDateTime(c[iDate] || '');
    const dur = parseDuration((c[iTime] || '').replace(/\.\d+$/, ''));
    if (!dt || !dur) continue;
    const type = c[iType] || c[iTitle] || '';
    out.push({
      id: `g-${dt[0]}-${dt[1]}-${dur}`, date: dt[0], time: dt[1], sport: sportName(type), durationSec: dur,
      hrAvg: iAvg >= 0 ? num(c[iAvg]) : undefined, hrMax: iMax >= 0 ? num(c[iMax]) : undefined, source: 'garmin',
    });
  }
  return out;
}

/** Ajoute les séances importées en ignorant celles déjà présentes (même date, heure et durée à la minute près). */
export function mergeWorkouts(existing: Workout[], incoming: Workout[]): { list: Workout[]; added: number } {
  const key = (w: Workout) => `${w.date} ${w.time} ${Math.round(w.durationSec / 60)}`;
  const seen = new Set(existing.map(key));
  const fresh = incoming.filter((w) => !seen.has(key(w)) && (seen.add(key(w)), true));
  return { list: sortWorkouts([...existing, ...fresh]), added: fresh.length };
}
