import { addDays, diffDays, todayKey } from '../state/dates';
import type { Comp, Profile } from '../state/types';

/* ---- Calendrier des tournois ----
 * profile.comps garde tous les tournois prévus. profile.compName / compDate restent la
 * « compétition active » lue par le reste de l'appli (protocole J-7, rappels, textes) :
 * c'est le prochain tournoi à venir. Dès qu'un tournoi est passé, le suivant prend le
 * relais et le protocole J-7 s'enchaîne tout seul. */

/** On garde les tournois passés quelques semaines (débrief, historique). */
const KEEP_PAST_DAYS = 30;
const MAX_COMPS = 30;

/** Tous les tournois connus, triés par date, sans doublon. */
export function compList(p: Profile | null): Comp[] {
  if (!p) return [];
  const all = [...(p.comps || [])];
  if (p.compDate && !all.some((c) => c.date === p.compDate && c.name === p.compName)) all.push({ name: p.compName, date: p.compDate });
  const seen = new Set<string>();
  return all
    .filter((c) => c && c.date && !seen.has(c.date + '|' + c.name) && seen.add(c.date + '|' + c.name))
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

/** Tournois à venir (aujourd'hui compris). */
export const upcomingComps = (p: Profile | null, day = todayKey()) => compList(p).filter((c) => c.date >= day);

/** Tournoi passé depuis moins de `days` jours : c'est le moment du débrief. */
export function recentPastComp(p: Profile | null, day = todayKey(), days = 3): Comp | null {
  const past = compList(p).filter((c) => c.date < day && diffDays(c.date, day) <= days);
  return past.length ? past[past.length - 1] : null;
}

/** Tournoi qui suit le tournoi actif, s'il y en a un. */
export function nextAfterActive(p: Profile | null, day = todayKey()): Comp | null {
  const up = upcomingComps(p, day);
  return up.length > 1 ? up[1] : null;
}

/**
 * Range le calendrier et met à jour la compétition active.
 * Renvoie true si quelque chose a changé (à enregistrer).
 */
export function syncComps(p: Profile | null, day = todayKey()): boolean {
  if (!p) return false;
  const limit = addDays(day, -KEEP_PAST_DAYS);
  let list = compList(p).filter((c) => c.date >= limit);
  if (list.length > MAX_COMPS) list = list.slice(list.length - MAX_COMPS);
  const up = list.filter((c) => c.date >= day);
  // Pas de tournoi à venir : on garde le dernier passé pour proposer le débrief.
  const active = up[0] || list[list.length - 1] || { name: '', date: '' };
  const before = JSON.stringify([p.comps, p.compName, p.compDate]);
  p.comps = list;
  p.compName = active.name;
  p.compDate = active.date;
  return JSON.stringify([p.comps, p.compName, p.compDate]) !== before;
}

export function addComp(p: Profile, c: Comp, day = todayKey()) {
  p.comps = [...compList(p), { name: c.name.trim(), date: c.date }];
  syncComps(p, day);
}

export function removeComp(p: Profile, c: Comp, day = todayKey()) {
  p.comps = compList(p).filter((x) => !(x.date === c.date && x.name === c.name));
  if (p.compDate === c.date && p.compName === c.name) { p.compName = ''; p.compDate = ''; }
  syncComps(p, day);
}
