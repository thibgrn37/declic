import { useState } from 'react';
import { addDays, parseKey, todayKey } from '../state/dates';
import type { State } from '../state/types';
import { useApp } from '../app/ctx';
import { upcomingComps } from '../engine/comps';

export interface ReminderSettings {
  time: string; // HH:MM
  days: number[]; // 1 = lundi … 7 = dimanche
}
export const DEFAULT_REMINDERS: ReminderSettings = { time: '18:30', days: [1, 2, 4, 6] };

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const ICS_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

const icsDate = (k: string, hhmm: string) => `${k.replace(/-/g, '')}T${hhmm.replace(':', '')}00`;
const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

function event(uid: string, start: string, minutes: number, title: string, desc: string, extra = '') {
  const [d, t] = start.split('T');
  const end = new Date(parseKey(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`));
  end.setHours(+t.slice(0, 2), +t.slice(2, 4) + minutes);
  const p = (n: number) => String(n).padStart(2, '0');
  const endStr = `${end.getFullYear()}${p(end.getMonth() + 1)}${p(end.getDate())}T${p(end.getHours())}${p(end.getMinutes())}00`;
  return [
    'BEGIN:VEVENT', `UID:${uid}@declic`, `DTSTAMP:${stamp()}`, `DTSTART:${start}`, `DTEND:${endStr}`,
    `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(desc)}`, ...(extra ? [extra] : []),
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'TRIGGER:-PT0M', 'END:VALARM', 'END:VEVENT',
  ].join('\r\n');
}

/** Fichier agenda : séances récurrentes, et rappels de la veille et du Jour J s'il y a une compétition. */
export function buildIcs(s: State, r: ReminderSettings): string {
  const t = todayKey();
  const events: string[] = [];
  if (r.days.length) {
    events.push(event('seance', icsDate(t, r.time), 10, 'Séance Déclic', 'Ta séance de préparation mentale du jour t’attend dans Déclic.',
      `RRULE:FREQ=WEEKLY;BYDAY=${r.days.map((d) => ICS_DAYS[d - 1]).join(',')}`));
  }
  for (const c of upcomingComps(s.profile, t)) {
    const name = c.name || 'ta compétition';
    events.push(event('veille-' + c.date, icsDate(addDays(c.date, -1), '20:00'), 10, `Veille de ${name} : visualisation`, 'Une visualisation courte de ta compétition, sac prêt, coucher habituel.'));
    events.push(event('jourj-' + c.date, icsDate(c.date, '08:00'), 5, `Jour J : ${name}`, 'Respiration lente et routine d’avant-match. Ta respiration d’urgence est dans l’onglet Jour J.'));
  }
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Declic//FR', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR', ''].join('\r\n');
}

async function saveFile(filename: string, text: string): Promise<'ok' | 'refused'> {
  const w = window as unknown as { claude?: { use(n: string): Promise<{ save(o: { filename: string; data: string | Blob }): Promise<unknown> } | null> } };
  try {
    const dl = w.claude?.use ? await w.claude.use('downloads') : null;
    if (dl) { await dl.save({ filename, data: new Blob([text], { type: 'text/calendar' }) }); return 'ok'; }
  } catch { return 'refused'; }
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'ok';
}

export function RemindersCard() {
  const { s, update } = useApp();
  const r = s.reminders || DEFAULT_REMINDERS;
  const [msg, setMsg] = useState('');
  const set = (patch: Partial<ReminderSettings>) => { setMsg(''); update((x) => { x.reminders = { ...r, ...patch }; }); };
  const comps = upcomingComps(s.profile);
  const hasComp = comps.length > 0;
  return (
    <div className="card">
      <h2>Rappels</h2>
      <p className="small muted">Ajoute tes rappels à l’agenda de ton téléphone : ils sonnent même quand Déclic est fermé.</p>
      <div className="field"><span>Jours de séance</span>
        <div className="seg" role="group" aria-label="Jours">
          {DAY_LABELS.map((l, i) => {
            const d = i + 1; const on = r.days.includes(d);
            return <button key={d} className={on ? 'on' : ''} aria-pressed={on} style={{ textAlign: 'center' }} onClick={() => set({ days: on ? r.days.filter((x) => x !== d) : [...r.days, d].sort() })}>{l}</button>;
          })}
        </div>
      </div>
      <label className="field">Heure<input type="time" id="remTime" value={r.time} onChange={(e) => set({ time: e.target.value || '18:30' })} style={{ maxWidth: 160, border: '1px solid var(--line)', background: 'var(--surface-2)', borderRadius: 10, padding: '10px 12px' }} /></label>
      <p className="small">{hasComp ? `Le fichier ajoute aussi la veille (20 h, visualisation) et le Jour J (8 h, respiration et routine) de ${comps.length > 1 ? `tes ${comps.length} tournois` : comps[0].name || 'ta compétition'}.` : 'Indique ta prochaine compétition dans l’onglet Jour J pour ajouter aussi les rappels de la veille et du Jour J.'}</p>
      <button className="btn" disabled={!r.days.length && !hasComp} onClick={async () => {
        const res = await saveFile('declic-rappels.ics', buildIcs(s, r));
        setMsg(res === 'ok' ? 'Fichier prêt : ouvre-le pour l’ajouter à ton agenda.' : 'Le téléchargement a été refusé.');
      }}>Ajouter à mon agenda</button>
      {msg && <p className="small">{msg}</p>}
    </div>
  );
}
