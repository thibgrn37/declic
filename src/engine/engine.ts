import { ITEMS } from '../content/assessment';
import { SKILLS, TECHNIQUES, TECH_BY_ID, type SkillKey } from '../content/techniques';
import { addDays, diffDays, mondayOf, todayKey } from '../state/dates';
import type { Assessment, IssueKey, Profile, SessionLog, Slot, State, WeekPlan } from '../state/types';

/* ---------------- Bilan ---------------- */

export function scoreAssessment(answers: Record<string, number>, date = todayKey()): Assessment {
  const sums: Record<string, number[]> = {};
  let imagery = 3;
  for (const it of ITEMS) {
    const raw = answers[it.id] ?? 3;
    if (it.skill === 'imagery') { imagery = raw; continue; }
    const v = it.reversed ? 6 - raw : raw;
    (sums[it.skill] ||= []).push(v);
  }
  const scores = Object.fromEntries(
    (Object.keys(SKILLS) as SkillKey[]).map((k) => {
      const arr = sums[k] || [3];
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return [k, Math.round(((mean - 1) / 4) * 100)];
    }),
  ) as Record<SkillKey, number>;
  return { date, answers, scores, imagery };
}

export const latestAssessment = (s: State) => s.assessments[s.assessments.length - 1];

/** Niveaux de départ selon le bilan et l'expérience. */
export function initialLevels(a: Assessment, p: Profile): Record<string, number> {
  const levels: Record<string, number> = Object.fromEntries(TECHNIQUES.map((t) => [t.id, 1]));
  // Imagerie : on commence par l'éveil des sens si les images sont peu nettes (Simonsmeier et al., 2018).
  if (a.imagery >= 4 || (p.experience && a.imagery >= 3)) levels.imagerie = 2;
  if (p.experience && a.scores.stress >= 50) levels.respiration = 2;
  return levels;
}

/* ---------------- Programme ---------------- */

export const programWeek = (s: State, day = todayKey()) =>
  Math.max(1, Math.floor(diffDays(s.programStart, mondayOf(day)) / 7) + 1);

export const phaseOf = (week: number) => (week <= 2 ? 1 : week <= 5 ? 2 : 3);
export const PHASES: Record<number, { name: string; text: string }> = {
  1: { name: 'Fondations', text: 'Objectifs, respiration et premières images : les bases sur lesquelles tout repose.' },
  2: { name: 'Construction', text: 'Imagerie régulière, mots-clés et routine : on construit tes outils de compétition.' },
  3: { name: 'Intégration', text: 'On assemble tout en situation de compétition, y compris face à l’imprévu.' },
};

const ISSUE_SKILL: Record<IssueKey, SkillKey> = {
  stress: 'stress', pensees: 'dialogue', attention: 'concentration', motivation: 'objectifs', confiance: 'confiance',
};
export const ISSUES: Record<IssueKey, string> = {
  stress: 'La pression, le stress',
  pensees: 'Des pensées négatives',
  attention: 'J’ai perdu ma concentration',
  motivation: 'Manque d’envie, de motivation',
  confiance: 'J’ai douté de moi',
};

/** Compétences classées de la plus faible à la plus forte, en tenant compte des débriefs récents. */
export function priorities(s: State, day = todayKey()): { skill: SkillKey; score: number; fromDebrief: boolean }[] {
  const a = latestAssessment(s);
  const base = a ? { ...a.scores } : { stress: 50, confiance: 50, concentration: 50, dialogue: 50, objectifs: 50 };
  const flagged = new Set<SkillKey>();
  for (const d of s.debriefs) {
    if (d.issue && diffDays(d.date, day) <= 21) {
      const k = ISSUE_SKILL[d.issue];
      base[k] -= 12;
      flagged.add(k);
    }
  }
  return (Object.keys(base) as SkillKey[])
    .map((k) => ({ skill: k, score: base[k], fromDebrief: flagged.has(k) }))
    .sort((x, y) => x.score - y.score);
}

/** Meilleure technique pour une compétence, en évitant les doublons quand c'est possible. */
function techFor(skill: SkillKey, taken: string[]): string {
  const order: Record<SkillKey, string[]> = {
    stress: ['respiration', 'routine', 'presence'],
    confiance: ['imagerie', 'dialogue'],
    concentration: ['routine', 'presence', 'dialogue'],
    dialogue: ['dialogue'],
    objectifs: ['objectifs', 'imagerie'],
  };
  return order[skill].find((t) => !taken.includes(t)) || order[skill][0];
}

export function buildWeek(s: State, wk: string): WeekPlan {
  const p = s.profile!;
  const week = programWeek(s, wk);
  const phase = phaseOf(week);
  const slots: Slot[] = [];
  const add = (techId: string, reason: string) => slots.push({ techId, reason });

  const imageryReason = 'L’imagerie donne les meilleurs résultats à environ 3 séances par semaine (Liu et al., 2025).';
  if (phase === 1) {
    add('objectifs', week === 1 ? 'On commence par des objectifs clairs : ils orientent tout le programme.' : 'Bilan de tes objectifs de processus.');
    add('respiration', 'Ton outil de base pour réguler le stress, utilisé dans tous les exercices suivants.');
    add('imagerie', imageryReason);
  } else if (phase === 2) {
    add('imagerie', imageryReason);
    add('dialogue', 'Le dialogue interne marche surtout quand on l’entraîne (Hatzigeorgiadis et al., 2011).');
    add('routine', 'La routine protège ta concentration sous pression (Rupprecht et al., 2021).');
    add('imagerie', imageryReason);
  } else {
    add('imagerie', imageryReason);
    add('routine', 'On teste ta routine dans des conditions de pression.');
    add('imagerie', imageryReason);
    add('dialogue', 'Tes mots-clés deviennent des réflexes de compétition.');
  }
  // Compléter avec tes points faibles, puis couper au nombre de séances choisi.
  const prio = priorities(s, wk);
  const core = slots.slice(0, Math.min(slots.length, p.perWeek - 1));
  const fill: Slot[] = [];
  for (const pr of prio) {
    if (core.length + fill.length >= p.perWeek) break;
    const taken = [...core, ...fill].map((x) => x.techId);
    const t = techFor(pr.skill, taken);
    fill.push({
      techId: t,
      reason: pr.fromDebrief
        ? `Tes débriefs récents signalent : ${SKILLS[pr.skill].toLowerCase()}.`
        : `Ton point à renforcer d’après le bilan : ${SKILLS[pr.skill].toLowerCase()}.`,
    });
  }
  // Si le nombre de séances laisse de la place, on reprend le reste du socle.
  const rest = slots.slice(core.length);
  const all = [...core, ...fill, ...rest].slice(0, p.perWeek);
  return { wk, programWeek: week, slots: all };
}

/** Plan de la semaine en cours, créé une fois puis figé pour la semaine. */
export function ensureWeek(s: State, day = todayKey()): WeekPlan {
  const wk = mondayOf(day);
  if (!s.plans[wk]) s.plans[wk] = buildWeek(s, wk);
  return s.plans[wk];
}

export const compDays = (p: Profile | null, day = todayKey()) =>
  p && p.compDate ? diffDays(day, p.compDate) : null;

export interface Suggestion {
  techId: string;
  level: number;
  source: SessionLog['source'];
  title: string;
  reason: string;
  slotIndex?: number;
  alternative?: { techId: string; slotIndex: number };
}

export function levelOf(s: State, techId: string) {
  const t = TECH_BY_ID[techId];
  return Math.min(t.levels.length, Math.max(1, s.levels[techId] || 1));
}

/** Ce qu'on te propose aujourd'hui, et pourquoi. */
export function suggestToday(s: State, day = todayKey()): Suggestion | null {
  const plan = ensureWeek(s, day);
  const nextIdx = plan.slots.findIndex((x) => !x.doneDate);
  const doneToday = plan.slots.some((x) => x.doneDate === day) || s.sessions.some((x) => x.date === day);
  const cd = compDays(s.profile, day);

  if (cd !== null && cd >= 0 && cd <= 7) {
    if (cd === 0) return { techId: 'routine', level: Math.max(2, levelOf(s, 'routine')), source: 'jourj', title: 'Jour J', reason: 'Répète ta routine une dernière fois, calmement. Ta respiration d’urgence est dans l’onglet Jour J.' };
    if (cd === 1) return { techId: 'imagerie', level: Math.min(3, Math.max(2, levelOf(s, 'imagerie'))), source: 'jourj', title: 'La veille', reason: 'Une visualisation courte de ta compétition, puis repos. Pas de nouvel exercice la veille.' };
    const im = levelOf(s, 'imagerie');
    const even = cd % 2 === 0;
    return even
      ? { techId: 'imagerie', level: im >= 2 ? 3 : 2, source: 'jourj', title: `J-${cd}`, reason: 'Avant une compétition, on rejoue la séquence de compétition pour arriver en terrain connu.' }
      : { techId: 'routine', level: Math.max(2, levelOf(s, 'routine')), source: 'jourj', title: `J-${cd}`, reason: 'On automatise ta routine pour qu’elle tienne le jour J.' };
  }

  const ci = s.checkins[day];
  if (ci && (ci.stress >= 4 || ci.sleep <= 2 || ci.energy <= 1)) {
    const lvl = ci.stress >= 4 ? Math.max(levelOf(s, 'respiration'), 1) : 1;
    return {
      techId: 'respiration', level: lvl, source: 'allegee', title: 'Séance allégée',
      reason: ci.stress >= 4 ? 'Ton check-in indique un stress élevé : on régule d’abord.' : 'Tu as peu dormi ou tu manques d’énergie : séance courte de récupération.',
      alternative: nextIdx >= 0 ? { techId: plan.slots[nextIdx].techId, slotIndex: nextIdx } : undefined,
    };
  }
  if (nextIdx >= 0) {
    const sl = plan.slots[nextIdx];
    return { techId: sl.techId, level: levelOf(s, sl.techId), source: 'plan', title: doneToday ? 'Séance suivante' : 'Séance du jour', reason: sl.reason, slotIndex: nextIdx };
  }
  return null;
}

/* ---------------- Adaptation ---------------- */

export interface AdaptResult {
  message: string;
  newLevel: number;
  oldLevel: number;
}

/** Ajuste le niveau d'une technique selon les deux dernières séances. */
export function adapt(s: State, techId: string, levelDone: number, rating: number): AdaptResult {
  const t = TECH_BY_ID[techId];
  const cur = levelOf(s, techId);
  const lv = t.levels[levelDone - 1];
  const prev = s.sessions.filter((x) => x.techId === techId && x.level === levelDone).slice(-2, -1)[0];
  let next = cur;
  let message = '';
  if (lv.oneOff && levelDone >= cur && levelDone < t.levels.length) {
    next = levelDone + 1;
    message = `Mise en place terminée. Prochaine séance : niveau ${next}, « ${t.levels[next - 1].name} ».`;
  } else if (rating >= 4 && prev && prev.rating >= 4 && levelDone >= cur && cur < t.levels.length) {
    next = cur + 1;
    message = `Deux séances réussies d’affilée : tu passes au niveau ${next}, « ${t.levels[next - 1].name} ».`;
  } else if (rating <= 2 && prev && prev.rating <= 2 && cur > 1 && levelDone === cur) {
    next = cur - 1;
    message = `Ce niveau est encore difficile : on consolide le niveau ${next} avant de repartir.`;
  } else if (rating >= 4 && cur < t.levels.length) {
    message = 'Bien. Encore une séance de ce niveau à ce ressenti et tu passes au suivant.';
  } else if (rating <= 2) {
    message = 'C’est normal au début. On garde ce niveau ; si c’est encore dur la prochaine fois, on simplifie.';
  } else {
    message = 'On garde ce niveau pour l’instant.';
  }
  s.levels[techId] = next;
  return { message, newLevel: next, oldLevel: cur };
}

export const reassessDue = (s: State, day = todayKey()) => {
  const a = latestAssessment(s);
  return !!a && programWeek(s, day) >= 4 && diffDays(a.date, day) >= 25;
};

/* ---------------- Régularité ---------------- */

export function streakInfo(s: State, day = todayKey()) {
  let k = s.days[day] ? day : addDays(day, -1);
  let n = 0;
  const used = new Set<string>();
  let jokerUsedThisWeek = false;
  for (let i = 0; i < 800; i++) {
    if (s.days[k]) { n++; k = addDays(k, -1); continue; }
    // Un jour sans séance par semaine est pardonné (repos), s'il est entouré de jours actifs.
    const wk = mondayOf(k);
    const prev = addDays(k, -1);
    if (n > 0 && !used.has(wk) && s.days[prev]) {
      used.add(wk);
      if (wk === mondayOf(day)) jokerUsedThisWeek = true;
      k = prev;
      continue;
    }
    break;
  }
  return { n, jokerLeft: !jokerUsedThisWeek, today: !!s.days[day] };
}

export const BADGES: { id: string; name: string; hint: string; test: (s: State) => boolean }[] = [
  { id: 'premiere', name: 'Première séance', hint: 'Terminer une séance', test: (s) => s.sessions.length >= 1 },
  { id: 'semaine', name: 'Semaine complète', hint: 'Finir toutes les séances d’une semaine', test: (s) => Object.values(s.plans).some((p) => p.slots.length > 0 && p.slots.every((x) => x.doneDate)) },
  { id: 'dose', name: 'Dose d’imagerie', hint: '12 séances d’imagerie, soit 4 semaines à la bonne dose', test: (s) => s.sessions.filter((x) => x.techId === 'imagerie').length >= 12 },
  { id: 'routine', name: 'Routine sous pression', hint: 'Atteindre le niveau 3 de la routine', test: (s) => (s.levels.routine || 1) >= 3 },
  { id: 'mots', name: 'Mots-clés prêts', hint: 'Créer tes deux mots-clés', test: (s) => !!(s.personal.cueInstr && s.personal.cueMotiv) },
  { id: 'debrief', name: 'Lucidité', hint: 'Remplir 3 débriefs', test: (s) => s.debriefs.length >= 3 },
  { id: 'bilan2', name: 'Progrès mesuré', hint: 'Refaire le bilan après 4 semaines', test: (s) => s.assessments.length >= 2 },
  { id: 'serie7', name: 'Régularité', hint: '7 jours de suite (un jour de repos par semaine autorisé)', test: (s) => streakInfo(s).n >= 7 },
];

export function checkBadges(s: State): string[] {
  const out: string[] = [];
  for (const b of BADGES) if (!s.badges.includes(b.id) && b.test(s)) { s.badges.push(b.id); out.push(b.name); }
  return out;
}
